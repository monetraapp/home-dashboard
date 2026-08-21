// Rândurile de acordeon „setări complete" — structura din designul original
// (rând complet + buton „Setări" care deschide panoul), legată la entităţi reale.
//
// Fiecare `act(...)` se activează doar dacă valoarea există chiar în atributele
// entităţii (hvac_modes / fan_modes / swing_modes / preset_modes). Altfel rămâne
// dezactivat şi marcat VERIFY, cu motivul în tooltip.
import { A } from './devices.js';
import { ro, sec, act, spClimate, spNumber } from './blocks.js';

const C = '°C';
const PCT = '%';

const NO_TIMER = 'Home Assistant nu expune temporizatoarele interne ale unităţii ca entitate.';

// ---------------------------------------------------------------- vocabular
// Liste de cuvinte-cheie pentru potrivirea treptelor de ventilator / baleiaj /
// presetări. Potrivirea e mai întâi exactă, apoi parţială (vezi matchOption).
const FAN = {
  auto: ['auto'],
  silent: ['silent', 'quiet', 'silentios', 'mute'],
  low: ['low', 'scazut', 'scăzut', '1', 'min'],
  mid: ['medium', 'mid', 'mediu', '2'],
  high: ['high', 'ridicat', '3'],
  turbo: ['turbo', 'strong', 'highest', 'max', 'maxim', 'powerful']
};
const SWING = {
  off: ['off', 'oprit', 'stop', 'fixed'],
  on: ['on', 'pornit', 'both', 'vertical'],
  vertical: ['vertical', 'up_down', 'updown', 'sus'],
  horizontal: ['horizontal', 'left_right', 'leftright'],
  both: ['both', 'all', 'ambele', '3d']
};

const MODE_SECTION = sec('Mod', 5, [
  act('snow', 'Răcire', A.hvac('cool')),
  act('sun', 'Încălzire', A.hvac('heat')),
  act('alertTri', 'Auto', A.hvac('auto')),
  act('droplet', 'Dezumidificare', A.hvac('dry')),
  act('wind', 'Ventilare', A.hvac('fan_only'))
]);

