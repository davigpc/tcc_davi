# Pre-registro de Extração — leilão / Subdomínio (DDD) / snapshot-2

## O que sai do monólito

O **Catálogo de Cartas** (subdomínio de suporte) sai como serviço próprio:
`/cards` e `/card-types`, incluindo criação de carta e listagem por dono. O
serviço reaproveita `services/auction/catalogo/`, já usado na trilha de
Capacidade, apontando para o banco compartilhado com `DATABASE_SYNC=false`.

O monólito fica com o núcleo: leilões, lances, tarefas de fechamento e o worker.

## Decisões de fronteira

**1. O banco continua compartilhado.** O monólito mantém as entidades `Card`,
`CardType` e `CardTransfer` e continua travando a carta na criação do leilão e
transferindo no fechamento, escrevendo direto na mesma base que o Catálogo serve.
É a mesma situação do s2 das outras trilhas: a fronteira do serviço já existe, a
do banco não.

**2. As rotas de catálogo saem do monólito.** Controladores e DTOs de `cards` e
`card-types` foram removidos do monólito; sobrou o serviço de tipos de carta,
usado para compor a resposta dos leilões, e as entidades usadas pelas transações
do núcleo.

**3. A Identidade passa a ser consultada pelo Catálogo.** A criação de carta no
Catálogo valida o dono por chamada interna à Identidade, mesmo com o banco
compartilhado, porque essa é a forma que o serviço já tinha na trilha de
Capacidade. O custo aparece no caminho de escrita de carta, que não é medido.

## Hipóteses de medição

1. **Build e LOC crescem** pela quarta imagem e pela duplicação do código de
   catálogo.
2. **Componentes** vão de 7 para 8.
3. **Cross-domain cai em relação ao s1**: o código de catálogo sai do monólito, e
   o serviço recria apenas as arestas internas dele.
4. **Leitura e escrita do núcleo ficam estáveis**, porque as rotas medidas não
   passam pelo Catálogo nesta fase.
5. **RAM e inicialização sobem** com mais um processo e mais um healthcheck na
   corrente.

## O que o s2 prepara

O núcleo passa a ser o único componente que ainda compartilha banco com outro
serviço. No snapshot final, ele sai como serviço único — leilões **e** lances no
mesmo processo e no mesmo banco — e a carta deixa de ser acessível por SQL.
