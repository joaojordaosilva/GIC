import { useState, useRef, useEffect } from 'react';

interface Mensagem {
  id: string;
  texto: string;
  remetente: 'bot' | 'user';
}

interface RespostaIA {
  resolvido: boolean;
  resposta: string;
  setor: string;
}

const SUGESTOES = [
  "Como acesso o SIGAA?",
  "Onde faço a carteira VAMU?",
  "Regras de faltas",
  "O que é o PIBIC?"
];

// --- FUNÇÃO ADICIONADA: Formatação de texto (Negrito, Código e Quebra de linha) ---
const formatText = (text: string) => {
  if (!text) return "";
  
  // Divide o texto pelos asteriscos duplos ou crases (para código)
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part, i) => {
    if (part.startsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>;
    if (part.startsWith('`')) return <code key={i} className="code-inline">{part.slice(1, -1)}</code>;
    
    // Tratamento para quebras de linha funcionarem (\n)
    return part.split('\n').map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j !== arr.length - 1 && <br />}
      </span>
    ));
  });
};

export default function Chatbot({
  setPaginaAtiva
}: {
  setPaginaAtiva: (pagina: string) => void
}) {

  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      id: '1',
      texto: 'Olá, calouro! Sou o assistente virtual do GIC. Como posso te ajudar hoje?',
      remetente: 'bot'
    }
  ]);

  const [input, setInput] = useState('');
  const [escrevendo, setEscrevendo] = useState(false);

  const mensagensEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    mensagensEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  }, [mensagens, escrevendo]);

  const enviarMensagem = async (texto: string) => {

    if (!texto.trim() || escrevendo) {
      return;
    }

    const mensagemUsuario: Mensagem = {
      id: Date.now().toString(),
      texto: texto.trim(),
      remetente: 'user'
    };

    setMensagens(prev => [
      ...prev,
      mensagemUsuario
    ]);

    setInput('');
    setEscrevendo(true);

    try {

      const historico = [...mensagens, mensagemUsuario];

      const response = await fetch(
        '/api/chat',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({
            mensagem: texto.trim(),
            historico
          })
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao consultar o servidor.');
      }

      const dados: RespostaIA = await response.json();

      let textoResposta = dados.resposta;

      /*
       * Se a IA não conseguiu resolver,
       * adicionamos automaticamente o encaminhamento.
       */
      if (!dados.resolvido && dados.setor && dados.setor !== "Nenhum") {
        textoResposta += `\n\n**Recomendo procurar:** ${dados.setor}.`;
      }

      const mensagemBot: Mensagem = {
        id: `${Date.now()}-bot`,
        texto: textoResposta,
        remetente: 'bot'
      };

      setMensagens(prev => [
        ...prev,
        mensagemBot
      ]);

    } catch (erro) {

      console.error(erro);

      const mensagemErro: Mensagem = {
        id: `${Date.now()}-erro`,
        texto:
          'Não consegui acessar o assistente de IA neste momento.\n\n' +
          'Para obter orientação, recomendo procurar a **Secretaria** ou a **Coordenação do curso**.',
        remetente: 'bot'
      };

      setMensagens(prev => [
        ...prev,
        mensagemErro
      ]);

    } finally {

      setEscrevendo(false);
    }
  };

  return (
    <div className="page-chatbot">

      <div className="page-hero">

        <div className="wrap">

          <div className="hero-top-actions">

            <button
              className="btn-voltar"
              onClick={() => setPaginaAtiva('inicio')}
            >

              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >

                <line
                  x1="19"
                  y1="12"
                  x2="5"
                  y2="12"
                />

                <polyline
                  points="12 19 5 12 12 5"
                />

              </svg>

              Voltar

            </button>

          </div>

        </div>

      </div>

      <main className="chat-main">

        <div className="chat-container">

          <div className="chat-header">

            <div className="chat-avatar">
              🤖
            </div>

            <div className="chat-title">

              <h3>
                Assistente GIC
              </h3>

              <span>
                Online agora
              </span>

            </div>

          </div>

          <div className="chat-messages">

            {mensagens.map(msg => (

              <div
                key={msg.id}
                className={`message-row ${msg.remetente}`}
              >

                <div className="message-bubble">
                  
                  {/* --- CORREÇÃO AQUI: Chamamos a função formatText --- */}
                  {formatText(msg.texto)}

                </div>

              </div>

            ))}

            {escrevendo && (

              <div className="message-row bot">

                <div className="message-bubble typing">

                  <span></span>
                  <span></span>
                  <span></span>

                </div>

              </div>

            )}

            <div ref={mensagensEndRef} />

          </div>

          <div className="chat-suggestions">

            {SUGESTOES.map((sug, i) => (

              <button
                key={i}
                onClick={() => enviarMensagem(sug)}
                disabled={escrevendo}
              >
                {sug}
              </button>

            ))}

          </div>

          <form
            className="chat-input-area"
            onSubmit={(e) => {
              e.preventDefault();
              enviarMensagem(input);
            }}
          >

            <input
              type="text"
              placeholder="Digite sua dúvida aqui..."
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              disabled={escrevendo}
            />

            <button
              type="submit"
              disabled={!input.trim() || escrevendo}
              aria-label="Enviar"
            >

              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >

                <line
                  x1="22"
                  y1="2"
                  x2="11"
                  y2="13"
                />

                <polygon
                  points="22 2 15 22 11 13 2 9 22 2"
                />

              </svg>

            </button>

          </form>

        </div>

      </main>

    </div>
  );
}