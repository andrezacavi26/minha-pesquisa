// Lógica do planejamento da execução: grupos experimentais, lotes de animais,
// agenda do protocolo (DPN -> datas reais) e calculadoras de reagentes e doses.
import { uid } from './store.js';

export const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const FREQ = [
  ['daily', 'Todo dia'],
  ['weekly', 'Em dias da semana'],
  ['dpns', 'Em dias (DPN) específicos'],
  ['once', 'Uma vez (no início)'],
  ['continuous', 'Período contínuo (sem tarefa diária)'],
];

// ---------- Datas ----------
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function parse(isoStr) {
  const [y, m, d] = String(isoStr || '').split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
}
export function dpnToDate(birthISO, dpn) {
  const b = parse(birthISO);
  if (!b) return null;
  b.setDate(b.getDate() + Number(dpn));
  return iso(b);
}
export function dateToDpn(birthISO, dateISO) {
  const b = parse(birthISO);
  const d = parse(dateISO);
  if (!b || !d) return null;
  return Math.round((d - b) / 86400000);
}
export const weekday = (dateISO) => parse(dateISO)?.getDay();

// ---------- Grupos ----------
// fatores: [{ name: 'Estresse', levels: ['Não', 'Sim'] }, ...] -> todas as combinações
export function combineFactors(factors) {
  const fs = (factors || []).filter((f) => f.name && f.levels?.length);
  if (!fs.length) return [];
  let combos = [{}];
  fs.forEach((f) => {
    const next = [];
    combos.forEach((c) => f.levels.forEach((l) => next.push({ ...c, [f.name]: l })));
    combos = next;
  });
  return combos;
}

export function groupLabel(levels, factors) {
  return (factors || [])
    .map((f) => levels[f.name])
    .filter(Boolean)
    .join(' + ');
}

// Gera os grupos a partir dos fatores, mantendo n e nome dos grupos que já existiam
export function rebuildGroups(design) {
  const old = design.groups || [];
  const key = (lv) => JSON.stringify(Object.keys(lv).sort().map((k) => [k, lv[k]]));
  const byKey = Object.fromEntries(old.map((g) => [key(g.levels || {}), g]));
  return combineFactors(design.factors).map((levels, i) => {
    const prev = byKey[key(levels)];
    return prev ? { ...prev, levels } : { id: uid(), name: `G${i + 1}`, levels, n: design.defaultN || '' };
  });
}

// "Estresse=Sim" -> só grupos com esse nível. Vazio: todos.
export function matches(group, cond) {
  if (!cond) return true;
  return String(cond)
    .split('&')
    .map((c) => c.trim())
    .filter(Boolean)
    .every((c) => {
      const [f, l] = c.split('=').map((x) => x.trim());
      return group.levels?.[f] === l;
    });
}

export function groupTotals(design) {
  const groups = design?.groups || [];
  const perBox = Number(design?.perBox) || 0;
  const total = groups.reduce((s, g) => s + (Number(g.n) || 0), 0);
  // caixas por grupo (não se misturam grupos na mesma caixa)
  const boxes = perBox ? groups.reduce((s, g) => s + Math.ceil((Number(g.n) || 0) / perBox), 0) : 0;
  return { total, boxes, groups: groups.length, missingN: groups.filter((g) => !Number(g.n)).length };
}

export function animalsFor(design, cond, cohort) {
  return (design?.groups || [])
    .filter((g) => matches(g, cond))
    .reduce((s, g) => s + (Number(cohort?.nPerGroup) || Number(g.n) || 0), 0);
}

// ---------- Agenda do protocolo ----------
export function stepDpns(step) {
  const a = Number(step.start);
  const b = step.end === '' || step.end === undefined || step.end === null ? a : Number(step.end);
  if (isNaN(a)) return [];
  const range = [];
  for (let d = Math.min(a, b); d <= Math.max(a, b); d++) range.push(d);
  return range;
}

// Lista de ocorrências (tarefas com data) de um projeto
export function occurrences(project) {
  const out = [];
  const steps = project.protocol?.steps || [];
  (project.cohorts || []).forEach((c) => {
    if (!c.birth) return;
    steps.forEach((s) => {
      let dpns = [];
      if (s.freq === 'continuous') return;
      if (s.freq === 'once') dpns = [Number(s.start)];
      else if (s.freq === 'daily') dpns = stepDpns(s);
      else if (s.freq === 'weekly') {
        const wds = (s.weekdays || []).map(Number);
        dpns = stepDpns(s).filter((d) => wds.includes(weekday(dpnToDate(c.birth, d))));
      } else if (s.freq === 'dpns')
        dpns = String(s.dpns || '')
          .split(/[,;\s]+/)
          .map(Number)
          .filter((n) => !isNaN(n) && String(n) !== '');
      const animals = animalsFor(project.design, s.appliesTo, c);
      dpns.forEach((d) => {
        const date = dpnToDate(c.birth, d);
        const id = `${c.id}:${s.id}:${d}`;
        const wd = weekday(date);
        out.push({
          id,
          date,
          dpn: d,
          step: s,
          cohort: c,
          animals,
          weekend: wd === 0 || wd === 6,
          done: !!project.done?.[id],
        });
      });
    });
  });
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.step.time || '').localeCompare(b.step.time || ''));
}

