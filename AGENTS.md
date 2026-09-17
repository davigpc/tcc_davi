# Contexto do Projeto: TCC de Arquitetura de Software

Este arquivo define o contexto técnico, o escopo e as diretrizes para os agentes de IA operarem neste repositório de Pesquisa Científica (TCC) voltado à avaliação de padrões de decomposição de monólitos em microsserviços.

## 1. Visão Geral da Pesquisa
O objetivo é conduzir um estudo comparativo empírico ($3 \times 3$) estruturado na refatoração de três aplicações monolíticas distintas utilizando três metodologias de modelagem arquitetural, avaliadas por meio de *snapshots* incrementais e métricas quantitativas e qualitativas.

## 2. Escopo das Aplicações (Estudos de Caso)
*   **Sistema de Execução da Manufatura (MES):** Aplicação de missão crítica focada no chão de fábrica. Avalia integridade transacional, resiliência e ausência de *downtime* na escrita de dados e relatórios gerenciais.
*   **E-commerce Varejista:** Aplicação transacional clássica focada no isolamento de modelos de dados (*Bounded Contexts*) entre Catálogo e Faturamento/Carrinho.
*   **Monitor de Mercado / Leilões:** Aplicação de alta performance focada em concorrência, vazão (*throughput*) de requisições e processamento em tempo real.

## 3. Metodologias de Decomposição (O Escopo de Comparação)
*   **Decomposição por Capacidade de Negócio:** Agrupamento de serviços baseado nos processos macro da organização.
*   **Decomposição por Subdomínio (DDD):** Isolamento baseado em fronteiras lógicas de domínio e modelos de dados.
*   **Decomposição por Transações:** Agrupamento focado na garantia estrita de consistência transacional e restrições técnicas (ACID).

## 4. Padrão de Migração
*   **Strangler Fig Pattern:** Utilizado obrigatoriamente como o mecanismo de roteamento e extração incremental em todas as transições, mediado por um proxy reverso (NGINX) na borda.

## 5. Matriz de Métricas e Coleta
As métricas devem ser extraídas e catalogadas iterativamente através de quatro *snapshots* (Snapshot 0: Baseline até o Snapshot Final):
1.  **Agilidade e DevOps:** Tempo de *build* (GitHub Actions) e tempo de inicialização de contêineres.
2.  **Infraestrutura e Custo:** Uso de CPU, consumo de memória RAM e tamanho de imagem (`docker stats` e `docker images`).
3.  **Desempenho:** Latência de API e Vazão Máxima (`autocannon`).
4.  **Manutenibilidade:** Contagem de Linhas de Código (`cloc`), contagem de artefatos/componentes físicos e acoplamento de código via Cruzamento de Fronteiras (*Cross-Domain Calls* mapeados com `madge` e ESLint).

## 6. Diretrizes de Desenvolvimento e Stack Tecnológica
*   **Linguagem de Backend:** Uso estrito de **TypeScript** em todos os microsserviços e monólitos para garantir tipagem estática confiável e métricas de LOC consistentes via `cloc`.
*   **Framework de Backend:** Padronização em **Fastify** (ou Express, conforme sua preferência) para as APIs de microsserviços, priorizando baixo consumo de memória RAM e alta performance em testes de carga.
*   **Frontend:** Aplicação em **Next.js (React)** utilizando a estrutura de roteamento baseada em `page.jsx`, atuando como a interface unificada que consome as rotas gerenciadas pelo proxy/API Gateway (Strangler Fig).
*   **Orquestração e Métricas:** Mantenha todos os serviços conteinerizados via `docker-compose` e garanta que os scripts de automação para extração de métricas (`docker stats`, `autocannon`, `madge`) estejam mapeados na raiz dos repositórios.

## 7. Estrutura de Artefatos e Dados Brutos
*   **Armazenamento de Métricas:** Todos os relatórios brutos gerados pelas ferramentas de teste (ex: saídas JSON do `autocannon`, relatórios do `madge` e logs de consumo do `docker stats`) devem ser salvos rigidamente na pasta `2_codigo_pratico/metricas/`, organizados por subpastas correspondentes a cada aplicação e *snapshot*.
*   **Rastreabilidade por Tags Git:** Cada transição de estado da arquitetura deve corresponder a uma tag formal no repositório (ex: `git tag -a snapshot-0`, `git tag -a snapshot-1`), garantindo que o código exato de cada fase possa ser recuperado e auditado a qualquer momento.

## 8. Estado Atual e Continuidade (atualizado em 2026-09-17)
> Este é o ponto de retomada para novas sessões. O plano completo e o registro de execução estão em `2_codigo_pratico/roteiro.md` (a seção 11 contém o log cronológico).

*   **Fase atual:** Fase 0 (saneamento do repositório) **concluída**. Próxima: **Fase 1** (baseline executável + poda de dependências de nuvem do e-commerce).
*   **Monografia:** os capítulos `01_introducao`, `05_resultados_discussoes` e `06_conclusao` ainda são stubs; `00_pretextual` (resumo/abstract) está desatualizado em relação ao escopo 3×3 atual. Não escrever na monografia sem solicitação explícita.
*   **Código da parte prática:** os três aplicativos são **submódulos git** em `2_codigo_pratico/apps/`, fixados no baseline (Snapshot 0):
    *   `inventory-api` → fork `davigpc/inventory-api` @ `338b0d7` — papel: **MES / sistema crítico** (NestJS 11 + Prisma + PostgreSQL, hexagonal + DDD).
    *   `auction` → fork `davigpc/auction` @ `61dc9fa` — papel: **leilões / alta performance** (NestJS 11 + TypeORM + BullMQ + Redis, Socket.IO).
    *   `ecommerce` → fork `davigpc/nestjs-ecommerce` @ `2a38d54` — papel: **e-commerce / transacional** (NestJS 10 + Mongoose; upstream `3004cf6` + remoção de arquivo vazio `:` inválido no Windows).
*   **Esqueletos antigos** (`monolito/`, `microsservicos` — catalog/cart/order) foram movidos para `2_codigo_pratico/_archive/` e estão **fora de escopo**.
*   **Discrepância conhecida:** a seção 6 deste documento cita Fastify/Express, mas os três apps reais usam **NestJS**. Preferir o stack existente dos submódulos; não migrar framework sem decisão explícita.
*   **Convenções planejadas (ainda a criar):** branches `exp/<app>/<metodo>` e tags `snap/<app>/<metodo>/<n>` no repositório pai.
*   **Pendências conhecidas:**
    1. Recriar a tag `snapshot-0` no repo pai fixando os SHAs dos submódulos — a tag atual **não** captura o código do baseline.
    2. Criar a pasta `2_codigo_pratico/metricas/` e o harness de coleta (Fase 2).
    3. Executar a poda de nuvem do e-commerce (MongoDB Atlas, Stripe, S3, OAuth, SMTP) conforme seção 5 do roteiro.
*   **Ferramental de sessão:** `gh` instalado em `C:\Program Files\GitHub CLI\gh.exe` (adicionar ao PATH), autenticado como `davigpc`.