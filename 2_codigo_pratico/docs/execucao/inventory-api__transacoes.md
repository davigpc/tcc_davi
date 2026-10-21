# Diario de Execucao - inventory-api / Transacoes (ACID)

> Um arquivo por trilha. Consolida hipotese, decisoes, snapshots e observacoes.

## Identificacao
- App: `inventory-api` (papel no TCC: sistema critico / MES)
- Metodologia: Decomposicao por Transacoes (ACID)
- Branch: `exp/inventory-api/transacoes`
- Baseline (codigo): `50fca6d` (Snapshot 0 canonico, ADR-0003)
- Ordem: grupo atomico (Estoque) -> Identidade -> Relatorios

## Hipótese de decomposicao
O criterio de Transacoes agrupa o que precisa cair na mesma transacao. A
invariante de estoque (ADR-0006/0008) exige que movimentos, produtos e armazens
fiquem juntos, formando o servico `Estoque`. Identidade e Relatorios ficam fora
da invariante. Ao contrario da trilha de Capacidade, o grupo atomico e extraido
**primeiro**, para observar o custo de proteger a invariante desde o inicio.

## Snapshots

### snapshot-0 (baseline)
- Nao remedido: usa o S0 canonico de `capacidade-negocio/snapshot-0` (ADR-0003).
- Referencia: build 46.746 ms; startup 9.155 ms; LOC 8.783; 2 containers;
  69/389 chamadas entre fronteiras.

### snapshot-1 (Estoque)
- Tag: `snap/inventory-api/transacoes/1`
- Submodulo: `0848e7e`
- Topologia: monolito (auth+users+reports) + servico de Estoque + PostgreSQL
  compartilhado + NGINX (4 containers).
- Build 75.321 ms; startup 9.788 ms; LOC 9.431; 77/408 cross-domain.
- CPU total (repouso / carga): 1,95 % / 259,31 %.
- RAM total (repouso / carga): 146,86 MB / 305,28 MB.
- Perf: products 468,6 req/s; reports/movements 339,3; reports/stock 196,0;
  movements-post 314,1.
- Diferenca central: o caminho de escrita ja cruza processo (validacao do
  usuario no monolito via HTTP); na Capacidade ele permanece local ate o final.

### snapshot-2 (Identidade)
- Tag: `snap/inventory-api/transacoes/2`
- Submodulo: `9d15c42`
- Topologia: monolito (reports) + Estoque + Identidade + PostgreSQL compartilhado
  + NGINX (5 containers).
- Build 99.791 ms; startup 12.537 ms; LOC 9.856; 81/419 cross-domain.
- CPU total (repouso / carga): 3,13 % / 247,83 %.
- RAM total (repouso / carga): 185,32 MB / 327,95 MB.
- Perf: products 439,1 req/s; reports/movements 315,1; reports/stock 184,9;
  movements-post 316,8.

### snapshot-final (Relatorios)
- Tag: `snap/inventory-api/transacoes/final`
- Topologia: Identidade + Estoque + Relatorios + 2 PostgreSQL + NGINX
  (6 containers); monolito desativado; persistencia isolada.
- Build 111.724 ms; startup 14.028 ms; LOC 9.599; 78/416 cross-domain.
- CPU total (repouso / carga): 1,75 % / 433,39 %.
- RAM total (repouso / carga): 203,03 MB / 421,79 MB.
- Perf: products 478,2 req/s; reports/movements 368,2; reports/stock 375,6;
  movements-post 315,0.

## Desvios e dificuldades
- O servico de Estoque foi reaproveitado do estado final da trilha de Capacidade,
  mas no s1/s2 roda com banco compartilhado e `prisma db push` desativado no
  compose.
- Foi necessario adicionar a coluna `stock_movements.user_email` por migration
  para que o Estoque mantivesse o e-mail do usuario no banco compartilhado.
- A validacao de usuario do Estoque usou o endpoint interno do monolito no s1 e
  o da Identidade no s2/final, conforme a extracao avancou.
- O estado final converge com a Capacidade de Negocio (mesmos servicos, LOC e
  cross-domain). O que difere e a trajetoria e o momento em que o custo e pago.

## Sintese para o capitulo 05
No inventario, os criterios de Capacidade de Negocio e Transacoes chegam a mesma
fronteira final, porque a invariante ACID domina o agrupamento. A trilha de
Transacoes antecipa o custo de proteger a invariante: o grupo atomico sai no s1
e a escrita deixa de ser local antes das demais trilhas. A convergencia final e
um resultado, nao uma ausencia de diferenca: mostra que o poder de discriminacao
do criterio depende do dominio.
