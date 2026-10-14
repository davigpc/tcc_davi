# Diário de Execução — inventory-api / Subdomínio (DDD)

> Um arquivo por trilha. Consolida hipótese, decisões, snapshots e observações.
> É o rascunho direto da seção correspondente do capítulo 05.

## Identificação
- App: `inventory-api` (papel no TCC: sistema crítico / MES)
- Metodologia: Subdomínio (DDD)
- Branch: `exp/inventory-api/subdominio`
- Baseline (código): `50fca6dbb4ad4d8db157bb89e224a2703ad81632` (upstream `338b0d7` + pin do build)

## Hipótese de decomposição
Em `roteiro.md` §4.1, o Subdomínio prevê a classificação por valor estratégico:
- **Núcleo (core):** `movements` — a invariante de estoque e o cálculo dinâmico.
- **Suporte:** `products`, `warehouses`.
- **Genéricos:** Identidade (`auth` + `users`) e `reports`.

Sequência de extração: genéricos primeiro (menor valor e menor risco), depois o
suporte e, por fim, o núcleo — invertendo a ordem da Capacidade de Negócio.

## Snapshots

### snapshot-0 (baseline monolítico)
- Pasta: `metricas/inventory-api/subdominio/snapshot-0/`
- Tag: `snap/inventory-api/subdominio/0`
- Submódulo: `50fca6d`.

**Resultados (média de 3 repetições):**

| Dimensão | Métrica | Valor |
|---|---|---|
| Agilidade | Tempo de build (`--no-cache`) | 57.212 ms (≈ 57,2 s) |
| Agilidade | Tempo de inicialização | 9.847 ms (≈ 9,8 s) |
| Manutenibilidade | LOC (TypeScript) | 8.783 linhas |
| Manutenibilidade | Componentes / contêineres | 2 serviços / 2 containers |
| Manutenibilidade | Chamadas entre fronteiras | 69 de 389 |

### snapshot-1 (contextos genéricos: reports + identity)
- Pasta: `metricas/inventory-api/subdominio/snapshot-1/`
- Tag: `snap/inventory-api/subdominio/1`
- Submódulo: `10551ef`.
- Pré-registro: `docs/extracao/inventory-api__subdominio__s1.plan.md`
- Registro: `docs/extracao/inventory-api__subdominio__s1.md`

**Resultados (média de 3 repetições):**

| Dimensão | Métrica | s0 | s1 |
|---|---|---|---|
| Agilidade | Build | 57.212 ms | 108.628 ms |
| Agilidade | Inicialização | 9.847 ms | 10.056 ms |
| Manutenibilidade | LOC | 8.783 | 9.796 |
| Manutenibilidade | Componentes / contêineres | 2 / 2 | 5 / 5 |
| Manutenibilidade | Chamadas entre fronteiras | 69/389 | 78/414 |

**Observações:**
- A s1 do subdomínio coincide, em topologia e números, com a s2 da trilha de
  Capacidade (LOC 9.796, cross 78/414) — confirmação de que o efeito medido é
  estrutural, não da metodologia, nesta etapa.
- Persistência **compartilhada** (um PostgreSQL), sem comunicação interserviços.

## Pendências
- snapshots s2 (suporte: `products` + `warehouses`) e final (núcleo: `movements`,
  persistência isolada, monólito desativado).
- Seções "Aprendizado sobre decomposição" dos registros: a preencher pelo autor.
