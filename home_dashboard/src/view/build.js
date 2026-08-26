// Construieşte obiectele de "vals" pentru markup — echivalentul lui renderVals()
// din designul original, dar alimentat cu date live din Home Assistant.
import { ic } from '../design/icons.js';
import {
  SANS, DOTO, ORANGE, ORANGE_HI, TXT, TXT2, TXT3, CARD_BG, CARD_BORDER,
  glassCard, tileStyleFor, iconWrapFor, labelFor, valueFor, togglePill, toggleKnob, toggleText,
  PILL_ON, PILL_OFF, PILL_SHADOW_ON, PILL_SHADOW_OFF, KNOB_ON, KNOB_OFF, KNOB_SHADOW,
  TIP_STYLE, STATE_COLORS, noop
} from '../design/tokens.js';
import { dialTicks, lineChart, barChart } from '../design/graphics.js';
import { VERIFY, NA, HVAC_SHORT } from '../ha/entities.js';
import { describe } from '../model/descriptions.js';
import { fmtPow, fmtText, dec as decSep } from '../design/format.js';
import { UNSET, isLgTimerUnset } from '../ha/unset.js';
import {
  bumpTimerValue,
  formatTimerReceipt,
  lgTimerBlockedReason,
  lgTimerBounds,
  lgTimerKindOf,
  lgTimerUnit
} from '../ha/lgTimers.js';
import { bumpNumber } from '../ha/numberStep.js';
import { resolveAction } from '../model/actions.js';
import { dailyAverage, dailyLast, fillGaps, timelineSegments, lastDayLabels } from '../ha/history.js';

const DAYS7 = 7;

/** Breakpoint-ul curent, transmis prin `ui` din Dashboard. */
function bpOf(ui) {
  return (ui && ui.bp) || { vw: 1600, coarse: false, mob: false, tab: false, narrow: false };
}
function colsOf(ui) {
  const b = bpOf(ui);
  return b.mob ? 2 : b.tab ? 3 : 4;
}
/**
 * Coloanele unei secţiuni de acordeon. Pe desktop păstrăm exact numărul cerut
 * de secţiune (Mod = 5, Baleiaj = 2 etc.), aşa cum am stabilit pentru paginile
 * Climat şi Piscină; pe ecrane mici doar plafonăm, ca să încapă.
 */
function accCols(ui, cols) {
  const want = cols || 4;
  const b = bpOf(ui);
  if (b.mob) return Math.min(want, 2);
  if (b.tab) return Math.min(want, 3);
  return want;
}

function numberBumpHandlers(info) {
  // Timer-ele LG: bump write-only prin bridge (sub minim → anulare/nesetat).
  if (info.lgTimer) {
    return {
      onMinus: (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (!info.writable) return;
        const next = bumpTimerValue(info.lgTimer, info.val, -1);
        if (next !== info.val || next === null) info.set(next);
      },
      onPlus: (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (!info.writable) return;
        const next = bumpTimerValue(info.lgTimer, info.val, 1);
        if (next !== null) info.set(next);
      }
    };
  }
  const bounds = { min: info.min, max: info.max, step: info.step };
  return {
    onMinus: (e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      if (!info.writable || info.val === null) return;
      const next = bumpNumber(info.val, -1, bounds);
      if (next !== null) info.set(next);
    },
    onPlus: (e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      if (!info.writable) return;
      const next = bumpNumber(info.val, 1, bounds);
      if (next !== null) info.set(next);
    }
  };
}

function verifyValueStyle(active, value) {
  if (value === VERIFY) {
    return 'font-family:' + SANS + '; font-size:10.5px; font-weight:600; letter-spacing:0.04em; color:' +
      (active ? 'rgba(42,22,8,0.85)' : ORANGE) + '; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
  }
  return valueFor(active, value);
}

// --------------------------------------------------------------------- tiles
// Tooltip v1.1.0: colturi rotunjite, blur, animatie de intrare (keyframes
// hdTipIn injectate in Dashboard). Pozitionat central deasupra elementului.
const TOOLTIP =
  'position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%); z-index:60; padding:8px 12px; border-radius:12px; max-width:240px; width:max-content; text-align:center; pointer-events:none; font-family:' + SANS + '; font-size:11.5px; font-weight:400; line-height:1.45; color:#f4ece2; background:rgba(28,22,17,0.92); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.14); box-shadow:0 12px 28px -12px rgba(0,0,0,0.9); animation:hdTipIn .16s ease-out;';

export function buildItem(E, ui, d, keyCtx) {
  const slot = d.slot;
  const mapped = slot ? E.mapped(slot) : true;
  const avail = slot ? E.available(slot) : true;
  const active = !!(d.toggleable && slot && E.isOn(slot));
  // (v1.7.1) Comanda trimisa si neconfirmata inca. NU schimba starea afisata —
  // doar marcheaza ca a plecat ceva. Un televizor porneste in zeci de secunde;
  // fara acest semn dala ar parea moarta, iar cu vechea metoda (pending citit
  // ca stare) ar fi mintit ca e deja pornit.
  const inZbor = !!(d.toggleable && slot && E.isPending && E.isPending(slot));

  let value;
  if (d.text !== undefined) {
    value = d.text;
  } else if (!slot) {
    value = '';
  } else if (!mapped) {
    value = VERIFY;
  } else if (lgTimerKindOf(slot)) {
    // Diagnostic timer LG (write-only): arătăm receipt-ul bridge-ului,
    // nu valoarea number.* (care rămâne unknown fără readback LG).
    const r = E.lgTimerReceipt(slot);
    value = r
      ? (r.kind === 'sensor.lg_somn_min' ? String(r.value) : String(r.value)) + (d.opts && d.opts.unit ? ' ' + d.opts.unit : '')
      : UNSET;
  } else if (!avail) {
    value = slot && isLgTimerUnset(slot, E.rawState(slot), E.numberValue(slot)) ? UNSET : NA;
  } else if (d.opts && d.opts.hvac) {
    value = HVAC_SHORT[E.rawState(slot)] || E.rawState(slot);
  } else if (d.toggleable) {
    value = active ? 'Pornit' : 'Oprit';
  } else {
    value = E.fmt(slot, d.opts);
  }

  // keyCtx previne cheile duplicate cand acelasi slot apare de doua ori pe o
  // pagina (ex. binary_sensor.pc_debit pe ambele carduri de piscina) — altfel
  // doua tooltip-uri se afisau simultan (bug 1.2, v1.1.1)
  const key = 'tile:' + (keyCtx || '') + ':' + (slot || d.label);
  let tip;
  if (!mapped && slot) tip = 'VERIFY · slotul „' + slot + '" nu are entitate mapată — deschide „Mapare entităţi".';
  else if (!avail && slot && !lgTimerKindOf(slot)) tip = d.label + ' · entitate indisponibilă în HA';
  else if (lgTimerKindOf(slot)) tip = d.label + ' · comandă trimisă prin bridge, fără confirmare continuă LG';
  else if (d.toggleable) tip = d.label + ' · ' + (active ? 'pornit — apasă pentru a opri' : 'oprit — apasă pentru a porni');
  else tip = d.label + ' · ' + value + ' — doar informativ';

  const canToggle = !!(d.toggleable && mapped && avail);

  return {
    iconEl: ic(d.icon, { size: 16, color: active ? '#2a1608' : TXT2 }),
    label: d.label,
    value,
    tileStyle: tileStyleFor(active, canToggle) + (d.toggleable ? toggleItemTileExtra(ui) : '') + (d.toggleable && !canToggle ? ' opacity:0.72;' : '') + (inZbor ? ' outline:1px solid rgba(240,138,44,0.45); outline-offset:-1px;' : ''),
    iconWrapStyle: iconWrapFor(active),
    labelStyle: d.toggleable ? toggleItemLabelStyle(active, ui) : labelFor(active) + labelWrap(ui),
    valueStyle: d.toggleable ? toggleItemValueStyle(active) : verifyValueStyle(active, value),
    wrapStyle: 'position:relative; display:flex; min-width:0;',
    tipText: tip,
    showTip: ui.hoverKey === key,
    tipStyle: TOOLTIP,
    onEnter: () => ui.setHoverKey(key),
    onLeave: () => ui.setHoverKey(null),
    onToggle: canToggle ? () => E.toggle(slot) : noop
  };
}

// -------------------------------------------------------------------- blocks
function monitorValue(E, cell) {
  if (!cell) return { text: NA, verify: false };
  if (cell.text !== undefined) return { text: cell.text, verify: false };
  if (cell.pair) {
    const a = E.fmt(cell.pair[0], { unit: '%', decimals: 0 });
    const b = E.fmt(cell.pair[1], { unit: '%', decimals: 0 });
    const verify = a === VERIFY && b === VERIFY;
    return { text: 'CPU ' + a + ' · RAM ' + b, verify };
  }
  // dir (v1.1.3): direcţia netă dintre două sloturi de putere — ex. baterie
  // (încărcare vs descărcare) sau reţea (export vs import). Pragul de 1 W
  // taie zgomotul de măsură din jurul lui zero.
  if (cell.dir) {
    const d = cell.dir;
    if (!E.mapped(d.pos) || !E.mapped(d.neg)) return { text: VERIFY, verify: true };
    const p = E.num(d.pos);
    const n = E.num(d.neg);
    if (p === null && n === null) return { text: NA, verify: false };
    const unit = d.unit || 'W';
    if ((p || 0) >= 1 && (p || 0) >= (n || 0)) return { text: d.posLabel + ' · ' + Math.round(p) + ' ' + unit, verify: false };
    if ((n || 0) >= 1) return { text: d.negLabel + ' · ' + Math.round(n) + ' ' + unit, verify: false };
    return { text: d.zeroLabel, verify: false };
  }
  // sdir (v1.2.8): direcţia netă dintr-UN singur slot semnat — contorul de
  // racord publică saldo-ul într-un registru unic (pozitiv = import,
  // negativ = export), spre deosebire de invertor, care are registre separate.
  if (cell.sdir) {
    const d2 = cell.sdir;
    if (!E.mapped(d2.slot)) return { text: VERIFY, verify: true };
    const v2 = E.num(d2.slot);
    if (v2 === null) return { text: NA, verify: false };
    if (v2 >= 1) return { text: d2.posLabel + ' · ' + fmtPower(v2), verify: false };
    if (v2 <= -1) return { text: d2.negLabel + ' · ' + fmtPower(-v2), verify: false };
    return { text: d2.zeroLabel, verify: false };
  }
  // diff (v1.1.3): diferenţa a două sloturi — ex. dezechilibrul de celule
  // (tensiune maximă − minimă, în mV brut, aşa cum le publică BMS-ul).
  if (cell.diff) {
    const a = cell.diff[0];
    const b2 = cell.diff[1];
    if (!E.mapped(a) || !E.mapped(b2)) return { text: VERIFY, verify: true };
    const va = E.num(a);
    const vb = E.num(b2);
    if (va === null || vb === null) return { text: NA, verify: false };
    const dec = cell.decimals === undefined ? 0 : cell.decimals;
    const scaled = (va - vb) * (cell.scale === undefined ? 1 : cell.scale);
    return { text: decSep(scaled.toFixed(dec)) + (cell.unit ? ' ' + cell.unit : ''), verify: false };
  }
  // maxOf (v1.1.3): maximul mai multor sloturi — ex. cea mai mare temperatură
  // dintre sondele invertorului, ca rezumat al secţiunii.
  if (cell.maxOf) {
    if (!cell.maxOf.some((k) => E.mapped(k))) return { text: VERIFY, verify: true };
    const vals = cell.maxOf.map((k) => E.num(k)).filter((v) => v !== null);
    if (!vals.length) return { text: NA, verify: false };
    const m = Math.max.apply(null, vals);
    return { text: decSep(m.toFixed(1)) + (cell.unit ? ' ' + cell.unit : ''), verify: false };
  }
  const t = E.fmt(cell.slot, cell.opts);
  return { text: t, verify: t === VERIFY };
}

