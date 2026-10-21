# Pre-registro de extracao - inventory-api / Transacoes / snapshot-final

## Identificacao
- App: `inventory-api` (sistema critico / MES)
- Metodologia: Decomposicao por Transacoes (ACID)
- Snapshot: final (decomposicao concluida)
- Branch: `exp/inventory-api/transacoes`
- Snapshot anterior: `snap/inventory-api/transacoes/2`

## O que sera extraido
O modulo de **Relatorios** (`reports`) deixa o monolito e passa a rodar como
servico somente leitura, sem banco proprio, consultando o servico de Estoque
pela API interna. O monolito e desativado. Topologia final: `identity` +
`estoque` + `reports`, com persistencia isolada (um banco para a Identidade e um
para o Estoque) e gateway NGINX na borda.

## Por que (fundamentacao na metodologia)
Relatorios nao participa de nenhuma invariante transacional: e somente leitura.
Depois de o grupo atomico (s1) e a Identidade (s2) terem sido extraidos, resta
apenas a leitura agregada. A separacao final permite isolar os bancos de escrita
(Identidade e Estoque) sem quebrar a consistencia do estoque, que permanece
inteiramente dentro do servico de Estoque.

## Como (passos previstos)
1. Reaproveitar os servicos finais da trilha de Capacidade de Negocio
   (`identity`, `estoque`, `reports`) sem alteracao de codigo.
2. Subir dois PostgreSQL dedicados (`inventory_identity`, `inventory_estoque`).
3. Semear a Identidade e o Estoque com os seeds deterministicos de cada servico.
4. NGINX roteia `/api/auth` e `/api/users` para a Identidade, as rotas de
   estoque para o Estoque e `/api/reports` para os Relatorios.

## Persistencia
Isolada: um banco por servico de escrita. `reports` nao tem banco e le do
Estoque via HTTP (`/api/internal/*`).

## Comunicacao entre servicos
- Estoque -> Identidade: validacao do usuario no registro de movimento.
- Identidade -> Estoque: validacao do armazem no cadastro de usuario.
- Reports -> Estoque: leitura de armazens, produtos e movimentos.

## Roteamento (Strangler Fig / NGINX)
- `/api/auth`, `/api/users` -> `identity`
- `/api/warehouses`, `/api/products`, `/api/movements` -> `estoque`
- `/api/reports`, `/docs` -> `reports` / `estoque`
- `/api/internal/*` nao e exposto pelo gateway

## Hipotese de resultado (metricas)
- Build sobe pela construcao de tres imagens e dois bancos.
- Componentes/containers chegam a 6.
- LOC total cai em relacao ao s2 (monolito deixa de compor a solucao), mas
  permanece acima do baseline.
- O estado final deve convergir para a mesma topologia e numeros proximos aos da
  trilha de Capacidade de Negocio; a diferenca desta trilha esta na trajetoria
  (grupo atomico extraido primeiro).
