// Stratul de date al paginii „Dispozitive" (v1.6.0).
//
// Nu are sloturi în catalog: ca şi „Zone", totul se derivă la execuţie din
// registre. Peste registre adaugă un al cincilea izvor — lista intrărilor de
// configurare — fiindcă un dispozitiv poate fi perfect sănătos ca hardware în
// timp ce integrarea lui nu a pornit deloc.
//
// DOUĂ DISTINCŢII MĂSURATE PE INSTANŢĂ, care fac diferenţa între semnal şi
// alarmă falsă:
//
// 1. `state: "not_loaded"` NU înseamnă defect. Toate cele şase intrări
//    `not_loaded` de aici au `source: "ignore"` — descoperiri respinse
//    deliberat (dlna_dmr pentru televizoare deja adăugate prin samsungtv,
//    homekit_controller pentru unele LG, adguard). Raportate ca „integrare
//    căzută" ar produce şase alarme permanente false. Se exclud explicit.
// 2. `setup_retry` ESTE defect, indiferent de integrare: înseamnă că HA reîncearcă
//    o configurare care nu a reuşit. Se raportează — a citi o stare nu înseamnă
//    a atinge dispozitivul.
//
// Freshness respectă regula din `health.js`: doar surse reale de ultimă
// comunicare. Aici se caută după tipar de nume, nu după ID-uri fixe, ca un
// dispozitiv nou care expune `last_seen` să fie prins fără release.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHa } from './context.js';
import { useRegistries } from './registries.js';
import {
  classifyDevice, expectedInterval, gapsFromStamps, fmtAge, healthTotals, HEALTH_ORDER, FRESHNESS
} from './health.js';

/**
 * Entităţi care chiar poartă un moment de comunicare.
 * `last_data_push` e forma Grott; restul acoperă integrări care ar putea apărea
 * ulterior. Deliberat NU intră aici:
 *   - `last_reboot` / `last_restart` — moment de pornire, nu bătaie de inimă;
 *   - `uptime` — la fel, în HA e ora boot-ului şi nu avansează între reporniri;
 *   - `next_*`, `backup` — momente viitoare sau de altă natură.
 */
const TIPAR_COMUNICARE = /(last_(data_push|seen|communication|message|contact|packet|report)|heartbeat|_last_push)$/;
const TIPAR_EXCLUS = /(reboot|restart|boot|uptime|backup|next_|_start|_end)/;

/** O intrare de configurare respinsă manual nu e un defect. */
export function intrareIgnorata(entry) {
  return !!entry && (entry.source === 'ignore' || !!entry.disabled_by);
}

/** Intrarea e sănătoasă? Necunoscut = nu acuzăm. */
export function intrareOk(entry) {
  if (!entry) return true;
  if (intrareIgnorata(entry)) return true;
  return entry.state === 'loaded';
}

/** Găseşte entitatea-sursă de ultimă comunicare a unui dispozitiv, dacă există. */
export function sursaComunicare(entityIds, states) {
  for (const id of entityIds || []) {
    const scurt = String(id).split('.').slice(1).join('.');
    if (TIPAR_EXCLUS.test(scurt)) continue;
    if (!TIPAR_COMUNICARE.test(scurt)) continue;
    const st = states && states[id];
    if (!st) continue;
    if (String(st.attributes && st.attributes.device_class) !== 'timestamp') continue;
    const t = Date.parse(st.state);
    if (!Number.isFinite(t)) continue;
    return { entity_id: id, ms: t };
  }
  return null;
}

/**
 * Un dispozitiv are voie să fie oprit?
 * Regula, restrânsă intenţionat: doar cele cu media_player. Un televizor stins
 * raportează `unavailable` şi asta e starea lui normală câteva ore pe zi. Orice
 * altceva stins e o întrebare, nu un fapt aşteptat.
 */
export function oprireAsteptata(entityIds) {
  return (entityIds || []).some((id) => String(id).split('.')[0] === 'media_player');
}

/**
 * Construieşte lista de dispozitive. Pură — primeşte tot ce-i trebuie.
 * `istoric` = { [deviceId]: number[] } inel mărginit de momente de comunicare
 * reale, folosit doar pentru intervalul normal al surselor reale.
 */
