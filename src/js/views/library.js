// Biblioteca de artigos: busca no PubMed e no SciELO, cadastro por DOI/PMID,
// fichamento, status de leitura e referências ABNT/Vancouver.
import { store } from '../store.js';
import { esc, icon, toast, emptyState } from '../ui.js';
import * as lit from '../lit.js';

export const READ_STATUS = [
  ['ler', 'Quero ler'],
  ['lendo', 'Lendo'],
  ['lido', 'Lido'],
];
const statusLabel = (s) => Object.fromEntries(READ_STATUS)[s] || 'Quero ler';
const SOURCE = { pubmed: 'PubMed', scielo: 'SciELO', crossref: 'DOI', manual: 'Manual' };

// Estado da busca (fica fora do store: são resultados temporários)
const S = {
  q: '',
  source: 'ambos',
  sort: 'relevance',
  from: '',
  loading: false,
  error: '',
  results: [], // [{...artigo, _key}]
  totals: {},
  offsets: { pubmed: 0, scielo: 0 },
  open: {}, // resumos abertos nos resultados
  abstracts: {}, // pmid -> resumo carregado
  lookupBusy: false,
  lookupError: '',
};
const rerender = () => window.dispatchEvent(new Event('app:rerender'));

function savedMatch(a) {
  return store
    .list('articles')
    .find((x) => (a.pmid && x.pmid === a.pmid) || (a.doi && x.doi && x.doi.toLowerCase() === a.doi.toLowerCase()));
}

function citation(a) {
  return `${esc(lit.shortAuthors(a.authors))}${a.authors ? ' · ' : ''}<i>${esc(a.journal || a.journalAbbr || '')}</i>${a.year ? ' · ' + esc(a.year) : ''}`;
}

function sourceBadge(a) {
  return `<span class="src src-${a.source || 'manual'}">${SOURCE[a.source] || 'Manual'}</span>`;
}

function links(a) {
  return [
    a.pmid ? `<a href="https://pubmed.ncbi.nlm.nih.gov/${esc(a.pmid)}/" target="_blank" rel="noopener">PubMed</a>` : '',
    a.pmcid ? `<a href="https://pmc.ncbi.nlm.nih.gov/articles/${esc(a.pmcid)}/" target="_blank" rel="noopener">Texto completo (PMC)</a>` : '',
    a.doi ? `<a href="https://doi.org/${esc(a.doi)}" target="_blank" rel="noopener">${a.source === 'scielo' ? 'Texto completo (SciELO)' : 'DOI'}</a>` : '',
    !a.pmid && !a.doi && a.url ? `<a href="${esc(a.url)}" target="_blank" rel="noopener">Abrir</a>` : '',
  ]
    .filter(Boolean)
    .join('');
}

// ---------- Busca ----------
function searchBox() {
  return `<section class="card lib-search">
    <form id="lib-form" class="lib-form" autocomplete="off">
      <div class="lib-q">
        ${icon('paper')}
        <input name="q" type="search" placeholder="Buscar artigos. Ex.: chronic stress intestinal permeability" value="${esc(S.q)}" aria-label="Termos da busca" />
        <button class="btn btn-primary" type="submit" ${S.loading ? 'disabled' : ''}>${S.loading ? 'Buscando…' : 'Buscar'}</button>
      </div>
      <div class="lib-opts">
        <div class="seg" role="radiogroup" aria-label="Onde buscar">
          ${[
            ['ambos', 'PubMed + SciELO'],
            ['pubmed', 'PubMed'],
            ['scielo', 'SciELO'],
          ]
            .map(([v, l]) => `<label class="${S.source === v ? 'on' : ''}"><input type="radio" name="source" value="${v}" ${S.source === v ? 'checked' : ''}/> ${l}</label>`)
            .join('')}
        </div>
        <label class="opt">Ordenar
          <select name="sort"><option value="relevance" ${S.sort === 'relevance' ? 'selected' : ''}>Relevância</option><option value="recent" ${S.sort === 'recent' ? 'selected' : ''}>Mais recentes</option></select>
        </label>
        <label class="opt">Desde
          <input name="from" type="number" min="1900" max="2100" placeholder="ano" value="${esc(S.from)}" />
        </label>
      </div>
      <p class="lib-tip">Dica: no PubMed, use termos em inglês. No SciELO, português funciona bem. No PubMed, aspas buscam a expressão exata.</p>
    </form>
    <div class="lib-or"><span>ou</span></div>
    <form id="lib-lookup" class="lib-lookup" autocomplete="off">
      <label for="lib-id">Adicionar pelo DOI, PMID ou link</label>
      <div class="lib-q">
        <input id="lib-id" name="id" placeholder="Ex.: 10.1590/S0004-28032019000200004  ou  33176074" />
        <button class="btn btn-soft" type="submit" ${S.lookupBusy ? 'disabled' : ''}>${S.lookupBusy ? 'Buscando…' : `${icon('plus')} Adicionar`}</button>
      </div>
      ${S.lookupError ? `<p class="lib-err">${esc(S.lookupError)}</p>` : ''}
      <button type="button" class="link-inline" data-action="add" data-col="articles">Prefiro preencher à mão</button>
    </form>
  </section>`;
}

