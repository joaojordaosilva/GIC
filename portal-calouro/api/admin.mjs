// Função serverless da Vercel que atende TODO o back-end do admin.
// Uma única função (e não uma por rota) para não estourar o limite de funções do plano gratuito.
// O vercel.json encaminha /api/admin/* e /api/conteudo para cá; o caminho original é preservado,
// então o roteador Express enxerga as mesmas URLs que no server.js local.
import express from 'express';
import { montarAdmin } from '../server/admin/index.js';

const app = express();
app.set('trust proxy', 1); // atrás da Vercel: req.ip passa a ser o IP real do visitante

// A Vercel pode entregar o corpo da requisição já lido (req.body pronto). Nesse caso o express.json()
// ficaria esperando um corpo que já foi consumido. Marcar req._body faz o Express aproveitar o que já veio.
app.use((req, res, next) => {
  try {
    if (req.body !== null && typeof req.body === 'object') req._body = true;
  } catch {
    // corpo inválido: deixa o próprio Express responder com erro 400
  }
  next();
});

montarAdmin(app);

export default app;