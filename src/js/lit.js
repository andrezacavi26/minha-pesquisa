// Busca de literatura: PubMed (E-utilities da NCBI) e SciELO.
// SciELO: busca pelo OpenAlex (filtrando DOIs 10.1590, que são os do SciELO), com o Crossref
// como reserva e como fonte dos dados estruturados (autores, volume, páginas) ao salvar.
// Todas as APIs aceitam chamadas direto do navegador, sem servidor.

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
const TOOL = '&tool=minhapesquisa';
const CROSSREF = 'https://api.crossref.org/';
const OPENALEX = 'https://api.openalex.org/';
let openalexKey = '';
export const setOpenAlexKey = (k) => (openalexKey = String(k || '').trim());
const SEL = 'DOI,title,author,container-title,short-container-title,issued,abstract,volume,issue,page,URL,type';

async function get(url, as = 'json') {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let r;
  try {
    r = await fetch(url, { signal: ctrl.signal });
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'A base demorou demais para responder. Tente de novo.' : 'Sem conexão com a base. Verifique a internet e tente de novo.');
  } finally {
    clearTimeout(timer);
  }
  if (r.status === 404) {
    const err = new Error('Não encontrado');
    err.notFound = true;
    throw err;
  }
  if (r.status === 429) {
    const err = new Error('Muitas buscas seguidas. Espere alguns segundos e tente de novo.');
    err.rateLimited = true;
    throw err;
  }
  if (!r.ok) throw new Error(`A base respondeu com erro (${r.status}). Tente de novo em instantes.`);
  return as === 'json' ? r.json() : r.text();
}

// ---------- limpeza de texto ----------
const decode = (s) => {
  const t = document.createElement('textarea');
  t.innerHTML = s;
  return t.value;
};
export const clean = (s) =>
  decode(String(s || '').replace(/<\/?(jats:)?(p|sec)[^>]*>/g, '\n').replace(/<jats:title>[^<]*<\/jats:title>/g, '').replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();

const MONTHS_EN = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

// "Shiroma PR" (formato PubMed) -> "Shiroma, PR"
function pmName(name) {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length < 2) return name;
  const last = parts[parts.length - 1];
  if (/^[A-Z]{1,4}$/.test(last)) return `${parts.slice(0, -1).join(' ')}, ${last}`;
  return name;
}

// ---------- PubMed ----------
function fromSummary(s) {
  const aid = (t) => (s.articleids || []).find((a) => a.idtype === t)?.value || '';
  const pd = String(s.pubdate || s.epubdate || '');
  const mon = MONTHS_EN[(pd.split(' ')[1] || '').toLowerCase().slice(0, 3)] || '';
  return {
    source: 'pubmed',
    pmid: String(s.uid),
    doi: aid('doi'),
    pmcid: aid('pmc'),
    title: clean(s.title).replace(/\.$/, ''),
    authors: (s.authors || []).filter((a) => a.authtype === 'Author').map((a) => pmName(a.name)).join('; '),
    journal: s.fulljournalname || s.source || '',
    journalAbbr: s.source || '',
    year: pd.slice(0, 4),
    month: mon,
    volume: s.volume || '',
    issue: s.issue || '',
    pages: s.pages || '',
    abstract: '',
    url: `https://pubmed.ncbi.nlm.nih.gov/${s.uid}/`,
  };
}

export async function pubmedSummaries(ids) {
  if (!ids.length) return [];
  const r = await get(`${EUTILS}esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(',')}${TOOL}`);
  return ids.map((id) => r.result?.[id]).filter((x) => x && !x.error).map(fromSummary);
}

export async function pubmedSearch(q, { start = 0, rows = 20, sort = 'relevance', from = '' } = {}) {
  let url = `${EUTILS}esearch.fcgi?db=pubmed&retmode=json&retmax=${rows}&retstart=${start}&sort=${sort === 'recent' ? 'pub_date' : 'relevance'}&term=${encodeURIComponent(q)}${TOOL}`;
  if (from) url += `&datetype=pdat&mindate=${from}&maxdate=3000`;
  const r = await get(url);
  const ids = r.esearchresult?.idlist || [];
  return { total: Number(r.esearchresult?.count || 0), items: await pubmedSummaries(ids) };
}

