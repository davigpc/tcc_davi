# Resumo — inventory-api / capacidade-negocio / snapshot-1

- Tag: snap/inventory-api/capacidade-negocio/1
- Coletado em: 2026-10-04T23:04:54.917Z
- Build (mediana): 121285 ms
- Inicializacao (mediana): 10631 ms
- LOC total: 9165
- Chamadas entre fronteiras: 73 de 402
- Servicos/containers: 4 / 4

## Desempenho (mediana; min-max entre parenteses)
| Rota | req/s | p50 | p90 | p99 | non2xx |
|---|---|---|---|---|---|
| products | 323.9 (282.5-328.4) | 60 | 71 | 116 | 0 |
| reports-movements | 256.61 (221.3-259) | 74 | 87 | 146 | 0 |
| reports-stock | 131.31 (122.6-160.2) | 145 | 186 | 241 | 0 |
| movements-post | 223.4 (194.3-225.7) | 86 | 101 | 125 | 0 |
