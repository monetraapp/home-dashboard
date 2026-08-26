// Programare la oră exactă pentru AC Etaj LG (v1.7.0) — logică pură.
//
// CINE E SCHEDULER-UL. Home Assistant, nu cloud-ul LG. Dashboard-ul e doar
// interfaţă: scrie în helpere prin servicii `input_*` şi citeşte înapoi ce
// spune HA. Nu converteşte ora exactă într-un cronometru relativ LG şi nu
// atinge cronometrele relative existente („Somn / Pornire / Oprire peste"),
// care rămân pe bridge-ul lg_thinq_timers.
//
// DE CE ŞAPTE BOOLEENI DE ZI, nu un şir „1,2,3". Condiţia din automatizare
// devine 100% nativă — `condition: time` cu `weekday` plus `condition: state`
// — deci e validată la încărcarea configuraţiei şi nu poate eşua tăcut pe un
// şir malformat. În plus dashboard-ul comută o zi cu un singur apel de
// serviciu, fără citeşte-modifică-scrie peste un CSV, care s-ar fi bătut cu
// el însuşi la două atingeri rapide.
//
// CE NU CALCULĂM AICI. Momentul următoarei execuţii vine din HA
// (`sensor.*_urmatoarea`, device_class timestamp). Browserul doar formatează
// un instant deja stabilit — nu decide el când rulează programarea.

/** Zilele, în ordinea în care se citesc pe ecran. `wd` = Date.getDay(). */
export const ZILE = [
  { key: 'lu', label: 'L', wd: 1 },
  { key: 'ma', label: 'Ma', wd: 2 },
  { key: 'mi', label: 'Mi', wd: 3 },
  { key: 'jo', label: 'J', wd: 4 },
  { key: 'vi', label: 'V', wd: 5 },
  { key: 'sa', label: 'S', wd: 6 },
  { key: 'du', label: 'D', wd: 0 }
];

export const REPETARE = ['O singura data', 'Zilnic', 'Zile alese'];

/** Etichetele româneşti; helperele HA păstrează varianta fără diacritice. */
export const REPETARE_LABEL = {
  'O singura data': 'O singură dată',
  Zilnic: 'Zilnic',
  'Zile alese': 'Zile alese'
};

export const MOD_LABEL = {
  'Nu schimba': 'Nu schimba',
  Racire: 'Răcire',
  Incalzire: 'Încălzire',
  Auto: 'Auto',
  Dezumidificare: 'Dezumidificare',
  Ventilatie: 'Ventilaţie'
};
export const MOD_OPTIUNI = Object.keys(MOD_LABEL);

export const VENT_LABEL = {
  'Nu schimba': 'Nu schimba',
  Auto: 'Auto',
  Scazut: 'Scăzut',
  Mediu: 'Mediu',
  Ridicat: 'Ridicat'
};
export const VENT_OPTIUNI = Object.keys(VENT_LABEL);

/** Cheia de slot pentru un câmp al unei programări. */
export const slotProg = (kind, camp) => 'prog.' + kind + '_' + camp;

/** „22:48:00" -> „22:48". Întoarce null dacă ora nu e citibilă. */
export function oraScurta(v) {
  if (typeof v !== 'string') return null;
  const m = v.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return String(m[1]).padStart(2, '0') + ':' + m[2];
}

/**
 * Textul zilelor. Compactează cele două cazuri pe care le recunoaşte oricine
 * dintr-o privire; restul se enumeră, fără să inventăm intervale.
 */
export function textZile(zile) {
  const on = ZILE.filter((z) => zile[z.key]);
  if (on.length === 0) return 'nicio zi';
  if (on.length === 7) return 'în fiecare zi';
  const chei = on.map((z) => z.key).join(',');
  if (chei === 'lu,ma,mi,jo,vi') return 'L–V';
  if (chei === 'sa,du') return 'S–D';
  return on.map((z) => z.label).join(' ');
}

/** Rezumatul repetării, aşa cum apare sub oră. */
export function textRepetare(cfg) {
  if (!cfg) return '';
  if (cfg.repeta === 'Zile alese') return textZile(cfg.zile || {});
  return REPETARE_LABEL[cfg.repeta] || cfg.repeta || '';
}

/**
 * Rezumatul setărilor opţionale de pornire: „20°C · Răcire · Auto".
 * Ce nu e ales nu apare — şi, dacă nu e nimic ales, spunem explicit că
 * nu se schimbă nimic, în loc să lăsăm un rând gol care pare o eroare.
 */
export function textSetari(cfg) {
  if (!cfg) return '';
  const p = [];
  if (cfg.tempActiv && Number.isFinite(cfg.temp)) {
    p.push(String(cfg.temp).replace('.', ',') + '°C');
  }
  if (cfg.mod && cfg.mod !== 'Nu schimba') p.push(MOD_LABEL[cfg.mod] || cfg.mod);
  if (cfg.ventilator && cfg.ventilator !== 'Nu schimba') p.push(VENT_LABEL[cfg.ventilator] || cfg.ventilator);
  return p.length ? p.join(' · ') : 'fără modificări de setări';
}

const ZI_LUNGA = ['duminică', 'luni', 'marţi', 'miercuri', 'joi', 'vineri', 'sâmbătă'];

/**
 * „joi, 22:30" dintr-un instant ISO venit de la HA.
 * Formatăm doar; momentul e deja decis de HA. `azi`/`mâine` scurtează
 * cele două cazuri în care ziua săptămânii ar fi mai greu de raportat la
 * prezent decât cuvântul însuşi.
 */
export function textUrmatoarea(iso, nowMs) {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const d = new Date(t);
  const acum = new Date(Number.isFinite(nowMs) ? nowMs : Date.now());
  const hh = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const zi0 = new Date(acum.getFullYear(), acum.getMonth(), acum.getDate()).getTime();
  const ziD = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dif = Math.round((ziD - zi0) / 86400000);
  if (dif === 0) return 'azi, ' + hh;
  if (dif === 1) return 'mâine, ' + hh;
  return ZI_LUNGA[d.getDay()] + ', ' + hh;
}

/**
 * „2026-08-26 22:48:03" -> „26.08, 22:48".
 * Valoarea implicită a unui input_datetime nescris e miezul nopţii de la
 * creare; o tratăm ca „încă nimic", ca să nu raportăm o execuţie inventată.
 */
export function textUltima(v) {
  if (typeof v !== 'string') return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return null;
  if (m[4] === '00' && m[5] === '00') return null;
  return m[3] + '.' + m[2] + ', ' + m[4] + ':' + m[5];
}

/**
 * Starea afişată a unei programări.
 * `activ` fals => „Dezactivată", fără să mai calculăm nimic altceva.
 */
export function stareProgram(cfg) {
  if (!cfg || !cfg.activ) return { activ: false, text: 'Dezactivată' };
  if (cfg.repeta === 'Zile alese' && !ZILE.some((z) => cfg.zile && cfg.zile[z.key])) {
    // Activă, dar fără nicio zi bifată: nu s-ar declanşa niciodată. Mai bine
    // spunem asta decât să arătăm „Activ" lângă un „Următoarea: —".
    return { activ: true, text: 'Nicio zi aleasă', avertisment: true };
  }
  return { activ: true, text: 'Activ' };
}
