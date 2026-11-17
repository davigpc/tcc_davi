# Identificação de Domínios — leilão (lente de Capacidade de Negócio)

Documento de apoio para o capítulo 05. Registra a primeira lente aplicada ao
`auction`: o critério de capacidade de negócio, o agrupamento e a evidência de
base. As lentes de Subdomínio e Transações serão registradas nas trilhas
correspondentes.

## 1. Critério

Agrupar pelo que a organização **faz de ponta a ponta**, não pelo detalhe
técnico. No leilão de cartas:

| Capacidade | Módulos | O que faz |
|---|---|---|
| **Identidade** | `auth`, `users` | cadastro, login e perfil |
| **Catálogo de Cartas** | `cards`, `card-types` | tipos de carta e cartas em posse do usuário |
| **Leilão** | `auctions`, fechamento, `auction-jobs`, worker | abre, lista, detalha e fecha leilões |
| **Lances** | `bids` | dar lance e listar lances |
| **Tempo Real** | `realtime` (gateway e pub/sub) | eventos de leilão e de lance para o navegador |

O worker não é uma capacidade: é o processo que executa o fechamento, que
pertence ao Leilão.

## 2. Evidência de base

`madge` no Snapshot 0: **88 de 174** dependências cruzam fronteiras de módulo.

Fatos que pesam no agrupamento:

- `bids` depende do leilão apenas para travá-lo e validá-lo; a escrita do lance
  não toca cartas nem usuários além do identificador do apostador.
- `auctions` usa cartas (vínculo e transferência) e usuários (vendedor).
- O fechamento roda no worker e escreve leilão, carta e transferência na mesma
  transação.
- `realtime` é transversal: publica e entrega eventos, mas não guarda dados.
- A autenticação é stateless: o token é verificado com a mesma chave em
  qualquer processo.

## 3. Ordem de extração

1. **Lances** — é a rota de escrita medida e o menor conjunto: depende do
   leilão só para a trava.
2. **Leilão** — leva o controller, o fechamento, a fila e o worker.
3. **Identidade, Catálogo e Tempo Real** — no estado final, com o monólito
   desativado.

A ordem não é a do valor: é a do risco e da possibilidade de medir cada fase.

## 4. Decisão do s1

O serviço de Lances lê a tabela `users` na mesma base para carregar o apostador
no guarda de autenticação. É acoplamento de dados, não de processo, e sai quando
o banco for isolado no estado final. As entidades `Auction`, `Card`, `CardType`
e `User` foram copiadas para o serviço apenas como mapeamento de tabela.
