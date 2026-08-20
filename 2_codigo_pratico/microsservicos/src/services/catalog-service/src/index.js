const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3001;
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/catalog_db';

app.use(cors());
app.use(express.json());

let db;

async function connectMongo() {
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db();
    console.log('[Catalog Service] Conectado com sucesso ao MongoDB!');
  } catch (err) {
    console.error('[Catalog Service] Erro ao conectar ao MongoDB:', err.message);
  }
}

connectMongo();

// Rota Raiz
app.get('/', (req, res) => {
  res.json({
    service: 'catalog-service',
    status: 'ONLINE',
    endpoints: ['/health', '/api/products', '/api/products/:id']
  });
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  let dbStatus;
  if (db) {
    dbStatus = 'CONNECTED';
  } else {
    dbStatus = 'DISCONNECTED';
  }
  res.json({
    service: 'catalog-service',
    status: 'UP',
    database: dbStatus,
    timestamp: new Date()
  });
});

// Listar todos os produtos
app.get('/api/products', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Banco de dados MongoDB indisponível.' });
    }
    const products = await db.collection('products').find({}).toArray();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Buscar produto por ID
app.get('/api/products/:id', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'MongoDB indisponível.' });
    let query;
    if (ObjectId.isValid(req.params.id)) {
      query = { _id: new ObjectId(req.params.id) };
    } else {
      query = { sku: req.params.id };
    }

    const product = await db.collection('products').findOne(query);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`[Catalog Service] Escutando na porta ${port}`);
});
