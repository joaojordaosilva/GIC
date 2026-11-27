import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface NoticiaBanco {
  id: string;
  titulo: string;
  descricao: string;
  img: string;
  link: string;
  ativo: boolean;
}

export interface CursoBanco {
  id: string;
  nome: string;
  un: 'h' | 'h/a';
  resumo: { label: string; valor: string }[];
  fluxo: string;
  enfases: { nome: string; disciplinas: string[] }[];
  fonte: string;
  notas: string[];
}

export interface DisciplinaBanco {
  id: string;
  curso: string;
  per: string;
  cod: string;
  nome: string;
  ch: number | '';
  tipo: 'O' | 'E' | 'X' | 'N' | 'S';
  preModo: 'lista' | 'nenhum' | 'naoconsta' | 'ate5' | 'var';
  pre: string[];
  co: string[];
  equiv: string;
}

export interface ConteudoBanco {
  home_hero?: Record<string, any>;
  home_noticias?: NoticiaBanco[];
  c_config?: Record<string, any>;
  c_topicos?: any[];
  c_cards?: any[];
  c_quem?: any[];
  op_categorias?: { id: string; nome: string }[];
  op_secoes?: any[];
  d_cursos?: CursoBanco[];
  d_disciplinas?: DisciplinaBanco[];
}

interface ConteudoContextData {
  conteudo: ConteudoBanco;
  carregando: boolean;
  recarregar: () => Promise<void>;
}

const ConteudoContext = createContext<ConteudoContextData>({
  conteudo: {},
  carregando: true,
  recarregar: async () => {},
});

export function ConteudoProvider({ children }: { children: ReactNode }) {
  const [conteudo, setConteudo] = useState<ConteudoBanco>({});
  const [carregando, setCarregando] = useState(true);

  const carregar = async () => {
    try {
      const res = await fetch('/api/conteudo', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setConteudo(json?.conteudo ?? json ?? {});
    } catch (erro) {
      console.error('Erro ao carregar conteúdo público:', erro);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
    const aoFocar = () => carregar();
    window.addEventListener('focus', aoFocar);
    return () => window.removeEventListener('focus', aoFocar);
  }, []);

  return (
    <ConteudoContext.Provider value={{ conteudo, carregando, recarregar: carregar }}>
      {children}
    </ConteudoContext.Provider>
  );
}

export function useConteudo() {
  return useContext(ConteudoContext);
}