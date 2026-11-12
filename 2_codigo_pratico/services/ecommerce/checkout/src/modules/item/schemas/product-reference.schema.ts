import mongoose from 'mongoose';

/**
 * Visão de leitura da coleção `products`.
 *
 * No snapshot-1 o MongoDB ainda é o do monólito, então o Checkout lê o produto
 * e escreve o estoque na mesma coleção. O schema não repete os campos: só
 * existe para o `populate('items.id')` e para o `$inc` de estoque.
 *
 * Esse acoplamento de dados sai quando o banco for separado no snapshot final.
 */
export const ProductReferenceSchema = new mongoose.Schema(
  {},
  { collection: 'products', strict: false },
);
