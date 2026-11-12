# Registro de Extração — ecommerce / Transações / snapshot final

## O que foi feito

A **Identidade** e a **Comunicação** saíram do monólito, que foi desativado. O
estado final tem quatro serviços e três bancos:

- `checkout` (cart, shipping, order, inventory, stripe, item) com `checkout_db`
  em réplica `rs0`;
- `catalogo` (product, search, storages) com `catalogo_db`;
- `clientes` (auth, token, user, address, storages) com `clientes_db`;
- `comunicacao` (email), sem banco.

O Redis ficou só com o Catálogo. São nove contêineres.

## Decisões de fronteira

**1. O estoque passou para o Checkout.** O contador agora é uma coleção própria
(`stock`), baixada na mesma sessão Mongo do status do pedido. É a razão de o
grupo ter sido extraído junto: a invariante "pedido pago implica baixa" continua
dentro de uma transação.

**2. Cópia de leitura no Catálogo.** O campo `stock` do produto continua
existindo para a listagem. Depois do commit, o Checkout envia a mesma baixa ao
Catálogo por rota interna. A chamada fica fora da transação e pode falhar sem
desfazer o pedido; nesse caso, a cópia de leitura fica defasada até a próxima
sincronização.

**3. Criação de produto sincroniza o contador.** Quando um produto é criado, o
Catálogo chama `PUT /api/internal/stock/:id` no Checkout com o saldo inicial.
Sem isso, o produto nasceria sem contador e a baixa não teria onde incidir.

**4. Validação em rede no caminho de escrita.** O pedido valida o comprador em
Clientes e o item no Catálogo por HTTP; o carrinho compõe a resposta com os
produtos vindos do Catálogo. É o mesmo padrão do final da Capacidade.

**5. E-mail por HTTP.** A confirmação vai para a Comunicação depois do commit.

## Validação funcional

- Registro e login na Identidade; `GET /api/users` respondendo.
- `POST /api/cart/:userId` calculando o subtotal pelo preço do Catálogo.
- `POST /api/orders` validando comprador e item em rede.
- Webhook: pedido `paid`, contador do Checkout 50 → 49, cópia do Catálogo 50 → 49
  e e-mail registrado na Comunicação.
- Produto criado pelo seed com contador inicializado no Checkout.

## Impacto observado nas métricas

Média de três execuções.

| Dimensão | Métrica | s2 | final | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 129.214 ms | 84.658 ms | −34,5 % |
| Agilidade | Inicialização | 8.659 ms | 8.366 ms | −3,4 % |
| Custo | Componentes / contêineres | 6 / 6 | 9 / 9 | +3 |
| Custo | Imagens da aplicação | 276,0 MB | 363,7 MB | +31,8 % |
| Custo | RAM (repouso / carga) | 406,3 / 537,7 MB | 764,5 / 901,1 MB | +88,2 % / +67,6 % |
| Custo | CPU (repouso / carga) | 0,93 / 156,46 % | 1,23 / 157,96 % | +0,30 p.p. / +1,0 % |
| Desempenho | `GET /api/products` | 2.855,0 req/s · p50 6,7 ms | 2.927,5 req/s · p50 6,3 ms | +2,5 % |
| Desempenho | `GET /api/products/:id` | 2.899,4 req/s · p50 7,0 ms | 3.104,5 req/s · p50 6,0 ms | +7,1 % |
| Desempenho | `POST /api/orders` | 520,1 req/s · p50 37,7 ms | 507,4 req/s · p50 38,3 ms | −2,4 % |
| Desempenho | `POST /api/webhook` (1 conexão) | 91,2 req/s · p50 10,0 ms | 77,1 req/s · p50 12,0 ms | −15,5 % |
| Manutenibilidade | Linhas de Código | 5.263 | 5.004 | −259 (−4,9 %) |
| Manutenibilidade | Chamadas entre fronteiras | 71 de 197 | 71 de 193 | 0 |

O build caiu porque a imagem do monólito, a mais pesada, deixou de ser
construída. O LOC caiu porque o monólito saiu; a soma dos quatro serviços
(Catálogo 825, Clientes 1.767, Checkout 2.094, Comunicação 318) é menor que a do
estado anterior. O cross-domain ficou empatado em 71 chamadas, com 4 arestas a
menos no total.

A memória quase dobrou pela entrada dos três bancos. A escrita caiu 2,4 % e o
webhook, 15,5 %: o caminho de confirmação passou a pagar as validações em rede e
a sincronização da cópia de leitura do Catálogo, que o estado anterior não tinha.

## Previsto x realizado

- **Build (previsto: cai):** confirmado, −34,5 %.
- **Componentes (previsto: 9):** confirmado.
- **LOC (previsto: cai):** confirmado, −4,9 %.
- **Cross-domain (previsto: cai):** **não se confirmou** (0).
- **RAM (previsto: quase dobra):** confirmado, +88,2 %.
- **Webhook (previsto: estável):** caiu 15,5 %, compatível com as duas chamadas
  HTTP a mais no caminho.

## Aprendizado sobre decomposição

(escrever em suas palavras: o que a rota de webhook mostra que `POST /api/orders`
não mostra, por que o estoque precisou migrar para o Checkout e o que a cópia de
leitura no Catálogo representa como custo.)
