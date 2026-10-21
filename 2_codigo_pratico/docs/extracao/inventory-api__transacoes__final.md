# Registro de extracao - inventory-api / Transacoes / snapshot-final

## Identificacao
- App: `inventory-api` (sistema critico / MES)
- Metodologia: Decomposicao por Transacoes (ACID)
- Snapshot: final (decomposicao concluida)
- Tag: `snap/inventory-api/transacoes/final`
- Branch: `exp/inventory-api/transacoes`
- Precursor: `docs/extracao/inventory-api__transacoes__final.plan.md`

## O que foi feito (narrativa)
O modulo de Relatorios foi extraido para `services/inventory-api/reports/` e o
monolito foi desativado. O estado final tem tres servicos (`identity`,
`estoque`, `reports`), dois PostgreSQL dedicados (`inventory_identity` e
`inventory_estoque`) e o gateway NGINX na borda. O servico de Relatorios nao tem
banco: le armazens, produtos e movimentos pela API interna do Estoque.

Os servicos `identity`, `estoque` e `reports` foram reaproveitados sem alteracao
de codigo em relacao ao estado final da trilha de Capacidade de Negocio. A
diferenca da trilha de Transacoes esta na trajetoria: o grupo atomico saiu
primeiro (s1), a Identidade depois (s2) e os Relatorios por ultimo.

## Previsto x realizado
- Persistencia isolada (um banco por servico de escrita): **realizado**.
- Relatorios sem banco, consultando o Estoque por HTTP: **realizado**.
- Monolito desativado: **realizado**.
- Convergencia com a topologia final da Capacidade: **observada** (mesmos
  servicos, mesmos 6 containers e mesmos valores de LOC e cross-domain).

## Procedimento (commits)
- Submodulo `inventory-api`: sem alteracoes em relacao ao s2 (`9d15c42`).
- Repo pai: commit deste snapshot + tag `snap/inventory-api/transacoes/final`.

## Evidencia automatica (media de 3 repeticoes)
| Metrica | Valor |
|---|---|
| Build (`--no-cache`) | 111.724 ms |
| Inicializacao | 14.028 ms |
| CPU total (repouso / carga) | 1,75 % / 433,39 % |
| RAM total (repouso / carga) | 203,03 MB / 421,79 MB |
| Componentes / containers | 6 / 6 |
| LOC total | 9.599 |
| Chamadas entre fronteiras | 78 de 416 |
| `GET products` | 478,2 req/s · p50 40,3 ms |
| `GET reports/movements` | 368,2 req/s · p50 52,3 ms |
| `GET reports/stock` | 375,6 req/s · p50 52,0 ms |
| `POST movements` | 315,0 req/s · p50 61,7 ms |

Todas as rotas de paridade responderam 200 e nao houve respostas non-2xx sob
carga. Pasta: `metricas/inventory-api/transacoes/snapshot-final/`.

## Aprendizado sobre decomposicao
[A preencher pelo autor]

## Impacto observado nas metricas
- O estado final converge com a trilha de Capacidade de Negocio: mesma
  topologia (3 servicos, 2 bancos, 6 containers), mesmos 9.599 LOC e mesmas
  78/416 chamadas entre fronteiras.
- A trajetoria, porem, foi diferente: o custo de isolar a invariante ACID foi
  pago ja no s1, e o caminho de escrita passou a cruzar processo antes das
  outras trilhas.
- A vazao final das rotas de leitura ficou alta (produtos 478 req/s,
  reports/stock 376 req/s), coerente com a topologia isolada.
- CPU/RAM sob carga sobem com os dois bancos dedicados; o repouso cai em relacao
  ao s2 porque o monolito deixa de existir.
