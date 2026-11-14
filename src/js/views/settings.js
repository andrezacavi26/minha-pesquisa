import { store } from '../store.js';
import { icon } from '../ui.js';

export const title = 'Configurações';

export function render() {
  const s = store.get();
  const total = ['experiments', 'logs', 'tasks', 'meetings', 'milestones', 'courses', 'certificates', 'congresses', 'papers', 'links', 'protocols', 'ethics'].reduce(
    (a, c) => a + s[c].length,
    0
  );
  return `<div class="page narrow">
    <header class="page-head"><div><p class="eyebrow dark">Configurações</p><h1>Seus dados</h1></div></header>

    <section class="card setting">
      <div><h3>${icon('download')} Fazer backup</h3>
      <p class="muted">Seus dados ficam salvos só neste navegador (${total} registros). Baixe um backup de vez em quando, principalmente antes de trocar de computador.</p></div>
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

    <section class="card setting danger-zone">
      <div><h3>${icon('trash')} Apagar tudo</h3>
      <p class="muted">Remove todos os dados deste navegador. Não dá para desfazer sem um backup.</p></div>
      <button class="btn btn-danger" data-action="reset">Apagar dados</button>
    </section>
  </div>`;
}
