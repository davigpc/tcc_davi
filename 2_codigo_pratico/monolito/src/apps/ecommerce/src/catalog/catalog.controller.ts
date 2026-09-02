import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';

export const catalogRouter = Router();

catalogRouter.get('/products', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products ORDER BY id ASC');
    return res.json({ domain: 'E-commerce (Catálogo)', count: rows.length, data: rows });
  } catch (error: any) {
    return res.status(500).json({ domain: 'E-commerce (Catálogo)', error: error.message });
  }
});

catalogRouter.get('/products/:sku', async (req: Request, res: Response) => {
  try {
    const { sku } = req.params;
    const { rows } = await pool.query('SELECT * FROM products WHERE sku = $1', [sku]);
    if (rows.length === 0) {
      return res.status(404).json({ message: `Produto SKU ${sku} não encontrado.` });
    }
    return res.json({ domain: 'E-commerce (Catálogo)', data: rows[0] });
  } catch (error: any) {
    return res.status(500).json({ domain: 'E-commerce (Catálogo)', error: error.message });
  }
});
