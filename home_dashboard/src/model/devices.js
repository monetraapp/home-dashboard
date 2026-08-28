// Definiţiile cardurilor de dispozitiv, aşa cum apar în design, dar legate de
// sloturi HA în loc de valori mock.
//
// Fiecare control are un "descriptor de acţiune". Dacă acţiunea nu poate fi
// rezolvată la o comandă reală (entitate nemapată sau modul nu există pe
// entitate), controlul rămâne vizibil dar dezactivat şi marcat VERIFY —
// nu trimitem niciodată o comandă ghicită.

export const A = {
  hvac: (v) => ({ k: 'hvac', v }),
  fan: (...kw) => ({ k: 'fan', kw }),
  swing: (...kw) => ({ k: 'swing', kw }),
  swingToggle: () => ({ k: 'swingToggle' }),
  preset: (...kw) => ({ k: 'preset', kw }),
  slot: (slot) => ({ k: 'slot', slot }),
  source: (...kw) => ({ k: 'source', kw }),
  mute: () => ({ k: 'mute' }),
  numberFrac: (slot, frac) => ({ k: 'numberFrac', slot, frac }),
  none: (why) => ({ k: 'none', why: why || 'Nu ai mapat încă o entitate pentru acest control.' })
};

// dial: cum se calculează valoarea centrală a cardului
// { kind:'climate' }                  -> temperatura ţintă a entităţii climate
// { kind:'number', slot, unit, ... }  -> valoarea unei entităţi number/input_number
// { kind:'volume' }                   -> volumul unui media_player

