# Diário de Execução — ecommerce / Capacidade de Negócio

> Um arquivo por trilha. Consolida hipótese, decisões, snapshots e observações.
> É o rascunho direto da seção correspondente do capítulo 05.

## Identificação

- App: `ecommerce` (papel no TCC: varejo transacional / MongoDB)
- Metodologia: Capacidade de Negócio
- Branch: `exp/ecommerce/capacidade-negocio` (repositório pai e fork)
- Baseline (código): fork `6487e40` (tag `snapshot-0`)
- Snapshot-0 medido em 07/11/2026, reaproveitado conforme a decisão 0003

## Hipótese de decomposição

A Capacidade de Negócio agrupa os serviços pelos processos que a organização
executa de ponta a ponta. No e-commerce, o resultado são quatro capacidades:

| Capacidade | Módulos | Justificativa |
|---|---|---|
| Catálogo | `product`, `search`, `storages` | publicar, buscar e armazenar imagem de produto |
| Clientes | `auth`, `token`, `user`, `address` | identidade, sessão e endereço do comprador |
| Vendas | `cart`, `shipping`, `order`, `inventory`, `stripe` | montar carrinho, fechar pedido e receber |
| Comunicação | `email` | avisos de pedido |

A evidência do agrupamento está em
`docs/metodologia/identificacao-dominios-ecommerce.md`. O `roteiro.md` §4.3
previa cinco capacidades com "Estoque" separado; o estoque não tem rota própria
(é campo de `Product`, escrito dentro da transação do pedido), então foi
incorporado a Vendas, e carrinho e checkout ficaram na mesma capacidade.

A primeira extração é o **Catálogo**: é a capacidade com menos dependências de
entrada (só o pedido a procura, no webhook), concentra os dados mais isolados
(a coleção `products`, o cache e as imagens) e responde a duas rotas medidas.

## Snapshots

### snapshot-0 (baseline monolítico)

- Pasta: `metricas/ecommerce/capacidade-negocio/snapshot-0/`
- Tag: `snap/ecommerce/capacidade-negocio/0` (baseline `snapshot-0`)
- Pilha: `docker-compose.experiment.yml` — `api`, `mongo` (réplica `rs0`) e `redis`, sem gateway.

**Resultados (média de 3 repetições):**

| Dimensão | Métrica | Valor |
|---|---|---|
| Agilidade | Build (`--no-cache`) | 117.342 ms |
| Agilidade | Inicialização | 8.032 ms |
| Custo | CPU (repouso / carga) | 0,92 % / 119,87 % |
| Custo | RAM (repouso / carga) | 279,2 / 457,3 MB |
| Custo | Imagem da aplicação | 98,67 MB |
| Custo | Componentes / containers | 3 / 3 |
| Desempenho | `GET /api/products` | 3.071,5 req/s · 6 / 7,3 / 9,7 ms |
| Desempenho | `GET /api/products/:id` | 3.223,3 req/s · 5 / 7 / 9,7 ms |
| Desempenho | `POST /api/orders` | 445,3 req/s · 42,7 / 56 / 67,3 ms |
| Manutenibilidade | LOC (TypeScript) | 4.820 |
| Manutenibilidade | Chamadas entre fronteiras | 79 de 207 |

**Observação do baseline:** o `snapshot-0` foi medido **sem** NGINX. A partir do
`snapshot-1` toda requisição passa a ter um salto a mais pelo gateway — a mesma
ressalva registrada na trilha de Capacidade do inventário. No resumo do S0 a
rota `orders` ficou gravada na lista de leitura; a partir do S1 ela está em
escrita, e o comparativo soma as duas listas.

### snapshot-1 (primeira extração — Catálogo)

- Pasta: `metricas/ecommerce/capacidade-negocio/snapshot-1/`
- Tag: `snap/ecommerce/capacidade-negocio/1`
- Pré-registro: `docs/extracao/ecommerce__capacidade-negocio__s1.plan.md`
- Registro: `docs/extracao/ecommerce__capacidade-negocio__s1.md`
- Serviço extraído: `services/ecommerce/catalogo/`; gateway
  `infra/gateway/nginx-capacidade-s1.conf`; compose
  `infra/compose/ecommerce-capacidade-negocio-s1.yml`.
