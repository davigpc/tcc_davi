# Resumo — inventory-api / capacidade-negocio / snapshot-0

- Tag: snap/inventory-api/capacidade-negocio/0
- Coletado em: 2026-10-04T20:27:49.684Z
- Build (media): 46746 ms
- Inicializacao (media): 9155 ms
- LOC total: 8783
- Chamadas entre fronteiras: 69 de 389
- Servicos/containers: 2 / 2

## Desempenho (media; min-max entre parenteses)
| Rota | req/s | p50 | p90 | p99 | non2xx |
|---|---|---|---|---|---|
| products | 557.2 (545.9-562.9) | 34.67 | 38.67 | 45 | 0 |
| reports-movements | 350.8 (331.1-360.9) | 55 | 61 | 105.33 | 0 |
| reports-stock | 201.27 (199.1-202.4) | 97.67 | 103.33 | 114 | 0 |
| movements-post | 311.87 (307-318.7) | 63 | 72.33 | 89 | 0 |
