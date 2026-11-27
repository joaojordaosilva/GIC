import { useState, useMemo, useEffect, useRef } from 'react';
import { useConteudo } from '../context/ConteudoContext';

/* =====================================================================
   MOLDES DO TYPESCRIPT
   ===================================================================== */
interface Oportunidade {
  id: string;
  titulo: string;
  descricao: string;
  link: string;
  img?: string;
  tags: string[];
}

interface SecaoOportunidade {
  id: string;
  categoria: string;
  icone: string;
  titulo: string;
  subtitulo: string;
  itens: Oportunidade[];
}

/* =====================================================================
   DADOS PADRÃO (FALLBACK)
   ===================================================================== */
const CATEGORIAS_PADRAO = [
  { id: "pesquisa", nome: "Pesquisa & Labs" },
  { id: "ensino", nome: "Monitoria & Ensino" },
  { id: "extensao", nome: "Extensão" },
  { id: "mercado", nome: "Estágio & Mercado" }
];

const SECOES_PADRAO: SecaoOportunidade[] = [
  {
    id: "labs",
    categoria: "pesquisa",
    icone: "🔬",
    titulo: "Laboratórios e Pesquisa",
    subtitulo: "Iniciação científica, bolsas de pesquisa e grupos de estudo.",
    itens: [
      {
        id: "pibic",
        titulo: "Iniciação Científica (PIBIC/PIBITI)",
        descricao: "Bolsas anuais (CNPq/FAPEAL) para desenvolver projetos de pesquisa orientados por professores. Ótimo para quem deseja seguir carreira acadêmica ou mestrado.",
        link: "#",
        tags: ["bolsa", "pesquisa", "cnpq"],
        img: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=400"
      },
      {
        id: "nees",
        titulo: "NEES - Computação na Educação",
        descricao: "O Núcleo de Excelência em Tecnologias Sociais é um dos maiores laboratórios do IC, focado em inteligência artificial e sistemas para o Ministério da Educação.",
        link: "#",
        tags: ["laboratório", "ia", "desenvolvimento"]
      },
      {
        id: "edge",
        titulo: "Edge Computing (LACC)",
        descricao: "Laboratório de Computação em Nuvem e Borda. Projetos focados em cidades inteligentes, IoT e redes.",
        link: "#",
        tags: ["laboratório", "redes", "iot"]
      }
    ]
  },
  {
    id: "monitoria",
    categoria: "ensino",
    icone: "👨‍🏫",
    titulo: "Monitoria e Ensino",
    subtitulo: "Ajude outros alunos, reforce seu conhecimento e ganhe bolsa.",
    itens: [
      {
        id: "mon-ic",
        titulo: "Monitoria do Instituto de Computação",
        descricao: "Editais semestrais para monitoria remunerada ou voluntária nas disciplinas base (Programação 1, Matemática Discreta, Cálculo). Exige nota alta na matéria.",
        link: "#",
        tags: ["bolsa", "ensino", "p1"]
      }
    ]
  },
  {
    id: "ext",
    categoria: "extensao",
    icone: "🚀",
    titulo: "Projetos de Extensão",
    subtitulo: "Aplique a computação na sociedade e cumpra suas ACEs.",
    itens: [
      {
        id: "maratona",
        titulo: "Maratona de Programação",
        descricao: "Treinamentos semanais para competições de algoritmos (ICPC). Desenvolve raciocínio lógico rápido e é muito valorizado por Big Techs.",
        link: "#",
        tags: ["competição", "algoritmos", "c++", "extensão"]
      },
      {
        id: "meninas",
        titulo: "Meninas na Computação",
        descricao: "Projeto que visa incentivar alunas do ensino médio e fundamental a ingressarem nas carreiras de exatas e tecnologia.",
        link: "#",
        tags: ["inclusão", "sociedade", "extensão"]
      }
    ]
  },
  {
    id: "mercado",
    categoria: "mercado",
    icone: "💼",
    titulo: "Estágio e Mercado",
    subtitulo: "Empresas juniores, vagas e preparação para a carreira.",
    itens: [
      {
        id: "ej",
        titulo: "Empresa Júnior",
        descricao: "Viva a experiência de uma empresa real ainda na graduação. Desenvolva sites, sistemas e lide com clientes reais sob a orientação de professores.",
        link: "#",
        tags: ["mercado", "web", "experiência"]
      },
      {
        id: "mural",
        titulo: "Mural de Estágios",
        descricao: "Acompanhe as vagas divulgadas pela coordenação em parceria com empresas locais e nacionais (remoto).",
        link: "#",
        tags: ["vagas", "trabalho", "remoto"]
      }
    ]
  }
];

