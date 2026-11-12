# Registro de Extração — ecommerce / Transações / snapshot-2

## O que foi feito

O contexto de **Catálogo** saiu do monólito para `services/ecommerce/catalogo/`:
`product` e `search`. O `storages` ficou duplicado — o monólito ainda precisa
dele para a foto de perfil, e o Catálogo para a imagem do produto.

O gateway passou a desviar `/api/products` e `/uploads/` para o Catálogo. O
Checkout e o monólito não mudaram de fronteira.

## Decisões de fronteira

**1. Leitura local no Checkout.** O carrinho e o pedido continuam lendo a coleção
`products` no banco compartilhado. Não há chamada de rede no caminho de escrita.

**2. Estoque escrito pelo Checkout.** A baixa continua na sessão Mongo do pedido,
escrevendo a coleção que o Catálogo serve. É o ponto em que a escrita
transacional atravessa a fronteira do serviço sem perder a atomicidade, porque a
base ainda é a mesma.

**3. `storages` duplicado.** O Catálogo serve as imagens de produto; o monólito
mantém a biblioteca para a foto de perfil da Identidade.

## Impacto observado nas métricas

Média de três execuções.

| Dimensão | Métrica | s1 | s2 | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 120.345 ms | 129.214 ms | +7,4 % |
| Agilidade | Inicialização | 8.578 ms | 8.659 ms | +0,9 % |
| Custo | Componentes / contêineres | 5 / 5 | 6 / 6 | +1 |
| Custo | Imagens da aplicação | 212,7 MB | 276,0 MB | +29,8 % |
| Custo | RAM (repouso / carga) | 358,7 / 537,5 MB | 406,3 / 537,7 MB | +13,3 % / +0,0 % |
| Custo | CPU (repouso / carga) | 0,97 / 151,70 % | 0,93 / 156,46 % | −0,04 p.p. / +3,1 % |
| Desempenho | `GET /api/products` | 2.702,1 req/s · p50 7,0 ms | 2.855,0 req/s · p50 6,7 ms | +5,7 % |
| Desempenho | `GET /api/products/:id` | 2.854,1 req/s · p50 7,0 ms | 2.899,4 req/s · p50 7,0 ms | +1,6 % |
| Desempenho | `POST /api/orders` | 517,7 req/s · p50 38,0 ms | 520,1 req/s · p50 37,7 ms | +0,5 % |
| Desempenho | `POST /api/webhook` (1 conexão) | 75,6 req/s · p50 13,3 ms | 91,2 req/s · p50 10,0 ms | +20,6 % |
| Manutenibilidade | Linhas de Código | 4.938 | 5.263 | +325 (+6,6 %) |
| Manutenibilidade | Chamadas entre fronteiras | 72 de 196 | 71 de 197 | −1 |

A leitura subiu 5,7 % e 1,6 % com o processo dedicado e o cache Redis; o
acoplamento ficou praticamente empatado, porque o Catálogo recria as arestas
internas que o monólito perde. O LOC subiu 325 linhas pela duplicação de
`storages` e do código transversal do serviço.

## Previsto x realizado

- **Build (previsto: sobe):** confirmado, +7,4 %.
- **Componentes (previsto: +1):** confirmado.
- **LOC (previsto: sobe):** confirmado, +6,6 %.
- **Cross-domain (previsto: cai):** **não se confirmou** (−1 apenas).
- **Leitura (previsto: estável):** subiu 5,7 % e 1,6 %, acima do previsto.

## Aprendizado sobre decomposição

(escrever em suas palavras: por que o cross-domain não caiu, o que significa
manter a escrita do estoque no Checkout depois de o Catálogo sair e o que a
leitura ganhou com o processo dedicado.)
