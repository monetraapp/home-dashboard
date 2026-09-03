// Pagina „Iluminat" — experienţă dedicată luminilor RGB.
//
// Deliberat NU refoloseşte cardul de dispozitiv de la climatizare: un aparat de
// aer condiţionat se reglează pe o singură axă (temperatura), pe când o bandă
// RGB are trei lucruri simultane — pornit/oprit, luminozitate, culoare — şi
// toate trebuie să încapă în acelaşi câmp vizual. De aceea nu există „controale
// principale" şi „controale secundare": e un singur panou.
//
// Cromatica e cea a Dashboard-ului: fundaluri închise, carduri de sticlă din
// `glassCard()`, accent amber pe TOT ce e structural — bară, comutator, file,
// butoane, valori. Culoarea reală a benzii apare exclusiv acolo unde chiar
// înseamnă culoare: roata, swatch-ul curent, bulinele preseturilor şi ale
// culorilor salvate. Dacă banda e albastră, interfaţa NU devine albastră.
//
// Pagina e scrisă pentru mai multe lumini decât cele două de azi: selectorul de
// sus se generează din lista primită, nu din nume scrise de mână.
import React, { useState, useRef, useCallback } from 'react';
import { s, SANS, DOTO, ORANGE, ORANGE_HI, TXT, TXT2, TXT3, glassCard } from '../design/tokens.js';
import { ic } from '../design/icons.js';
import { dec as decSep } from '../design/format.js';
import LedHistory from './LedHistory.jsx';

// ------------------------------------------------------------------ culoare
// HSV -> RGB. Roata dă nuanţa (unghi) şi saturaţia (rază); valoarea rămâne 1,
// fiindcă intensitatea se reglează din bara de luminozitate, nu din culoare.
export function hsvToRgb(h, sat, val) {
  const c = val * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = val - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** RGB -> {h, s} pentru a aşeza cursorul roţii pe culoarea curentă. */
export function rgbToHs(rgb) {
  if (!Array.isArray(rgb) || rgb.length !== 3) return null;
  const r = rgb[0] / 255, g = rgb[1] / 255, b = rgb[2] / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : d / max };
}

const rgbCss = (rgb) => (Array.isArray(rgb) ? 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')' : 'rgba(255,255,255,0.12)');

// „Alb" şi „Cald" sunt sinteză RGB, nu canalul W al controlerului RGBW —
// canalul acela nu e atins de nicăieri din aplicaţie.
const PRESETURI = [
  ['Roşu', [255, 0, 0]],
  ['Verde', [0, 255, 0]],
  ['Albastru', [0, 0, 255]],
  ['Mov', [160, 0, 255]],
  ['Cyan', [0, 255, 255]],
  ['Portocaliu', [255, 120, 0]],
  ['Alb', [255, 255, 255]],
  ['Cald', [255, 170, 90]]
];

// ------------------------------------------------------------ stiluri comune
const etichetaSectiune = 'font-family:' + SANS + '; font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.09em; color:' + TXT3 + ';';
const pastila = (activ, apasabil) =>
  'display:flex; align-items:center; gap:8px; min-height:38px; padding:0 12px; border-radius:100px; white-space:nowrap; flex-shrink:0;' +
  ' cursor:' + (apasabil ? 'pointer' : 'default') + '; font-family:' + SANS + '; font-size:11.5px; font-weight:' + (activ ? '500' : '400') +
  '; color:' + (activ ? '#2a1608' : '#bdb1a4') + '; background:' + (activ ? ORANGE : 'rgba(255,255,255,0.05)') +
  '; border:1px solid ' + (activ ? 'transparent' : 'rgba(255,255,255,0.1)') + ';';
const butonAmber = 'min-height:44px; display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:0 18px; border-radius:13px; cursor:pointer;' +
  ' font-family:' + SANS + '; font-size:12.5px; font-weight:500; color:#2a1608; background:linear-gradient(140deg,' + ORANGE_HI + ',#DE7420);' +
  ' border:1px solid rgba(255,255,255,0.18);';
const butonNeutru = 'min-height:44px; display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:0 18px; border-radius:13px; cursor:pointer;' +
  ' font-family:' + SANS + '; font-size:12.5px; font-weight:400; color:#c8bcae; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.075);';

