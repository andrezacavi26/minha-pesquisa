// Definição dos formulários de cada coleção. Usado para criar e editar de forma genérica.
import { store } from './store.js';
import { todayISO } from './ui.js';

export const STAGES = ['Desenho', 'Coleta', 'Análise', 'Escrita'];
export const STAGE_STATUS = { todo: 'A fazer', doing: 'Em andamento', done: 'Concluído' };

export const PAPER_STATUS = [
  ['ideia', 'Ideia'],
  ['escrita', 'Em escrita'],
  ['submetido', 'Submetido'],
  ['revisao', 'Em revisão'],
  ['aceito', 'Aceito'],
  ['publicado', 'Publicado'],
];

export const ASSESSMENT_KINDS = [
  ['prova', 'Prova'],
  ['trabalho', 'Trabalho'],
  ['apresentacao', 'Apresentação / seminário'],
  ['outro', 'Outra atividade'],
];
export const kindLabel = (k) => ({ prova: 'Prova', trabalho: 'Trabalho', apresentacao: 'Apresentação', outro: 'Atividade' })[k] || 'Atividade';

export const LEVELS = [
  ['graduacao', 'Graduação (IC / TCC)'],
  ['mestrado', 'Mestrado'],
  ['doutorado', 'Doutorado'],
];

const experimentOptions = () => [
  ['', '— nenhum —'],
  ...store.list('experiments').map((e) => [e.id, e.title]),
];

const ethicsOptions = () => [
  ['', '— nenhum —'],
  ...store.list('ethics').map((e) => [e.id, `${e.kind} ${e.number}`]),
];

