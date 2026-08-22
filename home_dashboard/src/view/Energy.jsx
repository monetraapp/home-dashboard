// Instrumentul Energie (v1.1.5) — portarea designului "Energie Redesign v2"
// (claude.ai/design, proiect "Design frumos la carduri") pe date live.
//
// Reguli respectate din specificaţie:
//  - toate valorile vin din sloturile mapate (gw.* / energie.*) — zero ID inventat;
//  - datele lipsă se afişează "—", niciodată zero inventat;
//  - Oră/Zi = history_during_period (rezoluţie fină), Săptămână/Lună/An =
//    recorder/statistics_during_period (agregatele orare ale HA, care
//    supravieţuiesc epurării recorder-ului);
//  - istoricul citeşte DOAR stări de senzor (no_attributes) — lecţia v1.1.1;
//  - pragul termic "85 °C" din mockup a fost ELIMINAT la cerere (constantă
//    inventată — nu cunoaştem pragul real de derating);
//  - panoul "Ce se întâmplă acum" NU se implementează (v1.1.6) — rail-ul
//    păstrează doar "Bilanţ azi".
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { s, SANS, SERIF, DOTO, TXT, TXT2, TXT3 } from '../design/tokens.js';
import { useEntities } from '../ha/entities.js';
import { useHistory, useStatistics } from '../ha/history.js';
import { useBreakpoint } from '../design/breakpoints.js';
import { particleSpeed, strokeWidth, flowNorm, fmtFlowPower, dayCurve } from '../design/flowMath.js';
import {
  consumCasaAzi, autoconsumPct, sankeyLanes, exportImportRatio, deltaPct, fmtDelta,
  valueAt, peakOf, hourCurve, statEnergySeries, statMeanSeries, sumOrNull
} from '../design/energyMath.js';
import { Tip, Roll, pressProps } from './overlay.jsx';
import { describe } from '../model/descriptions.js';

const el = React.createElement;

// Paleta funcţională a designului: producţie auriu, consum cyan,
// baterie verde, reţea portocaliu.
const GOLD = '#F0A02C';
const GOLD_HI = '#FFC46B';
const CYAN = '#3FC9DE';
const GREEN = '#4FD08A';
const GRID_O = '#FF7A18';
const HAIR = 'rgba(255,255,255,0.07)';
const HAIR2 = 'rgba(255,255,255,0.045)';
const FLOW_COLORS = { pv: GOLD, load: CYAN, bat: GREEN, grid: GRID_O };

const H_MS = 3600 * 1000;
const DAY_MS = 24 * H_MS;

/* ------------------------------------------------------------- formatare */
function fmtPow(w) {
  if (w === null || !isFinite(w)) return null;
  return Math.abs(w) < 1000 ? { v: String(Math.round(w)), u: 'W' } : { v: (w / 1000).toFixed(2), u: 'kW' };
}
function fmtEn(kwh) {
  if (kwh === null || !isFinite(kwh)) return null;
  if (Math.abs(kwh) > 999) return { v: (kwh / 1000).toFixed(1), u: 'MWh' };
  return { v: Math.abs(kwh) < 10 ? kwh.toFixed(1) : String(Math.round(kwh)), u: 'kWh' };
}
function hhmm(ms) {
  const d = new Date(ms);
  const p = (n) => (n < 10 ? '0' + n : String(n));
  return p(d.getHours()) + ':' + p(d.getMinutes());
}
function scaps(size, color, ls) {
  return 'font-family:' + SANS + '; font-size:' + size + 'px; font-weight:500; text-transform:uppercase; letter-spacing:' + (ls || 0.12) + 'em; color:' + color + ';';
}

/* --------------------------------------------------------------- grafice */
let UID = 0;
function chartSvg(cfg) {
  const w = cfg.w, h = cfg.h || 218, padL = 44, padR = 12, padT = 14, padB = 26;
  const id = 'ei' + (++UID);
  let all = [];
  cfg.series.forEach((sr) => { all = all.concat(sr.values.filter((v) => v !== null)); });
  if (!all.length) return null;
  let lo = cfg.yMin !== undefined ? cfg.yMin : Math.min.apply(null, all);
  let hi = cfg.yMax !== undefined ? cfg.yMax : Math.max.apply(null, all);
  const span = hi - lo || 1;
  if (cfg.yMin === undefined) lo -= span * 0.12;
  if (cfg.yMax === undefined) hi += span * 0.16;
  if (cfg.zero && lo > 0) lo = 0;
  const iw = w - padL - padR, ih = h - padT - padB, n = cfg.labels.length;
  const px = (i) => padL + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const py = (v) => padT + ih - ((v - lo) / (hi - lo)) * ih;
  const g = [];
  for (let i = 0; i <= 4; i++) {
    const gv = lo + (hi - lo) * (i / 4), gy = py(gv);
    const zero = cfg.zero && Math.abs(gv) < (hi - lo) / 40;
    g.push(el('line', { key: 'g' + i, x1: padL, y1: gy, x2: w - padR, y2: gy, stroke: zero ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.038)', strokeWidth: 1 }));
    g.push(el('text', { key: 'gl' + i, x: padL - 10, y: gy + 3.4, textAnchor: 'end', style: { fontFamily: SANS, fontSize: '10px', fontWeight: 300, fill: TXT3 } }, Math.abs(hi - lo) < 12 ? gv.toFixed(1) : Math.round(gv)));
  }
  cfg.labels.forEach((lb, i) => {
    if (!lb) return;
    g.push(el('text', { key: 'x' + i, x: px(i), y: h - 7, textAnchor: 'middle', style: { fontFamily: SANS, fontSize: '10px', fontWeight: 300, fill: TXT3 } }, lb));
  });
  if (cfg.bars) {
    const colW = iw / n, bw = Math.min(30, colW * 0.5), vals = cfg.series[0].values;
    const present = vals.filter((v) => v !== null).map(Math.abs);
    const mx = present.length ? Math.max.apply(null, present) : 1;
    vals.forEach((v, i) => {
      if (v === null) return;
      const cx = padL + colW * i + colW / 2, y0 = py(0), y1 = py(v);
      const top = Math.min(y0, y1), bh = Math.max(2.5, Math.abs(y1 - y0));
      const col = v >= 0 ? cfg.series[0].color : (cfg.negColor || 'rgba(63,201,222,0.5)');
      g.push(el('rect', { key: 'b' + i, x: cx - bw / 2, y: top, width: bw, height: bh, rx: 4, fill: col, opacity: Math.abs(v) === mx ? 1 : 0.55 }));
    });
  } else {
    cfg.series.forEach((sr, si) => {
      let d = '';
      let started = false;
      let lastIdx = -1;
      sr.values.forEach((v, i) => {
        if (v === null) { started = false; return; }
        d += (started ? ' L' : (d ? ' M' : 'M')) + px(i).toFixed(1) + ' ' + py(v).toFixed(1);
        started = true;
        lastIdx = i;
      });
      if (!d) return;
      if (si === 0 && cfg.fill !== false && lastIdx >= 0) {
        let firstIdx = sr.values.findIndex((v) => v !== null);
        g.push(el('path', {
          key: 'a' + si,
          d: d + ' L' + px(lastIdx).toFixed(1) + ' ' + py(Math.max(lo, 0)).toFixed(1) + ' L' + px(firstIdx).toFixed(1) + ' ' + py(Math.max(lo, 0)).toFixed(1) + ' Z',
          fill: 'url(#' + id + ')'
        }));
      }
      g.push(el('path', { key: 'l' + si, d, fill: 'none', stroke: sr.color, strokeWidth: si === 0 ? 2.2 : 1.5, strokeDasharray: sr.dashed ? '4 5' : null, strokeLinecap: 'round', strokeLinejoin: 'round' }));
      if (lastIdx >= 0) {
        g.push(el('circle', { key: 'd' + si, cx: px(lastIdx), cy: py(sr.values[lastIdx]), r: si === 0 ? 3.4 : 2.4, fill: sr.color }));
      }
    });
  }
  return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', height: h, style: { display: 'block' } }, [
    el('defs', { key: 'df' }, el('linearGradient', { id, x1: '0', y1: '0', x2: '0', y2: '1' }, [
      el('stop', { key: 1, offset: '0%', stopColor: cfg.series[0].color, stopOpacity: 0.28 }),
      el('stop', { key: 2, offset: '100%', stopColor: cfg.series[0].color, stopOpacity: 0 })
    ]))
  ].concat(g));
}

function sparkSvg(values, color, w, h) {
  const present = (values || []).filter((v) => v !== null);
  if (!present.length) return null;
  const lo = Math.min.apply(null, present), hi = Math.max.apply(null, present), sp = hi - lo || 1;
  let d = '';
  let started = false;
  values.forEach((v, i) => {
    if (v === null) { started = false; return; }
    d += (started ? ' L' : (d ? ' M' : 'M')) + ((i / (values.length - 1)) * w).toFixed(1) + ' ' + (h - ((v - lo) / sp) * (h - 3) - 1.5).toFixed(1);
    started = true;
  });
  return el('svg', { width: w, height: h, viewBox: '0 0 ' + w + ' ' + h, style: { display: 'block', overflow: 'visible' } }, [
    el('path', { key: 1, d, fill: 'none', stroke: color, strokeWidth: 2.4, opacity: 0.2, strokeLinecap: 'round' }),
    el('path', { key: 2, d, fill: 'none', stroke: color, strokeWidth: 1.2, strokeLinecap: 'round' })
  ]);
}

/* ------------------------------------------------- diagrama de flux (H/V) */
// Logica particulelor (rAF, direcţie dinamică, pauză la visibilitychange,
// prefers-reduced-motion) e cea din v1.1.4 — doar geometria şi paleta s-au
// adaptat designului. "flip" = sensul pozitiv al ramurii faţă de sensul de
// desenare al traseului (bateria e desenată baterie→invertor).
const GEO_V = {
  nodes: {
    // labelSide 'left': pe layoutul vertical eticheta+subtitlul nodului Soare
    // stăteau SUB nod, exact peste badge-ul de putere PV (suprapunere 58%,
    // găsită de auditul responsive) — le mutăm în stânga nodului, ca în v1.1.4.
    sun: { x: 180, y: 46, r: 22, icon: 'sun', label: 'Soare', labelSide: 'left' },
    // subOnly: pe vertical, eticheta 'Invertor' + subtitlul coborau peste
    // badge-ul reţelei (suprapunere 38%, audit v1.2.0). Iconul fulger e
    // explicit, aşa că rămâne doar subtitlul, urcat la poziţia etichetei.
    inv: { x: 180, y: 164, r: 26, icon: 'bolt', label: 'Invertor', subOnly: true },
    bat: { x: 54, y: 164, r: 22, icon: 'batteryCharging', label: 'Baterie' },
    house: { x: 306, y: 164, r: 22, icon: 'home', label: 'Casă' },
    grid: { x: 180, y: 282, r: 22, icon: 'utilityPole', label: 'Reţea' }
  },
  view: '0 0 360 330',
  paths: { pv: 'M 180 74 L 180 132', load: 'M 212 164 L 278 164', bat: 'M 148 164 L 82 164', grid: 'M 180 196 L 180 254' },
  flip: { pv: 1, load: 1, bat: 1, grid: 1 },
  // load: deasupra traseului (ca bat), dar ancorat START la x=218 — începe
  // imediat după bbox-ul Invertorului (≤214) şi creşte spre dreapta doar cât
  // are text. Centrat nu încăpea (culoar ~62px < badge), iar sub traseu
  // (v1.2.3) intra în bbox-ul întins de subtitlul „autoconsum NN %" al Casei.
  // Cu „12.30 kW" (cel mai lat caz) intersecţia cu halo-ul difuz al Casei
  // rămâne ~16% din badge — sub pragul de suprapunere şi invizibilă practic.
  badges: { pv: [192, 108, 'start'], load: [218, 150, 'start'], bat: [115, 150, 'middle'], grid: [192, 224, 'start'] },
  dirWords: { bat: [115, 185, 'middle'], grid: [192, 242, 'start'] },
  font: 19
};
const GEO_H = {
  nodes: {
    sun: { x: 98, y: 76, r: 30, icon: 'sun', label: 'Soare' },
    bat: { x: 98, y: 214, r: 30, icon: 'batteryCharging', label: 'Baterie' },
    inv: { x: 414, y: 146, r: 33, icon: 'bolt', label: 'Invertor' },
    house: { x: 740, y: 76, r: 30, icon: 'home', label: 'Casă' },
    grid: { x: 740, y: 214, r: 30, icon: 'utilityPole', label: 'Reţea' }
  },
  view: '0 0 860 300',
  paths: {
    pv: 'M 132 76 C 230 78 300 112 372 138',
    bat: 'M 132 214 C 230 212 300 178 372 154',
    load: 'M 456 138 C 530 112 610 78 706 76',
    grid: 'M 456 154 C 530 178 610 212 706 214'
  },
  // bat e desenat baterie→invertor: înainte pe traseu = DESCĂRCARE, deci
  // semnul pozitiv (încărcare) curge invers -> flip -1.
  flip: { pv: 1, load: 1, bat: -1, grid: 1 },
  badges: { pv: [252, 78, 'middle'], bat: [252, 224, 'middle'], load: [586, 78, 'middle'], grid: [586, 224, 'middle'] },
  dirWords: { bat: [252, 246, 'middle'], grid: [586, 246, 'middle'] },
  font: 16
};

