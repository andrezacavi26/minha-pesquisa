import { store } from '../store.js';
import { esc, icon, fmtDate, badge, rowActions, emptyState, todayISO } from '../ui.js';
import { nextMeeting, lastMeeting } from '../metrics.js';

export const title = 'Orientação';

export function render(params) {
  const s = store.get();
  const p = s.profile;
  const showDone = params.get('feitas') === '1';
  const expName = Object.fromEntries(s.experiments.map((e) => [e.id, e.title]));
  const tasks = [...s.tasks]
    .filter((t) => showDone || !t.done)
    .sort((a, b) => (a.done - b.done) || (a.due || '9999').localeCompare(b.due || '9999'));
  const t = todayISO();
  const upcoming = s.meetings.filter((m) => m.date >= t).sort((a, b) => a.date.localeCompare(b.date));
  const past = s.meetings.filter((m) => m.date < t).sort((a, b) => b.date.localeCompare(a.date));
  const nm = nextMeeting();
  const lm = lastMeeting();

  return `<div class="page">
    <header class="page-head">
      <div><p class="eyebrow dark">Orientação</p><h1>Reuniões e tarefas</h1>
      <p class="muted">${p.advisor ? `Orientação: <b>${esc(p.advisor)}</b>` : 'Cadastre seu orientador em Vida acadêmica.'}${p.coadvisor ? ` · Coorientação: <b>${esc(p.coadvisor)}</b>` : ''}</p></div>
      <button class="btn btn-primary" data-action="add" data-col="meetings">${icon('plus')} Nova reunião</button>
    </header>

    ${
      nm || lm
        ? `<section class="card prep">
      <div>
        <h2>Prepare a próxima conversa</h2>
        <p class="muted">${nm ? `Reunião ${badge(nm.date)} (${fmtDate(nm.date)}).` : 'Nenhuma reunião marcada.'} Leve o que foi combinado da última vez e o que travou.</p>
      </div>
      <div class="prep-cols">
        <div><h4>Combinado na última</h4><p class="pre">${esc(lm?.decisions || '—')}</p></div>
        <div><h4>Tarefas em aberto</h4><p>${s.tasks.filter((x) => !x.done).length} pendente(s), ${s.tasks.filter((x) => !x.done && x.due && x.due < t).length} atrasada(s)</p></div>
        ${nm ? `<div><h4>Pauta</h4><p class="pre">${esc(nm.agenda || '—')}</p><button class="link-btn dark" data-action="edit" data-col="meetings" data-id="${nm.id}">${icon('edit')} editar pauta</button></div>` : ''}
      </div>
    </section>`
        : ''
    }

    <div class="grid-2">
      <section class="section">
        <header class="section-head">
          <h2>${icon('check')} Tarefas</h2>
          <div class="head-actions">
            <a class="mini-link" href="#/orientacao${showDone ? '' : '?feitas=1'}">${showDone ? 'Ocultar concluídas' : 'Mostrar concluídas'}</a>
            <button class="btn btn-soft" data-action="add" data-col="tasks">${icon('plus')} Tarefa</button>
          </div>
        </header>
        ${
          tasks.length
            ? `<ul class="rows">${tasks
                .map(
                  (x) => `<li class="row task ${x.done ? 'is-done' : ''}">
              <button class="checkbox ${x.done ? 'checked' : ''}" data-action="toggle-task" data-id="${x.id}" aria-label="${x.done ? 'Reabrir' : 'Concluir'}">${x.done ? icon('check') : ''}</button>
              <div class="row-main"><strong>${esc(x.title)}</strong>
              <small class="muted">${[expName[x.experimentId], x.origin].filter(Boolean).map(esc).join(' · ')}</small></div>
              ${x.due ? badge(x.due, x.done) : ''}
              ${rowActions('tasks', x.id)}</li>`
                )
                .join('')}</ul>`
            : emptyState('Nenhuma tarefa aberta. 🎉', 'add-tasks', 'Nova tarefa')
        }
      </section>

      <section class="section">
        <header class="section-head"><h2>${icon('users')} Reuniões</h2></header>
        ${upcoming.length ? `<h3 class="sub">Próximas</h3>${upcoming.map(meetingCard).join('')}` : ''}
        ${past.length ? `<h3 class="sub">Histórico</h3>${past.map(meetingCard).join('')}` : ''}
        ${!s.meetings.length ? emptyState('Registre cada reunião: o que foi decidido vira histórico e as tarefas entram na sua lista.', 'add-meetings', 'Registrar reunião') : ''}
      </section>
    </div>
  </div>`;
}

function meetingCard(m) {
  return `<article class="card meeting">
    <div class="meeting-top">
      <div class="date-chip"><b>${fmtDate(m.date, { day: '2-digit' })}</b><span>${fmtDate(m.date, { month: 'short' })}</span></div>
      <div class="row-main"><strong>${esc(m.with || 'Reunião de orientação')}</strong><small class="muted">${fmtDate(m.date)} · ${badge(m.date)}</small></div>
      ${rowActions('meetings', m.id)}
    </div>
    ${m.agenda ? `<div class="meeting-block"><h4>Pauta</h4><p class="pre">${esc(m.agenda)}</p></div>` : ''}
    ${m.decisions ? `<div class="meeting-block"><h4>Decisões</h4><p class="pre">${esc(m.decisions)}</p></div>` : ''}
  </article>`;
}