// ------------------------------------------------------------- stat electric
function StatElectric({ icon, valoare, unitate, eticheta }) {
  return (
    <div style={s('flex:1 1 96px; min-width:0; display:flex; align-items:center; gap:9px; padding:9px 12px; border-radius:14px;' +
      ' background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.07);')}>
      <span style={s('display:flex; flex-shrink:0; color:' + ORANGE + ';')}>{ic(icon, { size: 15 })}</span>
      <div style={{ minWidth: 0 }}>
        <div style={s('font-family:' + SANS + '; font-size:13px; font-weight:500; color:' + TXT + '; font-variant-numeric:tabular-nums; white-space:nowrap;')}>
          {valoare === null ? '—' : valoare + ' ' + unitate}
        </div>
        <div style={s('font-family:' + SANS + '; font-size:10px; font-weight:300; color:' + TXT3 + ';')}>{eticheta}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- bara de lumină
function BaraLuminozitate({ pct, activ, onSet, mob }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(null);

  const dinEveniment = useCallback((clientX) => {
    const el = ref.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return Math.max(1, Math.min(100, Math.round(((clientX - r.left) / (r.width || 1)) * 100)));
  }, []);

  const aplica = useCallback((clientX, final) => {
    const v = dinEveniment(clientX);
    if (v === null) return;
    setDrag(final ? null : v);
    onSet(v);
  }, [dinEveniment, onSet]);

  const afisat = drag !== null ? drag : pct;
  const h = mob ? 16 : 14;

  return (
    <div style={s('display:flex; align-items:center; gap:' + (mob ? '10px' : '14px') + '; flex-wrap:nowrap;')}>
      <span style={s('display:flex; flex-shrink:0; color:' + ORANGE + ';')}>{ic('sun', { size: 16 })}</span>
      {mob ? null : <span style={s(etichetaSectiune + ' flex-shrink:0;')}>Luminozitate</span>}
      <div
        ref={ref}
        data-bara="luminozitate"
        role="slider"
        aria-label="Luminozitate"
        aria-valuemin={1}
        aria-valuemax={100}
        aria-valuenow={afisat === null ? undefined : afisat}
        tabIndex={0}
        style={s('position:relative; flex:1 1 auto; min-width:0; height:' + (mob ? 44 : 40) + 'px; display:flex; align-items:center; cursor:' +
          (activ ? 'pointer' : 'default') + '; opacity:' + (activ ? 1 : 0.45) + '; touch-action:none;')}
        onPointerDown={(e) => { if (!activ) return; e.currentTarget.setPointerCapture(e.pointerId); aplica(e.clientX, false); }}
        onPointerMove={(e) => { if (!activ || drag === null) return; aplica(e.clientX, false); }}
        onPointerUp={(e) => { if (!activ) return; aplica(e.clientX, true); }}
        onKeyDown={(e) => {
          if (!activ || afisat === null) return;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onSet(Math.min(100, afisat + 5)); }
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onSet(Math.max(1, afisat - 5)); }
        }}
      >
        <div style={s('position:relative; width:100%; height:' + h + 'px; border-radius:' + (h / 2) +
          'px; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.09);')}>
          <div style={s('position:absolute; inset:0 auto 0 0; width:' + (afisat === null ? 0 : afisat) + '%; border-radius:' + (h / 2) +
            'px; background:linear-gradient(90deg, rgba(240,138,44,0.5), ' + ORANGE + '); transition:width .1s ease;')} />
          {afisat === null ? null : (
            <div style={s('position:absolute; top:50%; left:' + afisat + '%; width:' + (mob ? 24 : 22) + 'px; height:' + (mob ? 24 : 22) +
              'px; margin:-' + (mob ? 12 : 11) + 'px 0 0 -' + (mob ? 12 : 11) + 'px; border-radius:50%; pointer-events:none;' +
              ' background:radial-gradient(120% 120% at 34% 24%, #ffffff 0%, #f6ece0 100%);' +
              ' box-shadow:0 3px 8px rgba(0,0,0,0.5), inset 0 -1px 1px rgba(0,0,0,0.08);')} />
          )}
        </div>
      </div>
      <span style={s('flex-shrink:0; min-width:' + (mob ? 44 : 52) + 'px; text-align:right; font-family:' + DOTO +
        '; font-size:' + (mob ? 17 : 19) + 'px; font-weight:600; color:' + ORANGE + '; font-variant-numeric:tabular-nums;')}>
        {afisat === null ? '—' : afisat + '%'}
      </span>
    </div>
  );
}

