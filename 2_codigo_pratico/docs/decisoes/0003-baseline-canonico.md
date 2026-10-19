# 0003 — S0 canônico para o cálculo das variações

- **Data:** 2026-10-19
- **Status:** Aceita
- **Contexto:** comparação entre as trilhas de decomposição do `inventory-api`.

## Problema

Cada trilha media o seu próprio `snapshot-0` antes de iniciar as extrações. Como
o baseline é o mesmo estado de código, as medições deveriam coincidir, mas
divergiram por variação entre execuções. Os casos mais visíveis foram o tempo de
construção (46,7 s na Capacidade de Negócio contra 57,2 s no Subdomínio) e a CPU
em repouso (2,22 % contra 0,04 %). Com isso, as variações relativas de cada
metodologia partiam de denominadores diferentes, o que prejudicava a comparação
entre elas.

## Decisão

1. Adotar como **S0 canônico** a medição de
   `metricas/inventory-api/capacidade-negocio/snapshot-0`, que é a origem da
   Tabela `tab:metricas-inventario-s0` do capítulo de resultados.
2. Calcular as variações de **todas** as metodologias contra esse mesmo S0.
3. Exibir o S0 canônico na coluna S0 das tabelas por metodologia. As medições
   remedidas de cada trilha permanecem registradas nos arquivos
   `*__snapshots.json` apenas para rastreabilidade.
4. Registrar a origem do baseline em
   `harness/analise/baselines.json`, lido por `harness/analise/comparar.ts`.

## Justificativa

- **Comparabilidade:** todas as metodologias passam a ter a mesma referência.
- **Rastreabilidade:** a tabela de baseline do capítulo coincide com o S0 usado
  nos cálculos.
- **Reprodutibilidade:** a escolha fica explícita em um arquivo de configuração,
  em vez de depender da ordem de leitura dos diretórios.
- **Estabilidade:** evita que valores próximos de zero, como a CPU em repouso,
  gerem variações percentuais sem significado prático.

## Consequências

- As variações do Subdomínio mudam em relação aos valores anteriores
  (por exemplo, o tempo de construção passa de +115 % para +163 %).
- A CPU em repouso passa a ser reportada como diferença absoluta em pontos
  percentuais (p.p.), e não como variação relativa.
- As tabelas por metodologia mostram o mesmo S0; a medição remedida de cada
  trilha não aparece no texto principal.
- Aplicações sem entrada em `baselines.json` continuam usando o primeiro
  snapshot da própria trilha, com aviso no console.
