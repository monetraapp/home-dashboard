// Grafica vectorială (gauge-uri, inele, grafice) copiată 1:1 din "Home Dashboard.dc.html".
import { el, ic } from './icons.js';
import { SANS, ORANGE, ORANGE_HI, cssToObj } from './tokens.js';

export function arcGauge(fraction, mult) {
  mult = mult || 1;
  const w = 300, h = 176 * mult, cx = w / 2, cy = 150, r = 122;
  fraction = Math.max(0.04, Math.min(0.96, fraction));
  function pt(f) { const th = Math.PI * (1 - f); return { x: cx + r * Math.cos(th), y: cy - r * Math.sin(th) }; }
  const a0 = pt(0.16), a1 = pt(0.84), cur = pt(0.16 + fraction * 0.68);
  const endL = pt(0), endR = pt(1);
  const track = 'M ' + a0.x.toFixed(1) + ' ' + a0.y.toFixed(1) + ' A ' + r + ' ' + r + ' 0 0 1 ' + a1.x.toFixed(1) + ' ' + a1.y.toFixed(1);
  const fill = 'M ' + a0.x.toFixed(1) + ' ' + a0.y.toFixed(1) + ' A ' + r + ' ' + r + ' 0 0 1 ' + cur.x.toFixed(1) + ' ' + cur.y.toFixed(1);
  const ticks = [];
  for (let i = 0; i <= 46; i++) {
    const f = i / 46, th = Math.PI * (1 - (0.1 + f * 0.8)), rr = 74;
    const x1 = cx + rr * Math.cos(th), y1 = cy - rr * Math.sin(th) * 0.42;
    const len = 5 + (i % 5 === 0 ? 4 : 0);
    const x2 = cx + (rr + len) * Math.cos(th), y2 = cy - (rr + len) * Math.sin(th) * 0.42;
    ticks.push(el('line', { key: 't' + i, x1, y1, x2, y2, stroke: i / 46 <= fraction ? 'rgba(240,138,44,0.5)' : 'rgba(255,255,255,0.13)', strokeWidth: 1.2 }));
  }
  const coneBaseY = cy - 28;
  const coneRoom = Math.min(cur.x - 12, w - 12 - cur.x);
  const cones = [];
  const coneSpec = [[26, 0.3, '0s'], [44, 0.17, '1.4s'], [64, 0.09, '2.8s']];
  for (let k = 0; k < coneSpec.length; k++) {
    const hw = Math.max(12, Math.min(coneSpec[k][0], coneRoom));
    const d = 'M ' + cur.x.toFixed(1) + ' ' + cur.y.toFixed(1) +
      ' L ' + (cur.x - hw).toFixed(1) + ' ' + coneBaseY + ' Q ' + cur.x.toFixed(1) + ' ' + (coneBaseY + 13) + ' ' + (cur.x + hw).toFixed(1) + ' ' + coneBaseY + ' Z';
    cones.push(el('path', { key: 'cn' + k, d, fill: 'url(#airflowGrad)', opacity: coneSpec[k][1],
      style: { animation: 'airflowPulse ' + (5.2 + k * 0.9) + 's cubic-bezier(.45,.05,.55,.95) infinite', animationDelay: coneSpec[k][2],
        transformOrigin: cur.x.toFixed(1) + 'px ' + cur.y.toFixed(1) + 'px' } }));
  }

  const wafts = [];
  const waftSpec = [[-13, 0, 2.4], [-5, 1.1, 2.1], [5, 2.2, 2.6], [13, 3.3, 2.2]];
  for (let wI = 0; wI < waftSpec.length; wI++) {
    const wOff = Math.max(-coneRoom + 6, Math.min(coneRoom - 6, waftSpec[wI][0]));
    const wx = cur.x + wOff, wy = cur.y + 14;
    wafts.push(el('circle', { key: 'wf' + wI, cx: wx.toFixed(1), cy: wy.toFixed(1), r: 1.4, fill: '#E6DCCE', opacity: 0.5,
      style: { animation: 'waftDown ' + (5.4 + waftSpec[wI][2]) + 's ease-in infinite', animationDelay: waftSpec[wI][1] + 's',
        transformOrigin: wx.toFixed(1) + 'px ' + wy.toFixed(1) + 'px' } }));
  }

  const svg = el('svg', { key: 'svg', viewBox: '0 0 ' + w + ' ' + 176, width: '100%', height: h, style: { display: 'block' } }, [
    el('defs', { key: 'df' }, [
      el('linearGradient', { key: 'g', id: 'airflowGrad', x1: '0', y1: '0', x2: '0', y2: '1' }, [
        el('stop', { key: 1, offset: '0%', stopColor: '#F0C79B', stopOpacity: 0.4 }),
        el('stop', { key: 2, offset: '42%', stopColor: '#D9A075', stopOpacity: 0.13 }),
        el('stop', { key: 3, offset: '100%', stopColor: '#C98F63', stopOpacity: 0 })
      ]),
      el('linearGradient', { key: 'ag', id: 'arcGrad', gradientUnits: 'userSpaceOnUse', x1: a0.x, y1: a0.y, x2: a1.x, y2: a1.y }, [
        el('stop', { key: 1, offset: '0%', stopColor: '#D9661A' }),
        el('stop', { key: 2, offset: '48%', stopColor: '#F5A24A' }),
        el('stop', { key: 3, offset: '100%', stopColor: '#FFD3A0' })
      ]),
      el('filter', { key: 'f', id: 'arcGlow', x: '-40%', y: '-40%', width: '180%', height: '180%' }, [
        el('feGaussianBlur', { key: 'b', stdDeviation: '2.6', result: 'b' }),
        el('feMerge', { key: 'm' }, [el('feMergeNode', { key: 1, in: 'b' }), el('feMergeNode', { key: 2, in: 'SourceGraphic' })])
      ])
    ]),
    el('g', { key: 'cones' }, cones),
    el('g', { key: 'wafts' }, wafts),
    el('path', { key: 'tr', d: track, fill: 'none', stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1.5, strokeDasharray: '1.5 6', strokeLinecap: 'round',
      style: { animation: 'dashFlow 6s linear infinite' } }),
    el('path', { key: 'hb', d: fill, fill: 'none', stroke: ORANGE, strokeWidth: 7, strokeLinecap: 'round', opacity: 0.16,
      filter: 'url(#arcGlow)', style: { animation: 'glowBreath 5.4s ease-in-out infinite' } }),
    el('path', { key: 'fi', d: fill, fill: 'none', stroke: 'url(#arcGrad)', strokeWidth: 2.4, strokeLinecap: 'round' }),
    el('path', { key: 'rn', d: fill, fill: 'none', stroke: '#FFF3E4', strokeWidth: 2.8, strokeLinecap: 'round', pathLength: 100,
      strokeDasharray: '5 100', opacity: 0.95, filter: 'url(#arcGlow)', style: { animation: 'arcRunSoft 5.2s cubic-bezier(.5,0,.5,1) infinite' } }),
    el('path', { key: 'rn2', d: fill, fill: 'none', stroke: '#FFC078', strokeWidth: 2, strokeLinecap: 'round', pathLength: 100,
      strokeDasharray: '16 100', opacity: 0.4, filter: 'url(#arcGlow)', style: { animation: 'arcRunSoft 5.2s cubic-bezier(.5,0,.5,1) infinite', animationDelay: '-0.16s' } }),
    el('circle', { key: 'd0', cx: a0.x, cy: a0.y, r: 4.5, fill: ORANGE }),
    el('circle', { key: 'd1', cx: a1.x, cy: a1.y, r: 4.5, fill: 'rgba(240,138,44,0.85)' }),
    el('circle', { key: 'e0', cx: endL.x, cy: endL.y, r: 3.5, fill: 'rgba(255,255,255,0.3)' }),
    el('circle', { key: 'e1', cx: endR.x, cy: endR.y, r: 3.5, fill: 'rgba(255,255,255,0.3)' }),
    el('g', { key: 'tk' }, ticks)
  ]);
  const marker = el('div', { key: 'm', style: cssToObj('position:absolute; left:' + (cur.x / w * 100).toFixed(2) + '%; top:' + (cur.y / h * 100).toFixed(2) + '%; width:34px; height:34px; margin:-17px 0 0 -17px; border-radius:11px; background:linear-gradient(140deg,' + ORANGE_HI + ',#D9691C); display:flex; align-items:center; justify-content:center; box-shadow:0 8px 22px -6px rgba(240,138,44,0.75), inset 0 1px 0 rgba(255,255,255,0.3);') }, ic('snow', { size: 15, color: '#2a1608', sw: 2 }));
  return el('div', { style: { position: 'relative', width: '100%' } }, [svg, marker]);
}

