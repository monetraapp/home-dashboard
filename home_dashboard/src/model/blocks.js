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

// ---------------------------------------------------------- energie (v1.1.3)
/** Rând-erou: valori mari. items = [{icon, label, slot, opts, flow}] unde
 * `flow` = {pos, neg, posLabel, negLabel, zeroLabel, unit} afişează sub valoare
 * direcţia netă dintre două sloturi de putere (ex. încărcare vs descărcare). */
export const stats = (items) => ({ type: 'stats', items });
/** Diagramă de flux energetic (v1.1.4, înlocuieşte bara orizontală):
 * 5 noduri (soare/invertor/baterie/casă/reţea) cu trasee SVG animate.
 * cfg = { pv, load, soc, chr, dischr, exp, imp } — chei de slot. */
export const flowdiagram = (cfg) => ({ type: 'flowdiagram', cfg });
/** Curbă de producţie pe ziua curentă (arie umplută, ore pe axa X).
 * slot = senzorul de putere din care se agregă istoricul recorder. */
export const daychart = (title, hint, slot, color) => ({ type: 'daychart', title, hint, slot, color });
/** Bare comparate vizual (ex. echilibrul celor 3 faze): items = [{label, slot}]. */
export const bars = (title, items, unit) => ({ type: 'bars', title, items, unit });
/** Secţiune cu rezumat vizibil şi detaliu extensibil. summary/detail = rânduri
 * de monitor ([etichetă, {slot, opts}]). `key` identifică starea deschis/închis. */
export const expand = (title, summary, detail, key) => ({ type: 'expand', title, summary, detail, key: key || title });

/** Secţiune din interiorul unui rând de acordeon. */
export const sec = (title, cols, items) => ({ title, cols, items });
/** Element de control dintr-o secţiune de acordeon (acţiune reală pe entitate). */
export const act = (icon, label, action) => ({ icon, label, action, toggleable: true });
/** Valoare ţintă: temperatura entităţii climate a rândului. */
export const spClimate = (label) => ({ kind: 'climate', label });
/** Valoare ţintă: o entitate number / input_number. */
/** Valoare ţintă numerică. `bounds` = {min,max,step} folosite DOAR când
 * entitatea nu îşi declară propriile limite (ex. senzori read-only). */
export const spNumber = (slot, label, unit, bounds) => ({ kind: 'number', slot, label, unit, bounds });

