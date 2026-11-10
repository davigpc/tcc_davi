# Pré-registro de Extração — ecommerce / Subdomínio (DDD) / snapshot final

> Escrito ANTES da coleta do estado final.

## Identificação

- App: `ecommerce` · Metodologia: Subdomínio (DDD) · Snapshot: `final`
- Branch: `exp/ecommerce/subdominio`
- Snapshot anterior: `snap/ecommerce/subdominio/2` (Catálogo)
- Data: 2026-11-10

## O que será extraído

O contexto de **núcleo** (Vendas): `cart`, `shipping`, `order`, `inventory`,
`stripe` e o modelo `item` vão para `services/ecommerce/vendas/`. O monólito é
desativado.

## Persistência (decisão)

**Um MongoDB por serviço**: `catalogo_db`, `identidade_db` e `vendas_db` (réplica
`rs0`, necessária para a transação do pedido). A Comunicação não tem banco. O
Redis continua apenas com o Catálogo.

## Comunicação entre serviços

- Vendas → Identidade: valida o comprador (`GET /api/internal/users/:id`).
- Vendas → Catálogo: valida o item, lê o preço em lote e baixa o estoque.
- Vendas → Comunicação: envia o e-mail de confirmação.
- Vendas → Identidade: atualiza o status de assinatura no webhook.
- A resposta do carrinho é composta em Vendas com os dados do Catálogo; o
  `populate` do Mongoose deixa de existir.

## Roteamento (Strangler Fig / NGINX)

```nginx
/api/auth|users|profile|address -> identidade
/api/emails                       -> comunicacao
/api/products|uploads             -> catalogo
/                                 -> vendas
/api/internal                     -> 404
```

## Hipótese de resultado (métricas)

- **Agilidade:** build cai em relação ao s2, porque a imagem do monólito (a mais
  pesada) deixa de ser construída; startup sobe pelo quarto processo e o terceiro
  banco.
- **Custo:** 7 → 9 contêineres; a RAM quase dobra pelos bancos dedicados.
- **Desempenho:** leitura estável; a escrita passa a fazer duas validações HTTP e
  a baixa de estoque remota, então a expectativa é de **queda** de vazão e alta de
  latência. Se não aparecer, o resultado deve ser tratado como faixa de variação,
  como no final da trilha de Capacidade.
- **Manutenibilidade:** LOC total cai com a saída do monólito; a análise estática
  deixa de enxergar o acoplamento, que passa a ser de rede.

## Critério de pronto

- Rotas medidas respondendo pelos serviços, com paridade funcional.
- Carrinho com subtotal vindo do Catálogo e resposta composta.
- Pedido validando comprador e item por HTTP; webhook baixando estoque no
  Catálogo e enviando e-mail pela Comunicação.
- `snapshot final` coletado e comparativo `s0 → s1 → s2 → final`.
- Registro em `docs/extracao/ecommerce__subdominio__final.md`.
