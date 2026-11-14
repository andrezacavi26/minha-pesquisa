import { store } from '../store.js';
import { esc, icon, fmtDate, badge, daysUntil, urgency, emptyState, todayISO } from '../ui.js';
import { agenda, timeElapsed } from '../metrics.js';

export const title = 'Prazos';

export function render(params) {
  const s = store.get();
  const p = s.profile;
  const showDone = params.get('feitos') === '1';
  const items = agenda({ includeDone: showDone });
  const late = items.filter((a) => !a.done && daysUntil(a.date) < 0);
  const future = items.filter((a) => a.done || daysUntil(a.date) >= 0);

  // agrupar por mês
  const groups = {};
  future.forEach((a) => {
    const k = a.date.slice(0, 7);
    (groups[k] ||= []).push(a);
  });

  return `<div class="page">
    <header class="page-head">
      <div><p class="eyebrow dark">Linha do tempo</p><h1>Prazos e marcos</h1></div>
      <button class="btn btn-primary" data-action="add" data-col="milestones">${icon('plus')} Novo prazo</button>
    </header>

    ${courseLine(p, s.milestones)}

    <div class="section-head between">
      <h2>Agenda</h2>
      <a class="mini-link" href="#/prazos${showDone ? '' : '?feitos=1'}">${showDone ? 'Ocultar concluídos' : 'Mostrar concluídos'}</a>
    </div>

    ${
      late.length
        ? `<section class="card late-box"><h3>${icon('clock')} Atrasados (${late.length})</h3><ul class="rows">${late.map(row).join('')}</ul></section>`
        : ''
    }

    ${
      Object.keys(groups).length
        ? Object.entries(groups)
            .map(
              ([k, list]) => `<section class="month">
          <h3 class="month-title">${cap(fmtDate(k + '-01', { month: 'long', year: 'numeric' }))}</h3>
          <ul class="rows">${list.map(row).join('')}</ul></section>`
            )
            .join('')
        : emptyState('Sem prazos futuros. Cadastre qualificação, relatórios e submissões.', 'add-milestones', 'Novo prazo')
    }
  </div>`;
}

const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);

function row(a) {
  const canToggle = a.col === 'tasks' || a.col === 'milestones' || a.col === 'assessments';
  return `<li class="row agenda-row u-${urgency(a.date, a.done)} ${a.done ? 'is-done' : ''}">
    <div class="date-chip small"><b>${fmtDate(a.date, { day: '2-digit' })}</b><span>${fmtDate(a.date, { month: 'short' })}</span></div>
    <div class="row-main"><strong>${esc(a.title)}</strong><small class="muted"><span class="tag">${esc(a.kind)}</span> ${esc(a.sub || '')}</small></div>
    ${badge(a.date, a.done)}
    ${
      canToggle
        ? `<button class="icon-btn" title="${a.done ? 'Reabrir' : 'Marcar como concluído'}" data-action="toggle-done" data-col="${a.col}" data-id="${a.id}">${icon('check')}</button>`
        : ''
    }
    ${a.col ? `<button class="icon-btn" title="Editar" data-action="edit" data-col="${a.col}" data-id="${a.id}">${icon('edit')}</button>` : `<button class="icon-btn" title="Editar projeto" data-action="edit-profile">${icon('edit')}</button>`}
  </li>`;
}

function courseLine(p, milestones) {
  if (!p?.start || !p?.end) return '';
  const total = daysUntil(p.end) - daysUntil(p.start);
  const pos = (iso) => Math.max(0, Math.min(100, ((-daysUntil(p.start) + daysUntil(iso)) / total) * 100));
  const now = timeElapsed(p);
  const marks = milestones.filter((m) => m.date >= p.start && m.date <= p.end);
  // anos
  const years = [];
  const y0 = Number(p.start.slice(0, 4)), y1 = Number(p.end.slice(0, 4));
  for (let y = y0 + 1; y <= y1; y++) years.push(`${y}-01-01`);
  return `<section class="card course-line">
    <div class="cl-head"><span>Ingresso · ${fmtDate(p.start)}</span><span>Defesa · ${fmtDate(p.end)}</span></div>
    <div class="cl-track">
      <div class="cl-fill" style="width:${now}%"></div>
      ${years.map((y) => `<span class="cl-year" style="left:${pos(y)}%">${y.slice(0, 4)}</span>`).join('')}
      ${marks
        .map(
          (m) => `<button class="cl-mark ${m.done ? 'done' : ''} u-${urgency(m.date, m.done)}" style="left:${pos(m.date)}%" data-action="edit" data-col="milestones" data-id="${m.id}" title="${esc(m.title)} · ${fmtDate(m.date)}">
          <span class="cl-label">${esc(m.title)}</span></button>`
        )
        .join('')}
      <span class="cl-now" style="left:${now}%"><span>hoje</span></span>
    </div>
  </section>`;
}
