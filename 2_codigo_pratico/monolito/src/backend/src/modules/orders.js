const express = require('express');
const pool = require('../config/db');

const router = express.Router();

// Listar todos os pedidos
router.get('/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('[Orders Module] Erro ao listar pedidos:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Criar pedido no Monólito (Transação ACID pura entre Pedido, Pagamento e Limpeza de Carrinho)
router.post('/orders', async (req, res) => {
  const client = await pool.connect();
  try {
    const { customerId, items, paymentMethod = 'PIX' } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'O pedido não possui itens.' });
    }

    const totalAmount = items.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
    const orderId = `ord_mono_${Date.now()}`;
    const paymentId = `pay_mono_${Date.now()}`;

    // Inicia Transação ACID Local Única no Monólito
    await client.query('BEGIN');

    // 1. Inserir Pedido
    const insertOrderQuery = `
      INSERT INTO orders (id, customer_id, total_amount, status, items)
      VALUES ($1, $2, $3, $4, $5) RETURNING *;
    `;
    const orderRes = await client.query(insertOrderQuery, [
      orderId,
      customerId || 'usr_anonymous',
      totalAmount,
      'COMPLETED',
      JSON.stringify(items)
    ]);

    // 2. Inserir Pagamento
    const insertPaymentQuery = `
      INSERT INTO payments (id, order_id, amount, payment_method, status)
      VALUES ($1, $2, $3, $4, $5);
    `;
    await client.query(insertPaymentQuery, [
      paymentId,
      orderId,
      totalAmount,
      paymentMethod,
      'APPROVED'
    ]);

    // 3. Esvaziar Carrinho Automaticamente dentro da mesma transação no Monólito
    if (customerId) {
      await client.query('DELETE FROM cart_items WHERE customer_id = $1', [customerId]);
    }

    // Commit da Transação Monolítica
    await client.query('COMMIT');

    console.log(`[Orders Module] Pedido ${orderId} e pagamento ${paymentId} processados com sucesso no Monólito!`);

    res.status(201).json({
      message: 'Pedido realizado com sucesso no Monólito!',
      order: orderRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Orders Module] Erro na transação do pedido no Monólito:', err.message);
    res.status(500).json({ error: 'Falha ao processar pedido no Monólito.', details: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
