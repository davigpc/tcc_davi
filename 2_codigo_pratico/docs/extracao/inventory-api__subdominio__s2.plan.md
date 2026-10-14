# Pré-registro de Extração — inventory-api / Subdomínio (DDD) / snapshot-2

> Escrito ANTES de mexer no código.

## Identificação
- App: `inventory-api` · Metodologia: Subdomínio (DDD) · Snapshot: `snapshot-2` · Data: 2026-10-14

## O que será extraído
- **Contexto de suporte:** `products` + `warehouses` → serviço
  `services/inventory-api/support/`.
- O monólito permanece apenas com o **núcleo** `movements`.

## Por que (fundamentação)
`products` e `warehouses` são domínios de suporte: necessários, mas sem o
diferencial competitivo. Extraí-los isola o núcleo (`movements`) no monólito,
que será o último a sair.

## Como (passos previstos)
1. Serviço de Suporte com os contextos de armazéns e produtos.
2. Monólito remove os módulos `products`/`warehouses`; como o módulo `movements`
   acessa produtos/armazéns via Prisma, ele continua funcionando no banco
   **compartilhado** (sem chamada de rede nesta fase).
3. Roteamento `/api/products`, `/api/warehouses` → Suporte.

## Persistência
- **Compartilhada** (PostgreSQL único). Sem `prisma db push`: o schema é gerido
  pelo monólito.

## Comunicação entre serviços
- Nenhuma chamada interna: o núcleo lê produtos/armazéns do mesmo banco.

## Roteamento (Strangler Fig / NGINX)
- Desviados: `/api/products`, `/api/warehouses` → Suporte (somam-se a
  `/api/auth|users` → Identidade e `/api/reports` → Relatórios).
- Monólito: `/api/movements`, `/docs`.

## Hipótese de resultado (métricas)
- **Agilidade:** build sobe (mais uma imagem). **Custo:** +1 serviço/contêiner.
- **Desempenho:** estável — não há chamada de rede nova (DB compartilhado).
- **Manutenibilidade:** LOC sobe (duplicação de scaffold); componentes 4 → 5+.
