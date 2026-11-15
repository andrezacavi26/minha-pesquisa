// Aba "Meu projeto": vários projetos por pessoa. Cada projeto tem Resumo,
// Grupos e animais, Agenda do protocolo e Reagentes e doses.
import { store, uid } from '../store.js';
import { esc, icon, fmtDate, badge, emptyState, todayISO, openForm, confirmDialog, toast, progressBar, daysUntil } from '../ui.js';
import * as P from '../protocol.js';
import { SCHEMAS } from '../schemas.js';

export const title = 'Meu projeto';

export const PROJECT_TYPES = [
  ['ic', 'Iniciação científica (IC/PIC)'],
  ['tcc', 'TCC'],
  ['mestrado', 'Mestrado'],
  ['doutorado', 'Doutorado'],
  ['posdoc', 'Pós-doutorado'],
  ['colaboracao', 'Colaboração / outro'],
];
const typeLabel = (t) => Object.fromEntries(PROJECT_TYPES)[t] || '';

export const PROJECT_FIELDS = () => [
  { name: 'title', label: 'Título do projeto', type: 'textarea', rows: 2, required: true },
  { name: 'type', label: 'Tipo', type: 'select', options: PROJECT_TYPES },
  { name: 'status', label: 'Situação', type: 'select', options: [['planejamento', 'Em planejamento'], ['andamento', 'Em andamento'], ['concluido', 'Concluído']] },
  { name: 'program', label: 'Edital / programa', placeholder: 'Ex.: PROIC/UEL, CAPES, FAPESP' },
  { name: 'institution', label: 'Instituição e departamento', placeholder: 'Ex.: UEL, Departamento de Histologia' },
  { name: 'student', label: 'Aluno(a)' },
  { name: 'advisor', label: 'Orientador(a)' },
  { name: 'parentTitle', label: 'Projeto do orientador (se este for subprojeto)', type: 'textarea', rows: 2 },
  { name: 'parentNumber', label: 'Número do projeto do orientador' },
  { name: 'start', label: 'Início', type: 'date' },
  { name: 'end', label: 'Fim', type: 'date' },
  { name: 'ethicsId', label: 'Protocolo de ética (CEUA/CEP)', type: 'select', options: [['', '— nenhum —'], ...store.list('ethics').map((e) => [e.id, `${e.kind} ${e.number}`])] },
  { name: 'summary', label: 'Resumo', type: 'textarea', rows: 4 },
  { name: 'keywords', label: 'Palavras-chave', full: true },
  { name: 'objective', label: 'Objetivo geral', type: 'textarea', rows: 3 },
];

const STEP_FIELDS = (design) => {
  const conds = [['', 'Todos os grupos']];
  (design?.factors || []).forEach((f) => f.levels.forEach((l) => conds.push([`${f.name}=${l}`, `Só ${f.name}: ${l}`])));
  return [
    { name: 'name', label: 'Etapa / tarefa', required: true, full: true, placeholder: 'Ex.: Gavagem com doxiciclina' },
    { name: 'freq', label: 'Frequência', type: 'select', options: P.FREQ },
    { name: 'appliesTo', label: 'Para quais animais', type: 'select', options: conds },
    { name: 'start', label: 'Começa no DPN', type: 'number', required: true },
    { name: 'end', label: 'Termina no DPN', type: 'number' },
    { name: 'dpns', label: 'DPNs específicos (se for o caso)', placeholder: 'Ex.: 31, 32, 40', full: true },
    ...P.WEEKDAYS.map((d, i) => ({ name: `wd${i}`, label: d, type: 'checkbox' })),
    { name: 'time', label: 'Horário / momento', placeholder: 'Ex.: 9h, 1 h após o estresse' },
    { name: 'color', label: 'Cor', type: 'select', options: [['#3ee8b5', 'Verde-água'], ['#20c997', 'Verde'], ['#d9474f', 'Vermelho'], ['#4a90d9', 'Azul'], ['#9b59b6', 'Roxo'], ['#e7a33a', 'Laranja'], ['#0a2a2c', 'Escuro']] },
    { name: 'notes', label: 'Observações', type: 'textarea', rows: 2 },
  ];
};

const COHORT_FIELDS = [
  { name: 'name', label: 'Nome do lote', required: true, placeholder: 'Ex.: Lote 1' },
  { name: 'birth', label: 'Data de nascimento (DPN 0)', type: 'date', required: true },
  { name: 'nPerGroup', label: 'Animais por grupo neste lote', type: 'number', hint: 'Deixe vazio para usar o n de cada grupo.' },
  { name: 'notes', label: 'Observações', type: 'textarea', rows: 2 },
];

const REAGENT_FIELDS = [
  { name: 'name', label: 'Reagente / anticorpo', required: true, full: true },
  { name: 'dilution', label: 'Diluição', placeholder: '1:1000', required: true },
  { name: 'volume', label: 'Volume de solução por amostra (µL)', type: 'number', required: true },
  { name: 'samples', label: 'Nº de amostras', type: 'number', hint: 'Vazio = total de animais do projeto.' },
  { name: 'margin', label: 'Margem de segurança (%)', type: 'number', default: 10 },
  { name: 'stock', label: 'Quanto você tem (µL)', type: 'number' },
];

const DOSE_FIELDS = (design) => [
  { name: 'name', label: 'Substância e via', required: true, full: true },
  { name: 'dose', label: 'Dose (mg/kg)', type: 'number', required: true },
  { name: 'weight', label: 'Peso médio dos animais (g)', type: 'number', required: true },
  {
    name: 'appliesTo',
    label: 'Animais tratados',
    type: 'select',
    options: [['', 'Todos os grupos'], ...(design?.factors || []).flatMap((f) => f.levels.map((l) => [`${f.name}=${l}`, `Só ${f.name}: ${l}`]))],
  },
  { name: 'animals', label: 'Nº de animais (opcional)', type: 'number', hint: 'Vazio = calculado pelos grupos.' },
  { name: 'times', label: 'Nº de administrações por animal', type: 'number', required: true },
  { name: 'conc', label: 'Concentração da solução (mg/mL)', type: 'number' },
];

// ---------- Utilitários ----------
function update(id, fn) {
  const p = JSON.parse(JSON.stringify(store.find('projects', id)));
  fn(p);
  store.update('projects', id, p);
}
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const fmtNum = (n, d = 1) => (n === null || n === undefined || isNaN(n) ? '—' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d }));
const condLabel = (c) => (c ? c.replace('=', ': ') : 'todos os grupos');
function freqText(s) {
  if (s.freq === 'daily') return `todo dia, DPN ${s.start}–${s.end || s.start}`;
  if (s.freq === 'weekly') return `${(s.weekdays || []).map((d) => P.WEEKDAYS[d]).join(', ') || 'sem dias'}, DPN ${s.start}–${s.end || s.start}`;
  if (s.freq === 'dpns') return `DPN ${s.dpns}`;
  if (s.freq === 'once') return `uma vez, DPN ${s.start}`;
  return `contínuo, DPN ${s.start}–${s.end || s.start}`;
}

