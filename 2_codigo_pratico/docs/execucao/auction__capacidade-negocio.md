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

### snapshot-2 (Leilão + worker)

- Serviço `services/auction/leilao/` com `auctions`, `auction-jobs` e o worker;
  NGINX desvia `/auctions` para ele. O serviço de Lances continua na base
  compartilhada.
- Resultados: build 90.035 ms (+9,3 %); inicialização 18.675 (+45,4 %); LOC 4.310
  (+20,0 %); cross-domain 125/239 (+16); componentes 7; imagens 314,6 MB
  (+50,0 %); RAM 245,6 / 425,3 MB; CPU 0,46 / 206,99 %; `auctions` 874,1
  (+1,8 %); `auction-by-id` 721,6 (+1,1 %); `bids` 152,7 (+0,3 %).
- Observações: a inicialização sobe porque a topologia ganhou dois contêineres
  com healthcheck. A leitura de leilões fica levemente acima do s1 — o serviço é
  menor que o monólito. O fechamento rodou no worker do novo serviço e
  transferiu a carta corretamente.

### snapshot-final (bancos isolados)

- Cinco servicos (Identidade, Catalogo, Leilao, Lances, Tempo Real) e o worker,
  com um PostgreSQL por servico e o monolito desativado: 12 conteineres.
- Resultados: build 116.823 ms (+29,8 %); inicializacao 30.848 (+65,2 %);
  LOC 4.552 (+5,6 %); cross-domain 109/223 (-16); componentes 12; imagens
  549,3 MB (+61,7 %); RAM 404,6 / 799,1 MB; CPU 2,75 / 259,79 %; `auctions`
  740,1 req/s (-15,3 %); `auction-by-id` 653,1 (p50 29,7); `bids` 87,2
  (p50 11,7), sem respostas fora da faixa 2xx.
- Observacoes: o cross-domain cai porque o monolito deixou de compor a solucao.
  A escrita cai 43 % por causa da transacao local em `lances_db` mais a
  chamada de projecao ao Leilao. A inicializacao sobe pela soma dos healthchecks
  e pela criacao de esquema nos quatro bancos.

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
- **Esquema criado por sincronização.** No snapshot final cada serviço tem o
  próprio banco, então o esquema é criado com `synchronize: true` na subida — o
  custo entra na métrica de inicialização.
- **Seed em quatro etapas.** Identidade, Catálogo, Lances (apenas reset) e Leilão
  rodam em sequência porque as referências atravessam bancos; o seed do Leilão é
  o último e imprime o `auctionId`.
- **Projeção sem compensação.** A chamada que leva o maior lance do serviço de
  Lances ao Leilão é registrada em log e não tem retentativa: uma falha deixa a
  projeção atrás do último lance gravado.

## Síntese para o capítulo 05

Extrair uma capacidade pequena não sai barato. No s1 o código cresceu 25 %
porque entidades e código transversal foram duplicados, e o acoplamento estático
subiu em vez de cair. Na fase seguinte o padrão se repetiu: mais 20 % de código e
o fechamento passou a rodar em processo próprio. O custo maior ficou na
infraestrutura.

O estado final mostra o preço de isolar a escrita. A rota de lance perde 43 % da
vazão porque deixa de ser uma transação única: o serviço de Lances grava no
próprio banco e envia o maior lance ao Leilão depois do commit. Em troca, saem o
monólito, quatro bancos dedicados e 12 contêineres, e a memória sob carga quase
dobra. O acoplamento estático cai de 125 para 109 arestas apenas porque o
monólito deixou de compor a solução; o acoplamento real migrou para 13 endpoints
internos que o `madge` não mede.

