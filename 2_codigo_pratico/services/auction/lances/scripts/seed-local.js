/* Reset deterministico do servico de Lances (snapshot final).
 *
 * O estado do leilao e materializado na primeira operacao, entao o servico nao
 * tem dados proprios para semear: apenas limpa lances e o estado local para que
 * a medicao comece do zero.
 */
const { Client } = require('pg');

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
    'TRUNCATE bids, bid_auction_state RESTART IDENTITY CASCADE',
  );

  console.log(JSON.stringify({ reset: 'lances' }));

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
