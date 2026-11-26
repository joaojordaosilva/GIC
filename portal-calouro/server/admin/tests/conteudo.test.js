// Rodar: npm run admin:test   (usa o test runner nativo do Node, sem dependências)
// Estes testes cobrem validação, conversão banco <-> painel e o fluxo de gravação com um
// cliente de banco FALSO. Eles NÃO substituem um teste contra o PostgreSQL de verdade.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validarConteudo } from '../conteudo/validar.js';
import { montarDisciplinas, montarNoticias, montarConhecimento, montarCursos } from '../conteudo/ler.js';
import { sincronizarTabela, gravarConteudo } from '../conteudo/gravar.js';
import { TIPO_PARA_BANCO } from '../conteudo/colecoes.js';
import { criarLimitador } from '../limitador.js';
import { tratarErros, ErroHttp } from '../erros.js';

const seed = JSON.parse(readFileSync(new URL('./fixtures/estado-inicial.json', import.meta.url), 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---- Validação ---------------------------------------------------------------
test('o conteúdo inicial do painel passa na validação', () => {
  const n = validarConteudo(clone(seed));
  assert.equal(n.d_disciplinas.length, seed.d_disciplinas.length);
  assert.equal(n.d_cursos.length, 3);
  // eletivas de fluxo (cod "—") viram cod null
  assert.ok(n.d_disciplinas.some((d) => d.nome === 'Eletiva' && d.cod === null));
  assert.equal(n.d_disciplinas.find((d) => d.nome === 'Programação 1').cod, 'COMP359');
});

test('ignora chaves desconhecidas e só valida as presentes', () => {
  const n = validarConteudo({ home_hero: { titulo: 'x' }, lixo: 1 });
  assert.deepEqual(Object.keys(n), ['home_hero']);
});

const rejeita = (conteudo, trecho) =>
  assert.throws(
    () => validarConteudo(conteudo),
    (e) => e instanceof ErroHttp && e.status === 422 && e.message.includes(trecho)
  );

test('rejeita dados inválidos com mensagem clara', () => {
  const d = (extra) => ({ d_disciplinas: [{ id: 'a', curso: 'cc', per: '1', tipo: 'O', nome: 'X', ...extra }] });
  rejeita(d({ tipo: 'Z' }), 'tipo inválido');
  rejeita(d({ per: '99' }), 'período inválido');
  rejeita(d({ ch: 'abc' }), 'carga horária');
  rejeita(d({ preModo: 'xyz' }), 'pré-requisito');
  rejeita(d({ nome: '' }), 'nome');
  rejeita({ d_disciplinas: [d().d_disciplinas[0], { ...d().d_disciplinas[0], id: 'b', nome: 'Y' }, { ...d().d_disciplinas[0], id: 'c', cod: 'A1' }, { ...d().d_disciplinas[0], id: 'd', cod: 'A1' }] }, 'código A1');
  rejeita({ d_disciplinas: [d().d_disciplinas[0], d().d_disciplinas[0]] }, 'id repetido');
  rejeita({ home_noticias: [{ id: 'n', titulo: 'T', link: 'javascript:alert(1)' }] }, 'http');
  rejeita({ op_secoes: [{ id: 's', itens: [{ link: 'data:text/html,x' }] }] }, 'http');
  rejeita({ d_cursos: [{ id: 'com espaço', nome: 'N' }] }, 'ID');
  rejeita({ home_noticias: {} }, 'lista');
  rejeita({ home_hero: [] }, 'objeto');
});

// ---- Banco -> painel (ida e volta) ------------------------------------------
test('disciplinas: gravar e ler devolve exatamente o que o painel enviou', () => {
  const n = validarConteudo(clone(seed)).d_disciplinas;

  // simula o que gravar.js deixa no banco
  const rowsDisc = n.map((d, i) => ({
    id: i + 1,
    ref_id: d.ref,
    cod_disciplina: d.cod ?? `SEM-${d.ref}`.slice(0, 20),
    nome_disciplina: d.nome,
    carga_horaria: d.ch,
    pre_modo: d.preModo,
    correquisitos: d.co,
    equivalencias_texto: d.equiv,
    codigo_curso: d.curso,
    periodo_ideal: /^\d+$/.test(d.per) ? Number(d.per) : 0,
    periodo_grupo: d.per,
    tipo: TIPO_PARA_BANCO[d.tipo]
  }));
  const idPorNome = new Map(rowsDisc.map((r) => [`${r.codigo_curso}|${r.nome_disciplina}`, r.id]));
  const rowsPre = [];
  n.forEach((d, i) => {
    if (d.preModo === 'lista') d.pre.forEach((p) => rowsPre.push({ disciplina_id: i + 1, prereq_disciplina_id: idPorNome.get(`${d.curso}|${p}`) }));
  });

  const volta = montarDisciplinas(rowsDisc, rowsPre);
  assert.equal(volta.length, seed.d_disciplinas.length);
  seed.d_disciplinas.forEach((orig, i) => {
    const v = volta[i];
    assert.deepEqual(
      { id: v.id, curso: v.curso, per: v.per, cod: v.cod, nome: v.nome, ch: v.ch, tipo: v.tipo, preModo: v.preModo, co: v.co, equiv: v.equiv },
      { id: orig.id, curso: orig.curso, per: orig.per, cod: orig.cod, nome: orig.nome, ch: orig.ch, tipo: orig.tipo, preModo: orig.preModo, co: orig.co, equiv: orig.equiv },
      `disciplina ${orig.nome}`
    );
    assert.deepEqual([...v.pre].sort(), [...(orig.preModo === 'lista' ? orig.pre : [])].sort(), `pré-req de ${orig.nome}`);
  });
});

test('montadores: linhas sem ref_id ganham id "db-N" e nulos viram vazio', () => {
  const [n] = montarNoticias([{ id: 7, ref_id: null, titulo_aviso: 'T', conteudo_aviso: '', imagem_url: null, link_url: null, ativo: true }]);
  assert.deepEqual(n, { id: 'db-7', titulo: 'T', descricao: '', img: '', link: '', ativo: true });
  const [k] = montarConhecimento([{ id: 3, ref_id: 'x', categoria: 'geral', pergunta: 'P', resposta: 'R', palavras_chave: null, encaminhar_secretaria: false, ativo: true }]);
  assert.equal(k.palavras_chave, '');
  const [c] = montarCursos([{ codigo_curso: 'cc', nome_curso: 'CC', unidade_ch: 'h', resumo: null, fluxo: null, fonte: null, notas: null, enfases: null }]);
  assert.deepEqual(c, { id: 'cc', nome: 'CC', un: 'h', resumo: [], fluxo: '', enfases: [], fonte: '', notas: [] });
});

// ---- Cliente de banco falso --------------------------------------------------
function bancoFalso({ registro = [], existentes = {}, curriculo = [] } = {}) {
  const log = [];
  return {
    log,
    async query(sql, params = []) {
      log.push({ sql: sql.replace(/\s+/g, ' ').trim(), params });
      if (/FROM conteudo_site/.test(sql)) return { rows: registro.map((colecao) => ({ colecao })) };
      if (/RETURNING id, ref_id/.test(sql)) return { rows: params[0].map((ref, i) => ({ id: 1000 + i, ref_id: ref })) };
      const m = /SELECT id, ref_id FROM (\w+)/.exec(sql);
      if (m) return { rows: existentes[m[1]] ?? [] };
      if (/DISTINCT ON \(v.curso_id\)/.test(sql)) return { rows: [{ versao_id: 1, codigo_curso: 'cc' }, { versao_id: 2, codigo_curso: 'ec' }, { versao_id: 3, codigo_curso: 'ia' }] };
      if (/WITH va AS/.test(sql)) return { rows: curriculo };
      return { rows: [] };
    }
  };
}
const sqls = (db, re) => db.log.filter((l) => re.test(l.sql));

test('sincronizarTabela: 1 UPDATE + 1 INSERT em lote, serializa jsonb e devolve ref->id', async () => {
  const db = bancoFalso();
  const mapa = await sincronizarTabela(db, {
    tabela: 'disciplinas',
    existentes: new Map([['a', 10]]),
    itens: [{ ref: 'a', co: ['X'], nome: 'A' }, { ref: 'b', co: [], nome: 'B' }],
    colunas: [
      { col: 'nome_disciplina', pg: 'text', valor: (d) => d.nome },
      { col: 'correquisitos', pg: 'jsonb', valor: (d) => d.co }
    ]
  });
  assert.equal(db.log.length, 2);
  const [up, ins] = db.log;
  assert.match(up.sql, /^UPDATE disciplinas t SET nome_disciplina = v\.c0, correquisitos = v\.c1::jsonb FROM unnest\(\$1::int\[\], \$2::text\[\], \$3::text\[\]\)/);
  assert.deepEqual(up.params, [[10], ['A'], ['["X"]']]);
  assert.match(ins.sql, /^INSERT INTO disciplinas \(ref_id, nome_disciplina, correquisitos\) SELECT v\.ref, v\.c0, v\.c1::jsonb FROM unnest/);
  assert.deepEqual(ins.params, [['b'], ['B'], ['[]']]);
  assert.deepEqual([...mapa], [['a', 10], ['b', 1000]]);
});

test('1ª gravação (nada gerenciado ainda): só insere/atualiza, NUNCA apaga', async () => {
  const db = bancoFalso({ registro: [] });
  await gravarConteudo(db, validarConteudo(clone(seed)), 1);
  assert.equal(sqls(db, /^DELETE FROM (cursos|disciplinas|avisos|faqs_chatbot) /).length, 0);
  // registra cada coleção em conteudo_site
  assert.equal(sqls(db, /^INSERT INTO conteudo_site/).length, 13);
  // coleções relacionais registram dados NULL; JSON registram o conteúdo
  const reg = Object.fromEntries(sqls(db, /^INSERT INTO conteudo_site/).map((l) => [l.params[0], l.sql.includes('VALUES ($1, NULL')]));
  assert.equal(reg.d_disciplinas, true);
  assert.equal(reg.c_cards, false);
  // cursos antes de disciplinas
  const idx = (re) => db.log.findIndex((l) => re.test(l.sql));
  assert.ok(idx(/^INSERT INTO cursos/) < idx(/^INSERT INTO disciplinas/));
  // pré-requisitos em um único INSERT em lote
  assert.equal(sqls(db, /^INSERT INTO pre_requisitos/).length, 1);
  // nº de consultas não cresce com o nº de disciplinas (a ideia do lote)
  assert.ok(db.log.length < 60, `consultas: ${db.log.length}`);
});

test('gravações seguintes apagam o que sumiu do painel e preservam o resto', async () => {
  const db = bancoFalso({
    registro: ['d_cursos', 'd_disciplinas', 'home_noticias', 'ia_conhecimento'],
    existentes: {
      avisos: [{ id: 1, ref_id: 'n1' }, { id: 2, ref_id: 'velho' }],
      faqs_chatbot: [{ id: 5, ref_id: 'ia-a' }, { id: 6, ref_id: null }]
    }
  });
  const conteudo = { home_noticias: [{ id: 'n1', titulo: 'T' }], ia_conhecimento: [{ id: 'ia-a', intencao: 'i', instrucao: 'x' }] };
  await gravarConteudo(db, validarConteudo(conteudo), 9);
  const delAvisos = sqls(db, /^DELETE FROM avisos/)[0];
  assert.deepEqual(delAvisos.params, [[2]]);
  const delFaqs = sqls(db, /^DELETE FROM faqs_chatbot/)[0];
  assert.deepEqual(delFaqs.params, [[6]]); // linha criada fora do painel (db-6) some se não estiver na lista
  // contador_acessos nunca aparece nas consultas
  assert.equal(db.log.some((l) => /contador_acessos/.test(l.sql)), false);
  // autor só é gravado no INSERT, nunca no UPDATE
  assert.equal(sqls(db, /^UPDATE avisos/).some((l) => /autor_id/.test(l.sql)), false);
});

test('pré-requisito com nome inexistente => 422 claro', async () => {
  const db = bancoFalso();
  const c = clone(seed);
  c.d_disciplinas.find((d) => d.preModo === 'lista').pre.push('Disciplina Que Não Existe');
  await assert.rejects(
    gravarConteudo(db, validarConteudo(c), 1),
    (e) => e instanceof ErroHttp && e.status === 422 && e.message.includes('Disciplina Que Não Existe')
  );
});

test('disciplina apontando para curso removido => 422', async () => {
  const db = bancoFalso();
  const c = { d_cursos: clone(seed.d_cursos).slice(0, 1), d_disciplinas: clone(seed.d_disciplinas) };
  await assert.rejects(gravarConteudo(db, validarConteudo(c), 1), (e) => e.status === 422 && /não existe/.test(e.message));
});

test('id reservado "db-N" inexistente é recusado', async () => {
  const db = bancoFalso();
  await assert.rejects(
    gravarConteudo(db, validarConteudo({ home_noticias: [{ id: 'db-99', titulo: 'T' }] }), 1),
    (e) => e.status === 422 && /reservado/.test(e.message)
  );
});

// ---- Limitador e tratamento de erros -----------------------------------------
test('limitador bloqueia após o máximo de falhas e libera após sucesso', () => {
  const l = criarLimitador({ max: 3, janelaMs: 60_000 });
  for (let i = 0; i < 3; i++) { l.verificar('k'); l.falha('k'); }
  assert.throws(() => l.verificar('k'), (e) => e.status === 429);
  l.sucesso('k');
  assert.doesNotThrow(() => l.verificar('k'));
});

test('tratarErros traduz erros do PostgreSQL sem vazar detalhes internos', () => {
  const resp = () => { const r = { status(s) { r.s = s; return r; }, json(b) { r.b = b; return r; } }; return r; };
  let r = resp(); tratarErros({ code: '23505', detail: 'Key (cod_disciplina)=(X) already exists.' }, {}, r);
  assert.equal(r.s, 409); assert.match(r.b.detalhe, /cod_disciplina/);
  r = resp(); tratarErros({ code: '23503' }, {}, r); assert.equal(r.s, 409);
  r = resp(); tratarErros({ code: '22001' }, {}, r); assert.equal(r.s, 422);
  r = resp(); tratarErros({ type: 'entity.too.large' }, {}, r); assert.equal(r.s, 413);
  const orig = console.error; console.error = () => {};
  r = resp(); tratarErros(new Error('connection string postgres://user:senha@host'), {}, r);
  console.error = orig;
  assert.equal(r.s, 500); assert.equal(JSON.stringify(r.b).includes('senha'), false);
});
