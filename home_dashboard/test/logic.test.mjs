// Verificare a logicii pure (fără React / fără HA real).
import { resolveAction } from '../src/model/actions.js';
import {
  dailyAverage, dailyLast, fillGaps, timelineSegments, lastDayLabels
} from '../src/ha/historyMath.js';
import { tileCols, MOBILE_MAX, NARROW_MAX } from '../src/design/breakpoints.js';
import { SLOTS } from '../src/ha/slots.js';
import { SUGGESTED_MAP, UNMAPPED_REASONS } from '../src/ha/suggestedMap.js';

let pass = 0, fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + '\n       got  ' + JSON.stringify(got) + '\n       want ' + JSON.stringify(want)); }
}

// ---- E fals, imitând stratul de entităţi -----------------------------------
function makeE(states, map) {
  const idOf = (k) => map[k] || null;
  const ent = (k) => (idOf(k) ? states[idOf(k)] : null);
  const calls = [];
  const E = {
    calls,
    idOf,
    ent,
    mapped: (k) => !!idOf(k),
    available: (k) => { const st = ent(k); return !!st && ['unavailable', 'unknown'].indexOf(st.state) < 0; },
    attr: (k, n) => { const st = ent(k); return st ? st.attributes[n] : undefined; },
    rawState: (k) => { const st = ent(k); return st ? st.state : null; },
    isOn: (k) => { const st = ent(k); return !!st && ['on', 'playing', 'cool', 'heat'].indexOf(st.state) >= 0; },
    toggle: (k) => calls.push(['toggle', k]),
    matchOption: (list, kws) => {
      if (!Array.isArray(list) || !list.length) return null;
      const lower = list.map((x) => String(x).toLowerCase());
      for (const kw of kws) { const i = lower.indexOf(String(kw).toLowerCase()); if (i >= 0) return list[i]; }
      for (const kw of kws) { const i = lower.findIndex((x) => x.indexOf(String(kw).toLowerCase()) >= 0); if (i >= 0) return list[i]; }
      return null;
    },
    setHvacMode: (k, m) => calls.push(['hvac', k, m]),
    setFanMode: (k, m) => calls.push(['fan', k, m]),
    setSwingMode: (k, m) => calls.push(['swing', k, m]),
    setPresetMode: (k, m) => calls.push(['preset', k, m]),
    setNumber: (k, v) => calls.push(['number', k, v]),
    numberWritable: (k) => (idOf(k) || '').startsWith('number.'),
    numberValue: (k) => { const st = ent(k); return st ? parseFloat(st.state) : null; },
    numberBounds: (k, mn, mx, stp) => {
      const st = ent(k);
      return {
        min: st && st.attributes.min !== undefined ? st.attributes.min : mn,
        max: st && st.attributes.max !== undefined ? st.attributes.max : mx,
        step: st && st.attributes.step !== undefined ? st.attributes.step : stp
      };
    },
    sourceList: (k) => E.attr(k, 'source_list') || [],
    currentSource: (k) => E.attr(k, 'source') || null,
    isMuted: (k) => !!E.attr(k, 'is_volume_muted'),
    setMute: (k, v) => calls.push(['mute', k, v]),
    supportsFeature: (k, bit) => {
      const f = E.attr(k, 'supported_features');
      return typeof f === 'number' && (f & bit) !== 0;
    }
  };
  return E;
}

const states = {
  'climate.ac_mansarda_vortex': {
    entity_id: 'climate.ac_mansarda_vortex',
    state: 'cool',
    attributes: {
      hvac_modes: ['off', 'cool', 'heat', 'dry', 'fan_only'],
      fan_modes: ['auto', 'low', 'medium', 'high', 'turbo'],
      swing_modes: ['off', 'vertical', 'horizontal', 'both'],
      preset_modes: ['none', 'eco', 'sleep'],
      fan_mode: 'medium',
      swing_mode: 'off',
      preset_mode: 'none',
      current_temperature: 26.4,
      temperature: 21
    }
  },
  'number.clor': { entity_id: 'number.clor', state: '50', attributes: { min: 0, max: 100, step: 5 } },
  'media_player.tv': {
    entity_id: 'media_player.tv',
    state: 'playing',
    // 24509 = setul real Samsung/LG (include VOLUME_SET=4, VOLUME_MUTE=8, SELECT_SOURCE=2048)
    attributes: { source_list: ['HDMI 1', 'HDMI 2', 'Netflix'], source: 'HDMI 1', is_volume_muted: false, supported_features: 24509 }
  },
  'media_player.tv_standby': {
    entity_id: 'media_player.tv_standby',
    state: 'off',
    attributes: { source_list: ['HDMI 1'], is_volume_muted: false, supported_features: 24509 }
  },
  'media_player.tv_hisense': {
    entity_id: 'media_player.tv_hisense',
    state: 'playing',
    // 18817 = setul real Hisense/HomeKit (FĂRĂ VOLUME_SET şi VOLUME_MUTE)
    attributes: { source_list: ['HDMI1'], source: 'HDMI1', supported_features: 18817 }
  }
};
const map = {
  'climate.vortex': 'climate.ac_mansarda_vortex', 'number.clor_productie': 'number.clor',
  'media.mansarda': 'media_player.tv', 'media.standby': 'media_player.tv_standby', 'media.hisense': 'media_player.tv_hisense'
};
const E = makeE(states, map);

