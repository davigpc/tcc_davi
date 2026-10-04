# 0002 — Fixação da versão do pnpm na imagem

- **Data:** 2026-10-04
- **Status:** Aceita (harmonização de ambiente — Fase 1)
- **Contexto:** Fase 1, build do baseline do `inventory-api`.

## Problema

O `Dockerfile` instalava a **última** versão do pnpm
(`RUN npm install -g pnpm`). Com o pnpm atual (linha 10+/store v11), o build
falhou com:

```
Error: ERR_PNPM_IGNORED_BUILDS
  Ignored build scripts: @nestjs/core, @prisma/client, @prisma/engines,
  @scarf/scarf, bcrypt, prisma, unrs-resolver
```

Causa: o `package.json` declara a allowlist em `pnpm.onlyBuiltDependencies`, mas
o pnpm recente **deixou de ler esse campo** (migrou para `pnpm-workspace.yaml`).
Como o projeto usa o lockfile `lockfileVersion: '9.0'`, a toolchain
correspondente é o pnpm 9.

## Decisão

Fixar o pnpm na série 9 dentro da imagem:

```dockerfile
RUN npm install -g pnpm@9
```

## Justificativa

- O `pnpm-lock.yaml` é `lockfileVersion: '9.0'` → escrito pelo pnpm 9.
- O pnpm 9 respeita `pnpm.onlyBuiltDependencies` do `package.json` e executa os
  scripts de build necessários (Prisma, bcrypt).
- Alteração **mínima e de infraestrutura**, sem tocar no código-fonte de domínio
  → o baseline arquitetural permanece intacto.

## Consequências

- `pnpm prisma generate` já é executado explicitamente após a instalação, então
  a geração do Prisma Client fica garantida.
- Esta edição integra a **harmonização de ambiente da Fase 1** (roteiro §6) e
  deve ser commitada no fork para reprodutibilidade, atualizando o ponteiro do
  submódulo no repositório pai.
- Efeito colateral positivo: build reprodutível independente da deriva da
  toolchain global.
