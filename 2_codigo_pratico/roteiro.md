# Roteiro da Parte Prática

Documento de planejamento da execução prática do TCC *"Metodologia para Decompor uma Aplicação Monolítica em Microsserviços"*. O roteiro traduz o desenho definido nos capítulos 02, 03 e 04 da monografia em tarefas executáveis, partindo dos três repositórios selecionados como **Snapshot 0 (baseline monolítico)**.

> Este documento não substitui a monografia. Ele é o plano de engenharia que produz os artefatos e as medições que alimentarão o capítulo 05 (Desenvolvimento/Resultados).

---

## 1. Objetivo e Escopo

### 1.1 Desenho experimental
Estudo comparativo empírico **3 × 3**:

- **3 aplicações monolíticas** distintas (domínios distintos).
- **3 metodologias de decomposição**: Capacidade de Negócio, Subdomínio (DDD) e Transações.
- Total de **9 trilhas de refatoração**, cada uma conduzida via **Strangler Fig**, com mediação de um **proxy reverso NGINX** na borda.
- Cada trilha é medida em **snapshots incrementais**: `snapshot-0` (baseline) → `snapshot-1` (1ª extração) → `snapshot-2` (2ª extração) → `snapshot-final` (decomposição concluída).

### 1.2 Pergunta empírica
Avaliar, sob as quatro dimensões de métricas definidas no cap. 02 (Agilidade/DevOps, Custo/Infraestrutura, Desempenho e Manutenibilidade/Complexidade), como o grau de decomposição e a metodologia escolhida afetam cada aplicação.

### 1.3 Fora de escopo (nesta fase)
- Escrita/revisão de capítulos da monografia (cap. 05 consumirá os resultados deste roteiro).
- Serviços externos de nuvem (ver seção 5): serão substituídos por equivalentes locais.

### 1.4 Decisões de escopo já tomadas
| Decisão | Escolha |
|---|---|
| Matriz experimental | 3 × 3 completo (9 trilhas) |
| Organização do código | `2_codigo_pratico/apps/` consolidado |
| Versionamento dos apps | Git submodules (forks dos upstreams) |
| E-commerce | Manter íntegro, porém podar dependências de nuvem com stubs locais documentados |

---

## 2. Inventário do Snapshot 0

Os três repositórios selecionados no cap. 04 (`04_metodologia.tex`) e presentes em `2_codigo_pratico/snapshot-0/`:

| App (papel no TCC) | Fonte upstream | Stack real | Persistência | Processos / Portas | Licença |
|---|---|---|---|---|---|
| **Sistema de Inventário** (crítico / MES) | `egp1020/inventory-api` | NestJS 11, TypeScript strict, arquitetura hexagonal + DDD, Prisma, JWT/Passport, Swagger | PostgreSQL 15 | API · `3000` | MIT |
| **Leilões** (alta performance / concorrência) | `schoibs/auction` | NestJS 11, TypeORM, BullMQ, Socket.IO, ioredis, Swagger | PostgreSQL 16 + Redis 7 | API (`3000`) + Worker + Frontend Next (`3001`) + Adminer (`8080`) | não declarada |
| **E-commerce** (transacional / CRUD) | `sappChak/nestjs-ecommerce` | NestJS 10, Mongoose, Stripe, AWS S3, Nodemailer, Google OAuth, BullMQ, Socket.IO | MongoDB + Redis | API · `3001` | não declarada |

### 2.1 Bounded contexts já existentes (base para decomposição)

- **inventory-api:** `auth`, `users`, `warehouses`, `products`, `movements`, `reports`. O próprio repo se declara *modular monolith* (ADR-0017) com DDD e CQRS parcial no módulo `reports` (ADR-0011) e transações Prisma no `movements` (ADR-0006).
- **auction:** `auth`, `users`, `cards`, `card-types`, `auctions`, `bids`, `auction-jobs` (worker), `realtime`, `health`.
- **ecommerce:** `auth`, `user`, `token`, `verification`, `address`, `cart`, `item`, `product`, `offering`, `inventory`, `order`, `stripe`, `shipping`, `review`, `wishlist`, `chat`, `search`, `email`, `storages`, `renting`, `health` (21 controllers, 14 schemas).

