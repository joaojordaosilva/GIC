import { ErroHttp } from './erros.js';

// Limitador de tentativas em memória (suficiente para uma única instância do servidor;
// com várias instâncias, troque por Redis ou similar).
export function criarLimitador({ max, janelaMs }) {
  const mapa = new Map();

  const limpeza = setInterval(() => {
    const agora = Date.now();
    for (const [chave, e] of mapa) if (e.expira <= agora) mapa.delete(chave);
  }, 60_000);
  limpeza.unref();

  return {
    verificar(chave) {
      const e = mapa.get(chave);
      if (e && e.expira > Date.now() && e.n >= max) {
        const minutos = Math.ceil((e.expira - Date.now()) / 60_000);
        throw new ErroHttp(429, `Muitas tentativas de login. Tente novamente em ${minutos} min.`);
      }
    },
    falha(chave) {
      const agora = Date.now();
      const e = mapa.get(chave);
      if (!e || e.expira <= agora) mapa.set(chave, { n: 1, expira: agora + janelaMs });
      else e.n += 1;
    },
    sucesso(chave) {
      mapa.delete(chave);
    }
  };
}
