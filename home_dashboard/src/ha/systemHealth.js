// Observabilitate: stocarea Home Assistant şi memoria aplicaţiei (v1.6.0).
//
// Sursa pentru partea de HA e comanda WebSocket `system_health/info`, aceeaşi
// pe care o foloseşte pagina Settings → System → Repairs → System information.
// E un ABONAMENT, nu o interogare: întoarce întâi `{ type: 'initial', data }`,
// apoi `{ type: 'update' }` pe măsură ce fiecare integrare îşi rezolvă
// verificările lente (cele marcate `pending`). Tratat ca interogare simplă,
// panoul ar rămâne blocat pe „pending" la jumătate din câmpuri.
//
// PRECIZAREA CARE EVITĂ O ALARMĂ FALSĂ, măsurată pe instanţă (26.08):
// baza de date avea 59,17 MiB, cu cea mai veche rulare de recorder pe 18.08.
// O regulă de trei pe „MiB pe zi × zile până la disc plin" ar produce o dată
// alarmantă şi complet greşită: recorder-ul purjează la un orizont fix, deci
// dimensiunea se PLAFONEAZĂ, nu creşte liniar. Modulul calculează ritmul, dar
// îl prezintă ca medie pe fereastra păstrată şi spune explicit că proiecţia e
// valabilă doar dacă dimensiunea continuă să urce după atingerea orizontului.
// `purge_keep_days` nu e expus prin system_health, deci nu îl presupunem.
import { useEffect, useState } from 'react';
import { useHa } from './context.js';

const UNITATI = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KIB: 1024, MIB: 1024 ** 2, GIB: 1024 ** 3, TIB: 1024 ** 4 };

/** „28.0 GB" / „59.17 MiB" -> octeţi. null dacă nu se poate citi. */
export function parseSize(text) {
  if (typeof text !== 'string') return null;
  const m = text.trim().match(/^([\d.,]+)\s*([A-Za-z]+)$/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  const u = UNITATI[m[2].toUpperCase()];
  if (!Number.isFinite(n) || !u) return null;
  return n * u;
}

/** Octeţi -> text scurt, cu virgulă zecimală. */
export function fmtBytes(n) {
  if (!Number.isFinite(n) || n < 0) return '—';
  const trepte = [['GB', 1e9], ['MB', 1e6], ['KB', 1e3]];
  for (const [u, d] of trepte) {
    if (n >= d) {
      const v = n / d;
      return String(Math.round(v * 10) / 10).replace('.', ',') + ' ' + u;
    }
  }
  return Math.round(n) + ' B';
}

/**
 * Ritmul de creştere al bazei de date, cu rezerva de mai sus.
 * `plafonat` = fereastra păstrată nu mai creşte, deci mărimea e la echilibru şi
 * ritmul nu mai e o tendinţă, ci doar raportul mărime/fereastră.
 */
export function dbGrowth(dbBytes, oldestRunMs, nowMs) {
  if (!Number.isFinite(dbBytes) || !Number.isFinite(oldestRunMs)) return null;
  const zile = (nowMs - oldestRunMs) / 86400000;
  if (!(zile > 0.5)) return null;
  return { zile: Math.round(zile * 10) / 10, perZi: dbBytes / zile };
}

/** Extrage din payload-ul brut doar ce arătăm, cu nume româneşti. */
export function citesteSystemHealth(data, nowMs) {
  const d = data || {};
  const hass = (d.hassio && d.hassio.info) || {};
  const core = (d.homeassistant && d.homeassistant.info) || {};
  const rec = (d.recorder && d.recorder.info) || {};

  const discTotal = parseSize(hass.disk_total);
  const discFolosit = parseSize(hass.disk_used);
  const db = parseSize(rec.estimated_db_size);
  const oldest = rec.oldest_recorder_run && rec.oldest_recorder_run.value
    ? Date.parse(rec.oldest_recorder_run.value)
    : NaN;

  return {
    versiuneCore: core.version || null,
    versiuneOs: hass.host_os || null,
    versiuneSupervisor: hass.supervisor_version || null,
    sanatos: typeof hass.healthy === 'boolean' ? hass.healthy : null,
    suportat: typeof hass.supported === 'boolean' ? hass.supported : null,
    discTotal,
    discFolosit,
    discLiber: Number.isFinite(discTotal) && Number.isFinite(discFolosit) ? discTotal - discFolosit : null,
    discPct: Number.isFinite(discTotal) && discTotal > 0 ? (discFolosit / discTotal) * 100 : null,
    uzuraDisc: hass.disk_life_time || null,
    db,
    dbMotor: rec.database_engine || null,
    crestere: dbGrowth(db, oldest, nowMs),
    addonuri: hass.installed_addons ? String(hass.installed_addons).split(', ') : []
  };
}

/**
 * Ce ocupă aplicaţia în browser.
 * Fiecare accesor e împachetat: în modul privat, cu datele de sit blocate sau
 * în captura de miniatură, `localStorage` însuşi aruncă la citire.
 */
export function browserStorage() {
  const out = { chei: [], total: 0, disponibil: true, heap: null, heapLimita: null };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const v = localStorage.getItem(k) || '';
      // UTF-16: doi octeţi pe unitate de cod. Aproximare, dar consecventă.
      const o = (k.length + v.length) * 2;
      out.chei.push({ cheie: k, octeti: o });
      out.total += o;
    }
    out.chei.sort((a, b) => b.octeti - a.octeti);
  } catch (e) {
    out.disponibil = false;
  }
  try {
    const m = typeof performance !== 'undefined' && performance.memory;
    if (m && Number.isFinite(m.usedJSHeapSize)) {
      out.heap = m.usedJSHeapSize;
      out.heapLimita = m.jsHeapSizeLimit || null;
    }
  } catch (e) { /* Chromium-only; absenţa nu e o eroare */ }
  return out;
}

