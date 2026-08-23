// Graficul de temperatură a apei (v1.4.0): curbă netedă cu arie umplută,
// pe date ORARE din statisticile HA, cu indicator la hover/atingere.
//
// Înlocuieşte dot-plot-ul cu tije (o valoare pe zi) — vezi CHANGELOG 1.4.0.
// Interpolarea e monotonă (design/curve.js): curba nu poate depăşi valorile
// măsurate, deci nu inventează maxime care nu s-au întâmplat.
import React, { useEffect, useRef } from 'react';
import { ORANGE, ORANGE_HI, DAYS, pad } from '../design/tokens.js';
import { monotonePath, contiguousRuns } from '../design/curve.js';

const VB_W = 320; // lăţimea sistemului de coordonate (SVG se scalează la card)

/**
 * points = [{ t, v }] — o intrare pe oră, `v` null pentru orele fără date.
 * cursor = indexul indicatorului sau null; onCursor(index|null) îl mută.
 */
export default function PoolChart({ points, height, cursor, onCursor }) {
  const ref = useRef(null);
  const holdRef = useRef(0);
  useEffect(() => () => clearTimeout(holdRef.current), []);
  const n = (points || []).length;
  const values = (points || []).map((p) => p.v);
  const present = values.filter((v) => v !== null && v !== undefined && isFinite(v));

  if (!n || !present.length) return <div style={{ height }} />;

  // Scara verticală: span minim de 0,6 °C, ca o apă stabilă să nu apară ca o
  // linie plată lipită de o margine (aceeaşi grijă ca la dot-plot-ul din
  // v1.1.6, unde un span forţat de 3° aplatiza tot).
  const vMin = Math.min.apply(null, present);
  const vMax = Math.max.apply(null, present);
  const span = Math.max(0.6, (vMax - vMin) * 1.35);
  const mid = (vMin + vMax) / 2;
  const lo = mid - span / 2;
  const hi = mid + span / 2;

  const top = 10;             // aer deasupra vârfului
  const base = height;        // aria coboară până la marginea de jos a cardului
  const curveBottom = height - 6;
  const x = (i) => (n === 1 ? VB_W / 2 : (i / (n - 1)) * VB_W);
  const y = (v) => curveBottom - ((v - lo) / (hi - lo)) * (curveBottom - top);

  // Tronsoane continue: golurile din statistici nu se unesc cu o linie dreaptă.
  const runs = contiguousRuns(values);
  const nodes = [];
  runs.forEach((run, ri) => {
    const pts = run.values.map((v, k) => [x(run.from + k), y(v)]);
    const line = monotonePath(pts);
    if (!line) return;
    if (pts.length > 1) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      nodes.push(
        <path
          key={'a' + ri}
          d={line + ' L' + last[0].toFixed(2) + ' ' + base + ' L' + first[0].toFixed(2) + ' ' + base + ' Z'}
          fill="url(#poolFill)"
        />
      );
    }
    nodes.push(
      <path key={'l' + ri} d={line} fill="none" stroke={ORANGE_HI} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    );
  });

  // Indicatorul: linie verticală subţire + punct pe curbă.
  const ci = cursor === null || cursor === undefined ? null : Math.max(0, Math.min(n - 1, cursor));
  const cv = ci === null ? null : values[ci];
  if (ci !== null) {
    nodes.push(
      <line key="cl" x1={x(ci)} y1={0} x2={x(ci)} y2={base}
        stroke="rgba(255,255,255,0.45)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
    );
    if (cv !== null && cv !== undefined && isFinite(cv)) {
      nodes.push(<circle key="cd" cx={x(ci)} cy={y(cv)} r="3.4" fill="#f7ede2" />);
      nodes.push(<circle key="cg" cx={x(ci)} cy={y(cv)} r="7" fill={ORANGE} opacity="0.28" />);
    }
  }

  // Poziţia -> index. Funcţionează identic pentru mouse şi deget (pointer
  // events). `touch-action: pan-y` lasă pagina să deruleze pe verticală, dar
  // ne dă glisarea pe orizontală — cerinţa pentru tableta montată.
  const idxFrom = (clientX) => {
    const el = ref.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width) return null;
    const frac = (clientX - r.left) / r.width;
    return Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))));
  };
  const move = (e) => {
    const i = idxFrom(e.clientX);
    if (i !== null) onCursor(i);
  };
  const start = (e) => {
    // capturăm pointerul ca glisarea să continue şi dacă degetul iese din card
    if (e.currentTarget.setPointerCapture && e.pointerId !== undefined) {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* ignorăm */ }
    }
    clearTimeout(holdRef.current);
    move(e);
  };
  // La MOUSE indicatorul dispare când pleacă cursorul. La DEGET nu: dacă l-am
  // şterge la ridicarea degetului, valoarea ar dispărea exact în clipa în care
  // utilizatorul îşi ia degetul de pe ecran ca s-o citească. Rămâne 2,5s.
  const end = (e) => {
    const touch = e && e.pointerType && e.pointerType !== 'mouse';
    clearTimeout(holdRef.current);
    if (!touch) { onCursor(null); return; }
    holdRef.current = setTimeout(() => onCursor(null), 2500);
  };
  // pointercancel = browserul a preluat gestul (derulare pe verticală, permisă
  // de touch-action:pan-y). Utilizatorul nu citeşte o valoare, ci scrolează —
  // indicatorul dispare imediat, fără cele 2,5 secunde.
  const cancel = () => {
    clearTimeout(holdRef.current);
    onCursor(null);
  };

  return (
    <div
      ref={ref}
      style={{ width: '100%', height, touchAction: 'pan-y', cursor: 'crosshair' }}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={cancel}
      onPointerLeave={end}
    >
      <svg viewBox={'0 0 ' + VB_W + ' ' + height} width="100%" height={height}
        preserveAspectRatio="none" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="poolFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ORANGE} stopOpacity="0.42" />
            <stop offset="55%" stopColor={ORANGE} stopOpacity="0.16" />
            <stop offset="100%" stopColor={ORANGE} stopOpacity="0" />
          </linearGradient>
        </defs>
        {nodes}
      </svg>
    </div>
  );
}

/** Eticheta momentului indicat de cursor: „Joi 16:00". */
export function cursorLabel(t) {
  const d = new Date(t);
  return DAYS[d.getDay()] + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}
