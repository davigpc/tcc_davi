# Pre-registro de Extração — leilão / Transações / snapshot final

## O que sai

O **Tempo Real** sai para `services/auction/tempo-real/`, a persistência é
isolada e o monólito é desativado.

Topologia final: `identidade` + `identity_db`, `atomo` (API e worker) +
`atomo_db`, `tempo-real` (sem banco), Redis e NGINX — oito contêineres.

## Decisões de fronteira

**1. O grupo atômico continua inteiro.** Leilões, lances, cartas, transferências e
o fechamento ficam no mesmo serviço e no mesmo banco. A transação do lance e a do
fechamento permanecem locais; nenhuma operação crítica atravessa a rede.

**2. Só os usuários atravessam a rede.** O serviço atômico passa a rodar com
`USERS_MODE=http` e consulta `POST /api/internal/users/batch` na Identidade para
compor as respostas de leilão e de carta. Cartas e tipos de carta continuam
locais, ao contrário do Subdomínio, onde a carta ficou em outro serviço.

**3. O banco do grupo atômico é criado na subida** (`synchronize`), porque não
herda as migrações do monólito. O custo entra na inicialização.

**4. O Seed muda de lugar.** Os usuários passam a ser criados no seed da
Identidade e cartas, tipos e leilão no seed do serviço atômico, com identificadores
fixos que atravessam os dois bancos.

## Hipóteses de medição

1. **Build cai** em relação ao s2, porque a imagem do monólito deixa de ser
   construída.
2. **LOC cai** pela saída do monólito, mesmo com o cliente HTTP entrando.
3. **Cross-domain cai**, porque o monólito sai da análise.
4. **Leitura cai pouco**: apenas a chamada de usuários passa a ser remota; carta
   e tipo de carta continuam locais.
5. **Escrita fica na faixa do s2**: a transação do lance não muda.
6. **RAM sobe** com o segundo banco dedicado.
