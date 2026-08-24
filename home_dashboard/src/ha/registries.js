// Registrele HA (v1.5.0) — sursa paginii „Zone".
//
// Pagina NU are sloturi proprii în catalog. Totul se derivă la execuţie din
// cele patru registre, peste WebSocket-ul deja deschis:
//   config/floor_registry/list · config/area_registry/list
//   config/device_registry/list · config/entity_registry/list
// Consecinţa care contează: mut un dispozitiv în altă zonă din HA şi pagina se
// actualizează singură, fără release. O mapare manuală ar fi cerut un release
// la fiecare mutare, plus 14 sloturi noi care s-ar fi învechit tăcut.
//
// Lanţul e entitate -> dispozitiv -> zonă -> etaj, cu o singură subtilitate:
// `area_id` setat DIRECT pe entitate are prioritate faţă de zona dispozitivului
// (aşa funcţionează şi HA). O entitate cu area_id null moşteneşte zona
// dispozitivului; una cu area_id propriu o ignoră complet pe a acestuia.
import { useEffect, useRef, useState } from 'react';
import { useHa } from './context.js';

// Evenimentele care invalidează cache-ul. `entity_registry_updated` se emite şi
// la simpla redenumire a unei entităţi, deci refetch-ul e amânat (vezi mai jos).
const EVENTS = [
  'floor_registry_updated',
  'area_registry_updated',
  'device_registry_updated',
  'entity_registry_updated'
];

// Entităţi pe care nu le arătăm niciodată într-o zonă: sunt zgomot de registru,
// nu lucruri din cameră.
const DOMENII_ASCUNSE = ['update', 'device_tracker', 'person', 'zone', 'tag', 'conversation', 'stt', 'tts'];

/** Ordinea etajelor: după `level`, apoi alfabetic la egalitate. */
export function sortFloors(floors) {
  return (floors || []).slice().sort((a, b) => {
    const la = a.level === null || a.level === undefined ? 9999 : a.level;
    const lb = b.level === null || b.level === undefined ? 9999 : b.level;
    if (la !== lb) return la - lb;
    return String(a.name || '').localeCompare(String(b.name || ''), 'ro');
  });
}

/**
 * Construieşte structura etaj -> zone -> entităţi din cele patru registre.
 * Pură, ca să fie testabilă fără HA. `states` e folosit doar ca filtru: o
 * entitate din registru care nu e în state machine (dezactivată) nu se arată.
 */
export function buildZones(reg, states) {
  const { floors, areas, devices, entities } = reg;
  const devArea = {};
  for (const d of devices || []) devArea[d.id] = d.area_id || null;

  // entitate -> zonă, cu prioritate pe area_id-ul entităţii
  const perArea = {};
  for (const e of entities || []) {
    if (e.disabled_by) continue;
    if (e.hidden_by) continue;
    const dom = String(e.entity_id || '').split('.')[0];
    if (DOMENII_ASCUNSE.indexOf(dom) >= 0) continue;
    if (states && !states[e.entity_id]) continue;
    const area = e.area_id !== null && e.area_id !== undefined ? e.area_id : devArea[e.device_id];
    if (!area) continue; // infrastructura fără zonă — vezi comentariul din Zone.jsx
    (perArea[area] = perArea[area] || []).push(e.entity_id);
  }

  const areaById = {};
  for (const a of areas || []) areaById[a.area_id] = a;

  const out = [];
  for (const f of sortFloors(floors)) {
    const zone = (areas || [])
      .filter((a) => a.floor_id === f.floor_id)
      .map((a) => ({ id: a.area_id, name: a.name, icon: a.icon, entities: perArea[a.area_id] || [] }))
      .sort((x, y) => String(x.name).localeCompare(String(y.name), 'ro'));
    if (zone.length) out.push({ id: f.floor_id, name: f.name, icon: f.icon, level: f.level, zone });
  }
  // Zonele fără etaj: nu le pierdem, dar nici nu inventăm un etaj pentru ele.
  const orfane = (areas || [])
    .filter((a) => !a.floor_id || !out.some((fl) => fl.id === a.floor_id))
    .map((a) => ({ id: a.area_id, name: a.name, icon: a.icon, entities: perArea[a.area_id] || [] }))
    .sort((x, y) => String(x.name).localeCompare(String(y.name), 'ro'));
  if (orfane.length) out.push({ id: '__fara_etaj', name: 'Fără etaj', icon: null, level: null, zone: orfane });

  void areaById;
  return out;
}

/**
 * Citeşte cele patru registre şi le reîmprospătează când HA le modifică.
 * Întoarce { reg, etaje, loading, error }.
 */
export function useRegistries(enabled) {
  const { sendMessagePromise, subscribeMessage, connected, states } = useHa();
  const [reg, setReg] = useState(null);
  const [state, setState] = useState({ loading: false, error: null });
  const [tick, setTick] = useState(0);
  const timerRef = useRef(null);
  const reqRef = useRef(0);

  // Se armează la prima intrare pe pagina „Zone" şi rămâne armat: cele patru
  // liste nu se cer la fiecare pornire a aplicaţiei (tabletele deschid Acasă),
  // dar nici nu se aruncă la fiecare ieşire de pe pagină.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (enabled && !armed) setArmed(true);
  }, [enabled, armed]);
  const activ = connected && armed;

  // fetch
  useEffect(() => {
    if (!activ) {
      setReg(null);
      setState({ loading: false, error: null });
      return undefined;
    }
    let cancelled = false;
    const myReq = ++reqRef.current;
    setState({ loading: true, error: null });

    Promise.all([
      sendMessagePromise({ type: 'config/floor_registry/list' }),
      sendMessagePromise({ type: 'config/area_registry/list' }),
      sendMessagePromise({ type: 'config/device_registry/list' }),
      sendMessagePromise({ type: 'config/entity_registry/list' })
    ])
      .then(([floors, areas, devices, entities]) => {
        if (cancelled || myReq !== reqRef.current) return;
        setReg({ floors, areas, devices, entities });
        setState({ loading: false, error: null });
      })
      .catch((e) => {
        if (cancelled || myReq !== reqRef.current) return;
        // Cele patru comenzi cer utilizator admin. Dacă tokenul nu e de admin,
        // mesajul HA e „unauthorized" — îl arătăm ca atare, nu ca pagină goală.
        setState({ loading: false, error: (e && (e.message || e.code)) || 'necunoscută' });
      });

    return () => { cancelled = true; };
  }, [activ, sendMessagePromise, tick]);

  // invalidare la modificări în HA (debounce 1,5s: o mutare în UI-ul HA emite
  // mai multe evenimente la rând, iar patru liste refăcute de fiecare dată ar
  // fi risipă pe o tabletă)
  useEffect(() => {
    if (!activ) return undefined;
    const unsubs = [];
    const bump = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setTick((t) => t + 1), 1500);
    };
    for (const ev of EVENTS) {
      try {
        const p = subscribeMessage(bump, { type: 'subscribe_events', event_type: ev });
        unsubs.push(p);
      } catch (e) { /* o subscriere pierdută nu justifică pagină goală */ }
    }
    return () => {
      clearTimeout(timerRef.current);
      for (const p of unsubs) {
        Promise.resolve(p).then((u) => { if (typeof u === 'function') u(); }).catch(() => {});
      }
    };
  }, [activ, subscribeMessage]);

  const etaje = reg ? buildZones(reg, states) : null;
  return { reg, etaje, loading: state.loading, error: state.error };
}