### 2.2 Como executar cada baseline

| App | Pré-requisitos | Subida | Seed / Migração | URL base |
|---|---|---|---|---|
| inventory-api | Docker; `.env` a partir de `.env.example` | `docker compose up -d` | `npm run seed` (após migrate) | `http://localhost:3000/api` (Swagger `/docs`) |
| auction | Docker; `.env` a partir de `.env.example` | `docker compose up -d postgres redis` → build → migrations/seed → `docker compose up` | `npm run migration:run` + `npm run seed:local` | API `http://localhost:3000` (Swagger `/docs`), front `3001`, Adminer `8080` |
| ecommerce | Docker; `.env` local | `docker compose -f docker-compose.dev.yml up --build` | (Mongo local — ver seção 5) | API `http://localhost:3001` (Swagger `/api/docs`) |

### 2.3 Credenciais/dados de teste
- **inventory-api:** dados via `npm run seed` (usuários ADMIN e OPERATOR, bodegas e produtos de demonstração).
- **auction:** `user1@example.com` / `user2@example.com`, senha `password123` (seed cria 3 card-types e cartas).
- **ecommerce:** a definir após poda (ver seção 5); registrar no `.env` local.

> **Achado relevante:** o "e-commerce simples" é, na verdade, um monólito modular de grande porte (chat, renting, shipping, reviews, wishlist, Stripe/S3). Isso precisa ser explicitado no cap. 04 ao justificar o estudo de caso.

---

## 3. Estado Atual do Repositório e Saneamento

### 3.1 Situação encontrada
- `snapshot-0/inventory-api/` e `snapshot-0/auction/` são **árvores simples** (sem `.git` próprio; qualquer comando git cai no repo pai).
- `snapshot-0/_ecom_git/` é o **clone real** de `sappChak/nestjs-ecommerce`.
- `snapshot-0/nestjs-ecommerce/` é um **partial clone vazio** (`blob:none`) do mesmo repositório.
- As pastas antigas `2_codigo_pratico/monolito/` e `2_codigo_pratico/microsservicos/` (esqueletos catalog/cart/order) **divergem** dos repositórios reais escolhidos.

### 3.2 Ações de saneamento
1. **Forkar** os três upstreams na conta do autor (`davigpc`), garantindo liberdade de modificação e preservação de atribuição/licença.
2. Converter cada fork em **submódulo git** sob `2_codigo_pratico/apps/` (`inventory-api`, `auction`, `ecommerce`).
3. Remover `snapshot-0/_ecom_git/` e o partial clone `snapshot-0/nestjs-ecommerce/` (consolidados no submódulo `ecommerce`).
4. **Aposentar** `2_codigo_pratico/monolito/` e `2_codigo_pratico/microsservicos/` (mover para histórico/arquivo morto; atualizar README).
5. Atualizar `2_codigo_pratico/README.md` para a nova estrutura.

### 3.3 Estrutura de diretórios alvo
```
2_codigo_pratico/
├── roteiro.md
├── README.md
├── .gitmodules                      # inventory-api, auction, ecommerce (forks)
├── apps/
│   ├── inventory-api/               # submódulo
│   ├── auction/                     # submódulo
│   └── ecommerce/                   # submódulo
├── infra/
│   ├── gateway/nginx.conf           # roteador Strangler Fig
│   └── scripts/                     # init/seed por app
├── harness/
│   ├── autocannon/                  # cenários de carga por app
│   ├── docker-stats/                # amostragem de CPU/RAM
│   ├── cloc/                        # linhas de código
│   └── madge/                       # cross-domain calls
└── metricas/
    └── <app>/<metodologia>/<snapshot>/
```

---