export function sliderRow(fraction, onMinus, onPlus) {
  const ticks = [];
  for (let i = 0; i < 44; i++) {
    const on = i / 44 <= fraction;
    ticks.push(el('div', { key: i, style: cssToObj('width:1.5px; height:' + (i % 4 === 0 ? '12px' : '7px') + '; border-radius:1px; background:' + (on ? 'rgba(240,138,44,0.75)' : 'rgba(255,255,255,0.14)') + ';') }));
  }
  const btn = (key, label, fn) =>
    el('div', { key, onClick: fn, style: cssToObj('width:30px; height:30px; flex-shrink:0; border-radius:10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; cursor:pointer; font-family:' + SANS + '; font-size:15px; font-weight:500; color:#cfc3b4;') }, label);
  return el('div', { style: cssToObj('display:flex; align-items:center; gap:12px; margin-top:14px;') }, [
    btn('minus', '−', onMinus),
    el('div', { key: 'tk', style: cssToObj('flex:1; display:flex; align-items:center; justify-content:space-between; height:14px;') }, ticks),
    btn('plus', '+', onPlus)
  ]);
}

export function dialTicks(frac, active, sizeArg) {
  const size = sizeArg || 132, sc = size / 132, cx = size / 2, cy = size / 2, inner = 40 * sc, outer = 54 * sc, total = 44;
  const lines = [];
  for (let i = 0; i < total; i++) {
    const ang = (-Math.PI * 1.25) + (i / (total - 1)) * (Math.PI * 1.5);
    const on = i / (total - 1) <= frac;
    lines.push(el('line', { key: i,
      x1: cx + inner * Math.cos(ang), y1: cy + inner * Math.sin(ang),
      x2: cx + outer * Math.cos(ang), y2: cy + outer * Math.sin(ang),
      stroke: on && active ? ORANGE : 'rgba(255,255,255,0.17)', strokeWidth: 1.6, strokeLinecap: 'round' }));
  }
  return el('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, style: { display: 'block' } }, lines);
}

export function ribbonRing(size, pct) {
  pct = pct == null ? 62 : pct;
  const cx = size / 2, cy = size / 2, r = size / 2 - 5, rt = r - 7, ri = r - 13;
  function pt(a, rr) { const t = (a - 90) * Math.PI / 180; return [cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]; }
  function arcPath(a0, a1, rr) {
    const p0 = pt(a0, rr), p1 = pt(a1, rr);
    const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
    return 'M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' A' + rr + ' ' + rr + ' 0 ' + large + ' ' + (a1 > a0 ? 1 : 0) + ' ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2);
  }

  const ticks = [];
  for (let i = 0; i < 72; i++) {
    const maj = i % 6 === 0;
    const a = i * 5, o1 = pt(a, rt), o2 = pt(a, rt - (maj ? 5 : 2.6));
    ticks.push(el('line', { key: 't' + i, x1: o1[0].toFixed(2), y1: o1[1].toFixed(2), x2: o2[0].toFixed(2), y2: o2[1].toFixed(2),
      stroke: maj ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)', strokeWidth: maj ? 1.1 : 0.9, strokeLinecap: 'round' }));
  }

  const tail = [];
  for (let j = 0; j < 16; j++) {
    const span = 5.6, head = -j * span;
    tail.push(el('path', { key: 'c' + j, d: arcPath(head - span - 0.6, head, r), fill: 'none', strokeLinecap: 'round',
      stroke: j < 3 ? '#FFD3A0' : '#F08A2C', strokeWidth: (2.4 - j * 0.1).toFixed(2), opacity: (Math.pow(1 - j / 16, 1.7)).toFixed(3) }));
  }
  const headPt = pt(0, r);
  tail.push(el('circle', { key: 'hd', cx: headPt[0].toFixed(2), cy: headPt[1].toFixed(2), r: 2.4, fill: '#FFEAD2' }));
  tail.push(el('circle', { key: 'hg', cx: headPt[0].toFixed(2), cy: headPt[1].toFixed(2), r: 5.2, fill: '#F08A2C', opacity: 0.35 }));

  const cComet = el('g', { key: 'comet', filter: 'url(#ribGlow)', style: { transformOrigin: '50% 50%', animation: 'ringOrbit 5.5s linear infinite' } }, tail);
  const innerDash = el('circle', { key: 'inner', cx, cy, r: ri, fill: 'none', stroke: 'rgba(240,138,44,0.28)', strokeWidth: 1, strokeDasharray: '1.5 7',
    style: { transformOrigin: '50% 50%', animation: 'ringOrbitRev 22s linear infinite' } });
  const progC = 2 * Math.PI * r;
  const progress = el('circle', { key: 'prog', cx, cy, r, fill: 'none', stroke: 'rgba(240,138,44,0.5)', strokeWidth: 1.6, strokeLinecap: 'round',
    strokeDasharray: (progC * pct / 100).toFixed(1) + ' ' + progC.toFixed(1), transform: 'rotate(-90 ' + cx + ' ' + cy + ')' });

  return el('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, style: { display: 'block', overflow: 'visible' } }, [
    el('defs', { key: 'df' }, [
      el('filter', { key: 'f', id: 'ribGlow', x: '-60%', y: '-60%', width: '220%', height: '220%' }, [
        el('feGaussianBlur', { key: 'b', stdDeviation: '2.2', result: 'b' }),
        el('feMerge', { key: 'm' }, [el('feMergeNode', { key: 1, in: 'b' }), el('feMergeNode', { key: 2, in: 'SourceGraphic' })])
      ]),
      el('radialGradient', { key: 'rg', id: 'ribCore' }, [
        el('stop', { key: 1, offset: '55%', stopColor: '#F08A2C', stopOpacity: 0 }),
        el('stop', { key: 2, offset: '100%', stopColor: '#F08A2C', stopOpacity: 0.14 })
      ])
    ]),
    el('circle', { key: 'fill', cx, cy, r, fill: 'url(#ribCore)' }),
    el('circle', { key: 'ring', cx, cy, r, fill: 'none', stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }),
    el('g', { key: 'tk', style: { transformOrigin: '50% 50%', animation: 'ringPulse 4.5s ease-in-out infinite' } }, ticks),
    innerDash, progress, cComet
  ]);
}

export function segmentRing(size, total, active) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 5, ri = r - 11;
  function pt(a, rr) { const t = (a - 90) * Math.PI / 180; return [cx + Math.cos(t) * rr, cy + Math.sin(t) * rr]; }
  function arcPath(a0, a1, rr) {
    const p0 = pt(a0, rr), p1 = pt(a1, rr);
    return 'M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + ' A' + rr + ' ' + rr + ' 0 ' + (Math.abs(a1 - a0) > 180 ? 1 : 0) + ' 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2);
  }
  total = Math.max(1, total || 1);
  const segs = [], step = 360 / total, gap = step * 0.19;
  for (let i = 0; i < total; i++) {
    const on = i < active, a0 = i * step + gap / 2, a1 = (i + 1) * step - gap / 2;
    segs.push(el('path', { key: 's' + i, d: arcPath(a0, a1, r), fill: 'none', strokeLinecap: 'round',
      stroke: on ? '#F08A2C' : 'rgba(255,255,255,0.13)', strokeWidth: on ? 3 : 2, opacity: 1 }));
  }
  const scan = el('g', { key: 'scan', style: { transformOrigin: '50% 50%', animation: 'ringOrbit 7s linear infinite' } }, [
    el('path', { key: 'sc', d: arcPath(-16, 0, r), fill: 'none', stroke: '#FFE0BC', strokeWidth: 3.2, strokeLinecap: 'round', opacity: 0.85 })
  ]);
  const pips = [];
  for (let j = 0; j < total; j++) {
    const p = pt(j * step + step / 2, ri);
    pips.push(el('circle', { key: 'p' + j, cx: p[0].toFixed(2), cy: p[1].toFixed(2), r: 1.5,
      fill: j < active ? 'rgba(240,138,44,0.85)' : 'rgba(255,255,255,0.16)' }));
  }
  return el('svg', { viewBox: '0 0 ' + size + ' ' + size, width: size, height: size, style: { display: 'block', overflow: 'visible' } }, [
    el('defs', { key: 'df' }, [
      el('filter', { key: 'f', id: 'segGlow', x: '-60%', y: '-60%', width: '220%', height: '220%' }, [
        el('feGaussianBlur', { key: 'b', stdDeviation: '2.4', result: 'b' }),
        el('feMerge', { key: 'm' }, [el('feMergeNode', { key: 1, in: 'b' }), el('feMergeNode', { key: 2, in: 'SourceGraphic' })])
      ]),
      el('radialGradient', { key: 'rg', id: 'segCore' }, [
        el('stop', { key: 1, offset: '52%', stopColor: '#F08A2C', stopOpacity: 0 }),
        el('stop', { key: 2, offset: '100%', stopColor: '#F08A2C', stopOpacity: 0.12 })
      ])
    ]),
    el('circle', { key: 'fill', cx, cy, r, fill: 'url(#segCore)' }),
    el('g', { key: 'pips', style: { transformOrigin: '50% 50%', animation: 'ringPulse 5s ease-in-out infinite' } }, pips),
    el('g', { key: 'sg', filter: 'url(#segGlow)' }, segs),
    el('g', { key: 'sgs', filter: 'url(#segGlow)' }, [scan])
  ]);
}

