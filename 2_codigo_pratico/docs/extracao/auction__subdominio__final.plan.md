# Pre-registro de Extração — leilão / Subdomínio (DDD) / snapshot final

## O que sai do monólito

O **núcleo Leilão** sai como serviço único em `services/auction/leilao/` (derivado
do monólito), com:

- `auctions`, `auction-jobs` e o **worker** (mesma imagem, entrypoint próprio);
- `bids` — lances continuam no núcleo;
- `leilao_db` próprio.

O monólito é desativado. Identidade, Catálogo e Tempo Real já estavam fora desde
o s1 e o s2.

## Topologia final

- `identidade` + `identity_db`
- `catalogo` + `catalogo_db`
- `leilao` (API) e `leilao_worker` + `leilao_db`
- `tempo-real` (sem banco)
- Redis (fila de fechamento e canal de eventos)
- NGINX na 3000

Dez contêineres no total.

## Decisões de fronteira

**1. O lance continua atômico.** `bids` e `auctions` ficam no mesmo serviço e no
mesmo banco. A transação do lance ainda trava a linha do leilão, grava o lance e
atualiza o maior lance na mesma escrita. É a diferença central em relação à
Capacidade de Negócio, onde Lances e Leilão ficaram separados e o maior lance
virou projeção.

**2. A carta deixa de ser acessível por SQL.** A criação do leilão trava a carta
por `POST /api/internal/cards/:id/lock` e o fechamento transfere por
`POST /api/internal/cards/:id/transfer`. A transferência é idempotente por
`auctionId` e o estado `CLOSING` serve de ponto de retomada: o leilão só vira
`CLOSED` depois que o Catálogo confirma.

**3. A resposta do leilão é composta por duas chamadas internas.** `GET /auctions`
e `GET /auctions/:id` consultam o Catálogo em lote (carta e tipo de carta) e a
Identidade em lote (vendedor e dono). O leilão guarda apenas `cardId` e
`sellerUserId`.

**4. O worker lê os lances localmente.** Como `bids` está no mesmo banco, o
fechamento não precisa consultar outro serviço para achar o maior lance — só para
transferir a carta.

## Hipóteses de medição

1. **Build e memória sobem** pela quarta imagem de aplicação e pelo terceiro banco.
2. **Componentes** vão para 10.
3. **LOC cresce** pela duplicação de código transversal; o código do monólito
   sai, mas os clientes HTTP entram.
4. **Cross-domain cai** em relação ao s2, porque o monólito deixa de compor a
   solução.
5. **Leitura cai** pelos dois saltos de composição além do gateway.
6. **Escrita fica próxima do s2**, já que a transação continua local; o único
   acréscimo é o salto do gateway no caminho do lance.

## O que este snapshot testa

Se agrupar leilão e lances no núcleo preserva a consistência da escrita ao preço
de manter um serviço maior — o contraste direto com a Capacidade de Negócio, que
separou as duas capacidades e pagou a perda de 45 % na vazão de lances.
