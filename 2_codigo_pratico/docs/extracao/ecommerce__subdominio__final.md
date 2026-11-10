# Registro de Extração — ecommerce / Subdomínio (DDD) / snapshot final

## O que foi feito

O contexto de **núcleo** (Vendas) saiu do monólito para
`services/ecommerce/vendas/`: `cart`, `shipping`, `order`, `inventory`, `stripe` e
o modelo `item`. O monólito foi desativado.

Cada serviço passou a ter o próprio MongoDB (`catalogo_db`, `identidade_db` e
`vendas_db` com réplica `rs0`); a Comunicação não tem banco. O Redis ficou apenas
com o Catálogo. São nove contêineres: quatro serviços, três bancos, Redis e NGINX.

## Decisões de fronteira

**1. Validação em rede no caminho de escrita.** O carrinho e o pedido não podem
mais validar comprador nem item na própria coleção. Vendas chama a Identidade e o
Catálogo por HTTP antes de gravar.

**2. Composição no lugar do `populate`.** A resposta do carrinho e do pedido é
montada em Vendas com os produtos vindos do Catálogo em lote. É um `join`
distribuído explícito, que o `madge` não mede.

**3. E-mail por HTTP.** O pedido chama a Comunicação em
`/api/internal/emails/order-confirmation`.

**4. Estoque continua por HTTP.** A baixa saiu da transação do pedido ainda no
s2; no final o Catálogo tem banco próprio.

**5. Guarda de token local.** `AccessTokenGuard` com `JwtService`, como no s1.

## Validação funcional

- Registro e login na Identidade; `GET /api/users` respondendo.
- `POST /api/cart/:userId` calculando o subtotal pelo preço do Catálogo;
  `GET /api/cart/:id` devolvendo o item composto com nome e preço.
- `POST /api/orders` validando comprador e item em rede.
- Webhook `payment_intent.succeeded`: pedido `paid`, estoque 50 → 49 no Catálogo e
  e-mail registrado na Comunicação.
- Webhook de assinatura gravando no banco da Identidade.
- Foto de perfil gravada pela Identidade e servida em `/uploads/` pelo Catálogo.

## Impacto observado nas métricas

Média de três execuções.

| Dimensão | Métrica | snapshot-2 | final | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 126.788 ms | 73.856 ms | −41,7 % |
| Agilidade | Inicialização | 9.292 ms | 9.420 ms | +1,4 % |
| Custo | Componentes / contêineres | 7 / 7 | 9 / 9 | +2 |
| Custo | Imagens da aplicação | 398,5 MB | 388,8 MB | −2,4 % |
| Custo | RAM (repouso / carga) | 436,9 / 573,2 MB | 773,8 / 904,8 MB | +77,1 % / +57,9 % |
| Custo | CPU (repouso / carga) | 1,15 / 155,91 % | 1,17 / 155,66 % | +0,02 p.p. / −0,2 % |
| Desempenho | `GET /api/products` | 2.857,5 req/s · p50 6,7 ms | 2.857,7 req/s · p50 6,3 ms | 0,0 % |
| Desempenho | `GET /api/products/:id` | 3.013,5 req/s · p50 6,3 ms | 3.061,3 req/s · p50 6,0 ms | +1,6 % |
| Desempenho | `POST /api/orders` | 485,7 req/s · p50 39,0 ms | 499,5 req/s · p50 37,7 ms | +2,8 % |
| Manutenibilidade | Linhas de código | 5.614 | 5.328 | −286 (−5,1 %) |
| Manutenibilidade | Chamadas entre fronteiras | 69 de 210 | 76 de 206 | +7 |

O monólito saiu de 2.764 linhas para zero. A soma final é Catálogo 792,
Identidade 1.767, Vendas 2.451 e Comunicação 318.

O cross-domain subiu 7 arestas. O grafo do monólito perde as arestas de `cart`,
`order`, `inventory` e `stripe` (50) e o serviço de Vendas as recria internamente
(48), junto com as mudanças de `shared`. O total de arestas caiu de 210 para 206
com a saída do monólito. O resultado final é **idêntico ao da trilha de
Capacidade** (76 de 206), porque o código dos serviços é o mesmo — a diferença
entre as metodologias está no caminho, não no estado final.

**Resultado inesperado:** o build caiu 41,7 %, porque a imagem do monólito (a mais
pesada) deixou de ser construída e as quatro imagens menores são construídas em
paralelo. As imagens da aplicação também caíram 2,4 %: a de Vendas (88,9 MB) é
menor que a do monólito que substituiu. A RAM quase dobrou pelos três bancos. A
escrita ficou estável (+2,8 %), apesar das duas validações HTTP — mesmo padrão do
final da trilha de Capacidade, sem causa isolada.

## Previsto x realizado

- **Agilidade (previsto: build cai, startup sobe):** confirmado nos dois, com
  queda de build bem maior que o previsto (−41,7 %) e startup quase estável
  (+1,4 %).
- **Custo (previsto: 7 → 9 contêineres, RAM quase dobra):** confirmado. As imagens
  caíram 2,4 %, ao contrário da hipótese.
- **Desempenho (previsto: leitura estável, escrita cai):** a leitura ficou
  estável (0,0 % e +1,6 %) e a escrita **subiu** 2,8 %, contra o previsto. Mesmo
  desfecho da trilha de Capacidade.
- **Manutenibilidade (previsto: LOC cai, cross-domain cai):** o LOC caiu 5,1 %
  (confirmado); o cross-domain subiu 7 (não confirmado), pela recriação das
  arestas dentro de Vendas.

## ✍️ Aprendizado sobre decomposição

(escrever em suas palavras: por que o estado final coincide com o da trilha de
Capacidade, o que isso diz sobre o tamanho do domínio, e o que a ordem de extração
mudou no custo intermediário.)

## ✍️ Leitura crítica da comparação

(ressalva metodológica: o snapshot final muda três coisas ao mesmo tempo —
extração do núcleo, isolamento dos bancos e desativação do monólito; a variação
medida não separa esses efeitos. O build menor não indica melhor arquitetura: é
consequência de uma imagem pesada deixar de existir. A escrita estável não deve
ser lida como ausência de custo de rede sem nova medição.)