- Topologia: NGINX na porta pública 3001; monólito em 3002; Catálogo em 3001
  interno; MongoDB e Redis compartilhados.

**Resultados (média de 3 repetições):**

| Dimensão | Métrica | snapshot-0 | snapshot-1 |
|---|---|---|---|
| Agilidade | build (`--no-cache`) | 117.342 ms | 115.512 ms |
| Agilidade | inicialização | 8.032 ms | 8.546 ms |
| Custo | CPU total (repouso / carga) | 0,92 % / 119,87 % | 0,62 % / 177,19 % |
| Custo | RAM total (repouso / carga) | 279,2 / 457,3 MB | 341,4 / 474,1 MB |
| Custo | imagens da aplicação | 98,67 MB | 212,2 MB |
| Custo | componentes / containers | 3 / 3 | 5 / 5 |
| Desempenho | `products` | 3.071,5 req/s · p50 6,0 ms | 2.996,6 req/s · p50 6,7 ms |
| Desempenho | `product-by-id` | 3.223,3 req/s · p50 5,0 ms | 3.208,4 req/s · p50 6,0 ms |
| Desempenho | `orders` | 445,3 req/s · p50 42,7 ms | 452,1 req/s · p50 41,3 ms |
| Manutenibilidade | LOC | 4.820 | 5.169 |
| Manutenibilidade | cross-domain | 79 / 207 | 80 / 210 |

**Observações:**
- O build **caiu** 1,6 %, ao contrário da hipótese: duas imagens não custaram
  mais tempo que uma. O startup subiu 6,4 %.
- A vazão de leitura caiu menos que o previsto (2,4 % em `products` e 0,5 % em
  `product-by-id`, com p50 +1 ms e +0,7 ms). O processo dedicado e o cache Redis
  de produto compensaram a maior parte do salto pelo gateway.
- A escrita ficou estável (+1,5 %), como previsto: a baixa de estoque só ocorre
  no webhook, fora da carga.
- O LOC subiu 7,2 % por duplicação de `shared`, do schema de produto e da casca
  de processo. O cross-domain **não caiu** (79 → 80): o Catálogo recria 9 arestas
  internas e o monólito ganhou 3 imports de `@item`, dois deles por causa do
  modelo de leitura do produto.
- Paridade funcional confirmada: rotas de produto com as mesmas respostas,
  imagem criada no seed servida em `/uploads/`, pedido e webhook concluindo com
  estoque de 50 → 49, e carrinho com subtotal e item populado corretos.

### snapshot-2 (segunda extração — Clientes)

- Pasta: `metricas/ecommerce/capacidade-negocio/snapshot-2/`
- Tag: `snap/ecommerce/capacidade-negocio/2`
- Pré-registro: `docs/extracao/ecommerce__capacidade-negocio__s2.plan.md`
- Registro: `docs/extracao/ecommerce__capacidade-negocio__s2.md`
- Serviço extraído: `services/ecommerce/clientes/` (auth, token, user, address,
  storages); gateway `infra/gateway/nginx-capacidade-s2.conf`; compose
  `infra/compose/ecommerce-capacidade-negocio-s2.yml`.
- Topologia: NGINX na porta pública 3001; monólito em 3002; Catálogo e Clientes
  em 3001 interno; MongoDB e volume `uploads` compartilhados.

**Resultados (média de 3 repetições):**

