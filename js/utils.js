// Funzioni di utilità condivise

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10));

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Converte input utente in numero (accetta sia virgola che punto)
export const num = (v) => {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return isFinite(n) ? n : 0;
};

// Formatta un numero in stile italiano (virgola decimale, punti per le migliaia)
export const fmtNum = (n, dec = 1) => {
  if (n == null || !isFinite(n)) return '–';
  const r = dec ? Math.round(n * 10) / 10 : Math.round(n);
  return r.toLocaleString('it-IT');
};

// 1RM stimato con formula di Epley
export const e1rm = (w, r) => {
  w = num(w); r = num(r);
  if (!w || !r) return 0;
  if (r === 1) return w;
  if (r > 20) return 0; // oltre le 20 reps la stima non è affidabile
  return w * (1 + r / 30);
};

// Una serie "di lavoro": non è riscaldamento e ha peso e ripetizioni
export const isWork = (set) => set.type !== 'W' && num(set.weight) > 0 && num(set.reps) > 0;

// Una serie con almeno un dato inserito
export const hasData = (set) =>
  String(set.weight ?? '').trim() !== '' || String(set.reps ?? '').trim() !== '';

export const setVolume = (sets) =>
  sets.filter(isWork).reduce((t, s) => t + num(s.weight) * num(s.reps), 0);

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

export const fmtDateShort = (iso) =>
  new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });

export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

// Chiave giorno in ora LOCALE (evita slittamenti di fuso con toISOString)
export const dayKey = (d) => {
  const x = new Date(d);
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
};

export const monthKey = (d) => {
  const x = new Date(d);
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0');
};

// Lunedì della settimana di una data (a mezzanotte locale)
export const mondayOf = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};
