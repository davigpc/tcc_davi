const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const catalogRoutes = require('./modules/catalog');
const cartRoutes = require('./modules/cart');
const orderRoutes = require('./modules/orders');

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Rota Raiz
app.get('/', (req, res) => {
  res.json({
    message: 'Servidor Backend Monolítico (PoC TCC)',
    status: 'ONLINE',
    frontendUrl: 'http://localhost:3000',
    endpoints: ['/health', '/api/products', '/api/cart/:customerId', '/api/orders']
  });
});

// Health Check Endpoint Centralizado do Monólito
app.get('/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW()');
    res.json({
      service: 'monolith-service',
      architecture: 'Monolith',
      status: 'UP',
      database: 'PostgreSQL (monolith_db)',
      dbTime: dbRes.rows[0].now,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({
      service: 'monolith-service',
      architecture: 'Monolith',
      status: 'DOWN',
      error: err.message,
      timestamp: new Date()
    });
  }
});

// Registrar Módulos da Aplicação Monolítica
app.use('/api', catalogRoutes);
app.use('/api', cartRoutes);
app.use('/api', orderRoutes);

app.listen(port, () => {
  console.log(`=======================================================`);
  console.log(`[Monolith App] Aplicação Monolítica rodando na porta ${port}`);
  console.log(`[Monolith App] Módulos ativos: Catalog, Cart, Orders`);
  console.log(`=======================================================`);
});