/** Putere formatată compact — regulile canonice din design/format.js. */
function fmtPower(w) {
  const t = fmtText(fmtPow(w));
  return t === null ? NA : t;
}

/** Rândurile unui bloc monitor/expand — partajat, cu dim + tooltip (v1.1.3). */
function monitorRows(E, ui, title, rows, keyCtx) {
  return rows.map((row, i) => {
    const cell = row[1] || {};
    const v = monitorValue(E, cell);
    const bad = /oprit|offline|indisponibil|eroare|unavailable/i.test(String(v.text));
    const color = v.verify ? ORANGE : bad ? '#e8a08a' : TXT;
    const dim = !!(cell.opts && cell.opts.dim);
    const key = 'mrow:' + (keyCtx || '') + ':' + title + ':' + row[0];
    const desc = describe(title, row[0]);
    return {
      label: row[0],
      value: v.text,
      rowStyle: 'position:relative; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:9px 14px;' +
        (i < rows.length - 1 ? ' border-bottom:1px solid rgba(255,255,255,0.045);' : '') +
        (dim ? ' opacity:0.55;' : ''),
      labelStyle: 'display:flex; align-items:center; gap:9px; font-family:' + SANS + '; font-size:12.5px; font-weight:300; color:#bcaf9f; min-width:0;',
      dotStyle: 'width:5px; height:5px; border-radius:50%; flex-shrink:0; background:' +
        (v.verify ? 'rgba(240,138,44,0.9)' : bad ? 'rgba(226,120,90,0.8)' : 'rgba(240,138,44,0.55)') + ';',
      valueStyle: 'font-family:' + SANS + '; font-size:12.5px; font-weight:' + (v.verify ? 600 : 500) + '; color:' + color + '; font-variant-numeric:tabular-nums; white-space:nowrap;',
      tipText: desc,
      tipStyle: TOOLTIP,
      showTip: !!desc && ui.hoverKey === key,
      onEnter: desc ? () => ui.setHoverKey(key) : noop,
      onLeave: desc ? () => ui.setHoverKey(null) : noop
    };
  });
}

// Titlurile şi numele se rup pe maxim 2 linii în loc să se taie cu "..."
// după ~10 caractere pe mobil (audit v1.2.0: „Pompă filt…", „Pompa C…" pe
// Piscină la 390px erau imposibil de deosebit). -webkit-line-clamp pune
// elipsa abia la capătul liniei a doua; word-break previne overflow-ul
// cuvintelor foarte lungi. Valorile/metadatele rămân pe o linie (sunt date,
// nu identitate).
// (v1.5.6) `overflow-wrap:break-word` + `hyphens:auto` in loc de
// `word-break:break-word`: acesta din urma rupea „Clorinator" in „Clorinat/or"
// la 320px, desi cuvantul incapea pe linia urmatoare. Textul nu se pierdea,
// deci auditul tacea — dar ruptura era arbitrara.
// (v1.5.6) Numarul de linii permise depinde de latime. La <=360px doua linii
// nu ajung: auditul a masurat „AC Mansarda Vivax" pierzand 18px si
// „Clorinator principal" 18px. A treia linie e mai ieftina decat un nume
// taiat — cardul creste, tinta tactila ramane >=44px, fontul nu scade.
function clamp2(ui) {
  return 'display:-webkit-box; -webkit-line-clamp:' + (ultraNarrow(ui) ? 3 : 2) +
    '; -webkit-box-orient:vertical; overflow:hidden; hyphens:auto; overflow-wrap:break-word;';
}

// Etichetele de tile/chip se rup pe maxim 2 linii in loc sa se taie cu
// '...' (audit v1.2.x: 'Regim boost' pierdea 41px, 'Stergator Speed Dome'
// 51px). APPEND peste labelFor() — suprascrie nowrap/ellipsis la punctul de
// folosire, tokens.js ramane identic cu designul original (testul de stil).
// hyphens:auto desparte cu cratima cuvintele unice lungi ('Dezumidificare');
// <html lang="ro"> exista deja.
function labelWrap(ui) {
  return ' white-space:normal; text-overflow:clip; display:-webkit-box; -webkit-line-clamp:' +
    (ultraNarrow(ui) ? 3 : 2) +
    '; -webkit-box-orient:vertical; overflow:hidden; hyphens:auto; overflow-wrap:break-word; line-height:1.25;';
}

// Chip-uri toggle (Pornit/Oprit) pe grile înguste: valoarea nu se taie cu
// ellipsis — audit 320px Piscină. Sub 360px comprimăm ușor padding/label.
function ultraNarrow(ui) {
  return bpOf(ui).vw <= 360;
}
/**
 * Antetul de acordeon are nevoie de doua randuri sub aceasta latime.
 *
 * MASURAT, nu estimat (sonda Playwright pe Climat, 26.08): coloana numelui,
 * strivita intre iconita de 36px si grupul pilula+chevron, ramane
 *   320px -> 61px latime, textul cere 105px inaltime (6 randuri de 17,5px)
 *   375px -> 116px, cere 53px (3 randuri), afiseaza 2
 *   390px -> 131px, cere 53px, afiseaza 2
 *   414px -> 155px, cere 35px, INCAPE
 * La 61px niciun numar rezonabil de randuri nu ajunge: „AC Mansarda Vortex Air
 * Conditioner" e un friendly_name venit din HA, nu o eticheta pe care sa o
 * scurtam noi. Solutia e latimea, nu clamp-ul — numele trece pe rand propriu,
 * iar comenzile coboara sub el. Pragul e 400px fiindca 414 s-a masurat curat.
 */
function antetPeDouaRanduri(ui) {
  return bpOf(ui).vw <= 400;
}
function toggleItemLabelStyle(active, ui) {
  const base = labelFor(active);
  if (!ultraNarrow(ui)) return base + labelWrap(ui);
  // O SINGURA linie taia „Regim redus" in „Re..." (44px pierduti, masurat la
  // 320 si 360px). Trei linii — la fel ca labelWrap() la aceeasi latime — acopera
  // si cea mai lunga eticheta din aplicatie, „Ştergător Speed Dome" (20 caractere).
  // Dala creste in inaltime; fontul si tinta tactila raman neatinse.
  return base + ' white-space:normal; text-overflow:clip; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; overflow-wrap:break-word; line-height:1.2;';
}
function toggleItemValueStyle(active) {
  const color = active ? 'rgba(42,22,8,0.72)' : TXT3;
  return 'font-family:' + SANS + '; font-size:10px; font-weight:600; color:' + color + '; white-space:nowrap; flex-shrink:0; overflow:visible; text-overflow:clip; min-width:max-content;';
}
function toggleItemTileExtra(ui) {
  return ultraNarrow(ui) ? ' padding:10px 8px; gap:6px;' : '';
}

const MON_WRAP = 'border:1px solid rgba(255,255,255,0.065); border-radius:14px; overflow:hidden; margin-bottom:12px;';
const MON_CAP = 'display:flex; align-items:center; gap:8px; padding:9px 14px; font-family:' + SANS + '; font-size:10px; text-transform:uppercase; letter-spacing:0.09em; color:' + TXT3 + '; background:rgba(255,255,255,0.022);';

