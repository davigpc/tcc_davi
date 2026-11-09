# Registro de Extração — ecommerce / Capacidade de Negócio / snapshot-2

> Escrito depois da coleta, a partir do pré-registro em
> `ecommerce__capacidade-negocio__s2.plan.md`.

## O que foi feito

A capacidade de Clientes saiu do monólito para `services/ecommerce/clientes/`:
`auth`, `token`, `user`, `address` e `storages` (a foto de perfil era o último uso
do armazenamento local no monólito). O monólito ficou com Vendas
(`cart`, `shipping`, `order`, `inventory`, `stripe`) e Comunicação (`email`).

O gateway na porta 3001 passou a desviar `/api/auth`, `/api/users`,
`/api/profile` e `/api/address` para o novo serviço. Catálogo e monólito
continuam com as rotas do s1.

## Decisões de fronteira

**1. Verificação de token no monólito, sem chamada de rede.** `verifyAccessToken`
só valida a assinatura do JWT com `ACCESS_SECRET`, sem consultar banco. O
monólito ganhou um `AccessTokenGuard` com `JwtService`, no lugar do guarda que
injetava o `TokenService`. `POST /api/orders` continua sem salto de rede. O
acoplamento que permanece é de configuração: os dois processos compartilham o
segredo. A alternativa, chamar o Clientes a cada pedido, colocaria uma chamada
remota na rota de escrita medida.

**2. `stripe_cus_id` calculado no Clientes.** `UserService.createUser` criava o
customer no `StripePaymentService` local. Como a regra é determinística
(`cus_local_<sha1(email)[0..16]>`, sem estado), o Clientes repete o cálculo em um
`CustomerIdService`. Criar o customer é chamada ao provedor externo de pagamento,
que é externo aos dois serviços; o stub local apenas repete o algoritmo. Evita-se
que a identidade dependa de Vendas para registrar usuário.

**3. Atualização de assinatura por HTTP interno.** O webhook do monólito grava
`monthly_subscription_status` por `PATCH /api/internal/users/subscription`, direto
pela rede dos contêineres. A rota não passa pelo gateway e não entra na carga
medida.

**4. Leitura de `User` em Vendas.** `cart` e `order` validam o comprador com
`this.model('User').exists({ _id })` e usam `ref: 'User'`. O monólito registra um
`shared/schemas/user-reference.schema.ts` (só `_id`, `strict: false`), como já
fazia com o produto desde o s1. É acoplamento de dados sobre a coleção
compartilhada.

**5. Remoção de importações circulares.** O `UserModule` importava o `AuthModule`
com `forwardRef` sem usar nada dele. A importação saiu, o que também apaga uma
aresta do grafo.

## Procedimento

1. Scaffold do serviço copiado do Catálogo (mesma versão do Nest, Mongo, build
   em três estágios) e cópia dos módulos com o mínimo de `shared`.
2. Ajuste do `UserService` para usar o `CustomerIdService` e criação do
   controller interno de assinatura.
3. Criação do `AccessTokenModule` no monólito, com `JwtService`, e troca do guarda
   nos controllers de pedido e de cobrança.
4. Referência de leitura de `User` em `CartModule` e `OrderModule`.
5. `ClientesClient` no monólito para a rota interna de assinatura.
6. Remoção dos módulos extraídos do `main.module.ts`, dos caminhos do `tsconfig`
   e dos utilitários que só eles usavam.
7. Compose `ecommerce-capacidade-negocio-s2.yml` e gateway
   `nginx-capacidade-s2.conf`.
8. Validação funcional pelo gateway e coleta de três repetições.

## Evidência automática

- Build do monólito e do serviço: `npm run build` limpo nos dois projetos.
- Loc e cross-domain: ver `metricas/ecommerce/capacidade-negocio/snapshot-2/`.
- Roteamento: `infra/gateway/nginx-capacidade-s2.conf`.

## Validação funcional

Tudo pelo gateway (`http://localhost:3001`), com o seed padrão:

- `POST /api/auth/register` e `POST /api/auth/login` no Clientes, com emissão do
  par de tokens e gravação do refresh token na coleção compartilhada.
- `GET /api/users` respondendo com o usuário do seed.
- `POST /api/address` criando endereço na coleção `addresses`.
- `PUT /api/profile/:id/profile-picture` gravando o arquivo no volume
  compartilhado; a URL devolvida responde 200 em `/uploads/` pelo Catálogo.
- `POST /api/orders` criando pedido com `stripe_cus_id` extraído do payload do
  JWT pelo guarda local.
- Webhook `payment_intent.succeeded`: pedido passa a `paid`, estoque do produto
  cai no Catálogo e o e-mail de confirmação é registrado no transporte local.
- Webhook `customer.subscription.updated`: o monólito chama a rota interna do
  Clientes e `monthly_subscription_status` fica `active` no usuário.

**Observação de paridade:** `GET /api/auth/refresh` responde 401 sem cookie
quando o cliente usa HTTP puro. O cookie de refresh é gravado com `secure: true`
porque `NODE_ENV=production`, comportamento herdado do baseline e não alterado
nesta extração.

