// Cardul rapid „LED Birou" din coloana stângă a paginii Acasă.
//
// Densitatea şi stilul sunt ale coloanei — acelaşi `glassCard()`, aceleaşi
// pastile de comutare, acelaşi amber pentru starea activă — ca să stea firesc
// sub „Poartă Intrare", nu ca un corp străin.
//
// Aici NU există roată de culori, RGB numeric, presetări, culori salvate sau
// grafice: toate rămân pe pagina „Iluminat". Cardul spune doar ce vrei să ştii
// dintr-o privire şi te duce mai departe cu o apăsare.
//
// Culoarea reală a benzii apare exclusiv în bulina de lângă nume. Restul
// cardului rămâne în cromatica Dashboard-ului, indiferent ce culoare are banda.
import React, { useRef, useCallback } from 'react';
import { s, SANS, ORANGE, TXT, TXT3, glassCard, togglePill, toggleKnob, toggleText } from '../design/tokens.js';
import { ic } from '../design/icons.js';
import { dec as decSep } from '../design/format.js';

const rgbCss = (rgb) => (Array.isArray(rgb) ? 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')' : 'rgba(255,255,255,0.14)');

/** Bară subţire de luminozitate: destul cât să reglezi din drum, nu cât să
 *  înlocuiască pagina. Se poate trage cu degetul şi cu mouse-ul. */
function MiniBara({ pct, activ, onSet }) {
  const ref = useRef(null);
  const dinX = useCallback((clientX) => {
    const el = ref.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return Math.max(1, Math.min(100, Math.round(((clientX - r.left) / (r.width || 1)) * 100)));
  }, []);
  const aplica = useCallback((e) => {
    if (!activ) return;
    e.stopPropagation();
    const v = dinX(e.clientX);
    if (v !== null) onSet(v);
  }, [activ, dinX, onSet]);

  return (
    <div
      ref={ref}
      data-mini-bara
      data-nu-naviga
      role="slider"
      aria-label="Luminozitate"
      aria-valuemin={1}
      aria-valuemax={100}
      aria-valuenow={pct === null ? undefined : pct}
      style={s('height:26px; display:flex; align-items:center; margin-top:7px; touch-action:none; cursor:' +
        (activ ? 'pointer' : 'default') + '; opacity:' + (activ ? 1 : 0.4) + ';')}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => { if (!activ) return; e.currentTarget.setPointerCapture(e.pointerId); aplica(e); }}
      onPointerMove={(e) => { if (!activ || e.buttons === 0) return; aplica(e); }}
    >
      <div style={s('position:relative; width:100%; height:6px; border-radius:3px; background:rgba(255,255,255,0.08);')}>
        <div style={s('position:absolute; inset:0 auto 0 0; width:' + (pct === null ? 0 : pct) +
          '%; border-radius:3px; background:linear-gradient(90deg, rgba(240,138,44,0.5), ' + ORANGE + '); transition:width .1s ease;')} />
      </div>
    </div>
  );
}

