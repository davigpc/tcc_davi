# Pré-registro de Extração — ecommerce / Capacidade de Negócio / snapshot final

> Escrito antes da coleta. Fixa a previsão para a comparação "previsto ×
> observado".

## Identificação

- App: `ecommerce`
- Metodologia: Capacidade de Negócio
- Snapshot: `final`
- Branch: `exp/ecommerce/capacidade-negocio`
- Snapshot anterior: `snap/ecommerce/capacidade-negocio/2` (Clientes)
- Data: 2026-11-09

## O que será extraído

As duas capacidades que ainda estavam no monólito:

- **Vendas** (`cart`, `shipping`, `order`, `inventory`, `stripe`) em
  `services/ecommerce/vendas/`.
- **Comunicação** (`email`) em `services/ecommerce/comunicacao/`.

O monólito não compõe mais a solução: `apps/ecommerce` continua fixado no
baseline para as outras trilhas.

## Fronteira e persistência

Cada serviço passa a ter o próprio MongoDB: `catalogo_db`, `clientes_db` e
`vendas_db` (réplica `rs0`, necessária para a transação do pedido). A Comunicação
não tem banco. O Redis continua apenas com o Catálogo (cache de produto).

## Comunicação entre serviços

- Validação do comprador no carrinho e no pedido: Vendas → Clientes
  (`GET /api/internal/users/:id`).
- Validação do item, leitura de preço e baixa de estoque: Vendas → Catálogo
  (`GET /api/internal/products/:id`, `POST /api/internal/products/batch`,
  `PATCH /api/internal/products/:id/stock`).
- E-mail de confirmação: Vendas → Comunicação
  (`POST /api/internal/emails/order-confirmation`).
- Status de assinatura: Vendas → Clientes
  (`PATCH /api/internal/users/subscription`).
- Leitura do carrinho e do pedido: a resposta é composta em Vendas com os dados
  do produto vindos do Catálogo. O `populate` do Mongoose deixa de existir.

## Mudanças de comportamento previstas

- `POST /api/orders` passa a fazer duas chamadas HTTP antes de gravar (usuário e
  item), então a vazão deve cair de forma clara e a latência p50 deve subir.
- O `GET /api/cart/:id` deixa de ser uma consulta única e passa a compor com o
  Catálogo.
- A validação do token continua local em Vendas (`AccessTokenGuard`).

## Hipótese de resultado (métricas)

- **Agilidade:** build sobe (quatro imagens de aplicação); startup sobe (quatro
  processos e três bancos).
- **Custo:** contêineres passam de 6 para 9 (três bancos, quatro serviços,
  Redis e NGINX — na prática +3 bancos); RAM e CPU sobem; as imagens de
  aplicação somam quatro.
- **Desempenho:** leitura no Catálogo fica estável (não muda); escrita
  (`POST /api/orders`) **cai** pelo custo das chamadas síncronas de validação e
  da baixa de estoque.
- **Manutenibilidade:** LOC total cai em relação ao s2, porque o monólito saiu;
  cross-domain cai mais um pouco, mas o acoplamento que importa passa a ser de
  rede e o `madge` não o mede.

## Critério de pronto

- As rotas medidas respondendo pelos serviços, com paridade funcional.
- Carrinho com subtotal calculado pelo Catálogo e resposta composta.
- Pedido e webhook concluindo, com estoque reduzido no Catálogo e e-mail
  registrado na Comunicação.
- `snapshot final` coletado (3 repetições) e comparativo `s0 → s1 → s2 → final`.
- Registro em `docs/extracao/ecommerce__capacidade-negocio__final.md`.
