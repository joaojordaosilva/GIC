import { ErroHttp } from '../erros.js';
import {
  COLECOES,
  ORDEM_GRAVACAO,
  TIPO_PARA_BANCO,
  PREFIXO_SEM_CODIGO,
  PREFIXO_ID_BANCO
} from './colecoes.js';
import { consultarDisciplinas } from './ler.js';

// ---------------------------------------------------------------------------
// Sincronização genérica em lote (UPDATE + INSERT com unnest).
// Faz 2 consultas por tabela, não importa quantas linhas: o banco costuma estar
// longe do servidor, e centenas de idas e vindas deixariam o "Salvar" lento.
//
//  colunas: [{ col, pg, valor(item), soInsert? }]   (nomes de coluna vêm do código, nunca do usuário)
//  existentes: Map  ref -> id  das linhas que já existem na tabela
//  devolve: Map ref -> id (de todos os itens, novos e antigos)
// ---------------------------------------------------------------------------
const ARRAY_PG = { text: 'text[]', int: 'int[]', boolean: 'boolean[]', jsonb: 'text[]', csv: 'text[]' };
const expr = (pg, ref) => {
  if (pg === 'jsonb') return `${ref}::jsonb`;
  // texto "a, b, c" do painel -> lista do Postgres {a,b,c}
  if (pg === 'csv') return `array_remove(regexp_split_to_array(btrim(${ref}), '\\s*,\\s*'), '')`;
  return ref;
};
const serializar = (c, v) => (c.pg === 'jsonb' ? JSON.stringify(v ?? null) : v ?? null);

export async function sincronizarTabela(client, { tabela, colunas, itens, existentes }) {
  const mapa = new Map();
  const atualizar = itens.filter((i) => existentes.has(i.ref));
  const inserir = itens.filter((i) => !existentes.has(i.ref));

  if (atualizar.length) {
    const cols = colunas.filter((c) => !c.soInsert);
    const params = [
      atualizar.map((i) => existentes.get(i.ref)),
      ...cols.map((c) => atualizar.map((i) => serializar(c, c.valor(i))))
    ];
    const casts = ['int[]', ...cols.map((c) => ARRAY_PG[c.pg])];
    const nomes = ['id', ...cols.map((_, k) => `c${k}`)];
    const sets = cols.map((c, k) => `${c.col} = ${expr(c.pg, `v.c${k}`)}`);
    await client.query(
      `UPDATE ${tabela} t SET ${sets.join(', ')}
       FROM unnest(${casts.map((c, k) => `$${k + 1}::${c}`).join(', ')}) AS v(${nomes.join(', ')})
       WHERE t.id = v.id`,
      params
    );
    for (const i of atualizar) mapa.set(i.ref, existentes.get(i.ref));
  }

  if (inserir.length) {
    const params = [
      inserir.map((i) => i.ref),
      ...colunas.map((c) => inserir.map((i) => serializar(c, c.valor(i))))
    ];
    const casts = ['text[]', ...colunas.map((c) => ARRAY_PG[c.pg])];
    const nomes = ['ref', ...colunas.map((_, k) => `c${k}`)];
    const { rows } = await client.query(
      `INSERT INTO ${tabela} (ref_id, ${colunas.map((c) => c.col).join(', ')})
       SELECT v.ref, ${colunas.map((c, k) => expr(c.pg, `v.c${k}`)).join(', ')}
       FROM unnest(${casts.map((c, k) => `$${k + 1}::${c}`).join(', ')}) AS v(${nomes.join(', ')})
       RETURNING id, ref_id`,
      params
    );
    for (const r of rows) mapa.set(r.ref_id, r.id);
  }
  return mapa;
}

// Ids "db-<n>" só valem para linhas que já existem (criadas fora do painel).
function checarIdsReservados(itens, existentes, rotulo) {
  for (const i of itens) {
    if (i.ref.startsWith(PREFIXO_ID_BANCO) && !existentes.has(i.ref)) {
      const nome = i.nome ?? i.titulo ?? i.intencao ?? i.ref;
      throw new ErroHttp(422, `${rotulo} "${nome}" usa o id reservado "${i.ref}", que não existe no banco.`);
    }
  }
}

