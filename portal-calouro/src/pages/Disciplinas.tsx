// @ts-nocheck
import { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useConteudo } from '../context/ConteudoContext';

/* =====================================================================
   DADOS PADRÃO DOS CURSOS (FALLBACK)
   ===================================================================== */
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

const CC_CAT = `CC1941|Cálculo 4|72
CC1942|Cálculo Numérico|72
CC1943|Circuitos Digitais|72
CC1944|Circuitos Impressos|72
CC1945|Fundamentos de Libras|72
CC1946|Geometria Computacional|72
CC1947|Pesquisa Operacional|72
CC1948|Programação para Sistemas Embarcados|72
CC1949|Projeto de Sistemas Embarcados|72
CC1950|Tópicos em Arquitetura de Computadores|72
CC1951|Tópicos em Banco de Dados|72
CC1952|Tópicos em Computação Científica|72
CC1953|Tópicos em Computação Paralela|72
CC1954|Tópicos em Computação Visual|72
CC1955|Tópicos em Comunicação de Dados|72
CC1956|Tópicos em Desenvolvimento de Sistemas|72
CC1957|Tópicos em Engenharia de Software|72
CC1958|Tópicos em Humanidades|72
CC1959|Tópicos em Informática na Educação|72
CC1960|Tópicos em Inteligência Artificial|72
CC1961|Tópicos em Linguagens de Programação|72
CC1962|Tópicos em Programação|72
CC1963|Tópicos em Redes de Computadores|72
CC1964|Tópicos em Sistemas de Computação|72
CC1965|Tópicos em Sistemas de Informação|72
CC1966|Tópicos em Sistemas Distribuídos|72
CC1967|Tópicos em Sistemas Inteligentes|72
CC1968|Tópicos em Software Básico|72
COMP405|Tópicos em Ciência da Computação 1|72
COMP406|Tópicos em Ciência da Computação 2|72
COMP407|Tópicos em Ciência da Computação 3|72
COMP409|Tópicos em Matemática para Computação 1|72
COMP410|Tópicos em Matemática para Computação 2|72
COMP411|Tópicos em Matemática para Computação 3|72
COMP412|Tópicos em Física para Computação 1|72
COMP413|Tópicos em Física para Computação 2|72
COMP414|Tópicos em Física para Computação 3|72`;

const CC_ENF = [
  ["Computação Visual", ["Cálculo 3", "Aprendizagem de Máquina", "Redes Neurais e Aprendizado Profundo", "Processamento Digital de Imagens", "Visão Computacional"]],
  ["Sistemas Inteligentes", ["Cálculo 3", "Aprendizagem de Máquina", "Redes Neurais e Aprendizado Profundo", "Computação Evolucionária", "Ciência de Dados"]],
  ["Sistemas de Computação", ["Cálculo 3", "Sistemas Digitais", "FPGA", "Sistemas Embarcados", "Microcontroladores e Aplicações"]],
  ["Sistemas de Informação", ["Conceitos de Linguagem de Programação", "Sistemas Distribuídos", "Interação Homem-Máquina", "Gerência de Projeto", "Segurança de Sistemas Computacionais"]]
];

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

