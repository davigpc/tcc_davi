# Identificação de Domínios — inventory-api

Documento de apoio para o capítulo 05. Explicita **como** foram derivados os
domínios/serviços candidatos da trilha `inventory-api` (roteiro §4.1), quais
evidências sustentam cada escolha e como essa hipótese será validada.

> Status: hipótese analítica. Nenhuma fronteira aqui está confirmada
> empiricamente; a validação ocorre com os dados de acoplamento do `snapshot-0`
> e com a extração concreta (snapshot-1).

## 1. Objetivo

As três metodologias do estudo (Capacidade de Negócio, Subdomínio e Transações)
partem do **mesmo** conjunto de módulos da aplicação, mas usam **critérios de
agrupamento diferentes**. Este documento registra o raciocínio que produziu a
matriz de serviços candidatos do `inventory-api` (roteiro §4.1), de forma
auditável.

## 2. Evidência de base

A identificação parte de duas fontes presentes no próprio repositório.

### 2.1 Estrutura de código (módulos)

Os contextos correspondem às pastas em `src/`:

```
auth  ·  users  ·  warehouses  ·  products  ·  movements  ·  reports
```

### 2.2 Decisões arquiteturais já registradas (ADRs)

| ADR | Título | O que informa para a decomposição |
|---|---|---|
| ADR-0017 | Arquitetura modular monolítica | O sistema se declara **monólito modular** com *bounded contexts* — cada módulo é candidato natural a contexto delimitado. |
| ADR-0002 | Uso de Domain-Driven Design (DDD) | Enumera explicitamente os seis módulos (`auth`, `users`, `warehouses`, `products`, `movements`, `reports`) como *bounded contexts*. |
| ADR-0011 | CQRS para o módulo de Reports | `reports` é **somente leitura** (queries), separado das commands em Products/Movements. |
| ADR-0006 | Transações com Prisma | Operações de movimento exigem `prisma.$transaction` — escrita **atômica** sobre mais de uma entidade. |
| ADR-0008 | Cálculo dinâmico de stock | `stock = entradas − saídas`; fonte única de verdade nos movimentos. |

Esses ADRs não são apenas documentação: apontam as **fronteiras pretendidas**
pelos autores e as **invariantes transacionais** do domínio.

## 3. Os três critérios de agrupamento

### 3.1 Capacidade de Negócio
Critério: agrupar pelo que a organização **faz** de ponta a ponta, não por
detalhe técnico.

- **Administração/Identidade** ← `auth` + `users`
- **Controle de Estoque** ← `warehouses` + `products` + `movements`
- **Relatórios** ← `reports`

### 3.2 Subdomínio (DDD)
Critério: classificar cada domínio por **valor estratégico** (core, suporte,
genérico).

- **Core** (diferencial competitivo): `Movements` — concentra a regra que
  distingue o sistema (a invariante de estoque e o cálculo dinâmico, ADR-0008).
- **Suporte** (necessário, não diferencial): `Products`, `Warehouses`.
- **Genérico** (comodidade, candidato a componente pronto): Identidade
  (`auth` + `users`) e `Reports`.

### 3.3 Transações (ACID)
Critério: o que precisa cair na **mesma transação** define a fronteira do serviço.

- A regra "não é possível retirar mais do que há" (ADR-0006) e o cálculo
  dinâmico de estoque (ADR-0008) exigem consistência imediata entre
  **movimentos, produtos e bodegas** ⇒ formam um único serviço `Estoque`.
- `Identity` e `Reports` não participam dessa invariante; `Reports` é leitura.

## 4. Síntese

| Módulos (evidência) | Capacidade de Negócio | Subdomínio (DDD) | Transações |
|---|---|---|---|
| `auth`, `users` | Administração/Identidade | Genérico: Identidade | `Identity` |
| `warehouses`, `products`, `movements` | Controle de Estoque | Core: Movements · Suporte: Products/Warehouses | **`Estoque`** (atômico) |
| `reports` | Relatórios | Genérico: Reports | `Reports` (somente leitura) |

O ponto central do experimento: as três colunas usam o **mesmo** conjunto de
módulos, mas mudam o critério de agrupamento — é o que o desenho 3×3 compara.

## 5. Validação empírica

### 5.1 Acoplamento medido no baseline (partial)
O `snapshot-0` já oferece o retrato do acoplamento real entre módulos
(`madge`, `metricas/inventory-api/capacidade-negocio/snapshot-0/`):
**69 de 389** dependências cruzam fronteiras de módulo (17,7 %).

Maiores emissores de chamadas para fora do próprio módulo:

| Origem → Destino | Nº |
|---|---|
| `products → shared` | 9 |
| `warehouses → shared` | 8 |
| `movements → shared` | 6 |
| `users → auth` | 6 |
| `reports → shared` | 5 |

Leitura inicial: grande parte do acoplamento vaza para `shared` (código
compartilhado), e `reports` depende dos dados de outros módulos — o que antecipa
a principal dificuldade da extração de `reports` (ela lê o modelo de
estoque/produto). O baseline também registra `PrismaService` conectando **6×**
(uma vez por módulo), indício de clientes de banco duplicados.

### 5.2 O que a extração vai revelar
A hipótese só se confirma se a fronteira proposta "segurar" na prática:
- dependências de `reports` que exigirem acesso direto ao banco do monólito;
- mudanças de contrato necessárias para desacoplar;
- variação do cross-domain entre `snapshot-0` e `snapshot-1`.

## 6. Rastreabilidade
- Serviços candidatos: roteiro §4.1.
- Dados brutos: `metricas/inventory-api/capacidade-negocio/snapshot-0/raw/cross-domain-calls.json`.
- ADRs citados: `apps/inventory-api/docs/adr/`.
