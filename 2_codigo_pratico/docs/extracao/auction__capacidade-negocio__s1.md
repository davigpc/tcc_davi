# Registro de Extração — leilão / Capacidade de Negócio / snapshot-1

## O que foi feito

A capacidade de **Lances** saiu do monólito para `services/auction/lances/`:
`POST /auctions/:id/bids` e `GET /auctions/:id/bids`. O gateway NGINX passou a
responder na 3000 e desvia essas rotas para o novo serviço; o resto continua no
monólito, que foi para a 3100 interna.

O worker continua no monólito. A fila de fechamento e o `auction-jobs` não
mudaram nesta fase.

## Decisões de fronteira

**1. Banco compartilhado.** O serviço de Lances abre a própria conexão TypeORM na
mesma base. A transação do lance trava a linha do leilão e grava o lance como
antes; a atomicidade é preservada.

**2. Entidades copiadas como mapeamento.** `Auction`, `Bid`, `Card`, `CardType`
e `User` foram copiadas para o serviço. São mapeamentos de tabela, não donos do
dado. Sem elas, a relação do leilão com a carta e o usuário não resolveria.

**3. Autenticação local.** O serviço verifica o JWT com a mesma `JWT_SECRET` e
carrega o usuário na tabela compartilhada. Não consulta a Identidade por HTTP.

**4. Tempo real.** O publicador de eventos foi copiado: o serviço publica
`auction.bid` e `auction.outbid` no canal do Redis. O gateway Socket.IO continua
no monólito e entrega aos clientes.

## Impacto observado nas métricas

Média de três execuções.

| Dimensão | Métrica | S0 | s1 | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 76.076 ms | 82.340 ms | +8,2 % |
| Agilidade | Inicialização | 12.627 ms | 12.843 ms | +1,7 % |
| Custo | Componentes / contêineres | 4 / 4 | 6 / 6 | +2 |
| Custo | Imagens da aplicação | 104,9 MB | 209,7 MB | +100 % |
| Custo | RAM (repouso / carga) | 137,5 / 313,6 MB | 197,8 / 379,1 MB | +43,9 % / +20,9 % |
| Custo | CPU (repouso / carga) | 0,21 / 191,32 % | 0,21 / 204,34 % | 0,00 p.p. / +6,8 % |
| Desempenho | `GET /auctions` | 923,9 req/s · p50 20,7 ms | 859,0 req/s · p50 21,7 ms | −7,0 % |
| Desempenho | `GET /auctions/:id` | 751,6 req/s · p50 25,3 ms | 713,6 req/s · p50 27,0 ms | −5,1 % |
| Desempenho | `POST /auctions/:id/bids` (1 conexão) | 159,0 req/s · p50 6,0 ms | 152,2 req/s · p50 6,3 ms | −4,3 % |
| Manutenibilidade | Linhas de Código | 2.863 | 3.593 | +730 (+25,5 %) |
| Manutenibilidade | Chamadas entre fronteiras | 88 de 174 | 109 de 206 | +21 |

O LOC subiu 730 linhas porque o serviço copia entidades, guarda de autenticação,
publicador de eventos e configuração — código transversal que o monólito já
tinha. O cross-domain subiu 21: o serviço recria as arestas internas de
`bids → auction`, `bids → users` e `bids → realtime`, e o total cresce com a
árvore duplicada.

As leituras caíram 7 % e 5 %, compatíveis com o salto adicional pelo NGINX e com
mais um processo disputando a máquina. A escrita caiu 4,3 %, dentro da faixa
observada nas outras aplicações.

## Previsto x realizado

- **Build (previsto: sobe):** confirmado, +8,2 %.
- **Componentes (previsto: +2):** confirmado.
- **LOC (previsto: sobe):** confirmado, +25,5 %.
- **Cross-domain (previsto: cai):** **não se confirmou** (+21).
- **Leitura (previsto: queda leve):** confirmado.
- **Escrita (previsto: estável):** queda de 4,3 %, dentro da faixa.

## Aprendizado sobre decomposição

(escrever em suas palavras: por que o código cresceu tanto para extrair uma
capacidade pequena, o que a cópia das entidades representa e por que o
cross-domain subiu em vez de cair.)
