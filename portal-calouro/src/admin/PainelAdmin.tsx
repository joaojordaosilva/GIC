// @ts-nocheck
import { useState, useMemo, useEffect, useRef, useId } from 'react';
import { apiAdmin } from './apiAdmin';

const STORAGE_KEY = 'gic-admin-conteudo-v2';

/* ---------------------------------------------------------------------
   UTILITÁRIOS
   --------------------------------------------------------------------- */
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || uid();
const clone = (o) => JSON.parse(JSON.stringify(o));

const TIPOS = { O: 'Obrigatória', E: 'Eletiva', X: 'Extensão', N: 'Ênfase', S: 'Estágio' };
const perLabel = (p) => (/^\d+$/.test(String(p)) ? `${p}º período` : p === 'N' ? 'Ênfase' : 'Catálogo');

const IA_CATEGORIAS = [
  { v: 'sistemas', l: 'Sistemas (SIGAA / NTI / IC)' },
  { v: 'regras', l: 'Regras Acadêmicas (Notas e Faltas)' },
  { v: 'matricula', l: 'Matrícula, Grade e Equivalências' },
  { v: 'campus', l: 'Campus, RU, VAMU e Assistência' },
  { v: 'p1', l: 'Programação 1 (C / Huxley / VS Code)' },
  { v: 'secretaria', l: 'Secretaria e Coordenação' },
  { v: 'geral', l: 'Geral' }
];
const iaCatLabel = (v) => IA_CATEGORIAS.find((c) => c.v === v)?.l || v;

/* ---------------------------------------------------------------------
   SEEDS: conteúdo inicial do site
   --------------------------------------------------------------------- */
const C_TOPICOS = [
  { id: 'sistemas', nome: 'Sistemas e burocracia' },
  { id: 'emailic', nome: 'E-mail do IC' },
  { id: 'regras', nome: 'Regras da UFAL' },
  { id: 'campus', nome: 'Campus' },
  { id: 'assistencia', nome: 'Assistência' },
  { id: 'vamu', nome: 'Carteira VAMU' },
  { id: 'prog', nome: 'Primeiro período' }
];

const C_CARDS = [
  { id: 'matricula', topic: 'sistemas', t: 'Matrícula Institucional x Acadêmica',
    p: 'A **Institucional** é a entrega de documentos (hoje geralmente online) logo depois que você passa no SiSU. A **Acadêmica** é o seu vínculo com as disciplinas, feito no SIGAA a cada novo semestre.',
    li: ['No **1º período** as matérias já vêm definidas: você não precisa se matricular nas disciplinas agora.', 'A partir do **2º semestre**, é você quem monta a própria grade.'] },
  { id: 'sigaa', topic: 'sistemas', t: 'SIGAA: notas, faltas, horários e atestado',
    p: 'O **SIGAA** é o sistema principal. É por ele que você acompanha suas turmas, notas e faltas, e emite os documentos mais pedidos no campus.',
    li: ['**Atestado de Matrícula**: necessário para quase tudo na universidade.', '**Histórico Escolar Analítico**.'] },
  { id: 'nti', topic: 'sistemas', t: 'E-mail institucional e Wi-Fi da UFAL',
    p: 'Gerenciados pelo **NTI** (Núcleo de Tecnologia da Informação). Você precisa criar suas credenciais de rede para ter o e-mail institucional e conectar seus dispositivos à rede sem fio **Eduroam**.', busca: 'wifi eduroam internet' },
  { id: 'trancamento', topic: 'sistemas', t: 'Trancamento de curso ou disciplina',
    p: 'O pedido é feito à **coordenação do curso**, por formulário, dentro do prazo do Calendário Acadêmico. O curso pode ficar trancado por no máximo **4 semestres (2 anos)**.' },
  { id: 'emailic', topic: 'emailic', t: 'E-mail @ic.ufal.br: para que serve e como criar',
    p: 'O IC tem infraestrutura de TI própria, independente da reitoria. O e-mail @ic.ufal.br não é só uma caixa de entrada: é a credencial para **logar nos computadores dos laboratórios** (distribuições Linux) e acessar redes e servidores internos e o Wi-Fi do IC.',
    li: ['**Como criar**: a solicitação costuma ser feita no início do semestre ao Setor de TI do IC.', 'Leve o **Atestado de Matrícula do SIGAA** para comprovar o vínculo e receber as credenciais.'], busca: 'laboratório lab linux ti' },
  { id: 'vantagens', topic: 'emailic', t: 'Vantagens de um e-mail .edu.br / .ufal.br',
    p: 'Para quem faz Computação, esta é a informação mais valiosa: o e-mail institucional libera dezenas de ferramentas profissionais gratuitas.',
    li: ['**GitHub Student Developer Pack**: GitHub Copilot, domínios gratuitos por um ano, servidores e dezenas de serviços para desenvolvimento.',
      '**JetBrains**: licenças originais e gratuitas das melhores IDEs (IntelliJ IDEA para Java, PyCharm, WebStorm).',
      '**Microsoft Azure e AWS Educate**: créditos de nuvem, fundamentais em Redes e Sistemas Distribuídos.',
      '**Design**: Notion Premium, Figma for Education e Canva Pro.',
      '**Drive educacional**: costuma vir do Google Workspace, com bem mais espaço que uma conta pessoal gratuita.'], busca: 'github copilot jetbrains azure aws notion figma canva grátis' },
  { id: 'notas', topic: 'regras', t: 'Notas: AB1, AB2 e Reavaliação',
    p: 'O semestre tem duas notas, a **AB1** e a **AB2**. O professor decide como compô-las (provas, listas do Huxley, trabalhos...), mas a conta final é sempre a mesma:',
    stats: [{ n: '≥ 7,0', d: 'média de AB1 e AB2: aprovado direto' }, { n: '< 5,0', d: 'reprovado por nota, sem recuperação' }, { n: '5,0 a 6,9', d: 'vai para a Reavaliação' }, { n: '≥ 5,5', d: 'nova média exigida após a Reavaliação' }],
    p2: 'A Reavaliação é uma prova de todo o conteúdo do semestre e a nota dela **substitui a sua menor AB**. Acesse a aba **Calculadora** no menu para simular suas notas.', busca: 'média reavaliação final prova' },
  { id: 'faltas', topic: 'regras', t: 'Limite de faltas: a regra dos 25%',
    p: 'Você precisa de **75% de presença** nas aulas. Como a conta na UFAL leva em consideração as aulas, certifique-se da sua assiduidade.',
    li: ['**Reprovação por Falta (RF)**: estourou o limite de 25%, está reprovado, mesmo com 10 em todas as provas.', 'Quem reprova por falta **perde o direito à Reavaliação**.'], busca: 'presença rf reprovação' },
  { id: 'monitoria', topic: 'regras', t: 'Monitoria: seu maior salva-vidas',
    p: 'Monitores são veteranos que cursaram a disciplina com excelência e ajudam o professor. Têm horários no IC para tirar dúvidas, ajudar com as listas do Huxley e revisar antes das provas. As matérias iniciais (Matemática Discreta, P1, Cálculo) são densas: não tenha vergonha de procurá-los!',
    li: ['**Como virar monitor**: a partir do 2º período, com nota alta em uma matéria, você pode concorrer nos editais. Pode ser remunerada (bolsa) ou voluntária.'] },
  { id: 'horas', topic: 'regras', t: 'Horas complementares e extensão',
    p: 'Para pegar o diploma não basta passar nas disciplinas da grade: é preciso viver a universidade.',
    li: ['**Atividades Complementares (Horas Flexíveis)**: eventos de tecnologia, maratonas de programação, semanas acadêmicas, artigos, cursos de idiomas, estágio. Guarde todos os certificados em uma pasta na nuvem desde o 1º período!',
      '**Projetos de Extensão**: com a curricularização da extensão, todos os cursos exigem projetos que levem conhecimento à sociedade, como ensinar programação em escolas públicas ou criar sistemas para ONGs.'],
    tip: 'Acompanhe os murais do IC e os grupos de WhatsApp das turmas. Sempre que surgir edital de **Extensão**, **Iniciação Científica (PIBIC)** ou **Monitoria**, tente participar. Além de adiantar horas obrigatórias, é nesses projetos que você faz networking com professores e colegas.', busca: 'pibic iniciação científica extensão horas flexíveis certificados' },
  { id: 'ru', topic: 'campus', t: 'Restaurante Universitário (RU)',
    p: 'Almoço e jantar custam **R$ 3,00** para estudantes de graduação. Leve o **comprovante de matrícula atualizado** e um **documento com foto**. O cardápio do dia costuma sair no Instagram oficial da Ufal (@ufaloficial).', busca: 'almoço jantar comida restaurante' },
  { id: 'bc', topic: 'campus', t: 'Biblioteca Central (BC)',
    p: 'O empréstimo é gratuito com o cadastro do SIGAA. Atrasos geram multa diária, paga obrigatoriamente via **GRU** (Guia de Recolhimento da União).',
    li: ['Atenção: **débitos pendentes na biblioteca impedem a colação de grau**.'], busca: 'livros empréstimo multa' },
  { id: 'hu', topic: 'campus', t: 'Atendimento médico no HU',
    p: 'Os estudantes podem agendar consultas no **Hospital Universitário (HU)** apresentando o comprovante de matrícula autenticado pelo DRCA e um documento oficial.', busca: 'saúde médico hospital' },
  { id: 'proest', topic: 'assistencia', t: 'PROEST: isenção no RU, bolsas e residência',
    p: 'Estudantes em situação de vulnerabilidade social podem pedir **isenção no RU** e concorrer a bolsas pelos editais da **PROEST** (Pró-Reitoria Estudantil). A PROEST também gerencia a **Residência Universitária** e bolsas de apoio.', busca: 'auxílio bolsa residência moradia' },
  { id: 'vamu', topic: 'vamu', t: 'VAMU: como solicitar pela primeira vez',
    p: 'Em Maceió, o Passe Livre Estudantil garante viagens gratuitas nos ônibus urbanos (com limite mensal de embarques) para ir e voltar da universidade. Reúna os documentos (marque o que já tem):',
    check: ['RG e CPF', 'Comprovante de residência (validade de até 3 meses)', 'Foto 3x4 atual', 'Atestado de Matrícula atualizado'],
    p2: 'O cadastro e o agendamento são feitos no **site oficial do VAMU Maceió**; a retirada é nos postos físicos (como no Centro ou em terminais de integração).', busca: 'ônibus passe livre transporte carteirinha' },
  { id: 'vamu2', topic: 'vamu', t: 'VAMU: Atestado do SIGAA e recadastramento',
    p: 'O VAMU é rigoroso com a documentação.',
    li: ['O Atestado de Matrícula do SIGAA deve ter **assinatura digital ou código de verificação** (emitido automaticamente).',
      'A cada início de ano letivo, envie o comprovante do novo semestre no site e pague a taxa de recadastramento (geralmente PIX ou boleto). **Sem revalidar, o cartão é bloqueado.**'], busca: 'ônibus passe livre transporte carteirinha' },
  { id: 'meia', topic: 'vamu', t: 'Meia-entrada cultural: o VAMU não vale',
    p: 'A carteira VAMU **não vale como documento nacional do estudante** para meia-entrada em cinemas e shows. Para eventos culturais, emita a carteira da **UNE** ou use o aplicativo **ID Jovem** (se for elegível).', busca: 'cinema show une dne' },
  { id: 'c', topic: 'prog', t: 'P1 e a linguagem C',
    p: 'Em P1 você mergulha nos fundamentos da lógica de programação com **C**. Se nunca escreveu uma linha de código, não se assuste: as aulas começam do zero. Você vai lidar com variáveis, laços de repetição e os famosos **ponteiros**. Dominar C agora facilita aprender qualquer outra linguagem depois.', busca: 'programação 1 p1' },
  { id: 'huxley', topic: 'prog', t: 'Pratique no The Huxley',
    p: 'O Huxley é um **juiz online** muito usado pelos professores do IC para passar listas de exercícios. Há centenas de problemas por nível de dificuldade: você escreve o código em C, envia na plataforma e ela testa automaticamente se a lógica está correta. Ótimo para treinar para as provas e pegar a sintaxe.',
    tip: 'Não espere a primeira lista da faculdade sair. Crie sua conta no Huxley, procure os problemas de **nível 1** e comece a brincar com C. A prática constante é o único segredo para passar direto em P1!', busca: 'the huxley juiz online exercícios' },
  { id: 'terminal', topic: 'prog', t: 'VS Code e terminal: compilar C',
    p: 'A ferramenta oficial dos professores é o **Visual Studio Code**, um editor leve e o mais usado no mercado. Nas aulas do IC, o código em C costuma ser compilado e executado direto no **Terminal do Windows**. Antes, instale o compilador **GCC (via MinGW)**; em geral os professores ensinam na primeira semana.',
    li: ['**1.** Escreva e salve o código com a extensão `.c` (ex.: `meu_programa.c`).', '**2.** Abra o terminal no VS Code: Terminal > Novo Terminal (ou `Ctrl + \'`).', '**3.** Compile: `gcc meu_programa.c -o meu_programa` (`-o` define o nome do executável).', '**4.** Execute: `.\\meu_programa.exe`.'],
    tip: 'A **seta para cima** repete comandos anteriores. Alterou o código? Salve (**Ctrl + S**), compile de novo e só então execute. Se esquecer de compilar, você roda a versão velha!', busca: 'vscode gcc mingw compilar executar terminal', sim: true }
];

