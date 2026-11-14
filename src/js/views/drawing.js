// Editor de desenhos experimentais, no estilo das formas do PowerPoint.
// Tudo é SVG: formas, linhas, setas e texto. Os dados ficam em store.drawings.
import { store, uid } from '../store.js';
import { esc, icon, toast, confirmDialog } from '../ui.js';

export const W = 1600;
export const H = 900;
const GRID = 20;

const SWATCHES = [
  'transparent', '#ffffff', '#0d2122', '#627677', '#e3eeec',
  '#3ee8b5', '#d6faec', '#1f8a7a', '#0a2a2c',
  '#4a90d9', '#e4edf7', '#9b59b6', '#f1e9fb',
  '#e7a33a', '#fff3dc', '#d9474f', '#fde8e9',
];

const BOX = ['rect', 'round', 'ellipse', 'triangle', 'diamond', 'text'];
const isLine = (s) => s.type === 'line' || s.type === 'arrow';

const TOOLS = [
  ['select', 'Selecionar (V)', '<path d="M5 3l14 8-6 2-3 6z"/>'],
  ['rect', 'Retângulo (R)', '<rect x="4" y="6" width="16" height="12"/>'],
  ['round', 'Retângulo arredondado', '<rect x="4" y="6" width="16" height="12" rx="4"/>'],
  ['ellipse', 'Elipse (O)', '<ellipse cx="12" cy="12" rx="8" ry="6"/>'],
  ['triangle', 'Triângulo', '<path d="M12 5l8 14H4z"/>'],
  ['diamond', 'Losango', '<path d="M12 3l8 9-8 9-8-9z"/>'],
  ['line', 'Linha (L)', '<path d="M5 19L19 5"/>'],
  ['arrow', 'Seta (A)', '<path d="M5 19L19 5M11 5h8v8"/>'],
  ['text', 'Caixa de texto (T)', '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'],
];

function defaults(type) {
  if (type === 'text') return { fill: 'transparent', stroke: 'transparent', sw: 0, dash: '', text: 'Texto', fs: 28, tc: '#0d2122', bold: false };
  if (isLine({ type })) return { stroke: '#0d2122', sw: 3, dash: '' };
  return { fill: '#d6faec', stroke: '#1f8a7a', sw: 2, dash: '', text: '', fs: 24, tc: '#0d2122', bold: false };
}

// ---------- Desenho das formas (usado no editor, nas miniaturas e na exportação) ----------
const dashArray = (s) => (s.dash === 'dash' ? `${s.sw * 4} ${s.sw * 3}` : s.dash === 'dot' ? `${s.sw} ${s.sw * 2}` : '');

function wrap(text, w, fs) {
  const max = Math.max(1, Math.floor((w - 16) / (fs * 0.55)));
  const out = [];
  String(text || '').split('\n').forEach((para) => {
    let line = '';
    para.split(/\s+/).forEach((word) => {
      if (!word) return;
      const tryLine = line ? line + ' ' + word : word;
      if (tryLine.length > max && line) {
        out.push(line);
        line = word;
      } else line = tryLine;
    });
    out.push(line);
  });
  return out;
}

function textMarkup(s, font) {
  if (!s.text) return '';
  const lines = wrap(s.text, Math.abs(s.w), s.fs);
  const lh = s.fs * 1.2;
  const cx = s.x + s.w / 2;
  // no triângulo o texto fica um pouco mais para baixo, onde a forma é larga
  const cy = s.y + s.h / 2 + (s.type === 'triangle' ? s.h * 0.15 : 0);
  const y0 = cy - ((lines.length - 1) * lh) / 2;
  return `<text x="${cx}" y="${y0}" text-anchor="middle" dominant-baseline="middle" font-family="${font}" font-size="${s.fs}" font-weight="${s.bold ? 700 : 400}" fill="${s.tc}" style="pointer-events:none">${lines
    .map((l, i) => `<tspan x="${cx}" y="${y0 + i * lh}">${esc(l)}</tspan>`)
    .join('')}</text>`;
}

function arrowHead(s) {
  const ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
  const len = 14 + s.sw * 3;
  const spread = 0.45;
  const p1 = [s.x2 - len * Math.cos(ang - spread), s.y2 - len * Math.sin(ang - spread)];
  const p2 = [s.x2 - len * Math.cos(ang + spread), s.y2 - len * Math.sin(ang + spread)];
  return `<path d="M${s.x2} ${s.y2} L${p1[0]} ${p1[1]} L${p2[0]} ${p2[1]} Z" fill="${s.stroke}" stroke="${s.stroke}" stroke-width="${Math.max(1, s.sw / 2)}" stroke-linejoin="round"/>`;
}

