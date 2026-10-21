# Resumo — inventory-api / transacoes / snapshot-2

- Tag: snap/inventory-api/transacoes/2
- Coletado em: 2026-10-21T20:08:55.029Z
- Build (media): 99791 ms
- Inicializacao (media): 12537 ms
- LOC total: 9856
- Chamadas entre fronteiras: 81 de 419
- Servicos/containers: 5 / 5

## Desempenho (media; min-max entre parenteses)
| Rota | req/s | p50 | p90 | p99 | non2xx |
|---|---|---|---|---|---|
| products | 439.1 (407.8-457.7) | 43.67 | 50.33 | 84.33 | 0 |
| reports-movements | 315.14 (305.3-320.11) | 60.33 | 69 | 118 | 0 |
| reports-stock | 184.9 (183.3-187.4) | 106.33 | 111.67 | 119 | 0 |
| movements-post | 316.84 (289.3-349.6) | 61 | 70.33 | 82.67 | 0 |