function projectProgress(p) {
  const occ = P.occurrences(p);
  const done = occ.filter((o) => o.done).length;
  const t = todayISO();
  const next = occ.find((o) => !o.done && o.date >= t);
  const late = occ.filter((o) => !o.done && o.date < t).length;
  return { total: occ.length, done, next, late };
}

// ---------- Painel do projeto (Meu projeto) ----------
export const protoUrl = (id, parte = 'agenda', extra = '') => `#/planejamento?aba=protocolo&id=${id}&parte=${parte}${extra}`;

const ymNow = () => todayISO().slice(0, 7);
const ymAdd = (ym, n) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const ymDiff = (a, b) => {
  const [y1, m1] = a.split('-').map(Number);
  const [y2, m2] = b.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
};
const ymLabel = (ym) => cap(new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''));

const ACT_STATUS = { todo: 'Não iniciada', doing: 'Em andamento', done: 'Concluída' };
const OBJ_STATUS = [
  ['pendente', 'Sem dados ainda'],
  ['andamento', 'Em andamento'],
  ['respondido', 'Respondido'],
];

// Cronograma típico de IC (12 meses), como o do projeto PROIC
export function icActivities(startYm) {
  const A = (name, from, to) => ({ id: uid(), name, start: ymAdd(startYm, from), end: ymAdd(startYm, to), status: 'todo' });
  return [
    A('Levantamento bibliográfico', 0, 0),
    A('Protocolo experimental (EA, estresse e tratamento)', 1, 4),
    A('Imunofluorescência', 4, 7),
    A('Análise dos resultados', 8, 9),
    A('Relatório final', 10, 11),
  ];
}

function activityState(a) {
  const now = ymNow();
  if (a.status === 'done') return 'done';
  if (a.end && a.end < now) return 'late';
  if (a.status === 'todo' && a.start && a.start <= now) return 'should-start';
  return a.status === 'doing' ? 'doing' : 'todo';
}

export function projectHealth(p) {
  const acts = p.activities || [];
  const months = (a) => Math.max(1, ymDiff(a.start, a.end) + 1);
  const totalW = acts.reduce((s, a) => s + months(a), 0);
  const doneW = acts.reduce((s, a) => s + months(a) * (a.status === 'done' ? 1 : a.status === 'doing' ? 0.5 : 0), 0);
  const progress = totalW ? (doneW / totalW) * 100 : 0;
  let elapsed = 0;
  let monthNow = null;
  let monthsTotal = null;
  if (p.start && p.end) {
    const tot = (daysUntil(p.end) ?? 0) - (daysUntil(p.start) ?? 0);
    elapsed = tot > 0 ? Math.max(0, Math.min(100, (-(daysUntil(p.start) ?? 0) / tot) * 100)) : 0;
    monthsTotal = ymDiff(p.start.slice(0, 7), p.end.slice(0, 7)) + 1;
    monthNow = Math.max(0, Math.min(monthsTotal, ymDiff(p.start.slice(0, 7), ymNow()) + 1));
  }
  const late = acts.filter((a) => activityState(a) === 'late');
  const shouldStart = acts.filter((a) => activityState(a) === 'should-start');
  const current = acts.filter((a) => a.status === 'doing');
  let tone = 'neutral', text = 'Cadastre o cronograma para acompanhar o ritmo.';
  if (acts.length) {
    const diff = progress - elapsed;
    if (late.length) (tone = 'bad'), (text = `${late.length} atividade(s) passaram do prazo do cronograma.`);
    else if (diff >= -10) (tone = 'good'), (text = 'No ritmo do cronograma.');
    else if (diff >= -25) (tone = 'warn'), (text = 'Um pouco atrás do cronograma.');
    else (tone = 'bad'), (text = 'Bem atrás do cronograma. Vale replanejar com o orientador.');
  }
  return { progress, elapsed, monthNow, monthsTotal, late, shouldStart, current, tone, text };
}

export function getObjectives(p) {
  if (Array.isArray(p.objectives)) return p.objectives;
  return String(p.specific || '')
    .split('\n')
    .map((x) => x.replace(/^[-•*\s]+/, '').trim())
    .filter(Boolean)
    .map((text, i) => ({ id: 'o' + i, text, status: 'pendente', experimentId: '' }));
}

function list() {
  const ps = store.list('projects');
  return `<div class="page">
    <header class="page-head">
      <div><p class="eyebrow dark">Meu projeto</p><h1>Andamento da pesquisa</h1>
      <p class="muted">Em que fase cada projeto está, o que falta e o que vem a seguir.</p></div>
      <button class="btn btn-primary" data-action="new-project">${icon('plus')} Novo projeto</button>
    </header>
    ${
      ps.length
        ? `<div class="course-grid">${ps
            .map((p) => {
              const h = projectHealth(p);
              const objs = getObjectives(p);
              return `<a class="card course-card project-card" href="#/projeto?id=${p.id}">
              <div class="course-top"><span class="tile-ico">${icon('paper')}</span>
                <div class="course-title"><h3 class="clamp">${esc(p.title)}</h3><small class="muted">${esc(typeLabel(p.type))}${p.program ? ' · ' + esc(p.program) : ''}</small></div></div>
              <div class="course-stats">
                <div><span>Fase</span><b>${h.monthNow ? `Mês ${h.monthNow}/${h.monthsTotal}` : '—'}</b></div>
                <div><span>Objetivos</span><b>${objs.filter((o) => o.status === 'respondido').length}/${objs.length}</b></div>
                <div class="grow"><span>Agora</span><b class="ellipsis">${h.current[0] ? esc(h.current[0].name) : h.late.length ? `${h.late.length} atrasada(s)` : '—'}</b></div>
              </div>
              <div class="pace-row"><span>Cronograma</span><b>${Math.round(h.progress)}%</b></div>${progressBar(h.progress)}
              <p class="pace-msg tone-${h.tone}">${esc(h.text)}</p>
            </a>`;
            })
            .join('')}</div>`
        : emptyState('Cadastre seu projeto para acompanhar fase, cronograma, objetivos e entregas. Há um modelo de cronograma de IC de 12 meses.', 'new-project', 'Novo projeto')
    }
  </div>`;
}

export function render(params) {
  const id = params.get('id');
  if (!id) return list();
  const p = store.find('projects', id);
  if (!p) return `<div class="page">${emptyState('Projeto não encontrado.', '', '')}</div>`;
  return dashboard(p);
}