export function shapeMarkup(s, { font = 'Outfit, Arial, sans-serif', hit = false } = {}) {
  const stroke = s.stroke === 'transparent' || !s.sw ? 'none' : s.stroke;
  const fill = s.fill === 'transparent' ? 'none' : s.fill;
  const common = `stroke="${stroke}" stroke-width="${s.sw || 0}" stroke-dasharray="${dashArray(s)}" stroke-linejoin="round"`;
  let body = '';
  if (isLine(s)) {
    // a seta termina antes da ponta, para a linha não aparecer por cima dela
    let { x2, y2 } = s;
    if (s.type === 'arrow') {
      const ang = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      const back = (14 + s.sw * 3) * 0.7;
      x2 -= back * Math.cos(ang);
      y2 -= back * Math.sin(ang);
    }
    body = `<line x1="${s.x1}" y1="${s.y1}" x2="${x2}" y2="${y2}" stroke="${s.stroke}" stroke-width="${s.sw}" stroke-dasharray="${dashArray(s)}" stroke-linecap="round"/>${
      s.type === 'arrow' ? arrowHead(s) : ''
    }${hit ? `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="transparent" stroke-width="22" stroke-linecap="round"/>` : ''}`;
  } else {
    const { x, y, w, h } = s;
    const hitFill = hit && fill === 'none' ? 'fill="transparent"' : `fill="${fill}"`;
    if (s.type === 'rect' || s.type === 'text') body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${hitFill} ${common}/>`;
    else if (s.type === 'round') body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) * 0.18}" ${hitFill} ${common}/>`;
    else if (s.type === 'ellipse') body = `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" ${hitFill} ${common}/>`;
    else if (s.type === 'triangle') body = `<polygon points="${x + w / 2},${y} ${x + w},${y + h} ${x},${y + h}" ${hitFill} ${common}/>`;
    else if (s.type === 'diamond') body = `<polygon points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}" ${hitFill} ${common}/>`;
    body += textMarkup(s, font);
  }
  return `<g data-id="${s.id}">${body}</g>`;
}

export function thumbnail(shapes) {
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" class="thumb-svg" aria-hidden="true"><rect width="${W}" height="${H}" fill="#fff"/>${(shapes || [])
    .map((s) => shapeMarkup(s))
    .join('')}</svg>`;
}

function exportSVGString(shapes) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#ffffff"/>${shapes
    .map((s) => shapeMarkup(s, { font: 'Arial, Helvetica, sans-serif' }))
    .join('')}</svg>`;
}

// ---------- Modelos prontos ----------
export function templateTimeline() {
  const L = (o) => ({ id: uid(), ...defaults(o.type), ...o });
  const out = [
    L({ type: 'text', x: 400, y: 70, w: 800, h: 70, text: 'Desenho experimental', fs: 44, bold: true }),
    L({ type: 'arrow', x1: 120, y1: 450, x2: 1500, y2: 450, sw: 5, stroke: '#0a2a2c' }),
  ];
  const steps = [
    ['Dia 0', 'Aclimatação'],
    ['Dia 7', 'Início do estresse'],
    ['Dia 21', 'Início do tratamento'],
    ['Dia 35', 'Testes comportamentais'],
    ['Dia 42', 'Eutanásia e coleta'],
  ];
  steps.forEach(([d, label], i) => {
    const cx = 220 + i * 290;
    out.push(L({ type: 'ellipse', x: cx - 18, y: 432, w: 36, h: 36, fill: '#3ee8b5', stroke: '#0a2a2c', sw: 3 }));
    const up = i % 2 === 0;
    out.push(L({ type: 'line', x1: cx, y1: up ? 432 : 468, x2: cx, y2: up ? 330 : 570, sw: 2, dash: 'dash', stroke: '#627677' }));
    out.push(L({ type: 'round', x: cx - 120, y: up ? 210 : 570, w: 240, h: 120, text: `${d}\n${label}`, fs: 24 }));
  });
  return out;
}

