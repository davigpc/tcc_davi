# Registro de Extração — leilão / Transações / snapshot-1

## O que foi feito

O grupo atômico saiu do monólito para `services/auction/atomo/`: leilões,
lances, cartas, tipos de carta, transferências, tarefas de fechamento e o worker,
em um único serviço. O monólito ficou com autenticação, usuários (para o
handshake do socket) e o tempo real. As rotas `/auctions`, `/auctions/:id/bids`,
`/cards` e `/card-types` passaram para o serviço atômico; `/auth` e `/socket.io`
continuam no monólito. O banco é o mesmo do monólito (`DATABASE_SYNC=false`).

## Decisões de fronteira

**1. A carta entrou no grupo atômico.** O fechamento escreve na carta e no
histórico de transferências, então o catálogo não pode ficar fora: o grupo reúne
leilões, lances e cartas. É a diferença em relação ao Subdomínio, que extraiu o
Catálogo e fez a transferência atravessar a rede no final.

**2. A transação continua inteira em todas as fases.** Criação de leilão (trava da
carta + inserção), lance (trava do leilão + gravação + maior lance) e fechamento
(leitura do maior lance + troca de dono + histórico + status) são transações
locais.

**3. Usuários lidos localmente.** O serviço roda com `USERS_MODE=local` e lê a
tabela `users` na base compartilhada. A mesma imagem usa `USERS_MODE=http` no
snapshot final.

**4. O worker fica no grupo.** A fila, o varredor de vencidos e o worker saem
junto com o fechamento, porque dependem das mesmas tabelas e da mesma transação.

## Impacto observado nas métricas

Média de três execuções.

| Dimensão | Métrica | S0 | s1 | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 76.076 ms | 98.325 ms | +29,3 % |
| Agilidade | Inicialização | 12.627 ms | 19.635 ms | +55,5 % |
| Custo | Componentes / contêineres | 4 / 4 | 6 / 6 | +2 |
| Custo | Imagens da aplicação | 104,9 MB | 216,4 MB | +106,3 % |
| Custo | RAM (repouso / carga) | 137,5 / 313,6 MB | 201,3 / 277,1 MB | +46,4 % / −11,6 % |
| Custo | CPU (repouso / carga) | 0,21 / 191,32 % | 2,26 / 186,32 % | +2,05 p.p. / −2,6 % |
| Desempenho | `GET /auctions` | 923,9 req/s · p50 20,7 ms | 870,3 req/s · p50 21,7 ms | −5,8 % |
| Desempenho | `GET /auctions/:id` | 751,6 req/s · p50 25,3 ms | 724,5 req/s · p50 26,7 ms | −3,6 % |
| Desempenho | `POST /bids` | 159,0 req/s · p50 6,0 ms | 113,1 req/s · p50 8,7 ms | −28,9 % |
| Manutenibilidade | Linhas de Código | 2.863 | 3.711 | +848 (+29,6 %) |
| Manutenibilidade | Chamadas entre fronteiras | 88 de 174 | 92 de 194 | +4 |

Nenhuma resposta fora da faixa 2xx foi registrada.

O build cresceu 29 % pela segunda imagem de aplicação, e as Linhas de Código,
30 %, porque o serviço copia entidades, serviços e configuração. A memória sob
carga caiu 12 %, o que não era esperado; a hipótese é que o monólito reduzido
libera mais memória do que os contêineres adicionais consomem.

A escrita de lances caiu 29 %, com faixa de 91,2 a 147,9 req/s entre repetições.
A queda é maior do que a observada no s1 das outras trilhas com o mesmo salto de
gateway (4 % e 16 %), e não deve ser atribuída apenas à extração sem uma nova
medição.

## Previsto x realizado

- **Build, LOC e componentes sobem:** confirmado (+29,3 %, +29,6 % e +2).
- **Cross-domain sobe:** confirmado, mas pouco (+4 arestas).
- **Leitura estável:** confirmado (−5,8 % e −3,6 %).
- **Inicialização sobe:** confirmado (+55,5 %).
- **RAM sobe:** **não se confirmou** — caiu 12 % sob carga.
