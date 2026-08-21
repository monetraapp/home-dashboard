// Mapare propusă pe baza auditului de entităţi din instanţa reală
// (ha_entity_audit.json, generat 2026-08-21 din interogări read-only), completată
// cu entity_id-urile pentru binary_sensor.* şi update.* extrase din rezultatele
// MCP brute ale aceleiaşi sesiuni — vezi entities-binary-update.json.
//
// Fiecare intrare de aici provine dintr-un entity_id care apare EXPLICIT în
// audit. Nu există nimic dedus dintr-o convenţie de denumire: dacă auditul a
// confirmat doar friendly_name-ul unei entităţi, fără entity_id, slotul a
// rămas nemapat (VERIFY) — vezi UNMAPPED_REASONS de mai jos.

export const AUDIT_DATE = '2026-08-21';

export const SUGGESTED_MAP = {
  // ---------------------------------------------------------------- CLIMAT
  'climate.vortex': 'climate.aux_cloud_ec0baeae4fb7_ac',
  'climate.etaj': 'climate.etaj_aer_conditionat_lg_etaj',
  'climate.vivax': 'climate.mansarda_aer_conditionat_vivax_mansarda',
  // Confirmate manual în appul LG ThinQ (2026-08-21): decalaje în minute, nu ore
  // fixe. Remapate 2026-08-22 de pe sensor.* pe number.* la cererea explicită a
  // utilizatorului: number.* e controlabil (number.set_value), sensor.* e doar
  // oglinda read-only. Unitatea declarată de number ('h') e greşită — etichetele
  // noastre spun explicit "(min)", valoarea brută fiind aceeaşi pe ambele.
  'sensor.lg_pornire_min': 'number.etaj_aer_conditionat_lg_etaj_schedule_turn_on',
  'sensor.lg_oprire_min': 'number.etaj_aer_conditionat_lg_etaj_schedule_turn_off',
  'sensor.lg_somn_min': 'number.etaj_aer_conditionat_lg_etaj_sleep_timer',
  'switch.lg_economie': 'switch.etaj_aer_conditionat_lg_etaj_energy_saving',
  // Serii de istoric (senzori cu recorder confirmat: envtemp 1305 pct/3 zile,
  // setpoint 145, ac_etaj_ambient 37, vivax_ambient 201 — verificat 2026-08-22)
  'sensor.mans_ambient': 'sensor.aux_cloud_ec0baeae4fb7_envtemp',
  'sensor.mans_setpoint': 'sensor.aux_cloud_ec0baeae4fb7_temp',
  'sensor.lg_ambient': 'sensor.ac_etaj_ambient',
  'sensor.vv_ambient': 'sensor.vivax_ambient',
  // Funcţiile Vortex — switch-uri AUX Cloud dedicate (entitatea climate nu are
  // preset_modes, deci vechea potrivire pe preset nu putea funcţiona niciodată).
  'switch.vx_eco': 'switch.aux_cloud_ec0baeae4fb7_ecomode',
  'switch.vx_noapte': 'switch.aux_cloud_ec0baeae4fb7_ac_slp',
  'switch.vx_health': 'switch.aux_cloud_ec0baeae4fb7_ac_health',
  'switch.vx_comfwind': 'switch.aux_cloud_ec0baeae4fb7_comfwind',
  'switch.vx_antimucegai': 'switch.aux_cloud_ec0baeae4fb7_mldprf',
  'switch.vx_blocare': 'switch.aux_cloud_ec0baeae4fb7_childlock',
  'switch.vx_afisaj': 'switch.aux_cloud_ec0baeae4fb7_scrdisp',
  'switch.vx_autocuratare': 'switch.aux_cloud_ec0baeae4fb7_ac_clean',

  // -------------------------------------------------------------- PISCINĂ
  'switch.pompa_filtrare': 'switch.filter_pump',
  'climate.pompa_caldura': 'climate.pompa_caldura_piscina',
  'sensor.apa_temp': 'sensor.piscina_temperatura_apa',
  'sensor.pc_consum': 'sensor.pompa_caldura_piscina_power',
  'binary_sensor.pc_debit': 'binary_sensor.pompa_caldura_piscina_water_flow',
  'binary_sensor.pc_problema': 'binary_sensor.pompa_caldura_piscina_problem',
  'switch.clorinator': 'switch.production',
  'switch.clorinator_redus': 'switch.low',
  'switch.clorinator_boost': 'switch.boost',
  'number.clor_productie': 'sensor.piscina_productie_clor',
  'sensor.ph': 'sensor.piscina_ph',
  'number.ph_tinta': 'sensor.camera_tehnica_piscina_clorinator_piscina_ph_target_corect',
  'sensor.orp': 'sensor.piscina_orp',
  'number.orp_tinta': 'sensor.orp_sp',
  'sensor.clor_amperaj': 'sensor.amp',
  'sensor.clor_stare_exo': 'sensor.exo_state',
  'sensor.clor_dual_link': 'sensor.dual_link',
  'sensor.clor_cod_eroare': 'sensor.error_code',
  'sensor.clor_stare_eroare': 'sensor.error_state',

  // ---------------------------------------------------------------- MEDIA
  // Cele 5 televizoare Samsung au şi remote.*; folosim media_player.*, aşa cum ai cerut.
  'media.mansarda': 'media_player.mansarda_televizor_mansarda_lg',
  'media.bucatarie': 'media_player.parter_televizor_bucatarie_samsung',
  'media.sofia_parter': 'media_player.parter_televizor_sofia_parter_samsung',
  'media.dormitor_sofia': 'media_player.etaj_televizor_dormitor_sofia_etaj_samsung',
  'media.etaj_hisense': 'media_player.etaj_televizor_dormitor_etaj_hisense_television',
  'media.etaj_hisense_mute': 'switch.etaj_televizor_dormitor_etaj_hisense_mute',
  'media.foisor': 'media_player.foisor_televizor_foisor_samsung',
  'media.tata_bucatarie': 'media_player.casa_tata_televizor_tata_bucatarie_samsung',
  'media.tata_dormitor': 'media_player.casa_tata_televizor_tata_dormitor_lg_2',

  // --------------------------------------------------------------- CAMERE
  'camera.poarta': 'camera.camera_poarta_fata_profile001',
  'camera.curte_fata': 'camera.camera_curte_fata_profile001',
  'camera.curte_piscina': 'camera.camera_curte_piscina_profile001',
  'camera.curte_spate': 'camera.camera_curte_spate_profile001',
  'camera.speed_dome': 'camera.camera_speed_dome_mediaprofile_channel1_substream1',
  'light.ir_poarta': 'switch.camera_poarta_fata_ir_lamp',
  'light.ir_curte_fata': 'switch.camera_curte_fata_ir_lamp',
  'light.ir_curte_piscina': 'switch.camera_curte_piscina_ir_lamp',
  'light.ir_curte_spate': 'switch.camera_curte_spate_ir_lamp',
  'light.ir_speed_dome': 'switch.camera_speed_dome_ir_lamp',
  'switch.stergator_speed_dome': 'switch.camera_speed_dome_wiper',

  // ---------------------------------------------------------------- REŢEA
  'net.wan_link': 'binary_sensor.gateway_principal_port_1_internet_link',
  'net.connectivity': 'binary_sensor.gateway_principal_port_1_online_detection',
  'net.lan2': 'binary_sensor.gateway_principal_port_2_lan_status',
  'net.lan3': 'binary_sensor.gateway_principal_port_3_lan_status',
  'net.lan4': 'binary_sensor.gateway_principal_port_4_lan_status',
  'net.lan5': 'binary_sensor.gateway_principal_port_5_lan_status',
  'net.lan6': 'binary_sensor.gateway_principal_port_6_lan_status',
  'net.lan7': 'binary_sensor.gateway_principal_port_7_lan_status',
  'net.gw_fw': 'update.gateway_principal_firmware',
  'net.sw_fw': 'update.switch_principal_firmware',
  'net.gw_state': 'sensor.gateway_principal_device_status',
  'net.gw_cpu': 'sensor.gateway_principal_cpu_usage',
  'net.gw_mem': 'sensor.gateway_principal_memory_usage',
  'net.sw_state': 'sensor.switch_principal_device_status',
  'net.sw_cpu': 'sensor.switch_principal_cpu_usage',
  'net.sw_mem': 'sensor.switch_principal_memory_usage',
  'net.ap_parter_cpu': 'sensor.eap_parter_cpu_usage',
  'net.ap_parter_mem': 'sensor.eap_parter_memory_usage',
  'net.ap_etaj_cpu': 'sensor.eap_etaj_cpu_usage',
  'net.ap_etaj_mem': 'sensor.eap_etaj_memory_usage',
  'net.ap_mansarda_cpu': 'sensor.eap_mansarda_cpu_usage',
  'net.ap_mansarda_mem': 'sensor.eap_mansarda_memory_usage',
  'net.ap_foisor_cpu': 'sensor.eap_foisor_cpu_usage',
  'net.ap_foisor_mem': 'sensor.eap_foisor_memory_usage',
  'net.ap_casa_fata_cpu': 'sensor.eap_casa_fata_cpu_usage',
  'net.ap_casa_fata_mem': 'sensor.eap_casa_fata_memory_usage',
  'net.poe1': 'sensor.switch_principal_port_1_poe_power',
  'net.poe2': 'sensor.switch_principal_port_2_poe_power',
  'net.poe3': 'sensor.switch_principal_port_3_poe_power',
  'net.poe4': 'sensor.switch_principal_port_4_poe_power',
  'net.poe5': 'sensor.switch_principal_port_5_poe_power',
  'net.poe6': 'sensor.switch_principal_port_6_poe_power',
  'net.poe7': 'sensor.switch_principal_port_7_poe_power',
  'net.poe8': 'sensor.switch_principal_port_8_poe_power',
  // Switch Foişor (ES206XPP-M2, A8-29-48-ED-C7-2D) — DOAR senzori read-only;
  // switch.a8_*_poe (comutare PoE) rămâne interzis pe dashboard.
  'net.swf_state': 'sensor.a8_29_48_ed_c7_2d_device_status',
  'net.swf_cpu': 'sensor.a8_29_48_ed_c7_2d_cpu_usage',
  'net.swf_mem': 'sensor.a8_29_48_ed_c7_2d_memory_usage',
  'net.swf_poe1': 'sensor.a8_29_48_ed_c7_2d_port_1_poe_power',
  'net.swf_poe2': 'sensor.a8_29_48_ed_c7_2d_port_2_poe_power',
  'net.swf_poe3': 'sensor.a8_29_48_ed_c7_2d_port_3_poe_power',
  'net.swf_poe4': 'sensor.a8_29_48_ed_c7_2d_port_4_poe_power',
  // Switch Etaj (ES206X-M2, A8-29-48-EE-DE-FC) — fără PoE.
  'net.swe_state': 'sensor.a8_29_48_ee_de_fc_device_status',
  'net.swe_cpu': 'sensor.a8_29_48_ee_de_fc_cpu_usage',
  'net.swe_mem': 'sensor.a8_29_48_ee_de_fc_memory_usage',

  // -------------------------------------------------------------- ENERGIE
  'energy.ac_etaj_azi': 'sensor.etaj_aer_conditionat_lg_etaj_energy_today',
  'energy.ac_etaj_ieri': 'sensor.etaj_aer_conditionat_lg_etaj_energy_yesterday',
  'energy.ac_etaj_luna': 'sensor.etaj_aer_conditionat_lg_etaj_energy_this_month',
  'energy.ac_etaj_luna_trecuta': 'sensor.etaj_aer_conditionat_lg_etaj_energy_last_month',
  // Nu există contor general al casei; singura energie măsurată e AC Etaj LG.
  // Inelul de pe Acasă e mapat pe ea, iar etichetele UI spun explicit "AC Etaj",
  // ca să nu pretindă că e totalul casei. De înlocuit când apare Growatt/contor.
  'energy.total_luna': 'sensor.etaj_aer_conditionat_lg_etaj_energy_this_month',

  // ---------------------------------------------------------- MENTENANŢĂ
  // Indicatori add-on-uri (activate din registry 2026-08-22; erau
  // disabled_by:integration). Read-only — switch.fusion etc. NU se mapează.
  'addon.fusion': 'binary_sensor.fusion_running',
  'addon.get_hacs': 'binary_sensor.get_hacs_running',
  'addon.home_dashboard': 'binary_sensor.home_dashboard_running',
  'addon.matter_server': 'binary_sensor.matter_server_running',
  'upd.ha_core': 'update.home_assistant_core_update',
  'upd.ha_os': 'update.home_assistant_operating_system_update',
  'upd.supervisor': 'update.home_assistant_supervisor_update',
  'upd.matter': 'update.matter_server_update',
  'upd.hacs': 'update.hacs_update',
  'upd.net_gw': 'update.gateway_principal_firmware',
  'upd.net_sw': 'update.switch_principal_firmware',
  'upd.eap_parter': 'update.eap_parter_firmware',
  'upd.eap_etaj': 'update.eap_etaj_firmware',
  'upd.eap_mansarda': 'update.eap_mansarda_firmware',
  'upd.eap_foisor': 'update.eap_foisor_firmware',
  'upd.eap_casa_fata': 'update.eap_casa_fata_firmware',
  'backup.state': 'sensor.backup_backup_manager_state',
  'backup.last': 'sensor.backup_last_successful_automatic_backup',
  'backup.next': 'sensor.backup_next_scheduled_automatic_backup',
  'auto.alerta_clorinator': 'automation.alerta_clorinator_piscina',
  'auto.clear_clorinator': 'automation.clear_clorinator_piscina',
  'auto.alerta_pompa_caldura': 'automation.alerta_pompa_caldura_piscina',
  'diag.vortex_eroare': 'sensor.aux_cloud_ec0baeae4fb7_err_flag',
  'diag.vortex_limita_putere': 'number.aux_cloud_ec0baeae4fb7_pwrlimit',
  'diag.integrare_vivax': 'climate.mansarda_aer_conditionat_vivax_mansarda',
  'diag.integrare_fairland': 'climate.pompa_caldura_piscina',

  // -------------------------------------------------------------- GENERAL
  'weather.main': 'weather.forecast_home',
  'sensor.baterie_telefon': 'sensor.s26_ultra_battery_level',
  'sensor.lista_cumparaturi': 'todo.shopping_list'
};

/**
 * De ce a rămas fiecare slot nemapat. Se afişează în ecranul de mapare, ca să
 * ştii dacă e ceva de completat sau pur şi simplu nu există în HA.
 */
export const UNMAPPED_REASONS = {
  // Gol din v1.0.6: cele 3 sloturi fără corespondent hardware (temp exterior,
  // debit pompă, consum pompă filtrare) au fost eliminate din catalog cu totul,
  // nu doar lăsate nemapate. Toate sloturile rămase au mapare din audit.
};

/**
 * Aplică propunerea peste maparea curentă.
 * Nu suprascrie nimic din ce ai ales deja manual.
 */
export function applySuggested(currentMap, states) {
  const next = Object.assign({}, currentMap || {});
  let added = 0, skipped = 0, missing = [];
  Object.keys(SUGGESTED_MAP).forEach((slotKey) => {
    if (next[slotKey]) {
      skipped++;
      return;
    }
    const id = SUGGESTED_MAP[slotKey];
    if (states && Object.keys(states).length && !states[id]) missing.push(slotKey + ' → ' + id);
    next[slotKey] = id;
    added++;
  });
  return { map: next, added, skipped, missing };
}
