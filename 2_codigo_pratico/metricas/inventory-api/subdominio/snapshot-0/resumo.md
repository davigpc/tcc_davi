# Resumo — inventory-api / subdominio / snapshot-0

- Tag: snap/inventory-api/subdominio/0
- Coletado em: 2026-10-14T23:20:53.863Z
- Build (media): 57212 ms
- Inicializacao (media): 9847 ms
- LOC total: 8783
- Chamadas entre fronteiras: 69 de 389
- Servicos/containers: 2 / 2

## Desempenho (media; min-max entre parenteses)
| Rota | req/s | p50 | p90 | p99 | non2xx |
|---|---|---|---|---|---|
| products | 564.34 (561.8-567.21) | 34 | 38 | 57 | 0 |
| reports-movements | 382.4 (359.8-398.8) | 50 | 56.67 | 96 | 0 |
| reports-stock | 200.3 (198.5-201.8) | 97.67 | 104.67 | 121 | 0 |
| movements-post | 339.77 (332.9-343.6) | 58 | 63 | 74 | 0 |
