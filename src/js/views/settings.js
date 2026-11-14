import { store } from '../store.js';
import { icon, esc } from '../ui.js';
import { cloud, cloudEnabled } from '../cloud.js';
import { syncBadge } from './auth.js';

export const title = 'Configurações';

export function render() {
  const s = store.get();
  const total = ['experiments', 'logs', 'tasks', 'meetings', 'milestones', 'courses', 'certificates', 'congresses', 'papers', 'links', 'protocols', 'ethics'].reduce(
    (a, c) => a + s[c].length,
    0
  );
  return `<div class="page narrow">
    <header class="page-head"><div><p class="eyebrow dark">Configurações</p><h1>Seus dados</h1></div></header>
    ${
      cloudEnabled
        ? cloud.user
          ? `<section class="card setting account">
      <div><h3>${icon('users')} Sua conta</h3>
      <p><b>${esc(cloud.user.email)}</b></p>
      <p class="muted">Seus dados ficam guardados na nuvem e aparecem em qualquer aparelho em que você entrar com este e-mail.</p>
      <p class="sync-line">Situação: <span data-sync-status>${syncBadge(cloud) || 'Desconectado'}</span></p>
      ${cloud.error && cloud.status !== 'synced' ? `<p class="small muted">${esc(cloud.error)}</p>` : ''}
      </div>
      <div class="account-actions">
        <button class="btn btn-ghost" data-action="sync-now">Sincronizar agora</button>
        <button class="btn btn-ghost" data-action="logout">Sair da conta</button>
      </div>
    </section>`
          : `<section class="card setting account">
      <div><h3>${icon('users')} Você está sem conta</h3>
      <p class="muted">Seus dados estão só neste navegador. Crie uma conta para guardá-los na nuvem e usar no celular e no computador. O que já está aqui vai junto para a conta.</p></div>
      <button class="btn btn-primary" data-action="go-login">Entrar ou criar conta</button>
    </section>`
        : ''
    }

    <section class="card setting">
      <div><h3>${icon('download')} Fazer backup</h3>
      <p class="muted">${cloud.user ? `Você tem ${total} registros na sua conta. Um backup em arquivo é uma cópia extra, guardada por você.` : `Seus dados ficam salvos só neste navegador (${total} registros). Baixe um backup de vez em quando, principalmente antes de trocar de computador.`}</p></div>
      <button class="btn btn-primary" data-action="export">Baixar backup (.json)</button>
    </section>

    <section class="card setting">
      <div><h3>${icon('upload')} Restaurar backup</h3>
      <p class="muted">Carrega um arquivo de backup. Os dados atuais deste navegador são substituídos.</p></div>
      <label class="btn btn-ghost file-btn">Escolher arquivo<input type="file" accept="application/json,.json" data-action="import" hidden /></label>
    </section>

    <section class="card setting">
      <div><h3>${icon('flask')} Dados de exemplo</h3>
      <p class="muted">Preenche o sistema com um doutorado fictício para você explorar. Substitui os dados atuais.</p></div>
      <button class="btn btn-ghost" data-action="demo">Carregar exemplo</button>
    </section>

    <section class="card setting">
      <div><h3>${icon('book')} Chave do OpenAlex (opcional)</h3>
      <p class="muted">A busca no SciELO usa o OpenAlex. Sem chave, cada rede tem uma cota grátis de cerca de 100 buscas por dia, que é dividida com todo mundo da mesma rede, como a da universidade. Com uma chave gratuita, a cota passa a ser só sua e 10 vezes maior. Para criar: entre em <a href="https://openalex.org" target="_blank" rel="noopener">openalex.org</a>, crie uma conta e copie a chave em Settings → API.</p>
      <form class="key-form" data-key-form>
        <input name="key" type="password" autocomplete="off" placeholder="Cole sua chave aqui" value="${s.profile?.openalexKey ? '••••••••••••' : ''}" aria-label="Chave do OpenAlex" />
        <button class="btn btn-ghost" type="submit">Salvar chave</button>
        ${s.profile?.openalexKey ? '<button class="btn btn-ghost" type="button" data-key-clear>Remover</button>' : ''}
      </form>
      ${s.profile?.openalexKey ? '<small class="muted">✓ Chave salva neste navegador.</small>' : ''}
      </div>
    </section>

    <section class="card setting danger-zone">
      <div><h3>${icon('trash')} Apagar tudo</h3>
      <p class="muted">${cloud.user ? 'Remove todos os dados da sua conta, na nuvem e em todos os aparelhos.' : 'Remove todos os dados deste navegador.'} Não dá para desfazer sem um backup.</p></div>
      <button class="btn btn-danger" data-action="reset">Apagar dados</button>
    </section>
  </div>`;
}

export function mount() {
  const f = document.querySelector('[data-key-form]');
  if (!f) return null;
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = f.key.value.trim();
    if (!v || /^•+$/.test(v)) return;
    store.setProfile({ openalexKey: v });
  });
  document.querySelector('[data-key-clear]')?.addEventListener('click', () => store.setProfile({ openalexKey: '' }));
  return null;
}
