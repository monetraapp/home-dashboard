// Audit automat de responsive (v1.1.6) — DOAR inventar, nu repară nimic.
//
// Rulare:
//   HD_HA_URL=http://192.168.0.100 HD_HA_TOKEN=<token> npm run audit:responsive
//   (pe Windows/PowerShell: $env:HD_HA_TOKEN='...'; npm run audit:responsive)
//
// Token-ul se citeşte EXCLUSIV din variabila de mediu — nu se scrie nicăieri
// pe disc şi nu apare în repo. Se injectează în localStorage-ul contextului
// Playwright (cheia hd.ha.config, aceeaşi pe care o scrie ecranul de Setup).
//
// Matricea: paginile CITITE din bara de navigaţie a aplicaţiei (v1.5.1 — nu
// mai sunt hardcodate) × lăţimile derivate din breakpoint-urile
// proiectului (MOBILE_MAX=760, NARROW_MAX=1180 în src/design/breakpoints.js):
// graniţele 759/760 şi 1179/1180, plus 360/390/414 (cerute explicit) şi 1440
// ca desktop tipic. Nicio lăţime inventată în afara acestora.
//
// Verificări per combinaţie: overflow orizontal (body + element vinovat),
// ţinte tactile <44×44, text tăiat de overflow:hidden, suprapuneri între
// fraţi, contrast text/fundal sub pragurile WCAG, elemente ieşite din
// viewport. Capturi full-page în audit/output/shots/<pagina>_<latime>.png.
//
// `--smoke`: verifică doar că lanţul porneşte (fără token; se opreşte pe
// ecranul de Setup şi face o captură) — util ca test al instalării.

import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'audit', 'output');
const SHOTS = path.join(OUT, 'shots');
const PORT = 4317;
const BASE = 'http://127.0.0.1:' + PORT;

const SMOKE = process.argv.includes('--smoke');
// HA serveşte direct pe portul 80 (aplicaţia se conectează la
// http://192.168.0.100, fără port). 8123 NU ascultă nimic — default-ul
// greşit :8123 a irosit o rundă întreagă de audit pe 22.08.
const HA_URL = process.env.HD_HA_URL || 'http://192.168.0.100';
const HA_TOKEN = process.env.HD_HA_TOKEN || '';

// Paginile — aceleaşi chei şi etichete ca în src/model/devices.js (NAV).
// Lista de pagini NU mai e hardcodată (v1.5.1). Se citeşte din bara de
// navigaţie a aplicaţiei, prin `[role="tab"][data-page]` — adică din chiar
// configuraţia de rute pe care o randează aplicaţia. Înainte era o copie
// manuală a lui NAV, iar pagina „Zone", adăugată în v1.5.0, n-a fost măsurată
// niciodată: raportul spunea 80 de combinaţii şi părea complet.
// `PAGES` se umple în runAudit, după prima încărcare.
let PAGES = [];
// Câte combinaţii au fost chiar auditate. Raportul îl pune lângă totalul
// teoretic: dacă cele două nu coincid, „0 probleme" nu înseamnă „curat",
// înseamnă „nemăsurat" — exact capcana din 24.08, când 8 pagini din 9 au
// picat la navigare şi raportul părea complet.
let masurate = 0;

async function citestePagini(pg) {
  const p = await pg.evaluate(() =>
    Array.from(document.querySelectorAll('[role="tab"][data-page]')).map((el) => [
      el.getAttribute('data-page'),
      el.getAttribute('aria-label') || ''
    ])
  );
  if (!p.length) {
    throw new Error(
      'Bara de navigaţie nu expune [role="tab"][data-page]. Auditul nu poate ' +
      'deriva lista de pagini şi se opreşte, ca să nu raporteze un subset ' +
      'drept întreg.'
    );
  }
  return p;
}

