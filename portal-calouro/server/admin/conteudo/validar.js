import { ErroHttp } from '../erros.js';
import { texto } from '../validacao.js';
import { COLECOES, TIPO_PARA_BANCO, PRE_MODOS } from './colecoes.js';

const MAX_ITENS = 3000;

const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const erro = (msg) => new ErroHttp(422, msg);

function listaDeTextos(v, campo, { maxItens = 100, maxTexto = 2000 } = {}) {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) throw erro(`"${campo}" deve ser uma lista.`);
  if (v.length > maxItens) throw erro(`"${campo}" tem itens demais (máximo ${maxItens}).`);
  return v.map((x) => texto(x, campo, { max: maxTexto }));
}

// Aceita '', '#', caminhos relativos e http(s). Bloqueia javascript:, data:, etc.
export function urlSegura(v, campo) {
  const s = texto(v, campo, { max: 2000 });
  if (s === '' || s === '#' || s.startsWith('/')) return s;
  let u;
  try {
    u = new URL(s);
  } catch {
    throw erro(`"${campo}" não é um endereço válido.`);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw erro(`"${campo}" deve começar com http:// ou https://.`);
  }
  return s;
}

function idItem(it, ctx) {
  const id = texto(it.id, `${ctx} · id`, { obrigatorio: true, max: 60 });
  return id;
}

function unicos(itens, chave, ctx) {
  const vistos = new Set();
  for (const it of itens) {
    if (vistos.has(it[chave])) throw erro(`${ctx}: id repetido "${it[chave]}".`);
    vistos.add(it[chave]);
  }
}

// ---------------------------------------------------------------------------
// Coleções relacionais: devolvem objetos já normalizados para a camada de gravação
// ---------------------------------------------------------------------------

function cursos(itens) {
  const r = itens.map((c, i) => {
    const ctx = `Curso #${i + 1}`;
    const id = texto(c.id, `${ctx} · ID`, { obrigatorio: true, max: 10 });
    if (!/^[A-Za-z0-9_-]+$/.test(id)) throw erro(`${ctx}: o ID só pode ter letras, números, - e _.`);
    const un = c.un === 'h/a' ? 'h/a' : 'h';
    if (c.un !== undefined && c.un !== 'h' && c.un !== 'h/a') throw erro(`${ctx}: unidade inválida.`);

    if (c.resumo !== undefined && !Array.isArray(c.resumo)) throw erro(`${ctx}: "resumo" deve ser uma lista.`);
    const resumo = (c.resumo || []).slice(0, 30).map((g) => ({
      label: texto(g?.label, 'Rótulo do resumo', { max: 100 }),
      valor: texto(g?.valor, 'Valor do resumo', { max: 300 })
    }));

    if (c.enfases !== undefined && !Array.isArray(c.enfases)) throw erro(`${ctx}: "enfases" deve ser uma lista.`);
    const enfases = (c.enfases || []).slice(0, 30).map((e) => ({
      nome: texto(e?.nome, 'Nome da ênfase', { max: 150 }),
      disciplinas: listaDeTextos(e?.disciplinas, 'Disciplinas da ênfase', { maxItens: 50, maxTexto: 150 })
    }));

    return {
      id,
      nome: texto(c.nome, `${ctx} · Nome`, { obrigatorio: true, max: 100 }),
      un,
      resumo,
      fluxo: texto(c.fluxo, 'Fluxo', { max: 5000 }),
      fonte: texto(c.fonte, 'Fonte', { max: 5000 }),
      notas: listaDeTextos(c.notas, 'Notas', { maxItens: 50, maxTexto: 3000 }),
      enfases
    };
  });
  unicos(r, 'id', 'Cursos');
  return r;
}

function disciplinas(itens) {
  const r = itens.map((d, i) => {
    const rotulo = `Disciplina #${i + 1}${d?.nome ? ` (${String(d.nome).slice(0, 40)})` : ''}`;
    const ref = idItem(d, rotulo);

    const per = texto(d.per, `${rotulo} · período`, { obrigatorio: true, max: 2 }).toUpperCase();
    if (!/^(\d{1,2}|N|C)$/.test(per) || (/^\d/.test(per) && (Number(per) < 1 || Number(per) > 20))) {
      throw erro(`${rotulo}: período inválido ("${per}").`);
    }
    if (!(d.tipo in TIPO_PARA_BANCO)) throw erro(`${rotulo}: tipo inválido ("${d.tipo}").`);

    const preModo = d.preModo ?? 'nenhum';
    if (!PRE_MODOS.includes(preModo)) throw erro(`${rotulo}: modo de pré-requisito inválido.`);

    // '—', '-' e vazio significam "sem código"
    let cod = texto(d.cod, `${rotulo} · código`, { max: 20 });
    if (cod === '—' || cod === '-' || cod === '–') cod = '';

    let ch = null;
    if (d.ch !== '' && d.ch !== null && d.ch !== undefined) {
      ch = Number(d.ch);
      if (!Number.isInteger(ch) || ch < 0 || ch > 10000) throw erro(`${rotulo}: carga horária inválida.`);
    }

    return {
      ref,
      curso: texto(d.curso, `${rotulo} · curso`, { obrigatorio: true, max: 10 }),
      per,
      tipo: d.tipo,
      cod: cod || null,
      nome: texto(d.nome, `${rotulo} · nome`, { obrigatorio: true, max: 150 }),
      ch,
      preModo,
      pre: listaDeTextos(d.pre, 'Pré-requisitos', { maxItens: 30, maxTexto: 150 }),
      co: listaDeTextos(d.co, 'Correquisitos', { maxItens: 30, maxTexto: 150 }),
      equiv: texto(d.equiv, 'Equivalências', { max: 500 })
    };
  });

  unicos(r, 'ref', 'Disciplinas');

  const porCodigo = new Map();
  for (const d of r) {
    if (!d.cod) continue;
    if (porCodigo.has(d.cod)) {
      throw erro(`O código ${d.cod} está em "${porCodigo.get(d.cod)}" e em "${d.nome}". Cada código deve ser único.`);
    }
    porCodigo.set(d.cod, d.nome);
  }
  return r;
}

