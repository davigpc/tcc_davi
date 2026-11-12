# Resumo — ecommerce / transacoes / snapshot-final

- Tag: (sem tag)
- Coletado em: 2026-11-12T18:09:13.395Z
- Build (media): 84658 ms
- Inicializacao (media): 8366 ms
- LOC total: 5004
- Chamadas entre fronteiras: 71 de 193
- Servicos/containers: 9 / 9

## Desempenho (media; min-max entre parenteses)
| Rota | req/s | p50 | p90 | p99 | non2xx |
|---|---|---|---|---|---|
| product-by-id | 3104.47 (3082-3119) | 6 | 13 | 15.33 | 0 |
| products | 2927.47 (2788.8-3021.4) | 6.33 | 13 | 15.67 | 0 |
| orders | 507.37 (426-563.6) | 38.33 | 47.33 | 61.33 | 0 |
| webhook | 77.13 (72.3-80.3) | 12 | 14.33 | 18 | 0 |
