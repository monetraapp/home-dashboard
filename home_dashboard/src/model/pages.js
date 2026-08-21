// Definiţia paginilor — aceleaşi carduri şi blocuri ca în design, dar cu
// referinţe la sloturi HA în locul valorilor mock.
//
// Faţă de mockup a fost scos intenţionat doar blocul „Controale cu risc"
// (PoE on/off, repornire cameră, restart HA, Aux1/Aux2 clorinator) —
// înlocuit cu o notă informativă.


import {
  ro, txt, sw, grid, monitor, note, slots, nowPlaying, cameraGrid, chart, timeline,
  accordion, sec, act, spClimate, spNumber
} from './blocks.js';
import { CLIMAT_ACCORDION, PISCINA_ACCORDION } from './accordions.js';

export {
  ro, txt, sw, grid, monitor, note, slots, nowPlaying, cameraGrid, chart, timeline,
  accordion, sec, act, spClimate, spNumber
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

  camere: {
    eyebrow: '5 camere Dahua · ONVIF',
    title: 'Camere',
    chips: [
      { icon: 'camera', text: '5 camere' },
      { icon: 'sun', text: 'IR manual' }
    ],
    cards: [
      {
        title: 'Supraveghere',
        wide: true,
        blocks: [
          cameraGrid([
            { slot: 'camera.poarta', ir: 'light.ir_poarta', label: 'Poartă Faţă' },
            { slot: 'camera.curte_fata', ir: 'light.ir_curte_fata', label: 'Curte Faţă' },
            { slot: 'camera.curte_piscina', ir: 'light.ir_curte_piscina', label: 'Curte Piscină' },
            { slot: 'camera.curte_spate', ir: 'light.ir_curte_spate', label: 'Curte Spate' },
            { slot: 'camera.speed_dome', ir: 'light.ir_speed_dome', wiper: 'switch.stergator_speed_dome', label: 'Speed Dome' }
          ]),
          note('Butoanele de pe fiecare cadru: iluminare IR şi, la Speed Dome, ştergător. Repornirea camerelor şi comutarea PoE nu sunt expuse.')
        ]
      },
      {
        title: 'Stare feed-uri',
        blocks: [
          monitor('ONVIF', [
            r('Poartă Faţă', 'camera.poarta'),
            r('Curte Faţă', 'camera.curte_fata'),
            r('Curte Piscină', 'camera.curte_piscina'),
            r('Curte Spate', 'camera.curte_spate'),
            r('Speed Dome', 'camera.speed_dome')
          ])
        ]
      },
      {
        title: 'Iluminare IR',
        blocks: [
          grid(2, [
            sw('sun', 'IR Poartă', 'light.ir_poarta'),
            sw('sun', 'IR Curte Faţă', 'light.ir_curte_fata'),
            sw('sun', 'IR Piscină', 'light.ir_curte_piscina'),
            sw('sun', 'IR Curte Spate', 'light.ir_curte_spate'),
            sw('sun', 'IR Speed Dome', 'light.ir_speed_dome'),
            sw('refresh', 'Ştergător Speed Dome', 'switch.stergator_speed_dome')
          ]),
          note('Dacă integrarea nu raportează starea IR, comanda pleacă dar valoarea rămâne „—".')
        ]
      },
      {
        title: 'Istoric sistem video',
        wide: true,
        order: 8,
        blocks: [
          timeline('Disponibilitate camere', 'ultimele 7 zile', [
            { label: 'Poartă Faţă', slot: 'camera.poarta' },
            { label: 'Curte Faţă', slot: 'camera.curte_fata' },
            { label: 'Curte Piscină', slot: 'camera.curte_piscina' },
            { label: 'Curte Spate', slot: 'camera.curte_spate' },
            { label: 'Speed Dome', slot: 'camera.speed_dome' }
          ], [['off', 'Inactiv'], ['on', 'Activ'], ['unavail', 'Indisponibil']])
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
          // Switch-urile Easy Managed nu au entitate de firmware în HA —
          // rândurile lor se opresc la Stare/CPU/Memorie.
          monitor('Switch Foişor', [
            r('Stare', 'net.swf_state'),
            r('CPU', 'net.swf_cpu', { unit: PCT, decimals: 0 }),
            r('Memorie', 'net.swf_mem', { unit: PCT, decimals: 0 })
          ]),
          monitor('Switch Etaj', [
            r('Stare', 'net.swe_state'),
            r('CPU', 'net.swe_cpu', { unit: PCT, decimals: 0 }),
            r('Memorie', 'net.swe_mem', { unit: PCT, decimals: 0 })
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
          note('Comutarea PoE nu e expusă în această aplicaţie — ar opri camere şi puncte de acces.')
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

  energie: {
    eyebrow: 'Consum şi producţie',
    title: 'Energie',
    chips: [
      { icon: 'bolt', slot: 'energy.ac_etaj_luna', prefix: 'Luna curentă ' },
      { icon: 'barChart', slot: 'energy.ac_etaj_ieri', prefix: 'Ieri ' }
    ],
    cards: [
      {
        title: 'Evoluţie consum',
        wide: true,
        order: 8,
        blocks: [
          chart('AC Etaj LG · consum zilnic', 'ultimele 7 zile', [
            { name: 'Consum', color: ORANGE_SERIES, slot: 'energy.ac_etaj_azi', agg: 'last' }
          ], 'Wh', 'bars'),
          note('Graficul se completează automat pe măsură ce mapezi contorul general, PV, bateria sau priza EV.')
        ]
      },
      {
        title: 'Consum măsurat',
        blocks: [
          monitor('AC Etaj LG', [
            r('Azi', 'energy.ac_etaj_azi'),
            r('Ieri', 'energy.ac_etaj_ieri'),
            r('Luna curentă', 'energy.ac_etaj_luna'),
            r('Luna trecută', 'energy.ac_etaj_luna_trecuta')
          ]),
          // Nu există contor general al casei — singura energie măsurată e AC
          // Etaj LG, iar eticheta o spune explicit ca să nu mintă.
          monitor('Total măsurat', [r('Doar AC Etaj · luna curentă', 'energy.total_luna')])
        ]
      },
      {
        title: 'Rezervat pentru extindere',
        wide: true,
        blocks: [
          slots([
            { icon: 'barChart', name: 'Grid', hint: 'Import / export reţea' },
            { icon: 'sun', name: 'PV Growatt', hint: 'Producţie fotovoltaică' },
            { icon: 'phoneBattery', name: 'Baterie APX', hint: 'Stocare · SoC' },
            { icon: 'plug', name: 'EV THOR', hint: 'Priză încărcare maşină' }
          ]),
          note('Sloturile se populează când adaugi dispozitivele în HA şi le mapezi din ecranul „Mapare entităţi".')
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
            r('Fairland · Tuya Local', 'diag.integrare_fairland'),
            r('Cameră Speed Dome', 'camera.speed_dome')
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
            r('Fusion', 'addon.fusion', { map: { on: 'Rulează', off: 'Oprit' } }),
            r('Home Dashboard', 'addon.home_dashboard', { map: { on: 'Rulează', off: 'Oprit' } }),
            r('Matter Server', 'addon.matter_server', { map: { on: 'Rulează', off: 'Oprit' } }),
            r('Get HACS', 'addon.get_hacs', { map: { on: 'Rulează', off: 'Oprit' } })
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
            r('EAP Casa Faţă', 'upd.eap_casa_fata', { map: { on: 'Actualizare disponibilă', off: 'Up-to-date' } })
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
            'Comutarea PoE, repornirea camerelor, repornirea Home Assistant şi ieşirile Aux1 / Aux2 ale clorinatorului nu sunt disponibile din această aplicaţie. Sunt operaţii care întrerup servicii sau au efect necunoscut — le execuţi din interfaţa Home Assistant, unde vezi contextul complet.'
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
  camere: ['Supraveghere', 'Cinci camere, perimetru complet'],
  retea: ['Reţea', 'Infrastructură şi conectivitate'],
  energie: ['Energie', 'Consum măsurat şi capacitate viitoare'],
  mentenanta: ['Mentenanţă', 'Starea sistemului sub control']
};