let CHART_SEQ = 0;

export function lineChart(series, labels, unit, yMinIn, yMaxIn, hoverIdx, onHover, mob) {
  const w = mob ? 330 : 640, h = mob ? 176 : 196, padL = mob ? 30 : 40, padR = mob ? 8 : 12, padT = 16, padB = mob ? 24 : 30;
  const fsAxis = mob ? '9px' : '9.5px', fsTipT = mob ? '9.5px' : '10px', fsTipV = mob ? '9px' : '9.5px';
  const id = 'lc' + (++CHART_SEQ);
  let all = [];
  series.forEach((s) => { all = all.concat(s.values); });
  let lo = yMinIn === undefined ? Math.min.apply(null, all) : yMinIn;
  let hi = yMaxIn === undefined ? Math.max.apply(null, all) : yMaxIn;
  const padv = (hi - lo) * 0.18 || 1;
  if (yMinIn === undefined) lo -= padv;
  if (yMaxIn === undefined) hi += padv;
  const iw = w - padL - padR, ih = h - padT - padB;
  function px(i, n) { return padL + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw); }
  function py(v) { return padT + ih - ((v - lo) / (hi - lo)) * ih; }

  const nodes = [];
  for (let g = 0; g <= 4; g++) {
    const gv = lo + (hi - lo) * (g / 4), gy = py(gv);
    nodes.push(el('line', { key: 'g' + g, x1: padL, y1: gy, x2: w - padR, y2: gy, stroke: 'rgba(255,255,255,0.055)', strokeWidth: 1 }));
    nodes.push(el('text', { key: 'gl' + g, x: padL - (mob ? 5 : 8), y: gy + 3.5, textAnchor: 'end',
      style: { fontFamily: SANS, fontSize: fsAxis, fontWeight: 300, fill: '#6f6558' } }, (Math.abs(hi - lo) < 8 ? gv.toFixed(1) : Math.round(gv))));
  }
  labels.forEach((lb, i) => {
    if (!lb) return;
    // pe telefon afişăm doar fiecare a doua etichetă, ca să nu se suprapună
    if (mob && i % 2 === 1 && i !== labels.length - 1) return;
    nodes.push(el('text', { key: 'xl' + i, x: px(i, labels.length), y: h - 9, textAnchor: 'middle',
      style: { fontFamily: SANS, fontSize: fsAxis, fontWeight: 300, fill: '#6f6558' } }, lb));
  });

  series.forEach((s, si) => {
    const n = s.values.length;
    let d = '';
    for (let i = 0; i < n; i++) {
      const x = px(i, n), y = py(s.values[i]);
      d += (i === 0 ? 'M' : ' L') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    const a = d + ' L' + px(n - 1, n).toFixed(1) + ' ' + (padT + ih) + ' L' + padL + ' ' + (padT + ih) + ' Z';
    if (si === 0) nodes.push(el('path', { key: 'a' + si, d: a, fill: 'url(#' + id + ')' }));
    nodes.push(el('path', { key: 'p' + si, d, fill: 'none', stroke: s.color, strokeWidth: si === 0 ? 2 : 1.6,
      strokeLinecap: 'round', strokeLinejoin: 'round', strokeDasharray: s.dashed ? '5 5' : null }));
    const lx = px(n - 1, n), ly = py(s.values[n - 1]);
    nodes.push(el('circle', { key: 'e' + si, cx: lx, cy: ly, r: 3.2, fill: s.color }));
    nodes.push(el('circle', { key: 'eg' + si, cx: lx, cy: ly, r: 6.5, fill: s.color, opacity: 0.22 }));
  });

  const n0 = labels.length;
  if (hoverIdx !== null && hoverIdx !== undefined && hoverIdx >= 0 && hoverIdx < n0) {
    const hx = px(hoverIdx, n0);
    nodes.push(el('line', { key: 'cross', x1: hx, y1: padT, x2: hx, y2: padT + ih, stroke: 'rgba(255,255,255,0.28)', strokeWidth: 1, strokeDasharray: '3 3' }));
    series.forEach((s, si) => {
      nodes.push(el('circle', { key: 'hp' + si, cx: hx, cy: py(s.values[hoverIdx]), r: 3.6, fill: s.color, stroke: '#100d0b', strokeWidth: 1.4 }));
    });
    const tipW = mob ? 116 : 132, tipH = 20 + series.length * 15;
    const tipX = hx + 12 + tipW > w - padR ? hx - 12 - tipW : hx + 12;
    const tipY = Math.min(padT + 4, padT);
    const tipKids = [
      el('rect', { key: 'tb', x: tipX, y: tipY, width: tipW, height: tipH, rx: 8, fill: 'rgba(24,18,14,0.96)', stroke: 'rgba(255,255,255,0.14)', strokeWidth: 1 }),
      el('text', { key: 'tt', x: tipX + 10, y: tipY + 15, style: { fontFamily: SANS, fontSize: fsTipT, fontWeight: 500, fill: '#e7dcd0' } }, labels[hoverIdx])
    ];
    series.forEach((s, si) => {
      tipKids.push(el('circle', { key: 'td' + si, cx: tipX + 14, cy: tipY + 27 + si * 15, r: 3, fill: s.color }));
      tipKids.push(el('text', { key: 'tv' + si, x: tipX + 23, y: tipY + 30 + si * 15,
        style: { fontFamily: SANS, fontSize: fsTipV, fontWeight: 300, fill: '#bdb1a4' } }, s.name.slice(0, mob ? 11 : 16) + '  ' + s.values[hoverIdx] + ' ' + unit));
    });
    nodes.push(el('g', { key: 'tip' }, tipKids));
  }

  function handleMove(e) {
    if (!onHover) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * w;
    const idx = Math.round(((vx - padL) / iw) * (n0 - 1));
    onHover(Math.max(0, Math.min(n0 - 1, idx)));
  }

  return el('svg', { viewBox: '0 0 ' + w + ' ' + h, onMouseMove: handleMove,
    onMouseLeave: onHover ? () => onHover(null) : null,
    style: { display: 'block', width: '100%', height: 'auto', cursor: onHover ? 'crosshair' : 'default' } },
    [el('defs', { key: 'd' }, [
      el('linearGradient', { key: 'g', id, x1: '0', y1: '0', x2: '0', y2: '1' }, [
        el('stop', { key: 1, offset: '0%', stopColor: series[0].color, stopOpacity: 0.26 }),
        el('stop', { key: 2, offset: '100%', stopColor: series[0].color, stopOpacity: 0 })
      ])
    ])].concat(nodes));
}

