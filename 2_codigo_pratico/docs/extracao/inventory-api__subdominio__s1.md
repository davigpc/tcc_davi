# Registro de Extração — inventory-api / Subdomínio (DDD) / snapshot-1

> Escrito DEPOIS da extração. Combina narrativa manual + evidência automática.

## O que foi feito (narrativa)
Foram extraídos os dois **contextos genéricos** da classificação DDD: os
Relatórios (`reports`) e a Identidade (`auth` + `users`). Pela ótica por
subdomínio, nenhum dos dois carrega o diferencial competitivo do sistema — são
comodidades que poderiam ser substituídas por componentes prontos. Por isso são
os primeiros a sair do monólito.

O monólito permaneceu como um monólito modular com os contextos **núcleo**
(`movements`) e **suporte** (`products`, `warehouses`). A persistência seguiu
**compartilhada**: os três processos apontam para o mesmo PostgreSQL.

## Previsto × realizado
- O que seguiu o plano: extração dos dois contextos genéricos, roteamento
  Strangler Fig por prefixo, persistência compartilhada, sem comunicação
  interserviços no interior.
- O que mudou e por quê: nada relevante. A topologia da s1 do subdomínio
  coincide, por construção, com a s2 da trilha de Capacidade (lá Relatórios e
  Identidade foram extraídos em passos separados; aqui, juntos, pois ambos são
  genéricos).

## Procedimento (sequência de commits)
```
exp(inventory/subdominio/s1): servicos genericos (reports + identity), gateway e compose
```

## Evidência automática
- Acoplamento antes/depois (madge): 69/389 → 78/414.
- LOC TypeScript: 8.783 → 9.796.
- Componentes/contêineres: 2/2 → 5/5.

## Aprendizado sobre decomposição
(o que esta extração ensinou — acoplamentos revelados, dores transacionais, etc.)
[A preencher pelo autor]

## Impacto observado nas métricas
| Métrica | s0 | s1 |
|---|---|---|
| Build (média) | 57.212 ms | 108.628 ms |
| Inicialização (média) | 9.847 ms | 10.056 ms |
| LOC | 8.783 | 9.796 |
| Componentes / contêineres | 2 / 2 | 5 / 5 |
| Chamadas entre fronteiras | 69 / 389 | 78 / 414 |
