// Vista Statistiche: progressioni, volume, gruppi muscolari, confronti e record

import * as store from '../store.js';
import { esc, num, fmtNum, e1rm, isWork, fmtDateShort, dayKey, monthKey, mondayOf } from '../utils.js';
import { lineChart, barChart, hbars } from '../charts.js';

let selEx = null;
let volGroup = 'Tutti';
let grpWeek = 0; // settimane indietro rispetto a quella corrente (0 = questa settimana)

export function render(el) {
  const sessions = store.state.sessions;
  if (!sessions.length) {
    el.innerHTML = '<h1>Statistiche</h1><div class="card empty">Le statistiche appariranno dopo il tuo primo allenamento salvato.</div>';
    return;
  }

  // Esercizi con almeno una serie di lavoro, ordinati per frequenza
  const counts = {};
  for (const s of sessions)
    for (const en of s.entries)
      if (en.sets.some(isWork)) counts[en.exerciseId] = (counts[en.exerciseId] || 0) + 1;
  const exIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  if (!exIds.length) {
    el.innerHTML = '<h1>Statistiche</h1><div class="card empty">Registra serie con peso e ripetizioni per vedere le statistiche.</div>';
    return;
  }
  if (!selEx || !counts[selEx]) selEx = exIds[0];

  el.innerHTML = `
    <h1>Statistiche</h1>
    ${progressionSection(sessions, exIds)}
    ${volumeSection(sessions)}
    ${groupsSection(sessions)}
    ${compareSection(sessions)}
    ${prSection(sessions, exIds)}`;

  el.querySelector('#st-ex').addEventListener('change', e => { selEx = e.target.value; render(el); });
  const g = el.querySelector('#st-group');
  if (g) g.addEventListener('change', e => { volGroup = e.target.value; render(el); });
  el.querySelector('#grp-prev').addEventListener('click', () => { grpWeek++; render(el); });
  el.querySelector('#grp-next').addEventListener('click', () => { if (grpWeek > 0) { grpWeek--; render(el); } });
}

/* ---- Progressione per esercizio ---- */

function progressionSection(sessions, exIds) {
  const pts = [];
  for (const s of sessions) {
    for (const en of s.entries) {
      if (en.exerciseId !== selEx) continue;
      let mw = 0, mo = 0;
      const rpes = [];
      for (const st of en.sets) {
        if (!isWork(st)) continue;
        mw = Math.max(mw, num(st.weight));
        mo = Math.max(mo, e1rm(st.weight, st.reps));
        if (st.rpe) rpes.push(num(st.rpe));
      }
      if (mw) pts.push({ date: s.date, mw, mo, rpe: rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null });
    }
  }
  const best = Math.max(...pts.map(p => p.mw), 0);
  const bestO = Math.max(...pts.map(p => p.mo), 0);
  const labels = pts.map(p => fmtDateShort(p.date));
  const hasRpe = pts.some(p => p.rpe != null);

  return `
  <div class="card">
    <h2>Progressione esercizio</h2>
    <select class="input" id="st-ex">${exIds.map(id =>
      `<option value="${id}"${id === selEx ? ' selected' : ''}>${esc(store.exById(id).name)}</option>`).join('')}</select>
    <div class="summary-stats">
      <div><b>${fmtNum(best)}</b><span>kg max</span></div>
      <div><b>${fmtNum(bestO)}</b><span>e1RM kg</span></div>
      <div><b>${pts.length}</b><span>sessioni</span></div>
    </div>
    ${lineChart({
      labels,
      series: [
        { color: 'var(--accent)', values: pts.map(p => p.mw) },
        { color: 'var(--muted)', dash: true, values: pts.map(p => p.mo) }
      ]
    })}
    <div class="legend small"><span class="lg" style="--c:var(--accent)">Peso max serie</span><span class="lg" style="--c:var(--muted)">1RM stimato</span></div>
    <h3>Andamento RPE</h3>
    ${hasRpe
      ? lineChart({ labels, series: [{ color: 'var(--accent2)', values: pts.map(p => p.rpe) }], height: 130, yMin: 6, yMax: 10, tickDec: 1 })
      : '<div class="empty-chart">Nessun RPE registrato per questo esercizio.</div>'}
  </div>`;
}

/* ---- Volume settimanale ---- */

function volumeSection(sessions) {
  const weeks = [];
  const start = mondayOf(new Date());
  for (let i = 11; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - i * 7);
    weeks.push(dayKey(d));
  }
  const vol = Object.fromEntries(weeks.map(w => [w, 0]));
  const groupsPresent = new Set();

  for (const s of sessions) {
    for (const en of s.entries) {
      const g = store.exById(en.exerciseId).group;
      groupsPresent.add(g);
      if (volGroup !== 'Tutti' && g !== volGroup) continue;
      const wk = dayKey(mondayOf(new Date(s.date)));
      if (wk in vol)
        for (const st of en.sets)
          if (isWork(st)) vol[wk] += num(st.weight) * num(st.reps);
    }
  }

  return `
  <div class="card">
    <h2>Volume settimanale <span class="muted small">(kg sollevati)</span></h2>
    <select class="input" id="st-group">${['Tutti', ...[...groupsPresent].sort()].map(g =>
      `<option${g === volGroup ? ' selected' : ''}>${g}</option>`).join('')}</select>
    ${barChart({ labels: weeks.map(w => fmtDateShort(w)), values: weeks.map(w => Math.round(vol[w])) })}
  </div>`;
}

