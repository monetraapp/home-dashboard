// Traduce descriptorii de acţiune din devices.js în comenzi reale către HA.
// Dacă o acţiune nu poate fi rezolvată cu certitudine, întoarce supported:false
// şi motivul. `structural: true` (v1.3.2) marchează cazurile PERMANENTE —
// hardware-ul/integrarea nu expune funcţia deloc (bit de supported_features
// lipsă, mod/sursă absente din listele entităţii). Modalul le ELIMINĂ
// (regula proiectului: un control fără entitate reală nu se afişează);
// cazurile tranzitorii (TV în standby, entitate indisponibilă) rămân
// vizibile, dezactivate, cu motivul în tooltip.

const SWING_OFF = ['off', 'oprit', 'stop', 'fixed', 'none'];

function isSwingOff(v) {
  const s = String(v || '').toLowerCase();
  return SWING_OFF.some((x) => s === x || s.indexOf(x) >= 0);
}

export function resolveAction(E, cardSlot, action) {
  const noop = { supported: false, active: false, reason: '', run: () => {} };
  if (!action) return noop;

  if (action.k === 'none') {
    return Object.assign({}, noop, { reason: action.why });
  }

  if (action.k === 'slot') {
    if (!E.mapped(action.slot)) {
      return Object.assign({}, noop, { reason: 'VERIFY · slot nemapat: ' + action.slot });
    }
    return {
      supported: true,
      active: E.isOn(action.slot),
      reason: '',
      run: () => E.toggle(action.slot)
    };
  }

  // (v2.7.0) Preset de culoare. Trimite rgb_color si atat — niciodata canalul
  // alb al lui RGBW. `active` compara cu culoarea raportata de lampa, cu o mica
  // toleranta: controlerul intoarce uneori valori vecine (ex. 0,1,255 pentru
  // albastru pur), iar o comparatie exacta ar lasa presetul mereu neaprins.
  if (action.k === 'rgb') {
    if (!E.mapped(cardSlot)) {
      return Object.assign({}, noop, { reason: 'VERIFY · slot nemapat: ' + cardSlot });
    }
    if (!E.available(cardSlot)) {
      return Object.assign({}, noop, { reason: 'Lampa e indisponibila.' });
    }
    const cur = E.rgbColor(cardSlot);
    const aproape = Array.isArray(cur) && cur.every((x, i) => Math.abs(x - action.rgb[i]) <= 8);
    return {
      supported: true,
      active: !!aproape && E.isOn(cardSlot),
      reason: '',
      hint: 'rgb_color: ' + action.rgb.join(', '),
      run: () => E.setRgb(cardSlot, action.rgb)
    };
  }

  if (action.k === 'numberFrac') {
    if (!E.mapped(action.slot)) {
      return Object.assign({}, noop, { reason: 'VERIFY · slot nemapat: ' + action.slot });
    }
    if (!E.numberWritable(action.slot)) {
      return Object.assign({}, noop, { reason: 'Entitatea mapată e doar senzor — nu se poate seta o valoare.' });
    }
    const b = E.numberBounds(action.slot, 0, 100, 1);
    const raw = b.min + action.frac * (b.max - b.min);
    const target = Math.round(raw / b.step) * b.step;
    const cur = E.numberValue(action.slot);
    return {
      supported: true,
      active: cur !== null && Math.abs(cur - target) < b.step / 2,
      reason: '',
      hint: 'trimite ' + target + (E.attr(action.slot, 'unit_of_measurement') || ''),
      run: () => E.setNumber(action.slot, target)
    };
  }

  // de aici încolo, toate acţiunile ţin de entitatea cardului
  if (!E.mapped(cardSlot)) {
    return Object.assign({}, noop, { reason: 'VERIFY · cardul nu are entitate mapată' });
  }
  if (!E.available(cardSlot)) {
    return Object.assign({}, noop, { reason: 'Entitatea e indisponibilă în HA acum.' });
  }

  if (action.k === 'hvac') {
    const modes = E.attr(cardSlot, 'hvac_modes') || [];
    if (modes.indexOf(action.v) < 0) {
      return Object.assign({}, noop, { structural: true, reason: 'Unitatea nu raportează modul „' + action.v + '".' });
    }
    return {
      supported: true,
      active: E.rawState(cardSlot) === action.v,
      reason: '',
      run: () => E.setHvacMode(cardSlot, action.v)
    };
  }

  if (action.k === 'fan') {
    const list = E.attr(cardSlot, 'fan_modes');
    const m = E.matchOption(list, action.kw);
    if (!m) {
      return Object.assign({}, noop, {
        structural: true,
        reason: 'Unitatea nu expune o treaptă de ventilator care să corespundă (' + action.kw.join(', ') + ').'
      });
    }
    return {
      supported: true,
      active: E.attr(cardSlot, 'fan_mode') === m,
      reason: '',
      hint: 'fan_mode: ' + m,
      run: () => E.setFanMode(cardSlot, m)
    };
  }

  if (action.k === 'swing') {
    const list = E.attr(cardSlot, 'swing_modes');
    const m = E.matchOption(list, action.kw);
    if (!m) return Object.assign({}, noop, { structural: true, reason: 'Unitatea nu expune acest mod de baleiaj.' });
    return {
      supported: true,
      active: E.attr(cardSlot, 'swing_mode') === m,
      reason: '',
      hint: 'swing_mode: ' + m,
      run: () => E.setSwingMode(cardSlot, m)
    };
  }

  if (action.k === 'swingToggle') {
    const list = E.attr(cardSlot, 'swing_modes');
    if (!Array.isArray(list) || list.length < 2) {
      return Object.assign({}, noop, { structural: true, reason: 'Unitatea nu expune baleiaj.' });
    }
    const offMode = list.find(isSwingOff);
    const onMode = E.matchOption(list, ['both', 'vertical', 'on', 'ambele', 'pornit']) || list.find((x) => !isSwingOff(x));
    if (!offMode || !onMode) {
      return Object.assign({}, noop, { structural: true, reason: 'Nu pot determina perechea pornit/oprit pentru baleiaj.' });
    }
    const cur = E.attr(cardSlot, 'swing_mode');
    const on = !isSwingOff(cur);
    return {
      supported: true,
      active: on,
      reason: '',
      hint: 'swing_mode: ' + (on ? offMode : onMode),
      run: () => E.setSwingMode(cardSlot, on ? offMode : onMode)
    };
  }

  if (action.k === 'preset') {
    const list = E.attr(cardSlot, 'preset_modes');
    const m = E.matchOption(list, action.kw);
    if (!m) {
      return Object.assign({}, noop, {
        structural: true,
        reason: 'Unitatea nu expune presetul (' + action.kw.join(', ') + ').'
      });
    }
    const cur = E.attr(cardSlot, 'preset_mode');
    const isActive = cur === m;
    const noneMode = E.matchOption(list, ['none', 'off', 'niciunul']) || null;
    return {
      supported: true,
      active: isActive,
      reason: '',
      hint: 'preset_mode: ' + m,
      run: () => E.setPresetMode(cardSlot, isActive && noneMode ? noneMode : m)
    };
  }

  if (action.k === 'source') {
    // media_player: SELECT_SOURCE = bit 2048 din supported_features
    if (!E.supportsFeature(cardSlot, 2048)) {
      return Object.assign({}, noop, { structural: true, reason: 'Televizorul nu expune schimbarea sursei prin media_player.' });
    }
    const list = E.sourceList(cardSlot);
    const m = E.matchOption(list, action.kw);
    // Absenţa dintr-o listă NEVIDĂ e structurală şi se verifică ÎNAINTE de
    // standby — altfel standby-ul ar masca-o şi butonul inexistent (ex.
    // YouTube pe Hisense/HomeKit) ar reapărea cu TV-ul stins. Pe Samsung
    // lista se repopulează cu aplicaţii la pornire, deci butonul revine.
    if (Array.isArray(list) && list.length && !m) {
      return Object.assign({}, noop, {
        structural: true,
        reason: 'Sursa nu apare în source_list (' + action.kw.join(', ') + ').'
      });
    }
    // TV oprit: comanda ar eşua garantat ("Device is off and cannot be controlled")
    if (E.rawState(cardSlot) === 'off' || E.rawState(cardSlot) === 'standby') {
      return Object.assign({}, noop, { reason: 'TV în standby — porneşte-l întâi.' });
    }
    if (!m) {
      return Object.assign({}, noop, {
        reason: 'VERIFY · sursa nu apare în source_list (' + action.kw.join(', ') + ').'
      });
    }
    return {
      supported: true,
      active: E.currentSource(cardSlot) === m,
      reason: '',
      hint: 'sursă: ' + m,
      run: () => E.selectSource(cardSlot, m)
    };
  }

  if (action.k === 'mute') {
    // media_player: VOLUME_MUTE = bit 8. Hisense (HomeKit) NU îl are — acolo
    // cardul foloseşte switch-ul dedicat de mute (A.slot), nu această acţiune.
    if (!E.supportsFeature(cardSlot, 8)) {
      return Object.assign({}, noop, { structural: true, reason: 'Televizorul nu expune mute prin media_player.' });
    }
    if (E.rawState(cardSlot) === 'off' || E.rawState(cardSlot) === 'standby') {
      return Object.assign({}, noop, { reason: 'TV în standby — porneşte-l întâi.' });
    }
    const muted = E.isMuted(cardSlot);
    return {
      supported: true,
      active: muted,
      reason: '',
      run: () => E.setMute(cardSlot, !muted)
    };
  }

  return noop;
}
