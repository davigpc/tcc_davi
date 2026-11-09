# Registro de Extração — ecommerce / Capacidade de Negócio / snapshot-1

> Escrito DEPOIS da extração. Combina a narrativa com a evidência automática
> (`git diff`, `madge`, diffs de compose/nginx). Rascunho do "como foi feita".
>
> As seções marcadas com ✍️ são para o autor complementar (reflexão/aprendizado).

## O que foi feito

Extraiu-se a capacidade de **Catálogo** (`product` + `search` + `storages`) do
monólito para um serviço NestJS independente, servido atrás do gateway NGINX
(Strangler Fig), com o mesmo contrato HTTP e o mesmo MongoDB (banco
compartilhado nesta fase).

- O **monólito** deixou de registrar `ProductModule`; as pastas
  `src/modules/product` e `src/modules/search` foram removidas (15 arquivos,
  −492 linhas). O `OrderModule` também parou de importar o módulo de produto.
- O `InventoryService` deixou de usar o `ProductService` e passou a chamar a
  rota interna do Catálogo por HTTP, dentro de `processOrder`.
- O **novo serviço** foi criado em `2_codigo_pratico/services/ecommerce/catalogo/`
  (20 arquivos, 677 linhas em `src/`), com os mesmos controllers, DTOs e schema
  de produto, mais cópias mínimas de `shared` (paginação, filtro, limpeza de
  cache) e de `storages` (gravação local da imagem).
- O **NGINX** ocupa a porta pública 3001: `location /api/products` e
  `location /uploads/` vão para o Catálogo; o restante continua no monólito,
  que passou para a porta interna 3002.

## A decisão que a validação forçou: leitura compartilhada de `products`

Com o `ProductModule` fora do monólito, a criação de pedido passou a falhar com
`MissingSchemaError: Schema hasn't been registered for model "Product"`. O erro
não vinha de um ponto só:

- `order.schema.ts` valida os itens no `pre-save` com `this.model('Product')`;
- `cart.schema.ts` faz o mesmo e ainda lê o `price` de cada item para calcular o
  subtotal;
- `OrderService.getOrderWithItemsById` e `CartService` usam `populate('items.id')`,
  que precisa do modelo registrado para resolver o `refPath`.

Havia duas saídas. A primeira seria trocar essas leituras por chamadas HTTP ao
Catálogo. Isso colocaria um salto de rede dentro do `POST /api/orders`, que é uma
das rotas medidas — e o pré-registro afirma que a escrita deve ficar estável
porque a baixa de estoque só acontece no webhook, fora da carga. A segunda é
manter no monólito um modelo enxuto que lê a coleção `products` do banco
compartilhado.

Optou-se pela segunda, em `src/modules/item/schemas/product-reference.schema.ts`:
um schema vazio com `strict: false`, registrado com o nome `Product` nos módulos
de carrinho e de pedido. Ele não repete os campos do produto; só existe para as
consultas de existência, de preço e para o `populate`, que continuam lendo os
documentos gravados pelo Catálogo.

Essa é uma consequência do estágio de banco compartilhado, não um atalho: o dado
tem um dono (o serviço de Catálogo), mas o monólito ainda o lê direto. É um
acoplamento de **dados** que o `madge` não mede e que desaparece quando o banco
for separado no snapshot final.

## Procedimento

**Submódulo `ecommerce`** (branch `exp/ecommerce/capacidade-negocio`, a partir do
baseline `6487e40`):

1. Scaffold do serviço em `2_codigo_pratico/services/ecommerce/catalogo/`,
   copiando `product`, `search` e `storages` com o mínimo de `shared`.
2. `ProductService.decrementStock` e `InternalProductController`
   (`PATCH /api/internal/products/:id/stock`), rota que não passa pelo gateway.
3. Remoção de `ProductModule` e das pastas `product`/`search` do monólito.
4. `InventoryService` reescrito como cliente HTTP do Catálogo; `updateInventory`
   deixa de receber a sessão Mongo.
5. Modelo de leitura `Product` para o carrinho e o pedido (seção anterior).

**Repo pai:**

1. `docs/metodologia/identificacao-dominios-ecommerce.md` (evidência do
   agrupamento em quatro capacidades).
2. `docs/extracao/ecommerce__capacidade-negocio__s1.plan.md` (pré-registro).
3. `infra/compose/ecommerce-capacidade-negocio-s1.yml` e
   `infra/gateway/nginx-capacidade-s1.conf`.
4. `harness/apps/ecommerce.capacidade-negocio-s1.json`, com `crossDomain`
   explícito (a árvore `src/modules` impede inferir o rótulo do serviço pelo
   caminho) e `sourceDirs` apontando para o monólito e para o Catálogo.

## Evidência automática

- **Monólito:** `git diff --stat 6487e40` → 15 arquivos, +55 / −492.
- **Serviço novo:** 20 arquivos em `src/`, 677 linhas.
- **Compose:** `2_codigo_pratico/infra/compose/ecommerce-capacidade-negocio-s1.yml`.
- **Gateway:** `2_codigo_pratico/infra/gateway/nginx-capacidade-s1.conf`.
- **Config de coleta:** `2_codigo_pratico/harness/apps/ecommerce.capacidade-negocio-s1.json`.
- **Paridade:** `metricas/ecommerce/capacidade-negocio/snapshot-1/paridade/golden.json`.

## Validação funcional

Antes da coleta, com a pilha de pé:

