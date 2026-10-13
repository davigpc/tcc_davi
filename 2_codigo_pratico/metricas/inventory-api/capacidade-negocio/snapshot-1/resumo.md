# Resumo — inventory-api / capacidade-negocio / snapshot-1

- Tag: snap/inventory-api/capacidade-negocio/1
- Coletado em: 2026-10-04T23:04:54.917Z
- Build (media): 116353 ms
- Inicializacao (media): 10594 ms
- LOC total: 9165
- Chamadas entre fronteiras: 73 de 402
- Servicos/containers: 4 / 4

## Desempenho (media; min-max entre parenteses)
| Rota | req/s | p50 | p90 | p99 | non2xx |
|---|---|---|---|---|---|
| products | 311.6 (282.5-328.4) | 61.67 | 75 | 111.33 | 0 |
| reports-movements | 245.64 (221.3-259) | 77.67 | 90.33 | 154 | 0 |
| reports-stock | 138.04 (122.6-160.2) | 141 | 176.33 | 224.67 | 0 |
| movements-post | 214.47 (194.3-225.7) | 90.33 | 105.67 | 145.67 | 0 |
