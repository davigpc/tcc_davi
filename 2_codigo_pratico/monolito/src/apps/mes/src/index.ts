import express, { Request, Response } from 'express';
import cors from 'cors';
import { pool } from './config/database.js';
import { mesWorkOrdersRouter } from './work-orders/work-orders.controller.js';
import { mesProductionLogsRouter } from './production-logs/production-logs.controller.js';
import { mesQualityRouter } from './quality/quality.controller.js';

const app = express();
const port = process.env.PORT || 8002;

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  return res.json({
    app: 'MES Manufacturing Monolith',
    port,
    status: 'ONLINE',
    endpoints: ['/health', '/api/work-orders', '/api/production-logs', '/api/quality-inspections']
  });
});

app.get('/health', async (req: Request, res: Response) => {
  try {
    const dbRes = await pool.query('SELECT NOW()');
    return res.json({
      service: 'mes-monolith-service',
      architecture: 'Monolith',
      status: 'UP',
      port,
      dbTime: dbRes.rows[0].now,
      timestamp: new Date()
    });
  } catch (err: any) {
    return res.status(500).json({
      service: 'mes-monolith-service',
      status: 'DOWN',
      error: err.message
    });
  }
});

app.use('/api', mesWorkOrdersRouter);
app.use('/api', mesProductionLogsRouter);
app.use('/api', mesQualityRouter);

app.listen(port, () => {
  console.log(`[MES Monolith] Servidor rodando na porta ${port}`);
});
