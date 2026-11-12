import mongoose from 'mongoose';

/**
 * Contador de estoque do Checkout.
 *
 * No snapshot final o estoque é um dado do Checkout, não do Catálogo: é o que
 * permite baixar o saldo na mesma sessão Mongo da mudança de status do pedido.
 * O Catálogo mantém apenas uma cópia de leitura para exibir `stock`.
 */
export const StockSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      unique: true,
    },
    available: { type: Number, required: true },
  },
  { collection: 'stock', versionKey: false },
);
