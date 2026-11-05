# Variables
# Nome do arquivo raiz .tex. O pdf final terá o mesmo nome.
TEXFILE = main
# Comando para o pdflatex, que é usado para compilar o arquivo .tex em PDF
PDFLATEX = pdflatex
# Opções do pdflatex:
#  -shell-escape: necessário para o pacote minted chamar o Pygments
#  -interaction=nonstopmode -halt-on-error: não para esperando entrada do
#   teclado e interrompe a compilação no primeiro erro
#  -file-line-error: mostra os erros no formato arquivo:linha
#  -synctex=1: habilita o SyncTeX (ir do PDF para o código e vice-versa)
PDFLATEXOPTIONS = -shell-escape -interaction=nonstopmode -halt-on-error -file-line-error -synctex=1
# Comando para o Biber, que é usado para gerenciar bibliografias
BIBER = biber
# Arquivos dos quais o PDF depende: se algum mudar, o PDF é recompilado
SOURCES = $(wildcard *.tex) $(wildcard *.cls) $(wildcard *.bib) $(wildcard figuras/*)
# Lista de arquivos temporários gerados durante a compilação
TEMPFILES = *.aux *.bbl *.bcf *.blg *.log *.out *.run.xml *.toc *.fls *.fdb_latexmk *.synctex.gz *.lof *.lot *.loq *.loa *.lol *.idx *.ilg *.ind *.glg *.glo *.gls *.ist *.pyg
TEMPDIRS = _minted-$(TEXFILE)

# Default target
all: $(TEXFILE).pdf

# Rule to compile the PDF
$(TEXFILE).pdf: $(SOURCES)
	$(PDFLATEX) $(PDFLATEXOPTIONS) $(TEXFILE).tex
	$(BIBER) $(TEXFILE)
	$(PDFLATEX) $(PDFLATEXOPTIONS) $(TEXFILE).tex
	$(PDFLATEX) $(PDFLATEXOPTIONS) $(TEXFILE).tex

# Clean up temporary files
.PHONY: all clean distclean
clean:
	rm -f $(TEMPFILES)
	rm -rf $(TEMPDIRS)

# Remove também o PDF gerado
distclean: clean
	rm -f $(TEXFILE).pdf
