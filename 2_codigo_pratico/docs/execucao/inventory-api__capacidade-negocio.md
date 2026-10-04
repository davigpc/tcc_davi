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

**Resultados (mediana de 3 repetições):**

| Dimensão | Métrica | Valor |
|---|---|---|
| Agilidade | Tempo de build (`--no-cache`) | 42.549 ms (≈ 42,5 s) |
| Agilidade | Tempo de inicialização | 8.779 ms (≈ 8,8 s) |
| Custo | CPU/RAM repouso `inventory_app` | 1,01 % / 50,5 MB |
| Custo | CPU/RAM repouso `inventory_db` | 1,13 % / 33,3 MB |
| Custo | Imagem `inventory-api-app` | 151,6 MB |
| Custo | Imagem `postgres:15-alpine` | 109,9 MB |
| Desempenho | `GET products` | 554,9 req/s · p50/p90/p99 35/38/43 ms |
| Desempenho | `GET reports/movements` | 357,8 req/s · 54/60/104 ms |
| Desempenho | `GET reports/stock/:id` | 202,5 req/s · 98/101/112 ms |
| Desempenho | `POST movements` | 331,6 req/s · 59/65/75 ms |
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

**Resultados (mediana de 3 repetições):**

| Dimensão | Métrica | snapshot-0 | snapshot-1 |
|---|---|---|---|
| Agilidade | build (`--no-cache`) | 42.549 ms | 121.285 ms |
| Agilidade | inicialização | 8.841 ms | 10.631 ms |
| Custo | CPU/RAM repouso (total) | ~2,1 % / ~84 MB | (4 contêineres) |
| Custo | componentes / containers | 2 / 2 | 4 / 4 |
| Desempenho | `products` | 562,8 req/s | 323,9 req/s |
| Desempenho | `reports/movements` | 360,4 req/s | 256,6 req/s |
| Desempenho | `reports/stock` | 202,3 req/s | 131,3 req/s |
| Desempenho | `movements` | 309,9 req/s | 223,4 req/s |
| Manutenibilidade | LOC | 8.783 | 9.165 |
| Manutenibilidade | cross-domain | 69 / 389 | 73 / 402 |

**Observações:**
- Build triplicou (mais uma imagem + dependências sem cache); startup +20 %.
- Vazão caiu em todas as rotas (~28–42 %): salto extra pelo NGINX + concorrência
  de mais contêineres na mesma máquina.
- LOC subiu por duplicação de código transversal (`shared`/`auth`/`database`);
  cross-domain não caiu (o serviço recria arestas entre fronteiras).
- Paridade funcional confirmada por smoke test: `products` (monólito) e as três
  rotas de `reports` (serviço) respondem com os mesmos dados do baseline.

### snapshot-2 (segunda extração)
- A definir.

### snapshot-final (decomposição concluída)
- A definir.

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
