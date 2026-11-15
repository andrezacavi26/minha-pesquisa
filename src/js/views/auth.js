// Telas de conta: entrar, criar conta, esqueci a senha e nova senha.
import { esc } from '../ui.js';
import * as cloud from '../cloud.js';

const S = { mode: 'login', msg: '', err: '', busy: false, email: '' };
const rerender = () => window.dispatchEvent(new Event('app:rerender'));

const LOGO = `<svg viewBox="0 0 64 28" class="brand-mark big" aria-hidden="true"><circle cx="4" cy="22" r="3.2"/><path d="M10 22c4-16 8-16 11 0s7 16 11 0 7-16 11 0 7 12 10 4" fill="none" stroke-width="3.4" stroke-linecap="round"/></svg>`;

export function splash(text = 'Carregando…') {
  return `<div class="welcome"><div class="welcome-card">${LOGO}<p class="splash-text">${esc(text)}</p></div></div>`;
}

const ROLE_KEY = 'minhapesquisa:role';
const getRole = () => {
  try {
    return localStorage.getItem(ROLE_KEY) || 'estudante';
  } catch (e) {
    return 'estudante';
  }
};
const setRole = (r) => {
  try {
    localStorage.setItem(ROLE_KEY, r);
  } catch (e) {
    /* ok */
  }
};

const ART = `<svg class="auth-art" viewBox="0 0 600 470" fill="none" aria-hidden="true">
  <g stroke="#1f6e66" stroke-opacity=".55" stroke-width="1.2">
    ${[60, 120, 180, 240, 300, 360, 420].map((y) => `<path d="M40 ${y} H570"/>`).join('')}
    ${[70, 130, 190, 250, 310, 370, 430, 490, 550].map((x) => `<path d="M${x} 30 V450"/>`).join('')}
  </g>
  <circle cx="98" cy="38" r="5" fill="#3ee8b5"/><circle cx="560" cy="248" r="5" fill="#3ee8b5"/><circle cx="44" cy="446" r="5" fill="#3ee8b5"/>
  <!-- livro aberto -->
  <rect x="20" y="132" width="350" height="250" rx="16" fill="#127a66"/>
  <path d="M36 128 C 80 112, 150 112, 192 132 V 358 C 150 340, 80 340, 36 356 Z" fill="#f6f1e3"/>
  <path d="M354 128 C 310 112, 240 112, 200 132 V 358 C 240 340, 310 340, 354 356 Z" fill="#f6f1e3"/>
  <path d="M196 132 V 360" stroke="#d8d1bd" stroke-width="3"/>
  <g stroke="#1b8a74" stroke-width="3.2" stroke-linecap="round">
    ${[160, 180, 200, 220, 240, 260, 280, 300, 320].map((y, i) => `<path d="M62 ${y} H${i % 3 === 2 ? 140 : 168}"/>`).join('')}
    <path d="M226 280 H330 M226 300 H330 M226 320 H318"/>
    <path d="M222 166 V258 H330" stroke-width="2.4"/>
  </g>
  <polyline points="238,240 268,214 292,222 322,190" stroke="#2fd3a3" stroke-width="3.6" fill="none" stroke-linejoin="round"/>
  ${[[238, 240], [268, 214], [292, 222], [322, 190]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#3ee8b5"/>`).join('')}
  <path d="M132 360 V404 L148 392 L164 404 V360 Z" fill="#3ee8b5"/>
  <!-- calendário -->
  <g transform="translate(400 54)">
    <rect width="168" height="160" rx="14" fill="#f6f1e3"/>
    <rect width="168" height="40" rx="14" fill="#127a66"/><rect y="24" width="168" height="16" fill="#127a66"/>
    <rect x="34" y="-14" width="10" height="34" rx="5" fill="#f6f1e3"/><rect x="124" y="-14" width="10" height="34" rx="5" fill="#f6f1e3"/>
    <g stroke="#1b8a74" stroke-width="3">${[0, 1, 2, 3, 4].map((i) => `<path d="M${16 + i * 34} 52 V146"/>`).join('')}${[0, 1, 2, 3].map((i) => `<path d="M16 ${52 + i * 31} H152"/>`).join('')}<path d="M16 146 H152"/></g>
    <rect x="50" y="83" width="34" height="31" fill="#3ee8b5"/><rect x="118" y="52" width="34" height="31" fill="#3ee8b5"/>
  </g>
  <!-- documentos -->
  <g transform="translate(408 268) rotate(4)">
    <rect x="34" y="20" width="128" height="160" rx="6" fill="#e9e3d2"/>
    <g stroke="#1b8a74" stroke-width="2.6" stroke-linecap="round">${[70, 88, 106, 124, 142].map((y) => `<path d="M58 ${y} H140"/>`).join('')}</g>
  </g>
  <g transform="translate(390 252) rotate(-3)">
    <rect width="128" height="164" rx="6" fill="#f6f1e3"/>
    <rect x="20" y="22" width="40" height="26" fill="#127a66"/>
    <g stroke="#1b8a74" stroke-width="2.6" stroke-linecap="round">${[66, 84, 102, 120, 138].map((y) => `<path d="M20 ${y} H${y === 138 ? 80 : 108}"/>`).join('')}</g>
  </g>