/* =====================================================================
   PÁGINA PRINCIPAL
   ===================================================================== */
export default function Oportunidades() {
  const { conteudo } = useConteudo();

  const CATEGORIAS = useMemo(() => {
    if (Array.isArray(conteudo.op_categorias) && conteudo.op_categorias.length > 0) {
      return conteudo.op_categorias;
    }
    return CATEGORIAS_PADRAO;
  }, [conteudo.op_categorias]);

  const SECOES: SecaoOportunidade[] = useMemo(() => {
    if (Array.isArray(conteudo.op_secoes) && conteudo.op_secoes.length > 0) {
      return conteudo.op_secoes.map((sec: any) => ({
        id: sec.id,
        categoria: sec.categoria,
        icone: sec.icone || '📌',
        titulo: sec.titulo,
        subtitulo: sec.subtitulo || '',
        itens: Array.isArray(sec.itens)
          ? sec.itens.map((it: any) => ({
              id: it.id,
              titulo: it.titulo,
              descricao: it.descricao || '',
              link: it.link || '#',
              img: it.img || undefined,
              tags: Array.isArray(it.tags) ? it.tags : [],
            }))
          : [],
      }));
    }
    return SECOES_PADRAO;
  }, [conteudo.op_secoes]);

  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("todos");
  
  const [scrolled, setScrolled] = useState(false);
  const [btnShrunk, setBtnShrunk] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  const [btnPosY, setBtnPosY] = useState(100); 
  const [isDragging, setIsDragging] = useState(false);
  const dragInfo = useRef({ startX: 0, startY: 0, initY: 0, moved: false });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 380) {
        setScrolled(true);
      } else {
        setScrolled(false);
        setBtnShrunk(false);
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let timer: number;
    if (scrolled && !menuAberto && !isDragging) {
      setBtnShrunk(false);
      timer = window.setTimeout(() => {
        setBtnShrunk(true);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [scrolled, menuAberto, isDragging]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    dragInfo.current = {
      startX: e.clientX, startY: e.clientY,
      initY: btnPosY, moved: false
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    const dy = e.clientY - dragInfo.current.startY;
    const dx = e.clientX - dragInfo.current.startX;

    if (Math.abs(dy) > 5 || Math.abs(dx) > 5) {
      dragInfo.current.moved = true;
      setBtnShrunk(true);
    }

    if (dragInfo.current.moved) {
      setBtnPosY(Math.max(10, Math.min(window.innerHeight - 60, dragInfo.current.initY + dy)));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onClick = (e: React.MouseEvent) => {
    if (dragInfo.current.moved) {
      e.preventDefault();
      return;
    }
    setMenuAberto(true);
  };

  const fecharMenu = () => {
    setMenuAberto(false);
    setBtnShrunk(true); 
  };

  const norm = (s: string) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const secoesFiltradas = useMemo(() => {
    const q = norm(busca);
    const result: SecaoOportunidade[] = [];

    SECOES.forEach(sec => {
      if (categoriaAtiva !== "todos" && sec.categoria !== categoriaAtiva) return;

      if (q) {
        const itensFiltrados = sec.itens.filter(item => {
          const texto = norm(`${item.titulo} ${item.descricao} ${item.tags.join(" ")}`);
          return texto.includes(q);
        });

        if (norm(`${sec.titulo} ${sec.subtitulo}`).includes(q) || itensFiltrados.length > 0) {
          result.push({ ...sec, itens: itensFiltrados.length > 0 ? itensFiltrados : sec.itens });
        }
      } else {
        result.push(sec);
      }
    });

    return result;
  }, [SECOES, busca, categoriaAtiva]);

  const clicaLinkMenu = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    fecharMenu();
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="page-oportunidades">
      
      {/* ================= MENU LATERAL ================= */}
      <div className={`oport-overlay ${menuAberto ? 'open' : ''}`} onClick={fecharMenu}></div>
      
      <aside className={`oport-sidebar ${menuAberto ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Tópicos do Catálogo</h3>
          <button onClick={fecharMenu}>✕</button>
        </div>
        <nav className="sidebar-nav">
          {secoesFiltradas.length > 0 ? (
            secoesFiltradas.map(sec => (
              <a key={sec.id} href={`#${sec.id}`} onClick={(e) => clicaLinkMenu(e, sec.id)}>
                <span className="ico">{sec.icone}</span> {sec.titulo}
              </a>
            ))
          ) : (
            <p style={{ padding: '20px', color: '#5a6578', fontSize: '14px', textAlign: 'center' }}>
              Nenhum tópico encontrado com o filtro atual.
            </p>
          )}
        </nav>
      </aside>

      {/* ================= BOTÃO FLUTUANTE DINÂMICO E VERTICAL ================= */}
      <button 
        className={`btn-menu-lateral ${!scrolled ? 'is-hidden' : ''} ${btnShrunk ? 'is-shrunk' : ''} ${isDragging ? 'is-dragging' : ''}`} 
        style={{ top: `${btnPosY}px` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClick}
        aria-label="Abrir Menu de Tópicos"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        <span className="btn-text">Navegar</span>
      </button>

      <div className="page-hero">
        <div className="wrap">
          <h1>Oportunidades e Projetos</h1>
          <p>A universidade vai muito além da sala de aula. Descubra laboratórios, projetos de extensão, editais de monitoria e vagas de estágio para turbinar o seu currículo.</p>
          
          <div className={`search ${busca ? 'has' : ''}`} style={{ position: 'relative', maxWidth: '520px', marginBottom: '14px' }}>
            <input 
              type="search" 
              placeholder="Buscar: PIBIC, bolsa, web, laboratório..." 
              value={busca} 
              onChange={(e) => setBusca(e.target.value)} 
            />
            {busca && <button type="button" onClick={() => setBusca("")} aria-label="Limpar busca">×</button>}
          </div>

          <div className="pills" role="group" aria-label="Filtrar por categoria">
            <button type="button" aria-pressed={categoriaAtiva === "todos"} onClick={() => setCategoriaAtiva("todos")}>Todos</button>
            {CATEGORIAS.map(c => (
              <button key={c.id} type="button" aria-pressed={categoriaAtiva === c.id} onClick={() => setCategoriaAtiva(c.id)}>
                {c.nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="oport-main">
        {secoesFiltradas.length === 0 ? (
           <div style={{ padding: '30px', textAlign: 'center', color: '#5a6578', background: '#fff', borderRadius: '10px', marginTop: '40px', border: '1px dashed #d9dfea' }}>
             Nenhuma oportunidade encontrada com esses filtros.
           </div>
        ) : (
          secoesFiltradas.map(sec => (
            <section id={sec.id} key={sec.id} className="oport-section">
              
              <div className="sec-header">
                <div className="ico">{sec.icone}</div>
                <div>
                  <h2>{sec.titulo}</h2>
                  <p>{sec.subtitulo}</p>
                </div>
              </div>
              
              <div className="wins">
                {sec.itens.map(item => (
                  <article className="win" key={item.id}>
                    <div className="win__media">
                      {item.img ? (
                        <img src={item.img} alt={item.titulo} />
                      ) : (
                        <div className="ph">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                            <line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>
                          </svg>
                          GIC UFAL
                        </div>
                      )}
                    </div>
                    <div className="win__body">
                      <h3>{item.titulo}</h3>
                      <p>{item.descricao}</p>
                      
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        {item.tags.map((t, i) => (
                          <span key={i} style={{ fontSize: '11.5px', fontWeight: 600, border: '1px solid #d9dfea', borderRadius: '12px', padding: '2px 10px', color: '#5a6578', background: '#fafbfd', textTransform: 'uppercase' }}>
                            {t}
                          </span>
                        ))}
                      </div>

                      <a
                        href={item.link}
                        className="btn-more"
                        target={item.link && item.link !== "#" ? "_blank" : undefined}
                        rel="noreferrer"
                        onClick={e => { if (!item.link || item.link === "#") e.preventDefault(); }}
                      >
                        Saiba mais
                      </a>
                    </div>
                  </article>
                ))}
              </div>
              
            </section>
          ))
        )}
      </main>
    </div>
  );
}