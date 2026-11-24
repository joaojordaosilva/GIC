import express from 'express';
import { ErroHttp, assincrono } from '../erros.js';
import { comTransacao } from '../db.js';
import { validarConteudo } from './validar.js';
import { lerConteudo, lerRevisao } from './ler.js';
import { gravarConteudo } from './gravar.js';

// Rotas do conteúdo editável pelo painel (montadas em /api/admin/conteudo).
export function criarRotasConteudo(pool) {
  const rotas = express.Router();

  // GET -> { revisao, conteudo }
  rotas.get(
    '/',
    assincrono(async (req, res) => {
      const [conteudo, revisao] = await Promise.all([lerConteudo(pool), lerRevisao(pool)]);
      res.json({ revisao, conteudo });
    })
  );

  // PUT { revisao?, conteudo } -> { revisao, conteudo }
  // Grava tudo numa transação: ou salva por inteiro ou não salva nada.
  rotas.put(
    '/',
    assincrono(async (req, res) => {
      const { conteudo, revisao } = req.body ?? {};
      if (conteudo === null || typeof conteudo !== 'object' || Array.isArray(conteudo)) {
        throw new ErroHttp(400, 'Envie { "conteudo": { ... } }.');
      }
      const norm = validarConteudo(conteudo);

      const resultado = await comTransacao(pool, async (client) => {
        await client.query(
          'INSERT INTO conteudo_revisao (id, revisao) VALUES (1, 0) ON CONFLICT (id) DO NOTHING'
        );
        // FOR UPDATE: duas gravações simultâneas passam uma de cada vez
        const { rows } = await client.query('SELECT revisao FROM conteudo_revisao WHERE id = 1 FOR UPDATE');
        const atual = rows[0].revisao;

        if (revisao !== undefined && revisao !== null && Number(revisao) !== atual) {
          throw new ErroHttp(
            409,
            'O conteúdo foi alterado por outra pessoa desde que você abriu o painel. Recarregue para ver as mudanças antes de salvar.',
            { revisaoAtual: atual }
          );
        }

        await gravarConteudo(client, norm, req.usuario.id);

        const { rows: nova } = await client.query(
          'UPDATE conteudo_revisao SET revisao = revisao + 1 WHERE id = 1 RETURNING revisao'
        );
        const conteudoSalvo = await lerConteudo(client);
        return { revisao: nova[0].revisao, conteudo: conteudoSalvo };
      });

      res.json(resultado);
    })
  );

  return rotas;
}