function gantt(p) {
  const acts = p.activities || [];
  if (!acts.length)
    return `<div class="empty small"><p>Sem cronograma. Use o modelo de IC (12 meses) ou cadastre as atividades.</p>
      <div class="head-actions center"><button class="btn btn-soft" data-action="add-activity" data-id="${p.id}">${icon('plus')} Atividade</button>
      <button class="btn btn-ghost" data-action="ic-schedule" data-id="${p.id}">Usar cronograma típico de IC</button></div></div>`;
  const first = (p.start || acts.map((a) => a.start).sort()[0] + '-01').slice(0, 7);
  const lastAct = acts.map((a) => a.end).sort().slice(-1)[0];
  const last = [p.end ? p.end.slice(0, 7) : '', lastAct].sort().slice(-1)[0];
  const n = Math.max(1, ymDiff(first, last) + 1);
  const months = Array.from({ length: n }, (_, i) => ymAdd(first, i));
  const nowIdx = ymDiff(first, ymNow());
  const stateLabel = { done: 'Concluída', doing: 'Em andamento', late: 'Atrasada', 'should-start': 'Deveria ter começado', todo: 'Não iniciada' };
  return `<div class="gantt" style="--n:${n}">
    <div class="g-row g-head"><div class="g-name"></div>${months.map((m, i) => `<div class="g-cell ${i === nowIdx ? 'now' : ''}">${ymLabel(m)}${m.endsWith('-01') || i === 0 ? `<small>${m.slice(0, 4)}</small>` : ''}</div>`).join('')}</div>
    ${acts
      .map((a) => {
        const st = activityState(a);
        const s = Math.max(0, ymDiff(first, a.start));
        const e = Math.min(n - 1, ymDiff(first, a.end));
        return `<div class="g-row">
          <div class="g-name">
            <button class="g-status st-${st}" data-action="cycle-activity" data-id="${p.id}" data-aid="${a.id}" title="${stateLabel[st]}. Clique para mudar">${a.status === 'done' ? icon('check') : ''}</button>
            <span class="g-title"><b>${esc(a.name)}</b><small class="g-${st}">${stateLabel[st]}</small></span>
            <button class="icon-btn" data-action="edit-activity" data-id="${p.id}" data-aid="${a.id}" aria-label="Editar atividade">${icon('edit')}</button>
          </div>
          ${months.map((m, i) => `<div class="g-cell ${i === nowIdx ? 'now' : ''}">${i === s ? `<span class="g-bar b-${st}" style="width:calc(${e - s + 1} * 100% + ${(e - s) * 2}px)"></span>` : ''}</div>`).join('')}
        </div>`;
      })
      .join('')}
  </div>
  <div class="gantt-foot"><button class="btn btn-soft sm" data-action="add-activity" data-id="${p.id}">${icon('plus')} Atividade</button><small class="muted">Clique no círculo para marcar: não iniciada → em andamento → concluída.</small></div>`;
}

function dashboard(p) {
  const h = projectHealth(p);
  const objs = getObjectives(p);
  const exps = Object.fromEntries(store.list('experiments').map((e) => [e.id, e]));
  const t = todayISO();
  const deliveries = store
    .list('milestones')
    .filter((m) => m.projectId === p.id && !m.done)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const occ = P.occurrences(p);
  const occToday = occ.filter((o) => o.date === t && !o.done).length;
  const occWeek = occ.filter((o) => !o.done && o.date >= t && (daysUntil(o.date) ?? 99) <= 7).length;
  const occLate = occ.filter((o) => !o.done && o.date < t).length;
  const ethics = store.find('ethics', p.ethicsId);
  const gt = P.groupTotals(p.design);

  const alerts = [];
  h.late.forEach((a) => alerts.push(['bad', `“${a.name}” passou do prazo (${ymLabel(a.end)}/${a.end.slice(0, 4)}).`]));
  h.shouldStart.forEach((a) => alerts.push(['warn', `“${a.name}” deveria ter começado em ${ymLabel(a.start)}.`]));
  if (occLate) alerts.push(['bad', `${occLate} tarefa(s) do protocolo atrasada(s).`]);
  if (ethics?.validUntil && (daysUntil(ethics.validUntil) ?? 999) <= 60) alerts.push(['warn', `${ethics.kind} ${ethics.number} vence ${fmtDate(ethics.validUntil)}.`]);
  if (ethics?.approved && gt.total > ethics.approved) alerts.push(['bad', `O delineamento prevê ${gt.total} animais, e o ${ethics.kind} aprovou ${ethics.approved}.`]);
  const noExp = objs.filter((o) => !o.experimentId && o.status !== 'respondido').length;
  if (noExp) alerts.push(['info', `${noExp} objetivo(s) ainda sem experimento ligado.`]);

  return `<div class="page">
    <a class="back-link" href="#/projeto">${icon('arrow', 'flip')} Todos os projetos</a>
    <header class="page-head project-head">
      <div><p class="eyebrow dark">${esc(typeLabel(p.type))}${p.program ? ' · ' + esc(p.program) : ''}</p><h1 class="project-title">${esc(p.title)}</h1>
      <p class="muted">${[p.student, p.advisor ? 'orientação: ' + p.advisor : '', p.start && p.end ? `${fmtDate(p.start)} a ${fmtDate(p.end)}` : ''].filter(Boolean).map(esc).join(' · ')}</p></div>
      <div class="head-actions">
        <button class="btn btn-ghost" data-action="edit-project" data-id="${p.id}">${icon('edit')} Dados do projeto</button>
        <button class="icon-btn danger" data-action="delete-project" data-id="${p.id}" title="Excluir projeto" aria-label="Excluir projeto">${icon('trash')}</button>
      </div>
    </header>

    <section class="card phase-card">
      <div class="phase-main">
        <span class="phase-label">Fase atual</span>
        <b class="phase-now">${h.current.length ? h.current.map((a) => esc(a.name)).join(' · ') : h.late[0] ? esc(h.late[0].name) + ' (atrasada)' : (p.activities || []).length ? 'Nenhuma atividade em andamento' : 'Cronograma não cadastrado'}</b>
        ${h.monthNow ? `<span class="phase-month">Mês ${h.monthNow} de ${h.monthsTotal}</span>` : ''}
      </div>
      <div class="phase-bars">
        <div class="pace-row"><span>Tempo do projeto</span><b>${Math.round(h.elapsed)}%</b></div>${progressBar(h.elapsed, 'bar-time')}
        <div class="pace-row"><span>Cronograma realizado</span><b>${Math.round(h.progress)}%</b></div>${progressBar(h.progress)}
        <p class="pace-msg tone-${h.tone}">${esc(h.text)}</p>
      </div>
    </section>

    <div class="grid-2 dash-grid">
      <section class="section">
        <header class="section-head"><h2>${icon('calendar')} Cronograma</h2><span class="muted small">planejado × realizado</span></header>
        <div class="card gantt-card">${gantt(p)}</div>

        <header class="section-head obj-head"><h2>${icon('check')} Objetivos</h2>
          <button class="btn btn-soft sm" data-action="add-objective" data-id="${p.id}">${icon('plus')} Objetivo</button></header>
        ${p.objective ? `<p class="obj-general"><b>Geral:</b> ${esc(p.objective)}</p>` : ''}
        ${
          objs.length
            ? `<ul class="rows">${objs
                .map((o, i) => {
                  const e = exps[o.experimentId];
                  return `<li class="row obj-row">
              <span class="obj-num">${i + 1}</span>
              <div class="row-main"><strong>${esc(o.text)}</strong>
                <small class="muted">${e ? `${icon('flask')} ${esc(e.title)}` : 'Nenhum experimento ligado'}</small></div>
              <select class="select-sm obj-status os-${o.status}" data-obj-status="${o.id}" data-id="${p.id}" aria-label="Status do objetivo">
                ${OBJ_STATUS.map(([k, l]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
              <button class="icon-btn" data-action="edit-objective" data-id="${p.id}" data-oid="${o.id}" aria-label="Editar objetivo">${icon('edit')}</button>
            </li>`;
                })
                .join('')}</ul>`
            : '<div class="empty small"><p>Cadastre os objetivos específicos e ligue cada um ao experimento que vai respondê-lo.</p></div>'
        }
      </section>

      <div class="stack">
        <section class="card">
          <header class="card-head"><h2 class="h-sm">Próximas entregas</h2>
            <button class="btn btn-soft sm" data-action="add-delivery" data-id="${p.id}">${icon('plus')} Entrega</button></header>
          ${
            deliveries.length
              ? `<ul class="rows">${deliveries
                  .slice(0, 5)
                  .map(
                    (m) => `<li class="row"><div class="date-chip small"><b>${fmtDate(m.date, { day: '2-digit' })}</b><span>${fmtDate(m.date, { month: 'short' })}</span></div>
                  <div class="row-main"><strong>${esc(m.title)}</strong>${m.notes ? `<small class="muted">${esc(m.notes)}</small>` : ''}</div>${badge(m.date)}
                  <button class="icon-btn" data-action="edit" data-col="milestones" data-id="${m.id}" aria-label="Editar">${icon('edit')}</button></li>`
                  )
                  .join('')}</ul>`
              : '<p class="muted small">Relatório parcial, relatório final, qualificação, apresentação no evento de IC…</p>'
          }
        </section>

        <section class="card">
          <header class="card-head"><h2 class="h-sm">Protocolo experimental</h2>
            <a class="mini-link" href="${protoUrl(p.id, 'agenda')}">Abrir ${icon('arrow')}</a></header>
          ${
            (p.protocol?.steps || []).length
              ? `<div class="proto-mini">
                <a href="${protoUrl(p.id, 'agenda')}"><b>${occToday}</b><span>hoje</span></a>
                <a href="${protoUrl(p.id, 'agenda')}"><b>${occWeek}</b><span>próximos 7 dias</span></a>
                <a href="${protoUrl(p.id, 'agenda', '&ver=atrasadas')}" class="${occLate ? 'late' : ''}"><b>${occLate}</b><span>atrasadas</span></a>
              </div>
              <p class="muted small">${gt.groups} grupos · ${gt.total} animais · ${(p.cohorts || []).length} lote(s)</p>`
              : `<p class="muted small">Agenda do protocolo, grupos e reagentes ficam em Planejamento.</p><a class="btn btn-soft sm" href="${protoUrl(p.id, 'agenda')}">Montar protocolo</a>`
          }
        </section>

        <section class="card">
          <header class="card-head"><h2 class="h-sm">Alertas</h2></header>
          ${
            alerts.length
              ? `<ul class="alerts">${alerts.map(([tone, txt]) => `<li class="al-${tone}">${esc(txt)}</li>`).join('')}</ul>`
              : '<p class="muted small">Nada pedindo atenção agora. ✓</p>'
          }
        </section>
      </div>
    </div>
  </div>`;
}

