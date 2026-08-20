# Código Prático do TCC - Microsserviços vs. Monólito

Este repositório contém o código prático comparativo do Trabalho de Conclusão de Curso (TCC), organizado em duas pastas principais e autônomas dentro de `2_codigo_pratico`:

```
2_codigo_pratico/
├── microsservicos/   # Arquitetura de Microsserviços Distribuídos
└── monolito/         # Arquitetura Monolítica Equivalente
```

---

## 1. Arquitetura de Microsserviços (`/microsservicos`)

Estrutura autônoma com serviços desacoplados e 3 bancos de dados distintos (MongoDB, Redis, PostgreSQL):

- **Catalog Service**: Node.js + Express + MongoDB (Porta `3001`)
- **Cart Service**: Node.js + Express + Redis (Porta `3002`)
- **Order Service**: Node.js + Express + PostgreSQL (Porta `3003`)
- **Frontend/BFF**: Next.js App (Porta `3000`)

### Como Executar os Microsserviços:
```bash
# 1. Iniciar contêineres dos microsserviços e bancos de dados:
cd 2_codigo_pratico/microsservicos/infra
docker compose up -d --build

# 2. Em outro terminal, rodar o frontend Next.js:
cd 2_codigo_pratico/microsservicos/src/frontend
npm run dev
```

---

## 2. Arquitetura Monolítica (`/monolito`)

Estrutura autônoma unificando os 3 domínios em um único servidor e um único banco de dados relacional:

- **Monolith Service (Backend)**: Node.js + Express unificando Catálogo, Carrinho e Pedidos (Porta `8000`)
- **Banco de Dados Único**: PostgreSQL `monolith_db` com todas as tabelas (`products`, `cart_items`, `orders`, `payments`) (Porta `5433`)
- **Frontend**: Next.js App (Porta `4000`)

### Como Executar o Monólito:
```bash
# 1. Iniciar contêineres do Monólito e do PostgreSQL unificado:
cd 2_codigo_pratico/monolito/infra
docker compose up -d --build

# 2. Executar testes automatizados do Monólito:
cd 2_codigo_pratico/monolito/src/backend
npm test

# 3. Em outro terminal, rodar o frontend do Monólito:
cd 2_codigo_pratico/monolito/src/frontend
npm run dev
```

---

## Comparativo Estrutural de Arquivos

```
2_codigo_pratico/
├── microsservicos/
│   ├── infra/
│   │   ├── docker-compose.yml
│   │   └── scripts/
│   │       ├── init-mongo.js
│   │       └── init-postgres.sql
│   └── src/
│       ├── frontend/
│       └── services/
│           ├── catalog-service/
│           ├── cart-service/
│           └── order-service/
│
└── monolito/
    ├── infra/
    │   ├── docker-compose.yml
    │   └── scripts/
    │       └── init-postgres.sql
    └── src/
        ├── frontend/
        └── backend/
            ├── package.json
            ├── Dockerfile
            ├── src/
            │   ├── index.js
            │   ├── config/db.js
            │   └── modules/
            │       ├── catalog.js
            │       ├── cart.js
            │       └── orders.js
            └── test/
                └── monolith.test.js
```