- `GET /api/products/:id` pelo gateway devolve o produto criado pelo seed, com a
  imagem em `PUBLIC_BASE_URL` apontando para `http://localhost:3001/uploads/...`.
- A imagem responde 200 pelo gateway (`/uploads/` → Catálogo).
- `POST /api/orders` conclui e o webhook leva o pedido a `paid`, com o estoque
  do produto caindo de 50 para 49 — a baixa agora passa pela rota interna do
  Catálogo.
- `POST /api/cart/:userId` calcula o subtotal (204 para 2 × 102) e
  `GET /api/cart/:id` devolve o item populado com nome, preço e imagem.

## Impacto observado nas métricas

Média de três execuções. O `snapshot-0` é o baseline de 07/11, reaproveitado
conforme a decisão 0003.

| Dimensão | Métrica | snapshot-0 | snapshot-1 | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 117.342 ms | 115.512 ms | −1,6 % |
| Agilidade | Inicialização | 8.032 ms | 8.546 ms | +6,4 % |
| Custo | Componentes / contêineres | 3 / 3 | 5 / 5 | +2 |
| Custo | Imagens da aplicação | 98,7 MB | 212,2 MB | +115 % |
| Custo | RAM (repouso / carga) | 279,2 / 457,3 MB | 341,4 / 474,1 MB | +22 % / +4 % |
| Custo | CPU (repouso / carga) | 0,92 / 119,87 % | 0,62 / 177,19 % | −0,3 p.p. / +48 % |
| Desempenho | `GET /api/products` | 3.071,5 req/s · p50 6,0 ms | 2.996,6 req/s · p50 6,7 ms | −2,4 % |
| Desempenho | `GET /api/products/:id` | 3.223,3 req/s · p50 5,0 ms | 3.208,4 req/s · p50 6,0 ms | −0,5 % |
| Desempenho | `POST /api/orders` | 445,3 req/s · p50 42,7 ms | 452,1 req/s · p50 41,3 ms | +1,5 % |
| Manutenibilidade | Linhas de código | 4.820 | 5.169 | +349 (+7,2 %) |
| Manutenibilidade | Chamadas entre fronteiras | 79 de 207 | 80 de 210 | +1 |

O Catálogo aparece como 594 linhas em `modules` e 82 em `shared`; o monólito caiu
de 4.288 para 3.874 linhas em `modules`. A diferença entre os dois lados é a
duplicação de `shared`, do schema de produto e do `Dockerfile`/`main.ts`.

O cross-domain não caiu. Do lado do monólito, as arestas de `product` (9) e
`search` (1) saíram, mas `cart` (+2), `order` (+1) e `inventory` (−1) mudaram
porque passaram a importar de `@item` — dois desses imports vêm do modelo de
leitura `Product`. Dentro do Catálogo reaparecem 9 arestas (`product→shared 4`,
`product→search 2`, `product→storages 2`, `search→shared 1`), o mesmo padrão
observado na trilha do inventário. Ou seja: a métrica estática mede módulos, não
processos; extrair código para outro processo não reduz a contagem se o serviço
recria a mesma estrutura interna.

## Previsto × realizado

- **Agilidade (previsto: build e startup sobem):** o startup subiu +6,4 %
  (confirmado, e menor do que na trilha do inventário). O build **caiu** 1,6 %,
  ao contrário do previsto. Não há medição por imagem, então não se isolou a
  causa; o que se pode afirmar é que construir duas imagens não custou mais tempo
  que construir uma.
- **Custo (previsto: 3 → 5 componentes):** confirmado exatamente. A imagem da
  aplicação passou de 98,7 para 212,2 MB, sendo 88,4 MB do Catálogo e 25,1 MB do
  NGINX — mas o NGINX também é usado pela trilha do inventário, então o número
  não é exclusivo daqui. A RAM em repouso subiu 22 % e a CPU sob carga 48 %,
  porque a rota de produto medida agora ocupa dois processos (NGINX e Catálogo).
- **Desempenho (previsto: leitura cai 5–20 % pelo salto do gateway):** **não se
  confirmou** na magnitude. `products` caiu 2,4 % e `product-by-id` 0,5 %; a
  latência p50 subiu 1 ms e 0,7 ms. A hipótese é que o processo dedicado (sem os
  outros módulos concorrendo) e o cache Redis de produto compensaram boa parte
  do salto. A escrita ficou estável (+1,5 %), como previsto, porque a baixa de
  estoque só ocorre no webhook.
- **Manutenibilidade (previsto: LOC sobe, cross-domain cai):** o LOC subiu 7,2 %
  (confirmado). O cross-domain **não caiu**: ficou em 80 (era 79), pela
  combinação descrita acima — o serviço recria as arestas internas e o monólito
  ganha imports de `@item`.

## ✍️ Aprendizado sobre decomposição

(escrever em suas palavras: o que a extração do Catálogo ensinou — a validação
de item que reaparece no monólito como leitura de dado alheio, a diferença entre
extrair uma consulta e extrair um dado com escrita vinda de fora, o custo de
acoplar carrinho e pedido ao preço do produto, etc.)

## ✍️ Leitura crítica da comparação

(ressalva metodológica: o baseline não tinha NGINX nem o banco compartilhado com
outro processo escrevendo, então a variação das rotas de produto mistura
"extrair o serviço" com "introduzir o proxy e mais contêineres na mesma máquina".
Escrever como isso deve ser lido no cap. 05.)