// ---------- Protocolo e animais (dentro de Planejamento) ----------
const PTABS = [
  ['agenda', 'Agenda do protocolo', 'calendar'],
  ['grupos', 'Grupos e animais', 'users'],
  ['reagentes', 'Reagentes e doses', 'flask'],
];

export function protocolArea(params) {
  const ps = store.list('projects');
  if (!ps.length)
    return emptyState('O protocolo fica ligado a um projeto. Crie um projeto (pode usar o modelo de estresse na adolescência) para montar grupos, agenda e reagentes.', 'new-project', 'Novo projeto');
  const p = store.find('projects', params.get('id')) || ps[0];
  const parte = PTABS.find(([k]) => k === params.get('parte'))?.[0] || 'agenda';
  return `<div class="proto-top">
      <label class="opt">Projeto
        <select class="select-sm proto-select" data-proto-project aria-label="Projeto">
          ${ps.map((x) => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${esc(x.title.length > 70 ? x.title.slice(0, 69) + '…' : x.title)}</option>`).join('')}
        </select>
      </label>
      ${(p.protocol?.steps || []).length ? '' : `<button class="btn btn-ghost sm" data-action="use-stress-template" data-id="${p.id}">Usar modelo: estresse na adolescência + EA + doxiciclina</button>`}
    </div>
    <nav class="tabs" aria-label="Protocolo">
      ${PTABS.map(([k, l, ic]) => `<a href="${protoUrl(p.id, k)}" class="tab ${k === parte ? 'active' : ''}">${icon(ic)} ${l}</a>`).join('')}
    </nav>
    ${{ grupos, agenda, reagentes }[parte](p, params)}`;
}

function grupos(p) {
  const d = p.design || { factors: [], groups: [] };
  const gt = P.groupTotals(d);
  const ethics = store.find('ethics', p.ethicsId);
  return `<div class="section-head">
      <div><h2>${icon('users')} Delineamento</h2><p class="muted">Informe os fatores do estudo: o sistema monta todos os grupos possíveis.</p></div>
      <button class="btn btn-soft" data-action="edit-factors" data-id="${p.id}">${icon('edit')} Editar fatores</button>
    </div>
    ${
      d.factors?.length
        ? `<div class="chips factor-chips">${d.factors.map((f) => `<span class="pill"><b>${esc(f.name)}:</b>&nbsp;${f.levels.map(esc).join(' / ')}</span>`).join('<span class="times">×</span>')}</div>`
        : emptyState('Ex.: Estresse (naïve / estressado) × Enriquecimento (sem / com) × Tratamento (salina / doxiciclina) = 8 grupos.', '', '')
    }
    <div class="stat-row">
      <div class="card stat"><span>Grupos</span><b>${gt.groups}</b></div>
      <div class="card stat"><span>Total de animais</span><b>${gt.total}</b>${gt.missingN ? `<small class="hint-warn">${gt.missingN} grupo(s) sem n</small>` : ''}</div>
      <div class="card stat"><span>Caixas</span><b>${gt.boxes || '—'}</b><small class="muted">máx. <input class="mini-input" type="number" min="1" value="${esc(d.perBox || '')}" data-proj-field="perBox" data-id="${p.id}" aria-label="Animais por caixa"/> por caixa</small></div>
      <div class="card stat"><span>CEUA</span>${
        ethics?.approved
          ? `<b class="${gt.total > ethics.approved ? 'warn-text' : ''}">${gt.total}/${ethics.approved}</b><small class="muted">${gt.total > ethics.approved ? 'acima do aprovado' : `sobram ${ethics.approved - gt.total}`}</small>`
          : `<b>—</b><small class="muted">ligue o protocolo em Editar</small>`
      }</div>
    </div>
    ${
      d.groups?.length
        ? `<div class="table-wrap"><table class="table groups-table">
        <thead><tr><th>Grupo</th>${d.factors.map((f) => `<th>${esc(f.name)}</th>`).join('')}<th>n</th><th>Caixas</th></tr></thead>
        <tbody>${d.groups
          .map(
            (g) => `<tr>
            <td><input class="cell-input" value="${esc(g.name)}" data-group-field="name" data-gid="${g.id}" data-id="${p.id}" aria-label="Nome do grupo"/></td>
            ${d.factors.map((f) => `<td><span class="pill">${esc(g.levels[f.name])}</span></td>`).join('')}
            <td><input class="cell-input num" type="number" min="0" value="${esc(g.n ?? '')}" data-group-field="n" data-gid="${g.id}" data-id="${p.id}" aria-label="n do grupo"/></td>
            <td>${d.perBox && g.n ? Math.ceil(g.n / d.perBox) : '—'}</td></tr>`
          )
          .join('')}</tbody></table></div>
        <p class="muted small">Dica: ao mudar os fatores, os grupos que continuam existindo mantêm o nome e o n.</p>`
        : ''
    }`;
}

function timelineSvg(p) {
  const steps = p.protocol?.steps || [];
  if (!steps.length) return '';
  const [a, b] = P.dpnRange(p);
  const span = Math.max(1, b - a);
  const W = 1000, rowH = 30, top = 34, H = top + steps.length * rowH + 30;
  const x = (d) => 200 + ((d - a) / span) * (W - 220);
  const c = (p.cohorts || []).find((k) => k.birth);
  const today = c ? P.dateToDpn(c.birth, todayISO()) : null;
  const ticks = [];
  const stepT = span > 60 ? 10 : 5;
  for (let d = Math.ceil(a / stepT) * stepT; d <= b; d += stepT) ticks.push(d);
  return `<div class="card tl-card"><svg viewBox="0 0 ${W} ${H}" class="tl-svg" role="img" aria-label="Linha do tempo do protocolo em DPN">
    ${ticks
      .map(
        (d) => `<line x1="${x(d)}" x2="${x(d)}" y1="${top - 8}" y2="${H - 26}" stroke="#e3eeec"/>
      <text x="${x(d)}" y="${top - 14}" text-anchor="middle" class="tl-tick">DPN ${d}</text>
      ${c ? `<text x="${x(d)}" y="${H - 8}" text-anchor="middle" class="tl-date">${fmtDate(P.dpnToDate(c.birth, d), { day: '2-digit', month: 'short' })}</text>` : ''}`
      )
      .join('')}
    ${steps
      .map((s, i) => {
        const y = top + i * rowH;
        const label = `<text x="0" y="${y + 19}" class="tl-label">${esc(s.name.length > 30 ? s.name.slice(0, 29) + '…' : s.name)}</text>`;
        if (s.freq === 'dpns' || s.freq === 'once') {
          const ds = s.freq === 'once' ? [Number(s.start)] : String(s.dpns || '').split(/[,;\s]+/).map(Number).filter((n) => !isNaN(n));
          return label + ds.map((d) => `<circle cx="${x(d)}" cy="${y + 15}" r="7" fill="${s.color}"><title>${esc(s.name)} · DPN ${d}</title></circle>`).join('');
        }
        const x1 = x(Number(s.start));
        const x2 = x(Number(s.end || s.start) + 1);
        return `${label}<rect x="${x1}" y="${y + 6}" width="${Math.max(4, x2 - x1)}" height="18" rx="6" fill="${s.color}" opacity="${s.freq === 'continuous' ? 0.35 : 0.9}"><title>${esc(s.name)} · ${esc(freqText(s))}</title></rect>`;
      })
      .join('')}
    ${today !== null && today >= a && today <= b ? `<line x1="${x(today)}" x2="${x(today)}" y1="${top - 6}" y2="${H - 26}" stroke="#0a2a2c" stroke-width="2.5"/><text x="${x(today)}" y="${top - 1}" text-anchor="middle" class="tl-today">hoje</text>` : ''}
  </svg>${c ? `<p class="muted small">Datas do ${esc(c.name)} (nascido em ${fmtDate(c.birth)}).</p>` : '<p class="muted small">Cadastre um lote com a data de nascimento para ver as datas reais.</p>'}</div>`;
}

function agenda(p, params) {
  const steps = p.protocol?.steps || [];
  const cohorts = p.cohorts || [];
  const all = P.occurrences(p);
  const t = todayISO();
  const view = params.get('ver') || 'proximas';
  const base = protoUrl(p.id, 'agenda');
  const late = all.filter((o) => !o.done && o.date < t);
  const shown =
    view === 'tudo' ? all : view === 'atrasadas' ? late : all.filter((o) => o.date >= t && (daysUntil(o.date) ?? 99) <= 14);
  const byDate = {};
  shown.forEach((o) => (byDate[o.date] ||= []).push(o));
  const weekendCount = all.filter((o) => o.weekend && !o.done && o.date >= t).length;

  return `${timelineSvg(p)}
  <div class="grid-2 agenda-grid">
    <section class="section">
      <header class="section-head">
        <h2>${icon('calendar')} Agenda por data</h2>
        <nav class="chips">
          <a class="chip ${view === 'proximas' ? 'on' : ''}" href="${base}&ver=proximas">Próximos 14 dias</a>
          <a class="chip ${view === 'atrasadas' ? 'on' : ''}" href="${base}&ver=atrasadas">Atrasadas <b>${late.length}</b></a>
          <a class="chip ${view === 'tudo' ? 'on' : ''}" href="${base}&ver=tudo">Tudo <b>${all.length}</b></a>
        </nav>
      </header>
      ${weekendCount ? `<p class="weekend-alert">${icon('clock')} ${weekendCount} tarefa(s) futura(s) caem em <b>fim de semana</b>. Combine quem vai ao biotério.</p>` : ''}
      ${
        !cohorts.length
          ? emptyState('Cadastre um lote de animais com a data de nascimento para gerar a agenda com datas reais.', '', '')
          : Object.keys(byDate).length
          ? Object.entries(byDate)
              .map(
                ([date, list]) => `<div class="day-block ${date === t ? 'is-today' : ''}">
            <h3 class="day-title">${cap(fmtDate(date, { weekday: 'long', day: '2-digit', month: 'long' }))}${date === t ? ' <span class="badge badge-soon">hoje</span>' : ''}${list[0].weekend ? ' <span class="badge badge-near">fim de semana</span>' : ''}</h3>
            <ul class="rows">${list
              .map(
                (o) => `<li class="row occ ${o.done ? 'is-done' : ''}">
                <button class="checkbox ${o.done ? 'checked' : ''}" data-action="toggle-occ" data-project="${p.id}" data-occ="${o.id}" aria-label="${o.done ? 'Reabrir' : 'Marcar como feita'}">${o.done ? icon('check') : ''}</button>
                <span class="occ-dot" style="background:${o.step.color}"></span>
                <div class="row-main"><strong>${esc(o.step.name)}</strong>
                  <small class="muted">${esc(o.cohort.name)} · DPN ${o.dpn} · ${o.animals} animais (${esc(condLabel(o.step.appliesTo))})${o.step.time ? ' · ' + esc(o.step.time) : ''}</small>
                  ${o.step.notes ? `<small class="muted">${esc(o.step.notes)}</small>` : ''}</div>
                ${o.date < t && !o.done ? '<span class="badge badge-late">atrasada</span>' : ''}
              </li>`
              )
              .join('')}</ul></div>`
              )
              .join('')
          : `<div class="empty small"><p>${view === 'atrasadas' ? 'Nenhuma tarefa atrasada. 🎉' : 'Nada nos próximos 14 dias.'}</p></div>`
      }
    </section>

    <div class="stack">
      <section class="section">
        <header class="section-head"><h2>${icon('users')} Lotes de animais</h2>
          <button class="btn btn-soft" data-action="add-cohort" data-id="${p.id}">${icon('plus')} Lote</button></header>
        ${
          cohorts.length
            ? `<ul class="rows">${cohorts
                .map((c) => {
                  const dpnToday = P.dateToDpn(c.birth, t);
                  return `<li class="row"><div class="row-main"><strong>${esc(c.name)}</strong>
                  <small class="muted">Nascidos em ${fmtDate(c.birth)} · hoje: <b>DPN ${dpnToday}</b>${c.nPerGroup ? ` · ${c.nPerGroup}/grupo` : ''}</small></div>
                  <div class="row-actions">
                    <button class="icon-btn" data-action="edit-cohort" data-id="${p.id}" data-cid="${c.id}" aria-label="Editar lote">${icon('edit')}</button>
                    <button class="icon-btn danger" data-action="delete-cohort" data-id="${p.id}" data-cid="${c.id}" aria-label="Excluir lote">${icon('trash')}</button>
                  </div></li>`;
                })
                .join('')}</ul>`
            : emptyState('Ex.: Lote 1, nascidos em 12/09. DPN 0 = dia do nascimento.', '', '')
        }
      </section>
      <section class="section">
        <header class="section-head"><h2>${icon('flask')} Etapas do protocolo</h2>
          <button class="btn btn-soft" data-action="add-step" data-id="${p.id}">${icon('plus')} Etapa</button></header>
        ${
          steps.length
            ? `<ul class="rows">${steps
                .map(
                  (s) => `<li class="row"><span class="occ-dot" style="background:${s.color}"></span>
              <div class="row-main"><strong>${esc(s.name)}</strong><small class="muted">${esc(freqText(s))} · ${esc(condLabel(s.appliesTo))}${s.time ? ' · ' + esc(s.time) : ''}</small></div>
              <div class="row-actions">
                <button class="icon-btn" data-action="edit-step" data-id="${p.id}" data-sid="${s.id}" aria-label="Editar etapa">${icon('edit')}</button>
                <button class="icon-btn danger" data-action="delete-step" data-id="${p.id}" data-sid="${s.id}" aria-label="Excluir etapa">${icon('trash')}</button>
              </div></li>`
                )
                .join('')}</ul>`
            : emptyState('Adicione as etapas do protocolo em DPN: enriquecimento, estresse, tratamento, coleta…', '', '')
        }
      </section>
    </div>
  </div>`;
}

function reagentes(p) {
  const gt = P.groupTotals(p.design);
  return `<section class="section">
    <header class="section-head"><div><h2>${icon('flask')} Reagentes e anticorpos</h2><p class="muted">Quanto do reagente concentrado você precisa para todas as amostras.</p></div>
      <button class="btn btn-soft" data-action="add-reagent" data-id="${p.id}">${icon('plus')} Reagente</button></header>
    ${
      (p.reagents || []).length
        ? `<div class="table-wrap"><table class="table">
      <thead><tr><th>Reagente</th><th>Diluição</th><th>Vol./amostra</th><th>Amostras</th><th>Precisa (concentrado)</th><th>Você tem</th><th></th></tr></thead>
      <tbody>${p.reagents
        .map((r) => {
          const n = P.reagentNeed(r, gt.total);
          return `<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.dilution)}</td><td>${fmtNum(r.volume, 0)} µL</td><td>${n ? n.samples : '—'}</td>
          <td>${n ? `<b>${fmtNum(n.stock, 1)} µL</b><small class="muted"> (${fmtNum(n.finalTotal / 1000, 1)} mL de solução, +${r.margin ?? 10}%)</small>` : '—'}</td>
          <td>${r.stock ? `${fmtNum(r.stock, 0)} µL ${n?.enough === false ? '<span class="badge badge-late">falta</span>' : n?.enough ? '<span class="badge badge-done">ok</span>' : ''}` : '<span class="muted">—</span>'}</td>
          <td><div class="row-actions"><button class="icon-btn" data-action="edit-reagent" data-id="${p.id}" data-rid="${r.id}" aria-label="Editar">${icon('edit')}</button>
          <button class="icon-btn danger" data-action="delete-reagent" data-id="${p.id}" data-rid="${r.id}" aria-label="Excluir">${icon('trash')}</button></div></td></tr>`;
        })
        .join('')}</tbody></table></div>
      <p class="muted small">Amostras vazias usam o total de animais do projeto (${gt.total}). Se forem vários preparados por animal, informe o número de amostras.</p>`
        : emptyState('Ex.: anti-nNOS 1:1000, 500 µL por preparado.', '', '')
    }
  </section>
  <section class="section">
    <header class="section-head"><div><h2>${icon('flask')} Doses e soluções</h2><p class="muted">Quanto preparar de cada substância (dose em mg/kg).</p></div>
      <button class="btn btn-soft" data-action="add-dose" data-id="${p.id}">${icon('plus')} Dose</button></header>
    ${
      (p.doses || []).length
        ? `<div class="table-wrap"><table class="table">
      <thead><tr><th>Substância</th><th>Dose</th><th>Por animal</th><th>Volume/animal</th><th>Animais × vezes</th><th>Total</th><th></th></tr></thead>
      <tbody>${p.doses
        .map((d) => {
          const n = P.doseNeed(d, P.animalsFor(p.design, d.appliesTo));
          return `<tr><td><b>${esc(d.name)}</b><small class="muted"> ${esc(condLabel(d.appliesTo))}</small></td><td>${fmtNum(d.dose)} mg/kg${d.weight ? ` · ${fmtNum(d.weight, 0)} g` : ''}</td>
          <td>${n ? fmtNum(n.mgPerAnimal, 2) + ' mg' : '<span class="muted">informe o peso</span>'}</td>
          <td>${n?.mlPerAnimal ? `${fmtNum(n.mlPerAnimal, 2)} mL <small class="muted">(${fmtNum(n.mlPerKg, 1)} mL/kg)</small>` : '<span class="muted">informe a concentração</span>'}</td>
          <td>${n ? `${n.animals} × ${n.times}` : '—'}</td>
          <td>${n ? `<b>${fmtNum(n.totalMg / 1000, 2)} g</b>${n.totalMl ? ` · ${fmtNum(n.totalMl, 0)} mL` : ''}` : '—'}</td>
          <td><div class="row-actions"><button class="icon-btn" data-action="edit-dose" data-id="${p.id}" data-did="${d.id}" aria-label="Editar">${icon('edit')}</button>
          <button class="icon-btn danger" data-action="delete-dose" data-id="${p.id}" data-did="${d.id}" aria-label="Excluir">${icon('trash')}</button></div></td></tr>`;
        })
        .join('')}</tbody></table></div>
      <p class="muted small">O peso muda com a idade dos animais: atualize o peso médio ao longo do protocolo. Confira sempre com o protocolo aprovado no CEUA.</p>`
        : emptyState('Ex.: doxiciclina 40 mg/kg por gavagem, 10 dias.', '', '')
    }
  </section>`;
}

// ---------- Ações (chamadas pelo app) ----------
export const actions = {
  'new-project': () =>
    openForm({
      title: 'Novo projeto',
      fields: [
        { name: 'title', label: 'Título do projeto', type: 'textarea', rows: 2, required: true },
        { name: 'type', label: 'Tipo', type: 'select', options: PROJECT_TYPES },
        { name: 'start', label: 'Início', type: 'date', required: true, default: todayISO() },
        { name: 'end', label: 'Fim previsto', type: 'date' },
        {
          name: 'template',
          label: 'Começar com',
          type: 'select',
          full: true,
          options: [
            ['', 'Em branco'],
            ['ic', 'Cronograma típico de IC (12 meses)'],
            ['stress', 'Cronograma de IC + protocolo de estresse na adolescência (EA + doxiciclina)'],
          ],
        },
        { name: 'advisor', label: 'Orientador(a)' },
        { name: 'program', label: 'Edital / programa' },
      ],
      submitLabel: 'Criar projeto',
      onSubmit: (v) => {
        const tpl = v.template === 'stress' ? P.templateAdolescentStress() : null;
        const design = tpl ? { ...tpl.design } : { factors: [], groups: [], perBox: 4 };
        design.groups = P.rebuildGroups(design);
        const startYm = (v.start || todayISO()).slice(0, 7);
        let end = v.end;
        if (!end && v.template) {
          const d = new Date(Number(startYm.slice(0, 4)), Number(startYm.slice(5, 7)) + 11, 0);
          end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
        const proj = store.add('projects', {
          title: v.title,
          type: v.type,
          advisor: v.advisor,
          program: v.program,
          start: v.start,
          end,
          status: 'andamento',
          activities: v.template ? icActivities(startYm) : [],
          objectives: [],
          design,
          protocol: { steps: tpl ? tpl.steps : [] },
          cohorts: [],
          reagents: tpl ? tpl.reagents : [],
          doses: tpl ? tpl.doses : [],
          done: {},
        });
        location.hash = `#/projeto?id=${proj.id}`;
        toast('Projeto criado');
      },
    }),
  'add-activity': (el) => activityForm(el.dataset.id),
  'edit-activity': (el) => activityForm(el.dataset.id, el.dataset.aid),
  'cycle-activity': (el) =>
    update(el.dataset.id, (x) => {
      const a = (x.activities || []).find((k) => k.id === el.dataset.aid);
      if (a) a.status = { todo: 'doing', doing: 'done', done: 'todo' }[a.status || 'todo'];
    }),
  'ic-schedule': (el) =>
    update(el.dataset.id, (x) => {
      x.activities = icActivities((x.start || todayISO()).slice(0, 7));
      toast('Cronograma de IC adicionado. Ajuste os meses se precisar.');
    }),
  'add-objective': (el) => objectiveForm(el.dataset.id),
  'edit-objective': (el) => objectiveForm(el.dataset.id, el.dataset.oid),
  'add-delivery': (el) =>
    openForm({
      title: 'Nova entrega do projeto',
      fields: SCHEMAS.milestones.fields(),
      values: { kind: 'relatorio', projectId: el.dataset.id },
      onSubmit: (v) => (store.add('milestones', { ...v, projectId: v.projectId || el.dataset.id }), toast('Entrega adicionada')),
    }),
  'use-stress-template': (el) =>
    update(el.dataset.id, (x) => {
      const tpl = P.templateAdolescentStress();
      x.design = { ...tpl.design };
      x.design.groups = P.rebuildGroups(x.design);
      x.protocol = { steps: tpl.steps };
      x.reagents = [...(x.reagents || []), ...tpl.reagents];
      x.doses = [...(x.doses || []), ...tpl.doses];
      toast('Modelo aplicado. Agora cadastre um lote de animais.');
    }),
  'edit-project': (el) => {
    const p = store.find('projects', el.dataset.id);
    openForm({ title: 'Editar projeto', fields: PROJECT_FIELDS(), values: p, onSubmit: (v) => (store.update('projects', p.id, v), toast('Projeto salvo')) });
  },
  'delete-project': (el) =>
    confirmDialog('Excluir este projeto, com grupos, agenda e reagentes?', () => {
      store.remove('projects', el.dataset.id);
      if (location.hash.includes(el.dataset.id)) location.hash = '#/projeto';
    }),
  'edit-factors': (el) => {
    const p = store.find('projects', el.dataset.id);
    const d = p.design || {};
    openForm({
      title: 'Fatores do estudo',
      fields: [
        { name: 'factors', label: 'Fatores e níveis', type: 'textarea', rows: 5, required: true, placeholder: 'Estresse: Naïve, Estressado\nEA: Sem EA, Com EA\nTratamento: Salina, Doxiciclina', hint: 'Um fator por linha, no formato Fator: nível, nível.' },
        { name: 'defaultN', label: 'n por grupo (para grupos novos)', type: 'number' },
        { name: 'perBox', label: 'Máximo de animais por caixa', type: 'number' },
      ],
      values: { factors: (d.factors || []).map((f) => `${f.name}: ${f.levels.join(', ')}`).join('\n'), defaultN: d.defaultN, perBox: d.perBox },
      onSubmit: (v) =>
        update(p.id, (x) => {
          const factors = v.factors
            .split('\n')
            .map((l) => l.split(':'))
            .filter((a) => a.length >= 2 && a[0].trim())
            .map(([name, levels]) => ({ name: name.trim(), levels: levels.split(',').map((s) => s.trim()).filter(Boolean) }))
            .filter((f) => f.levels.length);
          x.design = { ...(x.design || {}), factors, defaultN: v.defaultN, perBox: v.perBox };
          x.design.groups = P.rebuildGroups(x.design);
          toast(`${x.design.groups.length} grupos montados`);
        }),
    });
  },
  'add-cohort': (el) => cohortForm(el.dataset.id),
  'edit-cohort': (el) => cohortForm(el.dataset.id, el.dataset.cid),
  'delete-cohort': (el) => confirmDialog('Excluir este lote?', () => update(el.dataset.id, (x) => (x.cohorts = x.cohorts.filter((c) => c.id !== el.dataset.cid)))),
  'add-step': (el) => stepForm(el.dataset.id),
  'edit-step': (el) => stepForm(el.dataset.id, el.dataset.sid),
  'delete-step': (el) => confirmDialog('Excluir esta etapa do protocolo?', () => update(el.dataset.id, (x) => (x.protocol.steps = x.protocol.steps.filter((s) => s.id !== el.dataset.sid)))),
  'add-reagent': (el) => subForm(el.dataset.id, 'reagents', REAGENT_FIELDS, 'Novo reagente'),
  'edit-reagent': (el) => subForm(el.dataset.id, 'reagents', REAGENT_FIELDS, 'Editar reagente', el.dataset.rid),
  'delete-reagent': (el) => confirmDialog('Excluir este reagente?', () => update(el.dataset.id, (x) => (x.reagents = x.reagents.filter((r) => r.id !== el.dataset.rid)))),
  'add-dose': (el) => subForm(el.dataset.id, 'doses', DOSE_FIELDS(store.find('projects', el.dataset.id).design), 'Nova dose'),
  'edit-dose': (el) => subForm(el.dataset.id, 'doses', DOSE_FIELDS(store.find('projects', el.dataset.id).design), 'Editar dose', el.dataset.did),
  'delete-dose': (el) => confirmDialog('Excluir esta dose?', () => update(el.dataset.id, (x) => (x.doses = x.doses.filter((d) => d.id !== el.dataset.did)))),
  'toggle-occ': (el) =>
    update(el.dataset.project, (x) => {
      x.done = x.done || {};
      if (x.done[el.dataset.occ]) delete x.done[el.dataset.occ];
      else x.done[el.dataset.occ] = new Date().toISOString();
    }),
};