// Mapa ref -> id das linhas existentes. Linhas sem ref_id aparecem como "db-<id>".
async function existentesDe(client, tabela) {
  const { rows } = await client.query(`SELECT id, ref_id FROM ${tabela}`);
  return new Map(rows.map((r) => [r.ref_id ?? `${PREFIXO_ID_BANCO}${r.id}`, r.id]));
}

async function removerAusentes(client, tabela, existentes, manter) {
  const apagar = [...existentes.entries()].filter(([ref]) => !manter.has(ref)).map(([, id]) => id);
  if (apagar.length) await client.query(`DELETE FROM ${tabela} WHERE id = ANY($1::int[])`, [apagar]);
  return apagar.length;
}

// ---------------------------------------------------------------------------
// Cursos
// ---------------------------------------------------------------------------
async function gravarCursos(ctx, itens) {
  const { client } = ctx;

  for (const [i, c] of itens.entries()) {
    await client.query(
      `INSERT INTO cursos (codigo_curso, nome_curso, unidade_ch, resumo, fluxo, fonte, notas, enfases, ordem)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8::jsonb, $9)
       ON CONFLICT (codigo_curso) DO UPDATE SET
         nome_curso = EXCLUDED.nome_curso, unidade_ch = EXCLUDED.unidade_ch,
         resumo = EXCLUDED.resumo, fluxo = EXCLUDED.fluxo, fonte = EXCLUDED.fonte,
         notas = EXCLUDED.notas, enfases = EXCLUDED.enfases, ordem = EXCLUDED.ordem`,
      [
        c.id, c.nome, c.un, JSON.stringify(c.resumo), c.fluxo, c.fonte,
        JSON.stringify(c.notas), JSON.stringify(c.enfases), i
      ]
    );
  }
}

// Roda DEPOIS de gravar as disciplinas: o DELETE de curso apaga a matriz em cascata,
// e as disciplinas do curso precisam ter sido tratadas antes.
// Só apaga cursos ausentes depois da primeira vez que o painel gerencia esta coleção,
// para nunca apagar cursos que já existiam no banco antes do painel.
async function limparCursos(ctx, itens) {
  const { client, gerenciadas } = ctx;
  if (!gerenciadas.has('d_cursos')) return;
  const codigos = itens.map((c) => c.id);

  const { rows } = await client.query(
    `SELECT DISTINCT c.codigo_curso
     FROM cursos c
     JOIN versoes_matrizes v ON v.curso_id = c.id
     JOIN matrizes_curriculares m ON m.versao_matriz_id = v.id
     WHERE c.codigo_curso <> ALL($1::text[])`,
    [codigos]
  );
  if (rows.length) {
    throw new ErroHttp(
      422,
      `O curso "${rows[0].codigo_curso}" não pode ser removido enquanto tiver disciplinas. Remova as disciplinas antes.`
    );
  }
  await client.query('DELETE FROM cursos WHERE codigo_curso <> ALL($1::text[])', [codigos]);
}

