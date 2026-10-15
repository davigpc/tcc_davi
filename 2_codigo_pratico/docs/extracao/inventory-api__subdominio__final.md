# Registro de Extração — inventory-api / Subdomínio (DDD) / snapshot-final

> Escrito DEPOIS da extração.

## O que foi feito (narrativa)
Foi extraído o **contexto núcleo**: as movimentações passaram a compor o serviço
`movements`, e o monólito foi desativado. A decomposição por subdomínio separa o
núcleo (Movements) dos contextos de suporte (Produtos e Armazéns) — exatamente o
oposto do agrupamento da Capacidade de Negócio, que mantinha os três juntos.

Nesta fase adotou-se a **persistência isolada**: cada serviço passou a ter banco
próprio, e a comunicação cross-service ocorreu por **HTTP** (camada
anticorrupção). O ponto central desta trilha: a invariante de estoque
(ADR-0006/0008) exigia dados de produto e armazém, que agora estão em outro
serviço. Assim, registrar uma movimentação passou a depender de três validações
remotas (produto e armazém no Suporte; usuário na Identidade).

## Previsto × realizado
- O que seguiu o plano: separação núcleo/suporte, bancos isolados, ACL HTTP
  bidirecional, `user_email` denormalizado.
- O que mudou e por quê: a verificação de exclusão de produto com movimentos
  (`hasMovements`) passou a ser uma chamada HTTP a Movimentações, pois a tabela
  de movimentos deixou de pertencer ao Suporte.

## Procedimento (sequência de commits)
```
exp(inventory/subdominio/final): servico de movimentacoes (nucleo) e bancos isolados
exp(inventory/subdominio/final): ACL HTTP entre servicos, gateway, compose e config
```

## Evidência automática
- Acoplamento antes/depois (madge): 85/429 → 85/431.
- LOC TypeScript: 10.310 → 10.079 (monólito aposentado).
- Componentes/contêineres: 6/6 → 8/8.

## Aprendizado sobre decomposição
[A preencher pelo autor]

## Impacto observado nas métricas
| Métrica | s0 | s1 | s2 | final |
|---|---|---|---|---|
| Build (média) | 57.212 ms | 108.628 ms | 103.700 ms | 122.958 ms |
| Inicialização (média) | 9.847 ms | 10.056 ms | 9.626 ms | 12.540 ms |
| LOC | 8.783 | 9.796 | 10.310 | 10.079 |
| Componentes / contêineres | 2 / 2 | 5 / 5 | 6 / 6 | 8 / 8 |
| Chamadas entre fronteiras | 69/389 | 78/414 | 85/429 | 85/431 |
