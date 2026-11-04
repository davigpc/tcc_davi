# Guia de Estilo de Escrita — Monografia

Fonte: revisão do orientador de 04/11/2026 (`TCC_Davi (6).pdf`). O código-fonte completo dessa versão foi incorporado ao repositório; o capítulo 2 em `02_fundamentacao.tex` é a referência principal. O objetivo deste guia é reproduzir o mesmo registro nas próximas seções.

## Princípio geral

Escrever como quem explica para um colega de laboratório: frase direta, termo técnico exato, argumento concreto. O texto deve parecer escrito por uma pessoa que domina o assunto, não por um gerador de texto que quer parecer sofisticado.

## 1. Verbo no lugar de nominalização

Nominalizações empilhadas são o principal marcador de texto artificial. Preferir a forma verbal.

| Evitar | Preferir |
|---|---|
| "manifesta-se o acoplamento no ciclo de implantação" | "toda a aplicação precisa ser recompilada, testada e reimplantada" |
| "sobressai-se a governança e a descentralização tecnológica" | "outra diferença é a presença de múltiplas tecnologias" |
| "a segregação de dados deriva a possibilidade de adoção de..." | "dessa separação deriva a possibilidade de..." |

Regra prática: se a frase tem dois "de" seguidos e nenhum verbo conjugado, reescrever.

## 2. Conectores

Evitar os conectores de preenchimento:

- Adicionalmente
- Em adição
- Sob essa ótica
- No que tange a
- Nesse sentido
- Em contrapartida
- Vale ressaltar / É importante destacar
- Dessa forma (quando usado a cada parágrafo)

Preferir a enumeração simples e o encadeamento por conteúdo:

- "Um dos principais problemas..."
- "Outro problema é..."
- "Além disso..."
- "Com relação a..."
- "Por outro lado..."
- "Por fim..."

## 3. Adjetivos e advérbios

Cortar o que não pode ser medido ou justificado no texto:

- substancial / substancialmente
- determinante
- evidente
- incontornável
- operacional
- global
- crítico
- robusto
- holístico / abrangente
- significativo (quando vazio)
- proeminente

Exemplo real da revisão:

> Antes: "Esse fator eleva substancialmente a latência de entrega [...] e aumenta o risco operacional de falha global."
>
> Depois: "Esse fator dificulta a entrega de novas funcionalidades e aumenta o risco de falha geral."

## 4. Listas de tecnologias

Não enumerar tecnologias para demonstrar erudição. Se a lista não é usada na análise, cortar.

> Antes: "por meio de mecanismos leves de rede, tipicamente utilizando APIs fundamentadas no protocolo HTTP com o padrão REST ou barramentos de mensageria assíncrona."
>
> Depois: "por meio de protocolos na rede."

## 5. Fechamento de parágrafo

Evitar fechamentos genéricos do tipo "escolha consciente (trade-off)", "em suma", "dessa forma, conclui-se que". Terminar com uma consequência concreta, um número ou uma lista de efeitos.

Exemplo real: o parágrafo genérico sobre trade-offs foi substituído por uma lista objetiva de quatro desafios dos microsserviços.

## 6. Precisão técnica

Não trocar um termo que é critério do trabalho por um sinônimo mais leigo:

- ACID (não "atômicas", quando o critério é ACID)
- invariante (não "consistência" genérica)
- snapshot (não "marco" quando for o snapshot numerado)
- bounded context, subdomínio, capacidade de negócio

A simplificação vale para a prosa, não para a terminologia.

## 7. Correções gramaticais que a revisão deixou passar

Ao reproduzir o estilo, não copiar estes deslizes:

- "o fato da arquitetura impor" → "o fato de a arquitetura impor"
- "é apontado por como" → "é apontado como"
- "que conforme X, significa" → "que, conforme X, significa"
- "Além disso, há também" → "Além disso" ou "Há também"

## 8. Estrutura de parágrafo

1. Abrir com a afirmação, não com meta-discurso ("Nesta seção...", "É importante notar...").
2. Desenvolver com um exemplo, número ou consequência.
3. Fechar com o efeito concreto, não com um resumo do que já foi dito.

## Checklist antes de entregar um trecho

- [ ] Há nominalização empilhada?
- [ ] Há adjetivo que não será medido no texto?
- [ ] Há conector de preenchimento?
- [ ] Há lista de tecnologias sem uso analítico?
- [ ] O parágrafo termina em resumo vazio?
- [ ] O termo técnico que é critério do trabalho foi preservado?
- [ ] A frase tem sujeito, verbo e complemento identificáveis?

## Referências de voz (trechos da revisão)

> "Outro problema é o fato de a arquitetura monolítica impor uma limitação severa à escalabilidade granular."

> "Esse fator dificulta a entrega de novas funcionalidades e aumenta o risco de falha geral, pois uma exceção não tratada em um módulo pode derrubar todo o processo da aplicação."

> "Apesar dos benefícios de disponibilidade e desacoplamento, a adoção de microsserviços introduz uma série de complexidades típicas dos sistemas distribuídos: (1) maior dependência dos serviços de rede; (2) a maior latência das requisições via rede; (3) maior complexidade devido ao emprego de diferentes tecnologias; e (4) maior dificuldade no diagnóstico de falhas."
