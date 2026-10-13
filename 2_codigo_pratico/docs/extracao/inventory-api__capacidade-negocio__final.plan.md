# Pré-registro de Extração — inventory-api / Capacidade de Negócio / snapshot-final

> Registro do desenho definido para a extração final (antes de finalizar o
> código). Permite comparar "previsto × observado" no registro.

## Identificação
- App: `inventory-api` (sistema crítico / MES)
- Metodologia: Capacidade de Negócio
- Snapshot: `snapshot-final` (decomposição concluída)
- Data: 2026-10-13

## O que será extraído
- **Capacidade:** Controle de Estoque — `warehouses` + `products` + `movements`.
- **Fronteira:** serviço `services/inventory-api/estoque/`. O monólito é
  desativado (não sobe na topologia final).

## Persistência (decisão)
**Banco por serviço (isolada)**, conforme o cap. 04:
- `inventory_identity` (tabela `users`) → Identidade.
- `inventory_estoque` (`warehouses`, `products`, `stock_movements`) → Estoque.
- Relatórios sem banco (consulta o Estoque por HTTP).

Sem integridade referencial entre bancos: identificadores fixos nos seeds e
denormalização de `user_email` nos movimentos.

## Comunicação entre serviços (anticorrupção HTTP)
- Identidade → Estoque: valida armazém ao criar/editar usuário.
- Estoque → Identidade: valida usuário ao registrar movimento.
- Relatórios → Estoque: lê `warehouses`/`products`/`movements` e agrega.
- Endpoints `/api/internal/*` não expostos pelo NGINX.

## Roteamento (Strangler Fig / NGINX)
- `/api/auth|users` → Identidade; `/api/warehouses|products|movements` → Estoque;
  `/api/reports` → Relatórios; `/docs` → Estoque; resto 404.

## Hipótese de resultado (métricas)
- **Agilidade:** build sobe (4 imagens); startup estável.
- **Custo:** +1 banco dedicado e +1 serviço elevam RAM/CPU.
- **Desempenho:** a cascata HTTP deveria **piorar** a latência e reduzir a vazão
  (hipótese herdada do s1).
- **Manutenibilidade:** LOC cai (monólito aposentado), componentes sobem; o
  cross-domain estático não captura o acoplamento de rede introduzido.
