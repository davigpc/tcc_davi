# Identificação de Domínios — e-commerce (lente de Transações)

Documento de apoio para o capítulo 05. Registra a lente de **Transações**
aplicada ao `ecommerce`: o critério, o agrupamento, a evidência que o sustenta e
as divergências em relação ao previsto no roteiro.

Complementa `identificacao-dominios-ecommerce.md` (lente de Capacidade de
Negócio) e `subdominio-ecommerce.md` (lente de Subdomínio).

## 1. Critério

O agrupamento parte do que precisa ser **gravado de forma individual**. Um grupo
vai para o mesmo serviço quando a escrita de um dado depende da escrita de outro
para manter uma invariante.

No e-commerce, a operação que precisa ser atômica é a confirmação do pedido: o
`processOrder` muda o status do pedido e baixa o estoque dos itens. Se as duas
escritas não acontecem juntas, um pedido pode ficar pago sem baixa ou com baixa
parcial.

## 2. Evidência de base

Mesmo `snapshot-0` das trilhas anteriores: `madge` registra **79 de 207**
dependências cruzando fronteiras de módulo. Fatos que pesam na classificação:

- `processOrder` abre uma **sessão Mongo** e escreve status e estoque na mesma
  transação (`order.service.ts` e `inventory.service.ts` do baseline).
- `inventory` não tem rota: existe só como serviço chamado pelo pedido.
- `stripe` cria a intenção de pagamento dentro do checkout e o webhook move o
  pedido; o pagamento não tem vida própria fora dessa transação.
- `shipping` é um conjunto de enums e DTOs usados pelo carrinho.
- `email` é chamado depois do commit, fora da transação.

## 3. Agrupamento

| Grupo | Módulos | Justificativa transacional |
|---|---|---|
| **Checkout** | `cart`, `shipping`, `order`, `inventory`, `stripe` | Status do pedido e baixa de estoque precisam ser gravados juntos |
| **Catálogo** | `product`, `search`, `storages` | Leitura de catálogo; a escrita de produto não participa da transação do pedido |
| **Identidade** | `auth`, `token`, `user`, `address` | Cadastro e autenticação; nenhuma escrita transacional com o pedido |
| **Comunicação** | `email` | Aviso posterior ao commit, fora da transação |

O grupo é o mesmo da trilha de Capacidade de Negócio (Vendas), mas por outro
motivo: lá, carrinho e checkout formam o mesmo processo; aqui, formam a mesma
transação.

## 4. Ordem de extração

Oposto ao das outras duas trilhas: o **grupo atômico sai primeiro**.

1. **Checkout** — preserva a transação em um único processo desde o início.
   Enquanto o banco é compartilhado, a baixa de estoque continua na mesma sessão
   Mongo do pedido.
2. **Catálogo** — leitura. Nesta fase, o estoque continua na coleção
   compartilhada; a escrita transacional passa a atravessar a fronteira do
   serviço, mas ainda na mesma base.
3. **Identidade + Comunicação** — o monólito é desativado e os bancos são
   isolados. O contador de estoque passa a viver no Checkout, em uma coleção
   própria, para que a baixa continue na mesma transação do pedido. O Catálogo
   mantém uma cópia de leitura para exibir `stock`.

## 5. Decisões de fronteira

**O estoque vai para o Checkout no estado final.** É a consequência direta do
critério: se a invariante é "pedido pago implica baixa", o contador precisa estar
no mesmo banco do pedido. O Catálogo continua dono dos dados do produto; o campo
`stock` que ele exibe é uma projeção, atualizada depois do commit.

**A validação de saldo não existe no app.** O `$inc` do baseline não confere se
há quantidade disponível, então o estoque pode ficar negativo. A trilha não
introduz essa validação: ela mede a atomicidade entre status e baixa, não a
política de estoque.

**O pagamento fica no Checkout.** Extrair `stripe` criaria uma transação
distribuída que o sistema não tem.

## 6. Rastreabilidade

- Evidência de acoplamento: `metricas/ecommerce/transacoes/snapshot-0/`.
- Pré-registro do s1: `docs/extracao/ecommerce__transacoes__s1.plan.md`.
- Trilha de referência da metodologia: `exp/inventory-api/transacoes`.
