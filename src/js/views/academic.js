import { store } from '../store.js';
import { esc, icon, fmtDate, badge, progressBar, rowActions, emptyState } from '../ui.js';
import { credits } from '../metrics.js';
import { LEVELS } from '../schemas.js';

export const title = 'Vida acadêmica';

export function render() {
  const s = store.get();
  const p = s.profile;
  const cr = credits(p);
  const level = LEVELS.find(([v]) => v === p.level)?.[1] || '';
  const order = { cursando: 0, planejada: 1, concluida: 2 };
  const courses = [...s.courses].sort((a, b) => order[a.status] - order[b.status]);

  return `<div class="page">
    <header class="page-head">
      <div><p class="eyebrow dark">Vida acadêmica</p><h1>${esc(p.name)}</h1><p class="muted">${esc(level)}${p.program ? ' · ' + esc(p.program) : ''}</p></div>
      <button class="btn btn-ghost" data-action="edit-profile">${icon('edit')} Editar dados</button>
    </header>

    <div class="grid-3 cards-3">
      <section class="card">
        <h3 class="sub">Orientação</h3>
        ${
          p.advisor
            ? `<p><b>${esc(p.advisor)}</b></p>${p.coadvisor ? `<p class="muted">Coorientação: ${esc(p.coadvisor)}</p>` : ''}`
            : `<button class="btn btn-soft full" data-action="edit-profile">${icon('plus')} Cadastrar orientador</button>`
        }
      </section>
      <section class="card">
        <h3 class="sub">Curso</h3>
        <p>Ingresso: <b>${fmtDate(p.start)}</b></p>
        <p>Defesa prevista: <b>${fmtDate(p.end)}</b> ${badge(p.end)}</p>
      </section>
      <section class="card">
        <h3 class="sub">Bolsa</h3>
        ${
          p.scholarship
            ? `<p><b>${esc(p.scholarship)}</b></p>${p.scholarshipEnd ? `<p>Até ${fmtDate(p.scholarshipEnd)} ${badge(p.scholarshipEnd)}</p>` : ''}`
            : `<p class="muted">Sem bolsa cadastrada.</p>`
        }
      </section>
    </div>

    <section class="section">
      <header class="section-head">
        <h2>${icon('book')} Disciplinas cursadas</h2>
        <button class="btn btn-soft" data-action="add" data-col="courses">${icon('plus')} Disciplina</button>
      </header>
      <div class="card soft credits-card">
        <div class="pace-row"><span>Créditos concluídos</span><b>${cr.done}${cr.req ? ` de ${cr.req}` : ''}</b></div>
        ${progressBar(cr.pct)}
        <small class="muted">${cr.req ? (cr.done >= cr.req ? 'Créditos completos ✓' : `Faltam ${Math.max(0, cr.req - cr.done)} créditos`) : 'Informe os créditos exigidos em “Editar dados”.'}${cr.ongoing ? ` · ${cr.ongoing} em curso` : ''}</small>
      </div>
      ${
        courses.length
          ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Disciplina</th><th>Semestre</th><th>Créditos</th><th>Situação</th><th>Conceito</th><th></th></tr></thead>
          <tbody>${courses
            .map(
              (c) => `<tr>
              <td>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.name)}</a>` : esc(c.name)}</td>
              <td>${esc(c.term || '—')}</td><td>${esc(c.credits)}</td>
              <td><span class="pill status-${c.status}">${{ cursando: 'Cursando', concluida: 'Concluída', planejada: 'Planejada' }[c.status] || ''}</span></td>
              <td>${esc(c.grade || '—')}</td><td>${rowActions('courses', c.id)}</td></tr>`
            )
            .join('')}</tbody></table></div>`
          : emptyState('Adicione suas disciplinas para acompanhar os créditos. Guarde o link da ementa: concursos pedem.', 'add-courses', 'Adicionar disciplina')
      }
    </section>
  </div>`;
}