// Período total do protocolo em DPN (para a linha do tempo)
export function dpnRange(project) {
  const steps = project.protocol?.steps || [];
  const all = steps.flatMap((s) => {
    if (s.freq === 'dpns')
      return String(s.dpns || '')
        .split(/[,;\s]+/)
        .map(Number)
        .filter((n) => !isNaN(n));
    return stepDpns(s);
  });
  if (!all.length) return [0, 70];
  return [Math.max(0, Math.min(...all) - 2), Math.max(...all) + 2];
}

// ---------- Calculadoras ----------
// Diluição 1:N, volume final por amostra (µL), nº de amostras, margem (%)
export function reagentNeed(r, defaultSamples) {
  const ratio = Number(String(r.dilution || '').split(':').pop()) || 0;
  const samples = Number(r.samples) || defaultSamples || 0;
  const vol = Number(r.volume) || 0;
  const margin = Number(r.margin ?? 10) || 0;
  if (!ratio || !vol || !samples) return null;
  const finalTotal = vol * samples * (1 + margin / 100); // µL de solução de trabalho
  const stock = finalTotal / ratio; // µL do reagente concentrado
  const have = Number(r.stock) || 0;
  return { samples, finalTotal, stock, have, enough: have ? have >= stock : null, ratio };
}

// Dose (mg/kg), peso médio (g), nº animais, nº de administrações, concentração (mg/mL)
export function doseNeed(d, defaultAnimals) {
  const dose = Number(d.dose) || 0;
  const weight = (Number(d.weight) || 0) / 1000; // kg
  const animals = Number(d.animals) || defaultAnimals || 0;
  const times = Number(d.times) || 0;
  const conc = Number(d.conc) || 0;
  if (!dose || !weight) return null;
  const mgPerAnimal = dose * weight;
  const mlPerAnimal = conc ? mgPerAnimal / conc : null;
  const total = mgPerAnimal * animals * times;
  return {
    animals,
    times,
    mgPerAnimal,
    mlPerAnimal,
    mlPerKg: conc ? dose / conc : null,
    totalMg: total,
    totalMl: conc ? total / conc : null,
  };
}

// ---------- Modelo: estresse na adolescência + EA + doxiciclina ----------
export function templateAdolescentStress() {
  const S = (o) => ({ id: uid(), appliesTo: '', time: '', notes: '', color: '#3ee8b5', weekdays: [], dpns: '', ...o });
  return {
    design: {
      factors: [
        { name: 'Estresse', levels: ['Naïve', 'Estressado'] },
        { name: 'EA', levels: ['Sem EA', 'Com EA'] },
        { name: 'Tratamento', levels: ['Salina', 'Doxiciclina'] },
      ],
      perBox: 4,
      defaultN: 8,
    },
    steps: [
      S({ name: 'Enriquecimento ambiental (alojamento)', freq: 'continuous', start: 21, end: 40, appliesTo: 'EA=Com EA', color: '#20c997', notes: 'Gaiola com brinquedos, túneis, roda e material para roer.' }),
      S({ name: 'Trocar maravalha das caixas de EA', freq: 'weekly', start: 21, end: 40, weekdays: [1, 4], appliesTo: 'EA=Com EA', color: '#20c997' }),
      S({ name: 'Mudar orientação e cor dos objetos do EA', freq: 'weekly', start: 21, end: 40, weekdays: [1, 3, 5], appliesTo: 'EA=Com EA', color: '#20c997' }),
      S({ name: 'Choque nas patas (25 choques, 1 mA, 2 s)', freq: 'daily', start: 31, end: 40, appliesTo: 'Estresse=Estressado', color: '#d9474f', notes: 'Choques em intervalos aleatórios de 60 ± 20 s.' }),
      S({ name: 'Estresse de restrição (1 h)', freq: 'dpns', start: 31, end: 40, dpns: '31, 32, 40', appliesTo: 'Estresse=Estressado', color: '#d9474f', notes: 'Logo após o choque, no 1º, 2º e último dia.' }),
      S({ name: 'Gavagem: doxiciclina 40 mg/kg ou salina', freq: 'daily', start: 31, end: 40, color: '#4a90d9', time: '1 h após o estresse' }),
      S({ name: 'Eutanásia e coleta do cólon', freq: 'once', start: 65, end: 65, color: '#0a2a2c', notes: 'Isoflurano; cólon em bexiga com PFA 4% por 3 h.' }),
    ],
    reagents: [
      { id: uid(), name: 'Rabbit anti-nNOS (primário)', dilution: '1:1000', volume: 500, samples: '', margin: 10, stock: '' },
      { id: uid(), name: 'Goat anti-HuC/D (primário)', dilution: '1:500', volume: 500, samples: '', margin: 10, stock: '' },
      { id: uid(), name: 'Donkey anti-goat (secundário)', dilution: '1:500', volume: 500, samples: '', margin: 10, stock: '' },
      { id: uid(), name: 'Donkey anti-rabbit (secundário)', dilution: '1:500', volume: 500, samples: '', margin: 10, stock: '' },
    ],
    doses: [{ id: uid(), name: 'Doxiciclina (gavagem)', dose: 40, weight: '', animals: '', appliesTo: 'Tratamento=Doxiciclina', times: 10, conc: '' }],
  };
}
