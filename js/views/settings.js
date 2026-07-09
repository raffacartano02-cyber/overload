// Vista Altro: backup, esercizi personalizzati, gestione dati

import * as store from '../store.js';
import { App } from '../router.js';
import { esc, dayKey } from '../utils.js';
import { confirmDlg, toast } from '../ui.js';
import { GROUPS } from '../seed.js';

export function render(el) {
  const custom = store.state.exercises.filter(e => e.custom);
  el.innerHTML = `
    <h1>Altro</h1>

    <div class="card">
      <h2>Backup dati</h2>
      <p class="muted small">I dati vivono solo su questo dispositivo. Esporta un backup di tanto in tanto per non rischiare di perderli (es. se cancelli i dati del browser).</p>
      <div class="row-btns">
        <button class="btn primary" id="s-export">Esporta backup</button>
        <button class="btn ghost" id="s-import">Importa backup</button>
        <input type="file" id="s-file" accept=".json,application/json" hidden>
      </div>
    </div>

    <div class="card">
      <h2>Esercizi personalizzati</h2>
      ${custom.length
        ? custom.map(e => `<div class="row small-row"><span>${esc(e.name)} <span class="tag">${esc(e.group)}</span></span><button class="icon-btn" data-delex="${e.id}" title="Elimina">✕</button></div>`).join('')
        : `<p class="muted small">Nessun esercizio personalizzato. Puoi crearli qui o direttamente durante l'allenamento.</p>`}
      <div class="add-ex-form">
        <input class="input" id="s-ex-name" placeholder="Nome nuovo esercizio">
        <select class="input" id="s-ex-group">${GROUPS.map(g => `<option>${g}</option>`).join('')}</select>
        <button class="btn ghost" id="s-ex-add">Aggiungi esercizio</button>
      </div>
    </div>

    <div class="card">
      <h2>Zona pericolosa</h2>
      <button class="btn danger ghost" id="s-wipe">Cancella tutti i dati</button>
    </div>

    <div class="muted small center">
      Overload v1.0 · ${store.state.sessions.length} allenamenti registrati<br>
      Fatto su misura · dati 100% locali
    </div>`;

  el.querySelector('#s-export').addEventListener('click', exportData);
  el.querySelector('#s-import').addEventListener('click', () => el.querySelector('#s-file').click());
  el.querySelector('#s-file').addEventListener('change', importData);

  el.querySelectorAll('[data-delex]').forEach(b => b.addEventListener('click', async () => {
    const id = b.dataset.delex;
    if (store.exerciseUsed(id)) {
      toast('Esercizio usato in schede o allenamenti: non si può eliminare.');
      return;
    }
    if (await confirmDlg('Eliminare questo esercizio?', '', { ok: 'Elimina', danger: true })) {
      store.deleteExercise(id);
      App.renderView();
    }
  }));

  el.querySelector('#s-ex-add').addEventListener('click', () => {
    const name = el.querySelector('#s-ex-name').value.trim();
    if (!name) { toast('Scrivi il nome del nuovo esercizio'); return; }
    store.addExercise(name, el.querySelector('#s-ex-group').value);
    App.renderView();
    toast('Esercizio aggiunto');
  });

  el.querySelector('#s-wipe').addEventListener('click', async () => {
    if (!(await confirmDlg('Cancellare TUTTI i dati?', 'Allenamenti, schede ed esercizi personalizzati verranno eliminati per sempre.', { ok: 'Continua', danger: true }))) return;
    if (!(await confirmDlg('Sei davvero sicuro?', 'Ultima possibilità: senza un backup non potrai recuperare nulla.', { ok: 'Cancella tutto', danger: true }))) return;
    localStorage.removeItem('overload_v1');
    location.reload();
  });
}

function exportData() {
  const blob = new Blob([JSON.stringify(store.state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `overload-backup-${dayKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Backup esportato');
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.exercises) || !Array.isArray(data.sessions)) throw new Error('formato non riconosciuto');
    const ok = await confirmDlg(
      'Importare il backup?',
      `Il backup contiene ${data.sessions.length} allenamenti e sostituirà TUTTI i dati attuali.`,
      { ok: 'Importa', danger: true });
    if (ok) {
      store.replaceData(data);
      location.reload();
    }
  } catch (err) {
    toast('File non valido: ' + err.message);
  }
  e.target.value = '';
}
