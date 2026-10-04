# Harness de Métricas

Instrumento de medição do estudo empírico 3×3. Coleta e deriva as quatro
dimensões de métricas de forma padronizada e reprodutível.

## Estrutura

```
harness/
├── apps/<app>.json     # configuração por aplicação (compose, rotas-alvo, credenciais)
├── coleta/             # scripts de medição (o instrumento)
│   ├── collectors.ts   # implementação de cada métrica
│   └── run-snapshot.ts # orquestrador: roda tudo e grava o snapshot
├── analise/gerar.ts    # raw -> processed + tabelas .tex + figuras .svg + resumo.md
├── lib/                # utilitários (exec, http, paths, manifest)
└── templates/          # modelos de diário e registros de extração
```

## Uso

```bash
npm install
npm run snapshot -- --app inventory-api --metodologia capacidade-negocio --snapshot 0 --tag snap/inventory-api/capacidade-negocio/0
```

Opções: `--skip-build`, `--build-reps N`, `--load-reps N`, `--startup-reps N`.

## Saída

`2_codigo_pratico/metricas/<app>/<metodologia>/<snapshot>/`

```
├── manifest.json        # proveniência (git, ambiente, toolchain, parâmetros)
├── raw/                 # saída crua de cada ferramenta
├── processed/summary.json
├── paridade/golden.json # respostas de referência das rotas de leitura
├── tabelas/metricas.tex # importado pela monografia via \input
├── figuras/latencia-leitura.svg
└── resumo.md
```

## Métricas coletadas

| Dimensão | Métrica | Ferramenta |
|---|---|---|
| Agilidade/DevOps | tempo de build | `docker compose build --no-cache` |
| Agilidade/DevOps | tempo de inicialização | `docker compose up` + poll de prontidão |
| Custo/Infra | CPU e RAM (repouso e carga) | `docker stats` |
| Custo/Infra | tamanho de imagem | `docker image inspect` |
| Desempenho | latência (p50/p90/p99) e vazão | `autocannon` |
| Manutenibilidade | LOC | `sloc` (substituto do `cloc`, que exige Perl — ausente no Windows) |
| Manutenibilidade | componentes físicos | `docker compose config` + `docker ps` |
| Manutenibilidade | chamadas entre fronteiras | `madge` |

## Controles de validade

- Seed determinístico (reset da massa de dados) antes de cada medição de escrita.
- Parâmetros de carga fixos (conexões, duração, pipelining) e N repetições com mediana.
- Mesmo host e limites de Docker fixos entre snapshots.
- `manifest.json` grava proveniência completa por execução.