export function barChart(values, labels, unit, hoverIdx, onHover, mob) {
  const w = mob ? 330 : 640, h = mob ? 176 : 196, padL = mob ? 32 : 44, padR = mob ? 8 : 12, padT = 16, padB = mob ? 24 : 30;
  const fsAxis = mob ? '9px' : '9.5px';
  const hi = Math.max.apply(null, values) * 1.15 || 1;
  const iw = w - padL - padR, ih = h - padT - padB, n = values.length;
  const colW = iw / n, bw = Math.min(38, colW * 0.52);
  const nodes = [];
  for (let g = 0; g <= 4; g++) {
    const gv = hi * (g / 4), gy = padT + ih - (g / 4) * ih;
    nodes.push(el('line', { key: 'g' + g, x1: padL, y1: gy, x2: w - padR, y2: gy, stroke: 'rgba(255,255,255,0.055)', strokeWidth: 1 }));
    nodes.push(el('text', { key: 'gl' + g, x: padL - (mob ? 5 : 8), y: gy + 3.5, textAnchor: 'end',
      style: { fontFamily: SANS, fontSize: fsAxis, fontWeight: 300, fill: '#6f6558' } }, Math.round(gv)));
  }
  for (let i = 0; i < n; i++) {
    const cx = padL + colW * i + colW / 2;
    const bh = Math.max(2, (values[i] / hi) * ih);
    const top = padT + ih - bh;
    const peak = values[i] === Math.max.apply(null, values);
    const hov = hoverIdx === i;
    nodes.push(el('rect', { key: 'b' + i, x: cx - bw / 2, y: top, width: bw, height: bh, rx: 5,
      fill: hov ? '#FFBB6A' : (peak ? ORANGE : 'rgba(240,138,44,0.32)') }));
    if (!(mob && i % 2 === 1 && i !== n - 1)) nodes.push(el('text', { key: 'bl' + i, x: cx, y: h - 9, textAnchor: 'middle',
      style: { fontFamily: SANS, fontSize: fsAxis, fontWeight: hov ? 500 : 300, fill: hov ? '#d8ccbe' : '#6f6558' } }, labels[i]));
  }
  if (hoverIdx !== null && hoverIdx !== undefined && hoverIdx >= 0 && hoverIdx < n) {
    const hcx = padL + colW * hoverIdx + colW / 2;
    const tw = mob ? 100 : 118, tx = hcx + 10 + tw > w - padR ? hcx - 10 - tw : hcx + 10;
    nodes.push(el('g', { key: 'tip' }, [
      el('rect', { key: 'r', x: tx, y: padT + 2, width: tw, height: 38, rx: 8, fill: 'rgba(24,18,14,0.96)', stroke: 'rgba(255,255,255,0.14)', strokeWidth: 1 }),
      el('text', { key: 't1', x: tx + 10, y: padT + 17, style: { fontFamily: SANS, fontSize: mob ? '9.5px' : '10px', fontWeight: 500, fill: '#e7dcd0' } }, labels[hoverIdx]),
      el('text', { key: 't2', x: tx + 10, y: padT + 32, style: { fontFamily: SANS, fontSize: fsAxis, fontWeight: 300, fill: '#bdb1a4' } }, values[hoverIdx] + ' ' + unit)
    ]));
  }
  function handleMove(e) {
    if (!onHover) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * w;
    const idx = Math.floor((vx - padL) / colW);
    onHover(Math.max(0, Math.min(n - 1, idx)));
  }
  return el('svg', { viewBox: '0 0 ' + w + ' ' + h, onMouseMove: handleMove,
    onMouseLeave: onHover ? () => onHover(null) : null,
    style: { display: 'block', width: '100%', height: 'auto', cursor: onHover ? 'crosshair' : 'default' } }, nodes);
}

