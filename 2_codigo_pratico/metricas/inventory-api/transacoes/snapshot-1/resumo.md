# Resumo — inventory-api / transacoes / snapshot-1

- Tag: snap/inventory-api/transacoes/1
- Coletado em: 2026-10-21T19:57:16.940Z
- Build (media): 75321 ms
- Inicializacao (media): 9788 ms
- LOC total: 9431
- Chamadas entre fronteiras: 77 de 408
- Servicos/containers: 4 / 4

## Desempenho (media; min-max entre parenteses)
| Rota | req/s | p50 | p90 | p99 | non2xx |
|---|---|---|---|---|---|
| products | 468.63 (411.9-516) | 41.33 | 48.33 | 67.33 | 0 |
| reports-movements | 339.27 (329.6-344.8) | 55.67 | 63.67 | 109 | 0 |
| reports-stock | 195.97 (195.2-196.5) | 100.33 | 105.67 | 114.33 | 0 |
| movements-post | 314.1 (282-343.7) | 62.33 | 71.33 | 91 | 0 |
