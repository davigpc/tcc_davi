# Changelog

Este arquivo registra as alterações feitas no modelo, em especial em
`ufsj-abntex2.cls`, em relação às obras originais das quais ele deriva,
conforme exige a cláusula 6b da
[LaTeX Project Public License 1.3c](https://www.latex-project.org/lppl.txt).

Obras de origem:

- **abntex2.cls v-1.9.7** (2018/11/24), Copyright 2012-2018 abnTeX2 group —
  <https://ctan.org/pkg/abntex2>
- **ucsmonograph.cls**, Copyright 2018 Henrique Baron —
  <https://ctan.org/pkg/ucsmonograph>

## [v-1.3] - 2026-10-19

Autor das alterações: Daniel Madeira.

### Adicionado

- Pacotes e configurações que antes ficavam no `main.tex` agora são
  carregados pela classe: `lmodern`, `fontenc`, `inputenc`, `indentfirst`,
  `color`, `graphicx`, `microtype`, `algorithm`, `minted`, `csquotes`,
  `caption`, `subcaption`, `biblatex` (estilo `abnt`) e os nomes em português
  de algoritmos e subfiguras.
- Opções padrão `12pt`, `a4paper`, `oneside`, `openright` e `chapter=TITLE`,
  além do idioma principal (`brazilian`) e do `\frenchspacing`, aplicados
  pela classe.
- Comandos de preenchimento: `\datadefesa`, `\textoresumo`, `\textoabstract`,
  `\textodedicatoria`, `\textoagradecimentos`, `\textoepigrafe`, `\sigla` e
  `\simbolo`.
- `\elementospretextuais`: imprime capa, folha de rosto, folha de aprovação,
  dedicatória, agradecimentos, epígrafe, resumos, listas e sumário, e inicia a
  parte textual. Os elementos opcionais só aparecem se forem preenchidos.
- `\elementospostextuais`: inicia a parte pós-textual e imprime as referências.
- Logotipo da UFSJ centralizado no topo da capa e da folha de rosto
  (`\imprimirlogo`). O arquivo foi movido de `figuras/` para `recursos/`,
  para ficar separado das figuras do aluno.
- Capa e folha de rosto passam a usar o mesmo layout (`\ufsjcapaerosto`):
  logo, universidade, autor, título, local e data têm a mesma posição e o
  mesmo tamanho nas duas páginas. O bloco com preâmbulo e orientadores só é
  visível na folha de rosto; na capa ele ocupa o mesmo espaço, invisível.
- Capa, folha de rosto e folha de aprovação compartilham um cabeçalho de
  altura fixa (`\ufsjcabecalho`) com logo, universidade, autor e título, na
  mesma posição e tamanho nas três páginas. A folha de aprovação ganhou logo
  e nome da universidade, e seu título passou ao mesmo tamanho da capa.
- As listas de ilustrações, quadros, tabelas e algoritmos só são impressas
  quando o documento tem itens desse tipo (contagem guardada no `.aux`).
- Avisos no log (`Campo obrigatorio nao preenchido`) e marcação em vermelho
  no PDF para título, autor, orientador, data da defesa, resumo e abstract
  ausentes.

### Corrigido

- `\imprimirfolhaderosto` não repassava o argumento opcional e consumia o
  comando seguinte como argumento.
- `\imprimirfolhaderosto` passava o nome da folha entre `{}` em vez de `[]`
  ao ambiente `folhaderosto`.
- A folha de rosto testava `\coorientador` em vez de `\imprimircoorientador`
  e imprimia o rótulo "Coorientador:" mesmo sem coorientador.
- Os nomes do `\autoref` (Figura, Tabela) dependiam da opção global
  `brazilian`; agora o `hyperref` é carregado com essa opção.

### Alterado

- `main.tex` reescrito: contém apenas os blocos numerados que o aluno
  preenche (`>>> PREENCHER <<<`) e os opcionais (`(OPCIONAL)`).
- `Makefile`: compila com `-shell-escape` (exigido pelo `minted`),
  `-interaction=nonstopmode -halt-on-error` e `-file-line-error`; o PDF é
  recompilado apenas quando algum `.tex`, `.cls`, `.bib` ou figura muda;
  `make clean` remove também os arquivos do `minted`; novo alvo
  `make distclean`, que remove também o PDF.
- `capitulo3.tex` e `capitulo4.tex`: instruções atualizadas (listas
  automáticas e referência a `main.tex` em vez de `modelo.tex`).
- `README.md`: seção "Como preencher" e pasta `recursos/`.

### Removido do modelo

- Índice remissivo (`\makeindex` e `\printindex`): não era usado no texto e o
  `Makefile` não executa o `makeindex`.

## [v-1.1] - 2024-10-02

Autor das alterações: Daniel Madeira.

### Identificação

- Classe renomeada de `abntex2` para `ufsj-abntex2` (arquivo e `\ProvidesClass`).
- Cabeçalho reescrito com avisos de copyright das obras de origem, licença
  LPPL 1.3c e mantenedor desta versão.

### Alterado em relação à abntex2.cls

- O `babel` passou a ser carregado com a opção `brazilian` em vez de `brazil`.
- Pacote `textpos` adicionado.
- Distância do topo da página ao primeiro float (`\@fptop`) ajustada para 5pt
  ([abntex2#170](https://github.com/abntex/abntex2/issues/170)).
- Desativada a conversão para maiúsculas de capítulos e partes no sumário
  (`\settocpreprocessor` comentado).
- `\instituicao` e `\local` fixados em "Universidade Federal de São João
  del-Rei -- UFSJ" e "São João del-Rei".
- `\imprimirpreambulo` com o texto padrão do TCC de Ciência da Computação da UFSJ.
- `\orientador` e `\coorientador` recebem um argumento adicional com a
  instituição (`\imprimirorientadorInstituicao`, `\imprimircoorientadorInstituicao`).
- Nome dos apêndices no sumário e nos marcadores do PDF passa a usar
  `\texorpdfstring{\MakeTextUppercase{...}}`.
- Capa refeita no padrão UFSJ (nome da universidade no topo, autor, título,
  local e data).
- Folha de rosto refeita: instituição, autor, título e um bloco com preâmbulo,
  orientador e coorientador.
- Metadados do PDF (`\hypersetup`): título, autor, assunto, palavras-chave e
  cores dos links.
- Recuo de parágrafo de 1,3 cm e espaço entre parágrafos de 0,2 cm.

### Adicionado (com base na ucsmonograph.cls)

- Comando `\avaliador{nome}{instituição}`, que pode ser repetido para cada
  membro da banca, e `\imprimiravaliadores`.
- Comando `\imprimirfolhadeaprovacao[...]{data}`, que gera a folha de
  aprovação com a banca examinadora.
- Redefinição dos ambientes `dedicatoria` e `epigrafe`, posicionando o texto
  no canto inferior direito da página.
- Ambiente flutuante `quadro` e a lista de quadros (`\listofquadros`)
  ([abntex2#176](https://github.com/abntex/abntex2/issues/176)).
