# Registro de Extração — leilão / Subdomínio (DDD) / snapshot final

## O que foi feito

O núcleo saiu do monólito como serviço único em `services/auction/nucleo/`:
`auctions`, `bids`, `auction-jobs` e o worker, com banco próprio (`leilao_db`). O
monólito foi desativado. Identidade, Catálogo e Tempo Real já estavam extraídos
desde o s1 e o s2. A topologia final tem 10 contêineres: quatro serviços de
aplicação, o worker, três bancos, Redis e NGINX.

## Decisões de fronteira

**1. O lance continua atômico.** `bids` e `auctions` ficam no mesmo serviço e no
mesmo banco. A transação do lance ainda trava a linha do leilão, grava o lance e
atualiza `currentHighestBidId` na mesma escrita. É a diferença central em relação
à Capacidade de Negócio, onde Lances e Leilão ficaram separados e o maior lance
virou projeção atualizada por chamada interna.

**2. A carta deixou de ser acessível por SQL.** A criação do leilão trava a carta
por `POST /api/internal/cards/:id/lock` e o fechamento transfere por
`POST /api/internal/cards/:id/transfer`. A transferência é idempotente por
`auctionId`, e o leilão só vira `CLOSED` depois que o Catálogo confirma, usando
`CLOSING` como ponto de retomada.

**3. O fechamento lê os lances localmente.** Como `bids` está no mesmo banco, o
worker encontra o maior lance sem consultar outro serviço. A única chamada
externa do fechamento é a transferência da carta.

**4. A resposta do leilão é composta por duas chamadas em lote.** `GET /auctions`
e `GET /auctions/:id` consultam o Catálogo (carta e tipo de carta) e a Identidade
(vendedor e dono). O modelo guarda apenas `cardId` e `sellerUserId`.

## Impacto observado nas métricas

Média de três execuções.

| Dimensão | Métrica | s2 | final | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 120.588 ms | 116.144 ms | −3,7 % |
| Agilidade | Inicialização | 26.537 ms | 26.697 ms | +0,6 % |
| Custo | Componentes / contêineres | 8 / 8 | 10 / 10 | +2 |
| Custo | Imagens da aplicação | 457,9 MB | 457,8 MB | −0,1 % |
| Custo | RAM (repouso / carga) | 284,8 / 462,6 MB | 330,9 / 657,3 MB | +16,2 % / +42,1 % |
| Custo | CPU (repouso / carga) | 0,18 / 208,24 % | 0,23 / 247,25 % | +0,05 p.p. / +18,7 % |
| Desempenho | `GET /auctions` | 910,9 req/s · p50 20,7 ms | 588,6 req/s · p50 32,3 ms | −35,4 % |
| Desempenho | `GET /auctions/:id` | 745,6 req/s · p50 26,0 ms | 551,8 req/s · p50 35,3 ms | −26,0 % |
| Desempenho | `POST /bids` | 164,0 req/s · p50 6,0 ms | 135,1 req/s · p50 7,0 ms | −17,6 % |
| Manutenibilidade | Linhas de Código | 4.089 | 3.916 | −173 (−4,2 %) |
| Manutenibilidade | Chamadas entre fronteiras | 121 de 229 | 97 de 197 | −24 |

Nenhuma resposta fora da faixa 2xx foi registrada.

O build cai 3,7 % porque a imagem do monólito, a mais pesada, deixa de ser
construída. As Linhas de Código também caem pela saída do monólito, mesmo com a
entrada dos clientes HTTP. A memória sob carga sobe 42 % com o terceiro banco.

A leitura é o efeito mais forte: a listagem perde 35 % e o detalhe, 26 %. Cada
resposta depende de duas chamadas internas (Catálogo e Identidade) além do salto
pelo gateway, e a listagem ainda faz o join do maior lance na própria base. É a
mesma composição da Capacidade de Negócio, com uma diferença: lá o maior lance
vinha de uma coluna JSON, sem join.

A escrita cai 17,6 % em relação ao s2, mas apenas 15,1 % em relação ao baseline —
patamar de ruído da rota. O ponto central da trilha está aqui: separar lances e
leilão custou 45 % da vazão de escrita na Capacidade; mantê-los no mesmo núcleo
custou a faixa de variação da própria rota.

## Comparação com o baseline

| Métrica | S0 | final | Variação acumulada |
|---|---|---|---|
| Build | 76.076 ms | 116.144 ms | +52,7 % |
| Inicialização | 12.627 ms | 26.697 ms | +111,4 % |
| Componentes | 4 | 10 | +6 |
| LOC | 2.863 | 3.916 | +36,8 % |
| Chamadas entre fronteiras | 88 de 174 | 97 de 197 | +9 |
| `GET /auctions` | 923,9 req/s | 588,6 req/s | −36,3 % |
| `GET /auctions/:id` | 751,6 req/s | 551,8 req/s | −26,6 % |
| `POST /bids` | 159,0 req/s | 135,1 req/s | −15,1 % |
| RAM sob carga | 313,6 MB | 657,3 MB | +109,6 % |

## Previsto x realizado

- **Build e memória sobem:** a memória confirmou (+42,1 % sobre o s2); o build
  **caiu** 3,7 %, porque a imagem do monólito sai da solução.
- **Componentes 10:** confirmado.
- **LOC cresce:** **não se confirmou** — caiu 4,2 % sobre o s2, apesar dos
  clientes HTTP.
- **Cross-domain cai:** confirmado (−24 arestas).
- **Leitura cai pelos dois saltos:** confirmado, e mais que na Capacidade.
- **Escrita próxima do s2:** confirmado em ordem de grandeza (−17,6 %, dentro da
  faixa da rota).

## Aprendizado sobre decomposição

(preencher: o que o agrupamento de leilão e lances preserva; por que a leitura
paga mais que a escrita; e o contraste direto com a trilha de Capacidade.)
