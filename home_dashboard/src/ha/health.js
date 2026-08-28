/**
 * Sănătatea dispozitivelor (v1.6.0) — logică pură, fără React şi fără HA.
 *
 * DE UNDE VINE „ULTIMA COMUNICARE"
 * Cerinţa era să nu confundăm `last_changed` cu ultima comunicare. Am verificat
 * pe instanţa reală (26.08) ce surse există efectiv:
 *
 *  - `subscribeEntities` din home-assistant-js-websocket 9.6.0 mapează DOAR
 *    `lc → last_changed` şi `lu → last_updated`. `last_reported` **nu ajunge**
 *    prin fluxul live — verificat în sursa bibliotecii, nu presupus.
 *  - `last_reported` există în HA, dar pe cinci entităţi reale măsurate era
 *    IDENTIC cu `last_updated` la microsecundă, inclusiv pe un binary_sensor
 *    Omada nemodificat de 18 ore. Un poll cu valoare identică nu îl avansează
 *    aici. Deci un fetch periodic de `get_states` ar fi costat trafic pentru
 *    zero informaţie în plus.
 *
 * Concluzia care structurează tot modulul: **vârsta stării nu dovedeşte tăcere.**
 * Un întrerupător care n-a fost atins de o zi are `last_updated` de acum o zi
 * şi e perfect sănătos. De aceea:
 *
 *  1. semnalul PRIMAR de defect e **disponibilitatea** (`unavailable`), care e
 *     de încredere: când o integrare pierde un dispozitiv, HA chiar scrie
 *     `unavailable`, iar asta e o schimbare de stare şi ajunge prin flux;
 *  2. vârsta contează DOAR dacă provine dintr-o sursă reală de comunicare, şi
 *     se compară cu intervalul normal al acelei surse, nu cu un prag unic.
 *
 * INVARIANT (verificat cu test de proprietate, nu doar cu exemple)
 * Pentru un dispozitiv FĂRĂ sursă reală de ultimă comunicare:
 *   - `freshness` e mereu UNKNOWN şi `ageMs` e mereu null;
 *   - `HEALTHY` înseamnă strict „integrare încărcată + toate entităţile
 *     disponibile" — nimic despre când a comunicat;
 *   - `SLOW` şi `STALE` sunt INACCESIBILE. Sunt verdicte de freshness şi cer
 *     `freshness === REAL`.
 *
 * REGULA DE PROIECTARE (impusă explicit, 26.08)
 * Un interval dedus din schimbări de stare NU este un interval de comunicare.
 * Freshness se calculează DOAR dintr-o sursă reală de ultimă comunicare:
 * last-seen, timestamp de pachet, heartbeat sau coordinator. Dacă un dispozitiv
 * nu are aşa ceva, freshness-ul se afişează explicit ca NECUNOSCUT şi
 * dispozitivul **nu poate fi declarat STALE sau SLOW din vârsta stării**.
 *
 * INVENTARUL SURSELOR REALE pe această instanţă (măsurat, nu presupus):
 *   - `sensor.knn2e3s00w_grott_last_data_push` — invertorul Growatt
 *   - `sensor.gpg0a450zs_grott_last_data_push` — contorul GPG0A450ZS
 * Atât. Zero entităţi de tip uptime, last_seen sau heartbeat. Un `device_class:
 * timestamp` care marchează un moment de repornire nu e o bătaie de inimă şi nu
 * se numără aici. Restul dispozitivelor rămân, prin regulă, cu freshness
 * necunoscut — numărul se citeşte din inventarul live, nu se scrie în cod.
 *
 * Cadenţa reală a celor două surse: 5 minute, citită din istoricul valorilor
 * (17:00:53 → 17:05:53 → … → 17:40:49). NU din diferenţa până la „acum": aceea
 * dă doar timpul scurs de la ultimul pachet şi m-a dus o dată la concluzia
 * greşită că push-ul ar fi la un minut.
 */

