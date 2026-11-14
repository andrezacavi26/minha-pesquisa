// Utilitários de interface: escape, datas, ícones, modal de formulário, toast.

export const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ---------- Datas ----------
export function todayISO() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parse(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function daysUntil(iso) {
  const d = parse(iso);
  if (!d) return null;
  const t = parse(todayISO());
  return Math.round((d - t) / 86400000);
}

export function fmtDate(iso, opts = { day: '2-digit', month: 'short', year: 'numeric' }) {
  const d = parse(iso);
  return d ? d.toLocaleDateString('pt-BR', opts).replace('.', '') : '—';
}

export function relDays(iso) {
  const n = daysUntil(iso);
  if (n === null) return '';
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n === -1) return 'ontem';
  if (n < 0) return `há ${-n} dias`;
  if (n < 60) return `em ${n} dias`;
  const months = Math.round(n / 30);
  return `em ${months} meses`;
}

// nível de urgência: late | soon | near | ok
export function urgency(iso, done = false) {
  if (done) return 'done';
  const n = daysUntil(iso);
  if (n === null) return 'ok';
  if (n < 0) return 'late';
  if (n <= 7) return 'soon';
  if (n <= 30) return 'near';
  return 'ok';
}

export function badge(iso, done = false) {
  const u = urgency(iso, done);
  const label = done ? 'concluído' : relDays(iso);
  return `<span class="badge badge-${u}">${esc(label)}</span>`;
}

// ---------- Ícones (traço, 24px) ----------
const P = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/>',
  flask: '<path d="M9 3h6"/><path d="M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14a6 6 0 0 1 3.5 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  book: '<path d="M2 5.5C4.5 4 8 4 11 5.5v14C8 18 4.5 18 2 19.5z"/><path d="M22 5.5C19.5 4 16 4 13 5.5v14c3-1.5 6.5-1.5 9 0z"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  note: '<path d="M5 3h10l4 4v14H5z"/><path d="M14 3v5h5M8 13h8M8 17h5"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  cert: '<rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M7 9h10M7 12h6"/><circle cx="17" cy="17" r="2.5"/><path d="m15.5 19-1 3 2.5-1 2.5 1-1-3"/>',
  mic: '<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 13v-3M12 13V8M16 13v-5M12 16v4M8 21h8"/>',
  paper: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 7h3"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  gut: '<path d="M8 4h8a3 3 0 0 1 0 6H9a2.5 2.5 0 0 0 0 5h7a2.5 2.5 0 0 1 0 5H8"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  chart: '<path d="M5 20V12M10 20V6M15 20v-9M20 20V4"/>',
};

export const icon = (name, cls = '') =>
  `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

// ---------- Componentes ----------
export function emptyState(text, action = '', label = '') {
  return `<div class="empty"><p>${esc(text)}</p>${
    action ? `<button class="btn btn-soft" data-action="${action}">${icon('plus')} ${esc(label)}</button>` : ''
  }</div>`;
}

export function rowActions(col, id) {
  return `<div class="row-actions">
    <button class="icon-btn" title="Editar" aria-label="Editar" data-action="edit" data-col="${col}" data-id="${id}">${icon('edit')}</button>
    <button class="icon-btn danger" title="Excluir" aria-label="Excluir" data-action="delete" data-col="${col}" data-id="${id}">${icon('trash')}</button>
  </div>`;
}

export function progressBar(pct, cls = '') {
  const v = Math.max(0, Math.min(100, Math.round(pct || 0)));
  return `<div class="bar ${cls}" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100"><span style="width:${v}%"></span></div>`;
}

// ---------- Toast ----------
export function toast(msg) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 2200);
}

