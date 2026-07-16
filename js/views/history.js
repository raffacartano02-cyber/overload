// Vista Storico: calendario, dettaglio sessioni e modifica a posteriori

import * as store from '../store.js';
import { App } from '../router.js';
import { esc, num, fmtNum, fmtDate, fmtTime, setVolume, dayKey, hasData, uid } from '../utils.js';
import { confirmDlg, toast, pickExercise } from '../ui.js';

const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

let cal = null;      // {y, m} mese visualizzato
let selDay = null;   // 'YYYY-MM-DD' filtro giorno
let openId = null;   // sessione espansa
let draft = null;    // copia di lavoro della sessione in modifica (null = nessuna)

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
  const editing = draft && draft.id === s.id;
  return `
  <div class="card session" data-sess="${s.id}">
    <div class="session-head" data-act="toggle">
      <div>
        <div class="card-title">${esc(s.name)}</div>
        <div class="muted small">${fmtDate(s.date)} · ${fmtTime(s.date)}</div>
      </div>
      <div class="session-meta small muted">${s.entries.length} es · ${sets} serie · ${fmtNum(vol, 0)} kg${mins != null ? ` · ${mins} min` : ''}</div>
    </div>
    ${open ? (editing ? editorHtml() : `
    <div class="session-detail">
      ${s.entries.map(en => `
      <div class="sd-ex">
        <b>${esc(store.exById(en.exerciseId).name)}</b>
        <div class="small">${en.sets.map(fmtFullSet).join(' · ')}</div>
        ${en.note ? `<div class="muted small note">📝 ${esc(en.note)}</div>` : ''}
      </div>`).join('')}
      <div class="row-btns">
        <button class="btn small" data-act="edit">✏️ Modifica</button>
        <button class="btn danger ghost small" data-act="del">Elimina sessione</button>
      </div>
    </div>`) : ''}
  </div>`;
}

/* ===== Editor sessione ===== */

// Prepara la copia di lavoro: i campi _date/_time/_mins sono solo del draft
// e vengono ricombinati in date/endedAt al salvataggio.
function makeDraft(s) {
  const d = JSON.parse(JSON.stringify(s));
  const start = new Date(s.date);
  d._date = dayKey(start);
  d._time = String(start.getHours()).padStart(2, '0') + ':' + String(start.getMinutes()).padStart(2, '0');
  d._mins = s.endedAt ? String(Math.max(1, Math.round((new Date(s.endedAt) - start) / 60000))) : '';
  return d;
}

function editorHtml() {
  return `
  <div class="session-detail session-edit">
    <label>Nome allenamento</label>
    <input class="input" data-ed="name" value="${esc(draft.name)}">
    <div class="tpl-grid">
      <label>Data<input class="input" type="date" data-ed="_date" value="${esc(draft._date)}"></label>
      <label>Inizio<input class="input" type="time" data-ed="_time" value="${esc(draft._time)}"></label>
      <label>Durata (min)<input class="input" type="number" inputmode="numeric" min="1" step="1" data-ed="_mins" value="${esc(draft._mins)}"></label>
    </div>
    <div class="hint">Tocca il numero della serie per marcarla: <b>W</b> riscaldamento · <b>D</b> drop set · <b>S</b> superset · <b>F</b> cedimento</div>
    ${draft.entries.map(en => `
    <div class="ed-entry" data-eid="${en.id}">
      <div class="entry-head">
        <div class="card-title">${esc(store.exById(en.exerciseId).name)}</div>
        <button class="icon-btn" data-act="ed-rm-ex" title="Rimuovi esercizio">✕</button>
      </div>
      <div class="set-grid set-head muted small"><span>#</span><span>Kg</span><span>Rep</span><span>RPE</span><span>Rec</span><span></span></div>
      ${en.sets.map((s, i) => edSetRow(s, i)).join('')}
      <button class="btn ghost small" data-act="ed-add-set">+ Aggiungi serie</button>
      <input class="input note-input" data-act="ed-note" placeholder="Note esercizio…" value="${esc(en.note || '')}">
    </div>`).join('')}
    <button class="btn ghost big" data-act="ed-add-ex">+ Aggiungi esercizio</button>
    <div class="wk-actions">
      <button class="btn ghost" data-act="ed-cancel">Annulla</button>
      <button class="btn primary" data-act="ed-save">Salva modifiche</button>
    </div>
  </div>`;
}