## 4. Matriz Experimental 3 × 3

As listas abaixo são **hipóteses iniciais** de serviços resultantes, a serem validadas durante a refatoração. Cada trilha parte do mesmo `snapshot-0`.

### 4.1 Inventory-api (crítico / MES)

| Metodologia | Serviços candidatos |
|---|---|
| **Capacidade de Negócio** | Administração/Identidade · Controle de Estoque · Relatórios |
| **Subdomínio (DDD)** | *Core:* Movements · *Suporte:* Products, Warehouses · *Genérico:* Identity (auth+users), Reports |
| **Transações** | `Estoque` (Movements + Products + Warehouses — checagem e escrita atômicas) · Identity · Reports (somente leitura) |

*Fundamento transacional:* a regra "não é possível retirar mais do que há" e o cálculo dinâmico de estoque dependem de consistência imediata entre movimentos, produtos e bodegas.

### 4.2 Auction (alta performance / concorrência)

| Metodologia | Serviços candidatos |
|---|---|
| **Capacidade de Negócio** | Identidade · Catálogo de Cartas · Leilão · Lances · Tempo Real/Notificações |
| **Subdomínio (DDD)** | *Core:* Auctions + Bids · *Suporte:* Cards + Card-types · *Genérico:* Auth/Users, Realtime |
| **Transações** | `Leilão` (Auctions + Bids + Cards + CardTransfers — lance, fechamento e transferência atômicos) · Identity · Realtime |

*Fundamento transacional:* o fechamento do leilão e a transferência de posse da carta exigem atomicidade sobre lances, carta e histórico de transferência.

### 4.3 Ecommerce (transacional / CRUD)

| Metodologia | Serviços candidatos |
|---|---|
| **Capacidade de Negócio** | Identidade · Catálogo · Carrinho · Pedido/Checkout · Estoque · Envio |
| **Subdomínio (DDD)** | *Core:* Order/Cart/Checkout · *Suporte:* Catalog (product/item/offering) · *Genérico:* Auth/User, Storage/Email |
| **Transações** | `Checkout` (Cart + Order + Pagamento + Reserva de Estoque) · Catalog · Identity |

*Fundamento transacional:* a conclusão do pedido acopla carrinho, criação do pedido, pagamento e baixa de estoque.

### 4.4 Convenção de snapshots por trilha
1. `snapshot-0` — baseline monolítico inalterado.
2. `snapshot-1` — primeira extração (serviço de menor acoplamento).
3. `snapshot-2` — segunda extração.
4. `snapshot-final` — decomposição concluída sob a metodologia.

---

## 5. Poda de Dependências de Nuvem (E-commerce)

Objetivo: manter a aplicação integral, substituindo integrações de terceiros/nuvem por **stubs ou serviços locais**, sem alterar o comportamento de domínio dos módulos centrais. Cada alteração deve ser registrada (arquivo, variável de ambiente, decisão).

| Módulo/Integração | Dependência de nuvem | Ação | Substituto local |
|---|---|---|---|
| MongoDB | MongoDB Atlas (`MONGO_URI` externo) | Trocar URI e subir container | `mongo` no `docker-compose` |
| Redis | Host externo / credenciais | Trocar env | container `redis` |
| Auth Google (`google.auth`) | Google OAuth API | Desabilitar endpoints OAuth | Login JWT local |
| Stripe | API Stripe | Manter interface, trocar adapter | `FakePaymentGateway` local |
| Storage (`storages`) | AWS S3 | Trocar adapter de persistência | Volume/disco local |
| Email | SMTP Gmail | Trocar transporte | `mailhog`/stream transport |
| Twilio (se aplicável) | Twilio API | Remover | — |
| PM2 / `ecosystem.config.js` | — | Opcional | Padronizar Docker |

Complementos obrigatórios:
- Sanitizar `.example.env`; criar `.env` local.
- **Nunca** commitar segredos (revisar `.gitignore`).
- Documentar, por módulo, o que foi removido × mantido.