// ----------------------------------------------------------- roata de culori
function RoataCulori({ rgb, activ, onPick, dim }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const hs = rgbToHs(rgb);

  const alege = useCallback((clientX, clientY) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = clientX - (r.left + r.width / 2), dy = clientY - (r.top + r.height / 2);
    const raza = r.width / 2;
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), raza);
    let unghi = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (unghi < 0) unghi += 360;
    onPick(hsvToRgb(unghi, dist / raza, 1));
  }, [onPick]);

  let cursor = null;
  if (hs) {
    const rad = ((hs.h - 90) * Math.PI) / 180;
    cursor = { x: 50 + Math.cos(rad) * hs.s * 50, y: 50 + Math.sin(rad) * hs.s * 50 };
  }

  return (
    <div
      ref={ref}
      data-roata="culori"
      style={s('position:relative; width:' + dim + 'px; height:' + dim + 'px; border-radius:50%; margin:0 auto; touch-action:none; cursor:' +
        (activ ? 'crosshair' : 'default') + '; opacity:' + (activ ? 1 : 0.45) +
        '; background:radial-gradient(circle closest-side, #ffffff 0%, rgba(255,255,255,0) 72%), conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);' +
        ' box-shadow:0 10px 30px -14px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.12);')}
      onPointerDown={(e) => { if (!activ) return; e.currentTarget.setPointerCapture(e.pointerId); setDrag(true); alege(e.clientX, e.clientY); }}
      onPointerMove={(e) => { if (!activ || !drag) return; alege(e.clientX, e.clientY); }}
      onPointerUp={() => setDrag(false)}
    >
      {cursor ? (
        <div style={s('position:absolute; left:' + cursor.x + '%; top:' + cursor.y + '%; width:22px; height:22px; margin:-11px 0 0 -11px; border-radius:50%;' +
          ' background:' + rgbCss(rgb) + '; border:2px solid #fff; box-shadow:0 2px 8px rgba(0,0,0,0.55); pointer-events:none;')} />
      ) : null}
    </div>
  );
}

