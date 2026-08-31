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
import {
  LG_AC_DEVICE_ID, LG_TIMER_KIND, lgTimerUnit, lgTimerBounds, splitDuration,
  normalizeTimerValue, bumpTimerValue, lgTimerBlockedReason, lgTimerService,
  formatTimerReceipt, lgErrorCode, lgTimerErrorMessage
} from '../src/ha/lgTimers.js';
import {
  HEALTH, HEALTH_LABEL, FRESHNESS, median, expectedInterval, gapsFromStamps, classifyDevice,
  healthTotals, fmtAge, sortDevices, SLOW_FACTOR, STALE_FACTOR
} from '../src/ha/health.js';
import { NAV, CARD_BY_ID, PAGE_DEVICES, MAX_SIDEBAR_DEVICES } from '../src/model/devices.js';
import { CLIMAT_ACCORDION, PISCINA_ACCORDION } from '../src/model/accordions.js';
import { PAGE_HERO } from '../src/model/pages.js';
import { UNSET, isLgTimerUnset, isLgTimerSlot } from '../src/ha/unset.js';
import { bumpNumber, firstNumberFromUnset, snapNumber } from '../src/ha/numberStep.js';
import {
  buildDevices, sursaComunicare, oprireAsteptata, intrareOk, intrareIgnorata,
  textFreshness, textStare, claseleePrezente, stampsDinIstoric, ISTORIC_MAX
} from '../src/ha/deviceHealth.js';
import { parseSize, fmtBytes, dbGrowth, citesteSystemHealth } from '../src/ha/systemHealth.js';
import {
  normalizeaza, wsUrl, configValida, alege, meritaRevenire, textConexiune,
  TIMEOUT_LOCAL, TIMEOUT_REMOTE, INTERVAL_REVENIRE
} from '../src/ha/endpoint.js';
import {
  CMD, creeaza, evalueaza, marcheazaAcceptat, marcheazaEsec, eInZbor, eTerminala,
  cheieComanda, fereastra, textAsteptare, textAccesibil, textExpirat
} from '../src/ha/commandState.js';
import {
  oraScurta, textZile, textRepetare, textSetari, textUrmatoarea, textUltima, stareProgram, slotProg
} from '../src/ha/acSchedule.js';

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
// 291 -> 319: cele 28 de sloturi de programare la ora exacta (v1.7.0), toate
// cu mapare implicita, deci invariantul „zero nemapate" ramane intact.
// 319 -> 324: cele 5 sloturi ale portii (v1.9.0). Niciunul nu descrie pozitia
// portii — nu exista senzor de pozitie de mapat.
// 324 -> 326: intentia „deschide la sosire" si expirarea ei (v2.0.0). Descriu
// tot ce vrea UTILIZATORUL, nu unde e poarta.
// 326 -> 315: cele 11 sloturi CCTV (5 camere, 5 iluminari IR, stergatorul Speed
// Dome) au iesit odata cu decizia de arhitectura: supravegherea se face exclusiv
// din DMSS, iar Home Assistant nu mai are camerele.
// 315 -> 266: cele 49 de sloturi net.* au iesit odata cu pagina Retea.
// Administrarea retelei se face in Omada Controller; integrarea TP-Link
// Omada ramane in HA, iar Device Health continua sa vada gateway, switch-uri
// si AP-uri din registrele live.
// 266 -> 267: slotul AC Casa Tata (v2.3.0), aparat pe infrarosu prin ESPHome.
// Are mapare implicita, deci invariantul zero-nemapate ramane intact.
// 267 -> 268: slotul AC Magazie (v2.4.0), a doua unitate pe infrarosu.
eq('total: 268 mapate din 268 (zero sloturi nemapate)', [propuse.length, SLOTS.length], [268, 268]);
eq('total nemapate cu motiv', Object.keys(UNMAPPED_REASONS).length, 0);

// ---- acordeoanele „setari complete" ------------------------------------------
// Invariantul care lipsea. In v2.3.0 intrarea de acordeon a lui AC Casa Tata a
// ajuns in PISCINA_ACCORDION in loc de CLIMAT_ACCORDION si a fost livrata asa:
// unitatea aparea in setarile complete ale PISCINEI. Testele nu atingeau deloc
// acordeoanele, iar auditul responsive verifica layout, nu apartenenta.
eq('fiecare intrare de acordeon trimite la un card real',
   [...CLIMAT_ACCORDION, ...PISCINA_ACCORDION].filter((u) => !CARD_BY_ID[u.card]).map((u) => u.card), []);

eq('acordeonul Climat contine doar carduri din grupul Climat',
   CLIMAT_ACCORDION.filter((u) => CARD_BY_ID[u.card].group !== 'Climat').map((u) => u.card), []);

eq('acordeonul Piscina contine doar carduri din grupul Piscina',
   PISCINA_ACCORDION.filter((u) => CARD_BY_ID[u.card].group !== 'Piscin' + 'ă').map((u) => u.card), []);

// Fiecare unitate de climatizare de pe pagina Climat trebuie sa aiba si setari
// complete — altfel un AC nou apare pe pagina, dar fara panoul lui.
eq('fiecare unitate de pe pagina Climat are intrare in acordeon',
   PAGE_DEVICES.climat.filter((id) => !CLIMAT_ACCORDION.some((u) => u.card === id)), []);

// Pagina Climat trebuie sa ramana in modul „lista compacta in bara laterala".
// In v2.4.0 a cincea unitate a impins-o peste prag si toate cele cinci au
// devenit carduri mari deasupra paginii. Numarul nu mai are voie sa decida tacut.
eq('Climat incape in bara laterala', PAGE_DEVICES.climat.length <= MAX_SIDEBAR_DEVICES, true);
eq('Piscina incape in bara laterala', PAGE_DEVICES.piscina.length <= MAX_SIDEBAR_DEVICES, true);
eq('Media ramane pe carduri mari', PAGE_DEVICES.media.length > MAX_SIDEBAR_DEVICES, true);

eq('acordeonul Climat nu are intrari in plus fata de pagina',
   CLIMAT_ACCORDION.filter((u) => PAGE_DEVICES.climat.indexOf(u.card) < 0).map((u) => u.card), []);


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

// ---- cronometre LG prin bridge-ul lg_thinq_timers (v1.5.4) ------------------
// Semantica vine din schema REALA a serviciilor, citita din HA:
//   set_schedule_on/off : device_id + hours(0-100) + minutes(0-59), cu gating
//                         de stare (ON cere AC oprit, OFF cere AC pornit);
//   set_sleep_timer     : device_id + hours(1-100), FARA minutes (LG 2201).
console.log('cronometre LG (bridge):');

const ON = LG_TIMER_KIND.ON, OFF = LG_TIMER_KIND.OFF, SLEEP = LG_TIMER_KIND.SLEEP;

eq('unitati: schedule in minute, sleep in ore',
   [lgTimerUnit(ON), lgTimerUnit(OFF), lgTimerUnit(SLEEP)], ['min', 'min', 'h']);
eq('limite schedule', lgTimerBounds(ON), { min: 0, max: 480, step: 15 });
eq('limite sleep (minim 1h, ca in schema LG)', lgTimerBounds(SLEEP), { min: 1, max: 12, step: 1 });

