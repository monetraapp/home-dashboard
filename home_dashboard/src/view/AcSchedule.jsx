// Secţiunea „PROGRAMARE" din cardul AC Etaj LG (v1.7.0).
//
// Stă SUB secţiunea „Cronometre", separată de ea, şi nu o atinge: acolo
// scheduler-ul e cloud-ul LG (cronometre relative, prin bridge), aici e Home
// Assistant (oră exactă, prin helpere + automatizări). Două mecanisme diferite,
// două secţiuni diferite — amestecarea lor a fost tentaţia pe care am refuzat-o.
//
// Dashboard-ul NU calculează când rulează programarea. Scrie în helpere şi
// citeşte înapoi `sensor.*_urmatoarea`, calculat de HA în fusul lui orar.
// Aici se face doar formatare de text.
import React, { useEffect, useState } from 'react';
import { s, SANS, ORANGE, TXT, TXT2, TXT3, CARD_BORDER, PILL_ON } from '../design/tokens.js';
import { useBreakpoint } from '../design/breakpoints.js';
import { useEntities } from '../ha/entities.js';
import { ic } from '../design/icons.js';
import {
  ZILE, REPETARE, REPETARE_LABEL, MOD_OPTIUNI, MOD_LABEL, VENT_OPTIUNI, VENT_LABEL,
  slotProg, oraScurta, textRepetare, textSetari, textUrmatoarea, textUltima, stareProgram
} from '../ha/acSchedule.js';

/** Citeşte o programare din sloturi. Pură faţă de React, dependentă de E. */
export function citesteProgram(E, kind) {
  const raw = (c) => E.rawState(slotProg(kind, c));
  const zile = {};
  for (const z of ZILE) zile[z.key] = raw('zi_' + z.key) === 'on';
  const cfg = {
    kind,
    mapat: !!E.idOf(slotProg(kind, 'activ')),
    activ: raw('activ') === 'on',
    ora: oraScurta(raw('ora')),
    repeta: raw('repeta'),
    zile,
    ultima: raw('ultima'),
    urmatoarea: raw('urmatoarea')
  };
  if (kind === 'pornire') {
    cfg.mod = raw('mod');
    cfg.ventilator = raw('ventilator');
    cfg.tempActiv = raw('temp_activ') === 'on';
    cfg.temp = E.num(slotProg(kind, 'temp'));
  }
  return cfg;
}

// ------------------------------------------------------------------ stiluri
const antet = 'font-family:' + SANS + '; font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.09em; color:' + TXT3 +
  '; margin:15px 0 8px; padding-top:13px; border-top:1px solid rgba(255,255,255,0.05);';
const blocStil = 'display:flex; flex-direction:column; gap:7px; padding:13px 14px; border-radius:14px; cursor:pointer; min-height:44px;' +
  ' background:rgba(255,255,255,0.028); border:1px solid rgba(255,255,255,0.065);';
const titluStil = 'font-family:' + SANS + '; font-size:12.5px; font-weight:500; color:' + TXT + ';';
const oraStil = 'font-family:' + SANS + '; font-size:23px; font-weight:300; line-height:1; color:' + TXT + ';';
const metaStil = 'font-family:' + SANS + '; font-size:11px; color:' + TXT3 + '; overflow-wrap:anywhere;';
const urmStil = 'font-family:' + SANS + '; font-size:11px; color:' + TXT2 + '; overflow-wrap:anywhere;';

function pilulaStare(st) {
  const c = !st.activ ? TXT3 : st.avertisment ? '#D9A441' : '#7FA96B';
  return 'display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:100px; white-space:nowrap; flex-shrink:0;' +
    ' font-family:' + SANS + '; font-size:10.5px; font-weight:500; color:' + c + ';' +
    ' background:rgba(255,255,255,0.045); border:1px solid rgba(255,255,255,0.085);';
}

const ziMic = (on) => 'display:inline-flex; align-items:center; justify-content:center; min-width:20px; padding:2px 5px; border-radius:7px;' +
  ' font-family:' + SANS + '; font-size:10px; font-weight:500;' +
  (on ? ' color:#3a1c06; background:' + PILL_ON + ';' : ' color:' + TXT3 + '; background:rgba(255,255,255,0.045);');