export const DEVICE_CARDS = [
  {
    id: 'ac-vortex',
    slot: 'climate.vortex',
    icon: 'snow',
    label: 'AC Mansardă',
    model: 'Vortex inverter',
    group: 'Climat',
    kind: 'climate',
    ambient: { kind: 'climateCurrent', prefix: 'Ambient ' },
    dial: { kind: 'climate', unit: '°' },
    minis: [
      { id: 'vx-swing', icon: 'wind', label: 'Baleiaj', action: A.swingToggle() },
      { id: 'vx-auto', icon: 'alertTri', label: 'Auto', action: A.hvac('auto') }
    ],
    circles: [
      { id: 'vx-c-cool', icon: 'snow', label: 'Răcire', action: A.hvac('cool') },
      { id: 'vx-c-heat', icon: 'sun', label: 'Încălzire', action: A.hvac('heat') },
      { id: 'vx-c-dry', icon: 'wind', label: 'Dezumidificare', action: A.hvac('dry') },
      { id: 'vx-c-mid', icon: 'fan2', label: 'Ventilator mediu', action: A.fan('medium', 'mid', 'mediu', '3') },
      { id: 'vx-c-turbo', icon: 'fan', label: 'Turbo', action: A.fan('turbo', 'strong', 'highest', 'high', 'ridicat') }
    ]
  },
  {
    id: 'heatpump',
    slot: 'climate.pompa_caldura',
    icon: 'flame',
    label: 'Pompă căldură',
    model: 'Fairland IPHC',
    group: 'Piscină',
    kind: 'climate',
    ambient: { kind: 'slotOrCurrent', slot: 'sensor.apa_temp', prefix: 'Apă ', unit: '°C' },
    dial: { kind: 'climate', unit: '°' },
    minis: [
      { id: 'hp-silent', icon: 'moon', label: 'Silenţios', action: A.preset('silent', 'quiet', 'silentios') },
      { id: 'hp-smart', icon: 'sparkle', label: 'Smart', action: A.preset('smart') }
    ],
    // "Doar ventilator" ELIMINAT (2026-08-22): fan_only nu există în
    // hvac_modes al pompei ([off, auto, cool, heat]) — chip permanent VERIFY.
    circles: [
      { id: 'hp-c-heat', icon: 'flame', label: 'Încălzire apă', action: A.hvac('heat') },
      { id: 'hp-c-cool', icon: 'snow', label: 'Răcire apă', action: A.hvac('cool') },
      { id: 'hp-c-auto', icon: 'alertTri', label: 'Mod automat', action: A.hvac('auto') }
    ]
  },
  {
    id: 'clorinator-redus',
    slot: 'switch.clorinator_redus',
    icon: 'droplet',
    label: 'Clorinator',
    model: 'Zodiac EXO iQ',
    group: 'Piscină',
    kind: 'switch',
    ambient: { kind: 'compose', parts: [['sensor.orp', 'ORP ', ' mV'], ['sensor.ph', ' · pH ', '']] },
    dial: { kind: 'number', slot: 'number.clor_productie', unit: '%', min: 0, max: 100, step: 5 },
    minis: [
      { id: 'cl-low', icon: 'droplet', label: 'Regim redus', action: A.slot('switch.clorinator_redus') },
      { id: 'cl-boost', icon: 'rocket', label: 'Boost', action: A.slot('switch.clorinator_boost') }
    ],
    circles: [
      // Cercurile "Producţie 50/100%" ELIMINATE (v1.1.1): producţia nu e
      // reglabilă din HA (entitatea e doar senzor) — erau permanent VERIFY.
      { id: 'cl-c-low', icon: 'droplet', label: 'Regim redus', action: A.slot('switch.clorinator_redus') },
      { id: 'cl-c-boost', icon: 'boost', label: 'Boost 100%', action: A.slot('switch.clorinator_boost') }
    ]
  },
  {
    id: 'pool-pump',
    slot: 'switch.pompa_filtrare',
    icon: 'waves',
    label: 'Pompă filtrare',
    model: 'Piscină',
    group: 'Piscină',
    kind: 'switch',
    // Pompa e strict on/off. Ambient arată temperatura apei (reală), nu
    // "Consum VERIFY" — nu există senzor de consum pentru pompa de filtrare.
    // Minis şi circles din mockup (Auto/Programat/Viteze/Manual) ELIMINATE
    // 2026-08-22: nu există entităţi de viteză/program, erau butoane inerte.
    // Dial-ul a fost ELIMINAT în v1.0.6 (decizia utilizatorului): pompa nu are
    // nicio entitate numerică, deci cadranul era permanent inert. Cardul
    // afişează în loc un bloc de stare Pornită/Oprită (vezi hasDial în build).
    ambient: { kind: 'compose', parts: [['sensor.apa_temp', 'Apă ', ' °C']] },
    dial: null,
    stateLabels: ['Pornită', 'Oprită'],
    minis: [],
    circles: []
  },
  {
    id: 'media-mansarda',
    slot: 'media.mansarda',
    icon: 'tv',
    label: 'TV Mansardă',
    model: 'LG webOS',
    group: 'Media',
    kind: 'media',
    zone: 'Mansardă şi Foişor',
    ambient: { kind: 'mediaState' },
    dial: { kind: 'volume', unit: '%', min: 0, max: 100, step: 1 },
    // "Redare" (buton inert) ELIMINAT şi "Plex" înlocuit cu "TV" (2026-08-22):
    // Plex nu apare în source_list-ul niciunui televizor din casă.
    // Mute a fost mutat (v1.1.2) din randul de toggle-uri in randul de butoane
    // rotunde, ca al cincilea buton — cardul nu mai are zona goala stanga.
    minis: [],
    circles: [
      { id: 'tv-c-h1', icon: 'cable', label: 'HDMI 1', action: A.source('hdmi 1', 'hdmi1', 'hdmi') },
      { id: 'tv-c-tv', icon: 'tv', label: 'TV', action: A.source('live tv', 'tv') },
      { id: 'tv-c-yt', icon: 'playCircle', label: 'YouTube', action: A.source('youtube') },
      { id: 'tv-c-nf', icon: 'clapperboard', label: 'Netflix', action: A.source('netflix') },
      { id: 'tv-c-mute', icon: 'volumeX', label: 'Mute', action: A.mute() }
    ]
  },
  {
    id: 'ac-etaj',
    slot: 'climate.etaj',
    icon: 'snow',
    label: 'AC Etaj LG',
    model: 'Etaj · inverter',
    group: 'Climat',
    kind: 'climate',
    ambient: { kind: 'climateCurrent', prefix: 'Ambient ' },
    dial: { kind: 'climate', unit: '°' },
    minis: [
      { id: 'lg-swing', icon: 'wind', label: 'Baleiaj', action: A.swingToggle() },
      { id: 'lg-eco', icon: 'leaf', label: 'Economie', action: A.slot('switch.lg_economie') }
    ],
    circles: [
      { id: 'lg-c-cool', icon: 'snow', label: 'Răcire', action: A.hvac('cool') },
      { id: 'lg-c-heat', icon: 'sun', label: 'Încălzire', action: A.hvac('heat') },
      { id: 'lg-c-dry', icon: 'droplet', label: 'Dezumidificare', action: A.hvac('dry') },
      { id: 'lg-c-vent', icon: 'wind', label: 'Ventilare', action: A.hvac('fan_only') }
    ]
  },
  {
    id: 'ac-vivax',
    slot: 'climate.vivax',
    icon: 'snow',
    label: 'AC Mansardă Vivax',
    model: 'Vivax · Midea',
    group: 'Climat',
    kind: 'climate',
    ambient: { kind: 'climateCurrent', prefix: 'Ambient ' },
    dial: { kind: 'climate', unit: '°' },
    minis: [
      { id: 'vv-comfort', icon: 'sofa', label: 'Comfort', action: A.preset('comfort') },
      { id: 'vv-sleep', icon: 'moon', label: 'Somn', action: A.preset('sleep', 'somn', 'night') }
    ],
    circles: [
      { id: 'vv-c-cool', icon: 'snow', label: 'Răcire', action: A.hvac('cool') },
      { id: 'vv-c-heat', icon: 'sun', label: 'Încălzire', action: A.hvac('heat') },
      { id: 'vv-c-boost', icon: 'boost', label: 'Turbo', action: A.preset('boost', 'turbo') },
      { id: 'vv-c-eco', icon: 'leaf', label: 'Eco', action: A.preset('eco') }
    ]
  },
  {
    id: 'clorinator-main',
    slot: 'switch.clorinator',
    icon: 'droplet',
    label: 'Clorinator principal',
    model: 'Zodiac EXO iQ',
    group: 'Piscină',
    kind: 'switch',
    ambient: { kind: 'compose', parts: [['sensor.clor_stare_exo', 'Stare ', ''], ['sensor.ph', ' · pH ', '']] },
    dial: { kind: 'number', slot: 'number.clor_productie', unit: '%', min: 0, max: 100, step: 5 },
    minis: [
      { id: 'clm-low', icon: 'droplet', label: 'Redus', action: A.slot('switch.clorinator_redus') },
      { id: 'clm-boost', icon: 'boost', label: 'Boost', action: A.slot('switch.clorinator_boost') }
    ],
    // Cercurile de producţie (25–100%) ELIMINATE (v1.1.1) — vezi nota de mai sus.
    circles: []
  },
  ...mediaCard('media-bucatarie', 'media.bucatarie', 'TV Bucătărie', 'Parter', 'Parter'),
  ...mediaCard('media-sofia-parter', 'media.sofia_parter', 'TV Sofia Parter', 'Parter', 'Parter'),
  ...mediaCard('media-dormitor-sofia', 'media.dormitor_sofia', 'TV Dormitor Sofia', 'Etaj', 'Etaj'),
  // Hisense (HomeKit): mute e un switch dedicat (media_player-ul nu are bitul
  // VOLUME_MUTE); volumul lipseşte complet (fără VOLUME_SET) — dial-ul se
  // ascunde singur prin verificarea de supported_features din build.
  ...mediaCard('media-etaj-hisense', 'media.etaj_hisense', 'TV Dormitor Etaj', 'Hisense', 'Etaj', A.slot('media.etaj_hisense_mute')),
  ...mediaCard('media-foisor', 'media.foisor', 'TV Foişor', 'Exterior', 'Mansardă şi Foişor'),
  ...mediaCard('media-tata-buc', 'media.tata_bucatarie', 'TV Bucătărie Tata', 'Casa Tata', 'Casa Tata'),
  ...mediaCard('media-tata-dormitor', 'media.tata_dormitor', 'TV Dormitor Tata', 'Casa Tata · LG', 'Casa Tata')
];

