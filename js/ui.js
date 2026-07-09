// Componenti UI riusabili: modali, toast, picker esercizi

import { esc } from './utils.js';
import * as store from './store.js';
import { GROUPS } from './seed.js';

export function openModal(html) {
  const bd = document.createElement('div');
  bd.className = 'modal-backdrop';
  bd.innerHTML = `<div class="modal">${html}</div>`;
  const close = () => bd.remove();
  bd.addEventListener('click', e => { if (e.target === bd) close(); });
  bd.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  document.body.appendChild(bd);
  return { el: bd, close };
}

export function confirmDlg(title, msg, { ok = 'Conferma', danger = false } = {}) {
  return new Promise(resolve => {
    const m = openModal(`
      <h3>${esc(title)}</h3>
      ${msg ? `<p class="muted small">${esc(msg)}</p>` : ''}
      <div class="modal-actions">
        <button class="btn ghost" data-close>Annulla</button>
        <button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(ok)}</button>
      </div>`);
    m.el.querySelector('[data-ok]').addEventListener('click', () => { m.close(); resolve(true); });
    m.el.querySelector('[data-close]').addEventListener('click', () => resolve(false));
    m.el.addEventListener('click', e => { if (e.target === m.el) resolve(false); });
  });
}

export function toast(msg, ms = 2600) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 300);
  }, ms);
}

export function pickExercise(onPick) {
  let group = 'Tutti', q = '';
  const m = openModal(`
    <h3>Scegli esercizio</h3>
    <input type="search" class="input" id="pk-q" placeholder="Cerca…" autocomplete="off">
    <div class="chips" id="pk-groups"></div>
    <div class="pick-list" id="pk-list"></div>
    <div class="pick-new">
      <button class="btn ghost small" id="pk-new-btn">+ Crea nuovo esercizio</button>
      <div id="pk-new-form" hidden>
        <input class="input" id="pk-new-name" placeholder="Nome esercizio">
        <select class="input" id="pk-new-group">${GROUPS.map(g => `<option>${g}</option>`).join('')}</select>
        <button class="btn primary" id="pk-new-save">Crea e aggiungi</button>
      </div>
    </div>`);

  const list = m.el.querySelector('#pk-list');
  const chips = m.el.querySelector('#pk-groups');

  function renderChips() {
    chips.innerHTML = ['Tutti', ...GROUPS].map(g =>
      `<button class="chip ${g === group ? 'on' : ''}" data-g="${g}">${g}</button>`).join('');
    chips.querySelectorAll('[data-g]').forEach(b =>
      b.addEventListener('click', () => { group = b.dataset.g; renderChips(); renderList(); }));
  }

  function renderList() {
    const exs = store.state.exercises
      .filter(e => (group === 'Tutti' || e.group === group) && e.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
    list.innerHTML = exs.length
      ? exs.map(e => `<button class="pick-item" data-id="${e.id}"><span>${esc(e.name)}</span><span class="tag">${esc(e.group)}</span></button>`).join('')
      : '<div class="empty">Nessun esercizio trovato</div>';
    list.querySelectorAll('[data-id]').forEach(b =>
      b.addEventListener('click', () => { m.close(); onPick(b.dataset.id); }));
  }

  m.el.querySelector('#pk-q').addEventListener('input', e => { q = e.target.value; renderList(); });
  m.el.querySelector('#pk-new-btn').addEventListener('click', () => {
    const f = m.el.querySelector('#pk-new-form');
    f.hidden = false;
    f.querySelector('#pk-new-name').focus();
  });
  m.el.querySelector('#pk-new-save').addEventListener('click', () => {
    const name = m.el.querySelector('#pk-new-name').value.trim();
    if (!name) return;
    const exercise = store.addExercise(name, m.el.querySelector('#pk-new-group').value);
    m.close();
    onPick(exercise.id);
  });

  renderChips();
  renderList();
}
