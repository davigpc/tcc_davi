# Registro de Extração — ecommerce / Capacidade de Negócio / snapshot final

## O que foi feito

As duas capacidades restantes saíram do monólito:

- **Vendas** em `services/ecommerce/vendas/`: `cart`, `shipping`, `order`,
  `inventory`, `stripe` e o modelo `item`. Inclui as rotas de carrinho, pedido,
  cobrança e webhook (2.451 linhas).
- **Comunicação** em `services/ecommerce/comunicacao/`: `email`, com o transporte
  local (318 linhas).
- O monólito deixou de compor a solução. `apps/ecommerce` continua fixado no
  baseline para as outras trilhas.

Cada serviço passou a ter o próprio MongoDB (`catalogo_db`, `clientes_db` e
`vendas_db` com réplica `rs0`); a Comunicação não tem banco. O Redis ficou apenas
com o Catálogo (cache de produto). São nove contêineres: quatro serviços, três
bancos, Redis e NGINX.

## Decisões de fronteira

**1. Validação em rede no caminho de escrita.** Com o banco isolado, o carrinho e
o pedido não podem mais validar o comprador nem o item na própria coleção. Vendas
chama `GET /api/internal/users/:id` (Clientes) e
`GET /api/internal/products/:id` (Catálogo) antes de gravar. É a diferença
central em relação ao s2, onde essas validações eram consultas locais ao banco
compartilhado.

**2. Composição da resposta no lugar do `populate`.** `populate('items.id')`
deixou de existir. Carrinho e pedido buscam os produtos em lote
(`POST /api/internal/products/batch`) e montam a resposta em Vendas. É um `join`
distribuído explícito, que o `madge` não vê.

**3. E-mail por HTTP.** O `OrderService` deixou de injetar o `EmailService` e
passa a chamar a Comunicação em `POST /api/internal/emails/order-confirmation`.

**4. Estoque continua por HTTP.** A baixa de estoque, que era rota interna do
Catálogo desde o s1, permanece — agora não há mais transação compartilhada entre
status do pedido e estoque.

**5. Cache do carrinho em memória.** O monólito usava Redis no `CacheInterceptor`
do carrinho e no cache de produto. No final, o Redis ficou com o Catálogo (dono do
cache de produto) e o carrinho usa o cache em memória do próprio processo. As
rotas de carga não passam por esse cache.

## Procedimento

1. Scaffold de Vendas e Comunicação a partir do Catálogo.
2. Remoção dos hooks `pre('save')` de `cart` e `order` e criação dos clientes HTTP
   (`CatalogoClient`, `ClientesClient`, `ComunicacaoClient`).
3. Endpoints internos novos: `GET /api/internal/products/:id`,
   `POST /api/internal/products/batch` e `GET /api/internal/users/:id`.
4. Compose com um MongoDB por serviço e gateway com as quatro capacidades.
5. Seed distribuído: reset do banco de Catálogo, reset do de Clientes e o seed
   transacional rodando em Vendas e falando com o gateway.
6. Validação funcional e coleta de três repetições.

## Validação funcional

Tudo pelo gateway (`http://localhost:3001`):

- Registro e login em Clientes; `GET /api/users` respondendo.
- `GET /api/products` e `GET /api/products/:id` no Catálogo.
- `POST /api/cart/:userId` calculando o subtotal pelo preço do Catálogo (204 para
  2 × 102) e `GET /api/cart/:id` devolvendo o item composto com nome e preço.
- `POST /api/orders` validando comprador e item em rede e criando o pedido no
  banco de Vendas.
- Webhook `payment_intent.succeeded`: pedido `paid`, estoque 50 → 49 no Catálogo
  e e-mail registrado no transporte local da Comunicação.
- Webhook `customer.subscription.updated`: `monthly_subscription_status` gravado
  no banco de Clientes.
- Foto de perfil gravada por Clientes e servida em `/uploads/` pelo Catálogo.
- `GET /api/internal/...` pela porta pública devolve 404 (bloqueio no gateway).

**Observações de paridade:** o cookie de refresh continua `secure` (herdado) e
`GET /api/address/:userId` continua devolvendo lista vazia (defeito original).

## Impacto observado nas métricas

Média de três execuções. O `snapshot-0` é o baseline canônico de 07/11.

