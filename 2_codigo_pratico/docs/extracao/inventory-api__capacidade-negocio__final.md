# Registro de Extração — inventory-api / Capacidade de Negócio / snapshot-final

> Escrito depois da extração. Decomposição concluída sob a metodologia de
> Capacidade de Negócio, com persistência isolada e comunicação via HTTP.

## O que foi feito

Extraiu-se a capacidade restante — **Controle de Estoque**
(`warehouses` + `products` + `movements`) — para o serviço NestJS
`services/inventory-api/estoque/`, concluindo a decomposição. O monólito é
**desativado** (não sobe na topologia final).

A grande mudança deste snapshot é a **persistência isolada** (banco por serviço),
exigida pela definição do cap. 04. Como os serviços deixam de compartilhar
tabelas, os acessos cruzados passam a ser resolvidos por **camada anticorrupção
via HTTP**:

- **Identidade** ganhou banco próprio (`inventory_identity`, tabela `users`). A
  validação de armazém ao criar/editar usuário passou a consultar a API interna
  do Estoque (`GET /api/internal/warehouses/:id`).
- **Estoque** ganhou banco próprio (`inventory_estoque`: `warehouses`, `products`,
  `stock_movements`). A validação do usuário ao registrar movimento passou a
  consultar a API interna da Identidade (`GET /api/internal/users/:id`); o
  e-mail do usuário é **denormalizado** em `stock_movements.user_email`.
- **Relatórios** deixou de ter banco: consulta o Estoque pela API interna
  (`/api/internal/warehouses|products|movements`) e **agrega em memória**.
- **NGINX** roteia `/api/auth|users` → Identidade, `/api/warehouses|products|movements`
  → Estoque, `/api/reports` → Relatórios. Os endpoints `/api/internal/*` **não**
  são expostos publicamente.

## Procedimento (sequência de commits)

**Repo pai:**
```
exp(inventory/capacidade/final): servico de estoque (warehouses/products/movements)
exp(inventory/capacidade/final): persistencia isolada + anticorrupcao HTTP
exp(inventory/capacidade/final): gateway nginx e compose do snapshot-final
exp(inventory/capacidade/final): harness config (seeds multiplos) + coleta
exp(inventory/capacidade/final): pre-registro e registro da extracao
```

## Evidência automática

- **Serviços:** `services/inventory-api/{identity,estoque,reports}/`.
- **Compose:** `infra/compose/inventory-api-capacidade-negocio-final.yml`
  (2 PostgreSQL + 3 serviços + NGINX).
- **Gateway:** `infra/gateway/nginx-capacidade-final.conf`.
- **Paridade:** `metricas/inventory-api/capacidade-negocio/snapshot-final/paridade/golden.json`.
- **LOC/cross-domain:** medidos apenas sobre os **3 serviços** (o monólito
  aposentado não compõe mais a solução).

## Impacto observado nas métricas

| Métrica | snapshot-2 | snapshot-final | Variação |
|---|---|---|---|
| Build (média, `--no-cache`) | 108.405 ms | 138.371 ms | +28 % |
| Inicialização (média) | 13.166 ms | 12.051 ms | −8 % |
| LOC (TypeScript, só serviços) | 9.796 | 9.599 | −197 |
| Componentes / containers | 5 / 5 | 6 / 6 | +1 |
| Chamadas entre fronteiras (estático) | 78 de 414 | 78 de 416 | = |
| CPU total (repouso / carga) | 6,24 % / 255,4 % | 6,6 % / 405,8 % | ↑ |
| RAM total (repouso / carga) | 186,9 / 352,7 MB | 203,6 / 445,1 MB | ↑ |
| `products` (vazão) | 379,4 req/s | 469,8 req/s | +24 % |
| `reports/movements` (vazão) | 301,0 req/s | 328,7 req/s | +9 % |
| `reports/stock` (vazão) | 165,2 req/s | 347,4 req/s | +110 % |
| `movements` (vazão) | 219,4 req/s | 294,4 req/s | +34 % |
| Latência p50 (faixa) | 49,0–113,7 ms | 40,7–66,0 ms | ↓ |

## Previsto × realizado

- **Agilidade:** build subiu (+28 %, quatro imagens com dependências próprias);
  startup caiu levemente.
- **Custo/Infra:** dois bancos dedicados + um serviço a mais elevam RAM/CPU
  (CPU sob carga +59 %). Isolar dados custou recursos.
- **Desempenho:** contrariando a hipótese do s1 (cascata HTTP pioraria), a vazão
  **subiu** em todas as rotas, inclusive `reports`. Explicações prováveis: o
  serviço de Relatórios deixou de abrir conexão de banco e passou a agregar em
  memória sobre um conjunto pequeno de dados; o Estoque atende leituras HTTP
  simples; e há variância entre execuções. Deve ser lido com cautela.
- **Manutenibilidade:** LOC caiu (monólito aposentado; sem duplicação do
  monólito), mas componentes subiram (6). O cross-domain estático permanece
  ~igual — as chamadas HTTP entre serviços **não** são capturadas pelo `madge`.

## Aprendizado sobre decomposição

- **Persistência isolada expõe o acoplamento de dados que o banco compartilhado
  escondia**: `movements` precisava do usuário (Identidade) e a Identidade do
  armazém (Estoque). Resolver por HTTP introduziu latência e uma **nova
  responsabilidade transacional** (o registro de movimento já não valida o
  usuário de forma atômica com o commit local).
- **Denormalização** (`user_email` em `stock_movements`) foi a forma de cortar a
  dependência de Relatórios e Estoque sobre a Identidade em leitura.
- Endpoints internos sem autenticação são uma **simplificação de segurança**
  registrada como dívida (o ideal seria token de serviço/mTLS).

## Leitura crítica da comparação

A comparação s2 × final mede, simultaneamente, a extração da última capacidade
**e** a mudança de banco compartilhado para isolado. O aumento de vazão não deve
ser atribuído apenas à extração: a mudança de acesso a dados (agregação em
memória no lugar de SQL repetido) e a variância do `autocannon` interferem. O
cross-domain estático subestima o acoplamento real, que passou a ser de rede.
