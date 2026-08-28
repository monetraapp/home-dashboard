// Definiţia paginilor — aceleaşi carduri şi blocuri ca în design, dar cu
// referinţe la sloturi HA în locul valorilor mock.
//
// Faţă de mockup a fost scos intenţionat blocul „Controale cu risc"
// (PoE on/off, restart HA, Aux1/Aux2 clorinator) —
// înlocuit cu o notă informativă.


import {
  ro, txt, sw, grid, monitor, note, slots, nowPlaying, chart, timeline,
  accordion, sec, act, spClimate, spNumber, stats, instrument, bars, expand
} from './blocks.js';
import { CLIMAT_ACCORDION, PISCINA_ACCORDION } from './accordions.js';

export {
  ro, txt, sw, grid, monitor, note, slots, nowPlaying, chart, timeline,
  accordion, sec, act, spClimate, spNumber, stats, instrument, bars, expand
};

export const ORANGE_SERIES = '#F08A2C';
export const SAND_SERIES = '#C8A173';
export const BLUE_SERIES = '#8FA7C8';

/** Rând de monitor: [etichetă, slot sau {slot, ...opts} sau text fix]. */
const r = (label, slot, opts) => [label, { slot, opts: opts || {} }];
const rt = (label, text) => [label, { text }];

const C = '°C';
const PCT = '%';