### 5.1 Itens em aberto desta seção
- Adaptadores de nuvem: **remover** ou manter atrás de *feature flag*?
- Definir massa de dados/credenciais de seed do e-commerce após a poda.

---

## 6. Harmonização de Ambiente

- **Portas:** mapear portas de forma única por experimento (hoje inventory e auction colidem em `3000`; auction e ecommerce em `3001`). Definir tabela de portas por app/trilha.
- **Rede:** rede(s) Docker dedicadas por app; NGINX na borda como proxy reverso.
- **Strangler Fig:** `infra/gateway/nginx.conf` roteia por prefixo de rota, permitindo desviar tráfego gradualmente do monólito para os serviços extraídos, sem desligar o monólito.
- **Configuração:** padronizar `.env` por app; documentar variáveis.
- **Dados de teste:** seeds determinísticos e equivalentes entre baseline e decomposições, para viabilizar comparação justa.

---

## 7. Harness de Métricas

Scripts e saídas versionados no repo pai (`harness/` + `metricas/`). Todos os resultados brutos vão para `2_codigo_pratico/metricas/<app>/<metodologia>/<snapshot>/`.

| Dimensão | Métrica | Ferramenta | Saída |
|---|---|---|---|
| Agilidade/DevOps | Tempo de build | GitHub Actions / `docker build` cronometrado | JSON |
| Agilidade/DevOps | Tempo de inicialização | Script de prontidão (poll de porta/health) | JSON |
| Custo/Infra | CPU e RAM (média/pico) | `docker stats` (amostragem) | CSV/JSON |
| Custo/Infra | Tamanho de imagem | `docker images` | JSON |
| Desempenho | Latência (percentis) e vazão | `autocannon` | JSON |
| Manutenibilidade | LOC | `cloc` | JSON |
| Manutenibilidade | Nº de componentes físicos | Contagem de serviços/imagens | JSON |
| Manutenibilidade | Cross-domain calls | `madge` + ESLint | JSON |

### 7.1 Contratos mínimos
- Definir, por app, as **rotas-alvo** do `autocannon` representativas de leitura e escrita.
- Fixar parâmetros de carga (conexões, duração, pipelining) e repetir N vezes; registrar a variância.
- Nomear arquivos com `app`, `metodologia`, `snapshot`, `timestamp` e versão do script.

---

## 8. Definição dos Snapshots e Critério de Pronto

Para cada trilha:
- `snapshot-0`: baseline executável, sem alteração de código-fonte, medido.
- `snapshot-1`: 1ª extração funcionando atrás do NGINX; baseline ainda ativo.
- `snapshot-2`: 2ª extração.
- `snapshot-final`: decomposição completa; extras de baseline desativados.

**Definição de pronto (por snapshot):**
1. Todos os processos sobem via `docker compose`.
2. Rotas representativas respondem com sucesso sob carga.
3. Métricas das quatro dimensões coletadas e salvas em `metricas/`.
4. Tag git criada no repo pai (código + medições).
5. Paridade funcional verificada em relação ao baseline.

---

## 9. Roadmap por Fases

| Fase | Descrição | Entregável |
|---|---|---|
| **Fase 0 — Saneamento** | Forks, submódulos, remoção de duplicatas, aposentadoria das pastas antigas, atualização de README | Repo consolidado em `apps/` |
| **Fase 1 — Baseline executável (Snapshot 0)** | Harmonização de portas/env; poda de nuvem do e-commerce; validação dos 3 baselines | `snapshot-0` rodando e reproduzível |
| **Fase 2 — Harness de métricas** | Scripts de build/startup/stats/autocannon/cloc/madge; medição do baseline | `metricas/<app>/baseline/` preenchido |
| **Fase 3 — Trilhas 3 × 3** | Execução das 9 decomposições via Strangler Fig + NGINX, snapshots 1/2/final e medições | 9 conjuntos de métricas |
| **Fase 4 — Consolidação** | Normalização, análise e visualização dos dados; insumo para o cap. 05 | Tabelas/gráficos comparativos |

