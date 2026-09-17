import { Router, Request, Response } from 'express';

export const tickerRouter = Router();

tickerRouter.get('/ticker', (req: Request, res: Response) => {
  return res.json({
    domain: 'Leilões (Ticker de Mercado)',
    timestamp: new Date(),
    marketStatus: 'OPEN',
    tickers: [
      { asset: 'LOTE-MANUFATURA-01', price: 12500.00, change24h: '+4.2%' },
      { asset: 'LEILAO-MAQUINARIO-A', price: 48900.00, change24h: '+1.8%' }
    ]
  });
});
