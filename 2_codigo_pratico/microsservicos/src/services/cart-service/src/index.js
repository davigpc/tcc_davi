const express = require('express');
const cors = require('cors');
const Redis = require('ioredis');

const app = express();
const port = process.env.PORT || 3002;
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;

app.use(cors());
app.use(express.json());

const redis = new Redis({
  host: redisHost,
  port: Number(redisPort),
  retryStrategy(times) {
    console.log(`[Cart Service] Tentativa de reconexão Redis #${times}`);
    return Math.min(times * 100, 3000);
  }
});

redis.on('connect', () => {
  console.log('[Cart Service] Conectado com sucesso ao Redis!');
});

// Rota Raiz
app.get('/', (req, res) => {
  res.json({
    service: 'cart-service',
    status: 'ONLINE',
    endpoints: ['/health', '/api/cart/:customerId']
  });
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'cart-service',
    status: 'UP',
    redis: redis.status,
    timestamp: new Date()
  });
});

// Obter carrinho do cliente
app.get('/api/cart/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    let items;
    if (cartData) {
      items = JSON.parse(cartData);
    } else {
      items = [];
    }
    res.json({ customerId, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Adicionar / Atualizar item no carrinho
app.post('/api/cart/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const { product } = req.body; // { id, sku, nome, preco, quantidade }

    if (!product || !product.sku) {
      return res.status(400).json({ error: 'Produto inválido' });
    }

    const cartData = await redis.get(`cart:${customerId}`);
    let items;
    if (cartData) {
      items = JSON.parse(cartData);
    } else {
      items = [];
    }

    const existingIndex = items.findIndex(item => item.sku === product.sku);
    if (existingIndex > -1) {
      items[existingIndex].quantidade += (product.quantidade || 1);
    } else {
      items.push({
        sku: product.sku,
        nome: product.nome,
        preco: product.preco,
        quantidade: product.quantidade || 1
      });
    }

    // Salva no Redis com TTL de 24 horas (86400s)
    await redis.set(`cart:${customerId}`, JSON.stringify(items), 'EX', 86400);

    res.json({ message: 'Item adicionado ao carrinho com sucesso!', customerId, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Limpar carrinho
app.delete('/api/cart/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    await redis.del(`cart:${customerId}`);
    res.json({ message: 'Carrinho esvaziado com sucesso.', customerId, items: [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`[Cart Service] Escutando na porta ${port}`);
});