const EC_CAT = `ECOM038|Conceitos de Linguagens de Programação|60
ECOM043|Sistemas de Eventos Discretos|60
ECOM045|Compiladores|60
ECOM047|Paradigmas de Ling. de Programação|30
ECOM049|Gerência de Projetos|60
ECOM050|Laboratório de Programação|30
ECOM052|Fundamentos de Libras|45
ECOM053|Desenvolvimento Baseado em Ontologias|40
ECOM054|Processamento Digital de Sinais|60
ECOM055|Tópicos Especiais em Circuitos Elétricos|30
ECOM056|Laboratório de Estrutura de Dados|30
ECOM065|Tópicos em Sistemas Distribuídos: Paradigmas Modernos|30
ECOM066|Laboratório de Eletrônica|30
ECOM067|Laboratórios de Circuitos Elétricos|30
ECOM068|Laboratório de Eletrônica|30
ECOM069|Tópicos em Sistemas Distribuídos - Algoritmos Distribuídos I|30
ECOM070|Tópicos em Sistemas Distribuídos - Algoritmos Distribuídos II|30
ECOM071|Redes de Petri|60
ECOM072|Introdução à Teoria da Informação|30
ECOM073|Inteligência Artificial 2|30
ECOM074|Desenvolvimento com Qt/C++|30
ECOM075|Programação Avançada III|60
ECOM076|Programação Avançada I|60
ECOM077|Redes de Petri|60
ECOM078|Tópicos Esp. Banco de Dados: Ger. de Dados Semiestruturados|30
ECOM079|Escalabilidade de Software na Internet: Fund. e Tecnologias|30
ECOM080|Dados Abertos Conectados (Linked Open Data)|30
ECOM081|Introdução à Administração|60
ECOM082|Interação Homem-Máquina|30
ECOM083|Matemática Financeira|60
ECOM084|Estatística Econômica|60
ECOM085|Economia Industrial 1|60
ECOM086|Circuitos Impressos|60
ECOM087|Projeto de Sistemas Embarcados|60
ECOM088|Projeto e Aplicações em Redes de Sensores|60
ECOM089|Inteligência Artificial 2|60
ECOM090|Fenômenos de Transporte 1|60
ECOM091|Pesquisa Operacional|60
ECOM092|Gestão de Processos de Negócio|60
ECOM093|Aprendizado de Máquina|60
ECOM094|Fundamentos em Informática Médica e Telemedicina|60
ECOM095|Sistemas de Tempo Real e Aplicações|60
ECOM096|Residência em Hardware|60
ECOM097|Gestão Financeira e Orçamentária 1|60
ECOM098|Fundamentos em Análise de Imagens Médicas|60
ECOM099|Energia Solar Fotovoltaica|30
ECOM100|Visão Computacional|60
ECOM101|Engenharia de Sistemas Embarcados|30
ECOM102|Internet das Coisas|80
ECOM103|Teoria da Computação|30
ECOM104|Internet e Web|30
ECOM105|Comunicações Digitais|60
ECOM106|Introdução à Robótica Móvel|60
ECOM107|Fundamentos de Matemática|60
ECOM108|Banco de Dados II|30
ECOM109|Fundamentos em Informática Médica e Telemedicina|30
ECOM110|Programação para Sistemas Embarcados|60
ECOM111|Redes de Computadores 2|30
ECOM112|Projeto de Sistemas Digitais com FPGA|30
ECOM113|Navegação em Robótica Móvel|60
ECOM114|Economia para Engenharia|60
ECOM115|Computação Gráfica|60
ECOM116|Projeto de Computação Natural|60
ECOM117|Tópicos em Energia Solar Fotovoltaica|60
ECOM120|Projeto de Sistemas de Controle|60
ECOM121|Introdução à Identificação de Sistemas|60
ECOM122|Exploração e Mineração de Dados|60
ECOM123|Laboratório de Arquitetura de Computadores|30
ECOM124|Comunicações Ópticas|30
ECOM125|Tóp. em Eng. de Software: Projetando Linhas de Prod. de Software|30
ECOM127|Administração|30
ECOM128|Equações Diferenciais Ordinárias|30
ECOM129|Tópicos em Sistemas Operacionais|30
ECOM130|Programação em Python|60
ECOM131|Tópicos Avançados em C|60
ECOM132|Tópicos Avançados em Circuitos Digitais|60
ECOM133|Tópicos em Linguagens Computacionais - C++|60
ECOM134|Tópicos em Lógica Aplicada à Programação|60
ECOM135|Espanhol Intermediário|60
ECOM136|Programação com MATLAB|60
ECOM137|Tópicos em Inteligência Artificial: Lab. de Inteligência Artificial|30
ECOM138|Tópicos em Sistemas Tutores Inteligentes|30
ECOM139|Gamificação|60
ECOM140|Navegação de Robôs|60
ECOM141|Comunicação Digital sem Fio|60
ECOM142|Síntese de Áudio|60
ECOM143|Tecnologias de Multimídia|60
ECOM144|Autenticação Biométrica: Fundamentos e Tecnologias|60
ECOM145|Reconhecimento de Fala|60
ECOM146|Sistema de Informação|60
ECOM147|Experimentando e Comparando Técnicas Inteligentes|60`;

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

const IA_CAT = `Análise e Previsão de Séries Temporais
Inovações em Saúde com Inteligência Artificial
Inteligência Artificial Explicável
Large Language Model Operations
Machine Learning Operations
Modelos de Fundação e Modelos de Visão e Linguagem
Agentes Autônomos
Computação Quântica
Aprendizagem de Máquina Quântica
Aplicações de Aprendizagem de Máquina
Meta-aprendizagem
Computação Evolucionária
Inteligência Artificial Coletiva
Processamento de Imagem
Otimização
Ética e Aspectos Jurídicos da Computação
Data warehousing
Gestão de Negócios
Criatividade Computacional
Sistemas Digitais
Organização e Arquitetura de Computadores
Sistemas Operacionais
Programação Funcional
Informática e Sociedade
Compiladores
Visualização de Dados
Análise e Mineração de Redes Complexas
Bancos de Dados Não-Convencionais
Tecnologia, Diversidade, Equidade e Inclusão
Análise e Especificação Avançada de Requisitos de Sistemas
Arquitetura de Sistemas
Programação com Novas Tecnologias
Fundamentos de Teste de Software
Métodos Formais
Teste de Software Avançado
Transformação de Código e Modelos
Seminários em Engenharia de Software
Recuperação da Informação
Processamento de Dados em Larga Escala
Governança de Dados
Gerência de Configuração de Software, Serviços e Sistemas
Engenharia de Requisitos
Introdução a Libras
Língua Inglesa Instrumental 1`;