eq('splitDuration 0 -> 0h0m', splitDuration(0), { hours: 0, minutes: 0 });
eq('splitDuration 1 -> 0h1m (cazul E2E din 27_)', splitDuration(1), { hours: 0, minutes: 1 });
eq('splitDuration 90 -> 1h30m', splitDuration(90), { hours: 1, minutes: 30 });
eq('splitDuration 480 -> 8h0m', splitDuration(480), { hours: 8, minutes: 0 });
eq('splitDuration negativ -> 0h0m, fara NaN', splitDuration(-5), { hours: 0, minutes: 0 });

eq('normalizare: se lipeste de pas', normalizeTimerValue(ON, 22), 15);
eq('normalizare: peste maxim se plafoneaza', normalizeTimerValue(ON, 9999), 480);
eq('normalizare: sub minimul sleep -> nesetat', normalizeTimerValue(SLEEP, 0), null);
eq('normalizare: NaN -> nesetat', normalizeTimerValue(ON, NaN), null);

eq('bump din nesetat in jos ramane nesetat', bumpTimerValue(ON, null, -1), null);
eq('bump din nesetat in sus da primul pas', bumpTimerValue(ON, null, +1), 15);
eq('bump sleep din nesetat da minimul (1h)', bumpTimerValue(SLEEP, null, +1), 1);
eq('bump sub minim -> nesetat, nu zero', bumpTimerValue(SLEEP, 1, -1), null);
eq('bump se plafoneaza la maxim', bumpTimerValue(ON, 480, +1), 480);

// gating de stare: exact conditiile pe care LG le respinge cu 2302 / 2304
eq('pornire programata blocata cand AC-ul e pornit (2302)',
   lgTimerBlockedReason(ON, 'cool') !== null, true);
eq('pornire programata permisa cand AC-ul e oprit', lgTimerBlockedReason(ON, 'off'), null);
eq('oprire programata blocata cand AC-ul e oprit (2304)',
   lgTimerBlockedReason(OFF, 'off') !== null, true);
eq('oprire programata permisa cand AC-ul e pornit', lgTimerBlockedReason(OFF, 'heat'), null);
eq('sleep nu e blocat de stare', [lgTimerBlockedReason(SLEEP, 'off'), lgTimerBlockedReason(SLEEP, 'cool')], [null, null]);
eq('fara stare cunoscuta nu blocam preventiv', lgTimerBlockedReason(ON, null), null);

// maparea pe servicii — payload-ul exact trimis catre bridge
eq('schedule off 0h1m -> set_schedule_off cu ore si minute',
   lgTimerService(OFF, 1),
   { domain: 'lg_thinq_timers', service: 'set_schedule_off',
     data: { device_id: LG_AC_DEVICE_ID, hours: 0, minutes: 1 } });
eq('schedule on 90m -> 1h30m',
   lgTimerService(ON, 90).data, { device_id: LG_AC_DEVICE_ID, hours: 1, minutes: 30 });
eq('nesetat -> cancel, nu set cu zero',
   [lgTimerService(ON, null).service, lgTimerService(OFF, null).service, lgTimerService(SLEEP, null).service],
   ['cancel_schedule_on', 'cancel_schedule_off', 'cancel_sleep_timer']);
eq('cancel nu trimite durata', Object.keys(lgTimerService(ON, null).data), ['device_id']);

// INVARIANTUL care produce LG 2201 daca e incalcat
eq('sleep NU trimite niciodata minute',
   Object.prototype.hasOwnProperty.call(lgTimerService(SLEEP, 3).data, 'minutes'), false);
eq('sleep trimite orele ca ore, nu convertite din minute',
   lgTimerService(SLEEP, 3).data, { device_id: LG_AC_DEVICE_ID, hours: 3 });
eq('toate comenzile merg catre device-ul ThinQ corect',
   [lgTimerService(ON, 60), lgTimerService(OFF, 60), lgTimerService(SLEEP, 2), lgTimerService(ON, null)]
     .every((c) => c.data.device_id === LG_AC_DEVICE_ID), true);
eq('domeniul e mereu bridge-ul, niciodata number.*',
   [lgTimerService(ON, 15), lgTimerService(SLEEP, 1)].every((c) => c.domain === 'lg_thinq_timers'), true);

// receipt: write-only, fara countdown inventat
eq('receipt gol cand nu s-a trimis nimic', formatTimerReceipt(null), '');
eq('receipt fara valoare numerica -> gol', formatTimerReceipt({ kind: ON, ts: Date.now() }), '');
eq('receipt schedule arata durata',
   formatTimerReceipt({ kind: OFF, value: 90, ts: new Date('2026-08-26T00:42:00').getTime() }).indexOf('1h 30m') === 0, true);
eq('receipt sleep arata orele',
   formatTimerReceipt({ kind: SLEEP, value: 3, ts: new Date('2026-08-26T00:42:00').getTime() }).indexOf('3h') === 0, true);

// Erori LG propagate onest. Sirurile de mai jos sunt COPIATE din sursa
// bridge-ului (custom_components/lg_thinq_timers/services.py), nu inventate:
// exista doua familii, iar prima versiune a regexului o rata pe a doua.
const ERR_SERVER = {
  '2302': 'Command not supported in the current device state (LG 2302)',
  '2201': 'Feature not provided for this device/timer type (LG 2201)',
  '2304': 'Command not supported while the device is POWER_OFF (LG 2304)'
};
// mesajul REAL primit pe 26.08 la apelul live cu AC-ul oprit
const ERR_LOCAL_2304 = 'set_schedule_off requires the AC to be POWER_ON (LG rejects with 2304 while it is off). Turn the AC on first.';
const ERR_LOCAL_2302 = 'set_schedule_on requires the AC to be POWER_OFF (LG rejects with 2302 while it is running). Turn the AC off first.';
const ERR_LOCAL_2201 = 'sleep timer accepts whole hours only (LG rejects minutes with 2201).';

eq('cod extras din eroarea de server', lgErrorCode(ERR_SERVER['2302']), '2302');
eq('cod extras din pre-validarea locala (formatul real)', lgErrorCode(ERR_LOCAL_2304), '2304');
eq('cod extras din pre-validarea 2302', lgErrorCode(ERR_LOCAL_2302), '2302');
eq('cod extras din pre-validarea 2201', lgErrorCode(ERR_LOCAL_2201), '2201');
eq('mesaj fara cod -> null', lgErrorCode('bridge unavailable'), null);
// device_id-ul contine cifre; nu trebuie confundate cu un cod de eroare
eq('id-ul de device nu produce cod fals',
   lgErrorCode("Unknown LG device_id '" + LG_AC_DEVICE_ID + "'. Available: ..."), null);
eq('2302: explicatia in romana, nu mesajul brut, pe ambele formate',
   [lgTimerErrorMessage(ERR_SERVER['2302']), lgTimerErrorMessage(ERR_LOCAL_2302)]
     .every((t) => /2302/.test(t) && !/^Comanda LG a e/.test(t)), true);
eq('2304: explicatia in romana, nu mesajul brut, pe ambele formate',
   [lgTimerErrorMessage(ERR_SERVER['2304']), lgTimerErrorMessage(ERR_LOCAL_2304)]
     .every((t) => /2304/.test(t) && !/^Comanda LG a e/.test(t)), true);
eq('2201: explicatia in romana, nu mesajul brut, pe ambele formate',
   [lgTimerErrorMessage(ERR_SERVER['2201']), lgTimerErrorMessage(ERR_LOCAL_2201)]
     .every((t) => /2201/.test(t) && !/^Comanda LG a e/.test(t)), true);
eq('metoda lipsa din thinqconnect e semnalata ca bridge indisponibil',
   /[Bb]ridge/.test(lgTimerErrorMessage('thinqconnect version does not provide set_sleep_timer_relative_time_to_stop()')), true);
