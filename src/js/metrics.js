// Cálculos derivados: progresso, ritmo, créditos e agenda unificada.
import { store } from './store.js';
import { daysUntil, todayISO } from './ui.js';
import { STAGES } from './schemas.js';

const STATUS_WEIGHT = { todo: 0, doing: 0.5, done: 1 };

export function stagesOf(exp) {
  const st = exp.stages || {};
  return STAGES.map((name) => ({ name, status: st[name] || 'todo' }));
}

export function experimentProgress(exp) {
  const s = stagesOf(exp);
  return (s.reduce((a, x) => a + STATUS_WEIGHT[x.status], 0) / s.length) * 100;
}

export function currentStage(exp) {
  const s = stagesOf(exp);
  return s.find((x) => x.status === 'doing') || s.find((x) => x.status === 'todo') || null;
}

export function researchProgress() {
  const exps = store.list('experiments');
  const ms = store.list('milestones').filter((m) => m.kind === 'marco');
  const parts = [];
  if (exps.length) parts.push(exps.reduce((a, e) => a + experimentProgress(e), 0) / exps.length);
  if (ms.length) parts.push((ms.filter((m) => m.done).length / ms.length) * 100);
  if (!parts.length) return 0;
  return parts.reduce((a, b) => a + b, 0) / parts.length;
}

export function timeElapsed(profile) {
  if (!profile?.start || !profile?.end) return 0;
  const total = daysUntil(profile.end) - daysUntil(profile.start);
  if (total <= 0) return 0;
  const passed = -daysUntil(profile.start);
  return Math.max(0, Math.min(100, (passed / total) * 100));
}

// Compara tempo decorrido com progresso da pesquisa.
export function pace(profile) {
  const t = timeElapsed(profile);
  const p = researchProgress();
  const diff = p - t;
  if (!store.list('experiments').length && !store.list('milestones').length)
    return { t, p, tone: 'neutral', text: 'Cadastre experimentos e marcos para medir seu ritmo.' };
  if (diff >= 5) return { t, p, tone: 'good', text: 'Você está adiantado em relação ao tempo do curso.' };
  if (diff >= -10) return { t, p, tone: 'good', text: 'Você está no ritmo. Siga assim.' };
  if (diff >= -25) return { t, p, tone: 'warn', text: 'Um pouco atrás do tempo. Vale revisar o cronograma com seu orientador.' };
  return { t, p, tone: 'bad', text: 'Bem atrás do tempo do curso. Leve isso para a próxima reunião.' };
}

// Créditos separados por tipo. Disciplina sem tipo conta como obrigatória.
export const courseType = (c) => (c.type === 'optativa' ? 'optativa' : 'obrigatoria');

export function credits(profile) {
  const sum = (type, status) =>
    store
      .list('courses')
      .filter((c) => (!type || courseType(c) === type) && c.status === status)
      .reduce((a, c) => a + (Number(c.credits) || 0), 0);
  const part = (type, req) => {
    const done = sum(type, 'concluida');
    const ongoing = sum(type, 'cursando');
    req = Number(req) || 0;
    return { done, ongoing, req, pct: req ? (done / req) * 100 : 0, missing: Math.max(0, req - done) };
  };
  const mand = part('obrigatoria', profile?.requiredMandatory);
  const elec = part('optativa', profile?.requiredElective);
  // compatibilidade com a versão antiga, que tinha só "créditos exigidos"
  const totalReq = mand.req + elec.req || Number(profile?.requiredCredits) || 0;
  const total = part(null, totalReq);
  // no total, o que passa do exigido em um tipo não cobre o outro
  if (mand.req || elec.req) {
    const counted = Math.min(mand.done, mand.req) + Math.min(elec.done, elec.req);
    total.pct = totalReq ? (counted / totalReq) * 100 : 0;
    total.missing = mand.missing + elec.missing;
  }
  return { mand, elec, total, split: !!(mand.req || elec.req) };
}

// Agenda unificada: tudo que tem data e ainda não foi resolvido.
export function agenda({ includeDone = false } = {}) {
  const out = [];
  const exps = Object.fromEntries(store.list('experiments').map((e) => [e.id, e]));
  store.list('tasks').forEach((t) => {
    if (t.due && (includeDone || !t.done))
      out.push({ date: t.due, title: t.title, kind: 'Tarefa', col: 'tasks', id: t.id, done: !!t.done, sub: exps[t.experimentId]?.title || t.origin || '' });
  });
  store.list('milestones').forEach((m) => {
    if (includeDone || !m.done)
      out.push({ date: m.date, title: m.title, kind: 'Prazo', col: 'milestones', id: m.id, done: !!m.done, sub: m.notes || '' });
  });
  store.list('ethics').forEach((e) => {
    if (e.validUntil)
      out.push({ date: e.validUntil, title: `Validade ${e.kind} ${e.number}`, kind: 'Ética', col: 'ethics', id: e.id, done: false, sub: e.title || '' });
  });
  store.list('congresses').forEach((c) => {
    if (c.abstractDeadline && daysUntil(c.abstractDeadline) >= -1)
      out.push({ date: c.abstractDeadline, title: `Resumo: ${c.event}`, kind: 'Congresso', col: 'congresses', id: c.id, done: false, sub: c.work || '' });
  });
  store.list('experiments').forEach((e) => {
    if (e.deadline && experimentProgress(e) < 100)
      out.push({ date: e.deadline, title: `Concluir: ${e.title}`, kind: 'Experimento', col: 'experiments', id: e.id, done: false, sub: '' });
  });
  const p = store.get().profile;
  if (p?.scholarshipEnd)
    out.push({ date: p.scholarshipEnd, title: `Fim da bolsa ${p.scholarship || ''}`.trim(), kind: 'Bolsa', col: null, id: null, done: false, sub: '' });
  if (p?.end) out.push({ date: p.end, title: 'Previsão de defesa', kind: 'Marco', col: null, id: null, done: false, sub: '' });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function nextMeeting() {
  const t = todayISO();
  return store
    .list('meetings')
    .filter((m) => m.date >= t)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
}

export function lastMeeting() {
  const t = todayISO();
  return store
    .list('meetings')
    .filter((m) => m.date < t)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}