/**
 * Navigare rezistentă la eşecuri (v3 al auditului). Aplicaţia NU are rute URL
 * (pagina e stare React), deci echivalentul "navigării directe" e clickul pe
 * tab. Selecţia se face pe `[data-page="<cheie>"]` — identificator stabil —
 * NU pe textul vizibil.
 *
 * De ce s-a schimbat: v1.5.0 a ascuns eticheta de pe taburile inactive, iar
 * unealta căuta taburile prin `getByText(label, { exact: true })`. Rezultatul
 * a fost 8 pagini din 9 NEMĂSURATE, raportate ca 26 de probleme de navigaţie —
 * o unealtă care se rupe tăcut la o schimbare de prezentare. Mai rău: pentru
 * „Piscină" exista pe Acasă un alt element cu exact acelaşi text, deci clickul
 * a nimerit un element greşit şi eşecul a apărut abia la verificarea de final.
 *
 * Ordinea:
 *   1) click normal Playwright (detectează interceptări reale — le raportăm);
 *   2) click programatic prin evaluate;
 *   3) verificare că pagina chiar s-a schimbat, pe `aria-selected` — tot un
 *      identificator stabil, nu subtitlul din hero.
 * Întoarce { ok, reason, intercepted } — nu aruncă niciodată.
 */
async function gotoPage(pg, key, label) {
  const sel = '[role="tab"][data-page="' + key + '"]';
  let intercepted = null;
  try {
    await pg.locator(sel).first().click({ timeout: 8000 });
  } catch (e) {
    intercepted = (e.message || '').split('\n').find((l) => l.includes('intercepts pointer events')) || e.message.split('\n')[0];
    try {
      await pg.evaluate((q) => {
        const tab = document.querySelector(q);
        if (!tab) throw new Error('tabul cu ' + q + ' nu există în DOM');
        tab.click();
      }, sel);
    } catch (e2) {
      return { ok: false, intercepted, reason: 'click interceptat ŞI click programatic eşuat: ' + e2.message.split('\n')[0] };
    }
  }
  await pg.waitForTimeout(key === 'energie' ? 3000 : 1500);
  const activ = await pg.evaluate(() => {
    const el = document.querySelector('[role="tab"][aria-selected="true"]');
    return el ? el.getAttribute('data-page') : null;
  });
  if (activ !== key) {
    return { ok: false, intercepted, reason: 'pagina nu s-a schimbat după click (aria-selected e „' + (activ || 'niciunul') + '", aşteptam „' + key + '")' };
  }
  void label;
  return { ok: true, intercepted };
}
// Lăţimile — graniţele din breakpoints.js + 360/390/414 cerute + 1440 desktop.
const WIDTHS = [360, 390, 414, 759, 760, 1179, 1180, 1440];
// Ramura de TABLETA (v1.2.2): aceleasi pagini la latimi de tableta, dar cu
// hasTouch — Chromium raporteaza atunci `pointer: coarse`, exact ca tableta
// montata pe perete. Valideaza deciziile care depind de tipul de input
// (tintele 44px pe coarse), invizibile pentru rularea desktop (pointer: fine).
// Emularea se VERIFICA in pagina inainte de audit; daca nu a produs coarse,
// ramura se marcheaza ca nevalidata in loc sa minta.
const TOUCH_WIDTHS = [760, 1180];