eq('eroare necunoscuta nu inventeaza cod', lgErrorCode(null), null);

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

// ---- sanatatea dispozitivelor (v1.6.0) --------------------------------------
// Principiul verificat pe instanta reala: varsta starii NU dovedeste tacere.
// `last_reported` nu ajunge prin fluxul live (lib 9.6.0 mapeaza doar lc/lu) si
// oricum era identic cu `last_updated` pe cinci entitati masurate. Deci
// disponibilitatea e semnalul primar, iar varsta se judeca DOAR fata de un
// interval derivat din comportamentul observat.
console.log('sanatate dispozitive:');
const T0 = 1000000000000;
const MIN = 60000;
const ent = (id, state, ageMin) => ({ entity_id: id, state, lastUpdatedMs: T0 - ageMin * MIN });

eq('mediana impara', median([5, 1, 3]), 3);
eq('mediana para', median([1, 3, 5, 7]), 4);
eq('mediana pe lista goala -> null', median([]), null);
eq('mediana ignora valorile nenumerice', median([1, NaN, 3, null]), 2);

eq('intervale din momente', gapsFromStamps([0, 1000, 3000]), [1000, 2000]);
eq('momentele nesortate se ordoneaza', gapsFromStamps([3000, 0, 1000]), [1000, 2000]);
eq('un singur moment nu da niciun interval', gapsFromStamps([500]), []);

eq('sub minimul de esantioane nu se declara interval', expectedInterval([1000, 1000]), null);
eq('trei esantioane sunt de ajuns', expectedInterval([1000, 1000, 1000]), 1000);
// mediana, nu media: o pauza unica (repornire HA) nu trebuie sa ridice pragul
eq('o pauza unica nu ridica intervalul asteptat',
   expectedInterval([300000, 300000, 300000, 9000000]), 300000);
eq('media ar fi fost mult mai mare decat mediana',
   expectedInterval([300000, 300000, 300000, 9000000]) < (300000 * 3 + 9000000) / 4, true);

// --- clasificare -----------------------------------------------------------
// REGULA: verdictele de varsta se dau DOAR cand exista sursa reala de ultima
// comunicare (lastCommMs). Fara ea, freshness = necunoscut si dispozitivul NU
// poate fi STALE/SLOW din varsta starii.
const cls = (ents, opts) => classifyDevice(ents, T0, opts).health;
const REAL = (ageMin) => ({ lastCommMs: T0 - ageMin * MIN, expectedMs: 5 * MIN });

eq('integrare cazuta bate orice altceva',
   cls([ent('sensor.a', '21', 1)], { integrationOk: false, ...REAL(1) }), HEALTH.INTEGRATION_ERROR);
eq('dispozitiv fara entitati -> necunoscut', cls([], {}), HEALTH.UNKNOWN);
eq('toate entitatile indisponibile -> offline',
   cls([ent('a', 'unavailable', 1), ent('b', 'unavailable', 1)], REAL(1)), HEALTH.OFFLINE);
eq('acelasi caz, dar oprirea e asteptata -> offline_expected',
   cls([ent('a', 'unavailable', 1)], { ...REAL(1), offlineExpected: true }), HEALTH.OFFLINE_EXPECTED);
eq('doar o parte indisponibile -> partial, nu offline si nu intarziat',
   cls([ent('a', 'unavailable', 1), ent('b', '21', 1)], REAL(1)), HEALTH.PARTIAL);

// praguri, fata de intervalul real (5 min, cadenta masurata a push-ului Grott)
eq('in ritm normal -> sanatos', cls([ent('a', '21', 1)], REAL(4)), HEALTH.HEALTHY);
eq('peste pragul SLOW -> intarziat', cls([ent('a', '21', 1)], REAL(20)), HEALTH.SLOW);
eq('peste pragul STALE -> invechit', cls([ent('a', '21', 1)], REAL(60)), HEALTH.STALE);
eq('exact pe prag NU declanseaza (strict mai mare)',
   cls([ent('a', '21', 1)], REAL(5 * SLOW_FACTOR)), HEALTH.HEALTHY);

// CAPCANA CENTRALA, in forma ceruta: fara sursa reala nu exista verdict de varsta
const faraSursa = classifyDevice([ent('switch.x', 'on', 1440)], T0, {});
eq('fara sursa reala: freshness necunoscut', faraSursa.freshness, FRESHNESS.UNKNOWN);
eq('fara sursa reala: NU e invechit, desi starea e de o zi', faraSursa.health, HEALTH.HEALTHY);
eq('fara sursa reala: varsta comunicarii e null', faraSursa.ageMs, null);
eq('fara sursa reala: varsta STARII se raporteaza separat, informativ',
   faraSursa.stateAgeMs, 1440 * MIN);
eq('motivul spune explicit ca lipseste sursa',
   /fără sursă/.test(faraSursa.reason), true);
// nici macar cu expectedMs dat nu inventam verdict daca lipseste lastCommMs
eq('expectedMs fara lastCommMs nu produce STALE',
   cls([ent('a', 'on', 5000)], { expectedMs: 5 * MIN }), HEALTH.HEALTHY);

// cu sursa reala dar fara interval cunoscut -> necunoscut, nu invechit
// Fara linie de baza NU coboram verdictul: a avea sursa reala nu trebuie sa
// faca un dispozitiv sa arate mai rau decat unul care nu raporteaza nimic.
const faraBaza = classifyDevice([ent('a', 'on', 1)], T0, { lastCommMs: T0 - 600 * MIN });
eq('sursa reala fara interval -> sanatos, nu necunoscut', faraBaza.health, HEALTH.HEALTHY);
eq('dar motivul spune ca lipseste linia de baza',
   /interval normal/.test(faraBaza.reason), true);
eq('si freshness ramane real', faraBaza.freshness, FRESHNESS.REAL);

// disponibilitatea ramane semnal primar chiar si cu sursa reala proaspata
eq('offline bate freshness-ul bun',
   cls([ent('a', 'unavailable', 1)], REAL(0)), HEALTH.OFFLINE);

const cuSursa = classifyDevice([ent('a', '21', 1)], T0, REAL(2));
eq('cu sursa reala: freshness real', cuSursa.freshness, FRESHNESS.REAL);
eq('cu sursa reala: varsta comunicarii e cea a sursei, nu a starii',
   [cuSursa.ageMs, cuSursa.stateAgeMs], [2 * MIN, 1 * MIN]);

// --- totaluri si prezentare ---
const devs = [
  { name: 'A', health: HEALTH.HEALTHY, ageMs: 1000 },
  { name: 'B', health: HEALTH.OFFLINE, ageMs: null },
  { name: 'C', health: HEALTH.HEALTHY, ageMs: 5000 },
  { name: 'D', health: HEALTH.STALE, ageMs: 90000 }
];
eq('totalurile numara pe clase',
   [healthTotals(devs).total, healthTotals(devs)[HEALTH.HEALTHY], healthTotals(devs)[HEALTH.OFFLINE]], [4, 2, 1]);
eq('sortarea pune problemele primele, apoi cele mai vechi in cadrul clasei',
   sortDevices(devs).map((d) => d.name), ['B', 'D', 'C', 'A']);

eq('varsta in secunde', fmtAge(45000), '45 s');
eq('varsta in minute', fmtAge(20 * MIN), '20 min');
eq('varsta in ore cu virgula', fmtAge(2.5 * 3600000), '2,5 h');
eq('varsta in zile peste 48h', fmtAge(72 * 3600000), '3 zile');
eq('varsta invalida -> liniuta', fmtAge(null), '—');