| Dimensão | Métrica | snapshot-2 | final | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 121.707 ms | 88.234 ms | −27,5 % |
| Agilidade | Inicialização | 8.634 ms | 8.801 ms | +1,9 % |
| Custo | Componentes / contêineres | 6 / 6 | 9 / 9 | +3 |
| Custo | Imagens da aplicação | 301,3 MB | 388,8 MB | +29,0 % |
| Custo | RAM (repouso / carga) | 407,3 / 541,0 MB | 771,3 / 907,8 MB | +89,4 % / +67,8 % |
| Custo | CPU (repouso / carga) | 0,61 / 157,72 % | 1,06 / 156,06 % | +0,45 p.p. / −1,1 % |
| Desempenho | `GET /api/products` | 3.004,2 req/s · p50 6,3 ms | 2.917,9 req/s · p50 6,3 ms | −2,9 % |
| Desempenho | `GET /api/products/:id` | 3.204,3 req/s · p50 6,0 ms | 3.080,7 req/s · p50 6,0 ms | −3,9 % |
| Desempenho | `POST /api/orders` | 497,3 req/s · p50 38,3 ms | 556,8 req/s · p50 35,0 ms | +12,0 % |
| Manutenibilidade | Linhas de código | 5.464 | 5.328 | −136 (−2,5 %) |
| Manutenibilidade | Chamadas entre fronteiras | 74 de 211 | 76 de 206 | +2 |

O monólito saiu de 2.945 linhas para zero. A soma final é Catálogo 792, Clientes
1.767, Vendas 2.451 e Comunicação 318. Os 169 campos do `vendas/clients` não
entram em `modules` porque são clientes HTTP, não módulos de domínio.

O cross-domain subiu 2 arestas. A queda esperada nas arestas de `cart` (15 → 12) e
`order` (6 → 3) veio da remoção dos hooks, que importavam `ItemTypes`; a alta veio
do `order` importando o módulo de token local (`order → shared 9`) e do `stripe`
reimportando `order` e `shared`. O total de arestas caiu de 211 para 206 porque os
arquivos do monólito saíram da contagem.

**Resultado inesperado:** a vazão de `POST /api/orders` subiu 12,0 % e a latência
p50 caiu 3,3 ms, apesar das duas chamadas HTTP de validação no caminho. As
leituras caíram 2,9 % e 3,9 %. Não há medição isolada da causa. As explicações
plausíveis são o banco de Vendas dedicado (sem tráfego de outras rotas), o
processo menor em memória e a distribuição das rotas de leitura entre processos
diferentes. A leitura deve ser de faixa de variação, não de ganho atribuído à
fronteira.

## Previsto x realizado

- **Agilidade (previsto: build e startup sobem):** o startup subiu 1,9 %
  (confirmado). O build **caiu 27,5 %**, ao contrário do previsto: o monólito era
  a imagem mais pesada e as quatro imagens menores são construídas em paralelo.
  É o único snapshot da trilha em que o build cai de forma clara.
- **Custo (previsto: +3 contêineres e mais RAM/CPU):** os contêineres passaram de
  6 para 9, como previsto. A RAM quase dobrou (+89,4 % em repouso, +67,8 % sob
  carga), custo direto dos três MongoDB. A CPU sob carga ficou estável (−1,1 %),
  porque o trabalho de leitura continua nos mesmos dois processos.
- **Desempenho (previsto: leitura estável, escrita cai):** a leitura variou de
  −2,9 % a −3,9 %, dentro da faixa observada entre snapshots. A escrita **subiu**
  12,0 %, contra o previsto. O custo das chamadas de validação não apareceu na
  medição.
- **Manutenibilidade (previsto: LOC total cai e cross-domain cai):** o LOC caiu
  2,5 % (confirmado, primeiro recuo da trilha). O cross-domain subiu 2 arestas
  (não confirmado), pela combinação descrita acima; o que caiu foi o total de
  arestas, por causa da saída do monólito.

## ✍️ Aprendizado sobre decomposição

(escrever em suas palavras: o que muda quando a validação deixa de ser uma
consulta local e passa a ser uma chamada de rede; por que o `join` distribuído
do carrinho é o acoplamento mais caro da trilha; por que o build caiu justamente
quando o número de serviços subiu.)

## ✍️ Leitura crítica da comparação

(ressalva metodológica: o snapshot final muda três coisas ao mesmo tempo —
extrai Vendas e Comunicação, isola os bancos e desativa o monólito; a variação
medida não separa esses efeitos. O ganho de 12 % na escrita não deve ser
atribuído à fronteira sem nova medição; o custo de RAM é efeito direto dos três
bancos, não da extração em si.)
