// Verificare a logicii pure (fără React / fără HA real).
import { resolveAction } from '../src/model/actions.js';
import {
  dailyAverage, dailyLast, fillGaps, timelineSegments, lastDayLabels
} from '../src/ha/historyMath.js';
import { tileCols, MOBILE_MAX, NARROW_MAX } from '../src/design/breakpoints.js';
import { SLOTS } from '../src/ha/slots.js';
import { SUGGESTED_MAP, UNMAPPED_REASONS } from '../src/ha/suggestedMap.js';
import {
  particleSpeed, strokeWidth, flowDir, fmtFlowPower, dayCurve, dayHourLabels
} from '../src/design/flowMath.js';
import {
  consumCasaAzi, autoconsumPct, sankeyLanes, exportImportRatio, deltaPct, fmtDelta,
  valueAt, peakOf, hourCurve, statEnergySeries, statMeanSeries, sumOrNull
} from '../src/design/energyMath.js';
import {
  fmtPow, fmtEn, fmtVar, fmtVA, fmtTemp, fmtVolt, fmtAmp, fmtFreq, fmtPct, fmtText, fmtUnitAuto, dec
} from '../src/design/format.js';
import { monotoneTangents, monotonePath, contiguousRuns, trimEdges } from '../src/design/curve.js';
import { buildZones, sortFloors } from '../src/ha/registries.js';
import { NAV } from '../src/model/devices.js';
import { PAGE_HERO } from '../src/model/pages.js';
import { UNSET, isLgTimerUnset, isLgTimerSlot } from '../src/ha/unset.js';

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

