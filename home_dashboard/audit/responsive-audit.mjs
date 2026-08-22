// Audit automat de responsive (v1.1.6) — DOAR inventar, nu repară nimic.
//
// Rulare:
//   HD_HA_URL=http://192.168.0.100:8123 HD_HA_TOKEN=<token> npm run audit:responsive
//   (pe Windows/PowerShell: $env:HD_HA_TOKEN='...'; npm run audit:responsive)
//
// Token-ul se citeşte EXCLUSIV din variabila de mediu — nu se scrie nicăieri
// pe disc şi nu apare în repo. Se injectează în localStorage-ul contextului
// Playwright (cheia hd.ha.config, aceeaşi pe care o scrie ecranul de Setup).
//
// Matricea: cele 8 pagini din NAV × lăţimile derivate din breakpoint-urile
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
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'audit', 'output');
const SHOTS = path.join(OUT, 'shots');
const PORT = 4317;
const BASE = 'http://127.0.0.1:' + PORT;

const SMOKE = process.argv.includes('--smoke');
const HA_URL = process.env.HD_HA_URL || 'http://192.168.0.100:8123';
const HA_TOKEN = process.env.HD_HA_TOKEN || '';

// Paginile — aceleaşi chei şi etichete ca în src/model/devices.js (NAV).
const PAGES = [
  ['acasa', 'Acasă'], ['climat', 'Climat'], ['piscina', 'Piscină'], ['energie', 'Energie'],
  ['camere', 'Camere'], ['retea', 'Reţea'], ['media', 'Media'], ['mentenanta', 'Mentenanţă']
];
// Subtitlurile din PAGE_HERO (src/model/pages.js) — unice per pagină; le
// folosim ca dovadă că navigarea chiar a schimbat pagina.
const PAGE_SUBTITLE = {
  acasa: 'Centrul de operaţiuni', climat: 'Confort termic pe trei niveluri',
  piscina: 'Apă, chimie şi filtrare', energie: 'Producţie, stocare şi consum',
  camere: 'Cinci camere, perimetru complet', retea: 'Infrastructură şi conectivitate',
  media: 'Opt televizoare, patru zone', mentenanta: 'Starea sistemului sub control'
};

/**
 * Navigare rezistentă la eşecuri (v2 al auditului). Aplicaţia NU are rute URL
 * (pagina e stare React), deci echivalentul "navigării directe" e clickul
 * programatic pe tab, care ocoleşte hit-testing-ul (deci şi orice element
 * care ar intercepta pointerul). Ordinea:
 *   1) click normal Playwright (detectează interceptări reale — le raportăm);
 *   2) click programatic prin evaluate;
 *   3) verificare că pagina chiar s-a schimbat (subtitlul din hero).
 * Întoarce { ok, reason, intercepted } — nu aruncă niciodată.
 */
async function gotoPage(pg, key, label) {
  let intercepted = null;
  try {
    await pg.getByText(label, { exact: true }).first().click({ timeout: 8000 });
  } catch (e) {
    intercepted = (e.message || '').split('\n').find((l) => l.includes('intercepts pointer events')) || e.message.split('\n')[0];
    try {
      await pg.evaluate((lbl) => {
        const spans = Array.from(document.querySelectorAll('span')).filter((sp) => sp.textContent.trim() === lbl);
        const tab = spans.map((sp) => sp.closest('div')).find((d) => d && getComputedStyle(d).cursor === 'pointer');
        if (!tab) throw new Error('tabul „' + lbl + '" nu există în DOM');
        tab.click();
      }, label);
    } catch (e2) {
      return { ok: false, intercepted, reason: 'click interceptat ŞI click programatic eşuat: ' + e2.message.split('\n')[0] };
    }
  }
  await pg.waitForTimeout(key === 'energie' ? 3000 : 1500);
  const changed = await pg.evaluate((sub) => document.body.innerText.includes(sub), PAGE_SUBTITLE[key]);
  if (!changed) return { ok: false, intercepted, reason: 'pagina nu s-a schimbat după click (subtitlul „' + PAGE_SUBTITLE[key] + '" absent)' };
  return { ok: true, intercepted };
}
// Lăţimile — graniţele din breakpoints.js + 360/390/414 cerute + 1440 desktop.
const WIDTHS = [360, 390, 414, 759, 760, 1179, 1180, 1440];

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

  const out = { overflowBody: [], outside: [], containerOverflow: [], touch: [], textCut: [], overlap: [], contrast: [] };

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
    if (w < 43.5 || h < 43.5) {
      out.touch.push({ el: ident(el), detail: Math.round(w) + '×' + Math.round(h) + 'px zonă efectivă (minim 44×44)' });
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
    if (el.scrollHeight <= el.clientHeight + 3) continue;
    const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText && !el.querySelector('span, div')) continue;
    // containerele mari de layout (carduri întregi) nu sunt "text tăiat"
    if (el.clientHeight > vh * 0.8) continue;
    out.textCut.push({ el: ident(el), detail: 'conţinut de ' + el.scrollHeight + 'px într-un container de ' + el.clientHeight + 'px cu overflow ascuns' });
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
  contrast: ['MINOR', 'Contrast sub pragul WCAG']
};