/** Cota totală a originii (acoperă IndexedDB şi Cache Storage), asincron. */
export function storageEstimate() {
  try {
    if (navigator.storage && navigator.storage.estimate) return navigator.storage.estimate();
  } catch (e) { /* nesuportat */ }
  return Promise.resolve(null);
}

export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'necunoscută';

/** Hook-ul panoului. Se armează doar cât e pagina deschisă. */
export function useSystemHealth(enabled) {
  const { subscribeMessage, connected } = useHa();
  const [raw, setRaw] = useState(null);
  const [err, setErr] = useState(null);
  const [browser, setBrowser] = useState(() => browserStorage());
  const [cota, setCota] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const activ = connected && enabled;

  useEffect(() => {
    if (!activ) return undefined;
    let viu = true;
    let unsub = null;
    Promise.resolve(
      subscribeMessage(
        (msg) => {
          if (!viu || !msg) return;
          // `initial` aduce tot; `update` aduce o singură integrare rezolvată.
          if (msg.type === 'initial') setRaw(msg.data || {});
          else if (msg.type === 'update') {
            setRaw((p) => ({ ...(p || {}), [msg.domain]: { info: { ...(((p || {})[msg.domain] || {}).info || {}), [msg.key]: msg.data } } }));
          }
        },
        { type: 'system_health/info' }
      )
    )
      .then((u) => { if (viu) unsub = u; else if (typeof u === 'function') u(); })
      .catch((e) => { if (viu) setErr((e && (e.message || e.code)) || 'necunoscută'); });
    return () => {
      viu = false;
      if (typeof unsub === 'function') { try { unsub(); } catch (e) { /* deja închis */ } }
    };
  }, [activ, subscribeMessage]);

  // Măsurătorile din browser se reîmprospătează la 15 s cât e pagina deschisă:
  // suficient ca să vezi dacă memoria creşte navigând, fără să încarce tableta.
  useEffect(() => {
    if (!enabled) return undefined;
    const t = setInterval(() => {
      setBrowser(browserStorage());
      setNow(Date.now());
      storageEstimate().then((c) => c && setCota(c));
    }, 15000);
    storageEstimate().then((c) => c && setCota(c));
    return () => clearInterval(t);
  }, [enabled]);

  return { sys: raw ? citesteSystemHealth(raw, now) : null, browser, cota, error: err };
}
