---
name: plantuml
description: Use when creating, editing, or converting PlantUML (.puml) diagrams for the TCC — component, deployment, class, sequence, activity, use case, state, styling and troubleshooting. Trigger on "plantuml", ".puml", "diagrama UML", "diagrama de componentes/deployment/classes/sequência", or when formal UML is requested.
---

# Skill: PlantUML

Guia e referências para gerar diagramas PlantUML do TCC (UML formal, exigido pelo
orientador, da área de Análise e Projeto). As referências vêm da skill
`SpillwaveSolutions/plantuml` (MIT), ajustadas ao nosso ambiente.

## Quando usar

- Criar/ajustar qualquer diagrama `.puml` (componentes, implantação, classes, sequência, atividades, casos de uso, estados).
- Converter `.puml` em SVG/PNG para uso na monografia.
- Quando o usuário pedir "UML formal".

## Ambiente e comandos

- Jar: `2_codigo_pratico/harness/tools/plantuml-1.2026.8.jar` (baixado por `harness/diagramas/render.ts`).
- Fontes `.puml`: `2_codigo_pratico/docs/diagramas/`.
- Rasterizar todos os `.puml` (gera SVG + PNG):

  ```
  npm run diagramas   # rodar em 2_codigo_pratico/harness
  ```

- Rasterizar um arquivo só:

  ```
  java -jar 2_codigo_pratico/harness/tools/plantuml-1.2026.8.jar -tsvg <arquivo.puml>
  java -jar 2_codigo_pratico/harness/tools/plantuml-1.2026.8.jar -tpng <arquivo.puml>
  ```

- Graphviz **não** está instalado. Para linhas ortogonais, usar `!pragma layout elk`
  (o ELK já vem embutido no jar). Sem isso, o PlantUML usa um layout que curva as linhas.

## Convenções do projeto

- Diagrama de componentes UML2: `skinparam componentStyle uml2`; interfaces providas com
  `--(`, requeridas com `)--`.
- Evitar acentos nos rótulos `.puml` (encoding do console Windows).
- Manter a figura **limpa**: preferir fronteiras e contratos a desenhar todas as
  importações (o acoplamento detalhado vai em texto ou em um diagrama "zoom" separado).
- LaTeX: incluir figuras de `1_texto_tcc/monografia/figuras/`. A classe **não** define
  `\fonte`; use `\legend{Fonte: ...}`.

## Fluxo

1. Identificar o tipo de diagrama e carregar a referência correspondente em `references/`.
2. Escrever o `.puml` (fonte versionada em `docs/diagramas/`).
3. Rasterizar (`npm run diagramas`) e abrir o PNG para inspeção visual.
4. Se falhar, consultar `references/troubleshooting/toc.md` e corrigir (máx. 3 tentativas).
5. Copiar o PNG final para `1_texto_tcc/monografia/figuras/` quando for usado na monografia.

## Referências

- `references/toc.md` — índice de todos os tipos.
- `references/component_diagrams.md`, `references/deployment_diagrams.md`,
  `references/class_diagrams.md`, `references/sequence_diagrams.md`,
  `references/activity_diagrams.md`, `references/use_case_diagrams.md`,
  `references/state_diagrams.md`.
- `references/styling_guide.md`, `references/common_format.md`,
  `references/common_syntax_errors.md`, `references/unicode_symbols.md`.
- `references/troubleshooting/toc.md` — guias por categoria de erro.
