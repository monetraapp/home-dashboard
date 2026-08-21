// Stocare locală: URL-ul HA, token-ul și maparea sloturi → entity_id.
// Totul stă în localStorage-ul browserului. Nu se trimite nicăieri altundeva
// în afară de instanța ta de Home Assistant.

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

/** { [slotKey]: entity_id } */
export function loadMap() {
  return read(KEY_MAP, {});
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
