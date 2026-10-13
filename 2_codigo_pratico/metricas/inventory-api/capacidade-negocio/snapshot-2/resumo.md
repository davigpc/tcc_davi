# Resumo — inventory-api / capacidade-negocio / snapshot-2

- Tag: snap/inventory-api/capacidade-negocio/2
- Coletado em: 2026-10-13T17:41:58.606Z
- Build (media): 108405 ms
- Inicializacao (media): 13166 ms
- LOC total: 9796
- Chamadas entre fronteiras: 78 de 414
- Servicos/containers: 5 / 5

## Desempenho (media; min-max entre parenteses)
| Rota | req/s | p50 | p90 | p99 | non2xx |
|---|---|---|---|---|---|
| products | 379.43 (346.6-396.7) | 49 | 66 | 98 | 0 |
| reports-movements | 301 (255.6-334.1) | 64 | 89.33 | 138 | 0 |
| reports-stock | 165.2 (149.1-173.9) | 113.67 | 154 | 194 | 0 |
| movements-post | 219.4 (204.5-245.8) | 85 | 115.33 | 192.67 | 0 |
