# Diário de Execução — inventory-api / Capacidade de Negócio

> Um arquivo por trilha. Consolida hipótese, decisões, snapshots e observações.
> É o rascunho direto da seção correspondente do capítulo 05.

## Identificação
- App: `inventory-api` (papel no TCC: sistema crítico / MES)
- Metodologia: Capacidade de Negócio
- Branch: `exp/inventory-api/capacidade-negocio` (a criar na Etapa C)
- Baseline (código): `338b0d7bb9f195766c746f85a229ad92ac09fd11`

## Hipótese de decomposição
Em `roteiro.md` §4.1, a Capacidade de Negócio prevê três serviços:
**Administração/Identidade · Controle de Estoque · Relatórios**.
A extração inicial do tracer bullet é o serviço de **Relatórios** (`reports`),
por ser somente leitura (CQRS parcial) e não possuir dependências reversas.

## Snapshots

### snapshot-0 (baseline monolítico)
- Pasta: `metricas/inventory-api/capacidade-negocio/snapshot-0/`
- Tag: `snap/inventory-api/capacidade-negocio/0`
- Manifest: commit pai `5cf2664`, submódulo `338b0d7`, Docker 29.7.2, Node v22.17.1.

**Resultados (média de 3 repetições):**

| Dimensão | Métrica | Valor |
|---|---|---|
| Agilidade | Tempo de build (`--no-cache`) | 46.746 ms (≈ 46,7 s) |
| Agilidade | Tempo de inicialização | 9.155 ms (≈ 9,2 s) |
| Custo | CPU total (repouso / carga) | 2,22 % / 241,0 % |
| Custo | RAM total (repouso / carga) | 86,3 MB / 188,5 MB |
| Custo | Imagem `inventory-api-app` | 151,6 MB |
| Custo | Imagem `postgres:15-alpine` | 109,9 MB |
| Desempenho | `GET products` | 557,2 req/s · p50/p90/p99 34,7/38,7/45 ms |
| Desempenho | `GET reports/movements` | 350,8 req/s · 55/61/105,3 ms |
| Desempenho | `GET reports/stock/:id` | 201,3 req/s · 97,7/103,3/114 ms |
| Desempenho | `POST movements` | 311,9 req/s · 63/72,3/89 ms |
| Manutenibilidade | LOC (TypeScript) | 8.783 linhas |
| Manutenibilidade | Componentes / containers | 2 serviços / 2 containers |
| Manutenibilidade | Chamadas entre fronteiras | 69 de 389 (17,7 %) |

**Referências de paridade:** `paridade/golden.json` (respostas das rotas de leitura).
**Tabela para o texto:** `tabelas/metricas.tex` (importar via `\input`).

**Figuras (9):** `vazao-rotas`, `latencia-rotas` (p50/p90/p99 + min–máx),
`cpu-repouso-carga`, `ram-repouso-carga`, `loc-modulos`, `cross-domain-modulos`,
`imagens`, `vazao-latencia-dispersao` (dispersão) e `cross-domain-heatmap`
(matriz módulo×módulo).

**Observações do baseline:**
- `reports/stock` é a rota mais custosa (98 ms p50) — a literatura do próprio
  repositório confirma "sem cache; relatórios calculados a cada request".
- O acoplamento entre fronteiras (69/389) é o teto de referência: as três
  metodologias buscam reduzi-lo. Maiores emissores: `products→shared` (9),
  `warehouses→shared` (8), `movements→shared` (6), `users→auth` (6).
- O `PrismaService` loga conexão **6×** (uma por módulo), indício de múltiplas
  instâncias do client — relevante para a discussão de acoplamento.
- Dois seeds divergentes no repositório; adotou-se `src/database/seeds/seed.ts`
  (decisão 0001).