function activityForm(pid, aid) {
  const p = store.find('projects', pid);
  const a = (p.activities || []).find((k) => k.id === aid);
  const startYm = (p.start || todayISO()).slice(0, 7);
  openForm({
    title: a ? 'Editar atividade do cronograma' : 'Nova atividade do cronograma',
    fields: [
      { name: 'name', label: 'Atividade', required: true, full: true },
      { name: 'start', label: 'Mês de início', type: 'month', required: true },
      { name: 'end', label: 'Mês de término', type: 'month', required: true },
      { name: 'status', label: 'Situação', type: 'select', options: Object.entries(ACT_STATUS) },
      ...(a ? [{ name: 'remove', label: 'Excluir esta atividade', type: 'checkbox', full: true }] : []),
    ],
    values: a || { start: startYm, end: startYm, status: 'todo' },
    onSubmit: (v) =>
      update(pid, (x) => {
        x.activities = x.activities || [];
        if (v.end < v.start) [v.start, v.end] = [v.end, v.start];
        if (a && v.remove) x.activities = x.activities.filter((k) => k.id !== aid);
        else if (a) x.activities = x.activities.map((k) => (k.id === aid ? { ...k, name: v.name, start: v.start, end: v.end, status: v.status } : k));
        else x.activities.push({ id: uid(), name: v.name, start: v.start, end: v.end, status: v.status });
        x.activities.sort((m, n) => m.start.localeCompare(n.start));
      }),
  });
}

