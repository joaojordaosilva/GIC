export class ErroHttp extends Error {
  constructor(status, mensagem, extra = {}) {
    super(mensagem);
    this.status = status;
    this.extra = extra;
  }
}

// Garante que erros lançados em handlers async cheguem ao tratarErros (Express 4 e 5).
export const assincrono = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Middleware final: converte erros em respostas JSON { erro, ... } sem vazar detalhes internos.
// eslint-disable-next-line no-unused-vars
export function tratarErros(err, req, res, next) {
  if (err instanceof ErroHttp) {
    return res.status(err.status).json({ erro: err.message, ...err.extra });
  }

  // Erros do body-parser (JSON malformado, corpo grande demais)
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ erro: 'Conteúdo grande demais.' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido.' });
  }

  // Erros do PostgreSQL (códigos SQLSTATE)
  switch (err?.code) {
    case '23505': // unique_violation
      return res.status(409).json({
        erro: 'Já existe um registro com esse valor único.',
        detalhe: err.detail || undefined
      });
    case '23503': // foreign_key_violation
      return res.status(409).json({
        erro: 'Operação bloqueada: há registros que dependem deste.',
        detalhe: err.detail || undefined
      });
    case '23514': // check_violation
      return res.status(422).json({
        erro: 'Algum valor está fora do que as regras do banco permitem.',
        detalhe: err.constraint || undefined
      });
    case '22001': // string_data_right_truncation
      return res.status(422).json({ erro: 'Algum texto excede o tamanho permitido pelo banco.' });
    case '22P02': // invalid_text_representation
      return res.status(422).json({ erro: 'Algum valor enviado tem formato inválido.' });
  }

  console.error('[admin] erro inesperado:', err);
  return res.status(500).json({ erro: 'Erro interno do servidor.' });
}
