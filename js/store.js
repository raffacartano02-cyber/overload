// Stato dell'applicazione e persistenza su localStorage

import { SEED } from './seed.js';
import { uid, num, e1rm, isWork, hasData, fmtNum } from './utils.js';

const KEY = 'overload_v1';

function fresh() {
  return {
    version: 1,
    exercises: SEED.map(e => ({ ...e })),
    templates: [],
    sessions: [],
    active: null,
    settings: {}
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw);
      if (d && Array.isArray(d.exercises) && Array.isArray(d.sessions)) {
        d.templates = Array.isArray(d.templates) ? d.templates : [];
        d.sessions.sort((a, b) => String(a.date).localeCompare(String(b.date)));
        return { ...fresh(), ...d };
      }
    }
  } catch (err) {
    console.error('Errore caricamento dati', err);
  }
  return fresh();
}

export const state = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Errore salvataggio dati', err);
  }
}

export function replaceData(d) {
  state.exercises = d.exercises;
  state.templates = Array.isArray(d.templates) ? d.templates : [];
  state.sessions = d.sessions;
  state.sessions.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  state.active = d.active || null;
  state.settings = d.settings || {};
  save();
}

/* ===== Esercizi ===== */

export function exById(id) {
  return state.exercises.find(e => e.id === id) || { id, name: 'Esercizio rimosso', group: 'Altro' };
}

export function addExercise(name, group) {
  const exercise = { id: uid(), name: String(name).trim(), group: group || 'Altro', custom: true };
  state.exercises.push(exercise);
  save();
  return exercise;
}

export function exerciseUsed(id) {
  return state.sessions.some(s => s.entries.some(en => en.exerciseId === id))
    || state.templates.some(t => t.items.some(i => i.exerciseId === id))
    || !!(state.active && state.active.entries.some(en => en.exerciseId === id));
}

export function deleteExercise(id) {
  state.exercises = state.exercises.filter(e => e.id !== id);
  save();
}

/* ===== Schede ===== */

export function saveTemplate(tpl) {
  const i = state.templates.findIndex(t => t.id === tpl.id);
  if (i >= 0) state.templates[i] = tpl;
  else state.templates.push(tpl);
  save();
}

export function deleteTemplate(id) {
  state.templates = state.templates.filter(t => t.id !== id);
  save();
}

/* ===== Sessione attiva ===== */

export const newSet = () => ({ id: uid(), type: 'N', weight: '', reps: '', rpe: '', rest: '' });

export function startSession(tpl) {
  if (state.active) return;
  const entries = tpl
    ? tpl.items.map(it => ({
        id: uid(),
        exerciseId: it.exerciseId,
        note: it.note || '',
        target: ([it.sets, it.reps].filter(Boolean).join('×') + (it.rpe ? ' @' + it.rpe : '')).trim(),
        targetReps: it.reps || '',
        targetRpe: it.rpe || '',
        sets: Array.from({ length: Math.max(1, parseInt(it.sets, 10) || 3) }, () => newSet())
      }))
    : [];
  state.active = {
    id: uid(),
    startedAt: new Date().toISOString(),
    name: tpl ? tpl.name : 'Allenamento libero',
    templateId: tpl ? tpl.id : null,
    entries
  };
  save();
}

export function addEntry(exerciseId) {
  state.active.entries.push({
    id: uid(), exerciseId, note: '', target: '', targetReps: '',
    sets: [newSet(), newSet(), newSet()]
  });
  save();
}

export function removeEntry(id) {
  state.active.entries = state.active.entries.filter(e => e.id !== id);
  save();
}

export function addSet(entryId) {
  const en = state.active.entries.find(e => e.id === entryId);
  if (!en) return;
  const prev = en.sets[en.sets.length - 1];
  // Precompila con i valori della serie precedente per velocizzare l'inserimento
  en.sets.push({ ...newSet(), weight: prev ? prev.weight : '', reps: prev ? prev.reps : '', rest: prev ? prev.rest : '' });
  save();
}

export function removeSet(entryId, setId) {
  const en = state.active.entries.find(e => e.id === entryId);
  if (!en) return;
  en.sets = en.sets.filter(s => s.id !== setId);
  save();
}

export function cancelSession() {
  state.active = null;
  save();
}

export function finishSession() {
  const a = state.active;
  if (!a) return null;
  const entries = a.entries
    .map(en => ({ ...en, sets: en.sets.filter(hasData) }))
    .filter(en => en.sets.length);
  if (!entries.length) return { empty: true };
  const prs = computePRs(entries);
  const session = {
    id: a.id,
    date: a.startedAt,
    endedAt: new Date().toISOString(),
    name: (a.name || '').trim() || 'Allenamento',
    templateId: a.templateId,
    entries
  };
  state.sessions.push(session);
  state.sessions.sort((x, y) => String(x.date).localeCompare(String(y.date)));
  state.active = null;
  save();
  return { session, prs };
}

export function deleteSession(id) {
  state.sessions = state.sessions.filter(s => s.id !== id);
  save();
}

/* ===== Analisi ===== */

// Ultima prestazione registrata per un esercizio (sessioni salvate, non quella attiva)
export function lastPerformance(exId) {
  for (let i = state.sessions.length - 1; i >= 0; i--) {
    const en = state.sessions[i].entries.find(e => e.exerciseId === exId && e.sets.length);
    if (en) return { date: state.sessions[i].date, sets: en.sets };
  }
  return null;
}

function bestsBefore(exId) {
  let weight = 0, one = 0;
  for (const s of state.sessions)
    for (const en of s.entries)
      if (en.exerciseId === exId)
        for (const st of en.sets)
          if (isWork(st)) {
            weight = Math.max(weight, num(st.weight));
            one = Math.max(one, e1rm(st.weight, st.reps));
          }
  return { weight, one };
}

function computePRs(entries) {
  const out = [];
  for (const en of entries) {
    const prev = bestsBefore(en.exerciseId);
    let w = 0, o = 0, oSet = null;
    for (const st of en.sets)
      if (isWork(st)) {
        if (num(st.weight) > w) w = num(st.weight);
        const e = e1rm(st.weight, st.reps);
        if (e > o) { o = e; oSet = st; }
      }
    if (!w) continue;
    const name = exById(en.exerciseId).name;
    if (!prev.weight) {
      out.push({ name, text: `prima registrazione: ${fmtNum(w)} kg` });
      continue;
    }
    if (w > prev.weight)
      out.push({ name, text: `peso record ${fmtNum(w)} kg (prima: ${fmtNum(prev.weight)} kg)` });
    if (o > prev.one + 0.05)
      out.push({ name, text: `nuovo e1RM ${fmtNum(o)} kg con ${fmtNum(num(oSet.weight))}×${num(oSet.reps)} (prima: ${fmtNum(prev.one)} kg)` });
  }
  return out;
}
