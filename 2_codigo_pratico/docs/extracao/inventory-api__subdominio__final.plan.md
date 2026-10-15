# Pré-registro de Extração — inventory-api / Subdomínio (DDD) / snapshot-final

> Escrito ANTES de finalizar o código.

## Identificação
- App: `inventory-api` · Metodologia: Subdomínio (DDD) · Snapshot: `snapshot-final` · Data: 2026-10-14

## O que será extraído
- **Contexto núcleo:** `movements` → serviço `services/inventory-api/movements/`.
- O monólito é **desativado**. O serviço de Suporte (`support`) passa a ter banco
  próprio; Relatórios continua sem banco.

## Persistência (decisão)
**Banco por serviço (isolada)**: `inventory_identity` (users),
`inventory_support` (warehouses, products), `inventory_movements`
(stock_movements). Sem integridade referencial; IDs fixos nos seeds e
`user_email` denormalizado nos movimentos.

## Comunicação entre serviços (anticorrupção HTTP)
- Movimentações → Suporte: valida produto e armazém.
- Movimentações → Identidade: valida usuário (papel e armazém).
- Suporte → Movimentações: verifica se um produto possui movimentos (regra de exclusão).
- Relatórios → Suporte (armazéns, produtos) e → Movimentações (movimentos).
- `/api/internal/*` não expostos pelo NGINX.

## Roteamento (Strangler Fig / NGINX)
- `/api/auth|users` → Identidade; `/api/products|warehouses` → Suporte;
  `/api/movements` → Movimentações; `/api/reports` → Relatórios.

## Hipótese de resultado (métricas)
- **Agilidade:** build sobe (4 imagens). **Custo:** +1 banco dedicado.
- **Desempenho:** a cascata de validação HTTP (movimento→produto/armazém/usuário)
  deve piorar a latência da escrita e reduzir a vazão.
- **Manutenibilidade:** LOC cai (monólito aposentado); o cross-domain estático não
  captura o acoplamento de rede introduzido.
