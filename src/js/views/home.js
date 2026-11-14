import { store } from '../store.js';
import { esc, icon, fmtDate, badge, daysUntil, progressBar, urgency } from '../ui.js';
import { agenda, pace, credits, nextMeeting, experimentProgress, currentStage, stagesOf } from '../metrics.js';
import { LEVELS } from '../schemas.js';

export const title = 'Visão geral';

export function hero(p) {
  const level = LEVELS.find(([v]) => v === p.level)?.[1] || '';
  const left = daysUntil(p.end);
  return `<section class="hero">
    <div class="hero-inner">
      <div class="hero-text">
        <p class="eyebrow">${[p.program || level, p.institution].filter(Boolean).map(esc).join(' · ')}</p>
        <h1>${esc(p.project)}</h1>
        <div class="hero-meta">
          ${p.advisor ? `<span>${icon('users')} ${esc(p.advisor)}</span>` : ''}
          ${p.end ? `<span>${icon('clock')} ${left >= 0 ? `${left} dias até a defesa` : 'Prazo de defesa passou'}</span>` : ''}
        </div>
        <button class="link-btn" data-action="edit-profile">Editar projeto ${icon('arrow')}</button>
      </div>
      <div class="hero-art" aria-hidden="true">${heroArt()}</div>
    </div>
  </section>`;
}

function heroArt() {
  return `<svg viewBox="0 -30 420 260" fill="none">
    <defs>
      <linearGradient id="gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7cf5cf" stop-opacity=".35"/><stop offset="1" stop-color="#0e5c55" stop-opacity=".15"/></linearGradient>
    </defs>
    <g transform="translate(10 40) skewY(-6)">
      <rect width="150" height="120" rx="14" fill="url(#gl)" stroke="#8ff7d6" stroke-opacity=".7"/>
      <path d="M12 80 q8 -50 16 0 q8 -50 16 0 q8 -50 16 0 q8 -50 16 0 q8 -50 16 0 q8 -50 16 0 q8 -50 16 0 q8 -50 12 0" stroke="#9ff8dc" stroke-width="3"/>
      <path d="M12 95 h126" stroke="#9ff8dc" stroke-opacity=".5"/>
    </g>
    <g transform="translate(150 20) skewY(-6)">
      <rect width="130" height="130" rx="14" fill="url(#gl)" stroke="#8ff7d6" stroke-opacity=".7"/>
      <g stroke="#9ff8dc" stroke-width="2.5"><path d="M40 40 65 62 95 45M65 62 60 95 92 100M60 95 35 108"/></g>
      <g fill="#bffbe7"><circle cx="40" cy="40" r="7"/><circle cx="65" cy="62" r="9"/><circle cx="95" cy="45" r="6"/><circle cx="60" cy="95" r="7"/><circle cx="92" cy="100" r="6"/><circle cx="35" cy="108" r="5"/></g>
    </g>
    <g transform="translate(270 10) skewY(-6)">
      <rect width="130" height="150" rx="14" fill="url(#gl)" stroke="#8ff7d6" stroke-opacity=".7"/>
      <path d="M45 15 C105 45, 25 75, 85 105 S 45 145, 70 150" stroke="#9ff8dc" stroke-width="3"/>
      <path d="M85 15 C25 45, 105 75, 45 105 S 85 145, 60 150" stroke="#9ff8dc" stroke-width="3" stroke-opacity=".6"/>
      <g stroke="#9ff8dc" stroke-opacity=".5"><path d="M55 30h20M50 60h30M55 90h20M52 120h26"/></g>
    </g>
    <ellipse cx="210" cy="205" rx="200" ry="10" fill="#3ee8b5" opacity=".12"/>
  </svg>`;
}

function todayList() {
  const items = agenda().filter((a) => {
    const n = daysUntil(a.date);
    return n !== null && n <= 7;
  });
  if (!items.length)
    return `<div class="empty small"><p>Nada vencido nem para os próximos 7 dias. Bom momento para escrever. ✍️</p></div>`;
  return `<ul class="today-list">${items
    .map(
      (a) => `<li class="today-item u-${urgency(a.date)}">
      ${
        a.col === 'tasks'
          ? `<button class="checkbox" data-action="toggle-task" data-id="${a.id}" aria-label="Marcar como feita"></button>`
          : a.col === 'assessments'
          ? `<button class="checkbox" data-action="toggle-done" data-col="assessments" data-id="${a.id}" aria-label="Marcar como concluída"></button>`
          : `<span class="kind-dot" title="${esc(a.kind)}"></span>`
      }
      <div class="ti-body">
        <strong>${esc(a.title)}</strong>
        <small>${esc(a.kind)}${a.sub ? ' · ' + esc(a.sub) : ''}</small>
      </div>
      ${badge(a.date)}
    </li>`
    )
    .join('')}</ul>`;
}

