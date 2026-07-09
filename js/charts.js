// Grafici SVG leggeri, senza dipendenze esterne

import { fmtNum } from './utils.js';

export function lineChart({ labels = [], series = [], height = 210 } = {}) {
  const pts = series.flatMap(s => s.values.filter(v => v != null && isFinite(v)));
  if (!labels.length || !pts.length) return '<div class="empty-chart">Dati insufficienti</div>';

  const W = 700, H = height * 2;
  const padL = 66, padR = 18, padT = 18, padB = 46;
  const iw = W - padL - padR, ih = H - padT - padB;

  let min = Math.min(...pts), max = Math.max(...pts);
  if (min === max) { min -= 5; max += 5; }
  const pad = (max - min) * 0.12;
  const rawMin = min;
  min -= pad; max += pad;
  if (min < 0 && rawMin >= 0) min = 0;

  const n = labels.length;
  const X = i => padL + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
  const Y = v => padT + ih - ((v - min) / (max - min)) * ih;

  let grid = '';
  for (let t = 0; t <= 3; t++) {
    const v = min + ((max - min) * t) / 3;
    const y = Y(v);
    grid += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${W - padR}" y2="${y.toFixed(1)}" class="gridline"/>`
      + `<text x="${padL - 10}" y="${(y + 7).toFixed(1)}" class="tick" text-anchor="end">${fmtNum(v, 0)}</text>`;
  }

  let lines = '';
  for (const s of series) {
    let d = '', pen = false;
    s.values.forEach((v, i) => {
      if (v == null || !isFinite(v)) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)} `;
      pen = true;
    });
    lines += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="4"${s.dash ? ' stroke-dasharray="10 8"' : ''} stroke-linecap="round" stroke-linejoin="round"/>`;
    if (n <= 40) {
      s.values.forEach((v, i) => {
        if (v != null && isFinite(v))
          lines += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="5.5" fill="${s.color}"/>`;
      });
    }
  }

  const li = [...new Set([0, Math.floor((n - 1) / 2), n - 1])];
  const xlabels = li.map(i =>
    `<text x="${X(i).toFixed(1)}" y="${H - 12}" class="tick" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${labels[i]}</text>`
  ).join('');

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${grid}${lines}${xlabels}</svg>`;
}

export function barChart({ labels = [], values = [], height = 200 } = {}) {
  if (!values.length || !values.some(v => v > 0)) return '<div class="empty-chart">Dati insufficienti</div>';

  const W = 700, H = height * 2;
  const padL = 14, padR = 14, padT = 34, padB = 46;
  const iw = W - padL - padR, ih = H - padT - padB;
  const max = Math.max(...values);
  const n = values.length;
  const slot = iw / n, bw = slot * 0.62;
  const step = Math.ceil(n / 6);

  let bars = '', xl = '';
  values.forEach((v, i) => {
    const h = max ? (v / max) * ih : 0;
    const x = padL + i * slot + (slot - bw) / 2;
    const y = padT + ih - Math.max(h, v > 0 ? 4 : 3);
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, v > 0 ? 4 : 3).toFixed(1)}" rx="5" fill="var(--accent)" opacity="${v > 0 ? 1 : 0.22}"/>`;
    if (v > 0 && n <= 13) {
      const label = v >= 10000 ? Math.round(v / 1000) + 'k' : v >= 1000 ? (Math.round(v / 100) / 10).toLocaleString('it-IT') + 'k' : v;
      bars += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 8).toFixed(1)}" class="tick" text-anchor="middle">${label}</text>`;
    }
    if (i % step === 0)
      xl += `<text x="${(padL + i * slot + slot / 2).toFixed(1)}" y="${H - 12}" class="tick" text-anchor="middle">${labels[i]}</text>`;
  });

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${bars}${xl}</svg>`;
}

export function hbars(items) {
  const max = Math.max(...items.map(i => i.value), 1);
  return items.map(i => `
    <div class="hbar">
      <div class="hbar-label">${i.label}</div>
      <div class="hbar-track"><div class="hbar-fill" style="width:${((i.value / max) * 100).toFixed(1)}%"></div></div>
      <div class="hbar-val">${i.value}</div>
    </div>`).join('');
}