export function templateGroups() {
  const L = (o) => ({ id: uid(), ...defaults(o.type), ...o });
  const out = [
    L({ type: 'round', x: 600, y: 60, w: 400, h: 110, text: 'Animais\n(n = 30)', fs: 28, bold: true, fill: '#0a2a2c', stroke: '#0a2a2c', tc: '#ffffff' }),
    L({ type: 'round', x: 600, y: 700, w: 400, h: 130, text: 'Análises: permeabilidade, histologia e ELISA', fs: 24, fill: '#fff3dc', stroke: '#e7a33a' }),
  ];
  const groups = [
    ['Controle', '#e4edf7', '#4a90d9'],
    ['Estresse', '#fde8e9', '#d9474f'],
    ['Estresse + tratamento', '#d6faec', '#1f8a7a'],
  ];
  groups.forEach(([g, fill, stroke], i) => {
    const x = 160 + i * 460;
    out.push(L({ type: 'arrow', x1: 800, y1: 170, x2: x + 140, y2: 350, sw: 3 }));
    out.push(L({ type: 'rect', x, y: 360, w: 280, h: 140, text: `${g}\n(n = 10)`, fs: 26, fill, stroke, sw: 3 }));
    out.push(L({ type: 'arrow', x1: x + 140, y1: 500, x2: 800, y2: 690, sw: 3 }));
  });
  return out;
}

