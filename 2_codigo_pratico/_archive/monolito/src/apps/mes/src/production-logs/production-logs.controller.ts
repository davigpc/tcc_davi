import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';

export const mesProductionLogsRouter = Router();

mesProductionLogsRouter.get('/production-logs', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM mes_production_logs ORDER BY timestamp DESC LIMIT 50');
    return res.json({ domain: 'MES (Apontamentos)', count: rows.length, logs: rows });
  } catch (error: any) {
    return res.status(500).json({ domain: 'MES (Apontamentos)', error: error.message });
  }
});

mesProductionLogsRouter.post('/production-logs', async (req: Request, res: Response) => {
  try {
    const { opNumber, machineId, operatorId, quantityProduced, rejectedQuantity } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const logRes = await client.query(
        `INSERT INTO mes_production_logs (op_number, machine_id, operator_id, quantity_produced, rejected_quantity)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [opNumber, machineId, operatorId, quantityProduced, rejectedQuantity || 0]
      );

      await client.query(
        `UPDATE mes_work_orders 
         SET produced_quantity = produced_quantity + $1, status = 'IN_PROGRESS'
         WHERE op_number = $2`,
        [quantityProduced, opNumber]
      );

      await client.query('COMMIT');
      return res.status(201).json({ domain: 'MES (Apontamentos)', log: logRes.rows[0] });
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    return res.status(500).json({ domain: 'MES (Apontamentos)', error: error.message });
  }
});
