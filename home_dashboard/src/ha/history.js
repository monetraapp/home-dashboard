// Istoric real din recorder-ul HA (WebSocket: history/history_during_period).
import { useEffect, useRef, useState } from 'react';
import { useHa } from './context.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export {
  lastDayLabels, dailyAverage, dailyLast, fillGaps, timelineSegments
} from './historyMath.js';

/**
 * Cere istoricul pentru o listă de entity_id-uri.
 * Întoarce { raw, loading, error } unde raw = { entity_id: [{s, lu}] }.
 */
export function useHistory(entityIds, days) {
  const { sendMessagePromise, connected } = useHa();
  const [state, setState] = useState({ raw: null, loading: false, error: null });
  const key = (entityIds || []).filter(Boolean).sort().join(',');
  const daysN = days || 7;
  const reqRef = useRef(0);

  useEffect(() => {
    if (!connected || !key) {
      setState({ raw: null, loading: false, error: null });
      return undefined;
    }
    let cancelled = false;
    const myReq = ++reqRef.current;
    setState((s) => ({ raw: s.raw, loading: true, error: null }));

    const end = new Date();
    const start = new Date(end.getTime() - daysN * DAY_MS);

    sendMessagePromise({
      type: 'history/history_during_period',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      entity_ids: key.split(','),
      minimal_response: true,
      no_attributes: true,
      significant_changes_only: false
    })
      .then((res) => {
        if (cancelled || myReq !== reqRef.current) return;
        setState({ raw: res || {}, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled || myReq !== reqRef.current) return;
        setState({
          raw: null,
          loading: false,
          error: err && err.message ? err.message : 'Istoricul nu a putut fi citit (recorder indisponibil?)'
        });
      });

    return () => {
      cancelled = true;
    };
  }, [key, daysN, connected, sendMessagePromise]);

  return state;
}

/**
 * Statistici pe termen lung (v1.1.5): recorder/statistics_during_period.
 * Spre deosebire de history, statisticile sunt agregate orar/zilnic/lunar de
 * HA şi supravieţuiesc epurării recorder-ului — sursa pentru Săptămână/Lună/An.
 * Doar entităţile cu state_class au statistici; restul întorc liste goale,
 * iar UI-ul afişează "—".
 * Întoarce { stats, loading, error } — stats = { statistic_id: [rânduri] }.
 */
export function useStatistics(statisticIds, startMs, endMs, period, types) {
  // (v2.8.0) `types` e optional si pastreaza vechiul comportament cand lipseste.
  // Graficele de putere si tensiune au nevoie si de min/max, pe care HA le
  // agrega deja pe fiecare interval - nu le recalculam noi din puncte brute.
  const tipuri = types && types.length ? types : ['sum', 'mean'];
  const { sendMessagePromise, connected } = useHa();
  const [state, setState] = useState({ stats: null, loading: false, error: null });
  const key = (statisticIds || []).filter(Boolean).sort().join(',') + '|' + startMs + '|' + endMs + '|' + period + '|' + tipuri.join(',');
  const reqRef = useRef(0);

  useEffect(() => {
    if (!connected || !statisticIds || !statisticIds.length) {
      setState({ stats: null, loading: false, error: null });
      return undefined;
    }
    let cancelled = false;
    const myReq = ++reqRef.current;
    setState((s) => ({ stats: s.stats, loading: true, error: null }));

    sendMessagePromise({
      type: 'recorder/statistics_during_period',
      start_time: new Date(startMs).toISOString(),
      end_time: new Date(endMs).toISOString(),
      statistic_ids: statisticIds.filter(Boolean),
      period: period,
      types: tipuri
    })
      .then((res) => {
        if (cancelled || myReq !== reqRef.current) return;
        setState({ stats: res || {}, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled || myReq !== reqRef.current) return;
        setState({
          stats: null,
          loading: false,
          error: err && err.message ? err.message : 'Statisticile nu au putut fi citite'
        });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, connected, sendMessagePromise]);

  return state;
}

