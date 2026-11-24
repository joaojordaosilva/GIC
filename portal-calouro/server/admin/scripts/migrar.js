// Uso: npm run admin:migrar
// Aplica sql/migracao_admin.sql no banco apontado por DATABASE_URL.
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { carregarConfig } from '../config.js';
import { criarPool } from '../db.js';

const cfg = carregarConfig();
const pool = criarPool(cfg);

try {
  const arquivo = fileURLToPath(new URL('../sql/migracao_admin.sql', import.meta.url));
  const sql = await readFile(arquivo, 'utf8');
  await pool.query(sql);
  console.log('Migração aplicada com sucesso.');
} catch (e) {
  console.error('Falha na migração:', e.message);
  if (e.code === '42704' || e.code === '42P01') {
    console.error('Dica: rode antes o GIC_POSTGRE_FINALIZADO.sql (as tabelas base ainda não existem).');
  }
  process.exitCode = 1;
} finally {
  await pool.end();
}