</svg>`;

export function render(forced) {
  const mode = forced || S.mode;
  const role = getRole();
  const roleToggle = `<div class="auth-field"><span class="auth-label">Perfil de acesso</span>
    <div class="role-toggle" role="radiogroup" aria-label="Perfil de acesso">
      <button type="button" role="radio" aria-checked="${role === 'estudante'}" class="${role === 'estudante' ? 'on' : ''}" data-role="estudante">Estudante</button>
      <button type="button" role="radio" aria-checked="${role === 'orientador'}" class="${role === 'orientador' ? 'on' : ''}" data-role="orientador">Orientador</button>
    </div></div>`;
  const emailField = `<label class="auth-field"><span class="auth-label">E-mail</span><input name="email" type="email" autocomplete="email" placeholder="Seu e-mail" required value="${esc(S.email)}" /></label>`;
  const pwdField = (newPwd) =>
    `<label class="auth-field"><span class="auth-label">${newPwd ? 'Crie uma senha' : 'Senha'}</span><input name="password" type="password" autocomplete="${newPwd ? 'new-password' : 'current-password'}" placeholder="${newPwd ? 'Mínimo de 6 caracteres' : 'Sua senha'}" minlength="6" required /></label>`;

  let head = '';
  let body = '';
  if (mode === 'confirm') {
    head = `<h2>Confirme seu e-mail</h2><p class="auth-sub">Falta só um passo.</p>`;
    body = `<p class="auth-ok">Enviamos um link de confirmação para <b>${esc(S.email)}</b>. Abra o e-mail, clique no link e volte aqui para entrar.</p>
      <button class="auth-btn" data-auth-mode="login">Já confirmei, quero entrar</button>`;
  } else if (mode === 'reset') {
    head = `<h2>Esqueci minha senha</h2><p class="auth-sub">Enviamos um link para você criar outra.</p>`;
    body = `<form class="auth-form" data-auth="reset">${emailField}
        <button class="auth-btn" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Enviando…' : 'Enviar link'}</button>
      </form>
      <button class="auth-link" data-auth-mode="login">Voltar para entrar</button>`;
  } else if (mode === 'newpass') {
    head = `<h2>Crie uma nova senha</h2><p class="auth-sub">Depois disso, você já entra no seu painel.</p>`;
    body = `<form class="auth-form" data-auth="newpass">${pwdField(true)}
        <button class="auth-btn" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Salvando…' : 'Salvar nova senha'}</button>
      </form>`;
  } else if (mode === 'signup') {
    head = `<h2>Ative seu acesso</h2><p class="auth-sub">Crie sua conta para começar.</p>`;
    body = `<form class="auth-form" data-auth="signup">${roleToggle}${emailField}${pwdField(true)}
        <button class="auth-btn" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Aguarde…' : 'Ativar meu acesso'}</button>
      </form>
      <div class="auth-foot">Já tem conta? <button class="auth-link accent" data-auth-mode="login">Entrar</button></div>`;
  } else {
    head = `<h2>Entre na sua conta</h2><p class="auth-sub">Acesse seu painel de pesquisa.</p>`;
    body = `<form class="auth-form" data-auth="login">${roleToggle}${emailField}${pwdField(false)}
        <button class="auth-btn" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
      <button class="auth-link center" data-auth-mode="reset">Esqueci minha senha</button>
      <div class="auth-foot">Já comprou? <button class="auth-link accent" data-auth-mode="signup">Ativar meu acesso</button></div>`;
  }

  return `<div class="auth-page auth">
    <header class="auth-top">
      <span class="auth-brand"><svg viewBox="0 0 64 28" class="brand-mark" aria-hidden="true"><circle cx="4" cy="22" r="3.2"/><path d="M10 22c4-16 8-16 11 0s7 16 11 0 7-16 11 0 7 12 10 4" fill="none" stroke-width="3.4" stroke-linecap="round"/></svg> Minha Pesquisa</span>
    </header>
    <main class="auth-main">
      <section class="auth-hero">
        <h1>Minha Pesquisa</h1>
        <p class="auth-tagline">Da primeira pergunta à defesa.</p>
        ${ART}
      </section>
      <section class="auth-panel" aria-labelledby="auth-title">
        ${head.replace('<h2>', '<h2 id="auth-title">')}
        ${S.err ? `<p class="auth-err" role="alert">${esc(S.err)}</p>` : ''}
        ${S.msg ? `<p class="auth-ok" role="status">${esc(S.msg)}</p>` : ''}
        ${body}
      </section>
    </main>
  </div>`;
}

export function mount() {
  const root = document.querySelector('.auth');
  if (!root) return null;
  root.addEventListener('click', (e) => {
    const m = e.target.closest('[data-auth-mode]');
    if (m) {
      const email = root.querySelector('input[name="email"]')?.value;
      if (email) S.email = email;
      Object.assign(S, { mode: m.dataset.authMode, err: '', msg: '' });
      rerender();
      return;
    }
    const r = e.target.closest('[data-role]');
    if (r) {
      setRole(r.dataset.role);
      root.querySelectorAll('[data-role]').forEach((b) => {
        b.classList.toggle('on', b === r);
        b.setAttribute('aria-checked', b === r);
      });
    }
  });
  root.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const kind = f.dataset.auth;
    const email = f.email?.value.trim();
    const password = f.password?.value;
    if (email) S.email = email;
    Object.assign(S, { busy: true, err: '', msg: '' });
    rerender();
    try {
      if (kind === 'login') {
        await cloud.signIn(email, password);
        S.mode = 'login';
      }
      if (kind === 'signup') {
        const r = await cloud.signUp(email, password, getRole());
        S.mode = r.needsConfirmation ? 'confirm' : 'login';
      }
      if (kind === 'reset') {
        await cloud.sendReset(email);
        S.msg = 'Se existir uma conta com este e-mail, o link chega em alguns minutos. Confira também o spam.';
      }
      if (kind === 'newpass') {
        await cloud.setNewPassword(password);
        S.mode = 'login';
      }
    } catch (err) {
      S.err = err.message;
    }
    S.busy = false;
    rerender();
    setTimeout(() => document.querySelector('.auth input[name="password"]')?.focus(), 0);
  });
  setTimeout(() => {
    const first = root.querySelector('input:not([value]), input[value=""]') || root.querySelector('input');
    first?.focus();
  }, 0);
  return null;
}

// Indicador de sincronização na barra do topo
export function syncBadge(c) {
  const map = {
    synced: ['ok', 'Salvo na nuvem'],
    pending: ['wait', 'Salvando…'],
    saving: ['wait', 'Salvando…'],
    syncing: ['wait', 'Sincronizando…'],
    offline: ['off', 'Sem internet: salvo neste aparelho'],
    error: ['bad', 'Erro ao sincronizar'],
    conflict: ['bad', 'Precisa da sua decisão'],
  };
  const [tone, text] = map[c.status] || ['', ''];
  if (!tone) return '';
  return `<a href="#/config" class="sync sync-${tone}" title="${esc(c.error || text)}"><span class="sync-dot"></span><span class="sync-text">${text}</span></a>`;
}

export function conflictDialog(c) {
  if (!c.conflict) return '';
  const when = new Date(c.conflict.remote.updated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  const first = c.conflict.firstLogin;
  return `<div class="modal-backdrop conflict" role="alertdialog" aria-modal="true" aria-labelledby="cf-t">
    <div class="modal modal-sm">
      <h2 id="cf-t">${first ? 'Sua conta já tem dados' : 'Alterações em dois aparelhos'}</h2>
      <p class="confirm-text">${
        first
          ? `Este navegador tem dados que não estão na sua conta, e a sua conta já tem dados salvos (última alteração em ${when}). Qual versão você quer manter?`
          : `Você mudou coisas neste aparelho, e outro aparelho também salvou alterações (em ${when}). Qual versão você quer manter?`
      }</p>
      <div class="cf-actions">
        <button class="btn btn-primary" data-conflict="cloud">Usar a da nuvem${first ? ' (da minha conta)' : ''}</button>
        <button class="btn btn-ghost" data-conflict="local">Usar a deste aparelho</button>
      </div>
      <p class="small muted">A versão não escolhida é substituída. Se quiser guardar as duas, antes faça um backup em Configurações.</p>
      <button class="link-inline" data-conflict="backup">Baixar backup deste aparelho antes</button>
    </div>
  </div>`;
}