const C_QUEM = [
  { id: 'q1', q: 'Quero trancar uma disciplina ou o curso', a: 'Coordenação do curso', d: 'O pedido é feito por formulário, dentro do prazo do Calendário Acadêmico.', card: 'trancamento' },
  { id: 'q2', q: 'Quero ajustar minha grade', a: 'Coordenação do curso', d: 'Ajustes de grade passam pela coordenação. A partir do 2º semestre a matrícula nas disciplinas é feita por você no SIGAA.', card: 'matricula' },
  { id: 'q3', q: 'Preciso do meu diploma ou de registro acadêmico', a: 'DRCA', d: 'O DRCA cuida de registro acadêmico e diploma.', card: 'sigaa' },
  { id: 'q4', q: 'Preciso do Atestado de Matrícula', a: 'SIGAA (você mesmo emite)', d: 'Emita pelo SIGAA. O atestado precisa ter assinatura digital ou código de verificação.', card: 'sigaa' },
  { id: 'q5', q: 'Não consigo acessar o Wi-Fi ou o e-mail da UFAL', a: 'NTI', d: 'O NTI gerencia suas credenciais de rede, o e-mail institucional e o Eduroam.', card: 'nti' },
  { id: 'q6', q: 'Quero logar nos computadores do laboratório', a: 'Setor de TI do IC', d: 'Peça o e-mail @ic.ufal.br no início do semestre, levando o Atestado de Matrícula.', card: 'emailic' },
  { id: 'q7', q: 'Preciso de comprovante autenticado para o HU', a: 'DRCA', d: 'O HU pede o comprovante de matrícula autenticado pelo DRCA e um documento oficial.', card: 'hu' },
  { id: 'q8', q: 'Preciso de isenção no RU ou de uma bolsa', a: 'PROEST', d: 'Acompanhe os editais da Pró-Reitoria Estudantil. Ela também cuida da Residência Universitária.', card: 'proest' }
];

const C_TERMINAL = [
  { t: 'Escreva e salve', d: 'No VS Code, crie um arquivo, escreva o código em C e salve com a extensão .c, em uma pasta fácil de achar.', cmd: '', out: '' },
  { t: 'Abra o terminal', d: "No VS Code: Terminal > Novo Terminal (ou Ctrl + '). Uma aba preta abre embaixo, já apontando para a pasta do arquivo.", cmd: '', out: '' },
  { t: 'Compile', d: 'O gcc traduz o seu código para algo que o computador executa. Se não aparecer erro, deu certo.', cmd: 'gcc meu_programa.c -o meu_programa', out: '' },
  { t: 'Execute', d: 'Agora rode o programa gerado. O resultado aparece ali mesmo no terminal.', cmd: '.\\meu_programa.exe', out: 'Olá, calouro!' }
];

const C_CONFIG = {
  titulo: 'Bem-vindo, calouro!',
  intro: 'Teste as regras de falta, descubra a quem recorrer e consulte o guia completo. Tudo o que você precisa saber para o seu primeiro período no IC.',
  placeholderBusca: 'Buscar: SIGAA, VAMU, faltas, Huxley...',
  faltasPct: 25,
  cargas: ['30', '36', '72', '144', '288'],
  codigoExemplo: '#include <stdio.h>\n\nint main() {\n    printf("Olá, calouro!\\n");\n    return 0;\n}',
  promptTerminal: 'PS C:\\Users\\voce\\codigos> '
};

const HOME_HERO = {
  marca: 'GIC',
  titulo: 'Guia do Ingressante em Computação',
  texto: 'Encontre aqui todos os guias, mapas e dicas essenciais para se orientar no instituto e na universidade. Tudo o que você precisa saber no seu primeiro período reunido em um só lugar.',
  botaoLabel: 'Sou calouro',
  botaoDestino: 'calouro',
  painelCodigo: ['curso1 = "CC";', 'curso2 = "EC";', 'curso3 = "IA";']
};

