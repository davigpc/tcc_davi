# ADR-0006 — Baseline executável do leilão para o experimento

## Contexto

O `auction` é a terceira aplicação do estudo e a única com dois processos: uma
API NestJS e um worker que consome a fila de fechamento. O repositório original
sobe em modo de desenvolvimento, com `npm run start:dev`, ts-node e frontend
Next.js. Para o experimento é preciso uma topologia enxuta, determinística e
comparável com as outras duas aplicações.

## Decisão

**Topologia do Snapshot 0** (`infra/compose/auction-baseline.yml`):

| Contêiner | Imagem | Papel |
|---|---|---|
| `api` | `auction-baseline-app` | REST + Socket.IO na 3000 |
| `worker` | `auction-baseline-app` | fila BullMQ, fechamento e varredor |
| `postgres` | `postgres:16` | banco relacional |
| `redis` | `redis:7` | fila BullMQ e pub/sub do tempo real |

A API e o worker usam **a mesma imagem**, com comandos diferentes
(`dist/src/main.js` e `dist/src/worker.js`). O tamanho da imagem é contado uma
vez, e o número de contêineres reflete os processos em execução.

**Migrações no start da API.** O `nest build` compila também `scripts/`, então o
artefato fica em `dist/src/main.js` e as migrações em
`dist/src/database/migrations/*.js`. Como a imagem de produção não tem ts-node, a
API roda `node scripts/migrate.js` antes de subir, e o worker espera a API ficar
saudável. O script aponta para o diretório compilado e não altera o código da
aplicação.

**Seed em JavaScript puro** (`scripts/seed-local.js`). Usa `pg` e `bcrypt`, que
são dependências de produção: trunca as tabelas e cria dois usuários, três tipos
de carta, três cartas e um leilão ativo com duração de seis horas. O leilão não
fecha durante a medição. O script imprime o `auctionId` para o harness.

**Seed determinístico, mas com identificadores novos a cada execução.** O banco é
truncado antes de cada repetição, como nas outras aplicações.

## Medição

- **Leitura:** `GET /auctions` e `GET /auctions/:id` com 20 conexões.
- **Escrita:** `POST /auctions/:id/bids` com **uma conexão**, e valores
  crescentes por requisição (`start + sequência`). O `placeBid` trava o leilão
  com `pessimistic_write` e exige que cada lance seja maior que o anterior; com
  20 conexões, a ordem de chegada dos valores crescentes se inverte e o servidor
  recusa os lances fora de ordem. A primeira tentativa, a 20 conexões, produziu
  4.619 respostas 4xx; com uma conexão, zero. O número mede o caminho
  transacional serializado, não a contenção do agregado.
- **Tempo real:** não medido. O harness é HTTP e o Socket.IO exige um cliente
  próprio. Fica registrado como lacuna, como o webhook no e-commerce.

## Resultado do Snapshot 0

Média de três execuções.

| Dimensão | Métrica | Valor |
|---|---|---|
| Agilidade | Build (`--no-cache`) | 76.076 ms |
| Agilidade | Inicialização | 12.627 ms |
| Custo | Componentes / contêineres | 4 / 4 |
| Custo | Imagens da aplicação | 104,9 MB |
| Custo | RAM (repouso / carga) | 137,5 / 313,6 MB |
| Custo | CPU (repouso / carga) | 0,21 / 191,32 % |
| Desempenho | `GET /auctions` | 923,9 req/s · p50 20,7 ms |
| Desempenho | `GET /auctions/:id` | 751,6 req/s · p50 25,3 ms |
| Desempenho | `POST /auctions/:id/bids` (1 conexão) | 159,0 req/s · p50 6,0 ms |
| Manutenibilidade | Linhas de Código | 2.863 |
| Manutenibilidade | Chamadas entre fronteiras | 88 de 174 |

## Consequências

- O baseline tem quatro contêineres, contra três nas outras aplicações. A
  comparação de componentes e de memória precisa considerar essa diferença.
- O caminho de fechamento roda no worker, não na rota HTTP. Assim como o webhook
  do e-commerce, ele só é medido se a trilha criar uma rota ou um evento
  específico.
- O harness ganhou `loginPath` (a aplicação não usa prefixo `/api`) e o campo
  `sequence`, que injeta valores crescentes no corpo por requisição.