### snapshot-1 (primeira extração — Relatórios)
- Pasta: `metricas/inventory-api/capacidade-negocio/snapshot-1/`
- Tag: `snap/inventory-api/capacidade-negocio/1`
- Pré-registro: `docs/extracao/inventory-api__capacidade-negocio__s1.plan.md`
- Registro: `docs/extracao/inventory-api__capacidade-negocio__s1.md`
- Serviço extraído: `services/inventory-api/reports/`; gateway `infra/gateway/nginx.conf`;
  compose `infra/compose/inventory-api-capacidade-negocio-s1.yml`.

**Resultados (média de 3 repetições):**

| Dimensão | Métrica | snapshot-0 | snapshot-1 |
|---|---|---|---|
| Agilidade | build (`--no-cache`) | 46.746 ms | 116.353 ms |
| Agilidade | inicialização | 9.155 ms | 10.594 ms |
| Custo | CPU total (repouso / carga) | 2,22 % / 241,0 % | 2,78 % / 242,7 % |
| Custo | RAM total (repouso / carga) | 86,3 MB / 188,5 MB | 149,4 MB / 306,3 MB |
| Custo | componentes / containers | 2 / 2 | 4 / 4 |
| Desempenho | `products` | 557,2 req/s | 311,6 req/s |
| Desempenho | `reports/movements` | 350,8 req/s | 245,6 req/s |
| Desempenho | `reports/stock` | 201,3 req/s | 138,0 req/s |
| Desempenho | `movements` | 311,9 req/s | 214,5 req/s |
| Manutenibilidade | LOC | 8.783 | 9.165 |
| Manutenibilidade | cross-domain | 69 / 389 | 73 / 402 |

**Observações:**
- Build com aumento significativo (mais uma imagem + dependências sem cache); startup +16 %.
- Vazão caiu em todas as rotas (~30–44 %): salto extra pelo NGINX + concorrência
  de mais contêineres na mesma máquina.
- LOC subiu por duplicação de código transversal (`shared`/`auth`/`database`);
  cross-domain não caiu (o serviço recria arestas entre fronteiras).
- Paridade funcional confirmada por smoke test: `products` (monólito) e as três
  rotas de `reports` (serviço) respondem com os mesmos dados do baseline.

### snapshot-2 (segunda extração — Administração/Identidade)
- Pasta: `metricas/inventory-api/capacidade-negocio/snapshot-2/`
- Tag: `snap/inventory-api/capacidade-negocio/2`
- Pré-registro: `docs/extracao/inventory-api__capacidade-negocio__s2.plan.md`
- Registro: `docs/extracao/inventory-api__capacidade-negocio__s2.md`
- Serviço extraído: `services/inventory-api/identity/` (auth + users); gateway
  `infra/gateway/nginx-capacidade-s2.conf`; compose
  `infra/compose/inventory-api-capacidade-negocio-s2.yml`.
- O monólito removeu `auth`/`users`, mantendo apenas os guardas de JWT locais
  (autenticação *stateless*).

**Resultados (média de 3 repetições):**

| Dimensão | Métrica | snapshot-1 | snapshot-2 |
|---|---|---|---|
| Agilidade | build (`--no-cache`) | 116.353 ms | 108.405 ms |
| Agilidade | inicialização | 10.594 ms | 13.166 ms |
| Custo | CPU total (repouso / carga) | 2,78 % / 242,7 % | 6,24 % / 255,4 % |
| Custo | RAM total (repouso / carga) | 149,4 / 306,3 MB | 186,9 / 352,7 MB |
| Custo | componentes / containers | 4 / 4 | 5 / 5 |
| Desempenho | `products` | 311,6 req/s | 379,4 req/s |
| Desempenho | `reports/movements` | 245,6 req/s | 301,0 req/s |
| Desempenho | `reports/stock` | 138,0 req/s | 165,2 req/s |
| Desempenho | `movements` | 214,5 req/s | 219,4 req/s |
| Manutenibilidade | LOC | 9.165 | 9.796 |
| Manutenibilidade | cross-domain | 73 / 402 | 78 / 414 |

