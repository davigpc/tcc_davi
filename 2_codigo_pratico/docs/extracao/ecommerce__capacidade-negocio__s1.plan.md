# Pré-registro de Extração — ecommerce / Capacidade de Negócio / snapshot-1

> Escrito ANTES de mexer no código. Fixa a previsão para permitir a comparação
> "previsto × observado" depois.
>
> As seções "Contexto", "Fronteira proposta" e "Hipótese de resultado" trazem os
> fatos e as decisões da análise; as demais foram acordadas com o autor.

## Identificação

- App: `ecommerce` (varejo transacional / MongoDB)
- Metodologia: Capacidade de Negócio
- Snapshot: `snapshot-1` (primeira extração)
- Branch: `exp/ecommerce/capacidade-negocio` (repositório pai e fork)
- Baseline (`snapshot-0`): fork `6487e40`, tag `snapshot-0`
- Data: 2026-11-08

## Contexto

**Serviço-alvo:** Catálogo (`product` + `search` + `storages`).

O agrupamento por capacidade separa o sistema de venda em quatro capacidades:
Catálogo, Clientes, Vendas e Comunicação. A justificativa e a evidência de
acoplamento estão em `docs/metodologia/identificacao-dominios-ecommerce.md`.

**Por que o Catálogo é a primeira extração:**

- É a capacidade com menos dependências de **entrada**: o pedido a chama apenas
  para baixar estoque, e essa chamada ocorre no webhook, fora do caminho medido.
- O efeito aparece em uma rota medida: no baseline, `GET /api/products` faz
  3.071 req/s (p50 6,0 ms) e `GET /api/products/:id` faz 3.223 req/s
  (p50 5,0 ms).
- Os dados são os mais isolados do sistema: só a coleção `products`, o cache de
  resposta e os arquivos de imagem. Nenhuma outra capacidade escreve nela.

**Tensão conhecida:** o estoque é um campo de `Product`, e `processOrder` baixa
esse estoque **na mesma transação Mongo** que altera o status do pedido. Com o
Catálogo em outro processo, a baixa deixa de participar da transação. A paridade
funcional é mantida; a garantia de atomicidade não. Esse é o custo aceito nesta
trilha e o ponto que a trilha de Transações vai medir de forma explícita.

## O que será extraído

- `src/modules/product/**` — controller (`/api/products`), serviço, DTOs, schema.
- `src/modules/search/**` — busca textual e paginação sobre o schema de produto.
- `src/modules/storages/**` — armazenamento local das imagens.
- Peças de `shared` usadas por esses módulos: decorators de paginação e filtro,
  limpeza de cache e o tipo `Nullable`.
- O cache Redis de produto (`CacheInterceptor` no controller), único uso de Redis
  do sistema.
- A casca de processo que no monólito era única: `main.ts`, conexão com o Mongo,
  cache, `tsconfig`, `package.json` e `Dockerfile`.

**Fica no monólito:** `auth`, `token`, `user`, `address`, `cart`, `order`,
`inventory`, `stripe`, `email` e `health`.

## Fronteira proposta

O serviço de Catálogo passa a conter os três módulos em `services/ecommerce/catalogo/`,
com as mesmas rotas do baseline:

- `GET /api/products` (filtros, paginação e busca textual)
- `GET /api/products/:id`
- `POST /api/products` (multipart, com gravação de imagem em disco)
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `/uploads/*` (arquivos servidos pelo próprio serviço)

Para a baixa de estoque, o Catálogo expõe uma rota interna não medida,
`PATCH /api/internal/products/:id/stock`. O `InventoryService` do monólito deixa
de usar o `ProductService` e passa a chamar essa rota (camada anticorrupção
HTTP). É a única chamada serviço-a-serviço deste snapshot.

O esquema `item` não entra no Catálogo: o produto guarda apenas atributos
próprios. O maior vazamento fica na direção contrária — `cart` e `order` carregam
o schema de item do catálogo dentro do monólito. Isso será tratado na extração de
Vendas.

