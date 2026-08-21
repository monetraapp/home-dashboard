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
import { resolveAction } from '../model/actions.js';
import { dailyAverage, dailyLast, fillGaps, timelineSegments, lastDayLabels } from '../ha/history.js';

const DAYS7 = 7;

/** Breakpoint-ul curent, transmis prin `ui` din Dashboard. */
function bpOf(ui) {
  return (ui && ui.bp) || { vw: 1600, mob: false, tab: false, narrow: false };
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

function verifyValueStyle(active, value) {
  if (value === VERIFY) {
    return 'font-family:' + SANS + '; font-size:10.5px; font-weight:600; letter-spacing:0.04em; color:' +
      (active ? 'rgba(42,22,8,0.85)' : ORANGE) + '; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;';
  }
  return valueFor(active, value);
}

// --------------------------------------------------------------------- tiles
export function buildItem(E, ui, d) {
  const slot = d.slot;
  const mapped = slot ? E.mapped(slot) : true;
  const avail = slot ? E.available(slot) : true;
  const active = !!(d.toggleable && slot && E.isOn(slot));

  let value;
  if (d.text !== undefined) {
    value = d.text;
  } else if (!slot) {
    value = '';
  } else if (!mapped) {
    value = VERIFY;
  } else if (!avail) {
    value = NA;
  } else if (d.opts && d.opts.hvac) {
    value = HVAC_SHORT[E.rawState(slot)] || E.rawState(slot);
  } else if (d.toggleable) {
    value = active ? 'Pornit' : 'Oprit';
  } else {
    value = E.fmt(slot, d.opts);
  }

  const key = 'tile:' + (slot || d.label);
  let tip;
  if (!mapped && slot) tip = 'VERIFY · slotul „' + slot + '" nu are entitate mapată — deschide „Mapare entităţi".';
  else if (!avail && slot) tip = d.label + ' · entitate indisponibilă în HA';
  else if (d.toggleable) tip = d.label + ' · ' + (active ? 'pornit — apasă pentru a opri' : 'oprit — apasă pentru a porni');
  else tip = d.label + ' · ' + value + ' — doar informativ';

  const canToggle = !!(d.toggleable && mapped && avail);

  return {
    iconEl: ic(d.icon, { size: 16, color: active ? '#2a1608' : TXT2 }),
    label: d.label,
    value,
    tileStyle: tileStyleFor(active, canToggle) + (d.toggleable && !canToggle ? ' opacity:0.72;' : ''),
    iconWrapStyle: iconWrapFor(active),
    labelStyle: labelFor(active),
    valueStyle: verifyValueStyle(active, value),
    wrapStyle: 'position:relative; display:flex; min-width:0;',
    tipText: tip,
    showTip: ui.hoverKey === key,
    tipStyle: TIP_STYLE,
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
  const t = E.fmt(cell.slot, cell.opts);
  return { text: t, verify: t === VERIFY };
}

export function buildBlock(E, ui, hist, b) {
  if (b.type === 'note') {
    return {
      isNote: true,
      text: b.text,
      noteStyle: 'font-family:' + SANS + '; font-size:12.5px; line-height:1.6; color:' + TXT3 + ';'
    };
  }

  if (b.type === 'grid') {
    return { isGrid: true, cols: b.cols, items: b.items.map((d) => buildItem(E, ui, d)) };
  }

  if (b.type === 'monitor') {
    return {
      isMonitor: true,
      title: b.title + ' · doar informativ',
      wrapStyle: 'border:1px solid rgba(255,255,255,0.065); border-radius:14px; overflow:hidden; margin-bottom:12px;',
      capStyle: 'display:flex; align-items:center; gap:8px; padding:9px 14px; font-family:' + SANS + '; font-size:10px; text-transform:uppercase; letter-spacing:0.09em; color:' + TXT3 + '; background:rgba(255,255,255,0.022);',
      capIconStyle: 'display:flex; color:#6f6558;',
      capIconEl: ic('lock', { size: 12 }),
      rows: b.rows.map((row, i) => {
        const v = monitorValue(E, row[1]);
        const bad = /oprit|offline|indisponibil|eroare|unavailable/i.test(String(v.text));
        const color = v.verify ? ORANGE : bad ? '#e8a08a' : TXT;
        return {
          label: row[0],
          value: v.text,
          rowStyle: 'display:flex; align-items:center; justify-content:space-between; gap:12px; padding:9px 14px;' +
            (i < b.rows.length - 1 ? ' border-bottom:1px solid rgba(255,255,255,0.045);' : ''),
          labelStyle: 'display:flex; align-items:center; gap:9px; font-family:' + SANS + '; font-size:12.5px; font-weight:300; color:#bcaf9f; min-width:0;',
          dotStyle: 'width:5px; height:5px; border-radius:50%; flex-shrink:0; background:' +
            (v.verify ? 'rgba(240,138,44,0.9)' : bad ? 'rgba(226,120,90,0.8)' : 'rgba(240,138,44,0.55)') + ';',
          valueStyle: 'font-family:' + SANS + '; font-size:12.5px; font-weight:' + (v.verify ? 600 : 500) + '; color:' + color + '; font-variant-numeric:tabular-nums; white-space:nowrap;'
        };
      })
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
        labelStyle: 'font-family:' + SANS + '; font-size:11.5px; font-weight:400; color:' + (E.mapped(row.slot) ? '#bdb1a4' : ORANGE) + '; text-align:right; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
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
        value: sBuilt.values[sBuilt.values.length - 1] + ' ' + b.unit,
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
    return {
      label: sp.label,
      unit: '°C',
      val: E.climateTarget(slot),
      min: E.climateMin(slot),
      max: E.climateMax(slot),
      // acelaşi pas minim de 1° ca în dialInfo — vezi comentariul de acolo
      step: Math.max(1, E.climateStep(slot)),
      decimals: 1,
      mapped: E.mapped(slot),
      writable: E.mapped(slot) && E.available(slot),
      set: (v) => E.setClimateTarget(slot, v)
    };
  }
  const b = E.numberBounds(sp.slot, 0, 100, 1);
  return {
    label: sp.label,
    unit: sp.unit === undefined ? E.attr(sp.slot, 'unit_of_measurement') || '' : sp.unit,
    val: E.numberValue(sp.slot),
    min: b.min,
    max: b.max,
    step: b.step,
    decimals: b.step < 1 ? 1 : 0,
    mapped: E.mapped(sp.slot),
    writable: E.numberWritable(sp.slot) && E.available(sp.slot),
    set: (v) => E.setNumber(sp.slot, v)
  };
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
    headStyle: 'display:flex; align-items:center; justify-content:space-between; gap:12px; padding:13px 14px; cursor:pointer;',
    iconWrapStyle: 'width:36px; height:36px; flex-shrink:0; border-radius:12px; display:flex; align-items:center; justify-content:center; color:' + (on ? '#2a1608' : TXT2) + '; background:' + (on ? 'linear-gradient(140deg,' + ORANGE_HI + ',#DE7420)' : 'rgba(255,255,255,0.055)') + '; border:1px solid ' + (on ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)') + ';',
    iconEl: ic(def ? def.icon : 'home', { size: 17 }),
    nameStyle: 'font-family:' + SANS + '; font-size:14px; font-weight:500; color:' + TXT + '; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
    metaStyle: 'font-family:' + SANS + '; font-size:11px; font-weight:300; color:' + (!mapped ? ORANGE : on ? '#c8a173' : TXT3) + '; margin-top:2px;',
    togglePillStyle: 'display:flex; align-items:center; padding:3px; border-radius:100px; cursor:' + (mapped && avail ? 'pointer' : 'default') + '; width:50px; flex-shrink:0; justify-content:' + (on ? 'flex-end' : 'flex-start') + '; opacity:' + (mapped && avail ? 1 : 0.55) + '; background:' + (on ? PILL_ON : PILL_OFF) + '; border:1px solid ' + (on ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)') + '; ' + (on ? 'box-shadow:0 4px 12px -6px rgba(226,121,58,0.55), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -2px 4px rgba(150,60,10,0.32);' : PILL_SHADOW_OFF),
    toggleKnobStyle: 'width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:' + (on ? KNOB_ON : KNOB_OFF) + '; ' + KNOB_SHADOW,
    toggleIconEl: ic('power', { size: 12.5, color: on ? '#C4600F' : '#cfc4b8', sw: 2.2 }),
    chevStyle: 'display:flex; align-items:center; gap:7px; flex-shrink:0; padding:6px 11px 6px 13px; border-radius:100px; cursor:pointer; font-family:' + SANS + '; font-size:11.5px; font-weight:400; color:' + (open ? '#f0c79b' : '#b3a89c') + '; background:' + (open ? 'rgba(240,138,44,0.1)' : 'rgba(255,255,255,0.05)') + '; border:1px solid ' + (open ? 'rgba(240,138,44,0.28)' : 'rgba(255,255,255,0.09)') + ';',
    chevLabel: open ? 'Închide' : 'Setări',
    chevIconStyle: 'display:flex; transform:rotate(' + (open ? '180deg' : '0deg') + '); transition:transform .18s ease;',
    chevEl: ic('chevronDown', { size: 15, sw: 1.9 }),
    bodyStyle: 'padding:2px 14px 14px; border-top:1px solid rgba(255,255,255,0.055);',
    hasSetpoints: (u.setpoints || []).length > 0,
    setpointHeaderStyle: 'font-family:' + SANS + '; font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.09em; color:' + TXT3 + '; margin:15px 0 8px; padding-top:13px; border-top:1px solid rgba(255,255,255,0.05);',
    setpointGridStyle: 'display:grid; grid-template-columns:repeat(' + (bpOf(ui).mob ? 1 : 2) + ',minmax(0,1fr)); gap:8px;',
    setpoints: (u.setpoints || []).map((sp) => {
      const i = setpointInfo(E, def, sp);
      const shown = !i.mapped ? VERIFY : i.val === null ? NA : (i.decimals ? i.val.toFixed(i.decimals) : String(Math.round(i.val))) + (i.unit ? ' ' + i.unit : '');
      return {
        label: i.label,
        wrapStyle: 'display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 12px; border-radius:14px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.07);',
        labelStyle: 'font-family:' + SANS + '; font-size:11.5px; font-weight:400; color:#bdb1a4;',
        hintStyle: 'font-family:' + SANS + '; font-size:10px; font-weight:300; color:' + (i.mapped ? TXT3 : ORANGE) + '; margin-top:2px;',
        hint: i.mapped ? 'pas ' + i.step + ' · ' + i.min + '–' + i.max + ' ' + i.unit : 'slot nemapat',
        valStyle: 'font-family:' + DOTO + '; font-size:20px; font-weight:600; color:' + (shown === VERIFY ? ORANGE : ORANGE) + '; letter-spacing:0.02em;' + (shown === VERIFY ? ' font-size:13px;' : ''),
        val: shown,
        btnStyle: 'width:30px; height:30px; flex-shrink:0; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:' + (i.writable ? 'pointer' : 'default') + '; opacity:' + (i.writable ? 1 : 0.45) + '; font-family:' + SANS + '; font-size:16px; font-weight:400; color:#d6cabb; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09);',
        onMinus: (e) => { stop(e); if (i.writable && i.val !== null) i.set(i.val - i.step); },
        onPlus: (e) => { stop(e); if (i.writable) i.set((i.val === null ? i.min : i.val) + i.step); }
      };
    }),
    sections: (u.sections || []).map((section) => ({
      title: section.title,
      headerStyle: 'font-family:' + SANS + '; font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.09em; color:' + TXT3 + '; margin:15px 0 8px; padding-top:13px; border-top:1px solid rgba(255,255,255,0.05);',
      gridStyle: 'display:grid; grid-template-columns:repeat(' + accCols(ui, section.cols) + ',minmax(0,1fr)); gap:8px;',
      items: section.items.map((item) =>
        item.action ? buildActionTile(E, ui, def, item, u.card) : buildItem(E, ui, item)
      )
    })),
    onExpand: () => ui.setOpenAcc(open ? null : u.card),
    onPower: (e) => { stop(e); if (mapped && avail) E.toggle(def.slot); }
  };
}

/** Tile dintr-o secţiune de acordeon, legat de o acţiune reală pe entitate. */
function buildActionTile(E, ui, def, item, cardId) {
  const res = resolveAction(E, def ? def.slot : null, item.action);
  const on = res.active;
  const key = 'acc:' + cardId + ':' + item.label;
  const value = res.supported ? res.hint || '' : VERIFY;
  return {
    iconEl: ic(item.icon, { size: 16, color: on ? '#2a1608' : TXT2 }),
    label: item.label,
    value,
    tileStyle: tileStyleFor(on, res.supported) + (res.supported ? '' : ' opacity:0.55;'),
    iconWrapStyle: iconWrapFor(on),
    labelStyle: labelFor(on),
    valueStyle: verifyValueStyle(on, value),
    wrapStyle: 'position:relative; display:flex; min-width:0;',
    tipText: res.supported ? item.label + (res.hint ? ' · ' + res.hint : '') : item.label + ' · ' + res.reason,
    showTip: ui.hoverKey === key,
    tipStyle: TIP_STYLE,
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
    wrapStyle: 'display:flex; align-items:center; gap:14px; padding:16px; border-radius:18px; background:' + (np ? 'linear-gradient(158deg, rgba(240,138,44,0.1), rgba(255,255,255,0.02))' : 'rgba(255,255,255,0.03)') + '; border:1px solid ' + (np ? 'rgba(240,138,44,0.22)' : 'rgba(255,255,255,0.065)') + ';',
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
    return {
      val,
      unit: d.unit || '°',
      min: E.climateMin(def.slot),
      max: E.climateMax(def.slot),
      // Pas de UI de minim 1°: integrarea declară 0.5 (LG/Vortex/Vivax), dar
      // comenzile la granulaţie de 1° rămân valide (multiplu de 0.5). Dacă un
      // hardware ar declara un pas MAI MARE de 1°, acela e respectat.
      step: Math.max(1, E.climateStep(def.slot)),
      decimals: 0,
      writable: E.mapped(def.slot) && E.available(def.slot),
      mapped: E.mapped(def.slot),
      set: (v) => E.setClimateTarget(def.slot, v)
    };
  }
  if (d.kind === 'number') {
    const b = E.numberBounds(d.slot, d.min, d.max, d.step);
    return {
      val: E.numberValue(d.slot),
      unit: d.unit || '%',
      min: b.min,
      max: b.max,
      step: b.step,
      decimals: 0,
      writable: E.numberWritable(d.slot) && E.available(d.slot),
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
    tip: res.supported ? item.label + (res.hint ? ' · ' + res.hint : '') : item.label + ' · ' + res.reason,
    showTip: ui.hoverKey === key,
    onEnter: () => ui.setHoverKey(key),
    onLeave: () => ui.setHoverKey(null)
  };
}

export function buildDeviceCard(E, ui, def) {
  const a = E.mapped(def.slot) && E.isOn(def.slot);
  const di = dialInfo(E, def);
  const frac = di.val === null ? 0 : (di.val - di.min) / ((di.max - di.min) || 1);
  const stop = (e) => { if (e && e.stopPropagation) e.stopPropagation(); };
  const canToggle = E.mapped(def.slot) && E.available(def.slot);

  const dialVal = di.val === null ? NA : (di.decimals ? di.val.toFixed(di.decimals) : String(Math.round(di.val)));
  // fără unitate lângă valoarea lipsă ("—", nu "—%")
  const dialUnitShown = di.val === null ? '' : di.unit;
  const targetLabel = di.standby ? 'Standby' : !di.mapped ? VERIFY : di.val === null ? NA : dialVal + di.unit;

  return {
    id: def.id,
    label: def.label,
    model: def.model,
    ambient: ambientText(E, def),
    // Carduri fără cadran (ex. pompa de filtrare, strict on/off): în locul
    // dial-ului se afişează un bloc de stare cu aceeaşi înălţime (132px),
    // ca layout-ul cardului să rămână identic cu al vecinilor.
    hasDial: !!def.dial,
    noDialWrapStyle: 'height:132px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; margin-top:2px;',
    noDialIconEl: ic(def.icon, { size: 34, color: a ? ORANGE : TXT3 }),
    noDialTextStyle: 'font-family:' + SANS + '; font-size:21px; font-weight:500; line-height:1; color:' + (a ? '#f7f1e9' : '#9d9186') + ';',
    noDialText: !E.mapped(def.slot) ? VERIFY : !E.available(def.slot) ? NA : a ? 'Pornită' : 'Oprită',
    cardStyle: 'padding:16px 16px 14px; border-radius:22px; background:' + CARD_BG + '; border:1px solid ' + CARD_BORDER + ';',
    headIconStyle: 'width:34px; height:34px; flex-shrink:0; border-radius:50%; display:flex; align-items:center; justify-content:center; color:' + (a ? '#2a1608' : TXT2) + '; background:' + (a ? 'linear-gradient(140deg,' + ORANGE_HI + ',#DE7420)' : 'rgba(255,255,255,0.06)') + '; border:1px solid ' + (a ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)') + ';',
    headIconEl: ic(def.icon, { size: 18 }),
    nameStyle: 'font-family:' + SANS + '; font-size:14px; font-weight:500; color:' + TXT + '; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
    modelStyle: 'font-family:' + SANS + '; font-size:10.5px; font-weight:300; color:' + TXT3 + '; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
    togglePillStyle: 'display:flex; align-items:center; padding:3px; border-radius:100px; cursor:' + (canToggle ? 'pointer' : 'default') + '; flex-shrink:0; width:50px; justify-content:' + (a ? 'flex-end' : 'flex-start') + '; opacity:' + (canToggle ? 1 : 0.55) + '; background:' + (a ? PILL_ON : PILL_OFF) + '; border:1px solid ' + (a ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)') + '; ' + (a ? PILL_SHADOW_ON : PILL_SHADOW_OFF),
    toggleKnobStyle: 'width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:' + (a ? KNOB_ON : KNOB_OFF) + '; ' + KNOB_SHADOW,
    toggleIconEl: ic('power', { size: 12.5, color: a ? '#C4600F' : '#cfc4b8', sw: 2.2 }),
    toggleTitle: canToggle ? 'Pornit / oprit' : 'VERIFY · entitate nemapată sau indisponibilă',
    ambientStyle: 'font-family:' + SANS + '; font-size:12px; font-weight:300; color:' + (ambientText(E, def) === VERIFY ? ORANGE : TXT2) + '; text-align:center; margin:14px 0 4px;',
    dialWrapStyle: 'position:relative; width:132px; height:132px; flex-shrink:0; display:flex; align-items:center; justify-content:center;',
    dialTicksEl: dialTicks(frac, a),
    knobStyle: 'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:74px; height:74px; border-radius:50%; display:flex; align-items:center; justify-content:center; gap:1px; background:radial-gradient(120% 120% at 30% 20%, #2e2620 0%, #17120f 70%); border:1px solid rgba(255,255,255,0.09); box-shadow:inset 0 2px 6px rgba(0,0,0,0.5), 0 10px 20px -10px rgba(0,0,0,0.8);',
    knobValStyle: 'font-family:' + SANS + '; font-size:21px; font-weight:500; line-height:1; color:' + (a ? '#f7f1e9' : '#9d9186') + ';',
    knobUnitStyle: 'font-family:' + SANS + '; font-size:15px; font-weight:400; line-height:1; color:' + (a ? '#d8ccbe' : '#8c8177') + ';',
    dialVal,
    dialUnit: dialUnitShown,
    // titlu pe butoanele −/+ (pasul e comunicat aici, nu printr-o valoare
    // laterală ambiguă — vezi CHANGELOG 1.0.7 punctul 1.3)
    stepTitle: 'pas ' + (di.step === 0.5 ? '0.5' : String(di.step)) + di.unit,
    roundBtnStyle: 'width:30px; height:30px; flex-shrink:0; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:' + (di.writable ? 'pointer' : 'default') + '; opacity:' + (di.writable ? 1 : 0.45) + '; font-family:' + SANS + '; font-size:16px; font-weight:400; color:#d6cabb; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09);',
    stepLabelStyle: 'font-family:' + SANS + '; font-size:11.5px; font-weight:300; color:' + TXT2 + '; white-space:nowrap;',
    stepLabel: (di.step === 0.5 ? '0.5' : String(di.step)) + di.unit,
    targetLabelStyle: 'font-family:' + SANS + '; font-size:13px; font-weight:' + (targetLabel === VERIFY ? 600 : 500) + '; color:' + (targetLabel === VERIFY ? ORANGE : a ? ORANGE : TXT3) + '; white-space:nowrap;',
    targetLabel,
    onMinus: (e) => { stop(e); if (di.writable && di.val !== null) di.set(di.val - di.step); },
    onPlus: (e) => { stop(e); if (di.writable) di.set((di.val === null ? di.min : di.val) + di.step); },
    miniRowStyle: 'display:grid; grid-template-columns:1fr 1fr; gap:12px; align-items:center; margin-top:14px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.06);',
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
        tipStyle: TIP_STYLE,
        onEnter: b.onEnter,
        onLeave: b.onLeave,
        onToggle: (e) => { stop(e); if (b.res.supported) b.res.run(); }
      };
    }),
    circleRowStyle: 'display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:' + (bpOf(ui).mob ? '9px' : '11px') + '; margin-top:14px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.06);',
    circles: def.circles.map((cb) => {
      const b = buildToggleAction(E, ui, def, cb);
      const on = b.res.active;
      return {
        iconEl: ic(cb.icon, { size: 18, color: on ? '#2a1608' : '#b3a89c' }),
        label: b.tip,
        wrapStyle: 'position:relative; display:flex; align-items:center; justify-content:center;',
        style: 'width:' + (bpOf(ui).mob ? 40 : 44) + 'px; height:' + (bpOf(ui).mob ? 40 : 44) + 'px; flex:0 0 ' + (bpOf(ui).mob ? 40 : 44) + 'px; aspect-ratio:1; box-sizing:border-box; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:' + (b.res.supported ? 'pointer' : 'default') + '; opacity:' + (b.res.supported ? 1 : 0.45) + '; background:' + (on ? PILL_ON : 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.025) 100%)') + '; border:1px solid ' + (on ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.085)') + '; ' + (on ? 'box-shadow:0 8px 18px -9px rgba(226,121,58,0.7), inset 0 1px 0 rgba(255,255,255,0.45);' : 'box-shadow:inset 0 1px 0 rgba(255,255,255,0.06);'),
        showTip: b.showTip,
        tipStyle: 'position:absolute; bottom:52px; left:50%; transform:translateX(-50%); z-index:40; padding:7px 11px; border-radius:10px; max-width:230px; text-align:center; pointer-events:none; font-family:' + SANS + '; font-size:11.5px; font-weight:400; line-height:1.4; color:#f4ece2; background:#241c16; border:1px solid rgba(255,255,255,0.12); box-shadow:0 12px 26px -12px rgba(0,0,0,0.9);',
        onEnter: b.onEnter,
        onLeave: b.onLeave,
        onToggle: (e) => { stop(e); if (b.res.supported) b.res.run(); }
      };
    }),
    advBtnStyle: 'display:flex; align-items:center; justify-content:center; gap:8px; margin-top:14px; padding:10px; border-radius:13px; cursor:pointer; font-family:' + SANS + '; font-size:12px; font-weight:400; color:#c8bcae; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.075);',
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
    dialValStyle: 'position:absolute; font-family:' + SANS + '; font-size:15px; font-weight:500; color:' + (a ? '#f7f1e9' : '#9d9186') + ';',
    // fără cadran: inelul mic arată starea; TV în standby: "Standby" în loc de "—%"
    dialVal: !def.dial ? (a ? 'Pornită' : 'Oprită') : di.standby ? 'Standby' : dialVal + (di.val === null ? '' : di.unit),
    nameStyle: 'font-family:' + SANS + '; font-size:13.5px; font-weight:500; color:' + TXT + '; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
    metaStyle: 'font-family:' + SANS + '; font-size:10.5px; font-weight:300; color:' + TXT3 + '; margin-top:2px;',
    ambientStyle: 'font-family:' + SANS + '; font-size:11px; font-weight:300; color:' + (ambientText(E, def) === VERIFY ? ORANGE : a ? '#c8a173' : TXT3) + '; margin-top:6px;',
    togglePillStyle: 'display:flex; align-items:center; padding:3px; border-radius:100px; cursor:' + (canToggle ? 'pointer' : 'default') + '; flex-shrink:0; width:44px; justify-content:' + (a ? 'flex-end' : 'flex-start') + '; opacity:' + (canToggle ? 1 : 0.55) + '; background:' + (a ? PILL_ON : PILL_OFF) + '; border:1px solid ' + (a ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)') + '; ' + (a ? PILL_SHADOW_ON : PILL_SHADOW_OFF),
    toggleKnobStyle: 'width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:' + (a ? KNOB_ON : KNOB_OFF) + '; ' + KNOB_SHADOW,
    toggleIconEl: ic('power', { size: 11.5, color: a ? '#C4600F' : '#cfc4b8', sw: 2.2 }),
    onToggle: (e) => { stop(e); if (canToggle) E.toggle(def.slot); },
    onOpen: () => ui.setModalId(def.id)
  };
}