console.log('lg timer unset:');
eq('UNSET label', UNSET, 'Nesetat');
eq('lg pornire slot', isLgTimerSlot('sensor.lg_pornire_min'), true);
eq('lg pornire unknown -> unset', isLgTimerUnset('sensor.lg_pornire_min', 'unknown', null), true);
eq('lg pornire pending -> not unset', isLgTimerUnset('sensor.lg_pornire_min', 'unknown', 1), false);
eq('lg pornire numeric -> not unset', isLgTimerUnset('sensor.lg_pornire_min', '30', 30), false);
eq('growatt unknown -> not lg unset', isLgTimerUnset('gw.frecv', 'unknown', null), false);

console.log('number bump from unset:');
const lgBounds = { min: 0, max: 100, step: 1 };
eq('+ from null -> 1 (min=0 sentinel, 1 hour)', bumpNumber(null, 1, lgBounds), 1);
eq('- from null -> null', bumpNumber(null, -1, lgBounds), null);
eq('+ from 1 -> 2', bumpNumber(1, 1, lgBounds), 2);
eq('- from 1 -> 0', bumpNumber(1, -1, lgBounds), 0);
eq('first from unset min=5', firstNumberFromUnset({ min: 5, max: 100, step: 1 }), 5);
eq('snap respects max', snapNumber(150, lgBounds), 100);
eq('never NaN', Number.isFinite(bumpNumber(null, 1, lgBounds)), true);

console.log('strat de date dispozitive:');

// Formele sunt copiate din instanta reala (ha_get_integration, 26.08), nu inventate.
const INTR6 = {
  retry: { entry_id: 'e_retry', domain: 'demo_retry', title: 'Integrare cu reincercare', state: 'setup_retry', source: 'user' },
  dlna: { entry_id: 'e_dlna', domain: 'dlna_dmr', title: 'Bedroom TV', state: 'not_loaded', source: 'ignore' },
  mqtt: { entry_id: 'e_mqtt', domain: 'mqtt', title: 'Mosquitto', state: 'loaded', source: 'user' },
  samsung: { entry_id: 'e_sam', domain: 'samsungtv', title: 'Samsung', state: 'loaded', source: 'zeroconf' }
};
eq('setup_retry e defect', intrareOk(INTR6.retry), false);
eq('not_loaded + source ignore NU e defect', intrareOk(INTR6.dlna), true);
eq('intrarea ignorata e recunoscuta ca atare', intrareIgnorata(INTR6.dlna), true);
eq('loaded e ok', intrareOk(INTR6.mqtt), true);
eq('intrare lipsa nu acuza', intrareOk(undefined), true);

const iso = (ms) => new Date(ms).toISOString();
const st6 = (state, ageMin) => ({ state, last_updated: iso(T0 - ageMin * MIN), attributes: {} });
const TS = { device_class: 'timestamp' };
const tsEnt = (ageMin) => ({ state: iso(T0 - ageMin * MIN), last_updated: iso(T0 - ageMin * MIN), attributes: TS });

const states6 = {
  'sensor.knn2e3s00w_grott_last_data_push': tsEnt(2),
  'sensor.knn2e3s00w_putere': st6('12748.6', 2),
  'sensor.demo_retry': st6('unavailable', 300),
  'media_player.tv_dormitor': st6('unavailable', 120),
  'switch.priza_birou': st6('on', 1440),
  'sensor.demo_last_reboot': tsEnt(900)
};

// sursa de comunicare: doar tiparul real, si doar cu device_class timestamp
eq('push-ul Grott e sursa reala',
   sursaComunicare(['sensor.knn2e3s00w_putere', 'sensor.knn2e3s00w_grott_last_data_push'], states6).entity_id,
   'sensor.knn2e3s00w_grott_last_data_push');
eq('last_reboot NU e sursa de comunicare',
   sursaComunicare(['sensor.demo_last_reboot'], states6), null);
eq('un senzor obisnuit nu devine sursa',
   sursaComunicare(['sensor.knn2e3s00w_putere'], states6), null);
eq('televizorul are voie sa fie oprit', oprireAsteptata(['media_player.tv_dormitor']), true);
eq('priza nu are voie sa fie oprita', oprireAsteptata(['switch.priza_birou']), false);

const reg6 = {
  areas: [{ area_id: 'a1', name: 'Birou' }],
  devices: [
    { id: 'd_grott', name: 'Invertor Growatt', area_id: 'a1', config_entries: ['e_mqtt'], manufacturer: 'Growatt' },
    { id: 'd_retry', name: 'Integrare cu reincercare', area_id: null, config_entries: ['e_retry'] },
    { id: 'd_tv', name: 'TV Dormitor', area_id: null, config_entries: ['e_sam'] },
    { id: 'd_priza', name: 'Priza Birou', area_id: 'a1', config_entries: ['e_mqtt'] },
    { id: 'd_fantoma', name: 'Bedroom TV (dlna)', area_id: null, config_entries: ['e_dlna'] }
  ],
  entities: [
    { entity_id: 'sensor.knn2e3s00w_grott_last_data_push', device_id: 'd_grott' },
    { entity_id: 'sensor.knn2e3s00w_putere', device_id: 'd_grott' },
    { entity_id: 'sensor.demo_retry', device_id: 'd_retry' },
    { entity_id: 'media_player.tv_dormitor', device_id: 'd_tv' },
    { entity_id: 'switch.priza_birou', device_id: 'd_priza' }
  ]
};
const entriesById = { e_retry: INTR6.retry, e_dlna: INTR6.dlna, e_mqtt: INTR6.mqtt, e_sam: INTR6.samsung };
// istoric de pachete la 5 minute — cadenta masurata a Grott
const istoric6 = { d_grott: [5, 4, 3, 2, 1, 0].map((i) => T0 - 5 * MIN * i - 2 * MIN) };
const dev6 = buildDevices(reg6, states6, entriesById, T0, istoric6);
const byId6 = {};
for (const d of dev6) byId6[d.id] = d;

eq('dispozitivul ramas de la o descoperire ignorata nu apare', !!byId6.d_fantoma, false);
eq('restul apar', dev6.length, 4);
eq('dispozitiv cu integrarea in setup_retry -> integrare cazuta', byId6.d_retry.health, HEALTH.INTEGRATION_ERROR);
eq('televizorul stins -> oprit asteptat, nu offline', byId6.d_tv.health, HEALTH.OFFLINE_EXPECTED);
eq('priza neatinsa de o zi ramane sanatoasa', byId6.d_priza.health, HEALTH.HEALTHY);
eq('priza: freshness necunoscut', byId6.d_priza.freshness, FRESHNESS.UNKNOWN);
eq('Grott: freshness real', byId6.d_grott.freshness, FRESHNESS.REAL);
eq('Grott: sursa e numita explicit', byId6.d_grott.sursaFreshness, 'sensor.knn2e3s00w_grott_last_data_push');
eq('Grott: varsta = 2 min, din pachet', byId6.d_grott.ageMs, 2 * MIN);
eq('Grott la 2 min pe cadenta de 5 min -> sanatos', byId6.d_grott.health, HEALTH.HEALTHY);
eq('zona vine din registru', byId6.d_grott.zona, 'Birou');
eq('integrarea e numita', byId6.d_priza.integrare, 'mqtt');