function results() {
  if (S.error) return `<div class="lib-err box">${esc(S.error)}</div>`;
  if (!S.q) return '';
  if (S.loading && !S.results.length) return `<div class="lib-loading">${icon('clock')} Buscando em ${S.source === 'ambos' ? 'PubMed e SciELO' : SOURCE[S.source]}…</div>`;
  const totals = Object.entries(S.totals)
    .map(([k, v]) => `${SOURCE[k]}: ${v.toLocaleString('pt-BR')}`)
    .join(' · ');
  const canMore = ['pubmed', 'scielo'].some((k) => S.totals[k] !== undefined && S.offsets[k] < S.totals[k]);
  return `<section class="section lib-results">
    <header class="section-head"><h2>Resultados</h2><span class="muted small">${totals} encontrados</span>
      <button class="link-inline" data-lib="clear">Limpar busca</button></header>
    ${
      S.results.length
        ? `<ul class="art-list">${S.results.map(resultItem).join('')}</ul>
           ${canMore ? `<div class="center"><button class="btn btn-ghost" data-lib="more" ${S.loading ? 'disabled' : ''}>${S.loading ? 'Carregando…' : 'Carregar mais'}</button></div>` : ''}`
        : `<div class="empty small"><p>Nada encontrado. Tente outras palavras${S.source === 'pubmed' ? ' (em inglês)' : ''} ou tire o filtro de ano.</p></div>`
    }
  </section>`;
}

function resultItem(a, i) {
  const saved = savedMatch(a);
  const open = S.open[a._key];
  const abs = a.abstract || S.abstracts[a.pmid];
  return `<li class="art ${saved ? 'is-saved' : ''}">
    <div class="art-main">
      <div class="art-top">${sourceBadge(a)}<strong class="art-title">${esc(a.title)}</strong></div>
      <small class="muted">${citation(a)}</small>
      ${
        open
          ? `<div class="art-abs">${abs ? `<p class="pre">${esc(abs)}</p>` : a.pmid && S.abstracts[a.pmid] === undefined ? '<p class="muted">Carregando resumo…</p>' : '<p class="muted">Resumo não disponível nesta base.</p>'}</div>`
          : ''
      }
      <div class="art-links">${links(a)}</div>
    </div>
    <div class="art-actions">
      <button class="btn btn-ghost sm" data-lib="toggle-abs" data-i="${i}">${open ? 'Fechar resumo' : 'Ver resumo'}</button>
      ${
        saved
          ? `<span class="saved-tag">${icon('check')} Na biblioteca</span>`
          : `<button class="btn btn-primary sm" data-lib="save" data-i="${i}">${icon('plus')} Salvar</button>`
      }
    </div>
  </li>`;
}

