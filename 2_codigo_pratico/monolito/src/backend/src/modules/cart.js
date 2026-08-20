const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// Obter carrinho do cliente
router.get('/cart/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const result = await pool.query(
      'SELECT sku, nome, preco::float, quantidade FROM cart_items WHERE customer_id = $1 ORDER BY id ASC',
      [customerId]
    );
    res.json({ customerId, items: result.rows });
  } catch (err) {
    console.error('[Cart Module] Erro ao buscar carrinho:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Adicionar / Atualizar item no carrinho
router.post('/cart/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { product } = req.body; // { sku, nome, preco, quantidade }

    if (!product || !product.sku) {
      return res.status(400).json({ error: 'Produto inválido' });
    }

    const quantidade = product.quantidade || 1;

    const upsertQuery = `
      INSERT INTO cart_items (customer_id, sku, nome, preco, quantidade, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (customer_id, sku)
      DO UPDATE SET
        quantidade = cart_items.quantidade + EXCLUDED.quantidade,
        updated_at = CURRENT_TIMESTAMP;
    `;

    await pool.query(upsertQuery, [
      customerId,
      product.sku,
      product.nome,
      product.preco,
      quantidade
    ]);

    const result = await pool.query(
      'SELECT sku, nome, preco::float, quantidade FROM cart_items WHERE customer_id = $1 ORDER BY id ASC',
      [customerId]
    );

    res.json({ message: 'Item adicionado ao carrinho com sucesso!', customerId, items: result.rows });
  } catch (err) {
    console.error('[Cart Module] Erro ao adicionar ao carrinho:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Limpar carrinho
router.delete('/cart/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    await pool.query('DELETE FROM cart_items WHERE customer_id = $1', [customerId]);
    res.json({ message: 'Carrinho esvaziado com sucesso.', customerId, items: [] });
  } catch (err) {
    console.error('[Cart Module] Erro ao limpar carrinho:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
