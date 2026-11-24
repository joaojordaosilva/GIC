// Uso: npm run admin:criar-usuario
// Cria (ou, se o e-mail já existir, redefine a senha de) um usuário do painel.
// A senha é pedida no terminal sem aparecer na tela; ou defina ADMIN_SENHA no ambiente.
import 'dotenv/config';
import readline from 'node:readline';
import bcrypt from 'bcryptjs';
import { carregarConfig } from '../config.js';
import { criarPool } from '../db.js';
import { email as validarEmail, senhaNova, texto, papel as validarPapel } from '../validacao.js';

function perguntar(rl, pergunta, { oculto = false } = {}) {
  return new Promise((resolve) => {
    if (oculto) {
      rl._writeToOutput = (s) => {
        if (s.includes(pergunta)) rl.output.write(s);
      };
    }
    rl.question(pergunta, (r) => {
      if (oculto) rl.output.write('\n');
      resolve(r);
    });
  });
}

const cfg = carregarConfig();
const pool = criarPool(cfg);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });

try {
  const nome = texto(await perguntar(rl, 'Nome: '), 'Nome', { obrigatorio: true, max: 100 });
  const email = validarEmail(await perguntar(rl, 'E-mail: '));
  const papel = validarPapel((await perguntar(rl, 'Papel (ADMIN ou EDITOR) [ADMIN]: ')).trim().toUpperCase() || 'ADMIN');
  const cargo = texto(await perguntar(rl, 'Cargo [Administrador]: '), 'Cargo', { max: 50 }) || 'Administrador';
  const senha = senhaNova(process.env.ADMIN_SENHA || (await perguntar(rl, 'Senha (mín. 8): ', { oculto: true })));

  const hash = await bcrypt.hash(senha, cfg.bcryptCusto);
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nome, email, senha_hash, cargo, papel)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (email) DO UPDATE SET nome = EXCLUDED.nome, senha_hash = EXCLUDED.senha_hash,
       cargo = EXCLUDED.cargo, papel = EXCLUDED.papel
     RETURNING id, (xmax = 0) AS criado`,
    [nome, email, hash, cargo, papel]
  );
  console.log(rows[0].criado ? `Usuário criado (id ${rows[0].id}).` : `Usuário já existia: dados e senha atualizados (id ${rows[0].id}).`);
} catch (e) {
  console.error('Erro:', e.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await pool.end();
}
