# Pré-registro de Extração — inventory-api / Capacidade de Negócio / snapshot-1

> Escrito ANTES de mexer no código (pré-registro). Compromete-se com uma
> previsão e permite comparar "previsto × observado" depois.
>
> As seções "Contexto" e "Fronteira proposta" trazem os fatos e as decisões da
> análise; as demais foram redigidas pelo autor a partir da discussão.

## Identificação
- App: `inventory-api` (sistema crítico / MES)
- Metodologia: Capacidade de Negócio
- Snapshot: `snapshot-1` (primeira extração)
- Branch: `exp/inventory-api/capacidade-negocio`
- Data: 2026-10-04

## Contexto

**Serviço-alvo desta extração:** `reports` (Relatórios).

**Por que ele é o candidato natural da 1ª extração (fatos da análise):**
- No agrupamento por Capacidade de Negócio (roteiro §4.1), `reports` é uma das
  três capacidades: Administração/Identidade · Controle de Estoque · **Relatórios**.
- É **somente leitura** — ADR-0011 (CQRS parcial): *commands* em Products/Movements,
  *queries* em Reports.
- Não possui dependências reversas: nenhum outro módulo importa `reports`
  (o `madge` do snapshot-0 não registra arestas de entrada para `reports`).

**Tensão conhecida:** `reports` é somente leitura, mas lê os dados de movements,
products e warehouses, e hoje compartilha o mesmo PostgreSQL. Ao extrair, é
preciso decidir como o serviço de Relatórios acessa os dados.

## O que será extraído
- **Módulo/capacidade:** Relatórios (`reports`), a capacidade de negócio do
  roteiro §4.1.
- **Fronteira proposta:** `src/reports/**` (controller, casos de uso, DTOs, porta
  e adaptador) mais as dependências transitivas mínimas que ele usa hoje.
- **O que fica no monólito:** `auth`/`users`, `warehouses`, `products` e
  `movements`, a serem decompostos em trilhas futuras.

## Fronteira proposta

O serviço de Relatórios passa a conter o módulo `src/reports/` inteiro: o
controller com as três rotas (`/reports/stock/:warehouseId`, `/reports/alerts`,
`/reports/movements`), os casos de uso, os DTOs, a porta `IReportRepository` e o
adaptador que consulta o banco.

Como o módulo não existe isolado, as dependências o acompanham e são tratadas
caso a caso:

- `shared` (constantes e decorators) e `auth` (guards de JWT e de papéis) são
  infraestrutura; entram no serviço na forma mínima necessária.
- `database` (PrismaService) permanece como acesso ao PostgreSQL compartilhado,
  conforme a decisão de persistência deste snapshot.
- `movements` aparece apenas pelo `MovementTypeMapper`. Esse é o único vazamento
  de domínio: para não levar o módulo de movimentos junto, o mapeamento é
  duplicado localmente, registrado como dívida técnica a resolver numa extração
  posterior.

Permanecem no monólito os módulos `auth`, `users`, `warehouses`, `products` e
`movements`, que respondem pelo restante das rotas.

## Por que (fundamentação na metodologia)

`reports` é a primeira extração sob **Capacidade de Negócio** porque relatórios
são uma capacidade distinta de "controlar estoque" — o critério é o que a
organização faz, e não o detalhe técnico. Ele é um bom candidato porque **não
tem dependências reversas** (nenhum outro módulo importa `reports`), então pode
ser extraído sem quebrar os vizinhos. É também somente leitura (ADR-0011).

Vale registrar uma correção ao raciocínio inicial: `reports` **não** é
"desacoplado por natureza". Ele consome dados e código de outros contextos
(`Prisma`, `movements`, `auth`, `shared`). O que o qualifica é a ausência de
dependências de **entrada**, não a ausência de dependências em geral.

## Como (passos previstos)

1. Criar o novo serviço (scaffold NestJS) e **copiar** o módulo `reports`.
2. **Adaptar imports** com uma camada anticorrupção: substituir `@movements`,
   `@shared`, `@auth` e `@database` pelos equivalentes locais/mínimos, isolando o
   que era vazamento.
3. **Manter o contrato HTTP idêntico** (`GET /api/reports/stock/:id`, `/alerts`,
   `/movements`).
4. Subir monólito + serviço e colocar o **NGINX** na frente.
5. **Desviar** `/api/reports/*` para o novo serviço; o resto continua no monólito.
6. **Desativar** o `reports` no monólito.
7. **Validar paridade** comparando com `paridade/golden.json`.

## Decisão de persistência

**Opção 1 — banco de leitura compartilhado.** O serviço de `reports` aponta para
o mesmo PostgreSQL e apenas lê. É o estágio típico de convivência do Strangler
Fig: preserva a paridade e isola a variável medida neste snapshot — "extrair o
código para um processo próprio" —, deixando a separação de dados para
`snapshot-2`/`final`.

As opções 2 (projeção própria) e 3 (API de leitura) foram descartadas aqui. A
opção 3 em particular pioraria muito a latência: `reports/stock` faz agregação
pesada e já é a rota mais lenta do baseline (98 ms p50); trocá-la por chamadas
HTTP em cascata multiplicaria o custo.

## Comunicação entre serviços

Síncrona (HTTP) apenas no caminho cliente ↔ NGINX ↔ `reports`. Nenhuma chamada
interna serviço-a-serviço neste snapshot: o acesso a dados é pelo banco
compartilhado e a autenticação é feita **localmente**, validando o JWT
(*stateless*), sem consultar o `auth`. Contrato: as mesmas rotas `/api/reports/*`
do baseline.

## Roteamento (Strangler Fig / NGINX)

Roteamento por **prefixo de caminho**: `location /api/reports/` → serviço
`reports`; `location /` → monólito. O cliente mantém o mesmo host; o NGINX decide
quem responde. À medida que outros módulos forem extraídos, novos `location` são
adicionados — o monólito permanece ativo durante a transição.

## Hipótese de resultado (métricas)

- **Agilidade/DevOps:** build e startup sobem um pouco (mais uma imagem/contêiner).
- **Custo/Infra:** soma-se um contêiner com CPU/RAM baixos, mais o custo da imagem.
- **Desempenho:** `reports` pode melhorar levemente (menos disputa de recursos com
  o resto do monólito) ou ficar estável; sem piora relevante, pois o banco é
  compartilhado e não há cascata de chamadas.
- **Manutenibilidade:** o número de componentes sobe (mais um serviço) e há
  duplicação de código comum (`shared`, mapper); o cross-domain estático
  (`madge`) tende a cair, pois o relatório sai do grafo do monólito — mas surge um
  acoplamento de rede que o `madge` não mede.
