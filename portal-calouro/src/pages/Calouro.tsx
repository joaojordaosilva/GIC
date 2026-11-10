// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';

// --- DADOS DA PÁGINA ---
const TOPICOS = [
  { id: "sistemas", nome: "Sistemas e burocracia" },
  { id: "emailic", nome: "E-mail do IC" },
  { id: "regras", nome: "Regras da UFAL" },
  { id: "campus", nome: "Campus" },
  { id: "assistencia", nome: "Assistência" },
  { id: "vamu", nome: "Carteira VAMU" },
  { id: "prog", nome: "Primeiro período" }
];

const CARDS = [
  /* Sistemas e burocracia */
  { id: "matricula", topic: "sistemas", t: "Matrícula Institucional x Acadêmica",
    p: "A **Institucional** é a entrega de documentos (hoje geralmente online) logo depois que você passa no SiSU. A **Acadêmica** é o seu vínculo com as disciplinas, feito no SIGAA a cada novo semestre.",
    li: ["No **1º período** as matérias já vêm definidas: você não precisa se matricular nas disciplinas agora.", "A partir do **2º semestre**, é você quem monta a própria grade."] },
  { id: "sigaa", topic: "sistemas", t: "SIGAA: notas, faltas, horários e atestado",
    p: "O **SIGAA** é o sistema principal. É por ele que você acompanha suas turmas, notas e faltas, e emite os documentos mais pedidos no campus.",
    li: ["**Atestado de Matrícula**: necessário para quase tudo na universidade.", "**Histórico Escolar Analítico**."] },
  { id: "nti", topic: "sistemas", t: "E-mail institucional e Wi-Fi da UFAL",
    p: "Gerenciados pelo **NTI** (Núcleo de Tecnologia da Informação). Você precisa criar suas credenciais de rede para ter o e-mail institucional e conectar seus dispositivos à rede sem fio **Eduroam**.", busca: "wifi eduroam internet" },
  { id: "trancamento", topic: "sistemas", t: "Trancamento de curso ou disciplina",
    p: "O pedido é feito à **coordenação do curso**, por formulário, dentro do prazo do Calendário Acadêmico. O curso pode ficar trancado por no máximo **4 semestres (2 anos)**." },
  /* E-mail do IC */
  { id: "emailic", topic: "emailic", t: "E-mail @ic.ufal.br: para que serve e como criar",
    p: "O IC tem infraestrutura de TI própria, independente da reitoria. O e-mail @ic.ufal.br não é só uma caixa de entrada: é a credencial para **logar nos computadores dos laboratórios** (distribuições Linux) e acessar redes e servidores internos e o Wi-Fi do IC.",
    li: ["**Como criar**: a solicitação costuma ser feita no início do semestre ao Setor de TI do IC.", "Leve o **Atestado de Matrícula do SIGAA** para comprovar o vínculo e receber as credenciais."], busca: "laboratório lab linux ti" },
  { id: "vantagens", topic: "emailic", t: "Vantagens de um e-mail .edu.br / .ufal.br",
    p: "Para quem faz Computação, esta é a informação mais valiosa: o e-mail institucional libera dezenas de ferramentas profissionais gratuitas.",
    li: ["**GitHub Student Developer Pack**: GitHub Copilot, domínios gratuitos por um ano, servidores e dezenas de serviços para desenvolvimento.",
         "**JetBrains**: licenças originais e gratuitas das melhores IDEs (IntelliJ IDEA para Java, PyCharm, WebStorm).",
         "**Microsoft Azure e AWS Educate**: créditos de nuvem, fundamentais em Redes e Sistemas Distribuídos.",
         "**Design**: Notion Premium, Figma for Education e Canva Pro.",
         "**Drive educacional**: costuma vir do Google Workspace, com bem mais espaço que uma conta pessoal gratuita."], busca: "github copilot jetbrains azure aws notion figma canva grátis" },
  /* Regras da UFAL */
  { id: "notas", topic: "regras", t: "Notas: AB1, AB2 e Reavaliação",
    p: "O semestre tem duas notas, a **AB1** e a **AB2**. O professor decide como compô-las (provas, listas do Huxley, trabalhos...), mas a conta final é sempre a mesma:",
    stats: [{ n: "≥ 7,0", d: "média de AB1 e AB2: aprovado direto" }, { n: "< 5,0", d: "reprovado por nota, sem recuperação" }, { n: "5,0 a 6,9", d: "vai para a Reavaliação" }, { n: "≥ 5,5", d: "nova média exigida após a Reavaliação" }],
    p2: "A Reavaliação é uma prova de todo o conteúdo do semestre e a nota dela **substitui a sua menor AB**. Acesse a aba **Calculadora** no menu para simular suas notas.", busca: "média reavaliação final prova" },
  { id: "faltas", topic: "regras", t: "Limite de faltas: a regra dos 25%",
    p: "Você precisa de **75% de presença** nas aulas. Como a conta na UFAL leva em consideração as aulas, certifique-se da sua assiduidade.",
    li: ["**Reprovação por Falta (RF)**: estourou o limite de 25%, está reprovado, mesmo com 10 em todas as provas.", "Quem reprova por falta **perde o direito à Reavaliação**."], busca: "presença rf reprovação" },
  { id: "monitoria", topic: "regras", t: "Monitoria: seu maior salva-vidas",
    p: "Monitores são veteranos que cursaram a disciplina com excelência e ajudam o professor. Têm horários no IC para tirar dúvidas, ajudar com as listas do Huxley e revisar antes das provas. As matérias iniciais (Matemática Discreta, P1, Cálculo) são densas: não tenha vergonha de procurá-los!",
    li: ["**Como virar monitor**: a partir do 2º período, com nota alta em uma matéria, você pode concorrer nos editais. Pode ser remunerada (bolsa) ou voluntária."] },
  { id: "horas", topic: "regras", t: "Horas complementares e extensão",
    p: "Para pegar o diploma não basta passar nas disciplinas da grade: é preciso viver a universidade.",
    li: ["**Atividades Complementares (Horas Flexíveis)**: eventos de tecnologia, maratonas de programação, semanas acadêmicas, artigos, cursos de idiomas, estágio. Guarde todos os certificados em uma pasta na nuvem desde o 1º período!",
         "**Projetos de Extensão**: com a curricularização da extensão, todos os cursos exigem projetos que levem conhecimento à sociedade, como ensinar programação em escolas públicas ou criar sistemas para ONGs."],
    tip: "Acompanhe os murais do IC e os grupos de WhatsApp das turmas. Sempre que surgir edital de **Extensão**, **Iniciação Científica (PIBIC)** ou **Monitoria**, tente participar. Além de adiantar horas obrigatórias, é nesses projetos que você faz networking com professores e colegas.", busca: "pibic iniciação científica extensão horas flexíveis certificados" },
  /* Campus */
  { id: "ru", topic: "campus", t: "Restaurante Universitário (RU)",
    p: "Almoço e jantar custam **R$ 3,00** para estudantes de graduação. Leve o **comprovante de matrícula atualizado** e um **documento com foto**. O cardápio do dia costuma sair no Instagram oficial da Ufal (@ufaloficial).", busca: "almoço jantar comida restaurante" },
  { id: "bc", topic: "campus", t: "Biblioteca Central (BC)",
    p: "O empréstimo é gratuito com o cadastro do SIGAA. Atrasos geram multa diária, paga obrigatoriamente via **GRU** (Guia de Recolhimento da União).",
    li: ["Atenção: **débitos pendentes na biblioteca impedem a colação de grau**."], busca: "livros empréstimo multa" },
  { id: "hu", topic: "campus", t: "Atendimento médico no HU",
    p: "Os estudantes podem agendar consultas no **Hospital Universitário (HU)** apresentando o comprovante de matrícula autenticado pelo DRCA e um documento oficial.", busca: "saúde médico hospital" },
  /* Assistência */
  { id: "proest", topic: "assistencia", t: "PROEST: isenção no RU, bolsas e residência",
    p: "Estudantes em situação de vulnerabilidade social podem pedir **isenção no RU** e concorrer a bolsas pelos editais da **PROEST** (Pró-Reitoria Estudantil). A PROEST também gerencia a **Residência Universitária** e bolsas de apoio.", busca: "auxílio bolsa residência moradia" },
  /* Carteira VAMU */
  { id: "vamu", topic: "vamu", t: "VAMU: como solicitar pela primeira vez",
    p: "Em Maceió, o Passe Livre Estudantil garante viagens gratuitas nos ônibus urbanos (com limite mensal de embarques) para ir e voltar da universidade. Reúna os documentos (marque o que já tem):",
    check: ["RG e CPF", "Comprovante de residência (validade de até 3 meses)", "Foto 3x4 atual", "Atestado de Matrícula atualizado"],
    p2: "O cadastro e o agendamento são feitos no **site oficial do VAMU Maceió**; a retirada é nos postos físicos (como no Centro ou em terminais de integração).", busca: "ônibus passe livre transporte carteirinha" },
  { id: "vamu2", topic: "vamu", t: "VAMU: Atestado do SIGAA e recadastramento",
    p: "O VAMU é rigoroso com a documentação.",
    li: ["O Atestado de Matrícula do SIGAA deve ter **assinatura digital ou código de verificação** (emitido automaticamente).",
         "A cada início de ano letivo, envie o comprovante do novo semestre no site e pague a taxa de recadastramento (geralmente PIX ou boleto). **Sem revalidar, o cartão é bloqueado.**"], busca: "ônibus passe livre transporte carteirinha" },
  { id: "meia", topic: "vamu", t: "Meia-entrada cultural: o VAMU não vale",
    p: "A carteira VAMU **não vale como documento nacional do estudante** para meia-entrada em cinemas e shows. Para eventos culturais, emita a carteira da **UNE** ou use o aplicativo **ID Jovem** (se for elegível).", busca: "cinema show une dne" },
  /* Primeiro período */
  { id: "c", topic: "prog", t: "P1 e a linguagem C",
    p: "Em P1 você mergulha nos fundamentos da lógica de programação com **C**. Se nunca escreveu uma linha de código, não se assuste: as aulas começam do zero. Você vai lidar com variáveis, laços de repetição e os famosos **ponteiros**. Dominar C agora facilita aprender qualquer outra linguagem depois.", busca: "programação 1 p1" },
  { id: "huxley", topic: "prog", t: "Pratique no The Huxley",
    p: "O Huxley é um **juiz online** muito usado pelos professores do IC para passar listas de exercícios. Há centenas de problemas por nível de dificuldade: você escreve o código em C, envia na plataforma e ela testa automaticamente se a lógica está correta. Ótimo para treinar para as provas e pegar a sintaxe.",
    tip: "Não espere a primeira lista da faculdade sair. Crie sua conta no Huxley, procure os problemas de **nível 1** e comece a brincar com C. A prática constante é o único segredo para passar direto em P1!", busca: "the huxley juiz online exercícios" },
  { id: "terminal", topic: "prog", t: "VS Code e terminal: compilar C",
    p: "A ferramenta oficial dos professores é o **Visual Studio Code**, um editor leve e o mais usado no mercado. Nas aulas do IC, o código em C costuma ser compilado e executado direto no **Terminal do Windows**. Antes, instale o compilador **GCC (via MinGW)**; em geral os professores ensinam na primeira semana.",
    li: ["**1.** Escreva e salve o código com a extensão `.c` (ex.: `meu_programa.c`).", "**2.** Abra o terminal no VS Code: Terminal > Novo Terminal (ou `Ctrl + '`).", "**3.** Compile: `gcc meu_programa.c -o meu_programa` (`-o` define o nome do executável).", "**4.** Execute: `.\\meu_programa.exe`."],
    tip: "A **seta para cima** repete comandos anteriores. Alterou o código? Salve (**Ctrl + S**), compile de novo e só então execute. Se esquecer de compilar, você roda a versão velha!", busca: "vscode gcc mingw compilar executar terminal", sim: true }
];

