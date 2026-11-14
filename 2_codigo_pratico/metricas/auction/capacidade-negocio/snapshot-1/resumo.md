# Resumo — auction / capacidade-negocio / snapshot-1

- Tag: (sem tag)
- Coletado em: 2026-11-14T19:44:33.972Z
- Build (media): 82340 ms
- Inicializacao (media): 12843 ms
- LOC total: 3593
- Chamadas entre fronteiras: 109 de 206
- Servicos/containers: 6 / 6

## Desempenho (media; min-max entre parenteses)
| Rota | req/s | p50 | p90 | p99 | non2xx |
|---|---|---|---|---|---|
| auction-by-id | 713.6 (699.6-722.5) | 27 | 29 | 34.67 | 0 |
| auctions | 858.97 (778.1-901.8) | 21.67 | 26 | 34.67 | 0 |
| bids | 152.2 (142.4-161.7) | 6.33 | 12.67 | 14 | 0 |
