# Resumo — ecommerce / transacoes / snapshot-1

- Tag: (sem tag)
- Coletado em: 2026-11-12T17:39:53.226Z
- Build (media): 120345 ms
- Inicializacao (media): 8578 ms
- LOC total: 4938
- Chamadas entre fronteiras: 72 de 196
- Servicos/containers: 5 / 5

## Desempenho (media; min-max entre parenteses)
| Rota | req/s | p50 | p90 | p99 | non2xx |
|---|---|---|---|---|---|
| product-by-id | 2854.13 (2845.4-2861.2) | 7 | 14 | 17.33 | 0 |
| products | 2702.13 (2554.6-2781.4) | 7 | 14 | 16.33 | 0 |
| orders | 517.67 (462.2-553.21) | 38 | 48.67 | 62 | 0 |
| webhook | 75.57 (46.7-92) | 13.33 | 17.67 | 21.33 | 0 |
