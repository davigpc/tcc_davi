# Registro de Extração — ecommerce / Subdomínio (DDD) / snapshot-2

## O que foi feito

O contexto de **suporte** (Catálogo) saiu do monólito para
`services/ecommerce/catalogo/`: `product`, `search` e `storages`. O monólito
ficou apenas com o núcleo — `cart`, `shipping`, `order`, `inventory` e `stripe`.

O gateway passou a desviar `/api/products` e `/uploads/` para o Catálogo. A
Identidade e a Comunicação continuam como no s1.

## Decisões de fronteira

**1. Leitura de `Product` no monólito.** Com o módulo `product` fora, o carrinho
e o pedido não têm mais o modelo local. Como o banco segue compartilhado, entrou
o `item/schemas/product-reference.schema.ts` (só `_id`, `strict: false`),
registrado por `CartModule` e `OrderModule`. O carrinho continua lendo o preço e
somando o subtotal no `pre-save`, sem chamada de rede — o acoplamento é de dados,
não de processo.

**2. Estoque por HTTP.** O `InventoryService` deixou de chamar o `ProductService`
e passou a chamar `PATCH /api/internal/products/:id/stock` no Catálogo. A baixa
sai da transação do pedido: o status é commitado e o estoque é atualizado depois,
sem atomicidade. A paridade funcional é preservada.

**3. Imagens servidas pelo Catálogo.** O monólito deixou de montar `/uploads/`;
quem serve o diretório agora é o Catálogo, dono do `storages`. O volume continua
compartilhado, porque a foto de perfil é gravada pela Identidade.

## Impacto observado nas métricas

Média de três execuções.

| Dimensão | Métrica | snapshot-1 | snapshot-2 | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 120.433 ms | 129.123 ms | +7,2 % |
| Agilidade | Inicialização | 8.673 ms | 9.058 ms | +4,4 % |
| Custo | Componentes / contêineres | 6 / 6 | 7 / 7 | +1 |
| Custo | Imagens da aplicação | 310,1 MB | 398,5 MB | +28,5 % |
| Custo | RAM (repouso / carga) | 397,8 / 541,1 MB | 440,9 / 577,0 MB | +10,8 % / +6,6 % |
| Custo | CPU (repouso / carga) | 0,86 / 157,05 % | 1,01 / 155,50 % | +0,15 p.p. / −1,0 % |
| Desempenho | `GET /api/products` | 2.777,8 req/s · p50 7,0 ms | 2.849,7 req/s · p50 6,7 ms | +2,6 % |
| Desempenho | `GET /api/products/:id` | 2.909,1 req/s · p50 6,7 ms | 3.027,8 req/s · p50 6,0 ms | +4,1 % |
| Desempenho | `POST /api/orders` | 493,6 req/s · p50 38,3 ms | 489,8 req/s · p50 39,0 ms | −0,8 % |
| Manutenibilidade | Linhas de código | 5.346 | 5.614 | +268 (+5,0 %) |
| Manutenibilidade | Chamadas entre fronteiras | 42 de 239 | 45 de 244 | +3 |

O monólito caiu de 2.765 para 2.278 linhas em `modules` (de 3.261 para 2.764 no
total); o Catálogo soma 765 linhas (594 em `modules`, 82 em `shared`).

O cross-domain subiu 3 arestas: o Catálogo recria internamente as arestas de
`product` (9) e o monólito ganha as importações de `@item` para o modelo de
leitura. É o mesmo padrão observado no s1 da trilha de Capacidade.

A leitura melhorou 2,6 % e 4,1 % — ao contrário do que aconteceu no s1 —, com
p50 1 ms menor. Não há causa isolada; a leitura passou a ser atendida por um
processo dedicado, com cache Redis próprio, mas o ganho está dentro da faixa de
variação observada entre execuções. A escrita ficou estável.

## Previsto x realizado

- **Agilidade (previsto: build sobe):** confirmado, +7,2 % com a terceira imagem
  de aplicação.
- **Custo (previsto: +1 serviço):** confirmado, 6 → 7 componentes; RAM em repouso
  +10,8 %.
- **Desempenho (previsto: leitura cai pouco, escrita estável):** a leitura não
  caiu; subiu 2,6 % e 4,1 %. A escrita ficou estável (−0,8 %), como previsto.
- **Manutenibilidade (previsto: LOC sobe, cross-domain sobe):** confirmado nos
  dois (+5,0 % e +3 arestas).

## ✍️ Aprendizado sobre decomposição

(escrever em suas palavras: por que o Catálogo não derrubou o cross-domain nesta
trilha, o que muda ao manter a leitura de preço no banco compartilhado e o custo
de a baixa de estoque deixar a transação.)