export function buildBlock(E, ui, hist, b) {
  if (b.type === 'note') {
    return {
      isNote: true,
      text: b.text,
      noteStyle: 'font-family:' + SANS + '; font-size:12.5px; line-height:1.6; color:' + TXT3 + ';'
    };
  }

  if (b.type === 'grid') {
    // (v1.5.6) La <=360px plafonam la 2 coloane. `grid(3, …)` randa trei dale
    // si la 320px, lasand ~30px de text fiecare: „Regim redus" ar fi avut
    // nevoie de 4 linii ca sa incapa, iar „Clorinator" de 3. Nu e problema de
    // clamp, ci de latime — masurat de auditul responsive pe 26.08.
    return {
      isGrid: true,
      cols: ultraNarrow(ui) ? Math.min(b.cols, 2) : b.cols,
      items: b.items.map((d, di) => buildItem(E, ui, d, 'grid' + di))
    };
  }

  if (b.type === 'monitor') {
    return {
      isMonitor: true,
      title: b.title + ' · doar informativ',
      wrapStyle: MON_WRAP,
      capStyle: MON_CAP,
      capIconStyle: 'display:flex; color:#6f6558;',
      capIconEl: ic('lock', { size: 12 }),
      rows: monitorRows(E, ui, b.title, b.rows, 'mon')
    };
  }

  // ------------------------------------------------------- energie (v1.1.3)
  if (b.type === 'stats') {
    const bp = bpOf(ui);
    return {
      isStats: true,
      anim: ui.anim !== false,
      cols: bp.mob ? 2 : b.items.length,
      items: b.items.map((it) => {
        const key = 'stat:' + (it.slot || it.label);
        let value = it.slot ? E.fmt(it.slot, it.opts) : '';
        let sub = it.sub || '';
        let subColor = TXT3;
        if (it.flow) {
          const f = it.flow;
          if (!E.mapped(f.pos) || !E.mapped(f.neg)) {
            if (it.slot) sub = VERIFY; else value = VERIFY;
          } else {
            const p = E.num(f.pos);
            const n = E.num(f.neg);
            let dirWord = f.zeroLabel;
            let power = 0;
            if ((p || 0) >= 1 && (p || 0) >= (n || 0)) { dirWord = f.posLabel; power = p; subColor = ORANGE; }
            else if ((n || 0) >= 1) { dirWord = f.negLabel; power = n; subColor = '#8FA7C8'; }
            if (it.slot) {
              sub = power >= 1 ? dirWord + ' · ' + fmtPower(power) : dirWord;
            } else {
              // tile fără slot principal: fluxul ESTE valoarea (ex. Reţea)
              value = power >= 1 ? fmtPower(power) : '0 W';
              sub = dirWord;
            }
          }
        }
        const desc = describe('Energie', it.label);
        return {
          key,
          iconEl: ic(it.icon, { size: 15, color: TXT2 }),
          label: it.label,
          value,
          sub,
          wrapStyle: 'position:relative; display:flex; min-width:0;',
          tileStyle: 'flex:1; min-width:0; display:flex; flex-direction:column; gap:6px; padding:14px 16px; border:1px solid rgba(255,255,255,0.07); border-radius:14px; background:rgba(255,255,255,0.02);',
          headStyle: 'display:flex; align-items:center; gap:8px; font-family:' + SANS + '; font-size:10.5px; text-transform:uppercase; letter-spacing:0.08em; color:' + TXT3 + ';',
          valueStyle: 'font-family:' + DOTO + '; font-size:' + (bp.mob ? 22 : 26) + 'px; font-weight:600; color:' + (value === VERIFY ? ORANGE : TXT) + '; font-variant-numeric:tabular-nums; line-height:1.1; white-space:nowrap;',
          subStyle: 'font-family:' + SANS + '; font-size:11.5px; font-weight:400; color:' + subColor + '; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
          tipText: desc || (it.label + ' · ' + value + ' — doar informativ'),
          tipStyle: TOOLTIP,
          showTip: ui.hoverKey === key,
          onEnter: () => ui.setHoverKey(key),
          onLeave: () => ui.setHoverKey(null)
        };
      })
    };
  }

  // Instrumentul Energie (v1.1.5): componenta EnergyInstrument îşi aduce
  // singură datele (useEntities + history + statistics) — aici doar semnalăm
  // tipul şi transmitem starea comutatorului de animaţii.
  if (b.type === 'instrument') {
    return { isInstrument: true, anim: ui.anim !== false };
  }

  if (b.type === 'bars') {
    const vals = b.items.map((it) => E.num(it.slot));
    const max = Math.max.apply(null, vals.map((v) => (v === null ? 0 : Math.abs(v))).concat([1]));
    return {
      isBars: true,
      title: b.title,
      wrapStyle: 'display:flex; flex-direction:column; gap:8px; padding:12px 14px; border:1px solid rgba(255,255,255,0.065); border-radius:14px; margin-bottom:12px;',
      titleStyle: 'font-family:' + SANS + '; font-size:10px; text-transform:uppercase; letter-spacing:0.09em; color:' + TXT3 + ';',
      rows: b.items.map((it, i) => {
        const v = vals[i];
        return {
          label: it.label,
          text: v === null ? NA : fmtPower(v),
          rowStyle: 'display:flex; align-items:center; gap:10px;',
          labelStyle: 'flex:0 0 52px; font-family:' + SANS + '; font-size:11.5px; font-weight:300; color:#bcaf9f;',
          trackStyle: 'flex:1; height:5px; border-radius:3px; background:rgba(255,255,255,0.05); overflow:hidden;',
          fillStyle: 'height:100%; border-radius:3px; background:' + ORANGE + '; opacity:0.85; width:' + (v === null ? 0 : Math.round((Math.abs(v) / max) * 100)) + '%;',
          valueStyle: 'flex:0 0 76px; text-align:right; font-family:' + SANS + '; font-size:12px; font-weight:500; color:' + TXT + '; font-variant-numeric:tabular-nums;'
        };
      })
    };
  }

  if (b.type === 'expand') {
    return {
      isExpand: true,
      key: b.key,
      title: b.title + ' · doar informativ',
      wrapStyle: MON_WRAP,
      capStyle: MON_CAP,
      capIconStyle: 'display:flex; color:#6f6558;',
      capIconEl: ic('lock', { size: 12 }),
      summary: monitorRows(E, ui, b.title, b.summary, 'sum'),
      detail: monitorRows(E, ui, b.title, b.detail, 'det'),
      moreLabel: 'Detalii (' + b.detail.length + ')',
      lessLabel: 'Ascunde detaliile',
      toggleStyle: 'display:flex; align-items:center; justify-content:center; gap:6px; width:100%; min-height:44px; padding:8px 14px; border:none; border-top:1px solid rgba(255,255,255,0.045); background:rgba(255,255,255,0.015); color:' + TXT3 + '; font-family:' + SANS + '; font-size:11px; text-transform:uppercase; letter-spacing:0.08em; cursor:pointer;',
      chevEl: ic('chevronDown', { size: 13 })
    };
  }

  if (b.type === 'slots') {
    return {
      isSlots: true,
      gridStyle: 'display:grid; grid-template-columns:repeat(auto-fit,minmax(132px,1fr)); gap:10px;',
      items: b.items.map((sIt) => ({
        name: sIt.name,
        hint: sIt.hint,
        iconEl: ic(sIt.icon, { size: 20 }),
        style: 'padding:16px 12px; border-radius:16px; text-align:center; background:repeating-linear-gradient(135deg, rgba(255,255,255,0.02) 0 8px, transparent 8px 16px); border:1px dashed rgba(255,255,255,0.13);',
        iconStyle: 'display:flex; justify-content:center; color:#6f6558; margin-bottom:9px;',
        nameStyle: 'font-family:' + SANS + '; font-size:12px; font-weight:500; color:#a99c8d;',
        hintStyle: 'font-family:' + SANS + '; font-size:10px; font-weight:300; color:#6b6053; margin-top:3px;'
      }))
    };
  }

  if (b.type === 'cameraGrid') {
    return {
      isCameraGrid: true,
      items: b.items.map((c) => {
        const mapped = E.mapped(c.slot);
        const online = mapped && E.available(c.slot);
        const irMapped = E.mapped(c.ir);
        const irOn = irMapped && E.isOn(c.ir);
        const wiperMapped = c.wiper ? E.mapped(c.wiper) : false;
        const stateTxt = mapped ? (online ? E.rawState(c.slot) : 'indisponibil') : 'VERIFY · nemapat';
        return {
          label: c.label,
          status: stateTxt === 'idle' ? 'Inactiv' : stateTxt === 'recording' ? 'Înregistrează' : stateTxt === 'streaming' ? 'Transmite' : stateTxt,
          hasWiper: !!c.wiper,
          wrapStyle: 'position:relative; height:168px; border-radius:16px; overflow:hidden; background:linear-gradient(170deg,#161310 0%,#0f0d0b 100%); border:1px solid rgba(255,255,255,0.07);',
          noSignalStyle: 'position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;',
          noSignalIconStyle: 'display:flex; color:' + (online ? '#6f6558' : '#5a4f45') + ';',
          noSignalIconEl: ic(online ? 'camera' : 'ban', { size: 26 }),
          noSignalTextStyle: 'font-family:' + SANS + '; font-size:11px; font-weight:300; color:#6f6558;',
          noSignalText: online ? 'Fără preview live' : mapped ? 'Feed indisponibil' : 'Cameră nemapată',
          fadeStyle: 'position:absolute; inset:0; background:linear-gradient(180deg, rgba(14,9,5,0.35) 0%, transparent 40%, rgba(14,9,5,0.92) 100%); pointer-events:none;',
          badgeStyle: 'position:absolute; left:11px; top:10px; display:flex; align-items:center; gap:6px; padding:4px 9px; border-radius:100px; font-family:' + SANS + '; font-size:9.5px; font-weight:500; color:' + (online ? '#dcd0c1' : mapped ? '#e8a08a' : ORANGE) + '; background:rgba(12,9,7,0.7); border:1px solid ' + (online ? 'rgba(255,255,255,0.12)' : 'rgba(226,120,90,0.35)') + ';',
          badgeDotStyle: 'width:6px; height:6px; border-radius:50%; background:' + (online ? '#6fbf73' : mapped ? '#e2785a' : ORANGE) + ';',
          badge: online ? 'Online' : mapped ? 'Offline' : 'VERIFY',
          labelWrapStyle: 'position:absolute; left:13px; bottom:11px; pointer-events:none;',
          nameStyle: 'font-family:' + SANS + '; font-size:12.5px; font-weight:500; color:' + TXT + ';',
          statusStyle: 'font-family:' + SANS + '; font-size:10.5px; font-weight:300; color:#a89a89;',
          ctrlRowStyle: 'position:absolute; right:11px; bottom:11px; display:flex; gap:7px;',
          irStyle: 'width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:' + (irMapped ? 'pointer' : 'default') + '; opacity:' + (irMapped ? 1 : 0.45) + '; background:' + (irOn ? 'linear-gradient(140deg,' + ORANGE_HI + ',#DE7420)' : 'rgba(20,15,11,0.7)') + '; border:1px solid ' + (irOn ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.12)') + ';',
          irIconEl: ic('sun', { size: 15, color: irOn ? '#2a1608' : '#b3a89c' }),
          irTitle: irMapped ? 'Iluminare IR' : 'VERIFY · slot IR nemapat',
          onIr: irMapped ? () => E.toggle(c.ir) : noop,
          wiperStyle: 'width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:' + (wiperMapped ? 'pointer' : 'default') + '; opacity:' + (wiperMapped ? 1 : 0.45) + '; background:rgba(20,15,11,0.7); border:1px solid rgba(255,255,255,0.12);',
          wiperIconEl: ic('refresh', { size: 15, color: '#b3a89c' }),
          wiperTitle: wiperMapped ? 'Ştergător' : 'VERIFY · slot ştergător nemapat',
          onWiper: wiperMapped ? () => E.toggle(c.wiper) : noop
        };
      })
    };
  }

  if (b.type === 'timeline') {
    const labels = lastDayLabels(DAYS7);
    const rows = b.rows.map((row) => {
      const id = E.idOf(row.slot);
      const segs = id && hist.raw ? timelineSegments(hist.raw, id, DAYS7, 16) : null;
      const use = segs || [['idle', 16]];
      return {
        label: row.label + (E.mapped(row.slot) ? '' : ' · VERIFY'),
        rowStyle: 'display:grid; grid-template-columns:' + (bpOf(ui).mob ? '86px' : '132px') + ' minmax(0,1fr); align-items:center; gap:' + (bpOf(ui).mob ? '8px' : '12px') + '; margin-bottom:6px;',
        labelStyle: 'font-family:' + SANS + '; font-size:11.5px; font-weight:400; color:' + (E.mapped(row.slot) ? '#bdb1a4' : ORANGE) + '; text-align:right;' + labelWrap(ui),
        barStyle: 'display:flex; gap:1.5px; height:22px; border-radius:7px; overflow:hidden; background:rgba(255,255,255,0.03);',
        segs: use.map((sg) => ({ style: 'flex:' + sg[1] + ' 1 0; background:' + (STATE_COLORS[sg[0]] || STATE_COLORS.idle) + ';' }))
      };
    });
    return {
      isTimeline: true,
      title: b.title,
      hint: hist.loading ? 'se încarcă istoricul…' : hist.error ? 'istoric indisponibil' : b.hint,
      wrapStyle: 'margin-bottom:14px;',
      capStyle: 'display:flex; align-items:baseline; justify-content:space-between; gap:12px; margin-bottom:11px;',
      capTitleStyle: 'font-family:' + SANS + '; font-size:10.5px; font-weight:500; text-transform:uppercase; letter-spacing:0.09em; color:' + TXT3 + ';',
      capHintStyle: 'font-family:' + SANS + '; font-size:11px; font-weight:300; color:#8a7c6c;',
      rows,
      axisStyle: 'display:grid; grid-template-columns:' + (bpOf(ui).mob ? '86px' : '132px') + ' minmax(0,1fr); gap:' + (bpOf(ui).mob ? '8px' : '12px') + '; margin-top:8px;',
      axisInnerStyle: 'display:flex; justify-content:space-between;',
      axisLabels: labels.map((l) => ({ label: l, style: 'font-family:' + SANS + '; font-size:9.5px; font-weight:300; color:#6f6558;' })),
      legendStyle: 'display:flex; flex-wrap:wrap; gap:14px; margin-top:12px;',
      legend: (b.legend || []).map((lg) => ({
        label: lg[1],
        rowStyle: 'display:flex; align-items:center; gap:7px;',
        dotStyle: 'width:9px; height:9px; border-radius:3px; flex-shrink:0; background:' + (STATE_COLORS[lg[0]] || STATE_COLORS.idle) + ';',
        labelStyle: 'font-family:' + SANS + '; font-size:10.5px; font-weight:300; color:#9a8f84;'
      }))
    };
  }

  if (b.type === 'chart') {
    const labels = lastDayLabels(DAYS7);
    const ckey = b.title;
    const hc = ui.hoverChart;
    const hv = hc && hc.key === ckey ? hc.idx : null;
    const onHover = (idx) => {
      const cur = ui.hoverChart;
      if (idx === null) {
        if (cur) ui.setHoverChart(null);
        return;
      }
      if (!cur || cur.key !== ckey || cur.idx !== idx) ui.setHoverChart({ key: ckey, idx });
    };

    const built = [];
    b.series.forEach((sdef) => {
      let values = null;
      if (sdef.sum) {
        const parts = sdef.sum
          .map((sl) => E.idOf(sl))
          .filter(Boolean)
          .map((id) => fillGaps(dailyAverage(hist.raw, id, DAYS7)))
          .filter(Boolean);
        if (parts.length) {
          values = new Array(DAYS7).fill(0);
          parts.forEach((p) => p.forEach((v, i) => { values[i] += v; }));
          values = values.map((v) => Math.round(v * 10) / 10);
        }
      } else {
        const id = E.idOf(sdef.slot);
        if (id && hist.raw) {
          const series = sdef.agg === 'last' ? dailyLast(hist.raw, id, DAYS7) : dailyAverage(hist.raw, id, DAYS7);
          values = fillGaps(series);
        }
      }
      if (values) built.push({ name: sdef.name, color: sdef.color, dashed: sdef.dashed, values });
    });

    const hasData = built.length > 0;
    const chartEl = hasData
      ? (b.kind === 'bars'
          ? barChart(built[0].values, labels, b.unit, hv, onHover, bpOf(ui).mob)
          : lineChart(built, labels, b.unit, b.yMin, b.yMax, hv, onHover, bpOf(ui).mob))
      : null;

    return {
      isChart: true,
      title: b.title,
      hint: hist.loading ? 'se încarcă istoricul…' : hasData ? b.hint : 'fără date în recorder',
      hasData,
      emptyText: hist.error
        ? 'Istoricul nu a putut fi citit: ' + hist.error
        : 'Nicio serie mapată încă — completează sloturile din „Mapare entităţi".',
      emptyStyle: 'padding:34px 16px; text-align:center; border-radius:14px; font-family:' + SANS + '; font-size:11.5px; font-weight:300; color:' + TXT3 + '; background:repeating-linear-gradient(135deg, rgba(255,255,255,0.02) 0 8px, transparent 8px 16px); border:1px dashed rgba(255,255,255,0.11);',
      wrapStyle: 'margin-bottom:22px;',
      capStyle: 'display:flex; align-items:baseline; justify-content:space-between; gap:12px; margin-bottom:10px;',
      capTitleStyle: 'font-family:' + SANS + '; font-size:10.5px; font-weight:500; text-transform:uppercase; letter-spacing:0.09em; color:' + TXT3 + ';',
      capHintStyle: 'font-family:' + SANS + '; font-size:11px; font-weight:300; color:#8a7c6c;',
      chartEl,
      legendStyle: 'display:flex; flex-wrap:wrap; gap:16px; margin-top:12px;',
      legend: built.map((sBuilt) => ({
        label: sBuilt.name,
        value: decSep(sBuilt.values[sBuilt.values.length - 1]) + ' ' + b.unit,
        rowStyle: 'display:flex; align-items:center; gap:7px;',
        dotStyle: 'width:8px; height:8px; border-radius:' + (sBuilt.dashed ? '2px' : '50%') + '; flex-shrink:0; background:' + sBuilt.color + ';',
        labelStyle: 'font-family:' + SANS + '; font-size:11px; font-weight:400; color:#bdb1a4;',
        valueStyle: 'font-family:' + SANS + '; font-size:11px; font-weight:500; color:' + TXT + '; font-variant-numeric:tabular-nums;'
      }))
    };
  }

  if (b.type === 'accordion') {
    return { isAccordion: true, items: b.items.map((u) => buildAccordionItem(E, ui, u)) };
  }

  if (b.type === 'nowPlaying') return buildNowPlaying(E, ui);

  return {};
}