// v1.3.2: nesuportat STRUCTURAL (integrarea nu expune functia deloc) vs
// TRANZITORIU (TV in standby). Modalul le elimina doar pe primele.
r = resolveAction(E, 'media.hisense', { k: 'source', kw: ['youtube'] });
eq('sursa absenta din source_list -> structural (se elimina din modal)', [r.supported, r.structural === true], [false, true]);
r = resolveAction(E, 'media.hisense', { k: 'mute' });
eq('mute fara VOLUME_MUTE -> structural', r.structural === true, true);
r = resolveAction(E, 'media.standby', { k: 'source', kw: ['hdmi 1'] });
eq('sursa existenta pe TV in standby -> tranzitoriu (ramane vizibila)', [r.supported, r.structural === true], [false, false]);
// lista se verifica INAINTE de standby cand e nevida — altfel standby-ul
// ar masca absenta structurala si butonul ar reaparea cu TV-ul stins.
r = resolveAction(E, 'media.standby', { k: 'source', kw: ['netflix'] });
eq('sursa absenta din lista, TV in standby -> tot structural', r.structural === true, true);

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
// Perechea din ziua -2 e ancorată la AMIAZĂ, nu la "now - 2 zile + 1h":
// varianta veche sărea în altă zi calendaristică atunci când testul rula
// între 23:00 şi 00:00 (flake descoperit pe 22.08, la o rulare târzie).
const noonAnchor = new Date();
noonAnchor.setHours(12, 0, 0, 0);
const NOON2 = noonAnchor.getTime() - 2 * DAY;
const raw = {
  'sensor.apa': [
    { lu: NOON2 / 1000, s: '30' },
    { lu: (NOON2 + 3600000) / 1000, s: '32' },
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

// 293 -> 291: sloturile addon.fusion si addon.get_hacs au iesit odata cu
// dezinstalarea add-on-urilor (curatenia din 23.08.2026).
eq('total: 291 mapate din 291 (zero sloturi nemapate)', [propuse.length, SLOTS.length], [291, 291]);
eq('total nemapate cu motiv', Object.keys(UNMAPPED_REASONS).length, 0);

// ---- energie Growatt (v1.1.3) ----------------------------------------------
console.log('energie Growatt:');
const gwKeys = propuse.filter((k) => k.startsWith('gw.'));
eq('111 sloturi Growatt, toate mapate', gwKeys.length, 111);
eq('toate sloturile gw.* tintesc device-ul KNN2E3S00W',
   gwKeys.filter((k) => !SUGGESTED_MAP[k].startsWith('sensor.knn2e3s00w_')), []);

// Registrele respinse de auditul de coerenta fizica (2026-08-22): scalate
// gresit de layout, nepopulate de firmware sau flag-uri nedocumentate.
// NICIUNUL nu are voie sa fie mapat, indiferent de slot.
const GW_INTERZISE = [
  'bmsbatteryavgtemp', 'bmsbatteryavgtemp3', 'bmsmaxcelltemp2', 'bmsbatteryvolt',
  'battery_voltage', 'bmschargevoltlimit', 'bmsdischargevoltlimit', 'batloadvolt',
  'esystotal', 'eloadtoday', 'eloadtotal', 'iso', 'dcit', 'ipf', 'bmscyclecnt',
  'pchrxxxl', 'dcir', 'dcis', 'dcv', 'temp4',
  'bmsstatus', 'sysstatemode', 'warncode', 'bdcderatingmode', 'bdc1flag', 'priority'
].map((sfx) => 'sensor.knn2e3s00w_' + sfx);
eq('niciun registru Growatt respins de audit nu e mapat',
   propuse.filter((k) => GW_INTERZISE.indexOf(SUGGESTED_MAP[k]) >= 0), []);

// bmsbatteryavgtemp2 (validat) ramane mapat desi numele contine prefixul
// registrului interzis bmsbatteryavgtemp — verificarea de mai sus e pe id exact.
eq('bmsbatteryavgtemp2 (validat) este mapat',
   SUGGESTED_MAP['gw.bat_temp_med'], 'sensor.knn2e3s00w_bmsbatteryavgtemp2');

// Fiecare entitate Growatt e folosita o singura data (fara dubluri de slot).
eq('entitatile Growatt sunt unice pe sloturi',
   (() => {
     const seen = {};
     gwKeys.forEach((k) => { seen[SUGGESTED_MAP[k]] = (seen[SUGGESTED_MAP[k]] || 0) + 1; });
     return Object.keys(seen).filter((id) => seen[id] > 1);
   })(), []);

// ---- contor racord GPG0A450ZS (v1.2.8) -------------------------------------
console.log('contor racord:');
const ctrKeys = propuse.filter((k) => k.startsWith('ctr.'));
eq('27 sloturi de contor, toate mapate', ctrKeys.length, 27);
eq('toate sloturile ctr.* tintesc device-ul GPG0A450ZS',
   ctrKeys.filter((k) => !SUGGESTED_MAP[k].startsWith('sensor.gpg0a450zs_')), []);

// Registrele respinse de auditul de coerenta din 2026-08-23:
// pos_act_power si rev_act_power sunt dubluri bit-cu-bit ale registrului net
// semnat pos_rev_act_power (verificat pe istoric 36h — identice la fiecare
// esantion), deci etichetele lor mint; power_factor total nu se inchide pe
// P/S (0.833 raportat vs 0.79 calculat), desi cele per faza se inchid ±1%.
const CTR_INTERZISE = ['pos_act_power', 'rev_act_power', 'power_factor']
  .map((sfx) => 'sensor.gpg0a450zs_' + sfx);
eq('niciun registru de contor respins de audit nu e mapat',
   propuse.filter((k) => CTR_INTERZISE.indexOf(SUGGESTED_MAP[k]) >= 0), []);

// power_factor_l1..l3 (validate, P/S per faza) raman mapate desi numele
// contine prefixul registrului interzis power_factor — verificarea e pe id exact.
eq('power_factor_l1 (validat) este mapat',
   SUGGESTED_MAP['ctr.f1_pf'], 'sensor.gpg0a450zs_power_factor_l1');

eq('entitatile contorului sunt unice pe sloturi',
   (() => {
     const seen = {};
     ctrKeys.forEach((k) => { seen[SUGGESTED_MAP[k]] = (seen[SUGGESTED_MAP[k]] || 0) + 1; });
     return Object.keys(seen).filter((id) => seen[id] > 1);
   })(), []);

// Oglinzile-template ale contorului (v1.2.9): singurele surse cu state_class,
// deci singurele care pot alimenta Sapt/Luna/An si comparatia cu invertorul.
eq('oglinzile contorului sunt mapate pe template-urile create',
   ['energie.stat_ctr_imp', 'energie.stat_ctr_exp', 'energie.stat_ctr_f1', 'energie.stat_ctr_f2', 'energie.stat_ctr_f3']
     .map((k) => SUGGESTED_MAP[k]),
   ['sensor.contor_import_total', 'sensor.contor_export_total',
    'sensor.contor_faza_1_putere', 'sensor.contor_faza_2_putere', 'sensor.contor_faza_3_putere']);

// ---- curba netedă a graficului de piscină (v1.4.0) --------------------------
console.log('curba monotona:');
// Cazul care conteaza: interpolarea NU are voie sa depaseasca valorile masurate.
// Esantionam curba generata si verificam ca ramane intre capete pe fiecare
// segment (proprietatea Fritsch-Carlson).
function sampleCubic(p0, c1, c2, p3, t) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t * p3;
}
function segmentsFromPath(d) {
  // 'M x y C c1x c1y c2x c2y x y C ...' -> [[y0, c1y, c2y, y1], ...]
  const nums = d.replace(/[MC]/g, ' ').trim().split(/\s+/).map(Number);
  const segs = [];
  let y0 = nums[1];
  for (let i = 2; i + 5 < nums.length; i += 6) {
    segs.push([y0, nums[i + 1], nums[i + 3], nums[i + 5]]);
    y0 = nums[i + 5];
  }
  return segs;
}
const dents = [[0, 10], [1, 30], [2, 10], [3, 12], [4, 60], [5, 58]];
const dPath = monotonePath(dents);
eq('calea incepe cu M si contine curbe C', /^M[\d.\- ]+ C/.test(dPath), true);
eq('cate un segment cubic per interval', segmentsFromPath(dPath).length, dents.length - 1);
eq('curba NU depaseste valorile masurate (fara varfuri inventate)',
   (() => {
     const bad = [];
     for (const [a, c1, c2, b] of segmentsFromPath(dPath)) {
       const lo = Math.min(a, b) - 0.001, hi = Math.max(a, b) + 0.001;
       for (let t = 0; t <= 1.0001; t += 0.05) {
         const v = sampleCubic(a, c1, c2, b, t);
         if (v < lo || v > hi) { bad.push(Math.round(v * 100) / 100); break; }
       }
     }
     return bad;
   })(), []);
// tangenta e zero in varfuri/vai (schimbare de sens), altfel media pantelor
eq('tangenta 0 in varf', monotoneTangents([[0, 0], [1, 10], [2, 0]])[1], 0);
eq('tangenta 0 in vale', monotoneTangents([[0, 10], [1, 0], [2, 10]])[1], 0);
eq('pe o panta constanta tangentele sunt panta',
   monotoneTangents([[0, 0], [1, 5], [2, 10]]), [5, 5, 5]);
eq('serie plata -> toate tangentele 0', monotoneTangents([[0, 7], [1, 7], [2, 7]]), [0, 0, 0]);
eq('un singur punct -> doar M', monotonePath([[3, 4]]), 'M3 4');
eq('serie goala -> cale goala', monotonePath([]), '');
// coordonatele SVG raman cu PUNCT, chiar daca aplicatia afiseaza virgula
eq('separatorul din cale e punctul, nu virgula', /,/.test(monotonePath([[0, 0.5], [1, 1.5]])), false);

// golurile nu se unesc cu o linie dreapta: seria se rupe in tronsoane
eq('tronsoane continue in jurul golurilor',
   contiguousRuns([null, 1, 2, null, null, 5, 6]).map((r) => [r.from, r.values.length]),
   [[1, 2], [5, 2]]);
eq('serie fara goluri -> un singur tronson',
   contiguousRuns([1, 2, 3]).map((r) => r.from), [0]);
eq('serie complet goala -> niciun tronson', contiguousRuns([null, null]), []);

// taierea capetelor: 4 zile de date intr-o fereastra de 7 nu se inghesuie
eq('taie golurile de la capete', trimEdges([null, null, 3, 4, null]), { from: 2, to: 3 });
eq('serie plina -> capetele raman', trimEdges([1, 2, 3]), { from: 0, to: 2 });
eq('fara nicio valoare -> null', trimEdges([null, null]), null);

// ---- diagrama de flux energetic (v1.1.4) -----------------------------------
console.log('diagrama de flux:');
eq('sub prag (99 W) -> fara particule', particleSpeed(99), 0);
eq('la pragul de jos (100 W) viteza minima', particleSpeed(100), 40);
eq('la pragul de sus (15 kW) viteza maxima', particleSpeed(15000), 220);
eq('peste 15 kW viteza ramane plafonata', particleSpeed(25000), 220);
eq('viteza creste monoton cu puterea', particleSpeed(5000) > particleSpeed(1000), true);
eq('traseu inactiv -> grosime minima statica', strokeWidth(0), 1.5);
eq('grosimea creste cu puterea', strokeWidth(12000) > strokeWidth(500), true);
eq('flowDir: incarcare (pos)', flowDir(145, 0), { sign: 1, power: 145 });
eq('flowDir: descarcare (neg) inverseaza directia', flowDir(0, 800), { sign: -1, power: 800 });
eq('flowDir: sub 1 W = repaus', flowDir(0.4, 0.2), { sign: 0, power: 0 });
eq('badge W intregi sub 1 kW', fmtFlowPower(450), '450 W');
eq('badge kW cu 1 zecimala sub 10 kW (regula v1.3.0)', fmtFlowPower(1234), '1,2 kW');
eq('badge kW intregi de la 10 kW in sus (regula v1.3.0)', fmtFlowPower(12302), '12 kW');
eq('badge pentru valoare lipsa', fmtFlowPower(null), '—');

// ---- formatarea canonica a unitatilor (v1.3.0) -----------------------------
console.log('formatare unitati:');
// PUTERE: <1000 W intregi; 1-10 kW o zecimala; >=10 kW intregi; apoi MW la fel.
eq('999 W ramane W', fmtPow(999), { v: '999', u: 'W' });
eq('1000 W -> 1.0 kW', fmtPow(1000), { v: '1,0', u: 'kW' });
eq('9200 W -> 9.2 kW', fmtPow(9200), { v: '9,2', u: 'kW' });
eq('9999 W -> 10 kW (nu 10.0)', fmtPow(9999), { v: '10', u: 'kW' });
eq('25000 W -> 25 kW', fmtPow(25000), { v: '25', u: 'kW' });
eq('1.5 MW', fmtPow(1500000), { v: '1,5', u: 'MW' });
eq('puterea negativa pastreaza semnul', fmtPow(-2728), { v: '-2,7', u: 'kW' });
eq('putere lipsa -> null', fmtPow(null), null);
// ENERGIE (intrare kWh): oglinda puterii, dar MWh ramane cu 1 zecimala mereu.
eq('0.45 kWh -> 450 Wh', fmtEn(0.45), { v: '450', u: 'Wh' });
eq('9.034 kWh -> 9.0 kWh (cazul "9034 Wh" de pe Acasa)', fmtEn(9.034), { v: '9,0', u: 'kWh' });
eq('117.4 kWh -> 117 kWh', fmtEn(117.4), { v: '117', u: 'kWh' });
eq('57117 kWh -> 57.1 MWh (cazul de la Energie)', fmtEn(57117), { v: '57,1', u: 'MWh' });
eq('37730.5 kWh -> 37.7 MWh (contoarele raman comparabile)', fmtEn(37730.5), { v: '37,7', u: 'MWh' });
// ALTE FAMILII
eq('var pe aceeasi scara ca W', fmtVar(-1806), { v: '-1,8', u: 'kvar' });
eq('VA pe aceeasi scara ca W', fmtVA(2408), { v: '2,4', u: 'kVA' });
eq('temperatura mereu cu 1 zecimala', fmtTemp(25), { v: '25,0', u: '°C' });
eq('tensiune de faza intreaga (>=100 V)', fmtVolt(230.7), { v: '231', u: 'V' });
eq('tensiune de celula cu 3 zecimale (<10 V)', fmtVolt(3.336), { v: '3,336', u: 'V' });
eq('curent cu 1 zecimala', fmtAmp(10.44), { v: '10,4', u: 'A' });
eq('frecventa cu 2 zecimale', fmtFreq(49.9), { v: '49,90', u: 'Hz' });
eq('procente intregi', fmtPct(53.4), { v: '53', u: '%' });
eq('fmtText compune "v u"', fmtText(fmtPow(9200)), '9,2 kW');
eq('fmtText pentru lipsa -> null', fmtText(null), null);
// Separatorul zecimal al aplicatiei e virgula (v1.3.1).
eq('dec inlocuieste punctul cu virgula', dec('9.2'), '9,2');
eq('dec lasa intregii neatinsi', dec('117'), '117');
// AUTO dupa unitatea declarata (calea E.fmt) — inclusiv conversii de intrare.
eq('auto: 9034 Wh -> 9.0 kWh', fmtUnitAuto(9034, 'Wh'), { v: '9,0', u: 'kWh' });
eq('auto: 12300 W -> 12 kW (randurile de tabel)', fmtUnitAuto(12300, 'W'), { v: '12', u: 'kW' });
eq('auto: 12.3 kW declarat in kW', fmtUnitAuto(12.3, 'kW'), { v: '12', u: 'kW' });
eq('auto: ore intregi', fmtUnitAuto(10393.49, 'h'), { v: '10393', u: 'h' });
eq('auto: familie necunoscuta -> null (cade pe euristica veche)', fmtUnitAuto(7.2, 'pH'), null);

// dayCurve pe un caz sintetic: miezul noptii = 0, "acum" = ora 3, cosuri de 1h.
const H = 3600 * 1000;
const dsamples = [
  { lu: (0.5 * H) / 1000, s: '100' },
  { lu: (0.6 * H) / 1000, s: '300' },           // cosul 0 -> media 200
  { lu: (2.5 * H) / 1000, s: '500' },           // cosul 2
  { lu: (2.7 * H) / 1000, s: 'unavailable' },   // ne-numeric -> ignorat
  { lu: (5 * H) / 1000, s: '900' }              // dupa "acum" -> ignorat
];
const dc = dayCurve(dsamples, 0, 3 * H, 24);
eq('dayCurve: media valorilor pe cos', dc.values[0], 200);
eq('dayCurve: cos gol preia ultima valoare', dc.values[1], 200);
eq('dayCurve: cosul orei 2', dc.values[2], 500);
eq('dayCurve: lastIdx la "acum"', dc.lastIdx, 3);
eq('dayCurve: dupa "acum" ramane null', dc.values[4], null);
eq('etichete de ore din 4 in 4', dayHourLabels(4), ['00', '04', '08', '12', '16', '20', '24']);

// ---- instrumentul Energie (v1.1.5) -----------------------------------------
console.log('instrument Energie:');
// Sloturile noi: sun.sun + oglinzile-template cu statistici (create 2026-08-22).
eq('slotul soare tinteste sun.sun', SUGGESTED_MAP['energie.soare'], 'sun.sun');
eq('sursele de statistici sunt oglinzile template',
   ['energie.stat_import', 'energie.stat_export', 'energie.stat_chr', 'energie.stat_dischr', 'energie.stat_soc']
     .map((k) => SUGGESTED_MAP[k]),
   ['sensor.growatt_import_retea_total', 'sensor.growatt_export_retea_total',
    'sensor.growatt_baterie_incarcare_total', 'sensor.growatt_baterie_descarcare_total',
    'sensor.growatt_baterie_soc']);

// Formulele derivate aprobate.
eq('consum casa = autoconsum + import', consumCasaAzi(33.1, 3.3), 36.4);
eq('consum casa fara date -> null (nu zero)', consumCasaAzi(null, 3.3), null);
eq('autoconsum 96%', autoconsumPct(96, 4), 96);
eq('autoconsum fara productie -> null', autoconsumPct(0, 0), null);
// Corectia aprobata: PV->casa scade si incarcarea bateriei (dimineata).
eq('sankey dimineata: PV->casa = pvOut - export - incarcare',
   sankeyLanes(10000, 100, 3000, 0), { pvToHouse: 6900, batToHouse: 0, pvToGrid: 100 });
eq('sankey descarcare: bateria alimenteaza casa',
   sankeyLanes(12161, 1065, 0, 1940), { pvToHouse: 11096, batToHouse: 1940, pvToGrid: 1065 });
eq('sankey nu coboara sub zero', sankeyLanes(1000, 500, 800, 0).pvToHouse, 0);
eq('raport export/import', exportImportRatio(33422, 12206), 2.7);
eq('raport cu import zero -> null ("—")', exportImportRatio(100, 0), null);
eq('delta procentuala', deltaPct(110, 100), 10);
eq('delta fara referinta -> null', deltaPct(110, null), null);
eq('fmtDelta null -> "—" fara sageata', fmtDelta(null), { txt: '—', dir: 0 });
eq('fmtDelta pozitiv', fmtDelta(9.8), { txt: '▲ 9,8%', dir: 1 });

// valueAt: ultimul esantion dinaintea momentului, in toleranta de 30 min.
const vs = [{ lu: 100, s: '5' }, { lu: 200, s: '7' }, { lu: 4000, s: '9' }];
eq('valueAt ia ultimul esantion dinainte', valueAt(vs, 250 * 1000), 7);
eq('valueAt in afara tolerantei -> null', valueAt(vs, 200 * 1000 + 31 * 60 * 1000), null);

// peakOf: varful zilei; fara esantioane numerice -> null.
eq('peakOf gaseste varful', peakOf([{ lu: 10, s: '3' }, { lu: 20, s: '8' }, { lu: 30, s: '5' }], 0), { v: 8, t: 20000 });
eq('peakOf fara date -> null', peakOf([], 0), null);

// hourCurve: 12 cosuri de 5 min pe ultima ora.
const hc = hourCurve([{ lu: 3300, s: '10' }, { lu: 3400, s: '20' }], 3600 * 1000, 12);
eq('hourCurve pune media in cosul corect', hc[11], 15);
eq('hourCurve fara esantioane -> null', hourCurve([], 3600 * 1000, 12), null);

// statistici: energia pe cos = diferentele campului cumulativ `sum`.
const DAYMS = 86400000;
const srows = [
  { start: 0, sum: 100 },          // referinta (inainte de fereastra)
  { start: DAYMS, sum: 110 },      // ziua 0: +10
  { start: 2 * DAYMS, sum: 125 }   // ziua 1: +15
];
eq('statEnergySeries face diferente de sum', statEnergySeries(srows, 2, DAYMS, DAYMS), [10, 15]);
eq('statEnergySeries fara rânduri -> null-uri', statEnergySeries([], 2, DAYMS, DAYMS), [null, null]);
eq('statMeanSeries plaseaza mediile', statMeanSeries([{ start: DAYMS, mean: 50.04 }], 2, DAYMS, DAYMS), [50, null]);
eq('sumOrNull ignora null-urile', sumOrNull([10, null, 5]), 15);
eq('sumOrNull cu totul gol -> null', sumOrNull([null, null]), null);

// ---- zone: etaje si registre (v1.5.0) ---------------------------------------
console.log('zone (registre HA):');

// Registru mic dar reprezentativ: etaje neordonate ca sa se vada sortarea,
// o entitate cu area_id PROPRIU care contrazice zona dispozitivului, un
// dispozitiv FARA zona (infrastructura) si o entitate dezactivata.
const REG = {
  floors: [
    { floor_id: 'exterior', name: 'Exterior', level: 4 },
    { floor_id: 'parter', name: 'Parter', level: 0 },
    { floor_id: 'etaj', name: 'Etaj', level: 1 }
  ],
  areas: [
    { area_id: 'kitchen', name: 'Bucatarie & Dining', floor_id: 'parter' },
    { area_id: 'bedroom', name: 'Dormitor Etaj', floor_id: 'etaj' },
    { area_id: 'foisor', name: 'Foisor', floor_id: 'exterior' },
    { area_id: 'nicaieri', name: 'Zona fara etaj', floor_id: null }
  ],
  devices: [
    { id: 'd_ac', area_id: 'bedroom' },
    { id: 'd_tv', area_id: 'foisor' },
    { id: 'd_gw', area_id: null }
  ],
  entities: [
    { entity_id: 'climate.ac', device_id: 'd_ac', area_id: null },
    { entity_id: 'sensor.ac_ambient', device_id: 'd_ac', area_id: 'kitchen' },
    { entity_id: 'media_player.tv', device_id: 'd_tv', area_id: null },
    { entity_id: 'sensor.gw_cpu', device_id: 'd_gw', area_id: null },
    { entity_id: 'switch.dezactivat', device_id: 'd_tv', area_id: null, disabled_by: 'user' },
    { entity_id: 'update.firmware', device_id: 'd_tv', area_id: null },
    { entity_id: 'sensor.orfan', device_id: null, area_id: 'nicaieri' }
  ]
};
const ST = {
  'climate.ac': {}, 'sensor.ac_ambient': {}, 'media_player.tv': {},
  'sensor.gw_cpu': {}, 'switch.dezactivat': {}, 'update.firmware': {}, 'sensor.orfan': {}
};
const Z = buildZones(REG, ST);
const zonaCu = (id) => { for (const f of Z) for (const z of f.zone) if (z.id === id) return z; return null; };
const undevaAre = (eid) => Z.some((f) => f.zone.some((z) => z.entities.indexOf(eid) >= 0));

eq('etajele ies sortate dupa level', sortFloors(REG.floors).map((f) => f.name), ['Parter', 'Etaj', 'Exterior']);
eq('ordinea etajelor in rezultat', Z.map((f) => f.name), ['Parter', 'Etaj', 'Exterior', 'Fără etaj']);
eq('capcana 1: area_id pe entitate bate zona dispozitivului', zonaCu('kitchen').entities, ['sensor.ac_ambient']);
eq('fara area_id propriu, entitatea mosteneste zona dispozitivului', zonaCu('bedroom').entities, ['climate.ac']);
eq('capcana 2: dispozitivul fara zona NU apare nicaieri', undevaAre('sensor.gw_cpu'), false);
eq('entitatea dezactivata e ignorata', undevaAre('switch.dezactivat'), false);
eq('domeniul update e ignorat', undevaAre('update.firmware'), false);
eq('entitatea fara dispozitiv, dar cu zona, e pastrata', zonaCu('nicaieri').entities, ['sensor.orfan']);
eq('zona fara etaj nu inventeaza un etaj, dar nu se pierde', Z[Z.length - 1].id, '__fara_etaj');
eq('entitatea absenta din state machine e ignorata',
   buildZones(REG, { 'climate.ac': {} }).reduce((n, f) => n + f.zone.reduce((m, z) => m + z.entities.length, 0), 0), 1);
eq('registru gol nu arunca', buildZones({ floors: [], areas: [], devices: [], entities: [] }, {}), []);

// ---- navigatie: contractul dintre NAV si restul (v1.5.1) --------------------
// Lectia din 24.08: auditul responsive avea lista de pagini HARDCODATA si o
// copie manuala a subtitlurilor. Pagina `zone`, adaugata in v1.5.0, n-a fost
// masurata niciodata, iar raportul spunea 80 de combinatii si parea complet.
// Unealta citeste acum lista din DOM; testele de aici pazesc invariantele care
// nu se pot verifica din DOM.
console.log('navigatie:');
const navKeys = NAV.map((n) => n.key);
eq('fiecare pagina din NAV are antet in PAGE_HERO',
   navKeys.filter((k) => !PAGE_HERO[k]), []);
eq('fiecare antet din PAGE_HERO are pagina in NAV',
   Object.keys(PAGE_HERO).filter((k) => navKeys.indexOf(k) < 0), []);
eq('cheile din NAV sunt unice', navKeys.length, new Set(navKeys).size);
eq('fiecare pagina are eticheta si iconita',
   NAV.filter((n) => !n.label || !n.icon).map((n) => n.key), []);
eq('antetele au si titlu si subtitlu',
   Object.keys(PAGE_HERO).filter((k) => !PAGE_HERO[k][0] || !PAGE_HERO[k][1]), []);
// Subtitlurile trebuie sa ramana unice: sunt singurul text care distinge o
// pagina de alta intr-o captura de audit.
eq('subtitlurile din PAGE_HERO sunt unice',
   Object.keys(PAGE_HERO).length, new Set(Object.keys(PAGE_HERO).map((k) => PAGE_HERO[k][1])).size);

console.log('lg timer unset:');
eq('UNSET label', UNSET, 'Nesetat');
eq('lg pornire slot', isLgTimerSlot('sensor.lg_pornire_min'), true);
eq('lg pornire unknown -> unset', isLgTimerUnset('sensor.lg_pornire_min', 'unknown'), true);
eq('lg pornire numeric -> not unset', isLgTimerUnset('sensor.lg_pornire_min', '30'), false);
eq('growatt unknown -> not lg unset', isLgTimerUnset('gw.frecv', 'unknown'), false);

console.log('\n' + pass + ' trecute, ' + fail + ' picate');
process.exit(fail ? 1 : 0);
