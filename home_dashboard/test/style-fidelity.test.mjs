// Compară string-urile de stil produse de tokens.js cu cele din designul
// original (Home Dashboard.dc.html). Dacă o valoare se abate, designul a
// regresat — testul pică şi îţi arată exact ce s-a schimbat.
import fs from 'node:fs';
import vm from 'node:vm';
import * as T from '../src/design/tokens.js';

const src = fs.readFileSync(new URL('../../Home Dashboard.dc.html', import.meta.url), 'utf8');
const lines = src.split('\n');
// blocul de constante + helper-e de stil din scriptul designului
const slice = lines.slice(889, 900).join('\n') + '\n' + lines.slice(1277, 1320).join('\n');

const ctx = { React: { createElement: () => ({}) } };
vm.createContext(ctx);
vm.runInContext(slice, ctx);
// STATE_COLORS e definit mai jos în fişier
vm.runInContext(lines.slice(2307, 2311).join('\n'), ctx);

let pass = 0, fail = 0;
function same(name, a, b) {
  if (a === b) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  DIFERIT ' + name + '\n    original: ' + a + '\n    portat  : ' + b); }
}

same('glassCard', ctx.glassCard(), T.glassCard());
[true, false].forEach((v) => {
  same('navItemStyle(' + v + ')', ctx.navItemStyle(v), T.navItemStyle(v));
  same('navIconBox(' + v + ')', ctx.navIconBox(v), T.navIconBox(v));
  same('navLabel(' + v + ')', ctx.navLabel(v), T.navLabel(v));
  same('iconWrapFor(' + v + ')', ctx.iconWrapFor(v), T.iconWrapFor(v));
  same('labelFor(' + v + ')', ctx.labelFor(v), T.labelFor(v));
  same('togglePill(' + v + ')', ctx.togglePill(v), T.togglePill(v));
  same('toggleKnob(' + v + ')', ctx.toggleKnob(v), T.toggleKnob(v));
  same('toggleText(' + v + ')', ctx.toggleText(v), T.toggleText(v));
  same('moveBtn(' + v + ')', ctx.moveBtn(v), T.moveBtn(v));
  same('valueFor(' + v + ',"x")', ctx.valueFor(v, 'x'), T.valueFor(v, 'x'));
  same('valueFor(' + v + ',"")', ctx.valueFor(v, ''), T.valueFor(v, ''));
  [true, false].forEach((t2) => same('tileStyleFor(' + v + ',' + t2 + ')', ctx.tileStyleFor(v, t2), T.tileStyleFor(v, t2)));
});
same('TIP_STYLE', ctx.TIP_STYLE, T.TIP_STYLE);
same('PILL_ON', ctx.PILL_ON, T.PILL_ON);
same('PILL_OFF', ctx.PILL_OFF, T.PILL_OFF);
same('PILL_SHADOW_ON', ctx.PILL_SHADOW_ON, T.PILL_SHADOW_ON);
same('PILL_SHADOW_OFF', ctx.PILL_SHADOW_OFF, T.PILL_SHADOW_OFF);
same('KNOB_ON', ctx.KNOB_ON, T.KNOB_ON);
same('KNOB_OFF', ctx.KNOB_OFF, T.KNOB_OFF);
same('KNOB_SHADOW', ctx.KNOB_SHADOW, T.KNOB_SHADOW);
same('CARD_BG', ctx.CARD_BG, T.CARD_BG);
same('CARD_BORDER', ctx.CARD_BORDER, T.CARD_BORDER);
same('SANS', ctx.SANS, T.SANS);
same('SERIF', ctx.SERIF, T.SERIF);
same('DOTO', ctx.DOTO, T.DOTO);
same('ORANGE', ctx.ORANGE, T.ORANGE);
same('ORANGE_HI', ctx.ORANGE_HI, T.ORANGE_HI);
same('TXT', ctx.TXT, T.TXT);
same('STATE_COLORS', JSON.stringify(ctx.STATE_COLORS), JSON.stringify(T.STATE_COLORS));

console.log('\n' + pass + ' identice, ' + fail + ' diferite');
process.exit(fail ? 1 : 0);