export async function pubmedAbstract(pmid) {
  const xml = await get(`${EUTILS}efetch.fcgi?db=pubmed&retmode=xml&id=${pmid}${TOOL}`, 'text');
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const abstract = [...doc.querySelectorAll('Abstract > AbstractText')]
    .map((a) => (a.getAttribute('Label') ? `${a.getAttribute('Label')}: ` : '') + a.textContent.trim())
    .join('\n\n');
  const keywords = [...doc.querySelectorAll('KeywordList > Keyword')].map((k) => k.textContent.trim()).join(', ');
  return { abstract, keywords };
}

// ---------- SciELO via Crossref ----------
function fromCrossref(it) {
  const dp = it.issued?.['date-parts']?.[0] || [];
  const doi = it.DOI || '';
  return {
    source: doi.toLowerCase().startsWith('10.1590/') ? 'scielo' : 'crossref',
    pmid: '',
    doi,
    pmcid: '',
    title: clean((it.title || [])[0] || '').replace(/\s+/g, ' '),
    authors: (it.author || [])
      .map((a) => (a.family ? `${a.family}${a.given ? ', ' + a.given : ''}` : a.name || ''))
      .filter(Boolean)
      .join('; '),
    journal: clean((it['container-title'] || [])[0] || ''),
    journalAbbr: clean((it['short-container-title'] || [])[0] || ''),
    year: dp[0] ? String(dp[0]) : '',
    month: dp[1] || '',
    volume: it.volume || '',
    issue: it.issue || '',
    pages: it.page || '',
    abstract: clean(it.abstract || ''),
    url: doi ? `https://doi.org/${doi}` : it.URL || '',
  };
}

// ---------- SciELO via OpenAlex ----------
function abstractFromIndex(idx) {
  if (!idx) return '';
  const words = [];
  Object.entries(idx).forEach(([w, pos]) => pos.forEach((p) => (words[p] = w)));
  return words.filter((w) => w !== undefined).join(' ');
}

const PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'del', 'della', 'van', 'von', 'y']);
function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/);
  if (parts.length < 2) return full;
  const family = parts.pop();
  return `${family}, ${parts.filter((p) => !PARTICLES.has(p.toLowerCase())).join(' ')}`;
}

function fromOpenAlex(w) {
  const doi = String(w.doi || '').replace(/^https?:\/\/doi\.org\//i, '');
  const b = w.biblio || {};
  const date = String(w.publication_date || '');
  return {
    source: 'scielo',
    pmid: String(w.ids?.pmid || '').replace(/\D/g, ''),
    doi,
    pmcid: '',
    title: clean(w.title || w.display_name || ''),
    authors: (w.authorships || []).map((a) => splitName(a.author?.display_name)).filter(Boolean).join('; '),
    journal: w.primary_location?.source?.display_name || '',
    journalAbbr: '',
    year: w.publication_year ? String(w.publication_year) : '',
    month: date.length >= 7 ? Number(date.slice(5, 7)) : '',
    volume: b.volume || '',
    issue: b.issue || '',
    pages: b.first_page ? `${b.first_page}${b.last_page && b.last_page !== b.first_page ? '-' + b.last_page : ''}` : '',
    abstract: abstractFromIndex(w.abstract_inverted_index),
    url: doi ? `https://doi.org/${doi}` : '',
  };
}

async function scieloOpenAlex(q, { start = 0, rows = 20, sort = 'relevance', from = '' } = {}) {
  const filter = ['doi_starts_with:10.1590', 'type:article', from ? `from_publication_date:${from}-01-01` : ''].filter(Boolean).join(',');
  const page = Math.floor(start / rows) + 1;
  const sel = 'id,ids,doi,title,display_name,publication_year,publication_date,authorships,primary_location,biblio,abstract_inverted_index';
  const url = `${OPENALEX}works?search=${encodeURIComponent(q)}&filter=${filter}&per_page=${rows}&page=${page}&select=${sel}${
    sort === 'recent' ? '&sort=publication_date:desc' : ''
  }${openalexKey ? '&api_key=' + encodeURIComponent(openalexKey) : ''}`;
  const r = await get(url);
  return { total: Number(r.meta?.count || 0), items: (r.results || []).map(fromOpenAlex) };
}

// Busca no SciELO: OpenAlex primeiro; se a cota diária acabar ou ele falhar, usa o Crossref.
export async function scieloSearch(q, opts = {}) {
  try {
    return await scieloOpenAlex(q, opts);
  } catch (e) {
    const r = await scieloCrossref(q, opts);
    r.fallback = true;
    return r;
  }
}

// Reserva: Crossref tende a misturar resultados que têm só uma das palavras,
// então reordenamos pelos que contêm mais termos da busca.
const normTxt = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function rerank(items, q) {
  const terms = normTxt(q)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !PARTICLES.has(t))
    .map((t) => (t.length > 5 ? t.slice(0, -2) : t));
  if (!terms.length) return items;
  return items
    .map((a, i) => {
      const hay = normTxt(a.title + ' ' + a.abstract);
      return { a, i, s: terms.filter((t) => hay.includes(t)).length };
    })
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .map((x) => x.a);
}