export const CLIMAT_ACCORDION = [
  {
    card: 'ac-vortex',
    setpoints: [spClimate('Temperatură ţintă')],
    sections: [
      MODE_SECTION,
      sec('Ventilator', 6, [
        act('bars1', 'Silenţios', A.fan(...FAN.silent)),
        act('bars2', 'Scăzut', A.fan(...FAN.low)),
        act('bars3', 'Mediu', A.fan(...FAN.mid)),
        act('fan2', 'Ridicat', A.fan(...FAN.high)),
        act('fan', 'Turbo', A.fan(...FAN.turbo)),
        act('alertTri', 'Auto', A.fan(...FAN.auto))
      ]),
      sec('Baleiaj', 4, [
        act('ban', 'Oprit', A.swing(...SWING.off)),
        act('updown', 'Vertical', A.swing(...SWING.vertical)),
        act('leftright', 'Orizontal', A.swing(...SWING.horizontal)),
        act('move', 'Ambele', A.swing(...SWING.both))
      ]),
      sec('Funcţii', 4, [
        act('leaf', 'Eco', A.preset('eco', 'economy')),
        act('moon', 'Noapte', A.preset('sleep', 'night', 'somn', 'noapte')),
        act('shield', 'Health', A.preset('health', 'ionizer')),
        act('wind', 'Comfort Wind', A.preset('comfort', 'wind')),
        act('ban', 'Anti-mucegai', A.preset('mold', 'mildew')),
        act('lock', 'Blocare copii', A.preset('lock', 'child')),
        act('sparkle', 'Afişaj', A.preset('display', 'led', 'light')),
        act('refresh', 'Auto-curăţare', A.preset('clean', 'self'))
      ]),
      sec('Diagnostic', 3, [
        ro('gauge', 'Limită putere', 'diag.vortex_limita_putere', { unit: PCT, decimals: 0 }),
        ro('alertCircle', 'Stare erori', 'diag.vortex_eroare'),
        ro('radiator', 'Ambient', 'climate.vortex', { attr: 'current_temperature', unit: C })
      ])
    ]
  },
  {
    card: 'ac-etaj',
    setpoints: [spClimate('Temperatură ţintă')],
    sections: [
      MODE_SECTION,
      sec('Ventilator', 4, [
        act('alertTri', 'Auto', A.fan(...FAN.auto)),
        act('bars1', 'Scăzut', A.fan(...FAN.low)),
        act('bars2', 'Mediu', A.fan(...FAN.mid)),
        act('bars3', 'Ridicat', A.fan(...FAN.high))
      ]),
      sec('Baleiaj', 2, [
        act('ban', 'Oprit', A.swing(...SWING.off)),
        act('updown', 'Pornit', A.swing(...SWING.on))
      ]),
      sec('Funcţii', 4, [
        act('leaf', 'Economie', A.preset('eco', 'energy', 'economy')),
        act('moon', 'Temporizator somn', A.none(NO_TIMER)),
        act('calDown', 'Programare pornire', A.none(NO_TIMER)),
        act('calUp', 'Programare oprire', A.none(NO_TIMER))
      ]),
      sec('Consum', 4, [
        ro('bolt', 'Azi', 'energy.ac_etaj_azi'),
        ro('bolt', 'Ieri', 'energy.ac_etaj_ieri'),
        ro('bolt', 'Luna curentă', 'energy.ac_etaj_luna'),
        ro('bolt', 'Luna trecută', 'energy.ac_etaj_luna_trecuta')
      ])
    ]
  },
  {
    card: 'ac-vivax',
    setpoints: [spClimate('Temperatură ţintă')],
    sections: [
      MODE_SECTION,
      sec('Ventilator', 6, [
        act('alertTri', 'Auto', A.fan(...FAN.auto)),
        act('bars1', 'Silenţios', A.fan(...FAN.silent)),
        act('bars2', 'Scăzut', A.fan(...FAN.low)),
        act('bars3', 'Mediu', A.fan(...FAN.mid)),
        act('fan2', 'Ridicat', A.fan(...FAN.high)),
        act('fan', 'Maxim', A.fan(...FAN.turbo))
      ]),
      sec('Baleiaj', 4, [
        act('ban', 'Oprit', A.swing(...SWING.off)),
        act('updown', 'Vertical', A.swing(...SWING.vertical)),
        act('leftright', 'Orizontal', A.swing(...SWING.horizontal)),
        act('move', 'Ambele', A.swing(...SWING.both))
      ]),
      sec('Funcţii', 4, [
        act('sofa', 'Comfort', A.preset('comfort')),
        act('leaf', 'Eco', A.preset('eco', 'economy')),
        act('moon', 'Somn', A.preset('sleep', 'somn', 'night')),
        act('boost', 'Boost', A.preset('boost', 'turbo'))
      ])
    ]
  }
];