function particleCount(watts) {
  const n = flowNorm(watts);
  return n === 0 ? 0 : 2 + Math.round(3 * n);
}

export function FlowDiagram({ flows, anim, layout, subs }) {
  const G = layout === 'h' ? GEO_H : GEO_V;
  const pathRefs = useRef({});
  const dotRefs = useRef({});
  const flowRef = useRef(flows);
  flowRef.current = flows;
  const flipRef = useRef(G.flip);
  flipRef.current = G.flip;
  const animOn = anim && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    if (!animOn) return undefined;
    let raf = 0;
    let running = false;
    let last = 0;
    const offsets = { pv: 0, load: 0, bat: 0, grid: 0 };
    const step = (t) => {
      if (!running) return;
      const dt = last ? Math.min(0.1, (t - last) / 1000) : 0;
      last = t;
      const F = flowRef.current;
      ['pv', 'load', 'bat', 'grid'].forEach((k) => {
        const path = pathRefs.current[k];
        const dots = dotRefs.current[k] || [];
        if (!path || !dots.length) return;
        const f = F[k];
        const sign = (f.sign === undefined ? 1 : f.sign) * (flipRef.current[k] || 1);
        const speed = particleSpeed(f.w);
        if (!f.active || speed === 0 || sign === 0) {
          dots.forEach((d) => d && d.setAttribute('opacity', '0'));
          return;
        }
        const len = path.getTotalLength();
        offsets[k] = (offsets[k] + speed * dt) % len;
        dots.forEach((d, i) => {
          if (!d) return;
          let at = (offsets[k] + (i * len) / dots.length) % len;
          if (sign < 0) at = len - at; // direcţia se inversează dinamic
          const pt = path.getPointAtLength(at);
          d.setAttribute('cx', pt.x);
          d.setAttribute('cy', pt.y);
          d.setAttribute('opacity', '0.95');
        });
      });
      raf = requestAnimationFrame(step);
    };
    const start = () => { if (!running) { running = true; last = 0; raf = requestAnimationFrame(step); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    // Tabletă montată: rAF nu are voie să ardă GPU cât timp pagina nu se vede.
    const onVis = () => (document.visibilityState === 'visible' ? start() : stop());
    document.addEventListener('visibilitychange', onVis);
    onVis();
    return () => { document.removeEventListener('visibilitychange', onVis); stop(); };
  }, [animOn, layout]);

  const F = flows;
  const branch = (k, f) => {
    const color = FLOW_COLORS[k];
    const active = f.active;
    const dots = [];
    const nDots = animOn && active ? particleCount(f.w) : 0;
    for (let i = 0; i < nDots; i++) {
      dots.push(el('circle', {
        key: k + i,
        ref: (el2) => { (dotRefs.current[k] = dotRefs.current[k] || [])[i] = el2; },
        r: 2.6, cx: -10, cy: -10, opacity: 0, fill: color,
        style: { filter: 'drop-shadow(0 0 4px ' + color + ')' }
      }));
    }
    if (dotRefs.current[k]) dotRefs.current[k].length = nDots;
    return el('g', { key: k }, [
      el('path', { key: 'p', d: G.paths[k], stroke: color, fill: 'none', strokeLinecap: 'round', strokeWidth: strokeWidth(active ? f.w : 0), opacity: active ? 0.85 : 0.28 })
    ].concat(dots));
  };

  const node = (k) => {
    const nd = G.nodes[k];
    const flowKey = k === 'sun' ? 'pv' : k === 'house' ? 'load' : k === 'inv' ? null : k;
    const active = flowKey === null
      ? F.pv.active || F.load.active || F.bat.active || F.grid.active
      : F[flowKey].active;
    const color = flowKey === null ? GOLD_HI : FLOW_COLORS[flowKey];
    const iconName = nd.icon;
    const sub = subs && subs[k];
    return el('g', { key: k, opacity: active ? 1 : 0.55 }, [
      active ? el('circle', { key: 'h', cx: nd.x, cy: nd.y, r: nd.r + 8, fill: color, opacity: 0.2, style: { filter: 'blur(7px)' } }) : null,
      el('circle', { key: 'b', cx: nd.x, cy: nd.y, r: nd.r, fill: 'rgba(18,12,7,0.92)', stroke: color, strokeWidth: active ? 1.8 : 1.2 }),
      el('g', { key: 'i', transform: 'translate(' + (nd.x - 11) + ',' + (nd.y - 11) + ')' }, icEl(iconName, 22, active ? color : '#8a7c6c')),
      nd.subOnly ? null : el('text', {
        key: 'l',
        x: nd.labelSide === 'left' ? nd.x - nd.r - 10 : nd.x,
        y: nd.labelSide === 'left' ? nd.y + 1 : nd.y + nd.r + 17,
        textAnchor: nd.labelSide === 'left' ? 'end' : 'middle',
        style: { fontFamily: SANS, fontSize: '12px', fontWeight: 400, fill: '#cdc1b3' }
      }, nd.label),
      sub ? el('text', {
        key: 's',
        x: nd.labelSide === 'left' ? nd.x - nd.r - 10 : nd.x,
        y: nd.labelSide === 'left' ? nd.y + 16 : nd.subOnly ? nd.y + nd.r + 17 : nd.y + nd.r + 32,
        textAnchor: nd.labelSide === 'left' ? 'end' : 'middle',
        style: { fontFamily: SANS, fontSize: '10.5px', fontWeight: 300, fill: TXT3 }
      }, sub) : null
    ]);
  };

  // Badge de valoare: contrast prin contur închis (paint-order), nu doar glow.
  const badgeStyle = { fontFamily: DOTO, fontSize: G.font + 'px', fontWeight: 700, paintOrder: 'stroke', stroke: 'rgba(15,12,9,0.9)', strokeWidth: 4, strokeLinejoin: 'round' };
  const dirStyle = { fontFamily: SANS, fontSize: '10.5px', fontWeight: 500, letterSpacing: '0.05em', paintOrder: 'stroke', stroke: 'rgba(15,12,9,0.85)', strokeWidth: 3 };

  const badge = (k) => {
    const b = G.badges[k];
    return el('text', { key: 'bg' + k, x: b[0], y: b[1], textAnchor: b[2], fill: FLOW_COLORS[k], style: badgeStyle }, F[k].text);
  };
  const dirWord = (k) => {
    const b = G.dirWords[k];
    if (!b || !F[k].dirWord) return null;
    return el('text', { key: 'dw' + k, x: b[0], y: b[1], textAnchor: b[2], fill: FLOW_COLORS[k], style: dirStyle }, F[k].dirWord);
  };

  return el('div', { style: { minWidth: 0 } },
    el('svg', { viewBox: G.view, width: '100%', style: { display: 'block', maxWidth: layout === 'h' ? 980 : 480, margin: '0 auto' } }, [
      branch('pv', F.pv), branch('load', F.load), branch('bat', F.bat), branch('grid', F.grid),
      ['pv', 'load', 'bat', 'grid'].map((k) => el('path', { key: 'm' + k, d: G.paths[k], fill: 'none', stroke: 'none', ref: (el2) => { pathRefs.current[k] = el2; } })),
      node('sun'), node('bat'), node('inv'), node('house'), node('grid'),
      badge('pv'), badge('load'), badge('bat'), badge('grid'),
      dirWord('bat'), dirWord('grid')
    ])
  );
}

