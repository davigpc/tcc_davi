/* Seed determinístico do e-commerce para o experimento.
 *
 * Roda dentro do container da API (imagem de produção) e usa a própria API
 * HTTP. Antes de semear, apaga o banco para garantir o mesmo estado inicial
 * em todas as execuções.
 */
const mongoose = require('mongoose');

const BASE =
  process.env.SEED_BASE_URL ||
  process.env.BASE_URL ||
  'http://localhost:3001';
const EMAIL = process.env.SEED_EMAIL || 'buyer@example.com';
const PASSWORD = process.env.SEED_PASSWORD || 'password123';

const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64',
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForApi() {
  for (let i = 0; i < 90; i += 1) {
    try {
      const response = await fetch(`${BASE}/api/health/db`);
      if (response.ok) return;
    } catch {
      // API ainda não subiu.
    }
    await sleep(1000);
  }
  throw new Error(`API não respondeu em ${BASE}`);
}

async function request(path, init = {}) {
  const response = await fetch(`${BASE}${path}`, init);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(
      `${init.method || 'GET'} ${path} -> ${response.status}: ${text}`,
    );
  }
  return body;
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

function postJson(path, body, token) {
  return request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? auth(token) : {}),
    },
    body: JSON.stringify(body),
  });
}

function postForm(path, fields, token) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
  form.append('images', new Blob([PIXEL_PNG], { type: 'image/png' }), 'pixel.png');
  return request(path, {
    method: 'POST',
    headers: token ? auth(token) : {},
    body: form,
  });
}

async function resetDatabase() {
  if (process.env.SEED_RESET === 'false') return;
  if (!process.env.MONGO_URI) return;
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DATABASE,
  });
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

async function flushCache() {
  if (!process.env.REDIS_HOST) return;
  try {
    const redis = require('redis');
    const client = redis.createClient({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT || 6379),
    });
    if (typeof client.connect === 'function') {
      await client.connect();
      await client.flushAll();
      await client.disconnect();
    } else {
      await new Promise((resolve, reject) => {
        client.flushall((error) => (error ? reject(error) : resolve(undefined)));
      });
      client.quit();
    }
  } catch (error) {
    console.warn(`cache flush failed: ${error.message}`);
  }
}

async function main() {
  await waitForApi();
  await resetDatabase();
  await flushCache();

  let session;
  try {
    session = await postJson('/api/auth/register', {
      name: 'Seed Buyer',
      role: 'buyer',
      email: EMAIL,
      password: PASSWORD,
    });
  } catch {
    session = await postJson('/api/auth/login', {
      email: EMAIL,
      password: PASSWORD,
    });
  }

  const token = session.accessToken;
  const userId = session.user._id;

  const products = [];
  for (let i = 1; i <= 2; i += 1) {
    products.push(
      await postForm(
        '/api/products',
        {
          seller: userId,
          stock: '50',
          price: String(100 + i),
          name: `Seed Product ${i}`,
          description: `Produto de seed ${i}`,
          category: 'seed',
          subcategory: 'seed',
          attributes: JSON.stringify([{ key: 'color', value: 'red' }]),
        },
        token,
      ),
    );
  }

  const order = await postJson(
    '/api/orders',
    {
      customer: userId,
      items: [{ id: products[0]._id, type: 'Product', quantity: 1 }],
      amount: 101,
      billing_details: {
        name: 'Seed Buyer',
        email: EMAIL,
        address: 'Rua 1',
        city: 'São João del-Rei',
        postcode: '36300-000',
        phone: '+550000000000',
      },
      order_notes: 'seed',
    },
    token,
  );

  let orderId = null;
  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        dbName: process.env.MONGO_DATABASE,
      });
      const created = await mongoose.connection.db
        .collection('orders')
        .findOne(
          { customer: new mongoose.Types.ObjectId(userId) },
          { sort: { _id: -1 } },
        );
      orderId = created ? String(created._id) : null;
      await mongoose.disconnect();
    } catch (error) {
      console.warn(`order lookup failed: ${error.message}`);
    }
  }

  console.log(
    JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      userId,
      productId: products[0]._id,
      productIds: products.map((product) => product._id),
      orderId,
      orderClientSecret: order.client_secret,
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
