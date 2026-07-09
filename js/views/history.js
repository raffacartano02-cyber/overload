// Vista Storico: calendario e dettaglio sessioni

import * as store from '../store.js';
import { App } from '../router.js';
import { esc, num, fmtNum, fmtDate, fmtTime, setVolume, dayKey } from '../utils.js';
import { confirmDlg } from '../ui.js';

const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

let cal = null;      // {y, m} mese visualizzato
let selDay = null;   // 'YYYY-MM-DD' filtro giorno
let openId = null;   // sessione espansa

export function render(el) {
  if (!cal) {
    const n = new Date();
    cal = { y: n.getFullYear(), m: n.getMonth() };
  }
  const sessions = [...store.state.sessions].reverse();
  const byDay = new Set(store.state.sessions.map(s => dayKey(s.date)));
  const shown = selDay ? sessions.filter(s => dayKey(s.date) === selDay) : sessions;

  el.innerHTML = `
    <h1>Storico</h1>
    <div class="card">${calendarHtml(byDay)}</div>
    ${selDay ? `<div class="filterline"><span>Filtro: ${fmtDate(selDay)}</span><button class="btn ghost small" id="h-clear">Mostra tutti</button></div>` : ''}
    ${shown.length
      ? shown.map(sessionCard).join('')
      : `<div class="card empty">Nessun allenamento registrato${selDay ? ' in questo giorno' : ''}.</div>`}`;

  bind(el);
}

function calendarHtml(byDay) {
  const first = new Date(cal.y, cal.m, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(cal.y, cal.m + 1, 0).getDate();
  const today = dayKey(new Date());

  let cells = '';
  for (let i = 0; i < startOffset; i++) cells += '<div></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${cal.y}-${String(cal.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const has = byDay.has(key);
    cells += `<div class="cal-day${has ? ' has' : ''}${key === selDay ? ' sel' : ''}${key === today ? ' today' : ''}"${has ? ` data-day="${key}"` : ''}>${d}</div>`;
  }

  return `
    <div class="cal-head">
      <button class="icon-btn" id="cal-prev">‹</button>
      <b>${MONTHS[cal.m]} ${cal.y}</b>
      <button class="icon-btn" id="cal-next">›</button>
    </div>
    <div class="cal-grid cal-week">${['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(d => `<div class="muted">${d}</div>`).join('')}</div>
    <div class="cal-grid">${cells}</div>`;
}

function fmtFullSet(st) {
  const tag = st.type && st.type !== 'N' ? `<span class="settag t-${st.type}">${st.type}</span>` : '';
  return `${tag}${fmtNum(num(st.weight))}×${num(st.reps)}${st.rpe ? ' @' + st.rpe : ''}${st.rest ? ` <span class="muted">(${esc(st.rest)})</span>` : ''}`;
}

function sessionCard(s) {
  const sets = s.entries.reduce((t, en) => t + en.sets.length, 0);
  const vol = s.entries.reduce((t, en) => t + setVolume(en.sets), 0);
  const mins = s.endedAt ? Math.round((new Date(s.endedAt) - new Date(s.date)) / 60000) : null;
  const open = openId === s.id;
  return `
  <div class="card session" data-sess="${s.id}">
    <div class="session-head" data-act="toggle">
      <div>
        <div class="card-title">${esc(s.name)}</div>
        <div class="muted small">${fmtDate(s.date)} · ${fmtTime(s.date)}</div>
      </div>
      <div class="session-meta small muted">${s.entries.length} es · ${sets} serie · ${fmtNum(vol, 0)} kg${mins != null ? ` · ${mins} min` : ''}</div>
    </div>
    ${open ? `
    <div class="session-detail">
      ${s.entries.map(en => `
      <div class="sd-ex">
        <b>${esc(store.exById(en.exerciseId).name)}</b>
        <div class="small">${en.sets.map(fmtFullSet).join(' · ')}</div>
        ${en.note ? `<div class="muted small note">📝 ${esc(en.note)}</div>` : ''}
      </div>`).join('')}
      <button class="btn danger ghost small" data-act="del">Elimina sessione</button>
    </div>` : ''}
  </div>`;
}

function bind(el) {
  el.querySelector('#cal-prev').addEventListener('click', () => {
    cal.m--;
    if (cal.m < 0) { cal.m = 11; cal.y--; }
    App.renderView();
  });
  el.querySelector('#cal-next').addEventListener('click', () => {
    cal.m++;
    if (cal.m > 11) { cal.m = 0; cal.y++; }
    App.renderView();
  });
  el.querySelectorAll('[data-day]').forEach(d => d.addEventListener('click', () => {
    selDay = selDay === d.dataset.day ? null : d.dataset.day;
    App.renderView();
  }));
  const clear = el.querySelector('#h-clear');
  if (clear) clear.addEventListener('click', () => { selDay = null; App.renderView(); });

  el.querySelectorAll('[data-sess]').forEach(card => {
    const id = card.dataset.sess;
    card.querySelector('[data-act="toggle"]').addEventListener('click', () => {
      openId = openId === id ? null : id;
      App.renderView();
    });
    const del = card.querySelector('[data-act="del"]');
    if (del) del.addEventListener('click', async () => {
      if (await confirmDlg('Eliminare questa sessione?', "L'operazione non si può annullare.", { ok: 'Elimina', danger: true })) {
        store.deleteSession(id);
        openId = null;
        App.renderView();
      }
    });
  });
}
