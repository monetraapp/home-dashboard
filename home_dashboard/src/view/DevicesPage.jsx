// Pagina „Dispozitive" (v1.6.0) — a zecea axă: starea lucrurilor, nu funcţia lor.
//
// Ca şi „Zone", nu are sloturi în catalog: lista vine din registre plus lista
// intrărilor de configurare (vezi ha/deviceHealth.js). Peste ea stă un panou de
// observabilitate: stocarea HA, baza de date şi ce ocupă aplicaţia în browser.
//
// REGULA CARE DĂ FORMA PAGINII
// Freshness se afişează doar când există o sursă reală de ultimă comunicare.
// Pe această instanţă asta înseamnă două dispozitive din ~81. Pentru restul
// scrie negru pe alb „fără sursă de ultimă comunicare" şi NU se inventează un
// verdict din vechimea stării: un întrerupător neatins de o zi e sănătos, nu
// tăcut. Coloana de vechime a stării există, dar e etichetată ca atare şi nu
// intră în clasificare.
//
// Totul e READ-ONLY. Pagina nu expune nicio comandă: nu reporneşte integrări,
// nu reîncarcă intrări, nu atinge camerele. Diagnostic, nu telecomandă.
import React, { useMemo, useState } from 'react';
import { s, SANS, ORANGE, TXT, TXT2, TXT3, glassCard, CARD_BORDER } from '../design/tokens.js';
import { ic } from '../design/icons.js';
import { HEALTH_LABEL, FRESHNESS, fmtAge, sortDevices } from '../ha/health.js';
import { textFreshness, claseleePrezente } from '../ha/deviceHealth.js';
import { fmtBytes, APP_VERSION } from '../ha/systemHealth.js';

// Culori semantice, ţinute deliberat departe de portocaliul de accent: acesta
// marchează „aici e informaţia", nu „aici e o problemă". Confuzia dintre cele
// două ar face pagina să pară în alarmă permanentă.
export const CULOARE = {
  healthy: '#7FA96B',
  partial: '#B8695E',
  slow: '#C8A173',
  stale: '#D9A441',
  offline_expected: '#7C8AA0',
  offline: '#C4574A',
  integration_error: '#E05A6B',
  unknown: '#A1968B'
};

// ------------------------------------------------------------------ stiluri
const titluSectiune = 'display:flex; align-items:center; gap:9px; grid-column:1 / -1; font-family:' + SANS +
  '; font-size:13px; font-weight:500; letter-spacing:0.06em; text-transform:uppercase; color:' + ORANGE + '; margin:4px 0 0;';
const cardDisp = () => glassCard() + ' display:flex; flex-direction:column; gap:9px; padding:14px 15px; cursor:pointer; min-height:112px;';
const numeDisp = 'font-family:' + SANS + '; font-size:14px; font-weight:500; color:' + TXT + ';';
const metaDisp = 'font-family:' + SANS + '; font-size:11.5px; color:' + TXT3 + ';';
const randStyle = 'display:flex; align-items:center; justify-content:space-between; gap:12px; padding:9px 12px; border-radius:12px; background:rgba(255,255,255,0.028); border:1px solid rgba(255,255,255,0.055);';

function pilulaStil(h, activ) {
  const c = CULOARE[h] || CULOARE.unknown;
  return 'display:inline-flex; align-items:center; gap:6px; padding:5px 11px; border-radius:100px; white-space:nowrap;' +
    ' font-family:' + SANS + '; font-size:11px; font-weight:500; color:' + c + ';' +
    ' background:rgba(255,255,255,' + (activ ? '0.1' : '0.045') + '); border:1px solid ' + (activ ? c : 'rgba(255,255,255,0.085)') + ';';
}

function Pilula({ h, text }) {
  return <span style={s(pilulaStil(h, false))}><span style={{ width: 7, height: 7, borderRadius: 4, background: CULOARE[h] || CULOARE.unknown, flexShrink: 0 }} />{text || HEALTH_LABEL[h]}</span>;
}

// ------------------------------------------------------- panou observabilitate
function Camp({ eticheta, valoare, nota }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <div style={s('font-family:' + SANS + '; font-size:11px; color:' + TXT3 + ';')}>{eticheta}</div>
      <div style={s('font-family:' + SANS + '; font-size:15px; font-weight:400; color:' + TXT + '; overflow-wrap:anywhere;')}>{valoare}</div>
      {nota ? <div style={s('font-family:' + SANS + '; font-size:10.5px; color:' + TXT3 + '; overflow-wrap:anywhere;')}>{nota}</div> : null}
    </div>
  );
}

