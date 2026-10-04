# Registro de Extração — inventory-api / Capacidade de Negócio / snapshot-1

> Escrito DEPOIS da extração. Combina a narrativa com a evidência automática
> (`git diff`, `madge`, diffs de compose/nginx). Rascunho do "como foi feita".
>
> As seções marcadas com ✍️ são para o autor complementar (reflexão/aprendizado).

## O que foi feito

Extraiu-se o módulo de Relatórios (`reports`) do monólito para um serviço
NestJS independente, servido atrás do gateway NGINX (Strangler Fig), mantendo o
mesmo contrato HTTP e o mesmo PostgreSQL (opção 1 de persistência).

- O **monólito** deixou de registrar `ReportsModule`; a pasta `src/reports/` foi
  removida (23 arquivos, −1.242 linhas).
- O **novo serviço** foi criado em `2_codigo_pratico/services/inventory-api/reports/`,
  com os mesmos casos de uso, DTOs e adaptador, além de cópias mínimas de
  `shared`, `auth` (guards/JWT) e `database` (Prisma).
- O único vazamento de domínio (`MovementTypeMapper`, de `movements`) foi
  resolvido por **camada anticorrupção**: uma cópia local do mapper que não
  depende do módulo de movimentos.
- O **NGINX** roteia `location /api/reports/` para o novo serviço e `location /`
  para o monólito.

## Procedimento (sequência de commits)

**Submódulo `inventory-api`** (`exp/inventory-api/capacidade-negocio`):
```
exp(inventory/capacidade/s1): remove modulo reports do monolito   (53ce9c7)
```

**Repo pai:**
```
exp(inventory/capacidade/s1): servico de reports extraido (scaffold + ACL)
exp(inventory/capacidade/s1): gateway nginx e compose do experimento
exp(inventory/capacidade/s1): harness multi-fonte + config snapshot-1
exp(inventory/capacidade/s1): coleta snapshot-1
exp(inventory/capacidade/s1): registro de extracao
```

## Evidência automática

- **Monólito:** `git diff --stat 338b0d7 53ce9c7` → 23 arquivos, +1 / −1.242.
- **Acoplamento (`madge`):** as arestas de `reports` deixaram o grafo do monólito
  (`reports→shared 5`, `→database 2`, `→auth 2`, `→movements 1`) e reapareceram
  dentro do serviço (`reports/reports→shared 5`, `→database 2`, `→auth 2`, ...).
- **Compose:** `2_codigo_pratico/infra/compose/inventory-api-capacidade-negocio-s1.yml`.
- **Gateway:** `2_codigo_pratico/infra/gateway/nginx.conf`.
- **Paridade:** `metricas/inventory-api/capacidade-negocio/snapshot-1/paridade/golden.json`.

## Impacto observado nas métricas

| Métrica | snapshot-0 | snapshot-1 | Variação |
|---|---|---|---|
| Build (mediana, `--no-cache`) | 42.549 ms | 121.285 ms | +185 % |
| Inicialização (mediana) | 8.841 ms | 10.631 ms | +20 % |
| LOC (TypeScript) | 8.783 | 9.165 | +382 |
| Componentes / containers | 2 / 2 | 4 / 4 | +2 |
| Chamadas entre fronteiras | 69 de 389 | 73 de 402 | +4 |
| `products` (vazão) | 562,8 req/s | 323,9 req/s | −42 % |
| `reports/movements` (vazão) | 360,4 req/s | 256,6 req/s | −29 % |
| `reports/stock` (vazão) | 202,3 req/s | 131,3 req/s | −35 % |
| `movements` (vazão) | 309,9 req/s | 223,4 req/s | −28 % |
| Latência p50 (faixa) | 34–97 ms | 60–145 ms | ≈ +1,7× |

## Previsto × realizado

- **Agilidade:** previsto "subir um pouco" no build/startup. O startup subiu ~20 %
  (confirmado), mas o **build triplicou** (+185 %), acima do previsto: além de
  compilar mais um serviço, o build sem cache baixa dependências de cada imagem.
- **Custo/Infra:** previsto "um contêiner com CPU/RAM baixos". Confirmado em
  natureza (novo serviço leve), mas o número de **componentes dobrou** (2→4).
- **Desempenho:** previsto "melhorar levemente ou ficar estável". **Não se
  confirmou:** houve queda em **todas** as rotas (~28–42 %). Fatores prováveis:
  (a) toda requisição passa por um salto extra pelo NGINX; (b) mais contêineres
  concorrendo pelos mesmos recursos da máquina; (c) o serviço de relatórios tem
  seu próprio cliente Prisma, somando pressão ao banco.
- **Manutenibilidade:** previsto "componentes sobem, LOC/há duplicação, e o
  cross-domain estático cai". Componentes subiram (+2) e LOC subiu (+382, por
  duplicação de `shared`/`auth`/`database`), mas o **cross-domain não caiu**:
  subiu +4, porque o serviço recria suas próprias arestas entre fronteiras.

## ✍️ Aprendizado sobre decomposição

(escrever em suas palavras: o que a extração de `reports` ensinou — a duplicação
de código transversal, o custo escondido do salto de rede, a diferença entre
"acoplamento de dados" e "acoplamento de código", etc.)

## ✍️ Leitura crítica da comparação

(ressalva metodológica importante: o baseline não tinha NGINX, então a queda de
desempenho mistura o efeito de **extrair o serviço** com o efeito de **introduzir
o proxy + mais contêineres na mesma máquina**. Escrever como isso deve ser
interpretado no cap. 05.)
