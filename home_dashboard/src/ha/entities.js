// Stratul care traduce între sloturile designului și entităţile reale din HA.
import { useMemo } from 'react';
import { useHa } from './context.js';
import { fmtUnitAuto, dec } from '../design/format.js';
import { UNSET, isLgTimerUnset, isLgTimerSlot } from './unset.js';
import {
  normalizeTimerValue,
  lgTimerService,
  lgTimerErrorMessage
} from './lgTimers.js';

export const VERIFY = 'VERIFY';
export const NA = '—';
export { UNSET };

const ON_STATES = ['on', 'open', 'home', 'playing', 'heat', 'cool', 'auto', 'dry', 'fan_only', 'heat_cool', 'active', 'true', 'connected'];
const UNAVAILABLE = ['unavailable', 'unknown', 'none', null, undefined, ''];

export const HVAC_LABEL = {
  off: 'Oprit',
  cool: 'Mod răcire',
  heat: 'Mod încălzire',
  auto: 'Mod auto',
  heat_cool: 'Mod auto',
  dry: 'Dezumidificare',
  fan_only: 'Ventilare'
};

export const HVAC_SHORT = {
  off: 'Oprit',
  cool: 'Răcire',
  heat: 'Încălzire',
  auto: 'Auto',
  heat_cool: 'Auto',
  dry: 'Dezumidificare',
  fan_only: 'Ventilare'
};

function isUnavailable(st) {
  return !st || UNAVAILABLE.indexOf(st.state) >= 0;
}

function roundTo(v, decimals) {
  const f = Math.pow(10, decimals || 0);
  return Math.round(v * f) / f;
}

/**
 * Găseşte o opţiune dintr-o listă (fan_modes, swing_modes, source_list) după
 * cuvinte-cheie. Întoarce null dacă nu se potriveşte nimic — caz în care
 * butonul rămâne dezactivat şi marcat VERIFY, ca să nu trimitem comenzi greşite.
 */
export function matchOption(list, keywords) {
  if (!Array.isArray(list) || !list.length) return null;
  const lower = list.map((x) => String(x).toLowerCase());
  for (const kw of keywords) {
    const k = String(kw).toLowerCase();
    const exact = lower.indexOf(k);
    if (exact >= 0) return list[exact];
  }
  for (const kw of keywords) {
    const k = String(kw).toLowerCase();
    const partial = lower.findIndex((x) => x.indexOf(k) >= 0);
    if (partial >= 0) return list[partial];
  }
  return null;
}

/**
 * Sloturi care pot fi acoperite de altă entitate deja mapată, dacă nu au una
 * proprie. Gol din v1.0.6 — fostul unic caz (sensor.temp_exterior →
 * weather.main.temperature) a dispărut odată cu slotul: afişajele "Exterior"
 * citesc acum weather.main direct, cu opts.attr='temperature'.
 */
const FALLBACK = {};

