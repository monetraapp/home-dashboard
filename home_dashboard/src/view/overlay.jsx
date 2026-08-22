// Componente de suprapunere partajate (v1.1.5): tooltip-ul portal, tranzitia
// de rulare a cifrelor si long-press-ul de pe mobil. Extrase din Dashboard.jsx
// ca sa poata fi folosite si de instrumentul Energie (Energy.jsx).
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { s, SANS } from '../design/tokens.js';

export function Tip({ text }) {
  const holderRef = useRef(null);
  const bubbleRef = useRef(null);
  const [box, setBox] = useState(null);
  useLayoutEffect(() => {
    const holder = holderRef.current;
    const bubble = bubbleRef.current;
    const anchor = holder && holder.parentElement;
    if (!holder || !bubble || !anchor) return;
    const a = anchor.getBoundingClientRect();
    const b = bubble.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight, pad = 8, gap = 10;
    let top = a.bottom + gap, place = 'below';
    if (top + b.height > vh - pad && a.top - gap - b.height >= pad) {
      top = a.top - gap - b.height;
      place = 'above';
    }
    let left = a.left + a.width / 2 - b.width / 2;
    left = Math.max(pad, Math.min(left, vw - pad - b.width));
    const arrowX = Math.max(10, Math.min(a.left + a.width / 2 - left, b.width - 10));
    setBox({ top, left, place, arrowX });
  }, [text]);
  // Cauza tooltip-urilor "cazute" peste alte elemente (v1.1.2): pozitia fixa
  // se calcula O SINGURA DATA; daca pagina se derula cu tooltip-ul deschis,
  // coordonatele ramaneau vechi. La scroll/resize il reancoram imediat.
  useEffect(() => {
    const re = () => {
      const holder = holderRef.current;
      const bubble = bubbleRef.current;
      const anchor = holder && holder.parentElement;
      if (!holder || !bubble || !anchor) return;
      const a = anchor.getBoundingClientRect();
      const b = bubble.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight, pad = 8, gap = 10;
      let top = a.bottom + gap, place = 'below';
      if (top + b.height > vh - pad && a.top - gap - b.height >= pad) { top = a.top - gap - b.height; place = 'above'; }
      let left = a.left + a.width / 2 - b.width / 2;
      left = Math.max(pad, Math.min(left, vw - pad - b.width));
      const arrowX = Math.max(10, Math.min(a.left + a.width / 2 - left, b.width - 10));
      setBox({ top, left, place, arrowX });
    };
    window.addEventListener('scroll', re, true);
    window.addEventListener('resize', re);
    return () => { window.removeEventListener('scroll', re, true); window.removeEventListener('resize', re); };
  }, []);
  const base =
    'position:fixed; z-index:200; pointer-events:none; padding:8px 12px; border-radius:12px; max-width:260px; width:max-content; text-align:center; font-family:' + SANS +
    '; font-size:11.5px; font-weight:400; line-height:1.45; color:#f4ece2; background:rgba(26,20,15,0.97); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.14); box-shadow:0 12px 28px -12px rgba(0,0,0,0.9);';
  const style = box
    ? s(base + ' top:' + box.top + 'px; left:' + box.left + 'px; animation:hdTipIn .16s ease-out;')
    : s(base + ' top:0; left:0; visibility:hidden;');
  const arrow = box
    ? s(
        'position:absolute; width:9px; height:9px; transform:rotate(45deg); background:rgba(26,20,15,0.97); left:' + (box.arrowX - 4.5) + 'px; ' +
          (box.place === 'below'
            ? 'top:-5px; border-left:1px solid rgba(255,255,255,0.14); border-top:1px solid rgba(255,255,255,0.14);'
            : 'bottom:-5px; border-right:1px solid rgba(255,255,255,0.14); border-bottom:1px solid rgba(255,255,255,0.14);')
      )
    : null;
  return (
    <>
      <span ref={holderRef} style={{ display: 'none' }} />
      {createPortal(
        <div ref={bubbleRef} style={style}>
          {box ? <div style={arrow} /> : null}
          {text}
        </div>,
        document.body
      )}
    </>
  );
}

// Long-press pe mobil: >=450ms arata tooltip-ul cu descrierea (echivalentul
// hover-ului) si suprima activarea; tap-ul scurt comuta normal. Ales in locul
// unei iconite de "mod explicatii" pentru ca nu adauga UI si nu intra in
// conflict cu tap-ul obisnuit.
const press = { t: null, fired: false };
export function pressProps(show, hide, toggle) {
  return {
    onTouchStart: () => { press.fired = false; clearTimeout(press.t); press.t = setTimeout(() => { press.fired = true; show(); }, 450); },
    onTouchMove: () => clearTimeout(press.t),
    onTouchEnd: (e) => { clearTimeout(press.t); if (press.fired) { if (e && e.cancelable) e.preventDefault(); hide(); } },
    onContextMenu: (e) => { if (press.fired) e.preventDefault(); },
    onClick: (e) => { if (press.fired) { press.fired = false; return; } toggle(e); }
  };
}


// Tranziţie de rulare pentru cifrele din rândul-erou (~400ms). Interpolează
// doar când sufixul (unitatea) rămâne acelaşi; altfel comută direct.
export function Roll({ text, anim }) {
  const [shown, setShown] = useState(text);
  const prevRef = useRef(text);
  const rafRef = useRef(0);
  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = text;
    if (from === text) return undefined;
    // (v1.3.1) Separatorul zecimal al aplicaţiei e virgula — regexul şi
    // redarea intermediară trebuie s-o accepte, altfel animaţia moare mut.
    const NUM = /^(-?\d+(?:[.,]\d+)?)( .*)?$/;
    const m1 = NUM.exec(String(from || ''));
    const m2 = NUM.exec(String(text || ''));
    if (!anim || !m1 || !m2 || (m1[2] || '') !== (m2[2] || '')) {
      setShown(text);
      return undefined;
    }
    const comma = m2[1].indexOf(',') >= 0;
    const a = parseFloat(m1[1].replace(',', '.'));
    const bVal = parseFloat(m2[1].replace(',', '.'));
    const dec = (m2[1].split(/[.,]/)[1] || '').length;
    const suffix = m2[2] || '';
    const t0 = performance.now();
    cancelAnimationFrame(rafRef.current);
    const step2 = (t) => {
      const k = Math.min(1, (t - t0) / 400);
      const e = 1 - Math.pow(1 - k, 3);
      const num = (a + (bVal - a) * e).toFixed(dec);
      setShown((comma ? num.replace('.', ',') : num) + suffix);
      if (k < 1) rafRef.current = requestAnimationFrame(step2);
    };
    rafRef.current = requestAnimationFrame(step2);
    return () => cancelAnimationFrame(rafRef.current);
  }, [text, anim]);
  return <span>{shown}</span>;
}
