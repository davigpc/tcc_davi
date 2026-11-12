import mongoose from 'mongoose';

/**
 * Visão de leitura da coleção `users`.
 *
 * O cadastro continua no monólito no snapshot-1. O Checkout só verifica a
 * existência do comprador antes de gravar carrinho e pedido; com o banco
 * compartilhado isso é uma consulta local, e não uma chamada HTTP.
 */
export const UserReferenceSchema = new mongoose.Schema(
  {},
  { collection: 'users', strict: false },
);
