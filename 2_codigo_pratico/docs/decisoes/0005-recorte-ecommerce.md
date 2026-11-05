# 0005 — Recorte de escopo do e-commerce

**Data:** 05/11/2026
**Aplicação:** `2_codigo_pratico/apps/ecommerce`
**Branch do fork:** `baseline/poda-nuvem`

## Contexto

O e-commerce do upstream cobre 21 controladores e vários recursos que não
participam do fluxo transacional de compra (aluguel, serviços, chat,
avaliações, lista de desejos). Para o estudo de decomposição, o objeto é o
checkout: catálogo, carrinho, pedido, pagamento e estoque. Manter os recursos
periféricos aumentaria o número de módulos e de serviços a extrair nas três
trilhas sem contribuir para as invariantes transacionais.

O recorte é aplicado ao **baseline** (snapshot-0), antes da primeira trilha, e
vale para as três metodologias.

## Removido

| Módulo/recurso | Motivo |
|---|---|
| `renting` | aluguel é outro modelo de negócio; não participa do checkout |
| `offerings` | catálogo de serviços; o recorte é venda de produtos |
| `chat` | WebSocket de atendimento; não é exercitado pelas rotas de carga |
| `review` | avaliação pós-compra |
| `wishlist` | engajamento pré-compra |
| `verification` | verificação por SMS (Twilio), já fora do `main.module` |
| `google.auth` | OAuth do Google, já desligado na poda de nuvem |
| controller/service de `shipping` | placeholders; o enum e os DTOs de frete continuam (usados pelo carrinho) |
| `item.service` / `item.module` | serviço/módulo sem uso; o schema e o enum de item continuam |
| dependências órfãs | `twilio`, `stripe`, `@aws-sdk/client-s3`, `@nestjs/axios`, `axios`, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `pm2-runtime` |

## Mantido

- Identidade: `auth`, `users`, `address`, `token`.
- Catálogo: `products`, `search`, `storages`.
- Compra: `cart`, `item` (schema), `order`, `inventory`, `stripe`.
- Apoio: `shipping` (apenas `dtos/` e `enums/`), `email`, `health`.
- Infraestrutura: MongoDB (replica set), Redis, armazenamento local,
  pagamento local e e-mail local.

`ItemTypes` passou a ter apenas `PRODUCT`; as validações de `cart` e `order`
foram reduzidas ao modelo `Product`.

## Impacto

- 21 → 13 controladores (~12 efetivamente registrados no `main.module`).
- LOC e chamadas entre fronteiras caem; a imagem e o build ficam menores.
- O S0 foi medido de novo e a tag `snapshot-0` foi movida.
- A seção 5.1 da monografia foi ajustada para descrever o recorte.
- As trilhas do e-commerce passam a ter 3–5 serviços candidatos:
  - Capacidade: Identidade · Catálogo · Carrinho · Pedido/Checkout · Estoque.
  - Subdomínio: Núcleo (carrinho/pedido) · Suporte (catálogo) · Genérico
    (identidade/e-mail/storage).
  - Transações: Checkout (carrinho + pedido + pagamento + estoque) ·
    Catálogo · Identidade.

## Validação

- Build da imagem e `GET /api/health/db` → 200.
- Seed cria usuário, 2 produtos e 1 pedido.
- `GET /api/products?page=1&size=10` → 200; `GET /api/offerings` → 404
  (rota removida).
- Pedido criado com payment intent local.
- S0 re-medido com o harness (`metricas/ecommerce/capacidade-negocio/snapshot-0`).