// acelasi Grott, dar tacut de o ora peste cadenta de 5 min
const statesTacut = Object.assign({}, states6, { 'sensor.knn2e3s00w_grott_last_data_push': tsEnt(60) });
eq('Grott tacut 60 min pe cadenta de 5 min -> invechit',
   buildDevices(reg6, statesTacut, entriesById, T0, istoric6).find((d) => d.id === 'd_grott').health, HEALTH.STALE);
eq('sursa reala fara istoric -> sanatos, si sigur nu invechit',
   buildDevices(reg6, statesTacut, entriesById, T0, {}).find((d) => d.id === 'd_grott').health, HEALTH.HEALTHY);

console.log('observabilitate stocare:');

eq('marimi zecimale', parseSize('28.0 GB'), 28e9);
eq('marimi binare (MiB != MB)', parseSize('59.17 MiB'), 59.17 * 1024 * 1024);
eq('virgula zecimala acceptata', parseSize('1,5 GB'), 1.5e9);
eq('text neinterpretabil -> null', parseSize('necunoscut'), null);
eq('non-string -> null', parseSize(null), null);
eq('format octeti', fmtBytes(7.4e9), '7,4 GB');
eq('format sub prag', fmtBytes(512), '512 B');
eq('format invalid', fmtBytes(NaN), '—');

// crestere: fereastra reala de pe instanta (18.08 -> 26.08, 59,17 MiB)
const ZI = 86400000;
const cr = dbGrowth(62046699, T0 - 8 * ZI, T0);
eq('fereastra in zile', cr.zile, 8);
eq('ritmul e marimea impartita la fereastra', Math.round(cr.perZi), Math.round(62046699 / 8));
eq('fereastra prea scurta -> fara ritm', dbGrowth(1e6, T0 - 3600000, T0), null);
eq('fara marime -> fara ritm', dbGrowth(null, T0 - 8 * ZI, T0), null);

// payload copiat din raspunsul real system_health/info (trunchiat)
const payload = {
  hassio: { info: { host_os: 'Home Assistant OS 18.2', supervisor_version: 'supervisor-2026.07.5',
    disk_total: '28.0 GB', disk_used: '7.4 GB', disk_life_time: '0 %', healthy: true, supported: true,
    installed_addons: 'Mosquitto broker (7.1.0), Home Dashboard (1.6.0)' } },
  homeassistant: { info: { version: 'core-2026.8.3' } },
  recorder: { info: { estimated_db_size: '59.17 MiB', database_engine: 'sqlite',
    oldest_recorder_run: { value: new Date(T0 - 8 * ZI).toISOString(), type: 'date' } } }
};
const sh = citesteSystemHealth(payload, T0);
eq('versiunea core', sh.versiuneCore, 'core-2026.8.3');
eq('disc total', sh.discTotal, 28e9);
eq('disc liber = total - folosit', sh.discLiber, 28e9 - 7.4e9);
eq('procent disc', Math.round(sh.discPct), 26);
eq('sistem sanatos', sh.sanatos, true);
eq('add-on-urile se despart in lista', sh.addonuri.length, 2);
eq('cresterea se calculeaza si aici', sh.crestere.zile, 8);
// campurile absente NU devin zero — un camp lipsa e necunoscut, nu gol
eq('payload gol nu inventeaza cifre',
   [citesteSystemHealth({}, T0).discTotal, citesteSystemHealth({}, T0).sanatos], [null, null]);

console.log('formulari dispozitive:');
eq('cu sursa reala scrie ultima comunicare',
   textFreshness({ freshness: 'real', ageMs: 120000 }), 'ultima comunicare acum 2 min');
eq('fara sursa reala spune explicit ca lipseste',
   textFreshness({ freshness: 'unknown', ageMs: null }), 'fără sursă de ultimă comunicare');
eq('vechimea starii e etichetata ca stare, nu ca comunicare',
   textStare({ stateAgeMs: 3600000 }), 'ultima schimbare de stare acum 1 h');
eq('clasele goale nu apar ca filtru',
   claseleePrezente([{ health: 'healthy' }, { health: 'offline' }, { health: 'healthy' }]),
   [{ cheie: 'offline', n: 1 }, { cheie: 'healthy', n: 2 }]);

console.log('seed din istoric:');

// Raspunsul de istoric are forma { entity_id: [{ s, lu }] }; pentru un senzor
// timestamp, `s` E chiar momentul pachetului, deci intervalele dintre valori
// distincte sunt intervale reale de comunicare.
const istRaw = [
  { s: '2026-08-26T17:00:53+00:00', lu: 1 },
  { s: '2026-08-26T17:00:53+00:00', lu: 2 },
  { s: '2026-08-26T17:05:53+00:00', lu: 3 },
  { s: '2026-08-26T17:10:52+00:00', lu: 4 },
  { s: 'unknown', lu: 5 },
  { s: '2026-08-26T17:15:52+00:00', lu: 6 }
];
const stamps = stampsDinIstoric(istRaw);
eq('valorile repetate nu produc intervale false', stamps.length, 4);
eq('valorile necitibile sunt sarite',
   stamps.map((t) => new Date(t).toISOString().slice(11, 19)),
   ['17:00:53', '17:05:53', '17:10:52', '17:15:52']);
eq('intervalele rezultate sunt cele reale de 5 minute',
   gapsFromStamps(stamps).map((g) => Math.round(g / 1000)), [300, 299, 300]);
eq('mediana lor da cadenta masurata pe instanta',
   Math.round(expectedInterval(gapsFromStamps(stamps)) / 1000), 300);
eq('sir gol -> fara momente', stampsDinIstoric([]), []);
eq('sir lipsa -> fara momente', stampsDinIstoric(null), []);
eq('inelul ramane marginit',
   stampsDinIstoric(Array.from({ length: 100 }, (_, i) => ({ s: new Date(T0 + i * 300000).toISOString() }))).length,
   ISTORIC_MAX);

console.log('INVARIANT semantic (fara sursa reala):');

// Test de PROPRIETATE, nu de exemple: se plimba prin toate combinatiile de
// integrare x numar de entitati x cate sunt indisponibile x oprire asteptata x
// vechime a starii, cu lastCommMs ABSENT, si verifica invariantul pe fiecare.
// Exemplele alese de mine ar fi confirmat exact ce ma asteptam sa vad.
{
  const stari = ['on', 'off', 'unavailable', 'unknown', '21.5'];
  let cazuri = 0;
  let rupte = [];
  for (const integrationOk of [true, false, undefined]) {
    for (const offlineExpected of [true, false]) {
      for (const n of [0, 1, 2, 3]) {
        for (let nUnav = 0; nUnav <= n; nUnav++) {
          for (const varstaMin of [0, 1, 60, 1440, 100000]) {
            for (const expectedMs of [undefined, 5 * MIN]) {
              const ents = [];
              for (let i = 0; i < n; i++) {
                ents.push(ent('x.e' + i, i < nUnav ? 'unavailable' : stari[i % stari.length], varstaMin));
              }
              // lastCommMs LIPSESTE deliberat -- asta e ipoteza testului
              const r = classifyDevice(ents, T0, { integrationOk, offlineExpected, expectedMs });
              cazuri++;
              const acuz = (cond, ce) => { if (cond) rupte.push(ce + ' @ ' + JSON.stringify({ integrationOk, offlineExpected, n, nUnav, varstaMin, expectedMs, got: r.health })); };
              acuz(r.freshness !== FRESHNESS.UNKNOWN, 'freshness nu e UNKNOWN');
              acuz(r.ageMs !== null, 'ageMs nu e null');
              acuz(r.health === HEALTH.STALE, 'STALE accesibil fara sursa reala');
              acuz(r.health === HEALTH.SLOW, 'SLOW accesibil fara sursa reala');
              // HEALTHY inseamna STRICT integrare incarcata + toate entitatile disponibile
              if (r.health === HEALTH.HEALTHY) {
                acuz(integrationOk === false, 'HEALTHY cu integrarea cazuta');
                acuz(n === 0, 'HEALTHY fara entitati');
                acuz(nUnav > 0, 'HEALTHY cu entitati indisponibile');
                acuz(/acum|comunicat|ritm/.test(r.reason), 'motivul sugereaza comunicare recenta');
              }
            }
          }
        }
      }
    }
  }
  eq('combinatii verificate', cazuri, 3 * 2 * 10 * 5 * 2);
  eq('invariantul tine pe toate', rupte.slice(0, 3), []);
}

