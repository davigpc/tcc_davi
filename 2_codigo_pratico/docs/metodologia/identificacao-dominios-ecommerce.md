# Identificação de Domínios — e-commerce

Documento de apoio para o capítulo 05. Registra **como** foram derivados os
serviços candidatos do `ecommerce` (roteiro §4.3), com a evidência que sustenta
cada escolha.

> Status: hipótese analítica, validada pela extração concreta. A coluna de
> Capacidade de Negócio foi fechada antes do snapshot-1; as lentes de Subdomínio
> e Transações são registradas nas trilhas correspondentes.

## 1. Objetivo

As três metodologias partem do **mesmo** conjunto de módulos e mudam apenas o
critério de agrupamento. Este documento fixa o critério de Capacidade de Negócio
e a evidência de acoplamento usada no `snapshot-0`.

## 2. Evidência de base

### 2.1 Estrutura de código (módulos)

Pastas em `src/modules/`:

```
address · auth · cart · email · health · inventory · order · product
search · shipping · storages · stripe · token · user
```

`item` e `shipping` **não são módulos**: são schemas, DTOs e enums embutidos no
carrinho e no pedido. `inventory` tem controller sem rota; existe apenas como
serviço chamado pelo pedido.

### 2.2 Acoplamento medido no baseline

`madge` no `snapshot-0`: **79 de 207** dependências cruzam fronteira de módulo
(38,2 %). As arestas com mais peso:

| Origem → Destino | Nº |
|---|---|
| `cart → item` | 13 |
| `user → address` | 6 |
| `cart → shipping` | 5 |
| `order → item` | 4 |
| `product → shared` | 4 |
| `auth → token` | 3 |
| `stripe → order` | 3 |
| `auth → user`, `auth → shared`, `inventory → item`, `order → email`, `order → inventory`, `order → stripe`, `product → search`, `product → storages`, `stripe → user`, `user → storages`, `user → stripe` | 2 cada |

Três leituras importam para a decomposição:

1. **`cart → item` (13)** é o maior acoplamento do sistema: o carrinho carrega o
   schema de item do catálogo.
2. **`order ↔ stripe` e `user ↔ auth` são circulares.** Nenhum dos dois pares
   pode ser separado em uma única extração sem escolher um lado.
3. **`email`, `inventory` e `stripe` são instanciados como providers diretos**
   dentro do `OrderModule`, sem import do módulo de origem. Para o `madge` isso
   aparece como poucas arestas; na prática não existe fronteira aplicada ali.

### 2.3 Decisões já registradas

| Documento | O que informa para a decomposição |
|---|---|
| ADR-0004 (poda de nuvem) | Stripe local em memória, S3 em disco, SMTP em memória. Remove integrações externas do caminho medido. |
| ADR-0005 (recorte de escopo) | O sistema foi reduzido ao fluxo de venda: catálogo, carrinho, pedido, pagamento e estoque. |
| `processOrder` | A baixa de estoque roda na **mesma transação Mongo** da mudança de status do pedido. |

## 3. Critério de Capacidade de Negócio

Critério: agrupar pelo que a organização **faz** de ponta a ponta, não pelo
detalhe técnico. Aplicado ao fluxo de venda do varejo:

- **Catálogo** ← `product` + `search` + `storages`
  Publicar e consultar produtos: cadastro, imagens, busca e filtros.
- **Clientes** ← `auth` + `token` + `user` + `address`
  Cadastrar o comprador, autenticá-lo, manter perfil e endereços.
- **Vendas** ← `cart` + `shipping` + `order` + `inventory` + `stripe`
  Levar o item até o pagamento: carrinho, frete, pedido, cobrança e baixa de
  estoque.
- **Comunicação** ← `email`
  Avisar o comprador sobre o pedido.

### 3.1 Por que "Estoque" não é uma capacidade própria

O roteiro §4.3 listava `Estoque` como serviço candidato. O código não sustenta a
hipótese: não há rota de estoque, o dado é um campo de `Product` e a escrita
acontece dentro da transação do pedido. Separar estoque exigiria criar uma
fronteira que não existe no domínio. Aqui ele fica dividido por natureza: o
**dado** pertence ao Catálogo, a **operação** pertence a Vendas.

### 3.2 Por que carrinho e checkout ficam juntos

O roteiro também separava `Carrinho` de `Pedido/Checkout`. Pelo critério de
capacidade, os dois são etapas do mesmo processo de venda, compartilham o schema
de item e o mesmo comprador. Mantê-los juntos evita uma fronteira que só
existiria para produzir mais um serviço.

## 4. Síntese

| Módulos | Capacidade de Negócio |
|---|---|
| `product`, `search`, `storages` | Catálogo |
| `auth`, `token`, `user`, `address` | Clientes |
| `cart`, `shipping`, `order`, `inventory`, `stripe` | Vendas |
| `email` | Comunicação |

## 5. Ordem de extração e validação empírica

A ordem segue o acoplamento de **entrada** de cada capacidade, não o tamanho:

1. **Catálogo** — só recebe chamadas do pedido, na baixa de estoque. É a única
   capacidade cujo efeito aparece em uma rota medida (`GET /api/products`).
2. **Clientes** — a autenticação é transversal (guardas globais), mas a
   verificação do token é local. O monólito mantém uma cópia dos guardas.
3. **Vendas + Comunicação** — o núcleo transacional sai por último, junto do
   e-mail; o monólito é desativado.

O que a extração precisa confirmar:
- se o Catálogo "segura" a fronteira sem levar junto o schema de item;
- se a baixa de estoque remota mantém a paridade funcional do webhook;
- como variam as métricas de leitura, o cross-domain e a contagem de componentes
  entre `snapshot-0` e `snapshot-1`.

## 6. Rastreabilidade

- Serviços candidatos: roteiro §4.3 (revisado por este documento).
- Dados brutos: `metricas/ecommerce/capacidade-negocio/snapshot-0/raw/cross-domain-calls.json`.
- Pré-registro da primeira extração: `docs/extracao/ecommerce__capacidade-negocio__s1.plan.md`.