export const SCHEMAS = {
  milestones: {
    label: 'prazo',
    fields: () => [
      { name: 'title', label: 'O que é', required: true, placeholder: 'Ex.: Qualificação', full: true },
      { name: 'date', label: 'Data', type: 'date', required: true },
      {
        name: 'kind',
        label: 'Tipo',
        type: 'select',
        options: [
          ['marco', 'Marco do curso'],
          ['relatorio', 'Relatório / fomento'],
          ['bolsa', 'Bolsa'],
          ['evento', 'Congresso / evento'],
          ['submissao', 'Submissão de artigo'],
          ['outro', 'Outro'],
        ],
      },
      { name: 'notes', label: 'Observações', type: 'textarea', rows: 2 },
      { name: 'done', label: 'Já concluído', type: 'checkbox' },
    ],
  },
  experiments: {
    label: 'experimento',
    fields: () => [
      { name: 'title', label: 'Nome do experimento', required: true, full: true, placeholder: 'Ex.: Avaliação da barreira intestinal' },
      { name: 'objective', label: 'Objetivo / hipótese', type: 'textarea', rows: 3 },
      { name: 'groups', label: 'Grupos experimentais', placeholder: 'Ex.: Controle, Estresse, Estresse + tratamento' },
      { name: 'n', label: 'n por grupo', type: 'number' },
      { name: 'ethicsId', label: 'Protocolo de ética vinculado', type: 'select', options: ethicsOptions() },
      { name: 'projectId', label: 'Projeto', type: 'select', options: [['', '— nenhum —'], ...store.list('projects').map((p) => [p.id, p.title.length > 60 ? p.title.slice(0, 59) + '…' : p.title])] },
      { name: 'deadline', label: 'Meta de conclusão', type: 'date' },
      { name: 'notes', label: 'Notas', type: 'textarea', rows: 2 },
    ],
  },
  logs: {
    label: 'registro de bancada',
    fields: () => [
      { name: 'date', label: 'Data', type: 'date', required: true, default: todayISO() },
      { name: 'experimentId', label: 'Experimento', type: 'select', options: experimentOptions() },
      { name: 'did', label: 'O que foi feito', type: 'textarea', required: true, rows: 3 },
      { name: 'issues', label: 'O que deu errado / observações', type: 'textarea', rows: 2 },
      { name: 'next', label: 'Próximo passo', full: true },
    ],
  },
  protocols: {
    label: 'protocolo (POP)',
    fields: () => [
      { name: 'title', label: 'Nome do protocolo', required: true, full: true, placeholder: 'Ex.: Western blot de claudina-1' },
      { name: 'version', label: 'Versão', placeholder: 'v1.0' },
      { name: 'date', label: 'Data da versão', type: 'date' },
      { name: 'experimentId', label: 'Experimento', type: 'select', options: experimentOptions() },
      { name: 'url', label: 'Link do arquivo', type: 'url', placeholder: 'https://drive…' },
      { name: 'changes', label: 'O que mudou nesta versão', type: 'textarea', rows: 2 },
    ],
  },
  ethics: {
    label: 'protocolo de ética',
    fields: () => [
      { name: 'kind', label: 'Comitê', type: 'select', options: [['CEUA', 'CEUA (animais)'], ['CEP', 'CEP (humanos)']] },
      { name: 'number', label: 'Número do protocolo', required: true },
      { name: 'title', label: 'Título', full: true },
      { name: 'validUntil', label: 'Validade', type: 'date' },
      { name: 'approved', label: 'Animais / participantes aprovados', type: 'number' },
      { name: 'used', label: 'Já utilizados', type: 'number' },
    ],
  },
  meetings: {
    label: 'reunião',
    fields: () => [
      { name: 'date', label: 'Data', type: 'date', required: true },
      { name: 'with', label: 'Com quem', placeholder: 'Orientador(a)' },
      { name: 'agenda', label: 'Pauta (o que levar)', type: 'textarea', rows: 3 },
      { name: 'decisions', label: 'Decisões / o que foi combinado', type: 'textarea', rows: 3 },
      {
        name: 'newTasks',
        label: 'Tarefas que saíram da reunião',
        type: 'textarea',
        rows: 3,
        hint: 'Uma por linha. Elas aparecem na sua lista de tarefas.',
      },
    ],
  },
  tasks: {
    label: 'tarefa',
    fields: () => [
      { name: 'title', label: 'Tarefa', required: true, full: true },
      { name: 'due', label: 'Prazo', type: 'date' },
      { name: 'experimentId', label: 'Experimento', type: 'select', options: experimentOptions() },
      { name: 'done', label: 'Concluída', type: 'checkbox' },
    ],
  },
  courses: {
    label: 'disciplina',
    fields: () => [
      { name: 'name', label: 'Disciplina', required: true, full: true },
      {
        name: 'type',
        label: 'Tipo',
        type: 'select',
        options: [
          ['obrigatoria', 'Obrigatória'],
          ['optativa', 'Optativa'],
        ],
      },
      { name: 'credits', label: 'Créditos', type: 'number', required: true },
      { name: 'term', label: 'Semestre', placeholder: '2026/1' },
      {
        name: 'status',
        label: 'Situação',
        type: 'select',
        options: [
          ['cursando', 'Cursando'],
          ['planejada', 'Vou cursar'],
          ['concluida', 'Concluída'],
        ],
      },
      { name: 'grade', label: 'Conceito / nota final', placeholder: 'A' },
      { name: 'professor', label: 'Professor(a)' },
      { name: 'schedule', label: 'Dia e horário', placeholder: 'Ex.: Terças, 14h–17h' },
      { name: 'room', label: 'Sala / local', placeholder: 'Ex.: Sala 204, bloco B' },
      { name: 'url', label: 'Link da ementa', type: 'url', full: true },
    ],
  },
  articles: {
    label: 'artigo',
    fields: () => [
      { name: 'title', label: 'Título', required: true, full: true },
      { name: 'authors', label: 'Autores', full: true, placeholder: 'Sobrenome, Nome; Sobrenome, Nome', hint: 'Separe os autores com ponto e vírgula, no formato Sobrenome, Nome.' },
      { name: 'journal', label: 'Revista' },
      { name: 'year', label: 'Ano', type: 'number' },
      { name: 'volume', label: 'Volume' },
      { name: 'issue', label: 'Número' },
      { name: 'pages', label: 'Páginas', placeholder: '120-123' },
      { name: 'doi', label: 'DOI', placeholder: '10.1590/...' },
      { name: 'status', label: 'Leitura', type: 'select', options: [['ler', 'Quero ler'], ['lendo', 'Lendo'], ['lido', 'Lido']] },
      { name: 'cite', label: '★ Quero citar na tese / artigo', type: 'checkbox' },
      { name: 'experimentId', label: 'Experimento relacionado', type: 'select', options: [['', '— nenhum —'], ...store.list('experiments').map((e) => [e.id, e.title])] },
      { name: 'courseId', label: 'Disciplina relacionada', type: 'select', options: [['', '— nenhuma —'], ...store.list('courses').map((c) => [c.id, c.name])] },
      { name: 'tags', label: 'Etiquetas', full: true, placeholder: 'Ex.: junções firmes, revisão, método', hint: 'Separe com vírgulas.' },
      { name: 'notes', label: 'Fichamento', type: 'textarea', rows: 7, placeholder: 'Objetivo:\nMétodos (modelo, n, protocolo):\nPrincipais resultados:\nLimitações:\nComo uso na minha pesquisa:' },
      { name: 'abstract', label: 'Resumo', type: 'textarea', rows: 4 },
    ],
  },
  assessments: {
    label: 'atividade',
    fields: () => [
      { name: 'kind', label: 'Tipo', type: 'select', options: ASSESSMENT_KINDS },
      { name: 'courseId', label: 'Disciplina', type: 'select', options: store.list('courses').map((c) => [c.id, c.name]), required: true },
      { name: 'title', label: 'Título', required: true, full: true, placeholder: 'Ex.: Prova 1, Seminário sobre barreira intestinal' },
      { name: 'date', label: 'Data de entrega / realização', type: 'date' },
      { name: 'weight', label: 'Peso (%)', type: 'number', placeholder: 'Ex.: 30' },
      { name: 'grade', label: 'Nota (0 a 10)', type: 'number', placeholder: 'Ex.: 8,5' },
      { name: 'description', label: 'O que pedir / conteúdo', type: 'textarea', rows: 3 },
      { name: 'url', label: 'Link (enunciado, arquivo, slides)', type: 'url', full: true },
      { name: 'done', label: 'Concluída / entregue', type: 'checkbox', full: true },
    ],
  },
  certificates: {
    label: 'certificado',
    fields: () => [
      { name: 'title', label: 'Título', required: true, full: true },
      {
        name: 'kind',
        label: 'Tipo',
        type: 'select',
        options: [
          ['congresso', 'Participação em congresso'],
          ['apresentacao', 'Apresentação de trabalho'],
          ['curso', 'Curso / minicurso'],
          ['banca', 'Banca'],
          ['monitoria', 'Monitoria / docência'],
          ['premio', 'Prêmio'],
          ['outro', 'Outro'],
        ],
      },
      { name: 'date', label: 'Data', type: 'date' },
      { name: 'hours', label: 'Carga horária (h)', type: 'number' },
      { name: 'url', label: 'Link do arquivo', type: 'url' },
    ],
  },
  congresses: {
    label: 'congresso',
    fields: () => [
      { name: 'event', label: 'Evento', required: true, full: true },
      { name: 'place', label: 'Local' },
      { name: 'date', label: 'Data', type: 'date' },
      { name: 'work', label: 'Título do trabalho', full: true },
      { name: 'format', label: 'Formato', type: 'select', options: [['poster', 'Pôster / banner'], ['oral', 'Apresentação oral'], ['ouvinte', 'Ouvinte']] },
      { name: 'abstractDeadline', label: 'Prazo do resumo', type: 'date' },
      { name: 'url', label: 'Link (banner, resumo)', type: 'url' },
      { name: 'cost', label: 'Gastos para reembolso (R$)', type: 'number' },
    ],
  },
  papers: {
    label: 'artigo',
    fields: () => [
      { name: 'title', label: 'Título', required: true, full: true },
      { name: 'journal', label: 'Revista' },
      { name: 'status', label: 'Situação', type: 'select', options: PAPER_STATUS },
      { name: 'authors', label: 'Autores', full: true, placeholder: 'Sobrenome A, Sobrenome B…' },
      { name: 'year', label: 'Ano', type: 'number' },
      { name: 'doi', label: 'DOI' },
      { name: 'qualis', label: 'Qualis / JCR' },
    ],
  },
  links: {
    label: 'item',
    fields: () => [
      { name: 'title', label: 'Título', required: true, full: true },
      { name: 'category', label: 'Categoria', type: 'select', options: [['modelo', 'Modelo / template'], ['artigo', 'Artigo de referência'], ['link', 'Link útil']] },
      { name: 'url', label: 'Link', type: 'url', full: true },
      { name: 'notes', label: 'Por que é útil', type: 'textarea', rows: 2 },
    ],
  },
};