| Dimensão | Métrica | snapshot-1 | snapshot-2 |
|---|---|---|---|
| Agilidade | build (`--no-cache`) | 115.512 ms | 121.707 ms |
| Agilidade | inicialização | 8.546 ms | 8.634 ms |
| Custo | CPU total (repouso / carga) | 0,62 % / 177,19 % | 0,61 % / 157,72 % |
| Custo | RAM total (repouso / carga) | 341,4 / 474,1 MB | 407,3 / 541,0 MB |
| Custo | imagens da aplicação | 212,2 MB | 301,3 MB |
| Custo | componentes / containers | 5 / 5 | 6 / 6 |
| Desempenho | `products` | 2.996,6 req/s · p50 6,7 ms | 3.004,2 req/s · p50 6,3 ms |
| Desempenho | `product-by-id` | 3.208,4 req/s · p50 6,0 ms | 3.204,3 req/s · p50 6,0 ms |
| Desempenho | `orders` | 452,1 req/s · p50 41,3 ms | 497,3 req/s · p50 38,3 ms |
| Manutenibilidade | LOC | 5.169 | 5.464 |
| Manutenibilidade | cross-domain | 80 / 210 | 74 / 211 |

**Observações:**
- O build subiu 5,4 %, a primeira alta da trilha: três imagens de aplicação, com
  a de Clientes (89,1 MB, por causa do `argon2`) somando ao total. O startup
  subiu só 1,0 %.
- A CPU sob carga **caiu** 11,0 %, contra a hipótese. O Clientes não recebe
  nenhuma requisição da carga medida e fica em 0 %; o Catálogo e o NGINX absorvem
  as leituras. O processo a mais custa RAM (+19,3 % em repouso), não CPU.
- As leituras ficaram estáveis (abaixo de 0,5 %) e a escrita subiu 10,0 %
  (p50 −3 ms). A rota não atravessa o Clientes: a hipótese mais provável é o
  monólito menor (4.404 → 2.945 linhas), sem medição isolada da causa.
- O cross-domain caiu de 80 para 74 — o primeiro corte real da trilha. O monólito
  perdeu 25 arestas (auth, token, user e a importação de `user` em `stripe`) e o
  Clientes reintroduziu 19 internamente.
- Paridade funcional confirmada pelo gateway: registro, login, `GET /api/users`,
  endereço, foto de perfil servida em `/uploads/` pelo Catálogo, pedido com
  `stripe_cus_id` vindo do JWT verificado localmente, webhook pago baixando
  estoque e assinatura atualizada pela rota interna do Clientes.

### snapshot final (Vendas + Comunicação, banco isolado)

- Pasta: `metricas/ecommerce/capacidade-negocio/snapshot-final/`
- Tag: `snap/ecommerce/capacidade-negocio/final`
- Pré-registro: `docs/extracao/ecommerce__capacidade-negocio__final.plan.md`
- Registro: `docs/extracao/ecommerce__capacidade-negocio__final.md`
- Serviços: `services/ecommerce/{vendas,comunicacao}/`; gateway
  `infra/gateway/nginx-capacidade-final.conf`; compose
  `infra/compose/ecommerce-capacidade-negocio-final.yml`.
- Topologia: quatro serviços e um MongoDB por serviço (`catalogo_db`,
  `clientes_db`, `vendas_db` com réplica `rs0`), Redis só no Catálogo, NGINX na
  porta 3001. O monólito foi desativado.

**Resultados (média de 3 repetições):**

| Dimensão | Métrica | snapshot-2 | final |
|---|---|---|---|
| Agilidade | build (`--no-cache`) | 121.707 ms | 88.234 ms |
| Agilidade | inicialização | 8.634 ms | 8.801 ms |
| Custo | CPU total (repouso / carga) | 0,61 % / 157,72 % | 1,06 % / 156,06 % |
| Custo | RAM total (repouso / carga) | 407,3 / 541,0 MB | 771,3 / 907,8 MB |
| Custo | imagens da aplicação | 301,3 MB | 388,8 MB |
| Custo | componentes / containers | 6 / 6 | 9 / 9 |
| Desempenho | `products` | 3.004,2 req/s · p50 6,3 ms | 2.917,9 req/s · p50 6,3 ms |
| Desempenho | `product-by-id` | 3.204,3 req/s · p50 6,0 ms | 3.080,7 req/s · p50 6,0 ms |
| Desempenho | `orders` | 497,3 req/s · p50 38,3 ms | 556,8 req/s · p50 35,0 ms |
| Manutenibilidade | LOC | 5.464 | 5.328 |
| Manutenibilidade | cross-domain | 74 / 211 | 76 / 206 |

