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
  // Serii pentru graficele de istoric (doar citire). Recorder-ul HA nu poate
  // reda ISTORICUL unui atribut (fetch-ul foloseşte no_attributes:true), deci
  // graficele au nevoie de senzori dedicaţi cu istoricul în STAREA lor.
  slot('sensor.mans_ambient', 'Istoric · ambient mansardă', 'climat', ['sensor']),
  slot('sensor.mans_setpoint', 'Istoric · setpoint Vortex', 'climat', ['sensor']),
  slot('sensor.lg_ambient', 'Istoric · ambient etaj (LG)', 'climat', ['sensor']),
  slot('sensor.vv_ambient', 'Istoric · ambient Vivax', 'climat', ['sensor']),
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

  // ------------------------------------------- ENERGIE · GROWATT (v1.1.3)
  // Sloturile invertorului hibrid Growatt 25 kW (device MQTT KNN2E3S00W,
  // Grott layout T06NNNNX + tip 'mod'). Lista provine EXCLUSIV din entităţile
  // validate de auditul de coerenţă fizică din 2026-08-22 — registrele scalate
  // greşit de layout sau nepopulate de firmware NU au slot aici.
  slot('gw.pv_in', 'Growatt · putere PV totală', 'energie', ['sensor']),
  slot('gw.pv_out', 'Growatt · putere PV după conversie', 'energie', ['sensor']),
  slot('gw.sol_azi', 'Growatt · energie solară azi', 'energie', ['sensor']),
  slot('gw.pv1_w', 'Growatt · string PV1 putere', 'energie', ['sensor']),
  slot('gw.pv2_w', 'Growatt · string PV2 putere', 'energie', ['sensor']),
  slot('gw.pv3_w', 'Growatt · string PV3 putere', 'energie', ['sensor']),
  slot('gw.pv4_w', 'Growatt · string PV4 putere (inexistent)', 'energie', ['sensor']),
  slot('gw.pv1_v', 'Growatt · string PV1 tensiune', 'energie', ['sensor']),
  slot('gw.pv2_v', 'Growatt · string PV2 tensiune', 'energie', ['sensor']),
  slot('gw.pv3_v', 'Growatt · string PV3 tensiune', 'energie', ['sensor']),
  slot('gw.pv4_v', 'Growatt · string PV4 tensiune (inexistent)', 'energie', ['sensor']),
  slot('gw.pv1_a', 'Growatt · string PV1 curent', 'energie', ['sensor']),
  slot('gw.pv2_a', 'Growatt · string PV2 curent', 'energie', ['sensor']),
  slot('gw.pv3_a', 'Growatt · string PV3 curent', 'energie', ['sensor']),
  slot('gw.pv4_a', 'Growatt · string PV4 curent (inexistent)', 'energie', ['sensor']),
  slot('gw.pv1_azi', 'Growatt · PV1 energie azi', 'energie', ['sensor']),
  slot('gw.pv2_azi', 'Growatt · PV2 energie azi', 'energie', ['sensor']),
  slot('gw.pv3_azi', 'Growatt · PV3 energie azi', 'energie', ['sensor']),
  slot('gw.pv4_azi', 'Growatt · PV4 energie azi (inexistent)', 'energie', ['sensor']),
  slot('gw.pv1_tot', 'Growatt · PV1 energie totală', 'energie', ['sensor']),
  slot('gw.pv2_tot', 'Growatt · PV2 energie totală', 'energie', ['sensor']),
  slot('gw.pv3_tot', 'Growatt · PV3 energie totală', 'energie', ['sensor']),
  slot('gw.pv4_tot', 'Growatt · PV4 energie totală (inexistent)', 'energie', ['sensor']),
  slot('gw.gen_azi', 'Growatt · energie generată azi (AC)', 'energie', ['sensor']),
  slot('gw.gen_tot', 'Growatt · energie generată total (AC)', 'energie', ['sensor']),
  slot('gw.pv_tot', 'Growatt · energie solară totală (DC)', 'energie', ['sensor']),
  slot('gw.pac', 'Growatt · putere AC totală', 'energie', ['sensor']),
  slot('gw.f1_v', 'Growatt · faza 1 tensiune', 'energie', ['sensor']),
  slot('gw.f2_v', 'Growatt · faza 2 tensiune', 'energie', ['sensor']),
  slot('gw.f3_v', 'Growatt · faza 3 tensiune', 'energie', ['sensor']),
  slot('gw.f1_a', 'Growatt · faza 1 curent', 'energie', ['sensor']),
  slot('gw.f2_a', 'Growatt · faza 2 curent', 'energie', ['sensor']),
  slot('gw.f3_a', 'Growatt · faza 3 curent', 'energie', ['sensor']),
  slot('gw.f1_p', 'Growatt · faza 1 putere', 'energie', ['sensor']),
  slot('gw.f2_p', 'Growatt · faza 2 putere', 'energie', ['sensor']),
  slot('gw.f3_p', 'Growatt · faza 3 putere', 'energie', ['sensor']),
  slot('gw.v_rs', 'Growatt · tensiune linie R-S', 'energie', ['sensor']),
  slot('gw.v_st', 'Growatt · tensiune linie S-T', 'energie', ['sensor']),
  slot('gw.v_tr', 'Growatt · tensiune linie T-R', 'energie', ['sensor']),
  slot('gw.frecv', 'Growatt · frecvenţă reţea', 'energie', ['sensor']),
  slot('gw.frecv_pv', 'Growatt · frecvenţă invertor', 'energie', ['sensor']),
  slot('gw.qac', 'Growatt · putere reactivă', 'energie', ['sensor']),
  slot('gw.sarcina', 'Growatt · grad de încărcare invertor', 'energie', ['sensor']),
  slot('gw.p_nominal', 'Growatt · putere nominală', 'energie', ['sensor']),
  slot('gw.soc', 'Growatt · baterie SOC', 'energie', ['sensor']),
  slot('gw.soh', 'Growatt · baterie sănătate (SOH)', 'energie', ['sensor']),
  slot('gw.p_chr', 'Growatt · putere încărcare baterie', 'energie', ['sensor']),
  slot('gw.p_dischr', 'Growatt · putere descărcare baterie', 'energie', ['sensor']),
  slot('gw.echr_azi', 'Growatt · baterie încărcată azi', 'energie', ['sensor']),
  slot('gw.echr_tot', 'Growatt · baterie încărcată total', 'energie', ['sensor']),
  slot('gw.edis_azi', 'Growatt · baterie descărcată azi', 'energie', ['sensor']),
  slot('gw.edis_tot', 'Growatt · baterie descărcată total', 'energie', ['sensor']),
  slot('gw.module', 'Growatt · număr module baterie', 'energie', ['sensor']),
  slot('gw.i_chr_max', 'Growatt · curent maxim încărcare (BMS)', 'energie', ['sensor']),
  slot('gw.i_dis_max', 'Growatt · curent maxim descărcare (BMS)', 'energie', ['sensor']),
  slot('gw.bat_temp', 'Growatt · temperatură baterie', 'energie', ['sensor']),
  slot('gw.cel_temp_max', 'Growatt · temperatură maximă celulă', 'energie', ['sensor']),
  slot('gw.bat_temp_med', 'Growatt · temperatură medie baterie', 'energie', ['sensor']),
  slot('gw.cel_v_max', 'Growatt · tensiune maximă celulă', 'energie', ['sensor']),
  slot('gw.cel_v_min', 'Growatt · tensiune minimă celulă', 'energie', ['sensor']),
  slot('gw.cel_nr_max', 'Growatt · celula cu tensiune maximă', 'energie', ['sensor']),
  slot('gw.cel_nr_min', 'Growatt · celula cu tensiune minimă', 'energie', ['sensor']),
  slot('gw.i_bat', 'Growatt · curent baterie', 'energie', ['sensor']),
  slot('gw.i_bb', 'Growatt · curent buck-boost', 'energie', ['sensor']),
  slot('gw.i_llc', 'Growatt · curent LLC', 'energie', ['sensor']),
  slot('gw.bdc', 'Growatt · convertor baterie (BDC)', 'energie', ['sensor']),
  slot('gw.cerere_chr', 'Growatt · cerere de încărcare', 'energie', ['sensor']),
  slot('gw.p_export', 'Growatt · putere export reţea', 'energie', ['sensor']),
  slot('gw.p_import', 'Growatt · putere import reţea', 'energie', ['sensor']),
  slot('gw.p_casa', 'Growatt · consum casă', 'energie', ['sensor']),
  slot('gw.exp_azi', 'Growatt · export azi', 'energie', ['sensor']),
  slot('gw.exp_tot', 'Growatt · export total', 'energie', ['sensor']),
  slot('gw.imp_azi', 'Growatt · import azi', 'energie', ['sensor']),
  slot('gw.imp_tot', 'Growatt · import total', 'energie', ['sensor']),
  slot('gw.self_azi', 'Growatt · autoconsum azi', 'energie', ['sensor']),
  slot('gw.self_tot', 'Growatt · autoconsum total', 'energie', ['sensor']),
  slot('gw.sys_azi', 'Growatt · energie sistem azi', 'energie', ['sensor']),
  slot('gw.eps_f', 'Growatt · EPS frecvenţă', 'energie', ['sensor']),
  slot('gw.eps_v1', 'Growatt · EPS faza 1 tensiune', 'energie', ['sensor']),
  slot('gw.eps_v2', 'Growatt · EPS faza 2 tensiune', 'energie', ['sensor']),
  slot('gw.eps_v3', 'Growatt · EPS faza 3 tensiune', 'energie', ['sensor']),
  slot('gw.eps_a1', 'Growatt · EPS faza 1 curent', 'energie', ['sensor']),
  slot('gw.eps_a2', 'Growatt · EPS faza 2 curent', 'energie', ['sensor']),
  slot('gw.eps_a3', 'Growatt · EPS faza 3 curent', 'energie', ['sensor']),
  slot('gw.eps_p1', 'Growatt · EPS faza 1 putere', 'energie', ['sensor']),
  slot('gw.eps_p2', 'Growatt · EPS faza 2 putere', 'energie', ['sensor']),
  slot('gw.eps_p3', 'Growatt · EPS faza 3 putere', 'energie', ['sensor']),
  slot('gw.eps_p', 'Growatt · EPS putere totală', 'energie', ['sensor']),
  slot('gw.eps_sarcina', 'Growatt · EPS grad de încărcare', 'energie', ['sensor']),
  slot('gw.t_inv', 'Growatt · temperatură invertor', 'energie', ['sensor']),
  slot('gw.t_ipm', 'Growatt · temperatură IPM', 'energie', ['sensor']),
  slot('gw.t_pvimp', 'Growatt · temperatură etaj PV', 'energie', ['sensor']),
  slot('gw.t_boost', 'Growatt · temperatură boost', 'energie', ['sensor']),
  slot('gw.t_com', 'Growatt · temperatură placă comunicaţie', 'energie', ['sensor']),
  slot('gw.t_a', 'Growatt · temperatură senzor A', 'energie', ['sensor']),
  slot('gw.t_b', 'Growatt · temperatură senzor B', 'energie', ['sensor']),
  slot('gw.v_bus', 'Growatt · tensiune bus DC', 'energie', ['sensor']),
  slot('gw.v_bus_p', 'Growatt · tensiune bus pozitiv', 'energie', ['sensor']),
  slot('gw.v_bus_n', 'Growatt · tensiune bus negativ', 'energie', ['sensor']),
  slot('gw.v_bus1', 'Growatt · tensiune bus 1', 'energie', ['sensor']),
  slot('gw.v_bus2', 'Growatt · tensiune bus 2', 'energie', ['sensor']),
  slot('gw.v_bus2low', 'Growatt · tensiune bus 2 (low)', 'energie', ['sensor']),
  slot('gw.ore', 'Growatt · ore de funcţionare', 'energie', ['sensor']),
  slot('gw.gfci', 'Growatt · curent de scurgere (GFCI)', 'energie', ['sensor']),
  slot('gw.pf', 'Growatt · factor de putere', 'energie', ['sensor']),
  slot('gw.delay', 'Growatt · întârziere pornire', 'energie', ['sensor']),
  slot('gw.eac_chr_azi', 'Growatt · încărcare din AC azi', 'energie', ['sensor']),
  slot('gw.eac_chr_tot', 'Growatt · încărcare din AC total', 'energie', ['sensor']),
  slot('gw.serial', 'Growatt · serie invertor', 'energie', ['sensor']),
  slot('gw.dl_serial', 'Growatt · serie datalogger', 'energie', ['sensor']),
  slot('gw.push', 'Growatt · ultimul pachet de date', 'energie', ['sensor']),
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
