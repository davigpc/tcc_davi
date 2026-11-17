# Diário de Execução — leilão / Subdomínio (DDD)

> Um arquivo por trilha. Consolida hipótese, decisões, snapshots e observações.
> É o rascunho direto da seção correspondente do capítulo 05.

## Identificação

- App: `auction` (leilão de cartas / Postgres + Redis)
- Metodologia: Subdomínio (DDD)
- Branch: `exp/auction/subdominio` (pai e fork)
- Baseline: `baseline/auction` / fork `baseline/experimento`
- Medição: 17/11/2026

## Hipótese de decomposição

Genéricos: Identidade (auth/users) e Tempo Real (gateway + assinante Redis).
Suporte: Catálogo de Cartas (cards/card-types). Núcleo: Leilão (auctions + bids +
auction-jobs + worker). Ordem: genéricos → suporte → núcleo.

## Snapshots

### snapshot-0 (baseline)

- Medição reaproveitada da trilha de Capacidade de Negócio (mesmo código de
  baseline, `snap/auction/capacidade-negocio/0`), registrada em
  `metricas/auction/capacidade-negocio/snapshot-0` e declarada como baseline
  canônico em `harness/analise/baselines.json`.
- Build 76.076 ms; inicialização 12.627 ms; LOC 2.863; cross-domain 88/174;
  componentes 4.

### snapshot-1 (Identidade + Tempo Real)

- Serviços `services/auction/identidade/` e `services/auction/tempo-real/`;
  NGINX desvia `/auth` e `/socket.io`. Banco compartilhado, monólito na 3100.
- Resultados: build 106.665 ms (+40,2 %); inicialização 25.146 (+99,1 %); LOC
  3.437 (+20,0 %); cross-domain 102/197 (+14); componentes 7; imagens 324,5 MB;
  RAM 235,2 / 412,9 MB; CPU 0,19 / 203,79 %; `auctions` 896,8 req/s (−2,9 %);
  `auction-by-id` 725,1 (−3,5 %); `bids` 134,0 (−15,7 %, faixa 92,5–161,0).
- Observações: a inicialização dobra por causa da corrente de healthchecks
  (monólito → Identidade → Tempo Real → NGINX). A escrita não teve conclusão
  por causa da dispersão entre repetições.

### snapshot-2 (Catálogo de Cartas)

- Serviço `services/auction/catalogo/` responde `/cards` e `/card-types`; o
  monólito fica com o núcleo e continua escrevendo nas tabelas de carta no banco
  compartilhado. NGINX passa a desviar catálogo.
- Resultados: build 120.588 ms (+13,1 %); inicialização 26.537 (+5,5 %); LOC
  4.089 (+19,0 %); cross-domain 121/229 (+19); componentes 8; imagens 432,7 MB;
  RAM 284,8 / 462,6 MB; CPU 0,18 / 208,24 %; `auctions` 910,9 (+1,6 %);
  `auction-by-id` 745,6 (+2,8 %); `bids` 164,0 (+22,4 %, dentro da dispersão).
- Observações: o cross-domain subiu, ao contrário do previsto: o catálogo recria
  as arestas internas e o monólito mantém as entidades de carta para escrever na
  base compartilhada.

### snapshot-final (bancos isolados)

- Núcleo (`services/auction/nucleo/`, leilões + lances + jobs + worker) com
  `leilao_db`; Identidade, Catálogo e Tempo Real com bancos próprios ou sem
  banco; monólito desativado: 10 contêineres.
- Resultados: build 116.144 ms (−3,7 %); inicialização 26.697 (+0,6 %); LOC
  3.916 (−4,2 %); cross-domain 97/197 (−24); imagens 457,8 MB; RAM 330,9 /
  657,3 MB; CPU 0,23 / 247,25 %; `auctions` 588,6 (−35,4 %); `auction-by-id`
  551,8 (−26,0 %); `bids` 135,1 (−17,6 %, faixa 98,4–159,8), sem respostas fora
  da faixa 2xx.
- Observações: o lance continua atômico no núcleo. A escrita perde apenas o
  salto do gateway e o parse da resposta; a leitura paga as duas chamadas de
  composição e o join do maior lance.

## Desvios e dificuldades

- **Corrente de healthchecks.** Cada serviço extraído entrou na cadeia de
  `depends_on` com `service_healthy`, e o NGINX só sobe depois do último. Foi o
  que dobrou o tempo de inicialização no s1.
- **Banco compartilhado até o s2.** Identidade e Catálogo rodam com
  `DATABASE_SYNC=false`, porque o esquema continua sendo criado pelas migrações
  do monólito. No final, o serviço do núcleo usa `synchronize: true` no banco
  novo.
- **Entidades de carta duplicadas no monólito.** Até o s2, o núcleo precisa
  escrever nas tabelas de carta (trava e transferência), então mantém `Card`,
  `CardType` e `CardTransfer` e escreve direto no banco do Catálogo. Foi isso que
  impediu o cross-domain de cair no s2.
- **Build instável no Windows.** Duas coletas do s2 falharam no passo de build
  (`npm ci` com exit 152 e queda do engine do Docker com `rpc error: ... EOF`).
  A coleta foi refeita depois de reiniciar o Docker Desktop; os tempos de build
  variam bastante entre repetições.
- **Escrita ruidosa.** A rota de lance, medida com uma conexão, apresentou faixas
  largas (92,5 a 161,0 req/s no s1, 98,4 a 159,8 no final). Variações dessa ordem
  não sustentam conclusão.

## Síntese para o capítulo 05

A trilha de subdomínio começa pelos genéricos e paga caro logo na primeira fase:
três serviços novos levam a inicialização de 12,6 para 25,1 segundos e as imagens
de 105 para 325 MB. O cross-domain, que deveria cair, sobe 14 arestas, porque cada
serviço recria o código transversal e o monólito mantém o que ainda usa.

No s2 a contradição continua: extrair o Catálogo sem isolar o banco não reduz o
acoplamento estático — sobe mais 19 arestas, porque o núcleo mantém as entidades
de carta para escrever na base compartilhada.

O estado final separa o que a metodologia considera indivisível. Leilão e lances
ficam no mesmo serviço e no mesmo banco, e a escrita preserva a transação local.
Comparado ao baseline, o lance perde 15 % de vazão — a mesma faixa da Capacidade
de Negócio somente na primeira fase, mas ela perdeu 45 % no final, quando separou
as duas capacidades. O preço aqui está na leitura: compor cada resposta com
Catálogo e Identidade custa 35 % da listagem e 26 % do detalhe.