function Rand({ E, lumina, eticheta, onNaviga, ultimul }) {
  const slot = lumina.slot;
  const mapat = E.mapped(slot);
  const disponibil = mapat && E.available(slot);
  const aprins = mapat && E.isOn(slot);
  const pct = E.brightnessPct(slot);
  const rgb = E.rgbColor(slot);
  const w = (() => {
    if (!E.mapped(lumina.power) || !E.available(lumina.power)) return null;
    const n = E.num(lumina.power);
    return Number.isFinite(n) ? n : null;
  })();

  const meta = !mapat
    ? 'Slot nemapat'
    : !disponibil
      ? 'Indisponibil'
      : (aprins ? (pct === null ? 'Pornit' : pct + '%') : 'Oprit') + (w === null ? '' : ' · ' + decSep(w.toFixed(1)) + ' W');

  return (
    <div
      /* FĂRĂ `hdTap` aici: clasa aceea întinde un `::after` cu `inset:-7px` peste
         tot elementul, iar stratul acela acoperă comutatorul şi bara dinăuntru.
         O apăsare pe comutator ajungea la rând şi te muta pe pagina Iluminat în
         loc să aprindă banda. `hdTap` e pentru controale mici şi fără copii
         interactivi; rândul e destul de mare şi nu are nevoie de extindere. */
      data-led-rand={lumina.id}
      role="button"
      tabIndex={0}
      aria-label={'Deschide ' + lumina.nume}
      /* Navigarea se declanseaza doar daca apasarea NU a pornit din comutator
         sau din bara de luminozitate. Verificarea originii e mai sigura decat
         oprirea propagarii: cu handlere imbricate, un clic pe un copil al
         comutatorului ajungea totusi la rand si te muta de pagina in loc sa
         aprinda banda. */
      onClick={(e) => { if (e.target.closest && e.target.closest('[data-nu-naviga]')) return; onNaviga(lumina.id); }}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if (e.target.closest && e.target.closest('[data-nu-naviga]')) return;
        e.preventDefault();
        onNaviga(lumina.id);
      }}
      style={s('padding:10px 2px ' + (ultimul ? '2px' : '11px') + '; cursor:pointer;' +
        (ultimul ? '' : ' border-bottom:1px solid rgba(255,255,255,0.055);'))}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* singurul loc din card unde apare culoarea reală a benzii */}
        <span style={s('width:15px; height:15px; border-radius:50%; flex-shrink:0; background:' + rgbCss(aprins ? rgb : null) +
          '; border:1px solid rgba(255,255,255,' + (aprins ? '0.4' : '0.16') + ');')} />
        <div style={{ minWidth: 0, flex: '1 1 auto' }}>
          <div style={s('font-family:' + SANS + '; font-size:12.5px; font-weight:500; color:' + TXT + ';')}>{eticheta}</div>
          <div style={s('font-family:' + SANS + '; font-size:11px; font-weight:300; color:' + (disponibil ? TXT3 : ORANGE) + '; margin-top:1px;')}>
            {meta}
          </div>
        </div>
        <div
          className="hdTapY"
          role="switch"
          aria-checked={aprins ? 'true' : 'false'}
          aria-label={eticheta}
          data-led-toggle={lumina.id}
          data-nu-naviga
          style={s(togglePill(aprins) + (disponibil ? '' : ' opacity:0.5;'))}
          onClick={(e) => { e.stopPropagation(); if (disponibil) lumina.toggle(); }}
        >
          <div style={s(toggleKnob(aprins))}>
            {ic('power', { size: 12.5, color: aprins ? '#C4600F' : '#cfc4b8', sw: 2.2 })}
          </div>
          <span style={s(toggleText(aprins))}>{aprins ? 'on' : 'off'}</span>
        </div>
      </div>
      <MiniBara pct={pct} activ={disponibil && aprins} onSet={(v) => lumina.setBrightness(v)} />
    </div>
  );
}

export function LedQuickCard({ E, lumini, onNaviga, cardTitleStyle, cardSubStyle }) {
  if (!lumini || !lumini.length) return null;
  const eticheta = (l) => l.nume.replace(/^LED Birou\s*/i, '') || l.nume;

  return (
    <div style={s(glassCard())} data-card="led-birou-rapid">
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={s('display:flex; color:' + ORANGE + ';')}>{ic('sun', { size: 17, sw: 1.9 })}</span>
        <div style={{ minWidth: 0 }}>
          <div style={s(cardTitleStyle)}>LED Birou</div>
          <div style={s(cardSubStyle)}>Două benzi RGB · Shelly</div>
        </div>
      </div>

      <div style={{ marginTop: 6 }}>
        {lumini.map((l, i) => (
          <Rand
            key={l.id}
            E={E}
            lumina={l}
            eticheta={eticheta(l)}
            onNaviga={onNaviga}
            ultimul={i === lumini.length - 1}
          />
        ))}
      </div>

      <div
        className="hdTapY"
        role="button"
        tabIndex={0}
        data-led-cta
        aria-label="Deschide Iluminat"
        onClick={() => onNaviga(null)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNaviga(null); } }}
        style={s('margin-top:12px; min-height:38px; display:flex; align-items:center; justify-content:center; gap:7px; border-radius:12px; cursor:pointer;' +
          ' font-family:' + SANS + '; font-size:11.5px; font-weight:400; color:#c8bcae;' +
          ' background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.075);')}
      >
        <span style={s('display:flex; color:' + ORANGE + ';')}>{ic('sliders', { size: 14 })}</span>
        Deschide Iluminat
      </div>
    </div>
  );
}

export default LedQuickCard;
