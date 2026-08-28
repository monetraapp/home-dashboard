import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  s, SANS, SERIF, DOTO, ORANGE, ORANGE_HI, TXT, TXT2, TXT3,
  glassCard, navItemStyle, navIconBox, navLabel, togglePill, toggleKnob, toggleText,
  PILL_ON, pad, DAYS, MONTHS
} from '../design/tokens.js';
import { ic } from '../design/icons.js';
import { arcGauge, sliderRow, ribbonRing, segmentRing } from '../design/graphics.js';
import PoolChart, { cursorLabel } from './PoolChart.jsx';
import { useBreakpoint } from '../design/breakpoints.js';
import { fmtUnitAuto, fmtTemp, dec } from '../design/format.js';
import { useHa } from '../ha/context.js';
import { useEntities, VERIFY, NA, HVAC_LABEL } from '../ha/entities.js';
import { useHistory, useStatistics } from '../ha/history.js';
import { statMeanSeries } from '../design/energyMath.js';
import { trimEdges } from '../design/curve.js';
import { Tip, Roll, pressProps } from './overlay.jsx';
import { EnergyInstrument } from './Energy.jsx';
import { useDailyForecast, formatForecast, COND_RO, COND_ICON } from '../ha/weather.js';
import { loadPrefs, savePrefs } from '../ha/store.js';
import {
  NAV, DEVICE_CARDS, CARD_BY_ID, DEFAULT_TRACKED, PAGE_DEVICES, PAGE_DEVICE_HEAD,
  MEDIA_ZONES, MEDIA_ZONE_OF
} from '../model/devices.js';
import { PAGES, PAGE_HERO } from '../model/pages.js';
import { useRegistries } from '../ha/registries.js';
import { ZonePage } from './ZonePage.jsx';
import { DevicesPage } from './DevicesPage.jsx';
import { ProgramareAC } from './AcSchedule.jsx';
import { useDeviceHealth } from '../ha/deviceHealth.js';
import { useSystemHealth } from '../ha/systemHealth.js';
import { healthTotals } from '../ha/health.js';
import { buildPageCard, buildDeviceCard, buildSidebarDevice, buildModal, marcajComanda, marcajImpuls } from './build.js';

const AC_UNIT_IDS = ['ac-vortex', 'ac-etaj', 'ac-vivax'];

function collectHistorySlots(pageDef) {
  const out = [];
  if (!pageDef) return out;
  pageDef.cards.forEach((c) =>
    c.blocks.forEach((b) => {
      if (b.type === 'chart') {
        b.series.forEach((se) => {
          if (se.sum) out.push(...se.sum);
          else if (se.slot) out.push(se.slot);
        });
      }
      if (b.type === 'timeline') b.rows.forEach((r) => out.push(r.slot));
    })
  );
  return out;
}

