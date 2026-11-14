// Login e sincronização com o Supabase.
// Modelo: um documento JSON por pessoa (tabela user_data). O navegador guarda uma cópia
// local (funciona sem internet) e envia as mudanças para a nuvem alguns segundos depois.
// Controle de versão pelo updated_at: se outro aparelho salvou antes, avisamos em vez de
// sobrescrever.
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JS } from './config.js';
import { store } from './store.js';

const META_KEY = 'minhapesquisa:sync';
const LOCAL_ONLY_KEY = 'minhapesquisa:local-only';
const PUSH_DELAY = 1500;

export const cloudEnabled = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

let sb = null;
let readyForUser = null; // id do usuário cuja sincronização inicial já foi feita
let pushTimer = null;
let retryTimer = null;
let remoteExists = false;
const listeners = new Set();

export const cloud = {
  ready: !cloudEnabled, // vira true quando a sessão foi verificada
  user: null,
  status: 'off', // off | syncing | pending | saving | synced | offline | error | conflict
  error: '',
  conflict: null, // { remote: {data, updated_at}, firstLogin }
  recovery: false, // chegou pelo link de "esqueci a senha"
};

export const onCloudChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const emit = () => listeners.forEach((fn) => fn(cloud));

function meta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function setMeta(m) {
  if (cloud.user?.email && m.userId === cloud.user.id) m = { ...m, email: cloud.user.email };
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch (e) {
    /* sem armazenamento local */
  }
}
const sameTime = (a, b) => !!a && !!b && Date.parse(a) === Date.parse(b);

export const isLocalOnly = () => {
  try {
    return localStorage.getItem(LOCAL_ONLY_KEY) === '1';
  } catch (e) {
    return false;
  }
};
export function setLocalOnly(v) {
  try {
    if (v) localStorage.setItem(LOCAL_ONLY_KEY, '1');
    else localStorage.removeItem(LOCAL_ONLY_KEY);
  } catch (e) {
    /* ok */
  }
  emit();
}

let importAttempt = 0;
async function client() {
  if (sb) return sb;
  // o navegador guarda o erro de um import que falhou: em nova tentativa, muda o endereço
  const url = importAttempt++ ? `${SUPABASE_JS}?tentativa=${importAttempt}` : SUPABASE_JS;
  const mod = await import(url);
  sb = mod.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return sb;
}

// Executa uma consulta e nunca lança: falha de rede vira { error }
async function q(promiseLike) {
  try {
    const r = await promiseLike;
    return r || { data: null, error: { message: 'sem resposta' } };
  } catch (e) {
    return { data: null, error: { message: e?.message || 'Failed to fetch', network: true } };
  }
}
const isNetwork = (err) => !navigator.onLine || err?.network || /fetch|network|load failed/i.test(err?.message || '');
const OFFLINE_MSG = 'Sem internet. As alterações ficam salvas neste aparelho e sobem quando a conexão voltar.';

function setStatus(status, error = '') {
  cloud.status = status;
  cloud.error = error;
  emit();
}

// ---------- Inicialização ----------
let listenersOn = false;
export async function initCloud() {
  if (!cloudEnabled) return;
  try {
    await client();
  } catch (e) {
    // Sem internet ao abrir. Se a pessoa já estava conectada, abre normalmente com a cópia
    // deste aparelho; as alterações ficam pendentes e sobem quando a conexão voltar.
    const m = meta();
    if (m.userId) {
      cloud.user = { id: m.userId, email: m.email || '', offline: true };
      readyForUser = m.userId;
    }
    cloud.ready = true;
    setStatus('offline', OFFLINE_MSG);
    const retry = () => {
      window.removeEventListener('online', retry);
      clearInterval(retryInit);
      reconnect();
    };
    const retryInit = setInterval(() => navigator.onLine && retry(), 30000);
    window.addEventListener('online', retry);
    return;
  }
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      cloud.recovery = true;
      emit();
    }
    const u = session?.user || null;
    if (u?.id !== cloud.user?.id) {
      cloud.user = u;
      if (u) setTimeout(() => afterLogin(), 0);
      else {
        readyForUser = null;
        setStatus('off');
      }
    }
  });
  try {
    const { data } = await sb.auth.getSession();
    cloud.user = data.session?.user || null;
  } catch (e) {
    cloud.user = null;
  }
  // remove o ?code= que volta do link de e-mail
  if (/[?&]code=/.test(location.search)) history.replaceState(null, '', location.pathname + location.hash);
  cloud.ready = true;
  if (cloud.user) await afterLogin();
  else emit();

  if (listenersOn) return;
  listenersOn = true;
  window.addEventListener('focus', () => pull());
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && pull());
  window.addEventListener('online', () => {
    if (meta().dirty) schedulePush(0);
    else pull();
  });
  setInterval(() => pull(), 60000);
}