function objectiveForm(pid, oid) {
  const p = store.find('projects', pid);
  const objs = getObjectives(p);
  const o = objs.find((k) => k.id === oid);
  openForm({
    title: o ? 'Editar objetivo' : 'Novo objetivo específico',
    fields: [
      { name: 'text', label: 'Objetivo', type: 'textarea', rows: 3, required: true },
      { name: 'status', label: 'Situação', type: 'select', options: OBJ_STATUS },
      { name: 'experimentId', label: 'Experimento que responde', type: 'select', options: [['', '— nenhum —'], ...store.list('experiments').map((e) => [e.id, e.title])] },
      ...(o ? [{ name: 'remove', label: 'Excluir este objetivo', type: 'checkbox', full: true }] : []),
    ],
    values: o || { status: 'pendente' },
    onSubmit: (v) =>
      update(pid, (x) => {
        let list = getObjectives(x).map((k) => ({ ...k, id: k.id.startsWith('o') && k.id.length < 4 ? uid() + k.id : k.id }));
        const key = o ? getObjectives(x).findIndex((k) => k.id === oid) : -1;
        if (o && v.remove) list = list.filter((_, i) => i !== key);
        else if (o) list[key] = { ...list[key], text: v.text, status: v.status, experimentId: v.experimentId };
        else list.push({ id: uid(), text: v.text, status: v.status, experimentId: v.experimentId });
        x.objectives = list;
      }),
  });
}

