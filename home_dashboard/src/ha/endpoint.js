// Alegerea automată a căii către Home Assistant (v1.8.0) — local sau la distanţă.
//
// PROBLEMA. Aceeaşi aplicaţie e deschisă de pe o tabletă din casă şi de pe un
// telefon pe date mobile. Acasă, calea bună e adresa din LAN: fără cloud, fără
// ocol, ~10 ms. În afară, singura cale e tunelul Nabu Casa. Utilizatorul nu are
// de ce să schimbe un URL cu mâna.
//
// CUM TESTĂM DACĂ SUNTEM ACASĂ. Nu cu `navigator.onLine` — acela spune doar că
// există o interfaţă de reţea activă, nu că Home Assistant e accesibil; pe un
// telefon conectat la un Wi-Fi al vecinului ar minţi cu convingere. Testăm
// exact lucrul care contează: **deschidem un WebSocket şi ducem autentificarea
// până la capăt**. Dacă `auth_ok` vine, calea e bună. Nimic mai indirect.
//
// CE NU E ÎN ACEST FIŞIER: niciun URL. Adresa locală şi cea Nabu Casa sunt date
// ale instanţei şi trăiesc doar în configuraţia locală a browserului, alături de
// token. Repozitoriul nu le cunoaşte.

/** Etichetele arătate în diagnostic. */
export const ETICHETA = { local: 'LOCAL', remote: 'NABU CASA' };

/**
 * Cât aşteptăm pe fiecare cale înainte să renunţăm.
 *
 * LAN-ul răspunde în ~10 ms (măsurat în `33_`: apel HA acceptat în 10 ms p50,
 * REST în 8 ms). 1,2 s e de o sută de ori mai mult decât normalul — suficient
 * pentru un Wi-Fi încărcat, destul de scurt cât să nu se simtă aşteptarea când
 * suntem plecaţi şi calea locală pur şi simplu nu există.
 *
 * Tunelul are de făcut TLS plus un ocol prin cloud, deci primeşte mai mult.
 */
export const TIMEOUT_LOCAL = 1200;
export const TIMEOUT_REMOTE = 8000;

/**
 * Cât de rar căutăm LAN-ul când mergem prin tunel.
 * Deliberat rar: o sondă la două minute nu costă nimic, iar „ping agresiv"
 * pe un telefon pe date mobile ar fi exact ce nu vrem. Verificarea se face şi
 * la revenirea reţelei şi la reafişarea paginii, care sunt momentele în care
 * chiar se schimbă ceva.
 */
export const INTERVAL_REVENIRE = 120000;

/** Fereastra de graţie înainte de a considera o cădere drept motiv de comutare. */
export const GRATIE_CADERE = 2500;

/** Taie spaţiile şi slash-ul final; întoarce '' pentru orice nefolositor. */
export function normalizeaza(url) {
  if (typeof url !== 'string') return '';
  return url.trim().replace(/\/+$/, '');
}

/** http(s) -> ws(s), plus calea de WebSocket a HA. */
export function wsUrl(url) {
  const u = normalizeaza(url);
  if (!u) return '';
  return u.replace(/^http/i, (m) => (m === 'HTTP' ? 'WS' : 'ws')) + '/api/websocket';
}

/** Configuraţia e completă doar cu token şi cel puţin o cale. */
export function configValida(cfg) {
  return !!(cfg && cfg.token && (normalizeaza(cfg.urlLocal) || normalizeaza(cfg.urlRemote)));
}

/**
 * Sondă reală: deschide un WebSocket şi duce autentificarea până la `auth_ok`.
 * Se închide imediat după — sonda nu lasă în urmă o conexiune.
 * `WSImpl` se injectează în teste; în browser e `WebSocket`.
 */
export function probeaza(url, token, timeoutMs, WSImpl) {
  const adresa = wsUrl(url);
  if (!adresa || !token) return Promise.resolve(false);
  const Impl = WSImpl || (typeof WebSocket !== 'undefined' ? WebSocket : null);
  if (!Impl) return Promise.resolve(false);

  return new Promise((resolve) => {
    let terminat = false;
    let ws = null;
    let cron = null;
    const gata = (ok) => {
      if (terminat) return;
      terminat = true;
      clearTimeout(cron);
      try { if (ws) ws.close(); } catch (e) { /* deja închis */ }
      resolve(ok);
    };
    cron = setTimeout(() => gata(false), timeoutMs);
    try {
      ws = new Impl(adresa);
    } catch (e) {
      return gata(false);
    }
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.type === 'auth_required') {
        try { ws.send(JSON.stringify({ type: 'auth', access_token: token })); } catch (e) { gata(false); }
        return;
      }
      if (m.type === 'auth_ok') return gata(true);
      if (m.type === 'auth_invalid') return gata(false);
    };
    ws.onerror = () => gata(false);
    ws.onclose = () => gata(false);
    return undefined;
  });
}

/**
 * Politica de alegere: întâi local (rapid), apoi la distanţă.
 * `probe` se injectează, deci politica se testează fără reţea.
 * Întoarce şi duratele fiecărei încercări — de acolo vin cifrele din raport.
 */
export async function alege(cfg, probe, opts) {
  const o = opts || {};
  const acum = o.acum || (() => Date.now());
  const rez = { ales: null, url: null, incercari: [] };
  if (!configValida(cfg)) return rez;

  const cai = [];
  const loc = normalizeaza(cfg.urlLocal);
  const rem = normalizeaza(cfg.urlRemote);
  if (loc && o.doar !== 'remote') cai.push(['local', loc, o.timeoutLocal === undefined ? TIMEOUT_LOCAL : o.timeoutLocal]);
  if (rem && o.doar !== 'local') cai.push(['remote', rem, o.timeoutRemote === undefined ? TIMEOUT_REMOTE : o.timeoutRemote]);

  for (const [tip, url, t] of cai) {
    const t0 = acum();
    const ok = await probe(url, cfg.token, t);
    rez.incercari.push({ tip, ok, ms: acum() - t0 });
    if (ok) {
      rez.ales = tip;
      rez.url = url;
      break;
    }
  }
  return rez;
}

/**
 * Merită să ne întoarcem în LAN?
 * Doar dacă suntem pe tunel ŞI calea locală chiar răspunde. Nu comutăm pe
 * speranţă: „am văzut un Wi-Fi" nu e un motiv.
 */
export function meritaRevenire(activ, localOk) {
  return activ === 'remote' && localOk === true;
}

/** Textul read-only din diagnostic. */
export function textConexiune(activ) {
  if (activ === 'local') return ETICHETA.local;
  if (activ === 'remote') return ETICHETA.remote;
  return null;
}
