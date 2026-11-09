# Pré-registro de Extração — ecommerce / Capacidade de Negócio / snapshot-2

> Escrito ANTES de mexer no código. Fixa a previsão para permitir a comparação
> "previsto × observado" depois.

## Identificação

- App: `ecommerce` (varejo transacional / MongoDB)
- Metodologia: Capacidade de Negócio
- Snapshot: `snapshot-2` (segunda extração)
- Branch: `exp/ecommerce/capacidade-negocio` (repositório pai e fork)
- Baseline (`snapshot-0`): fork `6487e40`, tag `snapshot-0`
- Snapshot anterior: `snap/ecommerce/capacidade-negocio/1` (Catálogo)
- Data: 2026-11-09

## Contexto

**Serviço-alvo:** Clientes (`auth` + `token` + `user` + `address` + `storages`).

O Catálogo já está fora do monólito e não muda nesta extração. As duas capacidades
restantes continuam no monólito: Vendas (`cart`, `shipping`, `order`, `inventory`,
`stripe`) e Comunicação (`email`).

**Por que Clientes agora:**

- É a capacidade que concentra as arestas de **entrada** do grafo: `auth` chama
  `user` e `token`, `user` chama `address` e `storages`, e três módulos de Vendas
  (`cart`, `order`, `stripe`) apontam para `user`. Extrair Clientes corta o maior
  bloco de acoplamento estático que resta no monólito.
- Não está no caminho medido: nenhuma das três rotas de carga (`GET /api/products`,
  `GET /api/products/:id`, `POST /api/orders`) tem o Clientes como destino. A
  exceção é a validação do token de acesso no pedido, que é local (ver adiante).
- Os dados são separáveis: `users`, `refreshtokens` e `addresses` não são
  escritos por Vendas, exceto o campo `monthly_subscription_status` no webhook.

**`storages` entra junto** porque, depois do s1, a única coisa que ainda usava o
armazenamento local no monólito era a foto de perfil (`profile.controller`). O
serviço de Catálogo já tem sua própria cópia para as imagens de produto.

## O que será extraído

- `src/modules/auth/**` — login, registro, refresh e logout (`/api/auth`).
- `src/modules/token/**` — assinatura e verificação de JWT e refresh tokens.
- `src/modules/user/**` — `/api/users` e `/api/profile`.
- `src/modules/address/**` — `/api/address`.
- `src/modules/storages/**` — gravação da foto de perfil em disco.
- Peças de `shared` usadas por esses módulos: guarda JWT, guarda e decorator de
  papéis, interceptor de autenticação, tipo `Nullable` e o utilitário de cookie
  do refresh token.
- A casca de processo: `main.ts`, conexão com o Mongo, `tsconfig`, `package.json`
  e `Dockerfile`.

**Fica no monólito:** `cart`, `shipping`, `order`, `inventory`, `stripe`,
`email`, `item` e `health`.

## Fronteira proposta

O serviço de Clientes responde pelas mesmas rotas do baseline:

- `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/refresh`,
  `POST /api/auth/logout`
- `GET /api/users`, `GET /api/users/:id`, `POST /api/users`,
  `PUT /api/users/:id`, `DELETE /api/users/:id`
- `PUT /api/profile/:id/profile-picture`, `PUT /api/profile/:id/personal-details`,
  `GET /api/profile/:id/shipping-addresses`, `POST /api/profile/:id/shipping-address`,
  `PUT /api/profile/:id/shipping-address/:addressId`,
  `DELETE /api/profile/:id/shipping-address/:addressId`
- `POST /api/address`, `GET /api/address/:userId`, `PUT /api/address/:id`,
  `DELETE /api/address/:userId/:id`

Rota interna não medida: `PATCH /api/internal/users/subscription`, que atualiza
`monthly_subscription_status` a partir do `stripe_cus_id`.

## Decisões de fronteira

**1. Verificação de token no monólito é local.** `verifyAccessToken` só valida a
assinatura com `ACCESS_SECRET`; não consulta o banco. O monólito ganha um
`AccessTokenGuard` com `JwtService` e o `POST /api/orders` continua sem salto de
rede. A alternativa (chamar o Clientes a cada pedido) colocaria um salto na rota
de escrita medida, contra o pré-registro. O acoplamento que resta é de
configuração: o segredo é compartilhado entre os dois processos.

**2. `stripe_cus_id` sem dependência Clientes → Vendas.** `UserService.createUser`
criava o customer no `StripePaymentService` local, que é determinístico
(`cus_local_<sha1(email)[0..16]>`, sem estado). O Clientes repete o mesmo cálculo
em um `CustomerIdService` próprio. Criar o customer é chamada ao provedor externo
de pagamento, que é externo aos dois serviços; o stub local apenas repete o
algoritmo. Assim a identidade não depende do faturamento para registrar usuário.

**3. Leitura de `User` em Vendas.** `cart` e `order` fazem
`this.model('User').exists({ _id })` e usam `ref: 'User'`. O monólito passa a
registrar um `user-reference.schema.ts` (só `_id`, `strict: false`), como já faz
com `product-reference.schema.ts` desde o s1. É acoplamento de dados sobre a
coleção compartilhada.

## Decisão de persistência

**Banco compartilhado.** Clientes aponta para o mesmo MongoDB (réplica `rs0`,
banco `gldcart`) e o volume `uploads` continua compartilhado com o Catálogo — a
foto de perfil é gravada pelo Clientes e servida por `/uploads/` pelo Catálogo.
O isolamento de dados fica para o snapshot final.

## Comunicação entre serviços

- Cliente → NGINX → Clientes em `/api/auth`, `/api/users`, `/api/profile` e
  `/api/address`.
- Monólito → Clientes por HTTP apenas no webhook de assinatura (rota interna).
- Clientes → Mongo (escrita de usuário, token e endereço).
- Nenhuma chamada Clientes → Vendas.

## Roteamento (Strangler Fig / NGINX)

O gateway continua na porta pública 3001, com o monólito em 3002.

```nginx
location /api/auth     -> clientes
location /api/users    -> clientes
location /api/profile  -> clientes
location /api/address  -> clientes
location /api/products -> catálogo
location /uploads/     -> catálogo
location /               -> monólito
```

## Hipótese de resultado (métricas)

- **Agilidade/DevOps:** build sobe (mais uma imagem, com `argon2`) e o startup
  sobe (mais um processo para ficar pronto).
- **Infraestrutura/custo:** componentes passam de 5 para 6 (api, mongo, redis,
  catálogo, clientes, nginx); soma-se o tamanho da imagem de Clientes.
- **Desempenho:** leitura e escrita ficam **estáveis**, porque as rotas medidas
  não atravessam o novo serviço — o pedido só valida o JWT localmente. A CPU e a
  RAM totais sobem pelo processo a mais.
- **Manutenibilidade:** o LOC do monólito cai de forma clara (saem quase 2 mil
  linhas); o total sobe pela duplicação de `shared`. O cross-domain cai de forma
  perceptível, ao contrário do s1: saem as arestas entre auth/token/user/address
  e as três importações de `@user` em Vendas viram uma referência de leitura e
  uma chamada HTTP.

## Critério de pronto

- Login, refresh e logout respondendo pelo serviço, com cookie de refresh.
- Endereços, perfil e foto servidos pelas rotas equivalentes.
- Pedido criado com `stripe_cus_id` vindo do payload do JWT e webhook concluindo
  com estoque reduzido.
- `snapshot-2` coletado (3 repetições), comparativo `s0 → s1 → s2` gerado.
- Registro de execução e reflexão do autor em
  `docs/extracao/ecommerce__capacidade-negocio__s2.md`.
