# Registro de Extração — leilão / Capacidade de Negócio / snapshot final

## O que foi feito

Saíram do monólito as três capacidades restantes e o monólito foi desativado.
A topologia final tem cinco serviços de aplicação, o worker e um banco por
serviço:

- `services/auction/identidade/` — `/auth` e as consultas internas de usuário;
- `services/auction/catalogo/` — `/cards`, `/card-types`, travas e transferências;
- `services/auction/tempo-real/` — Socket.IO e assinatura do canal de eventos;
- `services/auction/leilao/` — `/auctions` e o worker de fechamento;
- `services/auction/lances/` — `/auctions/:id/bids`.

Bancos: `identity_db`, `catalogo_db`, `leilao_db` e `lances_db`, cada um em um
contêiner PostgreSQL. Redis continua compartilhado (fila do fechamento e canal de
eventos) e o NGINX segue na borda, agora também encaminhando `/socket.io`.

## Decisões de fronteira

**1. A invariante do lance passou a ser local ao serviço de Lances.**
`bids` e `bid_auction_state` ficam em `lances_db`. O estado do leilão (vendedor,
preço inicial, fim e situação) é copiado na primeira operação do leilão, por
chamada interna. O `currentHighestBidId` do Leilão virou **projeção**: o serviço
de Lances grava o lance e, depois do commit, envia o novo maior lance para
`POST /api/internal/auctions/:id/highest-bid`. Se essa chamada falhar, o Leilão
continua exibindo o lance anterior e a divergência é registrada em log.

**2. O fechamento atravessa três serviços.** O worker marca `CLOSING`, lê o maior
lance em Lances, pede a transferência da carta ao Catálogo e só então marca
`CLOSED`. A transferência é idempotente por `auctionId` (a segunda chamada
devolve a carta já transferida), então uma nova tentativa não duplica o histórico.
Quando não há lance, o worker devolve a carta ao vendedor com
`POST /api/internal/cards/:id/unlock`.

**3. A criação de leilão trava a carta por HTTP.** O Leilão chama
`POST /api/internal/cards/:id/lock` antes de inserir o leilão e desfaz a trava se
a inserção falhar. As validações de dono e de situação da carta ficaram no
Catálogo, que responde 403 ou 409 e o cliente propaga o mesmo status.

**4. A leitura é composta por chamadas em lote.** `GET /auctions` faz uma chamada
`POST /api/internal/cards/batch` e uma `POST /api/internal/users/batch`; a página
de 10 leilões custa dois saltos, independente do tamanho. O filtro por
`cardTypeId` passou a ser aplicado em memória depois da composição.

**5. O gateway do Tempo Real é um serviço sem banco.** Ele valida o JWT
localmente e consulta a Identidade apenas no handshake do socket.

**6. Autenticação stateless nos serviços extraídos.** Identidade é o único serviço
que consulta a tabela de usuários; Leilão, Lances, Catálogo e Tempo Real validam
o token com a mesma `JWT_SECRET` e usam o payload.

## Desvios e dificuldades

- **Esquema criado por sincronização.** Os serviços extraídos não carregam as
  migrações do monólito: cada banco novo é criado com `synchronize: true` na
  inicialização. O tempo de criação de tabela entra na métrica de inicialização.
- **Seed em três etapas.** Identidade, Catálogo e Leilão têm seeds próprios com
  identificadores fixos, porque as referências atravessam bancos. O seed do
  Leilão é o último e imprime o `auctionId` consumido pelo harness.
- **`card_transfers` mudou de dono.** A tabela saiu do Leilão e passou a viver no
  Catálogo, junto da carta, e é gravada na mesma transação da troca de dono.
- **Dependência circular evitada no compose.** Lances depende do Leilão ficar
  saudável, mas o Leilão só usa Lances no fechamento; por isso o Leilão não espera
  Lances no `depends_on`, e sim o worker, que já sobe depois.
- **Projeção sem compensação.** Não há retentativa automática do
  `highest-bid`: a chamada é registrada em log e o valor apresentado pelo Leilão
  pode ficar atrás do último lance. É a primeira quebra real de consistência da
  trilha e será discutida como limitação do desenho.

## Validação funcional

- Login, listagem e detalhe com carta, vendedor e lances recentes compostos por
  chamadas internas.
- Lance aceito no serviço de Lances com projeção visível em `GET /auctions/:id`.
- Leilão de 30 s criado no serviço de Leilão, lance no serviço de Lances e
  fechamento no worker: status `CLOSED`, carta transferida no Catálogo
  (`owner = bidder`, `status = OWNED`) e registro em `card_transfers`.
