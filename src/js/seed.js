// Dados de exemplo (datas relativas a hoje, para a demonstração sempre parecer atual).
import { uid } from './store.js';

function d(offsetDays) {
  const x = new Date();
  x.setDate(x.getDate() + offsetDays);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}

export function demoData() {
  const e1 = uid(), e2 = uid(), e3 = uid(), ceua = uid();
  const now = new Date().toISOString();
  const S = (o) => ({ id: uid(), createdAt: now, ...o });
  return {
    version: 1,
    profile: {
      name: 'Marina',
      level: 'doutorado',
      program: 'Doutorado em Patologia',
      project: 'Estresse e barreira intestinal',
      advisor: 'Profa. Dra. Helena Costa',
      coadvisor: '',
      start: d(-610),
      end: d(-610 + 1460),
      requiredCredits: 32,
      scholarship: 'CAPES',
      scholarshipEnd: d(-610 + 1460),
    },
    ethics: [
      { id: ceua, createdAt: now, kind: 'CEUA', number: '112/2024', title: 'Efeitos do estresse crônico na permeabilidade intestinal', validUntil: d(48), approved: 60, used: 38 },
    ],
    experiments: [
      {
        id: e1, createdAt: now, title: 'Avaliação da barreira intestinal',
        objective: 'Avaliar a permeabilidade intestinal (FITC-dextrana) e a expressão de proteínas de junção após estresse crônico.',
        groups: 'Controle, Estresse, Estresse + probiótico', n: 10, ethicsId: ceua, deadline: d(75),
        stages: { Desenho: 'done', Coleta: 'doing', Análise: 'todo', Escrita: 'todo' },
      },
      {
        id: e2, createdAt: now, title: 'Perfil inflamatório no cólon',
        objective: 'Quantificar citocinas (IL-1β, TNF-α, IL-10) por ELISA.',
        groups: 'Controle, Estresse', n: 8, ethicsId: ceua, deadline: d(160),
        stages: { Desenho: 'done', Coleta: 'todo', Análise: 'todo', Escrita: 'todo' },
      },
      {
        id: e3, createdAt: now, title: 'Revisão sistemática',
        objective: 'Revisão sobre eixo HPA e permeabilidade intestinal.',
        groups: '', n: '', ethicsId: '', deadline: d(-20),
        stages: { Desenho: 'done', Coleta: 'done', Análise: 'done', Escrita: 'doing' },
      },
    ],
    logs: [
      S({ date: d(-1), experimentId: e1, did: 'Coleta de íleo e cólon do lote 2 (n=6). Fixação em formalina 10%.', issues: 'Um animal com peso abaixo do esperado; registrado.', next: 'Processar lâminas H&E' }),
      S({ date: d(-3), experimentId: e1, did: 'Gavagem de FITC-dextrana e leitura no fluorímetro.', issues: 'Curva padrão com R² de 0,97; repetir a diluição mais alta.', next: 'Refazer curva' }),
    ],
    protocols: [
      S({ title: 'Permeabilidade intestinal por FITC-dextrana', version: 'v2.1', date: d(-40), experimentId: e1, url: '', changes: 'Jejum ajustado para 4 h.' }),
      S({ title: 'Western blot de claudina-1 e ocludina', version: 'v1.0', date: d(-90), experimentId: e1, url: '', changes: '' }),
    ],
    meetings: [
      S({ date: d(-6), with: 'Profa. Helena', agenda: 'Resultados preliminares de permeabilidade.', decisions: 'Aumentar n do grupo estresse para 10. Priorizar a revisão sistemática para submissão.', newTasks: '' }),
      S({ date: d(5), with: 'Profa. Helena', agenda: 'Mostrar a curva refeita\nDiscutir revista para a revisão', decisions: '', newTasks: '' }),
    ],
    tasks: [
      S({ title: 'Refazer curva padrão FITC', due: d(1), experimentId: e1, done: false, origin: 'Diário de bancada' }),
      S({ title: 'Enviar versão da revisão para a orientadora', due: d(3), experimentId: e3, done: false, origin: 'Reunião' }),
      S({ title: 'Pedir emenda ao CEUA (aumento de n)', due: d(-2), experimentId: '', done: false, origin: 'Reunião' }),
      S({ title: 'Cortar lâminas do lote 1', due: d(-8), experimentId: e1, done: true, origin: '' }),
    ],
    milestones: [
      S({ title: 'Exame de qualificação', date: d(120), kind: 'marco', notes: 'Banca a definir', done: false }),
      S({ title: 'Proficiência em inglês', date: d(-300), kind: 'marco', notes: '', done: true }),
      S({ title: 'Relatório anual CAPES', date: d(22), kind: 'relatorio', notes: 'Pela Plataforma Sucupira', done: false }),
      S({ title: 'Estágio docência', date: d(200), kind: 'marco', notes: '', done: false }),
    ],
    courses: [
      S({ name: 'Bioestatística', credits: 4, term: '2025/1', status: 'concluida', grade: 'A', url: '' }),
      S({ name: 'Metodologia da Pesquisa', credits: 4, term: '2025/1', status: 'concluida', grade: 'A', url: '' }),
      S({ name: 'Patologia Experimental', credits: 6, term: '2025/2', status: 'concluida', grade: 'B', url: '' }),
      S({ name: 'Imunologia das Mucosas', credits: 4, term: '2026/2', status: 'cursando', grade: '', url: '' }),
    ],
    certificates: [
      S({ title: 'Apresentação de pôster na Reunião Anual da FeSBE', kind: 'apresentacao', date: d(-150), hours: 20, url: '' }),
      S({ title: 'Curso de Histologia Quantitativa', kind: 'curso', date: d(-220), hours: 16, url: '' }),
    ],
    congresses: [
      S({ event: 'Congresso Brasileiro de Patologia', place: 'Belo Horizonte', date: d(140), work: 'Estresse crônico aumenta a permeabilidade ileal', format: 'poster', abstractDeadline: d(12), url: '', cost: '' }),
    ],
    papers: [
      S({ title: 'Eixo HPA e permeabilidade intestinal: revisão sistemática', journal: 'Neurogastroenterology & Motility', status: 'escrita', authors: 'Silva M, Costa H', year: 2026, doi: '', qualis: 'A1' }),
      S({ title: 'Probióticos e junções firmes em modelo de estresse', journal: '', status: 'ideia', authors: 'Silva M, Costa H', year: '', doi: '', qualis: '' }),
    ],
    links: [
      S({ title: 'Modelo de relatório anual do programa', category: 'modelo', url: '', notes: '' }),
      S({ title: 'Diretrizes ARRIVE 2.0', category: 'artigo', url: 'https://arriveguidelines.org', notes: 'Checklist para relatar estudos com animais.' }),
    ],
  };
}
