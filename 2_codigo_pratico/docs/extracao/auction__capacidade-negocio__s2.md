# Registro de Extração — leilão / Capacidade de Negócio / snapshot-2

## O que foi feito

A capacidade de **Leilão** saiu do monólito para `services/auction/leilao/`:
`auctions` (controller, serviço e fechamento), `auction-jobs` (fila e varredor)
e o **worker**. O gateway passou a desviar `/auctions` para o novo serviço; o
serviço de Lances continua com `/auctions/:id/bids`, e o monólito fica com
identidade, cartas, tipos de carta e tempo real.

O worker agora roda na imagem do Leilão (`node dist/worker.js`), em um contêiner
próprio.

## Decisões de fronteira

**1. O fechamento saiu junto.** O worker consome a fila e executa
`closeAuction` no serviço de Leilão. Ele lê lances e cartas na base
compartilhada, então a transação do fechamento continua atômica nesta fase.

**2. O serviço de Lances continua na base compartilhada.** A transação do lance
trava a linha do leilão, que agora é escrita por outro serviço. A atomicidade
sobrevive porque o banco é o mesmo; é a mesma situação do s2 das outras trilhas.

**3. Entidades copiadas.** `Auction`, `Bid`, `Card`, `CardTransfer`, `CardType`
e `User` foram copiadas para o serviço como mapeamento. O serviço também copiou
o publicador de eventos e a verificação de JWT.

**4. O monólito perdeu as entidades de leilão.** `Auction`, `Bid` e
`CardTransfer` saíram do código do monólito; o `data-source` de desenvolvimento
ficou só com `User`, `CardType` e `Card`. As migrações continuam rodando pelo
script JS na API.

## Impacto observado nas métricas

Média de três execuções.

| Dimensão | Métrica | s1 | s2 | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 82.340 ms | 90.035 ms | +9,3 % |
| Agilidade | Inicialização | 12.843 ms | 18.675 ms | +45,4 % |
| Custo | Componentes / contêineres | 6 / 6 | 7 / 7 | +1 |
| Custo | Imagens da aplicação | 209,7 MB | 314,6 MB | +50,0 % |
| Custo | RAM (repouso / carga) | 197,8 / 379,1 MB | 245,6 / 425,3 MB | +24,2 % / +12,2 % |
| Custo | CPU (repouso / carga) | 0,21 / 204,34 % | 0,46 / 206,99 % | +0,25 p.p. / +1,3 % |
| Desempenho | `GET /auctions` | 859,0 req/s · p50 21,7 ms | 874,1 req/s · p50 21,7 ms | +1,8 % |
| Desempenho | `GET /auctions/:id` | 713,6 req/s · p50 27,0 ms | 721,6 req/s · p50 26,3 ms | +1,1 % |
| Desempenho | `POST /auctions/:id/bids` | 152,2 req/s · p50 6,3 ms | 152,7 req/s · p50 6,3 ms | +0,3 % |
| Manutenibilidade | Linhas de Código | 3.593 | 4.310 | +717 (+20,0 %) |
| Manutenibilidade | Chamadas entre fronteiras | 109 de 206 | 125 de 239 | +16 |

A inicialização subiu 45 % porque a topologia ganhou mais dois contêineres com
verificação de saúde (Leilão e worker), e o gateway espera o Leilão ficar
saudável. O build subiu 9,3 % pela terceira imagem de aplicação.

A leitura de leilões ficou ligeiramente acima do s1: o serviço de Leilão é menor
que o monólito e responde a mesma rota. A escrita de lances não mudou (0,3 %),
porque continua sendo uma transação na mesma base.

O LOC subiu 717 linhas: o serviço copia o controller, o serviço de fechamento, a
fila, o varredor, as entidades e o código transversal. O cross-domain subiu 16
pelo mesmo motivo — o serviço recria as arestas do módulo e o monólito mantém as
suas.

## Previsto x realizado

- **Build (previsto: sobe):** confirmado, +9,3 %.
- **Componentes (previsto: +1):** confirmado.
- **LOC (previsto: sobe):** confirmado, +20,0 %.
- **Cross-domain (previsto: cai):** **não se confirmou** (+16).
- **Leitura (previsto: estável):** confirmado, +1,8 % e +1,1 %.
- **Escrita (previsto: estável):** confirmado, +0,3 %.

## Fechamento validado

Leilão de 30 s criado no serviço, lance no serviço de Lances e fechamento no
worker do Leilão: status `CLOSED`, carta transferida para o maior lance e
`closedAt` gravado pelo relógio do banco.

## Aprendizado sobre decomposição

(escrever em suas palavras: o que muda ao separar o processo assíncrono, por que
a transação de fechamento ainda funciona no s2 e o que deve quebrar quando o
banco for isolado.)
