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
  'climate.casa_tata': 'climate.ac_casa_tata_ac_casa_tata',
  'climate.foisor': 'climate.ac_foisor_ac_foisor',
  // Timer-ele LG (v1.5.4): controlul merge prin bridge-ul lg_thinq_timers,
  // NU prin number.set_value (no-op în ThinQ — fără alt_setter). Maparea pe
  // number.* rămâne pentru sloturile de DIAGNOSTIC read-only din acordeon.
  'sensor.lg_pornire_min': 'number.etaj_aer_conditionat_lg_etaj_schedule_turn_on',
  'sensor.lg_oprire_min': 'number.etaj_aer_conditionat_lg_etaj_schedule_turn_off',
  'sensor.lg_somn_min': 'number.etaj_aer_conditionat_lg_etaj_sleep_timer',
  'switch.lg_economie': 'switch.etaj_aer_conditionat_lg_etaj_energy_saving',
  // Programare la oră exactă (v1.7.0) — helpere HA, nu cloud LG.
  'prog.pornire_activ': 'input_boolean.ac_etaj_prog_pornire_activ',
  'prog.pornire_ora': 'input_datetime.ac_etaj_prog_pornire_ora',
  'prog.pornire_repeta': 'input_select.ac_etaj_prog_pornire_repeta',
  'prog.pornire_zi_lu': 'input_boolean.ac_etaj_prog_pornire_zi_lu',
  'prog.pornire_zi_ma': 'input_boolean.ac_etaj_prog_pornire_zi_ma',
  'prog.pornire_zi_mi': 'input_boolean.ac_etaj_prog_pornire_zi_mi',
  'prog.pornire_zi_jo': 'input_boolean.ac_etaj_prog_pornire_zi_jo',
  'prog.pornire_zi_vi': 'input_boolean.ac_etaj_prog_pornire_zi_vi',
  'prog.pornire_zi_sa': 'input_boolean.ac_etaj_prog_pornire_zi_sa',
  'prog.pornire_zi_du': 'input_boolean.ac_etaj_prog_pornire_zi_du',
  'prog.pornire_mod': 'input_select.ac_etaj_prog_pornire_mod',
  'prog.pornire_ventilator': 'input_select.ac_etaj_prog_pornire_ventilator',
  'prog.pornire_temp_activ': 'input_boolean.ac_etaj_prog_pornire_temp_activ',
  'prog.pornire_temp': 'input_number.ac_etaj_prog_pornire_temp',
  'prog.pornire_ultima': 'input_datetime.ac_etaj_prog_pornire_ultima',
  'prog.pornire_urmatoarea': 'sensor.ac_etaj_prog_pornire_urmatoarea',
  'prog.oprire_activ': 'input_boolean.ac_etaj_prog_oprire_activ',
  'prog.oprire_ora': 'input_datetime.ac_etaj_prog_oprire_ora',
  'prog.oprire_repeta': 'input_select.ac_etaj_prog_oprire_repeta',
  'prog.oprire_zi_lu': 'input_boolean.ac_etaj_prog_oprire_zi_lu',
  'prog.oprire_zi_ma': 'input_boolean.ac_etaj_prog_oprire_zi_ma',
  'prog.oprire_zi_mi': 'input_boolean.ac_etaj_prog_oprire_zi_mi',
  'prog.oprire_zi_jo': 'input_boolean.ac_etaj_prog_oprire_zi_jo',
  'prog.oprire_zi_vi': 'input_boolean.ac_etaj_prog_oprire_zi_vi',
  'prog.oprire_zi_sa': 'input_boolean.ac_etaj_prog_oprire_zi_sa',
  'prog.oprire_zi_du': 'input_boolean.ac_etaj_prog_oprire_zi_du',
  'prog.oprire_ultima': 'input_datetime.ac_etaj_prog_oprire_ultima',
  'prog.oprire_urmatoarea': 'sensor.ac_etaj_prog_oprire_urmatoarea',
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
  // (v1.2.8) Comutatorul care aplică limita setată de number-ul pwrlimit.
  'switch.vx_limita': 'switch.aux_cloud_ec0baeae4fb7_pwrlimitswitch',

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
  // (v1.3.3) Remapat de pe media_player HomeKit (supported_features 18817,
  // fără VOLUME_SET) pe integrarea Vidaa MQTT (24461: VOLUME_SET+VOLUME_MUTE+
  // SELECT_SOURCE), împerecheată 2026-08-23 prin PIN + certificate mTLS, auth
  // static (dinamicul oscila pe MAC greşit). Volum 0-100 verificat stabil.
  // Cardul revine automat la cadran ACTIV (gatingul citește supported_features).
  'media.etaj_hisense': 'media_player.dormitor_etaj_tv_dormitor_etaj_vidaa',
  // Mute-ul rămâne pe switch-ul HomeKit dedicat până se confirmă în timp că
  // mute-ul Vidaa e la fel de fiabil (deși media_player-ul Vidaa are VOLUME_MUTE).
  'media.etaj_hisense_mute': 'switch.etaj_televizor_dormitor_etaj_hisense_mute',
  'media.foisor': 'media_player.foisor_televizor_foisor_samsung',
  'media.tata_bucatarie': 'media_player.casa_tata_televizor_tata_bucatarie_samsung',
  'media.tata_dormitor': 'media_player.casa_tata_televizor_tata_dormitor_lg_2',


  // --------------------------------------------------------------- LUMINI
  'light.birou_up': 'light.mansarda_led_birou_up',
  'light.birou_down': 'light.mansarda_led_birou_down',
  'power.birou_up': 'sensor.mansarda_led_birou_up_power',
  'power.birou_down': 'sensor.mansarda_led_birou_down_power',
  'energy.birou_up': 'sensor.mansarda_led_birou_up_energy',
  'energy.birou_down': 'sensor.mansarda_led_birou_down_energy',
  // Tensiunea si curentul pastreaza numele brut al dispozitivului: sunt
  // entitatile pe care integrarea Shelly le creeaza dezactivate si care au fost
  // activate manual, iar ele nu primesc prefixul de zona.
  'volt.birou_up': 'sensor.shellyplusrgbwpm_3076f53a16b4_voltage',
  'volt.birou_down': 'sensor.shellyplusrgbwpm_3076f53a156c_voltage',
  'curent.birou_up': 'sensor.shellyplusrgbwpm_3076f53a16b4_current',
  'curent.birou_down': 'sensor.shellyplusrgbwpm_3076f53a156c_current',

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
  // disabled_by:integration). Read-only — comutatoarele NU se mapează.
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
  // (v1.2.8) Firmware-ul switch-urilor Easy Managed (entităţile există în HA,
  // contrar comentariului vechi din pagina Reţea).
  'upd.net_swf': 'update.foisor_switch_foisor_firmware',
  'upd.net_swe': 'update.hol_etaj_switch_etaj_firmware',
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

  // ------------------------------------------- ENERGIE · GROWATT (v1.1.3)
  // Entity_id-urile provin din enumerarea live ha_get_device a device-ului
  // KNN2E3S00W (168 entităţi, 2026-08-22) — niciunul dedus din convenţii.
  'gw.pv_in': 'sensor.knn2e3s00w_pv_input_actual',
  'gw.pv_out': 'sensor.knn2e3s00w_pv_output_actual',
  'gw.sol_azi': 'sensor.knn2e3s00w_solar_energy_today',
  'gw.pv1_w': 'sensor.knn2e3s00w_pv1_watt',
  'gw.pv2_w': 'sensor.knn2e3s00w_pv2_watt',
  'gw.pv3_w': 'sensor.knn2e3s00w_pv3_watt',
  'gw.pv4_w': 'sensor.knn2e3s00w_pv4watt',
  'gw.pv1_v': 'sensor.knn2e3s00w_pv1_voltage',
  'gw.pv2_v': 'sensor.knn2e3s00w_pv2_voltage',
  'gw.pv3_v': 'sensor.knn2e3s00w_pv3_voltage',
  'gw.pv4_v': 'sensor.knn2e3s00w_pv4voltage',
  'gw.pv1_a': 'sensor.knn2e3s00w_pv1_current',
  'gw.pv2_a': 'sensor.knn2e3s00w_pv2_current',
  'gw.pv3_a': 'sensor.knn2e3s00w_pv3_current',
  'gw.pv4_a': 'sensor.knn2e3s00w_pv4current',
  'gw.pv1_azi': 'sensor.knn2e3s00w_solar_pv1_energy_today',
  'gw.pv2_azi': 'sensor.knn2e3s00w_solar_pv2_energy_today',
  'gw.pv3_azi': 'sensor.knn2e3s00w_epv3today',
  'gw.pv4_azi': 'sensor.knn2e3s00w_epv4today',
  'gw.pv1_tot': 'sensor.knn2e3s00w_solar_pv1_production_total',
  'gw.pv2_tot': 'sensor.knn2e3s00w_solar_pv2_production_total',
  'gw.pv3_tot': 'sensor.knn2e3s00w_epv3total',
  'gw.pv4_tot': 'sensor.knn2e3s00w_epv4total',
  'gw.gen_azi': 'sensor.knn2e3s00w_generated_energy_today',
  'gw.gen_tot': 'sensor.knn2e3s00w_generated_energy_total',
  'gw.pv_tot': 'sensor.knn2e3s00w_lifetime_solar_energy',
  'gw.pac': 'sensor.knn2e3s00w_pac',
  'gw.f1_v': 'sensor.knn2e3s00w_phase_1_voltage',
  'gw.f2_v': 'sensor.knn2e3s00w_phase_2_voltage',
  'gw.f3_v': 'sensor.knn2e3s00w_phase_3_voltage',
  'gw.f1_a': 'sensor.knn2e3s00w_phase_1_current',
  'gw.f2_a': 'sensor.knn2e3s00w_phase_2_current',
  'gw.f3_a': 'sensor.knn2e3s00w_phase_3_current',
  'gw.f1_p': 'sensor.knn2e3s00w_phase_1_power',
  'gw.f2_p': 'sensor.knn2e3s00w_phase_2_power',
  'gw.f3_p': 'sensor.knn2e3s00w_phase_3_power',
  'gw.v_rs': 'sensor.knn2e3s00w_vacrs',
  'gw.v_st': 'sensor.knn2e3s00w_vacst',
  'gw.v_tr': 'sensor.knn2e3s00w_vactr',
  'gw.frecv': 'sensor.knn2e3s00w_grid_frequency',
  'gw.frecv_pv': 'sensor.knn2e3s00w_pvfrequency',
  'gw.qac': 'sensor.knn2e3s00w_qac',
  'gw.sarcina': 'sensor.knn2e3s00w_realoppercent',
  'gw.p_nominal': 'sensor.knn2e3s00w_opfullwatt',
  'gw.soc': 'sensor.knn2e3s00w_soc',
  'gw.soh': 'sensor.knn2e3s00w_bmssoh',
  'gw.p_chr': 'sensor.knn2e3s00w_pchr',
  'gw.p_dischr': 'sensor.knn2e3s00w_pdischr',
  'gw.echr_azi': 'sensor.knn2e3s00w_echrtoday',
  'gw.echr_tot': 'sensor.knn2e3s00w_echrtotal',
  'gw.edis_azi': 'sensor.knn2e3s00w_edischrtoday',
  'gw.edis_tot': 'sensor.knn2e3s00w_edischrtotal',
  'gw.module': 'sensor.knn2e3s00w_parallelbatterynum',
  'gw.i_chr_max': 'sensor.knn2e3s00w_bmsmaxcurr',
  'gw.i_dis_max': 'sensor.knn2e3s00w_bmsmaxdischrcurr',
  'gw.bat_temp': 'sensor.knn2e3s00w_bmsbatterytemp',
  'gw.cel_temp_max': 'sensor.knn2e3s00w_bmsmaxcelltemp',
  'gw.bat_temp_med': 'sensor.knn2e3s00w_bmsbatteryavgtemp2',
  'gw.cel_v_max': 'sensor.knn2e3s00w_bmssinglevoltmax',
  'gw.cel_v_min': 'sensor.knn2e3s00w_bmssinglevoltmin',
  'gw.cel_nr_max': 'sensor.knn2e3s00w_bmsmaxvoltcellno',
  'gw.cel_nr_min': 'sensor.knn2e3s00w_bmsminvoltcellno',
  'gw.i_bat': 'sensor.knn2e3s00w_ibat',
  'gw.i_bb': 'sensor.knn2e3s00w_ibb',
  'gw.i_llc': 'sensor.knn2e3s00w_illc',
  'gw.bdc': 'sensor.knn2e3s00w_bdconoffstate',
  'gw.cerere_chr': 'sensor.knn2e3s00w_battneedchargerequestflag',
  'gw.p_export': 'sensor.knn2e3s00w_ptogridtotal',
  'gw.p_import': 'sensor.knn2e3s00w_ptousertotal',
  'gw.p_casa': 'sensor.knn2e3s00w_ptoloadtotal',
  'gw.exp_azi': 'sensor.knn2e3s00w_etogridtoday',
  'gw.exp_tot': 'sensor.knn2e3s00w_etogridtotal',
  'gw.imp_azi': 'sensor.knn2e3s00w_etousertoday',
  'gw.imp_tot': 'sensor.knn2e3s00w_etousertotal',
  'gw.self_azi': 'sensor.knn2e3s00w_eselftoday',
  'gw.self_tot': 'sensor.knn2e3s00w_eselftotal',
  'gw.sys_azi': 'sensor.knn2e3s00w_esystoday',
  'gw.eps_f': 'sensor.knn2e3s00w_epsfac',
  'gw.eps_v1': 'sensor.knn2e3s00w_epsvac1',
  'gw.eps_v2': 'sensor.knn2e3s00w_epsvac2',
  'gw.eps_v3': 'sensor.knn2e3s00w_epsvac3',
  'gw.eps_a1': 'sensor.knn2e3s00w_epsiac1',
  'gw.eps_a2': 'sensor.knn2e3s00w_epsiac2',
  'gw.eps_a3': 'sensor.knn2e3s00w_epsiac3',
  'gw.eps_p1': 'sensor.knn2e3s00w_epspac1',
  'gw.eps_p2': 'sensor.knn2e3s00w_epspac2',
  'gw.eps_p3': 'sensor.knn2e3s00w_epspac3',
  'gw.eps_p': 'sensor.knn2e3s00w_epspac',
  'gw.eps_sarcina': 'sensor.knn2e3s00w_load_percentage',
  'gw.t_inv': 'sensor.knn2e3s00w_inverter_temperature',
  'gw.t_ipm': 'sensor.knn2e3s00w_intelligent_power_management_temperature',
  'gw.t_pvimp': 'sensor.knn2e3s00w_pvimptemperature',
  'gw.t_boost': 'sensor.knn2e3s00w_boosttemperature',
  'gw.t_com': 'sensor.knn2e3s00w_comboardtemperature',
  'gw.t_a': 'sensor.knn2e3s00w_tempa',
  'gw.t_b': 'sensor.knn2e3s00w_tempb',
  'gw.v_bus': 'sensor.knn2e3s00w_busvoltage',
  'gw.v_bus_p': 'sensor.knn2e3s00w_pbusvoltage',
  'gw.v_bus_n': 'sensor.knn2e3s00w_nbusvoltage',
  'gw.v_bus1': 'sensor.knn2e3s00w_vbus1',
  'gw.v_bus2': 'sensor.knn2e3s00w_vbus2',
  'gw.v_bus2low': 'sensor.knn2e3s00w_vbus2low',
  'gw.ore': 'sensor.knn2e3s00w_working_time',
  'gw.gfci': 'sensor.knn2e3s00w_gfci',
  'gw.pf': 'sensor.knn2e3s00w_pf',
  'gw.delay': 'sensor.knn2e3s00w_invstartdelaytime',
  'gw.eac_chr_azi': 'sensor.knn2e3s00w_eacchrtoday',
  'gw.eac_chr_tot': 'sensor.knn2e3s00w_eacchrtotal',
  'gw.serial': 'sensor.knn2e3s00w_serial',
  'gw.dl_serial': 'sensor.knn2e3s00w_datalogger_serial',
  'gw.push': 'sensor.knn2e3s00w_grott_last_data_push',
  // --------------------------------- ENERGIE · CONTOR RACORD (v1.2.8)
  // Entity_id-urile provin din registrul de entităţi al device-ului MQTT
  // GPG0A450ZS (30 de senzori, citire 2026-08-23) — mapate DOAR cele 27
  // validate de auditul de coerenţă. pos_act_power / rev_act_power (dubluri
  // bit-cu-bit ale lui pos_rev_act_power, verificat pe istoric 36h) şi
  // power_factor total (0.833 raportat vs 0.79 = P/S calculat) NU au slot.
  'ctr.p_net': 'sensor.gpg0a450zs_pos_rev_act_power',
  'ctr.imp_tot': 'sensor.gpg0a450zs_pos_act_energy',
  'ctr.exp_tot': 'sensor.gpg0a450zs_rev_act_energy',
  'ctr.s_tot': 'sensor.gpg0a450zs_app_power',
  'ctr.q_tot': 'sensor.gpg0a450zs_react_power',
  'ctr.frecv': 'sensor.gpg0a450zs_grid_frequency',
  'ctr.f1_v': 'sensor.gpg0a450zs_phase1_voltage',
  'ctr.f2_v': 'sensor.gpg0a450zs_phase2_voltage',
  'ctr.f3_v': 'sensor.gpg0a450zs_phase3_voltage',
  'ctr.f1_a': 'sensor.gpg0a450zs_phase1_current',
  'ctr.f2_a': 'sensor.gpg0a450zs_phase2_current',
  'ctr.f3_a': 'sensor.gpg0a450zs_phase3_current',
  'ctr.f1_p': 'sensor.gpg0a450zs_active_power_l1',
  'ctr.f2_p': 'sensor.gpg0a450zs_active_power_l2',
  'ctr.f3_p': 'sensor.gpg0a450zs_active_power_l3',
  'ctr.f1_s': 'sensor.gpg0a450zs_apparent_power_l1',
  'ctr.f2_s': 'sensor.gpg0a450zs_apparent_power_l2',
  'ctr.f3_s': 'sensor.gpg0a450zs_apparent_power_l3',
  'ctr.f1_q': 'sensor.gpg0a450zs_reactive_power_l1',
  'ctr.f2_q': 'sensor.gpg0a450zs_reactive_power_l2',
  'ctr.f3_q': 'sensor.gpg0a450zs_reactive_power_l3',
  'ctr.f1_pf': 'sensor.gpg0a450zs_power_factor_l1',
  'ctr.f2_pf': 'sensor.gpg0a450zs_power_factor_l2',
  'ctr.f3_pf': 'sensor.gpg0a450zs_power_factor_l3',
  'ctr.serial': 'sensor.gpg0a450zs_serial',
  'ctr.dl_serial': 'sensor.gpg0a450zs_datalogger_serial',
  'ctr.push': 'sensor.gpg0a450zs_grott_last_data_push',
  // ------------------------------------- ENERGIE · INSTRUMENT (v1.1.5)
  // sun.sun verificat live 2026-08-22 (next_rising/next_setting prezente).
  'energie.soare': 'sun.sun',
  // Senzorii-oglindă template (creaţi + verificaţi 2026-08-22 la configurarea
  // Energy dashboard) — singurii cu state_class, deci cu statistici orare.
  'energie.stat_import': 'sensor.growatt_import_retea_total',
  'energie.stat_export': 'sensor.growatt_export_retea_total',
  'energie.stat_chr': 'sensor.growatt_baterie_incarcare_total',
  'energie.stat_dischr': 'sensor.growatt_baterie_descarcare_total',
  'energie.stat_soc': 'sensor.growatt_baterie_soc',
  // (v1.2.9) Oglinzile contorului de racord — create şi verificate 2026-08-23
  // (device_class/state_class/unit confirmate pe stările live).
  'energie.stat_ctr_imp': 'sensor.contor_import_total',
  'energie.stat_ctr_exp': 'sensor.contor_export_total',
  'energie.stat_ctr_f1': 'sensor.contor_faza_1_putere',
  'energie.stat_ctr_f2': 'sensor.contor_faza_2_putere',
  'energie.stat_ctr_f3': 'sensor.contor_faza_3_putere',
  // -------------------------------------------------------------- GENERAL
  // ---- poartă (v1.9.0) ------------------------------------------------------
  // Toate cinci sunt entităţi reale, verificate în instanţă. Niciuna nu descrie
  // poziţia porţii: nu există senzor de poziţie de mapat.
  'poarta.comanda': 'script.deschide_poarta',
  'poarta.releu': 'switch.curte_fata_poarta_intrare',
  'poarta.service': 'input_boolean.service_mode_poarta',
  'poarta.ultima': 'input_datetime.poarta_intrare_ultima_comanda',
  'poarta.cooldown': 'timer.poarta_intrare_cooldown_comanda',
  'poarta.intentie': 'input_boolean.poarta_deschidere_la_sosire',
  'poarta.intentie_timer': 'timer.poarta_intentie_sosire',

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
