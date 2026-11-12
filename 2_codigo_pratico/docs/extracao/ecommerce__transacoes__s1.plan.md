# Pré-registro — ecommerce / Transações / snapshot-1

Escrito antes da medição. Registra o que será extraído, o que se espera das
métricas e como o resultado será validado.

## Identificação

- App: `ecommerce` (varejo transacional / MongoDB)
- Metodologia: Transações (ACID)
- Branch: `exp/ecommerce/transacoes` (repositório pai e fork)
- Baseline: fork `6487e40` (tag `snapshot-0`), canônico reaproveitado (ADR-0003)
- Data: 12/11/2026

## O que sai do monólito

O grupo **Checkout**: `cart`, `shipping`, `order`, `inventory`, `stripe` e o
modelo `item`, para `services/ecommerce/checkout/`.

O monólito fica com catálogo (`product`, `search`, `storages`), identidade
(`auth`, `token`, `user`, `address`), comunicação (`email`) e as rotas internas
que o Checkout consome.

**A transação é preservada.** O MongoDB continua sendo o mesmo, e a baixa de
estoque roda na sessão aberta pelo `processOrder`, como no baseline. É o
contraste com a primeira extração das outras duas trilhas, que retiraram a
atomicidade já no s1.

## Decisões de fronteira

- **Leitura local.** Carrinho e pedido leem `products` e `users` na mesma base
  por modelos de referência (`strict: false`). Não há chamada de rede no caminho
  de escrita.
- **E-mail por HTTP.** O envio da confirmação passa a ser uma rota interna do
  monólito, chamada depois do commit.
- **Token local.** O Checkout valida a assinatura com `ACCESS_SECRET`, sem
  consultar a Identidade.
- **Assinatura por HTTP.** O webhook de assinatura grava o status em uma rota
  interna do monólito.

## Hipótese de métricas

| Métrica | Direção esperada | Motivo |
|---|---|---|
| Build | sobe | terceira imagem de aplicação |
| Inicialização | sobe pouco | um processo a mais |
| Componentes | 3 → 5 | Checkout e NGINX |
| RAM | sobe | dois processos de aplicação |
| LOC | sobe | duplicação de código transversal no serviço |
| Cross-domain | cai | o monólito perde as arestas de carrinho, pedido, estoque e pagamento |
| Leitura (`products`) | estável ou cai pouco | salto adicional pelo NGINX |
| Escrita (`orders`) | estável | validação local preservada |
| Webhook | medida nova | executa a transação pedido + estoque |

## Medição adicional: rota de webhook

As três rotas das trilhas anteriores não exercitam a transação: `POST /api/orders`
só grava o pedido; a baixa acontece no webhook. Por isso o harness ganhou a rota
`POST /api/webhook`, com:

- corpo de evento local (`payment_intent.succeeded`) apontando para o pedido do
  seed;
- identificador de evento único por requisição (`setupRequest`), porque o
  handler recusa evento repetido;
- **uma conexão**, porque requisições concorrentes sobre o mesmo pedido geram
  conflito de escrita na transação Mongo. Medir com 20 conexões mediria a
  contenção do agregado, não a fronteira.

O valor é comparável entre snapshots da mesma trilha, não com as rotas medidas a
20 conexões.

## Risco conhecido

O seed passa a publicar o `orderId` no stdout para que o harness monte o corpo do
webhook. A leitura do estoque depois do teste precisa ser feita no banco: o
monólito mantém cache Redis do produto e devolve o valor antigo na leitura HTTP.

## Validação antes da medição

- Login e `GET /api/users` respondendo.
- `POST /api/cart/:userId` calculando subtotal com o preço local.
- `POST /api/orders` devolvendo `client_secret`.
- Webhook mudando o pedido para `paid` e baixando o estoque na mesma transação.
- E-mail de confirmação registrado no monólito.