// Conexão voltou depois de abrir sem internet: carrega o Supabase e sincroniza
async function reconnect() {
  readyForUser = null;
  const offlineUser = cloud.user?.offline ? cloud.user : null;
  try {
    await client();
  } catch (e) {
    readyForUser = offlineUser?.id || null;
    setTimeout(() => initCloud(), 0);
    return;
  }
  if (offlineUser) cloud.user = null; // a sessão real vem do Supabase
  await initCloud();
}

store.onPersist((state, origin) => {
  if (origin === 'cloud' || !cloud.user || readyForUser !== cloud.user.id) return;
  setMeta({ ...meta(), userId: cloud.user.id, dirty: true });
  if (cloud.status === 'conflict') return;
  if (!sb) return setStatus('offline', OFFLINE_MSG);
  cloud.status = 'pending';
  emit();
  schedulePush();
});

function schedulePush(delay = PUSH_DELAY) {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, delay);
}

// ---------- Depois do login ----------
let loginInFlight = null;
async function afterLogin() {
  const user = cloud.user;
  if (!user || readyForUser === user.id || loginInFlight === user.id) return;
  loginInFlight = user.id;
  try {
    await firstSync(user);
  } finally {
    loginInFlight = null;
  }
}

async function firstSync(user) {
  setLocalOnly(false);
  setStatus('syncing');
  const m = meta();
  const { data: row, error } = await q(sb.from('user_data').select('data, updated_at').eq('user_id', user.id).maybeSingle());
  if (error) {
    readyForUser = user.id; // segue funcionando localmente
    setStatus(isNetwork(error) ? 'offline' : 'error', isNetwork(error) ? OFFLINE_MSG : error.message);
    return;
  }
  readyForUser = user.id;
  remoteExists = !!row;
  const localHas = store.hasContent();

  // dados locais são de outra conta: nunca enviar, só trocar pelos da nuvem
  if (m.userId && m.userId !== user.id) {
    if (row) return applyRemote(row);
    store.reset({ origin: 'cloud' });
    setMeta({ userId: user.id, last: null, dirty: false });
    return setStatus('synced');
  }
  if (!row) {
    // primeira vez desta conta: o que já existe neste navegador vai para a nuvem
    if (localHas) return push();
    setMeta({ userId: user.id, last: null, dirty: false });
    return setStatus('synced');
  }
  if (!localHas) return applyRemote(row);
  if (m.userId === user.id) {
    if (!m.dirty) return applyRemote(row);
    if (sameTime(row.updated_at, m.last)) return push(); // só este aparelho mudou
    cloud.conflict = { remote: row, firstLogin: false };
    return setStatus('conflict');
  }
  // navegador tinha dados sem conta e a conta já tem dados na nuvem
  if (JSON.stringify(row.data) === JSON.stringify(store.get())) return applyRemote(row);
  cloud.conflict = { remote: row, firstLogin: true };
  setStatus('conflict');
}

function applyRemote(row) {
  store.replaceAll(row.data || {}, { origin: 'cloud' });
  setMeta({ userId: cloud.user.id, last: row.updated_at, dirty: false });
  cloud.conflict = null;
  setStatus('synced');
}

// ---------- Enviar ----------
async function push() {
  clearTimeout(pushTimer);
  clearTimeout(retryTimer);
  const user = cloud.user;
  if (!user || !sb || cloud.status === 'conflict') return;
  const m = meta();
  const now = new Date().toISOString();
  const data = store.get();
  setStatus('saving');
  let res;
  if (!remoteExists) {
    res = await q(sb.from('user_data').insert({ user_id: user.id, data, updated_at: now }).select('updated_at'));
    if (res.error?.code === '23505') {
      // outro aparelho criou antes
      remoteExists = true;
      return checkConflict();
    }
  } else {
    let upd = sb.from('user_data').update({ data, updated_at: now }).eq('user_id', user.id);
    if (m.last) upd = upd.eq('updated_at', m.last);
    res = await q(upd.select('updated_at'));
    if (!res.error && res.data && res.data.length === 0) return checkConflict();
  }
  if (res.error) {
    const offline = isNetwork(res.error);
    setStatus(offline ? 'offline' : 'error', offline ? OFFLINE_MSG : res.error.message);
    retryTimer = setTimeout(push, 20000);
    return;
  }
  remoteExists = true;
  const saved = res.data?.[0]?.updated_at || now;
  // se algo mudou enquanto enviava, manda de novo
  const stillDirty = JSON.stringify(store.get()) !== JSON.stringify(data);
  setMeta({ userId: user.id, last: saved, dirty: stillDirty });
  setStatus(stillDirty ? 'pending' : 'synced');
  if (stillDirty) schedulePush();
}