export const PROFILE_FIELDS = [
  { name: 'name', label: 'Seu nome', required: true },
  { name: 'level', label: 'Nível', type: 'select', options: LEVELS },
  { name: 'institution', label: 'Instituição (universidade / faculdade)', placeholder: 'Ex.: Universidade Federal de Minas Gerais (UFMG)', full: true },
  { name: 'campus', label: 'Campus / unidade', placeholder: 'Ex.: Campus Pampulha, Faculdade de Medicina' },
  { name: 'program', label: 'Programa / curso', placeholder: 'Ex.: Doutorado em Patologia' },
  { name: 'project', label: 'Título curto do projeto', required: true, full: true, placeholder: 'Ex.: Estresse e barreira intestinal' },
  { name: 'advisor', label: 'Orientador(a)' },
  { name: 'coadvisor', label: 'Coorientador(a)' },
  { name: 'start', label: 'Ingresso', type: 'date', required: true },
  { name: 'end', label: 'Previsão de defesa / conclusão', type: 'date', required: true },
  { name: 'requiredMandatory', label: 'Créditos exigidos em obrigatórias', type: 'number' },
  { name: 'requiredElective', label: 'Créditos exigidos em optativas', type: 'number' },
  { name: 'scholarship', label: 'Bolsa (agência)', placeholder: 'CAPES, CNPq, FAPESP…' },
  { name: 'scholarshipEnd', label: 'Fim da bolsa', type: 'date' },
];

export function defaultDuration(level) {
  return level === 'doutorado' ? 4 : level === 'mestrado' ? 2 : 1;
}
