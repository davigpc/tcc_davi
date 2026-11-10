# Diário de Execução — ecommerce / Subdomínio (DDD)

> Um arquivo por trilha. Consolida hipótese, decisões, snapshots e observações.
> É o rascunho direto da seção correspondente do capítulo 05.

## Identificação

- App: `ecommerce` (varejo transacional / MongoDB)
- Metodologia: Subdomínio (DDD)
- Branch: `exp/ecommerce/subdominio` (repositório pai e fork)
- Baseline: fork `6487e40` (tag `snapshot-0`), canônico reaproveitado (ADR-0003)
- Medição: 10/11/2026

## Hipótese de decomposição

Classificação por valor estratégico, em `docs/metodologia/subdominio-ecommerce.md`:

| Classe | Contextos | Módulos |
|---|---|---|
| Genérico | Identidade | `auth`, `token`, `user`, `address` |
| Genérico | Comunicação | `email` |
| Genérico | Armazenamento (biblioteca) | `storages` |
| Suporte | Catálogo | `product`, `search` |
| Núcleo | Vendas | `cart`, `shipping`, `order`, `inventory`, `stripe` |

A ordem é inversa à do valor: saem primeiro os genéricos, depois o suporte e o
núcleo por último. É a mesma ordem da trilha de Subdomínio do `inventory-api` e o
oposto da trilha de Capacidade no e-commerce, que começou pelo Catálogo.

## Snapshots

### snapshot-0 (baseline monolítico)

- Reaproveitado da trilha de Capacidade (mesmo app, mesmo harness).
- Build 117.342 ms; inicialização 8.032 ms; LOC 4.820; cross-domain 79/207;
  componentes 3; CPU 0,92 / 119,87 %; RAM 279,2 / 457,3 MB.
- `products` 3.071,5 req/s; `product-by-id` 3.223,3; `orders` 445,3.

### snapshot-1 (genéricos — Identidade + Comunicação)

- Pasta: `metricas/ecommerce/subdominio/snapshot-1/`
- Serviços: `identidade` (auth, token, user, address + biblioteca de storage) e
  `comunicacao` (email); compose `ecommerce-subdominio-s1.yml`.
- Persistência compartilhada; token validado localmente no monólito.
- Resultados: build 123.877 ms (+5,6 %); inicialização 8.976 (+11,8 %); LOC 5.346
  (+10,9 %); cross-domain 69/209 (−10); componentes 6; RAM 376,4 / 517,4 MB; CPU
  1,05 / 153,10 %; `products` 2.694,1 (−12,3 %); `product-by-id` 2.895,1
  (−10,2 %); `orders` 487,0 (+9,4 %).
- Observações: o cross-domain cai só 10 porque o monólito ainda carrega o
  Catálogo; a Identidade recria 19 arestas internas. A leitura caiu ~10 %, sem
  causa isolada; a CPU sob carga subiu 27,7 % com três processos a mais.

### snapshot-2 (suporte — Catálogo)

- Pasta: `metricas/ecommerce/subdominio/snapshot-2/`
- Serviço: `catalogo` (product, search, storages); compose
  `ecommerce-subdominio-s2.yml`. Monólito fica só com o núcleo.
- O carrinho mantém a leitura de preço no banco compartilhado
  (`product-reference`); a baixa de estoque vira HTTP.
- Resultados: build 126.788 ms (+2,3 %); inicialização 9.292 (+3,5 %); LOC 5.614
  (+5,0 %); cross-domain 69/210 (0); componentes 7; RAM 436,9 / 573,2 MB; CPU
  1,15 / 155,91 %; `products` 2.857,5 (+6,1 %); `product-by-id` 3.013,5 (+4,1 %);
  `orders` 485,7 (−0,2 %).
- Observações: o cross-domain **empatou** — o Catálogo recria as 9 arestas que o
  monólito perde. A leitura subiu 6,1 % e 4,1 % com o processo dedicado e o cache.

### snapshot final (núcleo — Vendas, banco isolado)

- Pasta: `metricas/ecommerce/subdominio/snapshot-final/`
- Serviço: `vendas` (cart, shipping, order, inventory, stripe, item); monólito
  desativado; um MongoDB por serviço; compose `ecommerce-subdominio-final.yml`.
- Vendas valida comprador na Identidade e item no Catálogo por HTTP, baixa estoque
  no Catálogo e envia e-mail pela Comunicação; o carrinho compõe a resposta em vez
  de usar `populate`.
- Resultados: build 73.856 ms (−41,7 %); inicialização 9.420 (+1,4 %); LOC 5.328
  (−5,1 %); cross-domain 76/206 (+7); componentes 9; imagens 388,8 MB (−2,4 %);
  RAM 773,8 / 904,8 MB; CPU 1,17 / 155,66 %; `products` 2.857,7 (0,0 %);
  `product-by-id` 3.061,3 (+1,6 %); `orders` 499,5 (+2,8 %).
- Observações: o build caiu porque a imagem do monólito deixou de ser construída;
  as imagens da aplicação também caíram, porque Vendas é menor que o monólito. O
  estado final coincide com o da trilha de Capacidade (76 de 206).

## Desvios e dificuldades

- **`storages` como biblioteca.** O DDD o classifica como genérico, mas ele não tem
  rota nem regra. Extrair um serviço de arquivos criaria uma dependência
  compartilhada entre Identidade e Catálogo; a solução foi duplicar a biblioteca,
  como o DDD recomenda para subdomínio genérico.
- **`stripe` no núcleo.** A classificação genérica foi considerada e descartada: o
  pagamento é criado dentro do checkout e o webhook move o pedido e o estoque.
  Separar criaria uma transação distribuída que o sistema não tem.
- **Harness desatualizado no início.** A branch partiu do `snapshot-0`, cujo
  harness não lia `crossDomain` por serviço nem usava mediana no `docker stats`.
  Os dois ajustes foram trazidos da trilha de Capacidade e os snapshots foram
  remedidos. O primeiro conjunto de números (cross-domain 42/239, 45/244) foi
  descartado.
- **Snapshots cumulativos.** Remedir um snapshot exige a árvore daquele commit; a
  árvore atual já está no estado do s2/final. O s1 foi remedido em uma worktree
  separada, no commit da extração.
- **Conflito de porta entre stacks.** Uma stack deixada no ar segurava a 3001 e
  fazia o seed falhar com timeout. Antes de cada coleta é preciso derrubar as
  outras stacks do experimento.
- **Falha transitória de conexão.** Uma coleta do final abortou com `ECONNRESET`
  no passo de descoberta de ids; a repetição passou sem erro.

## Síntese para o capítulo 05

O Subdomínio chegou ao mesmo estado final da Capacidade de Negócio: quatro
serviços com as mesmas fronteiras (Catálogo, Identidade, Vendas e Comunicação) e
cross-domain de 76 de 206. O que muda é o caminho: os genéricos saem primeiro, o
que derruba 10 arestas no s1 e move a maior parte do custo de infraestrutura para
a primeira extração. O pico de RAM intermediário (436,9 MB no s2) fica abaixo do
pico da Capacidade no mesmo ponto (407,3 MB no s2 dela) — não diretamente
comparável, porque as fases agrupam serviços diferentes.

Em domínio com um único fluxo de negócio, a classificação por valor e a
classificação por processo convergem. A diferença aparece no custo de cada fase,
não na arquitetura final.
- **Ponteiro do submódulo no commit do s1.** O commit 6ee3690 registrou o
  submódulo no baseline (6487e40). O código do s1 está no fork em 8b99fad
  (branch sdd-s1), que é o estado realmente medido.
