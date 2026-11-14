import { store } from '../store.js';
import { esc, icon, fmtDate, badge, progressBar, rowActions, emptyState, daysUntil } from '../ui.js';
import { stagesOf, experimentProgress } from '../metrics.js';
import { STAGE_STATUS } from '../schemas.js';
import * as drawing from './drawing.js';
import * as course from './course.js';

export const title = 'Planejamento';

export function render(params) {
  if (params.get('desenho')) return drawing.render(params);
  const aba = params.get('aba') === 'academico' ? 'academico' : 'experimental';
  return `<div class="page">
    <header class="page-head">
      <div><p class="eyebrow dark">Planejamento</p><h1>${aba === 'academico' ? 'Planejamento acadêmico' : 'Planejamento experimental'}</h1></div>
    </header>
    <nav class="subtabs" aria-label="Tipo de planejamento">
      <a href="#/planejamento?aba=experimental" class="subtab ${aba === 'experimental' ? 'active' : ''}">${icon('flask')} Planejamento experimental</a>
      <a href="#/planejamento?aba=academico" class="subtab ${aba === 'academico' ? 'active' : ''}">${icon('book')} Planejamento acadêmico</a>
    </nav>
    ${aba === 'academico' ? (params.get('disc') ? course.renderCourse(params) : course.renderList()) : experimental(params)}
  </div>`;
}

export function mount(params) {
  if (params.get('desenho')) return drawing.mount(params);
  return null;
}

