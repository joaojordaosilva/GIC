import { COLECOES, SENSIVEIS, TIPO_PARA_PAINEL, PREFIXO_SEM_CODIGO, PREFIXO_ID_BANCO } from './colecoes.js';

const idPainel = (ref, id) => ref ?? `${PREFIXO_ID_BANCO}${id}`;

// Disciplinas que "pertencem a um curso": estão na matriz da versão ativa de algum curso.
// (Se houver mais de uma versão ativa, vale a de maior id.)
export async function consultarDisciplinas(db) {
  const { rows } = await db.query(`
    WITH va AS (
      SELECT DISTINCT ON (curso_id) id, curso_id
      FROM versoes_matrizes
      WHERE ativa
      ORDER BY curso_id, id DESC
    )
    SELECT d.id, d.ref_id, d.cod_disciplina, d.nome_disciplina, d.carga_horaria,
           d.pre_modo, d.correquisitos, d.equivalencias_texto,
           c.codigo_curso, m.periodo_ideal, m.periodo_grupo, m.tipo::text AS tipo
    FROM va
    JOIN cursos c ON c.id = va.curso_id
    JOIN matrizes_curriculares m ON m.versao_matriz_id = va.id
    JOIN disciplinas d ON d.id = m.disciplina_id
    ORDER BY c.ordem, c.id, m.ordem, d.id
  `);
  return rows;
}

// ---- Funções puras (testáveis sem banco) -----------------------------------

export function montarCursos(rows) {
  return rows.map((c) => ({
    id: c.codigo_curso,
    nome: c.nome_curso,
    un: c.unidade_ch,
    resumo: c.resumo ?? [],
    fluxo: c.fluxo ?? '',
    enfases: c.enfases ?? [],
    fonte: c.fonte ?? '',
    notas: c.notas ?? []
  }));
}

export function montarDisciplinas(rowsDisc, rowsPre) {
  const posicao = new Map(rowsDisc.map((r, i) => [r.id, i]));
  const nomePorId = new Map(rowsDisc.map((r) => [r.id, r.nome_disciplina]));

  const preDe = new Map();
  for (const p of rowsPre) {
    if (!posicao.has(p.prereq_disciplina_id)) continue; // pré-requisito fora do currículo ativo
    if (!preDe.has(p.disciplina_id)) preDe.set(p.disciplina_id, []);
    preDe.get(p.disciplina_id).push(p.prereq_disciplina_id);
  }

  return rowsDisc.map((r) => {
    const semCodigo = !r.cod_disciplina || r.cod_disciplina.startsWith(PREFIXO_SEM_CODIGO);
    const grupo = r.periodo_grupo ?? String(r.periodo_ideal);
    const pre =
      r.pre_modo === 'lista'
        ? (preDe.get(r.id) || [])
            .sort((a, b) => posicao.get(a) - posicao.get(b))
            .map((id) => nomePorId.get(id))
        : [];
    return {
      id: idPainel(r.ref_id, r.id),
      curso: r.codigo_curso,
      per: grupo,
      cod: semCodigo ? '—' : r.cod_disciplina,
      nome: r.nome_disciplina,
      ch: r.carga_horaria ?? '',
      tipo: TIPO_PARA_PAINEL[r.tipo] ?? 'O',
      preModo: r.pre_modo,
      pre,
      co: r.correquisitos ?? [],
      equiv: r.equivalencias_texto ?? ''
    };
  });
}

export const montarNoticias = (rows) =>
  rows.map((a) => ({
    id: idPainel(a.ref_id, a.id),
    titulo: a.titulo_aviso,
    descricao: a.conteudo_aviso,
    img: a.imagem_url ?? '',
    link: a.link_url ?? '',
    ativo: a.ativo
  }));

export const montarConhecimento = (rows) =>
  rows.map((f) => ({
    id: idPainel(f.ref_id, f.id),
    ativo: f.ativo,
    categoria: f.categoria,
    intencao: f.pergunta,
    instrucao: f.resposta,
    palavras_chave: f.palavras_chave ?? '',
    encaminhar_secretaria: f.encaminhar_secretaria
  }));

// ---- Leitura completa --------------------------------------------------------

// Devolve só as coleções que o painel já salvou alguma vez (registradas em conteudo_site).
// Coleções nunca salvas ficam de fora, e o painel usa seus próprios dados iniciais.
export async function lerConteudo(db, { publico = false } = {}) {
  const { rows: registro } = await db.query('SELECT colecao, dados FROM conteudo_site');
  const salvas = new Map(registro.map((r) => [r.colecao, r.dados]));
  const quer = (chave) => salvas.has(chave) && !(publico && SENSIVEIS.includes(chave));

  const conteudo = {};

  if (quer('d_cursos')) {
    const { rows } = await db.query(
      `SELECT codigo_curso, nome_curso, unidade_ch, resumo, fluxo, fonte, notas, enfases
       FROM cursos ORDER BY ordem, id`
    );
    conteudo.d_cursos = montarCursos(rows);
  }

  if (quer('d_disciplinas')) {
    const rowsDisc = await consultarDisciplinas(db);
    let rowsPre = [];
    if (rowsDisc.length) {
      ({ rows: rowsPre } = await db.query(
        'SELECT disciplina_id, prereq_disciplina_id FROM pre_requisitos WHERE disciplina_id = ANY($1::int[])',
        [rowsDisc.map((r) => r.id)]
      ));
    }
    conteudo.d_disciplinas = montarDisciplinas(rowsDisc, rowsPre);
  }

  if (quer('home_noticias')) {
    const { rows } = await db.query(
      `SELECT id, ref_id, titulo_aviso, conteudo_aviso, imagem_url, link_url, ativo
       FROM avisos ORDER BY ordem, id`
    );
    conteudo.home_noticias = montarNoticias(rows);
  }

  if (quer('ia_conhecimento')) {
    const { rows } = await db.query(
      `SELECT id, ref_id, categoria, pergunta, resposta, palavras_chave, encaminhar_secretaria, ativo
       FROM faqs_chatbot ORDER BY ordem, id`
    );
    conteudo.ia_conhecimento = montarConhecimento(rows);
  }

  for (const [chave, def] of Object.entries(COLECOES)) {
    if (def.onde === 'json' && quer(chave) && salvas.get(chave) !== null) {
      conteudo[chave] = salvas.get(chave);
    }
  }
  return conteudo;
}

export async function lerRevisao(db) {
  const { rows } = await db.query('SELECT revisao FROM conteudo_revisao WHERE id = 1');
  return rows[0]?.revisao ?? 0;
}
