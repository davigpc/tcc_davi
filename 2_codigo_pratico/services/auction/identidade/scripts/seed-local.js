/* Seed deterministico do servico de Identidade (snapshot final).
 *
 * Os identificadores sao fixos para que o Catalogo e o Leilao possam
 * referenciar usuarios que vivem em outro banco.
 */
const bcrypt = require('bcrypt');
const { Client } = require('pg');

const PASSWORD = 'password123';
const SELLER_ID = '11111111-1111-4111-8111-111111111111';
const BIDDER_ID = '22222222-2222-4222-8222-222222222222';

const client = new Client({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 5432),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

async function main() {
  await client.connect();

  await client.query('TRUNCATE users RESTART IDENTITY CASCADE');

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  await client.query(
    `INSERT INTO users (id, email, username, password_hash)
     VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)`,
    [
      SELLER_ID,
      'seller@example.com',
      'seller',
      passwordHash,
      BIDDER_ID,
      'bidder@example.com',
      'bidder',
      passwordHash,
    ],
  );

  console.log(
    JSON.stringify({
      sellerId: SELLER_ID,
      bidderId: BIDDER_ID,
      password: PASSWORD,
    }),
  );

  await client.end();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await client.end();
  } catch {
    /* ignora */
  }
  process.exit(1);
});
