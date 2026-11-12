# Diário de Execução — ecommerce / Transações (ACID)

> Um arquivo por trilha. Consolida hipótese, decisões, snapshots e observações.
> É o rascunho direto da seção correspondente do capítulo 05.

## Identificação

- App: `ecommerce` (varejo transacional / MongoDB)
- Metodologia: Transações (ACID)
- Branch: `exp/ecommerce/transacoes` (repositório pai e fork)
- Baseline: fork `6487e40` (tag `snapshot-0`), canônico reaproveitado (ADR-0003)
- Medição: 12/11/2026

## Hipótese de decomposição

O grupo atômico é o **Checkout** (`cart`, `shipping`, `order`, `inventory`,
`stripe`), porque o `processOrder` grava status do pedido e baixa de estoque na
mesma sessão Mongo. Catálogo, Identidade e Comunicação ficam fora da transação.

A ordem é o oposto das outras trilhas: o grupo atômico sai primeiro.

## Snapshots

### snapshot-0 (baseline monolítico)

- Reaproveitado das trilhas anteriores (mesmo app, mesmo harness).
- Build 117.342 ms; inicialização 8.032 ms; LOC 4.820; cross-domain 79/207;
  componentes 3; CPU 0,92 / 119,87 %; RAM 279,2 / 457,3 MB.
- `products` 3.071,5 req/s; `product-by-id` 3.223,3; `orders` 445,3.
- Sem medição de webhook (rota criada nesta trilha).

### snapshot-1 (grupo atômico — Checkout)

- Serviço: `services/ecommerce/checkout/` (cart, shipping, order, inventory,
  stripe, item); monólito com catálogo, identidade e comunicação.
- MongoDB compartilhado; baixa de estoque na mesma sessão do pedido.
- Resultados: build 120.345 ms (+2,6 %); inicialização 8.578 (+6,8 %); LOC 4.938
  (+2,4 %); cross-domain 72/196 (−7); componentes 5; imagens 187,6 MB (+90,1 %);
  RAM 358,7 / 537,5 MB; CPU 0,97 / 151,70 %; `products` 2.702,1 (−12,0 %);
  `product-by-id` 2.854,1 (−11,5 %); `orders` 517,7 (+16,3 %).
- Webhook (1 conexão): 75,6 req/s · p50 13,3 ms · zero non-2xx.
- Observações: a leitura caiu ~12 %, compatível com o salto pelo NGINX. A escrita
  subiu 16,3 % e não deve ser atribuída à fronteira sem nova medição. O LOC quase
  não mudou: o Checkout reaproveita os módulos e o monólito perde as mesmas
  linhas. O cross-domain cai porque as arestas internas do Checkout não cruzam
  fronteira.

### snapshot-2 (Catálogo)

- Serviço: `services/ecommerce/catalogo/` (product, search); `storages`
  duplicado no monólito (foto de perfil) e no Catálogo (imagem de produto).
- Banco compartilhado; a escrita do estoque continua na sessão do pedido.
- Resultados: build 129.214 ms (+7,4 %); inicialização 8.659 (+0,9 %); LOC 5.263
  (+6,6 %); cross-domain 71/197 (−1); componentes 6; imagens 276,0 MB (+29,8 %);
  RAM 406,3 / 537,7 MB; CPU 0,93 / 156,46 %; `products` 2.855,0 (+5,7 %);
  `product-by-id` 2.899,4 (+1,6 %); `orders` 520,1 (+0,5 %).
- Webhook: 91,2 req/s · p50 10,0 ms · zero non-2xx.
- Observações: a leitura ganhou com o processo dedicado e o cache; o
  cross-domain empatou porque o Catálogo recria as arestas internas.

### snapshot final (Identidade + Comunicação, bancos isolados)

- Serviços: `catalogo`, `clientes`, `checkout` e `comunicacao`; um MongoDB por
  serviço (o do Checkout com réplica `rs0`); monólito desativado.
- O estoque passou a ser um contador do Checkout (`stock`), baixado na mesma
  sessão do pedido; o Catálogo mantém a cópia de leitura, atualizada depois do
  commit. A criação de produto inicializa o contador no Checkout.
- Resultados: build 84.658 ms (−34,5 %); inicialização 8.366 (−3,4 %); LOC 5.004
  (−4,9 %); cross-domain 71/193 (0); componentes 9; imagens 363,7 MB (+31,8 %);
  RAM 764,5 / 901,1 MB; CPU 1,23 / 157,96 %; `products` 2.927,5 (+2,5 %);
  `product-by-id` 3.104,5 (+7,1 %); `orders` 507,4 (−2,4 %).
- Webhook: 77,1 req/s · p50 12,0 ms · zero non-2xx.
- Observações: o build cai porque o monólito deixa de ser construído; a memória
  quase dobra pelos três bancos; o webhook cai 15,5 % porque o caminho de
  confirmação passa a pagar validação em rede e a sincronização do Catálogo.

## Desvios e dificuldades

- **Rota de webhook.** As rotas das trilhas anteriores não executam a transação
  (`POST /api/orders` só grava o pedido). O harness ganhou a rota `POST /api/webhook`
  com identificador único por requisição e uma conexão, porque requisições
  concorrentes sobre o mesmo pedido falham com conflito de escrita na transação.
- **Leitura de estoque no teste.** O monólito mantém cache Redis do produto; a
  conferência do estoque tem de ser feita no banco, não pela API.
- **Seed publica o `orderId`.** Necessário para montar o corpo do webhook; o
  harness passou a aceitar `ids` com origem no stdout do seed.

## Síntese para o capítulo 05

A extração do grupo atômico preserva a consistência que as outras trilhas
perderam no s1. O custo aparece em infraestrutura: mais um processo, +28 % de
memória em repouso e +32 % de CPU sob carga. O código quase não cresce, porque a
fronteira coincide com módulos que já existiam.

No estado final, as fronteiras são as mesmas das outras duas trilhas (Catálogo,
Clientes, Checkout/Vendas e Comunicação), mas o conteúdo muda: o estoque migra
para o Checkout e vira um contador próprio, e o Catálogo fica com a cópia de
leitura. As 5.004 Linhas de Código e as 71 de 193 chamadas entre fronteiras
diferem das 5.328 e 76 de 206 das outras trilhas — a convergência de topologia
não implica o mesmo artefato.

O build cai 27,8 % em relação ao baseline porque o monólito deixa de ser
construído. A memória quase dobra pelos três bancos. A rota de webhook, medida
com uma conexão, cai 15,5 % do s2 para o final: é o preço das validações em rede
e da sincronização da cópia de leitura no caminho de confirmação.
