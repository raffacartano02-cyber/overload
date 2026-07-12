// Vista Schede: creazione e modifica delle schede di allenamento

import * as store from '../store.js';
import { App } from '../router.js';
import { esc, uid } from '../utils.js';
import { confirmDlg, toast, pickExercise } from '../ui.js';

let draft = null; // copia in modifica (null = mostra elenco)

export function render(el) {
  if (draft) renderEditor(el);
  else renderList(el);
}

function renderList(el) {
  const tpls = store.state.templates;
  el.innerHTML = `
    <div class="page-head">
      <h1>Schede</h1>
      <button class="btn primary" id="t-new">+ Nuova</button>
    </div>
    ${tpls.length ? tpls.map(t => `
      <div class="card row">
        <div>
          <div class="card-title">${esc(t.name)}</div>
          <div class="muted small">${t.items.map(i => esc(store.exById(i.exerciseId).name)).slice(0, 4).join(', ')}${t.items.length > 4 ? '…' : ''}</div>
        </div>
        <div class="row-btns">
          <button class="btn ghost small" data-edit="${t.id}">Modifica</button>
          <button class="btn primary small" data-go="${t.id}">Inizia</button>
        </div>
      </div>`).join('')
    : '<div class="card empty">Crea la tua prima scheda: dalle un nome (es. "Giorno A – Spinta") e aggiungi gli esercizi con serie e ripetizioni obiettivo.</div>'}`;

  el.querySelector('#t-new').addEventListener('click', () => {
    draft = { id: uid(), name: '', items: [] };
    App.renderView();
  });
  el.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
    draft = JSON.parse(JSON.stringify(store.state.templates.find(t => t.id === b.dataset.edit)));
    App.renderView();
  }));
  el.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => {
    if (store.state.active) {
      toast('Hai già un allenamento in corso.');
      App.navigate('workout');
      return;
    }
    store.startSession(store.state.templates.find(t => t.id === b.dataset.go));
    App.navigate('workout');
  }));
}

function renderEditor(el) {
  const isNew = !store.state.templates.some(t => t.id === draft.id);
  el.innerHTML = `
    <h1>${isNew ? 'Nuova scheda' : 'Modifica scheda'}</h1>
    <input class="input" id="t-name" placeholder="Nome scheda (es. Giorno A – Spinta)" value="${esc(draft.name)}">
    <div id="t-items">
      ${draft.items.map((it, i) => `
      <div class="card tpl-item" data-i="${i}">
        <div class="entry-head">
          <div class="card-title">${esc(store.exById(it.exerciseId).name)}</div>
          <div class="row-btns">
            <button class="icon-btn" data-act="up"${i === 0 ? ' disabled' : ''}>↑</button>
            <button class="icon-btn" data-act="down"${i === draft.items.length - 1 ? ' disabled' : ''}>↓</button>
            <button class="icon-btn" data-act="rm">✕</button>
          </div>
        </div>
        <div class="tpl-grid">
          <label>Serie <input class="input" type="number" min="1" data-f="sets" value="${esc(it.sets)}"></label>
          <label>Reps <input class="input" type="text" data-f="reps" placeholder="8-10" value="${esc(it.reps)}"></label>
          <label>RPE <input class="input" type="text" inputmode="decimal" data-f="rpe" placeholder="es. 8" value="${esc(it.rpe || '')}"></label>
        </div>
        <input class="input" type="text" data-f="note" placeholder="Nota (es. fermo 2s al petto)" value="${esc(it.note || '')}">
      </div>`).join('')}
    </div>
    <button class="btn ghost big" id="t-add">+ Aggiungi esercizio</button>
    <div class="wk-actions">
      <button class="btn ghost" id="t-back">Annulla</button>
      <button class="btn primary" id="t-save">Salva scheda</button>
    </div>
    ${!isNew ? '<button class="btn danger ghost big" id="t-del">Elimina scheda</button>' : ''}`;

  el.querySelector('#t-name').addEventListener('input', e => { draft.name = e.target.value; });

  el.querySelectorAll('.tpl-item').forEach(card => {
    const i = +card.dataset.i;
    card.querySelectorAll('[data-f]').forEach(inp =>
      inp.addEventListener('input', () => { draft.items[i][inp.dataset.f] = inp.value; }));
    card.querySelector('[data-act="up"]').addEventListener('click', () => {
      [draft.items[i - 1], draft.items[i]] = [draft.items[i], draft.items[i - 1]];
      App.renderView();
    });
    card.querySelector('[data-act="down"]').addEventListener('click', () => {
      [draft.items[i + 1], draft.items[i]] = [draft.items[i], draft.items[i + 1]];
      App.renderView();
    });
    card.querySelector('[data-act="rm"]').addEventListener('click', () => {
      draft.items.splice(i, 1);
      App.renderView();
    });
  });

  el.querySelector('#t-add').addEventListener('click', () =>
    pickExercise(id => {
      draft.items.push({ id: uid(), exerciseId: id, sets: '3', reps: '', rpe: '', note: '' });
      App.renderView();
    }));
  el.querySelector('#t-back').addEventListener('click', () => { draft = null; App.renderView(); });
  el.querySelector('#t-save').addEventListener('click', () => {
    if (!draft.name.trim()) { toast('Dai un nome alla scheda'); return; }
    if (!draft.items.length) { toast('Aggiungi almeno un esercizio'); return; }
    store.saveTemplate(draft);
    draft = null;
    App.renderView();
    toast('Scheda salvata');
  });
  const del = el.querySelector('#t-del');
  if (del) del.addEventListener('click', async () => {
    if (await confirmDlg('Eliminare la scheda?', 'Gli allenamenti già registrati restano nello storico.', { ok: 'Elimina', danger: true })) {
      store.deleteTemplate(draft.id);
      draft = null;
      App.renderView();
    }
  });
}
