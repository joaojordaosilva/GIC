import express from 'express';
import { carregarConfig } from './config.js';
import { criarPool } from './db.js';
import { criarAuth } from './auth.js';
import { criarRotasUsuarios } from './usuarios.js';
import { criarRotasConteudo } from './conteudo/rotas.js';
import { lerConteudo } from './conteudo/ler.js';
import { assincrono, tratarErros } from './erros.js';

// Monta todas as rotas do admin no app Express:
//
//   POST   /api/admin/auth/login        público
//   GET    /api/admin/auth/me           logado
//   POST   /api/admin/auth/senha        logado (troca a própria senha)
//   GET    /api/admin/conteudo          logado (ADMIN ou EDITOR)
//   PUT    /api/admin/conteudo          logado (ADMIN ou EDITOR)
//   GET    /api/admin/usuarios          ADMIN
//   POST   /api/admin/usuarios          ADMIN
//   PATCH  /api/admin/usuarios/:id      ADMIN
//   DELETE /api/admin/usuarios/:id      ADMIN
//   GET    /api/conteudo                público (sem a base/prompt da IA), para o site ler
//
// Chame ANTES do express.json() global do server.js: estas rotas usam um limite de corpo
// próprio (5 MB), porque o conteúdo completo do painel passa de 100 KB.
export function montarAdmin(app) {
  const cfg = carregarConfig();
  const pool = criarPool(cfg);
  const { rotas: rotasAuth, exigirAuth, exigirPapel } = criarAuth(cfg, pool);

  const api = express.Router();

  api.get(
    '/conteudo',
    assincrono(async (req, res) => {
      const conteudo = await lerConteudo(pool, { publico: true });
      res.set('Cache-Control', 'public, max-age=30');
      res.json({ conteudo });
    })
  );

  const admin = express.Router();
  admin.use(express.json({ limit: '5mb' }));
  admin.use('/auth', rotasAuth);
  admin.use('/conteudo', exigirAuth, exigirPapel('ADMIN', 'EDITOR'), criarRotasConteudo(pool));
  admin.use('/usuarios', exigirAuth, exigirPapel('ADMIN'), criarRotasUsuarios(cfg, pool));
  api.use('/admin', admin);

  api.use(tratarErros);
  app.use('/api', api);

  return { pool };
}
