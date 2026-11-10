# Identificação de Domínios (DDD) — e-commerce

Documento de apoio para o capítulo 05. Registra a lente de **Subdomínio (DDD)**
aplicada ao `ecommerce`: a classificação por valor estratégico, a evidência que
sustenta cada escolha e as divergências em relação ao previsto no roteiro.

Complementa `identificacao-dominios-ecommerce.md` (lente de Capacidade de
Negócio, produzida na trilha 4/9).

## 1. Critério

O DDD classifica cada parte do sistema pelo valor estratégico que ela entrega:

- **Núcleo:** carrega o diferencial competitivo e as regras que a empresa não
  terceiriza.
- **Suporte:** necessário para operar, mas não diferencia; pode ser terceirizado
  ou resolvido com pouco investimento.
- **Genérico:** problema já resolvido por componentes de prateleira.

A extração segue a ordem inversa do valor: saem primeiro os genéricos, depois o
suporte, e o núcleo por último. É a mesma ordem usada na trilha de Subdomínio do
`inventory-api`.

## 2. Evidência de base

Mesmo `snapshot-0` da trilha de Capacidade (ADR-0003): `madge` registra **79 de
207** dependências cruzando fronteiras de módulo. Fatos que pesam na
classificação:

- `cart → item` (13) e `order → item` (4): o núcleo carrega o modelo de item.
- `user → address` (6) e `auth → user`, `auth → token`: a identidade é um bloco
  autocontido.
- `order ↔ stripe` e `user ↔ auth` são **circulares**; separar exige escolher um
  lado da fronteira.
- `email`, `inventory` e `stripe` são instanciados como providers diretos dentro
  do `OrderModule`, sem import do módulo de origem.
- `inventory` não tem rota: é um serviço chamado pelo pedido.
- `storages` não tem rota própria: grava arquivo para produto (imagem) e para
  perfil (foto).

## 3. Classificação

| Classe | Contextos | Módulos | Justificativa |
|---|---|---|---|
| **Genérico** | Identidade | `auth`, `token`, `user`, `address` | Autenticação e cadastro não diferenciam o varejista; são resolvidos por biblioteca ou provedor |
| **Genérico** | Comunicação | `email` | Aviso transacional é infraestrutura, não regra de negócio |
| **Genérico** | Armazenamento | `storages` | Gravação de arquivo é componente técnico |
| **Suporte** | Catálogo | `product`, `search` | Publicar e consultar produto é necessário para vender, mas não é o diferencial desta aplicação |
| **Núcleo** | Vendas | `cart`, `shipping`, `order`, `inventory`, `stripe` | É o processo que converte intenção em receita: montar o carrinho, fechar o pedido, cobrar e baixar estoque |

## 4. Divergências em relação ao roteiro §4.3

**`stripe` fica no núcleo.** O roteiro não cita o pagamento. A classificação
"genérica" seria defensável pelo adaptador de provedor externo, mas foi
descartada: o pagamento é criado dentro do checkout e o webhook move o pedido e
baixa estoque. Extrair pagamento para um serviço próprio criaria uma transação
distribuída que o sistema não tem hoje e colocaria uma chamada de rede na rota de
escrita medida. Ficou registrado como alternativa considerada.

**`storages` não vira serviço.** É genérico por natureza, mas não tem rota nem
regra: vira uma biblioteca duplicada em cada contexto que grava arquivo
(Identidade e Catálogo), que é o tratamento recomendado pelo DDD para
subdomínio genérico. Extrair um serviço de arquivos criaria uma dependência
compartilhada entre dois contextos sem fronteira de domínio.

**`shipping` acompanha o carrinho.** No código, `shipping` é um conjunto de
enums e DTOs de frete usados pelo carrinho; não há módulo executável próprio.
Fica no núcleo por dependência de dados.

## 5. Síntese

| Contexto | Classe | Serviço no estado final |
|---|---|---|
| Identidade (`auth`, `token`, `user`, `address`) | Genérico | `identidade` |
| Comunicação (`email`) | Genérico | `comunicacao` |
| Catálogo (`product`, `search`, `storages`) | Suporte | `catalogo` |
| Vendas (`cart`, `shipping`, `order`, `inventory`, `stripe`) | Núcleo | `vendas` |

O estado final tem a mesma topologia da trilha de Capacidade de Negócio. É um
resultado, não um pressuposto: em um domínio com um único fluxo de negócio, os
dois critérios convergem no destino. O que muda é o caminho — a ordem de extração
e o custo acumulado em cada fase —, e é isso que a comparação mede.

## 6. Rastreabilidade

- Evidência de acoplamento: `metricas/ecommerce/subdominio/snapshot-0/` (a medir).
- Pré-registro do s1: `docs/extracao/ecommerce__subdominio__s1.plan.md`.
- Trilha de referência da metodologia: `exp/inventory-api/subdominio`.
