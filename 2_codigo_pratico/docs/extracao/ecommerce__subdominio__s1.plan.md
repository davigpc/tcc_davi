# Pré-registro de Extração — ecommerce / Subdomínio (DDD) / snapshot-1

> Escrito ANTES da coleta. Fixa a previsão para a comparação "previsto ×
> observado".

## Identificação

- App: `ecommerce` (varejo transacional / MongoDB)
- Metodologia: Subdomínio (DDD)
- Snapshot: `snapshot-1` (primeira extração)
- Branch: `exp/ecommerce/subdominio` (repositório pai e fork)
- Baseline: `snapshot-0` (fork `6487e40`)
- Data: 2026-11-10

## Contexto

**Serviços-alvo:** os dois contextos genéricos — **Identidade** (`auth`,
`token`, `user`, `address`) e **Comunicação** (`email`).

A classificação está em `docs/metodologia/subdominio-ecommerce.md`. A ordem é
inversa à do valor estratégico: genéricos primeiro, depois o suporte (Catálogo) e
o núcleo (Vendas) por último.

**Por que os genéricos primeiro:** não carregam diferencial competitivo e são os
de menor risco. A Identidade tem uma particularidade: é dependência de entrada de
quase todos os módulos, mas a validação do token é stateless. Por isso o monólito
mantém um guarda local com `JwtService`, sem consultar a Identidade a cada
requisição. A Comunicação é a folha do grafo: só o pedido a procura, e apenas no
webhook.

## O que será extraído

- `src/modules/auth/**`, `token/**`, `user/**` e `address/**` para
  `services/ecommerce/identidade/`.
- `src/modules/email/**` para `services/ecommerce/comunicacao/`.
- Peças de `shared` usadas por esses módulos e o armazenamento local
  (`storages`) como **biblioteca** da Identidade — a foto de perfil continua
  sendo gravada em disco, no volume compartilhado.
- Casca de processo dos dois serviços: `main.ts`, conexão com o Mongo,
  `tsconfig`, `package.json` e `Dockerfile`.

**Fica no monólito:** `product`, `search`, `storages` (biblioteca usada pelas
imagens de produto), `cart`, `shipping`, `order`, `inventory`, `stripe` e
`health`.

## Fronteira proposta

- Identidade responde por `POST /api/auth/login|register|logout`,
  `GET /api/auth/refresh`, `GET|POST|PUT|DELETE /api/users`,
  `/api/profile/*` e `/api/address/*`.
- Comunicação responde por `POST /api/emails/contact-us`.
- Rota interna da Identidade: `GET /api/internal/users/:id` (validação do
  comprador) e `PATCH /api/internal/users/subscription` (webhook de assinatura).
- Rota interna da Comunicação: `POST /api/internal/emails/order-confirmation`,
  chamada pelo pedido no webhook.

## Decisões de fronteira

**1. Guarda de token local.** O `JwtAuthenticationGuard` injetava o
`TokenService`, que sai com a Identidade. Como a verificação é stateless, o
monólito ganha um `AccessTokenGuard` com `JwtService` e `ACCESS_SECRET`. Mantém
`POST /api/orders` sem chamada de rede para autenticar.

**2. Leitura de `User` no monólito.** `cart` e `order` validam o comprador com
`this.model('User').exists`. O banco continua compartilhado, então entra um
`user-reference.schema.ts` (só `_id`, `strict: false`), como o produto fez em
outras trilhas. `product.schema` também referencia `User` em `seller`, sem
`populate`.

**3. `stripe_cus_id` calculado na Identidade.** O cadastro criava o customer no
`StripePaymentService` local. A Identidade repete o cálculo determinístico
(`cus_local_<sha1(email)>`) em um `CustomerIdService`, para não depender do
faturamento.

**4. E-mail por HTTP.** O `OrderService` deixa de injetar o `EmailService` e
passa a chamar a Comunicação. A chamada só ocorre no webhook, fora das rotas
medidas.

## Persistência

**Compartilhada.** Todos os processos usam o mesmo MongoDB (réplica `rs0`, banco
`gldcart`) e o mesmo Redis. O volume `uploads` é compartilhado: a Identidade grava
a foto de perfil e o monólito serve `/uploads/`.

## Roteamento (Strangler Fig / NGINX)

```nginx
location /api/auth     -> identidade
location /api/users    -> identidade
location /api/profile  -> identidade
location /api/address  -> identidade
location /api/emails   -> comunicacao
location /               -> monólito
```

## Hipótese de resultado (métricas)

- **Agilidade/DevOps:** build sobe (três imagens de aplicação em vez de uma);
  startup sobe (mais dois processos).
- **Infraestrutura/custo:** componentes passam de 3 para 6 (api, mongo, redis,
  identidade, comunicação, nginx); somam-se as duas imagens.
- **Desempenho:** as leituras e a escrita medidas não atravessam os novos
  serviços — o pedido valida o token localmente e o e-mail só sai no webhook.
  Espera-se estabilidade, com possível perda pela CPU/RAM ocupadas pelos
  processos extras.
- **Manutenibilidade:** o LOC do monólito cai de forma clara; o total sobe pela
  duplicação de `shared`, do `storages` e das cascas. O cross-domain cai, porque
  as arestas de `auth`, `token` e `user` saem do grafo do monólito.

## Critério de pronto

- Login, registro e `GET /api/users` respondendo pela Identidade.
- Foto de perfil gravada pela Identidade e servida em `/uploads/` pelo monólito.
- Pedido e webhook concluindo, com e-mail registrado na Comunicação e estoque
  reduzido.
- Assinatura atualizada pela rota interna da Identidade.
- `snapshot-1` coletado (3 repetições) e comparativo `s0 → s1` gerado.
- Registro em `docs/extracao/ecommerce__subdominio__s1.md`.
