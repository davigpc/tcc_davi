import { Router, Request, Response } from 'express';
import { pool } from '../config/database.js';

export const bidsRouter = Router();

bidsRouter.get('/bids/:auctionId', async (req: Request, res: Response) => {
  try {
    const { auctionId } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM auction_bids WHERE auction_id = $1 ORDER BY bid_amount DESC',
      [auctionId]
    );
    return res.json({ domain: 'Leilões (Lances)', auctionId, totalBids: rows.length, bids: rows });
  } catch (error: any) {
    return res.status(500).json({ domain: 'Leilões (Lances)', error: error.message });
  }
});

bidsRouter.post('/bids', async (req: Request, res: Response) => {
  try {
    const { auctionId, bidderId, bidAmount } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const aucRes = await client.query(
        'SELECT current_price, status FROM auctions WHERE id = $1 FOR UPDATE',
        [auctionId]
      );

      if (aucRes.rows.length === 0 || aucRes.rows[0].status !== 'ACTIVE') {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Leilão encerrado ou não encontrado.' });
      }

      const currentPrice = Number(aucRes.rows[0].current_price);
      if (Number(bidAmount) <= currentPrice) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Lance de R$${bidAmount} deve ser superior ao valor atual de R$${currentPrice}.` });
      }

      const bidId = `bid_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const bidRes = await client.query(
        `INSERT INTO auction_bids (id, auction_id, bidder_id, bid_amount) VALUES ($1, $2, $3, $4) RETURNING *`,
        [bidId, auctionId, bidderId, bidAmount]
      );

      await client.query('UPDATE auctions SET current_price = $1 WHERE id = $2', [bidAmount, auctionId]);

      await client.query('COMMIT');
      return res.status(201).json({ domain: 'Leilões (Lances)', bid: bidRes.rows[0] });
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error: any) {
    return res.status(500).json({ domain: 'Leilões (Lances)', error: error.message });
  }
});
