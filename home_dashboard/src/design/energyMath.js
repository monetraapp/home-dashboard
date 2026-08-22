// Matematica instrumentului Energie (v1.1.5) — modul PUR, fără React,
// verificat de test/logic.test.mjs. Toate formulele derivate au fost aprobate
// explicit (2026-08-22); regula de aur: fără date -> null (UI afişează "—"),
// NICIODATĂ zero inventat.

/** Consumul casei ca energie: autoconsum + import. eload* e respins de audit
 * (firmware-ul îl lasă permanent 0), aşa că se derivă din registrele valide. */
export function consumCasaAzi(selfKwh, importKwh) {
  if (selfKwh === null || importKwh === null) return null;
  return Math.round((selfKwh + importKwh) * 10) / 10;
}

/** Cota de autoconsum: cât din producţie a rămas în casă. */
export function autoconsumPct(selfKwh, exportKwh) {
  if (selfKwh === null || exportKwh === null) return null;
  const total = selfKwh + exportKwh;
  if (total <= 0) return null;
  return Math.round((selfKwh / total) * 100);
}

/**
 * Repartiţia puterii pe căi (Sankey "Unde merge energia"), formula CORECTATĂ:
 * PV→casă = pv_out − export − încărcare_baterie (limitat ≥0) — fără scăderea
 * pchr, dimineaţa (când PV încarcă bateria) PV→casă ar fi supraestimat.
 */
export function sankeyLanes(pvOutW, exportW, chrW, dischrW) {
  const num = (v) => (v === null || !isFinite(v) ? 0 : Math.max(0, v));
  return {
    pvToHouse: Math.max(0, num(pvOutW) - num(exportW) - num(chrW)),
    batToHouse: num(dischrW),
    pvToGrid: num(exportW)
  };
}

/** Raport export/import pe totaluri. Import 0 -> null ("—"), nu Infinity. */
export function exportImportRatio(exportTotalKwh, importTotalKwh) {
  if (exportTotalKwh === null || importTotalKwh === null) return null;
  if (importTotalKwh <= 0) return null;
  return Math.round((exportTotalKwh / importTotalKwh) * 10) / 10;
}

/** Delta procentuală acum vs referinţă. Referinţă lipsă/zero -> null ("—"). */
export function deltaPct(now, prev) {
  if (now === null || prev === null || !isFinite(now) || !isFinite(prev) || prev === 0) return null;
  const d = ((now - prev) / Math.abs(prev)) * 100;
  return Math.round(d * 10) / 10;
}

/** Formatarea deltei pentru badge. null -> "—" fără săgeată. */
export function fmtDelta(d) {
  if (d === null) return { txt: '—', dir: 0 };
  return { txt: (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '· ') + Math.abs(d).toFixed(1) + '%', dir: d > 0 ? 1 : d < 0 ? -1 : 0 };
}

/**
 * Valoarea unui senzor la un moment din trecut, din eşantioane recorder
 * [{lu: sec, s}]. Ia ultimul eşantion dinaintea momentului, dar nu mai vechi
 * de `tolMs` (implicit 30 min) — altfel null.
 */
export function valueAt(samples, atMs, tolMs) {
  if (!samples || !samples.length) return null;
  const tol = tolMs || 30 * 60 * 1000;
  let lastT = null;
  let lastV = null;
  for (let i = 0; i < samples.length; i++) {
    const t = (samples[i].lu || 0) * 1000;
    if (t > atMs) break;
    const v = parseFloat(samples[i].s);
    if (isFinite(v)) { lastT = t; lastV = v; }
  }
  return lastT !== null && atMs - lastT <= tol ? lastV : null;
}

/** Vârful zilei dintr-o serie de eşantioane, de la `sinceMs` încoace.
 * Întoarce {v, t} sau null când nu există eşantioane numerice. */
export function peakOf(samples, sinceMs) {
  if (!samples || !samples.length) return null;
  let best = null;
  samples.forEach((row) => {
    const t = (row.lu || 0) * 1000;
    if (t < sinceMs) return;
    const v = parseFloat(row.s);
    if (!isFinite(v)) return;
    if (!best || v > best.v) best = { v, t };
  });
  return best;
}

/** Curbă pe ultima oră: `buckets` coşuri de 5 min, media eşantioanelor.
 * Coşuri goale -> carry-forward; fără niciun eşantion -> null. */
export function hourCurve(samples, nowMs, buckets) {
  const n = buckets || 12;
  const span = 60 * 60 * 1000;
  const start = nowMs - span;
  const bucketMs = span / n;
  const sums = new Array(n).fill(0);
  const counts = new Array(n).fill(0);
  (samples || []).forEach((row) => {
    const t = (row.lu || 0) * 1000;
    if (t < start || t > nowMs) return;
    const v = parseFloat(row.s);
    if (!isFinite(v)) return;
    const idx = Math.min(n - 1, Math.floor((t - start) / bucketMs));
    sums[idx] += v;
    counts[idx]++;
  });
  const values = new Array(n).fill(null);
  let last = null;
  let any = false;
  for (let i = 0; i < n; i++) {
    if (counts[i]) { last = sums[i] / counts[i]; any = true; }
    values[i] = last === null ? null : Math.round(last * 10) / 10;
  }
  return any ? values : null;
}

/**
 * Serie de energie pe coşuri din statisticile HA ale unui senzor
 * total_increasing: diferenţele câmpului cumulativ `sum` între rânduri
 * consecutive. Primul rând e doar referinţă (se aruncă). Rânduri lipsă -> null.
 */
export function statEnergySeries(rows, buckets, startMs, bucketMs) {
  const values = new Array(buckets).fill(null);
  if (!rows || rows.length < 2) return values;
  let prev = null;
  rows.forEach((r) => {
    const t = typeof r.start === 'number' ? r.start : Date.parse(r.start);
    const s = r.sum;
    if (s === null || s === undefined) return;
    if (prev !== null && t >= startMs) {
      const idx = Math.floor((t - startMs) / bucketMs);
      if (idx >= 0 && idx < buckets) values[idx] = Math.round((s - prev.s) * 100) / 100;
    }
    prev = { t, s };
  });
  return values;
}

/** Serie de medii pe coşuri din statisticile HA (câmpul `mean`). */
export function statMeanSeries(rows, buckets, startMs, bucketMs) {
  const values = new Array(buckets).fill(null);
  (rows || []).forEach((r) => {
    const t = typeof r.start === 'number' ? r.start : Date.parse(r.start);
    if (r.mean === null || r.mean === undefined) return;
    const idx = Math.floor((t - startMs) / bucketMs);
    if (idx >= 0 && idx < buckets) values[idx] = Math.round(r.mean * 10) / 10;
  });
  return values;
}

/** Suma valorilor non-null; toate null -> null. */
export function sumOrNull(values) {
  let acc = null;
  (values || []).forEach((v) => {
    if (v === null) return;
    acc = (acc === null ? 0 : acc) + v;
  });
  return acc === null ? null : Math.round(acc * 10) / 10;
}
