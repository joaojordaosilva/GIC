import express from 'express';
import bcrypt from 'bcryptjs';
import { ErroHttp, assincrono } from './erros.js';
import { texto, email, senhaNova, papel as validarPapel, idNumerico } from './validacao.js';

const COLUNAS_PUBLICAS = 'id, nome, email, cargo, papel, criado_em';

// Rotas de gestão de usuários. Só ADMIN acessa (a checagem é feita no index.js).
export function criarRotasUsuarios(cfg, pool) {
  const rotas = express.Router();

  async function haOutroAdmin(idIgnorado) {
    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM usuarios WHERE papel = 'ADMIN' AND id <> $1",
      [idIgnorado]
    );
    return rows[0].n > 0;
  }

  rotas.get(
    '/',
    assincrono(async (req, res) => {
      const { rows } = await pool.query(`SELECT ${COLUNAS_PUBLICAS} FROM usuarios ORDER BY nome, id`);
      res.json({ usuarios: rows });
    })
  );

  rotas.post(
    '/',
    assincrono(async (req, res) => {
      const b = req.body ?? {};
      const nome = texto(b.nome, 'Nome', { obrigatorio: true, max: 100 });
      const mail = email(b.email);
      const hash = await bcrypt.hash(senhaNova(b.senha), cfg.bcryptCusto);
      const cargo = texto(b.cargo ?? 'Editor', 'Cargo', { max: 50 }) || 'Editor';
      const pap = validarPapel(b.papel ?? 'EDITOR');

      const { rows } = await pool.query(
        `INSERT INTO usuarios (nome, email, senha_hash, cargo, papel)
         VALUES ($1, $2, $3, $4, $5) RETURNING ${COLUNAS_PUBLICAS}`,
        [nome, mail, hash, cargo, pap]
      );
      res.status(201).json({ usuario: rows[0] });
    })
  );

  rotas.patch(
    '/:id',
    assincrono(async (req, res) => {
      const id = idNumerico(req.params.id);
      const b = req.body ?? {};

      const { rows: atual } = await pool.query('SELECT id, papel FROM usuarios WHERE id = $1', [id]);
      if (!atual[0]) throw new ErroHttp(404, 'Usuário não encontrado.');

      const sets = [];
      const params = [];
      const add = (coluna, valor) => {
        params.push(valor);
        sets.push(`${coluna} = $${params.length}`);
      };

      if ('nome' in b) add('nome', texto(b.nome, 'Nome', { obrigatorio: true, max: 100 }));
      if ('cargo' in b) add('cargo', texto(b.cargo, 'Cargo', { max: 50 }));
      if ('email' in b) add('email', email(b.email));
      if ('papel' in b) {
        const novo = validarPapel(b.papel);
        if (atual[0].papel === 'ADMIN' && novo !== 'ADMIN' && !(await haOutroAdmin(id))) {
          throw new ErroHttp(409, 'Não é possível rebaixar o único administrador.');
        }
        add('papel', novo);
      }
      if ('senha' in b) add('senha_hash', await bcrypt.hash(senhaNova(b.senha), cfg.bcryptCusto));

      if (!sets.length) throw new ErroHttp(400, 'Nenhum campo para atualizar.');

      params.push(id);
      const { rows } = await pool.query(
        `UPDATE usuarios SET ${sets.join(', ')} WHERE id = $${params.length}
         RETURNING ${COLUNAS_PUBLICAS}`,
        params
      );
      res.json({ usuario: rows[0] });
    })
  );

  rotas.delete(
    '/:id',
    assincrono(async (req, res) => {
      const id = idNumerico(req.params.id);
      if (id === req.usuario.id) throw new ErroHttp(400, 'Você não pode remover a si mesmo.');

      const { rows } = await pool.query('SELECT papel FROM usuarios WHERE id = $1', [id]);
      if (!rows[0]) throw new ErroHttp(404, 'Usuário não encontrado.');
      if (rows[0].papel === 'ADMIN' && !(await haOutroAdmin(id))) {
        throw new ErroHttp(409, 'Não é possível remover o único administrador.');
      }

      try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
      } catch (e) {
        // avisos.autor_id é ON DELETE RESTRICT
        if (e.code === '23503') {
          throw new ErroHttp(
            409,
            'Este usuário é autor de avisos e não pode ser removido. Rebaixe-o para EDITOR ou troque a senha.'
          );
        }
        throw e;
      }
      res.status(204).end();
    })
  );

  return rotas;
}