// Contra-proba: cu sursa reala, SLOW si STALE redevin accesibile.
eq('cu sursa reala STALE e accesibil',
   classifyDevice([ent('a', 'on', 1)], T0, { lastCommMs: T0 - 60 * MIN, expectedMs: 5 * MIN }).health,
   HEALTH.STALE);
eq('cu sursa reala SLOW e accesibil',
   classifyDevice([ent('a', 'on', 1)], T0, { lastCommMs: T0 - 20 * MIN, expectedMs: 5 * MIN }).health,
   HEALTH.SLOW);

// Indisponibilitatea partiala NU mai imprumuta eticheta de comunicare.
{
  const partial = classifyDevice([ent('a', 'unavailable', 1), ent('b', 'on', 1)], T0, {});
  eq('partial indisponibil are clasa proprie', partial.health, HEALTH.PARTIAL);
  eq('eticheta lui nu vorbeste despre intarziere',
     HEALTH_LABEL[partial.health], 'Parţial indisponibil');
  eq('si ramane fara freshness', partial.freshness, FRESHNESS.UNKNOWN);
}
eq('textul de sub nume spune explicit ca lipseste sursa',
   textFreshness(classifyDevice([ent('a', 'on', 1)], T0, {})),
   'fără sursă de ultimă comunicare');

console.log('programare AC la ora exacta:');

eq('ora se scurteaza', oraScurta('22:48:00'), '22:48');
eq('ora cu o cifra se completeaza', oraScurta('7:05:00'), '07:05');
eq('ora necitibila -> null', oraScurta('unknown'), null);
eq('non-string -> null', oraScurta(null), null);

const zileGoale = { lu: false, ma: false, mi: false, jo: false, vi: false, sa: false, du: false };
const cuZile = (...k) => Object.assign({}, zileGoale, ...k.map((x) => ({ [x]: true })));

eq('L-V se compacteaza', textZile(cuZile('lu', 'ma', 'mi', 'jo', 'vi')), 'L–V');
eq('weekend se compacteaza', textZile(cuZile('sa', 'du')), 'S–D');
eq('toate sapte', textZile(cuZile('lu', 'ma', 'mi', 'jo', 'vi', 'sa', 'du')), 'în fiecare zi');
eq('nicio zi e spus explicit', textZile(zileGoale), 'nicio zi');
// zilele neadiacente NU se prezinta ca interval — nu inventam un „L–V" fals
eq('zile razlete se enumera', textZile(cuZile('lu', 'mi', 'vi')), 'L Mi V');

eq('repetarea zilnica', textRepetare({ repeta: 'Zilnic' }), 'Zilnic');
eq('repetarea o data are diacritice in UI', textRepetare({ repeta: 'O singura data' }), 'O singură dată');
eq('la zile alese se arata zilele',
   textRepetare({ repeta: 'Zile alese', zile: cuZile('lu', 'ma', 'mi', 'jo', 'vi') }), 'L–V');

// setarile optionale: ce nu e ales NU apare
eq('toate trei setarile',
   textSetari({ tempActiv: true, temp: 20, mod: 'Racire', ventilator: 'Auto' }), '20°C · Răcire · Auto');
eq('doar modul', textSetari({ tempActiv: false, mod: 'Incalzire', ventilator: 'Nu schimba' }), 'Încălzire');
eq('temperatura cu virgula zecimala',
   textSetari({ tempActiv: true, temp: 20.5, mod: 'Nu schimba', ventilator: 'Nu schimba' }), '20,5°C');
eq('nimic ales se spune explicit, nu se lasa gol',
   textSetari({ tempActiv: false, mod: 'Nu schimba', ventilator: 'Nu schimba' }), 'fără modificări de setări');
eq('temperatura activa dar fara valoare nu produce "NaN°C"',
   textSetari({ tempActiv: true, temp: null, mod: 'Nu schimba', ventilator: 'Nu schimba' }),
   'fără modificări de setări');

// urmatoarea executie: formatam un instant decis de HA, nu il calculam
const T = Date.parse('2026-08-26T22:00:00+03:00');
eq('azi', textUrmatoarea('2026-08-26T23:30:00+03:00', T), 'azi, 23:30');
eq('maine', textUrmatoarea('2026-08-27T07:15:00+03:00', T), 'mâine, 07:15');
eq('mai departe -> ziua saptamanii', textUrmatoarea('2026-08-28T22:30:00+03:00', T), 'vineri, 22:30');
eq('lipsa -> null', textUrmatoarea(null, T), null);
eq('unknown -> null', textUrmatoarea('unknown', T), null);

// ultima executie: miezul noptii = marcaj nescris, NU o executie reala
eq('marcaj scris', textUltima('2026-08-26 22:48:03'), '26.08, 22:48');
eq('miezul noptii = inca nimic', textUltima('2026-08-26 00:00:00'), null);
eq('unknown -> null', textUltima('unknown'), null);

// starea afisata
eq('dezactivata', stareProgram({ activ: false }).text, 'Dezactivată');
eq('activa simpla', stareProgram({ activ: true, repeta: 'Zilnic' }).text, 'Activ');
// activa pe „zile alese" fara nicio zi nu s-ar declansa niciodata -- o spunem
const faraZi = stareProgram({ activ: true, repeta: 'Zile alese', zile: zileGoale });
eq('zile alese fara nicio zi e semnalat', faraZi.text, 'Nicio zi aleasă');
eq('si e marcat ca avertisment', faraZi.avertisment, true);
eq('cu o zi bifata e activ',
   stareProgram({ activ: true, repeta: 'Zile alese', zile: cuZile('jo') }).text, 'Activ');

// cheile de slot corespund helperelor create in HA
eq('cheie slot pornire', slotProg('pornire', 'ora'), 'prog.pornire_ora');
eq('cheie slot zi', slotProg('oprire', 'zi_vi'), 'prog.oprire_zi_vi');
eq('cele 28 de sloturi de programare exista in catalog',
   SLOTS.filter((x) => x.key.indexOf('prog.') === 0).length, 28);
eq('toate au mapare implicita',
   SLOTS.filter((x) => x.key.indexOf('prog.') === 0).every((x) => !!SUGGESTED_MAP[x.key]), true);

console.log('ciclul de viata al comenzii:');

const STC = (state, lu) => ({ state, last_updated: lu });
const nouC = (ent, tinta, lu, acum) => creeaza({ entityId: ent, actiune: 'power', tinta, lastUpdated: lu, acum: acum || 0 });

