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
];

function empty() {
  const s = { version: 1, profile: null };
  COLLECTIONS.forEach((c) => (s[c] = []));
  return s;
}

let state = load();
const listeners = new Set();

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

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Não foi possível salvar', e);
  }
  listeners.forEach((fn) => fn(state));
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
  update(col, id, patch) {
    state[col] = state[col].map((x) => (x.id === id ? { ...x, ...patch } : x));
    persist();
  },
  remove(col, id) {
    state[col] = state[col].filter((x) => x.id !== id);
    persist();
  },
  replaceAll(next) {
    state = { ...empty(), ...next };
    persist();
  },
  reset() {
    state = empty();
    persist();
  },
};
