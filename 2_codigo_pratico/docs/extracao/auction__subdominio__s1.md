# Registro de Extração — leilão / Subdomínio (DDD) / snapshot-1

## O que foi feito

Saíram do monólito os dois subdomínios genéricos:

- **Identidade** (`services/auction/identidade/`) — `/auth` e as consultas
  internas de usuário;
- **Tempo Real** (`services/auction/tempo-real/`) — servidor Socket.IO e
  assinante do canal de eventos no Redis.

O monólito ficou com catálogo, leilão, lances e o worker. O NGINX passou a
desviar `/auth` para a Identidade e `/socket.io` para o Tempo Real; o restante
continua no monólito, na porta interna 3100.

## Decisões de fronteira

**1. O login saiu, os dados de usuário ficaram.** O controlador e o serviço de
autenticação passaram para a Identidade. O monólito manteve o mapeamento de
`users` e os guardas de token, porque cartas, leilões e lances exibem nome e
e-mail do usuário nas respostas. O banco é o mesmo, então essa leitura não
atravessa serviço nesta fase.

**2. O gateway do Socket.IO saiu, o publicador ficou.** O monólito continua
publicando eventos no Redis; a entrega aos clientes passou a ser feita pelo
serviço de Tempo Real, que valida o token no handshake e consulta a Identidade
uma vez por conexão.

**3. A Identidade aponta para o banco do monólito.** O serviço roda com
`DATABASE_SYNC=false`: o esquema continua sendo criado pelas migrações do
monólito, e a Identidade apenas lê e escreve na tabela `users`.

## Impacto observado nas métricas

Média de três execuções.

| Dimensão | Métrica | S0 | s1 | Variação |
|---|---|---|---|---|
| Agilidade | Build (`--no-cache`) | 76.076 ms | 106.665 ms | +40,2 % |
| Agilidade | Inicialização | 12.627 ms | 25.146 ms | +99,1 % |
| Custo | Componentes / contêineres | 4 / 4 | 7 / 7 | +3 |
| Custo | Imagens da aplicação | 104,9 MB | 324,5 MB | +209,4 % |
| Custo | RAM (repouso / carga) | 137,5 / 313,6 MB | 235,2 / 412,9 MB | +71,1 % / +31,7 % |
| Custo | CPU (repouso / carga) | 0,21 / 191,32 % | 0,19 / 203,79 % | −0,02 p.p. / +6,5 % |
| Desempenho | `GET /auctions` | 923,9 req/s · p50 20,7 ms | 896,8 req/s · p50 21,0 ms | −2,9 % |
| Desempenho | `GET /auctions/:id` | 751,6 req/s · p50 25,3 ms | 725,1 req/s · p50 26,3 ms | −3,5 % |
| Desempenho | `POST /bids` | 159,0 req/s · p50 6,0 ms | 134,0 req/s · p50 7,3 ms | −15,7 % |
| Manutenibilidade | Linhas de Código | 2.863 | 3.437 | +574 (+20,0 %) |
| Manutenibilidade | Chamadas entre fronteiras | 88 de 174 | 102 de 197 | +14 |

Nenhuma resposta fora da faixa 2xx foi registrada.

O tempo de inicialização dobrou. A corrente de healthchecks passou a ter três
saltos sequenciais — monólito, Identidade e Tempo Real — e o NGINX só sobe
depois que os três respondem. O build cresceu 40 % pela terceira imagem de
aplicação, e as imagens somadas triplicaram porque cada serviço carrega o mesmo
conjunto de dependências.

As leituras perderam cerca de 3 %, compatível com o salto adicional pelo
gateway. A escrita apresentou queda de 15,7 %, mas com faixa de 92,5 a 161,0
req/s entre as repetições; a perda não pode ser atribuída à extração sem uma
nova medição. Nas três fases, a transação do lance continua local ao monólito,
porque o banco é compartilhado.

## Previsto x realizado

- **Build sobe:** confirmado (+40,2 %).
- **Inicialização sobe:** confirmado, e acima do previsto (+99,1 %).
- **LOC sobe:** confirmado (+20,0 %).
- **Cross-domain sobe:** confirmado (+14 arestas).
- **Leitura estável:** confirmado (−2,9 % e −3,5 %).
- **Escrita estável:** não conclusivo — a média caiu 15,7 %, mas a dispersão
  entre repetições é alta.

## Aprendizado sobre decomposição

(preencher: por que extrair um subdomínio genérico não custa barato; o efeito da
corrente de healthchecks; e por que a leitura de usuários continuar local ilustra
a diferença entre extrair o serviço e extrair os dados.)
