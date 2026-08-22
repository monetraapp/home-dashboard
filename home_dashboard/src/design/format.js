// Formatarea canonică a unităţilor (v1.3.0) — SINGURUL loc cu logică de
// scară şi zecimale. Regulile (aprobate 2026-08-23):
//
//   PUTERE (şi var/VA, aceeaşi scară):  <1000 → unitate de bază, întregi;
//     1–10 k → k cu 1 zecimală; 10–1000 k → k întregi; apoi M la fel.
//   ENERGIE: <1 kWh → Wh întregi; 1–10 → kWh 1 zecimală; 10–1000 → kWh
//     întregi; peste → MWh cu 1 zecimală MEREU (contoarele cumulative se
//     compară între ele — la întregi diferenţa lunară ar dispărea vizual).
//   °C 1 zecimală · V: ≥100 întregi, 10–100 1 zec, <10 3 zec (celule) ·
//   A 1 zecimală · Hz 2 zecimale · % întregi · durate întregi.
//
// Pragurile folosesc valoarea DUPĂ rotunjire (9.95, 999.5), ca „9999 W" să
// devină „10 kW", nu „10.0 kW". Lizibilitate pe tabletă la 1–2 m: cât mai
// puţine zecimale care nu adaugă informaţie.

/** Separatorul zecimal al aplicaţiei: VIRGULĂ (v1.3.1) — interfaţa e
 * integral în română, deci "9,2 kW", nu "9.2 kW". Orice text numeric
 * vizibil trece prin dec(); coordonatele SVG rămân cu punct. */
export function dec(x) {
  return String(x).replace('.', ',');
}

/** Scara în trepte de 1000 pe trei unităţi. Întoarce {v, u} sau null. */
export function fmtScale3(x, u0, u1, u2) {
  if (x === null || x === undefined || !isFinite(x)) return null;
  const a = Math.abs(x);
  if (a < 999.5) return { v: String(Math.round(x)), u: u0 };
  const k = x / 1000;
  const ka = Math.abs(k);
  if (ka < 9.95) return { v: dec(k.toFixed(1)), u: u1 };
  if (ka < 999.5) return { v: String(Math.round(k)), u: u1 };
  const m = k / 1000;
  return { v: Math.abs(m) < 9.95 ? dec(m.toFixed(1)) : String(Math.round(m)), u: u2 };
}

/** Putere: intrare în W. */
export function fmtPow(w) {
  return fmtScale3(w, 'W', 'kW', 'MW');
}

/** Putere reactivă / aparentă: intrare în var / VA. */
export function fmtVar(v) {
  return fmtScale3(v, 'var', 'kvar', 'Mvar');
}
export function fmtVA(v) {
  return fmtScale3(v, 'VA', 'kVA', 'MVA');
}

/** Energie: intrare canonică în kWh. MWh rămâne cu 1 zecimală (vezi antet). */
export function fmtEn(kwh) {
  if (kwh === null || kwh === undefined || !isFinite(kwh)) return null;
  const a = Math.abs(kwh);
  if (a < 0.9995) return { v: String(Math.round(kwh * 1000)), u: 'Wh' };
  if (a < 9.95) return { v: dec(kwh.toFixed(1)), u: 'kWh' };
  if (a < 999.5) return { v: String(Math.round(kwh)), u: 'kWh' };
  return { v: dec((kwh / 1000).toFixed(1)), u: 'MWh' };
}

export function fmtTemp(c) {
  if (c === null || c === undefined || !isFinite(c)) return null;
  return { v: dec(c.toFixed(1)), u: '°C' };
}

export function fmtVolt(v) {
  if (v === null || v === undefined || !isFinite(v)) return null;
  const a = Math.abs(v);
  return { v: a < 10 ? dec(v.toFixed(3)) : a < 100 ? dec(v.toFixed(1)) : String(Math.round(v)), u: 'V' };
}

export function fmtAmp(a) {
  if (a === null || a === undefined || !isFinite(a)) return null;
  return { v: dec(a.toFixed(1)), u: 'A' };
}

export function fmtFreq(hz) {
  if (hz === null || hz === undefined || !isFinite(hz)) return null;
  return { v: dec(hz.toFixed(2)), u: 'Hz' };
}

export function fmtPct(p) {
  if (p === null || p === undefined || !isFinite(p)) return null;
  return { v: String(Math.round(p)), u: '%' };
}

/** {v,u} -> "v u"; null trece mai departe. */
export function fmtText(parts) {
  return parts ? parts.v + ' ' + parts.u : null;
}

// Unităţile cu formatare fixă „valoare întreagă + unitate" (fără scară).
const INT_UNITS = { mV: 1, mA: 1, min: 1, h: 1, s: 1, zile: 1 };

/**
 * Formatare automată după familia unităţii DECLARATE (a slotului sau a
 * entităţii). Întoarce {v, u} sau null când familia nu e cunoscută —
 * apelantul cade atunci pe formatarea generică. Intrarea e valoarea în
 * unitatea dată (ex. n=9034, unit='Wh').
 */
export function fmtUnitAuto(n, unit) {
  if (n === null || n === undefined || !isFinite(n) || !unit) return null;
  switch (unit) {
    case 'W': return fmtPow(n);
    case 'kW': return fmtPow(n * 1000);
    case 'MW': return fmtPow(n * 1e6);
    case 'Wh': return fmtEn(n / 1000);
    case 'kWh': return fmtEn(n);
    case 'MWh': return fmtEn(n * 1000);
    case 'var': return fmtVar(n);
    case 'kvar': return fmtVar(n * 1000);
    case 'VA': return fmtVA(n);
    case 'kVA': return fmtVA(n * 1000);
    case '°C': return fmtTemp(n);
    case 'V': return fmtVolt(n);
    case 'A': return fmtAmp(n);
    case 'Hz': return fmtFreq(n);
    case '%': return fmtPct(n);
    default:
      if (INT_UNITS[unit]) return { v: String(Math.round(n)), u: unit };
      return null;
  }
}
