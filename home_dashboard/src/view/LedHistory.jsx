// Istoricul electric al unei benzi LED, afişat în „Setări avansate".
//
// De ce statistici şi nu istoric brut: HA agregă deja pe 5 minute / oră / zi,
// cu mean, min şi max pentru fiecare interval. Citind agregatele, un grafic de
// 30 de zile costă 30 de puncte, nu zeci de mii — şi nu recalculăm noi ceva ce
// recorder-ul a calculat deja corect. Statisticile supravieţuiesc şi epurării
// recorder-ului, spre deosebire de stările brute.
//
// Componenta se montează odată cu modalul şi se demontează cu el, deci cererea
// pleacă doar când secţiunea chiar e vizibilă.
import React, { useState } from 'react';
import { useStatistics } from '../ha/history.js';
import { s, SANS, DOTO, ORANGE, TXT, TXT3 } from '../design/tokens.js';
import { lineChart, barChart } from '../design/graphics.js';
import { dec as decSep } from '../design/format.js';

const ORA = 3600 * 1000;
const SERIE = '#F08A2C';

// interval -> [durata în ms, perioada de agregare HA, eticheta]
const INTERVALE = {
  '24h': [24 * ORA, '5minute', '24h'],
  '7d': [7 * 24 * ORA, 'hour', '7 zile'],
  '30d': [30 * 24 * ORA, 'day', '30 zile']
};

const FILE_TAB = [
  { key: 'power', eticheta: 'Putere', unit: 'W' },
  { key: 'consum', eticheta: 'Consum', unit: 'kWh' },
  { key: 'tensiune', eticheta: 'Tensiune', unit: 'V' }
];

function eticheteTimp(randuri, interval) {
  return randuri.map(function (r) {
    const d = new Date(r.start);
    const zi = d.getDate() + '.' + (d.getMonth() + 1);
    if (interval === '30d') return zi;
    if (interval === '7d') return zi + ' ' + String(d.getHours()).padStart(2, '0');
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  });
}

// Consumul PE INTERVAL al unui contor cumulativ.
//
// Sursa preferată e `change`, câmpul pe care HA îl calculează el însuşi pentru
// fiecare bucată: e delta corectă, tratează resetările de contor şi — esenţial —
// EXISTĂ ŞI PENTRU PRIMA BUCATĂ.
//
// Prima versiune scădea manual `sum[i] - sum[i-1]`. Rezultatele coincideau
// exact cu `change` pentru bucăţile 2..n, dar PRIMA se pierdea. Cu o singură
// bucată în interval — cazul lui 7 zile şi 30 de zile acum, cât timp istoricul e
// scurt — graficul rămânea gol şi totalul afişa 0, deşi consumul exista.
//
// Scăderea manuală rămâne ca rezervă, pentru instalări unde `change` lipseşte;
// acolo pierdem tot prima bucată, dar e mai bine decât nimic.
function consumPeInterval(randuri) {
  const areChange = randuri.length > 0 && randuri.every(function (r) { return Number.isFinite(r.change); });
  if (areChange) {
    return randuri.map(function (r) { return r.change > 0 ? r.change : 0; });
  }
  const out = [];
  for (let i = 1; i < randuri.length; i++) {
    const a = randuri[i - 1].sum;
    const b = randuri[i].sum;
    const d = (Number.isFinite(b) ? b : 0) - (Number.isFinite(a) ? a : 0);
    out.push(d > 0 ? d : 0);
  }
  return out;
}

/** true când avem `change` pentru fiecare bucată, deci nicio bucată nu se pierde. */
function areChangeComplet(randuri) {
  return randuri.length > 0 && randuri.every(function (r) { return Number.isFinite(r.change); });
}

function medieMaxMin(valori) {
  const v = (valori || []).filter(Number.isFinite);
  if (!v.length) return null;
  return {
    medie: v.reduce(function (a, b) { return a + b; }, 0) / v.length,
    max: Math.max.apply(null, v),
    min: Math.min.apply(null, v)
  };
}

// kWh sub 1 se citesc mai bine în Wh. Alegerea se face pe TOTAL, ca tot blocul
// să rămână în aceeaşi unitate.
//
// Zecimalele se aleg după mărime, nu fix. Cu zero zecimale, un consum real de
// 0,46 Wh se afişa „0 Wh" — adică exact minciuna pe care încercăm s-o evităm în
// tot restul aplicaţiei: o valoare care spune „nimic" când există ceva.
function unitateEnergie(totalKwh) {
  if (totalKwh >= 1) return { factor: 1, unit: 'kWh', zecimale: 3 };
  const wh = totalKwh * 1000;
  return { factor: 1000, unit: 'Wh', zecimale: wh >= 10 ? 0 : 2 };
}

