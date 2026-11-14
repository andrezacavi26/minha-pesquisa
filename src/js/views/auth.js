// Telas de conta: entrar, criar conta, esqueci a senha e nova senha.
import { esc } from '../ui.js';
import * as cloud from '../cloud.js';

const S = { mode: 'login', msg: '', err: '', busy: false, email: '' };
const rerender = () => window.dispatchEvent(new Event('app:rerender'));

const LOGO = `<svg viewBox="0 0 64 28" class="brand-mark big" aria-hidden="true"><circle cx="4" cy="22" r="3.2"/><path d="M10 22c4-16 8-16 11 0s7 16 11 0 7-16 11 0 7 12 10 4" fill="none" stroke-width="3.4" stroke-linecap="round"/></svg>`;

export function splash(text = 'Carregando…') {
  return `<div class="welcome"><div class="welcome-card">${LOGO}<p class="splash-text">${esc(text)}</p></div></div>`;
}

export function render(forced) {
  const mode = forced || S.mode;
  const titles = {
    login: 'Entrar',
    signup: 'Criar conta',
    reset: 'Esqueci minha senha',
    newpass: 'Criar nova senha',
    confirm: 'Confirme seu e-mail',
  };
  let body = '';
  if (mode === 'confirm') {
    body = `<p class="auth-ok">Enviamos um link de confirmação para <b>${esc(S.email)}</b>. Abra o e-mail, clique no link e depois volte aqui para entrar.</p>
      <button class="btn btn-primary full" data-auth-mode="login">Já confirmei, quero entrar</button>`;
  } else if (mode === 'reset') {
    body = `<form class="auth-form" data-auth="reset">
        <p class="muted">Digite o e-mail da sua conta. Vamos enviar um link para criar uma nova senha.</p>
        <label class="field"><span>E-mail</span><input name="email" type="email" autocomplete="email" required value="${esc(S.email)}" /></label>
        <button class="btn btn-primary full" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Enviando…' : 'Enviar link'}</button>
      </form>
      <button class="link-inline" data-auth-mode="login">Voltar para entrar</button>`;
  } else if (mode === 'newpass') {
    body = `<form class="auth-form" data-auth="newpass">
        <label class="field"><span>Nova senha</span><input name="password" type="password" autocomplete="new-password" minlength="6" required /></label>
        <button class="btn btn-primary full" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Salvando…' : 'Salvar nova senha'}</button>
      </form>`;
  } else {
    const signup = mode === 'signup';
    body = `<div class="auth-tabs" role="tablist">
        <button role="tab" class="${!signup ? 'on' : ''}" data-auth-mode="login" aria-selected="${!signup}">Entrar</button>
        <button role="tab" class="${signup ? 'on' : ''}" data-auth-mode="signup" aria-selected="${signup}">Criar conta</button>
      </div>
      <form class="auth-form" data-auth="${mode}">
        <label class="field"><span>E-mail</span><input name="email" type="email" autocomplete="email" required value="${esc(S.email)}" /></label>
        <label class="field"><span>Senha${signup ? ' (mínimo 6 caracteres)' : ''}</span><input name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="6" required /></label>
        <button class="btn btn-primary full lg" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Aguarde…' : signup ? 'Criar minha conta' : 'Entrar'}</button>
      </form>
      ${!signup ? '<button class="link-inline" data-auth-mode="reset">Esqueci minha senha</button>' : '<p class="small muted">Seus dados ficam guardados na sua conta e aparecem no computador e no celular.</p>'}`;
  }
  return `<div class="welcome auth">
    <div class="welcome-card">
      ${LOGO}
      <h1>Minha Pesquisa</h1>
      <div class="auth-card">
        <h2>${titles[mode]}</h2>
        ${S.err ? `<p class="auth-err" role="alert">${esc(S.err)}</p>` : ''}
        ${S.msg ? `<p class="auth-ok" role="status">${esc(S.msg)}</p>` : ''}
        ${body}
      </div>
      ${mode === 'newpass' ? '' : '<button class="link-light" data-auth-local>Continuar sem conta (dados só neste navegador)</button>'}
    </div>
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
    if (e.target.closest('[data-auth-local]')) cloud.setLocalOnly(true);
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
      if (kind === 'login') await cloud.signIn(email, password);
      if (kind === 'signup') {
        const r = await cloud.signUp(email, password);
        if (r.needsConfirmation) S.mode = 'confirm';
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
