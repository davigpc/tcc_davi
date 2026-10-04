# Resumo — inventory-api / capacidade-negocio / snapshot-0

- Tag: snap/inventory-api/capacidade-negocio/0
- Coletado em: 2026-10-04T20:27:49.684Z
- Build (mediana): 42549 ms
- Inicializacao (mediana): 8841 ms
- LOC total: 8783
- Chamadas entre fronteiras: 69 de 389
- Servicos/containers: 2 / 2

## Desempenho (mediana; min-max entre parenteses)
| Rota | req/s | p50 | p90 | p99 | non2xx |
|---|---|---|---|---|---|
| products | 562.8 (545.9-562.9) | 34 | 38 | 45 | 0 |
| reports-movements | 360.4 (331.1-360.9) | 54 | 58 | 102 | 0 |
| reports-stock | 202.3 (199.1-202.4) | 97 | 102 | 117 | 0 |
| movements-post | 309.9 (307-318.7) | 63 | 72 | 88 | 0 |