**Observações:**
- Startup subiu (+24 %); build estável (dentro da variância do `--no-cache`).
- Vazão **aumentou** em todas as rotas (contrariando a hipótese): a extração da
  Identidade retirou do processo do monólito os guardas/JWT.
- LOC e cross-domain subiram por duplicação de `shared`/`database`/guardas.
- Paridade confirmada: login/users (Identidade), products/movements (monólito) e
  reports (serviço) respondem como no baseline.

### snapshot-final (decomposição concluída — Controle de Estoque + persistência isolada)
- Pasta: `metricas/inventory-api/capacidade-negocio/snapshot-final/`
- Tag: `snap/inventory-api/capacidade-negocio/final`
- Pré-registro: `docs/extracao/inventory-api__capacidade-negocio__final.plan.md`
- Registro: `docs/extracao/inventory-api__capacidade-negocio__final.md`
- Serviço extraído: `services/inventory-api/estoque/`; o monólito é **desativado**.
- **Persistência isolada**: banco por serviço (`inventory_identity`,
  `inventory_estoque`); Relatórios sem banco. Acessos cruzados por HTTP
  (anticorrupção); `stock_movements.user_email` denormalizado.
- Compose final: `infra/compose/inventory-api-capacidade-negocio-final.yml`
  (2 PostgreSQL + Identidade + Estoque + Relatórios + NGINX);
  gateway `infra/gateway/nginx-capacidade-final.conf`.

**Resultados (média de 3 repetições):**

| Dimensão | Métrica | snapshot-2 | snapshot-final |
|---|---|---|---|
| Agilidade | build (`--no-cache`) | 108.405 ms | 138.371 ms |
| Agilidade | inicialização | 13.166 ms | 12.051 ms |
| Custo | CPU total (repouso / carga) | 6,24 % / 255,4 % | 6,6 % / 405,8 % |
| Custo | RAM total (repouso / carga) | 186,9 / 352,7 MB | 203,6 / 445,1 MB |
| Custo | componentes / containers | 5 / 5 | 6 / 6 |
| Desempenho | `products` | 379,4 req/s | 469,8 req/s |
| Desempenho | `reports/movements` | 301,0 req/s | 328,7 req/s |
| Desempenho | `reports/stock` | 165,2 req/s | 347,4 req/s |
| Desempenho | `movements` | 219,4 req/s | 294,4 req/s |
| Manutenibilidade | LOC (só serviços) | 9.796 | 9.599 |
| Manutenibilidade | cross-domain | 78 / 414 | 78 / 416 |

**Observações:**
- Persistência isolada custou recursos (2 bancos dedicados, +1 serviço): RAM/CPU
  sob carga subiram.
- A vazão **subiu** em todas as rotas (contrariando a hipótese de cascata HTTP):
  Relatórios agrega em memória sem conexão de banco; ressalva de variância.
- Cross-domain estático ficou ~igual; o acoplamento de rede (HTTP) não é medido
  pelo `madge`.
- Paridade confirmada (login/users, products/movements, reports/stock/alerts/movements,
  incl. validações cruzadas via HTTP).

**Status da trilha:** `inventory-api` × Capacidade de Negócio **concluída**
(s0 → s1 → s2 → final).



## Desvios e dificuldades
- Ajustes no harness durante a primeira medição: (a) o `madge` devolve caminhos
  relativos à raiz, o que zerou a contagem inicial de cross-domain; (b) o corpo
  do `POST movements` não tinha os placeholders `{{productId}}`/`{{warehouseId}}`
  resolvidos; (c) o reset por seed invalida token/ids, exigindo re-login por
  repetição. Corrigidos antes da medição final.
- O `cloc` foi substituído por `sloc` (o `cloc` exige Perl, ausente no Windows).
- `pnpm` fixado em `@9` no Dockerfile (drift de toolchain) — decisão 0002.

## Síntese para o capítulo 05
(será escrita após as extrações, comparando snapshot-0 × 1 × 2 × final)
