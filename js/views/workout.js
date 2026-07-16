// Vista Allenamento: avvio sessione e registrazione serie

import * as store from '../store.js';
import { App } from '../router.js';
import { esc, num, fmtNum, fmtTime, fmtDateShort, setVolume } from '../utils.js';
import { openModal, confirmDlg, toast, pickExercise } from '../ui.js';

const RPE = store.RPE_VALUES;
const TYPES = store.SET_TYPES;
let timer = null;

export function render(el) {
  if (timer) { clearInterval(timer); timer = null; }
  if (!store.state.active) renderStart(el);
  else renderActive(el);
}

/* ===== Schermata di avvio ===== */

function renderStart(el) {
  const tpls = store.state.templates;
  el.innerHTML = `
    <h1>Allenamento</h1>
    <button class="btn primary big" id="w-free">Inizia allenamento libero</button>
    <h2>Dalle tue schede</h2>
    ${tpls.length ? tpls.map(t => `
      <div class="card row">
        <div>
          <div class="card-title">${esc(t.name)}</div>
          <div class="muted small">${t.items.length} esercizi</div>
        </div>
        <button class="btn primary" data-start="${t.id}">Inizia</button>
      </div>`).join('')
    : '<div class="card empty">Non hai ancora schede.<br>Creale nella sezione "Schede" per avere gli esercizi già pronti.</div>'}`;

  el.querySelector('#w-free').addEventListener('click', () => {
    store.startSession(null);
    App.renderView();
  });
  el.querySelectorAll('[data-start]').forEach(b => b.addEventListener('click', () => {
    store.startSession(store.state.templates.find(t => t.id === b.dataset.start));
    App.renderView();
  }));
}

/* ===== Sessione attiva ===== */

function renderActive(el) {
  const a = store.state.active;
  el.innerHTML = `
    <div class="wk-head">
      <input class="input title-input" id="w-name" value="${esc(a.name)}">
      <div class="muted small">Iniziato alle ${fmtTime(a.startedAt)} · <span id="w-elapsed"></span></div>
    </div>
    <div class="hint">Tocca il numero della serie per marcarla: <b>W</b> riscaldamento · <b>D</b> drop set · <b>S</b> superset · <b>F</b> cedimento</div>
    <div id="w-entries">${a.entries.map(entryCard).join('')}</div>
    <button class="btn ghost big" id="w-add-ex">+ Aggiungi esercizio</button>
    <div class="wk-actions">
      <button class="btn danger ghost" id="w-cancel">Annulla</button>
      <button class="btn primary" id="w-finish">Termina allenamento</button>
    </div>`;

  const tick = () => {
    const elt = document.getElementById('w-elapsed');
    if (!elt) { clearInterval(timer); timer = null; return; } // vista cambiata: ferma il timer
    const m = Math.floor((Date.now() - new Date(a.startedAt).getTime()) / 60000);
    elt.textContent = m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
  };
  tick();
  timer = setInterval(tick, 30000);

  bindActive(el, a);
}

function fmtSet(s) {
  return `${fmtNum(num(s.weight))}×${num(s.reps)}${s.rpe ? ' @' + s.rpe : ''}`;
}

function entryCard(en) {
  const exercise = store.exById(en.exerciseId);
  const last = store.lastPerformance(en.exerciseId);
  const lastSets = last ? last.sets.filter(s => num(s.reps) || num(s.weight)) : [];
  const lastLine = last
    ? `Ultima volta ${fmtDateShort(last.date)}: ${lastSets.map(fmtSet).join(' · ')}`
    : 'Prima volta con questo esercizio';
  return `
  <div class="card entry" data-eid="${en.id}">
    <div class="entry-head">
      <div>
        <div class="card-title">${esc(exercise.name)}</div>
        <div class="muted small">${esc(exercise.group)}${en.target ? ` · obiettivo ${esc(en.target)}` : ''}</div>
      </div>
      <button class="icon-btn" data-act="rm-ex" title="Rimuovi esercizio">✕</button>
    </div>
    <div class="lastperf">${lastLine}</div>
    <div class="set-grid set-head muted small"><span>#</span><span>Kg</span><span>Rep</span><span>RPE</span><span>Rec</span><span></span></div>
    ${en.sets.map((s, i) => setRow(en, s, i, lastSets)).join('')}
    <button class="btn ghost small" data-act="add-set">+ Aggiungi serie</button>
    <input class="input note-input" data-act="note" placeholder="Note esercizio…" value="${esc(en.note || '')}">
  </div>`;
}

function setRow(en, s, i, lastSets) {
  const ph = lastSets[i] || {};
  return `
  <div class="set-grid" data-sid="${s.id}">
    <button class="set-type t-${s.type}" data-act="type" title="Cambia tipo serie">${s.type === 'N' ? i + 1 : s.type}</button>
    <input class="input" type="number" inputmode="decimal" step="0.5" min="0" data-f="weight" value="${esc(s.weight)}" placeholder="${esc(ph.weight ?? '')}">
    <input class="input" type="number" inputmode="numeric" step="1" min="0" data-f="reps" value="${esc(s.reps)}" placeholder="${esc(ph.reps ?? (en.targetReps || ''))}">
    <select class="input" data-f="rpe">${RPE.map(r => `<option value="${r}"${String(s.rpe) === r ? ' selected' : ''}>${r || '–'}</option>`).join('')}</select>
    <input class="input" type="text" data-f="rest" value="${esc(s.rest)}" placeholder="2:30">
    <button class="icon-btn" data-act="rm-set" title="Elimina serie">✕</button>
  </div>`;
}