// Iconurile din designul v2 (stroke 24-grid, desenate în mockup).
function icEl(name, size, color) {
  let k;
  switch (name) {
    case 'sun': k = [el('circle', { key: 1, cx: 12, cy: 12, r: 4.2 })].concat(
      [[12, 2, 12, 4.4], [12, 19.6, 12, 22], [2, 12, 4.4, 12], [19.6, 12, 22, 12], [5, 5, 6.7, 6.7], [17.3, 17.3, 19, 19], [19, 5, 17.3, 6.7], [6.7, 17.3, 5, 19]]
        .map((p, i) => el('line', { key: 'r' + i, x1: p[0], y1: p[1], x2: p[2], y2: p[3] }))); break;
    case 'batteryCharging': k = [el('rect', { key: 1, x: 2, y: 8, width: 16, height: 9, rx: 2.4 }), el('line', { key: 2, x1: 21, y1: 11, x2: 21, y2: 14 }), el('polyline', { key: 3, points: '10.5,9.6 8,12.6 11,12.6 9.2,15.6' })]; break;
    case 'home': k = [el('path', { key: 1, d: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z' }), el('polyline', { key: 2, points: '9.6,21 9.6,14.4 14.4,14.4 14.4,21' })]; break;
    case 'utilityPole': k = [el('path', { key: 1, d: 'M6 21 12 3l6 18' }), el('line', { key: 2, x1: 8.2, y1: 14.4, x2: 15.8, y2: 14.4 }), el('line', { key: 3, x1: 9.4, y1: 9.6, x2: 14.6, y2: 9.6 }), el('line', { key: 4, x1: 3.5, y1: 10.6, x2: 20.5, y2: 10.6 })]; break;
    case 'bolt': k = [el('polygon', { key: 1, points: '13.6,2 4.4,13.6 11,13.6 10.4,22 19.6,10.4 13,10.4' })]; break;
    case 'gauge': k = [el('path', { key: 1, d: 'M3.6 17.4a9 9 0 1 1 16.8 0' }), el('line', { key: 2, x1: 12, y1: 14, x2: 16.4, y2: 9.6 })]; break;
    case 'leaf': k = [el('path', { key: 1, d: 'M20 4c0 9-6 13-12 13H4c0-8 6-12 12-12h4z' }), el('line', { key: 2, x1: 4, y1: 21, x2: 12, y2: 12 })]; break;
    case 'thermo': k = [el('path', { key: 1, d: 'M10 14.6V4.6a2 2 0 1 1 4 0v10a4 4 0 1 1-4 0z' })]; break;
    case 'clock': k = [el('circle', { key: 1, cx: 12, cy: 12, r: 8.6 }), el('polyline', { key: 2, points: '12,7.2 12,12.4 16,14.4' })]; break;
    case 'layers': k = [el('polygon', { key: 1, points: '12,3 21,8 12,13 3,8' }), el('polyline', { key: 2, points: '3,13 12,18 21,13' })]; break;
    case 'trend': k = [el('polyline', { key: 1, points: '3,16.8 9,10.8 13.2,15 21,7.2' }), el('polyline', { key: 2, points: '15.6,7.2 21,7.2 21,12.6' })]; break;
    case 'plug': k = [el('path', { key: 1, d: 'M8 3v6M16 3v6' }), el('path', { key: 2, d: 'M5.5 9h13v2.6a6.5 6.5 0 0 1-13 0z' }), el('line', { key: 3, x1: 12, y1: 18.1, x2: 12, y2: 21.6 })]; break;
    default: k = [el('circle', { key: 1, cx: 12, cy: 12, r: 8 })];
  }
  return el('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', style: { display: 'block', flexShrink: 0 } }, k);
}

/* ------------------------------------------------------------ instrument */
const PERIODS = [['ora', 'Oră'], ['zi', 'Zi'], ['saptamana', 'Săpt.'], ['luna', 'Lună'], ['an', 'An']];
const PREV_LABEL = { ora: 'vs ora trecută', zi: 'vs ieri, aceeaşi oră', saptamana: 'vs săptămâna trecută', luna: 'vs luna trecută', an: 'vs anul trecut' };
const CATS = [
  ['prezentare', 'Prezentare', 'layers'],
  ['productie', 'Producţie', 'sun'],
  ['baterie', 'Baterie', 'batteryCharging'],
  ['retea', 'Reţea', 'utilityPole'],
  ['invertor', 'Invertor', 'gauge']
];
// Sloturile cu istoric de 48h (Oră/Zi + delte "vs ieri aceeaşi oră").
const HIST_SLOTS = [
  'gw.pv_in', 'gw.p_casa', 'gw.soc', 'gw.p_chr', 'gw.p_dischr', 'gw.p_export', 'gw.p_import',
  'gw.pv1_w', 'gw.pv2_w', 'gw.pv3_w', 'gw.t_inv', 'gw.t_ipm', 'gw.t_pvimp', 'gw.t_a', 'gw.t_b',
  'gw.sol_azi', 'gw.exp_azi', 'gw.imp_azi', 'gw.self_azi', 'gw.echr_azi', 'gw.edis_azi'
];
// Sursele de statistici pe termen lung (doar entităţi cu state_class).
const STAT_SLOTS = [
  'gw.gen_tot', 'energie.stat_import', 'energie.stat_export', 'energie.stat_chr',
  'energie.stat_dischr', 'energie.stat_soc', 'gw.t_inv', 'gw.t_ipm', 'gw.pv1_tot', 'gw.pv2_tot'
];

const RO_DAYS = ['Du', 'Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ'];
const RO_MONTHS = ['I', 'F', 'M', 'A', 'M', 'I', 'I', 'A', 'S', 'O', 'N', 'D'];

export function EnergyInstrument({ anim }) {
  const E = useEntities();
  const bp = useBreakpoint();
  const mob = bp.mob;
  const desk = !bp.narrow;
  const [cat, setCat] = useState('prezentare');
  const [per, setPer] = useState('zi');
  const [hover, setHover] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const midnight = useMemo(() => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.getTime(); }, [now]);

  /* ------------------------------------------------------ date: istoric */
  const histIds = useMemo(
    () => Array.from(new Set(HIST_SLOTS.map((k) => E.idOf(k)).filter(Boolean))),
    [E]
  );
  const hist = useHistory(histIds, 2);
  const hOf = (slot) => {
    const id = E.idOf(slot);
    return id && hist.raw ? hist.raw[id] : null;
  };

  /* -------------------------------------------------- date: statistici */
  const statPeriod = per === 'an' ? 'month' : 'day';
  const statNeeded = per === 'saptamana' || per === 'luna' || per === 'an';
  const statWin = useMemo(() => {
    if (per === 'saptamana') return { fetchStart: midnight - 13 * DAY_MS, showStart: midnight - 6 * DAY_MS, buckets: 7, bucketMs: DAY_MS };
    if (per === 'luna') return { fetchStart: midnight - 59 * DAY_MS, showStart: midnight - 29 * DAY_MS, buckets: 30, bucketMs: DAY_MS };
    if (per === 'an') {
      const y = new Date(now).getFullYear();
      return { fetchStart: new Date(y - 1, 11, 1).getTime(), showStart: new Date(y, 0, 1).getTime(), buckets: 12, year: y };
    }
    return null;
  }, [per, midnight, now]);
  const statIds = useMemo(
    () => (statNeeded ? Array.from(new Set(STAT_SLOTS.map((k) => E.idOf(k)).filter(Boolean))) : []),
    [statNeeded, E]
  );
  const stats = useStatistics(statIds, statWin ? statWin.fetchStart : 0, now, statPeriod);
  const stOf = (slot) => {
    const id = E.idOf(slot);
    return id && stats.stats ? stats.stats[id] : null;
  };
  const statEnergy = (slot) => {
    if (!statWin) return null;
    const rows = stOf(slot);
    if (!rows || !rows.length) return new Array(statWin.buckets).fill(null);
    if (per === 'an') {
      const values = new Array(12).fill(null);
      let prev = null;
      rows.forEach((r) => {
        const t = typeof r.start === 'number' ? r.start : Date.parse(r.start);
        if (r.sum === null || r.sum === undefined) return;
        if (prev !== null) {
          const d = new Date(t);
          if (d.getFullYear() === statWin.year) values[d.getMonth()] = Math.round((r.sum - prev) * 100) / 100;
        }
        prev = r.sum;
      });
      return values;
    }
    return statEnergySeries(rows, statWin.buckets, statWin.showStart, statWin.bucketMs);
  };
  const statMean = (slot) => {
    if (!statWin) return null;
    const rows = stOf(slot);
    if (!rows || !rows.length) return new Array(statWin.buckets).fill(null);
    if (per === 'an') {
      const values = new Array(12).fill(null);
      rows.forEach((r) => {
        const t = typeof r.start === 'number' ? r.start : Date.parse(r.start);
        if (r.mean === null || r.mean === undefined) return;
        const d = new Date(t);
        if (d.getFullYear() === statWin.year) values[d.getMonth()] = Math.round(r.mean * 10) / 10;
      });
      return values;
    }
    return statMeanSeries(rows, statWin.buckets, statWin.showStart, statWin.bucketMs);
  };

  /* ------------------------------------------------------- valori live */
  const nv = (slot) => (E.mapped(slot) ? E.num(slot) : null);
  const pvIn = nv('gw.pv_in');
  const pvOut = nv('gw.pv_out');
  const pCasa = nv('gw.p_casa');
  const soc = nv('gw.soc');
  const soh = nv('gw.soh');
  const pChr = nv('gw.p_chr');
  const pDis = nv('gw.p_dischr');
  const pExp = nv('gw.p_export');
  const pImp = nv('gw.p_import');
  const sarcina = nv('gw.sarcina');
  const pNominal = nv('gw.p_nominal');
  const solAzi = nv('gw.sol_azi');
  const selfAzi = nv('gw.self_azi');
  const expAzi = nv('gw.exp_azi');
  const impAzi = nv('gw.imp_azi');
  const temps = [nv('gw.t_inv'), nv('gw.t_ipm'), nv('gw.t_pvimp'), nv('gw.t_boost'), nv('gw.t_com')].filter((v) => v !== null);
  const tMax = temps.length ? Math.max.apply(null, temps) : null;
  const acPct = autoconsumPct(selfAzi, expAzi);

  const batDir = (pChr || 0) >= 1 && (pChr || 0) >= (pDis || 0) ? { sign: 1, power: pChr, word: 'Încărcare' }
    : (pDis || 0) >= 1 ? { sign: -1, power: pDis, word: 'Descărcare' }
    : { sign: 0, power: 0, word: 'Repaus' };
  const gridDir = (pExp || 0) >= 1 && (pExp || 0) >= (pImp || 0) ? { sign: 1, power: pExp, word: 'Export' }
    : (pImp || 0) >= 1 ? { sign: -1, power: pImp, word: 'Import' }
    : { sign: 0, power: 0, word: 'Echilibru' };

  const flows = {
    pv: { w: pvIn === null ? 0 : pvIn, text: fmtFlowPower(pvIn), active: (pvIn || 0) >= 1 },
    load: { w: pCasa === null ? 0 : pCasa, text: fmtFlowPower(pCasa), active: (pCasa || 0) >= 1 },
    bat: { w: batDir.power, sign: batDir.sign, text: fmtFlowPower(batDir.sign === 0 ? null : batDir.power), dirWord: batDir.word, active: batDir.sign !== 0 },
    grid: { w: gridDir.power, sign: gridDir.sign, text: fmtFlowPower(gridDir.sign === 0 ? null : gridDir.power), dirWord: gridDir.word, active: gridDir.sign !== 0 }
  };
  const flowSubs = {
    sun: '3 stringuri',
    bat: soc === null ? null : Math.round(soc) + ' %' + (soh === null ? '' : ' · SOH ' + Math.round(soh)),
    inv: sarcina === null || pNominal === null ? null : Math.round(sarcina) + ' % din ' + Math.round(pNominal / 1000) + ' kW',
    house: acPct === null ? null : 'autoconsum ' + acPct + ' %',
    grid: gridDir.word.toLowerCase()
  };

  /* ------------------------------------------------------------- delte */
  // Oră: vs acum 1h; Zi: vs ieri aceeaşi oră (istoric 48h). Statistici:
  // suma ferestrei curente vs fereastra anterioară. Lipsă -> "—".
  const deltaLive = (slot) => {
    if (per !== 'ora' && per !== 'zi') return fmtDelta(null);
    const samples = hOf(slot);
    if (!samples) return fmtDelta(null);
    const cur = nv(slot);
    const prev = valueAt(samples, now - (per === 'ora' ? H_MS : DAY_MS));
    return fmtDelta(deltaPct(cur, prev));
  };
  const deltaStat = (slot) => {
    if (!statNeeded || per === 'an' || !statWin) return fmtDelta(null);
    const rows = stOf(slot);
    if (!rows || !rows.length) return fmtDelta(null);
    const full = statEnergySeries(rows, statWin.buckets * 2, statWin.fetchStart, statWin.bucketMs);
    const prev = sumOrNull(full.slice(0, statWin.buckets));
    const cur = sumOrNull(full.slice(statWin.buckets));
    return fmtDelta(deltaPct(cur, prev));
  };

  /* ----------------------------------------------------- serii grafice */
  const liveSeries = (slot) => {
    const samples = hOf(slot);
    if (!samples) return null;
    if (per === 'ora') return hourCurve(samples, now, 12);
    const dc = dayCurve(samples, midnight, now, 96);
    return dc.lastIdx >= 0 ? dc.values : null;
  };
  const daySpark = (slot) => {
    const samples = hOf(slot);
    if (!samples) return null;
    const dc = dayCurve(samples, midnight, now, 48);
    return dc.lastIdx >= 0 ? dc.values.slice(0, dc.lastIdx + 1) : null;
  };
  const labels = useMemo(() => {
    if (per === 'ora') {
      return Array.apply(null, Array(12)).map((_, i) => (i % 3 === 0 ? hhmm(now - H_MS + (i * 5 * 60 * 1000)) : ''));
    }
    if (per === 'zi') {
      return Array.apply(null, Array(96)).map((_, i) => (i % 16 === 0 ? (i / 4 < 10 ? '0' : '') + i / 4 : ''));
    }
    if (per === 'saptamana') {
      return Array.apply(null, Array(7)).map((_, i) => RO_DAYS[new Date(midnight - (6 - i) * DAY_MS).getDay()]);
    }
    if (per === 'luna') {
      return Array.apply(null, Array(30)).map((_, i) => (i % 3 === 0 ? String(new Date(midnight - (29 - i) * DAY_MS).getDate()) : ''));
    }
    return RO_MONTHS.slice();
  }, [per, now, midnight]);

  const chartCfg = useMemo(() => {
    const live = per === 'ora' || per === 'zi';
    if (cat === 'prezentare' || cat === 'productie') {
      if (live) {
        const series = cat === 'prezentare'
          ? [{ name: 'Producţie', color: GOLD, values: liveSeries('gw.pv_in') }, { name: 'Consum', color: CYAN, values: liveSeries('gw.p_casa') }]
          : [{ name: 'Total', color: GOLD, values: liveSeries('gw.pv_in') }, { name: 'PV1', color: GOLD_HI, values: liveSeries('gw.pv1_w') }, { name: 'PV2', color: CYAN, values: liveSeries('gw.pv2_w') }, { name: 'PV3', color: GREEN, values: liveSeries('gw.pv3_w') }];
        return { title: cat === 'prezentare' ? 'Producţie vs consum' : 'Producţie pe stringuri', unit: 'W', series, zero: true };
      }
      const gen = statEnergy('gw.gen_tot');
      const exp = statEnergy('energie.stat_export');
      const imp = statEnergy('energie.stat_import');
      if (cat === 'prezentare') {
        const consum = gen.map((v, i) => (v === null || exp[i] === null || imp[i] === null ? null : Math.round((v - exp[i] + imp[i]) * 10) / 10));
        return { title: 'Producţie vs consum', unit: 'kWh', series: [{ name: 'Producţie', color: GOLD, values: gen }, { name: 'Consum', color: CYAN, values: consum }], zero: true };
      }
      return { title: 'Producţie pe stringuri', unit: 'kWh', series: [{ name: 'Total', color: GOLD, values: gen }, { name: 'PV1', color: GOLD_HI, values: statEnergy('gw.pv1_tot') }, { name: 'PV2', color: CYAN, values: statEnergy('gw.pv2_tot') }], zero: true };
    }
    if (cat === 'baterie') {
      const values = live ? liveSeries('gw.soc') : statMean('energie.stat_soc');
      return { title: 'SOC şi putere baterie', unit: '%', series: [{ name: 'SOC', color: GREEN, values: values || [] }], yMin: 0, yMax: 100 };
    }
    if (cat === 'retea') {
      if (live) {
        const e = liveSeries('gw.p_export');
        const i2 = liveSeries('gw.p_import');
        const net = e && i2 ? e.map((v, ix) => (v === null || i2[ix] === null ? null : Math.round(v - i2[ix]) )) : (e || null);
        return { title: 'Import / export', unit: 'W', series: [{ name: 'Reţea', color: GRID_O, values: net || [] }], bars: true, zero: true };
      }
      const e = statEnergy('energie.stat_export');
      const i2 = statEnergy('energie.stat_import');
      const net = e.map((v, ix) => (v === null || i2[ix] === null ? null : Math.round((v - i2[ix]) * 10) / 10));
      return { title: 'Import / export', unit: 'kWh', series: [{ name: 'Reţea', color: GRID_O, values: net }], bars: true, zero: true };
    }
    // invertor
    if (live) {
      return {
        title: 'Temperaturi', unit: '°C', fill: false,
        series: [
          { name: 'Invertor', color: GRID_O, values: liveSeries('gw.t_inv') },
          { name: 'Etaj PV', color: GOLD, values: liveSeries('gw.t_pvimp') },
          { name: 'IPM', color: GOLD_HI, values: liveSeries('gw.t_ipm') },
          { name: 'Senzor A', color: CYAN, values: liveSeries('gw.t_a') },
          { name: 'Senzor B', color: GREEN, values: liveSeries('gw.t_b') }
        ]
      };
    }
    // Statistici există doar pentru sondele cu state_class (invertor + IPM).
    return {
      title: 'Temperaturi · medii', unit: '°C', fill: false,
      series: [
        { name: 'Invertor', color: GRID_O, values: statMean('gw.t_inv') },
        { name: 'IPM', color: GOLD_HI, values: statMean('gw.t_ipm') }
      ]
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, per, hist.raw, stats.stats, now]);

  const chartSeries = (chartCfg.series || []).filter((sr) => sr.values && sr.values.some((v) => v !== null));
  const chartNode = chartSeries.length
    ? chartSvg({ w: mob ? 340 : 640, h: mob ? 168 : 218, series: chartSeries, labels, bars: chartCfg.bars, zero: chartCfg.zero, yMin: chartCfg.yMin, yMax: chartCfg.yMax, fill: chartCfg.fill })
    : null;

  /* --------------------------------------------------------------- erou */
  const hero = useMemo(() => {
    const live = per === 'ora' || per === 'zi';
    if (cat === 'baterie') {
      return {
        label: 'Stare de încărcare', fm: soc === null ? null : { v: String(Math.round(soc)), u: '%' },
        delta: deltaLive('gw.soc'),
        capPct: soc === null ? null : Math.round(soc),
        capText: nv('gw.module') === null || soc === null ? null : Math.round(nv('gw.module')) + ' module · ' + Math.round(soc) + ' % din capacitate'
      };
    }
    if (cat === 'invertor') {
      return {
        label: 'Temperatură maximă', fm: tMax === null ? null : { v: tMax.toFixed(1), u: '°C' },
        delta: deltaLive('gw.t_inv'), capPct: null, capText: null
      };
    }
    if (cat === 'retea') {
      if (live) {
        const fm = gridDir.sign === 0 ? { v: '0', u: 'W' } : fmtPow(gridDir.power);
        const pct = pvIn && gridDir.sign > 0 ? Math.round((gridDir.power / pvIn) * 1000) / 10 : null;
        return {
          label: gridDir.word + ' acum', fm, delta: deltaLive('gw.p_export'),
          capPct: pct === null ? null : Math.min(100, pct),
          capText: pct === null ? null : pct.toFixed(1) + ' % din producţia curentă'
        };
      }
      const sum = sumOrNull(statEnergy('energie.stat_export'));
      return { label: 'Export · ' + perName(per), fm: fmtEn(sum), delta: deltaStat('energie.stat_export'), capPct: null, capText: null };
    }
    // prezentare / productie
    if (live) {
      const fm = fmtPow(pvIn);
      const pct = pvIn !== null && pNominal ? Math.round((pvIn / pNominal) * 100) : null;
      return {
        label: 'Producţie acum', fm, delta: deltaLive('gw.pv_in'),
        capPct: pct, capText: pct === null ? null : (pvIn / 1000).toFixed(2) + ' din ' + Math.round(pNominal / 1000) + ' kW instalaţi · ' + pct + ' %'
      };
    }
    const sum = sumOrNull(statEnergy('gw.gen_tot'));
    return { label: 'Energie produsă · ' + perName(per), fm: fmtEn(sum), delta: deltaStat('gw.gen_tot'), capPct: null, capText: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, per, pvIn, soc, tMax, gridDir.word, gridDir.power, gridDir.sign, pNominal, hist.raw, stats.stats, now]);

  /* --------------------------------------------------------------- strip */
  const peakAzi = useMemo(() => {
    const p = peakOf(hOf('gw.pv_in'), midnight);
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hist.raw, midnight]);

  const stripCells = useMemo(() => {
    const cell = (icon, color, label, fm, delta) => ({ icon, color, label, fm, delta });
    const pc = (v) => (v === null ? null : { v: String(Math.round(v)), u: '%' });
    const en = (v) => (v === null ? null : fmtEn(v));
    if (cat === 'prezentare') return [
      cell('home', CYAN, 'Consum casă', fmtPow(pCasa), deltaLive('gw.p_casa')),
      cell('batteryCharging', GREEN, 'Baterie', pc(soc), deltaLive('gw.soc')),
      cell('utilityPole', GRID_O, 'Reţea', gridDir.sign === 0 ? { v: '0', u: 'W' } : fmtPow(gridDir.power), deltaLive('gw.p_export')),
      cell('leaf', GREEN, 'Autoconsum', pc(acPct), fmtDelta(null))
    ];
    if (cat === 'productie') return [
      cell('bolt', GOLD_HI, 'După conversie', fmtPow(pvOut), deltaLive('gw.pv_in')),
      cell('trend', GOLD, 'Energie azi', en(solAzi), deltaLive('gw.sol_azi')),
      cell('sun', GOLD, 'Vârf azi', peakAzi ? fmtPow(peakAzi.v) : null, fmtDelta(null)),
      cell('gauge', CYAN, 'Grad încărcare', pc(sarcina), fmtDelta(null))
    ];
    if (cat === 'baterie') return [
      cell('bolt', GOLD, batDir.word, batDir.sign === 0 ? { v: '0', u: 'W' } : fmtPow(batDir.power), fmtDelta(null)),
      cell('trend', GREEN, 'Încărcat azi', en(nv('gw.echr_azi')), deltaLive('gw.echr_azi')),
      cell('leaf', GREEN, 'SOH', pc(soh), fmtDelta(null)),
      cell('thermo', GRID_O, 'Temp. pachet', nv('gw.bat_temp') === null ? null : { v: nv('gw.bat_temp').toFixed(1), u: '°C' }, fmtDelta(null))
    ];
    if (cat === 'retea') return [
      cell('trend', GRID_O, 'Export azi', en(expAzi), deltaLive('gw.exp_azi')),
      cell('plug', CYAN, 'Import azi', en(impAzi), deltaLive('gw.imp_azi')),
      cell('leaf', GREEN, 'Autoconsum', pc(acPct), fmtDelta(null)),
      cell('home', CYAN, 'Consum casă', fmtPow(pCasa), deltaLive('gw.p_casa'))
    ];
    return [
      cell('gauge', GOLD, 'Grad încărcare', pc(sarcina), fmtDelta(null)),
      cell('bolt', GOLD_HI, 'Bus DC', nv('gw.v_bus') === null ? null : { v: String(Math.round(nv('gw.v_bus'))), u: 'V' }, fmtDelta(null)),
      cell('clock', CYAN, 'Funcţionare', nv('gw.ore') === null ? null : { v: String(Math.round(nv('gw.ore'))), u: 'h' }, fmtDelta(null)),
      cell('thermo', GRID_O, 'Temp. maximă', tMax === null ? null : { v: tMax.toFixed(1), u: '°C' }, deltaLive('gw.t_inv'))
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, per, pCasa, soc, acPct, pvOut, solAzi, sarcina, soh, expAzi, impAzi, tMax, peakAzi, hist.raw, gridDir.sign, gridDir.power, batDir.word, batDir.sign, batDir.power]);

  /* ------------------------------------------------------- nav (valori) */
  const navValue = (key) => {
    if (key === 'prezentare') { const f = fmtPow(pvIn); return f ? f.v + ' ' + f.u : '—'; }
    if (key === 'productie') { const f2 = fmtEn(solAzi); return f2 ? f2.v + ' ' + f2.u + ' azi' : '—'; }
    if (key === 'baterie') return soc === null ? '—' : Math.round(soc) + ' %';
    if (key === 'retea') return gridDir.sign === 0 ? 'echilibru' : gridDir.word.toLowerCase() + ' ' + fmtFlowPower(gridDir.power);
    return tMax === null ? '—' : tMax.toFixed(1) + ' °C';
  };

  /* ---------------------------------------------- grafică per categorie */
  const sigW = mob ? 340 : desk ? 640 : 700;
  const sig = useMemo(() => {
    if (cat === 'prezentare') return { title: 'Arcul zilei', hint: 'grosimea urmăreşte producţia · linia interioară e consumul', node: dayArcSvg(sigW, buildArcData()) };
    if (cat === 'productie') return { title: 'Spectrul stringurilor', hint: 'putere acum vs vârful zilei · cotă din energia zilei', node: stringSpectrumSvg(sigW, buildStringData()) };
    if (cat === 'baterie') return { title: 'Pachet APX', hint: '4 module · încărcare, descărcare şi echilibru celule', node: batteryStackSvg(sigW, buildBatteryData()) };
    if (cat === 'retea') return { title: 'Unde merge energia', hint: 'repartiţia puterii produse în acest moment', node: gridSankeySvg(sigW, buildSankeyData()) };
    return { title: 'Harta termică', hint: 'sondele de temperatură ale invertorului', node: tempBarsSvg(sigW, buildTempData()) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, sigW, hist.raw, now, pvIn, pCasa, soc]);

  function buildArcData() {
    // Răsăritul/apusul din sun.sun (atribute LIVE — istoricul nu redă atribute).
    // next_rising e al zilei de mâine după răsărit -> răsăritul de azi ≈ −24h.
    const riseAttr = E.mapped('energie.soare') ? E.attr('energie.soare', 'next_rising') : null;
    const setAttr = E.mapped('energie.soare') ? E.attr('energie.soare', 'next_setting') : null;
    let sunrise = null;
    let sunset = null;
    if (riseAttr) {
      let t = Date.parse(riseAttr);
      if (t > midnight + DAY_MS) t -= DAY_MS;
      sunrise = t;
    }
    if (setAttr) {
      let t2 = Date.parse(setAttr);
      if (t2 > midnight + DAY_MS) t2 -= DAY_MS;
      sunset = t2;
    }
    const pvDc = dayCurve(hOf('gw.pv_in') || [], midnight, now, 96);
    const loadDc = dayCurve(hOf('gw.p_casa') || [], midnight, now, 96);
    return {
      sunrise, sunset, now,
      midnight,
      pv: pvDc.lastIdx >= 0 ? pvDc.values : null,
      load: loadDc.lastIdx >= 0 ? loadDc.values : null,
      solAzi
    };
  }
  function buildStringData() {
    const mk = (n, wSlot, vSlot, aSlot, aziSlot) => {
      const w2 = nv(wSlot);
      const p = peakOf(hOf(wSlot), midnight);
      return { n, w: w2, v: nv(vSlot), a: nv(aSlot), azi: nv(aziSlot), peak: p ? p.v : null };
    };
    return {
      total: solAzi,
      strings: [
        Object.assign(mk('PV1', 'gw.pv1_w', 'gw.pv1_v', 'gw.pv1_a', 'gw.pv1_azi'), { color: GOLD }),
        Object.assign(mk('PV2', 'gw.pv2_w', 'gw.pv2_v', 'gw.pv2_a', 'gw.pv2_azi'), { color: GOLD_HI }),
        Object.assign(mk('PV3', 'gw.pv3_w', 'gw.pv3_v', 'gw.pv3_a', 'gw.pv3_azi'), { color: '#D98A3C' }),
        Object.assign(mk('PV4', 'gw.pv4_w', 'gw.pv4_v', 'gw.pv4_a', 'gw.pv4_azi'), { color: 'rgba(255,255,255,0.14)', missing: true })
      ]
    };
  }
  function buildBatteryData() {
    const cmax = nv('gw.cel_v_max');
    const cmin = nv('gw.cel_v_min');
    return {
      soc, dir: batDir,
      echrAzi: nv('gw.echr_azi'), edisAzi: nv('gw.edis_azi'), module: nv('gw.module'),
      celMax: cmax, celMin: cmin,
      dez: cmax !== null && cmin !== null ? Math.round(cmax - cmin) : null
    };
  }
  function buildSankeyData() {
    // Formula APROBATĂ (cu corecţie): PV→casă = pv_out − export − încărcare.
    const lanes = sankeyLanes(pvOut, pExp, pChr, pDis);
    return { lanes, acPct, pvIn };
  }
  function buildTempData() {
    return [
      ['Invertor', nv('gw.t_inv')], ['Boost', nv('gw.t_boost')], ['Etaj PV', nv('gw.t_pvimp')],
      ['IPM', nv('gw.t_ipm')], ['Comunicaţie', nv('gw.t_com')], ['Senzor A', nv('gw.t_a')], ['Senzor B', nv('gw.t_b')]
    ];
  }

  /* -------------------------------------------------------- bilanţ azi */
  const readouts = useMemo(() => {
    const row = (label, valText, sparkSlot, color) => ({ label, val: valText === null ? '—' : valText, spark: sparkSlot ? daySpark(sparkSlot) : null, color });
    const enT = (v) => { const f = fmtEn(v); return f ? f.v + ' ' + f.u : null; };
    const pwT = (v) => { const f = fmtPow(v); return f ? f.v + ' ' + f.u : null; };
    if (cat === 'prezentare') {
      const consum = consumCasaAzi(selfAzi, impAzi);
      const ciclat = nv('gw.echr_azi') !== null && nv('gw.edis_azi') !== null ? nv('gw.echr_azi') + nv('gw.edis_azi') : null;
      return { title: 'Bilanţ azi', rows: [
        row('Energie solară', enT(solAzi), 'gw.sol_azi', GOLD),
        row('Consum casă', enT(consum), 'gw.self_azi', CYAN),
        row('Autoconsum', enT(selfAzi), 'gw.self_azi', GREEN),
        row('Export', enT(expAzi), 'gw.exp_azi', GRID_O),
        row('Import', enT(impAzi), 'gw.imp_azi', CYAN),
        row('Baterie ciclat', enT(ciclat), 'gw.echr_azi', GREEN)
      ] };
    }
    if (cat === 'productie') return { title: 'Stringuri acum', rows: [
      row('String PV1', pwT(nv('gw.pv1_w')), 'gw.pv1_w', GOLD),
      row('String PV2', pwT(nv('gw.pv2_w')), 'gw.pv2_w', GOLD_HI),
      row('String PV3', pwT(nv('gw.pv3_w')), 'gw.pv3_w', '#D98A3C'),
      row('Putere DC totală', pwT(pvIn), 'gw.pv_in', GOLD),
      row('După conversie', pwT(pvOut), 'gw.pv_in', GOLD_HI),
      row('Generat total', enT(nv('gw.gen_tot')), null, GREEN)
    ] };
    if (cat === 'baterie') return { title: 'Pachet APX', rows: [
      row('SOC', soc === null ? null : Math.round(soc) + ' %', 'gw.soc', GREEN),
      row('Putere', batDir.sign === 0 ? '0 W' : (batDir.sign > 0 ? '+' : '−') + fmtFlowPower(batDir.power), 'gw.p_chr', GOLD),
      row('Temp. pachet', nv('gw.bat_temp') === null ? null : nv('gw.bat_temp').toFixed(1) + ' °C', null, GRID_O),
      row('Temp. medie celule', nv('gw.bat_temp_med') === null ? null : nv('gw.bat_temp_med').toFixed(1) + ' °C', null, CYAN),
      row('Încărcat total', enT(nv('gw.echr_tot')), null, GREEN),
      row('Descărcat total', enT(nv('gw.edis_tot')), null, CYAN)
    ] };
    if (cat === 'retea') {
      const ratio = exportImportRatio(nv('gw.exp_tot'), nv('gw.imp_tot'));
      return { title: 'Schimb cumulat', rows: [
        row('Export azi', enT(expAzi), 'gw.exp_azi', GRID_O),
        row('Import azi', enT(impAzi), 'gw.imp_azi', CYAN),
        row('Export total', enT(nv('gw.exp_tot')), null, GRID_O),
        row('Import total', enT(nv('gw.imp_tot')), null, CYAN),
        row('Autoconsum total', enT(nv('gw.self_tot')), null, GREEN),
        row('Raport export/import', ratio === null ? '—' : String(ratio), null, TXT2)
      ] };
    }
    return { title: 'Sistem', rows: [
      row('Bus DC', nv('gw.v_bus') === null ? null : Math.round(nv('gw.v_bus')) + ' V', 'gw.t_inv', GOLD),
      row('Grad încărcare', sarcina === null ? null : Math.round(sarcina) + ' %', 'gw.pv_in', GOLD_HI),
      row('Factor de putere', nv('gw.pf') === null ? null : (nv('gw.pf') / 1000).toFixed(2), null, GREEN),
      row('Scurgere GFCI', nv('gw.gfci') === null ? null : Math.round(nv('gw.gfci')) + ' mA', null, CYAN),
      row('Ore funcţionare', nv('gw.ore') === null ? null : Math.round(nv('gw.ore')) + ' h', null, TXT2),
      row('Încărcare din AC', enT(nv('gw.eac_chr_tot')), null, CYAN)
    ] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, hist.raw, now, solAzi, selfAzi, expAzi, impAzi, soc, pvIn, pvOut, sarcina, batDir.sign, batDir.power]);

  /* ------------------------------------------------------------- stiluri */
  const hairCard = (padStr) =>
    'background:linear-gradient(160deg, rgba(255,255,255,0.038) 0%, rgba(255,255,255,0.012) 55%, rgba(255,255,255,0.004) 100%); border:1px solid ' + HAIR + '; border-radius:18px; padding:' + padStr + '; box-shadow:inset 0 1px 0 rgba(255,255,255,0.05);';

  const tipFor = (key, ctx, label, fallback) => {
    const d = describe(ctx, label) || fallback;
    if (!d) return { handlers: {}, tip: null };
    return {
      handlers: {
        onMouseEnter: () => setHover(key),
        onMouseLeave: () => setHover(null),
        ...pressProps(() => setHover(key), () => setHover(null), () => {})
      },
      tip: hover === key ? <Tip text={d} /> : null
    };
  };

  const pushText = E.mapped('gw.push') ? E.fmt('gw.push', { time: true }) : null;
  const statLoading = statNeeded && stats.loading;
  const chartEmptyText = statNeeded
    ? (statLoading ? 'se încarcă statisticile…' : 'fără statistici pe această perioadă încă — se completează singure pe măsură ce se acumulează')
    : (hist.loading ? 'se încarcă istoricul…' : 'fără date în recorder pe această perioadă');

  const heroDeltaColor = hero.delta.dir > 0 ? GREEN : hero.delta.dir < 0 ? '#E2734A' : TXT2;

  /* ------------------------------------------------------------- render */
  return (
    <div style={{ minWidth: 0 }}>
      {/* bara de sus: live + selector de perioadă */}
      <div style={s('display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:14px;')}>
        <div style={s('display:flex; align-items:center; gap:7px; min-width:0;')}>
          <span style={s('width:6px; height:6px; border-radius:50%; background:' + GREEN + '; box-shadow:0 0 8px ' + GREEN + ';')} />
          <span style={s('font-family:' + SANS + '; font-size:10.5px; font-weight:300; color:' + TXT3 + ';')}>
            {pushText ? 'live · pachet ' + pushText : 'live'}
          </span>
        </div>
        <div style={s('display:flex; gap:2px; padding:3px; border-radius:11px; background:rgba(255,255,255,0.035); border:1px solid ' + HAIR2 + '; margin-left:auto;' + (mob ? ' width:100%;' : ''))}>
          {PERIODS.map((p) => {
            const on = p[0] === per;
            return (
              <div key={p[0]} className="hdTapY"
                style={s('min-width:44px; box-sizing:border-box; padding:' + (mob ? '7px 0' : '7px 14px') + '; border-radius:8px; cursor:pointer; text-align:center; font-family:' + SANS + '; font-size:11.5px; font-weight:' + (on ? 600 : 400) + '; color:' + (on ? '#2a1403' : TXT2) + '; background:' + (on ? 'linear-gradient(150deg,#FFC46B,#EE9A24)' : 'transparent') + ';' + (mob ? ' flex:1;' : ''))}
                onClick={() => setPer(p[0])}>
                {p[1]}
              </div>
            );
          })}
        </div>
      </div>

      {/* scena-erou: KPI + diagrama de flux */}
      <div style={s('position:relative; overflow:hidden; border-radius:18px; border:1px solid rgba(255,255,255,0.065); background:radial-gradient(90% 130% at 18% 6%, rgba(240,160,44,0.14) 0%, rgba(240,160,44,0.03) 42%, rgba(0,0,0,0) 72%), linear-gradient(170deg, #17100a 0%, #0d0906 60%, #0a0705 100%); box-shadow:inset 0 1px 0 rgba(255,255,255,0.06); margin-bottom:14px;')}>
        <div style={s('display:' + (desk ? 'grid' : 'flex') + ';' + (desk ? ' grid-template-columns:minmax(0,320px) minmax(0,1fr);' : ' flex-direction:column;') + ' gap:' + (mob ? '6px' : '18px') + '; padding:' + (mob ? '18px 16px 8px' : '26px 28px 10px') + ';')}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0, position: 'relative' }}
            {...tipFor('hero', 'Energie', hero.label, hero.label + ' — valoarea principală a categoriei curente.').handlers}>
            <div style={s(scaps(mob ? 9.5 : 10.5, TXT2))}>{hero.label}</div>
            <div style={s('display:flex; align-items:baseline; gap:10px; margin-top:' + (mob ? '6px' : '10px') + ';')}>
              <span style={s('font-family:' + DOTO + '; font-size:' + (mob ? 58 : desk ? 88 : 76) + 'px; font-weight:700; line-height:0.9; color:' + TXT + '; text-shadow:0 0 44px rgba(240,160,44,0.35);')}>
                {hero.fm ? <Roll text={hero.fm.v} anim={anim} /> : '—'}
              </span>
              {hero.fm ? <span style={s('font-family:' + SANS + '; font-size:' + (mob ? 15 : 19) + 'px; font-weight:400; color:' + GOLD + ';')}>{hero.fm.u}</span> : null}
            </div>
            <div style={s('display:flex; align-items:center; gap:9px; margin-top:' + (mob ? '10px' : '14px') + ';')}>
              <span style={s('font-family:' + SANS + '; font-size:12px; font-weight:500; color:' + heroDeltaColor + '; padding:3px 9px; border-radius:7px; background:rgba(255,255,255,0.05); border:1px solid ' + HAIR + '; font-variant-numeric:tabular-nums;')}>{hero.delta.txt}</span>
              <span style={s('font-family:' + SANS + '; font-size:11px; font-weight:300; color:' + TXT3 + ';')}>{PREV_LABEL[per]}</span>
            </div>
            {hero.capPct !== null && hero.capText ? (
              <div style={{ marginTop: mob ? 12 : 20, maxWidth: 300 }}>
                <div style={s('height:4px; border-radius:100px; background:rgba(255,255,255,0.08); overflow:hidden;')}>
                  <div style={s('height:100%; width:' + Math.max(2, Math.min(100, hero.capPct)) + '%; border-radius:100px; background:linear-gradient(90deg,#8a4a12,' + GOLD + ',' + GOLD_HI + '); box-shadow:0 0 14px rgba(240,160,44,0.6);')} />
                </div>
                <div style={s('font-family:' + SANS + '; font-size:10px; font-weight:300; color:' + TXT3 + '; margin-top:7px;')}>{hero.capText}</div>
              </div>
            ) : null}
            {tipFor('hero', 'Energie', hero.label, hero.label + ' — valoarea principală a categoriei curente.').tip}
          </div>
          <FlowDiagram flows={flows} anim={anim} layout={mob ? 'v' : 'h'} subs={flowSubs} />
        </div>

        {/* strip: 4 KPI secundare */}
        <div style={s('display:grid; grid-template-columns:repeat(' + (mob ? 2 : 4) + ',minmax(0,1fr)); border-top:1px solid ' + HAIR2 + '; background:rgba(0,0,0,0.25);')}>
          {stripCells.map((c, i) => {
            const t = tipFor('strip' + i, 'Energie', c.label, null);
            return (
              <div key={i} style={s('position:relative; padding:' + (mob ? '12px 14px' : '15px 20px') + '; min-width:0;' + (i > 0 && !(mob && i % 2 === 0) ? ' border-left:1px solid ' + HAIR2 + ';' : '') + (mob && i > 1 ? ' border-top:1px solid ' + HAIR2 + ';' : ''))} {...t.handlers}>
                <div style={s('display:flex; align-items:center; gap:7px; ' + scaps(mob ? 9 : 9.5, TXT3, 0.11))}>
                  <span style={{ display: 'flex', color: c.color }}>{icEl(c.icon, 13, c.color)}</span>{c.label}
                </div>
                <div style={s('display:flex; align-items:baseline; gap:6px; margin-top:7px; min-width:0;')}>
                  <span style={s('font-family:' + DOTO + '; font-size:' + (mob ? 21 : 25) + 'px; font-weight:600; color:' + (c.fm ? TXT : TXT3) + ';')}>{c.fm ? c.fm.v : '—'}</span>
                  {c.fm ? <span style={s('font-family:' + SANS + '; font-size:' + (mob ? 10 : 11) + 'px; font-weight:400; color:' + c.color + ';')}>{c.fm.u}</span> : null}
                  <span style={s('font-family:' + SANS + '; font-size:10px; font-weight:400; color:' + (c.delta.dir > 0 ? GREEN : c.delta.dir < 0 ? '#E2734A' : TXT3) + '; margin-left:auto; white-space:nowrap; font-variant-numeric:tabular-nums;')}>{c.delta.txt}</span>
                </div>
                {t.tip}
              </div>
            );
          })}
        </div>
      </div>

      {/* navigaţia pe categorii */}
      <div style={s('display:flex; gap:6px; margin-bottom:14px;' + (desk ? '' : ' overflow-x:auto; padding-bottom:2px;'))}>
        {CATS.map((n) => {
          const on = n[0] === cat;
          return (
            <div key={n[0]}
              style={s('position:relative; padding:' + (mob ? '10px 12px 12px' : '12px 20px 14px') + '; border-radius:13px; cursor:pointer; flex-shrink:0; min-width:' + (mob ? 'auto' : '128px') + '; background:' + (on ? 'linear-gradient(170deg, rgba(240,160,44,0.16), rgba(240,160,44,0.03))' : 'rgba(255,255,255,0.022)') + '; border:1px solid ' + (on ? 'rgba(240,160,44,0.4)' : HAIR2) + ';')}
              onClick={() => setCat(n[0])}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'flex' }}>{icEl(n[2], mob ? 14 : 15, on ? GOLD_HI : TXT3)}</span>
                <span style={s('font-family:' + SANS + '; font-size:' + (mob ? 12 : 13) + 'px; font-weight:' + (on ? 500 : 400) + '; color:' + (on ? TXT : TXT2) + '; white-space:nowrap;')}>{n[1]}</span>
              </div>
              <div style={s('font-family:' + SANS + '; font-size:' + (mob ? 10 : 11) + 'px; font-weight:300; color:' + (on ? GOLD : TXT3) + '; margin-top:5px; white-space:nowrap; font-variant-numeric:tabular-nums;')}>{navValue(n[0])}</div>
              {on ? <div style={s('position:absolute; left:20px; right:20px; bottom:0; height:2px; border-radius:2px; background:linear-gradient(90deg,' + GOLD + ',' + GOLD_HI + '); box-shadow:0 0 12px rgba(255,196,107,0.8);')} /> : null}
            </div>
          );
        })}
      </div>

      {/* corp: grafica de semnătură + graficul de perioadă | Bilanţ azi */}
      <div style={s('display:' + (desk ? 'grid' : 'flex') + ';' + (desk ? ' grid-template-columns:minmax(0,1fr) 340px;' : ' flex-direction:column;') + ' gap:' + (mob ? '14px' : '22px') + '; align-items:start;')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: mob ? 14 : 22, minWidth: 0 }}>
          <div style={s(hairCard(mob ? '14px 13px 12px' : '20px 18px 16px'))}>
            <div style={s('display:flex; align-items:baseline; justify-content:space-between; gap:12px; margin-bottom:10px; flex-wrap:wrap;')}>
              <span style={s('font-family:' + SERIF + '; font-size:' + (mob ? 17 : 20) + 'px; font-weight:500; color:' + TXT + ';')}>{sig.title}</span>
              <span style={s('font-family:' + SANS + '; font-size:' + (mob ? 10 : 11) + 'px; font-weight:300; color:' + TXT3 + ';')}>{sig.hint}</span>
            </div>
            {sig.node}
          </div>

          <div style={s(hairCard(mob ? '14px 13px 10px' : '18px 18px 12px'))}>
            <div style={s('display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:12px; flex-wrap:wrap;')}>
              <span style={s(scaps(10.5, '#c9bcac', 0.11))}>{chartCfg.title}</span>
              <div style={s('display:flex; flex-wrap:wrap; gap:14px;')}>
                {chartSeries.map((sr, i) => {
                  const lastV = [...sr.values].reverse().find((v) => v !== null);
                  return (
                    <div key={i} style={s('display:flex; align-items:center; gap:6px;')}>
                      <span style={s('width:7px; height:7px; border-radius:50%; flex-shrink:0; background:' + sr.color + '; box-shadow:0 0 9px ' + sr.color + ';')} />
                      <span style={s('font-family:' + SANS + '; font-size:10.5px; font-weight:300; color:' + TXT2 + ';')}>{sr.name}</span>
                      <span style={s('font-family:' + SANS + '; font-size:11px; font-weight:400; color:' + TXT + '; font-variant-numeric:tabular-nums;')}>{lastV === undefined ? '—' : lastV + ' ' + chartCfg.unit}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {chartNode || (
              <div style={s('padding:34px 16px; text-align:center; border-radius:14px; font-family:' + SANS + '; font-size:11.5px; font-weight:300; color:' + TXT3 + '; background:repeating-linear-gradient(135deg, rgba(255,255,255,0.02) 0 8px, transparent 8px 16px); border:1px dashed rgba(255,255,255,0.11);')}>
                {chartEmptyText}
              </div>
            )}
          </div>
        </div>

        {/* rail: doar Bilanţ azi — panoul "Ce se întâmplă acum" vine în v1.1.6 */}
        <div style={s(hairCard(mob ? '14px 14px 8px' : '18px 18px 10px') + (desk ? '' : ' width:100%;'))}>
          <div style={s(scaps(10, TXT3, 0.14) + ' padding-bottom:10px; border-bottom:1px solid ' + HAIR + '; margin-bottom:4px;')}>{readouts.title}</div>
          {readouts.rows.map((r, i) => {
            const t = tipFor('ro' + i, readouts.title, r.label, null);
            return (
              <div key={i} style={s('position:relative; display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid ' + HAIR2 + ';')} {...t.handlers}>
                <span style={s('font-family:' + SANS + '; font-size:11.5px; font-weight:300; color:' + TXT2 + '; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1;')}>{r.label}</span>
                <span style={{ display: 'flex', flexShrink: 0, opacity: 0.9 }}>{r.spark ? sparkSvg(r.spark, r.color, mob ? 44 : 62, 16) : null}</span>
                <span style={s('font-family:' + SANS + '; font-size:12px; font-weight:400; color:' + (r.val === '—' ? TXT3 : TXT) + '; flex-shrink:0; min-width:74px; text-align:right; font-variant-numeric:tabular-nums;')}>{r.val}</span>
                {t.tip}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function perName(per) {
  return { saptamana: 'săptămâna curentă', luna: 'luna curentă', an: 'anul curent' }[per] || per;
}

/* --------------------------------------------- grafica de semnătură (SVG) */
function dayArcSvg(w, d) {
  const h = Math.max(212, Math.round(w * 0.33)), cx = w / 2, cy = h - 30, R = Math.min(w * 0.36, h - 66);
  const g = [];
  const haveSun = d.sunrise !== null && d.sunset !== null && d.sunset > d.sunrise;
  const riseH = haveSun ? (d.sunrise - d.midnight) / H_MS : 6;
  const setH = haveSun ? (d.sunset - d.midnight) / H_MS : 21;
  const nowH = (d.now - d.midnight) / H_MS;
  const ang = (hour) => Math.PI - ((hour - riseH) / (setH - riseH)) * Math.PI;
  const pt = (a, rad) => [cx + Math.cos(a) * rad, cy - Math.sin(a) * rad];

  for (let t = Math.ceil(riseH); t <= Math.floor(setH); t += 2) {
    const a = ang(t), p0 = pt(a, R - 8), p1 = pt(a, R + 8);
    g.push(el('line', { key: 'tk' + t, x1: p0[0], y1: p0[1], x2: p1[0], y2: p1[1], stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }));
    const lp = pt(a, R + 22);
    g.push(el('text', { key: 'tl' + t, x: lp[0], y: lp[1] + 3.5, textAnchor: 'middle', style: { fontFamily: SANS, fontSize: '9.5px', fontWeight: 300, fill: TXT3 } }, (t < 10 ? '0' : '') + t));
  }
  const track = 'M' + pt(Math.PI, R)[0].toFixed(1) + ' ' + pt(Math.PI, R)[1].toFixed(1) + ' A' + R + ' ' + R + ' 0 0 1 ' + pt(0, R)[0].toFixed(1) + ' ' + pt(0, R)[1].toFixed(1);
  g.push(el('path', { key: 'trk', d: track, fill: 'none', stroke: 'rgba(255,255,255,0.07)', strokeWidth: 1.2 }));

  // banda de producţie: grosimea urmăreşte puterea PV pe coşuri orare
  if (d.pv) {
    const present = d.pv.filter((v) => v !== null);
    const maxPv = present.length ? Math.max.apply(null, present.concat([1000])) : 1000;
    let outer = '';
    let inner = '';
    let started = false;
    for (let i = 0; i < 96; i++) {
      const hr = i / 4;
      if (hr < riseH || hr > Math.min(nowH, setH)) continue;
      const v = d.pv[i];
      if (v === null) continue;
      const aa = ang(hr), th = 3 + (v / maxPv) * (R > 200 ? 26 : 15);
      const o = pt(aa, R + th / 2), n2 = pt(aa, R - th / 2);
      outer += (started ? ' L' : 'M') + o[0].toFixed(1) + ' ' + o[1].toFixed(1);
      inner = ' L' + n2[0].toFixed(1) + ' ' + n2[1].toFixed(1) + inner;
      started = true;
    }
    if (started) {
      g.push(el('path', { key: 'band', d: outer + inner + ' Z', fill: 'url(#eag)', opacity: 0.95 }));
    }
  }
  // linia interioară: consumul
  if (d.load) {
    const presentL = d.load.filter((v) => v !== null);
    const maxL = presentL.length ? Math.max.apply(null, presentL.concat([1000])) : 1000;
    let lp2 = '';
    let started2 = false;
    for (let j = 0; j < 96; j++) {
      const hr = j / 4;
      if (hr > nowH) break;
      const v = d.load[j];
      if (v === null) { started2 = false; continue; }
      const a2 = ang(Math.max(riseH, Math.min(setH, hr)));
      const rr = R - (R > 200 ? 34 : 22) - (v / maxL) * (R > 200 ? 26 : 16);
      lp2 += (started2 ? ' L' : (lp2 ? ' M' : 'M')) + pt(a2, rr)[0].toFixed(1) + ' ' + pt(a2, rr)[1].toFixed(1);
      started2 = true;
    }
    if (lp2) g.push(el('path', { key: 'load', d: lp2, fill: 'none', stroke: CYAN, strokeWidth: 1.6, opacity: 0.85, strokeLinecap: 'round' }));
  }
  // marcajul "acum"
  if (nowH >= riseH && nowH <= setH) {
    const na = ang(nowH), np = pt(na, R);
    g.push(el('line', { key: 'nowl', x1: pt(na, R - 40)[0], y1: pt(na, R - 40)[1], x2: pt(na, R + 26)[0], y2: pt(na, R + 26)[1], stroke: GOLD_HI, strokeWidth: 1, opacity: 0.5 }));
    g.push(el('circle', { key: 'nowg', cx: np[0], cy: np[1], r: 11, fill: GOLD_HI, opacity: 0.22 }));
    g.push(el('circle', { key: 'now', cx: np[0], cy: np[1], r: 4.4, fill: GOLD_HI }));
  }

  const big = R > 200;
  const solTxt = d.solAzi === null ? '—' : (Math.abs(d.solAzi) < 10 ? d.solAzi.toFixed(1) : String(Math.round(d.solAzi)));
  g.push(el('text', { key: 'c1', x: cx, y: cy - (big ? 48 : 40), textAnchor: 'middle', style: { fontFamily: SANS, fontSize: (big ? 10 : 9) + 'px', fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase', fill: TXT3 } }, 'energie solară azi'));
  g.push(el('text', { key: 'c2', x: cx - (big ? 14 : 12), y: cy - (big ? 12 : 12), textAnchor: 'middle', style: { fontFamily: DOTO, fontSize: (big ? 44 : 32) + 'px', fontWeight: 600, fill: TXT } }, solTxt));
  g.push(el('text', { key: 'c3', x: cx + (big ? 46 : 34), y: cy - (big ? 12 : 12), textAnchor: 'start', style: { fontFamily: SANS, fontSize: (big ? 13 : 11) + 'px', fontWeight: 400, fill: GOLD } }, d.solAzi === null ? '' : 'kWh'));
  const subTxt = haveSun
    ? 'răsărit ' + hhmm(d.sunrise) + ' · apus ' + hhmm(d.sunset) + ' · acum ' + hhmm(d.now)
    : 'acum ' + hhmm(d.now);
  g.push(el('text', { key: 'c4', x: cx, y: cy + (big ? 10 : 8), textAnchor: 'middle', style: { fontFamily: SANS, fontSize: (big ? 11 : 9.5) + 'px', fontWeight: 300, fill: TXT2 } }, subTxt));
  if (haveSun) {
    g.push(el('text', { key: 'sr', x: pt(Math.PI, R)[0], y: cy + 18, textAnchor: 'start', style: { fontFamily: SANS, fontSize: '9.5px', fontWeight: 300, fill: TXT3 } }, hhmm(d.sunrise)));
    g.push(el('text', { key: 'ss', x: pt(0, R)[0], y: cy + 18, textAnchor: 'end', style: { fontFamily: SANS, fontSize: '9.5px', fontWeight: 300, fill: TXT3 } }, hhmm(d.sunset)));
  }

  return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', height: h, style: { display: 'block' } }, [
    el('defs', { key: 'd' }, el('linearGradient', { key: 'g', id: 'eag', x1: '0', y1: '1', x2: '1', y2: '0' }, [
      el('stop', { key: 1, offset: '0%', stopColor: '#8a4a12' }),
      el('stop', { key: 2, offset: '55%', stopColor: GOLD }),
      el('stop', { key: 3, offset: '100%', stopColor: GOLD_HI })
    ]))
  ].concat(g));
}

function stringSpectrumSvg(w, d) {
  const h = 268, colW = (w - 40) / 4, top = 44, bh = 150, g = [];
  const kws = d.strings.map((st) => (st.w === null ? 0 : st.w / 1000));
  const NOM = Math.max(1, Math.max.apply(null, kws.concat([1])) * 1.15);
  d.strings.forEach((st, i) => {
    const x = 20 + colW * i + colW / 2, bw = Math.min(58, colW * 0.46);
    const kw = st.w === null ? null : st.w / 1000;
    const missing = st.missing || kw === null;
    const dim = missing ? 0.55 : 1;
    g.push(el('rect', { key: 'tr' + i, x: x - bw / 2, y: top, width: bw, height: bh, rx: 9, fill: 'rgba(255,255,255,0.028)', stroke: HAIR2, strokeWidth: 1, opacity: dim }));
    if (kw !== null && kw > 0.001) {
      const fh = (kw / NOM) * bh, py = top + bh - fh;
      g.push(el('rect', { key: 'fl' + i, x: x - bw / 2, y: py, width: bw, height: fh, rx: 9, fill: 'url(#esg' + i + ')' }));
      if (st.peak !== null && st.peak > 0) {
        const pk = top + bh - (st.peak / 1000 / NOM) * bh;
        g.push(el('line', { key: 'pk' + i, x1: x - bw / 2 - 5, y1: pk, x2: x + bw / 2 + 5, y2: pk, stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1, strokeDasharray: '3 3' }));
        g.push(el('text', { key: 'pt' + i, x: x + bw / 2 + 8, y: pk + 3.4, style: { fontFamily: SANS, fontSize: '9px', fontWeight: 300, fill: TXT3 } }, 'vârf ' + (st.peak / 1000).toFixed(1)));
      }
    }
    g.push(el('text', { key: 'v' + i, x, y: top - 20, textAnchor: 'middle', opacity: dim, style: { fontFamily: DOTO, fontSize: '26px', fontWeight: 600, fill: kw ? TXT : TXT3 } }, kw === null ? '—' : kw.toFixed(2)));
    g.push(el('text', { key: 'u' + i, x, y: top - 6, textAnchor: 'middle', opacity: dim, style: { fontFamily: SANS, fontSize: '9.5px', fontWeight: 400, letterSpacing: '0.1em', fill: kw ? st.color : TXT3 } }, 'kW'));
    g.push(el('text', { key: 'n' + i, x, y: top + bh + 22, textAnchor: 'middle', opacity: dim, style: { fontFamily: SANS, fontSize: '12.5px', fontWeight: 500, fill: kw ? TXT : TXT3 } }, st.n));
    const aziTxt = st.missing ? 'string inexistent' : st.azi === null ? '—' : st.azi.toFixed(1) + ' kWh azi';
    g.push(el('text', { key: 'd' + i, x, y: top + bh + 39, textAnchor: 'middle', opacity: dim, style: { fontFamily: SANS, fontSize: '10px', fontWeight: 300, fill: TXT3 } }, aziTxt));
    const share = !st.missing && st.azi !== null && d.total ? Math.round((st.azi / d.total) * 100) + ' %' : '—';
    g.push(el('text', { key: 's' + i, x, y: top + bh + 55, textAnchor: 'middle', opacity: dim, style: { fontFamily: SANS, fontSize: '10px', fontWeight: 300, fill: st.missing ? TXT3 : st.color } }, share));
  });
  return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', height: h, style: { display: 'block' } }, [
    el('defs', { key: 'd' }, d.strings.map((st, i) =>
      el('linearGradient', { key: 'g' + i, id: 'esg' + i, x1: '0', y1: '1', x2: '0', y2: '0' }, [
        el('stop', { key: 1, offset: '0%', stopColor: st.color, stopOpacity: 0.55 }),
        el('stop', { key: 2, offset: '100%', stopColor: st.color, stopOpacity: 1 })
      ])))
  ].concat(g));
}

function batteryStackSvg(w, d) {
  const narrow = w < 470;
  const h = 268, bx = narrow ? 14 : 46, bw = narrow ? 88 : 116, by = 26, bh = 208, g = [];
  const socV = d.soc === null ? 0 : d.soc;
  const fillH = (bh * socV) / 100, fy = by + bh - fillH;
  g.push(el('rect', { key: 'tip', x: bx + bw / 2 - 20, y: by - 9, width: 40, height: 9, rx: 3, fill: 'rgba(255,255,255,0.1)' }));
  g.push(el('rect', { key: 'shell', x: bx, y: by, width: bw, height: bh, rx: 16, fill: 'rgba(255,255,255,0.025)', stroke: HAIR, strokeWidth: 1.2 }));
  if (d.soc !== null && fillH > 8) {
    g.push(el('rect', { key: 'fill', x: bx + 4, y: fy, width: bw - 8, height: fillH - 4, rx: 12, fill: 'url(#ebg)' }));
  }
  const nMod = d.module === null ? 4 : Math.max(1, Math.round(d.module));
  for (let m = 1; m < nMod; m++) {
    const my = by + (bh / nMod) * m;
    g.push(el('line', { key: 'm' + m, x1: bx + 4, y1: my, x2: bx + bw - 4, y2: my, stroke: '#0d0906', strokeWidth: 2.4, opacity: 0.6 }));
  }
  g.push(el('text', { key: 'soc', x: bx + bw / 2, y: by + bh / 2 + 4, textAnchor: 'middle', style: { fontFamily: DOTO, fontSize: '38px', fontWeight: 700, fill: d.soc !== null && socV > 45 ? '#08240f' : TXT } }, d.soc === null ? '—' : String(Math.round(d.soc))));
  g.push(el('text', { key: 'socu', x: bx + bw / 2, y: by + bh / 2 + 22, textAnchor: 'middle', style: { fontFamily: SANS, fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', fill: d.soc !== null && socV > 45 ? 'rgba(8,36,15,0.75)' : TXT3 } }, 'SOC %'));

  const cx = bx + bw + (narrow ? 26 : 74);
  const rows = [
    [d.dir.word.toLowerCase() + ' acum', d.dir.sign === 0 ? '0' : fmtFlowPower(d.dir.power).split(' ')[0], d.dir.sign === 0 ? 'W' : fmtFlowPower(d.dir.power).split(' ')[1], GOLD],
    ['încărcat azi', d.echrAzi === null ? '—' : d.echrAzi.toFixed(1), d.echrAzi === null ? '' : 'kWh', GREEN],
    ['descărcat azi', d.edisAzi === null ? '—' : d.edisAzi.toFixed(1), d.edisAzi === null ? '' : 'kWh', CYAN],
    ['module active', d.module === null ? '—' : Math.round(d.module) + ' / ' + Math.round(d.module), '', TXT2]
  ];
  rows.forEach((r, i) => {
    const y = 40 + i * 46;
    g.push(el('text', { key: 'rl' + i, x: cx, y, style: { fontFamily: SANS, fontSize: '10px', fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', fill: TXT3 } }, r[0]));
    g.push(el('text', { key: 'rv' + i, x: cx, y: y + 27, style: { fontFamily: DOTO, fontSize: '27px', fontWeight: 600, fill: TXT } }, r[1]));
    g.push(el('text', { key: 'ru' + i, x: cx + (String(r[1]).length > 3 ? 66 : 52), y: y + 27, style: { fontFamily: SANS, fontSize: '11.5px', fontWeight: 400, fill: r[3] } }, r[2]));
    if (i < rows.length - 1) g.push(el('line', { key: 'rd' + i, x1: cx, y1: y + 34, x2: w - 30, y2: y + 34, stroke: HAIR2, strokeWidth: 1 }));
  });

  const barX = cx, barW = Math.max(120, w - cx - 30);
  if (d.dez !== null) {
    const txt = narrow
      ? 'dezechilibru ' + d.dez + ' mV'
      : 'dezechilibru celule ' + d.dez + ' mV · ' + (d.celMin / 1000).toFixed(3) + ' → ' + (d.celMax / 1000).toFixed(3) + ' V';
    g.push(el('text', { key: 'cb', x: barX, y: 250, style: { fontFamily: SANS, fontSize: (narrow ? 8.5 : 10) + 'px', fontWeight: 300, fill: TXT3 } }, txt));
    g.push(el('rect', { key: 'cbt', x: barX, y: 232, width: barW, height: 5, rx: 2.5, fill: 'rgba(255,255,255,0.06)' }));
    g.push(el('rect', { key: 'cbf', x: barX, y: 232, width: barW * Math.min(1, d.dez / 100), height: 5, rx: 2.5, fill: GREEN }));
  } else {
    g.push(el('text', { key: 'cb', x: barX, y: 250, style: { fontFamily: SANS, fontSize: '10px', fontWeight: 300, fill: TXT3 } }, 'dezechilibru celule —'));
  }

  return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', height: h, style: { display: 'block' } }, [
    el('defs', { key: 'd' }, el('linearGradient', { key: 'g', id: 'ebg', x1: '0', y1: '1', x2: '0', y2: '0' }, [
      el('stop', { key: 1, offset: '0%', stopColor: '#2E9A63' }),
      el('stop', { key: 2, offset: '100%', stopColor: '#7BE8AC' })
    ]))
  ].concat(g));
}

function gridSankeySvg(w, d) {
  const h = 268, g = [];
  const narrow = w < 470;
  const L = d.lanes;
  const lanes = [
    { label: 'PV → casă', wv: L.pvToHouse, color: GOLD, y: 62 },
    { label: 'Baterie → casă', wv: L.batToHouse, color: GREEN, y: 128 },
    { label: 'PV → reţea', wv: L.pvToGrid, color: GRID_O, y: 194 }
  ];
  const maxKw = Math.max(1, Math.max.apply(null, lanes.map((l) => l.wv)) / 1000);
  const x0 = narrow ? 104 : 150, maxW = w - x0 - (narrow ? 86 : 130);
  lanes.forEach((l, i) => {
    const kw = l.wv / 1000;
    const lw = Math.max(6, (kw / maxKw) * maxW), th = 14 + (kw / maxKw) * 30;
    g.push(el('text', { key: 'l' + i, x: x0 - (narrow ? 10 : 16), y: l.y + 4, textAnchor: 'end', style: { fontFamily: SANS, fontSize: (narrow ? 10 : 11.5) + 'px', fontWeight: 400, fill: TXT2 } }, l.label));
    g.push(el('rect', { key: 'f' + i, x: x0, y: l.y - th / 2, width: lw, height: th, rx: th / 2, fill: l.color, opacity: kw < 0.001 ? 0.25 : 0.8 }));
    const fm = fmtPow(l.wv);
    g.push(el('text', { key: 'v' + i, x: x0 + lw + 14, y: l.y + 5, style: { fontFamily: DOTO, fontSize: '20px', fontWeight: 600, fill: TXT } }, fm ? fm.v : '—'));
    g.push(el('text', { key: 'u' + i, x: x0 + lw + 14 + (fm && fm.v.length > 3 ? 52 : 40), y: l.y + 5, style: { fontFamily: SANS, fontSize: '10.5px', fontWeight: 400, fill: l.color } }, fm ? fm.u : ''));
  });
  g.push(el('text', { key: 'h1', x: x0, y: 26, style: { fontFamily: SANS, fontSize: '10px', fontWeight: 500, letterSpacing: '0.13em', textTransform: 'uppercase', fill: TXT3 } }, 'unde merge energia acum'));
  const gridShare = d.pvIn ? Math.round((L.pvToGrid / d.pvIn) * 1000) / 10 : null;
  const foot = (d.acPct === null ? '' : 'autoconsum ' + d.acPct + ' %') + (gridShare === null ? '' : (d.acPct === null ? '' : ' · ') + gridShare + ' % din producţie pleacă în reţea');
  if (foot) g.push(el('text', { key: 'f1', x: x0, y: 246, style: { fontFamily: SANS, fontSize: '10.5px', fontWeight: 300, fill: TXT3 } }, foot));
  return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', height: h, style: { display: 'block' } }, g);
}

// Harta termică — FĂRĂ linia de prag din mockup ("85 °C" era o constantă
// inventată; nu cunoaştem pragul real de derating).
function tempBarsSvg(w, probes) {
  const h = 268, narrow = w < 470;
  const g = [], x0 = narrow ? 92 : 150, maxW = w - x0 - (narrow ? 74 : 120);
  const present = probes.map((p) => p[1]).filter((v) => v !== null);
  const LIM = present.length ? Math.max.apply(null, present) * 1.18 : 1;
  probes.forEach((p, i) => {
    const y = 34 + i * 32;
    g.push(el('text', { key: 'l' + i, x: x0 - (narrow ? 9 : 16), y: y + 4, textAnchor: 'end', style: { fontFamily: SANS, fontSize: (narrow ? 10 : 11.5) + 'px', fontWeight: 400, fill: TXT2 } }, p[0]));
    g.push(el('rect', { key: 't' + i, x: x0, y: y - 6, width: maxW, height: 12, rx: 6, fill: 'rgba(255,255,255,0.035)' }));
    if (p[1] !== null) {
      const lw = (p[1] / LIM) * maxW;
      const hot = present.length && p[1] >= Math.max.apply(null, present) - 0.05;
      g.push(el('rect', { key: 'f' + i, x: x0, y: y - 6, width: lw, height: 12, rx: 6, fill: hot ? GRID_O : GOLD, opacity: 0.85 }));
    }
    g.push(el('text', { key: 'v' + i, x: x0 + maxW + (narrow ? 8 : 14), y: y + 4, style: { fontFamily: SANS, fontSize: (narrow ? 10 : 12) + 'px', fontWeight: 400, fill: p[1] === null ? TXT3 : TXT, fontVariantNumeric: 'tabular-nums' } }, p[1] === null ? '—' : p[1].toFixed(1) + ' °C'));
  });
  return el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', height: h, style: { display: 'block' } }, g);
}