console.log('resolveAction:');
let r = resolveAction(E, 'climate.vortex', { k: 'hvac', v: 'cool' });
eq('hvac cool este activ', [r.supported, r.active], [true, true]);

r = resolveAction(E, 'climate.vortex', { k: 'hvac', v: 'heat_cool' });
eq('hvac lipsă din hvac_modes -> nesuportat', r.supported, false);

r = resolveAction(E, 'climate.vortex', { k: 'fan', kw: ['medium', 'mid', 'mediu'] });
eq('fan medium rezolvat şi activ', [r.supported, r.active, r.hint], [true, true, 'fan_mode: medium']);

r = resolveAction(E, 'climate.vortex', { k: 'fan', kw: ['inexistent'] });
eq('fan negăsit -> VERIFY', r.supported, false);

r = resolveAction(E, 'climate.vortex', { k: 'swingToggle' });
eq('swing oprit -> inactiv, comanda porneşte "both"', [r.supported, r.active, r.hint], [true, false, 'swing_mode: both']);
E.calls.length = 0; r.run();
eq('swingToggle trimite set_swing_mode', E.calls, [['swing', 'climate.vortex', 'both']]);

r = resolveAction(E, 'climate.vortex', { k: 'preset', kw: ['eco'] });
eq('preset eco disponibil, inactiv', [r.supported, r.active], [true, false]);

r = resolveAction(E, 'climate.vortex', { k: 'source', kw: ['plex'] });
eq('source pe entitate climate -> nesuportat', r.supported, false);

r = resolveAction(E, 'media.mansarda', { k: 'source', kw: ['hdmi 1'] });
eq('sursa HDMI 1 activă', [r.supported, r.active], [true, true]);

r = resolveAction(E, 'media.mansarda', { k: 'mute' });
E.calls.length = 0; r.run();
eq('mute trimite is_volume_muted=true', E.calls, [['mute', 'media.mansarda', true]]);

r = resolveAction(E, 'media.standby', { k: 'mute' });
eq('mute pe TV in standby -> nesuportat', r.supported, false);
r = resolveAction(E, 'media.standby', { k: 'source', kw: ['hdmi 1'] });
eq('sursa pe TV in standby -> nesuportat', r.supported, false);
r = resolveAction(E, 'media.hisense', { k: 'mute' });
eq('mute fara bitul VOLUME_MUTE (Hisense) -> nesuportat', r.supported, false);
r = resolveAction(E, 'media.hisense', { k: 'source', kw: ['hdmi1'] });
eq('sursa Hisense (are SELECT_SOURCE) -> suportat', r.supported, true);

r = resolveAction(E, 'x', { k: 'numberFrac', slot: 'number.clor_productie', frac: 0.5 });
eq('numberFrac 50% este activ', [r.supported, r.active], [true, true]);
E.calls.length = 0;
r = resolveAction(E, 'x', { k: 'numberFrac', slot: 'number.clor_productie', frac: 1 });
r.run();
eq('numberFrac 100% trimite 100', E.calls, [['number', 'number.clor_productie', 100]]);

r = resolveAction(E, 'x', { k: 'slot', slot: 'switch.inexistent' });
eq('slot nemapat -> nesuportat', r.supported, false);

r = resolveAction(E, 'climate.nemapat', { k: 'hvac', v: 'cool' });
eq('card nemapat -> nesuportat', r.supported, false);

// ---- istoric ---------------------------------------------------------------
console.log('istoric:');
const DAY = 86400000;
const now = Date.now();
const raw = {
  'sensor.apa': [
    { lu: (now - 2 * DAY) / 1000, s: '30' },
    { lu: (now - 2 * DAY + 3600000) / 1000, s: '32' },
    { lu: (now - 1 * DAY) / 1000, s: '28' },
    { lu: now / 1000, s: '33' }
  ],
  'switch.p': [
    { lu: (now - 7 * DAY) / 1000, s: 'off' },
    { lu: (now - 3 * DAY) / 1000, s: 'on' },
    { lu: (now - 1 * DAY) / 1000, s: 'off' }
  ]
};
const avg = dailyAverage(raw, 'sensor.apa', 7);
eq('media zilnică: 7 valori', avg.length, 7);
eq('media zilei -2 = 31', avg[4], 31);
eq('media zilei 0 = 33', avg[6], 33);
eq('zilele fără date sunt null', avg[0], null);
eq('fillGaps elimină null-urile', fillGaps(avg).filter((v) => v === null).length, 0);
eq('fillGaps pe serie goală -> null', fillGaps([null, null, null]), null);
eq('dailyLast ia ultima valoare a zilei', dailyLast(raw, 'sensor.apa', 7)[4], 32);
eq('etichete pe 7 zile', lastDayLabels(7).length, 7);

