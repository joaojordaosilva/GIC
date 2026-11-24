import pg from 'pg';

const { Pool } = pg;

export function criarPool(cfg) {
  return new Pool({
    connectionString: cfg.databaseUrl,
    ssl: cfg.dbSsl ? { rejectUnauthorized: false } : undefined,
    max: Number(process.env.DB_POOL_MAX) || 3 // serverless: poucas conexões por instância
  });
}

// Executa fn(client) dentro de uma transação. Qualquer erro => ROLLBACK.
export async function comTransacao(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (erro) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* conexão já caiu; nada a fazer */
    }
    throw erro;
  } finally {
    client.release();
  }
}