async function checkConflict() {
  const { data: row, error } = await q(sb.from('user_data').select('data, updated_at').eq('user_id', cloud.user.id).maybeSingle());
  if (error) {
    setStatus(isNetwork(error) ? 'offline' : 'error', isNetwork(error) ? OFFLINE_MSG : error.message);
    retryTimer = setTimeout(push, 20000);
    return;
  }
  if (!row) {
    remoteExists = false;
    return push();
  }
  cloud.conflict = { remote: row, firstLogin: false };
  setStatus('conflict');
}

// ---------- Buscar mudanças de outros aparelhos ----------
export async function pull() {
  const user = cloud.user;
  if (!user || !sb || readyForUser !== user.id) return;
  if (['saving', 'conflict', 'syncing'].includes(cloud.status)) return;
  const m = meta();
  const { data: row, error } = await q(sb.from('user_data').select('updated_at').eq('user_id', user.id).maybeSingle());
  if (error || !row) return;
  if (sameTime(row.updated_at, m.last)) {
    if (cloud.status === 'offline' || cloud.status === 'error') setStatus(m.dirty ? 'pending' : 'synced');
    if (m.dirty) schedulePush(0);
    return;
  }
  const full = await q(sb.from('user_data').select('data, updated_at').eq('user_id', user.id).maybeSingle());
  if (full.error || !full.data) return;
  if (m.dirty) {
    cloud.conflict = { remote: full.data, firstLogin: false };
    return setStatus('conflict');
  }
  applyRemote(full.data);
}

export async function syncNow() {
  if (meta().dirty) return push();
  return pull();
}

// choice: 'cloud' (usar o que está na nuvem) | 'local' (usar o deste aparelho)
export async function resolveConflict(choice) {
  const c = cloud.conflict;
  if (!c) return;
  if (choice === 'cloud') return applyRemote(c.remote);
  remoteExists = true;
  setMeta({ userId: cloud.user.id, last: c.remote.updated_at, dirty: true });
  cloud.conflict = null;
  cloud.status = 'pending';
  return push();
}

// ---------- Conta ----------
const MSG = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Seu e-mail ainda não foi confirmado. Procure a mensagem de confirmação na sua caixa de entrada.',
  'User already registered': 'Já existe uma conta com este e-mail. Use "Entrar".',
  'Password should be at least 6 characters.': 'A senha precisa ter pelo menos 6 caracteres.',
};
const friendly = (e) => {
  const m = e?.message || String(e);
  if (MSG[m]) return MSG[m];
  if (/rate limit|429/i.test(m)) return 'Muitas tentativas em pouco tempo. Espere alguns minutos e tente de novo.';
  if (/fetch|network/i.test(m)) return 'Sem conexão com o servidor. Verifique a internet.';
  if (/weak|pwned/i.test(m)) return 'Essa senha é fraca ou já apareceu em vazamentos. Escolha outra.';
  return m;
};

export async function signIn(email, password) {
  await client();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendly(error));
}

export async function signUp(email, password) {
  await client();
  const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
  if (error) throw new Error(friendly(error));
  // com "Confirm email" ligado, não vem sessão: a pessoa precisa confirmar pelo e-mail
  return { needsConfirmation: !data.session };
}

export async function sendReset(email) {
  await client();
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  if (error) throw new Error(friendly(error));
}

export async function setNewPassword(password) {
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw new Error(friendly(error));
  cloud.recovery = false;
  emit();
}

export async function signOut({ keepLocal = false } = {}) {
  if (meta().dirty && cloud.status !== 'conflict') {
    try {
      await push();
    } catch (e) {
      /* tenta, mas não bloqueia a saída */
    }
  }
  try {
    await sb?.auth.signOut();
  } catch (e) {
    /* ok */
  }
  readyForUser = null;
  cloud.user = null;
  cloud.conflict = null;
  remoteExists = false;
  if (!keepLocal) {
    store.reset({ origin: 'cloud' });
    setMeta({});
  }
  setStatus('off');
}

export const pendingChanges = () => !!meta().dirty;
