// Cliente da API do painel. É o único ponto do front que conhece o back-end.
// Em desenvolvimento, o proxy do Vite já encaminha /api para http://localhost:3001.
// Em produção, defina VITE_API_URL (ex.: https://gic-api.onrender.com) no build.

const BASE = `${(import.meta as any).env?.VITE_API_URL ?? ''}/api`;
const TOKEN_KEY = 'gic_admin_token';

export class ErroApi extends Error {
  status: number;
  extra: Record<string, unknown>;
  constructor(status: number, mensagem: string, extra: Record<string, unknown> = {}) {
    super(mensagem);
    this.status = status;
    this.extra = extra;
  }
}

async function chamar<T>(caminho: string, opcoes: { metodo?: string; corpo?: unknown; auth?: boolean } = {}): Promise<T> {
  const { metodo = 'GET', corpo, auth = true } = opcoes;
  const headers: Record<string, string> = {};
  if (corpo !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const t = sessionStorage.getItem(TOKEN_KEY);
    if (t) headers.Authorization = `Bearer ${t}`;
  }

  let resp: Response;
  try {
    resp = await fetch(`${BASE}${caminho}`, { method: metodo, headers, body: corpo !== undefined ? JSON.stringify(corpo) : undefined });
  } catch {
    throw new ErroApi(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.');
  }

  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    if (resp.status === 401 && auth) sessionStorage.removeItem(TOKEN_KEY); // sessão expirou
    const { erro, ...extra } = dados as { erro?: string };
    throw new ErroApi(resp.status, erro || `Erro ${resp.status}`, extra);
  }
  return dados as T;
}

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  cargo: string;
  papel: 'ADMIN' | 'EDITOR';
}

export const apiAdmin = {
  temSessao: () => !!sessionStorage.getItem(TOKEN_KEY),

  async login(email: string, senha: string): Promise<Usuario> {
    const r = await chamar<{ token: string; usuario: Usuario }>('/admin/auth/login', { metodo: 'POST', corpo: { email, senha }, auth: false });
    sessionStorage.setItem(TOKEN_KEY, r.token);
    return r.usuario;
  },

  logout: () => sessionStorage.removeItem(TOKEN_KEY),

  eu: () => chamar<{ usuario: Usuario }>('/admin/auth/me'),

  trocarSenha: (senhaAtual: string, novaSenha: string) =>
    chamar<{ ok: true }>('/admin/auth/senha', { metodo: 'POST', corpo: { senhaAtual, novaSenha } }),

  // { revisao, conteudo }. "conteudo" só traz as coleções que já foram salvas alguma vez.
  carregar: () => chamar<{ revisao: number; conteudo: Record<string, any> }>('/admin/conteudo'),

  // Devolve o conteúdo como ficou no banco (com os ids definitivos) e a nova revisão.
  // Se outra pessoa salvou antes, lança ErroApi com status 409.
  salvar: (conteudo: Record<string, any>, revisao: number | null) =>
    chamar<{ revisao: number; conteudo: Record<string, any> }>('/admin/conteudo', { metodo: 'PUT', corpo: { conteudo, revisao } }),

  // Leitura pública (sem login) para o site. Não inclui prompt/base da IA.
  conteudoPublico: () => chamar<{ conteudo: Record<string, any> }>('/conteudo', { auth: false })
};