// ----------------------------------------------------------------- acordeon
/** Valoarea ţintă a unui rând de acordeon (temperatură climate sau entitate number). */
function setpointInfo(E, cardDef, sp) {
  if (sp.kind === 'climate') {
    const slot = cardDef.slot;
    const step = Math.max(1, E.climateStep(slot));
    return {
      label: sp.label,
      unit: '°C',
      val: E.climateTarget(slot),
      stale: E.climateTargetStale(slot),
      min: E.climateMin(slot),
      max: E.climateMax(slot),
      // acelaşi pas minim de 1° ca în dialInfo — vezi comentariul de acolo
      step,
      decimals: E.tempDecimals(step),
      mapped: E.mapped(slot),
      writable: E.mapped(slot) && E.available(slot),
      set: (v) => E.setClimateTarget(slot, v)
    };
  }
  // limitele entitatii au prioritate; bounds din definitie doar ca fallback
  const fb = sp.bounds || {};
  // Timer-ele LG: contract write-only prin bridge — bounds, gate și receipt.
  const lgKind = lgTimerKindOf(sp.slot);
  if (lgKind) {
    const b = lgTimerBounds(lgKind);
    const receipt = E.lgTimerReceipt(sp.slot);
    const blocked = lgTimerBlockedReason(lgKind, E.rawState(climateSlotOfCard(cardDef)));
    const unit = lgTimerUnit(lgKind);
    return {
      label: sp.label,
      unit,
      val: receipt ? receipt.value : null,
      min: b.min,
      max: b.max,
      step: b.step,
      decimals: 0,
      mapped: E.mapped(sp.slot),
      unset: !receipt,
      lgTimer: lgKind,
      blocked,
      receiptText: receipt ? formatTimerReceipt(receipt) : '',
      writable: E.mapped(sp.slot) && !blocked,
      set: (v) => E.setNumber(sp.slot, v)
    };
  }
  const b = E.numberBounds(sp.slot, fb.min !== undefined ? fb.min : 0, fb.max !== undefined ? fb.max : 100, fb.step || 1);
  const unset = isLgTimerUnset(sp.slot, E.rawState(sp.slot), E.numberValue(sp.slot));
  return {
    label: sp.label,
    unit: sp.unit === undefined ? E.attr(sp.slot, 'unit_of_measurement') || '' : sp.unit,
    val: E.numberValue(sp.slot),
    min: b.min,
    max: b.max,
    step: b.step,
    decimals: b.step < 1 ? 1 : 0,
    mapped: E.mapped(sp.slot),
    unset,
    writable: E.numberControllable(sp.slot),
    set: (v) => E.setNumber(sp.slot, v)
  };
}

/** Slotul climate al cardului (pentru gating-ul timerelor LG). */
function climateSlotOfCard(cardDef) {
  return cardDef && cardDef.slot ? cardDef.slot : null;
}

