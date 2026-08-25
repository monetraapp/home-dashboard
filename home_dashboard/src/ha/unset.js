/** Semantic labels for entities that exist but have no active value yet. */
export const UNSET = 'Nesetat';

export const LG_TIMER_SLOTS = new Set([
  'sensor.lg_pornire_min',
  'sensor.lg_oprire_min',
  'sensor.lg_somn_min',
]);

export function isLgTimerSlot(slotKey) {
  return LG_TIMER_SLOTS.has(slotKey);
}

/** LG ThinQ number timers report HA state `unknown` when cloud native_value is null. */
export function isLgTimerUnset(slotKey, rawState) {
  return isLgTimerSlot(slotKey) && rawState === 'unknown';
}
