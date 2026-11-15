// Dados de exemplo (datas relativas a hoje, para a demonstração sempre parecer atual).
import { uid } from './store.js';
import { templateGroups } from './views/drawing.js';
import { templateAdolescentStress, rebuildGroups, occurrences } from './protocol.js';

function d(offsetDays) {
  const x = new Date();
  x.setDate(x.getDate() + offsetDays);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}

export function demoData() {
  const e1 = uid(), e2 = uid(), e3 = uid(), ceua = uid(), cImu = uid(), cHist = uid();
  const now = new Date().toISOString();
  const S = (o) => ({ id: uid(), createdAt: now, ...o });
  // Projeto de exemplo: modelo de estresse na adolescência, lote em andamento (hoje = DPN 34)
  const tpl = templateAdolescentStress();
  const design = { ...tpl.design };
  design.groups = rebuildGroups(design);
  const project = {
    id: uid(), createdAt: now, title: 'Análise de neurônios do plexo mioentérico de ratos estressados na adolescência: efeitos do enriquecimento ambiental e da doxiciclina',
    type: 'doutorado', status: 'andamento', program: 'CAPES', institution: 'Departamento de Histologia', student: 'Marina', advisor: 'Profa. Dra. Helena Costa',
    parentTitle: '', parentNumber: '', start: d(-60), end: d(240), ethicsId: ceua,
    summary: 'Avalia se o enriquecimento ambiental, associado à doxiciclina, previne alterações nos neurônios do plexo mioentérico de ratos submetidos a estresse na adolescência.',
    keywords: 'Eixo cérebro-intestino; Cólon; Sistema nervoso entérico; Plexo mioentérico',
    objective: 'Avaliar se o estresse na adolescência altera a população e a morfologia dos neurônios do plexo mioentérico e se EA + doxiciclina previnem essas alterações.',
    objectives: [
      { id: uid(), text: 'Investigar o efeito do estresse sobre a densidade e a morfologia dos neurônios totais e nitrérgicos', status: 'andamento', experimentId: e1 },
      { id: uid(), text: 'Avaliar se o enriquecimento ambiental atenua as alterações entéricas', status: 'pendente', experimentId: e1 },
      { id: uid(), text: 'Verificar se a doxiciclina, isolada ou com EA, é neuroprotetora', status: 'pendente', experimentId: '' },
    ],
    activities: (() => {
      const ym = (off) => { const x = new Date(); x.setDate(1); x.setMonth(x.getMonth() + off); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`; };
      const A = (name, a, b, status) => ({ id: uid(), name, start: ym(a), end: ym(b), status });
      return [
        A('Levantamento bibliográfico', -2, -2, 'done'),
        A('Protocolo experimental (EA, estresse e tratamento)', -1, 1, 'doing'),
        A('Imunofluorescência', 1, 4, 'todo'),
        A('Análise dos resultados', 5, 6, 'todo'),
        A('Relatório final', 7, 9, 'todo'),
      ];
    })(),
    design, protocol: { steps: tpl.steps }, cohorts: [{ id: uid(), name: 'Lote 1', birth: d(-34), nPerGroup: '', notes: '' }],
    reagents: tpl.reagents, doses: tpl.doses.map((x) => ({ ...x, weight: 110, conc: 4 })), done: {},
  };
  occurrences(project).forEach((o) => {
    if (o.date < d(0) && !(o.step.name.startsWith('Mudar') && o.dpn >= 31)) project.done[o.id] = now;
  });

  const projectId = project.id;
  return {
    version: 1,
    projects: [project],
    profile: {
      name: 'Marina',
      level: 'doutorado',
      program: 'Doutorado em Patologia',
      project: 'Estresse e barreira intestinal',
      advisor: 'Profa. Dra. Helena Costa',
      coadvisor: '',
      start: d(-610),
      end: d(-610 + 1460),
      institution: 'Universidade Federal de Minas Gerais (UFMG)',
      campus: 'Campus Pampulha',
      requiredMandatory: 20,
      requiredElective: 12,
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
      S({ title: 'Relatório parcial do projeto', date: d(45), kind: 'relatorio', notes: 'Enviar ao orientador 1 semana antes', done: false, projectId }),
      S({ title: 'Apresentação no evento de iniciação/pós', date: d(110), kind: 'evento', notes: 'Pôster com resultados preliminares', done: false, projectId }),
      S({ title: 'Estágio docência', date: d(200), kind: 'marco', notes: '', done: false }),
    ],
    courses: [
      S({ name: 'Bioestatística', type: 'obrigatoria', credits: 4, term: '2025/1', status: 'concluida', grade: 'A', url: '' }),
      S({ name: 'Metodologia da Pesquisa', type: 'obrigatoria', credits: 4, term: '2025/1', status: 'concluida', grade: 'A', url: '' }),
      S({ name: 'Patologia Experimental', type: 'obrigatoria', credits: 6, term: '2025/2', status: 'concluida', grade: 'B', url: '' }),
      S({ name: 'Tópicos em Neuroimunologia', type: 'optativa', credits: 4, term: '2025/2', status: 'concluida', grade: 'A', url: '' }),
      { id: cImu, createdAt: now, name: 'Imunologia das Mucosas', type: 'optativa', credits: 4, term: '2026/2', status: 'cursando', grade: '', url: '', professor: 'Prof. Dr. Ricardo Lima', schedule: 'Quartas, 14h–17h', room: 'Sala 112, ICB' },
      { id: cHist, createdAt: now, name: 'Histopatologia Avançada', type: 'obrigatoria', credits: 6, term: '2027/1', status: 'planejada', grade: '', url: '', professor: '', schedule: '', room: '' },
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
    assessments: [
      S({ courseId: cImu, kind: 'prova', title: 'Prova 1: imunidade inata da mucosa', date: d(-14), weight: 30, grade: 8.5, description: 'Capítulos 1 a 4', url: '', done: true }),
      S({ courseId: cImu, kind: 'apresentacao', title: 'Seminário: junções firmes e microbiota', date: d(4), weight: 30, grade: '', description: 'Apresentação de 20 min em dupla, com artigo de 2024 ou mais recente', url: '', done: false }),
      S({ courseId: cImu, kind: 'trabalho', title: 'Revisão crítica de artigo', date: d(19), weight: 20, grade: '', description: 'Até 5 páginas', url: '', done: false }),
      S({ courseId: cImu, kind: 'prova', title: 'Prova 2', date: d(33), weight: 20, grade: '', description: '', url: '', done: false }),
    ],
    drawings: [
      { id: uid(), createdAt: now, title: 'Grupos do experimento de barreira', experimentId: e1, shapes: templateGroups(), grid: true, updatedAt: now },
    ],
    links: [
      S({ title: 'Modelo de relatório anual do programa', category: 'modelo', url: '', notes: '' }),
      S({ title: 'Diretrizes ARRIVE 2.0', category: 'artigo', url: 'https://arriveguidelines.org', notes: 'Checklist para relatar estudos com animais.' }),
    ],
  };
}