export function buildDevices(reg, states, entriesById, nowMs, istoric) {
  if (!reg) return [];
  const { areas, devices, entities } = reg;
  const areaById = {};
  for (const a of areas || []) areaById[a.area_id] = a;

  const perDevice = {};
  for (const e of entities || []) {
    if (!e.device_id || e.disabled_by) continue;
    if (states && !states[e.entity_id]) continue;
    (perDevice[e.device_id] = perDevice[e.device_id] || []).push(e.entity_id);
  }

  const out = [];
  for (const d of devices || []) {
    if (d.disabled_by) continue;
    const ids = (perDevice[d.id] || []).slice().sort();
    const entry = entriesById && (d.config_entries || []).map((x) => entriesById[x]).find(Boolean);
    // Un dispozitiv rămas doar de la o descoperire ignorată nu are ce căuta în listă.
    if (!ids.length && entry && intrareIgnorata(entry)) continue;

    const sursa = sursaComunicare(ids, states);
    const gaps = sursa ? gapsFromStamps(istoric && istoric[d.id]) : [];
    const ent = ids.map((id) => ({
      entity_id: id,
      state: states[id].state,
      lastUpdatedMs: Date.parse(states[id].last_updated)
    }));

    const v = classifyDevice(ent, nowMs, {
      integrationOk: intrareOk(entry),
      offlineExpected: oprireAsteptata(ids),
      lastCommMs: sursa ? sursa.ms : null,
      expectedMs: expectedInterval(gaps)
    });

    const area = d.area_id ? areaById[d.area_id] : null;
    out.push({
      id: d.id,
      name: d.name_by_user || d.name || '(fără nume)',
      producator: d.manufacturer || null,
      model: d.model || null,
      zona: area ? area.name : null,
      integrare: entry ? entry.domain : null,
      integrareTitlu: entry ? entry.title : null,
      integrareStare: entry ? entry.state : null,
      sursaFreshness: sursa ? sursa.entity_id : null,
      entitati: ids,
      nrEntitati: ids.length,
      nrIndisponibile: ent.filter((x) => x.state === 'unavailable').length,
      ...v
    });
  }
  return out;
}

/** Câte momente de comunicare reţinem per dispozitiv. Mărginit prin construcţie. */
export const ISTORIC_MAX = 24;

/** Fereastra din care semănăm linia de bază la deschiderea paginii. */
export const FEREASTRA_SEED_MS = 2 * 3600 * 1000;

/**
 * Momentele de comunicare dintr-un răspuns de istoric.
 *
 * Pentru un senzor `device_class: timestamp`, VALOAREA e chiar momentul
 * pachetului, deci intervalele dintre valori distincte sunt intervale reale de
 * comunicare — nu intervale între re-randări. Fără această sămânţă, linia de
 * bază s-ar aduna doar cât stă pagina deschisă, iar o tăcere n-ar putea fi
 * detectată decât după un sfert de oră de privit ecranul.
 */
export function stampsDinIstoric(sir) {
  const out = [];
  for (const p of sir || []) {
    const t = Date.parse(p && p.s);
    if (!Number.isFinite(t)) continue;
    if (out[out.length - 1] === t) continue;
    out.push(t);
  }
  return out.slice(-ISTORIC_MAX);
}

/**
 * Hook-ul paginii. Reia registrele de la „Zone" (acelaşi cache, aceeaşi
 * invalidare) şi adaugă intrările de configurare.
 */
