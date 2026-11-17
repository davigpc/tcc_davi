# Registro de Extração — leilão / Transações / snapshot final

## O que foi feito

O Tempo Real saiu para `services/auction/tempo-real/`, a persistência foi
isolada e o monólito foi desativado. A topologia final tem oito contêineres:
`identidade` + `identity_db`, `atomo` (API) e `atomo_worker` + `atomo_db`,
`tempo-real`, Redis e NGINX.

O serviço atômico passou a rodar com `USERS_MODE=http`, consultando a Identidade
para compor as respostas. Cartas, tipos de carta, transferências, leilões e
lances continuam locais, no mesmo banco.

## Decisões de fronteira

**1. O grupo atômico não mudou.** Lance e fechamento continuam sendo transações
locais, incluindo a troca de dono da carta e o registro da transferência. Nenhuma
operação crítica atravessa a rede.

**2. Só os usuários são remotos.** `POST /api/internal/users/batch` na Identidade
alimenta a composição de leilões e de cartas. A Identidade passou a ser a única
dona da tabela `users`.

**3. O esquema do banco atômico é criado na subida** (`synchronize`), porque não
herda as migrações do monólito.

**4. Seed em duas etapas.** Usuários pela Identidade, cartas e leilão pelo serviço
atômico, com identificadores fixos.

## Dificuldade encontrada no isolamento

A entidade `CardTransfer` ainda declarava relações com `users`. Enquanto o banco
era compartilhado, as chaves estrangeiras existiam e eram satisfeitas. Com os
bancos separados, o `synchronize` recriou a tabela com a chave estrangeira para
uma tabela que já não estava ali, e o fechamento passou a falhar com
`violates foreign key constraint`. A correção foi remover as relações e manter
apenas os identificadores. É o mesmo tipo de acoplamento de dados que apareceu no
final das outras trilhas: o banco compartilhado escondia uma dependência que só o
isolamento revela.

## Impacto observado nas métricas

Média de três execuções.

| Dimensão | Métrica | s2 | final | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 110.920 ms | 109.989 ms | −0,8 % |
| Agilidade | Inicialização | 20.634 ms | 19.015 ms | −7,8 % |
| Custo | Componentes / contêineres | 7 / 7 | 8 / 8 | +1 |
| Custo | Imagens da aplicação | 349,7 MB | 349,7 MB | 0,0 % |
| Custo | RAM (repouso / carga) | 247,8 / 427,0 MB | 257,8 / 529,0 MB | +4,0 % / +23,9 % |
| Custo | CPU (repouso / carga) | 0,20 / 182,66 % | 0,20 / 227,99 % | 0,00 p.p. / +24,8 % |
| Desempenho | `GET /auctions` | 811,7 req/s · p50 23,7 ms | 723,3 req/s · p50 26,3 ms | −10,9 % |
| Desempenho | `GET /auctions/:id` | 700,7 req/s · p50 27,3 ms | 635,4 req/s · p50 30,3 ms | −9,3 % |
| Desempenho | `POST /bids` | 117,6 req/s · p50 8,3 ms | 143,2 req/s · p50 6,7 ms | +21,8 % |
| Manutenibilidade | Linhas de Código | 4.075 | 3.555 | −520 (−12,8 %) |
| Manutenibilidade | Chamadas entre fronteiras | 104 de 216 | 96 de 195 | −8 |

Nenhuma resposta fora da faixa 2xx foi registrada.

O build e a inicialização caem com a saída da imagem do monólito, mesmo com a
entrada do serviço de Tempo Real. As Linhas de Código caem 13 %, porque o
monólito deixa de compor a solução e o cliente HTTP não compensa o volume
removido. A memória sob carga sobe 24 % com o segundo banco dedicado.

A leitura perde 11 % e 9 %: comparada ao s2, a única mudança é a consulta de
usuários, que passou a ser HTTP. No detalhe, são quatro usuários por página
(vendedor, dono da carta e os dois primeiros de cada lance) resolvidos em uma
única chamada em lote. A escrita sobe 22 % sobre o s2, mas a faixa entre
repetições é larga (97,5 a 169,3 req/s); contra o baseline, a perda é de 10 %.

## Comparação com o baseline

| Métrica | S0 | final | Variação acumulada |
|---|---|---|---|
| Build | 76.076 ms | 109.989 ms | +44,6 % |
| Inicialização | 12.627 ms | 19.015 ms | +50,6 % |
| Componentes | 4 | 8 | +4 |
| LOC | 2.863 | 3.555 | +24,2 % |
| Chamadas entre fronteiras | 88 de 174 | 96 de 195 | +8 |
| `GET /auctions` | 923,9 req/s | 723,3 req/s | −21,7 % |
| `GET /auctions/:id` | 751,6 req/s | 635,4 req/s | −15,5 % |
| `POST /bids` | 159,0 req/s | 143,2 req/s | −9,9 % |
| RAM sob carga | 313,6 MB | 529,0 MB | +68,7 % |

## Previsto x realizado

- **Build cai sobre o s2:** confirmado, mas de forma marginal (−0,8 %).
- **LOC cai:** confirmado (−12,8 %).
- **Cross-domain cai:** confirmado (−8 arestas).
- **Leitura cai pouco:** confirmado em parte (−10,9 % e −9,3 %).
- **Escrita na faixa do s2:** confirmado (+21,8 %, dentro da dispersão da rota).
- **RAM sobe:** confirmado (+23,9 %).

## Aprendizado sobre decomposição

(preencher: por que o grupo atômico protege a escrita; o que a falha de chave
estrangeira revela sobre o acoplamento escondido; e por que a leitura de usuários
é o único custo de rede do estado final.)