/* ------------------------------------------------------------ audit în pagină */
// Rulează în browser (page.evaluate). Întoarce liste de probleme brute;
// severitatea se atribuie în Node.
function auditPage() {
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const CAP = 15; // maxim raportat per categorie per combinaţie

  const all = Array.from(document.querySelectorAll('body *')).slice(0, 6000);
  const cs = (el) => window.getComputedStyle(el);

  const isVisible = (el) => {
    const st = cs(el);
    if (st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };

  const snippet = (el) => {
    const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
    return t ? t.slice(0, 48) : '';
  };
  const selPath = (el) => {
    const parts = [];
    let cur = el;
    let depth = 0;
    while (cur && cur !== document.body && depth < 5) {
      const tag = cur.tagName.toLowerCase();
      const parent = cur.parentElement;
      let idx = '';
      if (parent) {
        const same = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
        if (same.length > 1) idx = ':nth-of-type(' + (same.indexOf(cur) + 1) + ')';
      }
      parts.unshift(tag + idx);
      cur = parent;
      depth++;
    }
    return parts.join(' > ');
  };
  const ident = (el) => {
    const t = snippet(el);
    return selPath(el) + (t ? ' — „' + t + '"' : '');
  };

  const out = { overflowBody: [], outside: [], containerOverflow: [], touch: [], textCut: [], overlap: [], contrast: [], textEllipsis: [], cardGap: [] };

  // 1) overflow orizontal pe body
  const bodyOver = document.documentElement.scrollWidth - vw;
  if (bodyOver > 2) out.overflowBody.push({ detail: 'body depăşeşte viewportul cu ' + bodyOver + 'px' });

  // 2) elemente ieşite din viewport pe orizontală (doar cel mai de sus vinovat
  // dintr-un lanţ părinte-copil, ca să nu raportăm toată subarborea)
  const flagged = new Set();
  for (const el of all) {
    if (out.outside.length >= CAP) break;
    if (!isVisible(el)) continue;
    const r = el.getBoundingClientRect();
    const over = Math.max(r.right - vw, -r.left);
    if (over <= 2) continue;
    // interiorul containerelor cu scroll intenţionat nu e o problemă
    const scroller = el.closest('[style*="overflow-x: auto"], [style*="overflow-x:auto"], [style*="overflow: auto"], [style*="overflow:auto"]');
    if (scroller && scroller !== el) continue;
    let anc = el.parentElement;
    let ancFlagged = false;
    while (anc) { if (flagged.has(anc)) { ancFlagged = true; break; } anc = anc.parentElement; }
    if (ancFlagged) continue;
    flagged.add(el);
    out.outside.push({ el: ident(el), detail: 'iese din viewport cu ' + Math.round(over) + 'px (' + (r.right - vw > 2 ? 'dreapta' : 'stânga') + ')' });
  }

  // 3) containere care îşi taie conţinutul pe orizontală (fără scroll intenţionat)
  for (const el of all) {
    if (out.containerOverflow.length >= CAP) break;
    if (!isVisible(el)) continue;
    const st = cs(el);
    if (el.scrollWidth > el.clientWidth + 3 && el.clientWidth > 0) {
      if (st.overflowX === 'auto' || st.overflowX === 'scroll') continue; // scroll intenţionat
      if (st.overflowX !== 'hidden' && st.overflow !== 'hidden' && st.overflowX !== 'clip') continue;
      if (st.textOverflow === 'ellipsis') continue; // trunchiere intenţionată
      out.containerOverflow.push({ el: ident(el), detail: 'conţinut mai lat cu ' + (el.scrollWidth - el.clientWidth) + 'px decât containerul (overflow ascuns, fără scroll)' });
    }
  }

  // 4) ţinte tactile sub 44×44 (element interactiv = cursor:pointer / buton;
  // se raportează doar cel mai exterior element interactiv mic)
  for (const el of all) {
    if (out.touch.length >= CAP) break;
    if (!isVisible(el)) continue;
    const st = cs(el);
    const interactive = st.cursor === 'pointer' || el.tagName === 'BUTTON' || el.getAttribute('role') === 'button';
    if (!interactive) continue;
    const parent = el.parentElement;
    if (parent && (cs(parent).cursor === 'pointer' || parent.tagName === 'BUTTON')) continue; // interiorul unui buton mai mare
    const r = el.getBoundingClientRect();
    // Zona EFECTIVĂ de atingere: elementul + expansiunea ::after (tehnica
    // hdTap/hdTapY din v1.1.8 — pseudo-elementul participă la hit-testing
    // pentru părinte, deci măsurăm ce poate apăsa degetul, nu doar cutia).
    let w = r.width;
    let h = r.height;
    const ps = window.getComputedStyle(el, '::after');
    if (ps && ps.content !== 'none' && ps.position === 'absolute') {
      const t = parseFloat(ps.top) || 0;
      const b2 = parseFloat(ps.bottom) || 0;
      const l = parseFloat(ps.left) || 0;
      const rr = parseFloat(ps.right) || 0;
      w += Math.max(0, -l) + Math.max(0, -rr);
      h += Math.max(0, -t) + Math.max(0, -b2);
    }
    // Prag: 44 peste tot, CU EXCEPTIA latimilor de desktop/tableta fara touch
    // (pointer: fine = mouse), unde 30 e acceptat — decizia v1.2.2. Latimile
    // de telefon pastreaza 44 chiar daca contextul emulat n-are touch: acolo
    // simulam telefoane reale, care au intotdeauna pointer coarse.
    const finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
    const minTarget = finePointer && vw >= 760 ? 29.5 : 43.5;
    if (w < minTarget || h < minTarget) {
      out.touch.push({ el: ident(el), detail: Math.round(w) + '×' + Math.round(h) + 'px zonă efectivă (minim ' + (minTarget > 40 ? '44×44' : '30×30, pointer fine') + ')' });
    }
  }

  // 5) text tăiat vertical de overflow:hidden (fără ellipsis intenţionat)
  for (const el of all) {
    if (out.textCut.length >= CAP) break;
    if (!isVisible(el)) continue;
    const st = cs(el);
    const hidden = st.overflowY === 'hidden' || st.overflow === 'hidden' || st.overflowY === 'clip';
    if (!hidden) continue;
    if (st.textOverflow === 'ellipsis') continue;
    // line-clamp = trunchiere INTENTIONATA (rupere pe N linii cu elipsa la
    // capat) — decizia din 22.08: nu se mai raporteaza ca text taiat.
    if (st.webkitLineClamp && st.webkitLineClamp !== 'none') continue;
    if (el.scrollHeight <= el.clientHeight + 3) continue;
    const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText && !el.querySelector('span, div')) continue;
    // containerele mari de layout (carduri întregi) nu sunt "text tăiat"
    if (el.clientHeight > vh * 0.8) continue;
    out.textCut.push({ el: ident(el), detail: 'conţinut de ' + el.scrollHeight + 'px într-un container de ' + el.clientHeight + 'px cu overflow ascuns' });
  }

  // 5b) ellipsis orizontal ACTIV: elementul chiar taie text acum (v1.2.0 —
  // prinde automat regresiile de tip "Pompă filt…"). Se raportează textul
  // complet vs cel vizibil aproximativ prin depăşirea în pixeli.
  for (const el of all) {
    if (out.textEllipsis.length >= CAP) break;
    if (!isVisible(el)) continue;
    const st = cs(el);
    if (st.textOverflow !== 'ellipsis') continue;
    if (el.scrollWidth <= el.clientWidth + 2) continue;
    const hasText = (el.textContent || '').trim().length > 0;
    if (!hasText) continue;
    out.textEllipsis.push({ el: ident(el), detail: 'textul e tăiat cu ellipsis (' + (el.scrollWidth - el.clientWidth) + 'px nu încap)' });
  }

  // 6) suprapuneri între fraţi cu text (intersecţie >25% din cel mai mic)
  const parents = new Set();
  for (const el of all) { if (el.parentElement) parents.add(el.parentElement); }
  outer:
  for (const parent of parents) {
    const kids = Array.from(parent.children).filter((k) => isVisible(k) && (k.textContent || '').trim());
    if (kids.length < 2 || kids.length > 12) continue;
    const pst = cs(parent);
    for (let i = 0; i < kids.length; i++) {
      for (let j = i + 1; j < kids.length; j++) {
        if (out.overlap.length >= CAP) break outer;
        const a = kids[i].getBoundingClientRect();
        const b = kids[j].getBoundingClientRect();
        const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ix <= 2 || iy <= 2) continue;
        const inter = ix * iy;
        const minA = Math.min(a.width * a.height, b.width * b.height);
        if (minA <= 0 || inter / minA < 0.25) continue;
        // absolut-poziţionatele decorative (gradienturi) se ignoră
        if (cs(kids[i]).position === 'absolute' || cs(kids[j]).position === 'absolute') continue;
        if (pst.display === 'grid' || pst.display === 'flex') {
          // în flex/grid suprapunerea reală între fraţi e un bug de layout
        }
        out.overlap.push({ el: ident(kids[i]) + '  ⇄  ' + ident(kids[j]), detail: 'se suprapun pe ' + Math.round(inter / minA * 100) + '% din cel mai mic' });
      }
    }
  }

  // 7) contrast text/fundal (WCAG: <4.5 normal, <3 pentru text mare)
  const parse = (c) => {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c);
    return m ? [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), m[4] === undefined ? 1 : parseFloat(m[4])] : null;
  };
  const lum = (rgb) => {
    const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
  };
  const composite = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3]));
  const PAGE_BG = [11, 9, 8]; // #0b0908
  const effectiveBg = (el) => {
    let acc = null;
    let cur = el;
    while (cur && cur !== document.documentElement) {
      const bgc = parse(cs(cur).backgroundColor);
      if (cs(cur).backgroundImage !== 'none') return null; // gradient — nedeterminabil static
      if (bgc && bgc[3] > 0) acc = acc === null ? bgc : null; // primul strat opac de jos în sus e suficient
      if (bgc && bgc[3] >= 1) return bgc.slice(0, 3);
      cur = cur.parentElement;
    }
    return acc ? composite(acc, PAGE_BG) : PAGE_BG;
  };
  const seen = new Set();
  for (const el of all) {
    if (out.contrast.length >= CAP) break;
    if (!isVisible(el)) continue;
    const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!hasText) continue;
    const st = cs(el);
    const fg = parse(st.color);
    if (!fg) continue;
    const bg = effectiveBg(el);
    if (!bg) continue; // fundal cu gradient — sărim, nu ghicim
    const fgc = fg[3] < 1 ? composite(fg, bg) : fg.slice(0, 3);
    const L1 = lum(fgc), L2 = lum(bg);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const fs = parseFloat(st.fontSize);
    const bold = parseInt(st.fontWeight, 10) >= 700;
    const large = fs >= 24 || (fs >= 18.66 && bold);
    const limit = large ? 3 : 4.5;
    if (ratio >= limit) continue;
    const key = st.color + '|' + bg.join(',') + '|' + snippet(el).slice(0, 20);
    if (seen.has(key)) continue;
    seen.add(key);
    out.contrast.push({ el: ident(el), detail: 'contrast ' + ratio.toFixed(2) + ':1 (minim ' + limit + ':1, font ' + Math.round(fs) + 'px)' });
  }

  // 8) spaţiu gol excesiv la BAZA cardului (v1.3.4). Auditul nu prindea
  // cardurile întinse de grilă (nu e overflow, nu e text tăiat): un card scurt
  // lângă unul înalt căpăta zeci/sute de px goi sub ultimul element.
  //   golBază = card.bottom − (cel mai de jos copil cu conţinut).bottom − padding-bottom
  // Se măsoară pe [data-card] (marcaj stabil — stilurile sunt inline).
  // Cardurile cu `justify-content: space-between` (ex. „Control climat") îşi
  // împing ultimul copil FIX la bază, deci ies natural cu golBază ≈ 0: nu e
  // nevoie de nicio excepţie specială, măsurătoarea le exclude singură.
  const GAP_LIMIT = 48;
  for (const el of document.querySelectorAll('[data-card]')) {
    if (out.cardGap.length >= CAP) break;
    if (!isVisible(el)) continue;
    const st = cs(el);
    const rect = el.getBoundingClientRect();
    const padB = parseFloat(st.paddingBottom) || 0;
    // Cel mai de JOS copil care OCUPĂ SPAŢIU în fluxul cardului (nu neapărat
    // ultimul din DOM: ordinea vizuală poate diferi prin flex/grid `order`).
    // Criteriul e cutia, nu conţinutul: un spacer gol cu înălţime explicită
    // (ex. locul rezervat graficului cât timp nu sunt date în recorder) rezervă
    // spaţiul deliberat şi NU e "gol la baza cardului". Absolut-poziţionatele
    // (gradienturi, tooltip-uri) nu ţin de flux.
    let lowest = null;
    let lowestBottom = -Infinity;
    for (const k of Array.from(el.children)) {
      if (!isVisible(k)) continue;
      const kst = cs(k);
      if (kst.position === 'absolute' || kst.position === 'fixed') continue;
      const kb = k.getBoundingClientRect().bottom;
      if (kb > lowestBottom) { lowestBottom = kb; lowest = k; }
    }
    if (!lowest) continue;
    const gap = rect.bottom - lowestBottom - padB;
    if (gap <= GAP_LIMIT) continue;
    out.cardGap.push({
      el: ident(el),
      detail: Math.round(gap) + 'px goi sub ultimul element (card ' + Math.round(rect.height) +
        'px, conţinut până la ' + Math.round(lowestBottom - rect.top) + 'px) — cardul e întins de grilă'
    });
  }

  return out;
}

