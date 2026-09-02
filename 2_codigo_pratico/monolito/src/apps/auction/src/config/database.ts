import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.POSTGRES_URI || 'postgresql://tcc_user:tcc_password@localhost:5433/monolith_db',
});

pool.on('error', (err) => {
  console.error('[Auction DB Error]', err);
});
