import { store } from '../store.js';
import { esc, icon, fmtDate, badge, rowActions, emptyState, todayISO } from '../ui.js';
import { PAPER_STATUS, SCHEMAS } from '../schemas.js';

export const title = 'Acervo';

const TABS = [
  ['producao', 'Produção', 'paper', 'papers'],
  ['congressos', 'Congressos e banners', 'mic', 'congresses'],
  ['certificados', 'Certificados', 'cert', 'certificates'],
  ['links', 'Modelos e links', 'link', 'links'],
];

export function render(params) {
  const s = store.get();
  const tab = TABS.find(([k]) => k === params.get('s')) || TABS[0];
  const [key, , , col] = tab;

  return `<div class="page">
    <header class="page-head">
      <div><p class="eyebrow dark">Acervo da pesquisa</p><h1>Tudo o que você produziu</h1></div>
      <div class="head-actions">
        <button class="btn btn-ghost" data-action="lattes">${icon('copy')} Texto para o Lattes</button>
        <button class="btn btn-primary" data-action="add" data-col="${col}">${icon('plus')} Adicionar</button>
      </div>
    </header>

    <nav class="tabs" aria-label="Seções do acervo">
      ${TABS.map(
        ([k, label, ic, c]) => `<a href="#/acervo?s=${k}" class="tab ${k === key ? 'active' : ''}">${icon(ic)} ${label} <span class="count">${s[c].length}</span></a>`
      ).join('')}
    </nav>

    ${{ producao: papers, congressos: congresses, certificados: certificates, links }[key](s)}
  </div>`;
}

function papers(s) {
  if (!s.papers.length) return emptyState('Acompanhe seus artigos da ideia à publicação.', 'add-papers', 'Novo artigo');
  return `<div class="kanban">${PAPER_STATUS.map(([st, label]) => {
    const list = s.papers.filter((p) => (p.status || 'ideia') === st);
    return `<section class="kcol"><h3>${label} <span class="count">${list.length}</span></h3>
      ${list
        .map(
          (p) => `<article class="card kcard">
          <strong>${esc(p.title)}</strong>
          <small class="muted">${esc([p.journal, p.year].filter(Boolean).join(' · '))}</small>
          ${p.authors ? `<small class="muted">${esc(p.authors)}</small>` : ''}
          <div class="kfoot">${p.qualis ? `<span class="pill">${esc(p.qualis)}</span>` : '<span></span>'}
          <div class="row-actions">
            ${st !== 'publicado' ? `<button class="icon-btn" title="Avançar etapa" data-action="advance-paper" data-id="${p.id}">${icon('arrow')}</button>` : ''}
            <button class="icon-btn" title="Editar" aria-label="Editar" data-action="edit" data-col="papers" data-id="${p.id}">${icon('edit')}</button>
            <button class="icon-btn danger" title="Excluir" aria-label="Excluir" data-action="delete" data-col="papers" data-id="${p.id}">${icon('trash')}</button>
          </div></div>
        </article>`
        )
        .join('')}
    </section>`;
  }).join('')}</div>`;
}

function congresses(s) {
  if (!s.congresses.length) return emptyState('Guarde resumo, banner, certificado e gastos de cada evento num lugar só.', 'add-congresses', 'Novo congresso');
  const list = [...s.congresses].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return `<div class="cards-grid">${list
    .map(
      (c) => `<article class="card">
      <div class="ethics-top"><div><strong>${esc(c.event)}</strong><p class="muted">${esc([c.place, fmtDate(c.date)].filter((x) => x && x !== '—').join(' · '))}</p></div>${rowActions('congresses', c.id)}</div>
      ${c.work ? `<p>“${esc(c.work)}”</p>` : ''}
      <div class="chips">
        ${c.format ? `<span class="pill">${{ poster: 'Pôster', oral: 'Oral', ouvinte: 'Ouvinte' }[c.format]}</span>` : ''}
        ${c.abstractDeadline ? `<span class="pill">Resumo até ${fmtDate(c.abstractDeadline, { day: '2-digit', month: 'short' })}</span> ${badge(c.abstractDeadline)}` : ''}
        ${c.cost ? `<span class="pill">R$ ${Number(c.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>` : ''}
        ${c.url ? `<a class="pill link" href="${esc(c.url)}" target="_blank" rel="noopener">${icon('link')} arquivo</a>` : ''}
      </div></article>`
    )
    .join('')}</div>`;
}