export function useDeviceHealth(enabled) {
  const { sendMessagePromise, subscribeMessage, connected, states } = useHa();
  const { reg, loading, error } = useRegistries(enabled);
  const [entriesById, setEntries] = useState(null);
  const [entriesErr, setEntriesErr] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const istoricRef = useRef({});
  const semanatRef = useRef(false);

  const activ = connected && enabled;

  const fetchEntries = useCallback(() => {
    if (!activ) return;
    sendMessagePromise({ type: 'config_entries/get' })
      .then((list) => {
        const m = {};
        for (const e of list || []) m[e.entry_id] = e;
        setEntries(m);
        setEntriesErr(null);
      })
      .catch((e) => setEntriesErr((e && (e.message || e.code)) || 'necunoscută'));
  }, [activ, sendMessagePromise]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Starea unei intrări se poate schimba fără niciun eveniment de registru, deci
  // singura cale onestă e reinterogarea periodică. Un minut e suficient: o
  // integrare căzută rămâne căzută, iar pagina nu e un monitor de secundă.
  useEffect(() => {
    if (!activ) return undefined;
    const t = setInterval(fetchEntries, 60000);
    return () => clearInterval(t);
  }, [activ, fetchEntries]);

  void subscribeMessage;

  // Ceasul paginii: vârstele se recalculează la 10 s, nu la fiecare render.
  useEffect(() => {
    if (!enabled) return undefined;
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, [enabled]);

  // Sămânţa: o singură cerere de istoric pentru sursele reale (aici două
  // entităţi), la prima încărcare a paginii. `semanatRef` o ţine unică.
  useEffect(() => {
    if (!activ || !reg || !states || semanatRef.current) return;
    const surse = [];
    const perDev = {};
    for (const e of reg.entities || []) {
      if (!e.device_id || e.disabled_by || !states[e.entity_id]) continue;
      (perDev[e.device_id] = perDev[e.device_id] || []).push(e.entity_id);
    }
    for (const devId of Object.keys(perDev)) {
      const sursa = sursaComunicare(perDev[devId], states);
      if (sursa) surse.push([devId, sursa.entity_id]);
    }
    if (!surse.length) { semanatRef.current = true; return; }
    semanatRef.current = true;
    const acum = Date.now();
    sendMessagePromise({
      type: 'history/history_during_period',
      start_time: new Date(acum - FEREASTRA_SEED_MS).toISOString(),
      end_time: new Date(acum).toISOString(),
      entity_ids: surse.map((x) => x[1]),
      minimal_response: true,
      no_attributes: true,
      significant_changes_only: false
    })
      .then((res) => {
        for (const [devId, entId] of surse) {
          const st = stampsDinIstoric(res && res[entId]);
          if (st.length) istoricRef.current[devId] = st;
        }
        setNow(Date.now());
      })
      .catch(() => { /* fără sămânţă linia de bază se adună din flux */ });
  }, [activ, reg, states, sendMessagePromise]);

  // Inelul de momente reale de comunicare. Creşte doar la valoare NOUĂ, deci
  // intervalele rezultate sunt intervale de pachet, nu de re-randare.
  useEffect(() => {
    if (!enabled || !reg || !states) return;
    const h = istoricRef.current;
    const ids = {};
    for (const e of reg.entities || []) {
      if (!e.device_id || e.disabled_by || !states[e.entity_id]) continue;
      (ids[e.device_id] = ids[e.device_id] || []).push(e.entity_id);
    }
    for (const devId of Object.keys(ids)) {
      const s = sursaComunicare(ids[devId], states);
      if (!s) continue;
      const arr = h[devId] || (h[devId] = []);
      if (arr[arr.length - 1] === s.ms) continue;
      arr.push(s.ms);
      if (arr.length > ISTORIC_MAX) arr.splice(0, arr.length - ISTORIC_MAX);
    }
  }, [enabled, reg, states]);

  const devices = reg && states ? buildDevices(reg, states, entriesById, now, istoricRef.current) : null;
  return { devices, loading, error: error || entriesErr, now };
}

// ------------------------------------------------ formulari pentru interfata
/** Ce scriem sub nume: sursa de freshness, dacă există, altfel lipsa ei. */
export function textFreshness(d) {
  if (!d) return '—';
  if (d.freshness === FRESHNESS.REAL) return 'ultima comunicare acum ' + fmtAge(d.ageMs);
  return 'fără sursă de ultimă comunicare';
}

/** Vechimea stării, mereu etichetată ca atare ca să nu fie citită drept comunicare. */
export function textStare(d) {
  if (!d || !Number.isFinite(d.stateAgeMs)) return null;
  return 'ultima schimbare de stare acum ' + fmtAge(d.stateAgeMs);
}

/** Clasele prezente, în ordinea gravităţii — filtrele nu arată categorii goale. */
export function claseleePrezente(devices) {
  const t = healthTotals(devices || []);
  return HEALTH_ORDER.filter((h) => t[h] > 0).map((h) => ({ cheie: h, n: t[h] }));
}