const HOME_NOTICIAS = [
  { id: 'n1', ativo: true, titulo: 'Bem-vindo ao semestre!', descricao: 'Mensagem de boas-vindas e informações iniciais para os novos alunos.',
    img: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQcQEada5uJkQhYaFCpTQsNUVAW2FOGIJ15x8-prG0c42noVd4SGh7mPQkF&s=10', link: 'https://site-oficial-do-ic.br' },
  { id: 'n2', ativo: true, titulo: 'Calendário Acadêmico', descricao: 'Confira as datas importantes e os prazos do ano letivo de 2026.',
    img: 'https://noticias.ufal.br/estudante/noticias/2025/10/ufal-aprova-calendario-academico-2026-com-inicio-em-23-de-fevereiro/@@images/image-400-9e740ca6b4901d3daf2be2c98cb3ca65.jpeg', link: 'https://site-oficial-do-ic.br' }
];

const OP_CATEGORIAS = [
  { id: 'pesquisa', nome: 'Pesquisa & Labs' },
  { id: 'ensino', nome: 'Monitoria & Ensino' },
  { id: 'extensao', nome: 'Extensão' },
  { id: 'mercado', nome: 'Estágio & Mercado' }
];

const OP_SECOES = [
  { id: 'labs', categoria: 'pesquisa', icone: '🔬', titulo: 'Laboratórios e Pesquisa', subtitulo: 'Iniciação científica, bolsas de pesquisa e grupos de estudo.',
    itens: [
      { id: 'pibic', titulo: 'Iniciação Científica (PIBIC/PIBITI)', descricao: 'Bolsas anuais (CNPq/FAPEAL) para desenvolver projetos de pesquisa orientados por professores. Ótimo para quem deseja seguir carreira acadêmica ou mestrado.', link: '#', tags: ['bolsa', 'pesquisa', 'cnpq'], img: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=400' },
      { id: 'nees', titulo: 'NEES - Computação na Educação', descricao: 'O Núcleo de Excelência em Tecnologias Sociais é um dos maiores laboratórios do IC, focado em inteligência artificial e sistemas para o Ministério da Educação.', link: '#', tags: ['laboratório', 'ia', 'desenvolvimento'], img: '' },
      { id: 'edge', titulo: 'Edge Computing (LACC)', descricao: 'Laboratório de Computação em Nuvem e Borda. Projetos focados em cidades inteligentes, IoT e redes.', link: '#', tags: ['laboratório', 'redes', 'iot'], img: '' }
    ] },
  { id: 'monitoria', categoria: 'ensino', icone: '👨‍🏫', titulo: 'Monitoria e Ensino', subtitulo: 'Ajude outros alunos, reforce seu conhecimento e ganhe bolsa.',
    itens: [
      { id: 'mon-ic', titulo: 'Monitoria do Instituto de Computação', descricao: 'Editais semestrais para monitoria remunerada ou voluntária nas disciplinas base (Programação 1, Matemática Discreta, Cálculo). Exige nota alta na matéria.', link: '#', tags: ['bolsa', 'ensino', 'p1'], img: '' }
    ] },
  { id: 'ext', categoria: 'extensao', icone: '🚀', titulo: 'Projetos de Extensão', subtitulo: 'Aplique a computação na sociedade e cumpra suas ACEs.',
    itens: [
      { id: 'maratona', titulo: 'Maratona de Programação', descricao: 'Treinamentos semanais para competições de algoritmos (ICPC). Desenvolve raciocínio lógico rápido e é muito valorizado por Big Techs.', link: '#', tags: ['competição', 'algoritmos', 'c++', 'extensão'], img: '' },
      { id: 'meninas', titulo: 'Meninas na Computação', descricao: 'Projeto que visa incentivar alunas do ensino médio e fundamental a ingressarem nas carreiras de exatas e tecnologia.', link: '#', tags: ['inclusão', 'sociedade', 'extensão'], img: '' }
    ] },
  { id: 'mercado', categoria: 'mercado', icone: '💼', titulo: 'Estágio e Mercado', subtitulo: 'Empresas juniores, vagas e preparação para a carreira.',
    itens: [
      { id: 'ej', titulo: 'Empresa Júnior', descricao: 'Viva a experiência de uma empresa real ainda na graduação. Desenvolva sites, sistemas e lide com clientes reais sob a orientação de professores.', link: '#', tags: ['mercado', 'web', 'experiência'], img: '' },
      { id: 'mural', titulo: 'Mural de Estágios', descricao: 'Acompanhe as vagas divulgadas pela coordenação em parceria com empresas locais e nacionais (remoto).', link: '#', tags: ['vagas', 'trabalho', 'remoto'], img: '' }
    ] }
];

const IA_CONFIG = {
  nome_assistente: 'Assistente GIC',
  modelo: 'gpt-4o-mini',
  prompt_sistema: 'Você é o assistente virtual do GIC (Guia do Ingressante em Computação) do Instituto de Computação da UFAL. Responda de forma clara, acolhedora e objetiva usando exclusivamente as informações oficiais da base de conhecimento abaixo. Se não tiver certeza ou se o assunto exigir protocolo formal, oriente o aluno a procurar a secretaria ou coordenação do IC.',
  mensagem_boas_vindas: 'Olá! Sou o assistente do GIC. Como posso ajudar no seu início de curso no IC-UFAL?',
  sugestoes_rapidas: [
    'Como funciona a média (AB1 e AB2)?',
    'Como solicitar o e-mail @ic.ufal.br?',
    'Quais documentos preciso para o VAMU?',
    'Como trancar uma disciplina?'
  ],
  mensagem_fallback: 'Para esse caso específico, recomendo confirmar diretamente com a secretaria ou a coordenação do seu curso no IC.'
};

const IA_CONHECIMENTO = [
  {
    id: 'ia-notas',
    ativo: true,
    categoria: 'regras',
    intencao: 'Cálculo de notas (AB1, AB2, Reavaliação e Final)',
    instrucao: 'Explique que o semestre possui AB1 e AB2. Média >= 7,0 aprova direto; média < 5,0 reprova por nota; entre 5,0 e 6,9 o aluno faz a Reavaliação, que substitui a menor AB e exige nova média >= 5,5. Sugira usar a aba Calculadora do portal.',
    palavras_chave: 'nota, ab1, ab2, reavaliação, média, final, reprovação',
    encaminhar_secretaria: false
  },
  {
    id: 'ia-email-ic',
    ativo: true,
    categoria: 'sistemas',
    intencao: 'Criação e uso do e-mail @ic.ufal.br',
    instrucao: 'Informe que o e-mail @ic.ufal.br é gerenciado pelo Setor de TI do IC e serve também para login nos computadores Linux dos laboratórios e acesso à rede interna. A solicitação é feita no início do semestre levando o Atestado de Matrícula do SIGAA.',
    palavras_chave: 'email, ic.ufal.br, laboratório, linux, login, ti',
    encaminhar_secretaria: false
  },
  {
    id: 'ia-trancamento',
    ativo: true,
    categoria: 'matricula',
    intencao: 'Trancamento de disciplina ou curso',
    instrucao: 'Esclareça que o trancamento de disciplina ou curso segue os prazos do Calendário Acadêmico da UFAL e é solicitado à coordenação do curso por formulário (máximo de 4 semestres para trancamento de curso).',
    palavras_chave: 'trancar, trancamento, cancelar matéria, desistir',
    encaminhar_secretaria: true
  },
  {
    id: 'ia-equivalencia',
    ativo: true,
    categoria: 'matricula',
    intencao: 'Aproveitamento de estudos e equivalência de disciplinas',
    instrucao: 'Informe que o aproveitamento de disciplinas cursadas em outra instituição ou currículo antigo passa por análise do colegiado. Oriente o aluno a separar histórico escolar e ementas e abrir processo na secretaria.',
    palavras_chave: 'equivalência, aproveitamento, dispensa, transferência',
    encaminhar_secretaria: true
  }
];

const CC_TXT = `1|COMP359|Programação 1|72|O
1|COMP360|Lógica para Computação|72|O
1|COMP361|Computação, Sociedade e Ética|72|O
1|COMP362|Matemática Discreta|72|O
1|COMP363|Cálculo Diferencial e Integral|144|O
2|COMP364|Estrutura de Dados|72|O|Programação 1
2|COMP365|Banco de Dados|72|O
2|COMP366|Organização e Arquitetura de Computadores|72|O
2|COMP367|Geometria Analítica|72|O
3|COMP368|Redes de Computadores|72|O|Programação 1
3|COMP369|Teoria dos Grafos|72|O|Estrutura de Dados;Matemática Discreta
3|COMP370|Probabilidade e Estatística|72|O|Cálculo Diferencial e Integral
3|COMP371|Álgebra Linear|72|O|Geometria Analítica
4|COMP372|Programação 2|72|O|Estrutura de Dados;Banco de Dados;Redes de Computadores|Programação 3
4|COMP373|Programação 3|72|O|Estrutura de Dados;Banco de Dados;Redes de Computadores|Programação 2
4|COMP374|Projeto e Análise de Algoritmos|72|O|Estrutura de Dados;Teoria dos Grafos
4|COMP376|Teoria da Computação|72|O
4|COMP377|Prática de Extensão em Ciência da Computação 1|75|X|-
5|COMP378|Sistemas Operacionais|72|O|Organização e Arquitetura de Computadores
5|COMP379|Compiladores|72|O|Estrutura de Dados;Teoria da Computação
5|COMP380|Inteligência Artificial|72|O|Lógica para Computação;Estrutura de Dados
5|COMP381|Computação Gráfica|72|O
5|COMP383|Prática de Extensão em Ciência da Computação 2|75|X|Prática de Extensão em Ciência da Computação 1
6|COMP382|Projeto e Desenvolvimento de Sistemas|288|O|@5
6|COMP384|Prática de Extensão em Ciência da Computação 3|75|X|Prática de Extensão em Ciência da Computação 2
7|COMP386|Metodologia de Pesquisa e Trabalho Individual|72|O
7|COMP387|Noções de Direito|72|O
7|COMP388|Prática de Extensão em Ciência da Computação 4|75|X|Prática de Extensão em Ciência da Computação 3
8|COMP385|Prática de Extensão em Ciência da Computação 5|75|X|Prática de Extensão em Ciência da Computação 4
N|COMP404|Cálculo 3|72|N|Cálculo Diferencial e Integral
N|COMP389|Conceitos de Linguagem de Programação|72|N
N|COMP390|Aprendizagem de Máquina|72|N|Cálculo 3
N|COMP391|Sistemas Digitais|72|N|Cálculo 3
N|COMP392|Sistemas Distribuídos|72|N
N|COMP393|Redes Neurais e Aprendizado Profundo|72|N
N|—|FPGA|72|N
N|COMP395|Interação Homem-Máquina|72|N|Programação 3
N|COMP396|Processamento Digital de Imagens|72|N|Computação Gráfica
N|COMP397|Computação Evolucionária|72|N
N|COMP398|Sistemas Embarcados|72|N
N|COMP399|Gerência de Projeto|72|N|Projeto e Desenvolvimento de Sistemas
N|COMP400|Visão Computacional|72|N
N|COMP401|Ciência de Dados|72|N|Probabilidade e Estatística
N|COMP402|Microcontroladores e Aplicações|72|N
N|COMP403|Segurança de Sistemas Computacionais|72|N|Redes de Computadores`;

const EC_TXT = `1|ECOM001|Inglês Instrumental|60|O
1|ECOM002|Programação 1|60|O
1|ECOM003|Matemática Discreta|60|O
1|ECOM004|Cálculo 1|60|O
1|ECOM005|Geometria Analítica|60|O
1|ECOM006|Introdução à Engenharia da Computação|60|O
2|ECOM007|Lógica Aplicada à Computação|60|O
2|ECOM008|Estrutura de Dados|60|O
2|ECOM009|Física 1|60|O
2|ECOM010|Cálculo 2|60|O
2|ECOM011|Álgebra Linear|60|O
2|ECOM012|Circuitos Digitais|30|O
2|ECOM013|Desenho|60|O
3|ECOM014|Linguagens Formais, Autômatos e Computabilidade|60|O
3|ECOM015|Projeto de Software|60|O
3|ECOM016|Física 2|60|O
3|ECOM017|Cálculo 3|60|O
3|ECOM018|Metodologia da Pesquisa e do Trabalho Científico|30|O
3|ECOM019|Sistemas Digitais|60|O
3|ECOM057|Química Tecnológica|60|O
4|ECOM020|Probabilidade e Estatística|60|O
4|ECOM021|Engenharia de Software|60|O
4|ECOM022|Física 3|60|O
4|ECOM023|Cálculo 4|60|O
4|ECOM024|Variáveis Complexas|60|O
4|ECOM025|Organização e Arquitetura de Computadores|60|O
4|ECOM026|Física Experimental 3|30|O
5|ECOM027|Projeto e Análise de Algoritmos|60|O
5|ECOM028|Circuitos Elétricos|60|O
5|ECOM029|Redes de Computadores|60|O
5|ECOM030|Sinais e Sistemas|90|O
5|ECOM031|Inteligência Artificial|60|O
5|ECOM032|Sistemas Operacionais|60|O
5|ECOM033|Teoria dos Grafos|30|O
6|ECOM034|Princípios de Comunicação|60|O
6|ECOM035|Eletrônica|60|O
6|ECOM036|Métodos Numéricos|60|O
6|ECOM037|Sistemas de Controle 1|60|O
6|ECOM048|Computador, Sociedade e Ética|30|O
6|ECOM040|Empreendedorismo|60|O
6|ECOM118|Fenômenos de Transporte|60|O
7|ECOM058|Sistemas de Controle 2|60|O
7|ECOM041|Banco de Dados|60|O
7|ECOM059|Microcontroladores e Aplicações|60|O
7|ECOM060|Instrumentação Eletrônica|60|O
7|ECOM063|Processamento Digital de Sinais|60|O
7|ECOM046|Noções de Direito|60|O
7|—|Disciplinas Eletivas||E|var
8|ECOM042|Sistemas Embarcados|60|O
8|ECOM061|Automação Industrial|60|O
8|ECOM039|Computação Gráfica e Processamento de Imagens|60|O
8|ECOM062|Robótica|60|O
8|ECOM044|Sistemas Distribuídos|60|O
8|ECOM119|Mecânica dos Sólidos|60|O
9|ECOM126|Estágio Supervisionado|160|S
9|—|Disciplinas Eletivas||E|var
10|—|Disciplinas Eletivas||E|var`;

const IA_TXT = `1|—|Matemática Discreta para Computação|72|O|-
1|—|Programação 1|72|O|-
1|—|Introdução à Inteligência Artificial|72|O|-
1|—|Introdução à Ciência de Dados|72|O|-
2|—|Cálculo 1|72|O|-
2|—|Programação 2|72|O|Programação 1
2|—|Lógica para Inteligência Artificial|72|O
2|—|Estatística e Probabilidade para Computação|72|O
3|—|Cálculo 2|72|O
3|—|Banco de Dados|72|O
3|—|Álgebra Linear e Geometria Analítica|72|O
3|—|Ciência de Dados|72|O
4|—|Cálculo 3|72|O
4|—|Programação 3|72|O
4|—|Inteligência Artificial Simbólica|72|O
4|—|Aprendizado de Máquina Supervisionado|72|O
5|—|Teoria da Computação e Autômatos|72|O
5|—|Ética em Inteligência Artificial|72|O
5|—|Aprendizado por Reforço|72|O
5|—|Aprendizado de Máquina Não Supervisionado|72|O
6|—|Visão Computacional|72|O
6|—|Engenharia de Software para Inteligência Artificial|72|O
6|—|Redes Neurais e Aprendizado Profundo|72|O
6|—|Processamento de Linguagem Natural|72|O
7|—|Inteligência Artificial Generativa e Modelos de Linguagem|72|O|Aprendizado de Máquina Supervisionado;Processamento de Linguagem Natural
8|—|Metodologia Científica|72|O
9|—|Trabalho de Conclusão de Curso (TCC)||O`;

const EQUIVALENCIAS = {
  'Programação 1': 'CCOM002', 'Lógica para Computação': 'CCOM014', 'Computação, Sociedade e Ética': 'CCOM047, CCOM046',
  'Matemática Discreta': 'CCOM010', 'Cálculo Diferencial e Integral': 'CCOM004, CCOM011', 'Estrutura de Dados': 'CCOM009',
  'Banco de Dados': 'CCOM021', 'Organização e Arquitetura de Computadores': 'CCOM026', 'Geometria Analítica': 'CCOM005',
  'Redes de Computadores': 'CCOM032', 'Teoria dos Grafos': 'CCOM030, CCOM039', 'Probabilidade e Estatística': 'CCOM022',
  'Álgebra Linear': 'CCOM012', 'Programação 2': 'CCOM016', 'Programação 3': 'CCOM007, CCOM006',
  'Projeto e Análise de Algoritmos': 'CCOM020', 'Teoria da Computação': 'CCOM008, CCOM015', 'Sistemas Operacionais': 'CCOM034',
  'Compiladores': 'CCOM035', 'Inteligência Artificial': 'CCOM033', 'Computação Gráfica': 'CCOM041',
  'Projeto e Desenvolvimento de Sistemas': 'CCOM003, CCOM023, CCOM028, CCOM031, CCOM036, CCOM042',
  'Metodologia de Pesquisa e Trabalho Individual': 'CCOM001, CCOM013', 'Noções de Direito': 'CCOM045', 'Cálculo 3': 'CCOM025',
  'Conceitos de Linguagem de Programação': 'CCOM027', 'Sistemas Distribuídos': 'CCOM044', 'Interação Homem-Máquina': 'CCOM043, CCOM046',
  'Gerência de Projeto': 'CCOM048'
};

const D_CURSOS = [
  { id: 'cc', nome: 'Ciência da Computação', un: 'h',
    resumo: [{ label: 'Duração', valor: '8 a 12 semestres' }, { label: 'Carga horária', valor: '2.952 h em disciplinas' }, { label: 'Obrigatórias', valor: '24 disciplinas (2.016 h)' }, { label: 'Eletivas', valor: 'mínimo de 576 h' }, { label: 'Extensão', valor: '5 práticas (375 h)' }],
    fluxo: 'Os semestres seguem da esquerda para a direita. As eletivas do fluxo podem ser escolhidas entre as ênfases e o catálogo de eletivas abaixo.',
    fonte: 'Fonte: PPC do curso de Ciência da Computação (2019, versão final). Pré-requisitos e correquisitos conforme as ementas do PPC.',
    notas: [
      'Cada ênfase reúne 5 disciplinas. Segundo o PPC, quem cumprir as obrigatórias do curso e três eletivas da mesma ênfase recebe o certificado de conclusão de ênfase.',
      'O PPC usa o código COMP393 para Redes Neurais e Aprendizado Profundo e também para FPGA; por isso o código de FPGA aparece em branco aqui.',
      'As práticas de extensão não têm ementa no PPC, então seus pré-requisitos aparecem como "não consta".'
    ],
    enfases: [
      { nome: 'Computação Visual', disciplinas: ['Cálculo 3', 'Aprendizagem de Máquina', 'Redes Neurais e Aprendizado Profundo', 'Processamento Digital de Imagens', 'Visão Computacional'] },
      { nome: 'Sistemas Inteligentes', disciplinas: ['Cálculo 3', 'Aprendizagem de Máquina', 'Redes Neurais e Aprendizado Profundo', 'Computação Evolucionária', 'Ciência de Dados'] },
      { nome: 'Sistemas de Computação', disciplinas: ['Cálculo 3', 'Sistemas Digitais', 'FPGA', 'Sistemas Embarcados', 'Microcontroladores e Aplicações'] },
      { nome: 'Sistemas de Informação', disciplinas: ['Conceitos de Linguagem de Programação', 'Sistemas Distribuídos', 'Interação Homem-Máquina', 'Gerência de Projeto', 'Segurança de Sistemas Computacionais'] }
    ] },
  { id: 'ec', nome: 'Engenharia de Computação', un: 'h/a',
    resumo: [{ label: 'Duração', valor: '10 semestres' }, { label: 'Carga horária', valor: '3.650 h no total' }, { label: 'Obrigatórias', valor: '2.550 h (3.060 h/a)' }, { label: 'Eletivas', valor: '650 h (780 h/a)' }, { label: 'Estágio e TCC', valor: '160 h e 90 h' }],
    fluxo: 'Os semestres seguem da esquerda para a direita. O 7º, o 9º e o 10º períodos reservam espaço para eletivas, e o estágio supervisionado é no 9º.',
    fonte: 'Fonte: PPC do curso de Engenharia de Computação (versão atual). As cargas horárias estão em horas-aula, como no PPC.',
    notas: [
      'O PPC não define pré-requisitos formais, apenas diz que pode haver quando for o caso. Por isso o fluxo mostra só a ordem por período.',
      'O TCC (90 h) e as atividades complementares (200 h) não são disciplinas e por isso não aparecem no fluxo.',
      'O PPC repete algumas eletivas com códigos diferentes (por exemplo Redes de Petri e Inteligência Artificial 2); mantive como estão no documento.'
    ],
    enfases: [] },
  { id: 'ia', nome: 'Inteligência Artificial', un: 'h',
    resumo: [{ label: 'Duração', valor: '9 a 14 semestres' }, { label: 'Obrigatórias', valor: '27 componentes' }, { label: 'Eletivas de perfil', valor: 'mínimo de 660 h' }, { label: 'Atividades complementares', valor: '240 h' }, { label: 'Extensão', valor: 'mínimo de 320 h' }],
    fluxo: 'Os semestres seguem da esquerda para a direita, conforme o Mapa de Disciplinas por Semestre do PPC. A partir do 3º período cada semestre inclui eletivas.',
    fonte: 'Fonte: PPC provisório do curso de Inteligência Artificial. Por ser provisório, o documento ainda tem lacunas e pode mudar.',
    notas: [
      'Os códigos das disciplinas ainda estão como "IAXXX" no PPC, por isso aparecem em branco aqui.',
      'O PPC deixa em branco os pré-requisitos da maioria das disciplinas. Aparecem apenas os que estão preenchidos.',
      'Há divergências dentro do PPC: o texto cita Cálculo 1 no 1º período e Metodologia Científica no 9º, enquanto o Mapa de Disciplinas por Semestre põe Cálculo 1 no 2º e Metodologia no 8º. Segui o Mapa.',
      'A carga horária do TCC aparece como 60 h, 72 h e 180 h em partes diferentes do PPC, por isso fica em branco.'
    ],
    enfases: [] }
];

/* ---------------------------------------------------------------------
   IMPORTAÇÃO EM LOTE
   --------------------------------------------------------------------- */
function parseLinhas(txt, cursoId, chPadrao = '') {
  const defModo = cursoId === 'cc' ? 'nenhum' : 'naoconsta';
  return txt.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const p = l.split('|').map((x) => x.trim());
    if (p.length >= 5) {
      const pre = p[5] || '';
      let preModo = defModo, lista = [];
      if (pre === '?') preModo = 'naoconsta';
      else if (pre === '-') preModo = 'nenhum';
      else if (pre === '@5') preModo = 'ate5';
      else if (pre === 'var') preModo = 'var';
      else if (pre) { preModo = 'lista'; lista = pre.split(';').map((x) => x.trim()).filter(Boolean); }
      return { id: uid(), curso: cursoId, per: p[0], cod: p[1] || '—', nome: p[2], ch: p[3] ? Number(p[3]) : '', tipo: p[4] || 'O', preModo, pre: lista, co: (p[6] || '').split(';').map((x) => x.trim()).filter(Boolean), equiv: '' };
    }
    const comCod = p.length > 1;
    return { id: uid(), curso: cursoId, per: 'C', cod: comCod ? p[0] : '—', nome: comCod ? p[1] : p[0], ch: comCod && p[2] ? Number(p[2]) : (chPadrao === '' ? '' : Number(chPadrao)), tipo: 'E', preModo: 'naoconsta', pre: [], co: [], equiv: '' };
  });
}

