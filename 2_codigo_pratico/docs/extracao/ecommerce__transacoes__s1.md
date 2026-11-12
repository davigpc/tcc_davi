# Registro de Extração — ecommerce / Transações / snapshot-1

## O que foi feito

O grupo **Checkout** saiu do monólito para `services/ecommerce/checkout/`:
`cart`, `shipping`, `order`, `inventory`, `stripe` e o modelo `item`. O monólito
ficou com catálogo, identidade e comunicação.

O gateway passou a desviar `/api/cart`, `/api/orders`, `/api/stripe`,
`/api/subscriptions` e `/api/webhook` para o Checkout; o restante continua no
monólito, que responde em 3002.

## Decisões de fronteira

**1. A transação fica inteira no Checkout.** O MongoDB continua sendo o do
monólito e o `processOrder` abre a sessão, atualiza o status e baixa o estoque na
`products` compartilhada. É a diferença central em relação às primeiras extrações
das outras trilhas, que perderam a atomicidade já no s1.

**2. Leitura local.** Carrinho e pedido usam modelos de referência
(`products`, `users`, `strict: false`) e não fazem chamada de rede no caminho de
escrita. O `populate('items.id')` continua funcionando porque a coleção é a
mesma.

**3. E-mail por HTTP.** O monólito ganhou `POST /api/internal/emails/order-confirmation`,
chamado depois do commit.

**4. Assinatura por HTTP.** O webhook de assinatura grava em
`PATCH /api/internal/users/subscription`, também no monólito.

**5. Token local.** O Checkout valida a assinatura com `ACCESS_SECRET`, sem
consultar a Identidade.

## Validação funcional

- Login e `GET /api/users` respondendo pelo monólito.
- `POST /api/cart/:userId` calculando subtotal com o preço local.
- `POST /api/orders` devolvendo `client_secret`.
- Webhook `payment_intent.succeeded`: pedido `paid`, estoque 50 → 49 na mesma
  transação, e-mail registrado no monólito.
- Evento repetido recusado com 400 (comportamento do baseline preservado).

## Impacto observado nas métricas

Média de três execuções.

| Dimensão | Métrica | S0 (canônico) | s1 | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 117.342 ms | 120.345 ms | +2,6 % |
| Agilidade | Inicialização | 8.032 ms | 8.578 ms | +6,8 % |
| Custo | Componentes / contêineres | 3 / 3 | 5 / 5 | +2 |
| Custo | Imagens da aplicação | 98,7 MB | 187,6 MB | +90,1 % |
| Custo | RAM (repouso / carga) | 279,2 / 457,3 MB | 358,7 / 537,5 MB | +28,5 % / +17,5 % |
| Custo | CPU (repouso / carga) | 0,92 / 119,87 % | 0,97 / 151,70 % | +0,05 p.p. / +31,8 % |
| Desempenho | `GET /api/products` | 3.071,5 req/s · p50 6,0 ms | 2.702,1 req/s · p50 7,0 ms | −12,0 % |
| Desempenho | `GET /api/products/:id` | 3.223,3 req/s · p50 5,0 ms | 2.854,1 req/s · p50 7,0 ms | −11,5 % |
| Desempenho | `POST /api/orders` | 445,3 req/s · p50 42,7 ms | 517,7 req/s · p50 38,0 ms | +16,3 % |
| Desempenho | `POST /api/webhook` (1 conexão) | a medir | 75,6 req/s · p50 13,3 ms | — |
| Manutenibilidade | Linhas de Código | 4.820 | 4.938 | +118 (+2,4 %) |
| Manutenibilidade | Chamadas entre fronteiras | 79 de 207 | 72 de 196 | −7 |

O LOC subiu pouco porque o Checkout reaproveita os módulos do baseline e o
monólito perdeu as mesmas linhas: a soma é quase neutra. O cross-domain caiu 7
arestas; o total caiu 11 com a saída dos módulos do monólito. As arestas que o
Checkout recria internamente não contam como cruzamento de fronteira.

A leitura caiu cerca de 12 %, com p50 1 ms maior, compatível com o salto
adicional pelo NGINX e com um processo de catálogo agora dividindo a máquina com
o Checkout. A escrita subiu 16,3 %, apesar de o Checkout validar comprador e item
por consulta local; o valor não deve ser atribuído à fronteira sem nova medição —
é o mesmo tipo de variação observada nas outras trilhas.

A memória em repouso subiu 28,5 % (dois processos de aplicação) e a CPU sob carga
31,8 %. O build variou +2,6 %, dentro do ruído estimado pelo estado final
compartilhado das outras trilhas.

## Previsto x realizado

- **Build (previsto: sobe):** confirmado, mas bem menos que o esperado (+2,6 %),
  porque a imagem do monólito diminuiu ao perder os módulos.
- **Componentes (previsto: 3 → 5):** confirmado.
- **LOC (previsto: sobe):** confirmado, +2,4 %.
- **Cross-domain (previsto: cai):** confirmado, −7.
- **Escrita (previsto: estável):** **não se confirmou** (+16,3 %; sem causa
  isolada).
- **Leitura (previsto: estável ou queda leve):** a queda foi de ~12 %, acima do
  previsto.

## Rota de webhook

As rotas medidas nas trilhas anteriores não executam a transação: `POST /api/orders`
só grava o pedido. O harness ganhou `POST /api/webhook` com evento local único
por requisição e **uma conexão**, porque requisições concorrentes sobre o mesmo
pedido disputam a mesma transação Mongo e falham com conflito de escrita. O
resultado mede o caminho transacional serializado, não a contenção do agregado.

## Aprendizado sobre decomposição

(escrever em suas palavras: o que muda ao extrair o grupo atômico primeiro, por
que a escrita não perdeu a consistência nesta fase e o que a rota de webhook
mostra que `POST /api/orders` não mostra.)
