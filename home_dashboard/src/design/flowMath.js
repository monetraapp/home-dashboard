// Matematica diagramei de flux energetic (v1.1.4) — modul PUR, fără React,
// ca să poată fi verificat direct de test/logic.test.mjs.
//
// Convenţii de praguri (din specificaţie):
//   sub FLOW_MIN (100 W)  -> traseu static, fără particule (zgomot de măsură);
//   la FLOW_MAX (15 kW)   -> viteza maximă a particulelor (puterea nominală
//                            de 25 kW nu se atinge în practică pe o ramură).

import { fmtPow } from './format.js';

export const FLOW_MIN = 100;
export const FLOW_MAX = 15000;

/** 0..1: poziţia puterii între praguri. Sub prag -> 0. */
export function flowNorm(watts) {
  if (watts === null || !isFinite(watts)) return 0;
  const w = Math.abs(watts);
  if (w < FLOW_MIN) return 0;
  return Math.min(1, (w - FLOW_MIN) / (FLOW_MAX - FLOW_MIN));
}

/** Viteza particulelor în unităţi viewBox/secundă. 0 = fără particule. */
export function particleSpeed(watts) {
  const n = flowNorm(watts);
  return n === 0 && Math.abs(watts || 0) < FLOW_MIN ? 0 : 40 + 180 * n;
}

/** Grosimea traseului (viewBox px). Rădăcina pătrată — percepţia grosimii
 * e neliniară; un traseu de 10 kW nu trebuie să fie de 100× cel de 100 W. */
export function strokeWidth(watts) {
  if (watts === null || !isFinite(watts) || Math.abs(watts) < 1) return 1.5;
  return 2 + 6 * Math.sqrt(flowNorm(watts));
}

/**
 * Direcţia netă a unei ramuri bidirecţionale.
 * pos/neg = puterile celor două sensuri (ex. încărcare/descărcare).
 * sign: +1 = sensul "pos", -1 = sensul "neg", 0 = repaus (< 1 W).
 */
export function flowDir(pos, neg) {
  const p = pos === null || !isFinite(pos) ? 0 : pos;
  const n = neg === null || !isFinite(neg) ? 0 : neg;
  if (p >= 1 && p >= n) return { sign: 1, power: p };
  if (n >= 1) return { sign: -1, power: n };
  return { sign: 0, power: 0 };
}

/** "450 W" / "1.2 kW" / "12 kW" — formatul badge-urilor, pe regulile
 * canonice din format.js (v1.3.0): kW cu 1 zecimală sub 10, întregi peste. */
export function fmtFlowPower(watts) {
  if (watts === null || !isFinite(watts)) return '—';
  const p = fmtPow(Math.abs(watts));
  return p ? p.v + ' ' + p.u : '—';
}

/**
 * Curba producţiei pe ziua curentă.
 * samples  = [{lu: secunde_unix, s: stare}] (formatul recorder-ului),
 * midnight = miezul nopţii LOCAL (ms), now = acum (ms), buckets = nr. de coşuri.
 * Media valorilor numerice pe coş; coşurile goale de dinainte de "acum" preiau
 * ultima valoare cunoscută (carry-forward); cele de după "acum" rămân null.
 * Întoarce { values, lastIdx } — lastIdx = ultimul coş cu date.
 */
export function dayCurve(samples, midnight, now, buckets) {
  const n = buckets || 96;
  const bucketMs = (24 * 3600 * 1000) / n;
  const sums = new Array(n).fill(0);
  const counts = new Array(n).fill(0);
  (samples || []).forEach((row) => {
    const t = (row.lu || 0) * 1000;
    if (t < midnight || t > now) return;
    const v = parseFloat(row.s);
    if (!isFinite(v)) return;
    const idx = Math.min(n - 1, Math.floor((t - midnight) / bucketMs));
    sums[idx] += v;
    counts[idx]++;
  });
  const nowIdx = Math.min(n - 1, Math.floor((now - midnight) / bucketMs));
  const values = new Array(n).fill(null);
  let last = null;
  let lastIdx = -1;
  for (let i = 0; i <= nowIdx; i++) {
    if (counts[i]) {
      last = sums[i] / counts[i];
      values[i] = Math.round(last * 10) / 10;
      lastIdx = i;
    } else if (last !== null) {
      values[i] = Math.round(last * 10) / 10;
      lastIdx = i;
    }
  }
  return { values, lastIdx };
}

/** Etichetele de ore pentru axa X ("00".."24"), una la fiecare `stepHours`. */
export function dayHourLabels(stepHours) {
  const step = stepHours || 4;
  const out = [];
  for (let h = 0; h <= 24; h += step) out.push(h < 10 ? '0' + h : String(h));
  return out;
}
