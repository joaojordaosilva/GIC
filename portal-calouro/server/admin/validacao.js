import { ErroHttp } from './erros.js';

// Valida e devolve uma string aparada. Lança 422 com mensagem em português.
export function texto(valor, campo, { min = 0, max = 255, obrigatorio = false } = {}) {
  if (valor === undefined || valor === null) valor = '';
  if (typeof valor !== 'string') throw new ErroHttp(422, `"${campo}" deve ser um texto.`);
  const v = valor.trim();
  if ((obrigatorio || min > 0) && v.length < Math.max(min, 1)) {
    throw new ErroHttp(422, `Preencha "${campo}".`);
  }
  if (v.length > max) throw new ErroHttp(422, `"${campo}" excede ${max} caracteres.`);
  return v;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function email(valor) {
  const v = texto(valor, 'E-mail', { obrigatorio: true, max: 100 }).toLowerCase();
  if (!EMAIL.test(v)) throw new ErroHttp(422, 'E-mail inválido.');
  return v;
}

// bcrypt só considera os 72 primeiros bytes; por isso o limite.
export function senhaNova(valor) {
  if (typeof valor !== 'string') throw new ErroHttp(422, 'Informe a senha.');
  if (valor.length < 8) throw new ErroHttp(422, 'A senha deve ter pelo menos 8 caracteres.');
  if (Buffer.byteLength(valor, 'utf8') > 72) {
    throw new ErroHttp(422, 'A senha deve ter no máximo 72 bytes (cerca de 72 caracteres).');
  }
  return valor;
}

export const PAPEIS = ['ADMIN', 'EDITOR'];
export function papel(valor) {
  if (!PAPEIS.includes(valor)) throw new ErroHttp(422, 'Papel inválido. Use ADMIN ou EDITOR.');
  return valor;
}

export function idNumerico(valor, campo = 'id') {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new ErroHttp(400, `"${campo}" inválido.`);
  return n;
}