- Handshake do Socket.IO respondendo pelo NGINX em `/socket.io`.

## Impacto observado nas métricas

Média de três execuções.

| Dimensão | Métrica | s2 | final | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 90.035 ms | 116.823 ms | +29,8 % |
| Agilidade | Inicialização | 18.675 ms | 30.848 ms | +65,2 % |
| Custo | Componentes / contêineres | 7 / 7 | 12 / 12 | +5 |
| Custo | Imagens da aplicação | 339,7 MB | 549,3 MB | +61,7 % |
| Custo | RAM (repouso / carga) | 245,7 / 425,3 MB | 404,6 / 799,1 MB | +64,7 % / +87,9 % |
| Custo | CPU (repouso / carga) | 0,46 / 206,99 % | 2,75 / 259,79 % | +2,3 p.p. / +25,5 % |
| Desempenho | `GET /auctions` | 874,1 req/s · p50 21,7 ms | 740,1 req/s · p50 25,3 ms | −15,3 % |
| Desempenho | `GET /auctions/:id` | 721,6 req/s · p50 26,3 ms | 653,1 req/s · p50 29,7 ms | −9,5 % |
| Desempenho | `POST /auctions/:id/bids` | 152,7 req/s · p50 6,3 ms | 87,2 req/s · p50 11,7 ms | −42,9 % |
| Manutenibilidade | Linhas de Código | 4.310 | 4.552 | +242 (+5,6 %) |
| Manutenibilidade | Chamadas entre fronteiras | 125 de 239 | 109 de 223 | −16 |

Nenhuma resposta fora da faixa 2xx foi registrada na coleta final.

A leitura cai 15 % porque a resposta de cada leilão passou a depender de duas
chamadas internas em lote (Catálogo e Identidade) além do salto pelo gateway. O
detalhe cai menos porque a página tem um único leilão, e o custo das duas
chamadas é o mesmo da listagem. A escrita cai 43 %: além do salto pelo gateway,
cada lance faz uma transação local em `lances_db` e uma chamada de projeção ao
Leilão depois do commit. A latência p50 do lance quase dobra.

O custo de infraestrutura acompanha a separação: cinco imagens de aplicação,
quatro bancos dedicados e um gateway resultam em 549 MB de imagens e quase o
dobro de memória sob carga em relação ao s2. A inicialização cresce 65 % porque
nove contêineres esperam o healthcheck e cada banco novo cria o esquema na
primeira subida (`synchronize`).

O número de componentes sobe de 7 para 12, mas as chamadas entre fronteiras
**caem** de 125 para 109. É o oposto do observado no s1 e no s2: com o monólito
fora, desaparecem as arestas internas dele. O acoplamento que restou migrou para
a rede e não aparece no `madge` — são 13 endpoints internos que cruzam serviços e
que a análise estática não enxerga.

## Comparação com o baseline

| Métrica | S0 | final | Variação acumulada |
|---|---|---|---|
| Build | 76.076 ms | 116.823 ms | +53,6 % |
| Inicialização | 12.627 ms | 30.848 ms | +144,3 % |
| Componentes | 4 | 12 | +8 |
| LOC | 2.863 | 4.552 | +59,0 % |
| Chamadas entre fronteiras | 88 de 174 | 109 de 223 | +21 |
| `GET /auctions` | 923,9 req/s | 740,1 req/s | −19,9 % |
| `GET /auctions/:id` | 751,6 req/s | 653,1 req/s | −13,1 % |
| `POST /bids` | 159,0 req/s | 87,2 req/s | −45,1 % |
| RAM sob carga | 313,6 MB | 799,1 MB | +154,8 % |

## Previsto x realizado

- **Build sobe:** confirmado (+53,6 % sobre o S0).
- **Inicialização sobe:** confirmado, e muito acima do previsto (+144 %).
- **Componentes 7 → 12:** confirmado.
- **LOC sobe:** confirmado (+242 linhas sobre o s2, +59 % sobre o S0).
- **Cross-domain sobe:** **não se confirmou** — caiu 16 arestas com a saída do
  monólito.
- **Leitura cai pelos saltos de composição:** confirmado (−19,9 % e −13,1 %).
- **Escrita cai:** confirmado, −45,1 %, mais que o previsto.
- **RAM sobe pelos quatro bancos:** confirmado (+154,8 % sobre o S0).

## Aprendizado sobre decomposição

(preencher: o que muda quando a transação do lance deixa de ser única; o papel do
estado local e da projeção; por que o cross-domain cai quando o monólito sai; e o
que a chamada de projeção sem compensação ensina sobre fronteiras de dados.)