const localISO = (iso) => {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function drawingsSection(s, expName) {
  const list = [...s.drawings].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  return `<section class="section">
    <header class="section-head">
      <h2>${icon('edit')} Desenhos experimentais</h2>
      <button class="btn btn-soft" data-action="new-drawing">${icon('plus')} Novo desenho</button>
    </header>
    ${
      list.length
        ? `<div class="drawing-grid">${list
            .map(
              (d) => `<a class="card drawing-card" href="#/planejamento?aba=experimental&desenho=${d.id}">
          <div class="thumb">${drawing.thumbnail(d.shapes)}</div>
          <strong>${esc(d.title)}</strong>
          <small class="muted">${[expName[d.experimentId], d.updatedAt ? 'editado ' + fmtDate(localISO(d.updatedAt)) : ''].filter(Boolean).map(esc).join(' · ')}</small>
        </a>`
            )
            .join('')}</div>`
        : emptyState('Monte o desenho do seu experimento com formas, setas e texto, como no PowerPoint. Há modelos prontos de linha do tempo e de grupos.', 'new-drawing', 'Criar primeiro desenho')
    }
  </section>`;
}

function experimental(params) {
  const s = store.get();
  const filter = params.get('exp') || '';
  const expName = Object.fromEntries(s.experiments.map((e) => [e.id, e.title]));
  const logs = [...s.logs]
    .filter((l) => !filter || l.experimentId === filter)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return `<div class="section-head">
      <h2>${icon('flask')} Experimentos</h2>
      <button class="btn btn-primary" data-action="add" data-col="experiments">${icon('plus')} Novo experimento</button>
    </div>
    <section class="section">
      ${
        s.experiments.length
          ? `<div class="exp-grid">${s.experiments.map((e) => expCard(e, s)).join('')}</div>`
          : emptyState('Cadastre um experimento para acompanhar Desenho → Coleta → Análise → Escrita.', 'add-experiments', 'Novo experimento')
      }
    </section>

    ${drawingsSection(s, expName)}

    <div class="grid-2">
      <section class="section">
        <header class="section-head">
          <h2>${icon('note')} Diário de bancada</h2>
          <div class="head-actions">
            <select class="select-sm" data-filter="exp" aria-label="Filtrar por experimento">
              <option value="">Todos os experimentos</option>
              ${s.experiments.map((e) => `<option value="${e.id}" ${filter === e.id ? 'selected' : ''}>${esc(e.title)}</option>`).join('')}
            </select>
            <button class="btn btn-soft" data-action="add" data-col="logs">${icon('plus')} Registro</button>
          </div>
        </header>
        ${
          logs.length
            ? `<ul class="log-list">${logs
                .map(
                  (l) => `<li class="log">
              <div class="log-date"><b>${fmtDate(l.date, { day: '2-digit' })}</b><span>${fmtDate(l.date, { month: 'short' })}</span></div>
              <div class="log-body">
                ${l.experimentId ? `<small class="tag">${esc(expName[l.experimentId] || '')}</small>` : ''}
                <p class="pre">${esc(l.did)}</p>
                ${l.issues ? `<p class="log-issue pre">⚠︎ ${esc(l.issues)}</p>` : ''}
                ${l.next ? `<p class="log-next">→ ${esc(l.next)}</p>` : ''}
              </div>
              ${rowActions('logs', l.id)}
            </li>`
                )
                .join('')}</ul>`
            : emptyState('Anote o que fez na bancada, mesmo que curto. Isso vira sua metodologia depois.', 'add-logs', 'Primeiro registro')
        }
      </section>

      <div class="stack">
        <section class="section">
          <header class="section-head">
            <h2>${icon('shield')} Ética (CEUA / CEP)</h2>
            <button class="btn btn-soft" data-action="add" data-col="ethics">${icon('plus')} Protocolo</button>
          </header>
          ${
            s.ethics.length
              ? s.ethics
                  .map((e) => {
                    const pct = e.approved ? (Number(e.used || 0) / Number(e.approved)) * 100 : 0;
                    const n = daysUntil(e.validUntil);
                    return `<article class="card ethics">
                <div class="ethics-top"><div><strong>${esc(e.kind)} ${esc(e.number)}</strong><p class="muted">${esc(e.title || '')}</p></div>${rowActions('ethics', e.id)}</div>
                ${e.validUntil ? `<p class="small">Validade: ${fmtDate(e.validUntil)} ${badge(e.validUntil)}${n !== null && n <= 60 && n >= 0 ? ' <span class="hint-warn">pense na renovação</span>' : ''}</p>` : ''}
                ${e.approved ? `<div class="pace-row"><span>Utilizados</span><b>${e.used || 0} / ${e.approved}</b></div>${progressBar(pct, pct > 85 ? 'bar-warn' : '')}` : ''}
              </article>`;
                  })
                  .join('')
              : emptyState('Registre o número e a validade do protocolo para não ser pego de surpresa.', 'add-ethics', 'Protocolo de ética')
          }
        </section>

        <section class="section">
          <header class="section-head">
            <h2>${icon('paper')} Protocolos (POPs)</h2>
            <button class="btn btn-soft" data-action="add" data-col="protocols">${icon('plus')} POP</button>
          </header>
          ${
            s.protocols.length
              ? `<ul class="rows">${s.protocols
                  .map(
                    (p) => `<li class="row">
                <div class="row-main">
                  <strong>${p.url ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a>` : esc(p.title)}</strong>
                  <small class="muted">${esc(p.version || '')}${p.date ? ' · ' + fmtDate(p.date) : ''}${p.experimentId ? ' · ' + esc(expName[p.experimentId] || '') : ''}</small>
                  ${p.changes ? `<small class="muted">Mudou: ${esc(p.changes)}</small>` : ''}
                </div>${rowActions('protocols', p.id)}</li>`
                  )
                  .join('')}</ul>`
              : emptyState('Guarde seus POPs com versão: quando algo mudar, você sabe o que e quando.', 'add-protocols', 'Adicionar POP')
          }
        </section>
      </div>
    </div>`;
}

function expCard(e, s) {
  const pr = experimentProgress(e);
  const ethics = s.ethics.find((x) => x.id === e.ethicsId);
  const logs = s.logs.filter((l) => l.experimentId === e.id).length;
  const tasks = s.tasks.filter((t) => t.experimentId === e.id && !t.done).length;
  const drawings = s.drawings.filter((d) => d.experimentId === e.id);
  return `<article class="card exp-card">
    <header class="exp-head">
      <span class="tile-ico">${icon('flask')}</span>
      <div class="exp-title"><h3>${esc(e.title)}</h3>${e.deadline ? `<small class="muted">Meta: ${fmtDate(e.deadline)} ${badge(e.deadline, pr === 100)}</small>` : ''}</div>
      ${rowActions('experiments', e.id)}
    </header>
    ${e.objective ? `<p class="muted pre clamp">${esc(e.objective)}</p>` : ''}
    <div class="stages" role="group" aria-label="Etapas">
      ${stagesOf(e)
        .map(
          (st) => `<button class="stage st-${st.status}" data-action="cycle-stage" data-id="${e.id}" data-stage="${st.name}" title="${STAGE_STATUS[st.status]}. Clique para mudar">
          <span class="stage-dot">${st.status === 'done' ? icon('check') : ''}</span>${st.name}</button>`
        )
        .join('')}
    </div>
    ${progressBar(pr)}
    <footer class="exp-foot">
      ${e.groups ? `<span>${esc(e.groups)}${e.n ? ` · n=${esc(e.n)}` : ''}</span>` : ''}
      ${ethics ? `<span>${icon('shield')} ${esc(ethics.kind)} ${esc(ethics.number)}</span>` : ''}
      <a href="#/planejamento?aba=experimental&exp=${e.id}">${icon('note')} ${logs} registros</a>
      <span>${icon('check')} ${tasks} tarefas</span>
      ${
        drawings.length
          ? `<a href="#/planejamento?aba=experimental&desenho=${drawings[0].id}">${icon('edit')} ${drawings.length} desenho(s)</a>`
          : `<button class="link-btn dark" data-action="new-drawing" data-exp="${e.id}">${icon('edit')} desenhar</button>`
      }
      <button class="link-btn dark" data-action="add-log-for" data-id="${e.id}">${icon('plus')} registro</button>
    </footer>
  </article>`;
}