// ţinte tactile din modal — 44px, cum cere proiectul
const optStil = (on) => 'display:inline-flex; align-items:center; justify-content:center; gap:6px; min-height:44px; padding:9px 14px;' +
  ' border-radius:100px; cursor:pointer; white-space:nowrap; font-family:' + SANS + '; font-size:12px; font-weight:' + (on ? 500 : 400) + ';' +
  (on
    ? ' color:#3a1c06; background:' + PILL_ON + '; border:1px solid rgba(255,255,255,0.28); box-shadow:0 4px 12px -6px rgba(226,121,58,0.5), inset 0 1px 0 rgba(255,255,255,0.4);'
    : ' color:#bdb1a4; background:rgba(255,255,255,0.045); border:1px solid rgba(255,255,255,0.085);');

const subAntet = 'font-family:' + SANS + '; font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.09em; color:' + TXT3 + '; margin:16px 0 8px;';

// --------------------------------------------------------------- vizualizare
function Bloc({ cfg, titlu, nowMs, onOpen }) {
  const st = stareProgram(cfg);
  const urm = cfg.activ ? textUrmatoarea(cfg.urmatoarea, nowMs) : null;
  const ult = textUltima(cfg.ultima);
  return (
    <div
      className="hdTap"
      role="button"
      tabIndex={0}
      aria-label={'Editează programarea de ' + titlu.toLowerCase()}
      data-prog={cfg.kind}
      style={s(blocStil)}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={s(titluStil)}>{titlu}</span>
        <span style={s(pilulaStare(st))}>{st.text}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, flexWrap: 'wrap' }}>
        <span style={s(oraStil)}>{cfg.ora || '--:--'}</span>
        <span style={s(metaStil)}>{textRepetare(cfg)}</span>
      </div>
      {cfg.kind === 'pornire' ? <div style={s(metaStil)}>{textSetari(cfg)}</div> : null}
      {cfg.repeta === 'Zile alese' ? (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {ZILE.map((z) => <span key={z.key} style={s(ziMic(cfg.zile[z.key]))}>{z.label}</span>)}
        </div>
      ) : null}
      {/* Nu inventăm o execuţie: „Următoarea" apare doar cât timp HA chiar
          publică un moment, iar „Ultima" doar dacă marcajul a fost scris de
          automatizare la finalul unei rulări reuşite. */}
      <div style={s(urmStil)}>{cfg.activ ? (urm ? 'Următoarea: ' + urm : 'Următoarea: —') : 'Dezactivată'}</div>
      {ult ? <div style={s(metaStil)}>Ultima execuţie: {ult}</div> : null}
    </div>
  );
}