export function buildAccordionItem(E, ui, u) {
  const def = ui.catalog.CARD_BY_ID[u.card];
  const open = ui.openAcc === u.card;
  const mapped = def ? E.mapped(def.slot) : false;
  const avail = def ? E.available(def.slot) : false;
  const on = mapped && E.isOn(def.slot);
  const stop = (e) => { if (e && e.stopPropagation) e.stopPropagation(); };

  // meta live, în locul string-urilor fixe din mockup
  let meta;
  if (!mapped) meta = 'VERIFY · entitate nemapată';
  else if (!avail) meta = 'Indisponibil în HA';
  else {
    const state = def.kind === 'climate' ? HVAC_SHORT[E.rawState(def.slot)] || E.rawState(def.slot) : on ? 'Pornit' : 'Oprit';
    const amb = ambientText(E, def);
    meta = state + (amb ? ' · ' + amb : '');
  }

  return {
    id: u.card,
    name: def ? E.friendlyName(def.slot, def.label) : u.card,
    meta,
    open,
    wrapStyle: 'margin-bottom:10px; border-radius:16px; overflow:hidden; background:rgba(255,255,255,0.028); border:1px solid ' + (open ? 'rgba(240,138,44,0.24)' : 'rgba(255,255,255,0.065)') + ';',
    headStyle: 'display:flex; align-items:center; justify-content:space-between; gap:12px; padding:13px 14px; cursor:pointer;' +
      (antetPeDouaRanduri(ui) ? ' flex-wrap:wrap;' : ''),
    headLeftStyle: 'display:flex; align-items:center; gap:12px; min-width:0;' +
      (antetPeDouaRanduri(ui) ? ' flex:1 1 100%;' : ''),
    headRightStyle: 'display:flex; align-items:center; gap:12px; flex-shrink:0;' +
      (antetPeDouaRanduri(ui) ? ' margin-left:auto;' : ''),
    iconWrapStyle: 'width:36px; height:36px; flex-shrink:0; border-radius:12px; display:flex; align-items:center; justify-content:center; color:' + (on ? '#2a1608' : TXT2) + '; background:' + (on ? 'linear-gradient(140deg,' + ORANGE_HI + ',#DE7420)' : 'rgba(255,255,255,0.055)') + '; border:1px solid ' + (on ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)') + ';',
    iconEl: ic(def ? def.icon : 'home', { size: 17 }),
    nameStyle: 'font-family:' + SANS + '; font-size:14px; font-weight:500; color:' + TXT + '; line-height:1.25; ' + clamp2(ui),
    metaStyle: 'font-family:' + SANS + '; font-size:11px; font-weight:300; color:' + (!mapped ? ORANGE : on ? '#c8a173' : TXT3) + '; margin-top:2px;',
    togglePillStyle: 'display:flex; align-items:center; padding:3px; border-radius:100px; cursor:' + (mapped && avail ? 'pointer' : 'default') + '; width:50px; flex-shrink:0; justify-content:' + (on ? 'flex-end' : 'flex-start') + '; opacity:' + (mapped && avail ? 1 : 0.55) + '; background:' + (on ? PILL_ON : PILL_OFF) + '; border:1px solid ' + (on ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)') + '; ' + (on ? 'box-shadow:0 4px 12px -6px rgba(226,121,58,0.55), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -2px 4px rgba(150,60,10,0.32);' : PILL_SHADOW_OFF),
    toggleKnobStyle: 'width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:' + (on ? KNOB_ON : KNOB_OFF) + '; ' + KNOB_SHADOW,
    toggleIconEl: ic('power', { size: 12.5, color: on ? '#C4600F' : '#cfc4b8', sw: 2.2 }),
    chevStyle: 'display:flex; align-items:center; gap:7px; flex-shrink:0; padding:' + (bpOf(ui).mob ? '10px' : '6px 11px 6px 13px') + '; border-radius:100px; cursor:pointer; font-family:' + SANS + '; font-size:11.5px; font-weight:400; color:' + (open ? '#f0c79b' : '#b3a89c') + '; background:' + (open ? 'rgba(240,138,44,0.1)' : 'rgba(255,255,255,0.05)') + '; border:1px solid ' + (open ? 'rgba(240,138,44,0.28)' : 'rgba(255,255,255,0.09)') + ';',
    // pe mobil butonul e doar chevron (starea deschis/închis o arată rotaţia)
    chevLabel: bpOf(ui).mob ? '' : open ? 'Închide' : 'Setări',
    chevIconStyle: 'display:flex; transform:rotate(' + (open ? '180deg' : '0deg') + '); transition:transform .18s ease;',
    chevEl: ic('chevronDown', { size: 15, sw: 1.9 }),
    bodyStyle: 'padding:2px 14px 14px; border-top:1px solid rgba(255,255,255,0.055);',
    hasSchedule: !!u.schedule,
    hasSetpoints: (u.setpoints || []).length > 0,
    setpointHeaderStyle: 'font-family:' + SANS + '; font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.09em; color:' + TXT3 + '; margin:15px 0 8px; padding-top:13px; border-top:1px solid rgba(255,255,255,0.05);',
    setpointGridStyle: 'display:grid; grid-template-columns:repeat(' + (bpOf(ui).mob ? 1 : 2) + ',minmax(0,1fr)); gap:8px;',
    setpoints: (u.setpoints || []).map((sp) => {
      const i = setpointInfo(E, def, sp);
      const shown = !i.mapped
        ? VERIFY
        : i.lgTimer
          ? (i.unset ? UNSET : (i.val === null ? NA : String(i.val) + (i.unit ? ' ' + i.unit : '')))
          : i.unset ? UNSET : i.val === null ? NA : (i.decimals ? decSep(i.val.toFixed(i.decimals)) : String(Math.round(i.val))) + (i.unit ? ' ' + i.unit : '');
      const bump = numberBumpHandlers(i);
      const hint = !i.mapped
        ? 'slot nemapat'
        : i.lgTimer
          ? (i.blocked
              ? i.blocked
              : i.unset
                ? (i.lgTimer === 'sensor.lg_somn_min' ? 'Nesetat · ore întregi' : 'Nesetat · pas 15 min, 0 = anulare')
                : 'Trimis ' + i.receiptText + ' · fără confirmare continuă LG')
          : i.unset ? 'Niciun temporizator activ · setează cu +/−' : 'pas ' + i.step + ' · ' + i.min + '–' + i.max + ' ' + i.unit;
      return {
        label: i.label,
        wrapStyle: 'display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; border-radius:14px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.07);' + (i.blocked ? ' opacity:0.55;' : ''),
        labelStyle: 'font-family:' + SANS + '; font-size:11.5px; font-weight:400; color:#bdb1a4;',
        hintStyle: 'font-family:' + SANS + '; font-size:10px; font-weight:300; color:' + (i.mapped && !i.blocked ? TXT3 : ORANGE) + '; margin-top:2px;',
        hint,
        valStyle: 'font-family:' + DOTO + '; font-size:20px; font-weight:600; color:' + (shown === VERIFY ? ORANGE : ORANGE) + '; letter-spacing:0.02em;' + (shown === VERIFY ? ' font-size:13px;' : '') + (i.lgTimer && !i.unset ? ' opacity:0.55;' : ''),
        val: shown,
        // 44 şi pe tabletele cu deget (pointer: coarse), nu doar sub 760px
        btnStyle: 'width:' + (bpOf(ui).mob || bpOf(ui).coarse ? 44 : 30) + 'px; height:' + (bpOf(ui).mob || bpOf(ui).coarse ? 44 : 30) + 'px; flex-shrink:0; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:' + (i.writable ? 'pointer' : 'default') + '; opacity:' + (i.writable ? 1 : 0.45) + '; font-family:' + SANS + '; font-size:16px; font-weight:400; color:#d6cabb; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09);',
        onMinus: bump.onMinus,
        onPlus: bump.onPlus
      };
    }),
    sections: (u.sections || []).map((section) => ({
      title: section.title,
      headerStyle: 'font-family:' + SANS + '; font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.09em; color:' + TXT3 + '; margin:15px 0 8px; padding-top:13px; border-top:1px solid rgba(255,255,255,0.05);',
      gridStyle: 'display:grid; grid-template-columns:repeat(' + accCols(ui, section.cols) + ',minmax(0,1fr)); gap:8px;',
      items: section.items.map((item) =>
        item.action ? buildActionTile(E, ui, def, item, u.card, section.title) : buildItem(E, ui, item, u.card + ':' + section.title)
      )
    })),
    onExpand: () => ui.setOpenAcc(open ? null : u.card),
    onPower: (e) => { stop(e); if (mapped && avail) E.toggle(def.slot); }
  };
}

/** Tile dintr-o secţiune de acordeon, legat de o acţiune reală pe entitate. */
function buildActionTile(E, ui, def, item, cardId, context) {
  const res = resolveAction(E, def ? def.slot : null, item.action);
  const on = res.active;
  const key = 'acc:' + cardId + ':' + item.label;
  // v1.1.0: valorile tehnice (fan_mode: turbo etc.) nu se mai afiseaza sub
  // eticheta; explicatia umana traieste in tooltip (dictionarul descriptions).
  const value = res.supported ? '' : VERIFY;
  return {
    iconEl: ic(item.icon, { size: 16, color: on ? '#2a1608' : TXT2 }),
    label: item.label,
    value,
    tileStyle: tileStyleFor(on, res.supported) + (res.supported ? '' : ' opacity:0.55;'),
    iconWrapStyle: iconWrapFor(on),
    labelStyle: labelFor(on) + labelWrap(ui),
    valueStyle: verifyValueStyle(on, value),
    wrapStyle: 'position:relative; display:flex; min-width:0;',
    tipText: res.supported ? (describe(context, item.label) || item.label) : item.label + ' · ' + res.reason,
    showTip: ui.hoverKey === key,
    tipStyle: TOOLTIP,
    onEnter: () => ui.setHoverKey(key),
    onLeave: () => ui.setHoverKey(null),
    onToggle: (e) => { if (e && e.stopPropagation) e.stopPropagation(); if (res.supported) res.run(); }
  };
}

export function buildPageCard(E, ui, hist, c) {
  return {
    title: c.title,
    cardStyle: glassCard() + ' display:flex; flex-direction:column; order:' + (c.order === undefined ? 50 : c.order * 10) + ';' + (c.wide ? ' grid-column:1 / -1;' : ''),
    headerStyle: 'font-family:' + SANS + '; font-size:14.5px; font-weight:500; color:' + TXT + '; margin-bottom:14px;',
    blocks: c.blocks.map((b) => buildBlock(E, ui, hist, b))
  };
}

