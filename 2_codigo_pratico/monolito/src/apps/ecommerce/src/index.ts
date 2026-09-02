import express, { Request, Response } from 'express';
import cors from 'cors';
import { pool } from './config/database.js';
import { catalogRouter } from './catalog/catalog.controller.js';
import { cartRouter } from './cart/cart.controller.js';
import { ordersRouter } from './orders/orders.controller.js';

const app = express();
const port = process.env.PORT || 8001;

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  return res.json({
    app: 'E-commerce Monolith',
    port,
    status: 'ONLINE',
    endpoints: ['/health', '/api/products', '/api/cart/:customerId', '/api/orders']
  });
});

app.get('/health', async (req: Request, res: Response) => {
  try {
    const dbRes = await pool.query('SELECT NOW()');
    return res.json({
      service: 'ecommerce-monolith-service',
      architecture: 'Monolith',
      status: 'UP',
      port,
      dbTime: dbRes.rows[0].now,
      timestamp: new Date()
    });
  } catch (err: any) {
    return res.status(500).json({
      service: 'ecommerce-monolith-service',
      status: 'DOWN',
      error: err.message
    });
  }
});

app.use('/api', catalogRouter);
app.use('/api', cartRouter);
app.use('/api', ordersRouter);

app.listen(port, () => {
  console.log(`[E-Commerce Monolith] Servidor rodando na porta ${port}`);
});
