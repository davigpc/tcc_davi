# Código Prático do TCC - Decomposição de Monólitos em Microsserviços

Este diretório contém os artefatos de engenharia do Trabalho de Conclusão de Curso (TCC), que conduz um estudo comparativo **3 × 3**: três aplicações monolíticas decompostas por três metodologias (Capacidade de Negócio, Subdomínio/DDD e Transações), sempre via **Strangler Fig**.

O planejamento completo está em [`roteiro.md`](./roteiro.md).

---

## Estrutura

```
2_codigo_pratico/
├── roteiro.md            # Plano de execução da parte prática
├── README.md             # Este arquivo
├── .gitmodules           # Submódulos dos 3 aplicativos
├── apps/                 # Aplicações (submódulos git)
│   ├── inventory-api/    # Sistema de Inventário (crítico / MES)
│   ├── auction/          # Leilões (alta performance / concorrência)
│   └── ecommerce/        # E-commerce (transacional / CRUD)
├── infra/                # Scripts e configuração de infraestrutura
├── _archive/             # Esqueletos antigos (fora do escopo ativo)
└── metricas/             # (a criar) dados brutos por app/metodologia/snapshot
```

> As pastas `_archive/monolito/` e `_archive/microsservicos/` contêm esqueletos antigos
> (catalog/cart/order) que **não** fazem parte do escopo atual. Foram preservados apenas
> para referência histórica.

---

## Aplicações (Snapshot 0)

Cada aplicação é um **fork** do respectivo repositório open-source e está versionada como
submódulo git, fixada em um commit específico do baseline.

| App | Fork | Stack | Banco(s) |
|---|---|---|---|
| `inventory-api` | [davigpc/inventory-api](https://github.com/davigpc/inventory-api) | NestJS 11 + Prisma (hexagonal + DDD) | PostgreSQL 15 |
| `auction` | [davigpc/auction](https://github.com/davigpc/auction) | NestJS 11 + TypeORM + BullMQ + Socket.IO | PostgreSQL 16 + Redis 7 |
| `ecommerce` | [davigpc/nestjs-ecommerce](https://github.com/davigpc/nestjs-ecommerce) | NestJS 10 + Mongoose | MongoDB + Redis |

### Clonando com os submódulos

```bash
git clone --recurse-submodules <url-do-repositorio>
# ou, se já clonou:
git submodule update --init --recursive
```

### Atualizando os submódulos para o baseline fixado

```bash
git submodule update --init --recursive
```

---

## Como executar cada baseline

### inventory-api
```bash
cd apps/inventory-api
cp .env.example .env        # preencher variáveis
docker compose up -d
npm install && npx prisma migrate deploy && npm run seed
# API: http://localhost:3000/api  |  Swagger: http://localhost:3000/docs
```

### auction
```bash
cd apps/auction
cp .env.example .env
docker compose up -d postgres redis
docker compose build api worker frontend
docker compose exec postgres psql -U auction -d auction -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
docker compose run --rm api npm run migration:run
docker compose run --rm api npm run seed:local
docker compose up
# API: http://localhost:3000 (Swagger /docs) | Front: http://localhost:3001 | Adminer: http://localhost:8080
```

### ecommerce
```bash
cd apps/ecommerce
cp .example.env .env        # ajustar para serviços locais (ver roteiro, seção 5)
docker compose -f docker-compose.dev.yml up --build
# API: http://localhost:3001  |  Swagger: http://localhost:3001/api/docs
```

> **Pendência:** o e-commerce ainda depende de serviços de nuvem (MongoDB Atlas, Redis
> externo, Stripe, S3, OAuth/SMTP). A poda e a substituição por equivalentes locais estão
> descritas na seção 5 do [`roteiro.md`](./roteiro.md) e devem ser concluídas na Fase 1.

---

## Observações de baseline

- O fork do e-commerce possui um commit adicional ao upstream que **remove um arquivo vazio
  com nome `:`** (inválido em Windows) em `src/modules/verification/controllers/`.
- Os forks `inventory-api` e `auction` não foram alterados em relação ao upstream.
