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
import {
  alege, probeaza, meritaRevenire, textConexiune, TIMEOUT_LOCAL, INTERVAL_REVENIRE, GRATIE_CADERE
} from './endpoint.js';
import {
  CMD, creeaza, evalueaza, marcheazaAcceptat, marcheazaEsec, eInZbor, eTerminala,
  cheieComanda, textExpirat
} from './commandState.js';
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

  const setConfig = useCallback((url, token, urlRemote) => {
    saveConfig(url, token, urlRemote);
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

  // ------------------------------------------------- alegerea căii către HA
  //
  // Aplicaţia nu mai are „un URL". Are două căi şi o politică: întâi LAN-ul, cu
  // răbdare scurtă, apoi tunelul. Utilizatorul nu schimbă nimic cu mâna.
  //
  // Proba nu e `navigator.onLine` — acela spune doar că există o interfaţă de
  // reţea. Proba e handshake-ul real de autentificare pe WebSocket: dacă vine
  // `auth_ok`, calea e bună. Sonda se închide imediat, nu lasă conexiuni în urmă.
  const [cale, setCale] = useState(null);          // { tip, url } | null
  const [caleMasuri, setCaleMasuri] = useState([]); // duratele ultimei alegeri
  const caleRef = useRef(null);
  const alegeInCurs = useRef(false);
  useEffect(() => { caleRef.current = cale; }, [cale]);

  /**
   * Rulează politica şi comută dacă rezultatul diferă de calea curentă.
   * `motiv` ajunge în diagnostic; nu inventăm o cale „probabilă" — dacă niciuna
   * nu răspunde, rămânem fără cale şi ecranul de conectare îşi face treaba.
   */
  const alegeCale = useCallback(async (opts) => {
    if (!config || alegeInCurs.current) return null;
    alegeInCurs.current = true;
    try {
      const r = await alege(config, probeaza, opts);
      setCaleMasuri(r.incercari);
      const curent = caleRef.current;
      if (r.ales) {
        if (!curent || curent.url !== r.url) setCale({ tip: r.ales, url: r.url });
      } else if (curent) {
        setCale(null);
      }
      return r;
    } finally {
      alegeInCurs.current = false;
    }
  }, [config]);

  // La pornire şi la orice schimbare de configuraţie.
  useEffect(() => {
    if (!config) { setCale(null); return; }
    alegeCale();
  }, [config, alegeCale]);

  // Revenirea în LAN: rar, şi în momentele în care chiar se schimbă ceva.
  // NU e un ping continuu — pe date mobile ar fi exact ce nu vrem.
  useEffect(() => {
    if (!config || !cale || cale.tip !== 'remote') return undefined;
    if (!config.urlLocal) return undefined;
    let viu = true;
    const incearca = async () => {
      if (!viu) return;
      const ok = await probeaza(config.urlLocal, config.token, TIMEOUT_LOCAL);
      if (viu && meritaRevenire(caleRef.current && caleRef.current.tip, ok)) {
        setCale({ tip: 'local', url: config.urlLocal });
      }
    };
    const t = setInterval(incearca, INTERVAL_REVENIRE);
    const laRetea = () => incearca();
    const laVizibil = () => { if (document.visibilityState === 'visible') incearca(); };
    window.addEventListener('online', laRetea);
    document.addEventListener('visibilitychange', laVizibil);
    return () => {
      viu = false;
      clearInterval(t);
      window.removeEventListener('online', laRetea);
      document.removeEventListener('visibilitychange', laVizibil);
    };
  }, [config, cale]);

  // ---------------------------------------------------------------- conexiune
  useEffect(() => {
    if (!config) {
      setStatus('unconfigured');
      return undefined;
    }
    // Fără cale confirmată nu deschidem nimic: n-are rost să încercăm o adresă
    // despre care tocmai am aflat că nu răspunde.
    if (!cale) {
      setStatus('connecting');
      return undefined;
    }
    let disposed = false;
    let unsubEntities = null;
    let conn = null;
    let cronFailover = null;

    setStatus('connecting');
    setError(null);

    (async () => {
      try {
        const auth = createLongLivedTokenAuth(cale.url, config.token);
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
          if (disposed) return;
          setStatus('disconnected');
          setWsStats((w) => ({ ...w, caderi: w.caderi + 1 }));
          // FAILOVER. Biblioteca reîncearcă singură ACEEAŞI adresă, ceea ce e
          // exact ce trebuie pentru o pâlpâire de reţea. Dar dacă am plecat de
          // acasă, LAN-ul nu mai revine niciodată, iar reîncercarea ar putea
          // dura la nesfârşit. După o scurtă graţie, rulăm din nou politica: dacă
          // celaltă cale răspunde, comutăm — fără reîncărcare manuală.
          clearTimeout(cronFailover);
          cronFailover = setTimeout(() => {
            if (!disposed) alegeCale();
          }, GRATIE_CADERE);
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
          setError('Nu mă pot conecta la ' + cale.url + '. Verifică adresa, portul şi că eşti în aceeaşi reţea.');
        } else {
          setStatus('error');
          setError('Eroare de conexiune: ' + (err && err.message ? err.message : String(err)));
        }
      }
    })();

    return () => {
      disposed = true;
      clearTimeout(cronFailover);
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
  }, [config, cale, retryTick, alegeCale]);

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

  // ------------------------------ ecou local pentru valorile continue
  // Pentru temperatură ţintă, volum şi number, valoarea afişată e SELECŢIA
  // UTILIZATORULUI, nu o stare pretinsă a aparatului: fără ecou, butoanele +/−
  // ar fi inutilizabile şi apăsările succesive n-ar mai putea acumula.
  // Pornit/oprit NU mai trece pe aici — are registrul de comenzi de mai jos.
  const markPending = useCallback((key, value) => {
    setPending((p) => {
      const n = Object.assign({}, p);
      if (value === undefined) delete n[key];
      else n[key] = value;
      return n;
    });
    if (pendingTimers.current[key]) clearTimeout(pendingTimers.current[key]);
    if (value === undefined) { delete pendingTimers.current[key]; return; }
    pendingTimers.current[key] = setTimeout(() => {
      setPending((p) => {
        const n = Object.assign({}, p);
        delete n[key];
        return n;
      });
      delete pendingTimers.current[key];
    }, PENDING_MS);
  }, []);

  useEffect(
    () => () => {
      Object.values(pendingTimers.current).forEach(clearTimeout);
      pendingTimers.current = {};
    },
    []
  );

  // ------------------------------------------------------- registru de comenzi
  //
  // Un singur strat generic pentru TOATE comenzile discrete (pornire/oprire),
  // indiferent de card sau de familie. Cheia e `entity_id|acţiune`, iar intrarea
  // se şterge când ajunge într-o stare terminală — registrul nu creşte.
  //
  // Starea reală a aparatului rămâne cea din HA. Registrul spune doar atât:
  // „am trimis o comandă şi încă nu ştiu dacă a ajuns".
  const [comenzi, setComenzi] = useState({});
  const comenziRef = useRef({});
  const comenziTimers = useRef({});

  // Oglindă a stărilor: `porneste` e un useCallback cu deps [], iar citirea
  // directă a lui `states` de acolo ar fi o închidere învechită — ar vedea mereu
  // starea de la primul render.
  const statesRef = useRef({});
  useEffect(() => { statesRef.current = states; }, [states]);

  const scrieComanda = useCallback((cheie, cmd) => {
    if (cmd === null) {
      delete comenziRef.current[cheie];
    } else {
      comenziRef.current[cheie] = cmd;
    }
    setComenzi(Object.assign({}, comenziRef.current));
  }, []);

  const inchideComanda = useCallback((cheie, cmd) => {
    if (comenziTimers.current[cheie]) {
      clearTimeout(comenziTimers.current[cheie]);
      delete comenziTimers.current[cheie];
    }
    scrieComanda(cheie, null);
    if (cmd && cmd.status === CMD.EXPIRAT) setLastCallError(textExpirat(cmd));
  }, [scrieComanda]);

  /**
   * Porneşte o comandă discretă. `exec` face apelul real şi întoarce true/false.
   * Întoarce false dacă exact aceeaşi comandă e deja în zbor — aşa nu plecă
   * cinci comenzi identice dintr-o apăsare nervoasă. Alte funcţii ale aceluiaşi
   * aparat rămân disponibile: blocăm perechea entitate+acţiune, nu aparatul.
   */
  const porneste = useCallback(({ entityId, actiune, tinta, exec }) => {
    const cheie = cheieComanda(entityId, actiune);
    if (eInZbor(comenziRef.current[cheie])) return false;

    const st = statesRef.current && statesRef.current[entityId];
    const cmd = creeaza({
      entityId, actiune, tinta,
      lastUpdated: st ? st.last_updated : null,
      acum: Date.now()
    });
    scrieComanda(cheie, cmd);

    comenziTimers.current[cheie] = setTimeout(() => {
      const c = comenziRef.current[cheie];
      if (!eInZbor(c)) return;
      inchideComanda(cheie, { ...c, status: CMD.EXPIRAT });
    }, cmd.fereastra);

    Promise.resolve()
      .then(exec)
      .then((ok) => {
        const c = comenziRef.current[cheie];
        if (!eInZbor(c)) return;
        if (ok === false) {
          // Eroarea reală e deja pusă pe bandă de `callService`. Închidem PE LOC,
          // fără să aşteptăm fereastra: eşecul e deja cunoscut.
          inchideComanda(cheie, marcheazaEsec(c, 'apel respins'));
        } else {
          scrieComanda(cheie, marcheazaAcceptat(c));
        }
      })
      .catch(() => {
        const c = comenziRef.current[cheie];
        if (eInZbor(c)) inchideComanda(cheie, marcheazaEsec(c, 'excepţie la apel'));
      });
    return true;
  }, [scrieComanda, inchideComanda]);

  // Confirmarea: la fiecare stare nouă publicată de HA, reevaluăm comenzile în
  // zbor. `evalueaza` cere şi publicare nouă, şi potrivire cu ţinta — o stare
  // veche care se întâmplă să fie deja ţinta NU confirmă nimic.
  useEffect(() => {
    const chei = Object.keys(comenziRef.current);
    if (!chei.length) return;
    const acum = Date.now();
    for (const cheie of chei) {
      const c = comenziRef.current[cheie];
      if (!eInZbor(c)) continue;
      const nou = evalueaza(c, states[c.entityId], acum);
      if (nou.status !== c.status) {
        if (eTerminala(nou.status)) inchideComanda(cheie, nou);
        else scrieComanda(cheie, nou);
      }
    }
  }, [states, inchideComanda, scrieComanda]);

  useEffect(
    () => () => {
      Object.values(comenziTimers.current).forEach(clearTimeout);
      comenziTimers.current = {};
      comenziRef.current = {};
    },
    []
  );

  /** Comanda în zbor pentru o entitate, sau null. */
  const comandaPentru = useCallback(
    (entityId, actiune) => {
      const c = comenzi[cheieComanda(entityId, actiune || 'power')];
      return eInZbor(c) ? c : null;
    },
    [comenzi]
  );

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

  // ----------------------------------------------- coalescare pe valori continue
  //
  // MASURAT pe AC Mansarda Vortex (aux_cloud), 26.08: cinci apasari rapide pe
  // „+" trimit CINCI comenzi `set_temperature` (la 1, 139, 264, 398, 528 ms).
  // Cloud-ul AUX le serializeaza intern — durata fiecarui apel urca de la ~712 ms
  // izolat la 2.400–3.875 ms in rafala, iar valoarea finala se aseaza abia dupa
  // ~3,9 s. Aparatul isi schimba tinta de cinci ori pentru o singura intentie.
  //
  // Fereastra e trailing, 350 ms: tastarea rapida masurata e la ~130 ms intre
  // apasari, deci rafala se strange intr-o comanda, iar o apasare singura pleaca
  // dupa 350 ms — sub pragul de perceptie pentru o valoare-tinta, mai ales ca
  // numarul afisat e chiar selectia utilizatorului si se vede imediat.
  //
  // NU se aplica la ON/OFF: acolo intentia e discreta, nu continua.
  const debounceRef = useRef({});
  const callServiceRef = useRef(null);
  callServiceRef.current = callService;

  const callServiceDebounced = useCallback((key, delayMs, domain, service, data, target) => {
    const slot = debounceRef.current[key];
    if (slot) clearTimeout(slot.t);
    const trimite = () => {
      delete debounceRef.current[key];
      const fn = callServiceRef.current;
      if (fn) fn(domain, service, data, target);
    };
    debounceRef.current[key] = { t: setTimeout(trimite, delayMs), trimite };
    return true;
  }, []);

  // La demontare, ce e in asteptare se TRIMITE, nu se arunca: altfel ultima
  // apasare inainte de inchiderea paginii s-ar pierde tacut.
  useEffect(
    () => () => {
      const toate = Object.values(debounceRef.current);
      debounceRef.current = {};
      for (const x of toate) { clearTimeout(x.t); try { x.trimite(); } catch (e) { /* la inchidere */ } }
    },
    []
  );

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
      callServiceDebounced,
      callServiceWithResponse,
      sendMessagePromise,
      subscribeMessage,
      pending,
      markPending,
      porneste,
      comandaPentru,
      cale,
      caleMasuri,
      textConexiune: textConexiune(cale && cale.tip),
      lastCallError,
      setLastCallError,
      clearCallError: () => setLastCallError(null)
    }),
    [
      config, setConfig, resetConfig, retry, status, error, states, wsStats, lastTargets, lastSentTimers,
      rememberSentTimer, entityMap, setEntityMap, callService, callServiceWithResponse,
      sendMessagePromise, subscribeMessage, pending, markPending, lastCallError, callServiceDebounced,
      porneste, comandaPentru, cale, caleMasuri
    ]
  );

  return <HaContext.Provider value={value}>{children}</HaContext.Provider>;
}
