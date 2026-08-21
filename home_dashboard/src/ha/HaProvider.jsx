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
  const [lastCallError, setLastCallError] = useState(null);
  const [retryTick, setRetryTick] = useState(0);
  const connRef = useRef(null);
  const seededRef = useRef(false);

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

        conn.addEventListener('ready', () => {
          if (!disposed) setStatus('connected');
        });
        conn.addEventListener('disconnected', () => {
          if (!disposed) setStatus('disconnected');
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

  // ------------------------------------------------------------ optimistic UI
  const markPending = useCallback((key, value) => {
    setPending((p) => Object.assign({}, p, { [key]: value }));
    if (pendingTimers.current[key]) clearTimeout(pendingTimers.current[key]);
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
      error,
      states,
      entityMap,
      setEntityMap,
      callService,
      sendMessagePromise,
      subscribeMessage,
      pending,
      markPending,
      lastCallError,
      clearCallError: () => setLastCallError(null)
    }),
    [
      config, setConfig, resetConfig, retry, status, error, states, entityMap,
      setEntityMap, callService, sendMessagePromise, subscribeMessage, pending, markPending, lastCallError
    ]
  );

  return <HaContext.Provider value={value}>{children}</HaContext.Provider>;
}
