# Pre-registro de extracao - inventory-api / Transacoes / snapshot-1

## Identificacao
- App: `inventory-api` (sistema critico / MES)
- Metodologia: Decomposicao por Transacoes (ACID)
- Snapshot: 1 (primeira extracao)
- Branch: `exp/inventory-api/transacoes`
- Baseline (codigo): `50fca6d` (Snapshot 0)

## O que sera extraido
O grupo atomico **Estoque**: `warehouses` + `products` + `movements`, para
`services/inventory-api/estoque/`. A invariante "nao e possivel retirar mais do
que ha" (ADR-0006) e o calculo dinamico de estoque (ADR-0008) exigem que a
verificacao de produto/armazem e a escrita do movimento ocorram na mesma
transacao; por isso os tres modulos formam uma unica fronteira.

## Por que (fundamentacao na metodologia)
O criterio de Transacoes define a fronteira pelo que precisa cair na **mesma
transacao**. `Identity` e `Reports` nao participam da invariante: a Identidade
apenas fornece o usuario referenciado pelo movimento, e `Reports` e somente
leitura. Nesta trilha o grupo atomico e extraido **primeiro**, ao contrario da
trilha de Capacidade de Negocio, para observar o custo de proteger a invariante
desde o inicio.

## Como (passos previstos)
1. Remover `warehouses`, `products` e `movements` do monolito, mantendo
   `auth`, `users` e `reports`.
2. Copiar o `MovementTypeMapper` para `reports` (unico acoplamento
   reports -> movements no baseline).
3. Expor `GET /api/internal/users/:id` no monolito para o Estoque validar o
   usuario enquanto a Identidade nao foi extraida.
4. Adicionar a coluna `stock_movements.user_email` (desnormalizacao usada pelo
   servico de Estoque).
5. Subir `Estoque` atras do NGINX, com Strangler Fig por prefixo:
   `/api/warehouses`, `/api/products` e `/api/movements` vao para o novo
   servico; o restante permanece no monolito.

## Persistencia
**Compartilhada** (opcao 1): o servico de Estoque aponta para o mesmo PostgreSQL
do monolito. O comando de `prisma db push` do servico e desativado para nao
alterar o schema do banco compartilhado; as tabelas sao criadas pelas migrations
do monolito.

## Comunicacao entre servicos
O Estoque valida `product` e `warehouse` diretamente no banco compartilhado e o
usuario via HTTP (`/api/internal/users/:id` no monolito). Nao ha chamada
remota no caminho de leitura de estoque.

## Roteamento (Strangler Fig / NGINX)
- `/api/warehouses`, `/api/products`, `/api/movements` -> `estoque`
- `/api/auth`, `/api/users`, `/api/reports`, `/docs` -> monolito
- `/api/internal/*` nao e exposto pelo gateway

## Hipotese de resultado (metricas)
- Tempo de build e componentes sobem (mais uma imagem/container).
- LOC: cai no monolito (remocao de tres contextos) e sobe no total (duplicacao
  de codigo transversal no servico).
- Cross-domain: tende a cair no monolito; a chamada HTTP de validacao de usuario
  nao e capturada pela analise estatica.
- Desempenho: `POST /movements` passa a ter uma chamada remota (usuario) desde o
  s1, diferentemente da trilha de Capacidade, em que a escrita permanece local
  ate o snapshot final.
- Custo de CPU/RAM tende a subir pelo processo adicional e pelo NGINX.