function CardPanou({ titlu, icon, children }) {
  return (
    <div style={s(glassCard() + ' display:flex; flex-direction:column; padding:14px 15px;')}>
      <div style={s('display:flex; align-items:center; gap:8px; font-family:' + SANS + '; font-size:12px; font-weight:500; letter-spacing:0.05em; text-transform:uppercase; color:' + TXT2 + '; margin-bottom:12px;')}>
        <span style={{ display: 'flex', color: ORANGE }}>{ic(icon, { size: 14 })}</span>
        {titlu}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: '1 1 auto' }}>{children}</div>
    </div>
  );
}

function Panou({ sys, browser, cota, wsStats, now }) {
  const pctDisc = sys && Number.isFinite(sys.discPct) ? Math.round(sys.discPct) : null;
  const cr = sys && sys.crestere;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, alignItems: 'stretch' }}>
      <CardPanou titlu="Stocare Home Assistant" icon="server">
        {sys ? (
          <>
            <Camp
              eticheta="Disc folosit"
              valoare={fmtBytes(sys.discFolosit) + ' din ' + fmtBytes(sys.discTotal)}
              nota={pctDisc !== null ? pctDisc + '% ocupat · ' + fmtBytes(sys.discLiber) + ' liberi' : null}
            />
            <Camp eticheta="Uzura discului" valoare={sys.uzuraDisc || '—'} nota="raportat de Supervisor" />
            <Camp
              eticheta="Stare sistem"
              valoare={sys.sanatos === null ? '—' : sys.sanatos ? 'sănătos' : 'nesănătos'}
              nota={sys.suportat === false ? 'configuraţie nesuportată' : null}
            />
          </>
        ) : (
          <Camp eticheta="Stocare" valoare="—" nota="se citeşte system_health…" />
        )}
      </CardPanou>

      <CardPanou titlu="Baza de date" icon="archive">
        {sys ? (
          <>
            <Camp eticheta="Dimensiune estimată" valoare={fmtBytes(sys.db)} nota={sys.dbMotor || null} />
            {cr ? (
              <Camp
                eticheta="Medie pe fereastra păstrată"
                valoare={fmtBytes(cr.perZi) + ' / zi'}
                /* Rezerva contează mai mult decât cifra: recorder-ul purjează la
                   un orizont fix, deci dimensiunea se opreşte, nu creşte la
                   nesfârşit. O proiecţie „disc plin în N zile" ar fi o alarmă
                   inventată. */
                nota={'peste ' + String(cr.zile).replace('.', ',') + ' zile de istoric păstrat · se plafonează la orizontul de purjare, nu creşte liniar'}
              />
            ) : null}
            <Camp
              eticheta="Pondere în disc"
              valoare={sys.db && sys.discFolosit ? Math.round((sys.db / sys.discFolosit) * 100) + '% din spaţiul folosit' : '—'}
            />
          </>
        ) : (
          <Camp eticheta="Bază de date" valoare="—" nota="se citeşte system_health…" />
        )}
      </CardPanou>

      <CardPanou titlu="Aplicaţia în browser" icon="monitor">
        <Camp
          eticheta="Versiune"
          valoare={'v' + APP_VERSION}
          nota={sys && sys.versiuneCore ? 'HA ' + sys.versiuneCore : null}
        />
        <Camp
          eticheta="Stocare locală"
          valoare={browser.disponibil ? fmtBytes(browser.total) : 'inaccesibilă'}
          nota={browser.disponibil ? browser.chei.length + ' chei · ' + browser.chei.slice(0, 2).map((k) => k.cheie).join(', ') : 'blocată de browser'}
        />
        <Camp
          eticheta="Memorie JS"
          valoare={browser.heap ? fmtBytes(browser.heap) : 'nemăsurabilă'}
          nota={browser.heap ? 'din ' + fmtBytes(browser.heapLimita) + ' limită' : 'performance.memory există doar pe Chromium'}
        />
        {cota ? (
          <Camp
            eticheta="Cotă origine"
            valoare={fmtBytes(cota.usage) + ' folosiţi'}
            nota={'din ' + fmtBytes(cota.quota) + ' · include IndexedDB şi Cache Storage'}
          />
        ) : null}
      </CardPanou>

      <CardPanou titlu="Conexiune" icon="wifi">
        <Camp
          eticheta="Conectat de la"
          valoare={wsStats && wsStats.de_la ? fmtAge(now - wsStats.de_la) : '—'}
          nota={wsStats && wsStats.de_la ? 'fără întrerupere' : null}
        />
        <Camp
          eticheta="Căderi în sesiune"
          valoare={wsStats ? String(wsStats.caderi) : '—'}
          nota={wsStats && wsStats.reconectari ? wsStats.reconectari + ' reconectări reuşite' : 'contorizate de la deschiderea paginii'}
        />
      </CardPanou>
    </div>
  );
}

