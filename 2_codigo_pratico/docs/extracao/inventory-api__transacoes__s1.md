# Registro de extracao - inventory-api / Transacoes / snapshot-1

## Identificacao
- App: `inventory-api` (sistema critico / MES)
- Metodologia: Decomposicao por Transacoes (ACID)
- Snapshot: 1 (primeira extracao)
- Tag: `snap/inventory-api/transacoes/1`
- Branch: `exp/inventory-api/transacoes`
- Precursor: `docs/extracao/inventory-api__transacoes__s1.plan.md`

## O que foi feito (narrativa)
O grupo atomico de estoque (`warehouses`, `products` e `movements`) foi extraido
para o servico `services/inventory-api/estoque/`, reaproveitado da trilha de
Capacidade de Negocio. O monolito manteve `auth`, `users` e `reports` e passou a
depender de uma copia local do `MovementTypeMapper` no modulo de relatorios.

Como a persistencia permaneceu **compartilhada**, o servico de Estoque aponta
para o mesmo PostgreSQL do monolito e tem o `prisma db push` desativado no
compose. Para preservar a validacao do usuario referenciado pelo movimento, o
monolito passou a expor `GET /api/internal/users/:id`; o Estoque consulta esse
endpoint via HTTP (camada anticorrupcao). A coluna `stock_movements.user_email`
foi adicionada por migration para que o servico guarde o e-mail do usuario.

O roteamento Strangler Fig desvia `/api/warehouses`, `/api/products` e
`/api/movements` para o novo servico; `/api/auth`, `/api/users`, `/api/reports`
e `/docs` permanecem no monolito.

## Previsto x realizado
- Extrair o grupo atomico primeiro: **realizado**.
- Banco compartilhado com servico sem `db push`: **realizado**.
- Validacao de usuario por HTTP no monolito: **realizado**.
- Adicionar `user_email` ao banco compartilhado: **realizado** (migration aplicada
  no start do monolito; conferida no banco).

## Procedimento (commits)
- Submodulo `inventory-api`: `0848e7e` (extracao do grupo atomico e ajustes do
  monolito).
- Repo pai: commit deste snapshot (com compose, gateway, config do harness,
  metricas e este registro) + tag `snap/inventory-api/transacoes/1`.

## Evidencia automatica (media de 3 repeticoes)
| Metrica | Valor |
|---|---|
| Build (`--no-cache`) | 75.321 ms |
| Inicializacao | 9.788 ms |
| CPU total (repouso / carga) | 1,95 % / 259,31 % |
| RAM total (repouso / carga) | 146,86 MB / 305,28 MB |
| Imagens da aplicacao | monolito 151,6 MB + estoque 186,8 MB |
| Componentes / containers | 4 / 4 |
| LOC total | 9.431 |
| Chamadas entre fronteiras | 77 de 408 |
| `GET products` | 468,6 req/s · p50 41,3 ms |
| `GET reports/movements` | 339,3 req/s · p50 55,7 ms |
| `GET reports/stock` | 196,0 req/s · p50 100,3 ms |
| `POST movements` | 314,1 req/s · p50 62,3 ms |

Todas as rotas de paridade responderam 200 e nao houve respostas non-2xx sob
carga. Pasta: `metricas/inventory-api/transacoes/snapshot-1/`.

## Aprendizado sobre decomposicao
[A preencher pelo autor]

## Impacto observado nas metricas
- O build sobe em relacao ao S0 canonico (mais uma imagem independente).
- LOC total cresce pela duplicacao de codigo transversal no servico, apesar de
  o monolito perder tres contextos.
- O caminho de escrita (`POST /movements`) ja cruza processo neste snapshot:
  produto e armazem sao validados no banco compartilhado, mas o usuario e
  validado por HTTP no monolito.
- O acoplamento medido entre fronteiras cai no monolito, mas a chamada HTTP de
  validacao de usuario nao e capturada pela analise estatica.
