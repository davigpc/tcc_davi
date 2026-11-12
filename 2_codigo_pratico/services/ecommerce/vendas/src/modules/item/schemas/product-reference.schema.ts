import mongoose from 'mongoose';

/**
 * Visão de leitura da coleção `products`.
 *
 * Depois da extração do Catálogo, o dono do dado passou a ser o serviço em
 * `services/ecommerce/catalogo`. O monólito continua lendo a mesma coleção
 * porque o banco segue compartilhado nesta fase do Strangler Fig: o pedido
 * valida o item, o carrinho calcula o subtotal com o preço do produto e as duas
 * rotas de leitura fazem `populate('items.id')`.
 *
 * O schema não repete os campos do produto — só precisa existir como modelo
 * para essas consultas. Com `strict: false`, os campos gravados pelo serviço
 * (nome, imagens, atributos) continuam aparecendo no `populate`.
 *
 * Este acoplamento de dados sai quando o banco for separado no snapshot final.
 */
export const ProductReferenceSchema = new mongoose.Schema(
  {},
  { collection: 'products', strict: false },
);
