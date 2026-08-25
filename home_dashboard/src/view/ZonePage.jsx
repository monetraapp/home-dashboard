// Pagina „Zone" (v1.5.0) — a noua axă de navigare: pe încăperi, nu pe funcţie.
//
// Nu are sloturi în catalog. Structura vine integral din registrele HA (vezi
// ha/registries.js), deci mutarea unui dispozitiv într-o altă zonă din HA se
// vede aici fără release.
//
// Infrastructura (gateway, switch-uri, EAP-uri, HA Core/Supervisor, add-on-uri)
// e ţinută DELIBERAT fără zonă — decizie veche, documentată în 04_. Pagina o
// ignoră complet: axa ei e „ce e în camera asta", iar infrastructura n-are
// cameră prin proiect, nu din omisiune. E deja acoperită integral pe Reţea şi
// Mentenanţă. O secţiune „fără zonă" ar arăta ca o listă de neterminat şi ar
// tenta pe cineva s-o „repare" atribuind zone, anulând decizia. Omisiunea e
// spusă explicit în subtitlul paginii (PAGE_HERO.zone), ca să fie vizibilă.
import React from 'react';
import { s, SANS, ORANGE, TXT, TXT2, TXT3, glassCard, CARD_BORDER } from '../design/tokens.js';
import { ic } from '../design/icons.js';
import { fmtUnitAuto } from '../design/format.js';

// domeniu -> [iconiţă, etichetă de grup, ordine]. Ordinea e cea în care te
// uiţi la o cameră: mai întâi ce reglezi, apoi ce porneşti, apoi ce citeşti.
const GRUP = {
  climate: ['airVent', 'Climat', 1],
  water_heater: ['flame', 'Climat', 1],
  media_player: ['tv', 'Media', 2],
  light: ['sun', 'Lumini', 3],
  switch: ['power', 'Comutatoare', 4],
  fan: ['fan', 'Comutatoare', 4],
  cover: ['updown', 'Comutatoare', 4],
  lock: ['lock', 'Comutatoare', 4],
  camera: ['cctv', 'Camere', 5],
  binary_sensor: ['activity', 'Senzori', 6],
  sensor: ['gauge', 'Senzori', 6],
  number: ['sliders', 'Senzori', 6],
  button: ['power', 'Comutatoare', 4]
};

const dom = (id) => String(id).split('.')[0];

/** Valoarea afişată pentru o entitate, cu unităţile trecute prin formatorul canonic. */
export function valoare(st) {
  if (!st) return '—';
  const u = st.attributes && st.attributes.unit_of_measurement;
  const n = parseFloat(st.state);
  if (u && isFinite(n)) {
    const f = fmtUnitAuto(n, u);
    if (f) return f.v + ' ' + f.u;
    return st.state + ' ' + u;
  }
  const MAP = {
    on: 'Pornit', off: 'Oprit', open: 'Deschis', closed: 'Închis',
    home: 'Acasă', not_home: 'Plecat', unavailable: 'Indisponibil',
    unknown: 'Necunoscut', idle: 'Inactiv', playing: 'Redă', paused: 'Pauză',
    standby: 'Standby', heat: 'Încălzire', cool: 'Răcire', auto: 'Auto',
    heat_cool: 'Auto', dry: 'Dezumidificare', fan_only: 'Ventilaţie',
    locked: 'Blocat', unlocked: 'Deblocat', detected: 'Detectat', clear: 'Liber'
  };
  return MAP[st.state] || st.state;
}

/** Rezumatul unei zone: temperatura, dacă există, plus câte lucruri sunt pornite. */
export function rezumat(ids, states) {
  let temp = null;
  let pornite = 0;
  for (const id of ids) {
    const st = states[id];
    if (!st) continue;
    const d = dom(id);
    if (temp === null && d === 'sensor' && st.attributes && st.attributes.device_class === 'temperature') {
      const n = parseFloat(st.state);
      if (isFinite(n)) temp = n;
    }
    if (temp === null && d === 'climate' && st.attributes && isFinite(parseFloat(st.attributes.current_temperature))) {
      temp = parseFloat(st.attributes.current_temperature);
    }
    if (['light', 'switch', 'fan', 'media_player'].indexOf(d) >= 0 && st.state !== 'off' && st.state !== 'unavailable' && st.state !== 'unknown') pornite++;
  }
  return { temp, pornite };
}