export function render() {
  const s = store.get();
  const p = s.profile;
  const pc = pace(p);
  const cr = credits(p);
  const nm = nextMeeting();
  const exps = s.experiments;
  const openTasks = s.tasks.filter((t) => !t.done).length;

  return `${hero(p)}
  <div class="page">
    <div class="grid-today">
      <section class="card card-today">
        <header class="card-head">
          <div><h2>O que eu faço hoje?</h2><p class="muted">Vencidos e próximos 7 dias</p></div>
        </header>
        ${todayList()}
        <div class="quick">
          <button class="btn btn-soft" data-action="add" data-col="logs">${icon('note')} Registro de bancada</button>
          <button class="btn btn-soft" data-action="add" data-col="tasks">${icon('check')} Tarefa</button>
          <button class="btn btn-soft" data-action="add" data-col="meetings">${icon('users')} Reunião</button>
          <button class="btn btn-soft" data-action="add" data-col="milestones">${icon('calendar')} Prazo</button>
        </div>
      </section>

      <div class="stack">
        <section class="card">
          <header class="card-head"><h2>Meu ritmo</h2></header>
          <div class="pace">
            <div class="pace-row"><span>Tempo do curso</span><b>${Math.round(pc.t)}%</b></div>
            ${progressBar(pc.t, 'bar-time')}
            <div class="pace-row"><span>Pesquisa concluída</span><b>${Math.round(pc.p)}%</b></div>
            ${progressBar(pc.p)}
            <p class="pace-msg tone-${pc.tone}">${esc(pc.text)}</p>
          </div>
        </section>
        <section class="card">
          <header class="card-head"><h2>Próxima reunião</h2><a href="#/orientacao" class="mini-link">Orientação ${icon('arrow')}</a></header>
          ${
            nm
              ? `<div class="meeting-mini"><div class="date-chip"><b>${fmtDate(nm.date, { day: '2-digit' })}</b><span>${fmtDate(nm.date, { month: 'short' })}</span></div>
                 <div><strong>${esc(nm.with || 'Orientação')}</strong> ${badge(nm.date)}
                 <p class="muted pre">${esc(nm.agenda || 'Sem pauta ainda. Que tal preparar?')}</p></div></div>`
              : `<div class="empty small"><p>Nenhuma reunião marcada.</p><button class="btn btn-soft" data-action="add" data-col="meetings">${icon('plus')} Marcar reunião</button></div>`
          }
        </section>
      </div>
    </div>

    <div class="grid-3">
      <section class="col">
        <header class="col-head"><h2>Vida acadêmica</h2><a href="#/vida-academica" class="mini-link">Abrir ${icon('arrow')}</a></header>
        <div class="card soft">
          ${
            cr.split
              ? `<div class="pace-row"><span>Obrigatórias</span><b>${cr.mand.done}${cr.mand.req ? ` / ${cr.mand.req}` : ''}</b></div>
                 ${progressBar(cr.mand.pct)}
                 <div class="pace-row"><span>Optativas</span><b>${cr.elec.done}${cr.elec.req ? ` / ${cr.elec.req}` : ''}</b></div>
                 ${progressBar(cr.elec.pct)}`
              : `<div class="pace-row"><span>Créditos</span><b>${cr.total.done}${cr.total.req ? ` / ${cr.total.req}` : ''}</b></div>
                 ${progressBar(cr.total.pct)}`
          }
          ${cr.total.ongoing ? `<small class="muted">+ ${cr.total.ongoing} em curso</small>` : ''}
        </div>
        <h3 class="sub">Disciplinas</h3>
        <ul class="tile-list">
          ${
            s.courses.length
              ? s.courses
                  .slice(0, 4)
                  .map((c) => `<li class="tile">${icon('book')}<span>${esc(c.name)}</span><small class="status-${c.status}">${c.status === 'concluida' ? c.grade || '✓' : c.status === 'cursando' ? 'cursando' : 'planejada'}</small></li>`)
                  .join('')
              : `<li class="tile ghost" data-action="add" data-col="courses">${icon('plus')}<span>Adicionar disciplina</span></li>`
          }
        </ul>
      </section>

      <section class="col">
        <header class="col-head"><h2>Planejamento experimental</h2><a href="#/planejamento?aba=experimental" class="mini-link">Abrir ${icon('arrow')}</a></header>
        ${
          exps.length
            ? `<ol class="exp-rail">${exps
                .map((e) => {
                  const cs = currentStage(e);
                  const pr = experimentProgress(e);
                  return `<li class="${pr === 100 ? 'is-done' : cs?.status === 'doing' ? 'is-active' : ''}">
                  <a href="#/planejamento" class="tile">
                    <span class="tile-ico">${icon('flask')}</span>
                    <span class="tile-main"><span>${esc(e.title)}</span>
                    <small>${pr === 100 ? 'Concluído' : `Etapa: ${esc(cs?.name)}`} · ${Math.round(pr)}%</small></span>
                  </a></li>`;
                })
                .join('')}</ol>`
            : `<ul class="tile-list"><li class="tile ghost" data-action="add" data-col="experiments">${icon('plus')}<span>Cadastrar primeiro experimento</span></li></ul>`
        }
      </section>

      <section class="col">
        <header class="col-head"><h2>Acervo da pesquisa</h2><a href="#/acervo" class="mini-link">Abrir ${icon('arrow')}</a></header>
        <ul class="tile-list">
          ${archiveTile('book', 'Biblioteca de artigos', s.articles.length, '#/acervo?s=biblioteca')}
          ${archiveTile('cert', 'Certificados', s.certificates.length, '#/acervo?s=certificados')}
          ${archiveTile('mic', 'Congressos e banners', s.congresses.length, '#/acervo?s=congressos')}
          ${archiveTile('paper', 'Minha produção', s.papers.length, '#/acervo?s=producao')}
          ${archiveTile('link', 'Modelos e links', s.links.length, '#/acervo?s=links')}
        </ul>
        <p class="muted small-note">${openTasks} tarefa(s) aberta(s) · ${s.logs.length} registro(s) de bancada</p>
      </section>
    </div>
  </div>`;
}

function archiveTile(ic, label, count, href) {
  return `<li><a class="tile" href="${href}"><span class="tile-ico">${icon(ic)}</span><span class="tile-main"><span>${label}</span><small>${count} ${count === 1 ? 'item' : 'itens'}</small></span>${icon('arrow', 'tile-arrow')}</a></li>`;
}