async function main() {
  if (!SMOKE && !HA_TOKEN) {
    console.error('\nLipseşte HD_HA_TOKEN. Auditul are nevoie de un token HA valid ca să treacă de ecranul de login.');
    console.error('PowerShell:  $env:HD_HA_URL="http://192.168.0.100:8123"; $env:HD_HA_TOKEN="<token>"; npm run audit:responsive');
    console.error('Token-ul rămâne doar în mediul procesului — nu se scrie pe disc şi nu intră în repo.');
    console.error('Pentru un test al instalării fără token: npm run audit:responsive -- --smoke\n');
    process.exit(2);
  }

  mkdirSync(SHOTS, { recursive: true });
  if (!existsSync(path.join(ROOT, 'dist', 'index.html'))) {
    console.log('dist/ lipseşte — rulez build-ul...');
    await new Promise((res, rej) => {
      const b = spawn('npx', ['vite', 'build'], { cwd: ROOT, shell: true, stdio: 'inherit' });
      b.on('exit', (c) => (c === 0 ? res() : rej(new Error('build eşuat'))));
    });
  }

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

    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
      await ctx.addInitScript(([url, token]) => {
        localStorage.setItem('hd.ha.config', JSON.stringify({ url, token }));
        // animaţiile oprite -> capturi stabile şi audit determinist
        const prefs = JSON.parse(localStorage.getItem('hd.ui.prefs') || '{}');
        prefs.anim = false;
        localStorage.setItem('hd.ui.prefs', JSON.stringify(prefs));
      }, [HA_URL, HA_TOKEN]);

      const pg = await ctx.newPage();
      await pg.goto(BASE, { waitUntil: 'networkidle' });

      // aşteptăm dashboard-ul (tab-ul Acasă); Setup vizibil = token respins
      try {
        await pg.getByText('Acasă', { exact: true }).first().waitFor({ timeout: 30000 });
      } catch (e) {
        const html = await pg.content();
        if (html.includes('token') || html.includes('Token')) {
          throw new Error('Aplicaţia a rămas pe ecranul de Setup — token-ul din HD_HA_TOKEN pare respins de HA.');
        }
        throw new Error('Dashboard-ul nu s-a încărcat în 30s la lăţimea ' + width + 'px.');
      }
      await pg.waitForTimeout(3000); // istoric + statistici + fonturi

      for (const [key, label] of PAGES) {
        if (key !== 'acasa') {
          const nav = await gotoPage(pg, key, label);
          // clickul normal blocat de un element = problemă reală de UI, chiar
          // dacă fallback-ul programatic a mers — o raportăm separat
          if (nav.intercepted) {
            findings.push({ page: key, width, type: 'navBlocked', el: 'tabul „' + label + '"', detail: 'clickul normal a fost interceptat (' + nav.intercepted.trim() + '); a mers doar clickul programatic' });
          }
          if (!nav.ok) {
            findings.push({ page: key, width, type: 'nav', el: 'navigaţie', detail: 'combinaţie nenavigabilă — ' + nav.reason });
            try { await pg.screenshot({ path: path.join(SHOTS, key + '_' + width + '_nenavigabil.png'), fullPage: false }); } catch (e) { /* măcar am încercat */ }
            console.log('  ' + key + ' @ ' + width + 'px — NENAVIGABILĂ (' + nav.reason + ')');
            continue;
          }
        }
        try {
          const res = await pg.evaluate(auditPage);
          const shot = key + '_' + width + '.png';
          await pg.screenshot({ path: path.join(SHOTS, shot), fullPage: true });
          for (const [type, list] of Object.entries(res)) {
            for (const item of list) {
              findings.push({ page: key, width, type, el: item.el || 'body', detail: item.detail });
            }
          }
          console.log('  ' + key + ' @ ' + width + 'px — ' + Object.values(res).reduce((a, l) => a + l.length, 0) + ' probleme, captura ' + shot);
        } catch (e) {
          findings.push({ page: key, width, type: 'nav', el: 'audit', detail: 'auditul paginii a eşuat: ' + e.message.split('\n')[0] });
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
    const k = f.page + '|' + f.type + '|' + f.el + '|' + f.detail.replace(/\d+/g, '#');
    if (!byKey.has(k)) byKey.set(k, { ...f, widths: [] });
    byKey.get(k).widths.push(f.width);
  }
  const rows = Array.from(byKey.values());
  const sevOrder = { CRITIC: 0, MEDIU: 1, MINOR: 2 };
  rows.sort((a, b) => sevOrder[SEVERITY[a.type][0]] - sevOrder[SEVERITY[b.type][0]] || a.page.localeCompare(b.page) || a.width - b.width);

  writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rows, null, 2));

  let md = '# Audit responsive — ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + '\n\n';
  md += 'Matrice: ' + PAGES.length + ' pagini × ' + WIDTHS.length + ' lăţimi (' + WIDTHS.join(', ') + 'px). ';
  md += 'Total: ' + rows.length + ' probleme distincte (' + findings.length + ' apariţii).\n';
  for (const sev of ['CRITIC', 'MEDIU', 'MINOR']) {
    const group = rows.filter((r) => SEVERITY[r.type][0] === sev);
    md += '\n## ' + sev + ' (' + group.length + ')\n\n';
    if (!group.length) { md += '_nimic_\n'; continue; }
    for (const r of group) {
      md += '- **' + r.page + '** @ ' + Array.from(new Set(r.widths)).sort((a, b) => a - b).join('/') + 'px · ' + SEVERITY[r.type][1] + '\n';
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