/** Clasele de sănătate, în ordinea gravităţii. */
export const HEALTH = {
  HEALTHY: 'healthy',
  PARTIAL: 'partial',
  SLOW: 'slow',
  STALE: 'stale',
  OFFLINE_EXPECTED: 'offline_expected',
  OFFLINE: 'offline',
  INTEGRATION_ERROR: 'integration_error',
  UNKNOWN: 'unknown'
};

/** Ordinea de sortare/afişare: întâi ce cere atenţie. */
export const HEALTH_ORDER = [
  HEALTH.INTEGRATION_ERROR, HEALTH.OFFLINE, HEALTH.PARTIAL, HEALTH.STALE,
  HEALTH.SLOW, HEALTH.UNKNOWN, HEALTH.OFFLINE_EXPECTED, HEALTH.HEALTHY
];

export const HEALTH_LABEL = {
  healthy: 'Sănătos',
  partial: 'Parţial indisponibil',
  slow: 'Întârziat',
  stale: 'Învechit',
  offline_expected: 'Oprit aşteptat',
  offline: 'Offline',
  integration_error: 'Integrare căzută',
  unknown: 'Necunoscut'
};

/** Praguri, în multipli ai intervalului aşteptat. */
export const SLOW_FACTOR = 3;
export const STALE_FACTOR = 8;