/* ------------------------------------------------------------------ server */
function startPreview() {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
      cwd: ROOT, shell: true, stdio: 'pipe'
    });
    let up = false;
    const tryPing = async () => {
      try {
        const res = await fetch(BASE + '/');
        if (res.ok) { up = true; resolve(child); return; }
      } catch (e) { /* not yet */ }
      if (!up) setTimeout(tryPing, 400);
    };
    setTimeout(tryPing, 800);
    child.on('exit', (code) => { if (!up) reject(new Error('vite preview a ieşit cu codul ' + code)); });
    setTimeout(() => { if (!up) reject(new Error('vite preview nu a pornit în 30s')); }, 30000);
  });
}

/* -------------------------------------------------------------------- main */
const SEVERITY = {
  nav: ['CRITIC', 'Pagină nenavigabilă'],
  navBlocked: ['CRITIC', 'Click pe tab interceptat de alt element'],
  overflowBody: ['CRITIC', 'Overflow orizontal pe body'],
  outside: ['CRITIC', 'Element ieşit din viewport'],
  overlap: ['CRITIC', 'Elemente suprapuse'],
  containerOverflow: ['MEDIU', 'Conţinut tăiat orizontal (overflow ascuns)'],
  touch: ['MEDIU', 'Ţintă tactilă sub 44×44px'],
  textCut: ['MEDIU', 'Text tăiat vertical'],
  textEllipsis: ['MEDIU', 'Text trunchiat cu ellipsis activ'],
  cardGap: ['MEDIU', 'Spaţiu gol excesiv la baza cardului (>48px)'],
  contrast: ['MINOR', 'Contrast sub pragul WCAG']
};