export const PISCINA_ACCORDION = [
  {
    card: 'pool-pump',
    setpoints: [spNumber('number.pompa_debit', 'Debit pompă', PCT)],
    sections: [
      sec('Viteză', 4, [
        act('bars1', 'Viteză 1', A.numberFrac('number.pompa_debit', 0.33)),
        act('bars2', 'Viteză 2', A.numberFrac('number.pompa_debit', 0.66)),
        act('bars3', 'Viteză 3', A.numberFrac('number.pompa_debit', 1)),
        act('gauge', 'Oprit', A.numberFrac('number.pompa_debit', 0))
      ]),
      sec('Program', 4, [
        act('auto', 'Auto', A.none('Regimul Auto al pompei nu e expus ca entitate în HA.')),
        act('clock', 'Programat', A.none('Programările pompei se editează în Home Assistant.')),
        act('sliders', 'Manual', A.none('Foloseşte valoarea ţintă „Debit pompă" de mai sus.')),
        act('moon', 'Regim noapte', A.none('Nu există o entitate pentru regimul de noapte.'))
      ]),
      sec('Diagnostic', 4, [
        ro('bolt', 'Consum', 'sensor.pompa_consum'),
        ro('waves', 'Debit apă', 'binary_sensor.pc_debit', { map: { on: 'Pornit', off: 'Oprit' } }),
        ro('gauge', 'Temperatură apă', 'sensor.apa_temp', { unit: C }),
        ro('alertCircle', 'Flag problemă', 'binary_sensor.pc_problema', { map: { on: 'Da', off: 'Nu' } })
      ])
    ]
  },
  {
    card: 'heatpump',
    setpoints: [spClimate('Temperatură ţintă apă')],
    sections: [
      sec('Mod', 4, [
        act('flame', 'Încălzire', A.hvac('heat')),
        act('snow', 'Răcire', A.hvac('cool')),
        act('auto', 'Auto', A.hvac('auto')),
        act('fan2', 'Doar ventilator', A.hvac('fan_only'))
      ]),
      sec('Funcţii', 4, [
        act('moon', 'Silenţios', A.preset('silent', 'quiet', 'silentios')),
        act('leaf', 'Eco', A.preset('eco', 'economy', 'smart')),
        act('boost', 'Turbo', A.preset('boost', 'turbo', 'powerful')),
        act('clock', 'Temporizator', A.none(NO_TIMER))
      ]),
      sec('Diagnostic', 4, [
        ro('bolt', 'Consum', 'sensor.pc_consum'),
        ro('waves', 'Debit apă', 'binary_sensor.pc_debit', { map: { on: 'Pornit', off: 'Oprit' } }),
        ro('gauge', 'Temperatură apă', 'sensor.apa_temp', { unit: C }),
        ro('alertCircle', 'Flag problemă', 'binary_sensor.pc_problema', { map: { on: 'Da', off: 'Nu' } })
      ])
    ]
  },
  {
    card: 'clorinator-redus',
    setpoints: [
      spNumber('number.ph_tinta', 'pH ţintă', ''),
      spNumber('number.orp_tinta', 'ORP ţintă', 'mV'),
      spNumber('number.clor_productie', 'Producţie clor', PCT)
    ],
    sections: [
      sec('Regim', 4, [
        act('droplet', 'Redus', A.slot('switch.clorinator_redus')),
        act('waves', 'Normal', A.slot('switch.clorinator')),
        act('boost', 'Boost', A.slot('switch.clorinator_boost')),
        act('ban', 'Oprit', A.none('Opreşte clorinatorul din comutatorul principal de pe rând.'))
      ]),
      sec('Producţie clor', 4, [
        act('gauge', '25 %', A.numberFrac('number.clor_productie', 0.25)),
        act('gauge', '50 %', A.numberFrac('number.clor_productie', 0.5)),
        act('gauge', '75 %', A.numberFrac('number.clor_productie', 0.75)),
        act('gauge', '100 %', A.numberFrac('number.clor_productie', 1))
      ]),
      sec('Chimie · măsurat', 4, [
        ro('beaker', 'pH curent', 'sensor.ph', { unit: '' }),
        ro('gauge', 'ORP curent', 'sensor.orp', { unit: 'mV' }),
        ro('waves', 'Temperatură apă', 'sensor.apa_temp', { unit: C }),
        ro('bolt', 'Producţie curentă', 'number.clor_productie', { unit: PCT, decimals: 0 })
      ]),
      sec('Diagnostic', 4, [
        ro('alertCircle', 'Cod eroare', 'sensor.clor_cod_eroare'),
        ro('alertCircle', 'Stare eroare', 'sensor.clor_stare_eroare'),
        ro('bolt', 'Amperaj celulă', 'sensor.clor_amperaj'),
        ro('shield', 'Stare EXO', 'sensor.clor_stare_exo')
      ])
    ]
  },
  {
    card: 'clorinator-main',
    setpoints: [spNumber('number.clor_productie', 'Producţie clor', PCT)],
    sections: [
      sec('Regim', 4, [
        act('droplet', 'Redus', A.slot('switch.clorinator_redus')),
        act('waves', 'Normal', A.slot('switch.clorinator')),
        act('boost', 'Boost', A.slot('switch.clorinator_boost')),
        act('auto', 'Auto după ORP', A.none('Nu există o entitate pentru regimul automat după ORP.'))
      ]),
      sec('Diagnostic', 4, [
        ro('shield', 'Dual Link', 'sensor.clor_dual_link'),
        ro('alertCircle', 'Cod eroare', 'sensor.clor_cod_eroare'),
        ro('gauge', 'Producţie', 'number.clor_productie', { unit: PCT, decimals: 0 }),
        ro('alertTri', 'Aux1 / Aux2', 'sensor.clor_stare_exo')
      ])
    ]
  }
];