// ---------- Minha biblioteca ----------
function library(params) {
  const all = [...store.list('articles')].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const st = params.get('ler') || '';
  const expF = params.get('exp') || '';
  const list = all.filter((a) => (!st || (st === 'citar' ? a.cite : (a.status || 'ler') === st)) && (!expF || a.experimentId === expF));
  const count = (k) => all.filter((a) => (k === 'citar' ? a.cite : (a.status || 'ler') === k)).length;
  const exps = Object.fromEntries(store.list('experiments').map((e) => [e.id, e.title]));
  const courses = Object.fromEntries(store.list('courses').map((c) => [c.id, c.name]));
  const base = '#/acervo?s=biblioteca';
  return `<section class="section">
    <header class="section-head">
      <h2>${icon('book')} Minha biblioteca <span class="count">${all.length}</span></h2>
      ${all.length ? `<input class="select-sm lib-filter" id="lib-filter" type="search" placeholder="Filtrar por título, autor, etiqueta…" aria-label="Filtrar biblioteca" />` : ''}
    </header>
    ${
      all.length
        ? `<nav class="chips lib-chips" aria-label="Filtrar por leitura">
        <a class="chip ${!st ? 'on' : ''}" href="${base}${expF ? '&exp=' + expF : ''}">Todos <b>${all.length}</b></a>
        ${READ_STATUS.map(([k, l]) => `<a class="chip ${st === k ? 'on' : ''}" href="${base}&ler=${k}${expF ? '&exp=' + expF : ''}">${l} <b>${count(k)}</b></a>`).join('')}
        <a class="chip ${st === 'citar' ? 'on' : ''}" href="${base}&ler=citar${expF ? '&exp=' + expF : ''}">★ Para citar <b>${count('citar')}</b></a>
        ${expF ? `<a class="chip on" href="${base}${st ? '&ler=' + st : ''}">${icon('flask')} ${esc(exps[expF] || 'Experimento')} ✕</a>` : ''}
      </nav>`
        : ''
    }
    ${
      list.length
        ? `<ul class="art-list" id="lib-list">${list
            .map((a) => {
              const hay = [a.title, a.authors, a.journal, a.tags, a.notes, a.year].join(' ').toLowerCase();
              return `<li class="art saved" data-hay="${esc(hay)}">
            <div class="art-main">
              <div class="art-top">${sourceBadge(a)}<strong class="art-title">${esc(a.title)}</strong>${a.cite ? '<span class="star" title="Para citar">★</span>' : ''}</div>
              <small class="muted">${citation(a)}</small>
              <div class="chips">
                <span class="pill rs-${a.status || 'ler'}">${statusLabel(a.status)}</span>
                ${a.experimentId && exps[a.experimentId] ? `<span class="pill">${icon('flask')} ${esc(exps[a.experimentId])}</span>` : ''}
                ${a.courseId && courses[a.courseId] ? `<span class="pill">${icon('book')} ${esc(courses[a.courseId])}</span>` : ''}
                ${(a.tags || '')
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .map((t) => `<span class="pill tag-pill">#${esc(t)}</span>`)
                  .join('')}
              </div>
              ${a.notes ? `<div class="art-notes"><h4>Fichamento</h4><p class="pre clamp3">${esc(a.notes)}</p></div>` : ''}
              <details class="art-abs-d"><summary>Resumo e referências</summary>
                ${a.abstract ? `<p class="pre">${esc(a.abstract)}</p>` : '<p class="muted">Sem resumo.</p>'}
                ${a.keywords ? `<p class="small muted">Palavras-chave: ${esc(a.keywords)}</p>` : ''}
                <div class="refbox"><span>ABNT</span><p>${lit.abnt(a, { html: true })}</p><button class="btn btn-ghost sm" data-lib="copy-abnt" data-id="${a.id}">${icon('copy')} Copiar</button></div>
                <div class="refbox"><span>Vancouver</span><p>${esc(lit.vancouver(a))}</p><button class="btn btn-ghost sm" data-lib="copy-vanc" data-id="${a.id}">${icon('copy')} Copiar</button></div>
              </details>
              <div class="art-links">${links(a)}</div>
            </div>
            <div class="art-actions">
              <select class="select-sm" data-lib="status" data-id="${a.id}" aria-label="Situação da leitura">
                ${READ_STATUS.map(([k, l]) => `<option value="${k}" ${(a.status || 'ler') === k ? 'selected' : ''}>${l}</option>`).join('')}
              </select>
              <button class="btn btn-soft sm" data-action="edit" data-col="articles" data-id="${a.id}">${icon('note')} Fichamento</button>
              <button class="btn btn-ghost sm" data-lib="copy-abnt" data-id="${a.id}">${icon('copy')} ABNT</button>
              <button class="icon-btn danger" data-action="delete" data-col="articles" data-id="${a.id}" title="Remover" aria-label="Remover">${icon('trash')}</button>
            </div>
          </li>`;
            })
            .join('')}</ul>
          <p class="muted small" id="lib-nomatch" hidden>Nenhum artigo da biblioteca bate com esse filtro.</p>`
        : all.length
        ? `<div class="empty small"><p>Nenhum artigo nesse filtro.</p></div>`
        : emptyState('Sua biblioteca está vazia. Busque acima ou cole um DOI/PMID. Cada artigo salvo ganha fichamento, status de leitura e referência ABNT pronta.', '', '')
    }
  </section>`;
}

export function render(params) {
  return `<div class="lib">${searchBox()}${results()}${library(params)}</div>`;
}

// ---------- Ações ----------
async function runSearch(more = false) {
  if (!S.q.trim()) return;
  S.loading = true;
  S.error = '';
  if (!more) {
    S.fallback = false;
    S.results = [];
    S.totals = {};
    S.offsets = { pubmed: 0, scielo: 0 };
    S.open = {};
  }
  rerender();
  const rows = S.source === 'ambos' ? 10 : 20;
  const opts = (k) => ({ start: S.offsets[k], rows, sort: S.sort, from: S.from });
  const jobs = [];
  const want = (k) => S.source === 'ambos' || S.source === k;
  const add = (k, p) =>
    jobs.push(
      p.then((r) => {
        S.totals[k] = r.total;
        if (r.fallback) S.fallback = true;
        S.offsets[k] += r.items.length;
        return r.items;
      })
    );
  if (want('pubmed') && (!more || S.offsets.pubmed < (S.totals.pubmed ?? Infinity))) add('pubmed', lit.pubmedSearch(S.q, opts('pubmed')));
  if (want('scielo') && (!more || S.offsets.scielo < (S.totals.scielo ?? Infinity))) add('scielo', lit.scieloSearch(S.q, opts('scielo')));
  const settled = await Promise.allSettled(jobs);
  const lists = settled.filter((x) => x.status === 'fulfilled').map((x) => x.value);
  const errors = settled.filter((x) => x.status === 'rejected').map((x) => x.reason?.message);
  // intercala as fontes para não ficar tudo de uma só no topo
  const merged = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) lists.forEach((l) => l[i] && merged.push(l[i]));
  const seen = new Set(S.results.map((r) => r._key));
  merged.forEach((a) => {
    a._key = lit.articleKey(a);
    if (a.doi && S.results.some((r) => r.doi && r.doi.toLowerCase() === a.doi.toLowerCase())) return;
    if (!seen.has(a._key)) {
      seen.add(a._key);
      S.results.push(a);
    }
  });
  if (S.fallback && !more) toast('A cota diária grátis do OpenAlex acabou nesta rede. Usei a busca reserva do SciELO, que é menos precisa. Veja Configurações.');
  if (errors.length && !lists.length) S.error = errors[0];
  else if (errors.length) toast(`Uma das bases não respondeu: ${errors[0]}`);
  S.loading = false;
  rerender();
}

async function saveArticle(a) {
  if (savedMatch(a)) return toast('Este artigo já está na sua biblioteca');
  let data = { ...a };
  delete data._key;
  if (data.source === 'scielo' && data.doi) data = await lit.enrichFromCrossref(data);
  if (data.pmid && !data.abstract) {
    try {
      Object.assign(data, await lit.pubmedAbstract(data.pmid));
    } catch (e) {
      /* salva sem resumo */
    }
  }
  store.add('articles', { ...data, status: 'ler', cite: false, tags: '', notes: '', experimentId: '', courseId: '' });
  toast('Salvo na biblioteca');
}

async function copyRef(a, kind) {
  const text = kind === 'abnt' ? lit.abnt(a) : lit.vancouver(a);
  try {
    if (kind === 'abnt' && window.ClipboardItem) {
      const html = lit.abnt(a, { html: true });
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/plain': new Blob([text], { type: 'text/plain' }), 'text/html': new Blob([html], { type: 'text/html' }) }),
      ]);
    } else await navigator.clipboard.writeText(text);
    toast(kind === 'abnt' ? 'Referência ABNT copiada (com o periódico em negrito)' : 'Referência Vancouver copiada');
  } catch (e) {
    window.prompt('Copie a referência:', text);
  }
}

export function mount() {
  lit.setOpenAlexKey(store.get().profile?.openalexKey);
  const root = document.querySelector('.lib');
  if (!root) return null;

  root.querySelector('#lib-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    S.q = f.q.value.trim();
    S.source = f.source.value;
    S.sort = f.sort.value;
    S.from = f.from.value.trim();
    if (!S.q) return f.q.focus();
    runSearch();
  });
  root.querySelector('#lib-form')?.addEventListener('change', (e) => {
    if (e.target.name === 'source') {
      root.querySelectorAll('.seg label').forEach((l) => l.classList.toggle('on', l.querySelector('input').checked));
    }
  });

  root.querySelector('#lib-lookup')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = e.target.id.value;
    S.lookupError = '';
    S.lookupBusy = true;
    rerender();
    try {
      const a = await lit.lookup(v);
      const dup = savedMatch(a);
      S.lookupBusy = false;
      if (dup) {
        toast('Este artigo já está na sua biblioteca');
        rerender();
        return;
      }
      store.add('articles', { ...a, status: 'ler', cite: false, tags: '', notes: '', experimentId: '', courseId: '' });
      toast(`Adicionado: ${a.title.slice(0, 60)}${a.title.length > 60 ? '…' : ''}`);
    } catch (err) {
      S.lookupBusy = false;
      S.lookupError = err.message;
      rerender();
      document.getElementById('lib-id').value = v;
    }
  });

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-lib]');
    if (!b) return;
    const act = b.dataset.lib;
    if (act === 'clear') {
      Object.assign(S, { q: '', results: [], totals: {}, error: '', open: {} });
      rerender();
    }
    if (act === 'more') runSearch(true);
    if (act === 'save') {
      b.disabled = true;
      b.textContent = 'Salvando…';
      await saveArticle(S.results[Number(b.dataset.i)]);
    }
    if (act === 'toggle-abs') {
      const a = S.results[Number(b.dataset.i)];
      S.open[a._key] = !S.open[a._key];
      rerender();
      if (S.open[a._key] && a.pmid && !a.abstract && S.abstracts[a.pmid] === undefined) {
        try {
          const r = await lit.pubmedAbstract(a.pmid);
          S.abstracts[a.pmid] = r.abstract;
        } catch (err) {
          S.abstracts[a.pmid] = '';
        }
        rerender();
      }
    }
    if (act === 'copy-abnt' || act === 'copy-vanc') {
      const a = store.find('articles', b.dataset.id);
      if (a) copyRef(a, act === 'copy-abnt' ? 'abnt' : 'vanc');
    }
  });

  root.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.lib === 'status') {
      store.update('articles', el.dataset.id, { status: el.value });
      toast(`Marcado como “${statusLabel(el.value)}”`);
    }
  });

  const filter = root.querySelector('#lib-filter');
  filter?.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    let shown = 0;
    root.querySelectorAll('#lib-list > li').forEach((li) => {
      const ok = !q || li.dataset.hay.includes(q);
      li.hidden = !ok;
      if (ok) shown++;
    });
    const nm = root.querySelector('#lib-nomatch');
    if (nm) nm.hidden = shown > 0;
  });

  return null;
}