/** Rând compact „Scurtături" din coloana din stânga. */
export function buildQuickRow(E, ui, def) {
  const a = E.mapped(def.slot) && E.isOn(def.slot);
  const canToggle = E.mapped(def.slot) && E.available(def.slot);
  const status = !E.mapped(def.slot) ? VERIFY : !E.available(def.slot) ? NA : a ? 'Pornit' : 'Oprit';
  return {
    id: def.id,
    label: def.label,
    status,
    iconEl: ic(def.icon, { size: 15, color: a ? ORANGE : TXT2 }),
    iconWrapStyle: 'width:34px; height:34px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0; background:' + (a ? 'rgba(240,138,44,0.13)' : 'rgba(255,255,255,0.045)') + '; border:1px solid ' + (a ? 'rgba(240,138,44,0.28)' : 'rgba(255,255,255,0.06)') + ';',
    quickRowStyle: 'display:flex; align-items:center; justify-content:space-between; gap:10px; padding:9px 11px; border-radius:14px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.06);',
    quickNameStyle: 'font-family:' + SANS + '; font-size:12px; font-weight:400; color:' + TXT + '; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
    quickStatusStyle: 'font-family:' + SANS + '; font-size:10.5px; color:' + (status === VERIFY ? ORANGE : a ? '#c8a173' : TXT3) + ';',
    togglePillStyle: togglePill(a) + ' opacity:' + (canToggle ? 1 : 0.55) + ';',
    toggleKnobStyle: toggleKnob(a),
    toggleTextStyle: toggleText(a),
    toggleText: a ? 'on' : 'off',
    toggleIconEl: ic('power', { size: 13, color: a ? '#2a1608' : '#8f8272', sw: 2 }),
    onToggle: () => { if (canToggle) E.toggle(def.slot); }
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

  const sections = [
    { title: 'Mod', items: def.circles },
    { title: 'Opţiuni', items: def.minis }
  ];

  return {
    title: E.friendlyName(def.slot, def.label),
    model: def.model,
    status,
    titleStyle: 'font-family:' + SANS + '; font-size:17px; font-weight:500; color:' + TXT + '; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;',
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
    targetLabel: def.dial && def.dial.kind === 'volume' ? 'Volum' : def.dial && def.dial.kind === 'climate' ? 'Temperatură ţintă' : 'Valoare ţintă',
    targetUnit: di.unit === '°' ? '°C' : di.unit,
    targetHint: di.mapped
      ? 'pas ' + di.step + ' · interval ' + di.min + '–' + di.max
      : 'VERIFY · nu ai mapat încă entitatea pentru această valoare',
    targetVal: di.val === null ? NA : (di.unit === '%' ? String(Math.round(di.val)) : di.val.toFixed(1)),
    targetWrapStyle: 'margin-top:18px; padding:16px; border-radius:18px; text-align:center; background:rgba(240,138,44,0.07); border:1px solid rgba(240,138,44,0.2);',
    targetCapStyle: 'font-family:' + SANS + '; font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:' + ORANGE + ';',
    targetValStyle: 'font-family:' + DOTO + '; font-size:44px; font-weight:400; color:#f7f1e9; line-height:1;',
    targetUnitStyle: 'font-family:' + SANS + '; font-size:13px; color:' + TXT2 + ';',
    targetHintStyle: 'font-family:' + SANS + '; font-size:10.5px; font-weight:300; color:' + (di.mapped ? TXT3 : ORANGE) + '; margin-top:10px;',
    stepBtnStyle: 'width:40px; height:40px; border-radius:13px; display:flex; align-items:center; justify-content:center; cursor:' + (di.writable ? 'pointer' : 'default') + '; opacity:' + (di.writable ? 1 : 0.45) + '; font-family:' + SANS + '; font-size:19px; font-weight:400; color:#e2d6c7; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);',
    onMinus: () => { if (di.writable && di.val !== null) di.set(di.val - di.step); },
    onPlus: () => { if (di.writable) di.set((di.val === null ? di.min : di.val) + di.step); },
    bodyStyle: 'margin-top:18px; max-height:44vh; overflow-y:auto; padding-right:4px;',
    sections: sections.map((sec) => ({
      title: sec.title,
      headerStyle: 'font-family:' + SANS + '; font-size:10.5px; font-weight:500; text-transform:uppercase; letter-spacing:0.09em; color:' + TXT3 + '; margin-bottom:9px;',
      gridStyle: 'display:grid; grid-template-columns:repeat(' + colsOf(ui) + ',minmax(0,1fr)); gap:8px;',
      items: sec.items.map((item) => {
        const res = resolveAction(E, def.slot, item.action);
        const on = res.active;
        const val = res.supported ? (res.hint || '') : VERIFY;
        return {
          iconEl: ic(item.icon, { size: 16, color: on ? '#2a1608' : TXT2 }),
          label: item.label,
          value: val,
          title: res.supported ? item.label + (res.hint ? ' · ' + res.hint : '') : res.reason,
          tileStyle: tileStyleFor(on, res.supported) + (res.supported ? '' : ' opacity:0.55;'),
          iconWrapStyle: iconWrapFor(on),
          labelStyle: labelFor(on),
          valueStyle: verifyValueStyle(on, val),
          onToggle: () => { if (res.supported) res.run(); }
        };
      })
    }))
  };
}