export function useEntities() {
  const ha = useHa();
  const {
    states, entityMap, callService, callServiceWithResponse, markPending, pending,
    lastTargets, lastSentTimers, rememberSentTimer, setLastCallError
  } = ha;

  return useMemo(() => {
    /** entity_id-ul mapat direct pentru un slot (fără fallback). */
    function idOf(slotKey) {
      return (entityMap && entityMap[slotKey]) || null;
    }

    /** Rezolvă slotul, aplicând fallback-ul dacă nu are entitate proprie. */
    function resolve(slotKey) {
      const direct = idOf(slotKey);
      if (direct) return { id: direct, attr: null };
      const fb = FALLBACK[slotKey];
      if (fb) {
        const fbId = idOf(fb.from);
        if (fbId) return { id: fbId, attr: fb.attr };
      }
      return { id: null, attr: null };
    }

    /** obiectul de stare HA pentru un slot (sau null). */
    function ent(slotKey) {
      const r = resolve(slotKey);
      if (!r.id) return null;
      return states[r.id] || null;
    }

    function mapped(slotKey) {
      return !!resolve(slotKey).id;
    }

    function available(slotKey) {
      const st = ent(slotKey);
      return !!st && !isUnavailable(st);
    }

    function attr(slotKey, name) {
      const st = ent(slotKey);
      return st && st.attributes ? st.attributes[name] : undefined;
    }

    function rawState(slotKey) {
      const st = ent(slotKey);
      return st ? st.state : null;
    }

    /** Valoare numerică sau null. */
    function num(slotKey, attrName) {
      const st = ent(slotKey);
      if (!st || isUnavailable(st)) return null;
      const useAttr = attrName || resolve(slotKey).attr;
      const raw = useAttr ? st.attributes && st.attributes[useAttr] : st.state;
      const v = parseFloat(raw);
      return Number.isFinite(v) ? v : null;
    }

    /**
     * Text formatat pentru afişare.
     * - slot nemapat  -> "VERIFY"
     * - entitate indisponibilă -> "—"
     */
    function fmt(slotKey, opts) {
      const o = opts || {};
      if (!mapped(slotKey)) return VERIFY;
      const st = ent(slotKey);
      if (!st) return VERIFY;
      if (isLgTimerUnset(slotKey, st.state, num(slotKey))) return UNSET;
      if (isUnavailable(st)) return NA;
      const useAttr = o.attr || resolve(slotKey).attr;
      let v = useAttr ? st.attributes[useAttr] : st.state;
      if (v === undefined || v === null || v === '') return NA;
      if (o.map && o.map[v] !== undefined) return o.map[v];
      // time (v1.1.3): stări ISO-timestamp (ex. ultimul pachet Grott) — fără
      // asta parseFloat("2026-08-22T…") ar afişa doar anul.
      if (o.time) {
        const t = new Date(v);
        if (!isNaN(t.getTime())) {
          return t.toLocaleString('ro-RO', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        }
      }
      let n = parseFloat(v);
      const unit = o.unit !== undefined ? o.unit : st.attributes.unit_of_measurement;
      if (Number.isFinite(n) && String(v).trim() !== '') {
        // scale = factor de AFIŞARE pentru registre publicate brut de Grott
        // (ex. pf=1000 → ×0.001 = "1.00"; mV de celulă → ×0.001 = V). Nu
        // modifică entitatea, doar reprezentarea.
        if (o.scale !== undefined) n = n * o.scale;
        // (v1.3.0) Formatarea canonică pe familii de unităţi — un singur set
        // de reguli pentru toată aplicaţia (design/format.js). Câştigă în
        // faţa zecimalelor per-rând: consecvenţa e scopul. Familiile
        // necunoscute (pH, '', mm etc.) cad pe euristica veche de mai jos.
        const auto = fmtUnitAuto(n, unit);
        if (auto) return auto.v + ' ' + auto.u;
        // valorile întregi rămân întregi ("0" nu devine "0.0")
        const isWholeRaw = Number.isInteger(n) && String(v).indexOf('.') < 0 && o.scale === undefined;
        const d = o.decimals === undefined ? (isWholeRaw ? 0 : Math.abs(n) < 100 ? 1 : 0) : o.decimals;
        v = dec(roundTo(n, d).toFixed(d));
      }
      return unit ? v + ' ' + unit : String(v);
    }

    function isVerify(text) {
      return text === VERIFY;
    }

    /** Stare booleană a unui slot (pentru toggle-uri). */
    function isOn(slotKey) {
      const st = ent(slotKey);
      if (!st || isUnavailable(st)) return false;
      const pKey = 'onoff:' + st.entity_id;
      if (pending[pKey] !== undefined) return pending[pKey];
      return ON_STATES.indexOf(String(st.state).toLowerCase()) >= 0;
    }

    /** Pornire/oprire generică pentru switch, light, automation, media_player, climate. */
    async function toggle(slotKey) {
      const id = idOf(slotKey);
      if (!id) return false;
      const st = states[id];
      if (!st) return false;
      const domain = id.split('.')[0];
      const currentlyOn = isOn(slotKey);
      markPending('onoff:' + id, !currentlyOn);

      if (domain === 'climate') {
        if (currentlyOn) return callService('climate', 'turn_off', {}, { entity_id: id });
        const modes = (st.attributes && st.attributes.hvac_modes) || [];
        const preferred = matchOption(modes, ['cool', 'heat_cool', 'auto', 'heat']);
        if (preferred) return callService('climate', 'set_hvac_mode', { hvac_mode: preferred }, { entity_id: id });
        return callService('climate', 'turn_on', {}, { entity_id: id });
      }
      if (domain === 'button') return callService('button', 'press', {}, { entity_id: id });
      return callService('homeassistant', currentlyOn ? 'turn_off' : 'turn_on', {}, { entity_id: id });
    }

    // -------------------------------------------------------------- climate
    function climateTarget(slotKey) {
      const st = ent(slotKey);
      if (!st) return null;
      const pKey = 'target:' + st.entity_id;
      if (pending[pKey] !== undefined) return pending[pKey];
      const v = parseFloat(st.attributes && st.attributes.temperature);
      if (Number.isFinite(v)) return v;
      // integrarea nu raportează ţinta acum (ex. LG ThinQ cu unitatea oprită):
      // folosim ultima valoare cunoscută (sesiune + localStorage + istoric HA)
      const cached = lastTargets && lastTargets[st.entity_id];
      return Number.isFinite(cached) ? cached : null;
    }

    /** true când ţinta afişată e o valoare memorată, nu raportată acum. */
    function climateTargetStale(slotKey) {
      const st = ent(slotKey);
      if (!st) return false;
      if (pending['target:' + st.entity_id] !== undefined) return false;
      const v = parseFloat(st.attributes && st.attributes.temperature);
      return !Number.isFinite(v) && Number.isFinite(lastTargets && lastTargets[st.entity_id]);
    }

    /** Verifică un bit din supported_features al entităţii unui slot. */
    function supportsFeature(slotKey, bit) {
      const st = ent(slotKey);
      if (!st) return false;
      const f = st.attributes && st.attributes.supported_features;
      return typeof f === 'number' && (f & bit) !== 0;
    }

    /** Zecimale pentru temperaturi: 0 când pasul e întreg, 1 altfel. */
    function tempDecimals(step) {
      return Number.isFinite(step) && step % 1 !== 0 ? 1 : 0;
    }

    function climateCurrent(slotKey) {
      return num(slotKey, 'current_temperature');
    }

    function climateStep(slotKey) {
      const v = parseFloat(attr(slotKey, 'target_temp_step'));
      return Number.isFinite(v) && v > 0 ? v : 0.5;
    }

    function climateMin(slotKey) {
      const v = parseFloat(attr(slotKey, 'min_temp'));
      return Number.isFinite(v) ? v : 16;
    }

    function climateMax(slotKey) {
      const v = parseFloat(attr(slotKey, 'max_temp'));
      return Number.isFinite(v) ? v : 30;
    }

    async function setClimateTarget(slotKey, value) {
      const id = idOf(slotKey);
      if (!id) return false;
      const lo = climateMin(slotKey), hi = climateMax(slotKey);
      const v = Math.max(lo, Math.min(hi, value));
      markPending('target:' + id, v);
      return callService('climate', 'set_temperature', { temperature: v }, { entity_id: id });
    }

    async function bumpClimate(slotKey, deltaSteps) {
      const cur = climateTarget(slotKey);
      const step = climateStep(slotKey);
      const base = cur === null ? climateMin(slotKey) : cur;
      return setClimateTarget(slotKey, roundTo(base + deltaSteps * step, 2));
    }

    async function setHvacMode(slotKey, mode) {
      const id = idOf(slotKey);
      if (!id) return false;
      return callService('climate', 'set_hvac_mode', { hvac_mode: mode }, { entity_id: id });
    }

    async function setFanMode(slotKey, mode) {
      const id = idOf(slotKey);
      if (!id || !mode) return false;
      return callService('climate', 'set_fan_mode', { fan_mode: mode }, { entity_id: id });
    }

    async function setSwingMode(slotKey, mode) {
      const id = idOf(slotKey);
      if (!id || !mode) return false;
      return callService('climate', 'set_swing_mode', { swing_mode: mode }, { entity_id: id });
    }

    async function setPresetMode(slotKey, mode) {
      const id = idOf(slotKey);
      if (!id || !mode) return false;
      return callService('climate', 'set_preset_mode', { preset_mode: mode }, { entity_id: id });
    }

    // --------------------------------------------------------------- number
    function numberValue(slotKey) {
      const st = ent(slotKey);
      if (!st) return null;
      const pKey = 'value:' + st.entity_id;
      if (pending[pKey] !== undefined) return pending[pKey];
      const v = parseFloat(st.state);
      return Number.isFinite(v) ? v : null;
    }

    /** Receipt-ul bridge-ului pentru un timer LG (null dacă nu există). */
    function lgTimerReceipt(slotKey) {
      const st = ent(slotKey);
      if (!st || !isLgTimerSlot(slotKey)) return null;
      const r = lastSentTimers && lastSentTimers[st.entity_id];
      return r || null;
    }

    /** Când AC-ul pornește/opreşte fizic, receipt-ul vechi nu mai e relevant. */
    function lgTimerReceiptStale(slotKey) {
      const r = lgTimerReceipt(slotKey);
      if (!r) return false;
      const st = ent(slotKey);
      return !st || parseFloat(st.state) !== r.value;
    }

    function numberBounds(slotKey, fallbackMin, fallbackMax, fallbackStep) {
      const mn = parseFloat(attr(slotKey, 'min'));
      const mx = parseFloat(attr(slotKey, 'max'));
      const stp = parseFloat(attr(slotKey, 'step'));
      return {
        min: Number.isFinite(mn) ? mn : fallbackMin,
        max: Number.isFinite(mx) ? mx : fallbackMax,
        step: Number.isFinite(stp) && stp > 0 ? stp : fallbackStep
      };
    }

    function numberWritable(slotKey) {
      const id = idOf(slotKey);
      if (!id) return false;
      const d = id.split('.')[0];
      return d === 'number' || d === 'input_number';
    }

    /** Number entity exists and accepts set_value; `unknown` is OK (LG timers unset). */
    function numberControllable(slotKey) {
      if (!numberWritable(slotKey)) return false;
      const st = ent(slotKey);
      if (!st) return false;
      return st.state !== 'unavailable';
    }

    async function setNumber(slotKey, value) {
      const id = idOf(slotKey);
      if (!id) return false;
      const domain = id.split('.')[0];
      if (domain !== 'number' && domain !== 'input_number') return false;
      // Timer-ele LG NU se mai scriu prin number.set_value (no-op în ThinQ);
      // merge exclusiv prin bridge-ul lg_thinq_timers (v1.5.4).
      if (isLgTimerSlot(slotKey)) {
        return setLgTimer(slotKey, value);
      }
      const b = numberBounds(slotKey, 0, 100, 1);
      const v = Math.max(b.min, Math.min(b.max, value));
      markPending('value:' + id, v);
      return callService(domain, 'set_value', { value: v }, { entity_id: id });
    }

    /**
     * Trimite un timer LG prin bridge. Returnează true doar dacă serviciul a
     * fost acceptat; eroarea ajunge în banda de erori cu text onest LG.
     */
    async function setLgTimer(slotKey, value) {
      const id = idOf(slotKey);
      if (!id) return false;
      const norm = normalizeTimerValue(slotKey, value);
      const svc = lgTimerService(slotKey, norm);
      markPending('value:' + id, norm);
      try {
        const receipt = await callServiceWithResponse(svc.domain, svc.service, svc.data);
        if (receipt && receipt.command_sent) {
          rememberSentTimer(id, {
            value: norm,
            kind: slotKey,
            ts: Date.now(),
            requested: receipt.requested || svc.service
          });
          return true;
        }
        // răspuns fără receipt valid — nu marcăm succes
        markPending('value:' + id, undefined);
        setLastCallError('lg_thinq_timers.' + svc.service + ': răspuns fără confirmare');
        return false;
      } catch (err) {
        markPending('value:' + id, undefined);
        const msg = (err && (err.message || err.error && err.error.message)) || String(err);
        setLastCallError('lg_thinq_timers.' + svc.service + ': ' + lgTimerErrorMessage(msg));
        return false;
      }
    }

    // --------------------------------------------------------- media_player
    function volume(slotKey) {
      const st = ent(slotKey);
      if (!st) return null;
      const pKey = 'vol:' + st.entity_id;
      if (pending[pKey] !== undefined) return pending[pKey];
      const v = parseFloat(st.attributes && st.attributes.volume_level);
      return Number.isFinite(v) ? Math.round(v * 100) : null;
    }

    async function setVolume(slotKey, pct) {
      const id = idOf(slotKey);
      if (!id) return false;
      const v = Math.max(0, Math.min(100, Math.round(pct)));
      markPending('vol:' + id, v);
      return callService('media_player', 'volume_set', { volume_level: v / 100 }, { entity_id: id });
    }

    function isMuted(slotKey) {
      return !!attr(slotKey, 'is_volume_muted');
    }

    async function setMute(slotKey, muted) {
      const id = idOf(slotKey);
      if (!id) return false;
      return callService('media_player', 'volume_mute', { is_volume_muted: !!muted }, { entity_id: id });
    }

    async function selectSource(slotKey, source) {
      const id = idOf(slotKey);
      if (!id || !source) return false;
      return callService('media_player', 'select_source', { source }, { entity_id: id });
    }

    async function mediaCommand(slotKey, service) {
      const id = idOf(slotKey);
      if (!id) return false;
      return callService('media_player', service, {}, { entity_id: id });
    }

    function sourceList(slotKey) {
      const l = attr(slotKey, 'source_list');
      return Array.isArray(l) ? l : [];
    }

    function currentSource(slotKey) {
      return attr(slotKey, 'source') || null;
    }

    function friendlyName(slotKey, fallback) {
      const st = ent(slotKey);
      if (st && st.attributes && st.attributes.friendly_name) return st.attributes.friendly_name;
      return fallback || '';
    }

    return {
      ha, states, entityMap,
      idOf, ent, mapped, available, attr, rawState, num, fmt, isVerify, isOn, toggle,
      climateTarget, climateTargetStale, supportsFeature, tempDecimals,
      climateCurrent, climateStep, climateMin, climateMax,
      setClimateTarget, bumpClimate, setHvacMode, setFanMode, setSwingMode, setPresetMode,
      numberValue, lgTimerReceipt, lgTimerReceiptStale, numberBounds, numberWritable, numberControllable, setNumber, setLgTimer,
      volume, setVolume, isMuted, setMute, selectSource, mediaCommand, sourceList, currentSource,
      friendlyName, matchOption
    };
  }, [ha, states, entityMap, callService, callServiceWithResponse, markPending, pending, lastTargets, lastSentTimers, rememberSentTimer, setLastCallError]);
}