**Observações:**
- O build **caiu 27,5 %**, contra a hipótese: o monólito era a imagem mais
  pesada e as quatro imagens menores são construídas em paralelo. O startup subiu
  1,9 %.
- A RAM quase dobrou (+89,4 % em repouso, +67,8 % sob carga) por causa dos três
  MongoDB. A CPU sob carga ficou estável (−1,1 %), porque as leituras continuam
  nos mesmos processos (Catálogo + NGINX).
- A escrita subiu 12,0 % (p50 −3,3 ms), contra o previsto, apesar das duas
  validações HTTP. O banco de Vendas dedicado e o processo menor são hipóteses;
  não há medição isolada, então o número entra como faixa de variação.
- O cross-domain subiu de 74 para 76: `cart→item` e `order→item` caíram com a
  remoção dos hooks, mas `order→shared` e `stripe→shared` subiram com o módulo de
  token local. O total de arestas caiu de 211 para 206 com a saída do monólito.
- O LOC caiu 2,5 % (5.464 → 5.328), primeiro recuo da trilha. O monólito saiu de
  2.945 linhas; a soma é Catálogo 792, Clientes 1.767, Vendas 2.451 e Comunicação
  318.
- Paridade confirmada: carrinho com subtotal vindo do Catálogo e resposta
  composta, pedido validando usuário e item por HTTP, webhook baixando estoque e
  enviando e-mail pela Comunicação, assinatura gravada em Clientes e foto de
  perfil servida pelo Catálogo.

## Desvios e dificuldades

- **`populate` impossível com banco isolado.** `populate('items.id')` dependia de
  o modelo `Product` estar registrado na mesma conexão. A resposta do carrinho e
  do pedido passou a ser composta com consulta em lote ao Catálogo
  (`POST /api/internal/products/batch`).
- **Hooks `pre('save')` não aceitam cliente HTTP.** A validação de comprador e
  item saiu dos schemas e foi para o serviço (`applyPricing` no carrinho e
  `createOrder` no pedido).
- **Cada serviço precisa zerar o próprio banco.** O seed deixou de ser um
  `dropDatabase` único: Catálogo e Clientes ganharam `scripts/reset-db.js` e o
  harness roda os três seeds em ordem.
- **Seed precisa passar pelo gateway.** O seed roda no contêiner de Vendas, que só
  tem as rotas de venda; registro e produtos dependem de `SEED_BASE_URL=http://nginx`.
- **`npm run snapshot -- --app ...` no PowerShell engole as flags.** Rodar com
  `npx tsx coleta/run-snapshot.ts --app ... --config ...`.
- **Pasta do snapshot precisa começar com `snapshot`.** `final` é ignorado pelo
  `comparar.ts`; o diretório correto é `snapshot-final`, como no inventário.
- **Guarda de token sem o `TokenService`.** O `JwtAuthenticationGuard` injetava o
  serviço de tokens, que saiu com a capacidade. Como a verificação é stateless, o
  monólito ganhou um `AccessTokenGuard` com `JwtService` e um `AccessTokenModule`
  compartilhado entre pedido e cobrança. Sem isso, o `POST /api/orders` precisaria
  de uma chamada HTTP por requisição.
- **`argon2` na imagem do Clientes.** O `npm ci` da imagem `node:22-slim`
  compilou o módulo nativo sem dependências extras; a imagem ficou em 89,1 MB,
  maior que a do Catálogo.
- **`UserModule` importava `AuthModule` com `forwardRef` sem usar.** A importação
  saiu junto com o serviço, o que apagou uma aresta circular que existia no
  baseline.
- **Cookie de refresh com `secure: true`.** Como `NODE_ENV=production`, o cookie
  não é enviado em HTTP puro e `GET /api/auth/refresh` responde 401 sem sessão
  segura. Comportamento herdado do baseline, mantido para não alterar o contrato.
