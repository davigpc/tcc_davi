const { Pool } = require('pg');

const postgresUri = process.env.POSTGRES_URI || 'postgresql://tcc_user:tcc_password@localhost:5433/monolith_db';

const pool = new Pool({
  connectionString: postgresUri,
});

pool.on('connect', () => {
  console.log('[Monolith Database] Conectado com sucesso ao PostgreSQL (monolith_db)!');
});

pool.on('error', (err) => {
  console.error('[Monolith Database] Erro inesperado no pool PostgreSQL:', err);
});

module.exports = pool;