const slotEletiva = (curso, per, ch) => ({ id: uid(), curso, per: String(per), cod: '—', nome: 'Eletiva', ch, tipo: 'E', preModo: 'var', pre: [], co: [], equiv: '' });

function seedDisciplinas() {
  const cc = parseLinhas(CC_TXT, 'cc');
  cc.forEach((d) => { d.equiv = EQUIVALENCIAS[d.nome] || ''; });
  [[2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 3], [8, 5]].forEach(([p, n]) => { for (let i = 0; i < n; i++) cc.push(slotEletiva('cc', p, 72)); });
  const ec = parseLinhas(EC_TXT, 'ec');
  const ia = parseLinhas(IA_TXT, 'ia');
  [[3, 1], [4, 1], [5, 1], [6, 1], [7, 4], [8, 4], [9, 4]].forEach(([p, n]) => { for (let i = 0; i < n; i++) ia.push(slotEletiva('ia', p, 72)); });
  return [...cc, ...ec, ...ia];
}

function estadoInicial() {
  return {
    home_hero: clone(HOME_HERO),
    home_noticias: clone(HOME_NOTICIAS),
    c_config: clone(C_CONFIG),
    c_topicos: clone(C_TOPICOS),
    c_cards: clone(C_CARDS),
    c_quem: clone(C_QUEM),
    c_terminal: C_TERMINAL.map((x) => ({ id: uid(), ...x })),
    op_categorias: clone(OP_CATEGORIAS),
    op_secoes: clone(OP_SECOES),
    d_cursos: clone(D_CURSOS),
    d_disciplinas: seedDisciplinas(),
    ia_config: clone(IA_CONFIG),
    ia_conhecimento: clone(IA_CONHECIMENTO)
  };
}

export const repositorio = {
  carregar() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...estadoInicial(), ...JSON.parse(raw) } : estadoInicial();
    } catch (e) { return estadoInicial(); }
  },
  salvar(estado) {
    // TODO (Back-end): trocar por fetch('/api/conteudo', { method: 'PUT', body: JSON.stringify(estado) })
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
  }
};

export function useConteudo() {
  const [c] = useState(() => repositorio.carregar());
  return c;
}

/* ---------------------------------------------------------------------
   SCHEMA: coleções editáveis
   --------------------------------------------------------------------- */
const opc = (colId, v = 'id', l = 'nome') => (store) => (store[colId] || []).map((x) => ({ v: x[v], l: typeof l === 'function' ? l(x) : x[l] }));
const nomeDe = (store, colId, id, campo = 'nome') => (store[colId] || []).find((x) => x.id === id)?.[campo] || id;

const PERIODOS = [...Array.from({ length: 10 }, (_, i) => ({ v: String(i + 1), l: `${i + 1}º período` })), { v: 'N', l: 'Ênfase' }, { v: 'C', l: 'Catálogo de eletivas' }];
const TIPO_OPC = Object.entries(TIPOS).map(([v, l]) => ({ v, l }));
const PRE_MODOS = [
  { v: 'lista', l: 'Lista de disciplinas' }, { v: 'nenhum', l: 'Nenhum' }, { v: 'naoconsta', l: 'Não consta no PPC' },
  { v: 'ate5', l: 'Todas as obrigatórias do 1º ao 5º' }, { v: 'var', l: 'Conforme a disciplina escolhida' }
];

