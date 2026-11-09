import { useEffect } from 'react';


function Home({ setPaginaAtiva }: { setPaginaAtiva: (pagina: string) => void }) {
  
  useEffect(() => {
    const W = 1440, H = 560, MOBILE = 900;
    const viewport = document.getElementById('viewport');
    const stage = document.getElementById('stage');

    function fit() {
      if (!viewport || !stage) return;
      const vw = document.documentElement.clientWidth;
      if (vw <= MOBILE) {
        stage.style.transform = '';
        stage.style.marginLeft = '';
        viewport.style.height = '';
        return;
      }
      const scale = Math.min(1, vw / W);
      stage.style.transform = `scale(${scale})`;
      // Sinais matemáticos corrigidos aqui:
      stage.style.marginLeft = vw > W ? `${(vw - W) / 2}px` : '0';
      viewport.style.height = `${H * scale}px`;
    }

    window.addEventListener('resize', fit);
    fit();

    return () => window.removeEventListener('resize', fit);
  }, []);

  return (
    <>
      <div className="viewport" id="viewport">
        <div className="stage" id="stage">
          <div className="content">
            <div className="brand">
              <svg width="52" height="38" viewBox="0 0 100 74" aria-hidden="true">
                <polygon points="50,6 96,24 50,42 4,24" fill="#ffffff" stroke="#ffffff" strokeWidth="5" strokeLinejoin="round" />
                <path d="M20 36 L50 47.5 L80 36 L80 56 Q50 74 20 56 Z" fill="#ffffff" stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" />
                <rect x="85" y="26" width="3.5" height="22" fill="#ffffff" />
                <path d="M83 48 L90.5 48 L92 60 L81.5 60 Z" fill="#ffffff" stroke="#ffffff" strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <div className="brand__divider"></div>
              <div className="brand__name">GIC</div>
            </div>
            <h1 className="title">Guia do Ingressante em Computação</h1>
            <p className="text">Encontre aqui todos os guias, mapas e dicas essenciais para se orientar no instituto e na universidade. Tudo o que você precisa saber no seu primeiro período reunido em um só lugar.</p>
            <div className="actions">
              {/* O botão agora aciona a mudança de página */}
              <a className="btn" href="#" onClick={(e) => { e.preventDefault(); setPaginaAtiva('calouro'); }}>Sou calouro</a>
            </div>
          </div>
          <div className="panels" aria-hidden="true">
            <div className="panel panel--code">
              <div className="kw">class Aluno {'{'}</div>
              <div className="attr">curso1 = "CC";<br/>curso2 = "EC";<br/>curso3 = "IA";</div>
              <div className="fn">bemVindo();</div>
              <div className="kw">{'}'}</div>
            </div>
            <div className="panel panel--cap">
              <svg width="132" height="98" viewBox="0 0 100 74">
                <polygon points="50,6 96,24 50,42 4,24" fill="#0056b3" stroke="#0056b3" strokeWidth="5" strokeLinejoin="round" />
                <path d="M20 36 L50 47.5 L80 36 L80 56 Q50 74 20 56 Z" fill="#0056b3" stroke="#0056b3" strokeWidth="3" strokeLinejoin="round" />
                <rect x="85" y="26" width="3.5" height="22" fill="#0056b3" />
                <path d="M83 48 L90.5 48 L92 60 L81.5 60 Z" fill="#0056b3" stroke="#0056b3" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="panel panel--binary">
              <div>0110 1001 0011</div>
              <div className="hl">1010 0111 0100</div>
              <div>0011 1100 1010</div>
              <div>1001 0101 1110</div>
              <div className="hl">0110 0011 1001</div>
              <div>1100 1010 0101</div>
            </div>
          </div>
        </div>
      </div>

      <main className="content-area">
        <section>
          <h3>Notícias e Avisos</h3>
          <div className="carousel">
            <a href="https://site-oficial-do-ic.br" className="news-card" target="_blank" rel="noreferrer">
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQcQEada5uJkQhYaFCpTQsNUVAW2FOGIJ15x8-prG0c42noVd4SGh7mPQkF&s=10" alt="Bem vindo" />
              <div>
                <h4>Bem-vindo ao semestre!</h4>
                <p>Mensagem de boas-vindas e informações iniciais para os novos alunos.</p>
              </div>
            </a>
            <a href="https://site-oficial-do-ic.br" className="news-card" target="_blank" rel="noreferrer">
              <img src="https://noticias.ufal.br/estudante/noticias/2025/10/ufal-aprova-calendario-academico-2026-com-inicio-em-23-de-fevereiro/@@images/image-400-9e740ca6b4901d3daf2be2c98cb3ca65.jpeg" alt="Calendário Acadêmico" />
              <div>
                <h4>Calendário Acadêmico</h4>
                <p>Confira as datas importantes e os prazos do ano letivo de 2026.</p>
              </div>
            </a>
          </div>
        </section>

      </main>
    </>
  );
}

export default Home;