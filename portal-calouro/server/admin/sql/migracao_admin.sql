-- =========================================================================
-- GIC · Migração do back-end administrativo
-- Rode DEPOIS do GIC_POSTGRE_FINALIZADO.sql. É idempotente (pode rodar de novo).
-- Requer PostgreSQL 12+ (Supabase, Neon, Render e Railway já atendem).
-- Não remove nem altera dados existentes: só acrescenta tipos, colunas e tabelas.
-- =========================================================================

-- 1) O painel distingue 5 tipos de disciplina; o enum original só tinha 2.
--    O=OBRIGATORIA  E=ELETIVA  X=EXTENSAO  N=ENFASE  S=ESTAGIO
ALTER TYPE tipo_disciplina_enum ADD VALUE IF NOT EXISTS 'EXTENSAO';
ALTER TYPE tipo_disciplina_enum ADD VALUE IF NOT EXISTS 'ENFASE';
ALTER TYPE tipo_disciplina_enum ADD VALUE IF NOT EXISTS 'ESTAGIO';

-- 2) cursos: dados que o painel edita e não tinham coluna
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS unidade_ch VARCHAR(4) NOT NULL DEFAULT 'h';      -- 'h' ou 'h/a'
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS resumo     JSONB      NOT NULL DEFAULT '[]'::jsonb; -- [{label, valor}]
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS fluxo      TEXT;
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS fonte      TEXT;
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS notas      JSONB      NOT NULL DEFAULT '[]'::jsonb; -- ["...", "..."]
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS enfases    JSONB      NOT NULL DEFAULT '[]'::jsonb; -- [{nome, disciplinas[]}]
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS ordem      INT        NOT NULL DEFAULT 0;

-- 3) disciplinas
--    ref_id              = id que o painel usa (texto). Permite sincronizar sem duplicar linhas.
--    pre_modo            = como os pré-requisitos são exibidos (lista | nenhum | naoconsta | ate5 | var).
--                          Quando 'lista', os pré-requisitos reais ficam na tabela pre_requisitos.
--    correquisitos       = nomes das disciplinas correquisito (o schema não tem tabela para isso).
--    equivalencias_texto = códigos do currículo antigo, em texto livre ("CCOM002, CCOM003").
ALTER TABLE disciplinas ADD COLUMN IF NOT EXISTS ref_id              VARCHAR(60);
ALTER TABLE disciplinas ADD COLUMN IF NOT EXISTS pre_modo            VARCHAR(12) NOT NULL DEFAULT 'nenhum';
ALTER TABLE disciplinas ADD COLUMN IF NOT EXISTS correquisitos       JSONB       NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE disciplinas ADD COLUMN IF NOT EXISTS equivalencias_texto TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_disciplinas_ref_id ON disciplinas(ref_id);

-- 4) matrizes_curriculares
--    periodo_grupo guarda o valor exato do painel: '1'..'10', 'N' (ênfase) ou 'C' (catálogo de eletivas).
--    Para 'N' e 'C', periodo_ideal fica 0.
ALTER TABLE matrizes_curriculares ADD COLUMN IF NOT EXISTS periodo_grupo VARCHAR(2);
ALTER TABLE matrizes_curriculares ADD COLUMN IF NOT EXISTS ordem         INT NOT NULL DEFAULT 0;

-- 5) avisos = notícias do carrossel da página inicial
ALTER TABLE avisos ADD COLUMN IF NOT EXISTS ref_id     VARCHAR(60);
ALTER TABLE avisos ADD COLUMN IF NOT EXISTS imagem_url TEXT;
ALTER TABLE avisos ADD COLUMN IF NOT EXISTS link_url   TEXT;
ALTER TABLE avisos ADD COLUMN IF NOT EXISTS ativo      BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE avisos ADD COLUMN IF NOT EXISTS ordem      INT     NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS ux_avisos_ref_id ON avisos(ref_id);

-- 6) faqs_chatbot = base de conhecimento do assistente
--    (contador_acessos nunca é tocado pelo painel)
ALTER TABLE faqs_chatbot ADD COLUMN IF NOT EXISTS ref_id    VARCHAR(60);
ALTER TABLE faqs_chatbot ADD COLUMN IF NOT EXISTS categoria VARCHAR(30) NOT NULL DEFAULT 'geral';
ALTER TABLE faqs_chatbot ADD COLUMN IF NOT EXISTS ativo     BOOLEAN     NOT NULL DEFAULT true;
ALTER TABLE faqs_chatbot ADD COLUMN IF NOT EXISTS ordem     INT         NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS ux_faqs_ref_id ON faqs_chatbot(ref_id);

-- 7) Conteúdo sem tabela própria no schema (textos da home, guia do calouro,
--    oportunidades, prompt da IA...) fica em JSONB, uma linha por coleção.
--    dados = NULL significa "esta coleção vive nas tabelas relacionais acima";
--    a linha existir significa "o painel já salvou esta coleção pelo menos uma vez".
CREATE TABLE IF NOT EXISTS conteudo_site (
    colecao        VARCHAR(40) PRIMARY KEY,
    dados          JSONB,
    atualizado_por INT REFERENCES usuarios(id) ON DELETE SET NULL,
    atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8) Controle de edição simultânea: cada gravação incrementa a revisão.
CREATE TABLE IF NOT EXISTS conteudo_revisao (
    id      SMALLINT PRIMARY KEY CHECK (id = 1),
    revisao INT NOT NULL DEFAULT 0
);
INSERT INTO conteudo_revisao (id, revisao) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

-- 9) Segurança: no Supabase, tabelas sem RLS ficam acessíveis pela API pública.
--    Estas duas só devem ser tocadas pelo servidor (que conecta com um role que ignora RLS).
ALTER TABLE conteudo_site    ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteudo_revisao ENABLE ROW LEVEL SECURITY;