// 1. OFF -> click ON -> in zbor -> confirmare ON
{
  let c = nouC('switch.x', 'on', 'A');
  eq('1. porneste in TRIMIS', c.status, CMD.TRIMIS);
  c = marcheazaAcceptat(c);
  eq('1. dupa acceptare -> ASTEPT', c.status, CMD.ASTEPT);
  eq('1. inca in zbor', eInZbor(c), true);
  c = evalueaza(c, STC('on', 'B'), 100);
  eq('1. publicare noua cu tinta -> CONFIRMAT', c.status, CMD.CONFIRMAT);
  eq('1. si e terminala', eTerminala(c.status), true);
}

// 2. ON -> click OFF -> confirmare OFF
{
  let c = marcheazaAcceptat(nouC('media_player.tv', 'off', 'A'));
  eq('2. inca asteapta pe stare veche', evalueaza(c, STC('on', 'A'), 100).status, CMD.ASTEPT);
  eq('2. confirma pe off publicat nou', evalueaza(c, STC('off', 'B'), 100).status, CMD.CONFIRMAT);
  eq('2. textul afisat', textAsteptare(c), 'Oprire…');
}

// 3. esec de serviciu -> terminal IMEDIAT, fara sa astepte fereastra
{
  const c = marcheazaEsec(nouC('switch.x', 'on', 'A'), 'Command not supported in POWER OFF');
  eq('3. esecul e terminal', eTerminala(c.status), true);
  eq('3. nu mai e in zbor', eInZbor(c), false);
  eq('3. pastreaza mesajul real', c.eroare, 'Command not supported in POWER OFF');
}

// 4. expirare -> terminal, cu mesajul cerut
{
  const c = marcheazaAcceptat(nouC('media_player.tv', 'on', 'A', 0));
  const dupa = evalueaza(c, STC('off', 'A'), c.fereastra + 1);
  eq('4. dupa fereastra -> EXPIRAT', dupa.status, CMD.EXPIRAT);
  eq('4. mesajul de neconfirmare', textExpirat(dupa), 'Pornirea nu a fost confirmată');
  eq('4. varianta de oprire', textExpirat(nouC('media_player.tv', 'off', 'A')), 'Oprirea nu a fost confirmată');
}

// 5. dublu clic cat timp e in zbor -> nicio comanda noua
//    (regula de registru: o comanda in zbor per entitate+actiune)
{
  const c = marcheazaAcceptat(nouC('switch.x', 'on', 'A'));
  eq('5. cheia e stabila', cheieComanda('switch.x', 'power'), 'switch.x|power');
  eq('5. cat timp e in zbor, a doua apasare trebuie respinsa', eInZbor(c), true);
}

// 6. actualizare fara legatura -> NU confirma
{
  const c = marcheazaAcceptat(nouC('switch.x', 'on', 'A'));
  eq('6. alta stare publicata nou, dar nu tinta', evalueaza(c, STC('off', 'B'), 50).status, CMD.ASTEPT);
  eq('6. atribut schimbat, stare tot veche', evalueaza(c, STC('off', 'C'), 50).status, CMD.ASTEPT);
}

// 7. stare INVECHITA care se intampla sa fie deja tinta -> NU confirma
{
  const c = marcheazaAcceptat(nouC('switch.x', 'on', 'A'));
  eq('7. aceeasi publicare ca la trimitere nu confirma',
     evalueaza(c, STC('on', 'A'), 50).status, CMD.ASTEPT);
  eq('7. dar o publicare NOUA cu aceeasi valoare confirma',
     evalueaza(c, STC('on', 'B'), 50).status, CMD.CONFIRMAT);
}

// 8. televizor lent, 10-30 s: ramane corect in zbor tot timpul
{
  const c = marcheazaAcceptat(nouC('media_player.tv', 'on', 'A', 0));
  eq('8. fereastra pentru pornire TV', c.fereastra, 45000);
  for (const t of [1000, 6000, 11000, 20000, 33000, 44000]) {
    eq('8. la ' + t + ' ms inca asteapta', evalueaza(c, STC('off', 'A'), t).status, CMD.ASTEPT);
  }
  eq('8. confirma cand apare, la 33 s', evalueaza(c, STC('on', 'B'), 33000).status, CMD.CONFIRMAT);
}

// 9. dispozitiv rapid: confirma la prima publicare, nu asteapta fereastra
{
  const c = marcheazaAcceptat(nouC('switch.local', 'on', 'A', 0));
  eq('9. fereastra implicita', c.fereastra, 15000);
  eq('9. confirmat la 20 ms', evalueaza(c, STC('on', 'B'), 20).status, CMD.CONFIRMAT);
}

// 10. stare tranzitorie on/off: confirmam la prima potrivire (decizie
//     documentata), iar un `off` ulterior NU reia comanda
{
  let c = marcheazaAcceptat(nouC('media_player.tv', 'on', 'A', 0));
  c = evalueaza(c, STC('on', 'B'), 2000);
  eq('10. tranzitoriul confirma', c.status, CMD.CONFIRMAT);
  eq('10. revenirea la off nu redeschide comanda', evalueaza(c, STC('off', 'C'), 5000).status, CMD.CONFIRMAT);
  eq('10. iar interfata nu mai are ce afisa', textAsteptare(c), null);
}

// ferestrele, derivate din auditul 33 — nu praguri universale
eq('fereastra TV pornire', fereastra('media_player.tv', 'on'), 45000);
eq('fereastra TV oprire', fereastra('media_player.tv', 'off'), 40000);
eq('fereastra climate', fereastra('climate.x', 'cool'), 15000);
eq('fereastra switch', fereastra('switch.x', 'on'), 15000);
eq('climate: tinta poate fi un mod, nu doar on',
   evalueaza(marcheazaAcceptat(nouC('climate.lg', 'cool', 'A')), STC('cool', 'B'), 50).status, CMD.CONFIRMAT);

// accesibilitate: textul exista pentru ambele directii
eq('text accesibil pornire', textAccesibil(marcheazaAcceptat(nouC('switch.x', 'on', 'A'))), 'Pornire în curs');
eq('text accesibil oprire', textAccesibil(marcheazaAcceptat(nouC('switch.x', 'off', 'A'))), 'Oprire în curs');
eq('fara comanda, fara text', textAccesibil(null), null);

console.log('alegerea caii catre HA:');

eq('normalizare: taie slash-ul final', normalizeaza('http://192.168.0.100/'), 'http://192.168.0.100');
eq('normalizare: taie spatiile', normalizeaza('  http://a.b  '), 'http://a.b');
eq('normalizare: non-string -> gol', normalizeaza(null), '');
eq('ws din http', wsUrl('http://192.168.0.100'), 'ws://192.168.0.100/api/websocket');
eq('wss din https', wsUrl('https://x.ui.nabu.casa'), 'wss://x.ui.nabu.casa/api/websocket');
eq('ws dintr-un url gol', wsUrl(''), '');

eq('config fara token e invalida', configValida({ urlLocal: 'http://a' }), false);
eq('config fara nicio adresa e invalida', configValida({ token: 't' }), false);
eq('doar local e valida', configValida({ urlLocal: 'http://a', token: 't' }), true);
eq('doar remote e valida', configValida({ urlRemote: 'https://b', token: 't' }), true);

const CFG = { urlLocal: 'http://192.168.0.100', urlRemote: 'https://x.nabu.casa', token: 'tok' };
// sonda injectata: raspunde dupa o lista de adrese acceptate, cu durate simulate
const sonda = (accepta, durate) => {
  const d = durate || {};
  let ceas = 0;
  const fn = async (url) => { ceas += d[url] || 1; return accepta.indexOf(url) >= 0; };
  fn.ceas = () => ceas;
  return fn;
};

