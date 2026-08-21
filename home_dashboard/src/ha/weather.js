// Vreme: stare curentă + prognoză zilnică prin weather/subscribe_forecast
// (cu revenire la attributes.forecast pentru instalări HA mai vechi).
import { useEffect, useState } from 'react';
import { useHa } from './context.js';

export const COND_RO = {
  'clear-night': 'Senin',
  cloudy: 'Înnorat',
  fog: 'Ceaţă',
  hail: 'Grindină',
  lightning: 'Furtună',
  'lightning-rainy': 'Furtună cu ploaie',
  partlycloudy: 'Parţial înnorat',
  pouring: 'Ploaie torenţială',
  rainy: 'Ploios',
  snowy: 'Ninsoare',
  'snowy-rainy': 'Lapoviţă',
  sunny: 'Însorit',
  windy: 'Vânt',
  'windy-variant': 'Vânt',
  exceptional: 'Excepţional'
};

export const COND_ICON = {
  'clear-night': 'moon',
  cloudy: 'cloud',
  fog: 'cloud',
  hail: 'cloud',
  lightning: 'cloud',
  'lightning-rainy': 'cloud',
  partlycloudy: 'cloudSun',
  pouring: 'droplet',
  rainy: 'droplet',
  snowy: 'snow',
  'snowy-rainy': 'snow',
  sunny: 'sun',
  windy: 'wind',
  'windy-variant': 'wind',
  exceptional: 'alertTri'
};

const ZI = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];

/** Prognoza zilnică pentru o entitate weather. */
export function useDailyForecast(entityId) {
  const { subscribeMessage, connected, states } = useHa();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!connected || !entityId) {
      setItems([]);
      return undefined;
    }
    let cancelled = false;
    let unsub = null;

    subscribeMessage(
      (msg) => {
        if (!cancelled && msg && Array.isArray(msg.forecast)) setItems(msg.forecast);
      },
      { type: 'weather/subscribe_forecast', forecast_type: 'daily', entity_id: entityId }
    )
      .then((fn) => {
        if (cancelled && typeof fn === 'function') fn();
        else unsub = fn;
      })
      .catch(() => {
        // HA mai vechi: prognoza vine ca atribut
        const st = states[entityId];
        if (!cancelled && st && Array.isArray(st.attributes.forecast)) setItems(st.attributes.forecast);
      });

    return () => {
      cancelled = true;
      if (typeof unsub === 'function') unsub();
    };
    // states este intenţionat exclus: ne-ar reabona la fiecare update de stare
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, connected, subscribeMessage]);

  return items;
}

/** Formatează prognoza pentru rândul de 6 zile din card. */
export function formatForecast(list, count) {
  const out = [];
  (list || []).slice(0, count || 6).forEach((f) => {
    const d = f.datetime ? new Date(f.datetime) : null;
    const t = f.temperature !== undefined && f.temperature !== null ? Math.round(f.temperature) : null;
    out.push({
      day: d ? ZI[d.getDay()] : '—',
      temp: t === null ? '—' : t + '°',
      icon: COND_ICON[f.condition] || 'cloud'
    });
  });
  return out;
}
