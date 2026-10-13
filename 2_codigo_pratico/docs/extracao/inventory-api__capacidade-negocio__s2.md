# Registro de Extração — inventory-api / Capacidade de Negócio / snapshot-2

> Escrito depois da extração. Combina a narrativa com a evidência automática.
> Rascunho direto do "como foi feita".

## O que foi feito

Extraiu-se a capacidade **Administração/Identidade** (`auth` + `users`) do
monólito para o serviço NestJS `services/inventory-api/identity/`, servido atrás
do gateway NGINX (Strangler Fig), mantendo o mesmo contrato HTTP e o mesmo
PostgreSQL (opção 1 de persistência).

- O **monólito** deixou de registrar `AuthModule` (completo) e `UsersModule`; as
  pastas `src/auth/` e `src/users/` foram removidas. Restou apenas a validação de
  JWT (`JwtAuthGuard`, `RolesGuard`, `JwtStrategy`), necessária aos controllers de
  `warehouses`, `products` e `movements`.
- O **novo serviço** contém `auth` e `users` completos (login, refresh, CRUD de
  usuários), cópias de `shared` e `database` (Prisma) e o seed.
- O **NGINX** passou a desviar `/api/auth` e `/api/users` para a Identidade;
  `/api/reports` continua no serviço de Relatórios e o restante no monólito.

## Procedimento (sequência de commits)

**Submódulo `inventory-api`** (branch `exp/inventory-api/capacidade-negocio`):
```
exp(inventory/capacidade/s2): remove auth/users do monolito, mantem guarda JWT local
```

**Repo pai:**
```
exp(inventory/capacidade/s2): servico de identidade extraido (auth + users)
exp(inventory/capacidade/s2): gateway nginx e compose do snapshot-2
exp(inventory/capacidade/s2): harness config + coleta snapshot-2
exp(inventory/capacidade/s2): registro de extracao
```

## Evidência automática

- **Monólito:** `git diff --stat <s1> <s2>` → remoção de `src/auth/**` (exceto
  guarda/estratégia) e `src/users/**`.
- **Acoplamento (`madge`):** as arestas de `auth`/`users` saíram do grafo do
  monólito e reaparecem dentro da Identidade (`identity/auth→shared`,
  `identity/users→auth`, ...).
- **Compose:** `infra/compose/inventory-api-capacidade-negocio-s2.yml`.
- **Gateway:** `infra/gateway/nginx-capacidade-s2.conf`.
- **Serviço:** `services/inventory-api/identity/`.
- **Paridade:** `metricas/inventory-api/capacidade-negocio/snapshot-2/paridade/golden.json`.

## Impacto observado nas métricas

| Métrica | snapshot-1 | snapshot-2 | Variação |
|---|---|---|---|
| Build (média, `--no-cache`) | 116.353 ms | 108.405 ms | −7 % |
| Inicialização (média) | 10.594 ms | 13.166 ms | +24 % |
| LOC (TypeScript) | 9.165 | 9.796 | +631 |
| Componentes / containers | 4 / 4 | 5 / 5 | +1 |
| Chamadas entre fronteiras | 73 de 402 | 78 de 414 | +5 |
| CPU total (repouso / carga) | 2,78 % / 242,7 % | 6,24 % / 255,4 % | ↑ |
| RAM total (repouso / carga) | 149,4 / 306,3 MB | 186,9 / 352,7 MB | ↑ |
| `products` (vazão) | 311,6 req/s | 379,4 req/s | +22 % |
| `reports/movements` (vazão) | 245,6 req/s | 301,0 req/s | +23 % |
| `reports/stock` (vazão) | 138,0 req/s | 165,2 req/s | +20 % |
| `movements` (vazão) | 214,5 req/s | 219,4 req/s | +2 % |
| Latência p50 (faixa) | 61,7–141,0 ms | 49,0–113,7 ms | ↓ |

## Previsto × realizado

- **Agilidade:** previsto "subir de novo". O startup subiu (+24 %), mas o build
  ficou **estável** (na prática, dentro da variância do `--no-cache`): o serviço
  reutiliza a mesma base de dependências do serviço de Relatórios.
- **Custo/Infra:** componentes subiram (+1). RAM/CPU totais subiram pela soma de
  mais um contêiner Prisma.
- **Desempenho:** ao contrário do previsto (nova queda), houve **aumento de vazão
  em todas as rotas** e redução da latência. Provável explicação: a extração da
  Identidade retirou do processo do monólito os guardas/JWT e diminuiu a pressão
  sobre o processo que atende as rotas medidas; a variância entre execuções do
  `autocannon` também é relevante. Fica registrado como evidência empírica que
  contraria a hipótese inicial.
- **Manutenibilidade:** LOC e cross-domain subiram, como no s1, por duplicação de
  `shared`/`database` e recriação das arestas dentro do novo serviço.

## Aprendizado sobre decomposição

- A Identidade é **pré-requisito de todos os módulos**: extraí-la obrigou o
  monólito a manter uma cópia local mínima dos guardas de JWT (autenticação
  *stateless*), evidenciando que "capacidade de negócio" e "infraestrutura
  transversal de segurança" não coincidem.
- O acoplamento por banco (`users` lê a tabela `warehouse`) permanece enquanto o
  banco é compartilhado — a ser tratado na extração final.
- Um ajuste de roteamento foi necessário: o `location` do NGINX precisava casar
  `/api/users` **sem** barra final (o prefixo com barra desviava a coleção para o
  monólito).

## Leitura crítica da comparação

Ressalva metodológica (herdada do s1): a partir do snapshot-1 todas as topologias
incluem o NGINX, então a comparação s2 × s1 isola o efeito de extrair a
Identidade. A comparação s2 × s0 (baseline) mistura o efeito de extrair **dois**
serviços com o de introduzir o proxy. O aumento de vazão no s2 deve ser lido com
cautela pela variância do `autocannon` em ambiente de máquina única.