const EQUIVALENCIAS_PADRAO = {
  "Programação 1": "CCOM002",
  "Lógica para Computação": "CCOM014",
  "Computação, Sociedade e Ética": "CCOM047, CCOM046",
  "Matemática Discreta": "CCOM010",
  "Cálculo Diferencial e Integral": "CCOM004, CCOM011",
  "Estrutura de Dados": "CCOM009",
  "Banco de Dados": "CCOM021",
  "Organização e Arquitetura de Computadores": "CCOM026",
  "Geometria Analítica": "CCOM005",
  "Redes de Computadores": "CCOM032",
  "Teoria dos Grafos": "CCOM030, CCOM039",
  "Probabilidade e Estatística": "CCOM022",
  "Álgebra Linear": "CCOM012",
  "Programação 2": "CCOM016",
  "Programação 3": "CCOM007, CCOM006",
  "Projeto e Análise de Algoritmos": "CCOM020",
  "Teoria da Computação": "CCOM008, CCOM015",
  "Sistemas Operacionais": "CCOM034",
  "Compiladores": "CCOM035",
  "Inteligência Artificial": "CCOM033",
  "Computação Gráfica": "CCOM041",
  "Projeto e Desenvolvimento de Sistemas": "CCOM003, CCOM023, CCOM028, CCOM031, CCOM036, CCOM042",
  "Metodologia de Pesquisa e Trabalho Individual": "CCOM001, CCOM013",
  "Noções de Direito": "CCOM045",
  "Cálculo 3": "CCOM025",
  "Conceitos de Linguagem de Programação": "CCOM027",
  "Sistemas Distribuídos": "CCOM044",
  "Interação Homem-Máquina": "CCOM043, CCOM046",
  "Gerência de Projeto": "CCOM048"
};

const TIPOS = { O: "Obrigatória", E: "Eletiva", X: "Extensão", N: "Ênfase", S: "Estágio" };
const ORD_TIPO = { O: 0, S: 1, X: 2, N: 3, E: 4 };

let uidCounter = 0;
const getUid = () => `uid_${uidCounter++}`;

function parse(txt, def) {
  return txt.trim().split("\n").map(l => {
    const p = l.split("|"), per = p[0].trim(), pre = (p[5] || "").trim();
    return {
      uid: getUid(),
      per: isNaN(+per) ? per : +per, cod: p[1], nome: p[2], ch: p[3] ? +p[3] : null, tipo: p[4],
      pre: pre === "" ? def : pre === "?" ? null : pre === "-" ? [] : (pre === "@5" || pre === "var") ? pre : pre.split(";"),
      co: (p[6] || "").split(";").filter(Boolean),
      equiv: ""
    };
  });
}
function catalogo(txt, ch) {
  return txt.trim().split("\n").map(l => {
    const p = l.split("|");
    return p.length > 1
      ? { uid: getUid(), per: "C", cod: p[0], nome: p[1], ch: +p[2], tipo: "E", pre: null, co: [], equiv: "" }
      : { uid: getUid(), per: "C", cod: "—", nome: p[0], ch: ch, tipo: "E", pre: null, co: [], equiv: "" };
  });
}
function slots(lista, per, n, ch) {
  for (let i = 0; i < n; i++) lista.push({ uid: getUid(), per, cod: "—", nome: "Eletiva", ch, tipo: "E", pre: "var", co: [], equiv: "" });
}

const CC = parse(CC_TXT, []);
[[2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 3], [8, 5]].forEach(([p, n]) => slots(CC, p, n, 72));
CC.push(...catalogo(CC_CAT, 72));

const EC = parse(EC_TXT, null);
EC.push(...catalogo(EC_CAT, null));

const IA = parse(IA_TXT, null);
[[3, 1], [4, 1], [5, 1], [6, 1], [7, 4], [8, 4], [9, 4]].forEach(([p, n]) => slots(IA, p, n, 72));
IA.push(...catalogo(IA_CAT, 72));