// --------------------------------------------------------------- now playing
function buildNowPlaying(E, ui) {
  const { DEVICE_CARDS } = ui.catalog;
  const live = DEVICE_CARDS.filter((c) => c.kind === 'media' && E.mapped(c.slot) && E.isOn(c.slot))[0];
  const np = !!live;
  const vol = live ? E.volume(live.slot) : null;
  const muted = live ? E.isMuted(live.slot) : false;
  const src = live ? E.currentSource(live.slot) : null;
  const volPct = vol === null ? 0 : vol;

  const ctrls = np
    ? [
        { icon: 'chevLeft', label: 'Volum −', onClick: () => E.setVolume(live.slot, Math.max(0, volPct - 5)) },
        { icon: muted ? 'ban' : 'playCircle', label: muted ? 'Reactivează sonorul' : 'Mut', primary: true, onClick: () => E.setMute(live.slot, !muted) },
        { icon: 'chevRight', label: 'Volum +', onClick: () => E.setVolume(live.slot, Math.min(100, volPct + 5)) },
        { icon: 'sliders', label: 'Setări complete', onClick: () => ui.setModalId(live.id) }
      ]
    : [];

  return {
    isNowPlaying: true,
    name: np ? E.friendlyName(live.slot, live.label) : 'Niciun player activ',
    sub: np
      ? (live.zone || live.model) + ' · ' + (src || 'sursă necunoscută') + ' · volum ' + (vol === null ? '—' : vol + '%')
      : 'Toate televizoarele mapate sunt în standby',
    state: np ? (muted ? 'Mut' : E.rawState(live.slot) === 'playing' ? 'Redă' : 'Pornit') : 'Inactiv',
    showControls: np,
    volBarStyle: 'height:4px; border-radius:100px; margin-top:11px; background:rgba(255,255,255,0.09); overflow:hidden;',
    volFillStyle: 'height:100%; border-radius:100px; width:' + volPct + '%; background:' + PILL_ON + ';',
    ctrlRowStyle: 'display:flex; align-items:center; gap:8px; flex-shrink:0;',
    ctrls: ctrls.map((c) => ({
      iconEl: ic(c.icon, { size: 15, color: c.primary ? '#3a1c06' : '#cfc4b8' }),
      label: c.label,
      onClick: c.onClick,
      style: 'width:36px; height:36px; flex-shrink:0; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; background:' + (c.primary ? PILL_ON : 'rgba(255,255,255,0.05)') + '; border:1px solid ' + (c.primary ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.09)') + ';'
    })),
    // pe mobil rândul are voie să se rupă — la 360px icon + titlu + 4 butoane
    // + badge-ul de stare împingeau badge-ul 3px în afara viewportului
    // (singura problemă reală de responsive din auditul v1.2.0)
    wrapStyle: 'display:flex; align-items:center; gap:' + (bpOf(ui).mob ? '10px' : '14px') + '; padding:' + (bpOf(ui).mob ? '13px 12px' : '16px') + ';' + (bpOf(ui).mob ? ' flex-wrap:wrap;' : '') + ' border-radius:18px; background:' + (np ? 'linear-gradient(158deg, rgba(240,138,44,0.1), rgba(255,255,255,0.02))' : 'rgba(255,255,255,0.03)') + '; border:1px solid ' + (np ? 'rgba(240,138,44,0.22)' : 'rgba(255,255,255,0.065)') + ';',
    iconWrapStyle: 'width:46px; height:46px; flex-shrink:0; border-radius:14px; display:flex; align-items:center; justify-content:center; color:' + (np ? '#2a1608' : TXT2) + '; background:' + (np ? 'linear-gradient(140deg,' + ORANGE_HI + ',#DE7420)' : 'rgba(255,255,255,0.055)') + ';',
    iconEl: ic('playCircle', { size: 20 }),
    titleStyle: 'font-family:' + SANS + '; font-size:14px; font-weight:500; color:' + TXT + ';',
    subStyle: 'font-family:' + SANS + '; font-size:11.5px; font-weight:300; color:' + TXT3 + '; margin-top:2px;',
    stateStyle: 'font-family:' + SANS + '; font-size:11px; font-weight:500; padding:6px 12px; border-radius:100px; flex-shrink:0; color:' + (np ? '#2a1608' : '#9a8f84') + '; background:' + (np ? ORANGE : 'rgba(255,255,255,0.06)') + ';'
  };
}

// -------------------------------------------------------------- device dials
export function dialInfo(E, def) {
  const d = def.dial || {};
  if (d.kind === 'climate') {
    const val = E.climateTarget(def.slot);
    const step = Math.max(1, E.climateStep(def.slot));
    return {
      val,
      unit: d.unit || '°',
      min: E.climateMin(def.slot),
      max: E.climateMax(def.slot),
      // Pas de UI de minim 1°: integrarea declară 0.5 (LG/Vortex/Vivax), dar
      // comenzile la granulaţie de 1° rămân valide (multiplu de 0.5). Dacă un
      // hardware ar declara un pas MAI MARE de 1°, acela e respectat.
      step,
      decimals: E.tempDecimals(step),
      // ţinta poate fi ultima valoare memorată (LG oprit) — se afişează estompat
      stale: E.climateTargetStale(def.slot),
      writable: E.mapped(def.slot) && E.available(def.slot),
      mapped: E.mapped(def.slot),
      set: (v) => E.setClimateTarget(def.slot, v)
    };
  }
  if (d.kind === 'number') {
    const lgKind = lgTimerKindOf(d.slot);
    if (lgKind) {
      const b = lgTimerBounds(lgKind);
      const receipt = E.lgTimerReceipt(d.slot);
      return {
        val: receipt ? receipt.value : null,
        unit: lgTimerUnit(lgKind),
        min: b.min,
        max: b.max,
        step: b.step,
        decimals: 0,
        unset: !receipt,
        lgTimer: lgKind,
        receiptText: receipt ? formatTimerReceipt(receipt) : '',
        writable: E.mapped(d.slot),
        mapped: E.mapped(d.slot),
        set: (v) => E.setNumber(d.slot, v)
      };
    }
    const b = E.numberBounds(d.slot, d.min, d.max, d.step);
    return {
      val: E.numberValue(d.slot),
      unit: d.unit || E.attr(d.slot, 'unit_of_measurement') || '%',
      min: b.min,
      max: b.max,
      step: b.step,
      decimals: 0,
      unset: isLgTimerUnset(d.slot, E.rawState(d.slot), E.numberValue(d.slot)),
      writable: E.numberControllable(d.slot),
      mapped: E.mapped(d.slot),
      set: (v) => E.setNumber(d.slot, v)
    };
  }
  if (d.kind === 'volume') {
    // TV oprit (standby): volumul nu există — dial-ul devine read-only şi
    // starea se comunică prin textul "Standby" (ambient + inelul din sidebar).
    const standby = E.mapped(def.slot) && E.available(def.slot) && E.rawState(def.slot) === 'off';
    return {
      val: E.volume(def.slot),
      unit: d.unit || '%',
      min: 0,
      max: 100,
      step: d.step || 5,
      decimals: 0,
      standby,
      writable: E.mapped(def.slot) && E.available(def.slot) && !standby,
      mapped: E.mapped(def.slot),
      set: (v) => E.setVolume(def.slot, v)
    };
  }
  return { val: null, unit: '', min: 0, max: 1, step: 1, decimals: 0, writable: false, mapped: false, set: noop };
}

function ambientText(E, def) {
  const a = def.ambient || {};
  if (a.kind === 'climateCurrent') {
    return (a.prefix || '') + E.fmt(def.slot, { attr: 'current_temperature', unit: '°C' });
  }
  if (a.kind === 'slotOrCurrent') {
    if (E.mapped(a.slot)) return (a.prefix || '') + E.fmt(a.slot, { unit: a.unit });
    return (a.prefix || '') + E.fmt(def.slot, { attr: 'current_temperature', unit: a.unit || '°C' });
  }
  if (a.kind === 'compose') {
    return a.parts
      .map((p) => {
        // Unitatea vine EXCLUSIV din sufixul p[2] al definiţiei — fmt primeşte
        // unit:'' ca să nu adauge şi unit_of_measurement al entităţii (altfel
        // apărea dublat: "Apă 32.0 °C °C"). Fără sufix când valoarea lipseşte.
        const v = E.fmt(p[0], { unit: '' });
        return p[1] + v + (v === VERIFY || v === NA ? '' : p[2] || '');
      })
      .join('');
  }
  if (a.kind === 'mediaState') {
    if (!E.mapped(def.slot)) return VERIFY;
    if (!E.available(def.slot)) return NA;
    const st = E.rawState(def.slot);
    const src = E.currentSource(def.slot);
    const label = st === 'playing' ? 'Redă' : st === 'paused' ? 'Pauză' : st === 'on' ? 'Pornit' : 'Standby';
    return label + (src ? ' · ' + src : '');
  }
  return '';
}

function buildToggleAction(E, ui, def, item, size) {
  const res = resolveAction(E, def.slot, item.action);
  const key = 'act:' + item.id;
  return {
    res,
    key,
    tip: res.supported ? (describe(null, item.label) || item.label) : item.label + ' · ' + res.reason,
    showTip: ui.hoverKey === key,
    onEnter: () => ui.setHoverKey(key),
    onLeave: () => ui.setHoverKey(null)
  };
}