---

## 10. Riscos e Pendências

| Risco/Pendência | Impacto | Mitigação |
|---|---|---|
| Complexidade do e-commerce (21 controllers) | Alto esforço de poda e paridade | Documentar remoções; stubs locais |
| Colisão de portas entre apps | Impossibilita execução simultânea | Tabela de portas única por experimento |
| `.git` aninhado / clones duplicados | Quebra a estratégia de tags | Submódulos com SHAs pinados |
| Esforço das 9 trilhas | Prazo | Fases e paridade mínima por snapshot |
| Licenças/atribuição dos upstreams | Uso acadêmico | Manter LICENSE e README originais no fork |
| Paridade funcional entre baseline e decomposições | Comparação injusta | Seeds e rotas de teste padronizados |
| Adaptadores de nuvem (remove vs. flag) | Decisão pendente | Definir na Fase 1 |

### Pendências que exigem decisão
1. ~~Conta/organização dos forks~~ — **Resolvido:** forks em `davigpc`.
2. Adaptadores de nuvem: remover ou manter atrás de feature flag.
3. Número fixo de snapshots por trilha (sugestão: 0, 1, 2, final).
4. Definição das rotas-alvo de `autocannon` por app.

---

## 11. Registro de Execução

### Fase 0 — Saneamento (concluída)

**Ferramental**
- Instalado o GitHub CLI (`gh` 2.101.0) via winget; autenticado como `davigpc`.

**Forks criados**
- https://github.com/davigpc/inventory-api (upstream: `egp1020/inventory-api`)
- https://github.com/davigpc/auction (upstream: `schoibs/auction`)
- https://github.com/davigpc/nestjs-ecommerce (upstream: `sappChak/nestjs-ecommerce`)

**Submódulos configurados** (`.gitmodules`), SHAs do baseline:

| App | Caminho | Branch | SHA (Snapshot 0) |
|---|---|---|---|
| inventory-api | `2_codigo_pratico/apps/inventory-api` | `main` | `338b0d7bb9f195766c746f85a229ad92ac09fd11` (tag upstream `v1.0.1`) |
| auction | `2_codigo_pratico/apps/auction` | `main` | `61dc9fa513ee5717d6d4e1e247d6e2343ea1b270` |
| ecommerce | `2_codigo_pratico/apps/ecommerce` | `master` | `2a38d542e6d03b5f0f833da47996067e0c750014` |

**Ajuste de baseline no e-commerce**
- O upstream contém um arquivo vazio cujo nome é literalmente `:` em
  `src/modules/verification/controllers/` (inválido no Windows, impedia o checkout).
- Ação: removido por meio de commit no fork (`2a38d54`), imediatamente acima do upstream
  `3004cf6`. Não afeta a aplicação (arquivo vazio, sem referências).

**Organização do working tree**
- Criado `2_codigo_pratico/apps/` com os três submódulos.
- Removidos os clones duplicados do e-commerce (`snapshot-0/_ecom_git` e o partial clone
  vazio `snapshot-0/nestjs-ecommerce`).
- As cópias redundantes de `inventory-api` e `auction` em `snapshot-0/` foram removidas
  (o baseline canônico passou a ser os submódulos pinados por SHA); a pasta `snapshot-0/`
  foi eliminada.
- Esqueletos antigos movidos para `2_codigo_pratico/_archive/{monolito,microsservicos}`.
- `README.md` reescrito para a nova estrutura.

**Pendência decorrente (importante para rastreabilidade)**
- A tag `snapshot-0` existente no repositório pai **não captura** o código do baseline
  (a pasta estava *untracked*). Após commitar os submódulos, deve-se recriar uma tag
  `snapshot-0` que fixe os SHAs da tabela acima.
- Próximo passo: **Fase 1** (baseline executável + poda de nuvem do e-commerce).
