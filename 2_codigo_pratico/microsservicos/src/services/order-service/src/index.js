const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3003;
const postgresUri = process.env.POSTGRES_URI || 'postgresql://tcc_user:tcc_password@localhost:5432/orders_db';

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: postgresUri,
});

pool.on('connect', () => {
  console.log('[Order Service] Conectado com sucesso ao PostgreSQL!');
});

// Rota Raiz
app.get('/', (req, res) => {
  res.json({
    service: 'order-service',
    status: 'ONLINE',
    endpoints: ['/health', '/api/orders']
  });
});

// Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW()');
    res.json({
      service: 'order-service',
      status: 'UP',
      dbTime: dbRes.rows[0].now,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ service: 'order-service', status: 'DOWN', error: err.message });
  }
});

// Listar todos os pedidos
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar um novo pedido com transação ACID no PostgreSQL
app.post('/api/orders', async (req, res) => {
  const client = await pool.connect();
  try {
    const { customerId, items, paymentMethod = 'PIX' } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'O pedido não possui itens.' });
    }

    const totalAmount = items.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
    const orderId = `ord_${Date.now()}`;
    const paymentId = `pay_${Date.now()}`;

    // Inicia transação ACID local
    await client.query('BEGIN');

    // Insert Order
    const insertOrderQuery = `
      INSERT INTO orders (id, customer_id, total_amount, status, items)
      VALUES ($1, $2, $3, $4, $5) RETURNING *;
    `;
    const orderRes = await client.query(insertOrderQuery, [
      orderId,
      customerId || 'usr_anonymous',
      totalAmount,
      'COMPLETED',
      JSON.stringify(items)
    ]);

    // Insert Payment
    const insertPaymentQuery = `
      INSERT INTO payments (id, order_id, amount, payment_method, status)
      VALUES ($1, $2, $3, $4, $5);
    `;
    await client.query(insertPaymentQuery, [
      paymentId,
      orderId,
      totalAmount,
      paymentMethod,
      'APPROVED'
    ]);

    // Commit da transação
    await client.query('COMMIT');

    console.log(`[Order Service] Pedido ${orderId} e pagamento ${paymentId} criados com sucesso!`);

    res.status(201).json({
      message: 'Pedido realizado com sucesso!',
      order: orderRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Order Service] Erro na transação do pedido:', err.message);
    res.status(500).json({ error: 'Falha ao processar pedido.', details: err.message });
  } finally {
    client.release();
  }
});

app.listen(port, () => {
  console.log(`[Order Service] Escutando na porta ${port}`);
});