const COLECOES = {
  home_hero: { id: 'home_hero', pagina: 'inicio', singleton: true, titulo: 'Banner principal', descr: 'Marca, título, texto e botão da capa.',
    campos: [
      { k: 'marca', label: 'Sigla da marca', tipo: 'text' },
      { k: 'titulo', label: 'Título', tipo: 'text', obrigatorio: true, largo: true },
      { k: 'texto', label: 'Texto de apresentação', tipo: 'textarea', linhas: 4 },
      { k: 'botaoLabel', label: 'Texto do botão', tipo: 'text' },
      { k: 'botaoDestino', label: 'Página aberta pelo botão', tipo: 'select', opcoes: [{ v: 'calouro', l: 'Sou calouro' }, { v: 'disciplinas', l: 'Matriz Curricular' }, { v: 'oportunidades', l: 'Oportunidades' }] },
      { k: 'painelCodigo', label: 'Linhas do painel de código (decoração)', tipo: 'lista', ajuda: 'Aparecem dentro de "class Aluno { ... }".' }
    ] },
  home_noticias: { id: 'home_noticias', pagina: 'inicio', titulo: 'Notícias e avisos', descr: 'Cards do carrossel da página inicial.', rotuloNovo: 'Nova notícia',
    tituloItem: (i) => i.titulo, subItem: (i) => (i.ativo ? 'Visível' : 'Oculta'),
    novo: () => ({ ativo: true }),
    campos: [
      { k: 'id', tipo: 'text', oculto: true },
      { k: 'titulo', label: 'Título', tipo: 'text', obrigatorio: true, largo: true },
      { k: 'descricao', label: 'Resumo', tipo: 'textarea' },
      { k: 'img', label: 'URL da imagem', tipo: 'text', ph: 'https://...' },
      { k: 'link', label: 'Link da notícia', tipo: 'text', ph: 'https://...' },
      { k: 'ativo', label: 'Exibir no site', tipo: 'bool' }
    ] },

  c_config: { id: 'c_config', pagina: 'calouro', singleton: true, titulo: 'Textos e ajustes', descr: 'Cabeçalho, busca, calculadora de faltas e código de exemplo do terminal.',
    campos: [
      { k: 'titulo', label: 'Título da página', tipo: 'text', largo: true },
      { k: 'intro', label: 'Texto de introdução', tipo: 'textarea' },
      { k: 'placeholderBusca', label: 'Texto de ajuda da busca', tipo: 'text', largo: true },
      { k: 'faltasPct', label: 'Limite de faltas (%)', tipo: 'number', ajuda: 'Hoje: 25 (exige 75% de presença).' },
      { k: 'cargas', label: 'Cargas horárias da calculadora de faltas', tipo: 'lista', ajuda: 'Só números, ex.: 72.' },
      { k: 'codigoExemplo', label: 'Código C de exemplo (simulador)', tipo: 'textarea', linhas: 7, ajuda: 'Texto exibido na janela "VS Code" do passo a passo.' },
      { k: 'promptTerminal', label: 'Prompt do terminal', tipo: 'text', largo: true }
    ] },
  c_topicos: { id: 'c_topicos', pagina: 'calouro', titulo: 'Tópicos (filtros)', descr: 'Botões de filtro do guia. Cada card pertence a um tópico.', rotuloNovo: 'Novo tópico',
    slugDe: 'nome', refs: [{ col: 'c_cards', k: 'topic', rot: 'cards' }],
    tituloItem: (i) => i.nome, subItem: (i, s) => `${(s.c_cards || []).filter((c) => c.topic === i.id).length} card(s) · id: ${i.id}`,
    campos: [
      { k: 'id', label: 'ID', tipo: 'text', somenteNovo: true, ajuda: 'Gerado do nome. Não muda depois de criado.', oculto: false },
      { k: 'nome', label: 'Nome exibido', tipo: 'text', obrigatorio: true, largo: true }
    ] },
  c_cards: { id: 'c_cards', pagina: 'calouro', titulo: 'Guia rápido (cards)', descr: 'Itens do guia completo, agrupados por tópico.', rotuloNovo: 'Novo card',
    slugDe: 't', refs: [{ col: 'c_quem', k: 'card', rot: '"Quem resolve o quê?"' }],
    filtros: [{ k: 'topic', label: 'Tópico', opcoes: opc('c_topicos') }],
    tituloItem: (i) => i.t, subItem: (i, s) => nomeDe(s, 'c_topicos', i.topic),
    campos: [
      { k: 'id', label: 'ID', tipo: 'text', somenteNovo: true, ajuda: 'Gerado do título. Usado pelo botão "Ver no guia".' },
      { k: 'topic', label: 'Tópico', tipo: 'select', opcoes: opc('c_topicos'), obrigatorio: true },
      { k: 't', label: 'Título', tipo: 'text', obrigatorio: true, largo: true },
      { k: 'p', label: 'Texto principal', tipo: 'textarea', linhas: 4, ajuda: 'Use **negrito** e `código`.' },
      { k: 'li', label: 'Lista de pontos', tipo: 'lista', longo: true, ajuda: 'Também aceita **negrito** e `código`.' },
      { k: 'check', label: 'Checklist (marcável pelo aluno)', tipo: 'lista' },
      { k: 'stats', label: 'Destaques numéricos', tipo: 'grupo', fechado: false, resumo: (g) => `${g.n || '…'} · ${g.d || ''}`,
        campos: [{ k: 'n', label: 'Valor', tipo: 'text', ph: '≥ 7,0' }, { k: 'd', label: 'Descrição', tipo: 'text', largo: true }] },
      { k: 'p2', label: 'Texto após a lista', tipo: 'textarea' },
      { k: 'tip', label: 'Dica de veterano', tipo: 'textarea' },
      { k: 'busca', label: 'Palavras-chave extras da busca', tipo: 'text', largo: true, ph: 'wifi eduroam internet' },
      { k: 'sim', label: 'Mostrar botão do passo a passo animado', tipo: 'bool' }
    ] },
  c_quem: { id: 'c_quem', pagina: 'calouro', titulo: 'Quem resolve o quê?', descr: 'Situações e o setor responsável.', rotuloNovo: 'Nova situação',
    tituloItem: (i) => i.q, subItem: (i) => `→ ${i.a}`,
    campos: [
      { k: 'id', tipo: 'text', oculto: true },
      { k: 'q', label: 'Situação (o que o aluno quer)', tipo: 'text', obrigatorio: true, largo: true },
      { k: 'a', label: 'Setor responsável', tipo: 'text', obrigatorio: true },
      { k: 'd', label: 'Explicação', tipo: 'textarea' },
      { k: 'card', label: 'Card do guia aberto por "Ver no guia"', tipo: 'select', opcoes: opc('c_cards', 'id', 't'), vazio: true }
    ] },
  c_terminal: { id: 'c_terminal', pagina: 'calouro', titulo: 'Passo a passo do terminal', descr: 'Etapas da animação "Compilar C no terminal". Os passos 3 em diante simulam comandos.', rotuloNovo: 'Novo passo',
    tituloItem: (i, s) => `${(s.c_terminal.indexOf(i) + 1)}. ${i.t}`, subItem: (i) => (i.cmd ? `$ ${i.cmd}` : 'Sem comando'),
    campos: [
      { k: 'id', tipo: 'text', oculto: true },
      { k: 't', label: 'Título do passo', tipo: 'text', obrigatorio: true, largo: true },
      { k: 'd', label: 'Explicação', tipo: 'textarea' },
      { k: 'cmd', label: 'Comando digitado', tipo: 'text', ajuda: 'Deixe vazio nos passos sem terminal.' },
      { k: 'out', label: 'Saída do programa', tipo: 'text' }
    ] },

  d_cursos: { id: 'd_cursos', pagina: 'disciplinas', titulo: 'Cursos', descr: 'Resumo, textos, notas e ênfases de cada curso.', rotuloNovo: 'Novo curso',
    refs: [{ col: 'd_disciplinas', k: 'curso', rot: 'disciplinas' }],
    tituloItem: (i) => i.nome, subItem: (i, s) => `${(s.d_disciplinas || []).filter((d) => d.curso === i.id).length} disciplina(s) · id: ${i.id}`,
    campos: [
      { k: 'id', label: 'ID do curso', tipo: 'text', somenteNovo: true, obrigatorio: true, ph: 'cc', ajuda: 'Curto e sem espaços. Não muda depois de criado.' },
      { k: 'nome', label: 'Nome do curso', tipo: 'text', obrigatorio: true, largo: true },
      { k: 'un', label: 'Unidade de carga horária', tipo: 'select', opcoes: [{ v: 'h', l: 'h (horas)' }, { v: 'h/a', l: 'h/a (horas-aula)' }] },
      { k: 'resumo', label: 'Quadro-resumo', tipo: 'grupo', resumo: (g) => `${g.label || '…'}: ${g.valor || ''}`,
        campos: [{ k: 'label', label: 'Rótulo', tipo: 'text' }, { k: 'valor', label: 'Valor', tipo: 'text' }] },
      { k: 'fluxo', label: 'Texto do fluxo padrão', tipo: 'textarea' },
      { k: 'enfases', label: 'Ênfases', tipo: 'grupo', fechado: true, resumo: (g) => g.nome || 'Nova ênfase', ajuda: 'Use os nomes exatos das disciplinas do tipo Ênfase.',
        campos: [{ k: 'nome', label: 'Nome da ênfase', tipo: 'text', largo: true }, { k: 'disciplinas', label: 'Disciplinas da ênfase', tipo: 'lista' }] },
      { k: 'fonte', label: 'Fonte dos dados', tipo: 'textarea' },
      { k: 'notas', label: 'Notas da seção "Sobre estes dados"', tipo: 'lista', longo: true }
    ] },
  d_disciplinas: { id: 'd_disciplinas', pagina: 'disciplinas', titulo: 'Disciplinas', descr: 'Obrigatórias, extensão, ênfases, eletivas do fluxo e catálogo. Filtre por curso.', rotuloNovo: 'Nova disciplina',
    extra: 'importDisc',
    filtros: [
      { k: 'curso', label: 'Curso', opcoes: opc('d_cursos'), semTodos: true },
      { k: 'per', label: 'Período', opcoes: () => PERIODOS }
    ],
    tituloItem: (i) => `${i.cod && i.cod !== '—' ? i.cod + ' · ' : ''}${i.nome}`,
    subItem: (i) => `${perLabel(i.per)} · ${TIPOS[i.tipo] || i.tipo} · ${i.ch ? i.ch + ' h' : 'CH não informada'}`,
    novo: () => ({ per: '1', tipo: 'O', preModo: 'nenhum', pre: [], co: [], cod: '—' }),
    campos: [
      { k: 'id', tipo: 'text', oculto: true },
      { k: 'curso', label: 'Curso', tipo: 'select', opcoes: opc('d_cursos'), obrigatorio: true },
      { k: 'per', label: 'Período / grupo', tipo: 'select', opcoes: PERIODOS, obrigatorio: true },
      { k: 'tipo', label: 'Tipo', tipo: 'select', opcoes: TIPO_OPC, obrigatorio: true },
      { k: 'cod', label: 'Código', tipo: 'text', ph: 'COMP359 ou —' },
      { k: 'nome', label: 'Nome da disciplina', tipo: 'text', obrigatorio: true, largo: true },
      { k: 'ch', label: 'Carga horária', tipo: 'number' },
      { k: 'preModo', label: 'Pré-requisitos', tipo: 'select', opcoes: PRE_MODOS },
      { k: 'pre', label: 'Pré-requisitos (nomes exatos)', tipo: 'lista', mostrarSe: (i) => i.preModo === 'lista',
        sugestoes: (s, i) => [...new Set((s.d_disciplinas || []).filter((d) => d.curso === i.curso && d.nome !== 'Eletiva').map((d) => d.nome))] },
      { k: 'co', label: 'Correquisitos', tipo: 'lista',
        sugestoes: (s, i) => [...new Set((s.d_disciplinas || []).filter((d) => d.curso === i.curso).map((d) => d.nome))] },
      { k: 'equiv', label: 'Equivalências (currículo antigo)', tipo: 'text', largo: true, ph: 'CCOM002, CCOM003' }
    ] },

  op_categorias: { id: 'op_categorias', pagina: 'oportunidades', titulo: 'Categorias (filtros)', descr: 'Botões de filtro da página.', rotuloNovo: 'Nova categoria',
    slugDe: 'nome', refs: [{ col: 'op_secoes', k: 'categoria', rot: 'seções' }],
    tituloItem: (i) => i.nome, subItem: (i, s) => `${(s.op_secoes || []).filter((x) => x.categoria === i.id).length} seção(ões)`,
    campos: [
      { k: 'id', label: 'ID', tipo: 'text', somenteNovo: true, ajuda: 'Gerado do nome. Não muda depois de criado.' },
      { k: 'nome', label: 'Nome exibido', tipo: 'text', obrigatorio: true, largo: true }
    ] },
  op_secoes: { id: 'op_secoes', pagina: 'oportunidades', titulo: 'Seções e oportunidades', descr: 'Cada seção reúne vários cards de oportunidade.', rotuloNovo: 'Nova seção',
    slugDe: 'titulo', filtros: [{ k: 'categoria', label: 'Categoria', opcoes: opc('op_categorias') }],
    tituloItem: (i) => `${i.icone || ''} ${i.titulo}`.trim(), subItem: (i, s) => `${nomeDe(s, 'op_categorias', i.categoria)} · ${(i.itens || []).length} item(ns)`,
    campos: [
      { k: 'id', label: 'ID (âncora do menu)', tipo: 'text', somenteNovo: true, ajuda: 'Gerado do título.' },
      { k: 'categoria', label: 'Categoria', tipo: 'select', opcoes: opc('op_categorias'), obrigatorio: true },
      { k: 'icone', label: 'Ícone (emoji)', tipo: 'text', ph: '🔬' },
      { k: 'titulo', label: 'Título da seção', tipo: 'text', obrigatorio: true, largo: true },
      { k: 'subtitulo', label: 'Subtítulo', tipo: 'text', largo: true },
      { k: 'itens', label: 'Oportunidades da seção', tipo: 'grupo', fechado: true, resumo: (g) => g.titulo || 'Nova oportunidade',
        campos: [
          { k: 'id', tipo: 'text', oculto: true },
          { k: 'titulo', label: 'Título', tipo: 'text', obrigatorio: true, largo: true },
          { k: 'descricao', label: 'Descrição', tipo: 'textarea' },
          { k: 'link', label: 'Link do "Saiba mais"', tipo: 'text', ph: 'https://... (use # para sem link)' },
          { k: 'img', label: 'URL da imagem (opcional)', tipo: 'text' },
          { k: 'tags', label: 'Tags de busca', tipo: 'lista' }
        ] }
    ] },

  ia_conhecimento: { id: 'ia_conhecimento', pagina: 'chatbot', titulo: 'Base de conhecimento', descr: 'Contexto e instruções usadas pela IA para responder às dúvidas dos alunos.', rotuloNovo: 'Nova instrução',
    slugDe: 'intencao',
    filtros: [{ k: 'categoria', label: 'Categoria', opcoes: () => IA_CATEGORIAS }],
    tituloItem: (i) => i.intencao,
    subItem: (i) => `${iaCatLabel(i.categoria)} · ${i.ativo === false ? 'Inativo' : 'Ativo'}${i.encaminhar_secretaria ? ' · Encaminha p/ secretaria' : ''}`,
    novo: () => ({ categoria: 'geral', ativo: true, encaminhar_secretaria: false }),
    campos: [
      { k: 'id', tipo: 'text', oculto: true },
      { k: 'categoria', label: 'Categoria', tipo: 'select', opcoes: IA_CATEGORIAS, obrigatorio: true },
      { k: 'intencao', label: 'Assunto / intenção do aluno', tipo: 'text', obrigatorio: true, largo: true, ph: 'Ex.: Como emitir o atestado de matrícula' },
      { k: 'instrucao', label: 'Contexto e instrução para a IA', tipo: 'textarea', linhas: 5, obrigatorio: true, ajuda: 'Explique os fatos oficiais e como a IA deve orientar o aluno neste tópico.' },
      { k: 'palavras_chave', label: 'Palavras-chave de referência', tipo: 'text', largo: true, ph: 'sigaa, atestado, comprovante, matrícula', ajuda: 'Separadas por vírgula. Ajuda na busca e recuperação (RAG).' },
      { k: 'encaminhar_secretaria', label: 'Recomendar encaminhamento para a secretaria/coordenação', tipo: 'bool' },
      { k: 'ativo', label: 'Ativo na base da IA', tipo: 'bool' }
    ] },
  ia_config: { id: 'ia_config', pagina: 'chatbot', singleton: true, titulo: 'Prompt e comportamento', descr: 'Personalidade do assistente, modelo utilizado e mensagens padrão do chat.',
    campos: [
      { k: 'nome_assistente', label: 'Nome do assistente', tipo: 'text', obrigatorio: true },
      { k: 'modelo', label: 'Modelo de IA', tipo: 'select', opcoes: [{ v: 'gpt-4o-mini', l: 'OpenAI · gpt-4o-mini' }, { v: 'gpt-4o', l: 'OpenAI · gpt-4o' }, { v: 'gemini-2.5-flash', l: 'Google · gemini-2.5-flash' }] },
      { k: 'prompt_sistema', label: 'Prompt de sistema (regras gerais)', tipo: 'textarea', linhas: 6, obrigatorio: true, ajuda: 'Define o tom de voz, limites e comportamento base da IA.' },
      { k: 'mensagem_boas_vindas', label: 'Mensagem de boas-vindas no chat', tipo: 'textarea', linhas: 2 },
      { k: 'sugestoes_rapidas', label: 'Sugestões rápidas (chips do chat)', tipo: 'lista', addLabel: 'Adicionar sugestão' },
      { k: 'mensagem_fallback', label: 'Mensagem quando não souber responder', tipo: 'textarea', linhas: 2 }
    ] }
};

