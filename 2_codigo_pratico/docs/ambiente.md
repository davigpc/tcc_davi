# Ambiente de Execução

Registro do ambiente físico e de software usado para todas as medições do estudo.
Este documento ancora a validade das comparações: as métricas de custo (CPU/RAM),
tempo de build e desempenho dependem do hardware e das versões aqui declaradas.

## Máquina de medição

| Item | Valor |
|---|---|
| Sistema operacional | Microsoft Windows 11 Pro (10.0.26200), 64 bits |
| CPU | AMD Ryzen 7 5700X3D — 8 núcleos físicos / 16 lógicos |
| Memória RAM | 31,93 GB (≈32 GB) |
| Docker Engine | 29.7.2 (Docker Desktop 4.87.0) |
| Docker Compose | v5.4.0 |
| Node.js (host) | v22.17.1 |
| Git | 2.45.1.windows.1 |

> `pnpm` **não** está instalado no host. Cada aplicação instala o pnpm dentro da
> própria imagem Docker (ver decisão 0002).

## Regras de isolamento

- Todas as medições são feitas na mesma máquina, com o mesmo Docker Desktop.
- Antes de medir, contêineres de terceiros/arquivados devem estar parados para
  não contaminar `docker stats` e a contagem de componentes.
- Recursos do Docker (CPUs/memória atribuídos ao engine) devem permanecer fixos
  entre snapshots.

## Tabela de portas

Portas reservadas por aplicação. Como a execução é *app-a-app*, não há
necessidade de coexistência simultânea, mas as portas ficam fixadas para
reprodutibilidade.

| App | Serviço | Porta host | Porta container |
|---|---|---|---|
| inventory-api | API (NestJS) | 3000 | 3000 |
| inventory-api | PostgreSQL 15 | 5433 | 5432 |

> A tabela será estendida conforme os demais apps entrarem no experimento
> (auction: API 3000, front 3001, Adminer 8080; ecommerce: API 3001), evitando
> colisões por meio de um deslocamento de faixa por app.

## Volumes e redes

- Rede Docker dedicada por aplicação (padrão do Compose: `<projeto>_default`).
- O gateway NGINX (Strangler Fig) é adicionado em `infra/gateway/nginx.conf`
  quando a primeira extração (snapshot-1) entrar em cena.
