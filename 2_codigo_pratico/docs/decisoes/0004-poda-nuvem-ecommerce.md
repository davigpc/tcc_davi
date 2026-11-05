# 0004 — Poda das dependências de nuvem do e-commerce

**Data:** 05/11/2026
**Aplicação:** `2_codigo_pratico/apps/ecommerce` (fork `davigpc/nestjs-ecommerce`)
**Branch do fork:** `baseline/poda-nuvem`

## Contexto

O baseline do e-commerce dependia de serviços externos que impediam a execução
reprodutível do experimento: MongoDB Atlas, Redis externo, Stripe, AWS S3,
SMTP, Google OAuth e Twilio. Sem a poda, nem o cadastro de usuário funciona,
porque `UserService.createUser` cria um cliente no Stripe.

A poda preserva o comportamento de domínio e substitui apenas as integrações de
infraestrutura. Os adapters originais continuam recuperáveis no commit upstream
do fork.

## Decisões

| Integração | Substituto local |
|---|---|
| MongoDB Atlas | `mongo:7` em container, **replica set de nó único** (`rs0`) — necessário para as transações de `processOrder` |
| Redis externo | `redis:7-alpine` em container |
| Stripe | implementação local em `src/modules/stripe` (customer, payment intent, assinatura e webhook sem assinatura) |
| AWS S3 | disco local em `uploads/`, servido em `/uploads` |
| SMTP | transporte local em memória, com `verify()` compatível com o `MailerService` |
| Google OAuth | controller removido do `AuthModule` (a rota deixa de existir) |
| Twilio | não estava importado no `main.module`; arquivos mantidos (código morto) |
| PM2 cluster (2 instâncias) | `node dist/main.js`, um processo, para comparabilidade com inventory/auction |

## Alterações

- `src/modules/stripe/services/stripe-payment.service.ts`: substitui o SDK do
  Stripe por objetos sintéticos (`cus_local_*`, `pi_local_*`, `sub_local_*`).
- `src/modules/stripe/services/stripe-webhook.service.ts`: passa a usar
  `LocalStripeEvent` em vez dos tipos do SDK.
- `src/modules/stripe/interfaces/stripe-event.interface.ts`: novo contrato do
  evento local.
- `src/modules/storages/services/aws-storage.service.ts` → removido;
  `local-storage.service.ts` grava em `UPLOAD_DIR` e devolve a URL pública.
- `src/main.ts`: serve `/uploads` via `useStaticAssets`.
- `src/modules/email/email.module.ts`: transporte local (sem SMTP).
- `src/modules/auth/auth.module.ts`: remove `GoogleAuthController` e
  `GoogleAuthService`.
- `src/modules/email/templates/order-confirmation.hbs`: template que faltava
  (o serviço o referenciava, mas o arquivo não existia).
- `src/modules/order/services/order.service.ts`: monta o contexto do e-mail a
  partir de `billing_details` e do id do pedido.
- `src/modules/product/services/product.service.ts`: adiciona `await` no
  `updateOne` de estoque (o update não era aguardado, então a transação
  commitava antes da baixa) e invalida o cache.
- `Dockerfile`: produção com `WORKDIR`, `COPY scripts` e `CMD node dist/main.js`.
- `docker-compose.experiment.yml`: API + MongoDB (replica set) + Redis.
- `scripts/seed-local.js`: seed determinístico (apaga o banco via Mongoose,
  registra usuário, cria 2 produtos, 1 offering e 1 pedido).
- `.example.env` saneado; `.production.env` e `.development.env` locais
  (gitignored).
- `.gitignore`/`.dockerignore`: `uploads/` e arquivos `.env`.

## Como executar

```bash
# na pasta do ecommerce
docker compose -f docker-compose.experiment.yml up -d --build

# seed (roda em um container efêmero e usa a API em http://api:3001)
docker compose -f docker-compose.experiment.yml run --rm api node scripts/seed-local.js
```

Credenciais do seed: `buyer@example.com` / `password123`.

Health check: `GET http://localhost:3001/api/health/db`.

## Validação realizada (05/11/2026)

- Build da imagem e subida dos três containers.
- Health check respondendo `200`.
- Registro de usuário sem chamada externa (`cus_local_...`).
- Upload de imagem gravado em disco e servido em `/uploads/...` (`200`).
- Criação de pedido com payment intent local.
- Webhook local (`stripe-signature: local`) processando o pedido: status
  `paid`, estoque de 10 → 8, e-mail registrado pelo transporte local.

## Limitações

- O MongoDB precisa ser um replica set para as transações do pedido. O
  `docker-compose.experiment.yml` inicia o `rs0` pelo healthcheck.
- Rodar a API direto no host com `.development.env` (porta 27018) não habilita
  transações, porque o driver se conecta como standalone. O caminho canônico é
  o container.
- `uploads/` é efêmero (sem volume): o seed recria os arquivos a cada execução.
- `VerificationModule` (Twilio) e `ShippingModule` continuam no repositório,
  mas não estão no grafo do `main.module`; não fazem chamadas externas.
