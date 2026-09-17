import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';

export const cartRouter = Router();

cartRouter.get('/cart/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { rows } = await pool.query('SELECT * FROM cart_items WHERE customer_id = $1', [customerId]);
    return res.json({ domain: 'E-commerce (Carrinho)', customerId, items: rows });
  } catch (error: any) {
    return res.status(500).json({ domain: 'E-commerce (Carrinho)', error: error.message });
  }
});

cartRouter.post('/cart/:customerId/items', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const { sku, quantidade } = req.body;

    const prodRes = await pool.query('SELECT nome, preco FROM products WHERE sku = $1', [sku]);
    if (prodRes.rows.length === 0) {
      return res.status(404).json({ message: `Produto SKU ${sku} não encontrado.` });
    }

    const { nome, preco } = prodRes.rows[0];

    const { rows } = await pool.query(
      `INSERT INTO cart_items (customer_id, sku, nome, preco, quantidade)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (customer_id, sku)
       DO UPDATE SET quantidade = cart_items.quantidade + EXCLUDED.quantidade, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [customerId, sku, nome, preco, quantidade || 1]
    );

    return res.status(201).json({ domain: 'E-commerce (Carrinho)', item: rows[0] });
  } catch (error: any) {
    return res.status(500).json({ domain: 'E-commerce (Carrinho)', error: error.message });
  }
});