**Observação sobre `address`:** `GET /api/address/:userId` filtra por um campo
`user` que o `CreateAddressDto` não preenche. É um defeito do código original,
mantido sem correção para preservar o comportamento do baseline.

## Impacto observado nas métricas

Média de três execuções. O `snapshot-0` é o baseline de 07/11, reaproveitado
conforme a decisão 0003.

| Dimensão | Métrica | snapshot-1 | snapshot-2 | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 115.512 ms | 121.707 ms | +5,4 % |
| Agilidade | Inicialização | 8.546 ms | 8.634 ms | +1,0 % |
| Custo | Componentes / contêineres | 5 / 5 | 6 / 6 | +1 |
| Custo | Imagens da aplicação | 212,2 MB | 301,3 MB | +42,0 % |
| Custo | RAM (repouso / carga) | 341,4 / 474,1 MB | 407,3 / 541,0 MB | +19,3 % / +14,1 % |
| Custo | CPU (repouso / carga) | 0,62 / 177,19 % | 0,61 / 157,72 % | −0,01 p.p. / −11,0 % |
| Desempenho | `GET /api/products` | 2.996,6 req/s · p50 6,7 ms | 3.004,2 req/s · p50 6,3 ms | +0,3 % |
| Desempenho | `GET /api/products/:id` | 3.208,4 req/s · p50 6,0 ms | 3.204,3 req/s · p50 6,0 ms | −0,1 % |
| Desempenho | `POST /api/orders` | 452,1 req/s · p50 41,3 ms | 497,3 req/s · p50 38,3 ms | +10,0 % |
| Manutenibilidade | Linhas de código | 5.169 | 5.464 | +295 (+5,7 %) |
| Manutenibilidade | Chamadas entre fronteiras | 80 de 210 | 74 de 211 | −6 |

O monólito caiu de 4.404 para 2.945 linhas (−33,1 %) e de 3.874 para 2.463 em
`modules`. O serviço de Clientes tem 1.754 linhas — 1.522 em `modules`, 92 em
`shared`, 50 em `common` e 90 de casca. O total sobe porque a casca e o código
transversal são duplicados, mas a parte que continua no monólito perde um terço.

O cross-domain caiu de 80 para 74. O grafo do monólito perdeu 25 arestas (as de
`auth`, `token` e `user` e a importação de `user` em `stripe`) e o novo serviço
reintroduz 19 internamente (`user→address 6`, `auth→token 3`, `auth→user 2`,
`user→storages 2`, além de 6 arestas para `shared`). O saldo é −6, o primeiro
resultado em que a extração reduz a contagem estática. O total de arestas sobe de
210 para 211 porque o modelo de leitura de `User` entra no grafo do monólito.

O ganho de desempenho na escrita apareceu sem que a rota atravessasse o novo
serviço. `POST /api/orders` subiu 10,0 % e a latência p50 caiu 3 ms, o que não
era previsto. A explicação mais provável é o tamanho do processo: o monólito
carrega 1.459 linhas a menos e responde com o mesmo banco e o mesmo Redis, sem
concorrência dos módulos de identidade. Não há medição isolada dessa causa, então
o resultado deve ser lido como uma faixa de variação, não como efeito direto da
fronteira.

## Previsto x realizado

- **Agilidade (previsto: build e startup sobem):** confirmado. O build subiu
  5,4 %, a primeira alta da trilha, porque agora são três imagens de aplicação; a
  imagem de Clientes carrega o `argon2` e é a maior das três (89,1 MB). O startup
  subiu apenas 1,0 %, porque os processos sobem em paralelo.
- **Custo (previsto: 5 → 6 componentes; CPU e RAM sobem):** confirmado nos
  componentes e na RAM (+19,3 % em repouso, +14,1 % sob carga). A CPU **sob carga
  caiu** 11,0 %, ao contrário do previsto: o serviço de Clientes não recebe
  nenhuma requisição da carga medida e fica em 0 %, enquanto o Catálogo e o NGINX
  absorvem as rotas de leitura. O processo a mais custa memória, não processamento
  durante o teste.
- **Desempenho (previsto: estável):** confirmado nas leituras (variação abaixo de
  0,5 %) e superado na escrita (+10,0 %). Nenhuma rota medida atravessa o
  Clientes.
- **Manutenibilidade (previsto: LOC do monólito cai, cross-domain cai):**
  confirmado nos dois. O corte de 25 arestas é o maior da trilha e vem das
  arestas de entrada, justamente o bloco que o s1 não alcançou.

## ✍️ Aprendizado sobre decomposição

(escrever em suas palavras: por que a capacidade de Clientes derrubou o
cross-domain quando o Catálogo não derrubou; o que significa manter o guarda de
token local e o cálculo do `stripe_cus_id` duplicado; o custo de manter um modelo
de leitura de `User` em Vendas.)

## ✍️ Leitura crítica da comparação

(ressalva metodológica: a carga medida não exercita as rotas extraídas, então as
métricas de desempenho do s2 medem apenas o custo indireto da extração; a alta de
10 % em `POST /api/orders` não deve ser atribuída à fronteira sem nova medição;
o s2 ainda compartilha banco e volume de arquivos.)
