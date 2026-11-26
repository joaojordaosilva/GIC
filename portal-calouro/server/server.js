import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { montarAdmin } from "./admin/index.js";

dotenv.config();

const app = express();

// CORS_ORIGINS="https://seu-site.com,http://localhost:5173" restringe quem pode chamar a API.
// Sem a variável, o comportamento continua como antes (aceita qualquer origem).
const origensPermitidas = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
  : true;
app.use(cors({ origin: origensPermitidas }));

// Back-end do painel admin (login, conteúdo, usuários).
// Precisa vir ANTES do express.json() abaixo: o admin tem limite de corpo próprio (5 MB).
montarAdmin(app);

app.use(express.json());

const PORT = process.env.PORT || 3001;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Teste do Servidor

app.get("/api/status", (req, res) => {
  res.json({
    online: true,
    mensagem: "Servidor do GIC funcionando."
  });
});

// ChatBot

app.post("/api/chat", async (req, res) => {
  try {
    const { mensagem, historico = [] } = req.body;

    if (!mensagem || !mensagem.trim()) {
      return res.status(400).json({
        erro: "Mensagem vazia."
      });
    }

    const resposta = await gerarRespostaIA(mensagem, historico);

    return res.json(resposta);

  } catch (erro) {

    console.error("=================================");
    console.error("ERRO NO CHATBOT:");
    console.error(erro);
    console.error("=================================");

    return res.status(500).json({
      resolvido: false,
      resposta:
        "Não consegui consultar o assistente neste momento.\n\n" +
        "Para obter orientação, recomendo procurar a Secretaria ou a Coordenação do curso.",
      setor: "Secretaria"
    });
  }
});

// Função da IA

async function gerarRespostaIA(mensagem, historico) {

  const contextoHistorico = historico
    .slice(-6)
    .map(msg => `${msg.remetente}: ${msg.texto}`)
    .join("\n");

  const prompt = `
Você é o assistente virtual oficial do GIC
(Guia do Ingressante em Computação).

Seu objetivo é ajudar alunos ingressantes do curso de Computação.

Você pode responder dúvidas relacionadas a:

- matrícula;
- disciplinas;
- SIGAA;
- faltas e frequência;
- provas;
- histórico;
- atestado de matrícula;
- bolsas;
- PIBIC;
- pesquisa;
- extensão;
- oportunidades acadêmicas;
- funcionamento do curso;
- informações apresentadas pelo GIC.

REGRAS IMPORTANTES:

1. Nunca invente informações.

2. Se você tiver segurança suficiente para responder,
responda de maneira clara e objetiva.

3. Se a pergunta depender de uma informação institucional
que você não conhece ou não consegue confirmar,
considere que a dúvida NÃO foi resolvida.

4. Quando não conseguir resolver a dúvida, indique o setor
que o aluno deve procurar.

5. Os setores permitidos são:

- Secretaria
- Coordenação do curso
- Assistência Estudantil
- Departamento responsável
- Professor/Docente

6. Não diga que uma informação é oficial se você não tiver
certeza disso.

7. Se a pergunta for ambígua e não houver informação
suficiente, considere a dúvida não resolvida.

8. A resposta deve ser adequada para um aluno ingressante.

9. Não invente telefones, e-mails, horários ou endereços.

10. Responda sempre em português do Brasil.

11. Se a pergunta for uma dúvida geral que você consegue
responder com segurança, NÃO encaminhe para a Secretaria
desnecessariamente.

12. Se você não souber a resposta específica da universidade,
deixe resolvido como false e indique o setor mais adequado.

HISTÓRICO RECENTE:

${contextoHistorico || "Nenhum histórico disponível."}

NOVA PERGUNTA DO ALUNO:

${mensagem}
`;

  const schema = {
    type: "object",

    properties: {

      resolvido: {
        type: "boolean",
        description:
          "Indica se a IA conseguiu responder a dúvida com segurança."
      },

      resposta: {
        type: "string",
        description:
          "Resposta que será apresentada ao aluno."
      },

      setor: {
        type: "string",
        enum: [
          "Nenhum",
          "Secretaria",
          "Coordenação do curso",
          "Assistência Estudantil",
          "Departamento responsável",
          "Professor/Docente"
        ],
        description:
          "Setor que o aluno deve procurar caso a dúvida não tenha sido resolvida."
      }

    },

    required: [
      "resolvido",
      "resposta",
      "setor"
    ]
  };

  // Chamada para o Gemini

  const response = await ai.models.generateContent({

    model: "gemini-3.8-flash",

    contents: prompt,

    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }

  });

  console.log("Resposta recebida do Gemini:");
  console.log(response.text);

  const resultado = JSON.parse(response.text);

  return resultado;
}

