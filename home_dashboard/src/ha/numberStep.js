/** Generic +/- stepping for number / input_number slots (incl. HA state unknown). */

export function snapNumber(value, bounds) {
  const min = Number.isFinite(bounds.min) ? bounds.min : 0;
  const max = Number.isFinite(bounds.max) ? bounds.max : 100;
  const step = bounds.step > 0 ? bounds.step : 1;
  if (!Number.isFinite(value)) return null;
  let v = Math.max(min, Math.min(max, value));
  v = Math.round(v / step) * step;
  const dec = step < 1 ? (String(step).split('.')[1] || '').length || 1 : 0;
  if (dec) v = Math.round(v * Math.pow(10, dec)) / Math.pow(10, dec);
  return v;
}

/**
 * First numeric value to send when the entity has no active value yet.
 * min=0 is treated as an unset sentinel (LG ThinQ); first step is `step`.
 */
export function firstNumberFromUnset(bounds) {
  const min = Number.isFinite(bounds.min) ? bounds.min : 0;
  const step = bounds.step > 0 ? bounds.step : 1;
  const seed = min === 0 ? step : min;
  return snapNumber(seed, bounds);
}

/**
 * @param {number|null} current — from numberValue (includes pending)
 * @param {number} deltaSteps — +1 or -1
 */
export function bumpNumber(current, deltaSteps, bounds) {
  const step = bounds.step > 0 ? bounds.step : 1;
  if (current === null || current === undefined) {
    if (deltaSteps <= 0) return null;
    return firstNumberFromUnset(bounds);
  }
  return snapNumber(current + deltaSteps * step, bounds);
}

/** True when UI should show unset semantics (no numeric value yet). */
export function isNumberDisplayedUnset(rawState, numericValue) {
  if (numericValue !== null && numericValue !== undefined) return false;
  return rawState === 'unknown' || rawState === 'none';
}
