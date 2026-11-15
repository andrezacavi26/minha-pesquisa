// Camada de dados: tudo fica no localStorage do navegador.
// Fase 2: trocar por Supabase mantendo a mesma interface (get/add/update/remove).

const KEY = 'minhapesquisa:v1';

export const COLLECTIONS = [
  'milestones', // prazos e marcos
  'experiments', // experimentos (planejamento)
  'logs', // diário de bancada
  'protocols', // POPs
  'ethics', // CEUA / CEP
  'meetings', // reuniões com orientador
  'tasks', // tarefas
  'courses', // disciplinas
  'certificates',
  'congresses',
  'papers', // produção / artigos
  'links', // modelos, templates, artigos e links
  'assessments', // provas, trabalhos e apresentações de cada disciplina
  'drawings', // desenhos experimentais
  'articles', // biblioteca de artigos (PubMed, SciELO, manual)
  'projects', // projetos de pesquisa (grupos, agenda do protocolo, reagentes)
];

function empty() {
  const s = { version: 1, profile: null };
  COLLECTIONS.forEach((c) => (s[c] = []));
  return s;
}

let state = load();
const listeners = new Set();
const persistHooks = new Set(); // chamados em todo salvamento (inclusive silencioso): usado pela sincronização

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    const base = empty();
    return { ...base, ...parsed };
  } catch (e) {
    console.warn('Não foi possível ler os dados salvos', e);
    return empty();
  }
}

// origin: 'local' (mudança feita aqui) ou 'cloud' (veio da nuvem, não precisa reenviar)
function persist(silent = false, origin = 'local') {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Não foi possível salvar', e);
  }
  persistHooks.forEach((fn) => fn(state, origin));
  if (!silent) listeners.forEach((fn) => fn(state));
}

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const store = {
  get: () => state,
  list: (col) => state[col] || [],
  find: (col, id) => (state[col] || []).find((x) => x.id === id),
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  onPersist(fn) {
    persistHooks.add(fn);
    return () => persistHooks.delete(fn);
  },
  setProfile(profile) {
    state.profile = { ...(state.profile || {}), ...profile };
    persist();
  },
  add(col, obj) {
    const item = { id: uid(), createdAt: new Date().toISOString(), ...obj };
    state[col] = [...(state[col] || []), item];
    persist();
    return item;
  },
  // silent: salva sem redesenhar a tela (usado pelo editor de desenhos)
  update(col, id, patch, { silent = false } = {}) {
    state[col] = state[col].map((x) => (x.id === id ? { ...x, ...patch } : x));
    persist(silent);
  },
  removeWhere(col, fn) {
    state[col] = state[col].filter((x) => !fn(x));
    persist();
  },
  remove(col, id) {
    state[col] = state[col].filter((x) => x.id !== id);
    persist();
  },
  replaceAll(next, { origin = 'local' } = {}) {
    state = { ...empty(), ...next };
    persist(false, origin);
  },
  reset({ origin = 'local' } = {}) {
    state = empty();
    persist(false, origin);
  },
  hasContent() {
    return !!state.profile || COLLECTIONS.some((c) => (state[c] || []).length);
  },
};