export default function Dashboard({ onOpenMapping }) {
  const ha = useHa();
  const E = useEntities();
  const prefs = useMemo(() => loadPrefs(), []);
  const bp = useBreakpoint();
  const { mob, tab, narrow } = bp;

  const [page, setPage] = useState('acasa');
  const [hoverKey, setHoverKey] = useState(null);
  const [hoverChart, setHoverChart] = useState(null);
  const [modalId, setModalId] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!modalId && !pickerOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (pickerOpen) setPickerOpen(false);
        else if (modalId) setModalId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalId, pickerOpen]);
  const [dragId, setDragId] = useState(null);
  const [acIndex, setAcIndex] = useState(0);
  const [openAcc, setOpenAcc] = useState('ac-vortex');
  const [mediaZone, setMediaZone] = useState('Toate');
  const [tracked, setTracked] = useState(() =>
    Array.isArray(prefs.tracked) && prefs.tracked.length ? prefs.tracked.filter((id) => CARD_BY_ID[id]) : DEFAULT_TRACKED.slice()
  );
  // Comutatorul "Animaţii" (v1.1.4): pornit implicit, persistat în prefs.
  // Oprit -> diagrama de flux rămâne statică (fără particule, fără rAF) şi
  // cifrele din rândul-erou sar direct la valoarea nouă.
  const [anim, setAnim] = useState(() => prefs.anim !== false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    savePrefs(Object.assign({}, loadPrefs(), { tracked, anim }));
  }, [tracked, anim]);

  const isAcasa = page === 'acasa';
  // (v1.5.0) „Zone" nu are definiţie în PAGES: se construieşte din registrele
  // HA la execuţie, deci trece pe lângă tot lanţul pageDef/carduri/dispozitive.
  const isZone = page === 'zone';
  // (v1.6.0) „Dispozitive" urmeaza acelasi tipar ca „Zone": fara definitie in
  // PAGES, construita din registre + intrarile de configurare la executie.
  const isDisp = page === 'dispozitive';
  const pageDef = isAcasa || isZone || isDisp ? null : PAGES[page];
  const [zoneSel, setZoneSel] = useState(null);
  const [dispSel, setDispSel] = useState(null);
  const [dispFiltru, setDispFiltru] = useState(null);
  const { etaje: zoneEtaje, loading: zoneLoading, error: zoneError } = useRegistries(isZone);
  const { devices: dispLista, loading: dispLoading, error: dispError, now: dispNow } = useDeviceHealth(isDisp);
  const { sys, browser: dispBrowser, cota: dispCota, error: sysError } = useSystemHealth(isDisp);
  const dispTotals = isDisp && dispLista ? healthTotals(dispLista) : null;

  // ------------------------------------------------------------- istoric
  const histSlots = useMemo(() => collectHistorySlots(pageDef), [pageDef]);
  const histIds = useMemo(
    () => Array.from(new Set(histSlots.map((sl) => E.idOf(sl)).filter(Boolean))),
    [histSlots, E]
  );
  const hist = useHistory(histIds, 7);

  const poolId = E.idOf('sensor.apa_temp');
  // (v1.4.0) Statistici ORARE, nu istoric brut: HA agregă singur media pe oră
  // pentru entităţile cu state_class, deci 7 zile = cel mult 168 de puncte,
  // mărginit şi rezistent la epurarea recorder-ului (istoricul brut ar fi fost
  // nemărginit şi s-ar fi tăiat la 10 zile). Fereastra e ancorată la ORA
  // curentă, nu la `now` (care se schimbă în fiecare secundă) — altfel
  // interogarea s-ar reface continuu.
  const poolHourAnchor = Math.floor(now.getTime() / 3600000);
  const poolWin = useMemo(() => {
    const end = (poolHourAnchor + 1) * 3600000;
    return { start: end - 168 * 3600000, end, hours: 168 };
  }, [poolHourAnchor]);
  const poolStats = useStatistics(isAcasa && poolId ? [poolId] : [], poolWin.start, poolWin.end, 'hour');
  const [poolCursor, setPoolCursor] = useState(null);

  // ------------------------------------------------------------------ ui
  const ui = {
    page, hoverKey, setHoverKey, hoverChart, setHoverChart, modalId, setModalId,
    openAcc, setOpenAcc, mediaZone, setMediaZone, tracked, bp, anim,
    catalog: { DEVICE_CARDS, CARD_BY_ID }
  };

  const acUnits = AC_UNIT_IDS.map((id) => CARD_BY_ID[id]).filter(Boolean);
  const acUnit = acUnits[acIndex % acUnits.length];
  const acOn = acUnit ? E.mapped(acUnit.slot) && E.isOn(acUnit.slot) : false;
  // (v2.0.1) Acelaşi marcaj ca la restul butoanelor Power: inelul vine din
  // registrul de comenzi, nu dintr-un cronometru propriu al acestui card.
  const acMarcaj = acUnit ? marcajComanda(E, acUnit.slot) : null;
  const acTarget = acUnit ? E.climateTarget(acUnit.slot) : null;
  const acStale = acUnit ? E.climateTargetStale(acUnit.slot) : false;
  const acDecimals = acUnit ? E.tempDecimals(Math.max(1, E.climateStep(acUnit.slot))) : 0;
  const acMin = acUnit ? E.climateMin(acUnit.slot) : 16;
  const acMax = acUnit ? E.climateMax(acUnit.slot) : 30;
  const acFrac = acTarget === null ? 0 : (acTarget - acMin) / ((acMax - acMin) || 1);

  // ---------------------------------------------------------------- vreme
  const weatherId = E.idOf('weather.main');
  const forecastRaw = useDailyForecast(weatherId);
  const forecast = formatForecast(forecastRaw, 6);
  const wSt = E.ent('weather.main');
  // (v1.3.0) Temperaturile măsurate se afişează mereu cu 1 zecimală (format.js).
  const weatherTemp = wSt ? (wSt.attributes.temperature !== undefined ? fmtTemp(wSt.attributes.temperature).v : NA) : VERIFY;
  const weatherCond = wSt ? COND_RO[wSt.state] || wSt.state : VERIFY;
  const weatherIcon = wSt ? COND_ICON[wSt.state] || 'cloud' : 'cloud';

  // --------------------------------------------------------- date derivate
  const houseTemps = AC_UNIT_IDS.map((id) => CARD_BY_ID[id])
    .filter(Boolean)
    .map((d) => E.num(d.slot, 'current_temperature'))
    .filter((v) => v !== null);
  const houseAvg = houseTemps.length ? Math.round((houseTemps.reduce((a, b) => a + b, 0) / houseTemps.length) * 10) / 10 : null;

  const trackedCards = tracked.map((id) => CARD_BY_ID[id]).filter(Boolean);
  const onCount = trackedCards.filter((d) => E.mapped(d.slot) && E.isOn(d.slot)).length;
  // ------------------------------------------------------------ poartă
  // (v1.9.0) Poarta e singurul control fără stare de citit: nu există senzor de
  // poziţie. Tot ce urmează descrie COMANDA, niciodată poziţia porţii.
  const poartaMapata = E.mapped('poarta.comanda') && E.mapped('poarta.releu');
  const poartaB = poartaMapata ? marcajImpuls(E) : null;
  const poartaCd = poartaMapata ? E.poartaCooldown(now.getTime()) : { activ: false, ramas: 0 };
  const poartaOnline = poartaMapata && E.available('poarta.releu');
  const poartaUltima = poartaMapata ? E.poartaUltimaComanda() : null;
  const poartaService = poartaMapata && E.isOn('poarta.service');
  const poartaIntent = poartaMapata ? E.poartaIntentie(now.getTime()) : null;
  const smMarcaj = poartaMapata ? marcajComanda(E, 'poarta.service') : null;
  const poartaInZbor = !!(poartaB && poartaB.inZbor);
  // Blocăm butonul cât timp cooldown-ul rulează: intrarea START a Linomatik e
  // secvenţială, iar al doilea impuls ar însemna STOP, nu „deschide mai tare".
  const poartaBlocat = !poartaOnline || poartaCd.activ || poartaInZbor;
  const poartaStare = !poartaMapata
    ? 'VERIFY · sloturile porţii nu sunt mapate'
    : !poartaOnline
      ? 'Releu indisponibil — comanda nu poate pleca'
      : poartaInZbor
        ? ''
        : poartaCd.activ
          ? 'Comandă trimisă · se poate retrimite în ' + poartaCd.ramas + ' s'
          : 'Control disponibil';


  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthPct = Math.round(((now.getDate() - 1 + now.getHours() / 24) / daysInMonth) * 100);
  // (v1.3.0) LG raportează Wh brut — inelul afişa "9034.4 Wh". Formatarea
  // canonică (format.js) alege singură scara: "9.0 kWh".
  const energyParts = fmtUnitAuto(E.num('energy.total_luna'), E.attr('energy.total_luna', 'unit_of_measurement') || 'kWh');
  const energyValue = E.mapped('energy.total_luna') ? (energyParts ? energyParts.v : NA) : VERIFY;
  const energyUnit = energyParts ? energyParts.u : 'kWh';

  // Orele fără statistici de la CAPETE se taie: dacă senzorul are date doar de
  // 4 zile, curba se întinde pe toată lăţimea şi subtitlul spune „în 4 zile" —
  // în loc să înghesuie graficul în dreapta şi să pretindă 7 zile.
  const poolPoints = useMemo(() => {
    const rows = poolId && poolStats.stats ? poolStats.stats[poolId] : null;
    if (!rows || !rows.length) return null;
    const vals = statMeanSeries(rows, poolWin.hours, poolWin.start, 3600000);
    const edge = trimEdges(vals);
    if (!edge) return null;
    const out = [];
    for (let i = edge.from; i <= edge.to; i++) out.push({ t: poolWin.start + i * 3600000, v: vals[i] });
    return out.length ? out : null;
  }, [poolId, poolStats.stats, poolWin]);
  const poolFirst = poolPoints ? poolPoints.find((p) => p.v !== null) : null;
  const poolLast = poolPoints ? [...poolPoints].reverse().find((p) => p.v !== null) : null;
  const poolDelta = poolFirst && poolLast ? Math.round((poolLast.v - poolFirst.v) * 10) / 10 : null;
  // acoperirea reală, în zile întregi (minim 1)
  const poolDays = poolFirst && poolLast
    ? Math.max(1, Math.round((poolLast.t - poolFirst.t) / 86400000)) : null;
  const poolAt = poolCursor !== null && poolPoints && poolPoints[poolCursor] ? poolPoints[poolCursor] : null;

  // -------------------------------------------------------------- pageStat
  const stat = useMemo(() => pageStat(E, page, trackedCards, houseAvg, monthPct, energyValue, energyUnit, dispTotals), [
    E, page, trackedCards, houseAvg, monthPct, energyValue, energyUnit, dispTotals
  ]);

  const currentPage = pageDef
    ? {
        eyebrow: pageDef.eyebrow,
        title: pageDef.title,
        chips: pageDef.chips.map((c) => ({
          iconEl: ic(c.icon, { size: 13 }),
          label: c.text !== undefined ? c.text : (c.prefix || '') + E.fmt(c.slot, c.opts),
          rowStyle: 'display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:12px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.06);',
          iconStyle: 'display:flex; color:' + ORANGE + ';',
          labelStyle: 'font-family:' + SANS + '; font-size:12px; color:#c4b7a7;'
        })),
        hasBottom: pageDef.cards.some((c) => (c.order || 1) >= 9),
        cards: pageDef.cards.map((c) => buildPageCard(E, ui, hist, c))
      }
    : null;

  const heroPair = PAGE_HERO[page] || PAGE_HERO.acasa;
  const dispChips = isDisp
    ? [
        ['heartPulse', dispTotals ? dispTotals.total + ' dispozitive' : '—'],
        ['server', sys && Number.isFinite(sys.discPct) ? Math.round(sys.discPct) + '% disc' : '—'],
        [ha.connected ? 'shield' : 'alertTri', ha.connected ? 'Conectat' : 'Deconectat']
      ]
    : null;
  const zoneChips = isZone
    ? [
        ['layoutGrid', zoneEtaje ? zoneEtaje.reduce((n, f) => n + f.zone.length, 0) + ' zone' : '—'],
        ['home', zoneEtaje ? zoneEtaje.length + ' etaje' : '—'],
        [ha.connected ? 'shield' : 'alertTri', ha.connected ? 'Conectat' : 'Deconectat']
      ]
    : null;
  const heroChips = (isAcasa
    ? [
        ['power', onCount + ' active'],
        ['bolt', energyValue === VERIFY ? 'Energie VERIFY' : energyValue + ' ' + energyUnit],
        [ha.connected ? 'shield' : 'alertTri', ha.connected ? 'Conectat' : 'Deconectat']
      ]
    : zoneChips || dispChips || pageDef.chips.map((c) => [c.icon, c.text !== undefined ? c.text : (c.prefix || '') + E.fmt(c.slot, c.opts)])
  ).map((c) => ({
    iconEl: ic(c[0], { size: 13 }),
    label: c[1],
    chipStyle: 'display:flex; align-items:center; gap:8px; padding:9px 16px; border-radius:100px; background:rgba(20,15,11,0.55); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.12); font-family:' + SANS + '; font-size:12.5px; color:#f0e6da;',
    iconStyle: 'display:flex; color:' + TXT2 + ';'
  }));

  const pageDeviceIds = isAcasa || isZone || isDisp ? (isAcasa ? tracked : []) : PAGE_DEVICES[page] || [];
  const hasSidebarDevices = !isAcasa && !isZone && !isDisp && pageDeviceIds.length > 0 && pageDeviceIds.length <= 4;
  const hasDeviceCards = isAcasa || (!isZone && !isDisp && pageDeviceIds.length > 4);

  const sidebarDevices = hasSidebarDevices
    ? pageDeviceIds.map((id) => CARD_BY_ID[id]).filter(Boolean).map((d) => buildSidebarDevice(E, ui, d))
    : [];

  const deviceCards = (isAcasa ? tracked : pageDeviceIds)
    .filter((id) => (page !== 'media' || mediaZone === 'Toate' ? true : MEDIA_ZONE_OF[id] === mediaZone))
    .map((id) => CARD_BY_ID[id])
    .filter(Boolean)
    .map((d) => buildDeviceCard(E, ui, d));

  const modal = buildModal(E, ui);

  // ----------------------------------------------------------------- stiluri
  const deskStyle = 'min-height:100vh; width:100%; padding:0; background:#0b0908; font-family:' + SANS + ';';
  const panelStyle = 'background:#100d0b; min-height:100vh; display:flex; flex-direction:column; padding-bottom:18px;';
  // v1.1.6: fade-ul barei de navigaţie apare doar pe marginea unde chiar mai
  // există taburi (înainte era static, doar pe dreapta).
  const navScrollRef = useRef(null);
  const [navFade, setNavFade] = useState({ l: false, r: true });
  const updateNavFade = () => {
    const elN = navScrollRef.current;
    if (!elN) return;
    const l = elN.scrollLeft > 4;
    const r = elN.scrollLeft + elN.clientWidth < elN.scrollWidth - 4;
    setNavFade((f) => (f.l === l && f.r === r ? f : { l, r }));
  };
  useEffect(() => {
    updateNavFade();
    window.addEventListener('resize', updateNavFade);
    return () => window.removeEventListener('resize', updateNavFade);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bp.vw]);
  const navMask = 'linear-gradient(90deg, ' +
    (navFade.l ? 'transparent 0, #000 26px' : '#000 0') + ', #000 calc(100% - 26px), ' +
    (navFade.r ? 'transparent 100%' : '#000 100%') + ')';

  const navRowStyle = 'display:flex; align-items:center; gap:' + (mob ? '10px' : '16px') + '; padding:' + (mob ? '12px 14px' : '18px 26px') + '; border-bottom:1px solid rgba(255,255,255,0.05);';
  // (v1.3.5) stretch: coloanele au aceeaşi înălţime. Surplusul NU se adună la
  // baza vreunui card — cardul piscinei îl absoarbe şi îl distribuie înăuntru
  // (graficul rămâne 118px, centrat vertical).
  const bodyRowStyle = 'display:flex; align-items:stretch; gap:0; min-width:0;' + (narrow ? ' flex-direction:column;' : '');
  const leftColStyle = narrow
    ? 'width:100%; padding:' + (mob ? '20px 14px 8px' : '26px 22px 10px') + '; display:flex; flex-direction:column; gap:14px;'
    : 'width:376px; flex:0 0 376px; padding:60px 18px 26px 28px; display:flex; flex-direction:column; gap:14px;';
  const rightColStyle = 'flex:1; min-width:0; display:flex; flex-direction:column;';
  const cardTitleStyle = 'font-family:' + SANS + '; font-size:14.5px; font-weight:500; color:' + TXT + ';';
  const cardSubStyle = 'font-family:' + SANS + '; font-size:11px; font-weight:300; color:' + TXT3 + '; margin-top:2px;';
  // 44px = ţinta tactilă minimă (v1.1.6; înainte 40px).
  const circleBtnStyle = 'width:44px; height:44px; border-radius:50%; border:1px solid rgba(255,255,255,0.09); background:rgba(255,255,255,0.04); display:flex; align-items:center; justify-content:center; color:#b8ab9b; cursor:pointer; flex-shrink:0;';
  // flex:1 + height fixă intrau în conflict (flex-basis bătea height în
  // coloană) şi inelul de 118px ieşea din cardul de 190px. Wrap-ul umple acum
  // spaţiul rămas, iar inelul e dimensionat să încapă (104px).
  const energyDialWrapStyle = 'position:relative; flex:1; min-height:0; display:flex; align-items:center; justify-content:center;';
  // (v1.3.6) Înălţimi FIXE în coloana stângă.
  //  - INFO_CARD_H: cardurile „Ora" şi „Ziua şi data" — identice prin
  //    construcţie. 44px (caseta iconului) + 2×20 padding + 2×1 bordură = 86,
  //    plus 2px joc (box-sizing e border-box global).
  //  - POOL_CARD_H: exact înălţimea măsurată a cardului Vreme (230px, aceeaşi
  //    la 1440/900/390). Cardul piscinei NU mai creşte niciodată.
  //  - POOL_CHART_H: ce rămâne pentru grafic după antet — 230 − 42
  //    (padding + bordură) − 40 (antet). Din v1.4.0 graficul nu mai are rând
  //    de etichete zilnice (momentul se citeşte la atingere), iar aria iese
  //    în marginile cardului, deci foloseşte toată înălţimea rămasă.
  const INFO_CARD_H = 88;
  const POOL_CARD_H = 230;
  const POOL_CHART_H = Math.max(70, Math.min(160, POOL_CARD_H - 42 - 40));
  const dialCenterStyle = 'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center;';
  const dialNumStyle = 'font-family:' + DOTO + '; font-size:30px; font-weight:400; color:#f7ede2; line-height:1;';
  const dialUnitStyle = 'font-family:' + SANS + '; font-size:10.5px; font-weight:300; color:' + TXT2 + '; margin-top:3px;';

  const heroTitleStyle = 'font-family:' + SERIF + '; font-size:' + (mob ? '24px' : tab ? '30px' : '36px') + '; font-weight:400; line-height:1.1; color:#f7f1e9;';

  // Antetul cu imagine (v1.1.6): un singur JSX, randat primul pe ecrane
  // înguste şi în capul coloanei drepte pe desktop. Pe telefon: ~150px,
  // gradient spre jos pentru lizibilitate, imagine centrată (object-position),
  // fără gradientul lateral de desktop (acolo textul stă peste marginea
  // stângă; pe mobil doar tăia imaginea).
  const heroH = mob ? '150px' : tab ? '300px' : '520px';
  const heroEl = (
    <div style={s('position:relative; flex:0 0 ' + heroH + '; height:' + heroH + '; overflow:hidden; width:100%;')}>
      <img
        src={import.meta.env.BASE_URL + 'hero-house.webp'}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: mob ? 'center 62%' : 'center' }}
      />
      <div style={s('position:absolute; inset:0; background:linear-gradient(180deg, rgba(16,13,11,' + (narrow ? '0.15' : '0.35') + ') 0%, rgba(16,13,11,0) ' + (narrow ? '22%' : '30%') + ', rgba(16,13,11,0.55) ' + (narrow ? '58%' : '72%') + ', rgba(16,13,11,0.95) 100%); pointer-events:none;')} />
      {!narrow ? (
        <div style={s('position:absolute; inset:0; background:linear-gradient(90deg, rgba(16,13,11,0.9) 0%, rgba(16,13,11,0.15) 22%, rgba(16,13,11,0) 45%); pointer-events:none;')} />
      ) : null}
      <div style={s('position:absolute; left:' + (mob ? '14px' : '24px') + '; right:' + (mob ? '14px' : '26px') + '; bottom:' + (mob ? '10px' : '14px') + '; display:flex; align-items:flex-end; justify-content:space-between; gap:' + (mob ? '10px' : '20px') + '; flex-wrap:wrap; pointer-events:none;')}>
        <div>
          <div style={s(heroTitleStyle)}>{heroPair[0]}</div>
          <div style={s(heroTitleStyle)}>{heroPair[1]}</div>
        </div>
        <div style={{ display: 'flex', gap: mob ? 6 : 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {heroChips.map((chip, i) => (
            <div key={i} style={s(chip.chipStyle)}>
              <span style={s(chip.iconStyle)}>{chip.iconEl}</span>
              {chip.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  const deviceSectionPadStyle = 'padding:' + (mob ? '16px 14px 22px' : narrow ? '18px 22px 24px' : '20px 26px 26px 20px') + ';';
  // (v1.3.5) stretch (implicit): toate cardurile dintr-un rând au aceeaşi
  // înălţime. Surplusul se distribuie ÎN card (zona cadranului creşte şi îşi
  // centrează conţinutul, "Setări avansate" rămâne lipit de bază), nu se
  // adună gol sub ultimul element.
  const deviceGridStyle = 'display:grid; grid-template-columns:repeat(auto-fit,minmax(' + (mob ? '260px' : '298px') + ',1fr)); gap:14px;';
  const tableSectionStyle = 'padding:' + (mob ? '4px 14px 22px' : narrow ? '4px 22px 24px' : '4px 26px 26px 20px') + ';';

  // Salut dupa ora locala a browserului (`now` se actualizeaza la fiecare
  // secunda, deci trecerea pragului schimba salutul si cu pagina deschisa):
  // 05-10:59 dimineata / 11-17:59 ziua / 18-21:59 seara / 22-04:59 noapte.
  const h = now.getHours();
  const greeting =
    h >= 5 && h < 11 ? 'Bună dimineaţa,' :
    h >= 11 && h < 18 ? 'Bună ziua,' :
    h >= 18 && h < 22 ? 'Bună seara,' : 'Noapte bună,';

  const tipKeyframes = '@keyframes hdTipIn{from{opacity:0; transform:translateY(4px);}to{opacity:1; transform:translateY(0);}} @keyframes hdFadeIn{from{opacity:0;}to{opacity:1;}}'
  // v1.1.8: extinderea zonei de atingere fara schimbare vizuala — ::after
  // participa la hit-testing pentru parinte. hdTap = +7px pe toate laturile
  // (30/34px -> >=44); hdTapY = doar vertical (pill-uri/chips-uri late dar
  // scunde; expandarea orizontala ar fura tap-uri elementelor vecine).
  // v1.2.3: hdTapY -8 -> -10: cel mai scund pill (minis, 25px) ajungea doar
  // la 41px zona efectiva; cu ±10 ajunge la 45. Randurile vecine sunt la
  // >=8px distanta, deci banda de ambiguitate ramane minima.
  + ' .hdTap{position:relative;} .hdTap::after{content:""; position:absolute; inset:-7px;}'
  + ' .hdTapY{position:relative;} .hdTapY::after{content:""; position:absolute; left:0; right:0; top:-10px; bottom:-10px;}';

  return (
    <div style={s(deskStyle)}>
      <style>{tipKeyframes}</style>
      <OfflineBanner />
      <div style={s(panelStyle)}>
        {/* ------------------------------------------------------------- nav */}
        {/* v1.1.6: fade-ul urmăreşte scrollul (apare doar pe marginea unde mai
            există conţinut), scroll-snap pe taburi, ţinte tactile ≥44px.
            Avatarul "B" a fost ELIMINAT (un singur utilizator, autentificare
            prin token — butonul nu comuta nimic). Clopoţelul a fost ELIMINAT:
            nu afişa notificări/repairs, doar dubla starea conexiunii pe care
            OfflineBanner o semnalează deja. */}
        <div style={s(navRowStyle)}>
          <div
            ref={navScrollRef}
            onScroll={updateNavFade}
            role="tablist"
            aria-label="Pagini"
            style={s('display:flex; align-items:center; gap:9px; flex:1; min-width:0; padding:2px 2px 2px 4px; overflow-x:auto; scrollbar-width:none; scroll-snap-type:x proximity; -webkit-overflow-scrolling:touch; mask-image:' + navMask + '; -webkit-mask-image:' + navMask + ';')}
          >
            {/* (v1.5.0) Eticheta apare DOAR pe tabul activ. Cu a noua pagină,
                bara depăşea 1205px, iar pe tableta montată (1180px) se vedeau
                7 taburi din 9, cu derulare — pe un ecran fix la care ajungi cu
                un deget în trecere, asta e o degradare reală. Fără etichete
                conţinutul scade la 715px, deci încap toate nouă fără derulare.
                Măsurat, nu presupus: 1/9 -> 2/9 la 360px, 2/9 -> 3/9 la 414px,
                7/9 cu derulare -> 9/9 fără, la 1180px.
                `navItemStyle`/`navLabel` sunt în tokens.js (testul de
                fidelitate), deci NU se modifică: se adaugă la locul apelului,
                iar `s()` e last-wins. Padding-ul simetric înlocuieşte perechea
                22px/22px doar când eticheta lipseşte, altfel pilula ar rămâne
                un oval gol în jurul unei iconiţe de 19px.

                Fiecare tab poartă `aria-label` cu numele COMPLET al paginii,
                indiferent dacă eticheta vizuală e afişată — altfel taburile
                inactive ar fi nenumite pentru un cititor de ecran, o regresie
                de accesibilitate introdusă chiar de ascunderea etichetelor.
                `data-page` e identificatorul stabil pe care se navighează în
                teste şi în auditul responsive: textul vizibil NU mai e o
                proprietate stabilă a navigaţiei. `aria-selected` spune care
                pagină e activă, tot fără să depindă de ce se vede. */}
            {NAV.map((n) => {
              const a = n.key === page;
              return (
                <div
                  key={n.key}
                  role="tab"
                  data-page={n.key}
                  aria-selected={a}
                  aria-label={n.label}
                  tabIndex={0}
                  title={n.label}
                  style={s(navItemStyle(a) + ' scroll-snap-align:start; min-height:44px;' + (a ? '' : ' padding:11px 15px; gap:0;'))}
                  onClick={() => setPage(n.key)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPage(n.key); } }}
                >
                  <span style={s(navIconBox(a))}>{ic(n.icon, { size: 19, sw: 1.7 })}</span>
                  {a ? <span style={s(navLabel(a))}>{n.label}</span> : null}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div
              role="button"
              tabIndex={0}
              data-action="open-entity-mapping"
              aria-label="Mapare entități"
              style={s(circleBtnStyle)}
              title="Mapare entităţi"
              onClick={onOpenMapping}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenMapping(); } }}
            >
              {ic('sliders', { size: 16 })}
            </div>
            <div
              style={s(circleBtnStyle + (anim ? ' color:' + ORANGE + '; border-color:rgba(240,138,44,0.4);' : ' opacity:0.55;'))}
              title={anim ? 'Animaţii pornite — apasă pentru a le opri (diagrama rămâne statică)' : 'Animaţii oprite — apasă pentru a le porni'}
              onClick={() => setAnim(!anim)}
            >
              {ic('sparkle', { size: 16 })}
            </div>
          </div>
        </div>

        <div style={s(bodyRowStyle)}>
          {/* v1.1.6: pe ecrane înguste antetul cu imagine e PRIMUL element al
              paginii (înainte stătea în coloana dreaptă, care pe mobil venea
              după toată coloana stângă — antetul ajungea la mijlocul paginii). */}
          {narrow ? heroEl : null}
          {/* ------------------------------------------------- coloana stânga */}
          <div style={s(leftColStyle)}>
            <div style={{ padding: '6px 0 52px' }}>
              <div style={s('font-family:' + SERIF + '; font-size:' + (mob ? '16px' : '19px') + '; font-weight:400; color:#9d9186;')}>Bogdan</div>
              {/* key={greeting}: remonteaza elementul doar cand textul se
                  schimba, deci fade-in-ul ruleaza O DATA, nu in bucla */}
              <div key={greeting} style={s('font-family:' + SERIF + '; font-size:' + (mob ? '32px' : '46px') + '; font-weight:400; line-height:1.1; color:#f7f1e9; margin-top:2px; letter-spacing:0.005em; animation:hdFadeIn .28s ease-out;')}>
                {greeting}
              </div>
            </div>

            {isAcasa ? (
              <>
                {/* ceas — DOAR ora (v1.3.6: ziua şi data au card propriu) */}
                <div style={s(glassCard() + ' height:' + INFO_CARD_H + 'px; display:flex; align-items:center;')} data-card="ceas">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%' }}>
                    <div style={s('font-family:' + DOTO + '; font-size:42px; font-weight:400; line-height:1; color:#f7f1e9; letter-spacing:0.02em;')}>
                      {pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds())}
                    </div>
                    <div style={s('width:44px; height:44px; flex-shrink:0; border-radius:14px; display:flex; align-items:center; justify-content:center; color:' + ORANGE + '; background:rgba(240,138,44,0.1); border:1px solid rgba(240,138,44,0.24);')}>
                      {ic('clock', { size: 21 })}
                    </div>
                  </div>
                </div>

                {/* ziua şi data (v1.3.6) — acelaşi tratament vizual ca ceasul:
                    aceeaşi înălţime, aceeaşi casetă de icon, cifrele în DOTO. */}
                <div style={s(glassCard() + ' height:' + INFO_CARD_H + 'px; display:flex; align-items:center;')} data-card="data">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
                    <div style={s('font-family:' + DOTO + '; font-size:42px; font-weight:400; line-height:1; color:#f7f1e9; letter-spacing:0.02em;')}>
                      {now.getDate()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={s('font-family:' + SANS + '; font-size:13.5px; font-weight:500; color:' + TXT + '; line-height:1.2;')}>
                        {DAYS[now.getDay()]}
                      </div>
                      <div style={s('font-family:' + SANS + '; font-size:11.5px; font-weight:300; color:' + TXT2 + '; margin-top:3px;')}>
                        {MONTHS[now.getMonth()] + ' ' + now.getFullYear()}
                      </div>
                    </div>
                    <div style={s('width:44px; height:44px; flex-shrink:0; border-radius:14px; display:flex; align-items:center; justify-content:center; color:' + ORANGE + '; background:rgba(240,138,44,0.1); border:1px solid rgba(240,138,44,0.24);')}>
                      {ic('calendarDays', { size: 21 })}
                    </div>
                  </div>
                </div>

                {/* vreme */}
                <div style={s(glassCard())} data-card="vreme">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={s(cardTitleStyle)}>Vreme</div>
                      <div style={s(cardSubStyle)}>
                        {(wSt ? E.friendlyName('weather.main', 'Exterior') : 'Exterior') + ' • ' + weatherCond}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 12 }}>
                        <span style={s('font-family:' + DOTO + '; font-size:36px; font-weight:400; color:#f7f1e9; line-height:1;' + (weatherTemp === VERIFY ? ' color:' + ORANGE + '; font-size:22px;' : ''))}>
                          {weatherTemp}
                        </span>
                        <span style={s('font-family:' + SANS + '; font-size:12px; color:' + TXT2 + ';')}>°C</span>
                      </div>
                      <div style={s('font-family:' + SANS + '; font-size:11px; font-weight:300; color:' + TXT3 + '; margin-top:7px;')}>
                        {'Resimţit ' + (wSt && wSt.attributes.apparent_temperature !== undefined ? fmtTemp(wSt.attributes.apparent_temperature).v + ' °C' : NA) +
                          ' • Umiditate ' + (wSt && wSt.attributes.humidity !== undefined ? Math.round(wSt.attributes.humidity) + ' %' : NA)}
                      </div>
                    </div>
                    <div style={s('width:52px; height:52px; flex-shrink:0; border-radius:16px; display:flex; align-items:center; justify-content:center; color:' + ORANGE + '; background:rgba(240,138,44,0.11); border:1px solid rgba(240,138,44,0.26);')}>
                      {ic(weatherIcon, { size: 26 })}
                    </div>
                  </div>
                  <div style={s('display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:4px; margin-top:16px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.06);')}>
                    {(forecast.length ? forecast : new Array(6).fill({ day: '—', temp: '—', icon: 'cloud' })).map((d, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={s('font-family:' + SANS + '; font-size:10px; font-weight:300; color:' + TXT3 + ';')}>{d.day}</div>
                        <div style={{ display: 'flex', color: '#a3968a' }}>{ic(d.icon, { size: 17 })}</div>
                        <div style={s('font-family:' + SANS + '; font-size:11.5px; font-weight:500; color:#c8bcae;')}>{d.temp}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* temperatură piscină — înălţime FIXĂ (v1.3.6) + curbă netedă
                    pe date orare cu indicator la hover/atingere (v1.4.0).
                    Graficul iese în marginile cardului (margin negativ), ca în
                    referinţă; overflow:hidden îl taie pe colţurile rotunjite.
                    Cu cursorul activ, antetul arată valoarea DIN ACEL PUNCT şi
                    momentul ei; fără cursor, valoarea curentă. */}
                <div style={s(glassCard() + ' height:' + POOL_CARD_H + 'px; overflow:hidden; display:flex; flex-direction:column;')} data-card="piscina">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={s(cardTitleStyle)}>Temperatură piscină</div>
                      <div style={s(cardSubStyle)}>
                        {poolAt
                          ? cursorLabel(poolAt.t)
                          : poolPoints
                            ? (poolDelta >= 0 ? '+' : '') + dec(poolDelta) + '°C în ' + (poolDays === 1 ? 'o zi' : poolDays + ' zile')
                            : E.mapped('sensor.apa_temp')
                              ? poolStats.loading ? 'se încarcă statisticile…' : 'fără statistici orare încă'
                              : 'VERIFY · mapează senzorul de temperatură apă'}
                      </div>
                    </div>
                    <div style={s('font-family:' + DOTO + '; font-size:32px; font-weight:400; color:' + (E.mapped('sensor.apa_temp') ? '#f7ede2' : ORANGE) + ';' + (E.mapped('sensor.apa_temp') ? '' : ' font-size:16px;'))}>
                      {poolAt
                        ? (poolAt.v === null ? NA : dec(poolAt.v.toFixed(1)) + '°')
                        : E.mapped('sensor.apa_temp')
                          ? (E.num('sensor.apa_temp') === null ? NA : Math.round(E.num('sensor.apa_temp')) + '°')
                          : VERIFY}
                    </div>
                  </div>
                  <div style={{ flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', margin: '0 -20px -20px' }}>
                    {poolPoints
                      ? <PoolChart points={poolPoints} height={POOL_CHART_H} cursor={poolCursor} onCursor={setPoolCursor} />
                      : <div style={{ height: POOL_CHART_H }} />}
                  </div>
                </div>

                {/* control climat */}
                <div style={s(glassCard() + ' padding:20px 20px 20px; overflow:visible; min-height:440px; display:flex; flex-direction:column; justify-content:space-between;')} data-card="climat">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={s(cardTitleStyle)}>Control climat</div>
                      <div style={s(cardSubStyle)}>
                        {(acUnit ? E.friendlyName(acUnit.slot, acUnit.label) : '—') + ' • ' +
                          (acUnit && E.mapped(acUnit.slot) ? HVAC_LABEL[E.rawState(acUnit.slot)] || E.rawState(acUnit.slot) : VERIFY)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <div className="hdTap" style={s(arrowBtn)} onClick={() => setAcIndex((i) => (i - 1 + acUnits.length) % acUnits.length)}>
                        {ic('chevLeft', { size: 15, sw: 1.7 })}
                      </div>
                      <div className="hdTap" style={s(arrowBtn)} onClick={() => setAcIndex((i) => (i + 1) % acUnits.length)}>
                        {ic('chevRight', { size: 15, sw: 1.7 })}
                      </div>
                    </div>
                  </div>

                  {arcGauge(acFrac)}

                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 10, marginTop: -6 }}>
                    <span style={s('font-family:' + SANS + '; font-size:12px; font-weight:300; color:' + TXT2 + ';')}>Ţintă</span>
                    <span style={s('font-family:' + DOTO + '; font-size:34px; font-weight:400; color:#f7ede2; letter-spacing:0.02em;' + (acStale ? ' opacity:0.55;' : ''))}>
                      {acTarget === null ? NA : acDecimals ? dec(acTarget.toFixed(acDecimals)) : String(Math.round(acTarget))}
                    </span>
                    <span style={s('font-family:' + SANS + '; font-size:12px; color:' + TXT2 + ';')}>°C</span>
                  </div>

                  {sliderRow(
                    acFrac,
                    () => acUnit && E.bumpClimate(acUnit.slot, -1),
                    () => acUnit && E.bumpClimate(acUnit.slot, 1)
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 14, padding: '13px 6px 4px 2px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {acUnits.map((u, i) => (
                        <div
                          key={u.id}
                          style={s('width:' + (i === acIndex ? '18px' : '6px') + '; height:6px; border-radius:3px; background:' + (i === acIndex ? ORANGE : 'rgba(255,255,255,0.16)') + '; transition:width .18s ease;')}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span style={s('font-family:' + SANS + '; font-size:11px; font-weight:300; color:' + TXT3 + ';')}>Ambient</span>
                      <span style={s('font-family:' + SANS + '; font-size:12.5px; font-weight:500; color:#c8bcae;')}>
                        {acUnit ? E.fmt(acUnit.slot, { attr: 'current_temperature', unit: '°C' }) : NA}
                      </span>
                      <div
                        className="hdTapY"
                        aria-busy={acMarcaj && acMarcaj.inZbor ? 'true' : undefined}
                        style={s(togglePill(acOn))}
                        onClick={() => acUnit && E.mapped(acUnit.slot) && E.toggle(acUnit.slot)}
                      >
                        <div className={acMarcaj && acMarcaj.inZbor ? 'hdPow' : undefined} style={s(toggleKnob(acOn))}>{ic('power', { size: 12.5, color: acOn ? '#C4600F' : '#cfc4b8', sw: 2.2 })}</div>
                        <span style={s(toggleText(acOn))}>{acOn ? 'on' : 'off'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* două cadrane mici */}
                <div style={s('display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:14px;')}>
                  <div style={s(glassCard() + ' height:190px; display:flex; flex-direction:column;')} data-card="energie-luna">
                    <div style={s(cardTitleStyle)}>AC Etaj · consum luna curentă</div>
                    <div style={s(cardSubStyle)}>{now.getDate() + ' din ' + daysInMonth + ' zile'}</div>
                    <div style={s(energyDialWrapStyle)}>
                      {ribbonRing(104, monthPct)}
                      <div style={s(dialCenterStyle)}>
                        <div style={s(dialNumStyle + (energyValue === VERIFY ? ' font-size:15px; color:' + ORANGE + ';' : ''))}>{energyValue}</div>
                        <div style={s(dialUnitStyle)}>{energyUnit}</div>
                      </div>
                    </div>
                  </div>
                  <div style={s(glassCard() + ' height:190px; display:flex; flex-direction:column;')} data-card="dispozitive-ring">
                    <div style={s(cardTitleStyle)}>Dispozitive</div>
                    <div style={s(cardSubStyle)}>{onCount + '/' + trackedCards.length + ' active acum'}</div>
                    <div style={s(energyDialWrapStyle)}>
                      {segmentRing(104, Math.max(1, trackedCards.length), onCount)}
                      <div style={s(dialCenterStyle)}>
                        <div style={s(dialNumStyle)}>{trackedCards.length}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* (v1.9.0) Poartă Intrare. Fără senzor de poziţie, deci cardul
                    nu spune niciodată „deschisă", „închisă" sau „se deschide".
                    Spune doar ce ştim cu adevărat: dacă se poate comanda, dacă
                    am trimis, şi când a plecat ultimul impuls. */}
                <div style={s(glassCard())} data-card="poarta-intrare">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span style={s('display:flex; color:' + ORANGE + ';')}>{ic('gate', { size: 17, sw: 1.9 })}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={s(cardTitleStyle)}>Poartă Intrare</div>
                      <div style={s(cardSubStyle)}>Linomatik · Shelly</div>
                    </div>
                  </div>

                  <div
                    className="hdTapY"
                    role="button"
                    tabIndex={poartaBlocat ? -1 : 0}
                    aria-disabled={poartaBlocat ? 'true' : 'false'}
                    aria-busy={poartaInZbor ? 'true' : 'false'}
                    data-poarta="deschide"
                    onClick={() => { if (!poartaBlocat) E.deschidePoarta('dashboard'); }}
                    onKeyDown={(ev) => {
                      if (poartaBlocat) return;
                      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); E.deschidePoarta('dashboard'); }
                    }}
                    style={s(
                      'margin-top:14px; min-height:46px; display:flex; align-items:center; justify-content:center; gap:2px;'
                      + ' border-radius:13px; font-family:' + SANS + '; font-size:12.5px; font-weight:600; letter-spacing:0.06em;'
                      + (poartaBlocat
                        ? ' background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); color:' + TXT3 + '; cursor:default;'
                        : ' background:linear-gradient(180deg,' + ORANGE_HI + ',' + ORANGE + '); border:1px solid rgba(0,0,0,0.18);'
                          + ' color:#2a1a08; cursor:pointer; box-shadow:0 3px 12px rgba(240,138,44,0.22);')
                    )}
                  >
                    {poartaInZbor ? <InZbor b={poartaB} /> : <span>DESCHIDE POARTA</span>}
                  </div>

                  <div style={s('font-family:' + SANS + '; font-size:11px; font-weight:300; color:' + TXT3 + '; margin-top:9px; min-height:15px;')}>
                    {poartaStare}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 2 }}>
                    <span style={s('font-family:' + SANS + '; font-size:11px; font-weight:300; color:' + TXT3 + ';')}>
                      {poartaUltima
                        ? 'Ultima comandă: ' + pad(poartaUltima.getHours()) + ':' + pad(poartaUltima.getMinutes())
                          + (poartaUltima.toDateString() === now.toDateString() ? '' : ' · ' + poartaUltima.getDate() + ' ' + MONTHS[poartaUltima.getMonth()])
                        : 'Nicio comandă înregistrată'}
                    </span>
                  </div>

                  {poartaIntent ? (
                    <div style={s('display:flex; align-items:center; gap:8px; margin-top:10px; padding:8px 10px; border-radius:11px;'
                      + ' background:rgba(240,138,44,0.10); border:1px solid rgba(240,138,44,0.28);')}>
                      <span style={s('display:flex; color:' + ORANGE + ';')}>{ic('gate', { size: 14, sw: 2 })}</span>
                      <span style={s('font-family:' + SANS + '; font-size:11.5px; font-weight:500; color:' + ORANGE_HI + ';')}>
                        Deschidere la sosire: ARMATĂ
                      </span>
                      {poartaIntent.minute !== null ? (
                        <span style={s('font-family:' + SANS + '; font-size:11px; font-weight:300; color:' + TXT3 + '; margin-left:auto;')}>
                          {poartaIntent.minute === 0 ? 'confirmată acum' : 'confirmată acum ' + poartaIntent.minute + ' min'}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
                    <span style={s('font-family:' + SANS + '; font-size:12px; color:#c4b7a7;')}>Service Mode</span>
                    <div
                      className="hdTapY"
                      role="switch"
                      aria-checked={poartaService ? 'true' : 'false'}
                      aria-label="Service Mode poartă"
                      style={s(togglePill(poartaService))}
                      onClick={() => poartaMapata && E.toggle('poarta.service')}
                    >
                      <div className={smMarcaj && smMarcaj.inZbor ? 'hdPow' : undefined} style={s(toggleKnob(poartaService))}>{ic('power', { size: 12.5, color: poartaService ? '#C4600F' : '#cfc4b8', sw: 2.2 })}</div>
                      <span style={s(toggleText(poartaService))}>{poartaService ? 'on' : 'off'}</span>
                    </div>
                  </div>
                </div>

              </>
            ) : isZone || isDisp ? (
              // (v1.5.0) Acelaşi card de context ca pe celelalte pagini: fără
              // el coloana stângă rămânea goală pe toată înălţimea, exact
              // spaţiul mort pe care detectorul cardGap îl vânează în carduri.
              <div style={s(glassCard())} data-card="page-chips">
                <div style={s(cardTitleStyle)}>{heroPair[0]}</div>
                <div style={s(cardSubStyle)}>{heroPair[1]}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                  {heroChips.map((chip, i) => (
                    <div key={i} style={s('display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:12px; background:rgba(255,255,255,0.035); border:1px solid rgba(255,255,255,0.06);')}>
                      <span style={s('display:flex; color:' + ORANGE + ';')}>{chip.iconEl}</span>
                      <span style={s('font-family:' + SANS + '; font-size:12px; color:#c4b7a7;')}>{chip.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div style={s(glassCard() + ' height:236px; flex:0 0 236px; display:flex; flex-direction:column;' + (narrow ? ' max-width:420px;' : ''))} data-card="stat">
                  <div style={s(cardTitleStyle)}>{stat.title}</div>
                  <div style={s(cardSubStyle)}>{stat.sub}</div>
                  <div style={s(energyDialWrapStyle)}>
                    {stat.ringEl}
                    <div style={s(dialCenterStyle)}>
                      <div style={s(dialNumStyle + (stat.value === VERIFY ? ' font-size:15px; color:' + ORANGE + ';' : ''))}>{stat.value}</div>
                      <div style={s(dialUnitStyle)}>{stat.unit}</div>
                    </div>
                  </div>
                </div>

                {hasSidebarDevices ? (
                  <div style={s(glassCard())} data-card="sidebar-devices">
                    <div style={s(cardTitleStyle)}>{PAGE_DEVICE_HEAD[page] ? PAGE_DEVICE_HEAD[page][0] : 'Dispozitive'}</div>
                    <div style={s(cardSubStyle)}>Control rapid · apasă pentru setări complete</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 14 }}>
                      {sidebarDevices.map((sd) => (
                        <div key={sd.id} style={s(sd.cardStyle)} onClick={sd.onOpen}>
                          <div style={s(sd.dialWrapStyle)}>
                            {sd.dialTicksEl}
                            <span style={s(sd.dialValStyle)}>{sd.dialVal}</span>
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={s(sd.nameStyle)}>{sd.label}</div>
                            <div style={s(sd.metaStyle)}>{sd.model}</div>
                            <div style={s(sd.ambientStyle)} aria-busy={sd.inZbor || undefined}>
                              <InZbor b={sd} faraCerc />
                              {sd.inZbor ? null : sd.ambient}
                            </div>
                          </div>
                          <div className="hdTapY" data-power={sd.id} style={s(sd.togglePillStyle)} onClick={sd.onToggle}>
                            <div className={sd.inZbor ? 'hdPow' : undefined} style={s(sd.toggleKnobStyle)}>{sd.toggleIconEl}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div style={s(glassCard())} data-card="page-chips">
                  <div style={s(cardTitleStyle)}>{currentPage.title}</div>
                  <div style={s(cardSubStyle)}>{currentPage.eyebrow}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                    {currentPage.chips.map((chip, i) => (
                      <div key={i} style={s(chip.rowStyle)}>
                        <span style={s(chip.iconStyle)}>{chip.iconEl}</span>
                        <span style={s(chip.labelStyle)}>{chip.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </>
            )}
          </div>

          {/* -------------------------------------------------- coloana dreapta */}
          <div style={s(rightColStyle)}>
            {!narrow ? heroEl : null}

            {hasDeviceCards ? (
              <div style={s(deviceSectionPadStyle)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', paddingBottom: 12 }}>
                  <div style={s('font-family:' + SANS + '; font-size:16px; font-weight:500; color:' + TXT + ';')}>
                    {isAcasa ? 'Dispozitive urmărite' : PAGE_DEVICE_HEAD[page] ? PAGE_DEVICE_HEAD[page][0] : 'Dispozitive'}{' '}
                    <span style={{ color: '#8a7c6c', fontWeight: 300 }}>
                      / {isAcasa ? onCount + ' active · apasă pentru setări' : PAGE_DEVICE_HEAD[page] ? PAGE_DEVICE_HEAD[page][1] : ''}
                    </span>
                  </div>
                  {isAcasa ? (
                    <div
                      role="button"
                      tabIndex={0}
                      data-action="open-device-picker"
                      aria-label="Gestionează dispozitive urmărite"
                      style={s('display:flex; align-items:center; gap:8px; padding:9px 15px; min-height:44px; border-radius:100px; cursor:pointer; flex-shrink:0; font-family:' + SANS + '; font-size:12px; font-weight:400; color:#d8ccbe; background:rgba(255,255,255,0.045); border:1px solid rgba(255,255,255,0.085);')}
                      onClick={() => setPickerOpen(true)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPickerOpen(true); } }}
                    >
                      <span style={s('display:flex; color:' + ORANGE + ';')}>{ic('plus', { size: 15 })}</span>
                      Gestionează
                    </div>
                  ) : null}
                  {page === 'media' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {MEDIA_ZONES.map((z) => {
                        const act = mediaZone === z;
                        const count = z === 'Toate' ? 8 : Object.keys(MEDIA_ZONE_OF).filter((k) => MEDIA_ZONE_OF[k] === z).length;
                        return (
                          <div
                            className="hdTapY"
                            key={z}
                            style={s('display:flex; align-items:center; gap:7px; padding:7px 13px; border-radius:100px; cursor:pointer; white-space:nowrap; font-family:' + SANS + '; font-size:11.5px; font-weight:' + (act ? 500 : 400) + '; color:' + (act ? '#3a1c06' : '#bdb1a4') + '; background:' + (act ? PILL_ON : 'rgba(255,255,255,0.045)') + '; border:1px solid ' + (act ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.085)') + ';' + (act ? ' box-shadow:0 4px 12px -6px rgba(226,121,58,0.5), inset 0 1px 0 rgba(255,255,255,0.4);' : ''))}
                            onClick={() => setMediaZone(z)}
                          >
                            {z}
                            <span style={s('font-family:' + SANS + '; font-size:10px; font-weight:600; color:' + (act ? 'rgba(58,28,6,0.62)' : TXT3) + ';')}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
                <div style={s(deviceGridStyle)}>
                  {deviceCards.map((c) => (
                    <DeviceCard key={c.id} c={c} />
                  ))}
                </div>
              </div>
            ) : null}

            {isDisp ? (
              <div style={s(tableSectionStyle)}>
                <DevicesPage
                  devices={dispLista}
                  loading={dispLoading}
                  error={dispError || sysError}
                  states={ha.states || {}}
                  mob={mob}
                  sys={sys}
                  browser={dispBrowser}
                  cota={dispCota}
                  wsStats={ha.wsStats}
                  textConexiune={ha.textConexiune}
                  now={dispNow}
                  sel={dispSel}
                  setSel={setDispSel}
                  filtru={dispFiltru}
                  setFiltru={setDispFiltru}
                />
              </div>
            ) : null}

            {isZone ? (
              <div style={s(tableSectionStyle)}>
                <ZonePage
                  etaje={zoneEtaje}
                  loading={zoneLoading}
                  error={zoneError}
                  states={ha.states || {}}
                  mob={mob}
                  sel={zoneSel}
                  setSel={setZoneSel}
                />
              </div>
            ) : null}

            {!isAcasa && !isZone && !isDisp ? (
              <div style={s(tableSectionStyle)}>
                {/* stretch (v1.3.5): cardurile din acelaşi rând sunt egale;
                    surplusul se distribuie în interiorul fiecărui card. */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + (mob ? 1 : 2) + ',minmax(0,1fr))', gap: 14, alignItems: 'stretch' }}>
                  <div
                    style={s('grid-column:1 / -1; order:' + (currentPage.hasBottom ? 85 : -1) + '; font-family:' + SANS + '; font-size:16px; font-weight:500; color:' + TXT + ';' + (currentPage.hasBottom ? ' margin-top:12px;' : ''))}
                  >
                    {currentPage.title} <span style={{ color: '#8a7c6c', fontWeight: 400 }}>/ {currentPage.eyebrow}</span>
                  </div>
                  {currentPage.cards.map((card, i) => (
                    <PageCard key={i} card={card} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {pickerOpen ? (
        <Picker
          tracked={tracked}
          setTracked={setTracked}
          dragId={dragId}
          setDragId={setDragId}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}

      {modal ? <Modal m={modal} onClose={() => setModalId(null)} /> : null}
    </div>
  );
}

const arrowBtn =
  'width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#a1968b; background:rgba(255,255,255,0.045); border:1px solid rgba(255,255,255,0.08);';
function overlayStyle(mob) {
  return 'position:fixed; inset:0; z-index:80; display:flex; align-items:center; justify-content:center; padding:' +
    (mob ? '12px' : '32px') + '; overflow-y:auto; background:rgba(10,6,3,0.72); backdrop-filter:blur(10px);';
}
const closeBtnStyle =
  'width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:#a1968b; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.09);';

// ------------------------------------------------------------ stat lateral
function pageStat(E, page, trackedCards, houseAvg, monthPct, energyValue, energyUnit, dispTotals) {
  const seg = (total, active) => segmentRing(118, Math.max(1, total), active);
  if (page === 'climat') {
    const pct = houseAvg === null ? 0 : Math.max(0, Math.min(100, ((houseAvg - 15) / 20) * 100));
    return {
      title: 'Medie casă',
      sub: 'din unităţile mapate',
      value: houseAvg === null ? VERIFY : dec(houseAvg.toFixed(1)),
      unit: '°C',
      ringEl: ribbonRing(118, pct)
    };
  }
  if (page === 'piscina') {
    const t = E.num('sensor.apa_temp');
    const pct = t === null ? 0 : Math.max(0, Math.min(100, ((t - 15) / 25) * 100));
    return {
      title: 'Temperatură apă',
      sub: E.mapped('sensor.apa_temp') ? 'senzor live' : 'VERIFY · senzor nemapat',
      value: t === null ? VERIFY : dec(t.toFixed(1)),
      unit: '°C',
      ringEl: ribbonRing(118, pct)
    };
  }
  if (page === 'media') {
    const media = ['media.mansarda', 'media.bucatarie', 'media.sofia_parter', 'media.dormitor_sofia', 'media.etaj_hisense', 'media.foisor', 'media.tata_bucatarie', 'media.tata_dormitor'];
    const on = media.filter((sl) => E.mapped(sl) && E.isOn(sl)).length;
    return { title: 'Televizoare', sub: 'active acum', value: String(on), unit: 'din 8', ringEl: seg(8, on) };
  }
  if (page === 'energie') {
    return {
      title: 'Consum luna curentă',
      sub: monthPct + '% din lună',
      value: energyValue,
      unit: energyUnit,
      ringEl: ribbonRing(118, monthPct)
    };
  }
  if (page === 'dispozitive') {
    const t = dispTotals || { total: 0, healthy: 0 };
    return {
      title: 'Dispozitive',
      sub: 'sanatoase acum',
      value: String(t.healthy || 0),
      unit: 'din ' + (t.total || 0),
      ringEl: seg(Math.max(1, t.total || 1), t.healthy || 0)
    };
  }
  const upd = ['upd.ha_core', 'upd.ha_os', 'upd.supervisor', 'upd.matter', 'upd.hacs'];
  const okCount = upd.filter((sl) => E.mapped(sl) && !E.isOn(sl)).length;
  return { title: 'Sistem', sub: 'actualizări la zi', value: String(okCount), unit: 'din ' + upd.length, ringEl: seg(upd.length, okCount) };
}

// ------------------------------------------------------------ banda offline
function OfflineBanner() {
  const { status, error, lastCallError, clearCallError, retry, resetConfig } = useHa();
  const offline = status !== 'connected';
  if (!offline && !lastCallError) return null;
  const connecting = status === 'connecting';
  const msg = offline
    ? connecting
      ? 'Se reconectează la Home Assistant…'
      : 'Deconectat de la Home Assistant — valorile afişate sunt ultimele primite.' + (error ? ' ' + error : '')
    // (v1.7.3) O neconfirmare NU e acelaşi lucru cu o comandă care n-a plecat:
    // la expirare comanda a ajuns la HA şi a fost acceptată, doar aparatul n-a
    // confirmat. Prefixul de transport ar fi minţit despre ce a eşuat.
    : /nu a fost confirmat/.test(String(lastCallError))
      ? lastCallError
      : 'Comanda nu a ajuns la HA: ' + lastCallError;
  const color = connecting ? '#f0c79b' : '#e8a08a';
  const btn =
    'padding:13px 16px; border-radius:100px; cursor:pointer; display:inline-flex; align-items:center; font-family:' + SANS +
    '; font-size:11px; font-weight:600; color:#f4e6d8; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.16);';
  return (
    <div
      style={s(
        // v1.1.7: era position:fixed şi ACOPEREA bara de navigaţie — cât timp
        // banda era vizibilă (reconectare, call-error neînchis), taburile de
        // sub ea nu primeau clicuri (găsit de auditul Playwright: "intercepts
        // pointer events"). sticky împinge conţinutul în jos în loc să-l
        // acopere şi rămâne lipită sus la scroll; butoanele ei rămân active.
        'position:sticky; top:0; z-index:120; display:flex; align-items:center; justify-content:center; gap:10px; flex-wrap:wrap; padding:8px 16px; font-family:' +
          SANS + '; font-size:12px; font-weight:500; color:' + color +
          '; background:rgba(32,18,12,0.96); border-bottom:1px solid rgba(226,120,90,0.35); backdrop-filter:blur(8px);' +
          (connecting ? ' animation:offlinePulse 2.6s ease-in-out infinite;' : '')
      )}
    >
      <span style={{ display: 'flex' }}>{ic('alertTri', { size: 14, color })}</span>
      {msg}
      {offline && !connecting ? (
        <>
          <span style={s(btn)} onClick={retry}>Reîncearcă</span>
          <span
            style={s(btn)}
            onClick={() => {
              if (window.confirm('Ştergi adresa şi token-ul salvate şi revii la ecranul de configurare?')) resetConfig();
            }}
          >
            Schimbă datele
          </span>
        </>
      ) : null}
      {lastCallError ? (
        <span style={s(btn)} onClick={clearCallError}>OK</span>
      ) : null}
    </div>
  );
}


// Tooltip v1.1.1: randat prin portal in <body>, pozitionat cu
// getBoundingClientRect (fara dependinte noi). Regula fixa: implicit SUB
// element (+10px); flip DEASUPRA doar daca nu incape jos; shift pe X pana
// intra complet in viewport (niciodata trunchiat). pointer-events:none, deci
// nu blocheaza butoanele vecine. Sageata isi urmeaza plasarea finala.
// -------------------------------------------------------------- card device
function DeviceCard({ c }) {
  return (
    // data-card (v1.3.4): marcaj STABIL pentru auditul responsive — stilurile
    // fiind inline, detectorul de "spaţiu gol la baza cardului" n-ar avea altfel
    // cum să ştie ce element e un card. Nu afectează randarea.
    <div style={s(c.cardStyle)} data-card={'device:' + c.id}>
      {/* antet: sus, fix — nu creşte şi nu se comprimă (v1.3.5) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          <div style={s(c.headIconStyle)}>{c.headIconEl}</div>
          <div style={{ minWidth: 0 }}>
            <div style={s(c.nameStyle)}>{c.label}</div>
            <div style={s(c.modelStyle)}>{c.model}</div>
          </div>
        </div>
        <div className="hdTapY" data-power={c.id} style={s(c.togglePillStyle)} onClick={c.onToggle} title={c.toggleTitle}>
          <div className={c.inZbor ? 'hdPow' : undefined} style={s(c.toggleKnobStyle)}>{c.toggleIconEl}</div>
        </div>
      </div>

      <div style={s(c.ambientStyle)} aria-busy={c.inZbor || undefined}>
        <InZbor b={c} faraCerc />
        {c.inZbor ? null : c.ambient}
      </div>

      {c.hasDial ? (
        /* − şi + flanchează cadranul direct: simetrice stânga/dreapta, la
           aceeaşi distanţă de marginea lui, centrate vertical pe mijlocul
           cercului. Valorile laterale (pasul şi ţinta) au fost scoase dintre
           butoane: ţinta dubla valoarea din centrul cadranului, iar pasul e
           comunicat prin tooltip-ul butoanelor (title). */
        <div style={s(c.dialRowStyle)}>
          <div className="hdTap" style={s(c.roundBtnStyle)} onClick={c.onMinus} title={c.stepTitle}>{ic('minus', { size: 16, sw: 2 })}</div>
          <div style={s(c.dialWrapStyle)}>
            {c.dialTicksEl}
            <div style={s(c.knobStyle)}>
              <span style={s(c.knobValStyle)}>{c.dialVal}</span>
              <span style={s(c.knobUnitStyle)}>{c.dialUnit}</span>
            </div>
          </div>
          <div className="hdTap" style={s(c.roundBtnStyle)} onClick={c.onPlus} title={c.stepTitle}>{ic('plus', { size: 16, sw: 2 })}</div>
        </div>
      ) : c.staticDial ? (
        /* v1.2.6: silueta cadranului se pastreaza si cand volumul nu e
           expus (Hisense/HomeKit) — inel estompat + sursa curenta in centru,
           spacer-e de latimea butoanelor -/+ pentru aliniere; tooltip-ul
           (hover / long-press) explica de ce nu exista control. */
        <div
          style={s(c.staticDialRowStyle)}
          onMouseEnter={c.onStaticEnter}
          onMouseLeave={c.onStaticLeave}
          {...pressProps(c.onStaticEnter, c.onStaticLeave, () => {})}
        >
          <div style={s(c.spacerStyle)} />
          <div style={s(c.dialWrapStyle + ' opacity:0.55;')}>
            {c.staticDialTicksEl}
            <div style={s(c.knobStyle)}>
              <span style={s(c.staticKnobValStyle)}>{c.staticDialVal}</span>
            </div>
          </div>
          <div style={s(c.spacerStyle)} />
          {c.showStaticTip ? <Tip text={c.staticDialTip} /> : null}
        </div>
      ) : (
        <div style={s(c.noDialWrapStyle)}>
          {c.noDialIconEl}
          <div style={s(c.noDialTextStyle)}>{c.noDialText}</div>
        </div>
      )}

      {c.miniToggles.length ? (
      <div style={s(c.miniRowStyle)}>
        {c.miniToggles.map((mt, i) => (
          <div key={i} style={s(mt.colStyle)} onMouseEnter={mt.onEnter} onMouseLeave={mt.onLeave}>
            <div style={s(mt.labelRowStyle)}>
              <span style={s(mt.iconStyle)}>{mt.iconEl}</span>
              {mt.label}
            </div>
            <div className="hdTapY" style={s(mt.trackStyle)} {...pressProps(mt.onEnter, mt.onLeave, mt.onToggle)}>
              <div style={s(mt.knobStyle)} />
            </div>
            {mt.showTip ? <Tip text={mt.tipText} /> : null}
          </div>
        ))}
      </div>
      ) : null}

      <div style={s(c.circleRowStyle)}>
        {c.circles.map((cb, i) => (
          <div key={i} style={s(cb.wrapStyle)} onMouseEnter={cb.onEnter} onMouseLeave={cb.onLeave}>
            <div style={s(cb.style)} {...pressProps(cb.onEnter, cb.onLeave, cb.onToggle)}>{cb.iconEl}</div>
            {cb.showTip ? <Tip text={cb.label} /> : null}
          </div>
        ))}
      </div>

      <div
        className="hdTapY"
        role="button"
        tabIndex={0}
        data-action="open-device-modal"
        aria-label={'Setări avansate ' + c.label}
        style={s(c.advBtnStyle)}
        onClick={c.onOpen}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.onOpen(e); } }}
      >
        <span style={s(c.advIconStyle)}>{c.advIconEl}</span>Setări avansate
      </div>
    </div>
  );
}

// --------------------------------------------------------------- card pagină
function PageCard({ card }) {
  // (v1.3.5) Grila întinde cardul la înălţimea rândului; surplusul se distribuie
  // ÎNĂUNTRU, ca la „Control climat": antetul rămâne sus, iar spaţiul liber se
  // împarte între TOATE secţiunile de conţinut cu rânduri (monitor/expand),
  // proporţional — fiecare tabel creşte la fel, deci densitatea rândurilor
  // rămâne uniformă în tot cardul. Blocurile fără rânduri (notă, grafic, grilă
  // de dale) nu cresc: o notă întinsă ar arăta ca un bloc gol. Ultima secţiune
  // ajunge astfel la baza cardului -> gol ≈ 0.
  //
  // (v1.4.2) Excepţie la regula de mai sus: o grilă cu O SINGURĂ coloană nu e
  // o grilă de dale, e o listă de rânduri — vizual identică cu un tabel
  // `monitor`. Singurul astfel de bloc din aplicaţie e cardul „Automatizări"
  // de pe Mentenanţă, care rămânea cu 53px goi la bază pentru că vecinul lui
  // de rând, „Actualizări sistem", are 5 rânduri faţă de 3 (auditul responsive
  // pe v1.4.1, detector cardGap, 6 combinaţii ≥760px). Grilele cu 2-3 coloane
  // rămân excluse — acolo raţionamentul iniţial e corect.
  //
  // Alternativele încercate şi respinse, ca să nu se reintroducă:
  //   - `space-between` pe card: lasă un gol mare chiar sub titlu;
  //   - creşterea DOAR a ultimului bloc: rânduri de 87px lângă rânduri de 26px
  //     în acelaşi card;
  //   - `align-items: start` pe grile (Faza A): grila arată neîngrijită, cu
  //     carduri de înălţimi aleatorii — vezi CHANGELOG v1.3.5.
  const growable = (b) => !!(b.isMonitor || b.isExpand || (b.isGrid && b.cols === 1));
  return (
    <div style={s(card.cardStyle)} data-card={'page:' + card.title}>
      <div style={s(card.headerStyle + ' flex-shrink:0;')}>{card.title}</div>
      {card.blocks.map((b, i) => (
        <Block key={i} b={b} grow={growable(b)} />
      ))}
    </div>
  );
}

/**
 * Marcajul de comandă în zbor. O singură implementare pentru toate suprafeţele:
 * dală de secţiune, antet de acordeon, card de dispozitiv, modal.
 * NU schimbă starea afişată — doar spune că o comandă a plecat şi se aşteaptă
 * confirmarea reală. Inelul singur n-ar spune nimic unui cititor de ecran, de
 * aceea îl însoţeşte un text ascuns vizual.
 */
function InZbor({ b, doarInel, faraCerc }) {
  if (!b || !b.inZbor) return null;
  return (
    <>
      {/* (v2.0.1) `faraCerc`: acolo unde inelul e deja pe butonul Power, cercul
          mic de lângă text ar fi al doilea indicator pentru acelaşi lucru. */}
      {faraCerc ? null : <span className="hdSpinner" style={s(b.spinnerStyle)} aria-hidden="true" />}
      {doarInel ? null : <span>{b.textCmd}</span>}
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {b.textAccesibil}
      </span>
    </>
  );
}

function Block({ b, grow }) {
  // `grow` (v1.3.5): acest bloc absoarbe surplusul cardului întins de grilă.
  // Wrapper-ul devine coloană flexibilă, capul rămâne fix, iar rândurile se
  // împart spaţiul în mod egal (conţinutul lor e deja centrat vertical).
  const growWrap = grow ? ' flex:1 1 auto; display:flex; flex-direction:column;' : '';
  const growRow = grow ? ' flex:1 1 auto;' : '';
  // Starea deschis/închis a secţiunilor extensibile (energie, v1.1.3).
  // Hook-ul stă înaintea oricărui return ca să respecte regulile React.
  const [open, setOpen] = useState(false);

  if (b.isNote) return <div style={s(b.noteStyle)}>{b.text}</div>;

  if (b.isStats)
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + b.cols + ',minmax(0,1fr))', gap: 10, marginBottom: 14 }}>
        {b.items.map((it, i) => (
          <div key={i} style={s(it.wrapStyle)} onMouseEnter={it.onEnter} onMouseLeave={it.onLeave}>
            <div style={s(it.tileStyle)} {...pressProps(it.onEnter, it.onLeave, () => {})}>
              <div style={s(it.headStyle)}>{it.iconEl}{it.label}</div>
              <div style={s(it.valueStyle)}><Roll text={it.value} anim={b.anim} /></div>
              {it.sub ? <div style={s(it.subStyle)}>{it.sub}</div> : null}
            </div>
            {it.showTip ? <Tip text={it.tipText} /> : null}
          </div>
        ))}
      </div>
    );

  if (b.isInstrument) return <EnergyInstrument anim={b.anim} />;

  if (b.isBars)
    return (
      <div style={s(b.wrapStyle)}>
        <div style={s(b.titleStyle)}>{b.title}</div>
        {b.rows.map((row, i) => (
          <div key={i} style={s(row.rowStyle)}>
            <div style={s(row.labelStyle)}>{row.label}</div>
            <div style={s(row.trackStyle)}><div style={s(row.fillStyle)} /></div>
            <div style={s(row.valueStyle)}>{row.text}</div>
          </div>
        ))}
      </div>
    );

  if (b.isExpand)
    return (
      <div style={s(b.wrapStyle + growWrap)}>
        <div style={s(b.capStyle + (grow ? ' flex-shrink:0;' : ''))}>
          <span style={s(b.capIconStyle)}>{b.capIconEl}</span>
          {b.title}
        </div>
        {b.summary.concat(open ? b.detail : []).map((row, i) => (
          <div key={i} style={s(row.rowStyle + growRow)} onMouseEnter={row.onEnter} onMouseLeave={row.onLeave} {...pressProps(row.onEnter, row.onLeave, () => {})}>
            <div style={s(row.labelStyle)}>
              <span style={s(row.dotStyle)} />
              {row.label}
            </div>
            <div style={s(row.valueStyle)}>{row.value}</div>
            {row.showTip ? <Tip text={row.tipText} /> : null}
          </div>
        ))}
        <button type="button" style={s(b.toggleStyle)} onClick={() => setOpen(!open)}>
          <span style={{ display: 'flex', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s ease' }}>{b.chevEl}</span>
          {open ? b.lessLabel : b.moreLabel}
        </button>
      </div>
    );

  // (v1.4.2) Când creşte (doar grilele cu o coloană — vezi PageCard), containerul
  // ia surplusul, iar `align-content: stretch` îl împarte EGAL între rândurile
  // auto. Dala are deja `flex:1 1 auto` şi `align-items:center` în tokens.js,
  // deci se înalţă cu conţinutul centrat — exact ca rândurile unui `monitor`.
  // Nu se atinge `display:grid`: growWrap ar impune display:flex, iar `s()` e
  // last-wins.
  const growGrid = grow ? { flex: '1 1 auto', alignContent: 'stretch' } : null;

  if (b.isGrid)
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + b.cols + ',minmax(0,1fr))', gap: 8, marginBottom: 14, ...growGrid }}>
        {b.items.map((item, i) => (
          <div key={i} style={s(item.wrapStyle)} onMouseEnter={item.onEnter} onMouseLeave={item.onLeave}>
            <div style={s(item.tileStyle)} {...pressProps(item.onEnter, item.onLeave, item.onToggle)}>
              <div style={s(item.iconWrapStyle)}>{item.iconEl}</div>
              <div style={{ minWidth: 0 }}>
                <div style={s(item.labelStyle)}>{item.label}</div>
                <div style={s(item.valueStyle)}>{item.value}</div>
              </div>
            </div>
            {item.showTip ? <Tip text={item.tipText} /> : null}
          </div>
        ))}
      </div>
    );

  if (b.isMonitor)
    return (
      <div style={s(b.wrapStyle + growWrap)}>
        <div style={s(b.capStyle + (grow ? ' flex-shrink:0;' : ''))}>
          <span style={s(b.capIconStyle)}>{b.capIconEl}</span>
          {b.title}
        </div>
        {b.rows.map((row, i) => (
          <div key={i} style={s(row.rowStyle + growRow)} onMouseEnter={row.onEnter} onMouseLeave={row.onLeave} {...pressProps(row.onEnter, row.onLeave, () => {})}>
            <div style={s(row.labelStyle)}>
              <span style={s(row.dotStyle)} />
              {row.label}
            </div>
            <div style={s(row.valueStyle)}>{row.value}</div>
            {row.showTip ? <Tip text={row.tipText} /> : null}
          </div>
        ))}
      </div>
    );

  if (b.isSlots)
    return (
      <div style={s(b.gridStyle)}>
        {b.items.map((it, i) => (
          <div key={i} style={s(it.style)}>
            <div style={s(it.iconStyle)}>{it.iconEl}</div>
            <div style={s(it.nameStyle)}>{it.name}</div>
            <div style={s(it.hintStyle)}>{it.hint}</div>
          </div>
        ))}
      </div>
    );

  if (b.isTimeline)
    return (
      <div style={s(b.wrapStyle)}>
        <div style={s(b.capStyle)}>
          <span style={s(b.capTitleStyle)}>{b.title}</span>
          <span style={s(b.capHintStyle)}>{b.hint}</span>
        </div>
        {b.rows.map((tr, i) => (
          <div key={i} style={s(tr.rowStyle)}>
            <div style={s(tr.labelStyle)}>{tr.label}</div>
            <div style={s(tr.barStyle)}>
              {tr.segs.map((sg, j) => (
                <div key={j} style={s(sg.style)} />
              ))}
            </div>
          </div>
        ))}
        <div style={s(b.axisStyle)}>
          <div />
          <div style={s(b.axisInnerStyle)}>
            {b.axisLabels.map((ax, i) => (
              <span key={i} style={s(ax.style)}>{ax.label}</span>
            ))}
          </div>
        </div>
        <div style={s(b.legendStyle)}>
          {b.legend.map((lg, i) => (
            <div key={i} style={s(lg.rowStyle)}>
              <span style={s(lg.dotStyle)} />
              <span style={s(lg.labelStyle)}>{lg.label}</span>
            </div>
          ))}
        </div>
      </div>
    );

  if (b.isChart)
    return (
      <div style={s(b.wrapStyle)}>
        <div style={s(b.capStyle)}>
          <span style={s(b.capTitleStyle)}>{b.title}</span>
          <span style={s(b.capHintStyle)}>{b.hint}</span>
        </div>
        {b.hasData ? b.chartEl : <div style={s(b.emptyStyle)}>{b.emptyText}</div>}
        {b.hasData ? (
          <div style={s(b.legendStyle)}>
            {b.legend.map((lg, i) => (
              <div key={i} style={s(lg.rowStyle)}>
                <span style={s(lg.dotStyle)} />
                <span style={s(lg.labelStyle)}>{lg.label}</span>
                <span style={s(lg.valueStyle)}>{lg.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );

  if (b.isAccordion)
    return (
      <>
        {b.items.map((acc) => (
          <div key={acc.id} style={s(acc.wrapStyle)}>
            {/* `data-acc` (v1.7.0): identificator stabil pentru unelte. Fara el,
                o sonda trebuie sa gaseasca acordeonul dupa textul vizibil — exact
                metoda care s-a rupt tacut la schimbarea navigatiei (lectia 12). */}
            <div style={s(acc.headStyle)} data-acc={acc.id} aria-expanded={acc.open} aria-busy={acc.inZbor || undefined} onClick={acc.onExpand}>
              <div style={s(acc.headLeftStyle)}>
                <div style={s(acc.iconWrapStyle)}>{acc.iconEl}</div>
                <div style={{ minWidth: 0, flex: '1 1 auto' }}>
                  <div style={s(acc.nameStyle)}>{acc.name}</div>
                  <div style={s(acc.metaStyle)}>
                    <InZbor b={acc} faraCerc />
                    {acc.inZbor ? null : acc.meta}
                  </div>
                </div>
              </div>
              <div style={s(acc.headRightStyle)}>
                <div className="hdTapY" data-power={acc.id} style={s(acc.togglePillStyle)} onClick={acc.onPower}>
                  <div className={acc.inZbor ? 'hdPow' : undefined} style={s(acc.toggleKnobStyle)}>{acc.toggleIconEl}</div>
                </div>
                <div style={s(acc.chevStyle)}>
                  {acc.chevLabel}
                  <span style={s(acc.chevIconStyle)}>{acc.chevEl}</span>
                </div>
              </div>
            </div>
            {acc.open ? (
              <div style={s(acc.bodyStyle)}>
                {acc.hasSetpoints ? (
                  <>
                    <div style={s(acc.setpointHeaderStyle)}>Valori ţintă</div>
                    <div style={s(acc.setpointGridStyle)}>
                      {acc.setpoints.map((sp, i) => (
                        <div key={i} style={s(sp.wrapStyle)}>
                          <div style={{ minWidth: 0 }}>
                            <div style={s(sp.labelStyle)}>{sp.label}</div>
                            <div style={s(sp.hintStyle)}>{sp.hint}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
                            {/* `data-sp` (v1.7.2): identificator stabil pentru unelte, ca
                                si `data-acc`/`data-page`. Fara el, o sonda trebuie sa
                                gaseasca butonul dupa forma glifei. */}
                            <div style={s(sp.btnStyle)} data-sp="minus" onClick={sp.onMinus}>{ic('minus', { size: 15, sw: 2 })}</div>
                            <div style={s(sp.valStyle)}>{sp.val}</div>
                            <div style={s(sp.btnStyle)} data-sp="plus" onClick={sp.onPlus}>{ic('plus', { size: 15, sw: 2 })}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
                {acc.sections.map((sec, si) => (
                  <div key={si} style={{ marginBottom: 14 }}>
                    <div style={s(sec.headerStyle)}>{sec.title}</div>
                    <div style={s(sec.gridStyle)}>
                      {sec.items.map((item, ii) => (
                        <div key={ii} style={s(item.wrapStyle)} onMouseEnter={item.onEnter} onMouseLeave={item.onLeave}>
                          <div
                            style={s(item.tileStyle)}
                            data-tile={item.dataTile || undefined}
                            aria-busy={item.inZbor || undefined}
                            {...pressProps(item.onEnter, item.onLeave, item.onToggle)}
                          >
                            <div style={s(item.iconWrapStyle)}>{item.iconEl}</div>
                            <div style={{ minWidth: 0 }}>
                              <div style={s(item.labelStyle)}>{item.label}</div>
                              <div style={s(item.valueStyle)}>
                                <InZbor b={item} doarInel />
                                {item.value}
                              </div>
                            </div>
                          </div>
                          {item.showTip ? <Tip text={item.tipText} /> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {acc.hasSchedule ? <ProgramareAC /> : null}
              </div>
            ) : null}
          </div>
        ))}
      </>
    );

  if (b.isNowPlaying)
    return (
      <div style={s(b.wrapStyle)}>
        <div style={s(b.iconWrapStyle)}>{b.iconEl}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={s(b.titleStyle)}>{b.name}</div>
          <div style={s(b.subStyle)}>{b.sub}</div>
          {b.showControls ? (
            <div style={s(b.volBarStyle)}>
              <div style={s(b.volFillStyle)} />
            </div>
          ) : null}
        </div>
        <div style={s(b.ctrlRowStyle)}>
          {b.ctrls.map((ct, i) => (
            <div key={i} className="hdTap" style={s(ct.style)} onClick={ct.onClick} title={ct.label}>
              {ct.iconEl}
            </div>
          ))}
        </div>
        <div style={s(b.stateStyle)}>{b.state}</div>
      </div>
    );

  return null;
}

// ------------------------------------------------------------------- picker
function Picker({ tracked, setTracked, dragId, setDragId, onClose }) {
  const E = useEntities();
  const { mob } = useBreakpoint();
  function toggleTracked(id) {
    setTracked(tracked.indexOf(id) >= 0 ? tracked.filter((x) => x !== id) : tracked.concat([id]));
  }
  function dropOnto(targetId) {
    if (!dragId || dragId === targetId) return;
    const list = tracked.slice();
    const from = list.indexOf(dragId);
    const to = list.indexOf(targetId);
    if (from < 0 || to < 0) return;
    list.splice(from, 1);
    list.splice(to, 0, dragId);
    setTracked(list);
  }
  const sorted = DEVICE_CARDS.slice().sort((x, y) => {
    const ix = tracked.indexOf(x.id), iy = tracked.indexOf(y.id);
    if (ix >= 0 && iy >= 0) return ix - iy;
    if (ix >= 0) return -1;
    if (iy >= 0) return 1;
    return 0;
  });

  return (
    <div style={s(overlayStyle(mob))} onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hd-picker-title"
        style={s('width:100%; max-width:520px; padding:22px; border-radius:26px; background:linear-gradient(158deg,#1d1712 0%,#141110 100%); border:1px solid rgba(240,138,44,0.28); box-shadow:0 40px 90px -30px rgba(0,0,0,0.85);')}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <div id="hd-picker-title" style={s('font-family:' + SANS + '; font-size:17px; font-weight:500; color:' + TXT + ';')}>
              Dispozitive pe pagina Acasă
            </div>
            <div style={s('font-family:' + SANS + '; font-size:11.5px; font-weight:300; color:' + TXT3 + '; margin-top:3px;')}>
              {tracked.length} din {DEVICE_CARDS.length} selectate · trage de ⣿ pentru a schimba ordinea
            </div>
          </div>
          <div
            role="button"
            tabIndex={0}
            data-action="close-modal"
            aria-label="Închide"
            style={s(closeBtnStyle)}
            onClick={onClose}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
          >
            {ic('close', { size: 16, sw: 1.6 })}
          </div>
        </div>
        <div style={s('margin-top:18px; max-height:52vh; overflow-y:auto; display:flex; flex-direction:column; gap:8px; padding-right:4px;')}>
          {sorted.map((c) => {
            const pos = tracked.indexOf(c.id);
            const on = pos >= 0;
            const dragging = dragId === c.id;
            const mapped = E.mapped(c.slot);
            return (
              <div
                key={c.id}
                style={s('display:flex; align-items:center; justify-content:space-between; gap:10px; padding:11px 13px; border-radius:15px; cursor:pointer; transition:opacity .14s ease, transform .14s ease; background:' + (on ? 'rgba(240,138,44,0.08)' : 'rgba(255,255,255,0.03)') + '; border:1px solid ' + (on ? 'rgba(240,138,44,0.26)' : 'rgba(255,255,255,0.06)') + ';' + (dragging ? ' opacity:0.55; transform:scale(0.985);' : ''))}
                onClick={() => toggleTracked(c.id)}
                draggable={on}
                onDragStart={(e) => { setDragId(c.id); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={(e) => { e.preventDefault(); if (on) dropOnto(c.id); }}
                onDragEnd={() => setDragId(null)}
                onDrop={(e) => { e.preventDefault(); setDragId(null); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  {on ? (
                    <div style={s('width:20px; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:' + (dragging ? ORANGE : 'rgba(255,255,255,0.28)') + '; cursor:grab;')}>
                      {ic('grip', { size: 16, sw: 0 })}
                    </div>
                  ) : null}
                  <div style={s('width:34px; height:34px; flex-shrink:0; border-radius:11px; display:flex; align-items:center; justify-content:center; background:' + (on ? 'rgba(240,138,44,0.12)' : 'rgba(255,255,255,0.05)') + ';')}>
                    {ic(c.icon, { size: 17, color: on ? ORANGE : TXT2 })}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={s('font-family:' + SANS + '; font-size:13px; font-weight:500; color:' + TXT + '; line-height:1.25; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; word-break:break-word;')}>
                      {c.label}
                    </div>
                    <div style={s('font-family:' + SANS + '; font-size:10.5px; font-weight:300; color:' + (mapped ? TXT3 : ORANGE) + '; margin-top:2px;')}>
                      {(c.group || 'Diverse') + ' · ' + c.model + (mapped ? '' : ' · VERIFY')}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
                  {on ? (
                    <div style={s('width:22px; height:22px; flex-shrink:0; border-radius:7px; display:flex; align-items:center; justify-content:center; font-family:' + SANS + '; font-size:10.5px; font-weight:600; color:#f0c79b; background:rgba(240,138,44,0.14); border:1px solid rgba(240,138,44,0.24);')}>
                      {pos + 1}
                    </div>
                  ) : null}
                  <div style={s('width:26px; height:26px; flex-shrink:0; border-radius:9px; display:flex; align-items:center; justify-content:center; background:' + (on ? 'linear-gradient(140deg,' + ORANGE_HI + ',#DE7420)' : 'transparent') + '; border:1px solid ' + (on ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.14)') + ';')}>
                    {on ? ic('check', { size: 15, color: '#2a1608', sw: 2.4 }) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------- modal
function Modal({ m, onClose }) {
  const { mob } = useBreakpoint();
  return (
    <div style={s(overlayStyle(mob))} onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hd-device-modal-title"
        style={s('width:100%; max-width:560px; padding:22px; border-radius:26px; background:linear-gradient(158deg,#1d1712 0%,#141110 100%); border:1px solid rgba(240,138,44,0.28); box-shadow:0 40px 90px -30px rgba(0,0,0,0.85);')}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
            <div style={s(m.iconWrapStyle)}>{m.iconEl}</div>
            <div style={{ minWidth: 0 }}>
              <div id="hd-device-modal-title" style={s(m.titleStyle)}>{m.title}</div>
              <div style={s(m.subStyle)} aria-busy={m.inZbor || undefined}>
                <InZbor b={m} faraCerc />
                {m.inZbor ? null : m.model + ' • ' + m.status}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div className="hdTapY" data-power={m.id} style={s(m.togglePillStyle)} onClick={m.onToggle}>
              <div className={m.inZbor ? 'hdPow' : undefined} style={s(m.toggleKnobStyle)}>{m.toggleIconEl}</div>
              <span style={s(m.toggleTextStyle)}>{m.toggleText}</span>
            </div>
            <div
              role="button"
              tabIndex={0}
              data-action="close-modal"
              aria-label="Închide"
              style={s(closeBtnStyle)}
              onClick={onClose}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
            >
              {ic('close', { size: 16, sw: 1.6 })}
            </div>
          </div>
        </div>

        {m.hasTarget ? (
          <div style={s(m.targetWrapStyle)}>
            <div style={s(m.targetCapStyle)}>{m.targetLabel}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginTop: 8 }}>
              {/* v1.3.2: fără −/+ când valoarea nu e controlabilă (Hisense) */}
              {m.targetStatic ? null : <div style={s(m.stepBtnStyle)} onClick={m.onMinus}>{ic('minus', { size: 18, sw: 2 })}</div>}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={s(m.targetValStyle)}>{m.targetVal}</span>
                {m.targetUnit ? <span style={s(m.targetUnitStyle)}>{m.targetUnit}</span> : null}
              </div>
              {m.targetStatic ? null : <div style={s(m.stepBtnStyle)} onClick={m.onPlus}>{ic('plus', { size: 18, sw: 2 })}</div>}
            </div>
            <div style={s(m.targetHintStyle)}>{m.targetHint}</div>
          </div>
        ) : null}

        <div style={s(m.bodyStyle)}>
          {m.sections.map((sec, i) => (
            <div key={i} style={{ marginBottom: 15 }}>
              <div style={s(sec.headerStyle)}>{sec.title}</div>
              <div style={s(sec.gridStyle)}>
                {sec.items.map((item, j) => (
                  <div key={j} style={s(item.tileStyle)} onClick={item.onToggle} title={item.title}>
                    <div style={s(item.iconWrapStyle)}>{item.iconEl}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={s(item.labelStyle)}>{item.label}</div>
                      <div style={s(item.valueStyle)}>{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