- **`GET /api/address/:userId` nunca devolve os endereços criados.** O filtro usa
  um campo `user` que o DTO não preenche; é defeito do código original, mantido
  sem correção para preservar a paridade.
- **Seed precisa do `SEED_BASE_URL` no gateway.** Rodar o seed dentro do monólito
  funciona porque `SEED_BASE_URL=http://nginx`; sem isso o registro bateria no
  monólito, que já não tem as rotas de autenticação.

- **Modelo `Product` ausente no monólito.** Depois de remover o `ProductModule`,
  o seed falhou em `POST /api/orders` com `MissingSchemaError: Schema hasn't been
  registered for model "Product"`. Não era só o `pre-save` do pedido: o carrinho
  também valida item e lê o preço, e carrinho e pedido fazem `populate('items.id')`.
  A saída por HTTP colocaria um salto de rede na rota medida, contra o que o
  pré-registro previa; adotou-se um modelo de leitura da coleção compartilhada
  (`src/modules/item/schemas/product-reference.schema.ts`), registrado nos dois
  módulos. O acoplamento de dados resultante está registrado no `s1.md`.
- **`mongoose` fixado em `8.4.3`** no serviço: o intervalo `^8.4.3` puxava a
  versão 8.24 e quebrava a tipagem do `search.service.ts`. A versão foi fixada na
  mesma do monólito.
- **Configuração explícita de cross-domain no harness.** A árvore do e-commerce é
  `src/modules/<domínio>`, e a inferência do rótulo pelo caminho não vale. O
  `AppConfig` ganhou `crossDomain` (label, diretório e `tsconfig`) e o
  `collectors.ts` passou a aceitá-lo, sem alterar as trilhas anteriores.
- **Porta do NGINX não publicada na primeira subida.** O contêiner subiu com
  `80/tcp` sem binding; a recriação forçada do serviço resolveu. Vale conferir
  `docker port` antes de cada coleta.
- **Nomes de campo antigos no `comparar.ts`.** Os resumos do inventário usam
  `cpuAvgPerc`/`memAvgMB`, renomeados depois para `cpuMedPerc`/`memMedMB`; a
  leitura passou a aceitar os dois nomes e a imprimir `--` quando o valor não
  existe, evitando `NaN` nas tabelas.

## Síntese para o capítulo 05

A trilha separou as quatro capacidades em quatro snapshots. O Catálogo (s1) não
reduziu o acoplamento estático (79 → 80): o serviço recriou as arestas internas e
o monólito passou a importar o modelo de leitura de produto. Clientes (s2) deu o
primeiro corte real (80 → 74), porque as arestas de entrada — autenticação, token
e usuário — saíram do monólito. O snapshot final (Vendas + Comunicação, banco
isolado) fechou a trilha com 76 arestas de 206: a extração reduziu o total de
importações, mas as arestas de carrinho e pedido continuam dentro do serviço de
Vendas, e o acoplamento que passou a existir é de rede, invisível ao `madge`.

O custo aparece de forma monotônica em infraestrutura: 3 → 5 → 6 → 9 contêineres,
RAM de 279 para 771 MB em repouso (+176 %) e imagens de 98,7 para 388,8 MB
(+294 %). O desempenho não acompanhou esse custo: a vazão média ficou em 2.185
req/s contra 2.247 do baseline (−3 %) e a latência p50 caiu 12 %. O único ponto
em que o build caiu (−25 % no acumulado) foi o snapshot final, quando a imagem do
monólito deixou de ser construída.

O achado central da trilha é que a decomposição por capacidade no e-commerce
transferiu o acoplamento do compilador para a rede. O carrinho e o pedido, que
vivem juntos em Vendas, precisam consultar Clientes e Catálogo a cada operação de
escrita, e a resposta do carrinho passou a ser um `join` distribuído. O código
ficou menor no total (−2,5 % no final, depois de subir 13 %), mas o sistema ficou
mais caro de operar e mais dependente de dois serviços para fechar um pedido.