function edSetRow(s, i) {
  return `
  <div class="set-grid" data-sid="${s.id}">
    <button class="set-type t-${s.type}" data-act="ed-type" title="Cambia tipo serie">${s.type === 'N' ? i + 1 : s.type}</button>
    <input class="input" type="number" inputmode="decimal" step="0.5" min="0" data-f="weight" value="${esc(s.weight)}">
    <input class="input" type="number" inputmode="numeric" step="1" min="0" data-f="reps" value="${esc(s.reps)}">
    <select class="input" data-f="rpe">${store.RPE_VALUES.map(r => `<option value="${r}"${String(s.rpe) === r ? ' selected' : ''}>${r || '–'}</option>`).join('')}</select>
    <input class="input" type="text" data-f="rest" value="${esc(s.rest)}" placeholder="2:30">
    <button class="icon-btn" data-act="ed-rm-set" title="Elimina serie">✕</button>
  </div>`;
}

function saveDraft() {
  const entries = draft.entries
    .map(en => ({ ...en, sets: en.sets.filter(hasData) }))
    .filter(en => en.sets.length);
  if (!entries.length) {
    toast('La sessione non può restare vuota: lascia almeno una serie o eliminala.');
    return;
  }
  const [y, mo, dd] = String(draft._date).split('-').map(Number);
  const [hh, mi] = String(draft._time || '00:00').split(':').map(Number);
  let start = new Date(y, (mo || 1) - 1, dd || 1, hh || 0, mi || 0);
  if (isNaN(start.getTime())) start = new Date(draft.date); // data non valida: tieni l'originale
  const mins = num(draft._mins);
  store.updateSession({
    id: draft.id,
    date: start.toISOString(),
    endedAt: mins > 0 ? new Date(start.getTime() + Math.round(mins) * 60000).toISOString() : null,
    name: (draft.name || '').trim() || 'Allenamento',
    templateId: draft.templateId ?? null,
    entries
  });
  openId = draft.id;
  draft = null;
  toast('Sessione aggiornata ✔');
  App.renderView();
}

/* ===== Bind ===== */

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
      if (draft && draft.id === id) return; // in modifica: il collasso è disabilitato
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
    const edit = card.querySelector('[data-act="edit"]');
    if (edit) edit.addEventListener('click', () => {
      draft = makeDraft(store.state.sessions.find(s => s.id === id));
      App.renderView();
    });
    if (draft && draft.id === id) bindEditor(card);
  });
}

function bindEditor(card) {
  // Campi testata: aggiornano il draft senza rirender (per non perdere il focus)
  card.querySelectorAll('[data-ed]').forEach(inp =>
    inp.addEventListener('input', () => { draft[inp.dataset.ed] = inp.value; }));

  card.querySelector('[data-act="ed-cancel"]').addEventListener('click', () => {
    draft = null;
    App.renderView();
  });
  card.querySelector('[data-act="ed-save"]').addEventListener('click', saveDraft);
  card.querySelector('[data-act="ed-add-ex"]').addEventListener('click', () =>
    pickExercise(exId => {
      draft.entries.push({ id: uid(), exerciseId: exId, note: '', target: '', targetReps: '', sets: [store.newSet(), store.newSet(), store.newSet()] });
      App.renderView();
    }));

  card.querySelectorAll('.ed-entry').forEach(exEl => {
    const en = draft.entries.find(x => x.id === exEl.dataset.eid);
    if (!en) return;
    exEl.querySelector('[data-act="ed-rm-ex"]').addEventListener('click', async () => {
      if (await confirmDlg(`Rimuovere ${store.exById(en.exerciseId).name}?`, '', { ok: 'Rimuovi', danger: true })) {
        draft.entries = draft.entries.filter(x => x.id !== en.id);
        App.renderView();
      }
    });
    exEl.querySelector('[data-act="ed-add-set"]').addEventListener('click', () => {
      const prev = en.sets[en.sets.length - 1];
      en.sets.push({ ...store.newSet(), weight: prev ? prev.weight : '', reps: prev ? prev.reps : '', rest: prev ? prev.rest : '' });
      App.renderView();
    });
    exEl.querySelector('[data-act="ed-note"]').addEventListener('input', e => { en.note = e.target.value; });

    exEl.querySelectorAll('[data-sid]').forEach(rowEl => {
      const set = en.sets.find(s => s.id === rowEl.dataset.sid);
      if (!set) return;
      rowEl.querySelector('[data-act="ed-type"]').addEventListener('click', () => {
        set.type = store.SET_TYPES[(store.SET_TYPES.indexOf(set.type) + 1) % store.SET_TYPES.length];
        App.renderView();
      });
      rowEl.querySelector('[data-act="ed-rm-set"]').addEventListener('click', () => {
        en.sets = en.sets.filter(s => s.id !== set.id);
        App.renderView();
      });
      rowEl.querySelectorAll('[data-f]').forEach(inp =>
        inp.addEventListener('input', () => { set[inp.dataset.f] = inp.value; }));
    });
  });
}