export function poolChart(values, labels, highlightIdx, deltaLabel) {
  const w = 320, h = 118, n = values.length, colW = w / n;
  const min = Math.min.apply(null, values) - 1.5, max = Math.max.apply(null, values) + 1.5, range = (max - min) || 1;
  const nodes = [];
  for (let i = 0; i < n; i++) {
    const x = i * colW;
    nodes.push(el('line', { key: 'g' + i, x1: x, y1: 6, x2: x, y2: h - 4, stroke: 'rgba(255,255,255,0.055)', strokeWidth: 1 }));
  }
  nodes.push(el('line', { key: 'gl', x1: w, y1: 6, x2: w, y2: h - 4, stroke: 'rgba(255,255,255,0.055)', strokeWidth: 1 }));
  nodes.push(el('line', { key: 'mid', x1: 0, y1: h * 0.52, x2: w, y2: h * 0.52, stroke: 'rgba(255,255,255,0.07)', strokeWidth: 1, strokeDasharray: '3 5' }));
  for (let j = 0; j < n; j++) {
    const y = h - 10 - ((values[j] - min) / range) * (h - 26);
    const cxj = j * colW + colW / 2;
    nodes.push(el('line', { key: 'd' + j, x1: cxj - 15, y1: y, x2: cxj + 15, y2: y, stroke: j === highlightIdx ? ORANGE : 'rgba(255,255,255,0.75)', strokeWidth: 2, strokeLinecap: 'round' }));
    if (j === highlightIdx) {
      nodes.push(el('rect', { key: 'hb', x: cxj - 26, y: y - 34, width: 52, height: 24, rx: 8, fill: ORANGE }));
      nodes.push(el('text', { key: 'ht', x: cxj, y: y - 17.5, textAnchor: 'middle', fill: '#2a1608', style: { fontFamily: SANS, fontSize: '11.5px', fontWeight: 600 } }, deltaLabel));
    }
  }
  const svg = el('svg', { key: 'svg', viewBox: '0 0 ' + w + ' ' + h, width: '100%', height: h, style: { display: 'block', marginTop: '14px' } }, nodes);
  const labelRow = el('div', { key: 'lb', style: cssToObj('display:flex; margin-top:6px;') }, labels.map((lb, i) =>
    el('span', { key: i, style: cssToObj('flex:1; text-align:center; font-family:' + SANS + '; font-size:10.5px; color:#6c6053;') }, lb)));
  return el('div', {}, [svg, labelRow]);
}