/** Mediana unei liste numerice; null dacă lista e goală. */
export function median(xs) {
  const v = (xs || []).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/**
 * Intervalul aşteptat, din intervalele dintre raportări observate.
 * Mediana, nu media: o singură pauză lungă (repornire HA, pană de reţea) ar
 * trage media în sus şi ar ascunde exact tăcerea pe care o căutăm.
 * Sub `minSamples` intervale nu întoarcem nimic — un dispozitiv abia văzut nu
 * are încă un comportament „normal" de comparat.
 */
export function expectedInterval(gapsMs, minSamples) {
  const need = minSamples === undefined ? 3 : minSamples;
  const g = (gapsMs || []).filter((x) => Number.isFinite(x) && x > 0);
  if (g.length < need) return null;
  return median(g);
}

/**
 * Transformă o serie de momente de raportare în intervale.
 * Bounded prin construcţie: primeşte deja un inel mărginit de la apelant.
 */
export function gapsFromStamps(stamps) {
  const s = (stamps || []).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const out = [];
  for (let i = 1; i < s.length; i++) {
    const d = s[i] - s[i - 1];
    if (d > 0) out.push(d);
  }
  return out;
}

export const FRESHNESS = { REAL: 'real', UNKNOWN: 'unknown' };

/**
 * Clasificarea unui dispozitiv.
 *
 * `entities`             [{ entity_id, state, lastUpdatedMs }]
 * `opts.lastCommMs`      ULTIMA COMUNICARE REALĂ (last-seen / pachet / heartbeat).
 *                        null = nu există sursă reală pentru acest dispozitiv.
 * `opts.expectedMs`      intervalul normal al acelei surse reale
 * `opts.integrationOk`   false dacă intrarea de configurare nu e `loaded`
 * `opts.offlineExpected` true dacă oprirea e legitimă (televizor în standby)
 *
 * Verdictele de vârstă (SLOW/STALE) se dau EXCLUSIV când există sursă reală.
 * `stateAgeMs` se întoarce mereu, dar e informativ — e vechimea ultimei
 * schimbări de stare, nu a ultimei comunicări, şi nu influenţează verdictul.
 */
export function classifyDevice(entities, nowMs, opts) {
  const o = opts || {};
  const list = (entities || []).filter(Boolean);
  const stamps = list.map((e) => e.lastUpdatedMs).filter((x) => Number.isFinite(x));
  const stateAgeMs = stamps.length ? nowMs - Math.max.apply(null, stamps) : null;
  const hasReal = Number.isFinite(o.lastCommMs);
  const freshness = hasReal ? FRESHNESS.REAL : FRESHNESS.UNKNOWN;
  const ageMs = hasReal ? nowMs - o.lastCommMs : null;
  const base = { freshness, ageMs, stateAgeMs };

  if (o.integrationOk === false) {
    return { ...base, health: HEALTH.INTEGRATION_ERROR, reason: 'Integrarea nu e încărcată' };
  }
  if (!list.length) {
    return { ...base, health: HEALTH.UNKNOWN, reason: 'Dispozitivul nu are entităţi' };
  }

  const unav = list.filter((e) => e.state === 'unavailable').length;
  if (unav === list.length) {
    return o.offlineExpected
      ? { ...base, health: HEALTH.OFFLINE_EXPECTED, reason: 'Oprit — aşteptat pentru acest dispozitiv' }
      : { ...base, health: HEALTH.OFFLINE, reason: 'Toate entităţile sunt indisponibile' };
  }
  if (unav > 0) {
    // NU „întârziat": asta ar fi un verdict de COMUNICARE dat din
    // disponibilitate, pe un dispozitiv care în majoritatea cazurilor n-are
    // nicio sursă de comunicare. `SLOW` şi `STALE` rămân exclusiv verdicte de
    // freshness şi sunt accesibile doar cu `freshness === REAL`.
    return { ...base, health: HEALTH.PARTIAL, reason: unav + ' din ' + list.length + ' entităţi indisponibile' };
  }

  // De aici încolo dispozitivul e disponibil. Fără sursă reală de comunicare
  // NU coborâm verdictul din vârsta stării — asta ar transforma un întrerupător
  // neatins într-o falsă alarmă.
  if (!hasReal) {
    return { ...base, health: HEALTH.HEALTHY, reason: 'Disponibil · fără sursă de ultimă comunicare' };
  }
  // Sursă reală, dar încă fără linie de bază. NU coborâm verdictul: ar însemna
  // ca un dispozitiv care ne spune când a comunicat ultima oară să arate mai
  // rău decât unul care nu ne spune nimic. Disponibilitatea rămâne semnalul
  // primar, iar lipsa liniei de bază se spune în motiv.
  if (!Number.isFinite(o.expectedMs) || o.expectedMs <= 0) {
    return { ...base, health: HEALTH.HEALTHY, reason: 'Comunică · interval normal încă nedeterminat' };
  }
  if (ageMs > o.expectedMs * STALE_FACTOR) {
    return { ...base, health: HEALTH.STALE, reason: 'Tăcere de ' + Math.round(ageMs / o.expectedMs) + '× intervalul normal' };
  }
  if (ageMs > o.expectedMs * SLOW_FACTOR) {
    return { ...base, health: HEALTH.SLOW, reason: 'Raportează mai rar decât obişnuit' };
  }
  return { ...base, health: HEALTH.HEALTHY, reason: 'Comunică în ritmul normal' };
}

/** Totalurile pentru antetul paginii. */
export function healthTotals(devices) {
  const t = { total: 0 };
  for (const k of Object.values(HEALTH)) t[k] = 0;
  for (const d of devices || []) {
    t.total++;
    if (t[d.health] !== undefined) t[d.health]++;
  }
  return t;
}

/** Vârstă în text scurt, românesc, fără zecimale inutile. */
export function fmtAge(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return s + ' s';
  const m = Math.round(s / 60);
  if (m < 60) return m + ' min';
  const h = ms / 3600000;
  if (h < 48) return (h < 10 ? String(Math.round(h * 10) / 10).replace('.', ',') : String(Math.round(h))) + ' h';
  return Math.round(h / 24) + ' zile';
}

/** Sortare pentru listă: gravitate, apoi vârstă descrescătoare, apoi nume. */
export function sortDevices(devices) {
  const rank = (h) => {
    const i = HEALTH_ORDER.indexOf(h);
    return i < 0 ? HEALTH_ORDER.length : i;
  };
  return (devices || []).slice().sort((a, b) =>
    rank(a.health) - rank(b.health) ||
    (b.ageMs || 0) - (a.ageMs || 0) ||
    String(a.name || '').localeCompare(String(b.name || ''), 'ro'));
}
