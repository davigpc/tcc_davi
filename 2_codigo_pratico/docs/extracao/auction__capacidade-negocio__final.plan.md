# Pre-registro de Extração — leilão / Capacidade de Negócio / snapshot final

Escrito antes da medição. O objetivo é registrar a expectativa para que o
resultado possa ser confrontado depois.

## O que sai do monólito

Três capacidades restantes saem ao mesmo tempo e o monólito é desativado:

| Serviço | Conteúdo | Banco |
|---|---|---|
| `identidade` | `auth`, `users` | `identity_db` |
| `catalogo` | `cards`, `card-types`, `card_transfers` | `catalogo_db` |
| `tempo-real` | gateway Socket.IO e assinante Redis | sem banco |
| `leilao` | `auctions`, `auction-jobs`, worker | `leilao_db` |
| `lances` | `bids` e estado local do leilão | `lances_db` |

Persistência **isolada por serviço**: cada um tem o próprio PostgreSQL. A
topologia final tem 12 contêineres (5 serviços de aplicação, o worker, 4 bancos,
Redis e NGINX).

## Decisões de fronteira

**1. O lance deixa de ser uma transação única.** No s2, `placeBid` travava a
linha do leilão no banco compartilhado e gravava o lance na mesma transação. Com
os bancos isolados, o serviço de Lances passa a manter uma cópia local dos campos
usados na validação (`bid_auction_state`) e grava o lance em `lances_db`. O
`currentHighestBidId` do Leilão vira **projeção**, atualizada por chamada interna
depois do commit. Se essa chamada falhar, a projeção diverge do lance real.

**2. O fechamento atravessa serviços.** O worker lê o maior lance no serviço de
Lances (`GET /api/internal/bids/:id/highest`), chama a transferência da carta no
Catálogo (`POST /api/internal/cards/:id/transfer`) e só então marca o leilão como
`CLOSED`. A transferência é idempotente por `auctionId`, e o estado `CLOSING`
funciona como ponto de retomada. Não há transação distribuída: uma falha entre a
transferência e o `CLOSED` deixa o leilão em `CLOSING`.

**3. Criação de leilão trava a carta por HTTP.** No s2 a carta era travada na
mesma transação do leilão. Agora o Leilão chama `POST /api/internal/cards/:id/lock`
antes de inserir a linha, e desfaz a trava se a inserção falhar.

**4. Leitura composta por chamadas em lote.** `GET /auctions` e
`GET /auctions/:id` montam a resposta com uma chamada em lote ao Catálogo e uma à
Identidade. O filtro por `cardTypeId`, que antes era SQL, passa a ser aplicado
em memória sobre a página.

**5. Tempo Real vira serviço próprio.** O gateway Socket.IO e o assinante Redis
saem do monólito. O handshake valida o JWT localmente e consulta a Identidade uma
vez por conexão.

## Hipóteses de medição

1. **Build sobe** com a construção de cinco imagens independentes.
2. **Inicialização sobe** pela soma dos healthchecks de 9 contêineres de aplicação
   e apoio (4 bancos).
3. **Componentes** vão de 7 para 12.
4. **LOC sobe** pela duplicação de código transversal (JWT, configuração,
   entidades de referência) e **cross-domain** também sobe, pelo mesmo motivo
   observado no s1 e no s2.
5. **Leitura (`GET /auctions`) cai** mais que no s2, por dois saltos adicionais de
   composição (Catálogo e Identidade) além do gateway.
6. **Escrita (`POST /bids`) cai** pela chamada de projeção ao Leilão depois do
   commit e pelo custo de manter o estado local.
7. **RAM sobe** bastante pelos quatro bancos dedicados.

## O que este snapshot testa

O s2 fechava leilões de forma atômica porque o banco era compartilhado. O
snapshot final mede o preço de separar a transação: mais processos, mais bancos,
mais tráfego interno e a perda da garantia de que o maior lance do Leilão é
sempre igual ao último lance gravado em Lances.
