import { store } from './store.js';
import { esc, icon, openForm, confirmDialog, toast, closeModal, todayISO } from './ui.js';
import { SCHEMAS, PROFILE_FIELDS, STAGES, PAPER_STATUS, defaultDuration } from './schemas.js';
import { demoData } from './seed.js';
import * as home from './views/home.js';
import * as planning from './views/planning.js';
import * as advisor from './views/advisor.js';
import * as timeline from './views/timeline.js';
import * as academic from './views/academic.js';
import * as archive from './views/archive.js';
import * as settings from './views/settings.js';

const ROUTES = {
  inicio: { view: home, label: 'Visão geral', icon: 'home' },
  planejamento: { view: planning, label: 'Planejamento', icon: 'flask' },
  orientacao: { view: advisor, label: 'Orientação', icon: 'users' },
  prazos: { view: timeline, label: 'Prazos', icon: 'calendar' },
  'vida-academica': { view: academic, label: 'Vida acadêmica', icon: 'book' },
  acervo: { view: archive, label: 'Acervo', icon: 'archive' },
  config: { view: settings, label: 'Configurações', icon: 'gear', hidden: true },
};

const app = document.getElementById('app');

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = h.split('?');
  const name = ROUTES[path] ? path : 'inicio';
  return { name, params: new URLSearchParams(query) };
}

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0].toUpperCase())
    .join('');
}

function shell(name, content) {
  const p = store.get().profile;
  const links = Object.entries(ROUTES).filter(([, r]) => !r.hidden);
  return `
  <header class="topbar">
    <a class="brand" href="#/inicio" aria-label="Minha Pesquisa, início">
      <svg viewBox="0 0 64 28" class="brand-mark" aria-hidden="true"><circle cx="4" cy="22" r="3.2"/><path d="M10 22c4-16 8-16 11 0s7 16 11 0 7-16 11 0 7 12 10 4" fill="none" stroke-width="3.4" stroke-linecap="round"/></svg>
      <span class="brand-sep"></span><span class="brand-name">Minha Pesquisa</span>
    </a>
    <nav class="nav" aria-label="Principal">
      ${links.map(([k, r]) => `<a href="#/${k}" class="nav-link ${k === name ? 'active' : ''}" ${k === name ? 'aria-current="page"' : ''}>${r.label}</a>`).join('')}
    </nav>
    <a href="#/config" class="avatar" title="${esc(p?.name || '')} · Configurações" aria-label="Configurações">${esc(initials(p?.name))}</a>
  </header>
  <main id="main">${content}</main>
  <nav class="bottom-nav" aria-label="Principal (celular)">
    ${links
      .filter(([k]) => k !== 'vida-academica')
      .map(([k, r]) => `<a href="#/${k}" class="${k === name ? 'active' : ''}">${icon(r.icon)}<span>${r.label.split(' ')[0]}</span></a>`)
      .join('')}
    <a href="#/vida-academica" class="${name === 'vida-academica' ? 'active' : ''}">${icon('book')}<span>Vida</span></a>
  </nav>`;
}

function welcome() {
  return `<div class="welcome">
    <div class="welcome-card">
      <svg viewBox="0 0 64 28" class="brand-mark big" aria-hidden="true"><circle cx="4" cy="22" r="3.2"/><path d="M10 22c4-16 8-16 11 0s7 16 11 0 7-16 11 0 7 12 10 4" fill="none" stroke-width="3.4" stroke-linecap="round"/></svg>
      <h1>Minha Pesquisa</h1>
      <p>Sua trajetória acadêmica num lugar só: prazos, experimentos, reuniões de orientação, disciplinas e tudo o que você produziu.</p>
      <div class="welcome-actions">
        <button class="btn btn-primary lg" data-action="start">Começar meu projeto</button>
        <button class="btn btn-ghost-light lg" data-action="demo-start">Explorar com exemplo</button>
      </div>
      <small>Seus dados ficam salvos neste navegador. Você pode fazer backup a qualquer momento.</small>
    </div>
  </div>`;
}

let lastRoute = '';
function render() {
  const s = store.get();
  if (!s.profile) {
    app.innerHTML = welcome();
    document.title = 'Minha Pesquisa';
    return;
  }
  const { name, params } = parseHash();
  const route = ROUTES[name];
  const y = window.scrollY;
  app.innerHTML = shell(name, route.view.render(params));
  document.title = `${route.view.title || route.label} · Minha Pesquisa`;
  const key = location.hash;
  if (key !== lastRoute) window.scrollTo(0, 0);
  else window.scrollTo(0, y);
  lastRoute = key;
}

// ---------- Ações ----------
function profileForm(isNew = false) {
  const p = store.get().profile || {};
  openForm({
    title: isNew ? 'Vamos começar' : 'Editar projeto e dados',
    fields: PROFILE_FIELDS,
    values: isNew ? { level: 'mestrado', start: todayISO() } : p,
    submitLabel: isNew ? 'Criar meu painel' : 'Salvar',
    onSubmit: (v) => {
      if (!v.end && v.start) {
        const d = new Date(v.start);
        d.setFullYear(d.getFullYear() + defaultDuration(v.level));
        v.end = d.toISOString().slice(0, 10);
      }
      store.setProfile(v);
      toast(isNew ? 'Painel criado!' : 'Dados atualizados');
    },
  });
}

