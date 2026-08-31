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

// ---------------------------------------------------------------- vocabular
// Liste de cuvinte-cheie pentru potrivirea treptelor de ventilator / baleiaj /
// presetări. Potrivirea e mai întâi exactă, apoi parţială (vezi matchOption).
const FAN = {
  auto: ['auto'],
  silent: ['silent', 'quiet', 'silentios', 'mute'],
  low: ['low', 'scazut', 'scăzut', '1', 'min'],
  mid: ['medium', 'mid', 'mediu', '2'],
  high: ['high', 'ridicat', '3'],
  turbo: ['turbo', 'strong', 'highest', 'max', 'maxim', 'powerful'],
  // set dedicat pentru treapta 100% (Midea 'full') — NU e adaugat in `turbo`,
  // ca sa nu schimbe potrivirea pe alte unitati; pe Vivax, Turbo-ul fizic e
  // preset_mode 'boost', iar 'full' e pur si simplu ventilatorul la maxim.
  full: ['full', 'maxim', '100']
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
      // Funcţiile Vortex sunt switch-uri AUX Cloud dedicate; entitatea climate
      // NU are preset_modes, deci potrivirea pe preset nu putea funcţiona.
      sec('Funcţii', 4, [
        act('leaf', 'Eco', A.slot('switch.vx_eco')),
        act('moon', 'Noapte', A.slot('switch.vx_noapte')),
        act('heartPulse', 'Health', A.slot('switch.vx_health')),
        act('wind', 'Comfort Wind', A.slot('switch.vx_comfwind')),
        act('dropletOff', 'Anti-mucegai', A.slot('switch.vx_antimucegai')),
        act('lock', 'Blocare copii', A.slot('switch.vx_blocare')),
        act('monitor', 'Afişaj', A.slot('switch.vx_afisaj')),
        act('refresh', 'Auto-curăţare', A.slot('switch.vx_autocuratare')),
        // (v1.2.8) Fără acest comutator, limita procentuală setată de number-ul
        // pwrlimit (rândul „Limită putere" din Diagnostic) nu se aplică.
        act('gauge', 'Limitare putere', A.slot('switch.vx_limita'))
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
    // (v1.7.0) Singurul acordeon cu sectiunea „Programare" (ora exacta, prin
    // helpere + automatizari HA). Separata deliberat de „Cronometre", care
    // raman relative si trec prin cloud-ul LG. Nu se amesteca.
    schedule: true,
    setpoints: [
      spClimate('Temperatură ţintă'),
      // Cronometrele LG sunt WRITE-ONLY prin bridge-ul lg_thinq_timers
      // (v1.5.4): schedule în minute cu pas 15 (conversie internă h+m),
      // sleep în ore întregi (LG respinge minutele cu 2201). Receipt-ul
      // local arată „Trimis", nu stare confirmată.
      spNumber('sensor.lg_somn_min', 'Somn peste', 'h'),
      spNumber('sensor.lg_pornire_min', 'Pornire peste', 'min'),
      spNumber('sensor.lg_oprire_min', 'Oprire peste', 'min')
    ],
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
      sec('Funcţii', 1, [
        // Economie e un switch LG ThinQ separat, nu un preset al climate-ului.
        act('leaf', 'Economie', A.slot('switch.lg_economie'))
      ]),
      sec('Cronometre', 3, [
        // Diagnostic read-only: numărul trimis ultima dată prin bridge.
        // Readback-ul LG nu există (write-only), deci „Nesetat" = fără
        // comandă locală recentă, nu neapărat fără timer în cloud.
        ro('moon', 'Somn trimis (h)', 'sensor.lg_somn_min', { unit: 'h', decimals: 0 }),
        ro('calDown', 'Pornire trimisă (min)', 'sensor.lg_pornire_min', { unit: 'min', decimals: 0 }),
        ro('calUp', 'Oprire trimisă (min)', 'sensor.lg_oprire_min', { unit: 'min', decimals: 0 })
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
        // Confirmat prin investigatia din 2026-08-22: Turbo-ul fizic de pe
        // telecomanda = preset 'boost' (chip-ul "Turbo" din Functii), iar
        // 'full' = treapta de ventilator 100% (Midea: silent20/low40/medium60/
        // high80/full100) — deci "Maxim" se mapeaza pe fan_mode 'full'.
        act('fan', 'Maxim', A.fan(...FAN.full))
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
        // Eticheta "Turbo" = numele butonului fizic de pe telecomanda Vivax;
        // maparea ramane preset_mode 'boost' (neschimbata).
        act('boost', 'Turbo', A.preset('boost', 'turbo'))
      ])
    ]
  },
  {
    // (v2.3.0) AC Casa Tata — comanda prin infrarosu, fara niciun readback.
    // Sectiune de mod DEDICATA, nu MODE_SECTION: aparatul expune `heat_cool`,
    // nu `auto`, iar MODE_SECTION ar fi adus un chip „Auto" permanent inert.
    // Nu are „Functii" (nu expune preset_modes) si nu are „Diagnostic": nu
    // exista nimic de citit de la el — nici ambient, nici erori, nici consum.
    card: 'ac-casa-tata',
    setpoints: [spClimate('Temperatură ţintă')],
    sections: [
      sec('Mod', 5, [
        act('snow', 'Răcire', A.hvac('cool')),
        act('sun', 'Încălzire', A.hvac('heat')),
        act('auto', 'Auto', A.hvac('heat_cool')),
        act('droplet', 'Dezumidificare', A.hvac('dry')),
        act('wind', 'Ventilare', A.hvac('fan_only'))
      ]),
      sec('Ventilator', 4, [
        act('alertTri', 'Auto', A.fan(...FAN.auto)),
        act('bars1', 'Scăzut', A.fan(...FAN.low)),
        act('bars2', 'Mediu', A.fan(...FAN.mid)),
        act('bars3', 'Ridicat', A.fan(...FAN.high))
      ]),
      sec('Baleiaj', 4, [
        act('ban', 'Oprit', A.swing(...SWING.off)),
        act('updown', 'Vertical', A.swing(...SWING.vertical)),
        act('leftright', 'Orizontal', A.swing(...SWING.horizontal)),
        act('move', 'Ambele', A.swing(...SWING.both))
      ])
    ]
  },
  {
    // (v2.4.0) AC Magazie. Aceleasi sectiuni ca la Casa Tata fiindca entitatea
    // raporteaza EXACT aceleasi capabilitati: hvac_modes, fan_modes, swing_modes
    // si 16-32 cu pas 1 sunt identice, verificate live. Daca ar fi diferit macar
    // una, ar fi avut sectiuni proprii - vezi AC Foisor, care chiar difera
    // (baleiaj doar off/vertical, 16-31 cu pas 0.5) si de aceea nu e aici.
    card: 'ac-magazie',
    setpoints: [spClimate('Temperatură ţintă')],
    sections: [
      sec('Mod', 5, [
        act('snow', 'Răcire', A.hvac('cool')),
        act('sun', 'Încălzire', A.hvac('heat')),
        act('auto', 'Auto', A.hvac('heat_cool')),
        act('droplet', 'Dezumidificare', A.hvac('dry')),
        act('wind', 'Ventilare', A.hvac('fan_only'))
      ]),
      sec('Ventilator', 4, [
        act('alertTri', 'Auto', A.fan(...FAN.auto)),
        act('bars1', 'Scăzut', A.fan(...FAN.low)),
        act('bars2', 'Mediu', A.fan(...FAN.mid)),
        act('bars3', 'Ridicat', A.fan(...FAN.high))
      ]),
      sec('Baleiaj', 4, [
        act('ban', 'Oprit', A.swing(...SWING.off)),
        act('updown', 'Vertical', A.swing(...SWING.vertical)),
        act('leftright', 'Orizontal', A.swing(...SWING.horizontal)),
        act('move', 'Ambele', A.swing(...SWING.both))
      ])
    ]
  }
];