// -------------------------------------------------------- carduri de istoric
// Trei carduri alăturate în loc de file: puterea, consumul şi tensiunea se văd
// deodată, nu pe rând. Fiecare îşi are propriul selector de interval şi propriile
// statistici, exact ca orice card de grafic din restul aplicaţiei.
function CarduriIstoric({ E, ui, lumina, mob }) {
  const metrici = [['power', 'Putere'], ['consum', 'Consum'], ['tensiune', 'Tensiune']];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + (mob ? 1 : 3) + ',minmax(0,1fr))', gap: 14, marginTop: 14, alignItems: 'stretch' }}>
      {metrici.map((m) => (
        <div key={m[0]} style={s(glassCard() + ' padding:' + (mob ? '14px' : '16px 18px') + ';')}>
          <LedHistory
            E={E}
            ui={ui}
            metric={m[0]}
            titlu={m[1]}
            cheie={lumina.id + ':' + m[0]}
            slotPower={lumina.power}
            slotEnergy={lumina.energy}
            slotVoltage={lumina.voltage}
            slotCurrent={lumina.current}
          />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- un panou
function Panou({ E, ui, lumina, onSalveaza, culoriSalvate, onSterge, onRedenumeste, onAplicaAmbele }) {
  const mob = !!(ui && ui.bp && ui.bp.mob);
  const slot = lumina.slot;
  const mapat = E.mapped(slot);
  const disponibil = mapat && E.available(slot);
  const aprins = mapat && E.isOn(slot);
  const rgb = E.rgbColor(slot);
  const pct = E.brightnessPct(slot);

  const [nume, setNume] = useState('');
  const [ultimaCuloare, setUltimaCuloare] = useState(null);
  const culoare = ultimaCuloare || rgb;

  const num = (sl) => {
    if (!E.mapped(sl) || !E.available(sl)) return null;
    const n = E.num(sl);
    return Number.isFinite(n) ? n : null;
  };
  const p = num(lumina.power), i = num(lumina.current), v = num(lumina.voltage);
  const trimite = (c) => { setUltimaCuloare(c); lumina.setRgb(c); };
  const acelasi = (a, b) => Array.isArray(a) && Array.isArray(b) && a.every((x, k) => Math.abs(x - b[k]) <= 8);

  const canalRgb = (idx, et) => (
    <div key={et} style={s('flex:1 1 66px; min-width:0; display:flex; align-items:center; gap:7px; padding:0 10px; min-height:38px; border-radius:11px;' +
      ' background:rgba(255,255,255,0.045); border:1px solid rgba(255,255,255,0.1);')}>
      <span style={s('font-family:' + SANS + '; font-size:10.5px; font-weight:600; color:' + TXT3 + ';')}>{et}</span>
      <input
        data-canal={et}
        type="number"
        min="0"
        max="255"
        value={culoare ? culoare[idx] : ''}
        disabled={!disponibil || !culoare}
        onChange={(e) => {
          if (!culoare) return;
          const c = culoare.slice();
          c[idx] = Math.max(0, Math.min(255, parseInt(e.target.value, 10) || 0));
          trimite(c);
        }}
        style={s('width:100%; min-width:0; border:none; outline:none; background:transparent; font-family:' + SANS +
          '; font-size:12.5px; font-weight:500; color:' + TXT + '; font-variant-numeric:tabular-nums;')}
      />
    </div>
  );

  return (
    <div>
      <div style={s(glassCard() + ' padding:' + (mob ? '16px' : '20px 22px') + ';')} data-card={'lumina:' + lumina.id}>
        <div style={s('display:flex; align-items:center; gap:13px; flex-wrap:wrap;')}>
          {/* Pastila iconiţei păstrează tratamentul amber al Dashboard-ului, ca
              orice alt card activ. Culoarea reală a benzii apare mai jos, în
              swatch — acolo unde chiar înseamnă „ce culoare are acum". */}
          <div style={s('width:44px; height:44px; flex-shrink:0; border-radius:14px; display:flex; align-items:center; justify-content:center; color:' +
            (aprins ? '#2a1608' : TXT2) + '; background:' + (aprins ? 'linear-gradient(140deg,' + ORANGE_HI + ',#DE7420)' : 'rgba(255,255,255,0.05)') +
            '; border:1px solid rgba(255,255,255,0.1);')}>
            {ic('sun', { size: 20 })}
          </div>
          <div style={{ minWidth: 0, flex: '1 1 150px' }}>
            <div style={s('font-family:' + SANS + '; font-size:16px; font-weight:500; color:' + TXT + ';')}>{lumina.nume}</div>
            <div style={s('display:flex; align-items:center; gap:6px; margin-top:3px;')}>
              <span style={s('width:7px; height:7px; border-radius:50%; flex-shrink:0; background:' + (disponibil ? '#5fbf7a' : ORANGE) + ';')} />
              <span style={s('font-family:' + SANS + '; font-size:11.5px; font-weight:300; color:' + (disponibil ? TXT3 : ORANGE) + ';')}>
                {!mapat ? 'Slot nemapat' : disponibil ? 'Disponibil' : 'Indisponibil în Home Assistant'}
              </span>
            </div>
          </div>
          <div
            className="hdTapY"
            data-power={lumina.id}
            style={s('display:flex; align-items:center; gap:8px; min-height:44px; padding:0 16px; border-radius:100px; flex-shrink:0; cursor:' +
              (disponibil ? 'pointer' : 'default') + '; opacity:' + (disponibil ? 1 : 0.5) + '; font-family:' + SANS +
              '; font-size:12.5px; font-weight:500; color:' + (aprins ? '#2a1608' : '#cfc4b8') +
              '; background:' + (aprins ? 'linear-gradient(140deg,' + ORANGE_HI + ',#DE7420)' : 'rgba(255,255,255,0.06)') +
              '; border:1px solid ' + (aprins ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)') + ';')}
            onClick={() => { if (disponibil) lumina.toggle(); }}
          >
            {ic('power', { size: 14, sw: 2.2 })}
            {aprins ? 'Pornit' : 'Oprit'}
          </div>
        </div>

        <div style={s('display:flex; gap:9px; flex-wrap:wrap; margin-top:14px;')}>
          <StatElectric icon="bolt" valoare={p === null ? null : decSep(p.toFixed(1))} unitate="W" eticheta="Putere" />
          <StatElectric icon="activity" valoare={i === null ? null : decSep(i.toFixed(2))} unitate="A" eticheta="Curent" />
          <StatElectric icon="gauge" valoare={v === null ? null : decSep(v.toFixed(1))} unitate="V" eticheta="Tensiune" />
        </div>

        <div style={{ marginTop: 18 }}>
          <BaraLuminozitate pct={pct} activ={disponibil && aprins} mob={mob} onSet={(x) => lumina.setBrightness(x)} />
          {!aprins && disponibil ? (
            <div style={s('font-family:' + SANS + '; font-size:10.5px; font-weight:300; color:' + TXT3 + '; margin-top:8px;')}>
              Banda e oprită — luminozitatea se reglează după ce o porneşti.
            </div>
          ) : null}
        </div>

        <div style={s('display:flex; gap:' + (mob ? '16px' : '24px') + '; align-items:flex-start; flex-wrap:wrap; margin-top:20px;')}>
          <div style={{ flex: '0 0 auto', margin: mob ? '0 auto' : 0 }}>
            <RoataCulori rgb={culoare} activ={disponibil} dim={mob ? 200 : 232} onPick={trimite} />
          </div>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <div style={s(etichetaSectiune)}>Culoare selectată</div>
            <div style={s('display:flex; align-items:center; gap:9px; margin:9px 0 16px; flex-wrap:wrap;')}>
              <div style={s('width:40px; height:38px; border-radius:11px; flex-shrink:0; background:' + rgbCss(culoare) +
                '; border:1px solid rgba(255,255,255,0.2);')} />
              {['R', 'G', 'B'].map((et, idx) => canalRgb(idx, et))}
            </div>

            <div style={s(etichetaSectiune)}>Presetări rapide</div>
            <div style={s('display:flex; gap:8px; flex-wrap:wrap; margin:9px 0 16px;')}>
              {PRESETURI.map((pr) => (
                <div
                  key={pr[0]}
                  className="hdTap"
                  data-preset={pr[0]}
                  title={pr[0]}
                  aria-label={pr[0]}
                  style={s(pastila(acelasi(culoare, pr[1]), disponibil) + (disponibil ? '' : ' opacity:0.5;'))}
                  onClick={() => { if (disponibil) trimite(pr[1]); }}
                >
                  <span style={s('width:16px; height:16px; border-radius:50%; flex-shrink:0; background:' + rgbCss(pr[1]) +
                    '; border:1px solid rgba(255,255,255,0.35);')} />
                  {pr[0]}
                </div>
              ))}
            </div>

            <div style={s(etichetaSectiune)}>Culori salvate</div>
            <div style={s('display:flex; gap:8px; flex-wrap:wrap; margin:9px 0 0; align-items:center;')}>
              {culoriSalvate.map((cs) => (
                <div key={cs.nume} style={s(pastila(acelasi(culoare, cs.rgb), false) + ' padding-right:4px;')}>
                  <div
                    className="hdTap"
                    data-salvat={cs.nume}
                    title={cs.nume}
                    aria-label={cs.nume}
                    /* Zona apăsabilă ocupă toată înălţimea pastilei, nu doar rândul de
                       text: altfel ţinta reală era de 16 px, imposibil de nimerit cu degetul. */
                    style={s('display:flex; align-items:center; align-self:stretch; min-height:38px; gap:8px; cursor:' +
                      (disponibil ? 'pointer' : 'default') + ';')}
                    onClick={() => { if (disponibil) trimite(cs.rgb); }}
                    onDoubleClick={() => onRedenumeste(cs.nume)}
                  >
                    <span style={s('width:16px; height:16px; border-radius:50%; flex-shrink:0; background:' + rgbCss(cs.rgb) +
                      '; border:1px solid rgba(255,255,255,0.35);')} />
                    {cs.nume}
                  </div>
                  <div
                    className="hdTap"
                    data-sterge={cs.nume}
                    aria-label={'Şterge ' + cs.nume}
                    title={'Şterge ' + cs.nume}
                    style={s('width:26px; height:26px; flex-shrink:0; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;')}
                    onClick={() => onSterge(cs.nume)}
                  >
                    {ic('close', { size: 12, sw: 2.2 })}
                  </div>
                </div>
              ))}
              <input
                data-nume-culoare
                value={nume}
                placeholder="nume culoare"
                onChange={(e) => setNume(e.target.value)}
                style={s('flex:0 1 130px; min-width:0; min-height:38px; padding:0 12px; border-radius:100px; font-family:' + SANS +
                  '; font-size:11.5px; color:' + TXT + '; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); outline:none;')}
              />
              <div
                className="hdTap"
                data-salveaza-culoare
                style={s(pastila(false, true) + ' color:' + ORANGE + '; border-color:rgba(240,138,44,0.35);' +
                  (culoare && nume.trim() ? '' : ' opacity:0.45;'))}
                onClick={() => { if (culoare && nume.trim()) { onSalveaza(nume.trim(), culoare); setNume(''); } }}
              >
                {ic('plus', { size: 14, sw: 2.2 })}
                Salvează culoarea
              </div>
            </div>

            <div style={s('display:flex; gap:9px; flex-wrap:wrap; margin-top:18px;')}>
              <div
                className="hdTap"
                data-aplica-ambele
                style={s(butonNeutru + (disponibil ? '' : ' opacity:0.5;'))}
                onClick={() => { if (disponibil) onAplicaAmbele(culoare, pct); }}
              >
                {ic('grip', { size: 15 })}
                Aplică la ambele
              </div>
            </div>
          </div>
        </div>
      </div>

      {lumina.istoric ? <CarduriIstoric E={E} ui={ui} lumina={lumina} mob={mob} /> : null}
    </div>
  );
}

// ----------------------------------------------------------- modul „Ambele"
function PanouAmbele({ E, ui, lumini, culoriSalvate }) {
  const mob = !!(ui && ui.bp && ui.bp.mob);
  const [pct, setPct] = useState(50);
  const [rgb, setRgb] = useState([255, 170, 90]);
  const disponibile = lumini.filter((l) => E.mapped(l.slot) && E.available(l.slot));
  const indisponibile = lumini.filter((l) => !(E.mapped(l.slot) && E.available(l.slot)));
  const catreToate = (fn) => disponibile.forEach(fn);

  return (
    <div style={s(glassCard() + ' padding:' + (mob ? '16px' : '20px 22px') + ';')} data-card="lumina:ambele">
      <div style={s('font-family:' + SANS + '; font-size:16px; font-weight:500; color:' + TXT + ';')}>Ambele benzi</div>
      <div style={s('font-family:' + SANS + '; font-size:11.5px; font-weight:300; color:' + TXT3 + '; margin-top:3px;')}>
        Comenzile pleacă separat către fiecare bandă. Nu există grup în Home Assistant.
      </div>

      {indisponibile.length ? (
        <div style={s('margin-top:12px; padding:10px 12px; border-radius:12px; font-family:' + SANS + '; font-size:11.5px; font-weight:400; color:#e0b183;' +
          ' background:rgba(240,138,44,0.07); border:1px solid rgba(240,138,44,0.2);')}>
          {indisponibile.map((l) => l.nume).join(', ')} {indisponibile.length > 1 ? 'sunt indisponibile' : 'e indisponibilă'} — comanda merge doar către restul.
        </div>
      ) : null}

      <div style={s(etichetaSectiune + ' margin-top:20px;')}>Alimentare</div>
      <div style={s('display:flex; gap:9px; flex-wrap:wrap; margin-top:10px;')}>
        <div className="hdTap" data-ambele="on" style={s(butonAmber)} onClick={() => catreToate((l) => l.turnOn())}>
          {ic('power', { size: 15, sw: 2.2 })}Ambele pornite
        </div>
        <div className="hdTap" data-ambele="off" style={s(butonNeutru)} onClick={() => catreToate((l) => l.turnOff())}>
          {ic('power', { size: 15, sw: 2.2 })}Ambele oprite
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <BaraLuminozitate pct={pct} activ={disponibile.length > 0} mob={mob} onSet={setPct} />
        <div className="hdTap" data-ambele="bri" style={s(butonAmber + ' margin-top:12px;')} onClick={() => catreToate((l) => l.setBrightness(pct))}>
          Aplică {pct}% pe amândouă
        </div>
      </div>

      <div style={s(etichetaSectiune + ' margin-top:20px;')}>Culoare comună</div>
      <div style={s('display:flex; gap:' + (mob ? '16px' : '24px') + '; align-items:flex-start; flex-wrap:wrap; margin-top:10px;')}>
        <div style={{ flex: '0 0 auto', margin: mob ? '0 auto' : 0 }}>
          <RoataCulori rgb={rgb} activ={disponibile.length > 0} dim={mob ? 190 : 210} onPick={setRgb} />
        </div>
        <div style={{ flex: '1 1 230px', minWidth: 0 }}>
          <div style={s('display:flex; align-items:center; gap:10px; margin-bottom:14px;')}>
            <div style={s('width:40px; height:38px; border-radius:11px; flex-shrink:0; background:' + rgbCss(rgb) + '; border:1px solid rgba(255,255,255,0.2);')} />
            <div style={s('font-family:' + DOTO + '; font-size:15px; font-weight:600; color:' + TXT + '; letter-spacing:0.04em;')}>{rgb.join(' · ')}</div>
          </div>
          <div style={s('display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;')}>
            {PRESETURI.concat(culoriSalvate.map((c) => [c.nume, c.rgb])).map((pr) => (
              <div
                key={pr[0]}
                className="hdTap"
                data-preset-ambele={pr[0]}
                title={pr[0]}
                aria-label={pr[0]}
                style={s(pastila(rgb.every((x, k) => Math.abs(x - pr[1][k]) <= 8), true))}
                onClick={() => setRgb(pr[1])}
              >
                <span style={s('width:16px; height:16px; border-radius:50%; flex-shrink:0; background:' + rgbCss(pr[1]) +
                  '; border:1px solid rgba(255,255,255,0.35);')} />
                {pr[0]}
              </div>
            ))}
          </div>
          <div className="hdTap" data-ambele="rgb" style={s(butonAmber)} onClick={() => catreToate((l) => l.setRgb(rgb))}>
            Aplică culoarea pe amândouă
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ pagina
export function LightingPage({ E, ui, lumini, selectat, setSelectat, culoriSalvate, onSalveaza, onSterge, onRedenumeste }) {
  const tabs = lumini.map((l) => ({ id: l.id, nume: l.nume })).concat([{ id: 'ambele', nume: 'Ambele' }]);
  const activ = tabs.some((t) => t.id === selectat) ? selectat : tabs[0].id;
  const lumina = lumini.filter((l) => l.id === activ)[0];

  const aplicaAmbele = (culoare, pct) => {
    lumini.forEach((l) => {
      if (!E.mapped(l.slot) || !E.available(l.slot)) return;
      if (culoare) l.setRgb(culoare);
      if (Number.isFinite(pct)) l.setBrightness(pct);
    });
  };

  return (
    <div>
      <div
        data-card="selector-lumini"
        style={s('display:flex; gap:8px; margin-bottom:16px; overflow-x:auto; padding-bottom:2px; -webkit-overflow-scrolling:touch;')}
      >
        {tabs.map((t) => (
          <div
            key={t.id}
            className="hdTap"
            data-lumina-tab={t.id}
            style={s(pastila(t.id === activ, true) + ' min-height:40px; padding:0 16px; font-size:12.5px;')}
            onClick={() => setSelectat(t.id)}
          >
            {t.nume}
          </div>
        ))}
      </div>

      {activ === 'ambele' ? (
        <PanouAmbele E={E} ui={ui} lumini={lumini} culoriSalvate={culoriSalvate} />
      ) : lumina ? (
        <Panou
          E={E}
          ui={ui}
          lumina={lumina}
          culoriSalvate={culoriSalvate}
          onSalveaza={onSalveaza}
          onSterge={onSterge}
          onRedenumeste={onRedenumeste}
          onAplicaAmbele={aplicaAmbele}
        />
      ) : null}
    </div>
  );
}

export default LightingPage;