const CURSOS_PADRAO = {
  cc: {
    nome: "Ciência da Computação", un: "h", disc: CC, enfases: CC_ENF,
    resumo: [["Duração", "8 a 12 semestres"], ["Carga horária", "2.952 h em disciplinas"], ["Obrigatórias", "24 disciplinas (2.016 h)"], ["Eletivas", "mínimo de 576 h"], ["Extensão", "5 práticas (375 h)"]],
    fluxo: "Os semestres seguem da esquerda para a direita. As eletivas do fluxo podem ser escolhidas entre as ênfases e o catálogo de eletivas abaixo.",
    fonte: "Fonte: PPC do curso de Ciência da Computação (2019, versão final). Pré-requisitos e correquisitos conforme as ementas do PPC.",
    notas: [
      "Cada ênfase reúne 5 disciplinas. Segundo o PPC, quem cumprir as obrigatórias do curso e três eletivas da mesma ênfase recebe o certificado de conclusão de ênfase.",
      "O PPC usa o código COMP393 para Redes Neurais e Aprendizado Profundo e também para FPGA; por isso o código de FPGA aparece em branco aqui.",
      "As práticas de extensão não têm ementa no PPC, então seus pré-requisitos aparecem como \"não consta\"."
    ]
  },
  ec: {
    nome: "Engenharia de Computação", un: "h/a", disc: EC, enfases: null,
    resumo: [["Duração", "10 semestres"], ["Carga horária", "3.650 h no total"], ["Obrigatórias", "2.550 h (3.060 h/a)"], ["Eletivas", "650 h (780 h/a)"], ["Estágio e TCC", "160 h e 90 h"]],
    fluxo: "Os semestres seguem da esquerda para a direita. O 7º, o 9º e o 10º períodos reservam espaço para eletivas, e o estágio supervisionado é no 9º.",
    fonte: "Fonte: PPC do curso de Engenharia de Computação (versão atual). As cargas horárias estão em horas-aula, como no PPC.",
    notas: [
      "O PPC não define pré-requisitos formais, apenas diz que pode haver quando for o caso. Por isso o fluxo mostra só a ordem por período.",
      "O TCC (90 h) e as atividades complementares (200 h) não são disciplinas e por isso não aparecem no fluxo.",
      "O PPC repete algumas eletivas com códigos diferentes (por exemplo Redes de Petri e Inteligência Artificial 2); mantive como estão no documento."
    ]
  },
  ia: {
    nome: "Inteligência Artificial", un: "h", disc: IA, enfases: null,
    resumo: [["Duração", "9 a 14 semestres"], ["Obrigatórias", "27 componentes"], ["Eletivas de perfil", "mínimo de 660 h"], ["Atividades complementares", "240 h"], ["Extensão", "mínimo de 320 h"]],
    fluxo: "Os semestres seguem da esquerda para a direita, conforme o Mapa de Disciplinas por Semestre do PPC. A partir do 3º período cada semestre inclui eletivas.",
    fonte: "Fonte: PPC provisório do curso de Inteligência Artificial. Por ser provisório, o documento ainda tem lacunas e pode mudar.",
    notas: [
      "Os códigos das disciplinas ainda estão como \"IAXXX\" no PPC, por isso aparecem em branco aqui.",
      "O PPC deixa em branco os pré-requisitos da maioria das disciplinas. Aparecem apenas os que estão preenchidos.",
      "Há divergências dentro do PPC: o texto cita Cálculo 1 no 1º período e Metodologia Científica no 9º, enquanto o Mapa de Disciplinas por Semestre põe Cálculo 1 no 2º e Metodologia no 8º. Segui o Mapa.",
      "A carga horária do TCC aparece como 60 h, 72 h e 180 h em partes diferentes do PPC, por isso fica em branco."
    ]
  }
};

const norm = s => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const perKey = p => typeof p === "number" ? p : p === "N" ? 90 : 95;
const perLabel = p => typeof p === "number" ? p + "º" : p === "N" ? "Ênfase" : "Catálogo";
const chTxt = (c, d) => d.ch ? d.ch + " " + c.un : "—";

function preNames(c, d) {
  if (Array.isArray(d.pre)) return d.pre;
  if (d.pre === "@5") return c.disc.filter(x => x.tipo === "O" && typeof x.per === "number" && x.per <= 5).map(x => x.nome);
  return [];
}

function preTxt(d) {
  if (d.pre === null) return "Não consta no PPC";
  if (d.pre === "@5") return "Todas as obrigatórias do 1º ao 5º período";
  if (d.pre === "var") return "Conforme a disciplina escolhida";
  return d.pre.length ? d.pre.join("; ") : "Nenhum";
}

const reach = (g, n, s = new Set()) => { (g[n] || []).forEach(x => { if (!s.has(x)) { s.add(x); reach(g, x, s); } }); return s; };

