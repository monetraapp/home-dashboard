// Catalogul de "sloturi" — fiecare loc din design care are nevoie de o entitate HA.
//
// IMPORTANT: aici NU există entity_id-uri inventate. Câmpul `suggest` conţine
// exclusiv ID-urile pe care le-ai dat tu explicit, iar ele se auto-selectează
// doar dacă entitatea chiar există în instanţa ta (altfel slotul rămâne
// nemapat şi cardul afişează marcajul VERIFY).

export const GROUPS = [
  { key: 'climat', label: 'Climat' },
  { key: 'piscina', label: 'Piscină' },
  { key: 'media', label: 'Media' },
  { key: 'camere', label: 'Camere' },
  { key: 'retea', label: 'Reţea (Omada)' },
  { key: 'energie', label: 'Energie' },
  { key: 'mentenanta', label: 'Mentenanţă' },
  { key: 'general', label: 'General' }
];

function slot(key, label, group, domains, extra) {
  return Object.assign({ key, label, group, domains, suggest: null, note: '' }, extra || {});
}

export const SLOTS = [
  // ---------------------------------------------------------------- CLIMAT
  slot('climate.vortex', 'AC Mansardă Vortex', 'climat', ['climate'], {
    suggest: 'climate.ac_mansarda_vortex',
    note: 'ID propus de tine, marcat VERIFY — se selectează doar dacă există.'
  }),
  slot('climate.etaj', 'AC Etaj LG', 'climat', ['climate']),
  slot('climate.vivax', 'AC Mansardă Vivax', 'climat', ['climate']),
  // Slotul "Temperatură exterior" a fost ELIMINAT (v1.0.6): nu există senzor
  // fizic exterior; afişajul "Exterior" citeşte direct weather.main (atributul
  // temperature), fără slot intermediar.
  // Cheile păstrează prefixul istoric "sensor." ca să nu orfanizeze mapările
  // deja salvate în localStorage; acum ţintesc entităţile number.* (controlabile).
  slot('sensor.lg_pornire_min', 'AC Etaj LG · pornire peste (min)', 'climat', ['number', 'sensor'], {
    note: 'Decalaj în minute faţă de acum, nu o oră fixă — confirmat manual în appul LG ThinQ. Mapat pe number.* pentru control (set_value); unitatea afişată e cea reală (min), nu cea declarată greşit de number (h).'
  }),
  slot('sensor.lg_oprire_min', 'AC Etaj LG · oprire peste (min)', 'climat', ['number', 'sensor'], {
    note: 'Decalaj în minute, nu oră fixă — confirmat manual. Mapat pe number.* pentru control.'
  }),
  slot('sensor.lg_somn_min', 'AC Etaj LG · temporizator somn (min)', 'climat', ['number', 'sensor'], {
    note: 'Countdown în minute — mapat pe number.* pentru control.'
  }),
  slot('switch.lg_economie', 'AC Etaj LG · economie energie', 'climat', ['switch'], {
    note: 'Funcţia Economie e un switch separat în LG ThinQ, nu un preset al entităţii climate.'
  }),
  // Funcţiile AC Vortex sunt switch-uri separate expuse de AUX Cloud, nu
  // preset_modes pe entitatea climate (care nu are preset_modes deloc).
  slot('switch.vx_eco', 'Vortex · Eco', 'climat', ['switch']),
  slot('switch.vx_noapte', 'Vortex · Noapte', 'climat', ['switch']),
  slot('switch.vx_health', 'Vortex · Health', 'climat', ['switch']),
  slot('switch.vx_comfwind', 'Vortex · Comfort Wind', 'climat', ['switch']),
  slot('switch.vx_antimucegai', 'Vortex · Anti-mucegai', 'climat', ['switch']),
  slot('switch.vx_blocare', 'Vortex · Blocare copii', 'climat', ['switch']),
  slot('switch.vx_afisaj', 'Vortex · Afişaj', 'climat', ['switch']),
  slot('switch.vx_autocuratare', 'Vortex · Auto-curăţare', 'climat', ['switch']),

  // -------------------------------------------------------------- PISCINĂ
  slot('switch.pompa_filtrare', 'Pompă filtrare piscină', 'piscina', ['switch', 'input_boolean', 'fan'], {
    suggest: 'switch.pompa_filtrare',
    note: 'ID propus de tine, marcat VERIFY.'
  }),
  // Sloturile "Debit/viteză pompă" şi "Consum pompă filtrare" au fost ELIMINATE
  // (v1.0.6): pompa e strict pornit/oprit şi nu are măsurare de consum — nu vor
  // exista niciodată entităţi pentru ele pe acest hardware.
  slot('climate.pompa_caldura', 'Pompă căldură Fairland', 'piscina', ['climate', 'water_heater'], {
    suggest: 'climate.pompa_caldura_piscina',
    note: 'ID propus de tine, marcat VERIFY.'
  }),
  slot('sensor.apa_temp', 'Temperatură apă piscină', 'piscina', ['sensor']),
  slot('sensor.pc_consum', 'Consum pompă căldură', 'piscina', ['sensor']),
  slot('binary_sensor.pc_debit', 'Debit apă (pompă căldură)', 'piscina', ['binary_sensor', 'sensor']),
  slot('binary_sensor.pc_problema', 'Flag problemă pompă căldură', 'piscina', ['binary_sensor', 'sensor']),
  slot('switch.clorinator', 'Clorinator (pornit/oprit)', 'piscina', ['switch', 'input_boolean'], {
    note: 'Zodiac EXO iQ — VERIFY, nu mi-ai dat entity_id.'
  }),
  slot('switch.clorinator_redus', 'Clorinator · regim redus', 'piscina', ['switch', 'input_boolean', 'select'], {
    note: 'VERIFY — poate fi switch sau opţiune de select.'
  }),
  slot('switch.clorinator_boost', 'Clorinator · regim boost', 'piscina', ['switch', 'input_boolean', 'button'], {
    note: 'VERIFY.'
  }),
  slot('number.clor_productie', 'Producţie clor (%)', 'piscina', ['number', 'input_number', 'sensor'], {
    note: 'VERIFY — dacă e doar sensor, dial-ul devine read-only.'
  }),
  slot('sensor.ph', 'pH măsurat', 'piscina', ['sensor']),
  slot('number.ph_tinta', 'pH ţintă', 'piscina', ['number', 'input_number', 'sensor']),
  slot('sensor.orp', 'ORP măsurat', 'piscina', ['sensor']),
  slot('number.orp_tinta', 'ORP ţintă', 'piscina', ['number', 'input_number', 'sensor']),
  slot('sensor.clor_amperaj', 'Amperaj celulă', 'piscina', ['sensor']),
  slot('sensor.clor_stare_exo', 'Stare EXO', 'piscina', ['sensor', 'binary_sensor']),
  slot('sensor.clor_dual_link', 'Dual Link', 'piscina', ['sensor', 'binary_sensor']),
  slot('sensor.clor_cod_eroare', 'Cod eroare clorinator', 'piscina', ['sensor']),
  slot('sensor.clor_stare_eroare', 'Stare eroare clorinator', 'piscina', ['sensor', 'binary_sensor']),

  // ---------------------------------------------------------------- MEDIA
  slot('media.mansarda', 'TV Mansardă LG', 'media', ['media_player'], {
    suggest: 'media_player.tv_mansarda',
    note: 'ID propus de tine, marcat VERIFY.'
  }),
  slot('media.bucatarie', 'TV Bucătărie', 'media', ['media_player']),
  slot('media.sofia_parter', 'TV Sofia Parter', 'media', ['media_player']),
  slot('media.dormitor_sofia', 'TV Dormitor Sofia', 'media', ['media_player']),
  slot('media.etaj_hisense', 'TV Dormitor Etaj (Hisense)', 'media', ['media_player']),
  slot('media.etaj_hisense_mute', 'TV Dormitor Etaj · mut (switch dedicat)', 'media', ['switch'], {
    note: 'Integrarea HomeKit nu expune volume_mute prin media_player (supported_features fără bitul 8) — mute-ul e un switch separat.'
  }),
  slot('media.foisor', 'TV Foişor', 'media', ['media_player']),
  slot('media.tata_bucatarie', 'TV Bucătărie Tata', 'media', ['media_player']),
  slot('media.tata_dormitor', 'TV Dormitor Tata LG', 'media', ['media_player']),

  // --------------------------------------------------------------- CAMERE
  slot('camera.poarta', 'Cameră Poartă Faţă', 'camere', ['camera', 'binary_sensor']),
  slot('camera.curte_fata', 'Cameră Curte Faţă', 'camere', ['camera', 'binary_sensor']),
  slot('camera.curte_piscina', 'Cameră Curte Piscină', 'camere', ['camera', 'binary_sensor']),
  slot('camera.curte_spate', 'Cameră Curte Spate', 'camere', ['camera', 'binary_sensor']),
  slot('camera.speed_dome', 'Cameră Speed Dome', 'camere', ['camera', 'binary_sensor']),
  slot('light.ir_poarta', 'IR Poartă Faţă', 'camere', ['light', 'switch']),
  slot('light.ir_curte_fata', 'IR Curte Faţă', 'camere', ['light', 'switch']),
  slot('light.ir_curte_piscina', 'IR Curte Piscină', 'camere', ['light', 'switch']),
  slot('light.ir_curte_spate', 'IR Curte Spate', 'camere', ['light', 'switch']),
  slot('light.ir_speed_dome', 'IR Speed Dome', 'camere', ['light', 'switch']),
  slot('switch.stergator_speed_dome', 'Ştergător Speed Dome', 'camere', ['switch', 'button']),

  // ---------------------------------------------------------------- REŢEA
  // Toate sloturile de reţea sunt DOAR INFORMATIVE (read-only) prin design.
  slot('net.wan_link', 'Legătură WAN', 'retea', ['binary_sensor', 'sensor']),
  slot('net.connectivity', 'Conectivitate internet', 'retea', ['binary_sensor', 'sensor']),
  slot('net.gw_state', 'Gateway · stare', 'retea', ['sensor', 'binary_sensor']),
  slot('net.gw_cpu', 'Gateway · CPU', 'retea', ['sensor']),
  slot('net.gw_mem', 'Gateway · memorie', 'retea', ['sensor']),
  slot('net.gw_fw', 'Gateway · firmware', 'retea', ['update', 'sensor', 'binary_sensor']),
  slot('net.sw_state', 'Switch · stare', 'retea', ['sensor', 'binary_sensor']),
  slot('net.sw_cpu', 'Switch · CPU', 'retea', ['sensor']),
  slot('net.sw_mem', 'Switch · memorie', 'retea', ['sensor']),
  slot('net.sw_fw', 'Switch · firmware', 'retea', ['update', 'sensor', 'binary_sensor']),
  slot('net.ap_parter_cpu', 'EAP Parter · CPU', 'retea', ['sensor']),
  slot('net.ap_parter_mem', 'EAP Parter · RAM', 'retea', ['sensor']),
  slot('net.ap_etaj_cpu', 'EAP Etaj · CPU', 'retea', ['sensor']),
  slot('net.ap_etaj_mem', 'EAP Etaj · RAM', 'retea', ['sensor']),
  slot('net.ap_mansarda_cpu', 'EAP Mansardă · CPU', 'retea', ['sensor']),
  slot('net.ap_mansarda_mem', 'EAP Mansardă · RAM', 'retea', ['sensor']),
  slot('net.ap_foisor_cpu', 'EAP Foişor · CPU', 'retea', ['sensor']),
  slot('net.ap_foisor_mem', 'EAP Foişor · RAM', 'retea', ['sensor']),
  slot('net.ap_casa_fata_cpu', 'EAP Casa Faţă · CPU', 'retea', ['sensor']),
  slot('net.ap_casa_fata_mem', 'EAP Casa Faţă · RAM', 'retea', ['sensor']),
  slot('net.poe1', 'PoE port 1 · putere', 'retea', ['sensor']),
  slot('net.poe2', 'PoE port 2 · putere', 'retea', ['sensor']),
  slot('net.poe3', 'PoE port 3 · putere', 'retea', ['sensor']),
  slot('net.poe4', 'PoE port 4 · putere', 'retea', ['sensor']),
  slot('net.poe5', 'PoE port 5 · putere', 'retea', ['sensor']),
  slot('net.poe6', 'PoE port 6 · putere', 'retea', ['sensor']),
  slot('net.poe7', 'PoE port 7 · putere', 'retea', ['sensor']),
  slot('net.poe8', 'PoE port 8 · putere', 'retea', ['sensor']),
  slot('net.lan2', 'LAN 2 · stare', 'retea', ['binary_sensor', 'sensor', 'switch']),
  slot('net.lan3', 'LAN 3 · stare', 'retea', ['binary_sensor', 'sensor', 'switch']),
  slot('net.lan4', 'LAN 4 · stare', 'retea', ['binary_sensor', 'sensor', 'switch']),
  slot('net.lan5', 'LAN 5 · stare', 'retea', ['binary_sensor', 'sensor', 'switch']),
  slot('net.lan6', 'LAN 6 · stare', 'retea', ['binary_sensor', 'sensor', 'switch']),
  slot('net.lan7', 'LAN 7 · stare', 'retea', ['binary_sensor', 'sensor', 'switch']),
  // Switch-urile Easy Managed (apar în HA doar cu MAC): Foişor = ES206XPP-M2
  // (A8-29-48-ED-C7-2D, cu PoE), Etaj = ES206X-M2 (A8-29-48-EE-DE-FC, fără PoE).
  slot('net.swf_state', 'Switch Foişor · stare', 'retea', ['sensor', 'binary_sensor']),
  slot('net.swf_cpu', 'Switch Foişor · CPU', 'retea', ['sensor']),
  slot('net.swf_mem', 'Switch Foişor · memorie', 'retea', ['sensor']),
  slot('net.swf_poe1', 'Switch Foişor · PoE port 1', 'retea', ['sensor']),
  slot('net.swf_poe2', 'Switch Foişor · PoE port 2', 'retea', ['sensor']),
  slot('net.swf_poe3', 'Switch Foişor · PoE port 3', 'retea', ['sensor']),
  slot('net.swf_poe4', 'Switch Foişor · PoE port 4', 'retea', ['sensor']),
  slot('net.swe_state', 'Switch Etaj · stare', 'retea', ['sensor', 'binary_sensor']),
  slot('net.swe_cpu', 'Switch Etaj · CPU', 'retea', ['sensor']),
  slot('net.swe_mem', 'Switch Etaj · memorie', 'retea', ['sensor']),

  // -------------------------------------------------------------- ENERGIE
  slot('energy.ac_etaj_azi', 'AC Etaj · consum azi', 'energie', ['sensor']),
  slot('energy.ac_etaj_ieri', 'AC Etaj · consum ieri', 'energie', ['sensor']),
  slot('energy.ac_etaj_luna', 'AC Etaj · luna curentă', 'energie', ['sensor']),
  slot('energy.ac_etaj_luna_trecuta', 'AC Etaj · luna trecută', 'energie', ['sensor']),
  slot('energy.total_luna', 'Consum total luna curentă', 'energie', ['sensor'], {
    note: 'Alimentează inelul „Consum energie" de pe pagina Acasă.'
  }),

  // ---------------------------------------------------------- MENTENANŢĂ
  slot('upd.ha_core', 'HA Core', 'mentenanta', ['update', 'binary_sensor', 'sensor']),
  slot('upd.ha_os', 'HA OS', 'mentenanta', ['update', 'binary_sensor', 'sensor']),
  slot('upd.supervisor', 'Supervisor', 'mentenanta', ['update', 'binary_sensor', 'sensor']),
  slot('upd.matter', 'Matter Server', 'mentenanta', ['update', 'binary_sensor', 'sensor']),
  slot('upd.hacs', 'HACS', 'mentenanta', ['update', 'binary_sensor', 'sensor']),
  slot('upd.net_gw', 'Update Gateway', 'mentenanta', ['update', 'binary_sensor', 'sensor']),
  slot('upd.net_sw', 'Update Switch', 'mentenanta', ['update', 'binary_sensor', 'sensor']),
  slot('upd.eap_parter', 'Update EAP Parter', 'mentenanta', ['update', 'binary_sensor', 'sensor']),
  slot('upd.eap_etaj', 'Update EAP Etaj', 'mentenanta', ['update', 'binary_sensor', 'sensor']),
  slot('upd.eap_mansarda', 'Update EAP Mansardă', 'mentenanta', ['update', 'binary_sensor', 'sensor']),
  slot('upd.eap_foisor', 'Update EAP Foişor', 'mentenanta', ['update', 'binary_sensor', 'sensor']),
  slot('upd.eap_casa_fata', 'Update EAP Casa Faţă', 'mentenanta', ['update', 'binary_sensor', 'sensor']),
  // Indicatori "rulează" pentru add-on-uri (binary_sensor.*_running, hassio).
  // Erau dezactivate de integrare; activate din registry pe 2026-08-22.
  // Doar citire — comutarea add-on-urilor (switch.fusion etc.) NU se expune.
  slot('addon.fusion', 'Add-on Fusion · rulează', 'mentenanta', ['binary_sensor']),
  slot('addon.get_hacs', 'Add-on Get HACS · rulează', 'mentenanta', ['binary_sensor']),
  slot('addon.home_dashboard', 'Add-on Home Dashboard · rulează', 'mentenanta', ['binary_sensor']),
  slot('addon.matter_server', 'Add-on Matter Server · rulează', 'mentenanta', ['binary_sensor']),
  slot('backup.state', 'Stare backup', 'mentenanta', ['sensor', 'binary_sensor']),
  slot('backup.last', 'Ultimul backup reuşit', 'mentenanta', ['sensor']),
  slot('backup.next', 'Următorul backup programat', 'mentenanta', ['sensor']),
  slot('auto.alerta_clorinator', 'Automatizare · alertă clorinator', 'mentenanta', ['automation', 'input_boolean']),
  slot('auto.clear_clorinator', 'Automatizare · clear clorinator', 'mentenanta', ['automation', 'input_boolean']),
  slot('auto.alerta_pompa_caldura', 'Automatizare · alertă pompă căldură', 'mentenanta', ['automation', 'input_boolean']),
  slot('diag.vortex_eroare', 'Eroare Vortex', 'mentenanta', ['sensor', 'binary_sensor']),
  slot('diag.vortex_limita_putere', 'Vortex · limită putere', 'mentenanta', ['sensor', 'number']),
  slot('diag.integrare_vivax', 'Integrare AC Vivax (Midea)', 'mentenanta', ['sensor', 'binary_sensor', 'climate']),
  slot('diag.integrare_fairland', 'Integrare Fairland (Tuya Local)', 'mentenanta', ['sensor', 'binary_sensor', 'climate']),

  // -------------------------------------------------------------- GENERAL
  slot('weather.main', 'Vreme', 'general', ['weather'], {
    note: 'VERIFY — nu mi-ai dat entity_id pentru weather.'
  }),
  slot('sensor.baterie_telefon', 'Baterie telefon', 'general', ['sensor']),
  slot('sensor.lista_cumparaturi', 'Listă cumpărături · nr. articole', 'general', ['sensor', 'todo'])
];

export const SLOT_BY_KEY = SLOTS.reduce((acc, s) => {
  acc[s.key] = s;
  return acc;
}, {});

/**
 * Construieşte maparea implicită: ia sugestiile date de utilizator, dar numai
 * dacă entitatea chiar există în instanţă. Nu suprascrie nimic din ce e mapat deja.
 */
export function seedSuggestions(currentMap, states) {
  const next = Object.assign({}, currentMap || {});
  let added = 0;
  SLOTS.forEach((s) => {
    if (!s.suggest) return;
    if (next[s.key]) return;
    if (states && states[s.suggest]) {
      next[s.key] = s.suggest;
      added++;
    }
  });
  return { map: next, added };
}
