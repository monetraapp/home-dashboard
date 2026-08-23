// Interpolare cubică MONOTONĂ (Fritsch–Carlson, 1980) — modul PUR, fără React,
// ca să poată fi verificat direct în test/logic.test.mjs.
//
// De ce monotonă şi nu o netezire oarecare (Catmull-Rom, bézier cu tangente
// medii): acelea SUPRAINTERPOLEAZĂ. Între două ore cu 31 °C şi 33 °C, o curbă
// obişnuită poate desena un vârf la 33,4 °C — adică un maxim care nu s-a
// măsurat niciodată. Pe un grafic de temperatură asta e o minciună vizuală.
// Interpolarea monotonă garantează că între două puncte curba rămâne între
// valorile lor.
//
// ATENŢIE: coordonatele SVG folosesc PUNCT ca separator zecimal, indiferent de
// separatorul aplicaţiei (virgulă, din v1.3.1). Nu treceţi valorile prin dec().

/** Rotunjire la 2 zecimale pentru path-uri SVG compacte (separator: punct). */
function f(v) {
  return String(Math.round(v * 100) / 100);
}

/**
 * Tangentele monotone m[i] pentru punctele date.
 * pts = [[x, y], ...] cu x strict crescător.
 */
export function monotoneTangents(pts) {
  const n = (pts || []).length;
  if (n === 0) return [];
  if (n === 1) return [0];

  const d = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0];
    d[i] = dx === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / dx;
  }

  const m = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    // schimbare de sens (vârf sau vale) -> tangentă orizontală, fără depăşire
    m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  }

  // Limitarea Fritsch–Carlson: (m[i]/d[i])² + (m[i+1]/d[i])² ≤ 9 păstrează
  // monotonia pe fiecare segment.
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return m;
}

/** Calea SVG („M… C…") a curbei netede care trece prin puncte. */
export function monotonePath(pts) {
  const n = (pts || []).length;
  if (n === 0) return '';
  if (n === 1) return 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
  const m = monotoneTangents(pts);
  let out = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0];
    out += ' C' + f(pts[i][0] + dx / 3) + ' ' + f(pts[i][1] + (m[i] * dx) / 3) +
      ' ' + f(pts[i + 1][0] - dx / 3) + ' ' + f(pts[i + 1][1] - (m[i + 1] * dx) / 3) +
      ' ' + f(pts[i + 1][0]) + ' ' + f(pts[i + 1][1]);
  }
  return out;
}

/**
 * Rupe o serie cu goluri în tronsoane continue de valori prezente, ca să nu
 * desenăm o linie dreaptă peste ore fără date (ar inventa o măsurătoare).
 * Întoarce [{ from, values }] — `from` = indexul de start în seria originală.
 */
export function contiguousRuns(values) {
  const runs = [];
  let cur = null;
  (values || []).forEach((v, i) => {
    if (v === null || v === undefined || !isFinite(v)) {
      cur = null;
      return;
    }
    if (!cur) {
      cur = { from: i, values: [] };
      runs.push(cur);
    }
    cur.values.push(v);
  });
  return runs;
}

/**
 * Taie golurile de la CAPETE (orele fără statistici de dinaintea primei
 * măsurători şi de după ultima). Fără asta, o serie de 7 zile care are date
 * doar pe ultimele 4 ar desena curba înghesuită în dreapta, cu 43% din card
 * gol — arată ca un grafic stricat, nu ca lipsă de date.
 * Întoarce { from, to } inclusiv, sau null dacă nu există nicio valoare.
 */
export function trimEdges(values) {
  const vals = values || [];
  let from = -1;
  let to = -1;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    if (v === null || v === undefined || !isFinite(v)) continue;
    if (from < 0) from = i;
    to = i;
  }
  return from < 0 ? null : { from, to };
}