const PAGINAS = [
  { id: 'inicio', nome: 'Início', icone: '🏠', descr: 'Capa do site e carrossel de notícias.', cols: ['home_hero', 'home_noticias'] },
  { id: 'calouro', nome: 'Sou calouro', icone: '🎓', descr: 'Guia rápido, tópicos, "quem resolve" e simulador de terminal.', cols: ['c_cards', 'c_topicos', 'c_quem', 'c_terminal', 'c_config'] },
  { id: 'disciplinas', nome: 'Matriz Curricular', icone: '📚', descr: 'Cursos, fluxo padrão, ênfases e catálogo de disciplinas.', cols: ['d_disciplinas', 'd_cursos'] },
  { id: 'oportunidades', nome: 'Oportunidades', icone: '🚀', descr: 'Laboratórios, monitoria, extensão e mercado.', cols: ['op_secoes', 'op_categorias'] },
  { id: 'chatbot', nome: 'Assistente IA', icone: '🤖', descr: 'Base de conhecimento, prompt de sistema e sugestões do chatbot.', cols: ['ia_conhecimento', 'ia_config'] }
];

/* ---------------------------------------------------------------------
   MOTOR GENÉRICO
   --------------------------------------------------------------------- */
const getOpc = (campo, store, item) => (typeof campo.opcoes === 'function' ? campo.opcoes(store, item) : campo.opcoes || []);

function valorVazio(c) {
  if (c.padrao !== undefined) return clone(c.padrao);
  if (c.tipo === 'lista' || c.tipo === 'grupo') return [];
  if (c.tipo === 'bool') return false;
  return '';
}
function novoVazio(campos) {
  const o = {};
  campos.forEach((c) => { o[c.k] = c.k === 'id' ? uid() : valorVazio(c); });
  return o;
}
function validar(campos, item, prefixo = '') {
  for (const c of campos) {
    if (c.mostrarSe && !c.mostrarSe(item)) continue;
    const v = item[c.k];
    if (c.obrigatorio && (v === undefined || v === null || String(v).trim() === '')) return `${prefixo}Preencha "${c.label}".`;
    if (c.tipo === 'grupo' && Array.isArray(v)) {
      for (let i = 0; i < v.length; i++) {
        const e = validar(c.campos, v[i], `${c.label} #${i + 1}: `);
        if (e) return e;
      }
    }
  }
  return '';
}

function ListaEditor({ valor, onChange, longo, sugestoes, addLabel }) {
  const lista = Array.isArray(valor) ? valor : [];
  const dl = useId();
  const set = (i, v) => onChange(lista.map((x, j) => (j === i ? v : x)));
  const mover = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= lista.length) return;
    const c = [...lista];
    [c[i], c[j]] = [c[j], c[i]];
    onChange(c);
  };
  return (
    <div className="adm-lista">
      {sugestoes && <datalist id={dl}>{sugestoes.map((s) => <option key={s} value={s} />)}</datalist>}
      {lista.map((x, i) => (
        <div className="adm-lrow" key={i}>
          {longo
            ? <textarea className="adm-in" rows={2} value={x} onChange={(e) => set(i, e.target.value)} />
            : <input className="adm-in" list={sugestoes ? dl : undefined} value={x} onChange={(e) => set(i, e.target.value)} />}
          <div className="adm-mini">
            <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">↑</button>
            <button type="button" onClick={() => mover(i, 1)} disabled={i === lista.length - 1} aria-label="Descer">↓</button>
            <button type="button" className="del" onClick={() => onChange(lista.filter((_, j) => j !== i))} aria-label="Remover">✕</button>
          </div>
        </div>
      ))}
      <button type="button" className="adm-btn ghost sm" onClick={() => onChange([...lista, ''])}>+ {addLabel || 'Adicionar item'}</button>
    </div>
  );
}

function GrupoEditor({ campo, valor, onChange, store }) {
  const itens = Array.isArray(valor) ? valor : [];
  const set = (i, v) => onChange(itens.map((x, j) => (j === i ? v : x)));
  const mover = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= itens.length) return;
    const c = [...itens];
    [c[i], c[j]] = [c[j], c[i]];
    onChange(c);
  };
  const acao = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
  return (
    <div className="adm-grupo">
      {itens.map((it, i) => (
        <details className="adm-sub" key={i} open={!campo.fechado}>
          <summary>
            <span>{campo.resumo ? campo.resumo(it) : `Item ${i + 1}`}</span>
            <span className="adm-mini">
              <button type="button" onClick={acao(() => mover(i, -1))} disabled={i === 0} aria-label="Subir">↑</button>
              <button type="button" onClick={acao(() => mover(i, 1))} disabled={i === itens.length - 1} aria-label="Descer">↓</button>
              <button type="button" className="del" onClick={acao(() => onChange(itens.filter((_, j) => j !== i)))} aria-label="Remover">✕</button>
            </span>
          </summary>
          <div className="adm-sub-body">
            <Formulario campos={campo.campos} valor={it} onChange={(v) => set(i, v)} store={store} novo={false} />
          </div>
        </details>
      ))}
      <button type="button" className="adm-btn ghost sm" onClick={() => onChange([...itens, novoVazio(campo.campos)])}>+ Adicionar</button>
    </div>
  );
}

