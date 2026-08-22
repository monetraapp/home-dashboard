// Breakpoint-urile din designul responsive (design-updatev1):
//   desktop  >= 1180px
//   tabletă   760–1179px
//   telefon   < 760px
//
// Portare a metodei `bp()` din design, cu throttling pe requestAnimationFrame.
// Faţă de design există o singură completare: rAF nu rulează cât timp pagina e
// ascunsă (tab în fundal, fereastră minimizată), aşa că avem şi un timer de
// rezervă plus o re-citire la `visibilitychange`. Altfel, o redimensionare
// făcută cât timp tab-ul e ascuns ar lăsa layout-ul blocat pe breakpoint-ul
// vechi până la următorul eveniment de resize.
import { useEffect, useState } from 'react';

export const MOBILE_MAX = 760;
export const NARROW_MAX = 1180;

const FALLBACK_MS = 150;

function read() {
  const vw = typeof window === 'undefined' ? 1600 : window.innerWidth;
  // coarse = pointerul PRIMAR e degetul (v1.2.2). Dashboard-ul rulează pe
  // tablete montate pe perete, atinse de la 1-2m — acolo lăţimea ecranului nu
  // spune nimic despre tipul de input: o tabletă de 10" poate raporta 1180px
  // şi tot cu degetul e atinsă. Deliberat `pointer: coarse`, NU `any-pointer`:
  // ţintim exact tableta; un desktop cu mouse rămâne pe dimensiunile fine.
  const coarse = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(pointer: coarse)').matches
    : false;
  return { vw, coarse, mob: vw < MOBILE_MAX, tab: vw >= MOBILE_MAX && vw < NARROW_MAX, narrow: vw < NARROW_MAX };
}

export function useBreakpoint() {
  const [bp, setBp] = useState(read);

  useEffect(() => {
    let raf = null;
    let timer = null;

    const apply = () => {
      raf = null;
      timer = null;
      setBp((prev) => {
        const next = read();
        // re-randăm doar când chiar se schimbă lăţimea sau tipul de pointer
        return next.vw === prev.vw && next.coarse === prev.coarse ? prev : next;
      });
    };

    const clear = () => {
      if (raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const schedule = () => {
      if (raf !== null || timer !== null) return;
      raf = requestAnimationFrame(() => {
        clear();
        apply();
      });
      timer = setTimeout(() => {
        clear();
        apply();
      }, FALLBACK_MS);
    };

    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    document.addEventListener('visibilitychange', schedule);
    schedule();

    return () => {
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      document.removeEventListener('visibilitychange', schedule);
      clear();
    };
  }, []);

  return bp;
}

/** Numărul de coloane pentru grilele de tile-uri (mod / ventilator / funcţii). */
export function tileCols(bp) {
  return bp.mob ? 2 : bp.tab ? 3 : 4;
}