export const PAGES = {
  climat: {
    eyebrow: '3 unităţi interne',
    title: 'Climat',
    chips: [
      { icon: 'home', slot: 'climate.vortex', opts: { attr: 'current_temperature', unit: C }, prefix: 'Mansardă ' },
      { icon: 'cloud', slot: 'weather.main', opts: { attr: 'temperature', unit: C }, prefix: 'Exterior ' }
    ],
    cards: [
      {
        title: 'Unităţi de climatizare · setări complete',
        wide: true,
        order: 0,
        blocks: [accordion(CLIMAT_ACCORDION)]
      },
      {
        title: 'Temperaturi pe zone',
        blocks: [
          monitor('Ambient', [
            r('AC Etaj Ambient', 'climate.etaj', { attr: 'current_temperature', unit: C }),
            r('Ambient Mansardă', 'climate.vortex', { attr: 'current_temperature', unit: C }),
            r('Vivax Ambient', 'climate.vivax', { attr: 'current_temperature', unit: C }),
            r('Exterior', 'weather.main', { attr: 'temperature', unit: C })
          ])
        ]
      },
      {
        title: 'Consum climatizare',
        blocks: [
          monitor('AC Etaj LG · energie', [
            r('Azi', 'energy.ac_etaj_azi'),
            r('Ieri', 'energy.ac_etaj_ieri'),
            r('Luna curentă', 'energy.ac_etaj_luna'),
            r('Luna trecută', 'energy.ac_etaj_luna_trecuta')
          ]),
          note('Doar unităţile care expun senzori de energie apar aici. Sloturile nemapate rămân marcate VERIFY.')
        ]
      },
      {
        title: 'Evoluţie temperaturi',
        wide: true,
        order: 8,
        blocks: [
          chart('Mansardă · ambient vs setare', 'ultimele 7 zile', [
            { name: 'Ambient mansardă', color: ORANGE_SERIES, slot: 'sensor.mans_ambient' },
            { name: 'Setare', color: SAND_SERIES, dashed: true, slot: 'sensor.mans_setpoint' }
          ], C),
          chart('Ambient pe unităţi', 'toate cele trei unităţi', [
            { name: 'Mansardă Vortex', color: ORANGE_SERIES, slot: 'sensor.mans_ambient' },
            { name: 'Etaj LG', color: SAND_SERIES, slot: 'sensor.lg_ambient' },
            { name: 'Mansardă Vivax', color: BLUE_SERIES, slot: 'sensor.vv_ambient' }
          ], C),
          timeline('Stare unităţi', 'ultimele 7 zile', [
            { label: 'Mansardă Vortex', slot: 'climate.vortex' },
            { label: 'Etaj LG', slot: 'climate.etaj' },
            { label: 'Mansardă Vivax', slot: 'climate.vivax' }
          ], [['on', 'În funcţiune'], ['off', 'Oprit'], ['unavail', 'Indisponibil']])
        ]
      }
    ]
  },

  piscina: {
    eyebrow: 'Apă, chimie şi echipamente',
    title: 'Piscină',
    chips: [
      { icon: 'waves', slot: 'sensor.apa_temp', opts: { unit: C }, prefix: 'Apă ' },
      { icon: 'beaker', slot: 'sensor.ph', opts: { unit: '' }, prefix: 'pH ' },
      { icon: 'gauge', slot: 'sensor.orp', opts: { unit: 'mV' }, prefix: 'ORP ' }
    ],
    cards: [
      {
        title: 'Echipamente piscină · setări complete',
        wide: true,
        order: 0,
        blocks: [accordion(PISCINA_ACCORDION)]
      },
      {
        title: 'Filtrare şi apă',
        blocks: [
          grid(2, [
            sw('plug', 'Pompă filtrare', 'switch.pompa_filtrare'),
            sw('flame', 'Pompă căldură', 'climate.pompa_caldura', { hvac: true })
          ]),
          monitor('Măsurători', [
            r('Temperatură apă', 'sensor.apa_temp', { unit: C }),
            r('Consum pompă căldură', 'sensor.pc_consum'),
            r('Problemă debit apă', 'binary_sensor.pc_debit', { map: { on: 'Da', off: 'Nu' } }),
            r('Flag problemă', 'binary_sensor.pc_problema', { map: { on: 'Da', off: 'Nu' } })
          ])
        ]
      },
      {
        title: 'Chimia apei',
        blocks: [
          monitor('Valori curente', [
            r('pH', 'sensor.ph', { unit: '' }),
            r('pH ţintă', 'number.ph_tinta', { unit: '' }),
            r('ORP', 'sensor.orp', { unit: 'mV' }),
            r('ORP ţintă', 'number.orp_tinta', { unit: 'mV' }),
            r('Amperaj celulă', 'sensor.clor_amperaj')
          ])
        ]
      },
      {
        title: 'Clorinare',
        blocks: [
          grid(3, [
            sw('droplet', 'Clorinator', 'switch.clorinator'),
            sw('droplet', 'Regim redus', 'switch.clorinator_redus'),
            sw('boost', 'Regim boost', 'switch.clorinator_boost')
          ]),
          monitor('Producţie', [
            r('Stare clorinator', 'sensor.clor_stare_exo'),
            r('Producţie clor', 'number.clor_productie', { unit: PCT, decimals: 0 })
          ]),
          note('Aux1 şi Aux2 de pe clorinator nu sunt expuse ca butoane — funcţia lor nu e identificată, aşa că rămân în afara interfeţei.')
        ]
      },
      {
        title: 'Diagnostic clorinator',
        blocks: [
          monitor('Zodiac EXO iQ', [
            r('Cod eroare', 'sensor.clor_cod_eroare'),
            r('Stare eroare', 'sensor.clor_stare_eroare'),
            r('Stare EXO', 'sensor.clor_stare_exo'),
            r('Dual Link', 'sensor.clor_dual_link')
          ])
        ]
      },
      {
        title: 'Istoric apă şi chimie',
        wide: true,
        order: 8,
        blocks: [
          // Seria "Ţintă pompă căldură" ELIMINATĂ (v1.1.1): istoricul se citeşte
          // cu no_attributes:true, iar pentru ţinta Fairland nu există un senzor
          // dedicat cu istoric în stare — seria ar fi rămas permanent goală.
          chart('Temperatură apă', 'ultimele 7 zile', [
            { name: 'Apă', color: ORANGE_SERIES, slot: 'sensor.apa_temp' }
          ], C),
          chart('ORP şi pH', 'ORP măsurat vs ţintă', [
            { name: 'ORP', color: ORANGE_SERIES, slot: 'sensor.orp' },
            { name: 'ORP ţintă', color: SAND_SERIES, dashed: true, slot: 'number.orp_tinta' }
          ], 'mV'),
          chart('Producţie clor', 'procent activ pe zi', [
            { name: 'Producţie', color: ORANGE_SERIES, slot: 'number.clor_productie' }
          ], PCT, 'bars'),
          chart('Putere pompă căldură', 'medie zilnică', [
            { name: 'Putere medie', color: ORANGE_SERIES, slot: 'sensor.pc_consum' }
          ], 'W')
        ]
      }
    ]
  },

  media: {
    eyebrow: 'Redare curentă şi istoric',
    title: 'Media',
    chips: [
      { icon: 'tv', text: '8 dispozitive' },
      { icon: 'playCircle', text: 'Redare curentă' }
    ],
    cards: [
      { title: 'Redare curentă', wide: true, blocks: [nowPlaying()] },
      {
        title: 'Istoric media',
        wide: true,
        order: 8,
        blocks: [
          timeline('Televizoare active', 'ultimele 7 zile', [
            { label: 'Mansardă LG', slot: 'media.mansarda' },
            { label: 'Bucătărie', slot: 'media.bucatarie' },
            { label: 'Dormitor Etaj', slot: 'media.etaj_hisense' },
            { label: 'Casa Tata', slot: 'media.tata_dormitor' }
          ], [['on', 'Pornit'], ['off', 'Standby'], ['unavail', 'Indisponibil']])
        ]
      }
    ]
  },

  retea: {
    eyebrow: 'Monitorizare infrastructură · doar informativ',
    title: 'Reţea',
    chips: [
      { icon: 'wifi', text: '5 puncte de acces' },
      { icon: 'lock', text: 'Fără comenzi' }
    ],
    cards: [
      {
        title: 'Internet şi echipamente',
        blocks: [
          monitor('Legături', [
            r('Legătură WAN', 'net.wan_link', { map: { on: 'Pornit', off: 'Oprit' } }),
            r('Conectivitate', 'net.connectivity', { map: { on: 'Pornit', off: 'Oprit' } })
          ]),
          monitor('Gateway Principal', [
            r('Stare', 'net.gw_state'),
            r('CPU', 'net.gw_cpu', { unit: PCT, decimals: 0 }),
            r('Memorie', 'net.gw_mem', { unit: PCT, decimals: 0 }),
            r('Firmware', 'net.gw_fw', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } })
          ]),
          monitor('Switch Principal', [
            r('Stare', 'net.sw_state'),
            r('CPU', 'net.sw_cpu', { unit: PCT, decimals: 0 }),
            r('Memorie', 'net.sw_mem', { unit: PCT, decimals: 0 }),
            r('Firmware', 'net.sw_fw', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } })
          ]),
          // (v1.2.8) Şi switch-urile Easy Managed au entităţi de firmware —
          // comentariul anterior („nu au") era fals; gaură din auditul HA.
          monitor('Switch Foişor', [
            r('Stare', 'net.swf_state'),
            r('CPU', 'net.swf_cpu', { unit: PCT, decimals: 0 }),
            r('Memorie', 'net.swf_mem', { unit: PCT, decimals: 0 }),
            r('Firmware', 'upd.net_swf', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } })
          ]),
          monitor('Switch Etaj', [
            r('Stare', 'net.swe_state'),
            r('CPU', 'net.swe_cpu', { unit: PCT, decimals: 0 }),
            r('Memorie', 'net.swe_mem', { unit: PCT, decimals: 0 }),
            r('Firmware', 'upd.net_swe', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } })
          ])
        ]
      },
      {
        title: 'Puncte de acces',
        blocks: [
          monitor('EAP · CPU / RAM', [
            ['Parter', { pair: ['net.ap_parter_cpu', 'net.ap_parter_mem'] }],
            ['Etaj', { pair: ['net.ap_etaj_cpu', 'net.ap_etaj_mem'] }],
            ['Mansardă', { pair: ['net.ap_mansarda_cpu', 'net.ap_mansarda_mem'] }],
            ['Foişor', { pair: ['net.ap_foisor_cpu', 'net.ap_foisor_mem'] }],
            ['Casa Faţă', { pair: ['net.ap_casa_fata_cpu', 'net.ap_casa_fata_mem'] }]
          ]),
          // (v1.2.8) Starea de conectare — era mapată doar la gateway/switch-uri.
          monitor('EAP · Stare', [
            r('Parter', 'net.ap_parter_state'),
            r('Etaj', 'net.ap_etaj_state'),
            r('Mansardă', 'net.ap_mansarda_state'),
            r('Foişor', 'net.ap_foisor_state'),
            r('Casa Faţă', 'net.ap_casa_fata_state')
          ])
        ]
      },
      {
        title: 'Consum PoE',
        blocks: [
          monitor('Switch Principal · porturi 1–8', [
            r('Port 1', 'net.poe1'), r('Port 2', 'net.poe2'), r('Port 3', 'net.poe3'), r('Port 4', 'net.poe4'),
            r('Port 5', 'net.poe5'), r('Port 6', 'net.poe6'), r('Port 7', 'net.poe7'), r('Port 8', 'net.poe8')
          ]),
          monitor('Switch Foişor · porturi 1–4', [
            r('Port 1', 'net.swf_poe1'), r('Port 2', 'net.swf_poe2'),
            r('Port 3', 'net.swf_poe3'), r('Port 4', 'net.swf_poe4')
          ]),
          note('Comutarea PoE nu e expusă în această aplicaţie — ar întrerupe alimentarea echipamentelor de pe porturi.')
        ]
      },
      {
        title: 'Porturi LAN gateway',
        blocks: [
          monitor('LAN 2–7', [
            r('LAN 2', 'net.lan2', { map: { on: 'Pornit', off: 'Oprit' } }),
            r('LAN 3', 'net.lan3', { map: { on: 'Pornit', off: 'Oprit' } }),
            r('LAN 4', 'net.lan4', { map: { on: 'Pornit', off: 'Oprit' } }),
            r('LAN 5', 'net.lan5', { map: { on: 'Pornit', off: 'Oprit' } }),
            r('LAN 6', 'net.lan6', { map: { on: 'Pornit', off: 'Oprit' } }),
            r('LAN 7', 'net.lan7', { map: { on: 'Pornit', off: 'Oprit' } })
          ])
        ]
      },
      {
        title: 'Istoric infrastructură',
        wide: true,
        order: 8,
        blocks: [
          timeline('Echipamente reţea', 'ultimele 7 zile', [
            { label: 'Gateway', slot: 'net.gw_state' },
            { label: 'Switch principal', slot: 'net.sw_state' },
            { label: 'EAP Parter', slot: 'net.ap_parter_cpu' },
            { label: 'EAP Etaj', slot: 'net.ap_etaj_cpu' },
            { label: 'EAP Mansardă', slot: 'net.ap_mansarda_cpu' },
            { label: 'EAP Foişor', slot: 'net.ap_foisor_cpu' },
            { label: 'EAP Casa Faţă', slot: 'net.ap_casa_fata_cpu' }
          ], [['on', 'Conectat'], ['off', 'Inactiv'], ['unavail', 'Deconectat']]),
          chart('Încărcare gateway şi switch', 'CPU mediu zilnic', [
            { name: 'Gateway CPU', color: ORANGE_SERIES, slot: 'net.gw_cpu' },
            { name: 'Switch CPU', color: SAND_SERIES, slot: 'net.sw_cpu' }
          ], PCT, 'line', 0, 40),
          chart('Consum PoE total', 'porturi 1–8', [
            {
              name: 'PoE',
              color: ORANGE_SERIES,
              sum: ['net.poe1', 'net.poe2', 'net.poe3', 'net.poe4', 'net.poe5', 'net.poe6', 'net.poe7', 'net.poe8']
            }
          ], 'W')
        ]
      }
    ]
  },

  // Pagina Energie (v1.1.3): invertorul hibrid Growatt 25 kW (device MQTT
  // KNN2E3S00W prin Grott). Se mapează EXCLUSIV entităţile validate de auditul
  // de coerenţă fizică din 2026-08-22 — registrele scalate greşit de layout
  // (bmsbatteryavgtemp, esystotal, ipf, iso, dcit…) sau nepopulate de firmware
  // (eloadtoday/total, bmscyclecnt, temp4, dcv) NU au slot şi nu apar aici.
  energie: {
    eyebrow: 'Fotovoltaic, baterie şi reţea',
    title: 'Energie',
    chips: [
      { icon: 'sun', slot: 'gw.pv_in', opts: { scale: 0.001, decimals: 1, unit: 'kW' }, prefix: 'Producţie ' },
      { icon: 'phoneBattery', slot: 'gw.soc', opts: { unit: '%', decimals: 0 }, prefix: 'Baterie ' }
    ],
    cards: [
      {
        title: 'Growatt 25 kW · APX 20 kWh',
        wide: true,
        order: 0,
        // Instrumentul v1.1.5 (design "Energie Redesign v2"): erou + flux +
        // strip + navigaţie pe categorii + grafice + Bilanţ azi. Panoul
        // "Ce se întâmplă acum" e amânat pentru v1.1.6.
        blocks: [instrument()]
      },
      {
        title: 'Producţie fotovoltaică',
        blocks: [
          expand('Producţie', [
            r('Putere PV totală', 'gw.pv_in', { unit: 'W', decimals: 0 }),
            r('Putere după conversie', 'gw.pv_out', { unit: 'W', decimals: 0 }),
            r('Energie solară azi', 'gw.sol_azi', { unit: 'kWh' })
          ], [
            r('String PV1 · putere', 'gw.pv1_w', { unit: 'W', decimals: 0 }),
            r('String PV2 · putere', 'gw.pv2_w', { unit: 'W', decimals: 0 }),
            r('String PV3 · putere', 'gw.pv3_w', { unit: 'W', decimals: 0 }),
            r('String PV1 · tensiune', 'gw.pv1_v', { unit: 'V' }),
            r('String PV2 · tensiune', 'gw.pv2_v', { unit: 'V' }),
            r('String PV3 · tensiune', 'gw.pv3_v', { unit: 'V' }),
            r('String PV1 · curent', 'gw.pv1_a', { unit: 'A' }),
            r('String PV2 · curent', 'gw.pv2_a', { unit: 'A' }),
            r('String PV3 · curent', 'gw.pv3_a', { unit: 'A' }),
            r('PV1 · energie azi', 'gw.pv1_azi', { unit: 'kWh' }),
            r('PV2 · energie azi', 'gw.pv2_azi', { unit: 'kWh' }),
            r('PV3 · energie azi', 'gw.pv3_azi', { unit: 'kWh' }),
            r('PV1 · energie totală', 'gw.pv1_tot', { unit: 'kWh' }),
            r('PV2 · energie totală', 'gw.pv2_tot', { unit: 'kWh' }),
            r('PV3 · energie totală', 'gw.pv3_tot', { unit: 'kWh' }),
            r('Energie generată azi (AC)', 'gw.gen_azi', { unit: 'kWh' }),
            r('Energie generată total (AC)', 'gw.gen_tot', { unit: 'kWh' }),
            r('Energie solară totală (DC)', 'gw.pv_tot', { unit: 'kWh' }),
            // String PV4 nu există fizic (3 stringuri active) — valorile 0 se
            // afişează estompat, aceeaşi convenţie ca setpoint-ul persistent.
            r('String PV4 · putere', 'gw.pv4_w', { unit: 'W', decimals: 0, dim: true }),
            r('String PV4 · tensiune', 'gw.pv4_v', { unit: 'V', dim: true }),
            r('String PV4 · curent', 'gw.pv4_a', { unit: 'A', dim: true }),
            r('PV4 · energie azi', 'gw.pv4_azi', { unit: 'kWh', dim: true }),
            r('PV4 · energie totală', 'gw.pv4_tot', { unit: 'kWh', dim: true })
          ])
        ]
      },
      {
        title: 'AC trifazat',
        blocks: [
          bars('Echilibru faze', [
            { label: 'L1', slot: 'gw.f1_p' },
            { label: 'L2', slot: 'gw.f2_p' },
            { label: 'L3', slot: 'gw.f3_p' }
          ]),
          expand('AC trifazat', [
            r('Putere AC totală', 'gw.pac', { unit: 'W', decimals: 0 })
          ], [
            r('Faza 1 · tensiune', 'gw.f1_v', { unit: 'V' }),
            r('Faza 2 · tensiune', 'gw.f2_v', { unit: 'V' }),
            r('Faza 3 · tensiune', 'gw.f3_v', { unit: 'V' }),
            r('Faza 1 · curent', 'gw.f1_a', { unit: 'A' }),
            r('Faza 2 · curent', 'gw.f2_a', { unit: 'A' }),
            r('Faza 3 · curent', 'gw.f3_a', { unit: 'A' }),
            r('Faza 1 · putere', 'gw.f1_p', { unit: 'W', decimals: 0 }),
            r('Faza 2 · putere', 'gw.f2_p', { unit: 'W', decimals: 0 }),
            r('Faza 3 · putere', 'gw.f3_p', { unit: 'W', decimals: 0 }),
            r('Tensiune linie R-S', 'gw.v_rs', { unit: 'V' }),
            r('Tensiune linie S-T', 'gw.v_st', { unit: 'V' }),
            r('Tensiune linie T-R', 'gw.v_tr', { unit: 'V' }),
            r('Frecvenţă reţea', 'gw.frecv', { unit: 'Hz', decimals: 2 }),
            r('Frecvenţă invertor', 'gw.frecv_pv', { unit: 'Hz', decimals: 2 }),
            r('Putere reactivă', 'gw.qac', { unit: 'var', decimals: 0 }),
            r('Grad de încărcare', 'gw.sarcina', { unit: PCT, decimals: 0 }),
            r('Putere nominală', 'gw.p_nominal', { unit: 'W', decimals: 0 })
          ])
        ]
      },
      {
        title: 'Baterie APX',
        blocks: [
          expand('Baterie APX', [
            r('Stare de încărcare (SOC)', 'gw.soc', { unit: PCT, decimals: 0 }),
            r('Sănătate baterie (SOH)', 'gw.soh', { unit: PCT, decimals: 0 }),
            ['Baterie acum', { dir: { pos: 'gw.p_chr', neg: 'gw.p_dischr', posLabel: 'Încărcare', negLabel: 'Descărcare', zeroLabel: 'În repaus' } }]
          ], [
            r('Încărcată azi', 'gw.echr_azi', { unit: 'kWh' }),
            r('Încărcată total', 'gw.echr_tot', { unit: 'kWh' }),
            r('Descărcată azi', 'gw.edis_azi', { unit: 'kWh' }),
            r('Descărcată total', 'gw.edis_tot', { unit: 'kWh' }),
            r('Module instalate', 'gw.module', { unit: '', decimals: 0 }),
            r('Curent maxim încărcare', 'gw.i_chr_max', { unit: 'A' }),
            r('Curent maxim descărcare', 'gw.i_dis_max', { unit: 'A' }),
            r('Temperatură baterie', 'gw.bat_temp', { unit: C }),
            r('Temperatură maximă celulă', 'gw.cel_temp_max', { unit: C }),
            r('Temperatură medie baterie', 'gw.bat_temp_med', { unit: C }),
            // BMS-ul publică tensiunile de celulă în mV — se afişează în V
            // (raw/1000), conform auditului (3336 mV = 3.336 V/celulă LFP).
            r('Tensiune maximă celulă', 'gw.cel_v_max', { scale: 0.001, decimals: 3, unit: 'V' }),
            r('Tensiune minimă celulă', 'gw.cel_v_min', { scale: 0.001, decimals: 3, unit: 'V' }),
            ['Dezechilibru celule', { diff: ['gw.cel_v_max', 'gw.cel_v_min'], unit: 'mV', decimals: 0 }],
            r('Celula cu tensiune maximă', 'gw.cel_nr_max', { unit: '', decimals: 0 }),
            r('Celula cu tensiune minimă', 'gw.cel_nr_min', { unit: '', decimals: 0 }),
            r('Curent baterie', 'gw.i_bat', { unit: 'A' }),
            r('Curent buck-boost', 'gw.i_bb', { unit: 'A' }),
            r('Curent LLC', 'gw.i_llc', { unit: 'A' }),
            r('Convertor baterie (BDC)', 'gw.bdc', { map: { '1.0': 'Pornit', '0.0': 'Oprit', 1: 'Pornit', 0: 'Oprit' } }),
            r('Cerere de încărcare', 'gw.cerere_chr', { map: { '1.0': 'Da', '0.0': 'Nu', 1: 'Da', 0: 'Nu' } })
          ])
        ]
      },
      {
        title: 'Reţea',
        blocks: [
          expand('Reţea', [
            ['Reţea acum', { dir: { pos: 'gw.p_export', neg: 'gw.p_import', posLabel: 'Export', negLabel: 'Import', zeroLabel: 'Echilibru' } }],
            r('Consum casă', 'gw.p_casa', { unit: 'W', decimals: 0 })
          ], [
            r('Export azi', 'gw.exp_azi', { unit: 'kWh' }),
            r('Export total', 'gw.exp_tot', { unit: 'kWh' }),
            r('Import azi', 'gw.imp_azi', { unit: 'kWh' }),
            r('Import total', 'gw.imp_tot', { unit: 'kWh' }),
            r('Autoconsum azi', 'gw.self_azi', { unit: 'kWh' }),
            r('Autoconsum total', 'gw.self_tot', { unit: 'kWh' }),
            r('Energie sistem azi', 'gw.sys_azi', { unit: 'kWh' })
          ])
        ]
      },
      {
        title: 'Backup EPS',
        blocks: [
          expand('Backup EPS', [
            // Nu e text fix: dacă EPS-ul ar porni vreodată, rândul ar arăta
            // "Activ · X W" în loc de "Inactiv".
            ['Stare', { dir: { pos: 'gw.eps_p', neg: 'gw.eps_p', posLabel: 'Activ', negLabel: 'Activ', zeroLabel: 'Inactiv' } }]
          ], [
            r('Frecvenţă EPS', 'gw.eps_f', { unit: 'Hz', decimals: 2, dim: true }),
            r('Faza 1 · tensiune', 'gw.eps_v1', { unit: 'V', dim: true }),
            r('Faza 2 · tensiune', 'gw.eps_v2', { unit: 'V', dim: true }),
            r('Faza 3 · tensiune', 'gw.eps_v3', { unit: 'V', dim: true }),
            r('Faza 1 · curent', 'gw.eps_a1', { unit: 'A', dim: true }),
            r('Faza 2 · curent', 'gw.eps_a2', { unit: 'A', dim: true }),
            r('Faza 3 · curent', 'gw.eps_a3', { unit: 'A', dim: true }),
            r('Faza 1 · putere', 'gw.eps_p1', { unit: 'W', decimals: 0, dim: true }),
            r('Faza 2 · putere', 'gw.eps_p2', { unit: 'W', decimals: 0, dim: true }),
            r('Faza 3 · putere', 'gw.eps_p3', { unit: 'W', decimals: 0, dim: true }),
            r('Putere totală EPS', 'gw.eps_p', { unit: 'W', decimals: 0, dim: true }),
            r('Grad de încărcare EPS', 'gw.eps_sarcina', { unit: PCT, decimals: 0, dim: true })
          ])
        ]
      },
      {
        title: 'Stare invertor',
        blocks: [
          expand('Stare invertor', [
            ['Temperatură maximă', { maxOf: ['gw.t_inv', 'gw.t_ipm', 'gw.t_pvimp', 'gw.t_boost', 'gw.t_com'], unit: C }]
          ], [
            r('Temperatură invertor', 'gw.t_inv', { unit: C }),
            r('Temperatură IPM', 'gw.t_ipm', { unit: C }),
            r('Temperatură etaj PV', 'gw.t_pvimp', { unit: C }),
            r('Temperatură boost', 'gw.t_boost', { unit: C }),
            r('Temperatură placă comunicaţie', 'gw.t_com', { unit: C }),
            r('Temperatură senzor A', 'gw.t_a', { unit: C }),
            r('Temperatură senzor B', 'gw.t_b', { unit: C }),
            r('Tensiune bus DC', 'gw.v_bus', { unit: 'V' }),
            r('Tensiune bus pozitiv', 'gw.v_bus_p', { unit: 'V' }),
            r('Tensiune bus negativ', 'gw.v_bus_n', { unit: 'V' }),
            r('Tensiune bus 1', 'gw.v_bus1', { unit: 'V' }),
            r('Tensiune bus 2', 'gw.v_bus2', { unit: 'V' }),
            r('Tensiune bus 2 (low)', 'gw.v_bus2low', { unit: 'V' }),
            r('Ore de funcţionare', 'gw.ore', { unit: 'h', decimals: 0 }),
            r('Curent de scurgere (GFCI)', 'gw.gfci', { unit: 'mA', decimals: 0 }),
            // Registrul pf e publicat brut ×1000 (1000 = 1.00) — afişat scalat.
            r('Factor de putere', 'gw.pf', { scale: 0.001, decimals: 2, unit: '' }),
            r('Întârziere pornire', 'gw.delay', { unit: 's', decimals: 0 }),
            r('Încărcare din AC azi', 'gw.eac_chr_azi', { unit: 'kWh' }),
            r('Încărcare din AC total', 'gw.eac_chr_tot', { unit: 'kWh' }),
            r('Serie invertor', 'gw.serial', { unit: '' }),
            r('Serie datalogger', 'gw.dl_serial', { unit: '' }),
            r('Ultimul pachet de date', 'gw.push', { time: true })
          ])
        ]
      },
      {
        // Contorul inteligent de la punctul de racord (v1.2.8) — măsurare
        // independentă faţă de invertor. Doar cele 27 de registre validate de
        // auditul de coerenţă din 2026-08-23; pos/rev_act_power (dubluri) şi
        // power_factor total (nu se închide pe P/S) au rămas fără slot.
        title: 'Contor racord · GPG0A450ZS',
        blocks: [
          bars('Faze la racord', [
            { label: 'L1', slot: 'ctr.f1_p' },
            { label: 'L2', slot: 'ctr.f2_p' },
            { label: 'L3', slot: 'ctr.f3_p' }
          ]),
          // (v1.2.9) Trendul fazelor pe oglinzile-template (au istoric identic
          // cu registrele brute, dar şi statistici pe termen lung în HA).
          chart('Faze · medie zilnică', 'putere activă pe fază · 7 zile', [
            { name: 'L1', color: ORANGE_SERIES, slot: 'energie.stat_ctr_f1' },
            { name: 'L2', color: SAND_SERIES, slot: 'energie.stat_ctr_f2' },
            { name: 'L3', color: BLUE_SERIES, slot: 'energie.stat_ctr_f3' }
          ], 'W'),
          expand('Contor racord', [
            // Un singur registru semnat: pozitiv = import, negativ = export
            // (verificat încrucişat cu invertorul: ±1.5% pe ambele sensuri).
            ['Net la racord', { sdir: { slot: 'ctr.p_net', posLabel: 'Import', negLabel: 'Export', zeroLabel: 'Echilibru' } }],
            r('Import total (contor)', 'ctr.imp_tot', { unit: 'kWh' }),
            r('Export total (contor)', 'ctr.exp_tot', { unit: 'kWh' })
          ], [
            r('Faza 1 · tensiune', 'ctr.f1_v', { unit: 'V' }),
            r('Faza 2 · tensiune', 'ctr.f2_v', { unit: 'V' }),
            r('Faza 3 · tensiune', 'ctr.f3_v', { unit: 'V' }),
            r('Faza 1 · curent', 'ctr.f1_a', { unit: 'A' }),
            r('Faza 2 · curent', 'ctr.f2_a', { unit: 'A' }),
            r('Faza 3 · curent', 'ctr.f3_a', { unit: 'A' }),
            r('Faza 1 · putere activă', 'ctr.f1_p', { unit: 'W', decimals: 0 }),
            r('Faza 2 · putere activă', 'ctr.f2_p', { unit: 'W', decimals: 0 }),
            r('Faza 3 · putere activă', 'ctr.f3_p', { unit: 'W', decimals: 0 }),
            r('Faza 1 · putere aparentă', 'ctr.f1_s', { unit: 'VA', decimals: 0 }),
            r('Faza 2 · putere aparentă', 'ctr.f2_s', { unit: 'VA', decimals: 0 }),
            r('Faza 3 · putere aparentă', 'ctr.f3_s', { unit: 'VA', decimals: 0 }),
            r('Faza 1 · putere reactivă', 'ctr.f1_q', { unit: 'var', decimals: 0 }),
            r('Faza 2 · putere reactivă', 'ctr.f2_q', { unit: 'var', decimals: 0 }),
            r('Faza 3 · putere reactivă', 'ctr.f3_q', { unit: 'var', decimals: 0 }),
            r('Faza 1 · factor de putere', 'ctr.f1_pf', { unit: '', decimals: 2 }),
            r('Faza 2 · factor de putere', 'ctr.f2_pf', { unit: '', decimals: 2 }),
            r('Faza 3 · factor de putere', 'ctr.f3_pf', { unit: '', decimals: 2 }),
            r('Putere aparentă totală', 'ctr.s_tot', { unit: 'VA', decimals: 0 }),
            r('Putere reactivă totală', 'ctr.q_tot', { unit: 'var', decimals: 0 }),
            r('Frecvenţă la racord', 'ctr.frecv', { unit: 'Hz', decimals: 2 }),
            r('Invertor asociat', 'ctr.serial', { unit: '' }),
            r('Serie datalogger', 'ctr.dl_serial', { unit: '' }),
            r('Ultimul pachet de date', 'ctr.push', { time: true })
          ]),
          note('Contorul măsoară independent de invertor, la punctul de racord. Atenţie la totaluri: contorizează PER FAZĂ — importul e suma fazelor care trag din reţea, exportul suma celor care împing, posibile simultan. De aceea nu coincid cu registrele invertorului, care fac saldo pe toate fazele.')
        ]
      },
      {
        title: 'Consum măsurat separat',
        blocks: [
          monitor('AC Etaj LG', [
            r('Azi', 'energy.ac_etaj_azi'),
            r('Ieri', 'energy.ac_etaj_ieri'),
            r('Luna curentă', 'energy.ac_etaj_luna'),
            r('Luna trecută', 'energy.ac_etaj_luna_trecuta')
          ])
        ]
      },
      {
        title: 'Rezervat pentru extindere',
        blocks: [
          slots([
            { icon: 'car', name: 'EV THOR', hint: 'Încărcător maşină · neinstalat' }
          ]),
          note('Încărcătorul THOR nu e instalat încă. Slotul se populează când dispozitivul apare în HA şi îl mapezi din ecranul „Mapare entităţi".')
        ]
      },
      {
        title: 'Evoluţie consum',
        wide: true,
        order: 8,
        blocks: [
          chart('AC Etaj LG · consum zilnic', 'ultimele 7 zile', [
            { name: 'Consum', color: ORANGE_SERIES, slot: 'energy.ac_etaj_azi', agg: 'last' }
          ], 'Wh', 'bars')
        ]
      }
    ]
  },

  mentenanta: {
    eyebrow: 'Sistem, actualizări şi automatizări',
    title: 'Mentenanţă',
    chips: [
      { icon: 'download', text: 'Actualizări' },
      { icon: 'archive', slot: 'backup.last', prefix: 'Backup ' }
    ],
    cards: [
      {
        title: 'Integrări cu probleme',
        blocks: [
          monitor('Stare integrări', [
            r('AC Vivax · Midea', 'diag.integrare_vivax'),
            r('Fairland · Tuya Local', 'diag.integrare_fairland')
          ])
        ]
      },
      {
        title: 'Add-on-uri',
        blocks: [
          // Doar indicatori (binary_sensor.*_running). Comutatoarele de
          // pornire/oprire add-on NU se expun — oprirea accidentală a unui
          // add-on de pe dashboard e exact genul de acţiune periculoasă evitată.
          monitor('Stare add-on-uri', [
            r('Home Dashboard', 'addon.home_dashboard', { map: { on: 'Rulează', off: 'Oprit' } }),
            r('Matter Server', 'addon.matter_server', { map: { on: 'Rulează', off: 'Oprit' } })
          ])
        ]
      },
      {
        title: 'Automatizări',
        blocks: [
          grid(1, [
            sw('sparkle', 'Alertă clorinator', 'auto.alerta_clorinator'),
            sw('sparkle', 'Clear clorinator', 'auto.clear_clorinator'),
            sw('sparkle', 'Alertă pompă căldură', 'auto.alerta_pompa_caldura')
          ])
        ]
      },
      {
        title: 'Actualizări sistem',
        blocks: [
          monitor('Home Assistant', [
            r('HA Core', 'upd.ha_core', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } }),
            r('HA OS', 'upd.ha_os', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } }),
            r('Supervisor', 'upd.supervisor', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } }),
            r('Matter Server', 'upd.matter', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } }),
            r('HACS', 'upd.hacs', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } })
          ])
        ]
      },
      {
        title: 'Actualizări reţea',
        blocks: [
          monitor('TP-Link Omada', [
            r('Gateway', 'upd.net_gw', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } }),
            r('Switch', 'upd.net_sw', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } }),
            r('EAP Parter', 'upd.eap_parter', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } }),
            r('EAP Etaj', 'upd.eap_etaj', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } }),
            r('EAP Mansardă', 'upd.eap_mansarda', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } }),
            r('EAP Foişor', 'upd.eap_foisor', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } }),
            r('EAP Casa Faţă', 'upd.eap_casa_fata', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } }),
            r('Switch Foişor', 'upd.net_swf', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } }),
            r('Switch Etaj', 'upd.net_swe', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } })
          ])
        ]
      },
      {
        title: 'Copii de siguranţă',
        blocks: [
          monitor('Backup', [
            r('Stare backup', 'backup.state'),
            r('Ultimul reuşit', 'backup.last'),
            r('Următorul programat', 'backup.next')
          ])
        ]
      },
      {
        title: 'Diagnostic dispozitive',
        blocks: [
          monitor('Coduri', [
            r('Cod eroare clorinator', 'sensor.clor_cod_eroare'),
            r('Stare eroare clorinator', 'sensor.clor_stare_eroare'),
            r('Eroare Vortex', 'diag.vortex_eroare'),
            r('Baterie telefon', 'sensor.baterie_telefon', { unit: PCT, decimals: 0 })
          ])
        ]
      },
      {
        title: 'Comenzi neexpuse',
        wide: true,
        blocks: [
          note(
            'Comutarea PoE, repornirea Home Assistant şi ieşirile Aux1 / Aux2 ale clorinatorului nu sunt disponibile din această aplicaţie. Sunt operaţii care întrerup servicii sau au efect necunoscut — le execuţi din interfaţa Home Assistant, unde vezi contextul complet.'
          )
        ]
      }
    ]
  }
};

export const PAGE_HERO = {
  acasa: ['Casa', 'Centrul de operaţiuni'],
  climat: ['Climat', 'Confort termic pe trei niveluri'],
  piscina: ['Piscina', 'Apă, chimie şi filtrare'],
  media: ['Media', 'Opt televizoare, patru zone'],
  retea: ['Reţea', 'Infrastructură şi conectivitate'],
  energie: ['Energie', 'Producţie, stocare şi consum'],
  mentenanta: ['Mentenanţă', 'Starea sistemului sub control'],
  // (v1.5.0) Subtitlul spune explicit că infrastructura lipseşte din pagină.
  // Fără propoziţia asta, absenţa gateway-ului şi a switch-urilor arată ca o
  // scăpare; cu ea, e o decizie vizibilă în interfaţă.
  zone: ['Zone', 'Pe încăperi — infrastructura rămâne pe Reţea şi Mentenanţă'],
  dispozitive: ['Dispozitive', 'Stare şi comunicare — doar diagnostic, fără comenzi']
};
