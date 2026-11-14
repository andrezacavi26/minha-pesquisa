// Planejamento acadêmico: lista de disciplinas e a página de cada disciplina
// (provas, trabalhos, apresentações e outras atividades).
import { store } from '../store.js';
import { esc, icon, fmtDate, badge, rowActions, emptyState, progressBar } from '../ui.js';
import { courseStats, courseType } from '../metrics.js';
import { ASSESSMENT_KINDS, kindLabel } from '../schemas.js';

const STATUS = { cursando: 'Cursando', planejada: 'Vou cursar', concluida: 'Concluída' };
const fmtGrade = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 }));
const PLURAL = { prova: 'Provas', trabalho: 'Trabalhos', apresentacao: 'Apresentações', outro: 'Outras' };
const KIND_ICON = { prova: 'paper', trabalho: 'note', apresentacao: 'mic', outro: 'check' };

export function renderList() {
  const courses = store.list('courses');
  const groups = [
    ['cursando', 'Cursando agora'],
    ['planejada', 'Vou cursar'],
    ['concluida', 'Concluídas'],
  ];
  return `<div class="section-head">
      <div><h2>${icon('book')} Disciplinas</h2><p class="muted">Abra uma disciplina para cadastrar provas, trabalhos e apresentações.</p></div>
      <button class="btn btn-primary" data-action="add" data-col="courses">${icon('plus')} Nova disciplina</button>
    </div>
    ${
      courses.length
        ? groups
            .map(([st, label]) => {
              const list = courses.filter((c) => (c.status || 'cursando') === st);
              if (!list.length) return '';
              return `<h3 class="sub">${label} <span class="count">${list.length}</span></h3>
                <div class="course-grid">${list.map(courseCard).join('')}</div>`;
            })
            .join('')
        : emptyState('Cadastre as disciplinas que você vai cursar. Cada uma ganha uma página para provas, trabalhos e apresentações.', 'add-courses', 'Nova disciplina')
    }`;
}

function courseCard(c) {
  const st = courseStats(c.id);
  const type = courseType(c);
  return `<a class="card course-card" href="#/planejamento?aba=academico&disc=${c.id}">
    <div class="course-top">
      <span class="tile-ico">${icon('book')}</span>
      <div class="course-title"><h3>${esc(c.name)}</h3>
        <small class="muted">${[c.term, c.credits ? `${c.credits} créditos` : '', c.professor].filter(Boolean).map(esc).join(' · ')}</small></div>
      <span class="pill type-${type}">${type === 'optativa' ? 'Optativa' : 'Obrigatória'}</span>
    </div>
    ${c.schedule ? `<p class="small muted">${icon('clock')} ${esc(c.schedule)}${c.room ? ' · ' + esc(c.room) : ''}</p>` : ''}
    <div class="course-stats">
      <div><span>Atividades</span><b>${st.done}/${st.total}</b></div>
      <div><span>Média parcial</span><b>${fmtGrade(st.avg)}</b></div>
      <div class="grow"><span>Próxima</span>${
        st.next ? `<b class="ellipsis">${esc(kindLabel(st.next.kind))}: ${esc(st.next.title)}</b> ${badge(st.next.date)}` : `<b class="muted">${st.late ? `${st.late} atrasada(s)` : '—'}</b>`
      }</div>
    </div>
    ${st.total ? progressBar((st.done / st.total) * 100) : ''}
  </a>`;
}