// 1. acasa: local raspunde -> se alege local, remote NU se mai incearca
{
  const p = sonda([CFG.urlLocal]);
  const r = await alege(CFG, p, { acum: p.ceas });
  eq('1. acasa -> local', r.ales, 'local');
  eq('1. url-ul ales', r.url, CFG.urlLocal);
  eq('1. tunelul nici nu e incercat', r.incercari.length, 1);
}

// 2. plecat: local nu raspunde -> fallback la remote
{
  const p = sonda([CFG.urlRemote]);
  const r = await alege(CFG, p, { acum: p.ceas });
  eq('2. plecat -> remote', r.ales, 'remote');
  eq('2. s-a incercat intai local', r.incercari[0].tip, 'local');
  eq('2. si local a esuat', r.incercari[0].ok, false);
  eq('2. doua incercari in total', r.incercari.length, 2);
}

// 3. niciuna nu raspunde -> nicio cale, NU inventam una
{
  const p = sonda([]);
  const r = await alege(CFG, p, { acum: p.ceas });
  eq('3. nicio cale', r.ales, null);
  eq('3. si niciun url', r.url, null);
  eq('3. ambele au fost incercate', r.incercari.map((x) => x.tip), ['local', 'remote']);
}

// 4. duratele se masoara per cale
{
  const p = sonda([CFG.urlRemote], { [CFG.urlLocal]: 1200, [CFG.urlRemote]: 380 });
  const r = await alege(CFG, p, { acum: p.ceas });
  eq('4. durata caii locale (esuata)', r.incercari[0].ms, 1200);
  eq('4. durata tunelului', r.incercari[1].ms, 380);
}

// 5. configuratie doar cu remote: nu incercam o adresa locala inexistenta
{
  const p = sonda(['https://x.nabu.casa']);
  const r = await alege({ urlRemote: 'https://x.nabu.casa', token: 't' }, p, { acum: p.ceas });
  eq('5. doar remote configurat', r.incercari.map((x) => x.tip), ['remote']);
  eq('5. si se alege', r.ales, 'remote');
}

// 6. `doar` restrange politica (folosit la revenirea in LAN)
{
  const p = sonda([CFG.urlLocal]);
  const r = await alege(CFG, p, { acum: p.ceas, doar: 'local' });
  eq('6. verificare doar pe local', r.incercari.map((x) => x.tip), ['local']);
}

// 7. config invalida -> nicio incercare, fara exceptii
{
  const p = sonda([]);
  const r = await alege({ token: 't' }, p, { acum: p.ceas });
  eq('7. config invalida nu sondeaza nimic', r.incercari.length, 0);
  eq('7. si nu alege nimic', r.ales, null);
}

// 8. revenirea in LAN: doar de pe tunel SI doar cu dovada
eq('8. de pe tunel, cu local confirmat -> revenim', meritaRevenire('remote', true), true);
eq('8. de pe tunel, fara dovada -> NU', meritaRevenire('remote', false), false);
eq('8. deja local -> nimic de facut', meritaRevenire('local', true), false);
eq('8. fara cale activa -> NU', meritaRevenire(null, true), false);
// `undefined` inseamna „inca nu stim", nu „da"
eq('8. rezultat necunoscut nu declanseaza comutare', meritaRevenire('remote', undefined), false);

// 9. etichetele din diagnostic
eq('9. eticheta local', textConexiune('local'), 'LOCAL');
eq('9. eticheta remote', textConexiune('remote'), 'NABU CASA');
eq('9. fara cale -> null', textConexiune(null), null);

// 10. ferestrele: locala mult mai scurta decat cea de tunel
eq('10. LAN-ul primeste rabdare scurta', TIMEOUT_LOCAL <= 1500, true);
eq('10. tunelul primeste mai mult', TIMEOUT_REMOTE > TIMEOUT_LOCAL, true);
eq('10. cautarea LAN-ului e RARA', INTERVAL_REVENIRE >= 60000, true);


console.log('poarta — comanda de tip impuls:');

const RELEU = 'switch.curte_fata_poarta_intrare';

// 1. fereastra: impulsul isi are propria valoare, indiferent de domeniu
eq('1. impulsul are fereastra lui', fereastra(RELEU, 'on', 'impuls'), 8000);
eq('1. mult mai scurta decat pornirea unui televizor', fereastra(RELEU, 'on', 'impuls') < fereastra('media_player.x', 'on'), true);
eq('1. fara actiune, switch-ul ramane pe implicit', fereastra(RELEU, 'on'), 15000);

// 2. intrarea de registru primeste fereastra de impuls
{
  const c = creeaza({ entityId: RELEU, actiune: 'impuls', tinta: 'on', lastUpdated: 'T0', acum: 0 });
  eq('2. fereastra preluata din actiune', c.fereastra, 8000);
  eq('2. textul nu vorbeste despre pornire', textAsteptare(c), 'Se trimite…');
  eq('2. eticheta accesibila', textAccesibil(c), 'Comandă în curs de trimitere');
  eq('2. textul de neconfirmare', textExpirat(c), 'Comanda nu a fost confirmată');
}

// 3. confirmarea vine din releu, nu dintr-o presupunere despre poarta
{
  let c = creeaza({ entityId: RELEU, actiune: 'impuls', tinta: 'on', lastUpdated: 'T0', acum: 0 });
  c = marcheazaAcceptat(c);
  // releul inca pe off: nimic confirmat
  c = evalueaza(c, { state: 'off', last_updated: 'T1' }, 100);
  eq('3. releu pe off -> inca asteptam', c.status, CMD.ASTEPT);
  // releul a publicat NOU si e pe on -> impuls confirmat
  c = evalueaza(c, { state: 'on', last_updated: 'T2' }, 200);
  eq('3. releu pe on, publicare noua -> confirmat', c.status, CMD.CONFIRMAT);
}

// 4. un `on` VECHI nu confirma nimic — releul putea fi deja pornit
{
  let c = creeaza({ entityId: RELEU, actiune: 'impuls', tinta: 'on', lastUpdated: 'T9', acum: 0 });
  c = evalueaza(c, { state: 'on', last_updated: 'T9' }, 50);
  eq('4. aceeasi publicare nu confirma', c.status, CMD.TRIMIS);
}

// 5. dupa fereastra, expira — interfata nu ramane agatata
{
  let c = creeaza({ entityId: RELEU, actiune: 'impuls', tinta: 'on', lastUpdated: 'T0', acum: 0 });
  c = evalueaza(c, { state: 'off', last_updated: 'T1' }, 8001);
  eq('5. expira dupa 8 s', c.status, CMD.EXPIRAT);
}

// 6. impulsul si pornirea sunt comenzi DIFERITE pe aceeasi entitate
eq('6. chei separate', cheieComanda(RELEU, 'impuls') !== cheieComanda(RELEU, 'power'), true);

// 7. niciun text al portii nu pretinde o pozitie
{
  const c = creeaza({ entityId: RELEU, actiune: 'impuls', tinta: 'on', lastUpdated: null, acum: 0 });
  const toate = [textAsteptare(c), textAccesibil(c), textExpirat(c)].join(' ').toLowerCase();
  eq('7. fara „deschis"', toate.indexOf('deschis') < 0, true);
  eq('7. fara „inchis"', toate.indexOf('închis') < 0 && toate.indexOf('inchis') < 0, true);
}


console.log('\n' + pass + ' trecute, ' + fail + ' picate');
process.exit(fail ? 1 : 0);
