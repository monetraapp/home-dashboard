// Traduce descriptorii de acţiune din devices.js în comenzi reale către HA.
// Dacă o acţiune nu poate fi rezolvată cu certitudine, întoarce supported:false
// şi motivul — controlul rămâne vizibil, dar dezactivat şi marcat VERIFY.

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
      return Object.assign({}, noop, { reason: 'Unitatea nu raportează modul „' + action.v + '".' });
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
        reason: 'VERIFY · nu găsesc o treaptă de ventilator care să corespundă (' + action.kw.join(', ') + ').'
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
    if (!m) return Object.assign({}, noop, { reason: 'VERIFY · modul de baleiaj nu a putut fi identificat.' });
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
      return Object.assign({}, noop, { reason: 'VERIFY · unitatea nu expune baleiaj.' });
    }
    const offMode = list.find(isSwingOff);
    const onMode = E.matchOption(list, ['both', 'vertical', 'on', 'ambele', 'pornit']) || list.find((x) => !isSwingOff(x));
    if (!offMode || !onMode) {
      return Object.assign({}, noop, { reason: 'VERIFY · nu pot determina perechea pornit/oprit pentru baleiaj.' });
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
        reason: 'VERIFY · unitatea nu expune presetul (' + action.kw.join(', ') + ').'
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
    const list = E.sourceList(cardSlot);
    const m = E.matchOption(list, action.kw);
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