const segs = timelineSegments(raw, 'switch.p', 7, 16);
eq('timeline produce segmente', Array.isArray(segs) && segs.length > 0, true);
eq('timeline însumează 16 celule', segs.reduce((a, b) => a + b[1], 0), 16);
eq('timeline pentru entitate necunoscută -> null', timelineSegments(raw, 'sensor.lipsa', 7, 16), null);

// ---- breakpoint-uri responsive ---------------------------------------------
console.log('breakpoint-uri:');
const clasa = (vw) => ({ mob: vw < MOBILE_MAX, tab: vw >= MOBILE_MAX && vw < NARROW_MAX, narrow: vw < NARROW_MAX });
eq('pragurile sunt cele din design (760 / 1180)', [MOBILE_MAX, NARROW_MAX], [760, 1180]);
eq('359px = telefon', clasa(359), { mob: true, tab: false, narrow: true });
eq('759px = inca telefon', clasa(759), { mob: true, tab: false, narrow: true });
eq('760px = tableta', clasa(760), { mob: false, tab: true, narrow: true });
eq('1179px = inca tableta', clasa(1179), { mob: false, tab: true, narrow: true });
eq('1180px = desktop', clasa(1180), { mob: false, tab: false, narrow: false });
eq('coloane tile: telefon 2', tileCols(clasa(400)), 2);
eq('coloane tile: tableta 3', tileCols(clasa(900)), 3);
eq('coloane tile: desktop 4', tileCols(clasa(1600)), 4);

// ---- maparea propusa din audit ---------------------------------------------
console.log('mapare din audit:');
const slotKeys = new Set(SLOTS.map((x) => x.key));
const slotByKey = Object.fromEntries(SLOTS.map((x) => [x.key, x]));
const propuse = Object.keys(SUGGESTED_MAP);

eq('toate cheile propuse exista in catalogul de sloturi',
   propuse.filter((k) => !slotKeys.has(k)), []);

eq('toate entity_id-urile au forma domeniu.obiect',
   propuse.filter((k) => !/^[a-z_]+\.[a-z0-9_]+$/.test(SUGGESTED_MAP[k])), []);

eq('domeniul fiecarei entitati e permis de slot',
   propuse.filter((k) => {
     const dom = SUGGESTED_MAP[k].split('.')[0];
     return slotByKey[k].domains.indexOf(dom) < 0;
   }), []);

eq('nicio entitate nu e folosita pentru doua sloturi fara motiv',
   (() => {
     const seen = {};
     propuse.forEach((k) => { (seen[SUGGESTED_MAP[k]] = seen[SUGGESTED_MAP[k]] || []).push(k); });
     // pompa de caldura si Vivax apar de doua ori intentionat (card + diagnostic integrare)
     const ok = [
       'climate.pompa_caldura_piscina', 'climate.mansarda_aer_conditionat_vivax_mansarda',
       // firmware-ul apare si pe pagina Retea, si in Mentenanta
       'update.gateway_principal_firmware', 'update.switch_principal_firmware',
       // singurul contor de energie: alimenteaza si randul AC Etaj, si inelul
       // "total" de pe Acasa (etichetat explicit "AC Etaj")
       'sensor.etaj_aer_conditionat_lg_etaj_energy_this_month'
     ];
     return Object.keys(seen).filter((id) => seen[id].length > 1 && ok.indexOf(id) < 0);
   })(), []);

// Aux1/Aux2 = iesirile necunoscute ale clorinatorului (switch.aux_1, switch.aux_2).
// Regexul e ancorat pe cifra finala ca sa NU prinda switch.aux_cloud_* (AC Vortex),
// care sunt functii legitime, mapate intentionat.
eq('niciun control interzis nu e mapat (PoE, reboot, Aux1/Aux2)',
   propuse.filter((k) => /(_poe$|_reboot$|^switch\.aux_\d+$)/.test(SUGGESTED_MAP[k])), []);

eq('sloturile ramase au toate un motiv explicit',
   SLOTS.filter((x) => !SUGGESTED_MAP[x.key] && !UNMAPPED_REASONS[x.key]).map((x) => x.key), []);

eq('total: 132 mapate din 132 (zero sloturi nemapate)', [propuse.length, SLOTS.length], [132, 132]);
eq('total nemapate cu motiv', Object.keys(UNMAPPED_REASONS).length, 0);

console.log('\n' + pass + ' trecute, ' + fail + ' picate');
process.exit(fail ? 1 : 0);
