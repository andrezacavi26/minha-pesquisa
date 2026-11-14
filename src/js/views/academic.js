import { store } from '../store.js';
import { esc, icon, fmtDate, badge, progressBar, rowActions, emptyState } from '../ui.js';
import { credits, courseType } from '../metrics.js';
import { LEVELS } from '../schemas.js';

export const title = 'Vida acadêmica';

export function render() {
  const s = store.get();
  const p = s.profile;
  const cr = credits(p);
  const level = LEVELS.find(([v]) => v === p.level)?.[1] || '';
  const order = { cursando: 0, planejada: 1, concluida: 2 };
  const courses = [...s.courses].sort((a, b) => order[a.status] - order[b.status] || courseType(a).localeCompare(courseType(b)));

  return `<div class="page">
    <header class="page-head">
      <div><p class="eyebrow dark">Vida acadêmica</p><h1>${esc(p.name)}</h1><p class="muted">${[level, p.program].filter(Boolean).map(esc).join(' · ')}</p>
      ${p.institution || p.campus ? `<p class="muted">${icon('book')} ${[p.institution, p.campus].filter(Boolean).map(esc).join(' · ')}</p>` : ''}</div>
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
        ${p.institution ? `<p><b>${esc(p.institution)}</b></p>` : `<button class="btn btn-soft full" data-action="edit-profile">${icon('plus')} Adicionar instituição</button>`}
        ${p.campus ? `<p class="muted">${esc(p.campus)}</p>` : ''}
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
        <div class="head-actions"><a class="mini-link" href="#/planejamento?aba=academico">Provas e trabalhos ${icon('arrow')}</a><button class="btn btn-soft" data-action="add" data-col="courses">${icon('plus')} Disciplina</button></div>
      </header>
      ${creditCards(cr)}
      ${
        courses.length
          ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>Disciplina</th><th>Tipo</th><th>Semestre</th><th>Créditos</th><th>Situação</th><th>Conceito</th><th></th></tr></thead>
          <tbody>${courses
            .map(
              (c) => `<tr>
              <td><a href="#/planejamento?aba=academico&disc=${c.id}">${esc(c.name)}</a></td>
              <td><span class="pill type-${courseType(c)}">${courseType(c) === 'optativa' ? 'Optativa' : 'Obrigatória'}</span></td>
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

function creditBlock(label, c) {
  const note = c.req
    ? c.done >= c.req
      ? 'Completo ✓'
      : `Faltam ${c.missing}`
    : 'Exigência não informada';
  return `<div class="credit-block">
    <div class="pace-row"><span>${label}</span><b>${c.done}${c.req ? ` / ${c.req}` : ''}</b></div>
    ${progressBar(c.pct, c.req && c.done >= c.req ? '' : '')}
    <small class="muted">${note}${c.ongoing ? ` · ${c.ongoing} em curso` : ''}</small>
  </div>`;
}

export function creditCards(cr) {
  if (!cr.split && !cr.total.req) {
    return `<div class="card soft credits-card"><div class="pace-row"><span>Créditos concluídos</span><b>${cr.total.done}</b></div>
      <small class="muted">Informe os créditos exigidos em obrigatórias e optativas em <button class="link-inline" data-action="edit-profile">Editar dados</button>.</small></div>`;
  }
  if (!cr.split) {
    return `<div class="card soft credits-card">${creditBlock('Créditos concluídos', cr.total)}
      <small class="muted">Separe a exigência entre obrigatórias e optativas em <button class="link-inline" data-action="edit-profile">Editar dados</button>.</small></div>`;
  }
  return `<div class="card soft credits-card credits-split">
    ${creditBlock('Obrigatórias', cr.mand)}
    ${creditBlock('Optativas', cr.elec)}
    <div class="credit-total"><span>Total</span><b>${cr.mand.done + cr.elec.done} / ${cr.total.req}</b>
      <small class="muted">${cr.total.missing ? `faltam ${cr.total.missing} créditos` : 'créditos completos ✓'}</small></div>
  </div>`;
}
