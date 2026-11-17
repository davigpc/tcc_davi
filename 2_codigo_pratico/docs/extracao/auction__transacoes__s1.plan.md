# Pre-registro de Extração — leilão / Transações / snapshot-1

Escrito antes da medição do s1.

## Agrupamento por transação

A unidade atômica do leilão foi identificada em duas operações que precisam
acontecer juntas:

1. **Lance**: travar a linha do leilão, validar situação e prazo, gravar o lance
   e atualizar o maior lance.
2. **Fechamento**: ler o maior lance, mudar o dono da carta, gravar a
   transferência e marcar o leilão como encerrado.

Como o fechamento escreve na carta e no histórico de transferências, o grupo
atômico inclui o **catálogo de cartas**. Ficam fora dele a Identidade e o Tempo
Real, que não participam dessas transações.

## Ordem das extrações

O grupo atômico sai primeiro — ao contrário da Capacidade e do Subdomínio.

- **s1**: `atomo` (leilões, lances, cartas, tipos de carta, transferências,
  tarefas de fechamento e worker) em `services/auction/atomo/`; o monólito fica
  com autenticação, usuários e tempo real.
- **s2**: Identidade sai; o monólito fica só com o tempo real.
- **final**: Tempo Real sai, a persistência é isolada e o monólito é desativado.

## Decisões do s1

**1. A transação continua inteira.** O serviço atômico roda com
`DATABASE_SYNC=false` sobre o banco do monólito. Criação de leilão, lance e
fechamento continuam sendo transações locais, incluindo a troca de dono da carta.

**2. Os usuários são lidos localmente.** O serviço tem `USERS_MODE=local`: lê a
tabela `users` na mesma base compartilhada. No snapshot final a mesma imagem roda
com `USERS_MODE=http` e consulta a Identidade.

**3. O monólito vira autenticação e tempo real.** Dele saem leilões, lances,
cartas, tipos de carta, tarefas e o worker. Ficam o login e o gateway do
Socket.IO, que ainda consulta a tabela de usuários local.

**4. As rotas públicas mudam de dono.** `/auctions`, `/auctions/:id/bids`,
`/cards` e `/card-types` passam para o serviço atômico; `/auth` e `/socket.io`
continuam no monólito.

## Hipóteses de medição

1. **Build, LOC e componentes sobem** pela segunda imagem de aplicação e pela
   duplicação de entidades, guardas e configuração.
2. **Cross-domain sobe**, como nas fases iniciais das outras trilhas.
3. **Leitura e escrita estáveis**, com pequena perda pelo salto do gateway.
4. **Inicialização sobe** pela corrente de healthchecks.
5. **RAM sobe** com um processo e um worker adicionais.

## O que o s1 testa

Se extrair o grupo atômico primeiro preserva a consistência durante toda a
migração — o oposto da Capacidade, que só isolou o banco no fim, e do Subdomínio,
que separou a carta do núcleo e fez a transferência atravessar a rede no final.
