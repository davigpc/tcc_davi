# Registro de Extração — inventory-api / Subdomínio (DDD) / snapshot-2

> Escrito DEPOIS da extração.

## O que foi feito (narrativa)
Foi extraído o **contexto de suporte**: os armazéns e os produtos passaram a
compor o serviço `support`. No DDD, esses domínios são classificados como
suporte — necessários ao funcionamento, mas sem o diferencial competitivo do
negócio. Após esta extração, o monólito ficou reduzido ao **núcleo**
(`movements`).

Como a persistência permanece **compartilhada**, não houve comunicação entre
serviços: o módulo de movimentações acessa as tabelas de produtos e armazéns
diretamente no mesmo banco. Este é o ponto que a etapa final mudará.

## Previsto × realizado
- O que seguiu o plano: extração do suporte, roteamento pelo NGINX,
  persistência compartilhada, sem chamadas de rede internas.
- O que mudou e por quê: nada relevante.

## Procedimento (sequência de commits)
```
exp(inventory/subdominio/s2): remove products e warehouses do monolito (movements permanece no nucleo)
exp(inventory/subdominio/s2): servico de suporte, gateway, compose e config
```

## Evidência automática
- Acoplamento antes/depois (madge): 78/414 → 85/429.
- LOC TypeScript: 9.796 → 10.310.
- Componentes/contêineres: 5/5 → 6/6.

## Aprendizado sobre decomposição
[A preencher pelo autor]

## Impacto observado nas métricas
| Métrica | s0 | s1 | s2 |
|---|---|---|---|
| Build (média) | 57.212 ms | 108.628 ms | 103.700 ms |
| Inicialização (média) | 9.847 ms | 10.056 ms | 9.626 ms |
| LOC | 8.783 | 9.796 | 10.310 |
| Componentes / contêineres | 2 / 2 | 5 / 5 | 6 / 6 |
| Chamadas entre fronteiras | 69/389 | 78/414 | 85/429 |