// --------------------------------------------------------------------- modal
function Modal({ E, cfg, titlu, mob, onClose }) {
  const set = (camp, domain, service, data) => {
    const id = E.idOf(slotProg(cfg.kind, camp));
    if (!id) return;
    E.ha.callService(domain, service, data || {}, { entity_id: id });
  };
  const toggle = (camp) => set(camp, 'input_boolean', 'toggle');

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const eticheta = (t) => <div style={s(subAntet)}>{t}</div>;
  const rand = { display: 'flex', flexWrap: 'wrap', gap: 7 };

  return (
    <div
      style={s('position:fixed; inset:0; z-index:90; display:flex; align-items:center; justify-content:center; padding:' + (mob ? '12px' : '28px') +
        '; overflow-y:auto; background:rgba(10,6,3,0.72); backdrop-filter:blur(10px);')}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={'Programare ' + titlu.toLowerCase()}
        style={s('width:100%; max-width:480px; max-height:88vh; overflow-y:auto; padding:20px; border-radius:24px;' +
          ' background:linear-gradient(158deg,#1d1712 0%,#141110 100%); border:1px solid rgba(240,138,44,0.28);' +
          ' box-shadow:0 40px 90px -30px rgba(0,0,0,0.85);')}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={s('font-family:' + SANS + '; font-size:16px; font-weight:500; color:' + TXT + ';')}>
            Programare {titlu.toLowerCase()}
          </div>
          <div
            role="button"
            tabIndex={0}
            aria-label="Închide"
            style={s('width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0;' +
              ' color:#a1968b; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09);')}
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
          >
            {ic('close', { size: 16 })}
          </div>
        </div>

        {eticheta('Ora exactă')}
        {/* input type=time: pe tabletă deschide selectorul sistemului, deci nu
            reinventăm un widget de oră. `color-scheme:dark` face ca şi ceasul
            nativ să se randeze pe fundal întunecat. */}
        <input
          type="time"
          aria-label="Ora programării"
          value={cfg.ora || ''}
          onChange={(e) => {
            const v = e.target.value;
            if (/^\d{2}:\d{2}$/.test(v)) set('ora', 'input_datetime', 'set_datetime', { time: v + ':00' });
          }}
          style={s('width:100%; min-height:52px; padding:10px 14px; border-radius:14px; outline:none; color-scheme:dark;' +
            ' font-family:' + SANS + '; font-size:22px; font-weight:300; color:' + TXT +
            '; background:rgba(255,255,255,0.045); border:1px solid ' + CARD_BORDER + ';')}
        />

        {eticheta('Repetare')}
        <div style={rand}>
          {REPETARE.map((r) => (
            <div
              key={r}
              className="hdTapY"
              role="button"
              tabIndex={0}
              aria-pressed={cfg.repeta === r}
              style={s(optStil(cfg.repeta === r))}
              onClick={() => set('repeta', 'input_select', 'select_option', { option: r })}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set('repeta', 'input_select', 'select_option', { option: r }); } }}
            >
              {REPETARE_LABEL[r]}
            </div>
          ))}
        </div>

        {cfg.repeta === 'Zile alese' ? (
          <>
            {eticheta('Zile')}
            <div style={rand}>
              {ZILE.map((z) => (
                <div
                  key={z.key}
                  className="hdTapY"
                  role="button"
                  tabIndex={0}
                  aria-pressed={cfg.zile[z.key]}
                  aria-label={z.label}
                  style={s(optStil(cfg.zile[z.key]) + ' min-width:48px;')}
                  onClick={() => toggle('zi_' + z.key)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle('zi_' + z.key); } }}
                >
                  {z.label}
                </div>
              ))}
            </div>
          </>
        ) : null}

        {cfg.kind === 'pornire' ? (
          <>
            {eticheta('Mod')}
            <div style={rand}>
              {MOD_OPTIUNI.map((m) => (
                <div
                  key={m}
                  className="hdTapY"
                  role="button"
                  tabIndex={0}
                  aria-pressed={cfg.mod === m}
                  style={s(optStil(cfg.mod === m))}
                  onClick={() => set('mod', 'input_select', 'select_option', { option: m })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set('mod', 'input_select', 'select_option', { option: m }); } }}
                >
                  {MOD_LABEL[m]}
                </div>
              ))}
            </div>

            {eticheta('Ventilator')}
            <div style={rand}>
              {VENT_OPTIUNI.map((v) => (
                <div
                  key={v}
                  className="hdTapY"
                  role="button"
                  tabIndex={0}
                  aria-pressed={cfg.ventilator === v}
                  style={s(optStil(cfg.ventilator === v))}
                  onClick={() => set('ventilator', 'input_select', 'select_option', { option: v })}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set('ventilator', 'input_select', 'select_option', { option: v }); } }}
                >
                  {VENT_LABEL[v]}
                </div>
              ))}
            </div>

            {eticheta('Temperatură ţintă')}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div
                className="hdTapY"
                role="button"
                tabIndex={0}
                aria-pressed={cfg.tempActiv}
                style={s(optStil(cfg.tempActiv))}
                onClick={() => toggle('temp_activ')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle('temp_activ'); } }}
              >
                {cfg.tempActiv ? 'Se setează' : 'Nu schimba'}
              </div>
              {cfg.tempActiv ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    className="hdTapY"
                    role="button"
                    tabIndex={0}
                    aria-label="Scade temperatura"
                    style={s(optStil(false) + ' min-width:48px;')}
                    onClick={() => set('temp', 'input_number', 'set_value', { value: Math.max(18, (cfg.temp || 22) - 0.5) })}
                  >
                    {ic('minus', { size: 15 })}
                  </div>
                  <span style={s('font-family:' + SANS + '; font-size:20px; font-weight:300; color:' + TXT + '; min-width:62px; text-align:center;')}>
                    {Number.isFinite(cfg.temp) ? String(cfg.temp).replace('.', ',') + '°C' : '—'}
                  </span>
                  <div
                    className="hdTapY"
                    role="button"
                    tabIndex={0}
                    aria-label="Creşte temperatura"
                    style={s(optStil(false) + ' min-width:48px;')}
                    onClick={() => set('temp', 'input_number', 'set_value', { value: Math.min(30, (cfg.temp || 22) + 0.5) })}
                  >
                    {ic('plus', { size: 15 })}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {eticheta('Stare')}
        <div style={rand}>
          <div
            className="hdTapY"
            role="button"
            tabIndex={0}
            aria-pressed={cfg.activ}
            style={s(optStil(cfg.activ))}
            onClick={() => toggle('activ')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle('activ'); } }}
          >
            {cfg.activ ? 'Activă' : 'Dezactivată'}
          </div>
        </div>

        <div style={s('margin-top:16px; padding:11px 13px; border-radius:12px; background:rgba(255,255,255,0.028); border:1px solid ' + CARD_BORDER +
          '; font-family:' + SANS + '; font-size:11px; line-height:1.5; color:' + TXT3 + ';')}>
          Programarea o execută Home Assistant, nu aerul condiţionat. Rămâne activă
          peste reîncărcarea paginii, repornirea add-on-ului şi repornirea HA.
          {cfg.repeta === 'O singura data' ? ' „O singură dată" se dezactivează singură după execuţie.' : ''}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------- secţie