function CampoInput({ campo, valor, onChange, store, item, novo }) {
  const t = campo.tipo;
  if (t === 'bool') {
    return (
      <label className="adm-check wide">
        <input type="checkbox" checked={!!valor} onChange={(e) => onChange(e.target.checked)} />
        <span>{campo.label}</span>
      </label>
    );
  }
  let ctl;
  if (t === 'textarea') ctl = <textarea className="adm-in" rows={campo.linhas || 3} value={valor ?? ''} placeholder={campo.ph} onChange={(e) => onChange(e.target.value)} />;
  else if (t === 'number') ctl = <input className="adm-in" type="number" value={valor ?? ''} placeholder={campo.ph} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />;
  else if (t === 'select') {
    const ops = getOpc(campo, store, item);
    ctl = (
      <select className="adm-in" value={valor ?? ''} onChange={(e) => onChange(e.target.value)}>
        {(campo.vazio || valor === undefined || valor === '') && <option value="">{campo.vazio ? '— nenhum —' : 'Selecione…'}</option>}
        {ops.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    );
  } else if (t === 'lista') ctl = <ListaEditor valor={valor} onChange={onChange} longo={campo.longo} addLabel={campo.addLabel} sugestoes={campo.sugestoes ? campo.sugestoes(store, item) : null} />;
  else if (t === 'grupo') ctl = <GrupoEditor campo={campo} valor={valor} onChange={onChange} store={store} />;
  else ctl = <input className="adm-in" type="text" value={valor ?? ''} placeholder={campo.ph} disabled={campo.somenteNovo && !novo} onChange={(e) => onChange(e.target.value)} />;

  const largo = campo.largo || ['textarea', 'lista', 'grupo'].includes(t);
  return (
    <div className={`adm-field ${largo ? 'wide' : ''}`}>
      <span className="adm-lbl">{campo.label}{campo.obrigatorio && <em> *</em>}</span>
      {ctl}
      {campo.ajuda && <small className="adm-help">{campo.ajuda}</small>}
    </div>
  );
}

function Formulario({ campos, valor, onChange, store, novo }) {
  return (
    <div className="adm-grid">
      {campos.filter((c) => !c.oculto && (!c.mostrarSe || c.mostrarSe(valor))).map((c) => (
        <CampoInput key={c.k} campo={c} valor={valor[c.k]} onChange={(v) => onChange({ ...valor, [c.k]: v })} store={store} item={valor} novo={novo} />
      ))}
    </div>
  );
}

function ImportadorDisciplinas({ store, setCol, aviso }) {
  const [aberto, setAberto] = useState(false);
  const [curso, setCurso] = useState('');
  const [txt, setTxt] = useState('');
  const [substituir, setSubstituir] = useState(false);
  const [chPadrao, setChPadrao] = useState('');
  const cursos = store.d_cursos || [];
  const abrir = () => { setCurso(cursos[0]?.id || ''); setTxt(''); setSubstituir(false); setAberto(true); };
  const importar = () => {
    if (!curso) return aviso('Escolha o curso.');
    const novos = parseLinhas(txt, curso, chPadrao);
    if (!novos.length) return aviso('Cole ao menos uma linha.');
    setCol('d_disciplinas', (atual) => (substituir ? [...atual.filter((d) => d.curso !== curso), ...novos] : [...atual, ...novos]));
    setAberto(false);
    aviso(`${novos.length} disciplina(s) importada(s).`);
  };
  return (
    <>
      <button type="button" className="adm-btn ghost" onClick={abrir}>⬆ Importar em lote</button>
      {aberto && (
        <div className="adm-overlay" role="dialog" aria-modal="true">
          <div className="adm-modal">
            <div className="adm-mh"><h3>Importar disciplinas em lote</h3><button type="button" onClick={() => setAberto(false)} aria-label="Fechar">✕</button></div>
            <div className="adm-mb">
              <div className="adm-grid">
                <div className="adm-field">
                  <span className="adm-lbl">Curso</span>
                  <select className="adm-in" value={curso} onChange={(e) => setCurso(e.target.value)}>{cursos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
                </div>
                <div className="adm-field">
                  <span className="adm-lbl">CH padrão do catálogo</span>
                  <input className="adm-in" type="number" value={chPadrao} onChange={(e) => setChPadrao(e.target.value)} placeholder="72" />
                </div>
                <div className="adm-field wide">
                  <span className="adm-lbl">Linhas</span>
                  <textarea className="adm-in mono" rows={10} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={'1|COMP359|Programação 1|72|O\n4|COMP372|Programação 2|72|O|Estrutura de Dados;Banco de Dados\nCC1941|Cálculo 4|72'} />
                  <small className="adm-help">
                    <b>Fluxo:</b> período|código|nome|ch|tipo|pré-requisitos|correquisitos.<br />
                    <b>Catálogo de eletivas:</b> código|nome|ch (ou só o nome).
                  </small>
                </div>
                <label className="adm-check wide"><input type="checkbox" checked={substituir} onChange={(e) => setSubstituir(e.target.checked)} /><span>Substituir todas as disciplinas atuais deste curso</span></label>
              </div>
            </div>
            <div className="adm-mf">
              <button type="button" className="adm-btn ghost" onClick={() => setAberto(false)}>Cancelar</button>
              <button type="button" className="adm-btn" onClick={importar}>Importar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SingletonEditor({ col, store, setCol }) {
  return (
    <div className="adm-card">
      <Formulario campos={col.campos} valor={store[col.id] || {}} onChange={(v) => setCol(col.id, v)} store={store} novo={false} />
    </div>
  );
}

function ListaColecao({ col, store, setCol, aviso }) {
  const itens = store[col.id] || [];
  const filtrosDef = col.filtros || [];
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState(() => {
    const f = {};
    filtrosDef.forEach((d) => { if (d.semTodos) f[d.k] = d.opcoes(store)[0]?.v || ''; });
    return f;
  });
  const [edit, setEdit] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!edit) return;
    const h = (e) => { if (e.key === 'Escape') setEdit(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [edit]);

  const visiveis = useMemo(() => {
    const q = norm(busca);
    return itens.map((it, idx) => ({ it, idx })).filter(({ it }) =>
      filtrosDef.every((f) => !filtros[f.k] || String(it[f.k]) === String(filtros[f.k])) && (!q || norm(JSON.stringify(it)).includes(q)));
  }, [itens, busca, filtros, col]);

  const mover = (idx, dir) => {
    const pos = visiveis.findIndex((v) => v.idx === idx);
    const alvo = visiveis[pos + dir];
    if (!alvo) return;
    const c = [...itens];
    [c[idx], c[alvo.idx]] = [c[alvo.idx], c[idx]];
    setCol(col.id, c);
  };

  const novo = () => {
    const base = { ...novoVazio(col.campos), ...(col.novo ? col.novo() : {}) };
    base.id = '';
    filtrosDef.forEach((f) => { if (filtros[f.k]) base[f.k] = filtros[f.k]; });
    setErro('');
    setEdit({ idx: -1, item: base, novo: true });
  };
  const editar = (idx) => { setErro(''); setEdit({ idx, item: clone(itens[idx]), novo: false }); };

  const idUnico = (base, ignorar) => {
    let cand = base, n = 2;
    while (itens.some((x, i) => x.id === cand && i !== ignorar)) cand = `${base}-${n++}`;
    return cand;
  };

  const salvar = () => {
    const e = validar(col.campos, edit.item);
    if (e) return setErro(e);
    const item = { ...edit.item };
    if (!item.id) item.id = idUnico(col.slugDe && item[col.slugDe] ? slug(item[col.slugDe]) : uid(), edit.idx);
    else if (itens.some((x, i) => x.id === item.id && i !== edit.idx)) return setErro('Já existe um item com esse ID.');
    setCol(col.id, edit.novo ? [...itens, item] : itens.map((x, i) => (i === edit.idx ? item : x)));
    setEdit(null);
    aviso(edit.novo ? 'Item adicionado (salve para publicar).' : 'Item atualizado (salve para publicar).');
  };

  const duplicar = (idx) => {
    const orig = clone(itens[idx]);
    orig.id = idUnico(`${orig.id}-copia`, -1);
    const c = [...itens];
    c.splice(idx + 1, 0, orig);
    setCol(col.id, c);
    aviso('Item duplicado.');
  };

  const excluir = (idx) => {
    const it = itens[idx];
    for (const r of col.refs || []) {
      const n = (store[r.col] || []).filter((x) => x[r.k] === it.id).length;
      if (n) return window.alert(`Não dá para excluir: ${n} ${r.rot} usam este item. Mude ou exclua esses itens primeiro.`);
    }
    if (!window.confirm(`Excluir "${col.tituloItem(it, store)}"?`)) return;
    setCol(col.id, itens.filter((_, i) => i !== idx));
    aviso('Item excluído (salve para publicar).');
  };

  return (
    <div>
      <div className="adm-toolbar">
        <input className="adm-in busca" type="search" placeholder="Buscar nesta lista…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        {filtrosDef.map((f) => (
          <select key={f.k} className="adm-in filtro" aria-label={f.label} value={filtros[f.k] || ''} onChange={(e) => setFiltros({ ...filtros, [f.k]: e.target.value })}>
            {!f.semTodos && <option value="">{f.label}: todos</option>}
            {f.opcoes(store).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ))}
        <span className="adm-flex" />
        {col.extra === 'importDisc' && <ImportadorDisciplinas store={store} setCol={setCol} aviso={aviso} />}
        <button type="button" className="adm-btn" onClick={novo}>+ {col.rotuloNovo || 'Novo item'}</button>
      </div>

      <p className="adm-count">{visiveis.length === itens.length ? `${itens.length} item(ns)` : `Mostrando ${visiveis.length} de ${itens.length}`}</p>

      {visiveis.length === 0 ? (
        <div className="adm-vazio">Nada por aqui ainda. Use “{col.rotuloNovo || 'Novo item'}” para criar o primeiro.</div>
      ) : (
        <ul className="adm-list">
          {visiveis.map(({ it, idx }, pos) => (
            <li key={it.id || idx} className="adm-row">
              <button type="button" className="adm-row-main" onClick={() => editar(idx)}>
                <b>{col.tituloItem(it, store) || '(sem título)'}</b>
                {col.subItem && <small>{col.subItem(it, store)}</small>}
              </button>
              <div className="adm-mini">
                <button type="button" onClick={() => mover(idx, -1)} disabled={pos === 0} aria-label="Subir" title="Subir">↑</button>
                <button type="button" onClick={() => mover(idx, 1)} disabled={pos === visiveis.length - 1} aria-label="Descer" title="Descer">↓</button>
                <button type="button" onClick={() => duplicar(idx)} aria-label="Duplicar" title="Duplicar">⧉</button>
                <button type="button" onClick={() => editar(idx)} aria-label="Editar" title="Editar">✎</button>
                <button type="button" className="del" onClick={() => excluir(idx)} aria-label="Excluir" title="Excluir">🗑</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {edit && (
        <div className="adm-overlay" role="dialog" aria-modal="true">
          <div className="adm-modal">
            <div className="adm-mh">
              <h3>{edit.novo ? col.rotuloNovo || 'Novo item' : 'Editar item'}</h3>
              <button type="button" onClick={() => setEdit(null)} aria-label="Fechar">✕</button>
            </div>
            <div className="adm-mb">
              <Formulario campos={col.campos} valor={edit.item} onChange={(v) => setEdit({ ...edit, item: v })} store={store} novo={edit.novo} />
            </div>
            <div className="adm-mf">
              {erro && <span className="adm-erro">{erro}</span>}
              <button type="button" className="adm-btn ghost" onClick={() => setEdit(null)}>Cancelar</button>
              <button type="button" className="adm-btn" onClick={salvar}>{edit.novo ? 'Adicionar' : 'Aplicar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ColecaoEditor(props) {
  return props.col.singleton ? <SingletonEditor {...props} /> : <ListaColecao {...props} />;
}

/* ---------------------------------------------------------------------
   APLICATIVO DO PAINEL
   --------------------------------------------------------------------- */
const contar = (col, store) => (col.singleton ? 'configuração' : `${(store[col.id] || []).length} item(ns)`);

export default function PainelAdmin({ onVoltarSite, onLogout }) {
  // O conteúdo vem do back-end (PostgreSQL). Começa com os dados iniciais só para a tela não ficar vazia
  // e fica bloqueado até a carga terminar, para nunca salvar por cima do banco sem ter lido.
  const [estado, setEstado] = useState(() => estadoInicial());
  const [revisao, setRevisao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [sujo, setSujo] = useState(false);
  const [pagina, setPagina] = useState('painel');
  const [colAtiva, setColAtiva] = useState({});
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState('');
  const arquivoRef = useRef(null);
  const toastTimer = useRef(null);

  const aviso = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  };

  const carregar = () => {
    setCarregando(true);
    setErroCarga('');
    apiAdmin.carregar()
      .then(({ revisao: rev, conteudo }) => {
        setEstado({ ...estadoInicial(), ...conteudo });
        setRevisao(rev);
        setSujo(false);
        if (Object.keys(conteudo).length === 0) {
          // banco vazio: o painel mostra os dados originais do site; salvar grava tudo no banco
          setSujo(true);
          aviso('Banco vazio: clique em "Salvar alterações" para gravar os dados iniciais.');
        }
      })
      .catch((e) => {
        if (e.status === 401) { onLogout && onLogout(); return; }
        setErroCarga(e.message || 'Não foi possível carregar o conteúdo.');
      })
      .finally(() => setCarregando(false));
  };
  useEffect(() => { carregar(); }, []);

  const setCol = (id, valor) => {
    setEstado((p) => ({ ...p, [id]: typeof valor === 'function' ? valor(p[id]) : valor }));
    setSujo(true);
  };

  useEffect(() => {
    if (!sujo) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [sujo]);

  const salvarTudo = async () => {
    if (salvando) return;
    setSalvando(true);
    try {
      const r = await apiAdmin.salvar(estado, revisao);
      setEstado({ ...estadoInicial(), ...r.conteudo }); // ids definitivos vindos do banco
      setRevisao(r.revisao);
      setSujo(false);
      aviso('Alterações salvas.');
    } catch (e) {
      if (e.status === 401) { aviso('Sua sessão expirou. Entre novamente.'); onLogout && onLogout(); }
      else aviso(e.message || 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };
  const exportar = () => {
    const blob = new Blob([JSON.stringify(estado, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gic-conteudo.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importar = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const obj = JSON.parse(String(r.result));
        if (typeof obj !== 'object' || Array.isArray(obj)) throw new Error('formato');
        setEstado({ ...estadoInicial(), ...obj });
        setSujo(true);
        aviso('Arquivo importado. Revise e salve.');
      } catch (err) { aviso('Arquivo inválido: use um JSON exportado por este painel.'); }
    };
    r.readAsText(f);
    e.target.value = '';
  };
  const restaurar = () => {
    if (!window.confirm('Restaurar todo o conteúdo para os dados originais do site?')) return;
    setEstado(estadoInicial());
    setSujo(true);
    aviso('Dados originais restaurados. Salve para confirmar.');
  };

  const ir = (id) => { setPagina(id); setMenu(false); window.scrollTo(0, 0); };
  const pg = PAGINAS.find((p) => p.id === pagina);
  const cols = pg ? pg.cols.map((id) => COLECOES[id]) : [];
  const colId = pg ? colAtiva[pagina] || cols[0].id : null;
  const col = colId ? COLECOES[colId] : null;

  if (carregando || erroCarga) {
    return (
      <div className="adm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, textAlign: 'center' }}>
        <style>{CSS}</style>
        {carregando ? (
          <p>Carregando conteúdo…</p>
        ) : (
          <div style={{ maxWidth: 420 }}>
            <p><strong>Não foi possível carregar o conteúdo.</strong></p>
            <p>{erroCarga}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="adm-btn" onClick={carregar}>Tentar novamente</button>
              {onLogout && <button type="button" className="adm-btn" onClick={onLogout}>Sair da conta</button>}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="adm">
      <style>{CSS}</style>

      <header className="adm-top">
        <button type="button" className="adm-burger" onClick={() => setMenu(!menu)} aria-label="Abrir menu">☰</button>
        <div className="adm-brand">
          <span className="adm-brand-badge">GIC</span>
          <h1>Painel Administrativo</h1>
        </div>
        <span className="adm-flex" />
        <span className={`adm-status ${sujo ? 'dirty' : ''}`}>{sujo ? '● Alterações não salvas' : '✓ Tudo salvo'}</span>
        <button type="button" className="adm-btn save-top" disabled={!sujo || salvando} onClick={salvarTudo}>{salvando ? 'Salvando…' : 'Salvar alterações'}</button>
      </header>

      <div className={`adm-scrim ${menu ? 'open' : ''}`} onClick={() => setMenu(false)} />
      <aside className={`adm-side ${menu ? 'open' : ''}`}>
        <nav>
          <button type="button" className={pagina === 'painel' ? 'on' : ''} onClick={() => ir('painel')}><i>📊</i> Visão geral</button>
          <p className="adm-sec">Páginas do site</p>
          {PAGINAS.map((p) => (
            <button type="button" key={p.id} className={pagina === p.id ? 'on' : ''} onClick={() => ir(p.id)}><i>{p.icone}</i> {p.nome}</button>
          ))}
          <p className="adm-sec">Dados</p>
          <button type="button" onClick={exportar}><i>⬇</i> Exportar JSON</button>
          <button type="button" onClick={() => arquivoRef.current?.click()}><i>⬆</i> Importar JSON</button>
          <button type="button" onClick={restaurar}><i>↺</i> Restaurar padrão</button>
          <input ref={arquivoRef} type="file" accept="application/json" hidden onChange={importar} />

          <p className="adm-sec">Navegação</p>
          {onVoltarSite && (
            <button type="button" onClick={onVoltarSite}><i>←</i> Voltar ao GIC</button>
          )}
          {onLogout && (
            <button type="button" onClick={onLogout}><i>🚪</i> Sair da conta</button>
          )}
        </nav>
      </aside>

      <main className="adm-main">
        {pagina === 'painel' && (
          <>
            <div className="adm-hero">
              <h2>Visão geral do GIC</h2>
              <p>Escolha uma seção para editar textos, cards, matriz curricular, oportunidades e a base de conhecimento da IA.</p>
            </div>
            <div className="adm-cards">
              {PAGINAS.map((p) => (
                <section className="adm-dash" key={p.id}>
                  <h3><i>{p.icone}</i> {p.nome}</h3>
                  <p>{p.descr}</p>
                  <ul>
                    {p.cols.map((id) => (
                      <li key={id}>
                        <button type="button" onClick={() => { setColAtiva({ ...colAtiva, [p.id]: id }); ir(p.id); }}>
                          <span>{COLECOES[id].titulo}</span><small>{contar(COLECOES[id], estado)}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <p className="adm-note">As alterações são gravadas no banco de dados ao clicar em "Salvar alterações".</p>
          </>
        )}

        {pg && (
          <>
            <div className="adm-head"><h2><i>{pg.icone}</i> {pg.nome}</h2><p>{pg.descr}</p></div>
            <div className="adm-tabs" role="tablist">
              {cols.map((c) => (
                <button type="button" role="tab" key={c.id} aria-selected={c.id === colId} onClick={() => setColAtiva({ ...colAtiva, [pagina]: c.id })}>{c.titulo}</button>
              ))}
            </div>
            <section className="adm-panel">
              <p className="adm-descr">{col.descr}</p>
              <ColecaoEditor key={col.id} col={col} store={estado} setCol={setCol} aviso={aviso} />
            </section>
          </>
        )}
      </main>

      {toast && <div className="adm-toast" role="status">{toast}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------------
   CSS (identidade GIC)
   --------------------------------------------------------------------- */
const CSS = `
.adm {
  --blue: #0056b3;
  --blue-d: #004085;
  --blue-deep: #003a7d;
  --amber: #e0a82e;
  --amber-bg: #fff7e0;
  --bg: #f4f4f9;
  --ink: #1d2b44;
  --mu: #5a6578;
  --ln: #d9dfea;
  --red: #c62828;
  --ok: #2e7d32;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Montserrat', Arial, sans-serif;
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: 64px 1fr;
  box-sizing: border-box;
}
.adm *, .adm *::before, .adm *::after { box-sizing: border-box; }
.adm button { font-family: inherit; }
.adm-flex { flex: 1; }

.adm-top {
  grid-column: 1 / -1;
  position: sticky;
  top: 0;
  z-index: 30;
  height: 64px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 24px;
  background: var(--blue-d);
  color: #fff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
}
.adm-brand { display: flex; align-items: center; gap: 10px; }
.adm-brand-badge {
  background: var(--amber);
  color: var(--ink);
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 0.06em;
  padding: 5px 10px;
  border-radius: 8px;
}
.adm-top h1 { margin: 0; font-size: 17px; font-weight: 800; color: #fff; letter-spacing: -0.01em; }
.adm-burger {
  display: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  width: 40px;
  height: 40px;
  font-size: 20px;
  cursor: pointer;
  color: #fff;
}
.adm-status {
  font-size: 12.5px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #d7f5de;
}
.adm-status.dirty { background: var(--amber-bg); color: #6b4b00; }

.adm-side {
  background: var(--blue-deep);
  color: #fff;
  padding: 18px 12px;
  height: 100%;
  overflow-y: auto;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}
.adm-side nav { display: grid; gap: 4px; }
.adm-side button {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  padding: 11px 12px;
  border: 0;
  border-left: 3px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #dce9f9;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.adm-side button i { font-style: normal; width: 22px; text-align: center; }
.adm-side button:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
.adm-side button.on {
  background: #fff;
  color: var(--blue-d);
  border-left-color: var(--amber);
  font-weight: 700;
}
.adm-sec {
  margin: 16px 12px 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9cc0ec;
}
.adm-scrim { display: none; }

.adm-main {
  padding: 26px 32px 80px;
  min-width: 0;
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.adm-hero {
  color: #fff;
  padding: 26px 28px;
  border-radius: 16px;
  margin-bottom: 22px;
  background:
    radial-gradient(rgba(255, 255, 255, 0.1) 1.2px, transparent 1.4px) 0 0 / 24px 24px,
    linear-gradient(115deg, var(--blue-deep) 0%, var(--blue) 58%, #1a76d2 100%);
  box-shadow: 0 4px 14px rgba(0, 64, 133, 0.18);
}
.adm-hero h2 { margin: 0 0 6px; font-size: 24px; font-weight: 800; color: #fff; letter-spacing: -0.01em; }
.adm-hero p { margin: 0; color: rgba(255, 255, 255, 0.92); font-size: 14.5px; line-height: 1.55; max-width: 68ch; }

.adm-head h2 { margin: 0 0 4px; font-size: 24px; font-weight: 800; color: var(--blue-d); display: flex; gap: 10px; align-items: center; }
.adm-head h2 i { font-style: normal; }
.adm-head p { margin: 0 0 18px; color: var(--mu); font-size: 14.5px; line-height: 1.55; }
.adm-note {
  margin-top: 22px;
  padding: 14px 16px;
  border: 1px solid #f0d58a;
  border-left: 5px solid var(--amber);
  background: var(--amber-bg);
  border-radius: 10px;
  font-size: 13.5px;
  color: #5b4a12;
  line-height: 1.55;
}

.adm-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 16px; }
.adm-dash {
  background: #fff;
  border: 1px solid var(--ln);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}
.adm-dash h3 { margin: 0 0 4px; font-size: 17px; font-weight: 800; color: var(--blue-d); display: flex; gap: 8px; align-items: center; }
.adm-dash h3 i { font-style: normal; }
.adm-dash > p { margin: 0 0 14px; color: var(--mu); font-size: 13.5px; line-height: 1.5; }
.adm-dash ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.adm-dash li button {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--ln);
  border-left: 4px solid var(--blue);
  border-radius: 10px;
  background: #fafbfd;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  transition: background 0.15s, border-color 0.15s;
}
.adm-dash li button:hover { border-color: var(--blue); background: #eef4fb; }
.adm-dash li small { color: var(--mu); font-weight: 500; white-space: nowrap; }

.adm-tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 14px; scrollbar-width: none; }
.adm-tabs::-webkit-scrollbar { display: none; }
.adm-tabs button {
  flex: none;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 999px;
  border: 2px solid var(--ln);
  background: #fff;
  color: var(--blue);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.adm-tabs button:hover { border-color: var(--blue); background: #eef4fb; }
.adm-tabs button[aria-selected="true"] { background: var(--blue); border-color: var(--blue); color: #fff; }

.adm-panel {
  background: #fff;
  border: 1px solid var(--ln);
  border-radius: 16px;
  padding: 22px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}
.adm-descr { margin: 0 0 16px; color: var(--mu); font-size: 14px; line-height: 1.55; }
.adm-card { border: 1px solid var(--ln); border-radius: 12px; padding: 18px; background: #fafbfd; }

.adm-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 20px;
  border-radius: 999px;
  border: 2px solid var(--blue);
  background: var(--blue);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
  white-space: nowrap;
}
.adm-btn:hover:not(:disabled) { background: var(--blue-d); border-color: var(--blue-d); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 64, 133, 0.2); }
.adm-btn:disabled { opacity: 0.45; cursor: default; }
.adm-btn.save-top { background: #fff; border-color: #fff; color: var(--blue-d); min-height: 38px; padding: 0 18px; }
.adm-btn.save-top:hover:not(:disabled) { background: var(--amber); border-color: var(--amber); color: var(--ink); }
.adm-btn.ghost { background: #fff; color: var(--blue); }
.adm-btn.ghost:hover:not(:disabled) { background: #eaf2fc; border-color: var(--blue); box-shadow: none; }
.adm-btn.sm { min-height: 34px; padding: 0 14px; font-size: 13px; }
.adm button:focus-visible, .adm .adm-in:focus-visible, .adm summary:focus-visible { outline: 3px solid var(--amber); outline-offset: 2px; }

.adm-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.adm-in {
  width: 100%;
  font: 500 14.5px 'Montserrat', Arial, sans-serif;
  color: var(--ink);
  background: #fff;
  border: 1px solid var(--ln);
  border-radius: 10px;
  padding: 10px 12px;
  min-height: 44px;
  transition: border-color 0.15s;
}
.adm-in:focus { border-color: var(--blue); outline: none; }
.adm-in:disabled { background: #eef1f6; color: var(--mu); }
textarea.adm-in { resize: vertical; line-height: 1.5; }
.adm-in.mono { font-family: Consolas, monospace; font-size: 13.5px; }
.adm-in.busca { flex: 1 1 220px; width: auto; max-width: 340px; border-radius: 999px; padding: 0 16px; }
.adm-in.filtro { width: auto; min-width: 160px; }
.adm-count { margin: 14px 0 8px; font-size: 13px; color: var(--mu); }

.adm-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.adm-row {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--ln);
  border-left: 4px solid var(--blue);
  border-radius: 12px;
  background: #fff;
  padding: 4px 10px 4px 0;
  transition: border-color 0.15s, background 0.15s;
}
.adm-row:hover { border-color: var(--blue); background: #fafcff; }
.adm-row-main { flex: 1; min-width: 0; text-align: left; background: transparent; border: 0; padding: 10px 14px; cursor: pointer; display: grid; gap: 2px; color: var(--ink); }
.adm-row-main b { font-size: 14.5px; line-height: 1.35; overflow-wrap: anywhere; }
.adm-row-main small { color: var(--mu); font-size: 12.5px; }
.adm-vazio { padding: 26px; text-align: center; color: var(--mu); border: 1px dashed var(--ln); border-radius: 12px; background: #fafbfd; font-size: 14px; }

.adm-mini { display: inline-flex; gap: 4px; flex: none; }
.adm-mini button { width: 34px; height: 34px; border: 1px solid var(--ln); background: #fff; border-radius: 8px; cursor: pointer; font-size: 15px; color: var(--blue-d); padding: 0; }
.adm-mini button:hover:not(:disabled) { border-color: var(--blue); background: #eef4fb; }
.adm-mini button:disabled { opacity: 0.35; cursor: default; }
.adm-mini button.del:hover:not(:disabled) { border-color: var(--red); background: #fdeaea; color: var(--red); }

.adm-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
.adm-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.adm-field.wide, .adm-check.wide { grid-column: 1 / -1; }
.adm-lbl { font-size: 13px; font-weight: 700; color: var(--blue-d); }
.adm-lbl em { color: var(--red); font-style: normal; }
.adm-help { color: var(--mu); font-size: 12.5px; line-height: 1.5; }
.adm-check { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
.adm-check input { width: 20px; height: 20px; accent-color: var(--blue); }

.adm-lista, .adm-grupo { display: grid; gap: 8px; justify-items: start; width: 100%; }
.adm-lrow { display: flex; gap: 8px; width: 100%; align-items: flex-start; }
.adm-sub { width: 100%; border: 1px solid var(--ln); border-left: 4px solid var(--amber); border-radius: 10px; background: #fafbfd; }
.adm-sub > summary { list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 10px 8px 14px; font-size: 14px; font-weight: 700; color: var(--blue-d); }
.adm-sub > summary::-webkit-details-marker { display: none; }
.adm-sub > summary > span:first-child { overflow-wrap: anywhere; }
.adm-sub-body { padding: 6px 14px 16px; }

.adm-overlay { position: fixed; inset: 0; z-index: 60; background: rgba(0, 30, 70, 0.55); backdrop-filter: blur(2px); display: flex; align-items: flex-start; justify-content: center; padding: 4vh 14px; overflow-y: auto; }
.adm-modal { width: min(760px, 100%); background: #fff; border-radius: 16px; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35); }
.adm-mh { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 16px 20px; border-bottom: 1px solid var(--ln); }
.adm-mh h3 { margin: 0; font-size: 18px; font-weight: 800; color: var(--blue-d); }
.adm-mh button { width: 36px; height: 36px; border: 0; border-radius: 50%; background: #eaf2fc; color: var(--blue); font-size: 16px; cursor: pointer; }
.adm-mb { padding: 18px 20px; }
.adm-mf { position: sticky; bottom: 0; display: flex; justify-content: flex-end; align-items: center; gap: 10px; flex-wrap: wrap; padding: 14px 20px; border-top: 1px solid var(--ln); background: #fff; border-radius: 0 0 16px 16px; }
.adm-erro { margin-right: auto; color: var(--red); font-size: 13.5px; font-weight: 600; }

.adm-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 80; background: var(--blue-d); color: #fff; padding: 12px 20px; border-radius: 999px; font-size: 14px; font-weight: 600; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25); max-width: calc(100vw - 28px); }

@media (max-width: 900px) {
  .adm { grid-template-columns: 1fr; height: auto; overflow: visible; }
  .adm-burger { display: inline-flex; align-items: center; justify-content: center; }
  .adm-top { padding: 0 14px; gap: 10px; }
  .adm-top h1 { font-size: 15px; }
  .adm-status { display: none; }
  .adm-side { position: fixed; top: 64px; left: 0; bottom: 0; height: calc(100vh - 64px); width: 270px; z-index: 50; transform: translateX(-100%); transition: transform 0.2s; }
  .adm-side.open { transform: none; }
  .adm-scrim.open { display: block; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 45; }
  .adm-main { padding: 20px 14px 80px; height: auto; overflow: visible; }
  .adm-hero { padding: 20px; }
  .adm-panel { padding: 14px; }
  .adm-grid { grid-template-columns: 1fr; }
  .adm-in.busca { max-width: none; flex-basis: 100%; }
  .adm-in.filtro { flex: 1 1 140px; }
  .adm-mb { padding: 14px; }
}
@media (prefers-reduced-motion: reduce) { .adm-side, .adm-btn { transition: none; } }
`;