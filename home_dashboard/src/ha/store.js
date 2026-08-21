// Stocare locală: URL-ul HA, token-ul și maparea sloturi → entity_id.
// Totul stă în localStorage-ul browserului. Nu se trimite nicăieri altundeva
// în afară de instanța ta de Home Assistant.

import { SUGGESTED_MAP } from './suggestedMap.js';
import { SLOT_BY_KEY } from './slots.js';

const KEY_CFG = 'hd.ha.config';

/**
 * Versiunea schemei de mapare salvate în localStorage. Se incrementează ori de
 * câte ori se schimbă cheile de slot sau default-urile lor într-un mod care
 * cere migrare. v2 (1.0.7): formatul devine { __v, map } şi se salvează DOAR
 * diferenţele faţă de SUGGESTED_MAP — niciodată snapshot-ul complet. Aşa,
 * schimbările viitoare de default din cod se propagă automat la toţi clienţii,
 * fără ca utilizatorul să mai atingă vreodată localStorage manual.
 */
const MAP_SCHEMA_VERSION = 2;

// Chei ale căror valori implicite s-au schimbat între versiuni. Dacă valoarea
// salvată e exact vechiul default (snapshot îngheţat de un "Aplică din audit"
// rulat pe o versiune veche), o migrăm la default-ul nou; o alegere cu adevărat
// personalizată (altă entitate) rămâne neatinsă.
const LEGACY_VALUE_MIGRATIONS = {
  'sensor.lg_somn_min': { 'sensor.etaj_aer_conditionat_lg_etaj_sleep_timer': 'number.etaj_aer_conditionat_lg_etaj_sleep_timer' },
  'sensor.lg_pornire_min': { 'sensor.etaj_aer_conditionat_lg_etaj_schedule_turn_on': 'number.etaj_aer_conditionat_lg_etaj_schedule_turn_on' },
  'sensor.lg_oprire_min': { 'sensor.etaj_aer_conditionat_lg_etaj_schedule_turn_off': 'number.etaj_aer_conditionat_lg_etaj_schedule_turn_off' }
};

/** Curăţă şi migrează o mapare salvată de o versiune mai veche a schemei. */
function migrateStored(stored, fromVersion) {
  const out = {};
  Object.keys(stored || {}).forEach((k) => {
    if (!SLOT_BY_KEY[k]) return; // slot eliminat din catalog — cheia se curăţă
    let v = stored[k];
    const mig = LEGACY_VALUE_MIGRATIONS[k];
    if (mig && mig[v] !== undefined) v = mig[v];
    // Amnistie unică la trecerea spre v2: golirile explicite ('') moştenite din
    // era snapshot-urilor se resetează la default; după v2 ele se păstrează.
    if (fromVersion < 2 && v === '') return;
    if (v === SUGGESTED_MAP[k]) return; // identic cu default-ul — redundant
    out[k] = v;
  });
  return out;
}
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
 * Implicit = maparea din audit (SUGGESTED_MAP). localStorage ţine DOAR
 * diferenţele explicite ale utilizatorului (format { __v, map }); ele au
 * prioritate peste default. La încărcare, o mapare salvată de o schemă mai
 * veche e migrată automat: cheile dispărute se curăţă, valorile-default vechi
 * se aduc la default-ul nou, snapshot-urile complete se reduc la diferenţe.
 */
export function loadMap() {
  const raw = read(KEY_MAP, null);
  let overrides = {};
  if (raw && typeof raw === 'object') {
    if (raw.__v === undefined) {
      // format vechi (pre-1.0.7): obiect simplu, posibil snapshot complet
      overrides = migrateStored(raw, 1);
      write(KEY_MAP, { __v: MAP_SCHEMA_VERSION, map: overrides });
    } else if (raw.__v < MAP_SCHEMA_VERSION) {
      overrides = migrateStored(raw.map, raw.__v);
      write(KEY_MAP, { __v: MAP_SCHEMA_VERSION, map: overrides });
    } else {
      overrides = raw.map || {};
    }
  }
  return Object.assign({}, SUGGESTED_MAP, overrides);
}

export function saveMap(map) {
  // Persistăm doar ce diferă de default (inclusiv golirile explicite '').
  const diff = {};
  Object.keys(map || {}).forEach((k) => {
    if (!SLOT_BY_KEY[k]) return;
    if (map[k] !== SUGGESTED_MAP[k]) diff[k] = map[k];
  });
  write(KEY_MAP, { __v: MAP_SCHEMA_VERSION, map: diff });
}

export function loadPrefs() {
  return read(KEY_UI, {});
}

export function savePrefs(p) {
  write(KEY_UI, p || {});
}
