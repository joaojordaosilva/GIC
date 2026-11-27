// As 13 coleções que o PainelAdmin edita.
//  tabela = fica em tabelas relacionais do schema do GIC
//  json   = fica em conteudo_site (JSONB), pois o schema não tem tabela equivalente
export const COLECOES = {
  home_hero: { forma: 'objeto', onde: 'json' },
  home_noticias: { forma: 'lista', onde: 'tabela' }, // -> avisos
  c_config: { forma: 'objeto', onde: 'json' },
  c_topicos: { forma: 'lista', onde: 'json' },
  c_cards: { forma: 'lista', onde: 'json' },
  c_quem: { forma: 'lista', onde: 'json' },
  c_terminal: { forma: 'lista', onde: 'json' },
  op_categorias: { forma: 'lista', onde: 'tabela' }, // -> categorias_oportunidade
  op_secoes: { forma: 'lista', onde: 'tabela' }, // -> oportunidades + tags + oportunidades_tags
  d_cursos: { forma: 'lista', onde: 'tabela' }, // -> cursos
  d_disciplinas: { forma: 'lista', onde: 'tabela' }, // -> disciplinas + matrizes_curriculares + pre_requisitos
  ia_config: { forma: 'objeto', onde: 'json' },
  ia_conhecimento: { forma: 'lista', onde: 'tabela' } // -> faqs_chatbot
};

// Não saem na rota pública GET /api/conteudo (prompt e base interna da IA).
export const SENSIVEIS = ['ia_config', 'ia_conhecimento'];

// Ordem de gravação: cursos antes das disciplinas e categorias antes das seções.
export const ORDEM_GRAVACAO = [
  'd_cursos',
  'd_disciplinas',
  'home_noticias',
  'ia_conhecimento',
  'op_categorias',
  'op_secoes',
  'home_hero',
  'c_config',
  'c_topicos',
  'c_cards',
  'c_quem',
  'c_terminal',
  'ia_config'
];

export const TIPO_PARA_BANCO = {
  O: 'OBRIGATORIA',
  E: 'ELETIVA',
  X: 'EXTENSAO',
  N: 'ENFASE',
  S: 'ESTAGIO'
};
export const TIPO_PARA_PAINEL = Object.fromEntries(
  Object.entries(TIPO_PARA_BANCO).map(([k, v]) => [v, k])
);

export const PRE_MODOS = ['lista', 'nenhum', 'naoconsta', 'ate5', 'var'];

export const PREFIXO_SEM_CODIGO = 'SEM-';
export const PREFIXO_ID_BANCO = 'db-';