export default function LedHistory(props) {
  const E = props.E;
  const ui = props.ui;
  const [fila, setFila] = useState('power');
  const [interval2, setInterval2] = useState('24h');
  const mob = !!(ui && ui.bp && ui.bp.mob);

  const idPower = E.idOf(props.slotPower);
  const idEnergy = E.idOf(props.slotEnergy);
  const idVolt = E.idOf(props.slotVoltage);
  const durata = INTERVALE[interval2][0];
  const perioada = INTERVALE[interval2][1];

  // Aliniem capătul la perioada de agregare. Fără asta, fiecare re-render ar
  // produce un `end` uşor diferit, ar invalida cheia hook-ului şi ar re-cere
  // datele la nesfârşit.
  const pas = perioada === 'day' ? 24 * ORA : perioada === 'hour' ? ORA : 5 * 60 * 1000;
  const sfarsit = Math.ceil(Date.now() / pas) * pas;
  const inceput = sfarsit - durata;

  const idCerut = fila === 'power' ? idPower : fila === 'consum' ? idEnergy : idVolt;
  const tipuri = fila === 'consum' ? ['sum', 'change'] : ['mean', 'min', 'max'];
  const rez = useStatistics(idCerut ? [idCerut] : [], inceput, sfarsit, perioada, tipuri);
  const randuri = (rez.stats && idCerut && rez.stats[idCerut]) || [];
  const meta = FILE_TAB.filter(function (f) { return f.key === fila; })[0];

  let valori = [];
  let etichete = [];
  let unit = meta.unit;
  let rezumat = null;
  let total = null;
  if (randuri.length) {
    if (fila === 'consum') {
      const brut = consumPeInterval(randuri);
      const totalKwh = brut.reduce(function (a, b) { return a + b; }, 0);
      const u = unitateEnergie(totalKwh);
      valori = brut.map(function (v) { return Math.round(v * u.factor * 1000) / 1000; });
      etichete = eticheteTimp(areChangeComplet(randuri) ? randuri : randuri.slice(1), interval2);
      unit = u.unit;
      total = { valoare: totalKwh * u.factor, unit: u.unit, zecimale: u.zecimale };
    } else {
      valori = randuri.map(function (r) { return Number.isFinite(r.mean) ? Math.round(r.mean * 10) / 10 : 0; });
      etichete = eticheteTimp(randuri, interval2);
      const st = medieMaxMin(valori);
      const mins = randuri.map(function (r) { return r.min; }).filter(Number.isFinite);
      const maxs = randuri.map(function (r) { return r.max; }).filter(Number.isFinite);
      if (st) {
        rezumat = {
          medie: st.medie,
          max: maxs.length ? Math.max.apply(null, maxs) : st.max,
          min: mins.length ? Math.min.apply(null, mins) : st.min
        };
      }
    }
  }

  const areDate = valori.length > 0;
  const nemapat = !idCerut;
  const chartEl = !areDate
    ? null
    : fila === 'consum'
      ? barChart(valori, etichete, unit, null, function () {}, mob)
      // Puterea nu poate fi negativa, dar graficul isi lasa implicit o marja sub
      // minim si desena o axa care cobora sub zero. Fixam pornirea la 0 pentru
      // putere; tensiunea ramane auto-scalata, altfel 12,3 V ar fi o linie lipita
      // de marginea de sus a unui interval 0-12.
      : lineChart([{ name: meta.eticheta, color: SERIE, values: valori }], etichete, unit,
        fila === 'power' ? 0 : undefined, undefined, null, function () {}, mob);

  // Rezumatul electric arată valorile LIVE, nu medii din istoric.
  function liveNum(slot) {
    if (!E.mapped(slot) || !E.available(slot)) return null;
    const n = E.num(slot);
    return Number.isFinite(n) ? n : null;
  }
  const electric = [
    ['Putere', liveNum(props.slotPower), 'W', 1],
    ['Curent', liveNum(props.slotCurrent), 'A', 2],
    ['Tensiune', liveNum(props.slotVoltage), 'V', 1]
  ];

  const sep = 'height:1px; margin:20px 0 0; background:rgba(255,255,255,0.075);';
  const capStyle = 'display:flex; align-items:baseline; justify-content:space-between; gap:12px; flex-wrap:wrap; margin:18px 0 12px;';
  const titluStyle = 'font-family:' + SANS + '; font-size:10px; font-weight:500; text-transform:uppercase; letter-spacing:0.09em; color:' + TXT3 + ';';
  const valStyle = 'font-family:' + DOTO + '; font-size:19px; font-weight:600; color:' + ORANGE + '; letter-spacing:0.02em; font-variant-numeric:tabular-nums;';
  const grilaElectric = 'display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-bottom:14px;';
  const celula = 'padding:9px 11px; border-radius:12px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.07); min-width:0;';
  const etCelula = 'font-family:' + SANS + '; font-size:10px; font-weight:400; color:' + TXT3 + '; margin-bottom:3px;';
  const vaCelula = 'font-family:' + SANS + '; font-size:13.5px; font-weight:500; color:' + TXT + '; font-variant-numeric:tabular-nums;';
  const bara = 'display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;';
  const chip = function (activ) {
    return 'min-height:34px; display:flex; align-items:center; padding:0 13px; border-radius:100px; cursor:pointer; font-family:' + SANS +
      '; font-size:11.5px; font-weight:' + (activ ? '500' : '400') + '; color:' + (activ ? '#2a1608' : '#b3a89c') +
      '; background:' + (activ ? ORANGE : 'rgba(255,255,255,0.05)') + '; border:1px solid ' + (activ ? 'transparent' : 'rgba(255,255,255,0.09)') + ';';
  };
  const gol = 'padding:30px 16px; text-align:center; border-radius:14px; font-family:' + SANS + '; font-size:11.5px; font-weight:300; color:' + TXT3 +
    '; background:repeating-linear-gradient(135deg, rgba(255,255,255,0.02) 0 8px, transparent 8px 16px); border:1px dashed rgba(255,255,255,0.11);';
  const statRand = 'display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;';
  const statChip = 'display:flex; align-items:baseline; gap:6px; padding:7px 11px; border-radius:100px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.06);';
  const statEt = 'font-family:' + SANS + '; font-size:10px; font-weight:400; color:' + TXT3 + ';';
  const statVa = 'font-family:' + SANS + '; font-size:11.5px; font-weight:500; color:' + TXT + '; font-variant-numeric:tabular-nums;';

  const cap = fila === 'consum'
    ? (total ? decSep(total.valoare.toFixed(total.zecimale)) + ' ' + total.unit : '—')
    : (rezumat ? decSep(rezumat.medie.toFixed(1)) + ' ' + unit : '—');

  return (
    <div data-card={'led-istoric:' + (props.cheie || '')}>
      <div style={s(sep)} />
      <div style={s(capStyle)}>
        <div style={s(titluStyle)}>Istoric şi consum</div>
        <div style={s(valStyle)}>{cap}</div>
      </div>

      <div style={s(grilaElectric)}>
        {electric.map(function (e) {
          return (
            <div key={e[0]} style={s(celula)}>
              <div style={s(etCelula)}>{e[0]}</div>
              <div style={s(vaCelula)}>{e[1] === null ? '—' : decSep(e[1].toFixed(e[3])) + ' ' + e[2]}</div>
            </div>
          );
        })}
      </div>

      <div style={s(bara)}>
        {FILE_TAB.map(function (f) {
          return (
            <div
              key={f.key}
              className="hdTap"
              data-fila={f.key}
              style={s(chip(fila === f.key))}
              onClick={function () { setFila(f.key); }}
            >
              {f.eticheta}
            </div>
          );
        })}
      </div>

      <div style={s(bara)}>
        {Object.keys(INTERVALE).map(function (k) {
          return (
            <div
              key={k}
              className="hdTap"
              data-interval={k}
              style={s(chip(interval2 === k))}
              onClick={function () { setInterval2(k); }}
            >
              {INTERVALE[k][2]}
            </div>
          );
        })}
      </div>

      {nemapat ? (
        <div style={s(gol)}>Slotul nu e mapat încă.</div>
      ) : rez.error ? (
        <div style={s(gol)}>Istoricul nu a putut fi citit: {rez.error}</div>
      ) : rez.loading && !areDate ? (
        <div style={s(gol)}>se încarcă istoricul…</div>
      ) : !areDate ? (
        <div style={s(gol)}>Fără date în statisticile HA pentru acest interval.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>{chartEl}</div>
      )}

      {areDate && fila !== 'consum' && rezumat ? (
        <div style={s(statRand)}>
          {[['Medie', rezumat.medie], ['Maxim', rezumat.max], ['Minim', rezumat.min]].map(function (x) {
            return (
              <div key={x[0]} style={s(statChip)}>
                <span style={s(statEt)}>{x[0]}</span>
                <span style={s(statVa)}>{decSep(x[1].toFixed(1))} {unit}</span>
              </div>
            );
          })}
        </div>
      ) : null}

      {areDate && fila === 'consum' && total ? (
        <div style={s(statRand)}>
          <div style={s(statChip)}>
            <span style={s(statEt)}>Total în interval</span>
            <span style={s(statVa)}>{decSep(total.valoare.toFixed(total.zecimale))} {total.unit}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