// ---------- Modal de formulário ----------
// fields: [{ name, label, type: text|date|number|select|textarea|url|checkbox, options:[[v,l]], required, placeholder, hint, full }]
export function openForm({ title, fields, values = {}, submitLabel = 'Salvar', onSubmit }) {
  closeModal();
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <header class="modal-head">
        <h2 id="modal-title">${esc(title)}</h2>
        <button class="icon-btn" data-close aria-label="Fechar">${icon('x')}</button>
      </header>
      <form class="form-grid" novalidate>
        ${fields.map((f) => field(f, values[f.name])).join('')}
        <footer class="modal-foot">
          <button type="button" class="btn btn-ghost" data-close>Cancelar</button>
          <button type="submit" class="btn btn-primary">${esc(submitLabel)}</button>
        </footer>
      </form>
    </div>`;
  document.body.appendChild(wrap);
  document.body.classList.add('no-scroll');

  const form = wrap.querySelector('form');
  const first = form.querySelector('input,select,textarea');
  first && first.focus();

  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || e.target.closest('[data-close]')) closeModal();
  });
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const out = {};
    let ok = true;
    fields.forEach((f) => {
      const el = form.elements[f.name];
      let v;
      if (f.type === 'checkbox') v = el.checked;
      else if (f.type === 'number') v = el.value === '' ? '' : Number(el.value);
      else v = el.value.trim();
      if (f.required && (v === '' || v === null)) {
        ok = false;
        el.classList.add('invalid');
      } else el.classList.remove('invalid');
      out[f.name] = v;
    });
    if (!ok) {
      form.querySelector('.invalid')?.focus();
      return;
    }
    onSubmit(out);
    closeModal();
  });
}

function field(f, value) {
  const id = `f-${f.name}`;
  const v = value ?? f.default ?? '';
  const req = f.required ? 'required' : '';
  const ph = f.placeholder ? `placeholder="${esc(f.placeholder)}"` : '';
  let input;
  if (f.type === 'textarea') {
    input = `<textarea id="${id}" name="${f.name}" rows="${f.rows || 4}" ${ph} ${req}>${esc(v)}</textarea>`;
  } else if (f.type === 'select') {
    input = `<select id="${id}" name="${f.name}" ${req}>${f.options
      .map(([ov, ol]) => `<option value="${esc(ov)}" ${String(ov) === String(v) ? 'selected' : ''}>${esc(ol)}</option>`)
      .join('')}</select>`;
  } else if (f.type === 'checkbox') {
    return `<label class="check ${f.full ? 'full' : ''}"><input type="checkbox" name="${f.name}" ${v ? 'checked' : ''}/> <span>${esc(f.label)}</span></label>`;
  } else {
    input = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" ${ph} ${req} ${
      f.type === 'number' ? 'step="any" min="0"' : ''
    }/>`;
  }
  return `<label class="field ${f.full || f.type === 'textarea' ? 'full' : ''}" for="${id}">
    <span>${esc(f.label)}${f.required ? ' <em>*</em>' : ''}</span>${input}${f.hint ? `<small>${esc(f.hint)}</small>` : ''}
  </label>`;
}

export function closeModal() {
  document.querySelectorAll('.modal-backdrop').forEach((m) => m.remove());
  document.body.classList.remove('no-scroll');
}

export function confirmDialog(text, onYes, yesLabel = 'Excluir') {
  closeModal();
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal modal-sm" role="alertdialog" aria-modal="true">
    <p class="confirm-text">${esc(text)}</p>
    <footer class="modal-foot">
      <button class="btn btn-ghost" data-close>Cancelar</button>
      <button class="btn ${yesLabel === 'Excluir' || yesLabel === 'Apagar' ? 'btn-danger' : 'btn-primary'}" data-yes>${esc(yesLabel)}</button>
    </footer></div>`;
  document.body.appendChild(wrap);
  wrap.querySelector('[data-yes]').focus();
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || e.target.closest('[data-close]')) closeModal();
    if (e.target.closest('[data-yes]')) {
      onYes();
      closeModal();
    }
  });
  wrap.addEventListener('keydown', (e) => e.key === 'Escape' && closeModal());
}