/** Grupează entităţile unei zone pe categorii, în ordinea din GRUP. */
export function grupeaza(ids, states) {
  const buck = {};
  for (const id of ids) {
    const g = GRUP[dom(id)];
    if (!g) continue;
    const key = g[1];
    (buck[key] = buck[key] || { nume: key, icon: g[0], ord: g[2], ids: [] }).ids.push(id);
  }
  return Object.values(buck)
    .map((b) => ({ ...b, ids: b.ids.slice().sort((a, c) => {
      const na = (states[a] && states[a].attributes && states[a].attributes.friendly_name) || a;
      const nc = (states[c] && states[c].attributes && states[c].attributes.friendly_name) || c;
      return String(na).localeCompare(String(nc), 'ro');
    }) }))
    .sort((a, b) => a.ord - b.ord);
}

// ------------------------------------------------------------------ stiluri
const titluEtaj = 'display:flex; align-items:center; gap:9px; grid-column:1 / -1; font-family:' + SANS +
  '; font-size:13px; font-weight:500; letter-spacing:0.06em; text-transform:uppercase; color:' + ORANGE + '; margin:4px 0 0;';
const cardZona = () => glassCard() + ' display:flex; flex-direction:column; gap:10px; padding:15px 16px; cursor:pointer; min-height:104px;';
const numeZona = 'font-family:' + SANS + '; font-size:14.5px; font-weight:500; color:' + TXT + ';';
const metaZona = 'font-family:' + SANS + '; font-size:11.5px; color:' + TXT3 + ';';
const valZona = 'font-family:' + SANS + '; font-size:22px; font-weight:300; color:' + TXT + '; line-height:1;';
const randStyle = 'display:flex; align-items:center; justify-content:space-between; gap:12px; padding:9px 12px; border-radius:12px; background:rgba(255,255,255,0.028); border:1px solid rgba(255,255,255,0.055);';

function CardZona({ z, states, onOpen }) {
  const r = rezumat(z.entities, states);
  return (
    <div className="hdTap" style={s(cardZona())} data-card={'zona:' + z.id} onClick={() => onOpen(z)}>
      {/* Numele zonei se ÎNFĂŞOARĂ, nu se taie: „Camera Tehnica Piscina" şi
          „Dormitor Sofia Parter" pierdeau până la 60px cu ellipsis pe ecrane
          înguste, iar numele încăperii e chiar informaţia cardului. Iconiţa
          se aliniază la prima linie. */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, minWidth: 0 }}>
        <span style={{ display: 'flex', color: ORANGE, flexShrink: 0, marginTop: 2 }}>{ic('layoutGrid', { size: 15 })}</span>
        <span style={s(numeZona + ' min-width:0; overflow-wrap:anywhere;')}>{z.name}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, flex: '1 1 auto' }}>
        <div style={s(metaZona)}>
          {z.entities.length} {z.entities.length === 1 ? 'entitate' : 'entităţi'}
          {r.pornite > 0 ? ' · ' + r.pornite + ' active' : ''}
        </div>
        {r.temp !== null ? <div style={s(valZona)}>{String(Math.round(r.temp * 10) / 10).replace('.', ',')}°</div> : null}
      </div>
    </div>
  );
}

