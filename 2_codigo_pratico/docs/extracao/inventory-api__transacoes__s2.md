# Registro de extracao - inventory-api / Transacoes / snapshot-2

## Identificacao
- App: `inventory-api` (sistema critico / MES)
- Metodologia: Decomposicao por Transacoes (ACID)
- Snapshot: 2 (segunda extracao)
- Tag: `snap/inventory-api/transacoes/2`
- Branch: `exp/inventory-api/transacoes`
- Precursor: `docs/extracao/inventory-api__transacoes__s2.plan.md`

## O que foi feito (narrativa)
A Identidade (`auth` + `users`) foi extraida para
`services/inventory-api/identity/`. O monolito ficou reduzido ao modulo de
`reports`, com um `AuthModule` minimo que valida o JWT localmente (sem consultar
a Identidade a cada requisicao). A persistencia continuou compartilhada: o
servico de Identidade aponta para o mesmo PostgreSQL e tem o `prisma db push`
desativado no compose.

O Estoque deixou de consultar o endpoint interno do monolito e passou a validar
o usuario na Identidade (`/api/internal/users/:id`). A Identidade, por sua vez,
valida o armazem no Estoque (`/api/internal/warehouses/:id`). O roteamento
Strangler Fig passou a desviar `/api/auth` e `/api/users` para a Identidade;
`/api/reports` e `/docs` permanecem no monolito.

## Previsto x realizado
- Extrair a Identidade com banco compartilhado: **realizado**.
- Reduzir o monolito a reports + guardas JWT locais: **realizado**.
- Trocar a validacao de usuario do Estoque para a Identidade: **realizado**.
- Manter `/api/internal/*` fora do gateway: **realizado**.

## Procedimento (commits)
- Submodulo `inventory-api`: `9d15c42` (extracao da Identidade).
- Repo pai: commit deste snapshot + tag `snap/inventory-api/transacoes/2`.

## Evidencia automatica (media de 3 repeticoes)
| Metrica | Valor |
|---|---|
| Build (`--no-cache`) | 99.791 ms |
| Inicializacao | 12.537 ms |
| CPU total (repouso / carga) | 3,13 % / 247,83 % |
| RAM total (repouso / carga) | 185,32 MB / 327,95 MB |
| Imagens da aplicacao | monolito 151,5 MB + estoque 186,8 MB + identidade 187,9 MB |
| Componentes / containers | 5 / 5 |
| LOC total | 9.856 |
| Chamadas entre fronteiras | 81 de 419 |
| `GET products` | 439,1 req/s · p50 43,7 ms |
| `GET reports/movements` | 315,1 req/s · p50 60,3 ms |
| `GET reports/stock` | 184,9 req/s · p50 106,3 ms |
| `POST movements` | 316,8 req/s · p50 61,0 ms |

Todas as rotas de paridade responderam 200 e nao houve respostas non-2xx sob
carga. Pasta: `metricas/inventory-api/transacoes/snapshot-2/`.

## Aprendizado sobre decomposicao
[A preencher pelo autor]

## Impacto observado nas metricas
- Build e numero de componentes crescem com a terceira imagem de aplicacao.
- LOC total sobe pela duplicacao de codigo transversal (Identidade tambem leva
  copia de guardas, filtros e utilitarios).
- O caminho de escrita permanece com uma chamada remota (Estoque -> Identidade),
  agora entre dois servicos extraidos.
- Vazao das rotas de leitura cai um pouco em relacao ao s1; a escrita fica
  estavel.
