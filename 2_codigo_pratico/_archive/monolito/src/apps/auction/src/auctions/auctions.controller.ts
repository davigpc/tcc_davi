import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';

export const auctionListRouter = Router();

auctionListRouter.get('/auctions', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query('SELECT * FROM auctions ORDER BY end_time ASC');
    return res.json({ domain: 'Leilões (Pregão)', count: rows.length, auctions: rows });
  } catch (error: any) {
    return res.status(500).json({ domain: 'Leilões (Pregão)', error: error.message });
  }
});

auctionListRouter.post('/auctions', async (req: Request, res: Response) => {
  try {
    const { assetName, initialPrice, durationMinutes } = req.body;
    const auctionId = `auc_${Date.now()}`;
    const endTime = new Date(Date.now() + (durationMinutes || 60) * 60000);

    const { rows } = await pool.query(
      `INSERT INTO auctions (id, asset_name, current_price, status, end_time)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [auctionId, assetName, initialPrice, 'ACTIVE', endTime]
    );

    return res.status(201).json({ domain: 'Leilões (Pregão)', auction: rows[0] });
  } catch (error: any) {
    return res.status(500).json({ domain: 'Leilões (Pregão)', error: error.message });
  }
});
