# Registro de Extração — leilão / Transações / snapshot-2

## O que foi feito

A Identidade saiu para `services/auction/identidade/`, respondendo por `/auth`
sobre o banco compartilhado (`DATABASE_SYNC=false`). O monólito ficou apenas com
o Tempo Real: gateway Socket.IO e assinante do Redis. O serviço atômico não mudou
— continua lendo a tabela `users` localmente (`USERS_MODE=local`).

Os seeds passaram a rodar em duas etapas: usuários pela Identidade, cartas e
leilão pelo serviço atômico, com identificadores fixos.

## Decisões de fronteira

**1. Login fora, leitura de usuários dentro.** O monólito restante mantém uma
cópia local do mapeamento de `users` porque o handshake do socket monta o payload
do usuário. É leitura na base compartilhada e desaparece no snapshot final, quando
o monólito é desativado.

**2. A transação segue intacta.** Criação, lance e fechamento não mudam nesta
fase: continuam locais no serviço atômico.

**3. O monólito deixa de ser ponto de entrada.** As rotas `/auth` passam para a
Identidade; todo o resto já estava no serviço atômico desde o s1.

## Impacto observado nas métricas

Média de três execuções.

| Dimensão | Métrica | s1 | s2 | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 98.325 ms | 110.920 ms | +12,8 % |
| Agilidade | Inicialização | 19.635 ms | 20.634 ms | +5,1 % |
| Custo | Componentes / contêineres | 6 / 6 | 7 / 7 | +1 |
| Custo | Imagens da aplicação | 216,4 MB | 324,6 MB | +50,0 % |
| Custo | RAM (repouso / carga) | 201,3 / 277,1 MB | 247,8 / 427,0 MB | +23,1 % / +54,1 % |
| Custo | CPU (repouso / carga) | 2,26 / 186,32 % | 0,20 / 182,66 % | −2,06 p.p. / −2,0 % |
| Desempenho | `GET /auctions` | 870,3 req/s · p50 21,7 ms | 811,7 req/s · p50 23,7 ms | −6,7 % |
| Desempenho | `GET /auctions/:id` | 724,5 req/s · p50 26,7 ms | 700,7 req/s · p50 27,3 ms | −3,3 % |
| Desempenho | `POST /bids` | 113,1 req/s · p50 8,7 ms | 117,6 req/s · p50 8,3 ms | +4,0 % |
| Manutenibilidade | Linhas de Código | 3.711 | 4.075 | +364 (+9,8 %) |
| Manutenibilidade | Chamadas entre fronteiras | 92 de 194 | 104 de 216 | +12 |

Nenhuma resposta fora da faixa 2xx foi registrada.

O build cresceu 13 % pela terceira imagem de aplicação e as Linhas de Código,
10 %, pela duplicação do código de identidade. A memória sob carga subiu 54 %
porque o serviço de Identidade também mantém um pool de conexões com o banco
compartilhado, ainda que as rotas medidas não passem por ele. A leitura caiu 7 %
e a escrita variou +4 %, dentro da faixa da rota.

## Previsto x realizado

- **Build e componentes sobem:** confirmado (+12,8 % e +1).
- **LOC sobe:** confirmado (+9,8 %).
- **Cross-domain sobe:** confirmado (+12 arestas).
- **Leitura e escrita estáveis:** confirmado (−6,7 %, −3,3 % e +4,0 %).
- **Inicialização e RAM sobem:** confirmado (+5,1 % e +54,1 %).