export default function Disciplinas() {
  const { conteudo } = useConteudo();

  // Mescla cursos e disciplinas do banco com os padrões
  const CURSOS = useMemo(() => {
    const cursosBanco = Array.isArray(conteudo.d_cursos) ? conteudo.d_cursos : [];
    const discsBanco = Array.isArray(conteudo.d_disciplinas) ? conteudo.d_disciplinas : [];

    if (cursosBanco.length === 0) return CURSOS_PADRAO;

    const mapa = {};
    cursosBanco.forEach((cb) => {
      const discsDoCurso = discsBanco
        .filter((d) => d.curso === cb.id)
        .map((d, idx) => {
          const perNum = Number(d.per);
          const perVal = !isNaN(perNum) && String(d.per).trim() !== '' ? perNum : d.per;
          let preVal = [];
          if (d.preModo === 'naoconsta') preVal = null;
          else if (d.preModo === 'ate5') preVal = '@5';
          else if (d.preModo === 'var') preVal = 'var';
          else if (d.preModo === 'nenhum') preVal = [];
          else preVal = Array.isArray(d.pre) ? d.pre : [];

          return {
            uid: d.id || `${cb.id}_${idx}`,
            per: perVal,
            cod: d.cod || '—',
            nome: d.nome,
            ch: d.ch !== '' && d.ch !== null && d.ch !== undefined ? Number(d.ch) : null,
            tipo: d.tipo || 'O',
            pre: preVal,
            co: Array.isArray(d.co) ? d.co : [],
            equiv: d.equiv || '',
          };
        });

      const padrao = CURSOS_PADRAO[cb.id];
      mapa[cb.id] = {
        nome: cb.nome || padrao?.nome || cb.id.toUpperCase(),
        un: cb.un || padrao?.un || 'h',
        disc: discsDoCurso.length > 0 ? discsDoCurso : (padrao?.disc || []),
        enfases: Array.isArray(cb.enfases) && cb.enfases.length > 0
          ? cb.enfases.map((e) => Array.isArray(e) ? e : [e.nome, e.disciplinas || []])
          : (padrao?.enfases || null),
        resumo: Array.isArray(cb.resumo) && cb.resumo.length > 0
          ? cb.resumo.map((r) => Array.isArray(r) ? r : [r.label, r.valor])
          : (padrao?.resumo || []),
        fluxo: cb.fluxo || padrao?.fluxo || '',
        fonte: cb.fonte || padrao?.fonte || '',
        notas: Array.isArray(cb.notas) && cb.notas.length > 0 ? cb.notas : (padrao?.notas || []),
      };
    });

    return Object.keys(mapa).length > 0 ? mapa : CURSOS_PADRAO;
  }, [conteudo.d_cursos, conteudo.d_disciplinas]);

  const [cid, setCid] = useState('cc');
  const [sel, setSel] = useState(null);
  const [fp, setFp] = useState('all');
  const [ft, setFt] = useState('all');
  const [fq, setFq] = useState('');
  const [expandirRelatorio, setExpandirRelatorio] = useState(false);
  const [concluidasUid, setConcluidasUid] = useState(new Set());

  useEffect(() => {
    const keys = Object.keys(CURSOS);
    if (keys.length > 0 && !CURSOS[cid]) {
      setCid(keys[0]);
    }
  }, [CURSOS, cid]);

  const curso = CURSOS[cid] || Object.values(CURSOS)[0];

  const concluidasNomes = useMemo(() => {
    return new Set(curso.disc.filter(d => concluidasUid.has(d.uid)).map(d => d.nome));
  }, [concluidasUid, curso]);

  const { PRE, SUC, flowDisc, byPeriodo } = useMemo(() => {
    const flow = curso.disc.filter(d => typeof d.per === "number");
    const names = new Set(flow.map(d => d.nome));
    const pre = {};
    const suc = {};
    flow.forEach(d => {
      const pr = preNames(curso, d).filter(x => names.has(x));
      pre[d.nome] = pr;
      pr.forEach(p => (suc[p] = suc[p] || []).push(d.nome));
    });
    const byPer = {};
    flow.forEach(d => (byPer[d.per] = byPer[d.per] || []).push(d));
    return { PRE: pre, SUC: suc, flowDisc: flow, byPeriodo: byPer };
  }, [curso]);

  const { liberadas, bloqueadas, concluidasList, horasEletivas, horasExtensao } = useMemo(() => {
    const lib = [];
    const bloq = [];
    const conc = [];
    let chEletivas = 0;
    let chExtensao = 0;
    
    curso.disc.forEach(d => {
      if (concluidasUid.has(d.uid)) {
        conc.push(d);
        if (d.tipo === 'E' || d.tipo === 'N') chEletivas += (d.ch || 0);
        if (d.tipo === 'X') chExtensao += (d.ch || 0);
        return;
      }
      
      if (d.tipo === 'E' || d.tipo === 'N' || d.tipo === 'S') return;

      const preReqs = PRE[d.nome] || [];
      const temTudo = preReqs.every(pr => concluidasNomes.has(pr));

      if (temTudo) lib.push(d);
      else bloq.push(d);
    });
    
    lib.sort((a, b) => perKey(a.per) - perKey(b.per));
    bloq.sort((a, b) => perKey(a.per) - perKey(b.per));
    conc.sort((a, b) => perKey(a.per) - perKey(b.per));
    
    return { liberadas: lib, bloqueadas: bloq, concluidasList: conc, horasEletivas: chEletivas, horasExtensao: chExtensao };
  }, [curso, concluidasUid, concluidasNomes, PRE]);

  const toggleConcluida = (uid) => {
    setConcluidasUid(prev => {
      const novoSet = new Set(prev);
      if (novoSet.has(uid)) novoSet.delete(uid);
      else novoSet.add(uid);
      return novoSet;
    });
  };

  const baixarRelatorioPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(0, 86, 179);
    doc.text(`Relatório de Matrícula - ${curso.nome}`, 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(51, 51, 51);
    doc.text(`Disciplinas Concluídas: ${concluidasList.length}`, 14, 30);
    doc.text(`Horas Cumpridas de Eletivas: ${horasEletivas} h`, 14, 36);
    doc.text(`Horas Cumpridas de Extensão/ACEs: ${horasExtensao} h`, 14, 42);

    let currentY = 50;

    if (concluidasList.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [['Período', 'Código', 'Disciplinas Concluídas']],
        body: concluidasList.map(d => [`${d.per}º`, d.cod !== '—' ? d.cod : '', d.nome]),
        headStyles: { fillColor: [51, 51, 51] } 
      });
      currentY = doc.lastAutoTable.finalY + 15;
    }

    if (liberadas.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [['Período', 'Código', 'Disciplinas Liberadas (Pode cursar)']],
        body: liberadas.map(d => [`${d.per}º`, d.cod !== '—' ? d.cod : '', d.nome]),
        headStyles: { fillColor: [46, 125, 50] } 
      });
      currentY = doc.lastAutoTable.finalY + 15;
    }

    if (bloqueadas.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [['Período', 'Código', 'Disciplinas Bloqueadas', 'Pré-requisitos em falta']],
        body: bloqueadas.map(d => {
          const faltam = (PRE[d.nome] || []).filter(p => !concluidasNomes.has(p));
          return [`${d.per}º`, d.cod !== '—' ? d.cod : '', d.nome, faltam.join(', ')];
        }),
        headStyles: { fillColor: [183, 28, 28] } 
      });
    }

    doc.save(`GIC_Simulador_Matricula_${cid.toUpperCase()}.pdf`);
  };

  const { chain, up, dn } = useMemo(() => {
    const upSet = sel ? reach(PRE, sel) : new Set();
    const dnSet = sel ? reach(SUC, sel) : new Set();
    return { up: upSet, dn: dnSet, chain: new Set([...upSet, ...dnSet, sel]) };
  }, [sel, PRE, SUC]);

  const pick = (d) => {
    const key = d.tipo === "E" ? null : d.nome;
    setSel(prev => prev === key && key ? null : key);
  };

  const getInfoText = () => {
    if (!sel) return null;
    const d = flowDisc.find(x => x.nome === sel);
    if (!d) return null;
    const head = [d.cod !== "—" ? d.cod + " · " : "", d.ch ? d.ch + " " + curso.un + " · " : "", TIPOS[d.tipo]].join("");
    if (d.tipo === "E") return <><br/>Eletiva: você escolhe a disciplina no catálogo de eletivas.</>;
    
    let txt = "";
    if (d.pre === null) txt += "O PPC não informa pré-requisitos para esta disciplina. ";
    else txt += "Pré-requisitos: " + preTxt(d) + ". ";
    if (d.co.length) txt += "Correquisito: " + d.co.join("; ") + ". ";
    
    const lib = SUC[d.nome] || [];
    if (d.pre !== null || lib.length) txt += "Libera: " + (lib.length ? lib.join("; ") : "nenhuma disciplina do fluxo") + ".";
    txt += " Em azul, a cadeia de pré-requisitos; em verde, o que ela libera.";
    return <><b>{d.nome}</b> ({head}). {txt}</>;
  };

  const periodos = useMemo(() => [...new Set(curso.disc.map(d => d.per))].sort((a, b) => perKey(a) - perKey(b)), [curso]);
  const tipos = useMemo(() => [...new Set(curso.disc.map(d => d.tipo))].sort((a, b) => ORD_TIPO[a] - ORD_TIPO[b]), [curso]);
  const linhasTabela = useMemo(() => {
    const q = norm(fq);
    return curso.disc
      .filter(d => (fp === "all" || String(d.per) === fp) && (ft === "all" || d.tipo === ft) && (!q || norm(d.nome + " " + d.cod).includes(q)))
      .sort((a, b) => perKey(a.per) - perKey(b.per) || ORD_TIPO[a.tipo] - ORD_TIPO[b.tipo]);
  }, [curso, fp, ft, fq]);

  const enfasesDe = (d) => {
    if (!curso.enfases || d.tipo !== "N") return "";
    return "Ênfase: " + curso.enfases.filter(e => e[1].includes(d.nome)).map(e => e[0]).join(", ");
  };

  return (
    <div className="page-disciplinas">
      <div className="page-hero">
          <div className="wrap">
              <h1>Matriz Curricular</h1>
              <p>Escolha o curso para ver o fluxo padrão dos alunos. Na tabela ao fundo, marque as disciplinas concluídas para gerar o seu relatório de matrícula!</p>
              <div className="course-pick" role="group" aria-label="Escolha o curso">
                {Object.keys(CURSOS).map(k => (
                  <button key={k} type="button" aria-pressed={cid === k} onClick={() => { setCid(k); setSel(null); setConcluidasUid(new Set()); setExpandirRelatorio(false); }}>
                    {CURSOS[k].nome}
                  </button>
                ))}
              </div>
          </div>
      </div>

      <main className="disc-main">
          <div className="summary">
            {curso.resumo.map(([label, valor], i) => (
              <div className="stat" key={i}>
                <small>{label}</small>
                <b>{valor}</b>
              </div>
            ))}
          </div>

          <section>
              <h2>Fluxo padrão</h2>
              <p className="lead">{curso.fluxo}</p>
              <ul className="legend" aria-label="Legenda">
                  <li><i></i> Obrigatória</li>
                  <li><i className="x"></i> Extensão</li>
                  <li><i className="e"></i> Eletiva</li>
                  {curso.disc.some(d => d.tipo === "S") && (<li><i className="s"></i> <span>Estágio</span></li>)}
                  <li><i className="ok" style={{borderColor: '#2e7d32', backgroundColor: '#e8f5e9'}}></i> Concluída</li>
              </ul>
              
              <div className="tw" role="region" aria-label="Fluxo padrão por período" tabIndex="0">
                <div className="fx">
                  {Object.keys(byPeriodo).map(Number).sort((a, b) => a - b).map(p => (
                    <div className="fc" key={p}>
                      <h3>{p}º período</h3>
                      {byPeriodo[p].sort((a, b) => ORD_TIPO[a.tipo] - ORD_TIPO[b.tipo]).map((d, i) => {
                        const isSel = sel === d.nome;
                        const isDim = sel && !chain.has(d.nome);
                        const isPre = sel && up.has(d.nome);
                        const isLib = sel && dn.has(d.nome);
                        const isConc = concluidasUid.has(d.uid); 
                        
                        let cls = "nd";
                        if (d.tipo === "X") cls += " x";
                        if (d.tipo === "E") cls += " e";
                        if (d.tipo === "S") cls += " s";

                        if (isDim) cls += " dim";
                        if (isSel) cls += " sel";
                        if (isPre) cls += " pre";
                        if (isLib) cls += " lib";
                        if (isConc) cls += " concluida"; 

                        return (
                          <button key={i} type="button" className={cls} onClick={() => pick(d)}>
                            <small>{[d.cod !== "—" ? d.cod : "", d.ch ? d.ch + " " + curso.un : ""].filter(Boolean).join(" | ") || "\u00a0"}</small>
                            {d.nome}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <p className="info" aria-live="polite">
                {!sel ? "Toque em uma disciplina para ver detalhes, pré-requisitos e o que ela libera." : getInfoText()}
              </p>
          </section>

          {curso.enfases && (
            <section id="enfases">
                <h2>Ênfases</h2>
                <p className="lead">O curso permite se especializar em uma área. Cada ênfase tem 5 disciplinas próprias.</p>
                <div className="grid">
                  {curso.enfases.map(([nome, lista], i) => (
                    <div className="card" key={i}>
                      <h3>{nome}</h3>
                      <ul>
                        {lista.map((nm, j) => {
                          const d = curso.disc.find(x => x.tipo === "N" && x.nome === nm);
                          return (
                            <li key={j}>
                              {nm}
                              {d && <small>{[d.cod !== "—" ? d.cod : "", d.ch + " h", "Pré-requisito: " + preTxt(d)].filter(Boolean).join(" | ")}</small>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
            </section>
          )}

          <section>
              <h2>Simulador de Matrícula e Lista de Disciplinas</h2>
              
              <div className="note" style={{ borderLeftColor: '#0056b3', backgroundColor: '#eef4fb' }}>
                  <strong>Como usar o Simulador:</strong><br/>
1. Na tabela abaixo, marque a caixa de seleção (✓) nas disciplinas, ACEs ou Eletivas que você já concluiu.<br/>
2. O sistema calcula automaticamente o que foi liberado e o progresso da sua carga horária.<br/>
3. Clique no botão azul para baixar o relatório PDF, ou no botão cinza para o ver na tela.
              </div>

              <div className="summary" style={{ marginTop: '15px', marginBottom: '25px' }}>
                <div className="stat" style={{ borderColor: '#333' }}>
                  <small>Disciplinas Concluídas</small>
                  <b style={{ color: '#333' }}>{concluidasList.length}</b>
                </div>
                <div className="stat" style={{ borderColor: '#2e7d32' }}>
                  <small>Liberadas (Pode Cursar)</small>
                  <b style={{ color: '#2e7d32' }}>{liberadas.length}</b>
                </div>
                <div className="stat" style={{ borderColor: '#c62828' }}>
                  <small>Bloqueadas</small>
                  <b style={{ color: '#c62828' }}>{bloqueadas.length}</b>
                </div>
                <div className="stat" style={{ borderColor: '#e0a82e' }}>
                  <small>Progresso: Eletivas</small>
                  <b style={{ color: '#e0a82e' }}>{horasEletivas} h</b>
                </div>
                <div className="stat" style={{ borderColor: '#0056b3' }}>
                  <small>Progresso: Extensão/ACEs</small>
                  <b style={{ color: '#0056b3' }}>{horasExtensao} h</b>
                </div>
              </div>

              <div style={{ marginBottom: '30px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button className="btn-simulador" onClick={baixarRelatorioPDF}>
                  📥 Baixar Relatório (PDF)
                </button>
                <button className="btn-simulador-alt" onClick={() => setExpandirRelatorio(!expandirRelatorio)}>
                  {expandirRelatorio ? "Ocultar Relatório na Tela" : "👁️ Ver Relatório na Tela"}
                </button>
              </div>

              {expandirRelatorio && (
                <div className="onscreen-report">
                  <div className="report-box ok">
                    <h4>✅ Concluídas ({concluidasList.length})</h4>
                    <ul>{concluidasList.length ? concluidasList.map(d => <li key={d.uid}>{d.per}º - {d.nome}</li>) : <li>Nenhuma marcada.</li>}</ul>
                  </div>
                  <div className="report-box lib">
                    <h4>🔓 Liberadas ({liberadas.length})</h4>
                    <ul>{liberadas.length ? liberadas.map(d => <li key={d.uid}>{d.per}º - {d.nome}</li>) : <li>Nenhuma liberada.</li>}</ul>
                  </div>
                  <div className="report-box bloq">
                    <h4>🔒 Bloqueadas ({bloqueadas.length})</h4>
                    <ul>{bloqueadas.length ? bloqueadas.map(d => {
                      const faltam = (PRE[d.nome] || []).filter(p => !concluidasNomes.has(p));
                      return <li key={d.uid}>{d.per}º - {d.nome} <span>(Falta: {faltam.join(', ')})</span></li>;
                    }) : <li>Nenhuma bloqueada.</li>}</ul>
                  </div>
                </div>
              )}

              <p className="lead">Todas as disciplinas do curso: obrigatórias, extensão, eletivas do fluxo e o catálogo de eletivas que podem ser ofertadas.</p>
              
              <div className="filters">
                  <div>
                    <label htmlFor="fp">Período</label>
                    <select id="fp" value={fp} onChange={e => setFp(e.target.value)}>
                      <option value="all">Todos</option>
                      {periodos.map(p => (
                        <option key={p} value={String(p)}>{typeof p === "number" ? p + "º período" : p === "N" ? "Ênfases" : "Catálogo de eletivas"}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ft">Tipo</label>
                    <select id="ft" value={ft} onChange={e => setFt(e.target.value)}>
                      <option value="all">Todos</option>
                      {tipos.map(t => <option key={t} value={t}>{TIPOS[t]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="fq">Buscar</label>
                    <input id="fq" type="search" placeholder="Nome ou código" value={fq} onChange={e => setFq(e.target.value)} />
                  </div>
              </div>
              <p className="count" aria-live="polite">Mostrando {linhasTabela.length} de {curso.disc.length} disciplinas.</p>
              <div className="tbl-wrap">
                  <table>
                      <thead>
                        <tr>
                           <th>Status</th>
                           <th>Período</th><th>Código</th><th>Disciplina</th><th>CH</th><th>Tipo</th><th>Equivalências</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linhasTabela.length === 0 ? (
                          <tr><td colSpan={7}>Nenhuma disciplina encontrada.</td></tr>
                        ) : (
                          linhasTabela.map((d) => {
                            const ef = enfasesDe(d);
                            return (
                              <tr key={d.uid} className={concluidasUid.has(d.uid) ? 'tr-concluida' : ''}>
                                <td style={{textAlign: 'center', verticalAlign: 'middle'}}>
                                  <input 
                                    type="checkbox" 
                                    className="chk-concluida"
                                    checked={concluidasUid.has(d.uid)} 
                                    onChange={() => toggleConcluida(d.uid)} 
                                  />
                                </td>
                                <td>{perLabel(d.per)}</td>
                                <td>{d.cod}</td>
                                <td>{d.nome} {ef && <small>{ef}</small>}</td>
                                <td>{chTxt(curso, d)}</td>
                                <td><span className={"tag" + (d.tipo === "O" ? " o" : "")}>{TIPOS[d.tipo]}</span></td>
                                <td>{d.equiv || EQUIVALENCIAS_PADRAO[d.nome] || "-"}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                  </table>
              </div>
          </section>

          <section>
              <h2>Sobre estes dados</h2>
              <p className="note">{curso.fonte}</p>
              <div>
                {curso.notas.map((nota, i) => <p className="note" key={i}>{nota}</p>)}
              </div>
              <p className="note">Esta página é um guia. Para decisões de matrícula, confirme sempre com a coordenação e a secretaria do curso.</p>
          </section>
      </main>
    </div>
  );
}