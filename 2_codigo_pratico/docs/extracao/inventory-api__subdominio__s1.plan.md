# Pré-registro de Extração — inventory-api / Subdomínio (DDD) / snapshot-1

> Escrito ANTES de mexer no código. Pré-registro: compromete-se com uma
> previsão e permite comparar "previsto × observado" no registro final.

## Identificação
- App: `inventory-api` (sistema crítico / MES)
- Metodologia: Subdomínio (DDD)
- Snapshot: `snapshot-1`
- Data: 2026-10-14

## O que será extraído
- **Contextos genéricos:** `reports` (Relatórios) e a Identidade (`auth` + `users`).
- **Fronteira:** dois serviços em `services/inventory-api/reports/` e
  `services/inventory-api/identity/`. O monólito permanece com
  `warehouses`, `products` e `movements`.

## Por que (fundamentação na metodologia)
Pela classificação de valor estratégico do DDD, `auth/users` e `reports` não
carregam diferencial competitivo: são **contextos genéricos**, candidatos a
componentes de prateleira. Por isso são extraídos primeiro, enquanto o núcleo
(`movements`) e o suporte (`products`/`warehouses`) seguem no monólito até os
snapshots seguintes.

## Como (passos previstos)
1. Extrair `reports` para serviço próprio atrás do NGINX (`/api/reports`).
2. Extrair `auth` + `users` (Identidade) para serviço próprio (`/api/auth`, `/api/users`).
3. Monólito remove ambos os contextos, mantendo guardas JWT locais (stateless).

## Persistência
- **Compartilhada** (PostgreSQL único), conforme o desenho desta trilha nos
  snapshots intermediários: todos os serviços apontam para o mesmo banco.

## Comunicação entre serviços
- Síncrona (HTTP) apenas na borda, via NGINX. No interior não há chamadas
  cruzadas: Identidade valida armazém lendo o **mesmo banco** (sem HTTP).

## Roteamento (Strangler Fig / NGINX)
- Prefixos desviados: `/api/reports` → Relatórios; `/api/auth`, `/api/users` → Identidade.
- Permanece no monólito: `/api/warehouses`, `/api/products`, `/api/movements`, `/docs`.

## Hipótese de resultado (métricas)
- **Agilidade/DevOps:** build e startup sobem (mais imagens/contêineres).
- **Custo/Infra:** +2 serviços e +1 contêiner NGINX elevam RAM/CPU.
- **Desempenho:** a vazão pode cair por causa do salto adicional no proxy.
- **Manutenibilidade:** LOC e componentes sobem; o cross-domain estático varia pouco.
