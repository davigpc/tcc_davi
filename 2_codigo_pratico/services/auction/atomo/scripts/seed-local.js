/* Seed deterministico do grupo atomico do leilao (snapshot final).
 *
 * Cria tipos de carta, cartas e um leilao ativo de 6h. Os usuarios ficam no
 * banco da Identidade e os ids fixos batem entre os dois seeds.
 */
const { Client } = require('pg');

const SELLER_ID = '11111111-1111-4111-8111-111111111111';
const BIDDER_ID = '22222222-2222-4222-8222-222222222222';
const CARD_TYPE_LIONEL = '33333333-3333-4333-8333-333333333333';
const CARD_TYPE_RONALDO = '44444444-4444-4444-8444-444444444444';
const CARD_TYPE_NEYMAR = '55555555-5555-4555-8555-555555555555';
const AUCTION_CARD_ID = '66666666-6666-4666-8666-666666666666';
const BIDDER_CARD_ID = '77777777-7777-4777-8777-777777777777';
const SPARE_CARD_ID = '88888888-8888-4888-8888-888888888888';
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

  await client.query(
    'TRUNCATE card_transfers, bids, auctions, cards, card_types RESTART IDENTITY CASCADE',
  );

  const cardTypes = [
    { id: CARD_TYPE_LIONEL, name: 'Lionel Messi', attack: 82, midfield: 64, defense: 71 },
    { id: CARD_TYPE_RONALDO, name: 'Cristiano Ronaldo', attack: 67, midfield: 76, defense: 48 },
    { id: CARD_TYPE_NEYMAR, name: 'Neymar', attack: 95, midfield: 58, defense: 88 },
  ];

  for (const type of cardTypes) {
    await client.query(
      `INSERT INTO card_types (id, name, attack, midfield, defense)
       VALUES ($1, $2, $3, $4, $5)`,
      [type.id, type.name, type.attack, type.midfield, type.defense],
    );
  }

  await client.query(
    `INSERT INTO cards (id, card_type_id, owner_user_id, status)
     VALUES ($1, $2, $3, 'LOCKED_IN_AUCTION'),
            ($4, $5, $6, 'OWNED'),
            ($7, $8, $9, 'OWNED')`,
    [
      AUCTION_CARD_ID,
      CARD_TYPE_LIONEL,
      SELLER_ID,
      BIDDER_CARD_ID,
      CARD_TYPE_NEYMAR,
      BIDDER_ID,
      SPARE_CARD_ID,
      CARD_TYPE_RONALDO,
      SELLER_ID,
    ],
  );

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