// ---------- Tela ----------
export function render(params) {
  const d = store.find('drawings', params.get('desenho'));
  if (!d)
    return `<div class="page"><div class="empty"><p>Desenho não encontrado.</p><a class="btn btn-soft" href="#/planejamento?aba=experimental">Voltar ao planejamento</a></div></div>`;
  const exps = store.list('experiments');
  return `<div class="editor-page">
    <header class="editor-head">
      <a class="icon-btn" href="#/planejamento?aba=experimental" title="Voltar" aria-label="Voltar">${icon('arrow', 'flip')}</a>
      <input class="editor-title" id="dr-title" value="${esc(d.title)}" aria-label="Título do desenho" />
      <select class="select-sm" id="dr-exp" aria-label="Experimento">
        <option value="">Sem experimento</option>
        ${exps.map((e) => `<option value="${e.id}" ${e.id === d.experimentId ? 'selected' : ''}>${esc(e.title)}</option>`).join('')}
      </select>
      <span class="save-state" id="dr-saved">Salvo</span>
      <div class="head-actions">
        <button class="btn btn-ghost" data-cmd="export-svg">${icon('download')} SVG</button>
        <button class="btn btn-primary" data-cmd="export-png">${icon('download')} Baixar PNG</button>
        <button class="icon-btn danger" data-cmd="delete-drawing" title="Excluir desenho" aria-label="Excluir desenho">${icon('trash')}</button>
      </div>
    </header>
    <div class="editor-body">
      <div class="toolbar" role="toolbar" aria-label="Ferramentas">
        ${TOOLS.map(
          ([t, label, path]) =>
            `<button class="tool" data-tool="${t}" title="${label}" aria-label="${label}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg></button>`
        ).join('')}
        <span class="tool-sep"></span>
        <button class="tool" data-cmd="undo" title="Desfazer (Ctrl+Z)" aria-label="Desfazer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg></button>
        <button class="tool" data-cmd="redo" title="Refazer (Ctrl+Y)" aria-label="Refazer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/></svg></button>
        <button class="tool" data-cmd="grid" title="Mostrar/ocultar grade" aria-label="Grade"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4h16v16H4zM4 10h16M4 15h16M10 4v16M15 4v16"/></svg></button>
      </div>
      <div class="canvas-wrap" id="dr-wrap">
        <svg id="dr-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
          <defs><pattern id="dr-grid" width="${GRID}" height="${GRID}" patternUnits="userSpaceOnUse"><path d="M ${GRID} 0 L 0 0 0 ${GRID}" fill="none" stroke="#e6efee" stroke-width="1"/></pattern></defs>
          <rect id="dr-bg" width="${W}" height="${H}" fill="#fff"/>
          <rect id="dr-gridrect" width="${W}" height="${H}" fill="url(#dr-grid)" style="pointer-events:none"/>
          <g id="dr-shapes"></g>
          <g id="dr-handles"></g>
        </svg>
      </div>
      <aside class="props" id="dr-props"></aside>
    </div>
    <p class="editor-hint">Escolha uma forma e arraste na área branca. Clique duas vezes numa forma para escrever dentro dela. Atalhos: Del exclui, Ctrl+D duplica, Ctrl+Z desfaz e as setas do teclado movem a forma.</p>
  </div>`;
}

export function mount(params) {
  const id = params.get('desenho');
  const d = store.find('drawings', id);
  if (!d) return null;

  const S = {
    shapes: JSON.parse(JSON.stringify(d.shapes || [])),
    sel: null,
    tool: 'select',
    grid: d.grid !== false,
    history: [],
    future: [],
    drag: null,
    clipboard: null,
    saveTimer: null,
  };
  const svg = document.getElementById('dr-svg');
  const layer = document.getElementById('dr-shapes');
  const handles = document.getElementById('dr-handles');
  const props = document.getElementById('dr-props');
  const savedEl = document.getElementById('dr-saved');
  const root = document.querySelector('.editor-page');

  const find = (sid) => S.shapes.find((s) => s.id === sid);
  const snap = (v) => (S.grid ? Math.round(v / (GRID / 2)) * (GRID / 2) : Math.round(v));
  const snapshot = () => JSON.stringify(S.shapes);
  const pushHistory = (snapStr = snapshot()) => {
    S.history.push(snapStr);
    if (S.history.length > 100) S.history.shift();
    S.future = [];
  };

  function save() {
    savedEl.textContent = 'Salvando…';
    clearTimeout(S.saveTimer);
    S.saveTimer = setTimeout(() => {
      store.update(
        'drawings',
        id,
        {
          shapes: S.shapes,
          grid: S.grid,
          title: document.getElementById('dr-title').value.trim() || 'Desenho sem título',
          experimentId: document.getElementById('dr-exp').value,
          updatedAt: new Date().toISOString(),
        },
        { silent: true }
      );
      savedEl.textContent = 'Salvo';
      S.saveTimer = null;
    }, 350);
  }

  function pt(e) {
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const r = p.matrixTransform(svg.getScreenCTM().inverse());
    return { x: r.x, y: r.y };
  }

  // ----- desenhar -----
  function draw() {
    layer.innerHTML = S.shapes.map((s) => shapeMarkup(s, { hit: true })).join('');
    document.getElementById('dr-gridrect').style.display = S.grid ? '' : 'none';
    drawHandles();
    root.querySelectorAll('.tool[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === S.tool));
    root.querySelector('[data-cmd="grid"]').classList.toggle('active', S.grid);
    root.querySelector('[data-cmd="undo"]').disabled = !S.history.length;
    root.querySelector('[data-cmd="redo"]').disabled = !S.future.length;
    svg.style.cursor = S.tool === 'select' ? 'default' : 'crosshair';
  }

  function drawHandles() {
    const s = find(S.sel);
    if (!s) {
      handles.innerHTML = '';
      return;
    }
    const hs = 14;
    if (isLine(s)) {
      handles.innerHTML = [['p1', s.x1, s.y1], ['p2', s.x2, s.y2]]
        .map(([h, x, y]) => `<circle data-handle="${h}" cx="${x}" cy="${y}" r="10" fill="#fff" stroke="#20c997" stroke-width="3" style="cursor:move"/>`)
        .join('');
      return;
    }
    const { x, y, w, h } = s;
    const pts = {
      nw: [x, y], n: [x + w / 2, y], ne: [x + w, y], e: [x + w, y + h / 2],
      se: [x + w, y + h], s: [x + w / 2, y + h], sw: [x, y + h], w: [x, y + h / 2],
    };
    const cursor = { nw: 'nwse', se: 'nwse', ne: 'nesw', sw: 'nesw', n: 'ns', s: 'ns', e: 'ew', w: 'ew' };
    handles.innerHTML =
      `<rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" fill="none" stroke="#20c997" stroke-width="2" stroke-dasharray="8 6" style="pointer-events:none"/>` +
      Object.entries(pts)
        .map(([k, [px, py]]) => `<rect data-handle="${k}" x="${px - hs / 2}" y="${py - hs / 2}" width="${hs}" height="${hs}" rx="3" fill="#fff" stroke="#20c997" stroke-width="3" style="cursor:${cursor[k]}-resize"/>`)
        .join('');
  }

  function select(sid) {
    S.sel = sid;
    draw();
    renderProps();
  }

  // ----- painel de propriedades -----
  function swatches(prop, current) {
    return `<div class="swatches">${SWATCHES.map(
      (c) => `<button class="sw ${c === current ? 'on' : ''} ${c === 'transparent' ? 'none' : ''}" data-prop="${prop}" data-val="${c}" style="${c === 'transparent' ? '' : `background:${c}`}" title="${c === 'transparent' ? 'Sem cor' : c}" aria-label="${c === 'transparent' ? 'Sem cor' : c}"></button>`
    ).join('')}<label class="sw custom" title="Outra cor"><input type="color" data-prop="${prop}" value="${current && current !== 'transparent' ? current : '#000000'}"/></label></div>`;
  }

  function renderProps() {
    const s = find(S.sel);
    if (!s) {
      props.innerHTML = `<h3>Desenho</h3>
        <p class="muted small">Selecione uma forma para mudar cor, contorno e texto.</p>
        <h4>Inserir modelo pronto</h4>
        <button class="btn btn-soft full" data-cmd="tpl-timeline">${icon('calendar')} Linha do tempo do experimento</button>
        <button class="btn btn-soft full" data-cmd="tpl-groups">${icon('users')} Grupos experimentais</button>
        <h4>Área de desenho</h4>
        <button class="btn btn-ghost full" data-cmd="clear">${icon('trash')} Limpar tudo</button>`;
      return;
    }
    const line = isLine(s);
    props.innerHTML = `<h3>${line ? (s.type === 'arrow' ? 'Seta' : 'Linha') : s.type === 'text' ? 'Caixa de texto' : 'Forma'}</h3>
      ${
        line
          ? ''
          : `<h4>Preenchimento</h4>${swatches('fill', s.fill)}`
      }
      <h4>${line ? 'Cor' : 'Contorno'}</h4>${swatches('stroke', s.stroke)}
      <div class="prop-row">
        <label>Espessura <input type="range" min="0" max="16" step="1" data-prop="sw" value="${s.sw}"/><b>${s.sw}</b></label>
      </div>
      <div class="prop-row">
        <label>Traço
          <select data-prop="dash">
            <option value="" ${!s.dash ? 'selected' : ''}>Contínuo</option>
            <option value="dash" ${s.dash === 'dash' ? 'selected' : ''}>Tracejado</option>
            <option value="dot" ${s.dash === 'dot' ? 'selected' : ''}>Pontilhado</option>
          </select>
        </label>
      </div>
      ${
        line
          ? ''
          : `<h4>Texto</h4>
        <textarea data-prop="text" rows="3" placeholder="Escreva aqui">${esc(s.text || '')}</textarea>
        <div class="prop-row">
          <label>Tamanho <input type="number" min="8" max="160" data-prop="fs" value="${s.fs}"/></label>
          <label class="check-inline"><input type="checkbox" data-prop="bold" ${s.bold ? 'checked' : ''}/> Negrito</label>
        </div>
        <h4>Cor do texto</h4>${swatches('tc', s.tc)}`
      }
      <h4>Organizar</h4>
      <div class="prop-grid">
        <button class="btn btn-ghost" data-cmd="front">Trazer p/ frente</button>
        <button class="btn btn-ghost" data-cmd="back">Enviar p/ trás</button>
        <button class="btn btn-ghost" data-cmd="duplicate">Duplicar</button>
        <button class="btn btn-ghost danger-text" data-cmd="delete">Excluir</button>
      </div>`;
  }

  function setProp(prop, raw) {
    const s = find(S.sel);
    if (!s) return;
    let v = raw;
    if (prop === 'sw' || prop === 'fs') v = Math.max(prop === 'fs' ? 8 : 0, Number(raw) || 0);
    if (prop === 'bold') v = !!raw;
    s[prop] = v;
    draw();
    save();
  }

  let propSnap = null;
  props.addEventListener('focusin', () => (propSnap = snapshot()));
  props.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.dataset.prop) return;
    if (propSnap === null) propSnap = snapshot();
    setProp(el.dataset.prop, el.type === 'checkbox' ? el.checked : el.value);
    if (el.type === 'range') el.nextElementSibling.textContent = el.value;
  });
  props.addEventListener('change', (e) => {
    if (e.target.dataset.prop && propSnap !== null && propSnap !== snapshot()) {
      pushHistory(propSnap);
      propSnap = snapshot();
      draw();
    }
    if (e.target.type === 'color') renderProps();
  });
  props.addEventListener('click', (e) => {
    const b = e.target.closest('.sw[data-val]');
    if (!b) return;
    pushHistory();
    setProp(b.dataset.prop, b.dataset.val);
    renderProps();
  });

  // ----- comandos -----
  function addShapes(list, { selectLast = true } = {}) {
    pushHistory();
    S.shapes.push(...list);
    if (selectLast) S.sel = list[list.length - 1].id;
    draw();
    renderProps();
    save();
  }

  function duplicate() {
    const s = find(S.sel);
    if (!s) return;
    const c = { ...JSON.parse(JSON.stringify(s)), id: uid() };
    if (isLine(c)) {
      c.x1 += 30; c.y1 += 30; c.x2 += 30; c.y2 += 30;
    } else {
      c.x += 30; c.y += 30;
    }
    addShapes([c]);
  }

  function removeSel() {
    if (!S.sel) return;
    pushHistory();
    S.shapes = S.shapes.filter((s) => s.id !== S.sel);
    S.sel = null;
    draw();
    renderProps();
    save();
  }

  function undo() {
    if (!S.history.length) return;
    S.future.push(snapshot());
    S.shapes = JSON.parse(S.history.pop());
    if (!find(S.sel)) S.sel = null;
    draw();
    renderProps();
    save();
  }

  function redo() {
    if (!S.future.length) return;
    S.history.push(snapshot());
    S.shapes = JSON.parse(S.future.pop());
    if (!find(S.sel)) S.sel = null;
    draw();
    renderProps();
    save();
  }

  function download(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
  }

  const fileBase = () =>
    (document.getElementById('dr-title').value.trim() || 'desenho')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w-]+/g, '-')
      .toLowerCase();

  function exportPNG() {
    const svgStr = exportSVGString(S.shapes);
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' }));
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = W * 2;
      c.height = H * 2;
      const ctx = c.getContext('2d');
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0, W, H);
      URL.revokeObjectURL(url);
      c.toBlob((b) => {
        download(fileBase() + '.png', b);
        toast('PNG baixado');
      }, 'image/png');
    };
    img.onerror = () => toast('Não foi possível gerar o PNG');
    img.src = url;
  }

  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tool]');
    if (t) {
      S.tool = t.dataset.tool;
      if (S.tool !== 'select') S.sel = null;
      draw();
      renderProps();
      return;
    }
    const c = e.target.closest('[data-cmd]');
    if (!c) return;
    const cmd = c.dataset.cmd;
    const s = find(S.sel);
    if (cmd === 'undo') undo();
    if (cmd === 'redo') redo();
    if (cmd === 'grid') {
      S.grid = !S.grid;
      draw();
      save();
    }
    if (cmd === 'duplicate') duplicate();
    if (cmd === 'delete') removeSel();
    if (cmd === 'front' && s) {
      pushHistory();
      S.shapes = [...S.shapes.filter((x) => x !== s), s];
      draw();
      save();
    }
    if (cmd === 'back' && s) {
      pushHistory();
      S.shapes = [s, ...S.shapes.filter((x) => x !== s)];
      draw();
      save();
    }
    if (cmd === 'tpl-timeline') addShapes(templateTimeline(), { selectLast: false });
    if (cmd === 'tpl-groups') addShapes(templateGroups(), { selectLast: false });
    if (cmd === 'clear' && S.shapes.length) {
      pushHistory();
      S.shapes = [];
      S.sel = null;
      draw();
      renderProps();
      save();
      toast('Desenho limpo. Ctrl+Z desfaz.');
    }
    if (cmd === 'export-png') exportPNG();
    if (cmd === 'export-svg') {
      download(fileBase() + '.svg', new Blob([exportSVGString(S.shapes)], { type: 'image/svg+xml' }));
      toast('SVG baixado');
    }
    if (cmd === 'delete-drawing') {
      confirmDialog('Excluir este desenho?', () => {
        clearTimeout(S.saveTimer);
        S.saveTimer = null;
        store.remove('drawings', id);
        location.hash = '#/planejamento?aba=experimental';
        toast('Desenho excluído');
      });
    }
  });

  document.getElementById('dr-title').addEventListener('input', save);
  document.getElementById('dr-exp').addEventListener('change', save);

  // ----- mouse / toque -----
  svg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const p = pt(e);
    const before = snapshot();
    const handle = e.target.closest('[data-handle]');
    const g = e.target.closest('[data-id]');
    svg.setPointerCapture(e.pointerId);

    if (handle && S.sel) {
      S.drag = { kind: 'resize', h: handle.dataset.handle, start: p, orig: { ...find(S.sel) }, before };
      return;
    }
    if (S.tool === 'select') {
      if (g) {
        // duplo clique detectado aqui, porque redesenhar a forma no 1º clique faz o navegador perder o dblclick
        const now = Date.now();
        if (S.lastDown && S.lastDown.id === g.dataset.id && now - S.lastDown.t < 450) {
          S.lastDown = null;
          // abre o editor só depois de soltar o botão, senão o foco do clique fecha a caixa
          S.pendingEdit = g.dataset.id;
          return;
        }
        S.lastDown = { id: g.dataset.id, t: now };
        select(g.dataset.id);
        S.drag = { kind: 'move', start: p, orig: { ...find(S.sel) }, before };
      } else select(null);
      return;
    }
    // criar forma nova
    const x = snap(p.x);
    const y = snap(p.y);
    const s = { id: uid(), type: S.tool, ...defaults(S.tool) };
    if (isLine(s)) Object.assign(s, { x1: x, y1: y, x2: x, y2: y });
    else Object.assign(s, { x, y, w: 0, h: 0 });
    S.shapes.push(s);
    S.sel = s.id;
    S.drag = { kind: 'create', start: { x, y }, before };
    draw();
  });

  svg.addEventListener('pointermove', (e) => {
    if (!S.drag) return;
    const p = pt(e);
    const s = find(S.sel);
    if (!s) return;
    const D = S.drag;
    const dx = p.x - D.start.x;
    const dy = p.y - D.start.y;
    if (D.kind === 'create') {
      if (isLine(s)) {
        let x2 = snap(p.x);
        let y2 = snap(p.y);
        // Shift deixa a linha reta (horizontal, vertical ou 45°)
        if (e.shiftKey) ({ x2, y2 } = straight(s.x1, s.y1, x2, y2));
        s.x2 = x2;
        s.y2 = y2;
      } else {
        let w = snap(p.x) - D.start.x;
        let h = snap(p.y) - D.start.y;
        if (e.shiftKey) {
          const m = Math.max(Math.abs(w), Math.abs(h));
          w = Math.sign(w || 1) * m;
          h = Math.sign(h || 1) * m;
        }
        s.x = w < 0 ? D.start.x + w : D.start.x;
        s.y = h < 0 ? D.start.y + h : D.start.y;
        s.w = Math.abs(w);
        s.h = Math.abs(h);
      }
    } else if (D.kind === 'move') {
      const o = D.orig;
      if (isLine(s)) {
        const ddx = snap(o.x1 + dx) - o.x1;
        const ddy = snap(o.y1 + dy) - o.y1;
        Object.assign(s, { x1: o.x1 + ddx, y1: o.y1 + ddy, x2: o.x2 + ddx, y2: o.y2 + ddy });
      } else {
        s.x = snap(o.x + dx);
        s.y = snap(o.y + dy);
      }
    } else if (D.kind === 'resize') {
      const o = D.orig;
      if (isLine(s)) {
        let nx = snap(p.x);
        let ny = snap(p.y);
        if (D.h === 'p1') {
          if (e.shiftKey) ({ x2: nx, y2: ny } = straight(s.x2, s.y2, nx, ny));
          s.x1 = nx;
          s.y1 = ny;
        } else {
          if (e.shiftKey) ({ x2: nx, y2: ny } = straight(s.x1, s.y1, nx, ny));
          s.x2 = nx;
          s.y2 = ny;
        }
      } else {
        let x1 = o.x, y1 = o.y, x2 = o.x + o.w, y2 = o.y + o.h;
        if (D.h.includes('w')) x1 = snap(o.x + dx);
        if (D.h.includes('e')) x2 = snap(o.x + o.w + dx);
        if (D.h.includes('n')) y1 = snap(o.y + dy);
        if (D.h.includes('s')) y2 = snap(o.y + o.h + dy);
        s.x = Math.min(x1, x2);
        s.y = Math.min(y1, y2);
        s.w = Math.max(10, Math.abs(x2 - x1));
        s.h = Math.max(10, Math.abs(y2 - y1));
      }
    }
    draw();
  });

  function straight(x1, y1, x2, y2) {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const stepA = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
    const len = Math.hypot(x2 - x1, y2 - y1);
    return { x2: Math.round(x1 + len * Math.cos(stepA)), y2: Math.round(y1 + len * Math.sin(stepA)) };
  }

  function endDrag() {
    if (S.pendingEdit) {
      const sid = S.pendingEdit;
      S.pendingEdit = null;
      setTimeout(() => editText(sid), 30);
      return;
    }
    if (!S.drag) return;
    const D = S.drag;
    S.drag = null;
    const s = find(S.sel);
    if (D.kind === 'create' && s) {
      // clique sem arrastar: tamanho padrão
      if (isLine(s) && Math.hypot(s.x2 - s.x1, s.y2 - s.y1) < 8) s.x2 = s.x1 + 200;
      if (!isLine(s) && (s.w < 8 || s.h < 8)) {
        s.w = s.type === 'text' ? 320 : 200;
        s.h = s.type === 'text' ? 70 : 120;
      }
      S.tool = 'select';
      if (s.type === 'text') setTimeout(() => editText(s.id, true), 30);
    }
    if (D.before !== snapshot()) {
      pushHistory(D.before);
      save();
    }
    draw();
    renderProps();
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  // ----- escrever dentro da forma -----
  function editText(sid, selectAll = false) {
    const s = find(sid);
    if (!s || isLine(s)) return;
    const g = layer.querySelector(`[data-id="${sid}"]`);
    if (!g) return;
    const r = g.getBoundingClientRect();
    const wr = document.getElementById('dr-wrap').getBoundingClientRect();
    const scale = svg.getBoundingClientRect().width / W;
    const ta = document.createElement('textarea');
    ta.className = 'inline-text';
    ta.value = s.text || '';
    Object.assign(ta.style, {
      left: `${r.left - wr.left + document.getElementById('dr-wrap').scrollLeft}px`,
      top: `${r.top - wr.top + document.getElementById('dr-wrap').scrollTop}px`,
      width: `${Math.max(120, r.width)}px`,
      height: `${Math.max(48, r.height)}px`,
      fontSize: `${Math.max(12, s.fs * scale)}px`,
      fontWeight: s.bold ? 700 : 400,
      color: s.tc,
    });
    document.getElementById('dr-wrap').appendChild(ta);
    ta.focus();
    if (selectAll) ta.select();
    const before = snapshot();
    let done = false;
    const finish = (keep) => {
      if (done) return;
      done = true;
      if (keep && ta.value !== (s.text || '')) {
        s.text = ta.value;
        pushHistory(before);
        save();
      }
      ta.remove();
      select(sid);
    };
    ta.addEventListener('blur', () => finish(true));
    ta.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') finish(false);
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) finish(true);
    });
  }


  // ----- teclado -----
  function onKey(e) {
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return;
    if (document.querySelector('.modal-backdrop')) return;
    const mod = e.ctrlKey || e.metaKey;
    const s = find(S.sel);
    if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) return e.preventDefault(), undo();
    if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) return e.preventDefault(), redo();
    if (mod && e.key.toLowerCase() === 'd') return e.preventDefault(), duplicate();
    if (mod && e.key.toLowerCase() === 'c' && s) return (S.clipboard = JSON.stringify(s));
    if (mod && e.key.toLowerCase() === 'v' && S.clipboard) {
      e.preventDefault();
      const c = { ...JSON.parse(S.clipboard), id: uid() };
      if (isLine(c)) {
        c.x1 += 30; c.y1 += 30; c.x2 += 30; c.y2 += 30;
      } else {
        c.x += 30; c.y += 30;
      }
      S.clipboard = JSON.stringify(c);
      return addShapes([c]);
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && s) return e.preventDefault(), removeSel();
    if (e.key === 'Escape') {
      S.tool = 'select';
      return select(null);
    }
    if (e.key === 'Enter' && s && !isLine(s)) return e.preventDefault(), editText(s.id);
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[e.key] && s) {
      e.preventDefault();
      const step = e.shiftKey ? 20 : 2;
      const [ax, ay] = arrows[e.key];
      pushHistory();
      if (isLine(s)) {
        s.x1 += ax * step; s.x2 += ax * step; s.y1 += ay * step; s.y2 += ay * step;
      } else {
        s.x += ax * step; s.y += ay * step;
      }
      draw();
      save();
      return;
    }
    if (mod || e.altKey) return;
    const keys = { v: 'select', r: 'rect', o: 'ellipse', l: 'line', a: 'arrow', t: 'text' };
    const k = keys[e.key.toLowerCase()];
    if (k) {
      S.tool = k;
      if (k !== 'select') S.sel = null;
      draw();
      renderProps();
    }
  }
  document.addEventListener('keydown', onKey);

  draw();
  renderProps();

  return () => {
    document.removeEventListener('keydown', onKey);
    // garante que a última alteração fique salva ao sair
    if (S.saveTimer && store.find('drawings', id)) {
      clearTimeout(S.saveTimer);
      store.update('drawings', id, {
        shapes: S.shapes,
        grid: S.grid,
        title: document.getElementById('dr-title')?.value.trim() || 'Desenho sem título',
        experimentId: document.getElementById('dr-exp')?.value || '',
        updatedAt: new Date().toISOString(),
      }, { silent: true });
    }
  };
}
