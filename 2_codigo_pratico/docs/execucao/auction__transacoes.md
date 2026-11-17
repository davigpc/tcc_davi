# Diário de Execução — leilão / Transações

> Um arquivo por trilha. Consolida hipótese, decisões, snapshots e observações.
> É o rascunho direto da seção correspondente do capítulo 05.

## Identificação

- App: `auction` (leilão de cartas / Postgres + Redis)
- Metodologia: Transações (ACID)
- Branch: `exp/auction/transacoes` (pai e fork)
- Baseline: `baseline/auction` / fork `baseline/experimento`
- Medição: 17/11/2026

## Hipótese de decomposição

Grupo atômico: Leilão + Lances + Catálogo de Cartas (+ transferências + jobs +
worker). Fora do grupo: Identidade e Tempo Real. Ordem: grupo atômico → Identidade
→ Tempo Real (final, com bancos isolados).

## Snapshots

### snapshot-0 (baseline)

- Medição reaproveitada da trilha de Capacidade de Negócio (mesmo código de
  baseline), declarada em `harness/analise/baselines.json`.
- Build 76.076 ms; inicialização 12.627 ms; LOC 2.863; cross-domain 88/174;
  componentes 4.

### snapshot-1 (grupo atômico)

- Serviço `services/auction/atomo/` (leilões + lances + cartas + tipos +
  transferências + jobs + worker); monólito fica com auth e tempo real; banco
  compartilhado (`USERS_MODE=local`, `DATABASE_SYNC=false`).
- Resultados: build 98.325 ms (+29,3 %); inicialização 19.635 (+55,5 %); LOC
  3.711 (+29,6 %); cross-domain 92/194 (+4); componentes 6; imagens 216,4 MB;
  RAM 201,3 / 277,1 MB; CPU 2,26 / 186,32 %; `auctions` 870,3 (−5,8 %);
  `auction-by-id` 724,5 (−3,6 %); `bids` 113,1 (−28,9 %, faixa 91,2–147,9).
- Observações: a memória sob carga caiu 12 %, ao contrário do previsto — o
  monólito reduzido provavelmente libera mais do que os contêineres novos
  consomem. A escrita caiu mais que o salto de gateway justifica; ficou como não
  conclusiva.

### snapshot-2 (Identidade)

- Serviço `services/auction/identidade/` responde `/auth` no banco compartilhado;
  o monólito fica só com o tempo real. Seeds em duas etapas (Identidade e átomo).
- Resultados: build 110.920 ms (+12,8 %); inicialização 20.634 (+5,1 %); LOC
  4.075 (+9,8 %); cross-domain 104/216 (+12); componentes 7; imagens 324,6 MB;
  RAM 247,8 / 427,0 MB; CPU 0,20 / 182,66 %; `auctions` 811,7 (−6,7 %);
  `auction-by-id` 700,7 (−3,3 %); `bids` 117,6 (+4,0 %).
- Observações: a memória sobe 54 % com o serviço de Identidade, que mantém pool
  de conexão com o banco mesmo sem passar pelas rotas medidas.

### snapshot-final (bancos isolados)

- Tempo Real extraído, `identity_db` + `atomo_db`, monólito desativado: 8
  contêineres. Serviço atômico em `USERS_MODE=http` (usuários pela Identidade).
- Resultados: build 109.989 ms (−0,8 %); inicialização 19.015 (−7,8 %); LOC
  3.555 (−12,8 %); cross-domain 96/195 (−8); imagens 349,7 MB; RAM 257,8 /
  529,0 MB; CPU 0,20 / 227,99 %; `auctions` 723,3 (−10,9 %); `auction-by-id`
  635,4 (−9,3 %); `bids` 143,2 (+21,8 %, faixa 97,5–169,3).
- Dificuldade: a entidade `CardTransfer` mantinha FK para `users`; com bancos
  separados o `synchronize` recriou a tabela com a FK e o fechamento passou a
  falhar. Corrigido removendo as relações (só identificadores).
- Observações: o grupo atômico preserva a transação; o único custo de rede do
  estado final é a leitura de usuários.

## Desvios e dificuldades

- **Duas imagens com propósitos diferentes.** O monólito restante (auth + tempo
  real) e o serviço atômico usam a mesma base de dependências; as imagens somam
  216 MB no s1 mesmo sem todo o código de uma estar na outra.
- **FK que só o isolamento revela.** `CardTransfer` referenciava `users` por
  chave estrangeira. Com bancos separados, o fechamento falhou
  (`violates foreign key constraint`) até as relações serem removidas da entidade.
- **Modo de leitura de usuários.** O serviço atômico tem `USERS_MODE=local` (lê a
  tabela no banco compartilhado) e `USERS_MODE=http` (consulta a Identidade). A
  mesma imagem serve às três fases, o que mantém a comparação limpa.
- **Entidade `users` no banco atômico.** Como o mapeamento existe para o modo
  local, o `synchronize` cria uma tabela `users` vazia no banco final. Ela não é
  lida nem escrita; é um resíduo da compatibilidade entre as fases.
- **Seed em duas etapas no s2/final.** Usuários pela Identidade e cartas/leilão
  pelo átomo, com ids fixos. No s1 o seed do monólito ainda funciona, porque o
  banco é o mesmo.
- **Docker instável.** Três quedas do Docker Desktop durante a sessão, uma delas
  durante a construção das imagens; a coleta foi refeita.

## Síntese para o capítulo 05

A trilha começa pelo grupo atômico, ao contrário das outras duas. A escrita
continua local desde a primeira fase: criação, lance e fechamento não dependem da
rede em nenhum momento, porque leilão, lances e cartas estão no mesmo serviço e
no mesmo banco.

O custo aparece na largura do grupo. No s1, o serviço concentra 3.711 linhas,
gera uma segunda imagem e leva a inicialização de 12,6 para 19,6 segundos. A
memória sob carga, no entanto, cai, porque o monólito perde a maior parte do
código.

No estado final, o único acoplamento que atravessa a rede é a leitura de
usuários. Comparado ao baseline, a escrita perde 10 % — contra 45 % na Capacidade
e 15 % no Subdomínio — e a leitura perde 22 % e 16 %, porque a composição depende
de uma chamada à Identidade. O isolamento também expôs uma dependência que o
banco compartilhado escondia: a chave estrangeira de `card_transfers` para
`users`. Em um domínio com duas transações críticas, o critério de transações
mantém a consistência ao preço de um serviço maior e de um banco que concentra
quatro tabelas.

