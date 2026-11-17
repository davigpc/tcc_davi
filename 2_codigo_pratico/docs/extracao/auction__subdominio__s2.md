# Registro de Extração — leilão / Subdomínio (DDD) / snapshot-2

## O que foi feito

O **Catálogo de Cartas** (subdomínio de suporte) saiu do monólito para
`services/auction/catalogo/`, respondendo por `/cards` e `/card-types` atrás do
NGINX. O monólito ficou com o núcleo — leilões, lances, tarefas de fechamento e o
worker — e continuou escrevendo nas tabelas de carta, porque o banco ainda é
compartilhado. O serviço de catálogo roda com `DATABASE_SYNC=false`.

## Decisões de fronteira

**1. A fronteira do serviço existe, a do banco não.** O monólito manteve as
entidades `Card`, `CardType` e `CardTransfer` e continua travando a carta na
criação do leilão e transferindo no fechamento, por SQL, na mesma base que o
Catálogo serve. É a situação de migração já observada nos s2 das outras trilhas.

**2. As rotas saíram do monólito.** Controladores e DTOs de `cards` e
`card-types` foram removidos. Sobraram o serviço de tipos de carta — usado para
compor a resposta dos leilões — e as entidades usadas pelas transações do núcleo.

**3. O Catálogo valida o dono pela Identidade.** A criação de carta passou a
consultar `GET /api/internal/users/:id` na Identidade, mesmo com o banco
compartilhado, porque é a forma que o serviço já tinha na trilha de Capacidade.
O custo fica no caminho de escrita de carta, que não é medido.

## Impacto observado nas métricas

Média de três execuções.

| Dimensão | Métrica | s1 | s2 | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 106.665 ms | 120.588 ms | +13,1 % |
| Agilidade | Inicialização | 25.146 ms | 26.537 ms | +5,5 % |
| Custo | Componentes / contêineres | 7 / 7 | 8 / 8 | +1 |
| Custo | Imagens da aplicação | 324,5 MB | 432,7 MB | +33,3 % |
| Custo | RAM (repouso / carga) | 235,2 / 412,9 MB | 284,8 / 462,6 MB | +21,1 % / +12,0 % |
| Custo | CPU (repouso / carga) | 0,19 / 203,79 % | 0,18 / 208,24 % | −0,01 p.p. / +2,2 % |
| Desempenho | `GET /auctions` | 896,8 req/s · p50 21,0 ms | 910,9 req/s · p50 20,7 ms | +1,6 % |
| Desempenho | `GET /auctions/:id` | 725,1 req/s · p50 26,3 ms | 745,6 req/s · p50 26,0 ms | +2,8 % |
| Desempenho | `POST /bids` | 134,0 req/s · p50 7,3 ms | 164,0 req/s · p50 6,0 ms | +22,4 % |
| Manutenibilidade | Linhas de Código | 3.437 | 4.089 | +652 (+19,0 %) |
| Manutenibilidade | Chamadas entre fronteiras | 102 de 197 | 121 de 229 | +19 |

Nenhuma resposta fora da faixa 2xx foi registrada.

As rotas medidas não passam pelo Catálogo nesta fase, então a leitura e a escrita
do núcleo ficaram na faixa do s1 — a variação de +22 % na escrita está dentro da
dispersão registrada no s1 (92,5 a 161,0 req/s) e não deve ser lida como ganho. O
build cresceu 13 % pela quarta imagem de aplicação e as Linhas de Código, 19 %,
porque o serviço de catálogo duplica entidades, guarda de token, configuração e
cliente de Identidade.

## Previsto x realizado

- **Build e LOC crescem:** confirmado (+13,1 % e +19,0 %).
- **Componentes 7 → 8:** confirmado.
- **Cross-domain cai:** **não se confirmou** (+19 arestas). O catálogo recria as
  arestas internas do módulo e o monólito mantém suas entidades de carta para as
  escritas no banco compartilhado.
- **Leitura e escrita estáveis:** confirmado, dentro da faixa de variação.
- **RAM e inicialização sobem:** confirmado (+21,1 % e +5,5 %).

## Aprendizado sobre decomposição

(preencher: por que extrair o serviço sem isolar o banco não reduz o acoplamento
estático; e o que a duplicação de entidades revela sobre a fase de migração.)
