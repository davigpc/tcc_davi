/* Seed deterministico do nucleo do leilao (snapshot final).
 *
 * Cria um leilao ativo de 6h para a carta que o Catalogo ja deixou travada.
 * Os ids fixos batem com os seeds da Identidade e do Catalogo.
 */
const { Client } = require('pg');

const SELLER_ID = '11111111-1111-4111-8111-111111111111';
const AUCTION_CARD_ID = '66666666-6666-4666-8666-666666666666';
const AUCTION_ID = '99999999-9999-4999-8999-999999999999';

const client = new Client({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 5432),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

async function main() {
  await client.connect();

  await client.query('TRUNCATE bids, auctions RESTART IDENTITY CASCADE');

  await client.query(
    `INSERT INTO auctions
       (id, card_id, seller_user_id, status, start_price, start_time, end_time)
     VALUES ($1, $2, $3, 'ACTIVE', $4, NOW(), NOW() + INTERVAL '6 hours')`,
    [AUCTION_ID, AUCTION_CARD_ID, SELLER_ID, 100],
  );

  console.log(
    JSON.stringify({
      auctionId: AUCTION_ID,
      auctionCardId: AUCTION_CARD_ID,
      sellerId: SELLER_ID,
      sellerEmail: 'seller@example.com',
      bidderEmail: 'bidder@example.com',
      password: 'password123',
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