function bindActive(el, a) {
  el.querySelector('#w-name').addEventListener('input', e => { a.name = e.target.value; store.save(); });
  el.querySelector('#w-add-ex').addEventListener('click', () =>
    pickExercise(id => { store.addEntry(id); App.renderView(); }));
  el.querySelector('#w-cancel').addEventListener('click', async () => {
    if (await confirmDlg("Annullare l'allenamento?", 'Le serie inserite andranno perse.', { ok: 'Annulla allenamento', danger: true })) {
      store.cancelSession();
      App.renderView();
    }
  });
  el.querySelector('#w-finish').addEventListener('click', onFinish);

  el.querySelectorAll('.entry').forEach(card => {
    const en = a.entries.find(x => x.id === card.dataset.eid);
    if (!en) return;
    card.querySelector('[data-act="rm-ex"]').addEventListener('click', async () => {
      if (await confirmDlg(`Rimuovere ${store.exById(en.exerciseId).name}?`, '', { ok: 'Rimuovi', danger: true })) {
        store.removeEntry(en.id);
        App.renderView();
      }
    });
    card.querySelector('[data-act="add-set"]').addEventListener('click', () => {
      store.addSet(en.id);
      App.renderView();
    });
    card.querySelector('[data-act="note"]').addEventListener('input', e => { en.note = e.target.value; store.save(); });

    card.querySelectorAll('[data-sid]').forEach(rowEl => {
      const set = en.sets.find(s => s.id === rowEl.dataset.sid);
      if (!set) return;
      rowEl.querySelector('[data-act="type"]').addEventListener('click', () => {
        set.type = TYPES[(TYPES.indexOf(set.type) + 1) % TYPES.length];
        store.save();
        App.renderView();
      });
      rowEl.querySelector('[data-act="rm-set"]').addEventListener('click', () => {
        store.removeSet(en.id, set.id);
        App.renderView();
      });
      rowEl.querySelectorAll('[data-f]').forEach(inp =>
        inp.addEventListener('input', () => { set[inp.dataset.f] = inp.value; store.save(); }));
    });
  });
}

function onFinish() {
  const a = store.state.active;
  const valid = a.entries.some(en => en.sets.some(s => String(s.weight).trim() || String(s.reps).trim()));
  if (!valid) {
    toast('Nessuna serie compilata: inserisci almeno una serie o annulla.');
    return;
  }
  // Durata precompilata ma correggibile: se la sessione è rimasta aperta
  // (telefono in tasca, "Termina" dimenticato) i minuti reali si sistemano qui.
  const computed = Math.max(1, Math.round((Date.now() - new Date(a.startedAt).getTime()) / 60000));
  const m = openModal(`
    <h3>Terminare l'allenamento?</h3>
    <p class="muted small">La sessione verrà salvata nello storico.</p>
    <label for="fin-mins">Durata (minuti)</label>
    <input class="input" id="fin-mins" type="number" inputmode="numeric" min="1" step="1" value="${computed}">
    ${computed > 240 ? '<p class="warnline">⚠️ Sembra tanta: se hai lasciato la sessione aperta, correggi la durata prima di salvare.</p>' : ''}
    <div class="modal-actions">
      <button class="btn ghost" data-close>Annulla</button>
      <button class="btn primary" data-ok>Termina e salva</button>
    </div>`);
  m.el.querySelector('[data-ok]').addEventListener('click', () => {
    const mins = num(m.el.querySelector('#fin-mins').value);
    m.close();
    const res = store.finishSession(mins > 0 ? mins : null);
    App.renderView();
    if (res && res.session) showSummary(res);
  });
}

function showSummary({ session, prs }) {
  const sets = session.entries.reduce((t, en) => t + en.sets.length, 0);
  const vol = session.entries.reduce((t, en) => t + setVolume(en.sets), 0);
  const mins = Math.round((new Date(session.endedAt) - new Date(session.date)) / 60000);
  openModal(`
    <h3>💪 Allenamento salvato</h3>
    <div class="summary-stats">
      <div><b>${session.entries.length}</b><span>esercizi</span></div>
      <div><b>${sets}</b><span>serie</span></div>
      <div><b>${fmtNum(vol, 0)}</b><span>kg totali</span></div>
      <div><b>${mins}</b><span>minuti</span></div>
    </div>
    ${prs.length ? `<h4>🏆 Record personali</h4><ul class="pr-list">${prs.map(p => `<li><b>${esc(p.name)}</b>: ${esc(p.text)}</li>`).join('')}</ul>` : ''}
    <div class="modal-actions"><button class="btn primary" data-close>Ottimo!</button></div>`);
}