export const PISCINA_ACCORDION = [
  {
    card: 'pool-pump',
    // Pompa de filtrare e strict pornit/oprit (switch.filter_pump). Secţiunile
    // "Viteză" şi "Program" din mockup, setpoint-ul "Debit pompă" şi rândul
    // "Consum" au fost ELIMINATE (2026-08-22): nu există nicio entitate de
    // viteză/debit/program/consum pentru această pompă — erau butoane care nu
    // puteau face nimic, marcate permanent VERIFY.
    setpoints: [],
    sections: [
      sec('Diagnostic', 3, [
        ro('waves', 'Problemă debit apă', 'binary_sensor.pc_debit', { map: { on: 'Da', off: 'Nu' } }),
        ro('gauge', 'Temperatură apă', 'sensor.apa_temp', { unit: C }),
        ro('alertCircle', 'Flag problemă', 'binary_sensor.pc_problema', { map: { on: 'Da', off: 'Nu' } })
      ])
    ]
  },
  {
    card: 'heatpump',
    setpoints: [spClimate('Temperatură ţintă apă')],
    sections: [
      // "Doar ventilator" ELIMINAT (2026-08-22): hvac_modes real al pompei e
      // [off, auto, cool, heat] — fan_only nu există pe această entitate.
      sec('Mod', 3, [
        act('flame', 'Încălzire', A.hvac('heat')),
        act('snow', 'Răcire', A.hvac('cool')),
        act('auto', 'Auto', A.hvac('auto'))
      ]),
      // Cele 3 presetModes reale ale pompei (quiet/smart/quick) confirmate manual
      // în appul Tuya nativ: Silenţios / Smart / Turbo, exact în această ordine.
      // "Temporizator" ELIMINAT: nu există entitate, butonul nu făcea nimic.
      sec('Funcţii', 3, [
        act('moon', 'Silenţios', A.preset('silent', 'quiet', 'silentios')),
        act('sparkle', 'Smart', A.preset('smart')),
        act('boost', 'Turbo', A.preset('boost', 'turbo', 'powerful', 'quick'))
      ]),
      sec('Diagnostic', 4, [
        ro('bolt', 'Consum', 'sensor.pc_consum'),
        ro('waves', 'Problemă debit apă', 'binary_sensor.pc_debit', { map: { on: 'Da', off: 'Nu' } }),
        ro('gauge', 'Temperatură apă', 'sensor.apa_temp', { unit: C }),
        ro('alertCircle', 'Flag problemă', 'binary_sensor.pc_problema', { map: { on: 'Da', off: 'Nu' } })
      ])
    ]
  },
  {
    card: 'clorinator-redus',
    // Ţintele pH/ORP sunt senzori read-only (setarea se face doar din appul
    // iAqualink) — limitele nu vin din entitate, deci folosim domeniile utile
    // pentru piscine: pH 6.8–8.0 pas 0.1, ORP 600–850 mV pas 10 (v1.1.1;
    // vechiul default generic 0–100 pas 1 era absurd: ORP real 730 ieşea din
    // interval). Setpoint-ul "Producţie clor" a fost scos: valoarea (50%) e
    // deja în centrul cadranului cardului, iar entitatea e doar senzor.
    setpoints: [
      spNumber('number.ph_tinta', 'pH ţintă', '', { min: 6.8, max: 8, step: 0.1 }),
      spNumber('number.orp_tinta', 'ORP ţintă', 'mV', { min: 600, max: 850, step: 10 })
    ],
    sections: [
      // "Oprit" ELIMINAT (2026-08-22): era un buton inert cu tooltip; oprirea
      // se face din comutatorul principal al rândului, care există deja.
      sec('Regim', 3, [
        act('droplet', 'Redus', A.slot('switch.clorinator_redus')),
        act('waves', 'Normal', A.slot('switch.clorinator')),
        act('boost', 'Boost', A.slot('switch.clorinator_boost'))
      ]),
      // Secţiunea "Producţie clor" (25/50/75/100%) ELIMINATĂ (v1.1.1):
      // iAqualink nu expune NICIO entitate reglabilă de producţie (doar
      // switch-urile production/low/boost + senzorii swc/swc_low) — toate
      // cele 4 butoane erau permanent VERIFY. Treptele se schimbă efectiv
      // prin regimurile Redus/Normal/Boost, care există deja pe card.
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
    // setpoint "Producţie clor" scos (v1.1.1) — vezi nota de la clorinator-redus
    setpoints: [],
    sections: [
      // "Auto după ORP" ELIMINAT (2026-08-22): nu există entitate, buton inert.
      sec('Regim', 3, [
        act('droplet', 'Redus', A.slot('switch.clorinator_redus')),
        act('waves', 'Normal', A.slot('switch.clorinator')),
        act('boost', 'Boost', A.slot('switch.clorinator_boost'))
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