function Detaliu({ z, states, onBack }) {
  const grupuri = grupeaza(z.entities, states);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          className="hdTap"
          style={s('display:flex; align-items:center; gap:8px; padding:9px 14px; border-radius:100px; cursor:pointer; background:rgba(255,255,255,0.045); border:1px solid ' + CARD_BORDER + '; font-family:' + SANS + '; font-size:12.5px; color:' + TXT2 + ';')}
          onClick={onBack}
        >
          {ic('chevLeft', { size: 14 })}Toate zonele
        </div>
        <div style={s('font-family:' + SANS + '; font-size:16px; font-weight:500; color:' + TXT + ';')}>
          {z.name} <span style={{ color: '#8a7c6c', fontWeight: 400 }}>/ {z.entities.length} entităţi</span>
        </div>
      </div>

      {grupuri.length === 0 ? (
        <div style={s(glassCard() + ' padding:18px; font-family:' + SANS + '; font-size:13px; color:' + TXT3 + ';')}>
          Zona există în Home Assistant, dar nu are nicio entitate vizibilă.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14, alignItems: 'stretch' }}>
          {grupuri.map((g) => (
            <div key={g.nume} style={s(glassCard() + ' display:flex; flex-direction:column; padding:14px 15px;')}>
              <div style={s('display:flex; align-items:center; gap:8px; font-family:' + SANS + '; font-size:12px; font-weight:500; letter-spacing:0.05em; text-transform:uppercase; color:' + TXT2 + '; margin-bottom:11px;')}>
                <span style={{ display: 'flex', color: ORANGE }}>{ic(g.icon, { size: 14 })}</span>
                {g.nume}
                <span style={{ color: TXT3, fontWeight: 400 }}>{g.ids.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: '1 1 auto' }}>
                {g.ids.map((id) => {
                  const st = states[id];
                  const nume = (st && st.attributes && st.attributes.friendly_name) || id;
                  const indisp = !st || st.state === 'unavailable' || st.state === 'unknown';
                  return (
                    <div key={id} style={s(randStyle + ' flex:1 1 auto;')} title={id}>
                      <span style={s('font-family:' + SANS + '; font-size:12.5px; color:' + (indisp ? TXT3 : '#c4b7a7') + '; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0;')}>{nume}</span>
                      <span style={s('font-family:' + SANS + '; font-size:12.5px; font-weight:500; color:' + (indisp ? TXT3 : TXT) + '; white-space:nowrap; flex-shrink:0;')}>{valoare(st)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ZonePage({ etaje, loading, error, states, mob, sel, setSel }) {
  if (error) {
    return (
      <div style={s(glassCard() + ' padding:18px; font-family:' + SANS + '; font-size:13px; color:' + TXT2 + ';')}>
        Nu am putut citi registrele Home Assistant: {String(error)}.
        <div style={{ color: TXT3, marginTop: 8, fontSize: 12 }}>
          Cele patru liste de registru cer un token de utilizator administrator.
        </div>
      </div>
    );
  }
  if (!etaje) {
    return (
      <div style={s(glassCard() + ' padding:18px; font-family:' + SANS + '; font-size:13px; color:' + TXT3 + ';')}>
        {loading ? 'Se citesc registrele…' : 'Neconectat.'}
      </div>
    );
  }

  if (sel) {
    // zona selectată se reciteşte din `etaje` la fiecare randare, ca să reflecte
    // mutările făcute între timp în HA; dacă a dispărut, ne întoarcem la grilă
    let viu = null;
    for (const f of etaje) for (const z of f.zone) if (z.id === sel) viu = z;
    if (viu) return <Detaliu z={viu} states={states} onBack={() => setSel(null)} />;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(' + (mob ? '150px' : '208px') + ',1fr))', gap: 12, alignItems: 'stretch' }}>
      {etaje.map((f) => (
        <React.Fragment key={f.id}>
          <div style={s(titluEtaj)}>
            {f.icon ? null : null}
            {f.name}
            {/* TXT2, nu TXT3: pe fundalul paginii (nu pe card) TXT3 dădea
                3,81:1 la 13px, sub pragul WCAG de 4,5:1 — prins de auditul
                responsive pe v1.5.0, în 16 combinaţii. */}
            <span style={{ color: TXT2, fontWeight: 400, letterSpacing: 0, textTransform: 'none' }}>
              {f.zone.length} {f.zone.length === 1 ? 'zonă' : 'zone'}
            </span>
          </div>
          {f.zone.map((z) => (
            <CardZona key={z.id} z={z} states={states} onOpen={(x) => setSel(x.id)} />
          ))}
        </React.Fragment>
      ))}
    </div>
  );
}
