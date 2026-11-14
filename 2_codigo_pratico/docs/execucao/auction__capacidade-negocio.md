# Diário de Execução — leilão / Capacidade de Negócio

> Um arquivo por trilha. Consolida hipótese, decisões, snapshots e observações.
> É o rascunho direto da seção correspondente do capítulo 05.

## Identificação

- App: `auction` (leilão de cartas / Postgres + Redis)
- Metodologia: Capacidade de Negócio
- Branch: `exp/auction/capacidade-negocio` (pai e fork)
- Baseline: `baseline/auction` / fork `baseline/experimento`
- Medição: 14/11/2026

## Hipótese de decomposição

Cinco capacidades: Identidade, Catálogo de Cartas, Leilão, Lances e Tempo Real.
O worker pertence ao Leilão. Ordem: Lances → Leilão → Identidade + Catálogo +
Tempo Real.

## Snapshots

### snapshot-0 (baseline)

- Build 76.076 ms; inicialização 12.627 ms; LOC 2.863; cross-domain 88/174;
  componentes 4; RAM 137,5 / 313,6 MB; CPU 0,21 / 191,32 %.
- `auctions` 923,9 req/s (p50 20,7); `auction-by-id` 751,6 (p50 25,3);
  `bids` 159,0 (p50 6,0, uma conexão).
- A rota de lances usa uma conexão porque a transação serializa no leilão e o
  app recusa lances fora de ordem.

### snapshot-1 (Lances)

- Serviço `services/auction/lances/` com banco compartilhado; NGINX na 3000 e
  monólito na 3100 interna. Worker continua no monólito.
- Resultados: build 82.340 ms (+8,2 %); inicialização 12.843 (+1,7 %); LOC 3.593
  (+25,5 %); cross-domain 109/206 (+21); componentes 6; imagens 209,7 MB
  (+100 %); RAM 197,8 / 379,1 MB; CPU 0,21 / 204,34 %; `auctions` 859,0
  (−7,0 %); `auction-by-id` 713,6 (−5,1 %); `bids` 152,2 (−4,3 %).
- Observações: o LOC cresce pela cópia de entidades, guarda de autenticação e
  publicador de eventos. O cross-domain sobe porque o serviço recria as arestas
  internas do módulo. As leituras caem com o salto pelo gateway.

## Desvios e dificuldades

- **Build em `dist/src`.** O `nest build` compila também `scripts/`, então o
  artefato fica em `dist/src/main.js`. Os comandos do compose refletem isso.
- **Migrações no start da API.** A imagem de produção não tem ts-node; um script
  JS em `scripts/migrate.js` roda as migrações antes do `main.js`.
- **Lances com uma conexão.** Com 20 conexões, os valores crescentes chegam fora
  de ordem e o servidor recusa os menores; a primeira tentativa gerou 4.619
  respostas 4xx.
- **Entidades copiadas.** O serviço de Lances precisa mapear `Auction`, `Card`,
  `CardType` e `User` para a relação do leilão funcionar na base compartilhada.

## Síntese para o capítulo 05

Extrair uma capacidade pequena não sai barato: o código cresce 25 % porque as
entidades e o código transversal são duplicados, e o acoplamento estático sobe
em vez de cair. Em troca, a rota de escrita passa a ter processo próprio, com
apenas 4 % de perda de vazão. O custo maior está em infraestrutura: mais um
processo, mais uma imagem e 44 % de memória em repouso.