// Iniciar Servidor

app.listen(PORT, () => {
  console.log(
    `Servidor GIC rodando em http://localhost:${PORT}`
  );
});


// ------- SERVER TESTE BACKUP, CASO QUEBRE -------
/*import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Teste do Servidor

app.get("/api/status", (req, res) => {
  res.json({
    online: true,
    mensagem: "Servidor do GIC funcionando."
  });
});

// ChatBot

app.post("/api/chat", async (req, res) => {
  try {
    const { mensagem, historico = [] } = req.body;

    if (!mensagem || !mensagem.trim()) {
      return res.status(400).json({
        erro: "Mensagem vazia."
      });
    }

    const resposta = await gerarRespostaIA(mensagem, historico);

    return res.json(resposta);

  } catch (erro) {

    console.error("=================================");
    console.error("ERRO NO CHATBOT:");
    console.error(erro);
    console.error("=================================");

    return res.status(500).json({
      resolvido: false,
      resposta:
        "Não consegui consultar o assistente neste momento.\n\n" +
        "Para obter orientação, recomendo procurar a Secretaria ou a Coordenação do curso.",
      setor: "Secretaria"
    });
  }
});

// Função da IA

async function gerarRespostaIA(mensagem, historico) {

  const contextoHistorico = historico
    .slice(-6)
    .map(msg => `${msg.remetente}: ${msg.texto}`)
    .join("\n");

  const prompt = `
Você é o assistente virtual oficial do GIC
(Guia do Ingressante em Computação).

Seu objetivo é ajudar alunos ingressantes do curso de Computação.

Você pode responder dúvidas relacionadas a:

- matrícula;
- disciplinas;
- SIGAA;
- faltas e frequência;
- provas;
- histórico;
- atestado de matrícula;
- bolsas;
- PIBIC;
- pesquisa;
- extensão;
- oportunidades acadêmicas;
- funcionamento do curso;
- informações apresentadas pelo GIC.

REGRAS IMPORTANTES:

1. Nunca invente informações.

2. Se você tiver segurança suficiente para responder,
responda de maneira clara e objetiva.

3. Se a pergunta depender de uma informação institucional
que você não conhece ou não consegue confirmar,
considere que a dúvida NÃO foi resolvida.

4. Quando não conseguir resolver a dúvida, indique o setor
que o aluno deve procurar.

5. Os setores permitidos são:

- Secretaria
- Coordenação do curso
- Assistência Estudantil
- Departamento responsável
- Professor/Docente

6. Não diga que uma informação é oficial se você não tiver
certeza disso.

7. Se a pergunta for ambígua e não houver informação
suficiente, considere a dúvida não resolvida.

8. A resposta deve ser adequada para um aluno ingressante.

9. Não invente telefones, e-mails, horários ou endereços.

10. Responda sempre em português do Brasil.

11. Se a pergunta for uma dúvida geral que você consegue
responder com segurança, NÃO encaminhe para a Secretaria
desnecessariamente.

12. Se você não souber a resposta específica da universidade,
deixe resolvido como false e indique o setor mais adequado.

HISTÓRICO RECENTE:

${contextoHistorico || "Nenhum histórico disponível."}

NOVA PERGUNTA DO ALUNO:

${mensagem}
`;

  const schema = {
    type: "object",

    properties: {

      resolvido: {
        type: "boolean",
        description:
          "Indica se a IA conseguiu responder a dúvida com segurança."
      },

      resposta: {
        type: "string",
        description:
          "Resposta que será apresentada ao aluno."
      },

      setor: {
        type: "string",
        enum: [
          "Nenhum",
          "Secretaria",
          "Coordenação do curso",
          "Assistência Estudantil",
          "Departamento responsável",
          "Professor/Docente"
        ],
        description:
          "Setor que o aluno deve procurar caso a dúvida não tenha sido resolvida."
      }

    },

    required: [
      "resolvido",
      "resposta",
      "setor"
    ]
  };

  // Chamada para o Gemini

  const response = await ai.models.generateContent({

    model: "gemini-3.8-flash",

    contents: prompt,

    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }

  });

  console.log("Resposta recebida do Gemini:");
  console.log(response.text);

  const resultado = JSON.parse(response.text);

  return resultado;
}

// Iniciar Servidor

app.listen(PORT, () => {
  console.log(
    `Servidor GIC rodando em http://localhost:${PORT}`
  );
});*/