O `ProductSchema` referencia o vendedor por `ref: 'User'`. O serviço não carrega
o schema de usuário; mantém só o identificador da referência, o que evita levar
junto a capacidade de Clientes.

## Por que (fundamentação na metodologia)

O critério é o que a organização faz de ponta a ponta. Publicar e consultar
produtos é uma capacidade completa: começa no cadastro, passa pela imagem e
termina na busca. Ela não depende de decisão de compra nem de identidade — quem
consulta o catálogo não precisa estar autenticado.

O que qualifica a extração agora é a assimetria de dependências: o Catálogo não
precisa de ninguém para responder a leitura, e os outros só o procuram para
escrever estoque. Extrair primeiro a capacidade de menor acoplamento de entrada
reduz o risco das extrações seguintes, que mexem no caminho de escrita.

## Como (passos previstos)

1. Criar o serviço em `services/ecommerce/catalogo/` (scaffold NestJS, mesma
   versão do app).
2. Copiar os módulos `product`, `search` e `storages` e adaptar os imports com o
   mínimo de `shared` necessário.
3. Manter o contrato HTTP idêntico ao baseline.
4. Subir monólito + Catálogo + Mongo + Redis + NGINX e desviar `/api/products` e
   `/uploads/` no gateway.
5. Remover o `ProductModule` do monólito e trocar o `InventoryService` pelo
   cliente HTTP do Catálogo.
6. Validar paridade: mesmas respostas de leitura, criação de produto com imagem
   servida em `/uploads`, pedido e webhook concluindo com estoque reduzido.

## Decisão de persistência

**Opção 1 — banco compartilhado.** O Catálogo aponta para o mesmo MongoDB
(réplica `rs0`, banco `gldcart`) e para a mesma instância Redis. É o estágio de
convivência do Strangler Fig: preserva a paridade e isola a variável medida —
"extrair o código para um processo próprio" —, deixando a separação de dados para
o snapshot final.

## Comunicação entre serviços

- Cliente → NGINX → Catálogo nas rotas de produto.
- Monólito → Catálogo por HTTP apenas na baixa de estoque.
- Autenticação: as rotas de escrita do catálogo continuam usando o guarda JWT
  local, que valida a assinatura sem consultar outro serviço.

## Roteamento (Strangler Fig / NGINX)

O gateway passa a ocupar a porta pública **3001**, que era a do monólito. O
monólito vai para a porta interna 3002; o Catálogo usa 3001 interna. O cliente
e o harness continuam batendo em `http://localhost:3001`.

```nginx
location /api/products   -> catálogo
location /uploads/       -> catálogo
location /               -> monólito
```

Consequência a registrar nos resultados: o `snapshot-0` foi medido **sem** o
gateway. A partir do `snapshot-1` existe um salto a mais em toda requisição, o
que já havia acontecido na trilha de Capacidade do inventário.

## Hipótese de resultado (métricas)

- **Agilidade/DevOps:** build sobe (mais uma imagem) e o startup sobe (mais um
  processo para ficar pronto).
- **Infraestrutura/custo:** componentes passam de 3 para 5 (api, mongo, redis,
  catálogo, nginx); soma-se o tamanho da imagem do Catálogo.
- **Desempenho:** leitura pode cair de 5 % a 20 % pelo salto do gateway; o
  processo dedicado e o cache tendem a compensar parte da perda. A escrita
  (`POST /api/orders`) fica estável, porque a baixa de estoque só acontece no
  webhook, que não entra na carga.
- **Manutenibilidade:** LOC sobem (duplicação de `shared` e do schema de item);
  o cross-domain estático cai (produto sai do grafo do monólito), mas surge um
  acoplamento de rede que o `madge` não mede.

## Critério de pronto

- Rotas de produto respondendo pelo serviço, com paridade de resposta.
- Imagem de produto criada no seed servida em `/uploads/` pelo gateway.
- Pedido e webhook concluindo, com estoque reduzido no banco compartilhado.
- `snapshot-1` coletado (3 repetições), comparativo `s0 → s1` gerado.
- Registro de execução e reflexão do autor em
  `docs/extracao/ecommerce__capacidade-negocio__s1.md`.
