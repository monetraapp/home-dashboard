import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  callService as haCallService,
  ERR_INVALID_AUTH,
  ERR_CANNOT_CONNECT
} from 'home-assistant-js-websocket';
import { loadConfig, saveConfig, clearConfig, loadMap, saveMap } from './store.js';
import { seedSuggestions } from './slots.js';
import { HaContext } from './context.js';

const PENDING_MS = 4000;

export function HaProvider({ children }) {
  const [config, setConfigState] = useState(() => loadConfig());
  const [status, setStatus] = useState(config ? 'connecting' : 'unconfigured');
  const [error, setError] = useState(null);
  const [states, setStates] = useState({});
  const [entityMap, setEntityMapState] = useState(() => loadMap());
  const [lastCallError, setLastCallErrorRaw] = useState(null);
  const [retryTick, setRetryTick] = useState(0);
  const connRef = useRef(null);
  const seededRef = useRef(false);
  // Observabilitate WebSocket: fara contor, "conexiunea e sanatoasa" ar fi o
  // afirmatie fara martor. Numaram caderile si retinem momentul ultimei
  // conectari reusite; ambele se vad pe pagina Dispozitive.
  const [wsStats, setWsStats] = useState({ caderi: 0, reconectari: 0, de_la: null });
  const callErrTimer = useRef(null);

  // v1.1.9: lastCallError se curăţa DOAR la o comandă ulterioară reuşită sau
  // la închiderea manuală — o eroare tranzitorie lăsa banda pe ecran la
  // nesfârşit (bug găsit investigând banda din audit). Acum expiră singură
  // după 12s şi se şterge şi la revenirea conexiunii (listener 'ready').
  const setLastCallError = useCallback((msg) => {
    if (callErrTimer.current) clearTimeout(callErrTimer.current);
    callErrTimer.current = null;
    setLastCallErrorRaw(msg);
    if (msg) {
      callErrTimer.current = setTimeout(() => {
        setLastCallErrorRaw(null);
        callErrTimer.current = null;
      }, 12000);
    }
  }, []);
  useEffect(() => () => { if (callErrTimer.current) clearTimeout(callErrTimer.current); }, []);

  // Ultima temperatură-ţintă non-null văzută pentru fiecare entitate climate.
  // Unele integrări (LG ThinQ) raportează temperature:null cât timp unitatea e
  // oprită; păstrăm ultima valoare cunoscută (persistată în localStorage) şi o
  // afişăm estompat. Dacă nu avem nimic în sesiune/localStorage, încercăm o
  // singură dată istoricul HA (history_during_period).
  const [lastTargets, setLastTargets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hd.ha.lastTargets')) || {};
    } catch {
      return {};
    }
  });
  const historyTriedRef = useRef({});
  useEffect(() => {
    const next = {};
    let changed = false;
    Object.keys(states).forEach((id) => {
      if (id.indexOf('climate.') !== 0) return;
      const t = parseFloat(states[id].attributes && states[id].attributes.temperature);
      if (Number.isFinite(t) && lastTargets[id] !== t) {
        next[id] = t;
        changed = true;
      }
    });
    if (!changed) return;
    const merged = Object.assign({}, lastTargets, next);
    setLastTargets(merged);
    try {
      localStorage.setItem('hd.ha.lastTargets', JSON.stringify(merged));
    } catch {
      /* ignore */
    }
  }, [states, lastTargets]);
  useEffect(() => {
    const conn = connRef.current;
    if (!conn || status !== 'connected') return;
    Object.keys(states).forEach((id) => {
      if (id.indexOf('climate.') !== 0) return;
      const t = parseFloat(states[id].attributes && states[id].attributes.temperature);
      if (Number.isFinite(t) || lastTargets[id] !== undefined || historyTriedRef.current[id]) return;
      historyTriedRef.current[id] = true;
      const end = new Date();
      const start = new Date(end.getTime() - 7 * 24 * 3600 * 1000);
      conn
        .sendMessagePromise({
          type: 'history/history_during_period',
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          entity_ids: [id],
          significant_changes_only: false,
          minimal_response: false,
          no_attributes: false
        })
        .then((res) => {
          const rows = (res && res[id]) || [];
          for (let i = rows.length - 1; i >= 0; i--) {
            const v = parseFloat(rows[i].a && rows[i].a.temperature);
            if (Number.isFinite(v)) {
              setLastTargets((prev) => {
                const m = Object.assign({}, prev, { [id]: v });
                try { localStorage.setItem('hd.ha.lastTargets', JSON.stringify(m)); } catch { /* ignore */ }
                return m;
              });
              return;
            }
          }
        })
        .catch(() => { /* fără istoric — rămâne "—" */ });
    });
  }, [states, status, lastTargets]);

  // Receipts pentru cronometrele LG trimise prin bridge-ul lg_thinq_timers.
  // WRITE-ONLY: nu reprezintă stare confirmată de LG, doar faptul că HA a
  // acceptat comanda. Max 3 intrări, fără istoric nelimitat (v1.5.4).
  const [lastSentTimers, setLastSentTimers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hd.ha.lastSentTimers')) || {};
    } catch {
      return {};
    }
  });
  const rememberSentTimer = useCallback((entityId, receipt) => {
    setLastSentTimers((prev) => {
      const next = Object.assign({}, prev);
      if (receipt === null || receipt === undefined) delete next[entityId];
      else next[entityId] = receipt;
      const bounded = Object.keys(next)
        .sort((a, b) => (next[b].ts || 0) - (next[a].ts || 0))
        .slice(0, 3)
        .reduce((acc, k) => { acc[k] = next[k]; return acc; }, {});
      try {
        localStorage.setItem('hd.ha.lastSentTimers', JSON.stringify(bounded));
      } catch {
        /* ignore */
      }
      return bounded;
    });
  }, []);

  // valori "optimiste" pentru comenzi trimise dar neconfirmate încă de HA
  const [pending, setPending] = useState({});
  const pendingTimers = useRef({});

  const setConfig = useCallback((url, token) => {
    saveConfig(url, token);
    setConfigState(loadConfig());
    setError(null);
    setStatus('connecting');
  }, []);

  const resetConfig = useCallback(() => {
    if (connRef.current) {
      try {
        connRef.current.close();
      } catch {
        /* ignore */
      }
      connRef.current = null;
    }
    clearConfig();
    setConfigState(null);
    setStates({});
    setStatus('unconfigured');
    setError(null);
  }, []);

  /** Reîncearcă manual conexiunea, fără să şteargă datele salvate. */
  const retry = useCallback(() => {
    setError(null);
    setStatus('connecting');
    setRetryTick((n) => n + 1);
  }, []);

  const setEntityMap = useCallback((next) => {
    saveMap(next);
    setEntityMapState(next);
  }, []);

  // ---------------------------------------------------------------- conexiune
  useEffect(() => {
    if (!config) {
      setStatus('unconfigured');
      return undefined;
    }
    let disposed = false;
    let unsubEntities = null;
    let conn = null;

    setStatus('connecting');
    setError(null);

    (async () => {
      try {
        const auth = createLongLivedTokenAuth(config.url, config.token);
        conn = await createConnection({ auth });
        if (disposed) {
          conn.close();
          return;
        }
        connRef.current = conn;
        setStatus('connected');
        setWsStats((w) => ({ ...w, de_la: Date.now() }));

        conn.addEventListener('ready', () => {
          if (!disposed) {
            setStatus('connected');
            setWsStats((w) => ({ caderi: w.caderi, reconectari: w.reconectari + 1, de_la: Date.now() }));
            // reconectare reuşită — o eroare de comandă din timpul căderii e stală
            setLastCallError(null);
          }
        });
        conn.addEventListener('disconnected', () => {
          if (!disposed) {
            setStatus('disconnected');
            setWsStats((w) => ({ ...w, caderi: w.caderi + 1 }));
          }
        });
        conn.addEventListener('reconnect-error', () => {
          if (!disposed) {
            setStatus('error');
            setError('Reconectare eşuată — token invalid sau HA indisponibil.');
          }
        });

        unsubEntities = subscribeEntities(conn, (newStates) => {
          if (!disposed) setStates(newStates);
        });
      } catch (err) {
        if (disposed) return;
        connRef.current = null;
        if (err === ERR_INVALID_AUTH) {
          setStatus('auth-error');
          setError('Token invalid sau expirat. Generează un Long-Lived Access Token nou în HA → Profil → Securitate.');
        } else if (err === ERR_CANNOT_CONNECT) {
          setStatus('error');
          setError('Nu mă pot conecta la ' + config.url + '. Verifică adresa, portul şi că eşti în aceeaşi reţea.');
        } else {
          setStatus('error');
          setError('Eroare de conexiune: ' + (err && err.message ? err.message : String(err)));
        }
      }
    })();

    return () => {
      disposed = true;
      if (unsubEntities) unsubEntities();
      if (conn) {
        try {
          conn.close();
        } catch {
          /* ignore */
        }
      }
      connRef.current = null;
    };
  }, [config, retryTick]);

  // Auto-completează sugestiile date de utilizator, o singură dată per sesiune,
  // și doar pentru entităţile care chiar există.
  useEffect(() => {
    if (seededRef.current) return;
    if (status !== 'connected') return;
    if (!states || Object.keys(states).length === 0) return;
    seededRef.current = true;
    const { map, added } = seedSuggestions(entityMap, states);
    if (added > 0) setEntityMap(map);
  }, [status, states, entityMap, setEntityMap]);

  // ------------------------------------------------- marcaj de comandă în zbor
  // `lastUpdatedLaTrimitere` reţine ce ştia HA despre entitate în momentul
  // comenzii. Când valoarea se schimbă, HA are un adevăr proaspăt şi marcajul
  // nu mai are ce căuta — se stinge, indiferent dacă rezultatul e cel cerut.
  // Comparăm ŞIRURI, nu ceasuri: o diferenţă de ceas între PC şi HA ar fi făcut
  // o comparaţie temporală să greşească tăcut.
  const lastUpdatedLaTrimitere = useRef({});

  // Oglindă a stărilor pentru `markPending`, care e un useCallback cu deps [].
  // Citirea directă a lui `states` de acolo ar fi fost o închidere învechită:
  // ar fi văzut mereu starea de la primul render.
  const statesRef = useRef({});
  useEffect(() => { statesRef.current = states; }, [states]);

  const markPending = useCallback((key, value) => {
    setPending((p) => {
      const n = Object.assign({}, p);
      if (value === undefined) {
        delete n[key];
      } else {
        n[key] = value;
      }
      return n;
    });
    if (pendingTimers.current[key]) clearTimeout(pendingTimers.current[key]);
    if (value === undefined) {
      delete pendingTimers.current[key];
      delete lastUpdatedLaTrimitere.current[key];
      return;
    }
    if (key.indexOf('onoff:') === 0) {
      const id = key.slice(6);
      const st = statesRef.current && statesRef.current[id];
      lastUpdatedLaTrimitere.current[key] = st ? st.last_updated : null;
    }
    pendingTimers.current[key] = setTimeout(() => {
      setPending((p) => {
        const n = Object.assign({}, p);
        delete n[key];
        return n;
      });
      delete pendingTimers.current[key];
      delete lastUpdatedLaTrimitere.current[key];
    }, PENDING_MS);
  }, []);

  useEffect(
    () => () => {
      Object.values(pendingTimers.current).forEach(clearTimeout);
      pendingTimers.current = {};
    },
    []
  );

  // Reconciliere: din clipa în care HA publică o stare nouă pentru entitate,
  // marcajul de comandă în zbor se stinge. Fără asta, controlul rămânea marcat
  // „în lucru" până la expirarea cronometrului, chiar şi după ce rezultatul
  // sosise — un al doilea fel de a arăta altceva decât realitatea.
  useEffect(() => {
    const chei = Object.keys(pending).filter((k) => k.indexOf('onoff:') === 0);
    if (!chei.length) return;
    const deStins = chei.filter((k) => {
      const st = states[k.slice(6)];
      if (!st) return false;
      const laTrimitere = lastUpdatedLaTrimitere.current[k];
      return laTrimitere !== undefined && st.last_updated !== laTrimitere;
    });
    if (!deStins.length) return;
    for (const k of deStins) {
      clearTimeout(pendingTimers.current[k]);
      delete pendingTimers.current[k];
      delete lastUpdatedLaTrimitere.current[k];
    }
    setPending((p) => {
      const n = Object.assign({}, p);
      for (const k of deStins) delete n[k];
      return n;
    });
  }, [states, pending]);

  // --------------------------------------------------------------- servicii
  const callService = useCallback(
    async (domain, service, data, target) => {
      const conn = connRef.current;
      if (!conn) {
        setLastCallError('Nu sunt conectat la Home Assistant — comanda nu a fost trimisă.');
        return false;
      }
      try {
        await haCallService(conn, domain, service, data || {}, target);
        setLastCallError(null);
        return true;
      } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        setLastCallError(domain + '.' + service + ': ' + msg);
        console.error('callService a eşuat', domain, service, data, err);
        return false;
      }
    },
    []
  );

  const sendMessagePromise = useCallback(async (msg) => {
    const conn = connRef.current;
    if (!conn) throw new Error('Neconectat');
    return conn.sendMessagePromise(msg);
  }, []);

  /**
   * Apel de serviciu cu receipt (return_response). Returnează receipt-ul real
   * ({command_sent, timestamp, ...}) sau aruncă eroarea HA — folosit de bridge-ul
   * lg_thinq_timers pentru feedback onest, fără state inventat (v1.5.4).
   */
  const callServiceWithResponse = useCallback(async (domain, service, data) => {
    const conn = connRef.current;
    if (!conn) throw new Error('Nu sunt conectat la Home Assistant');
    const res = await conn.sendMessagePromise({
      id: Date.now(),
      type: 'call_service',
      domain,
      service,
      service_data: data || {},
      return_response: true
    });
    const receipt = res && (res.response || res.result && res.result.response);
    return receipt || null;
  }, []);

  /** Abonament la un mesaj WS (ex. weather/subscribe_forecast). */
  const subscribeMessage = useCallback(async (cb, msg) => {
    const conn = connRef.current;
    if (!conn) throw new Error('Neconectat');
    return conn.subscribeMessage(cb, msg);
  }, []);

  const value = useMemo(
    () => ({
      config,
      setConfig,
      resetConfig,
      retry,
      status,
      connected: status === 'connected',
      wsStats,
      error,
      states,
      lastTargets,
      lastSentTimers,
      rememberSentTimer,
      entityMap,
      setEntityMap,
      callService,
      callServiceWithResponse,
      sendMessagePromise,
      subscribeMessage,
      pending,
      markPending,
      lastCallError,
      setLastCallError,
      clearCallError: () => setLastCallError(null)
    }),
    [
      config, setConfig, resetConfig, retry, status, error, states, wsStats, lastTargets, lastSentTimers,
      rememberSentTimer, entityMap, setEntityMap, callService, callServiceWithResponse,
      sendMessagePromise, subscribeMessage, pending, markPending, lastCallError
    ]
  );

  return <HaContext.Provider value={value}>{children}</HaContext.Provider>;
}