function certificates(s) {
  if (!s.certificates.length) return emptyState('Cadastre os certificados assim que receber. Na hora das horas complementares ou do Lattes, está tudo aqui.', 'add-certificates', 'Novo certificado');
  const kinds = Object.fromEntries(SCHEMAS.certificates.fields().find((f) => f.name === 'kind').options);
  const total = s.certificates.reduce((a, c) => a + (Number(c.hours) || 0), 0);
  const byKind = {};
  s.certificates.forEach((c) => (byKind[c.kind] = (byKind[c.kind] || 0) + (Number(c.hours) || 0)));
  const list = [...s.certificates].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return `<div class="card soft sum">
      <b>${total} h</b> no total
      ${Object.entries(byKind).map(([k, h]) => `<span class="pill">${esc(kinds[k] || k)}: ${h} h</span>`).join('')}
    </div>
    <ul class="rows">${list
      .map(
        (c) => `<li class="row"><span class="tile-ico">${icon('cert')}</span>
        <div class="row-main"><strong>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title)}</a>` : esc(c.title)}</strong>
        <small class="muted">${esc(kinds[c.kind] || '')} · ${fmtDate(c.date)}${c.hours ? ` · ${c.hours} h` : ''}</small></div>
        ${rowActions('certificates', c.id)}</li>`
      )
      .join('')}</ul>`;
}

function links(s) {
  if (!s.links.length) return emptyState('Modelos do programa, templates, artigos-chave e links úteis.', 'add-links', 'Novo item');
  const cats = { modelo: 'Modelos e templates', artigo: 'Artigos de referência', link: 'Links úteis' };
  return Object.entries(cats)
    .map(([k, label]) => {
      const list = s.links.filter((l) => l.category === k);
      if (!list.length) return '';
      return `<h3 class="sub">${label}</h3><ul class="rows">${list
        .map(
          (l) => `<li class="row"><span class="tile-ico">${icon(k === 'modelo' ? 'archive' : k === 'artigo' ? 'paper' : 'link')}</span>
          <div class="row-main"><strong>${l.url ? `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.title)}</a>` : esc(l.title)}</strong>
          ${l.notes ? `<small class="muted">${esc(l.notes)}</small>` : ''}</div>${rowActions('links', l.id)}</li>`
        )
        .join('')}</ul>`;
    })
    .join('');
}

// Texto organizado nas seções do Currículo Lattes, pronto para copiar.
export function lattesText() {
  const s = store.get();
  const yr = (d) => (d ? d.slice(0, 4) : '');
  const lines = [];
  const pub = s.papers.filter((p) => ['aceito', 'publicado'].includes(p.status));
  if (pub.length) {
    lines.push('ARTIGOS COMPLETOS PUBLICADOS / ACEITOS');
    pub.forEach((p, i) =>
      lines.push(`${i + 1}. ${p.authors || ''}. ${p.title}. ${p.journal || ''}${p.year ? ', ' + p.year : ''}${p.doi ? '. DOI: ' + p.doi : ''}${p.status === 'aceito' ? ' (aceito para publicação)' : ''}.`)
    );
    lines.push('');
  }
  const today = todayISO();
  const pres = s.congresses.filter((c) => c.format && c.format !== 'ouvinte' && c.work && c.date && c.date <= today);
  if (pres.length) {
    lines.push('APRESENTAÇÕES DE TRABALHO');
    pres.forEach((c, i) => lines.push(`${i + 1}. ${s.profile.name}. ${c.work}. ${c.format === 'oral' ? 'Apresentação oral' : 'Pôster'}. ${c.event}${c.place ? ', ' + c.place : ''}, ${yr(c.date)}.`));
    lines.push('');
  }
  const groups = { curso: 'CURSOS DE CURTA DURAÇÃO REALIZADOS', congresso: 'PARTICIPAÇÃO EM EVENTOS', apresentacao: 'PARTICIPAÇÃO EM EVENTOS (COM APRESENTAÇÃO)', banca: 'PARTICIPAÇÃO EM BANCAS', monitoria: 'ATIVIDADES DE ENSINO / MONITORIA', premio: 'PRÊMIOS E TÍTULOS', outro: 'OUTRAS ATIVIDADES' };
  Object.entries(groups).forEach(([k, label]) => {
    const list = s.certificates.filter((c) => c.kind === k);
    if (!list.length) return;
    lines.push(label);
    list.forEach((c, i) => lines.push(`${i + 1}. ${c.title}${c.hours ? ` (carga horária: ${c.hours} h)` : ''}, ${yr(c.date)}.`));
    lines.push('');
  });
  const done = s.courses.filter((c) => c.status === 'concluida');
  if (done.length) {
    lines.push('DISCIPLINAS CURSADAS');
    done.forEach((c) => lines.push(`- ${c.name} (${c.credits} créditos${c.grade ? ', conceito ' + c.grade : ''}${c.term ? ', ' + c.term : ''})`));
  }
  return lines.join('\n').trim() || 'Ainda não há itens suficientes no acervo para gerar o texto.';
}
