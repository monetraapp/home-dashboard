// Tokens și helper-e de stil copiate 1:1 din "Home Dashboard.dc.html".
// Nu modifica valorile de aici — orice schimbare mută designul.

export const SANS = "'Plus Jakarta Sans',sans-serif";
export const SERIF = "'EB Garamond',Georgia,serif";
export const DOTO = "'Doto','Poppins',monospace";
export const ORANGE = '#F08A2C';
export const ORANGE_HI = '#FFA340';
export const TXT = '#efe7dd';
export const TXT2 = '#9c8f80';
export const TXT3 = '#7a6c5c';
export const CARD_BG =
  'linear-gradient(158deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.008) 100%)';
export const CARD_BORDER = 'rgba(255,255,255,0.07)';

export function noop() {}

/** Transformă un string CSS ("color:red; font-size:12px") în obiect de stil React. */
export function cssToObj(str) {
  const obj = {};
  if (!str) return obj;
  String(str)
    .split(';')
    .forEach((rule) => {
      const i = rule.indexOf(':');
      if (i < 0) return;
      const k = rule
        .slice(0, i)
        .trim()
        .replace(/-([a-z])/g, (m, c) => c.toUpperCase());
      const v = rule.slice(i + 1).trim();
      if (k) obj[k] = v;
    });
  return obj;
}

/** Alias scurt folosit în JSX: style={s(vals.cardStyle)} */
export const s = cssToObj;

export function navItemStyle(active) {
  return (
    'display:flex; align-items:center; gap:10px; padding:11px 22px; border-radius:100px; cursor:pointer; flex-shrink:0; background:' +
    (active
      ? 'linear-gradient(180deg, rgba(255,255,255,0.085), rgba(255,255,255,0.035))'
      : 'rgba(255,255,255,0.014)') +
    '; border:1px solid ' +
    (active ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.055)') +
    ';' +
    (active ? ' box-shadow:inset 0 1px 0 rgba(255,255,255,0.07);' : '')
  );
}
export function navIconBox(active) {
  return (
    'display:flex; align-items:center; justify-content:center; flex-shrink:0; color:' +
    (active ? '#f4ece2' : '#8c8177') +
    ';'
  );
}
export function navLabel(active) {
  return (
    'font-family:' +
    SANS +
    '; font-size:14.5px; font-weight:400; letter-spacing:0.01em; color:' +
    (active ? '#f4ece2' : '#9a8f84') +
    '; white-space:nowrap;'
  );
}

export const TIP_STYLE =
  'position:absolute; bottom:calc(100% + 9px); left:50%; transform:translateX(-50%); z-index:40; max-width:220px; padding:7px 11px; border-radius:10px; pointer-events:none; font-family:' +
  SANS +
  '; font-size:11.5px; font-weight:400; line-height:1.4; color:#f4ece2; background:#241c16; border:1px solid rgba(255,255,255,0.12); box-shadow:0 12px 26px -12px rgba(0,0,0,0.9);';

export function moveBtn(enabled) {
  return (
    'width:24px; height:24px; flex-shrink:0; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:' +
    (enabled ? 'pointer' : 'default') +
    '; color:' +
    (enabled ? '#d8ccbe' : 'rgba(255,255,255,0.14)') +
    '; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);'
  );
}

export function glassCard() {
  return (
    'background:' + CARD_BG + '; border:1px solid ' + CARD_BORDER + '; border-radius:20px; padding:20px;'
  );
}

export function tileStyleFor(active, toggleable) {
  const base =
    'display:flex; align-items:center; gap:9px; padding:10px 11px; border-radius:13px; min-width:0; min-height:48px; flex:1 1 auto; box-sizing:border-box;' +
    (toggleable ? ' cursor:pointer;' : '');
  if (active)
    return (
      base +
      ' background:' +
      PILL_ON +
      '; border:1px solid rgba(255,255,255,0.28); box-shadow:0 10px 22px -10px rgba(226,121,58,0.7), inset 0 1px 0 rgba(255,255,255,0.4);'
    );
  return base + ' background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.065);';
}
export function iconWrapFor(active) {
  return (
    'width:26px; height:26px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:' +
    (active ? '#2a1608' : TXT2) +
    '; background:' +
    (active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)') +
    ';'
  );
}
export function labelFor(active) {
  return (
    'font-family:' +
    SANS +
    '; font-size:12px; font-weight:500; color:' +
    (active ? '#2a1608' : TXT) +
    '; line-height:1.3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;'
  );
}
export function valueFor(active, v) {
  return v
    ? 'font-family:' +
        SANS +
        '; font-size:10.5px; color:' +
        (active ? 'rgba(42,22,8,0.72)' : TXT3) +
        '; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;'
    : 'display:none;';
}

export const PILL_ON =
  'linear-gradient(180deg, #FFBB6A 0%, ' + ORANGE + ' 46%, #D9661A 100%)';
export const PILL_OFF =
  'linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.025) 100%)';
export const PILL_SHADOW_ON =
  'box-shadow:0 3px 10px -6px rgba(226,121,58,0.5), inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -2px 4px rgba(150,60,10,0.32);';
export const PILL_SHADOW_OFF =
  'box-shadow:inset 0 1px 0 rgba(255,255,255,0.07), inset 0 3px 7px rgba(0,0,0,0.45);';
export const KNOB_ON = 'radial-gradient(120% 120% at 34% 24%, #ffffff 0%, #f6ece0 100%)';
export const KNOB_OFF = 'radial-gradient(120% 120% at 34% 24%, #7a7168 0%, #464039 100%)';
export const KNOB_SHADOW = 'box-shadow:0 3px 6px rgba(0,0,0,0.45), inset 0 -1px 1px rgba(0,0,0,0.08);';

export function togglePill(active) {
  return (
    'display:flex; align-items:center; gap:8px; flex-shrink:0; padding:4px; ' +
    (active ? 'padding-right:12px;' : 'padding-left:12px; flex-direction:row-reverse;') +
    ' border-radius:100px; cursor:pointer; background:' +
    (active ? PILL_ON : PILL_OFF) +
    '; border:1px solid ' +
    (active ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)') +
    '; ' +
    (active ? PILL_SHADOW_ON : PILL_SHADOW_OFF)
  );
}
export function toggleKnob(active) {
  return (
    'width:26px; height:26px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center; background:' +
    (active ? KNOB_ON : KNOB_OFF) +
    '; ' +
    KNOB_SHADOW
  );
}
export function toggleText(active) {
  return (
    'font-family:' +
    SANS +
    '; font-size:11.5px; font-weight:600; letter-spacing:0.01em; color:' +
    (active ? '#3a1c06' : '#a1968b') +
    ';' +
    (active ? ' text-shadow:0 1px 0 rgba(255,255,255,0.28);' : '')
  );
}

export const STATE_COLORS = {
  ok: 'rgba(240,138,44,0.72)',
  on: 'rgba(240,138,44,0.9)',
  idle: 'rgba(255,255,255,0.11)',
  off: 'rgba(255,255,255,0.07)',
  warn: 'rgba(226,150,70,0.55)',
  unavail: 'rgba(214,104,78,0.5)'
};

export function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}
export const DAYS = ['Duminică', 'Luni', 'Marţi', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
export const MONTHS = [
  'ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie',
  'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'
];
export function hhmm(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
}
