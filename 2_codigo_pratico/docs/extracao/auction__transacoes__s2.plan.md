# Pre-registro de Extração — leilão / Transações / snapshot-2

## O que sai

A **Identidade** (autenticação e usuários) sai para
`services/auction/identidade/`, respondendo por `/auth`. O monólito fica apenas
com o Tempo Real — gateway Socket.IO e assinante do Redis.

O serviço atômico não muda: continua lendo a tabela `users` na base
compartilhada (`USERS_MODE=local`), porque o banco ainda não foi isolado. A única
diferença é que o login passa a ser respondido pela Identidade.

## Decisões

**1. Identidade no banco compartilhado.** O serviço roda com
`DATABASE_SYNC=false`, usando as tabelas criadas pelas migrações do monólito.

**2. O monólito mantém a leitura de usuários.** O handshake do socket consulta a
tabela local para montar o payload do usuário. É leitura, não escrita, e some no
snapshot final, quando o monólito é desativado.

**3. A transação não é tocada.** Nenhuma operação do grupo atômico muda nesta
fase: lance e fechamento continuam locais.

## Hipóteses de medição

1. **Build e componentes sobem** pela terceira imagem de aplicação.
2. **LOC sobe** pela duplicação do código de identidade.
3. **Cross-domain sobe** pela recriação das arestas internas do módulo extraído.
4. **Leitura e escrita do leilão ficam estáveis**, porque as rotas medidas não
   passam pela Identidade nesta fase.
5. **Inicialização e RAM sobem** com mais um serviço na corrente.
