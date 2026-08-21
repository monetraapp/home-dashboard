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
  slot('sensor.temp_exterior', 'Temperatură exterior', 'climat', ['sensor', 'weather'], {
    note: 'Opţional — dacă lipseşte, se ia din entitatea weather.'
  }),

  // -------------------------------------------------------------- PISCINĂ
  slot('switch.pompa_filtrare', 'Pompă filtrare piscină', 'piscina', ['switch', 'input_boolean', 'fan'], {
    suggest: 'switch.pompa_filtrare',
    note: 'ID propus de tine, marcat VERIFY.'
  }),
  slot('number.pompa_debit', 'Debit / viteză pompă filtrare', 'piscina', ['number', 'input_number'], {
    note: 'Doar dacă pompa expune o viteză reglabilă.'
  }),
  slot('sensor.pompa_consum', 'Consum pompă filtrare', 'piscina', ['sensor']),
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