function cohortForm(pid, cid) {
  const p = store.find('projects', pid);
  const c = (p.cohorts || []).find((k) => k.id === cid);
  openForm({
    title: c ? 'Editar lote' : 'Novo lote de animais',
    fields: COHORT_FIELDS,
    values: c || { name: `Lote ${(p.cohorts || []).length + 1}` },
    onSubmit: (v) =>
      update(pid, (x) => {
        x.cohorts = x.cohorts || [];
        if (c) x.cohorts = x.cohorts.map((k) => (k.id === cid ? { ...k, ...v } : k));
        else x.cohorts.push({ id: uid(), ...v });
        toast('Agenda atualizada com as datas do lote');
      }),
  });
}

function stepForm(pid, sid) {
  const p = store.find('projects', pid);
  const s = (p.protocol?.steps || []).find((k) => k.id === sid);
  const values = s ? { ...s } : { freq: 'daily', color: '#3ee8b5' };
  (values.weekdays || []).forEach((d) => (values[`wd${d}`] = true));
  openForm({
    title: s ? 'Editar etapa' : 'Nova etapa do protocolo',
    fields: STEP_FIELDS(p.design),
    values,
    onSubmit: (v) => {
      const weekdays = P.WEEKDAYS.map((_, i) => (v[`wd${i}`] ? i : null)).filter((x) => x !== null);
      P.WEEKDAYS.forEach((_, i) => delete v[`wd${i}`]);
      if (v.freq === 'weekly' && !weekdays.length) return toast('Escolha ao menos um dia da semana');
      const step = { ...v, weekdays };
      update(pid, (x) => {
        x.protocol = x.protocol || { steps: [] };
        if (s) x.protocol.steps = x.protocol.steps.map((k) => (k.id === sid ? { ...k, ...step } : k));
        else x.protocol.steps.push({ id: uid(), ...step });
      });
    },
  });
}

