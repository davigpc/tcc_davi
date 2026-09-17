import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';

export const mesWorkOrdersRouter = Router();

mesWorkOrdersRouter.get('/work-orders', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM mes_work_orders ORDER BY created_at DESC');
    return res.json({ domain: 'MES (Ordens de Produção)', count: rows.length, data: rows });
  } catch (error: any) {
    return res.status(500).json({ domain: 'MES (Ordens de Produção)', error: error.message });
  }
});

mesWorkOrdersRouter.post('/work-orders', async (req: Request, res: Response) => {
  try {
    const { productCode, targetQuantity, priority } = req.body;
    const opNumber = `OP-${Date.now()}`;

    const { rows } = await pool.query(
      `INSERT INTO mes_work_orders (op_number, product_code, target_quantity, produced_quantity, status, priority)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [opNumber, productCode, targetQuantity, 0, 'PLANNED', priority || 'MEDIUM']
    );

    return res.status(201).json({ domain: 'MES (Ordens de Produção)', workOrder: rows[0] });
  } catch (error: any) {
    return res.status(500).json({ domain: 'MES (Ordens de Produção)', error: error.message });
  }
});
