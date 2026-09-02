import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';

export const mesQualityRouter = Router();

mesQualityRouter.get('/quality-inspections', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM mes_quality_inspections ORDER BY inspected_at DESC');
    return res.json({ domain: 'MES (Qualidade)', count: rows.length, inspections: rows });
  } catch (error: any) {
    return res.status(500).json({ domain: 'MES (Qualidade)', error: error.message });
  }
});

mesQualityRouter.post('/quality-inspections', async (req: Request, res: Response) => {
  try {
    const { opNumber, inspectorId, result, defectType, notes } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO mes_quality_inspections (op_number, inspector_id, result, defect_type, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [opNumber, inspectorId, result || 'PASSED', defectType || null, notes || '']
    );

    return res.status(201).json({ domain: 'MES (Qualidade)', inspection: rows[0] });
  } catch (error: any) {
    return res.status(500).json({ domain: 'MES (Qualidade)', error: error.message });
  }
});