function addOrEdit(col, id, preset = {}) {
  const schema = SCHEMAS[col];
  if (!schema) return;
  const current = id ? store.find(col, id) : preset;
  openForm({
    title: `${id ? 'Editar' : 'Novo(a)'} ${schema.label}`,
    fields: schema.fields(),
    values: current,
    onSubmit: (v) => {
      if (col === 'meetings' && v.newTasks) {
        v.newTasks
          .split('\n')
          .map((t) => t.replace(/^[-•*\s]+/, '').trim())
          .filter(Boolean)
          .forEach((t) => store.add('tasks', { title: t, due: '', done: false, origin: `Reunião ${v.date.split('-').reverse().join('/')}` }));
        v.newTasks = '';
      }
      if (id) store.update(col, id, v);
      else store.add(col, col === 'experiments' ? { ...v, stages: { Desenho: 'doing' } } : v);
      toast(id ? 'Alterações salvas' : 'Adicionado');
    },
  });
}

function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

function showLattes() {
  closeModal();
  const text = archive.lattesText();
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal modal-lg" role="dialog" aria-modal="true" aria-labelledby="lt">
    <header class="modal-head"><h2 id="lt">Texto para o Lattes</h2><button class="icon-btn" data-close aria-label="Fechar">${icon('x')}</button></header>
    <p class="muted">Organizado pelas seções do Currículo Lattes. Copie e cole em cada área da Plataforma Lattes, conferindo os dados.</p>
    <textarea class="lattes" readonly rows="16">${esc(text)}</textarea>
    <footer class="modal-foot"><button class="btn btn-ghost" data-close>Fechar</button><button class="btn btn-primary" data-copy>${icon('copy')} Copiar</button></footer>
  </div>`;
  document.body.appendChild(wrap);
  document.body.classList.add('no-scroll');
  wrap.addEventListener('click', async (e) => {
    if (e.target === wrap || e.target.closest('[data-close]')) closeModal();
    if (e.target.closest('[data-copy]')) {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = wrap.querySelector('textarea');
        ta.select();
        document.execCommand('copy');
      }
      toast('Texto copiado');
    }
  });
}

const actions = {
  start: () => profileForm(true),
  'demo-start': () => {
    store.replaceAll(demoData());
    location.hash = '#/inicio';
    toast('Exemplo carregado. Explore à vontade!');
  },
  'edit-profile': () => profileForm(false),
  add: (el) => addOrEdit(el.dataset.col),
  edit: (el) => addOrEdit(el.dataset.col, el.dataset.id),
  delete: (el) => {
    const { col, id } = el.dataset;
    confirmDialog(`Excluir este(a) ${SCHEMAS[col].label}?`, () => {
      store.remove(col, id);
      toast('Excluído');
    });
  },
  'toggle-task': (el) => {
    const t = store.find('tasks', el.dataset.id);
    if (t) store.update('tasks', t.id, { done: !t.done });
    if (t && !t.done) toast('Tarefa concluída ✓');
  },
  'toggle-done': (el) => {
    const { col, id } = el.dataset;
    const x = store.find(col, id);
    if (x) store.update(col, id, { done: !x.done });
  },
  'cycle-stage': (el) => {
    const e = store.find('experiments', el.dataset.id);
    if (!e) return;
    const order = ['todo', 'doing', 'done'];
    const cur = (e.stages || {})[el.dataset.stage] || 'todo';
    const next = order[(order.indexOf(cur) + 1) % 3];
    store.update('experiments', e.id, { stages: { ...(e.stages || {}), [el.dataset.stage]: next } });
  },
  'add-log-for': (el) => addOrEdit('logs', null, { experimentId: el.dataset.id, date: todayISO() }),
  'advance-paper': (el) => {
    const p = store.find('papers', el.dataset.id);
    const keys = PAPER_STATUS.map(([k]) => k);
    const i = keys.indexOf(p.status || 'ideia');
    if (i < keys.length - 1) {
      store.update('papers', p.id, { status: keys[i + 1] });
      toast(`Movido para “${PAPER_STATUS[i + 1][1]}”`);
    }
  },
  lattes: showLattes,
  export: () => {
    download(`minha-pesquisa-backup-${todayISO()}.json`, JSON.stringify(store.get(), null, 2));
    toast('Backup baixado');
  },
  demo: () =>
    confirmDialog('Carregar o exemplo substitui os seus dados atuais. Continuar?', () => {
      store.replaceAll(demoData());
      location.hash = '#/inicio';
    }, 'Carregar exemplo'),
  reset: () =>
    confirmDialog('Apagar todos os dados deste navegador?', () => {
      store.reset();
      location.hash = '';
    }, 'Apagar'),
};

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.tagName === 'INPUT') return;
  let name = el.dataset.action;
  // atalhos gerados pelos estados vazios: add-<coleção>
  if (!actions[name] && name.startsWith('add-') && SCHEMAS[name.slice(4)]) {
    addOrEdit(name.slice(4));
    return;
  }
  if (actions[name]) {
    e.preventDefault();
    actions[name](el);
  }
});

document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.filter === 'exp') {
    location.hash = el.value ? `#/planejamento?exp=${el.value}` : '#/planejamento';
  }
  if (el.dataset.action === 'import' && el.files?.[0]) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object' || !('profile' in data)) throw new Error('formato');
        confirmDialog('Restaurar este backup? Os dados atuais serão substituídos.', () => {
          store.replaceAll(data);
          toast('Backup restaurado');
        }, 'Restaurar');
      } catch {
        toast('Arquivo inválido: escolha um backup do Minha Pesquisa');
      }
      el.value = '';
    };
    reader.readAsText(el.files[0]);
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

window.addEventListener('hashchange', () => {
  closeModal();
  render();
});
store.subscribe(render);
render();
