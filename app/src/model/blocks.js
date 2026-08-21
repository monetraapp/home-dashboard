// Constructorii de blocuri si de elemente folositi de definitiile de pagini.
// Modul frunza: nu importa nimic din model/, ca sa nu apara cicluri.

// ------------------------------------------------------------------ helpers
/** Element read-only legat de un slot. */
export const ro = (icon, label, slot, opts) => ({ icon, label, slot, opts: opts || {}, toggleable: false });
/** Element cu text fix (fără entitate). */
export const txt = (icon, label, text) => ({ icon, label, text, toggleable: false });
/** Element comutabil (switch/light/automation/climate/media_player). */
export const sw = (icon, label, slot, opts) => ({ icon, label, slot, opts: opts || {}, toggleable: true });

export const grid = (cols, items) => ({ type: 'grid', cols, items });
export const monitor = (title, rows) => ({ type: 'monitor', title, rows });
export const note = (text) => ({ type: 'note', text });
export const slots = (items) => ({ type: 'slots', items });
export const nowPlaying = () => ({ type: 'nowPlaying' });
export const cameraGrid = (items) => ({ type: 'cameraGrid', items });
export const chart = (title, hint, series, unit, kind, yMin, yMax) => ({
  type: 'chart', title, hint, series, unit, kind: kind || 'line', yMin, yMax
});
export const timeline = (title, hint, rows, legend) => ({ type: 'timeline', title, hint, rows, legend });
export const accordion = (items) => ({ type: 'accordion', items });

/** Secţiune din interiorul unui rând de acordeon. */
export const sec = (title, cols, items) => ({ title, cols, items });
/** Element de control dintr-o secţiune de acordeon (acţiune reală pe entitate). */
export const act = (icon, label, action) => ({ icon, label, action, toggleable: true });
/** Valoare ţintă: temperatura entităţii climate a rândului. */
export const spClimate = (label) => ({ kind: 'climate', label });
/** Valoare ţintă: o entitate number / input_number. */
export const spNumber = (slot, label, unit) => ({ kind: 'number', slot, label, unit });