async function main() {
  if (!SMOKE && !HA_TOKEN) {
    console.error('\nLipseşte HD_HA_TOKEN. Auditul are nevoie de un token HA valid ca să treacă de ecranul de login.');
    console.error('PowerShell:  $env:HD_HA_URL="http://192.168.0.100"; $env:HD_HA_TOKEN="<token>"; npm run audit:responsive');
    console.error('Token-ul rămâne doar în mediul procesului — nu se scrie pe disc şi nu intră în repo.');
    console.error('Pentru un test al instalării fără token: npm run audit:responsive -- --smoke\n');
    process.exit(2);
  }

  // Preflight (adăugat după runda irosită din 22.08): confirmăm că HA chiar
  // răspunde pe HD_HA_URL ÎNAINTE de a porni matricea — /auth/providers nu
  // cere autentificare şi identifică un URL/port greşit în 2 secunde.
  try {
    const pre = await fetch(HA_URL + '/auth/providers', { signal: AbortSignal.timeout(5000) });
    if (!pre.ok) throw new Error('HTTP ' + pre.status);
  } catch (e) {
    console.error('\nPREFLIGHT EŞUAT: HA nu răspunde la ' + HA_URL + ' (' + (e.cause && e.cause.code ? e.cause.code : e.message) + ').');
    console.error('Verifică HD_HA_URL — aplicaţia reală se conectează la http://192.168.0.100 (port 80, fără :8123).');
    process.exit(2);
  }

  mkdirSync(SHOTS, { recursive: true });

  // Build NECONDITIONAT (lectia din 22.08, a doua unealta care a raportat cu
  // incredere pe date gresite in aceeasi zi: auditul a masurat un dist vechi
  // v1.2.1 si a 'infirmat' un fix v1.2.2 care functiona). Build-ul dureaza
  // ~1.5s; trasabilitatea nu e optionala.
  console.log('build proaspat...');
  await new Promise((res, rej) => {
    const b = spawn('npx', ['vite', 'build'], { cwd: ROOT, shell: true, stdio: 'ignore' });
    b.on('exit', (c) => (c === 0 ? res() : rej(new Error('build esuat (cod ' + c + ')'))));
  });
  const cfgTxt = readFileSync(path.join(ROOT, 'config.yaml'), 'utf8');
  const appVersion = (cfgTxt.match(/version: "([^"]+)"/) || [])[1] || 'necunoscuta';
  const bundleFile = readdirSync(path.join(ROOT, 'dist', 'assets')).find((f) => f.startsWith('index-') && f.endsWith('.js')) || 'necunoscut';
  console.log('aplicatie v' + appVersion + ' · bundle ' + bundleFile);

  const server = await startPreview();
  const browser = await chromium.launch({ headless: true });
  const findings = [];

  try {
    if (SMOKE) {
      const ctx = await browser.newContext({ viewport: { width: 360, height: 800 } });
      const pg = await ctx.newPage();
      await pg.goto(BASE, { waitUntil: 'networkidle' });
      await pg.screenshot({ path: path.join(SHOTS, 'smoke_setup_360.png'), fullPage: true });
      const hasSetup = (await pg.content()).includes('token');
      console.log('SMOKE: aplicaţia s-a încărcat, ecranul de Setup ' + (hasSetup ? 'detectat' : 'NEDETECTAT') + '; captura în audit/output/shots/smoke_setup_360.png');
      await ctx.close();
      return;
    }

    const COMBOS = WIDTHS.map((w) => ({ width: w, touch: false }))
      .concat(TOUCH_WIDTHS.map((w) => ({ width: w, touch: true })));
    for (const combo of COMBOS) {
      const width = combo.width;
      const touch = combo.touch;
      const tag = touch ? 't' : '';
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, hasTouch: touch });
      await ctx.addInitScript(([url, token]) => {
        localStorage.setItem('hd.ha.config', JSON.stringify({ url, token }));
        // animaţiile oprite -> capturi stabile şi audit determinist
        const prefs = JSON.parse(localStorage.getItem('hd.ui.prefs') || '{}');
        prefs.anim = false;
        localStorage.setItem('hd.ui.prefs', JSON.stringify(prefs));
      }, [HA_URL, HA_TOKEN]);

      const pg = await ctx.newPage();
      await pg.goto(BASE, { waitUntil: 'networkidle' });

      // aşteptăm dashboard-ul (bara de navigaţie); Setup vizibil = token respins.
      // Aşteptarea e pe `[role="tab"]`, nu pe textul „Acasă": după v1.5.0
      // eticheta apare doar pe tabul activ, iar o aşteptare pe text s-ar rupe
      // din nou la orice schimbare de prezentare.
      try {
        await pg.locator('[role="tab"][data-page]').first().waitFor({ timeout: 30000 });
      } catch (e) {
        const html = await pg.content();
        if (html.includes('token') || html.includes('Token')) {
          throw new Error('Aplicaţia a rămas pe ecranul de Setup — token-ul din HD_HA_TOKEN pare respins de HA.');
        }
        throw new Error('Dashboard-ul nu s-a încărcat în 30s la lăţimea ' + width + 'px.');
      }
      // Verificare timpurie de conectare (lecţia 22.08: 64 de combinaţii au
      // fost auditate pe o aplicaţie deconectată). Dashboard-ul vizibil NU
      // înseamnă conectat — aşteptăm să dispară banda offline; dacă nu
      // dispare în 20s, oprim TOATĂ rularea cu mesaj explicit.
      try {
        await pg.waitForFunction(
          () => !document.body.innerText.includes('Deconectat de la Home Assistant') &&
                !document.body.innerText.includes('Nu mă pot conecta') &&
                !document.body.innerText.includes('Se reconectează'),
          { timeout: 20000 }
        );
      } catch (e) {
        throw new Error('Aplicaţia NU s-a conectat la HA (' + HA_URL + ') — banda offline e încă pe ecran după 20s. ' +
          'Verifică HD_HA_URL şi HD_HA_TOKEN. Auditul se opreşte ca să nu măsoare o aplicaţie deconectată.');
      }
      await pg.waitForTimeout(3000); // istoric + statistici + fonturi

      // Lista de pagini se citeşte O DATĂ, din bara randată de aplicaţie.
      if (!PAGES.length) {
        PAGES = await citestePagini(pg);
        console.log('  pagini descoperite în navigaţie (' + PAGES.length + '): ' + PAGES.map((x) => x[0]).join(', '));
      }

      if (touch) {
        const coarse = await pg.evaluate(() => window.matchMedia('(pointer: coarse)').matches);
        if (!coarse) {
          findings.push({ page: 'toate', width, touch, type: 'nav', el: 'emulare touch', detail: 'hasTouch nu a produs pointer:coarse la ' + width + 'px — ramura de tableta NEVALIDATA (rezultatele ar fi fost cele de desktop)' });
          console.log('  TABLETA @ ' + width + 'px — emularea nu a produs pointer:coarse; sar peste ramura');
          await ctx.close();
          continue;
        }
      }

      for (const [key, label] of PAGES) {
        if (key !== 'acasa') {
          const nav = await gotoPage(pg, key, label);
          // clickul normal blocat de un element = problemă reală de UI, chiar
          // dacă fallback-ul programatic a mers — o raportăm separat
          if (nav.intercepted) {
            findings.push({ page: key, width, touch, type: 'navBlocked', el: 'tabul „' + label + '"', detail: 'clickul normal a fost interceptat (' + nav.intercepted.trim() + '); a mers doar clickul programatic' });
          }
          if (!nav.ok) {
            findings.push({ page: key, width, touch, type: 'nav', el: 'navigaţie', detail: 'combinaţie nenavigabilă — ' + nav.reason });
            try { await pg.screenshot({ path: path.join(SHOTS, key + '_' + width + tag + '_nenavigabil.png'), fullPage: false }); } catch (e) { /* măcar am încercat */ }
            console.log('  ' + key + ' @ ' + width + 'px — NENAVIGABILĂ (' + nav.reason + ')');
            continue;
          }
        }
        try {
          const res = await pg.evaluate(auditPage);
          masurate++;
          const shot = key + '_' + width + tag + '.png';
          await pg.screenshot({ path: path.join(SHOTS, shot), fullPage: true });
          for (const [type, list] of Object.entries(res)) {
            for (const item of list) {
              findings.push({ page: key, width, touch, type, el: item.el || 'body', detail: item.detail });
            }
          }
          console.log('  ' + key + ' @ ' + width + 'px' + (touch ? ' (touch)' : '') + ' — ' + Object.values(res).reduce((a, l) => a + l.length, 0) + ' probleme, captura ' + shot);
        } catch (e) {
          findings.push({ page: key, width, touch, type: 'nav', el: 'audit', detail: 'auditul paginii a eşuat: ' + e.message.split('\n')[0] });
          console.log('  ' + key + ' @ ' + width + 'px — AUDIT EŞUAT (' + e.message.split('\n')[0] + ')');
        }
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    // pe Windows, kill() omoară doar shell-ul npx — vite preview rămânea viu
    // şi scriptul nu mai ieşea niciodată; omorâm tot arborele de procese.
    try {
      if (process.platform === 'win32') execSync('taskkill /pid ' + server.pid + ' /T /F', { stdio: 'ignore' });
      else server.kill('SIGKILL');
    } catch (e) { /* deja mort */ }
  }

  // agregare: aceeaşi problemă (pagină+tip+element) pe mai multe lăţimi -> un rând
  const byKey = new Map();
  for (const f of findings) {
    const k = f.page + '|' + (f.touch ? 'T|' : '') + f.type + '|' + f.el + '|' + f.detail.replace(/\d+/g, '#');
    if (!byKey.has(k)) byKey.set(k, { ...f, widths: [] });
    byKey.get(k).widths.push(f.width);
  }
  const rows = Array.from(byKey.values());
  const sevOrder = { CRITIC: 0, MEDIU: 1, MINOR: 2 };
  rows.sort((a, b) => sevOrder[SEVERITY[a.type][0]] - sevOrder[SEVERITY[b.type][0]] || a.page.localeCompare(b.page) || a.width - b.width);

  writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rows, null, 2));

  let md = '# Audit responsive — ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + '\n\n';
  md += '**Aplicatie v' + appVersion + ' · bundle `' + bundleFile + '` (build proaspat la rulare).**' + '\n\n';
  const nCombos = PAGES.length * (WIDTHS.length + TOUCH_WIDTHS.length);
  md += 'Matrice: **' + PAGES.length + ' pagini** (' + PAGES.map((x) => x[0]).join(', ') + ') × ' + WIDTHS.length + ' lăţimi (' + WIDTHS.join(', ') + 'px) + ramura de tabletă cu touch (' + TOUCH_WIDTHS.join(', ') + 'px, pointer: coarse) = **' + nCombos + ' combinaţii**, dintre care ' + masurate + ' măsurate efectiv. ';
  md += 'Total: ' + rows.length + ' probleme distincte (' + findings.length + ' apariţii).\n';
  for (const sev of ['CRITIC', 'MEDIU', 'MINOR']) {
    const group = rows.filter((r) => SEVERITY[r.type][0] === sev);
    md += '\n## ' + sev + ' (' + group.length + ')\n\n';
    if (!group.length) { md += '_nimic_\n'; continue; }
    for (const r of group) {
      md += '- **' + r.page + '** @ ' + Array.from(new Set(r.widths)).sort((a, b) => a - b).join('/') + 'px' + (r.touch ? ' · TABLETA (touch)' : '') + ' · ' + SEVERITY[r.type][1] + '\n';
      md += '  `' + r.el + '`\n  ' + r.detail + '\n';
    }
  }
  writeFileSync(path.join(OUT, 'report.md'), md);
  console.log('\nRaport: audit/output/report.md (+ report.json), capturi în audit/output/shots/');
  console.log('Probleme distincte: ' + rows.length);
}

main().then(
  () => process.exit(0),
  (e) => { console.error('\nAUDIT EŞUAT: ' + e.message); process.exit(1); }
);
