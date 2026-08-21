// Funcţii pure peste răspunsul recorder-ului HA. Fără React — testabile direct.
const DAY_MS = 24 * 60 * 60 * 1000;
const ZI = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];

/** Etichetele ultimelor `days` zile, terminate cu ziua curentă. */
export function lastDayLabels(days) {
  const out = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS);
    out.push(ZI[d.getDay()]);
  }
  return out;
}

function dayIndex(ts, startMs, days) {
  const idx = Math.floor((ts - startMs) / DAY_MS);
  if (idx < 0 || idx >= days) return -1;
  return idx;
}

/**
 * Media zilnică a unei entităţi numerice, pe `days` zile.
 * Întoarce un array de lungime `days`, cu null unde nu există date.
 */
export function dailyAverage(raw, entityId, days) {
  const out = new Array(days).fill(null);
  if (!raw || !entityId || !raw[entityId]) return out;
  const now = new Date();
  const startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - (days - 1) * DAY_MS;
  const sums = new Array(days).fill(0);
  const counts = new Array(days).fill(0);

  raw[entityId].forEach((p) => {
    const ts = (p.lu || p.last_updated_ts || 0) * 1000;
    const v = parseFloat(p.s !== undefined ? p.s : p.state);
    if (!Number.isFinite(v)) return;
    const idx = dayIndex(ts, startMs, days);
    if (idx < 0) return;
    sums[idx] += v;
    counts[idx] += 1;
  });

  for (let i = 0; i < days; i++) {
    if (counts[i] > 0) out[i] = Math.round((sums[i] / counts[i]) * 10) / 10;
  }
  return out;
}

/**
 * Ultima valoare a fiecărei zile (potrivit pentru contoare cumulative de energie).
 */
export function dailyLast(raw, entityId, days) {
  const out = new Array(days).fill(null);
  if (!raw || !entityId || !raw[entityId]) return out;
  const now = new Date();
  const startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - (days - 1) * DAY_MS;
  raw[entityId].forEach((p) => {
    const ts = (p.lu || p.last_updated_ts || 0) * 1000;
    const v = parseFloat(p.s !== undefined ? p.s : p.state);
    if (!Number.isFinite(v)) return;
    const idx = dayIndex(ts, startMs, days);
    if (idx < 0) return;
    out[idx] = Math.round(v * 10) / 10;
  });
  return out;
}

/** Umple golurile (null) cu ultima valoare cunoscută, apoi cu prima valoare validă. */
export function fillGaps(values) {
  const out = values.slice();
  let last = null;
  for (let i = 0; i < out.length; i++) {
    if (out[i] === null) out[i] = last;
    else last = out[i];
  }
  let first = null;
  for (let i = 0; i < out.length; i++) {
    if (out[i] !== null) {
      first = out[i];
      break;
    }
  }
  if (first === null) return null; // nicio valoare — nu avem ce desena
  for (let i = 0; i < out.length; i++) if (out[i] === null) out[i] = first;
  return out;
}

const OFF_LIKE = ['off', 'idle', 'standby', 'closed', 'not_home', 'false', '0'];
const BAD_LIKE = ['unavailable', 'unknown', 'none', ''];

function bucketOf(stateStr) {
  const s = String(stateStr || '').toLowerCase();
  if (BAD_LIKE.indexOf(s) >= 0) return 'unavail';
  if (OFF_LIKE.indexOf(s) >= 0) return 'off';
  return 'on';
}

/**
 * Segmente pentru blocul timeline: împarte intervalul în `buckets` felii egale
 * și alege starea dominantă din fiecare felie.
 */
export function timelineSegments(raw, entityId, days, buckets) {
  if (!raw || !entityId || !raw[entityId] || !raw[entityId].length) return null;
  const n = buckets || 16;
  const end = Date.now();
  const start = end - days * DAY_MS;
  const width = (end - start) / n;
  const points = raw[entityId]
    .map((p) => ({ ts: (p.lu || p.last_updated_ts || 0) * 1000, b: bucketOf(p.s !== undefined ? p.s : p.state) }))
    .sort((a, b) => a.ts - b.ts);
  if (!points.length) return null;

  const cells = [];
  for (let i = 0; i < n; i++) {
    const t0 = start + i * width, t1 = t0 + width;
    const tally = { on: 0, off: 0, unavail: 0 };
    let cur = null;
    for (let j = 0; j < points.length; j++) {
      if (points[j].ts <= t0) cur = points[j].b;
      else if (points[j].ts < t1) tally[points[j].b] += 1;
      else break;
    }
    if (cur) tally[cur] += 0.5;
    const best = Object.keys(tally).reduce((a, b) => (tally[b] > tally[a] ? b : a), 'off');
    cells.push(tally.on + tally.off + tally.unavail === 0 ? 'idle' : best);
  }

  // comprimă celulele identice consecutive în segmente [stare, lăţime]
  const segs = [];
  cells.forEach((c) => {
    if (segs.length && segs[segs.length - 1][0] === c) segs[segs.length - 1][1] += 1;
    else segs.push([c, 1]);
  });
  return segs;
}
