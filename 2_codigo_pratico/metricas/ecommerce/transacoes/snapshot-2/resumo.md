# Resumo — ecommerce / transacoes / snapshot-2

- Tag: (sem tag)
- Coletado em: 2026-11-12T17:54:58.360Z
- Build (media): 129214 ms
- Inicializacao (media): 8659 ms
- LOC total: 5263
- Chamadas entre fronteiras: 71 de 197
- Servicos/containers: 6 / 6

## Desempenho (media; min-max entre parenteses)
| Rota | req/s | p50 | p90 | p99 | non2xx |
|---|---|---|---|---|---|
| product-by-id | 2899.4 (2888.8-2905.2) | 7 | 13.33 | 18 | 0 |
| products | 2854.97 (2693.9-2987.2) | 6.67 | 13.67 | 17 | 0 |
| orders | 520.07 (477.7-558.1) | 37.67 | 48.33 | 64 | 0 |
| webhook | 91.2 (85.6-94.8) | 10 | 12.33 | 15.67 | 0 |