const QUEM = [
  { id: "q1", q: "Quero trancar uma disciplina ou o curso", a: "Coordenação do curso", d: "O pedido é feito por formulário, dentro do prazo do Calendário Acadêmico.", card: "trancamento" },
  { id: "q2", q: "Quero ajustar minha grade", a: "Coordenação do curso", d: "Ajustes de grade passam pela coordenação. A partir do 2º semestre a matrícula nas disciplinas é feita por você no SIGAA.", card: "matricula" },
  { id: "q3", q: "Preciso do meu diploma ou de registro acadêmico", a: "DRCA", d: "O DRCA cuida de registro acadêmico e diploma.", card: "sigaa" },
  { id: "q4", q: "Preciso do Atestado de Matrícula", a: "SIGAA (você mesmo emite)", d: "Emita pelo SIGAA. O atestado precisa ter assinatura digital ou código de verificação.", card: "sigaa" },
  { id: "q5", q: "Não consigo acessar o Wi-Fi ou o e-mail da UFAL", a: "NTI", d: "O NTI gerencia suas credenciais de rede, o e-mail institucional e o Eduroam.", card: "nti" },
  { id: "q6", q: "Quero logar nos computadores do laboratório", a: "Setor de TI do IC", d: "Peça o e-mail @ic.ufal.br no início do semestre, levando o Atestado de Matrícula.", card: "emailic" },
  { id: "q7", q: "Preciso de comprovante autenticado para o HU", a: "DRCA", d: "O HU pede o comprovante de matrícula autenticado pelo DRCA e um documento oficial.", card: "hu" },
  { id: "q8", q: "Preciso de isenção no RU ou de uma bolsa", a: "PROEST", d: "Acompanhe os editais da Pró-Reitoria Estudantil. Ela também cuida da Residência Universitária.", card: "proest" }
];

