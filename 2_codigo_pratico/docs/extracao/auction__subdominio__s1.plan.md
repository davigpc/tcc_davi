# Pre-registro de Extração — leilão / Subdomínio (DDD) / snapshot-1

Escrito antes da medição do s1.

## Classificação dos subdomínios

| Classificação | Subdomínio | Módulos |
|---|---|---|
| Genérico | Identidade | `auth`, `users` |
| Genérico | Tempo Real | `realtime` (gateway Socket.IO e assinante) |
| Suporte | Catálogo de Cartas | `cards`, `card-types` |
| Núcleo | Leilão | `auctions`, `bids`, `auction-jobs`, worker |

O núcleo reúne leilão **e** lances porque a regra que dá valor ao sistema — o
lance sempre crescente e a carta que muda de dono no fechamento — depende das
duas partes na mesma escrita. O catálogo é necessário, mas não diferencia o
negócio; identidade e tempo real poderiam ser atendidos por componentes prontos.

## Ordem das extrações

Inversa à da Capacidade de Negócio: **genéricos → suporte → núcleo**.

- **s1**: Identidade e Tempo Real saem; o monólito fica com catálogo, leilão e
  lances, sobre o banco compartilhado.
- **s2**: Catálogo sai; o monólito fica com o núcleo, ainda lendo cartas no banco
  compartilhado.
- **final**: o núcleo sai como serviço único (`leilao` com `auctions`, `bids`,
  `auction-jobs` e o worker), com banco isolado; a carta passa a ser travada e
  transferida por chamada HTTP ao Catálogo.

## Decisões do s1

**1. O login sai, mas os dados de usuário ficam.** O controlador e o serviço de
autenticação passam para o serviço de Identidade. O monólito mantém uma cópia
local do mapeamento de `users` e os guardas de token, porque cartas, leilões e
lances ainda exibem nome e e-mail do usuário. O banco é o mesmo, então essa
leitura não atravessa serviço nesta fase.

**2. O gateway do Socket.IO sai, o publicador fica.** O monólito continua
publicando eventos no Redis; quem entrega aos clientes é o serviço de Tempo Real,
que assina o canal e valida o token no handshake.

**3. A conexão com o banco continua única.** Identidade aponta para o banco do
monólito e roda com `DATABASE_SYNC=false`: o esquema é criado pelas migrações do
monólito, como no baseline.

## Hipóteses de medição

1. **Build sobe** pela construção de duas imagens novas (Identidade e Tempo Real),
   somadas à imagem do monólito.
2. **Inicialização sobe** pela soma dos healthchecks de dois serviços.
3. **LOC sobe** pela duplicação de configuração, guarda de token e cliente HTTP.
4. **Cross-domain sobe**, como no s1 das outras trilhas: cada serviço recria as
   arestas internas do módulo que saiu.
5. **Leitura e escrita ficam estáveis**, com pequena perda pelo salto do gateway.
6. **RAM sobe** com dois processos adicionais.

## O que o s1 prepara

O s1 ainda não mexe na escrita: o lance continua atômico porque o banco é o mesmo.
O custo que essa trilha investiga aparece no final, quando o núcleo fica sozinho
— mas, ao contrário da Capacidade de Negócio, lances e leilões permanecem juntos.