export function buildDeviceCard(E, ui, def) {
  const mob = bpOf(ui).mob;
  // butoanele rotunde: 44 şi pe tabletele cu deget (pointer: coarse)
  const touch44 = mob || bpOf(ui).coarse;
  const a = E.mapped(def.slot) && E.isOn(def.slot);
  const di = dialInfo(E, def);
  const frac = di.val === null ? 0 : (di.val - di.min) / ((di.max - di.min) || 1);
  const stop = (e) => { if (e && e.stopPropagation) e.stopPropagation(); };
  const canToggle = E.mapped(def.slot) && E.available(def.slot);

  const dialVal = di.val === null ? NA : (di.decimals ? decSep(di.val.toFixed(di.decimals)) : String(Math.round(di.val)));
  // fără unitate lângă valoarea lipsă ("—", nu "—%")
  const dialUnitShown = di.val === null ? '' : di.unit;
  const dialBump = def.dial && def.dial.kind === 'number'
    ? numberBumpHandlers(di)
    : {
      onMinus: (e) => { stop(e); if (di.writable && di.val !== null) di.set(di.val - di.step); },
      onPlus: (e) => { stop(e); if (di.writable) di.set((di.val === null ? di.min : di.val) + di.step); }
    };
  const targetLabel = di.standby ? 'Standby' : !di.mapped ? VERIFY : di.unset ? UNSET : di.val === null ? NA : dialVal + di.unit;
  // (v1.3.4) TV în standby: volumul nu există, deci cadranul se desena plin dar
  // cu "—" în centru, iar −/+ păreau active. Estompăm TOT blocul (0.55 — aceeaşi
  // convenţie ca la cadranul static Hisense), nu doar butoanele. Butoanele
  // rămân la opacitate 1 ÎN interiorul blocului, altfel s-ar compune
  // (0.55 × 0.45 ≈ 0.25) şi ar deveni ilizibile.
  const dialDimmed = !!di.standby;
  const btnOpacity = di.writable || dialDimmed ? 1 : 0.45;

  return {
    id: def.id,
    label: def.label,
    model: def.model,
    ambient: ambientText(E, def),
    // Carduri fără cadran (ex. pompa de filtrare, strict on/off): în locul
    // dial-ului se afişează un bloc de stare cu aceeaşi înălţime (132px),
    // ca layout-ul cardului să rămână identic cu al vecinilor.
    // Un dial de volum se ascunde şi când media_player-ul nu declară
    // VOLUME_SET (bit 4) — ex. Hisense prin HomeKit.
    hasDial: !!def.dial && !(def.dial.kind === 'volume' && E.mapped(def.slot) && !E.supportsFeature(def.slot, 4)),
    // v1.2.6: in locul lui, un cadran STATIC cu aceeasi silueta — inelul
    // estompat (0.55, conventia pentru 'valid dar fara hardware'), in centru
    // sursa curenta / starea, spacer-e de latimea butoanelor -/+ ca centrul
    // sa ramana aliniat cu celelalte carduri. Nu e clickabil (n-ar controla
    // nimic); tooltip-ul explica de ce. Mute si sursele de mai jos raman
    // functionale.
    staticDial: !!def.dial && def.dial.kind === 'volume' && E.mapped(def.slot) && !E.supportsFeature(def.slot, 4),
    // (v1.3.5) acelaşi tratament ca dialRowStyle: creşte şi îşi centrează conţinutul.
    staticDialRowStyle: 'position:relative; flex:1 1 auto; display:flex; align-items:center; justify-content:center; gap:14px; margin-top:2px;',
    staticDialTicksEl: dialTicks(0, false, mob ? 116 : 132),
    staticDialVal: !E.available(def.slot) ? NA
      : E.isOn(def.slot) ? (E.currentSource(def.slot) || 'Pornit') : 'Standby',
    staticKnobValStyle: 'font-family:' + SANS + '; font-size:13px; font-weight:500; line-height:1.2; text-align:center; max-width:60px; color:' + (a ? '#f7f1e9' : '#9d9186') + '; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;',
    spacerStyle: 'width:' + (touch44 ? 44 : 30) + 'px; height:' + (touch44 ? 44 : 30) + 'px; flex-shrink:0;',
    staticDialTip: 'Televizorul nu expune controlul volumului prin integrarea lui (HomeKit) — cadranul arata doar sursa curenta. Mute si schimbarea sursei functioneaza din butoanele de mai jos.',
    showStaticTip: ui.hoverKey === 'sdial:' + def.id,
    onStaticEnter: () => ui.setHoverKey('sdial:' + def.id),
    onStaticLeave: () => ui.setHoverKey(null),
    // min-height (nu height) + flex:1 — pastreaza silueta de 132px, dar
    // absoarbe surplusul cardului si tine continutul centrat.
    noDialWrapStyle: 'min-height:132px; flex:1 1 auto; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; margin-top:2px;',
    noDialIconEl: ic(def.icon, { size: 34, color: a ? ORANGE : TXT3 }),
    noDialTextStyle: 'font-family:' + SANS + '; font-size:21px; font-weight:500; line-height:1; color:' + (a ? '#f7f1e9' : '#9d9186') + ';',
    noDialText: !E.mapped(def.slot) ? VERIFY : !E.available(def.slot) ? NA
      : a ? (def.stateLabels ? def.stateLabels[0] : 'Pornit') : (def.stateLabels ? def.stateLabels[1] : 'Oprit'),
    // (v1.3.5) Cardul e container flex vertical: grila il intinde la
    // inaltimea randului, iar surplusul se distribuie INAUNTRU (zona
    // cadranului creste si isi centreaza continutul), nu se aduna la baza.
    cardStyle: 'padding:16px 16px 14px; border-radius:22px; display:flex; flex-direction:column; background:' + CARD_BG + '; border:1px solid ' + CARD_BORDER + ';',
    headIconStyle: 'width:34px; height:34px; flex-shrink:0; border-radius:50%; display:flex; align-items:center; justify-content:center; color:' + (a ? '#2a1608' : TXT2) + '; background:' + (a ? 'linear-gradient(140deg,' + ORANGE_HI + ',#DE7420)' : 'rgba(255,255,255,0.06)') + '; border:1px solid ' + (a ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)') + ';',
    headIconEl: ic(def.icon, { size: 18 }),
    nameStyle: 'font-family:' + SANS + '; font-size:14px; font-weight:500; color:' + TXT + '; line-height:1.25; ' + clamp2(ui),
    modelStyle: 'font-family:' + SANS + '; font-size:10.5px; font-weight:300; color:' + TXT3 + '; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
    togglePillStyle: 'display:flex; align-items:center; padding:3px; border-radius:100px; cursor:' + (canToggle ? 'pointer' : 'default') + '; flex-shrink:0; width:50px; justify-content:' + (a ? 'flex-end' : 'flex-start') + '; opacity:' + (canToggle ? 1 : 0.55) + '; background:' + (a ? PILL_ON : PILL_OFF) + '; border:1px solid ' + (a ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)') + '; ' + (a ? PILL_SHADOW_ON : PILL_SHADOW_OFF),
    toggleKnobStyle: 'width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:' + (a ? KNOB_ON : KNOB_OFF) + '; ' + KNOB_SHADOW,
    toggleIconEl: ic('power', { size: 12.5, color: a ? '#C4600F' : '#cfc4b8', sw: 2.2 }),
    toggleTitle: canToggle ? 'Pornit / oprit' : 'VERIFY · entitate nemapată sau indisponibilă',
    ambientStyle: 'flex-shrink:0; font-family:' + SANS + '; font-size:12px; font-weight:300; color:' + (ambientText(E, def) === VERIFY ? ORANGE : TXT2) + '; text-align:center; margin:14px 0 4px;',
    dialWrapStyle: 'position:relative; width:' + (mob ? 116 : 132) + 'px; height:' + (mob ? 116 : 132) + 'px; flex-shrink:0; display:flex; align-items:center; justify-content:center;',
    dialTicksEl: dialTicks(frac, a, mob ? 116 : 132),
    knobStyle: 'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:' + (mob ? 64 : 74) + 'px; height:' + (mob ? 64 : 74) + 'px; border-radius:50%; display:flex; align-items:center; justify-content:center; gap:1px; background:radial-gradient(120% 120% at 30% 20%, #2e2620 0%, #17120f 70%); border:1px solid rgba(255,255,255,0.09); box-shadow:inset 0 2px 6px rgba(0,0,0,0.5), 0 10px 20px -10px rgba(0,0,0,0.8);',
    knobValStyle: 'font-family:' + SANS + '; font-size:21px; font-weight:500; line-height:1; color:' + (a ? '#f7f1e9' : '#9d9186') + ';' + (di.stale ? ' opacity:0.55;' : ''),
    knobUnitStyle: 'font-family:' + SANS + '; font-size:15px; font-weight:400; line-height:1; color:' + (a ? '#d8ccbe' : '#8c8177') + ';',
    dialVal,
    dialUnit: dialUnitShown,
    // titlu pe butoanele −/+ (pasul e comunicat aici, nu printr-o valoare
    // laterală ambiguă — vezi CHANGELOG 1.0.7 punctul 1.3)
    stepTitle: 'pas ' + (di.step === 0.5 ? '0.5' : String(di.step)) + di.unit,
    // Rândul cadranului: estompat integral când TV-ul e în standby (v1.3.4).
    dialRowStyle: 'flex:1 1 auto; display:flex; align-items:center; justify-content:center; gap:14px; margin-top:2px;' + (dialDimmed ? ' opacity:0.55;' : ''),
    roundBtnStyle: 'width:' + (touch44 ? 44 : 30) + 'px; height:' + (touch44 ? 44 : 30) + 'px; flex-shrink:0; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:' + (di.writable ? 'pointer' : 'default') + '; opacity:' + btnOpacity + '; font-family:' + SANS + '; font-size:16px; font-weight:400; color:#d6cabb; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09);',
    stepLabelStyle: 'font-family:' + SANS + '; font-size:11.5px; font-weight:300; color:' + TXT2 + '; white-space:nowrap;',
    stepLabel: (di.step === 0.5 ? '0.5' : String(di.step)) + di.unit,
    targetLabelStyle: 'font-family:' + SANS + '; font-size:13px; font-weight:' + (targetLabel === VERIFY ? 600 : 500) + '; color:' + (targetLabel === VERIFY ? ORANGE : a ? ORANGE : TXT3) + '; white-space:nowrap;',
    targetLabel,
    onMinus: dialBump.onMinus,
    onPlus: dialBump.onPlus,
    miniRowStyle: 'flex-shrink:0; display:grid; grid-template-columns:1fr 1fr; gap:12px; align-items:center; margin-top:14px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.06);',
    miniToggles: def.minis.map((mt, mi) => {
      const b = buildToggleAction(E, ui, def, mt);
      const on = b.res.active;
      return {
        label: mt.label,
        iconEl: ic(mt.icon, { size: 18 }),
        colStyle: 'position:relative; display:flex; flex-direction:column; align-items:center; gap:9px;' + (mi === 1 ? ' border-left:1px solid rgba(255,255,255,0.07); padding-left:12px;' : ''),
        labelRowStyle: 'display:flex; align-items:center; gap:7px; font-family:' + SANS + '; font-size:12px; font-weight:400; color:' + (on ? TXT : '#9a8f84') + ';',
        iconStyle: 'display:flex; color:' + (on ? ORANGE : TXT3) + ';',
        trackStyle: 'width:46px; height:25px; border-radius:100px; padding:3px; cursor:' + (b.res.supported ? 'pointer' : 'default') + '; opacity:' + (b.res.supported ? 1 : 0.45) + '; background:' + (on ? PILL_ON : PILL_OFF) + '; border:1px solid ' + (on ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)') + '; ' + (on ? PILL_SHADOW_ON : PILL_SHADOW_OFF),
        knobStyle: 'width:19px; height:19px; border-radius:50%; background:' + (on ? KNOB_ON : KNOB_OFF) + '; ' + KNOB_SHADOW + ' transition:transform .18s cubic-bezier(.4,1.3,.5,1); transform:translateX(' + (on ? '21px' : '0') + ');',
        tipText: b.tip,
        showTip: b.showTip,
        tipStyle: TOOLTIP,
        onEnter: b.onEnter,
        onLeave: b.onLeave,
        onToggle: (e) => { stop(e); if (b.res.supported) b.res.run(); }
      };
    }),
    circleRowStyle: 'flex-shrink:0; display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:' + (bpOf(ui).mob ? '9px' : '11px') + '; margin-top:14px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.06);',
    circles: def.circles.map((cb) => {
      const b = buildToggleAction(E, ui, def, cb);
      const on = b.res.active;
      return {
        iconEl: ic(cb.icon, { size: 18, color: on ? '#2a1608' : '#b3a89c' }),
        label: b.tip,
        wrapStyle: 'position:relative; display:flex; align-items:center; justify-content:center;',
        style: 'width:44px; height:44px; flex:0 0 44px; aspect-ratio:1; box-sizing:border-box; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:' + (b.res.supported ? 'pointer' : 'default') + '; opacity:' + (b.res.supported ? 1 : 0.45) + '; background:' + (on ? PILL_ON : 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.025) 100%)') + '; border:1px solid ' + (on ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.085)') + '; ' + (on ? 'box-shadow:0 8px 18px -9px rgba(226,121,58,0.7), inset 0 1px 0 rgba(255,255,255,0.45);' : 'box-shadow:inset 0 1px 0 rgba(255,255,255,0.06);'),
        showTip: b.showTip,
        tipStyle: TOOLTIP,
        onEnter: b.onEnter,
        onLeave: b.onLeave,
        onToggle: (e) => { stop(e); if (b.res.supported) b.res.run(); }
      };
    }),
    // ultimul copil al cardului: ramane LIPIT de baza (flex-shrink:0).
    advBtnStyle: 'flex-shrink:0; min-height:44px; display:flex; align-items:center; justify-content:center; gap:8px; margin-top:14px; padding:10px; border-radius:13px; cursor:pointer; font-family:' + SANS + '; font-size:12px; font-weight:400; color:#c8bcae; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.075);',
    advIconStyle: 'display:flex; color:' + ORANGE + ';',
    advIconEl: ic('sliders', { size: 16 }),
    onOpen: () => ui.setModalId(def.id),
    onToggle: (e) => { stop(e); if (canToggle) E.toggle(def.slot); }
  };
}