const SIM = [
  { t: "Escreva e salve", d: "No VS Code, crie um arquivo, escreva o código em C e salve com a extensão .c, em uma pasta fácil de achar.", cmd: null },
  { t: "Abra o terminal", d: "No VS Code: Terminal > Novo Terminal (ou Ctrl + '). Uma aba preta abre embaixo, já apontando para a pasta do arquivo.", cmd: null },
  { t: "Compile", d: "O gcc traduz o seu código para algo que o computador executa. Se não aparecer erro, deu certo.", cmd: "gcc meu_programa.c -o meu_programa", out: "" },
  { t: "Execute", d: "Agora rode o programa gerado. O resultado aparece ali mesmo no terminal.", cmd: ".\\meu_programa.exe", out: "Olá, calouro!" }
];
const CODIGO = '#include <stdio.h>\n\nint main() {\n    printf("Olá, calouro!\\n");\n    return 0;\n}';
const PROMPT = "PS C:\\Users\\voce\\codigos> ";

// --- FUNÇÕES UTILITÁRIAS ---
const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const formatText = (text) => {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part, i) => {
    if (part.startsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>;
    if (part.startsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    return part;
  });
};

export default function Calouro({ setPaginaAtiva }) {
  const [topico, setTopico] = useState('todos');
  const [busca, setBusca] = useState('');
  const [tabAtiva, setTabAtiva] = useState('faltas');

  // Estado: Calculadora de Faltas (72h é o padrão mais comum em CC)
  const [ch, setCh] = useState(72);
  const [faltas, setFaltas] = useState(0);

  // Estado: Quem Resolve
  const [quemSel, setQuemSel] = useState(null);

  // Estado: Terminal
  const [termStep, setTermStep] = useState(0);
  const [termTyped, setTermTyped] = useState(0);

  // Estado: Acordeão & Checkboxes
  const [abertos, setAbertos] = useState(new Set());
  const [checks, setChecks] = useState(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem("gic-calouro-docs");
      if (saved) setChecks(new Set(JSON.parse(saved)));
    } catch (e) { console.error(e); }
  }, []);

  const toggleCheck = (key) => {
    const newChecks = new Set(checks);
    if (newChecks.has(key)) newChecks.delete(key);
    else newChecks.add(key);
    setChecks(newChecks);
    localStorage.setItem("gic-calouro-docs", JSON.stringify(Array.from(newChecks)));
  };

  const toggleAccordion = (id) => {
    const newAbertos = new Set(abertos);
    if (newAbertos.has(id)) newAbertos.delete(id);
    else newAbertos.add(id);
    setAbertos(newAbertos);
  };

  const abreCard = (id) => {
    setTopico('todos');
    setBusca('');
    setAbertos(prev => new Set(prev).add(id));
    setTimeout(() => {
      const el = document.getElementById("g-" + id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('flash-anim');
        setTimeout(() => el.classList.remove('flash-anim'), 1500);
      }
    }, 100);
  };

  const mudaFerramenta = (id) => {
    setTabAtiva(id);
    document.getElementById("ferramentas")?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // --- Lógica de Faltas (Regra UFAL) ---
  const totalAulas = ch;
  const maxFaltas = Math.floor(totalAulas * 0.25); // Ex: 72h -> 18 faltas permitidas no total
  const faltasMaxSlider = maxFaltas + 8;
  const pctFaltas = Math.min(100, (faltas / maxFaltas) * 100);
  
  // Variáveis dinâmicas para a explicação textual 
  const diasSeguros = Math.floor(maxFaltas / 2);
  const faltasSeguras = diasSeguros * 2;
  const diasReprova = diasSeguros + 1;
  const faltasReprova = diasReprova * 2;

  let faltasCls = "ok", faltasBg = "Tranquilo", faltasTxt = `Você ainda pode faltar ${maxFaltas - faltas} aulas.`;
  let barCor = "#2e7d32";
  
  if (faltas > maxFaltas) {
    faltasCls = "bad"; faltasBg = "Reprovação por Falta (RF)"; 
    faltasTxt = "Você passou do limite de faltas permitidas (25%). Estourando o limite, você é reprovado por falta mesmo com nota alta nas avaliações."; 
    barCor = "#c62828";
  } else if (faltas >= maxFaltas - 2) {
    faltasCls = "warn"; faltasBg = "Atenção: no limite"; 
    faltasTxt = `Você ainda pode faltar ${maxFaltas - faltas} aula(s). Guarde o resto para imprevistos.`; 
    barCor = "#e0a82e";
  }

  // --- Lógica Terminal Animação ---
  useEffect(() => {
    let timer;
    if (termStep > 1) {
      const cmdLength = SIM[termStep].cmd?.length || 0;
      setTermTyped(0);
      timer = setInterval(() => {
        setTermTyped(prev => {
          if (prev >= cmdLength) { clearInterval(timer); return prev; }
          return prev + 1;
        });
      }, 35);
    }
    return () => clearInterval(timer);
  }, [termStep]);

  // --- Filtro ---
  const cardsFiltrados = useMemo(() => {
    return CARDS.filter(c => {
      if (topico !== 'todos' && c.topic !== topico) return false;
      if (!busca) return true;
      const txt = norm([c.t, c.p || "", c.p2 || "", (c.li || []).join(" "), (c.check || []).join(" "), c.tip || "", c.busca || ""].join(" "));
      return busca.split(/\s+/).every(w => txt.includes(w));
    });
  }, [topico, busca]);

  return (
    <div className="page-calouro">
      <style>{`
        /* --- ESTILOS DO BOTÃO VOLTAR E OUTRAS REGRAS QUE FALTAVAM --- */
        .btn-voltar { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.4); padding: 8px 16px; border-radius: 999px; cursor: pointer; font: 700 14px 'Montserrat', sans-serif; display: inline-flex; align-items: center; gap: 8px; transition: 0.2s; }
        .btn-voltar:hover { background: rgba(255,255,255,0.15); border-color: #fff; }
        
        .page-calouro .search { position: relative; max-width: 520px; margin-bottom: 20px; margin-top: 10px; }
        .page-calouro .search input { width: 100%; min-height: 50px; padding: 0 44px 0 18px; border-radius: 999px; border: 2px solid transparent; font: 500 15px 'Montserrat', sans-serif; color: var(--ink); background: #fff; box-sizing: border-box; outline: none; transition: border-color 0.2s; }
        .page-calouro .search input:focus { border-color: var(--amber); }
        .page-calouro .search button { position: absolute; right: 6px; top: 6px; width: 38px; height: 38px; border: 0; border-radius: 50%; background: #eaf2fc; color: var(--blue); font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        
        .page-calouro .pills { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; }
        .page-calouro .pills button { font: 700 14px 'Montserrat', sans-serif; min-height: 44px; padding: 0 18px; border-radius: 999px; cursor: pointer; background: transparent; color: #fff; border: 2px solid rgba(255,255,255,0.8); transition: background 0.15s, color 0.15s, border-color 0.15s; margin: 0; }
        .page-calouro .pills button:hover { background: rgba(255,255,255,0.15); }
        .page-calouro .pills button[aria-pressed="true"] { background: #fff; color: var(--blue); border-color: #fff; }

        .page-calouro .sim { display: grid; grid-template-columns: 220px 1fr; gap: 16px; }
        .page-calouro .steps { display: grid; gap: 8px; align-content: start; }
        .page-calouro .steps button { text-align: left; font: 600 13.5px/1.3 'Montserrat', Arial, sans-serif; padding: 10px 12px; border-radius: 8px; background: #fff; color: var(--ink); border: 1px solid var(--ln); border-left: 4px solid var(--blue); cursor: pointer; display: flex; gap: 8px; align-items: center; }
        .page-calouro .steps button i { font-style: normal; flex: none; width: 22px; height: 22px; border-radius: 50%; background: var(--blue); color: #fff; font-size: 12px; display: flex; align-items: center; justify-content: center; }
        .page-calouro .steps button[aria-pressed="true"] { background: #eef4fb; outline: 3px solid var(--amber); outline-offset: 1px; }
        .page-calouro .steps button.past i { background: #2e7d32; }
        .page-calouro .scr { min-width: 0; display: grid; gap: 10px; align-content: start; }
        .page-calouro .win { border-radius: 10px; overflow: hidden; background: #0f1f38; color: #cfe3ff; font-family: Consolas, monospace; font-size: 13.5px; line-height: 1.6; }
        .page-calouro .win .bar2 { background: #1b2f52; padding: 6px 12px; font: 600 12px 'Montserrat', sans-serif; color: #9cc8f5; display: flex; gap: 6px; align-items: center; }
        .page-calouro .win .bar2 s { width: 10px; height: 10px; border-radius: 50%; background: #5b7aa8; display: inline-block; }
        .page-calouro .win pre { margin: 0; padding: 12px 14px; white-space: pre-wrap; word-break: break-word; min-height: 56px; }
        .page-calouro .win .pr { color: #ffc107; }
        .page-calouro .caret::after { content: "▌"; animation: bl 1s steps(1) infinite; }
        @keyframes bl { 50% { opacity: 0; } }

        .page-calouro .tools { background: #fff; border: 1px solid var(--ln); border-radius: 12px; overflow: hidden; }
        .page-calouro .tabs { display: flex; gap: 8px; padding: 12px; overflow-x: auto; background: #fafbfd; border-bottom: 1px solid var(--ln); scrollbar-width: none; }
        .page-calouro .tabs::-webkit-scrollbar { display: none; }
        .page-calouro .tabs button { flex: none; font: 700 14px 'Montserrat', sans-serif; min-height: 42px; padding: 0 18px; border-radius: 999px; cursor: pointer; background: #fff; color: var(--blue); border: 2px solid var(--ln); transition: 0.2s; margin: 0; }
        .page-calouro .tabs button:hover { border-color: var(--blue); }
        .page-calouro .tabs button[aria-pressed="true"] { background: var(--blue); color: #fff; border-color: var(--blue); }
        
        .page-calouro .my-calouro-panel { padding: 22px; }
        
        .page-calouro .fields { display: flex; flex-wrap: wrap; gap: 14px; align-items: end; margin-bottom: 14px; }
        .page-calouro .fields div { display: flex; flex-direction: column; gap: 4px; }
        .page-calouro label { font-size: 13px; font-weight: 600; color: var(--mu); }
        .page-calouro select, .page-calouro input[type="number"] { font: 500 16px 'Montserrat', sans-serif; padding: 10px 12px; min-height: 46px; border: 1px solid var(--ln); border-radius: 8px; background: #fff; color: var(--ink); width: 130px; box-sizing: border-box; }
        .page-calouro select { width: auto; min-width: 160px; }
        .page-calouro input[type="range"] { width: min(360px, 100%); accent-color: var(--blue); height: 32px; margin-top: 8px; }
        
        .page-calouro .meter { position: relative; height: 16px; border-radius: 999px; margin: 26px 0 30px; background: linear-gradient(90deg, #f3b3b3 0 50%, #ffe2a1 50% 70%, #b7e0bb 70% 100%); }
        .page-calouro .meter .pt { position: absolute; top: -6px; width: 6px; height: 28px; border-radius: 3px; background: var(--ink); transform: translateX(-3px); transition: left .3s ease-out; }
        .page-calouro .meter span { position: absolute; top: 22px; font-size: 11.5px; color: var(--mu); transform: translateX(-50%); font-weight: 600; }
        
        .page-calouro .res { padding: 14px 16px; border-radius: 10px; font-size: 14.5px; line-height: 1.6; border: 1px solid var(--ln); background: #fafbfd; transition: all 0.3s ease; }
        .page-calouro .res b.big { display: block; font-size: 18px; margin-bottom: 4px; }
        .page-calouro .res.ok { background: #e3f3e7; border-color: #b7e0bb; } .page-calouro .res.ok b.big { color: #2e7d32; }
        .page-calouro .res.warn { background: #fff3d6; border-color: #f0d58a; } .page-calouro .res.warn b.big { color: #8a5a00; }
        .page-calouro .res.bad { background: #fdeaea; border-color: #f2b8b8; } .page-calouro .res.bad b.big { color: #c62828; }
        .page-calouro .bar { height: 14px; border-radius: 999px; background: #e3eaf5; overflow: hidden; margin: 12px 0; }
        .page-calouro .bar i { display: block; height: 100%; width: 0; border-radius: 999px; transition: width .35s, background .35s; }
        
        .page-calouro .qs { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 10px; margin-bottom: 14px; }
        .page-calouro .qs button { text-align: left; font: 600 14px/1.35 'Montserrat', sans-serif; padding: 12px 14px; border-radius: 10px; background: #fff; color: var(--ink); border: 1px solid var(--ln); border-left: 4px solid var(--blue); cursor: pointer; }
        .page-calouro .qs button:hover { border-color: var(--blue); }
        .page-calouro .qs button[aria-pressed="true"] { background: #eef4fb; outline: 3px solid var(--amber); outline-offset: 1px; }

        .page-calouro details.it { background: #fff; border: 1px solid var(--ln); border-left: 4px solid var(--blue); border-radius: 10px; margin-bottom: 10px; transition: box-shadow 0.3s; }
        .page-calouro details.it[open] { border-color: var(--blue); }
        .page-calouro details.it.flash-anim { animation: fl 1.4s; }
        @keyframes fl { 0%,60% { box-shadow: 0 0 0 4px var(--amber); } 100% { box-shadow: none; } }
        .page-calouro details.it > summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 12px; padding: 14px 16px; font-weight: 700; font-size: 15px; color: var(--blue-dark); }
        .page-calouro details.it > summary::-webkit-details-marker { display: none; }
        .page-calouro details.it > summary::after { content: ""; margin-left: auto; width: 9px; height: 9px; border-right: 2px solid var(--mu); border-bottom: 2px solid var(--mu); transform: rotate(45deg); transition: transform .2s; flex: none; }
        .page-calouro details.it[open] > summary::after { transform: rotate(225deg); }
        .page-calouro .tag { display: inline-block; font-size: 11.5px; font-weight: 600; border: 1px solid var(--ln); border-radius: 12px; padding: 2px 10px; white-space: nowrap; color: var(--mu); background: #fafbfd; }
        
        .page-calouro .body { padding: 0 18px 18px; }
        .page-calouro .body p { margin: 0 0 12px; font-size: 15px; line-height: 1.65; color: var(--mu); }
        .page-calouro .body ul { margin: 0 0 14px; padding-left: 20px; color: var(--mu); font-size: 15px; line-height: 1.6; }
        .page-calouro .body li { margin-bottom: 6px; }
        .page-calouro .chk { list-style: none; padding: 0; display: grid; gap: 8px; }
        .page-calouro .chk label { display: flex; gap: 10px; align-items: center; font-size: 15px; font-weight: 500; color: var(--ink); cursor: pointer; padding: 8px 12px; border: 1px solid var(--ln); border-radius: 8px; background: #fafbfd; }
        .page-calouro .chk input { width: 20px; height: 20px; accent-color: #2e7d32; flex: none; cursor: pointer; }
        .page-calouro .chk input:checked + span { text-decoration: line-through; color: var(--mu); }
        .page-calouro .row { display: flex; flex-wrap: wrap; gap: 10px; }
        .page-calouro .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 20px; border-radius: 999px; font: 700 14px 'Montserrat', sans-serif; cursor: pointer; text-decoration: none; border: 2px solid var(--blue); background: var(--blue); color: #fff; transition: 0.15s; }
        .page-calouro .btn:hover { background: var(--blue-dark); border-color: var(--blue-dark); transform: translateY(-1px); }
        .page-calouro .btn.ghost { background: #fff; color: var(--blue); }
        .page-calouro .btn.ghost:hover { background: #eaf2fc; }

        @media (max-width: 760px) {
          .page-calouro .sim { grid-template-columns: 1fr; }
          .page-calouro .steps { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>

      <div className="page-hero">
        <div className="wrap">
          <div className="hero-top-actions" style={{marginBottom: '20px'}}>
            <button className="btn-voltar" onClick={() => setPaginaAtiva('inicio')}>
              ← Voltar ao Início
            </button>
          </div>
          
          <h1>Bem-vindo, calouro!</h1>
          <p>Teste as regras de falta, descubra a quem recorrer e consulte o guia completo. Tudo o que você precisa saber para o seu primeiro período no IC.</p>
          
          <div className="search">
            <input type="search" placeholder="Buscar: SIGAA, VAMU, faltas, Huxley..." value={busca} onChange={e => setBusca(e.target.value)} />
            {busca && <button type="button" onClick={() => setBusca('')}>×</button>}
          </div>
          
          <div className="pills">
            <button aria-pressed={topico === 'todos'} onClick={() => setTopico('todos')}>Todos</button>
            {TOPICOS.map(t => (
              <button key={t.id} aria-pressed={topico === t.id} onClick={() => setTopico(t.id)}>{t.nome}</button>
            ))}
          </div>
        </div>
      </div>

      <main className="calouro-main">
        {/* FERRAMENTAS BÁSICAS */}
        <section id="ferramentas" className="sec" style={{paddingTop: '20px'}}>
          <div className="sec__head">
            <h2>Ferramentas rápidas</h2>
          </div>
          <p className="sec__intro" style={{marginBottom: '20px'}}>Simule sua situação antes que ela aconteça.</p>
          
          <div className="tools">
            <div className="tabs">
              <button aria-pressed={tabAtiva === 'faltas'} onClick={() => mudaFerramenta('faltas')}>Calculadora de faltas</button>
              <button aria-pressed={tabAtiva === 'quem'} onClick={() => mudaFerramenta('quem')}>Quem resolve o quê?</button>
            </div>

            {/* TAB: FALTAS */}
            {tabAtiva === 'faltas' && (
              <div className="my-calouro-panel">
                <h3 style={{fontSize: '18px', color: '#004085', margin: '0 0 4px'}}>Calculadora de faltas (Aulas)</h3>
                <div style={{background: '#fff3d6', borderLeft: '4px solid #e0a82e', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px'}}>
                  <p style={{margin: 0, fontSize: '14px', color: '#5b4a12'}}>
                    <b>Atenção à "Pegadinha dos Pares":</b> Na UFAL, é exigida 75% de presença. O limite exato de faltas permitidas em uma matéria de {ch}h é {maxFaltas}. Mas como você normalmente assiste a <b>duas aulas seguidas no mesmo dia</b>, as suas faltas vêm em pares. Faltar {diasSeguros} dias = {faltasSeguras} faltas (seguro). Faltar {diasReprova} dias = {faltasReprova} faltas (<b>Reprovação direta</b>). 
                  </p>
                </div>
                <p style={{color: '#5a6578', marginBottom: '16px', fontSize: '14px'}}>
                  Lembre-se: em turmas intensivas de férias, você pode ter mais de duas aulas num mesmo dia. Cada aula contabilizada pelo professor possui 50 minutos.
                </p>
                
                <div className="fields">
                  <div>
                    <label>Carga horária da disciplina (no SIGAA)</label>
                    <select value={ch} onChange={e => { setCh(Number(e.target.value)); setFaltas(0); }}>
                      <option value="30">30 horas/aulas</option>
                      <option value="36">36 horas/aulas</option>
                      <option value="72">72 horas/aulas</option>
                      <option value="144">144 horas/aulas</option>
                      <option value="288">288 horas/aulas</option>
                    </select>
                  </div>
                </div>
                <label>Quantidade de faltas registradas: <b>{faltas}</b></label><br/>
                <input type="range" min="0" max={faltasMaxSlider} step="1" value={faltas} onChange={e => setFaltas(Number(e.target.value))} />
                <div className="bar"><i style={{width: `${pctFaltas}%`, backgroundColor: barCor}}></i></div>
                <div className={`res ${faltasCls}`}>
                  <b className="big">{faltasBg}</b>
                  Em uma disciplina de {ch} aulas, o limite é de {maxFaltas} faltas. {faltasTxt}
                </div>
              </div>
            )}

            {/* TAB: QUEM */}
            {tabAtiva === 'quem' && (
              <div className="my-calouro-panel">
                <h3 style={{fontSize: '18px', color: '#004085', margin: '0 0 4px'}}>Quem resolve o quê?</h3>
                <p style={{color: '#5a6578', marginBottom: '16px'}}>Escolha a sua situação e veja a quem recorrer. Em geral: DRCA cuida de registro e diploma, NTI de sistemas e internet, e a Coordenação de ajustes de grade.</p>
                <div className="qs">
                  {QUEM.map(q => (
                    <button key={q.id} aria-pressed={quemSel?.id === q.id} onClick={() => setQuemSel(q)}>
                      {q.q}
                    </button>
                  ))}
                </div>
                {quemSel ? (
                  <div className="res ok">
                    <b className="big">Procure: {quemSel.a}</b>
                    {quemSel.d}
                    <button className="btn ghost" style={{display: 'flex', marginTop: '10px'}} onClick={() => abreCard(quemSel.card)}>
                      Ver no guia
                    </button>
                  </div>
                ) : (
                  <div className="res">Escolha uma situação acima.</div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* DICA EXTRA: TERMINAL (Separado) */}
        <section id="dica-terminal" className="sec" style={{paddingTop: '40px'}}>
          <div className="sec__head">
            <h2 style={{fontSize: '1.4rem', textTransform: 'uppercase', letterSpacing: '1px'}}>Dica Extra: Compilar C no terminal</h2>
          </div>
          <p className="sec__intro" style={{marginBottom: '20px'}}>Passo a passo do dia a dia nas aulas de P1. Antes, instale o compilador GCC (via MinGW). Clique nos passos, ou use Próximo.</p>
          
          <div className="my-calouro-panel" style={{ background: '#fff', border: '1px solid var(--ln)', borderRadius: '12px' }}>
            <div className="sim">
              <div className="steps">
                {SIM.map((s, i) => (
                  <button key={i} aria-pressed={termStep === i} className={i < termStep ? 'past' : ''} onClick={() => setTermStep(i)}>
                    <i>{i + 1}</i> <span>{s.t}</span>
                  </button>
                ))}
              </div>
              <div className="scr">
                <p style={{fontSize: '14.5px', color: '#1d2b44', margin: 0}}><b>Passo {termStep + 1}:</b> {SIM[termStep].d}</p>
                <div className="win">
                  <div className="bar2"><s></s><s></s><s></s> VS Code: meu_programa.c</div>
                  <pre>{CODIGO}</pre>
                </div>
                {termStep >= 1 && (
                  <div className="win">
                    <div className="bar2"><s></s><s></s><s></s> Terminal</div>
                    <pre className={termStep > 1 && termTyped < SIM[termStep].cmd.length ? 'caret' : ''}>
                      {SIM.slice(2, termStep + 1).map((l, i, arr) => {
                        const isLast = i === arr.length - 1;
                        const currentTyped = isLast ? l.cmd.slice(0, termTyped) : l.cmd;
                        return (
                          <div key={i}>
                            <span className="pr">{PROMPT}</span>{currentTyped}
                            {!isLast && l.out && <div>{l.out}</div>}
                            {isLast && termTyped >= l.cmd.length && l.out && <div>{l.out}</div>}
                          </div>
                        );
                      })}
                      {termStep > 1 && termTyped >= SIM[termStep].cmd.length && (
                        <div><span className="pr">{PROMPT}</span></div>
                      )}
                      {termStep === 1 && <span className="pr">{PROMPT}</span>}
                    </pre>
                  </div>
                )}
                <div className="row" style={{marginTop: '10px'}}>
                  <button className="btn ghost" disabled={termStep === 0} style={{opacity: termStep === 0 ? 0.5 : 1}} onClick={() => setTermStep(p => Math.max(0, p - 1))}>← Anterior</button>
                  <button className="btn" disabled={termStep === SIM.length - 1} style={{opacity: termStep === SIM.length - 1 ? 0.5 : 1}} onClick={() => setTermStep(p => Math.min(SIM.length - 1, p + 1))}>Próximo →</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* GUIA COMPLETO */}
        <section id="guia" className="sec">
          <div className="sec__head">
            <h2>Guia completo</h2>
          </div>
          <p className="sec__intro" style={{marginBottom: '20px'}}>Tudo o que você precisa saber, por assunto. Use a busca ou os filtros no topo da página.</p>
          <p style={{fontSize: '13px', color: '#5a6578', marginBottom: '10px'}}>
            {cardsFiltrados.length === CARDS.length ? `${CARDS.length} itens` : `Mostrando ${cardsFiltrados.length} de ${CARDS.length} itens`}
          </p>

          <div className="acc">
            {cardsFiltrados.length === 0 ? (
              <div style={{padding: '24px', textAlign: 'center', color: '#5a6578', background: '#fff', border: '1px dashed #d9dfea', borderRadius: '10px'}}>
                Nada encontrado. Tente outra palavra ou escolha “Todos” nos assuntos.
              </div>
            ) : (
              cardsFiltrados.map(c => (
                <details key={c.id} id={`g-${c.id}`} className="it" open={abertos.has(c.id)} onToggle={() => toggleAccordion(c.id)}>
                  <summary>
                    <span>{c.t}</span>
                    <span className="tag">{TOPICOS.find(t => t.id === c.topic)?.nome}</span>
                  </summary>
                  <div className="body">
                    {c.p && <p>{formatText(c.p)}</p>}
                    
                    {c.stats && (
                      <div className="stats">
                        {c.stats.map((s, i) => (
                          <div key={i}>
                            <b>{s.n}</b>
                            <span>{s.d}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {c.li && (
                      <ul>
                        {c.li.map((liText, i) => <li key={i}>{formatText(liText)}</li>)}
                      </ul>
                    )}

                    {c.check && (
                      <ul className="chk">
                        {c.check.map((item, i) => {
                          const key = `${c.id}:${i}`;
                          return (
                            <li key={i}>
                              <label>
                                <input type="checkbox" checked={checks.has(key)} onChange={() => toggleCheck(key)} />
                                <span>{item}</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    {c.p2 && <p>{formatText(c.p2)}</p>}

                    {c.tip && (
                      <div className="tip">
                        <span className="em">💡</span>
                        <div><b>Dica de Veterano:</b> {formatText(c.tip)}</div>
                      </div>
                    )}

                    <div className="row">
                      {c.sim && (
                        <button className="btn ghost" onClick={() => { document.getElementById("dica-terminal")?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTermStep(0); }}>
                          Ver o passo a passo animado
                        </button>
                      )}
                      {c.id === "faltas" && (
                        <button className="btn ghost" onClick={() => { mudaFerramenta("faltas"); document.getElementById("ferramentas")?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                          Abrir calculadora de faltas
                        </button>
                      )}
                      {c.link !== undefined && (
                        <a href={c.link || "#"} onClick={e => !c.link && e.preventDefault()} className="btn" title={!c.link ? "Link ainda não definido" : ""}>
                          Saiba mais
                        </a>
                      )}
                    </div>
                  </div>
                </details>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}