function noticias(itens) {
  const r = itens.map((n, i) => {
    const ctx = `Notícia #${i + 1}`;
    return {
      ref: idItem(n, ctx),
      titulo: texto(n.titulo, `${ctx} · título`, { obrigatorio: true, max: 150 }),
      descricao: texto(n.descricao, `${ctx} · resumo`, { max: 5000 }),
      img: urlSegura(n.img, `${ctx} · URL da imagem`),
      link: urlSegura(n.link, `${ctx} · link`),
      ativo: n.ativo !== false
    };
  });
  unicos(r, 'ref', 'Notícias');
  return r;
}

function conhecimento(itens) {
  const r = itens.map((k, i) => {
    const ctx = `Instrução #${i + 1}`;
    const categoria = texto(k.categoria || 'geral', `${ctx} · categoria`, { max: 30 });
    if (!/^[a-z0-9_-]+$/i.test(categoria)) throw erro(`${ctx}: categoria inválida.`);
    return {
      ref: idItem(k, ctx),
      categoria,
      intencao: texto(k.intencao, `${ctx} · assunto`, { obrigatorio: true, max: 500 }),
      instrucao: texto(k.instrucao, `${ctx} · instrução`, { obrigatorio: true, max: 10000 }),
      palavras_chave: texto(k.palavras_chave, `${ctx} · palavras-chave`, { max: 1000 }),
      encaminhar_secretaria: k.encaminhar_secretaria === true,
      ativo: k.ativo !== false
    };
  });
  unicos(r, 'ref', 'Base de conhecimento');
  return r;
}

const NORMALIZADORES = {
  d_cursos: cursos,
  d_disciplinas: disciplinas,
  home_noticias: noticias,
  ia_conhecimento: conhecimento
};

// ---------------------------------------------------------------------------
// Coleções JSONB: validação estrutural + URLs seguras onde há links
// ---------------------------------------------------------------------------
function validarSecoes(secoes) {
  secoes.forEach((s, i) => {
    if (s.itens === undefined) return;
    if (!Array.isArray(s.itens)) throw erro(`Seção #${i + 1}: "itens" deve ser uma lista.`);
    s.itens.forEach((it, j) => {
      if (!ehObjeto(it)) throw erro(`Seção #${i + 1}, item #${j + 1}: formato inválido.`);
      if (it.link !== undefined) urlSegura(it.link, `Seção #${i + 1}, item #${j + 1} · link`);
      if (it.img !== undefined) urlSegura(it.img, `Seção #${i + 1}, item #${j + 1} · imagem`);
    });
  });
}

// ---------------------------------------------------------------------------
// Entrada: recebe o objeto "conteudo" do painel e devolve o mesmo objeto normalizado.
// Só valida as chaves presentes; chaves desconhecidas são ignoradas.
// ---------------------------------------------------------------------------
export function validarConteudo(conteudo) {
  const saida = {};

  for (const [chave, def] of Object.entries(COLECOES)) {
    if (!(chave in conteudo)) continue;
    const v = conteudo[chave];

    if (def.forma === 'objeto') {
      if (!ehObjeto(v)) throw erro(`"${chave}" deve ser um objeto.`);
      saida[chave] = v;
      continue;
    }

    if (!Array.isArray(v)) throw erro(`"${chave}" deve ser uma lista.`);
    if (v.length > MAX_ITENS) throw erro(`"${chave}" tem itens demais (máximo ${MAX_ITENS}).`);
    v.forEach((it, i) => {
      if (!ehObjeto(it)) throw erro(`"${chave}" · item #${i + 1} tem formato inválido.`);
    });

    if (chave === 'op_secoes') validarSecoes(v);
    saida[chave] = NORMALIZADORES[chave] ? NORMALIZADORES[chave](v) : v;
  }

  return saida;
}