export function ProgramareAC() {
  // Hook-urile stau AICI, nu in `Block`: componenta se randeaza dintr-un loc
  // care nu are nici entitatile, nici breakpoint-ul in domeniu, iar largirea
  // semnaturii lui `Block` doar pentru un singur acordeon ar fi fost o
  // scurgere de detaliu in tot randarea de blocuri.
  const E = useEntities();
  const { mob } = useBreakpoint();
  const [deschis, setDeschis] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  // Ceasul e doar pentru „azi / mâine" din textul următoarei execuţii.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const pornire = citesteProgram(E, 'pornire');
  const oprire = citesteProgram(E, 'oprire');

  if (!pornire.mapat && !oprire.mapat) {
    return (
      <>
        <div style={s(antet)}>Programare</div>
        <div style={s('font-family:' + SANS + '; font-size:11.5px; color:' + TXT3 + ';')}>
          Helperele de programare nu sunt mapate în Home Assistant.
        </div>
      </>
    );
  }

  const cfg = deschis === 'pornire' ? pornire : deschis === 'oprire' ? oprire : null;

  return (
    <>
      <div style={s(antet)}>
        Programare
        <span style={{ color: ORANGE, marginLeft: 8, letterSpacing: 0, textTransform: 'none', fontWeight: 400 }}>
          oră exactă · Home Assistant
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + (mob ? 1 : 2) + ',minmax(0,1fr))', gap: 8 }}>
        <Bloc cfg={pornire} titlu="Pornire" nowMs={now} onOpen={() => setDeschis('pornire')} />
        <Bloc cfg={oprire} titlu="Oprire" nowMs={now} onOpen={() => setDeschis('oprire')} />
      </div>
      {cfg ? (
        <Modal
          E={E}
          cfg={cfg}
          titlu={deschis === 'pornire' ? 'Pornire' : 'Oprire'}
          mob={mob}
          onClose={() => setDeschis(null)}
        />
      ) : null}
    </>
  );
}