export function renderCourse(params) {
  const c = store.find('courses', params.get('disc'));
  if (!c)
    return `<div class="empty"><p>Disciplina não encontrada.</p><a class="btn btn-soft" href="#/planejamento?aba=academico">Voltar</a></div>`;
  const st = courseStats(c.id);
  const filter = params.get('tipo') || '';
  const type = courseType(c);
  const counts = Object.fromEntries(ASSESSMENT_KINDS.map(([k]) => [k, st.list.filter((a) => (a.kind || 'outro') === k).length]));
  const list = st.list
    .filter((a) => !filter || (a.kind || 'outro') === filter)
    .sort((a, b) => (a.done - b.done) || (a.date || '9999').localeCompare(b.date || '9999'));
  const base = `#/planejamento?aba=academico&disc=${c.id}`;
  const totalWeight = st.list.reduce((s, a) => s + (Number(a.weight) || 0), 0);

  return `<a class="back-link" href="#/planejamento?aba=academico">${icon('arrow', 'flip')} Todas as disciplinas</a>
    <header class="course-head">
      <div>
        <h2 class="course-name">${esc(c.name)}</h2>
        <div class="chips">
          <span class="pill type-${type}">${type === 'optativa' ? 'Optativa' : 'Obrigatória'}</span>
          <span class="pill status-${c.status}">${STATUS[c.status] || ''}</span>
          ${c.credits ? `<span class="pill">${esc(c.credits)} créditos</span>` : ''}
          ${c.term ? `<span class="pill">${esc(c.term)}</span>` : ''}
          ${c.grade ? `<span class="pill">Conceito final: ${esc(c.grade)}</span>` : ''}
        </div>
        <p class="muted course-meta">
          ${c.professor ? `${icon('users')} ${esc(c.professor)}` : ''}
          ${c.schedule ? `${icon('clock')} ${esc(c.schedule)}` : ''}
          ${c.room ? `${icon('home')} ${esc(c.room)}` : ''}
          ${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${icon('link')} Ementa</a>` : ''}
        </p>
      </div>
      <div class="head-actions">
        <button class="btn btn-ghost" data-action="edit" data-col="courses" data-id="${c.id}">${icon('edit')} Editar disciplina</button>
      </div>
    </header>

    <div class="stat-row">
      <div class="card stat"><span>Média parcial</span><b>${fmtGrade(st.avg)}</b><small class="muted">${st.graded ? `${st.graded} atividade(s) com nota` : 'Nenhuma nota ainda'}</small></div>
      <div class="card stat"><span>Atividades concluídas</span><b>${st.done}/${st.total}</b>${st.total ? progressBar((st.done / st.total) * 100) : '<small class="muted">Cadastre abaixo</small>'}</div>
      <div class="card stat"><span>Próxima entrega</span>${
        st.next
          ? `<b class="stat-next">${esc(st.next.title)}</b><small>${fmtDate(st.next.date)} ${badge(st.next.date)}</small>`
          : `<b>—</b><small class="muted">${st.late ? `${st.late} atrasada(s)` : 'Nada pendente'}</small>`
      }</div>
      <div class="card stat"><span>Pesos cadastrados</span><b>${totalWeight}%</b><small class="muted">${totalWeight === 100 ? 'Soma completa ✓' : totalWeight > 100 ? 'Passa de 100%' : 'Soma dos pesos das atividades'}</small></div>
    </div>

    <div class="add-row">
      ${ASSESSMENT_KINDS.map(
        ([k, label]) => `<button class="btn btn-soft" data-action="add-assessment" data-course="${c.id}" data-kind="${k}">${icon('plus')} ${k === 'apresentacao' ? 'Apresentação' : k === 'outro' ? 'Outra atividade' : label}</button>`
      ).join('')}
    </div>

    <nav class="tabs" aria-label="Tipos de atividade">
      <a href="${base}" class="tab ${!filter ? 'active' : ''}">Todas <span class="count">${st.total}</span></a>
      ${ASSESSMENT_KINDS.map(
        ([k]) => `<a href="${base}&tipo=${k}" class="tab ${filter === k ? 'active' : ''}">${icon(KIND_ICON[k])} ${PLURAL[k]} <span class="count">${counts[k]}</span></a>`
      ).join('')}
    </nav>

    ${
      list.length
        ? `<ul class="rows">${list
            .map(
              (a) => `<li class="row assess ${a.done ? 'is-done' : ''}">
          <button class="checkbox ${a.done ? 'checked' : ''}" data-action="toggle-done" data-col="assessments" data-id="${a.id}" aria-label="${a.done ? 'Reabrir' : 'Marcar como concluída'}">${a.done ? icon('check') : ''}</button>
          <span class="kind kind-${a.kind || 'outro'}">${icon(KIND_ICON[a.kind || 'outro'])} ${kindLabel(a.kind)}</span>
          <div class="row-main"><strong>${a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.title)}</a>` : esc(a.title)}</strong>
            ${a.description ? `<small class="muted pre clamp">${esc(a.description)}</small>` : ''}</div>
          <div class="assess-meta">
            ${a.date ? `<small>${fmtDate(a.date)}</small> ${badge(a.date, a.done)}` : '<small class="muted">sem data</small>'}
          </div>
          <div class="assess-nums"><small>Peso</small><b>${a.weight !== '' && a.weight !== undefined ? esc(a.weight) + '%' : '—'}</b></div>
          <div class="assess-nums"><small>Nota</small><b>${a.grade !== '' && a.grade !== undefined ? fmtGrade(a.grade) : '—'}</b></div>
          ${rowActions('assessments', a.id)}
        </li>`
            )
            .join('')}</ul>`
        : emptyState(
            filter ? `Nenhuma atividade do tipo “${kindLabel(filter)}” nesta disciplina.` : 'Cadastre provas, trabalhos e apresentações. As datas entram em “O que eu faço hoje?” e em Prazos.',
            '',
            ''
          )
    }
    ${linkedArticles(c.id)}`;
}

function linkedArticles(courseId) {
  const list = store.list('articles').filter((a) => a.courseId === courseId);
  if (!list.length) return '';
  return `<section class="section linked-arts">
    <h3 class="sub">${icon('book')} Artigos da biblioteca ligados a esta disciplina</h3>
    <ul class="rows">${list
      .map(
        (a) => `<li class="row"><div class="row-main"><strong>${esc(a.title)}</strong><small class="muted">${esc([a.journal, a.year].filter(Boolean).join(' · '))}</small></div>
        <button class="btn btn-ghost sm" data-action="edit" data-col="articles" data-id="${a.id}">${icon('note')} Fichamento</button></li>`
      )
      .join('')}</ul>
  </section>`;
}