function mediaCard(id, slot, label, model, zone, muteAction) {
  return [
    {
      id,
      slot,
      icon: 'tv',
      label,
      model,
      group: 'Media',
      kind: 'media',
      zone,
      ambient: { kind: 'mediaState' },
      dial: { kind: 'volume', unit: '%', min: 0, max: 100, step: 1 },
      // "Redare" (inert) eliminat; "Plex" → "TV" — vezi nota de pe cardul
      // TV Mansardă. Chip-urile YouTube/Netflix rămân: pe Samsung-uri
      // source_list e doar [TV, HDMI] cât timp TV-ul e stins, dar se
      // repopulează cu aplicaţii când TV-ul e pornit — se activează singure.
      minis: [],
      circles: [
        { id: id + '-c-h1', icon: 'cable', label: 'HDMI 1', action: A.source('hdmi 1', 'hdmi1', 'hdmi') },
        { id: id + '-c-tv', icon: 'tv', label: 'TV', action: A.source('live tv', 'tv') },
        { id: id + '-c-yt', icon: 'playCircle', label: 'YouTube', action: A.source('youtube') },
        { id: id + '-c-nf', icon: 'clapperboard', label: 'Netflix', action: A.source('netflix') },
        { id: id + '-c-mute', icon: 'volumeX', label: 'Mute', action: muteAction || A.mute() }
      ]
    }
  ];
}

