/**
 * LG ThinQ timer bridge contract (lg_thinq_timers integration, v1.5.4).
 *
 * Timerele LG sunt WRITE-ONLY: nu există readback continuu. Contract UI:
 *  - `null`  → Nesetat (nicio comandă locală recentă, niciun readback)
 *  - receipt → Trimis · X (comanda a fost ACCEPTATĂ de HA bridge; NU e
 *              confirmare continuă de la LG)
 *  - eroare  → serviciul a returnat HomeAssistantError / cod LG
 * Nu derivăm state din vechile number.* — acelea rămân doar diagnostic.
 */

import { LG_TIMER_SLOTS } from './unset.js';

/** Device-id-ul ThinQ al AC-ului Etaj (identificatorul bridge-ului). */
export const LG_AC_DEVICE_ID = '9a0777a52b50456fa23684b8539d49e4b8471ecc5358968ca14ae0352cbb43d9';

/** Ordinea: pornire, oprire, somn. */
export const LG_TIMER_KIND = {
  ON: 'sensor.lg_pornire_min',
  OFF: 'sensor.lg_oprire_min',
  SLEEP: 'sensor.lg_somn_min'
};

export function lgTimerKindOf(slotKey) {
  if (LG_TIMER_SLOTS.has(slotKey)) return slotKey;
  return null;
}

/** Sleep-ul e în ORE (LG respinge minutele cu 2201). */
export function lgTimerUnit(slotKey) {
  return slotKey === LG_TIMER_KIND.SLEEP ? 'h' : 'min';
}

/** Pas UI: 15 min pentru schedule (acoperă 0h15–8h), 1 h pentru sleep. */
export function lgTimerStep(slotKey) {
  return slotKey === LG_TIMER_KIND.SLEEP ? 60 : 15;
}

/** Limite în MINUTE pentru schedule; în ORE pentru sleep. */
export function lgTimerBounds(slotKey) {
  return slotKey === LG_TIMER_KIND.SLEEP
    ? { min: 1, max: 12, step: 1 }
    : { min: 0, max: 480, step: 15 };
}

/** total minutes → {hours, minutes}; LG acceptă minute doar pe schedule. */
export function splitDuration(totalMinutes) {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return { hours: 0, minutes: 0 };
  const h = Math.floor(totalMinutes / 60);
  return { hours: h, minutes: Math.round(totalMinutes - h * 60) };
}

/** Normalizare la pas + limite (fără NaN; null sub minim = nesetat). */
export function normalizeTimerValue(slotKey, value) {
  const b = lgTimerBounds(slotKey);
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const snapped = Math.round(value / b.step) * b.step;
  if (snapped < b.min) return null;
  return Math.min(b.max, snapped);
}

/** Bump cu semantică write-only: sub minim → nesetat (null), nu 0-min. */
export function bumpTimerValue(slotKey, current, deltaSteps) {
  const b = lgTimerBounds(slotKey);
  if (current === null || current === undefined) {
    if (deltaSteps <= 0) return null;
    return b.min === 0 ? b.step : b.min;
  }
  const next = current + deltaSteps * b.step;
  if (next < b.min) return null;
  return Math.min(b.max, next);
}

/**
 * Gate de stare: comenzi evident invalide blocate în UI (bridge-ul rămâne
 * autoritatea finală). climateState = starea climate.* ('cool', 'off', ...).
 * Returnează null (OK) sau motivul textual.
 */
export function lgTimerBlockedReason(slotKey, climateState) {
  if (!climateState) return null;
  const on = climateState !== 'off';
  if (slotKey === LG_TIMER_KIND.ON && on) {
    return 'Pornirea programată cere AC oprit (LG 2302)';
  }
  if (slotKey === LG_TIMER_KIND.OFF && !on) {
    return 'Oprirea programată cere AC pornit (LG 2304)';
  }
  return null;
}

/** Mapare slot → serviciu bridge. */
export function lgTimerService(slotKey, value) {
  if (slotKey === LG_TIMER_KIND.SLEEP) {
    return value === null || value <= 0
      ? { domain: 'lg_thinq_timers', service: 'cancel_sleep_timer', data: { device_id: LG_AC_DEVICE_ID } }
      : { domain: 'lg_thinq_timers', service: 'set_sleep_timer', data: { device_id: LG_AC_DEVICE_ID, hours: value } };
  }
  const isOn = slotKey === LG_TIMER_KIND.ON;
  const setService = isOn ? 'set_schedule_on' : 'set_schedule_off';
  const cancelService = isOn ? 'cancel_schedule_on' : 'cancel_schedule_off';
  if (value === null || value <= 0) {
    return { domain: 'lg_thinq_timers', service: cancelService, data: { device_id: LG_AC_DEVICE_ID } };
  }
  const d = splitDuration(value);
  return {
    domain: 'lg_thinq_timers',
    service: setService,
    data: { device_id: LG_AC_DEVICE_ID, hours: d.hours, minutes: d.minutes }
  };
}

/** Formatare receipt: "1h 30m · 00:42". */
export function formatTimerReceipt(receipt) {
  if (!receipt || !Number.isFinite(receipt.value)) return '';
  const b = receipt.kind === LG_TIMER_KIND.SLEEP ? { h: receipt.value } : splitDuration(receipt.value);
  const t = new Date(receipt.ts);
  const hh = String(t.getHours()).padStart(2, '0');
  const mm = String(t.getMinutes()).padStart(2, '0');
  const dur = receipt.kind === LG_TIMER_KIND.SLEEP
    ? b.h + 'h'
    : (b.hours ? b.hours + 'h ' : '') + (b.minutes ? b.minutes + 'm' : '') || '0m';
  return dur + ' · ' + hh + ':' + mm;
}

/**
 * Extrage codul LG din mesajul de eroare HA.
 *
 * Bridge-ul produce DOUA formate, verificate in sursa lui (services.py):
 *   - eroare venita de la LG:  "Command not supported ... (LG 2302)"
 *   - pre-validare locala:     "... (LG rejects with 2304 while it is off)."
 * Prima versiune cerea cifrele imediat dupa "LG" si rata al doilea format.
 * Prins pe 26.08 printr-un apel REAL pe bridge, nu de teste: testele
 * foloseau un format presupus. `\D{0,24}` acopera ambele fara sa inghita
 * cifre, deci nu scoate un cod fals din device_id-ul hexazecimal.
 */
export function lgErrorCode(message) {
  if (!message) return null;
  const m = String(message).match(/LG\D{0,24}(\d{4})/);
  return m ? m[1] : null;
}

/** Traducere eroare bridge → text onest pentru UI. */
export function lgTimerErrorMessage(message) {
  const code = lgErrorCode(message);
  if (code === '2302') return 'Comandă neacceptată în starea curentă (LG 2302) — AC trebuie oprit.';
  if (code === '2304') return 'Comandă neacceptată cu AC oprit (LG 2304) — niciun temporizator activ sau AC trebuie pornit.';
  if (code === '2201') return 'Funcţie neacceptată de acest model (LG 2201).';
  if (/does not provide/.test(String(message))) return 'Bridge LG indisponibil: metoda lipseşte din thinqconnect.';
  if (/Nu sunt conectat|Neconectat/i.test(String(message))) return 'Deconectat de la HA — comanda nu a fost trimisă.';
  if (/Unknown LG device_id/.test(String(message))) return 'Bridge LG: device necunoscut.';
  return 'Comanda LG a eşuat: ' + (message || 'eroare necunoscută');
}
