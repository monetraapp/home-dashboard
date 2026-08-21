// Stocare locală: URL-ul HA, token-ul și maparea sloturi → entity_id.
// Totul stă în localStorage-ul browserului. Nu se trimite nicăieri altundeva
// în afară de instanța ta de Home Assistant.

import { SUGGESTED_MAP } from './suggestedMap.js';

const KEY_CFG = 'hd.ha.config';
const KEY_MAP = 'hd.ha.entityMap';
const KEY_UI = 'hd.ui.prefs';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Nu am putut scrie în localStorage:', e);
  }
}

/** { url, token } sau null dacă nu e configurat încă. */
export function loadConfig() {
  const c = read(KEY_CFG, null);
  if (!c || !c.url || !c.token) return null;
  return c;
}

export function saveConfig(url, token) {
  write(KEY_CFG, { url: String(url).trim().replace(/\/+$/, ''), token: String(token).trim() });
}

export function clearConfig() {
  try {
    localStorage.removeItem(KEY_CFG);
  } catch {
    /* ignore */
  }
}

/**
 * { [slotKey]: entity_id }
 *
 * Implicit = maparea din audit (SUGGESTED_MAP, aceeaşi folosită de butonul
 * "Aplică maparea din audit"), ca să arate corect din prima, pe orice
 * browser/device, fără vreun click. Orice alegere manuală salvată în
 * localStorage (ecranul de Mapare) are prioritate şi suprascrie implicitul
 * — nu invers. Sloturile absente din SUGGESTED_MAP (fără corespondent real
 * confirmat în audit) rămân nemapate şi cardul lor afişează VERIFY, exact
 * ca înainte.
 */
export function loadMap() {
  const stored = read(KEY_MAP, {});
  return Object.assign({}, SUGGESTED_MAP, stored);
}

export function saveMap(map) {
  write(KEY_MAP, map || {});
}

export function loadPrefs() {
  return read(KEY_UI, {});
}

export function savePrefs(p) {
  write(KEY_UI, p || {});
}
