# Registro de Extração — ecommerce / Subdomínio (DDD) / snapshot-1

## O que foi feito

Os dois contextos genéricos saíram do monólito:

- **Identidade** em `services/ecommerce/identidade/`: `auth`, `token`, `user`,
  `address` e uma cópia local do `storages` (biblioteca, não serviço).
- **Comunicação** em `services/ecommerce/comunicacao/`: `email`, com o transporte
  local.

O monólito ficou com o suporte (`product`, `search`, `storages`) e o núcleo
(`cart`, `shipping`, `order`, `inventory`, `stripe`). O gateway passou a desviar
`/api/auth`, `/api/users`, `/api/profile` e `/api/address` para a Identidade e
`/api/emails` para a Comunicação.

## Decisões de fronteira

**1. Guarda de token local.** O `JwtAuthenticationGuard` injetava o
`TokenService`, que saiu com a Identidade. Como a verificação é stateless, o
monólito ganhou um `AccessTokenGuard` com `JwtService` e `ACCESS_SECRET`. O
`POST /api/orders` continua sem chamada de rede para autenticar.

**2. Leitura de `User` no monólito.** `cart`, `order` e `product` referenciam o
usuário. O banco continua compartilhado, então entrou um
`shared/schemas/user-reference.schema.ts` (só `_id`, `strict: false`), registrado
por `CartModule` e `OrderModule`. O `product.schema` trocou `ref: User.name` por
`ref: 'User'`, sem `populate`.

**3. `stripe_cus_id` calculado na Identidade.** O cadastro criava o customer no
`StripePaymentService` local. A Identidade repete o cálculo determinístico
(`cus_local_<sha1(email)>`) em um `CustomerIdService`, para não depender do
faturamento.

**4. E-mail por HTTP.** O `OrderService` deixou de injetar o `EmailService` e
passa a chamar a Comunicação em `/api/internal/emails/order-confirmation`. A
chamada só ocorre no webhook, fora das rotas medidas.

**5. `storages` como biblioteca.** A Identidade tem sua cópia do armazenamento
local e grava a foto de perfil no mesmo volume que o monólito usa para as imagens
de produto. Quem serve `/uploads/` continua sendo o monólito.

## Validação funcional

Tudo pelo gateway (`http://localhost:3001`), com o seed padrão:

- `POST /api/auth/register` e `POST /api/auth/login` na Identidade.
- `GET /api/users` respondendo com o usuário do seed.
- `PUT /api/profile/:id/profile-picture` gravando no volume compartilhado; a URL
  devolvida responde 200 em `/uploads/` pelo monólito.
- `POST /api/orders` criando pedido com o token validado localmente.
- Webhook `payment_intent.succeeded`: pedido `paid`, estoque 50 → 49 (baixa local,
  dentro da transação) e e-mail registrado na Comunicação.
- Webhook `customer.subscription.updated`: a rota interna da Identidade grava
  `monthly_subscription_status`.

## Impacto observado nas métricas

Média de três execuções. O `snapshot-0` é o baseline canônico reaproveitado
(ADR-0003).

| Dimensão | Métrica | snapshot-0 | snapshot-1 | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 117.342 ms | 123.877 ms | +5,6 % |
| Agilidade | Inicialização | 8.032 ms | 8.976 ms | +11,8 % |
| Custo | Componentes / contêineres | 3 / 3 | 6 / 6 | +3 |
| Custo | Imagens da aplicação | 98,7 MB | 310,1 MB | +214,1 % |
| Custo | RAM (repouso / carga) | 279,2 / 457,3 MB | 376,4 / 517,4 MB | +34,8 % / +13,1 % |
| Custo | CPU (repouso / carga) | 0,92 / 119,87 % | 1,05 / 153,10 % | +0,13 p.p. / +27,7 % |
| Desempenho | `GET /api/products` | 3.071,5 req/s · p50 6,0 ms | 2.694,1 req/s · p50 7,3 ms | −12,3 % |
| Desempenho | `GET /api/products/:id` | 3.223,3 req/s · p50 5,0 ms | 2.895,1 req/s · p50 6,7 ms | −10,2 % |
| Desempenho | `POST /api/orders` | 445,3 req/s · p50 42,7 ms | 487,0 req/s · p50 37,7 ms | +9,4 % |
| Manutenibilidade | Linhas de código | 4.820 | 5.346 | +526 (+10,9 %) |
| Manutenibilidade | Chamadas entre fronteiras | 79 de 207 | 69 de 209 | −10 |

O monólito caiu de 4.288 para 2.765 linhas em `modules`; a Identidade soma 1.767
linhas (1.535 em `modules`) e a Comunicação, 318.

O cross-domain caiu 10 arestas: as de `auth`, `token` e `user` saíram do grafo do
monólito (o grafo perde 19 arestas) e a Identidade trouxe 19 internamente. O
`product.schema` mantém uma referência a `User` que não gera import. O total de
arestas ficou praticamente estável (207 → 209).

A queda de leitura (≈10 %) e a CPU sob carga (+27,7 %) não têm causa isolada: o
harness mede a máquina inteira e, neste snapshot, três processos de aplicação
passaram a concorrer com o monólito e o banco. A escrita subiu 9,4 %, como no
snapshot final da trilha de Capacidade, e deve ser lida como faixa de variação.

## Previsto x realizado

- **Agilidade (previsto: build e startup sobem):** confirmado, com folga menor que
  o esperado no build (+2,6 %), porque as duas imagens novas são menores que a do
  monólito que permaneceu.
- **Custo (previsto: 3 → 6 componentes):** confirmado. A RAM em repouso subiu
  42,5 % e a CPU sob carga 31 %.
- **Desempenho (previsto: estável):** **não se confirmou** nas leituras, que
  caíram ≈10 % e 1 ms de p50. A escrita ficou dentro da faixa observada.
- **Manutenibilidade (previsto: LOC do monólito cai, total sobe; cross-domain
  cai):** confirmado nos três.

## ✍️ Aprendizado sobre decomposição

(escrever em suas palavras: por que os genéricos primeiro, o que muda ao manter o
guarda de token local, e por que a leitura caiu mais aqui do que na trilha de
Capacidade no snapshot equivalente.)

## ✍️ Leitura crítica da comparação

(ressalva metodológica: o s1 do Subdomínio extrai dois contextos de uma vez,
enquanto o s1 da Capacidade extrai um; a comparação direta entre os s1 das duas
trilhas não é pareada. Além disso, a carga medida não passa pelos serviços novos,
então a queda de leitura reflete concorrência por CPU e memória, não um salto de
rede.)