// ---------------------------------------------------------------------------
// Disciplinas (+ matrizes_curriculares + pre_requisitos)
// ---------------------------------------------------------------------------
async function gravarDisciplinas(ctx, itens) {
  const { client, usuarioId, gerenciadas } = ctx;

  // 1. Cada curso precisa de uma versão de matriz ativa. Cria "Matriz vigente" se faltar.
  await client.query(
    `INSERT INTO versoes_matrizes (curso_id, nome_versao, ano_inicio, ativa, criado_por)
     SELECT c.id, 'Matriz vigente', EXTRACT(YEAR FROM now())::int, true, $1 FROM cursos c
     WHERE NOT EXISTS (SELECT 1 FROM versoes_matrizes v WHERE v.curso_id = c.id AND v.ativa)`,
    [usuarioId]
  );
  const { rows: versoes } = await client.query(
    `SELECT DISTINCT ON (v.curso_id) v.id AS versao_id, c.codigo_curso
     FROM versoes_matrizes v JOIN cursos c ON c.id = v.curso_id
     WHERE v.ativa ORDER BY v.curso_id, v.id DESC`
  );
  const versaoDoCurso = new Map(versoes.map((v) => [v.codigo_curso, v.versao_id]));

  for (const d of itens) {
    if (!versaoDoCurso.has(d.curso)) {
      throw new ErroHttp(422, `A disciplina "${d.nome}" aponta para o curso "${d.curso}", que não existe.`);
    }
  }

  // 2. Disciplinas existentes
  const existentes = await existentesDe(client, 'disciplinas');
  checarIdsReservados(itens, existentes, 'A disciplina');

  // 3. Apaga as que sumiram do painel (somente após a 1ª gravação e só as que estão em algum currículo)
  if (gerenciadas.has('d_disciplinas')) {
    const noCurriculo = await consultarDisciplinas(client);
    const manter = new Set(itens.map((d) => d.ref));
    const ids = noCurriculo
      .map((r) => ({ id: r.id, ref: r.ref_id ?? `${PREFIXO_ID_BANCO}${r.id}` }))
      .filter((r) => !manter.has(r.ref))
      .map((r) => r.id);
    if (ids.length) await client.query('DELETE FROM disciplinas WHERE id = ANY($1::int[])', [ids]);
    for (const [ref, id] of existentes) if (ids.includes(id)) existentes.delete(ref);
  }

  // 4. Grava as disciplinas
  const alvo = itens.map((d) => ({ ...d, codBanco: d.cod ?? `${PREFIXO_SEM_CODIGO}${d.ref}`.slice(0, 20) }));
  const idPorRef = await sincronizarTabela(client, {
    tabela: 'disciplinas',
    itens: alvo,
    existentes,
    colunas: [
      { col: 'cod_disciplina', pg: 'text', valor: (d) => d.codBanco },
      { col: 'nome_disciplina', pg: 'text', valor: (d) => d.nome },
      { col: 'carga_horaria', pg: 'int', valor: (d) => d.ch },
      { col: 'pre_modo', pg: 'text', valor: (d) => d.preModo },
      { col: 'correquisitos', pg: 'jsonb', valor: (d) => d.co },
      { col: 'equivalencias_texto', pg: 'text', valor: (d) => d.equiv },
      { col: 'atualizado_por', pg: 'int', valor: () => usuarioId }
    ]
  });

  // 5. Posição na matriz do curso
  if (alvo.length) {
    const versaoIds = alvo.map((d) => versaoDoCurso.get(d.curso));
    const discIds = alvo.map((d) => idPorRef.get(d.ref));
    await client.query(
      `INSERT INTO matrizes_curriculares (versao_matriz_id, disciplina_id, periodo_ideal, tipo, periodo_grupo, ordem)
       SELECT v.versao, v.disc, v.periodo, v.tipo::tipo_disciplina_enum, v.grupo, v.ordem
       FROM unnest($1::int[], $2::int[], $3::int[], $4::text[], $5::text[], $6::int[])
            AS v(versao, disc, periodo, tipo, grupo, ordem)
       WHERE true
       ON CONFLICT (versao_matriz_id, disciplina_id) DO UPDATE SET
         periodo_ideal = EXCLUDED.periodo_ideal, tipo = EXCLUDED.tipo,
         periodo_grupo = EXCLUDED.periodo_grupo, ordem = EXCLUDED.ordem`,
      [
        versaoIds,
        discIds,
        alvo.map((d) => (/^\d+$/.test(d.per) ? Number(d.per) : 0)),
        alvo.map((d) => TIPO_PARA_BANCO[d.tipo]),
        alvo.map((d) => d.per),
        alvo.map((_, i) => i)
      ]
    );
    // Disciplina que mudou de curso sai da matriz do curso antigo
    await client.query(
      `DELETE FROM matrizes_curriculares m
       USING unnest($1::int[], $2::int[]) AS v(disc, versao)
       WHERE m.disciplina_id = v.disc AND m.versao_matriz_id <> v.versao`,
      [discIds, versaoIds]
    );
  }

  // 6. Pré-requisitos: o painel guarda NOMES; resolvemos para ids dentro do mesmo curso.
  if (alvo.length) {
    await client.query('DELETE FROM pre_requisitos WHERE disciplina_id = ANY($1::int[])', [
      alvo.map((d) => idPorRef.get(d.ref))
    ]);

    const idPorNome = new Map(); // `${curso}|${nome}` -> id (a primeira ocorrência vale)
    for (const d of alvo) {
      const k = `${d.curso}|${d.nome}`;
      if (!idPorNome.has(k)) idPorNome.set(k, idPorRef.get(d.ref));
    }

    const disc = [];
    const pre = [];
    for (const d of alvo) {
      if (d.preModo !== 'lista') continue;
      const meuId = idPorRef.get(d.ref);
      for (const nomePre of new Set(d.pre)) {
        const idPre = idPorNome.get(`${d.curso}|${nomePre}`);
        if (!idPre) {
          throw new ErroHttp(
            422,
            `Pré-requisito "${nomePre}" de "${d.nome}" não foi encontrado entre as disciplinas do curso "${d.curso}". Use o nome exato.`
          );
        }
        if (idPre === meuId) {
          throw new ErroHttp(422, `"${d.nome}" não pode ser pré-requisito de si mesma.`);
        }
        disc.push(meuId);
        pre.push(idPre);
      }
    }
    if (disc.length) {
      await client.query(
        `INSERT INTO pre_requisitos (disciplina_id, prereq_disciplina_id)
         SELECT * FROM unnest($1::int[], $2::int[]) WHERE true ON CONFLICT DO NOTHING`,
        [disc, pre]
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Notícias (avisos) e base de conhecimento (faqs_chatbot)
// ---------------------------------------------------------------------------
async function gravarNoticias(ctx, itens) {
  const { client, usuarioId, gerenciadas } = ctx;
  const existentes = await existentesDe(client, 'avisos');
  checarIdsReservados(itens, existentes, 'A notícia');
  if (gerenciadas.has('home_noticias')) {
    await removerAusentes(client, 'avisos', existentes, new Set(itens.map((n) => n.ref)));
    for (const ref of [...existentes.keys()]) if (!itens.some((n) => n.ref === ref)) existentes.delete(ref);
  }
  const comOrdem = itens.map((n, i) => ({ ...n, ordem: i }));
  await sincronizarTabela(client, {
    tabela: 'avisos',
    itens: comOrdem,
    existentes,
    colunas: [
      { col: 'titulo_aviso', pg: 'text', valor: (n) => n.titulo },
      { col: 'conteudo_aviso', pg: 'text', valor: (n) => n.descricao },
      { col: 'imagem_url', pg: 'text', valor: (n) => n.img || null },
      { col: 'link_url', pg: 'text', valor: (n) => n.link || null },
      { col: 'ativo', pg: 'boolean', valor: (n) => n.ativo },
      { col: 'ordem', pg: 'int', valor: (n) => n.ordem },
      { col: 'autor_id', pg: 'int', valor: () => usuarioId, soInsert: true } // quem criou; edição não troca o autor
    ]
  });
}

async function gravarConhecimento(ctx, itens) {
  const { client, gerenciadas } = ctx;
  const existentes = await existentesDe(client, 'faqs_chatbot');
  checarIdsReservados(itens, existentes, 'A instrução');
  if (gerenciadas.has('ia_conhecimento')) {
    await removerAusentes(client, 'faqs_chatbot', existentes, new Set(itens.map((k) => k.ref)));
    for (const ref of [...existentes.keys()]) if (!itens.some((k) => k.ref === ref)) existentes.delete(ref);
  }
  const comOrdem = itens.map((k, i) => ({ ...k, ordem: i }));
  // contador_acessos não entra aqui de propósito: o painel nunca o altera.
  await sincronizarTabela(client, {
    tabela: 'faqs_chatbot',
    itens: comOrdem,
    existentes,
    colunas: [
      { col: 'pergunta', pg: 'text', valor: (k) => k.intencao },
      { col: 'resposta', pg: 'text', valor: (k) => k.instrucao },
      { col: 'palavras_chave', pg: 'csv', valor: (k) => k.palavras_chave },
      { col: 'encaminhar_secretaria', pg: 'boolean', valor: (k) => k.encaminhar_secretaria },
      { col: 'categoria', pg: 'text', valor: (k) => k.categoria },
      { col: 'ativo', pg: 'boolean', valor: (k) => k.ativo },
      { col: 'ordem', pg: 'int', valor: (k) => k.ordem }
    ]
  });
}

// ---------------------------------------------------------------------------
// Orquestração
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Oportunidades (categorias_oportunidade + oportunidades + tags)
// ---------------------------------------------------------------------------
async function gravarCategoriasOportunidade(ctx, itens) {
  const { client, gerenciadas } = ctx;
  const existentes = await existentesDe(client, 'categorias_oportunidade');
  checarIdsReservados(itens, existentes, 'A categoria');

  if (gerenciadas.has('op_categorias')) {
    const manter = new Set(itens.map((c) => c.ref));
    const apagar = [...existentes.entries()].filter(([ref]) => !manter.has(ref)).map(([, id]) => id);
    if (apagar.length) {
      const { rows } = await client.query(
        'SELECT 1 FROM oportunidades WHERE categoria_id = ANY($1::int[]) LIMIT 1',
        [apagar]
      );
      if (rows.length) {
        throw new ErroHttp(422, 'Não é possível remover uma categoria enquanto houver oportunidades vinculadas a ela.');
      }
      await client.query('DELETE FROM categorias_oportunidade WHERE id = ANY($1::int[])', [apagar]);
      for (const [ref, id] of existentes) if (apagar.includes(id)) existentes.delete(ref);
    }
  }

  const comOrdem = itens.map((c, i) => ({
    ...c,
    slugBanco: c.ref.slice(0, 50),
    ordem: i
  }));

  await sincronizarTabela(client, {
    tabela: 'categorias_oportunidade',
    itens: comOrdem,
    existentes,
    colunas: [
      { col: 'slug', pg: 'text', valor: (c) => c.slugBanco },
      { col: 'nome', pg: 'text', valor: (c) => c.nome },
      { col: 'ordem', pg: 'int', valor: (c) => c.ordem },
      { col: 'ativo', pg: 'boolean', valor: () => true }
    ]
  });
}

async function gravarSecoesOportunidades(ctx, secoes) {
  const { client, usuarioId, gerenciadas } = ctx;
  const catExistentes = await existentesDe(client, 'categorias_oportunidade');

  const achatados = [];
  secoes.forEach((s, idxSecao) => {
    const categoriaId = catExistentes.get(s.categoria);
    if (!categoriaId) {
      throw new ErroHttp(422, `A seção "${s.titulo}" aponta para a categoria "${s.categoria}", que não existe.`);
    }
    (s.itens || []).forEach((it, idxItem) => {
      achatados.push({
        ...it,
        categoriaId,
        secaoRef: s.ref,
        secaoIcone: s.icone || null,
        secaoTitulo: s.titulo,
        secaoSubtitulo: s.subtitulo || null,
        ordemSecao: idxSecao,
        ordem: idxItem
      });
    });
  });

  const existentes = await existentesDe(client, 'oportunidades');
  checarIdsReservados(achatados, existentes, 'A oportunidade');

  if (gerenciadas.has('op_secoes')) {
    await removerAusentes(client, 'oportunidades', existentes, new Set(achatados.map((o) => o.ref)));
    for (const ref of [...existentes.keys()]) {
      if (!achatados.some((o) => o.ref === ref)) existentes.delete(ref);
    }
  }

  const idPorRef = await sincronizarTabela(client, {
    tabela: 'oportunidades',
    itens: achatados,
    existentes,
    colunas: [
      { col: 'categoria_id', pg: 'int', valor: (o) => o.categoriaId },
      { col: 'secao_ref', pg: 'text', valor: (o) => o.secaoRef },
      { col: 'secao_icone', pg: 'text', valor: (o) => o.secaoIcone },
      { col: 'secao_titulo', pg: 'text', valor: (o) => o.secaoTitulo },
      { col: 'secao_subtitulo', pg: 'text', valor: (o) => o.secaoSubtitulo },
      { col: 'titulo', pg: 'text', valor: (o) => o.titulo },
      { col: 'descricao', pg: 'text', valor: (o) => o.descricao || null },
      { col: 'link', pg: 'text', valor: (o) => o.link || null },
      { col: 'imagem_url', pg: 'text', valor: (o) => o.img || null },
      { col: 'ordem_secao', pg: 'int', valor: (o) => o.ordemSecao },
      { col: 'ordem', pg: 'int', valor: (o) => o.ordem },
      { col: 'ativo', pg: 'boolean', valor: () => true },
      { col: 'criado_por', pg: 'int', valor: () => usuarioId, soInsert: true }
    ]
  });

  if (achatados.length) {
    const opIds = achatados.map((o) => idPorRef.get(o.ref));
    await client.query('DELETE FROM oportunidades_tags WHERE oportunidade_id = ANY($1::bigint[])', [opIds]);

    const todasTags = [...new Set(achatados.flatMap((o) => o.tags))];
    if (todasTags.length) {
      await client.query(
        'INSERT INTO tags (nome) SELECT * FROM unnest($1::text[]) ON CONFLICT (nome) DO NOTHING',
        [todasTags]
      );
      const { rows: tagRows } = await client.query('SELECT id, nome FROM tags WHERE nome = ANY($1::text[])', [todasTags]);
      const tagIdPorNome = new Map(tagRows.map((t) => [t.nome, t.id]));

      const relOp = [];
      const relTag = [];
      for (const o of achatados) {
        const opId = idPorRef.get(o.ref);
        for (const nomeTag of new Set(o.tags)) {
          relOp.push(opId);
          relTag.push(tagIdPorNome.get(nomeTag));
        }
      }
      if (relOp.length) {
        await client.query(
          'INSERT INTO oportunidades_tags (oportunidade_id, tag_id) SELECT * FROM unnest($1::bigint[], $2::int[]) ON CONFLICT DO NOTHING',
          [relOp, relTag]
        );
      }
    }
  }
}

const GRAVADORES = {
  d_cursos: gravarCursos,
  d_disciplinas: gravarDisciplinas,
  home_noticias: gravarNoticias,
  ia_conhecimento: gravarConhecimento,
  op_categorias: gravarCategoriasOportunidade,
  op_secoes: gravarSecoesOportunidades
};

// Deve rodar dentro de uma transação aberta pelo chamador.
export async function gravarConteudo(client, norm, usuarioId) {
  const { rows } = await client.query('SELECT colecao FROM conteudo_site');
  const gerenciadas = new Set(rows.map((r) => r.colecao));
  const ctx = { client, usuarioId, gerenciadas };

  // Disciplinas só podem apontar para cursos que existirão após esta gravação.
  if (norm.d_cursos && norm.d_disciplinas) {
    const codigos = new Set(norm.d_cursos.map((c) => c.id));
    const solta = norm.d_disciplinas.find((d) => !codigos.has(d.curso));
    if (solta) {
      throw new ErroHttp(422, `A disciplina "${solta.nome}" aponta para o curso "${solta.curso}", que não existe.`);
    }
  }

  for (const chave of ORDEM_GRAVACAO) {
    if (!(chave in norm)) continue;

    if (COLECOES[chave].onde === 'tabela') {
      await GRAVADORES[chave](ctx, norm[chave]);
      // dados = NULL: a coleção vive em tabelas próprias
      await client.query(
        `INSERT INTO conteudo_site (colecao, dados, atualizado_por, atualizado_em)
         VALUES ($1, NULL, $2, now())
         ON CONFLICT (colecao) DO UPDATE SET atualizado_por = EXCLUDED.atualizado_por, atualizado_em = now()`,
        [chave, usuarioId]
      );
    } else {
      await client.query(
        `INSERT INTO conteudo_site (colecao, dados, atualizado_por, atualizado_em)
         VALUES ($1, $2::jsonb, $3, now())
         ON CONFLICT (colecao) DO UPDATE SET
           dados = EXCLUDED.dados, atualizado_por = EXCLUDED.atualizado_por, atualizado_em = now()`,
        [chave, JSON.stringify(norm[chave]), usuarioId]
      );
    }
  }

  if (norm.d_cursos) await limparCursos(ctx, norm.d_cursos);
}
