# 0001 — Estratégia de seed dentro do contêiner

- **Data:** 2026-10-04
- **Status:** Aceita
- **Contexto:** Fase 1, baseline do `inventory-api`.

## Problema

O `Dockerfile` do inventory-api, no estágio de produção, executa
`npx prisma migrate deploy && node dist/src/main`. Ele **aplica as migrações, mas
não popula dados**. O `README` sugere `npm run seed`, porém esse script usa
`ts-node` sobre `src/database/seeds/seed.ts`, e a imagem de produção não inclui
`ts-node` nem os arquivos-fonte — ou seja, o fluxo de seed do README **não
funciona dentro do contêiner**.

Além disso, o repositório contém **dois seeds divergentes**:
`prisma/seed.ts` (referenciado por `prisma.seed`, usa `bcrypt`, credenciais
`admin@test.com`/`password123`, 2 produtos) e `src/database/seeds/seed.ts`
(referenciado por `npm run seed`, usa `bcryptjs`, credenciais
`admin@example.com`/`admin123`, 5 produtos e 9 movimentos). O `README` e o
script `npm run seed` apontam para o segundo.

## Decisão

1. Adotar o seed canônico `src/database/seeds/seed.ts` (o do `npm run seed`),
   por ser o indicado na documentação do projeto e por produzir massa de dados
   mais rica (inclui o cenário de alerta de baixo estoque).
2. Executá-lo **dentro do contêiner**, a partir do artefato compilado, sem
   alterar o código-fonte da aplicação:

   ```
   nest build  →  dist/src/database/seeds/seed.js
   docker compose run --rm app node dist/src/database/seeds/seed.js
   ```

   O `nest build` compila `prisma/` e `src/`; o estágio de produção já copia
   `dist/` e as dependências de produção (`@prisma/client`, `bcryptjs`). O
   comando acima reaproveita o `DATABASE_URL` do serviço `app`.

## Justificativa

- **Zero alteração de código-fonte** do monólito → mantém o baseline fiel ao
  upstream.
- **Reprodutível**: não depende de `pnpm`/`ts-node` instalados no host.
- **Determinístico**: o seed é reexecutável (limpa as tabelas antes de inserir),
  o que permite resetar a massa de dados antes de cada medição.

## Consequências

- O comando de seed será encapsulado pelo harness/orquestrador
  (`harness/coleta/run-snapshot`) para garantir o reset antes de cada snapshot.
- A divergência entre `prisma/seed.ts` e `src/database/seeds/seed.ts` fica
  registrada como característica do baseline (não será corrigida para não
  alterar o monólito original).