export function buildSidebarDevice(E, ui, def) {
  const a = E.mapped(def.slot) && E.isOn(def.slot);
  const di = dialInfo(E, def);
  const frac = di.val === null ? 0 : (di.val - di.min) / ((di.max - di.min) || 1);
  const stop = (e) => { if (e && e.stopPropagation) e.stopPropagation(); };
  const canToggle = E.mapped(def.slot) && E.available(def.slot);
  const dialVal = di.val === null ? NA : String(Math.round(di.val));

  return {
    id: def.id,
    label: def.label,
    model: def.model,
    ambient: ambientText(E, def),
    cardStyle: 'display:flex; align-items:center; gap:12px; padding:13px 14px; border-radius:18px; cursor:pointer; background:' + CARD_BG + '; border:1px solid ' + (a ? 'rgba(240,138,44,0.22)' : CARD_BORDER) + ';',
    dialWrapStyle: 'position:relative; width:74px; height:74px; flex-shrink:0; display:flex; align-items:center; justify-content:center;',
    dialTicksEl: dialTicks(frac, a, 74),
    dialValStyle: 'position:absolute; font-family:' + SANS + '; font-size:15px; font-weight:500; color:' + (a ? '#f7f1e9' : '#9d9186') + ';' + (di.stale ? ' opacity:0.55;' : ''),
    // fără cadran: inelul mic arată starea; TV în standby: "Standby" în loc de "—%"
    dialVal: !def.dial
      ? (a ? (def.stateLabels ? def.stateLabels[0] : 'Pornit') : (def.stateLabels ? def.stateLabels[1] : 'Oprit'))
      : di.standby ? 'Standby' : dialVal + (di.val === null ? '' : di.unit),
    nameStyle: 'font-family:' + SANS + '; font-size:13.5px; font-weight:500; color:' + TXT + '; line-height:1.25; ' + clamp2(ui),
    metaStyle: 'font-family:' + SANS + '; font-size:10.5px; font-weight:300; color:' + TXT3 + '; margin-top:2px;',
    ambientStyle: 'font-family:' + SANS + '; font-size:11px; font-weight:300; color:' + (ambientText(E, def) === VERIFY ? ORANGE : a ? '#c8a173' : TXT3) + '; margin-top:6px;',
    togglePillStyle: 'display:flex; align-items:center; padding:3px; border-radius:100px; cursor:' + (canToggle ? 'pointer' : 'default') + '; flex-shrink:0; width:44px; justify-content:' + (a ? 'flex-end' : 'flex-start') + '; opacity:' + (canToggle ? 1 : 0.55) + '; background:' + (a ? PILL_ON : PILL_OFF) + '; border:1px solid ' + (a ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)') + '; ' + (a ? PILL_SHADOW_ON : PILL_SHADOW_OFF),
    toggleKnobStyle: 'width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:' + (a ? KNOB_ON : KNOB_OFF) + '; ' + KNOB_SHADOW,
    toggleIconEl: ic('power', { size: 11.5, color: a ? '#C4600F' : '#cfc4b8', sw: 2.2 }),
    onToggle: (e) => { stop(e); if (canToggle) E.toggle(def.slot); },
    onOpen: () => ui.setModalId(def.id)
  };
}

// -------------------------------------------------------------------- modal
export function buildModal(E, ui) {
  const id = ui.modalId;
  if (!id) return null;
  const def = ui.catalog.CARD_BY_ID[id];
  if (!def) return null;

  const a = E.mapped(def.slot) && E.isOn(def.slot);
  const di = dialInfo(E, def);
  const status = !E.mapped(def.slot) ? VERIFY : !E.available(def.slot) ? 'Indisponibil' : a ? 'Pornit' : 'Oprit';

  // (v1.3.2) Modalul respectă aceleaşi reguli ca şi cardul:
  //  - controalele STRUCTURAL nesuportate (integrarea nu le expune deloc —
  //    res.structural) se ELIMINĂ, nu se afişează cu "VERIFY";
  //  - cele tranzitorii (TV în standby, entitate indisponibilă) rămân
  //    dezactivate, cu motivul în title — fără eticheta VERIFY, care e
  //    rezervată sloturilor nemapate;
  //  - o secţiune rămasă goală dispare cu totul (ex. "Opţiuni" la TV-uri,
  //    ambele la pompa de filtrare).
  const sections = [
    { title: 'Mod', items: def.circles },
    { title: 'Opţiuni', items: def.minis }
  ]
    .map((sec) => ({
      title: sec.title,
      items: sec.items
        .map((item) => ({ item, res: resolveAction(E, def.slot, item.action) }))
        .filter((x) => !(x.res.structural && !x.res.supported))
    }))
    .filter((sec) => sec.items.length > 0);

  // Volum fără VOLUME_SET (bit 4, ex. Hisense/HomeKit): aceeaşi degradare ca
  // pe card (v1.2.6) — bloc STATIC cu sursa curentă, fără −/+ şi fără
  // "pas · interval" care ar promite un control inexistent.
  const staticVol = !!def.dial && def.dial.kind === 'volume' && E.mapped(def.slot) && !E.supportsFeature(def.slot, 4);

  const modalBump = def.dial && def.dial.kind === 'number'
    ? numberBumpHandlers(di)
    : {
      onMinus: () => { if (!staticVol && di.writable && di.val !== null) di.set(di.val - di.step); },
      onPlus: () => { if (!staticVol && di.writable) di.set((di.val === null ? di.min : di.val) + di.step); }
    };

  return {
    title: E.friendlyName(def.slot, def.label),
    model: def.model,
    status,
    titleStyle: 'font-family:' + SANS + '; font-size:17px; font-weight:500; color:' + TXT + '; line-height:1.25; ' + clamp2(ui),
    subStyle: 'font-family:' + SANS + '; font-size:11.5px; font-weight:300; color:' + TXT3 + '; margin-top:2px;',
    iconWrapStyle: 'width:44px; height:44px; flex-shrink:0; border-radius:14px; display:flex; align-items:center; justify-content:center; color:' + (a ? ORANGE : TXT2) + '; background:' + (a ? 'rgba(240,138,44,0.13)' : 'rgba(255,255,255,0.05)') + '; border:1px solid ' + (a ? 'rgba(240,138,44,0.28)' : 'rgba(255,255,255,0.07)') + ';',
    iconEl: ic(def.icon, { size: 20 }),
    togglePillStyle: togglePill(a),
    toggleKnobStyle: toggleKnob(a),
    toggleTextStyle: toggleText(a),
    toggleText: a ? 'on' : 'off',
    toggleIconEl: ic('power', { size: 13, color: a ? '#2a1608' : '#8f8272', sw: 2 }),
    onToggle: () => { if (E.mapped(def.slot)) E.toggle(def.slot); },
    hasTarget: !!def.dial,
    targetStatic: staticVol,
    targetLabel: staticVol ? 'Sursă curentă' : def.dial && def.dial.kind === 'volume' ? 'Volum' : def.dial && def.dial.kind === 'climate' ? 'Temperatură ţintă' : 'Valoare ţintă',
    targetUnit: staticVol ? '' : di.unit === '°' ? '°C' : di.unit,
    targetHint: staticVol
      ? 'Televizorul nu expune controlul volumului prin integrarea lui (HomeKit) — mute şi schimbarea sursei funcţionează din butoanele de mai jos.'
      : di.mapped
        ? 'pas ' + di.step + ' · interval ' + di.min + '–' + di.max
        : 'VERIFY · nu ai mapat încă entitatea pentru această valoare',
    targetVal: staticVol
      ? (!E.available(def.slot) ? NA : E.isOn(def.slot) ? (E.currentSource(def.slot) || 'Pornit') : 'Standby')
      : di.unset ? UNSET : di.val === null ? NA : (di.unit === '%' || !di.decimals ? String(Math.round(di.val)) : decSep(di.val.toFixed(di.decimals))),
    targetWrapStyle: 'margin-top:18px; padding:16px; border-radius:18px; text-align:center; background:rgba(240,138,44,0.07); border:1px solid rgba(240,138,44,0.2);',
    targetCapStyle: 'font-family:' + SANS + '; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:' + ORANGE + ';',
    targetValStyle: 'font-family:' + DOTO + '; font-size:44px; font-weight:400; color:#f7f1e9; line-height:1;' + (di.stale ? ' opacity:0.55;' : ''),
    targetUnitStyle: 'font-family:' + SANS + '; font-size:13px; color:' + TXT2 + ';',
    targetHintStyle: 'font-family:' + SANS + '; font-size:10.5px; font-weight:300; color:' + (di.mapped ? TXT3 : ORANGE) + '; margin-top:10px;',
    stepBtnStyle: 'width:44px; height:44px; border-radius:13px; display:flex; align-items:center; justify-content:center; cursor:' + (di.writable ? 'pointer' : 'default') + '; opacity:' + (di.writable ? 1 : 0.45) + '; font-family:' + SANS + '; font-size:19px; font-weight:400; color:#e2d6c7; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);',
    onMinus: modalBump.onMinus,
    onPlus: modalBump.onPlus,
    bodyStyle: 'margin-top:18px; max-height:44vh; overflow-y:auto; padding-right:4px;',
    sections: sections.map((sec) => ({
      title: sec.title,
      headerStyle: 'font-family:' + SANS + '; font-size:10.5px; font-weight:500; text-transform:uppercase; letter-spacing:0.09em; color:' + TXT3 + '; margin-bottom:9px;',
      gridStyle: 'display:grid; grid-template-columns:repeat(' + colsOf(ui) + ',minmax(0,1fr)); gap:8px;',
      items: sec.items.map(({ item, res }) => {
        const on = res.active;
        // v1.1.0: fara valori tehnice sub etichete (bug 0.2 — 'swing_mo...')
        // v1.3.2: eticheta VERIFY doar pentru sloturi nemapate; nesuportatul
        // tranzitoriu (standby) ramane dezactivat, cu motivul in title.
        const val = res.supported ? '' : (res.reason || '').indexOf('VERIFY') === 0 ? VERIFY : '';
        return {
          iconEl: ic(item.icon, { size: 16, color: on ? '#2a1608' : TXT2 }),
          label: item.label,
          value: val,
          title: res.supported ? (describe(sec.title, item.label) || item.label) : res.reason,
          tileStyle: tileStyleFor(on, res.supported) + (res.supported ? '' : ' opacity:0.55;'),
          iconWrapStyle: iconWrapFor(on),
          labelStyle: labelFor(on) + labelWrap(ui),
          valueStyle: verifyValueStyle(on, val),
          onToggle: () => { if (res.supported) res.run(); }
        };
      })
    }))
  };
}
