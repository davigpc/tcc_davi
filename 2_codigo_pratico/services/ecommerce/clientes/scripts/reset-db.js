/* Zera o banco do serviço antes do seed.
 *
 * Cada serviço tem o próprio MongoDB no snapshot final, então o reset deixou de
 * ser um `dropDatabase` único do monólito: cada um limpa a sua base.
 */
const mongoose = require('mongoose');

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI não definido');
  }
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DATABASE,
  });
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  console.log('banco limpo');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
