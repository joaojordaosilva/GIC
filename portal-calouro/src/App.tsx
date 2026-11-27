import { useEffect, useState } from 'react';
import Oportunidades from './pages/Oportunidades';
import Home from './pages/Home';
import Tutoriais from './pages/Tutoriais';
import Disciplinas from './pages/Disciplinas';
import Calculadora from './pages/Calculadora';
import Calouro from './pages/Calouro';
import Chatbot from './pages/Chatbot';
import AreaAdmin from './admin/AreaAdmin';
import { ConteudoProvider, useConteudo } from './context/ConteudoContext';

const naAreaAdmin = () => window.location.hash.startsWith('#/admin');

function ConteudoApp() {
  const [paginaAtiva, setPaginaAtiva] = useState('inicio');
  const [emAdmin, setEmAdmin] = useState(naAreaAdmin);
  const { recarregar } = useConteudo();

  useEffect(() => {
    const aoMudarHash = () => {
      const agoraAdmin = naAreaAdmin();
      setEmAdmin(agoraAdmin);
      if (!agoraAdmin) recarregar();
    };
    window.addEventListener('hashchange', aoMudarHash);
    return () => window.removeEventListener('hashchange', aoMudarHash);
  }, [recarregar]);

  const voltarParaGic = () => {
    window.location.hash = '';
    setEmAdmin(false);
    setPaginaAtiva('inicio');
    recarregar();
    window.scrollTo(0, 0);
  };

  const renderizarPagina = () => {
    switch (paginaAtiva) {
      case 'inicio': return <Home setPaginaAtiva={setPaginaAtiva} />;
      case 'calouro': return <Calouro setPaginaAtiva={setPaginaAtiva} />;
      case 'oportunidades': return <Oportunidades />;
      case 'tutoriais': return <Tutoriais />;
      case 'disciplinas': return <Disciplinas />;
      case 'calculadora': return <Calculadora />;
      case 'chatbot': return <Chatbot setPaginaAtiva={setPaginaAtiva} />;
      default: return <Home setPaginaAtiva={setPaginaAtiva} />;
    }
  };

  if (emAdmin) {
    return <AreaAdmin onVoltarSite={voltarParaGic} />;
  }

  return (
    <>
      <header>
        <a href="#" onClick={(e) => { e.preventDefault(); setPaginaAtiva('inicio'); }} className="logo">
          <img src="/logo.png" alt="Logo GIC" />
        </a>

        <nav className="capsule-nav">
          <a href="#" className={paginaAtiva === 'inicio' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setPaginaAtiva('inicio'); }}>Início</a>
          <a href="#" className={paginaAtiva === 'oportunidades' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setPaginaAtiva('oportunidades'); }}>Oportunidades</a>
          <a href="#" className={paginaAtiva === 'tutoriais' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setPaginaAtiva('tutoriais'); }}>Tutoriais</a>
          <a href="#" className={paginaAtiva === 'disciplinas' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setPaginaAtiva('disciplinas'); }}>Disciplinas</a>
          <a href="#" className={paginaAtiva === 'calculadora' ? 'active' : ''} onClick={(e) => { e.preventDefault(); setPaginaAtiva('calculadora'); }}>Calculadora</a>
        </nav>
      </header>

      <div className="main-content">
        {renderizarPagina()}
      </div>

      {paginaAtiva !== 'chatbot' && (
        <footer className="site-footer">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Equipe de Desenvolvimento</h4>
              <p><strong>João:</strong> Front-end & UI/UX<br />
                <strong>Josivaldo:</strong> Back-end & Arquitetura<br />
                <strong>Dárcio:</strong> Banco de Dados & Gestão</p>
            </div>
            <div className="footer-section">
              <h4>Suporte e Links Úteis</h4>
              <p>Email: suporte-calouros@ic.br<br />
                Coordenação: (00) 0000-0000<br />
                <a href="#" style={{ color: '#ffc107', textDecoration: 'none' }}>Portal Institucional Oficial</a></p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>
              &copy; 2026 Instituto de Computação - Portal do Calouro ·{' '}
              <a href="#/admin" style={{ color: '#999', textDecoration: 'underline' }}>
                Área administrativa
              </a>
            </p>
          </div>
        </footer>
      )}

      {paginaAtiva !== 'chatbot' && (
        <a href="#" onClick={(e) => { e.preventDefault(); setPaginaAtiva('chatbot'); }} className="floating-btn">
          💬 Chatbot
        </a>
      )}
    </>
  );
}

function App() {
  return (
    <ConteudoProvider>
      <ConteudoApp />
    </ConteudoProvider>
  );
}

export default App;