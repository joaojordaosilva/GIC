import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ErroHttp, assincrono } from './erros.js';
import { criarLimitador } from './limitador.js';
import { senhaNova } from './validacao.js';

export function criarAuth(cfg, pool) {
  // Hash "de mentira" para gastar o mesmo tempo quando o e-mail não existe
  // (evita descobrir e-mails cadastrados medindo o tempo da resposta).
  const HASH_FALSO = bcrypt.hashSync('senha-falsa-para-igualar-tempo', cfg.bcryptCusto);

  const porEmail = criarLimitador({ max: 5, janelaMs: 15 * 60_000 }); // IP + e-mail
  const porIp = criarLimitador({ max: 30, janelaMs: 15 * 60_000 }); // IP

  // ---- Middlewares -------------------------------------------------------
  const exigirAuth = assincrono(async (req, res, next) => {
    const m = /^Bearer (.+)$/i.exec(req.headers.authorization || '');
    if (!m) throw new ErroHttp(401, 'Autenticação necessária.');

    let payload;
    try {
      payload = jwt.verify(m[1], cfg.jwtSecret, { algorithms: ['HS256'] });
    } catch {
      throw new ErroHttp(401, 'Sessão expirada ou inválida. Entre novamente.');
    }

    // Consulta o banco a cada requisição: remoção de usuário ou troca de papel vale na hora.
    const { rows } = await pool.query(
      'SELECT id, nome, email, cargo, papel FROM usuarios WHERE id = $1',
      [Number(payload.sub)]
    );
    if (!rows[0]) throw new ErroHttp(401, 'Usuário não encontrado. Entre novamente.');
    req.usuario = rows[0];
    next();
  });

  const exigirPapel = (...papeis) => (req, res, next) => {
    if (!req.usuario || !papeis.includes(req.usuario.papel)) {
      return next(new ErroHttp(403, 'Você não tem permissão para esta ação.'));
    }
    next();
  };

  // ---- Rotas -------------------------------------------------------------
  const rotas = express.Router();

  rotas.post(
    '/login',
    assincrono(async (req, res) => {
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const senha = String(req.body?.senha ?? '');
      if (!email || !senha) throw new ErroHttp(400, 'Informe e-mail e senha.');

      const chaveIp = `ip|${req.ip}`;
      const chaveEmail = `${req.ip}|${email}`;
      porIp.verificar(chaveIp);
      porEmail.verificar(chaveEmail);

      const { rows } = await pool.query(
        'SELECT id, nome, email, cargo, papel, senha_hash FROM usuarios WHERE lower(email) = $1',
        [email]
      );
      const u = rows[0];
      const ok = await bcrypt.compare(senha, u ? u.senha_hash : HASH_FALSO);

      if (!u || !ok) {
        porIp.falha(chaveIp);
        porEmail.falha(chaveEmail);
        throw new ErroHttp(401, 'E-mail ou senha incorretos.');
      }
      porEmail.sucesso(chaveEmail);

      const token = jwt.sign({ papel: u.papel }, cfg.jwtSecret, {
        subject: String(u.id),
        expiresIn: cfg.jwtExpira,
        algorithm: 'HS256'
      });
      res.json({
        token,
        usuario: { id: u.id, nome: u.nome, email: u.email, cargo: u.cargo, papel: u.papel }
      });
    })
  );

  rotas.get('/me', exigirAuth, (req, res) => res.json({ usuario: req.usuario }));

  rotas.post(
    '/senha',
    exigirAuth,
    assincrono(async (req, res) => {
      const { senhaAtual, novaSenha } = req.body ?? {};
      senhaNova(novaSenha);

      const { rows } = await pool.query('SELECT senha_hash FROM usuarios WHERE id = $1', [
        req.usuario.id
      ]);
      const ok = await bcrypt.compare(String(senhaAtual ?? ''), rows[0].senha_hash);
      if (!ok) throw new ErroHttp(401, 'A senha atual está incorreta.');

      const hash = await bcrypt.hash(novaSenha, cfg.bcryptCusto);
      await pool.query('UPDATE usuarios SET senha_hash = $1 WHERE id = $2', [hash, req.usuario.id]);
      res.json({ ok: true });
    })
  );

  return { rotas, exigirAuth, exigirPapel };
}