// ------------------------------------------------------------------- detaliu
function Detaliu({ d, states, onClose }) {
  return (
    <div style={s('position:fixed; inset:0; z-index:80; display:flex; align-items:center; justify-content:center; padding:16px; overflow-y:auto; background:rgba(10,6,3,0.72); backdrop-filter:blur(10px);')} onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={'Detalii ' + d.name}
        style={s('width:100%; max-width:560px; max-height:86vh; overflow-y:auto; padding:20px; border-radius:24px; background:linear-gradient(158deg,#1d1712 0%,#141110 100%); border:1px solid rgba(240,138,44,0.28); box-shadow:0 40px 90px -30px rgba(0,0,0,0.85);')}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div style={s(numeDisp + ' font-size:16px; overflow-wrap:anywhere;')}>{d.name}</div>
            <div style={s(metaDisp + ' margin-top:4px;')}>
              {[d.producator, d.model, d.zona].filter(Boolean).join(' · ') || 'fără detalii de registru'}
            </div>
          </div>
          <div
            role="button"
            tabIndex={0}
            aria-label="Închide"
            style={s('width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; color:#a1968b; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09);')}
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
          >
            {ic('close', { size: 16 })}
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '14px 0' }}>
          <Pilula h={d.health} />
          <span style={s(metaDisp + ' align-self:center;')}>{d.reason}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={s(randStyle)}>
            <span style={s(metaDisp)}>Sursă de ultimă comunicare</span>
            <span style={s('font-family:' + SANS + '; font-size:11.5px; color:' + (d.sursaFreshness ? TXT : TXT3) + '; text-align:right; overflow-wrap:anywhere; min-width:0;')}>
              {d.sursaFreshness || 'nu există'}
            </span>
          </div>
          {d.freshness === FRESHNESS.REAL ? (
            <div style={s(randStyle)}>
              <span style={s(metaDisp)}>Ultima comunicare</span>
              <span style={s('font-family:' + SANS + '; font-size:12px; color:' + TXT + ';')}>acum {fmtAge(d.ageMs)}</span>
            </div>
          ) : null}
          <div style={s(randStyle)}>
            <span style={s(metaDisp)}>Ultima schimbare de stare</span>
            <span style={s('font-family:' + SANS + '; font-size:12px; color:' + TXT2 + ';')}>
              {Number.isFinite(d.stateAgeMs) ? 'acum ' + fmtAge(d.stateAgeMs) : '—'}
            </span>
          </div>
          <div style={s(randStyle)}>
            <span style={s(metaDisp)}>Integrare</span>
            <span style={s('font-family:' + SANS + '; font-size:12px; color:' + TXT + '; text-align:right; overflow-wrap:anywhere; min-width:0;')}>
              {(d.integrare || '—') + (d.integrareStare && d.integrareStare !== 'loaded' ? ' · ' + d.integrareStare : '')}
            </span>
          </div>
        </div>

        {d.freshness !== FRESHNESS.REAL ? (
          <div style={s('margin-top:12px; padding:11px 13px; border-radius:12px; background:rgba(255,255,255,0.028); border:1px solid ' + CARD_BORDER + '; font-family:' + SANS + '; font-size:11.5px; line-height:1.5; color:' + TXT2 + ';')}>
            Dispozitivul nu expune un moment de ultimă comunicare (last-seen, pachet
            sau heartbeat). Vechimea stării de mai sus nu ţine locul acestuia: un
            întrerupător neatins o zi are starea veche şi funcţionează perfect.
            Semnalul folosit aici e disponibilitatea.
          </div>
        ) : null}

        <div style={s('margin-top:14px; font-family:' + SANS + '; font-size:12px; font-weight:500; letter-spacing:0.05em; text-transform:uppercase; color:' + TXT2 + ';')}>
          Entităţi <span style={{ color: TXT3, fontWeight: 400 }}>{d.nrEntitati}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 9 }}>
          {d.entitati.map((id) => {
            const st = states[id];
            const indisp = !st || st.state === 'unavailable';
            return (
              <div key={id} style={s(randStyle)}>
                <span style={s('font-family:' + SANS + '; font-size:11.5px; color:' + (indisp ? TXT3 : '#c4b7a7') + '; overflow-wrap:anywhere; min-width:0;')}>{id}</span>
                <span style={s('font-family:' + SANS + '; font-size:11.5px; font-weight:500; color:' + (indisp ? CULOARE.offline : TXT) + '; white-space:nowrap; flex-shrink:0;')}>
                  {st ? st.state : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------- card
function CardDispozitiv({ d, onOpen }) {
  return (
    <div className="hdTap" style={s(cardDisp())} data-card={'disp:' + d.id} onClick={() => onOpen(d)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, minWidth: 0 }}>
        <span style={{ display: 'flex', color: CULOARE[d.health] || CULOARE.unknown, flexShrink: 0, marginTop: 2 }}>
          {ic('heartPulse', { size: 15 })}
        </span>
        <span style={s(numeDisp + ' min-width:0; overflow-wrap:anywhere;')}>{d.name}</span>
      </div>
      <div style={s(metaDisp + ' overflow-wrap:anywhere;')}>
        {[d.integrare, d.zona].filter(Boolean).join(' · ') || 'fără zonă'}
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Pilula h={d.health} />
        <div style={s(metaDisp + ' overflow-wrap:anywhere;')}>{textFreshness(d)}</div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------- pagina
export function DevicesPage({ devices, loading, error, states, mob, sys, browser, cota, wsStats, now, sel, setSel, filtru, setFiltru }) {
  const [q, setQ] = useState('');

  const lista = useMemo(() => {
    if (!devices) return null;
    const f = filtru ? devices.filter((d) => d.health === filtru) : devices;
    const t = q.trim().toLowerCase();
    const c = t
      ? f.filter((d) => (d.name + ' ' + (d.integrare || '') + ' ' + (d.zona || '')).toLowerCase().indexOf(t) >= 0)
      : f;
    return sortDevices(c);
  }, [devices, filtru, q]);

  const clase = useMemo(() => claseleePrezente(devices), [devices]);
  const ales = sel && devices ? devices.find((d) => d.id === sel) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Panou sys={sys} browser={browser} cota={cota} wsStats={wsStats} now={now} />

      {error ? (
        <div style={s(glassCard() + ' padding:18px; font-family:' + SANS + '; font-size:13px; color:' + TXT2 + ';')}>
          Nu am putut citi registrele Home Assistant: {String(error)}.
          <div style={{ color: TXT3, marginTop: 8, fontSize: 12 }}>
            Listele de registru şi intrările de configurare cer un token de utilizator administrator.
          </div>
        </div>
      ) : null}

      {!devices && !error ? (
        <div style={s(glassCard() + ' padding:18px; font-family:' + SANS + '; font-size:13px; color:' + TXT3 + ';')}>
          {loading ? 'Se citesc registrele…' : 'Neconectat.'}
        </div>
      ) : null}

      {devices ? (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {clase.map((c) => {
              const activ = filtru === c.cheie;
              return (
                <div
                  className="hdTapY"
                  key={c.cheie}
                  role="button"
                  tabIndex={0}
                  aria-pressed={activ}
                  aria-label={HEALTH_LABEL[c.cheie] + ': ' + c.n}
                  data-filtru={c.cheie}
                  style={s(pilulaStil(c.cheie, activ) + ' cursor:pointer; min-height:34px; font-size:11.5px;')}
                  onClick={() => setFiltru(activ ? null : c.cheie)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFiltru(activ ? null : c.cheie); } }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: 4, background: CULOARE[c.cheie], flexShrink: 0 }} />
                  {HEALTH_LABEL[c.cheie]}
                  <span style={{ fontWeight: 600 }}>{c.n}</span>
                </div>
              );
            })}
            <input
              aria-label="Caută dispozitiv"
              placeholder="Caută…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={s('flex:1 1 140px; min-width:120px; min-height:34px; padding:6px 13px; border-radius:100px; outline:none; font-family:' + SANS +
                '; font-size:11.5px; color:' + TXT + '; background:rgba(255,255,255,0.045); border:1px solid ' + CARD_BORDER + ';')}
            />
          </div>

          {lista.length === 0 ? (
            <div style={s(glassCard() + ' padding:18px; font-family:' + SANS + '; font-size:13px; color:' + TXT3 + ';')}>
              Niciun dispozitiv nu corespunde filtrului.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(' + (mob ? '150px' : '232px') + ',1fr))', gap: 12, alignItems: 'stretch' }}>
              <div style={s(titluSectiune)}>
                {lista.length} {lista.length === 1 ? 'dispozitiv' : 'dispozitive'}
                <span style={{ color: TXT2, fontWeight: 400, letterSpacing: 0, textTransform: 'none' }}>
                  ordonate după gravitate
                </span>
              </div>
              {lista.map((d) => (
                <CardDispozitiv key={d.id} d={d} onOpen={(x) => setSel(x.id)} />
              ))}
            </div>
          )}
        </>
      ) : null}

      {ales ? <Detaliu d={ales} states={states} onClose={() => setSel(null)} /> : null}
    </div>
  );
}
