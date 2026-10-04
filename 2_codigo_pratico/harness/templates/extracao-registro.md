# Registro de Extração — <app> / <metodologia> / snapshot-<n>

> Escrito DEPOIS da extração. Combina narrativa manual + evidência automática
> (`harness/analise/diff`). Rascunho direto do "como foi feita a extração".

## O que foi feito (narrativa)
-

## Previsto × realizado
- O que seguiu o plano:
- O que mudou e por quê:

## Procedimento (sequência de commits)
```
exp(<app>/<metodologia>/s<n>): ...
```

## Evidência automática
- Files changes: ver `git diff --stat <tag-anterior> <tag-atual>`
- Acoplamento antes/depois (madge):
- Diff de `docker-compose`:
- Diff de `nginx.conf`:

## Aprendizado sobre decomposição
(o que esta extração ensinou — acoplamentos revelados, dores transacionais, etc.)

## Impacto observado nas métricas
(comparar com o pré-registro)
