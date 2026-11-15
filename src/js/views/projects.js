// Aba "Meu projeto": vários projetos por pessoa. Cada projeto tem Resumo,
// Grupos e animais, Agenda do protocolo e Reagentes e doses.
import { store, uid } from '../store.js';
import { esc, icon, fmtDate, badge, emptyState, todayISO, openForm, confirmDialog, toast, progressBar, daysUntil } from '../ui.js';
import * as P from '../protocol.js';

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
  { name: 'specific', label: 'Objetivos específicos', type: 'textarea', rows: 4, hint: 'Um por linha.' },
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

// ---------- Lista de projetos ----------
function list() {
  const ps = store.list('projects');
  return `<div class="page">
    <header class="page-head">
      <div><p class="eyebrow dark">Meu projeto</p><h1>Projetos de pesquisa</h1>
      <p class="muted">Cada projeto reúne grupos, agenda do protocolo e reagentes. Você pode ter mais de um.</p></div>
      <button class="btn btn-primary" data-action="new-project">${icon('plus')} Novo projeto</button>
    </header>
    ${
      ps.length
        ? `<div class="course-grid">${ps
            .map((p) => {
              const pr = projectProgress(p);
              const gt = P.groupTotals(p.design);
              return `<a class="card course-card project-card" href="#/projeto?id=${p.id}">
              <div class="course-top"><span class="tile-ico">${icon('flask')}</span>
                <div class="course-title"><h3 class="clamp">${esc(p.title)}</h3><small class="muted">${esc(typeLabel(p.type))}${p.program ? ' · ' + esc(p.program) : ''}</small></div></div>
              <div class="course-stats">
                <div><span>Grupos</span><b>${gt.groups || '—'}</b></div>
                <div><span>Animais</span><b>${gt.total || '—'}</b></div>
                <div class="grow"><span>Próxima tarefa</span>${pr.next ? `<b class="ellipsis">${esc(pr.next.step.name)}</b> ${badge(pr.next.date)}` : `<b class="muted">${pr.late ? pr.late + ' atrasada(s)' : '—'}</b>`}</div>
              </div>
              ${pr.total ? progressBar((pr.done / pr.total) * 100) : ''}
            </a>`;
            })
            .join('')}</div>`
        : emptyState('Cadastre seu projeto. Você pode começar do zero ou usar o modelo de estresse na adolescência (EA + doxiciclina), com grupos, protocolo e anticorpos já preenchidos.', 'new-project', 'Novo projeto')
    }
  </div>`;
}

// ---------- Projeto ----------
const TABS = [
  ['resumo', 'Resumo', 'note'],
  ['grupos', 'Grupos e animais', 'users'],
  ['agenda', 'Agenda do protocolo', 'calendar'],
  ['reagentes', 'Reagentes e doses', 'flask'],
];

export function render(params) {
  const id = params.get('id');
  if (!id) return list();
  const p = store.find('projects', id);
  if (!p) return `<div class="page">${emptyState('Projeto não encontrado.', '', '')}</div>`;
  const tab = TABS.find(([k]) => k === params.get('aba'))?.[0] || 'resumo';
  const base = `#/projeto?id=${p.id}`;
  return `<div class="page">
    <a class="back-link" href="#/projeto">${icon('arrow', 'flip')} Todos os projetos</a>
    <header class="page-head project-head">
      <div><p class="eyebrow dark">${esc(typeLabel(p.type))}${p.program ? ' · ' + esc(p.program) : ''}</p><h1 class="project-title">${esc(p.title)}</h1></div>
      <div class="head-actions">
        <button class="btn btn-ghost" data-action="edit-project" data-id="${p.id}">${icon('edit')} Editar</button>
        <button class="icon-btn danger" data-action="delete-project" data-id="${p.id}" title="Excluir projeto" aria-label="Excluir projeto">${icon('trash')}</button>
      </div>
    </header>
    <nav class="tabs" aria-label="Partes do projeto">
      ${TABS.map(([k, l, ic]) => `<a href="${base}&aba=${k}" class="tab ${k === tab ? 'active' : ''}">${icon(ic)} ${l}</a>`).join('')}
    </nav>
    ${{ resumo, grupos, agenda, reagentes }[tab](p, params)}
  </div>`;
}