function subForm(pid, key, fields, titleText, itemId) {
  const p = store.find('projects', pid);
  const item = (p[key] || []).find((k) => k.id === itemId);
  openForm({
    title: titleText,
    fields,
    values: item || {},
    onSubmit: (v) =>
      update(pid, (x) => {
        x[key] = x[key] || [];
        if (item) x[key] = x[key].map((k) => (k.id === itemId ? { ...k, ...v } : k));
        else x[key].push({ id: uid(), ...v });
      }),
  });
}

// Edição direto na tabela de grupos, "por caixa", status dos objetivos e troca de projeto
export function mount(params) {
  const root = document.querySelector('#main');
  if (!root) return null;
  const onChange = (e) => {
    const el = e.target;
    if (el.dataset.groupField) {
      update(el.dataset.id, (x) => {
        const g = x.design.groups.find((k) => k.id === el.dataset.gid);
        if (g) g[el.dataset.groupField] = el.dataset.groupField === 'n' ? (el.value === '' ? '' : Number(el.value)) : el.value;
      });
    }
    if (el.dataset.projField === 'perBox') update(el.dataset.id, (x) => (x.design.perBox = el.value === '' ? '' : Number(el.value)));
    if (el.dataset.objStatus)
      update(el.dataset.id, (x) => {
        const list = getObjectives(x);
        const o = list.find((k) => k.id === el.dataset.objStatus);
        if (o) o.status = el.value;
        x.objectives = list;
      });
    if (el.hasAttribute('data-proto-project')) location.hash = protoUrl(el.value, params.get('parte') || 'agenda');
  };
  root.addEventListener('change', onChange);
  return () => root.removeEventListener('change', onChange);
}
