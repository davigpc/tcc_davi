# Pre-registro de extracao - inventory-api / Transacoes / snapshot-2

## Identificacao
- App: `inventory-api` (sistema critico / MES)
- Metodologia: Decomposicao por Transacoes (ACID)
- Snapshot: 2 (segunda extracao)
- Branch: `exp/inventory-api/transacoes`
- Snapshot anterior: `snap/inventory-api/transacoes/1`

## O que sera extraido
A **Identidade** (`auth` + `users`) para `services/inventory-api/identity/`.
O monolito passa a conter apenas o modulo de `reports`, com guardas JWT locais
(autenticacao stateless). O grupo atomico de Estoque ja foi extraido no s1 e
permanece inalterado.

## Por que (fundamentacao na metodologia)
A Identidade nao participa da invariante transacional do estoque. Ela fornece o
usuario referenciado pelo movimento, mas a verificacao de produto/armazem e a
escrita do movimento continuam no servico de Estoque. Extrair a Identidade neste
ponto remove a ultima responsabilidade de escrita do monolito sem tocar na
fronteira ACID.

## Como (passos previstos)
1. Remover `src/users` e os endpoints de login/refresh do monolito; manter
   apenas guardas e estrategia JWT locais.
2. Subir o servico de Identidade atras do NGINX:
   `/api/auth` e `/api/users` passam a ser roteados para `identity`.
3. O Estoque deixa de validar usuario no monolito e passa a consultar
   `/api/internal/users/:id` da Identidade.
4. Manter persistencia compartilhada (`db push` desativado nos servicos).

## Persistencia
Compartilhada (opcao 1): `identity` e `estoque` apontam para o mesmo PostgreSQL
do monolito; as tabelas vem das migrations do monolito.

## Comunicacao entre servicos
- Estoque -> Identidade: `GET /api/internal/users/:id` (validacao de usuario).
- Identidade -> Estoque: `GET /api/internal/warehouses/:id` (validacao de
  armazem no cadastro de usuario).
- Reports (no monolito) le o banco compartilhado diretamente.

## Roteamento (Strangler Fig / NGINX)
- `/api/auth`, `/api/users` -> `identity`
- `/api/warehouses`, `/api/products`, `/api/movements` -> `estoque`
- `/api/reports`, `/docs` -> monolito
- `/api/internal/*` nao e exposto pelo gateway

## Hipotese de resultado (metricas)
- Build e componentes sobem (mais uma imagem/container).
- LOC total cresce pela duplicacao de codigo transversal; o monolito reduz.
- O caminho de escrita continua com uma chamada remota (usuario), agora entre
  Estoque e Identidade.
- Custo de CPU/RAM sobe pelo processo adicional.