function resumo(p) {
  const ethics = store.find('ethics', p.ethicsId);
  const gt = P.groupTotals(p.design);
  const exps = store.list('experiments').filter((e) => e.projectId === p.id);
  const specific = String(p.specific || '')
    .split('\n')
    .map((x) => x.replace(/^[-•*\s]+/, '').trim())
    .filter(Boolean);
  const row = (k, v) => (v ? `<div class="kv"><span>${k}</span><b>${v}</b></div>` : '');
  return `<div class="grid-2">
    <div class="stack">
      <section class="card">
        <h3 class="sub">Identificação</h3>
        <div class="kv-list">
          ${row('Aluno(a)', esc(p.student))}
          ${row('Orientador(a)', esc(p.advisor))}
          ${row('Instituição', esc(p.institution))}
          ${row('Período', p.start || p.end ? `${fmtDate(p.start)} a ${fmtDate(p.end)}` : '')}
          ${row('Projeto do orientador', p.parentTitle ? `${esc(p.parentTitle)}${p.parentNumber ? ` (nº ${esc(p.parentNumber)})` : ''}` : '')}
          ${row('Palavras-chave', esc(p.keywords))}
        </div>
      </section>
      ${p.summary ? `<section class="card"><h3 class="sub">Resumo</h3><p class="pre">${esc(p.summary)}</p></section>` : ''}
      <section class="card">
        <h3 class="sub">Objetivos</h3>
        ${p.objective ? `<p class="pre"><b>Geral:</b> ${esc(p.objective)}</p>` : '<p class="muted">Sem objetivo geral cadastrado.</p>'}
        ${specific.length ? `<ol class="obj-list">${specific.map((o) => `<li>${esc(o)}</li>`).join('')}</ol>` : ''}
      </section>
    </div>
    <div class="stack">
      <section class="card">
        <h3 class="sub">${icon('shield')} Ética e animais</h3>
        ${
          ethics
            ? `<p><b>${esc(ethics.kind)} ${esc(ethics.number)}</b> ${ethics.validUntil ? badge(ethics.validUntil) : ''}</p>
               ${ethics.approved ? `<div class="pace-row"><span>Previstos neste projeto</span><b>${gt.total} de ${ethics.approved} aprovados</b></div>${progressBar((gt.total / ethics.approved) * 100, gt.total > ethics.approved ? 'bar-warn' : '')}` : ''}
               ${ethics.approved && gt.total > ethics.approved ? `<p class="hint-warn">O projeto prevê mais animais do que o aprovado no ${esc(ethics.kind)}.</p>` : ''}`
            : `<p class="muted">Nenhum protocolo de ética ligado.</p><button class="btn btn-soft" data-action="edit-project" data-id="${p.id}">${icon('plus')} Ligar CEUA/CEP</button>`
        }
      </section>
      <section class="card">
        <h3 class="sub">${icon('flask')} Experimentos deste projeto</h3>
        ${
          exps.length
            ? `<ul class="rows">${exps.map((e) => `<li class="row"><div class="row-main"><strong>${esc(e.title)}</strong></div></li>`).join('')}</ul>`
            : '<p class="muted small">Ao editar um experimento em Planejamento, escolha este projeto para ele aparecer aqui.</p>'
        }
      </section>
      <section class="card shortcuts">
        <h3 class="sub">Planejar a execução</h3>
        <a class="tile" href="#/projeto?id=${p.id}&aba=grupos"><span class="tile-ico">${icon('users')}</span><span class="tile-main"><span>Grupos e animais</span><small>${gt.groups} grupos · ${gt.total} animais${gt.boxes ? ` · ${gt.boxes} caixas` : ''}</small></span>${icon('arrow', 'tile-arrow')}</a>
        <a class="tile" href="#/projeto?id=${p.id}&aba=agenda"><span class="tile-ico">${icon('calendar')}</span><span class="tile-main"><span>Agenda do protocolo</span><small>${(p.protocol?.steps || []).length} etapas · ${(p.cohorts || []).length} lote(s)</small></span>${icon('arrow', 'tile-arrow')}</a>
        <a class="tile" href="#/projeto?id=${p.id}&aba=reagentes"><span class="tile-ico">${icon('flask')}</span><span class="tile-main"><span>Reagentes e doses</span><small>${(p.reagents || []).length} reagentes · ${(p.doses || []).length} doses</small></span>${icon('arrow', 'tile-arrow')}</a>
      </section>
    </div>
  </div>`;
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
  const base = `#/projeto?id=${p.id}&aba=agenda`;
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
        {
          name: 'template',
          label: 'Começar com',
          type: 'select',
          full: true,
          options: [
            ['', 'Projeto em branco'],
            ['stress', 'Modelo: estresse na adolescência + enriquecimento ambiental + doxiciclina (8 grupos)'],
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
        const proj = store.add('projects', {
          title: v.title,
          type: v.type,
          advisor: v.advisor,
          program: v.program,
          status: 'planejamento',
          design,
          protocol: { steps: tpl ? tpl.steps : [] },
          cohorts: [],
          reagents: tpl ? tpl.reagents : [],
          doses: tpl ? tpl.doses : [],
          done: {},
        });
        location.hash = `#/projeto?id=${proj.id}&aba=${tpl ? 'agenda' : 'resumo'}`;
        toast(tpl ? 'Projeto criado com o modelo. Agora cadastre um lote de animais.' : 'Projeto criado');
      },
    }),
  'edit-project': (el) => {
    const p = store.find('projects', el.dataset.id);
    openForm({ title: 'Editar projeto', fields: PROJECT_FIELDS(), values: p, onSubmit: (v) => (store.update('projects', p.id, v), toast('Projeto salvo')) });
  },
  'delete-project': (el) =>
    confirmDialog('Excluir este projeto, com grupos, agenda e reagentes?', () => {
      store.remove('projects', el.dataset.id);
      location.hash = '#/projeto';
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

// Edição direto na tabela de grupos e no "por caixa"
export function mount(params) {
  const root = document.querySelector('#main');
  if (!root || !params.get('id')) return null;
  const onChange = (e) => {
    const el = e.target;
    if (el.dataset.groupField) {
      update(el.dataset.id, (x) => {
        const g = x.design.groups.find((k) => k.id === el.dataset.gid);
        if (g) g[el.dataset.groupField] = el.dataset.groupField === 'n' ? (el.value === '' ? '' : Number(el.value)) : el.value;
      });
    }
    if (el.dataset.projField === 'perBox') update(el.dataset.id, (x) => (x.design.perBox = el.value === '' ? '' : Number(el.value)));
  };
  root.addEventListener('change', onChange);
  return () => root.removeEventListener('change', onChange);
}
