# ufsj-abnTeX2 — Modelo de TCC de Ciência da Computação da UFSJ

**Versão atual:** v-1.3 (2026-10-19) — veja o [CHANGELOG.md](CHANGELOG.md).

Modelo LaTeX para a monografia (Trabalho de Conclusão de Curso) do Bacharelado
em Ciência da Computação da Universidade Federal de São João del-Rei, segundo
as normas da ABNT (NBR 14724:2011).

> [!NOTE]
> Este projeto é uma **obra derivada** do [abnTeX2](https://www.abntex.net.br/)
> e da [ucsmonograph](https://github.com/henriquebaron/ucsmonograph). Ele **não**
> é a versão original de nenhuma das duas, e os autores delas **não** oferecem
> suporte a ele. Dúvidas e problemas devem ser abertos como *issues* neste
> repositório.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `ufsj-abntex2.cls` | Classe com a formatação do modelo (não altere) |
| `main.tex` | Arquivo principal: preencha título, autor, banca, resumo etc. |
| `capitulo1.tex` … `capitulo4.tex` | Capítulos do texto, com exemplos de uso |
| `apendices.tex`, `anexos.tex` | Apêndices e anexos |
| `bibliografia.bib` | Referências bibliográficas (biblatex/biber) |
| `figuras/` | Imagens do seu trabalho (coloque aqui as suas figuras) |
| `recursos/` | Arquivos do modelo, como o logotipo da UFSJ (não altere) |
| `Makefile` | Compilação automatizada |

## Como preencher

Toda a formatação fica na classe. No `main.tex` você só preenche os blocos
numerados marcados com `>>> PREENCHER <<<`:

| Bloco | O que preencher | Comandos |
|---|---|---|
| 1. Dados do trabalho | Título, autor, ano e data da defesa | `\titulo`, `\autor`, `\data`, `\datadefesa` |
| 2. Banca | Orientador, coorientador (opcional) e avaliadores | `\orientador{nome}{instituição}`, `\coorientador{…}{…}`, `\avaliador{…}{…}` (um por membro) |
| 3. Referências | Arquivo `.bib` | `\addbibresource` |
| 4. Resumo e abstract | Texto e palavras-chave | `\textoresumo{texto}{palavras-chave}`, `\textoabstract{text}{keywords}` |
| 5. Opcionais | Dedicatória, agradecimentos, epígrafe, siglas e símbolos | `\textodedicatoria`, `\textoagradecimentos`, `\textoepigrafe{texto}{autor}`, `\sigla{SIGLA}{significado}`, `\simbolo{$x$}{significado}` |
| 6. Capítulos | Um `\include` por arquivo de capítulo | `\include{capitulo1}` |
| 7. Apêndices e anexos | Opcionais | `\include{apendices}`, `\include{anexos}` |

O resto é automático:

- capa, folha de rosto, folha de aprovação e sumário;
- dedicatória, agradecimentos, epígrafe e listas de siglas e de símbolos só
  aparecem se forem preenchidos;
- as listas de ilustrações, quadros, tabelas e algoritmos só aparecem se o
  trabalho tiver esses elementos;
- campos obrigatórios esquecidos aparecem como **[PREENCHER: …]** em vermelho
  no PDF e geram o aviso `Campo obrigatorio nao preenchido` no log.

## Como compilar

### Linux

Instale as dependências (Debian/Ubuntu):

```bash
sudo apt install texlive texlive-latex-extra texlive-science \
                 texlive-lang-portuguese biber python3-pygments
```

O pacote `minted`, usado para colorir códigos, precisa do Pygments. Depois, rode:

```bash
make        # gera main.pdf
make clean  # remove os arquivos temporários
```

### Overleaf

Envie todos os arquivos do projeto, mantendo `ufsj-abntex2.cls` na mesma
pasta que `main.tex`, e defina `main.tex` como documento principal.

## Licença

Este trabalho pode ser distribuído e/ou modificado nos termos da
[LaTeX Project Public License](https://www.latex-project.org/lppl.txt),
versão 1.3c ou (a seu critério) qualquer versão posterior.

- Status de manutenção LPPL: `maintained`
- Mantenedor atual: Daniel Madeira

Ele deriva de:

- **abnTeX2**, Copyright 2012-2018 abnTeX2 group, LPPL 1.3c —
  <https://ctan.org/pkg/abntex2>
- **ucsmonograph**, Copyright 2018 Henrique Baron, LPPL 1.3c —
  <https://ctan.org/pkg/ucsmonograph>

As alterações em relação aos originais estão em [CHANGELOG.md](CHANGELOG.md).

Os arquivos de imagem em `figuras/` e o logotipo da UFSJ em `recursos/`
**não** são cobertos por esta licença e pertencem aos seus respectivos
titulares.

Se você distribuir uma versão modificada deste modelo, a LPPL exige que ela
se identifique claramente como modificada (por exemplo, com outro nome de
classe) e documente as alterações feitas.
