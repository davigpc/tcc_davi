# Resumo — inventory-api / subdominio / snapshot-2

- Tag: snap/inventory-api/subdominio/2
- Coletado em: 2026-10-14T23:45:09.558Z
- Build (media): 103700 ms
- Inicializacao (media): 9626 ms
- LOC total: 10310
- Chamadas entre fronteiras: 85 de 429
- Servicos/containers: 6 / 6

## Desempenho (media; min-max entre parenteses)
| Rota | req/s | p50 | p90 | p99 | non2xx |
|---|---|---|---|---|---|
| products | 426.2 (408.2-440.2) | 45 | 50.33 | 85.67 | 0 |
| reports-movements | 322.87 (305.9-332.8) | 59 | 66.67 | 115 | 0 |
| reports-stock | 184.6 (183.9-185) | 106.33 | 111.67 | 120.67 | 0 |
| movements-post | 282.3 (265.4-291.61) | 70 | 78 | 92.33 | 0 |
