import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';

export const ordersRouter = Router();

ordersRouter.get('/orders', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    return res.json({ domain: 'E-commerce (Pedidos)', count: rows.length, orders: rows });
  } catch (error: any) {
    return res.status(500).json({ domain: 'E-commerce (Pedidos)', error: error.message });
  }
});

ordersRouter.post('/orders', async (req: Request, res: Response) => {
  try {
    const { customerId, paymentMethod } = req.body;
    const cartRes = await pool.query('SELECT * FROM cart_items WHERE customer_id = $1', [customerId]);

    if (cartRes.rows.length === 0) {
      return res.status(400).json({ message: 'Carrinho vazio para checkout.' });
    }

    const items = cartRes.rows;
    const totalAmount = items.reduce((acc, item) => acc + Number(item.preco) * Number(item.quantidade), 0);
    const orderId = `ord_${Date.now()}`;

    await pool.query(
      `INSERT INTO orders (id, customer_id, total_amount, status, items) VALUES ($1, $2, $3, $4, $5)`,
      [orderId, customerId, totalAmount, 'COMPLETED', JSON.stringify(items)]
    );

    const paymentId = `pay_${Date.now()}`;
    await pool.query(
      `INSERT INTO payments (id, order_id, amount, payment_method, status) VALUES ($1, $2, $3, $4, $5)`,
      [paymentId, orderId, totalAmount, paymentMethod || 'CREDIT_CARD', 'APPROVED']
    );

    await pool.query('DELETE FROM cart_items WHERE customer_id = $1', [customerId]);

    return res.status(201).json({
      domain: 'E-commerce (Pedidos)',
      orderId,
      totalAmount,
      status: 'COMPLETED',
      paymentId
    });
  } catch (error: any) {
    return res.status(500).json({ domain: 'E-commerce (Pedidos)', error: error.message });
  }
});
