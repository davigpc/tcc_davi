import express, { Request, Response } from 'express';
import cors from 'cors';
import { pool } from './config/database.js';
import { auctionListRouter } from './auctions/auctions.controller.js';
import { bidsRouter } from './bids/bids.controller.js';
import { tickerRouter } from './ticker/ticker.controller.js';

const app = express();
const port = process.env.PORT || 8003;

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  return res.json({
    app: 'Auction Market Monolith',
    port,
    status: 'ONLINE',
    endpoints: ['/health', '/api/auctions', '/api/bids/:auctionId', '/api/ticker']
  });
});

app.get('/health', async (req: Request, res: Response) => {
  try {
    const dbRes = await pool.query('SELECT NOW()');
    return res.json({
      service: 'auction-monolith-service',
      architecture: 'Monolith',
      status: 'UP',
      port,
      dbTime: dbRes.rows[0].now,
      timestamp: new Date()
    });
  } catch (err: any) {
    return res.status(500).json({
      service: 'auction-monolith-service',
      status: 'DOWN',
      error: err.message
    });
  }
});

app.use('/api', auctionListRouter);
app.use('/api', bidsRouter);
app.use('/api', tickerRouter);

app.listen(port, () => {
  console.log(`[Auction Monolith] Servidor rodando na porta ${port}`);
});