async function scieloCrossref(q, { start = 0, rows = 20, sort = 'relevance', from = '' } = {}) {
  const filter = ['type:journal-article', from ? `from-pub-date:${from}` : ''].filter(Boolean).join(',');
  const url = `${CROSSREF}prefixes/10.1590/works?query=${encodeURIComponent(q)}&rows=${rows}&offset=${start}&filter=${filter}&select=${SEL}${
    sort === 'recent' ? '&sort=published&order=desc' : ''
  }`;
  const r = await get(url);
  const items = (r.message?.items || []).map(fromCrossref);
  return { total: Number(r.message?.['total-results'] || 0), items: sort === 'recent' ? items : rerank(items, q) };
}

// Ao salvar um artigo do SciELO, completa com os dados estruturados do Crossref
export async function enrichFromCrossref(a) {
  if (!a.doi) return a;
  try {
    const c = await crossrefByDoi(a.doi);
    return {
      ...a,
      authors: c.authors || a.authors,
      journal: c.journal || a.journal,
      journalAbbr: c.journalAbbr || a.journalAbbr,
      year: c.year || a.year,
      month: c.month || a.month,
      volume: c.volume || a.volume,
      issue: c.issue || a.issue,
      pages: c.pages || a.pages,
      title: a.title || c.title,
      abstract: a.abstract || c.abstract,
    };
  } catch (e) {
    return a;
  }
}

export async function crossrefByDoi(doi) {
  const r = await get(`${CROSSREF}works/${encodeURIComponent(doi)}`);
  return fromCrossref(r.message);
}

// ---------- Identificar o que a pessoa colou ----------
export function parseIdentifier(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  const pm = s.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d{1,9})/i) || s.match(/^(?:pmid:?\s*)?(\d{1,9})$/i);
  if (pm) return { type: 'pmid', value: pm[1] };
  const doi = s.match(/10\.\d{4,9}\/[^\s"<>]+/i);
  if (doi) return { type: 'doi', value: decodeURIComponent(doi[0]).replace(/[.,;)\]]+$/, '') };
  // link do SciELO com pid: o DOI do SciELO costuma ser derivado do pid, mas não é garantido
  return null;
}

export async function lookup(input) {
  const id = parseIdentifier(input);
  if (!id) throw new Error('Cole um DOI (10.xxxx/...), um PMID (só números) ou o link do artigo no PubMed ou com DOI.');
  if (id.type === 'pmid') {
    const [art] = await pubmedSummaries([id.value]);
    if (!art) throw new Error(`Não achei o PMID ${id.value} no PubMed.`);
    Object.assign(art, await pubmedAbstract(id.value).catch(() => ({})));
    return art;
  }
  // DOI: primeiro tenta o PubMed (traz resumo e PMID); se não estiver lá, usa o Crossref (SciELO e outras)
  try {
    const r = await get(`${EUTILS}esearch.fcgi?db=pubmed&retmode=json&term=${encodeURIComponent(id.value + '[doi]')}${TOOL}`);
    const pmid = r.esearchresult?.idlist?.[0];
    if (pmid) {
      const [art] = await pubmedSummaries([pmid]);
      if (art) {
        Object.assign(art, await pubmedAbstract(pmid).catch(() => ({})));
        if (id.value.toLowerCase().startsWith('10.1590/')) art.source = 'scielo';
        return art;
      }
    }
  } catch (e) {
    /* segue para o Crossref */
  }
  try {
    return await crossrefByDoi(id.value);
  } catch (e) {
    if (e.notFound) throw new Error(`Não achei o DOI ${id.value}. Confira se ele está completo.`);
    throw e;
  }
}