/* ---- Distribuzione gruppi muscolari ---- */

function groupsSection(sessions) {
  // Settimana selezionata: da lunedì (incluso) a domenica (inclusa)
  const start = mondayOf(new Date());
  start.setDate(start.getDate() - grpWeek * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const sunday = new Date(end.getTime() - 86400000);

  const cnt = {};
  for (const s of sessions) {
    const t = new Date(s.date).getTime();
    if (t < start.getTime() || t >= end.getTime()) continue;
    for (const en of s.entries) {
      const g = store.exById(en.exerciseId).group;
      for (const st of en.sets)
        if (isWork(st)) cnt[g] = (cnt[g] || 0) + 1;
    }
  }
  const items = Object.entries(cnt)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }));

  return `
  <div class="card">
    <h2>Gruppi muscolari <span class="muted small">(serie della settimana)</span></h2>
    <div class="cal-head">
      <button class="icon-btn" id="grp-prev">‹</button>
      <b>lun ${fmtDateShort(start)} – dom ${fmtDateShort(sunday)}${grpWeek === 0 ? ' <span class="muted small">(questa settimana)</span>' : ''}</b>
      <button class="icon-btn" id="grp-next"${grpWeek === 0 ? ' disabled' : ''}>›</button>
    </div>
    ${items.length ? hbars(items) : '<div class="empty-chart">Nessuna serie in questa settimana.</div>'}
  </div>`;
}

/* ---- Confronto mensile ---- */

function compareSection(sessions) {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const curKey = monthKey(now), prevKey = monthKey(prev);
  const best = {};

  for (const s of sessions) {
    const mk = monthKey(new Date(s.date));
    if (mk !== curKey && mk !== prevKey) continue;
    for (const en of s.entries)
      for (const st of en.sets) {
        if (!isWork(st)) continue;
        const o = e1rm(st.weight, st.reps);
        const slot = best[en.exerciseId] || (best[en.exerciseId] = { cur: 0, prev: 0 });
        if (mk === curKey) slot.cur = Math.max(slot.cur, o);
        else slot.prev = Math.max(slot.prev, o);
      }
  }

  const rows = Object.entries(best)
    .map(([id, b]) => ({ name: store.exById(id).name, ...b }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const monthName = d => d.toLocaleDateString('it-IT', { month: 'long' });

  return `
  <div class="card">
    <h2>Confronto mensile <span class="muted small">(miglior e1RM)</span></h2>
    ${rows.length ? `
    <table class="cmp">
      <thead><tr><th>Esercizio</th><th>${monthName(prev)}</th><th>${monthName(now)}</th><th>Δ</th></tr></thead>
      <tbody>
        ${rows.map(r => {
          const delta = r.prev && r.cur ? ((r.cur - r.prev) / r.prev) * 100 : null;
          const dTxt = delta == null ? '–' : (delta >= 0 ? '+' : '') + fmtNum(delta) + '%';
          const cls = delta == null ? 'muted' : delta > 0.05 ? 'up' : delta < -0.05 ? 'down' : 'muted';
          return `<tr><td>${esc(r.name)}</td><td>${r.prev ? fmtNum(r.prev) : '–'}</td><td>${r.cur ? fmtNum(r.cur) : '–'}</td><td class="${cls}">${dTxt}</td></tr>`;
        }).join('')}
      </tbody>
    </table>` : '<div class="empty-chart">Nessun dato in questi due mesi.</div>'}
  </div>`;
}

/* ---- Record personali ---- */

function prSection(sessions, exIds) {
  const prs = exIds.map(id => {
    let bw = null, bo = null;
    for (const s of sessions)
      for (const en of s.entries) {
        if (en.exerciseId !== id) continue;
        for (const st of en.sets) {
          if (!isWork(st)) continue;
          const w = num(st.weight), o = e1rm(st.weight, st.reps);
          if (!bw || w > bw.w) bw = { w, r: num(st.reps), date: s.date };
          if (!bo || o > bo.o) bo = { o, date: s.date };
        }
      }
    return { name: store.exById(id).name, bw, bo };
  }).filter(p => p.bw);

  prs.sort((a, b) => a.name.localeCompare(b.name));

  return `
  <div class="card">
    <h2>🏆 Record personali</h2>
    ${prs.map(p => `
    <div class="pr-row">
      <div class="card-title">${esc(p.name)}</div>
      <div class="small muted">Miglior serie: <b class="txt">${fmtNum(p.bw.w)} kg × ${p.bw.r}</b> (${fmtDateShort(p.bw.date)}) · e1RM <b class="txt">${fmtNum(p.bo.o)} kg</b></div>
    </div>`).join('')}
  </div>`;
}
