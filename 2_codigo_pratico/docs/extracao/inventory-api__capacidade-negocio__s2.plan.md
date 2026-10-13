# Pré-registro de Extração — inventory-api / Capacidade de Negócio / snapshot-2

> Escrito antes de finalizar a extração. Compromete-se com uma previsão e permite
> comparar "previsto × observado" no registro final.

## Identificação
- App: `inventory-api` (sistema crítico / MES)
- Metodologia: Capacidade de Negócio
- Snapshot: `snapshot-2` (segunda extração)
- Branch: `exp/inventory-api/capacidade-negocio`
- Data: 2026-10-13

## Contexto

**Serviço-alvo desta extração:** Identidade (`auth` + `users`) — a capacidade
Administração/Identidade do agrupamento do roteiro §4.1
(Administração/Identidade · Controle de Estoque · Relatórios).

Após o snapshot-1, o monólito reúne `auth`, `users`, `warehouses`, `products` e
`movements`. Fatos da análise estática relevantes para a escolha:

- `auth` é **pré-requisito de todos os módulos**: cada controller de
  `warehouses`, `products` e `movements` importa os guardas `JwtAuthGuard` e
  `RolesGuard`, e a estratégia JWT é registrada globalmente pelo `AuthModule`.
- `users` é um **sorvedouro** (nada o importa); depende de `auth` (importa o
  módulo, a porta `PASSWORD_HASHER` e os guardas).
- Nenhuma aresta de código liga `warehouses`, `products` e `movements` entre si
  nem a `identity`; o acoplamento restante é só por `@shared`, `@database` e
  pelos guardas de `@auth`.

## O que será extraído
- **Módulo/capacidade:** Administração/Identidade — `src/auth/**` e `src/users/**`.
- **Fronteira proposta:** o serviço de Identidade passa a conter os dois módulos
  inteiros (login, refresh, CRUD de usuários), a porta `PASSWORD_HASHER`, as
  estratégias JWT e os guardas de acesso.
- **O que fica no monólito:** `warehouses`, `products` e `movements` (Controle de
  Estoque), que permanecem atrás do NGINX até a extração final.

## Como (passos previstos)
1. Criar o serviço `services/inventory-api/identity/` (scaffold NestJS, Prisma).
2. Copiar `auth` e `users` para o serviço, mantendo o contrato HTTP.
3. No monólito, **remover** `auth` e `users`; manter apenas a validação de JWT
   (`JwtAuthGuard`, `RolesGuard`, `JwtStrategy`) como camada anticorrupção, já
   que os controllers remanescentes dependem dos guardas.
4. Subir monólito + Relatórios + Identidade atrás do NGINX, desviando
   `/api/auth/*` e `/api/users/*` para a Identidade.
5. Validar paridade (login e listagens idênticos ao baseline).

## Persistência
- **Banco compartilhado** (opção 1, como no snapshot-1): o serviço de Identidade
  aponta para o mesmo PostgreSQL e usa a tabela `users`. A separação de dados
  fica para o snapshot-final.

## Comunicação entre serviços
- Síncrona apenas no caminho cliente ↔ NGINX ↔ Identidade. Nenhuma chamada
  serviço-a-serviço: a autenticação das demais rotas é feita validando o JWT
  *stateless* com o mesmo segredo, sem consultar a Identidade.

## Roteamento (Strangler Fig / NGINX)
- **Desviado para a Identidade:** `/api/auth/`, `/api/users/`.
- **Permanecem no monólito:** `/api/warehouses/`, `/api/products/`, `/api/movements/`.
- **Relatórios:** mantido no serviço extraído em `/api/reports/`.

## Hipótese de resultado (métricas)
- **Agilidade/DevOps:** build e startup sobem novamente (mais uma imagem/contêiner).
- **Custo/Infra:** soma de mais um contêiner; RAM total cresce pela duplicação de
  dependências (Prisma, guards).
- **Desempenho:** sem cascata de chamadas; a queda de vazão observada no s1 tende
  a se acentuar pela disputa adicional de recursos.
- **Manutenibilidade:** componentes aumentam; a Identidade duplica `shared`/
  `database`/guardas. O cross-domain estático tende a subir, não cair, pela
  recriação das arestas dentro do novo serviço (padrão já visto no s1).