export const CARD_BY_ID = DEVICE_CARDS.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {});

export const DEFAULT_TRACKED = ['ac-vortex', 'heatpump', 'clorinator-redus', 'pool-pump', 'media-mansarda'];

export const PAGE_DEVICES = {
  climat: ['ac-vortex', 'ac-etaj', 'ac-vivax'],
  piscina: ['pool-pump', 'heatpump', 'clorinator-redus', 'clorinator-main'],
  media: [
    'media-mansarda', 'media-bucatarie', 'media-sofia-parter', 'media-dormitor-sofia',
    'media-etaj-hisense', 'media-foisor', 'media-tata-buc', 'media-tata-dormitor'
  ],
  retea: [], energie: [], mentenanta: []
};

export const MEDIA_ZONES = ['Toate', 'Parter', 'Etaj', 'Mansardă şi Foişor', 'Casa Tata'];

export const MEDIA_ZONE_OF = DEVICE_CARDS.reduce((acc, c) => {
  if (c.zone) acc[c.id] = c.zone;
  return acc;
}, {});

export const PAGE_DEVICE_HEAD = {
  climat: ['Unităţi de climatizare', 'control rapid · apasă pentru setări complete'],
  piscina: ['Echipamente piscină', 'control rapid · apasă pentru setări complete'],
  media: ['Televizoare', 'apasă pentru setări complete']
};

// (v1.5.0) Iconurile au fost refăcute odată cu modul „etichetă doar pe tabul
// activ": pe tabul inactiv silueta e singurul indiciu, deci fiecare pagină are
// un obiect concret, nu o abstracţie. Ce s-a schimbat şi de ce:
//   Climat   alertTri  -> airVent   (triunghi de avertizare pe o pagină de
//                                    climatizare citea „ceva e stricat")
//   Media    tag       -> tv        (glifa desenată manual era un „cast" cu
//                                    arce, care se certa vizual cu Wifi)
//   Energie  barChart  -> bolt      (singura abstracţie rămasă; `bolt` înseamnă
//                                    deja putere în alte 15 locuri din aplicaţie)
// Piscina (waves) şi Energia (bolt) sunt vecine în bară: verificat la 19px că
// nu se confundă — banda orizontală dungată vs forma diagonală compactă.
export const NAV = [
  { key: 'acasa', label: 'Acasă', icon: 'home' },
  { key: 'climat', label: 'Climat', icon: 'airVent' },
  { key: 'piscina', label: 'Piscină', icon: 'waves' },
  { key: 'energie', label: 'Energie', icon: 'bolt' },
  { key: 'retea', label: 'Reţea', icon: 'wifi' },
  { key: 'media', label: 'Media', icon: 'tv' },
  { key: 'mentenanta', label: 'Mentenanţă', icon: 'wrench' },
  { key: 'zone', label: 'Zone', icon: 'layoutGrid' },
  // (v1.6.0) Al zecelea tab. `heartPulse`: in modul "eticheta doar pe tabul
  // activ" silueta trebuie sa spuna axa paginii, iar axa aici e STAREA, nu
  // obiectul. Un `server` sau un `cpu` ar fi sugerat infrastructura, care e
  // deja pe Retea si Mentenanta.
  { key: 'dispozitive', label: 'Dispozitive', icon: 'heartPulse' }
];
