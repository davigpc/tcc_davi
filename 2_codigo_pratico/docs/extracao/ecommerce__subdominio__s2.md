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
| Agilidade | Build (`--no-cache`) | 123.877 ms | 126.788 ms | +2,3 % |
| Agilidade | Inicialização | 8.976 ms | 9.292 ms | +3,5 % |
| Custo | Componentes / contêineres | 6 / 6 | 7 / 7 | +1 |
| Custo | Imagens da aplicação | 310,1 MB | 398,5 MB | +28,5 % |
| Custo | RAM (repouso / carga) | 376,4 / 517,4 MB | 436,9 / 573,2 MB | +16,1 % / +10,8 % |
| Custo | CPU (repouso / carga) | 1,05 / 153,10 % | 1,15 / 155,91 % | +0,10 p.p. / +1,8 % |
| Desempenho | `GET /api/products` | 2.694,1 req/s · p50 7,3 ms | 2.857,5 req/s · p50 6,7 ms | +6,1 % |
| Desempenho | `GET /api/products/:id` | 2.895,1 req/s · p50 6,7 ms | 3.013,5 req/s · p50 6,3 ms | +4,1 % |
| Desempenho | `POST /api/orders` | 487,0 req/s · p50 37,7 ms | 485,7 req/s · p50 39,0 ms | −0,2 % |
| Manutenibilidade | Linhas de código | 5.346 | 5.614 | +268 (+5,0 %) |
| Manutenibilidade | Chamadas entre fronteiras | 69 de 209 | 69 de 210 | 0 |

O monólito caiu de 2.765 para 2.278 linhas em `modules` (de 3.261 para 2.764 no
total); o Catálogo soma 765 linhas (594 em `modules`, 82 em `shared`).

O cross-domain ficou empatado em 69. O Catálogo recria internamente as 9 arestas
que o monólito perde com a saída de `product` e `search`, e o monólito ganha as
importações de `@item` para o modelo de leitura. O total de arestas ficou em 210.
É o mesmo padrão do s1 da trilha de Capacidade: extrair não reduz a contagem
estática se o serviço recria a mesma estrutura.

A leitura melhorou 6,1 % e 4,1 %, com p50 0,7 ms e 0,4 ms menor — o processo
dedicado e o cache Redis compensaram o salto pelo gateway. A escrita ficou
estável (−0,2 %).

## Previsto x realizado

- **Agilidade (previsto: build sobe):** confirmado, +2,3 % com a terceira imagem
  de aplicação.
- **Custo (previsto: +1 serviço):** confirmado, 6 → 7 componentes; RAM em repouso
  +16,1 %.
- **Desempenho (previsto: leitura cai pouco, escrita estável):** a leitura não
  caiu; subiu 6,1 % e 4,1 %. A escrita ficou estável (−0,2 %), como previsto.
- **Manutenibilidade (previsto: LOC sobe, cross-domain sobe):** o LOC subiu 5,0 %
  (confirmado); o cross-domain ficou empatado (previsto alta, realizado 0).

## ✍️ Aprendizado sobre decomposição

(escrever em suas palavras: por que o Catálogo não derrubou o cross-domain nesta
trilha, o que muda ao manter a leitura de preço no banco compartilhado e o custo
de a baixa de estoque deixar a transação.)