// ---------- Referências ----------
export function parseAuthors(text) {
  return String(text || '')
    .split(';')
    .map((a) => a.trim())
    .filter(Boolean)
    .map((a) => {
      const [family, given = ''] = a.split(',').map((x) => x.trim());
      return { family, given };
    });
}

function initials(given) {
  const out = [];
  String(given || '')
    .split(/[\s.\-]+/)
    .filter((t) => t && !PARTICLES.has(t.toLowerCase())) // "da", "de", "dos" não viram iniciais
    .forEach((t) => {
      if (/^[A-ZÀ-Ý]{1,4}$/.test(t) && t.length <= 3) out.push(...t.split(''));
      else out.push(t[0].toUpperCase());
    });
  return out;
}

const MONTHS_ABNT = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
const endDot = (s) => (/[.?!]$/.test(s) ? s : s + '.');

// ABNT NBR 6023:2018 (artigo de periódico). Até 3 autores: todos; mais de 3: primeiro + et al.
export function abnt(a, { html = false } = {}) {
  const au = parseAuthors(a.authors);
  const fmt = (x) => {
    const ini = initials(x.given);
    return `${x.family.toUpperCase()}${ini.length ? ', ' + ini.map((i) => i + '.').join(' ') : ''}`;
  };
  let authors = au.length > 3 ? `${fmt(au[0])} et al.` : au.map(fmt).join('; ');
  const journal = html ? `<b>${escHtml(a.journal)}</b>` : a.journal;
  const parts = [];
  if (a.volume) parts.push(`v. ${a.volume}`);
  if (a.issue) parts.push(`n. ${a.issue}`);
  if (a.pages) parts.push(`p. ${a.pages}`);
  const date = [a.month ? MONTHS_ABNT[Number(a.month) - 1] : '', a.year].filter(Boolean).join(' ');
  if (date) parts.push(date);
  let ref = `${authors ? endDot(authors) + ' ' : ''}${endDot(html ? escHtml(a.title) : a.title)} ${journal}${parts.length ? ', ' + parts.join(', ') : ''}.`;
  if (a.doi) ref += ` DOI: https://doi.org/${a.doi}.`;
  else if (a.url) ref += ` Disponível em: ${a.url}.`;
  return ref;
}

// Vancouver (ICMJE/NLM). Até 6 autores; mais de 6: os 6 primeiros + et al.
export function vancouver(a) {
  const au = parseAuthors(a.authors);
  const fmt = (x) => `${x.family} ${initials(x.given).join('')}`.trim();
  let authors = au.slice(0, 6).map(fmt).join(', ');
  if (au.length > 6) authors += ', et al';
  const journal = String(a.journalAbbr || a.journal || '').replace(/\.+$/, '');
  let src = `${journal}. ${a.year || ''}`;
  if (a.volume) src += `;${a.volume}`;
  if (a.issue) src += `(${a.issue})`;
  if (a.pages) src += `:${a.pages}`;
  let ref = `${authors ? authors + '. ' : ''}${endDot(a.title)} ${src}.`;
  if (a.doi) ref += ` doi:${a.doi}`;
  return ref;
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function shortAuthors(text, n = 3) {
  const au = parseAuthors(text);
  if (!au.length) return '';
  const names = au.slice(0, n).map((x) => `${x.family}${x.given ? ' ' + initials(x.given).join('') : ''}`);
  return names.join(', ') + (au.length > n ? ' et al.' : '');
}

export const articleKey = (a) => (a.pmid ? 'pmid:' + a.pmid : a.doi ? 'doi:' + a.doi.toLowerCase() : 't:' + (a.title || '').toLowerCase());
