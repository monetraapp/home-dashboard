// Iconuri (v1.1.0): pachetul Lucide (licenţă ISC, https://lucide.dev) pentru
// toate iconurile semantice — stroke uniform 24px-grid, centrare optică
// garantată de viewBox simetric. Iconurile compozite specifice designului
// (unităţile AC/clorinator/pompă/TV, barele de viteză, boost, swingOff, tag)
// rămân cele desenate manual, copiate 1:1 din "Home Dashboard.dc.html".
import React from 'react';
import {
  House, TriangleAlert, CircleAlert, BarChart3, Power, Snowflake, Flame,
  RotateCw, Sun, Wind, Fan, Droplet, Moon, Leaf, Gauge, Clock, PlayCircle,
  SlidersHorizontal, X, Tv, Monitor, Server, Sparkles, RefreshCw, Lock,
  Shield, ShieldCheck, Ban, ArrowUpDown, ArrowLeftRight, Move, Waves,
  FlaskConical, Zap, Plug, Camera, Bell, ShoppingCart, MessageCircle, Check,
  ChevronLeft, ChevronRight, ChevronDown, Cloud, CloudSun, Download,
  GripVertical, BatteryMedium, Thermometer, Rocket, Wifi, Wrench, Archive,
  Armchair, CalendarMinus, CalendarPlus, Minus, Plus, DropletOff, HeartPulse,
  Cable, VolumeX, Clapperboard, BatteryCharging, UtilityPole, Activity,
  CarFront, CalendarDays,
  // (v1.5.0) navigaţie: în modul „etichetă doar pe tabul activ" silueta e
  // singurul indiciu, deci fiecare tab primeşte un obiect concret.
  AirVent, Cctv, LayoutGrid
} from 'lucide-react';

// nume istoric -> componenta Lucide (maparea semantică, nu aproximativă)
const LUCIDE = {
  home: House, alertTri: TriangleAlert, alertCircle: CircleAlert,
  barChart: BarChart3, power: Power, snow: Snowflake, flame: Flame,
  auto: RotateCw, sun: Sun, wind: Wind, fan: Fan, fan2: Fan,
  droplet: Droplet, moon: Moon, leaf: Leaf, gauge: Gauge, clock: Clock,
  calendarDays: CalendarDays,
  playCircle: PlayCircle, sliders: SlidersHorizontal, close: X, tv: Tv,
  monitor: Monitor, server: Server, sparkle: Sparkles, refresh: RefreshCw,
  lock: Lock, shield: Shield, shieldDot: ShieldCheck, ban: Ban,
  updown: ArrowUpDown, leftright: ArrowLeftRight, move: Move, waves: Waves,
  beaker: FlaskConical, bolt: Zap, plug: Plug, camera: Camera, bell: Bell,
  cart: ShoppingCart, chat: MessageCircle, check: Check,
  chevLeft: ChevronLeft, chevRight: ChevronRight, chevronDown: ChevronDown,
  cloud: Cloud, cloudSun: CloudSun, download: Download, grip: GripVertical,
  phoneBattery: BatteryMedium, radiator: Thermometer, rocket: Rocket,
  wifi: Wifi, wrench: Wrench, archive: Archive, sofa: Armchair,
  calDown: CalendarMinus, calUp: CalendarPlus, minus: Minus, plus: Plus,
  dropletOff: DropletOff, heartPulse: HeartPulse, cable: Cable,
  volumeX: VolumeX, clapperboard: Clapperboard,
  // energie (v1.1.3)
  batteryCharging: BatteryCharging, utilityPole: UtilityPole,
  activity: Activity, car: CarFront,
  // navigaţie (v1.5.0). Numele vechi rămân în hartă — `alertTri` e folosit în
  // 12 locuri (starea meteo `exceptional`, modul Auto din acordeoane), deci
  // NU se remapează; s-a schimbat doar ce cere bara de navigaţie.
  airVent: AirVent, cctv: Cctv, layoutGrid: LayoutGrid
};

export function el(tag, props, children) {
  return React.createElement(tag, props, children);
}

export function ic(name, opts) {
  opts = opts || {};
  const size = opts.size || 16;
  const color = opts.color || 'currentColor';
  const sw = opts.sw || 1.9;
  const L = LUCIDE[name];
  if (L) {
    // absoluteStrokeWidth: grosimea liniei ramane constanta indiferent de size
    return React.createElement(L, { size, color, strokeWidth: sw, absoluteStrokeWidth: true });
  }
  const SCALE = {
    snow: 0.92, sun: 0.9, wind: 1.06, fan: 1.3, fan2: 1.3, boost: 1.32, bars1: 1.2, bars2: 1.2, bars3: 1.2,
    flame: 1.14, droplet: 1.06, moon: 1.06, leaf: 1.02, gauge: 1.06, auto: 1.06, clock: 1.04, playCircle: 1.04,
    home: 0.96, alertTri: 0.96, tag: 1.0, barChart: 1.0, shieldDot: 0.98, power: 1.06, sliders: 1.04, close: 1.1
  };
  const k = SCALE[name] || 1;
  const common = {
    viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: color,
    strokeWidth: sw / k, strokeLinecap: 'round', strokeLinejoin: 'round'
  };
  let kids;
  switch (name) {
    case 'home': kids = [el('path', { key: 1, d: 'M12 3.4c.55 0 1.08.18 1.52.5l4.6 3.35c.9.65 1.28 1.82.94 2.88l-1.76 5.4a2.6 2.6 0 0 1-2.46 1.8H9.16a2.6 2.6 0 0 1-2.46-1.8L4.94 10.1a2.6 2.6 0 0 1 .94-2.88l4.6-3.34c.44-.32.97-.5 1.52-.5Z' })]; break;
    case 'tag': kids = [el('rect', { key: 1, x: 4.3, y: 5.4, width: 15.4, height: 13.2, rx: 4.4 }), el('path', { key: 2, d: 'M8.6 15.4c1.2-1.15 2.28-1.72 3.4-1.72s2.2.57 3.4 1.72' }), el('path', { key: 3, d: 'M7.1 12.6c1.7-1.65 3.25-2.47 4.9-2.47s3.2.82 4.9 2.47' })]; break;
    case 'alertTri': kids = [el('path', { key: 1, d: 'M10.28 5.1c.77-1.33 2.69-1.33 3.46 0l6.05 10.5c.76 1.33-.2 3-1.73 3H5.96c-1.54 0-2.5-1.67-1.73-3l6.05-10.5Z' }), el('path', { key: 2, d: 'M12 9.9v3.3' }), el('circle', { key: 3, cx: 12, cy: 15.7, r: 0.8, fill: color, stroke: 'none' })]; break;
    case 'barChart': kids = [el('rect', { key: 1, x: 4.3, y: 4.6, width: 15.4, height: 14.8, rx: 4.4 }), el('path', { key: 2, d: 'M9 15.5v-4.2M12 15.5V8.9M15 15.5v-2.6' })]; break;
    case 'shieldDot': kids = [el('path', { key: 1, d: 'M12 3.6c1.9 1.5 4 2.35 6.3 2.5v5.5c0 3.9-2.35 6.9-6.3 8.8-3.95-1.9-6.3-4.9-6.3-8.8V6.1c2.3-.15 4.4-1 6.3-2.5Z' }), el('path', { key: 2, d: 'M12 9.6v2.6' }), el('circle', { key: 3, cx: 12, cy: 14.4, r: 0.8, fill: color, stroke: 'none' })]; break;
    case 'power': kids = [el('path', { key: 1, d: 'M12 3v8' }), el('path', { key: 2, d: 'M6.5 6.5a8 8 0 1 0 11 0' })]; break;
    case 'snow': {
      const arm = [
        el('rect', { key: 'a', x: 11.05, y: 3, width: 1.9, height: 18, rx: 0.95, fill: color, stroke: 'none' }),
        el('path', { key: 'b', d: 'M12 7.9 9.4 5.9M12 7.9l2.6-2M12 16.1 9.4 18.1M12 16.1l2.6 2' })
      ];
      kids = [el('g', { key: 1 }, arm), el('g', { key: 2, transform: 'rotate(60 12 12)' }, arm), el('g', { key: 3, transform: 'rotate(120 12 12)' }, arm)];
      break;
    }
    case 'flame': kids = [el('path', { key: 1, d: 'M12 2.5c1 3 4 4.5 4 8.5a4 4 0 1 1-8 0c0-1.2.5-2 1-2.7 0 1.3 1 2 1.8 2 1.4 0 1-1.6.6-2.6-.6-1.5-.3-3.6.6-5.2Z' })]; break;
    case 'auto': kids = [el('path', { key: 1, d: 'M20 12a8 8 0 1 1-2.6-5.9' }), el('path', { key: 2, d: 'M20 4v4h-4' })]; break;
    case 'droplet': kids = [el('path', { key: 1, d: 'M12 3s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11Z' })]; break;
    case 'wind': kids = [
      el('path', { key: 1, d: 'M4.2 9.1h7.4a2.2 2.2 0 1 0-1.9-3.3' }),
      el('path', { key: 2, d: 'M6.4 12.6h9.6' }),
      el('path', { key: 3, d: 'M4.2 16.1h7.9a2.2 2.2 0 1 1-1.9 3.3' })]; break;
    case 'fan2': {
      const b2 = 'M12 12.6c-3.1.3-5.7-.9-5.6-2.9.1-1.9 2.7-2.7 4.5-1.3 1.1.9 1.5 2.4 1.1 4.2Z';
      kids = [el('circle', { key: 0, cx: 12, cy: 12, r: 1.5 }),
        el('path', { key: 1, d: b2 }), el('path', { key: 2, d: b2, transform: 'rotate(180 12 12)' })];
      break;
    }
    case 'fan': {
      const blade = 'M12 11.3c-.7-2.9.5-5.2 2.5-5.4 1.8-.2 2.7 1.8 1.6 3.4-.9 1.3-2.4 1.9-4.1 2Z';
      kids = [el('circle', { key: 0, cx: 12, cy: 12, r: 1.6 }),
        el('path', { key: 1, d: blade }), el('path', { key: 2, d: blade, transform: 'rotate(120 12 12)' }), el('path', { key: 3, d: blade, transform: 'rotate(240 12 12)' })];
      break;
    }
    case 'boost': kids = [el('path', { key: 1, d: 'M6.8 13.4 12 8.2l5.2 5.2' }), el('path', { key: 2, d: 'M6.8 17.6 12 12.4l5.2 5.2' })]; break;
    case 'bars1': kids = [el('path', { key: 1, d: 'M6.4 17.4v-3' }), el('path', { key: 2, d: 'M12 17.4v-3', opacity: 0.28 }), el('path', { key: 3, d: 'M17.6 17.4v-3', opacity: 0.28 })]; break;
    case 'bars2': kids = [el('path', { key: 1, d: 'M6.4 17.4v-3' }), el('path', { key: 2, d: 'M12 17.4v-6.4' }), el('path', { key: 3, d: 'M17.6 17.4v-3', opacity: 0.28 })]; break;
    case 'bars3': kids = [el('path', { key: 1, d: 'M6.4 17.4v-3' }), el('path', { key: 2, d: 'M12 17.4v-6.4' }), el('path', { key: 3, d: 'M17.6 17.4v-9.8' })]; break;
    case 'playCircle': kids = [el('circle', { key: 1, cx: 12, cy: 12, r: 7.8 }), el('path', { key: 2, d: 'M10.4 9.3 15.2 12l-4.8 2.7V9.3Z', fill: color, stroke: 'none' })]; break;
    case 'monitor': kids = [el('rect', { key: 1, x: 3.4, y: 5.2, width: 17.2, height: 11.4, rx: 2 }), el('path', { key: 2, d: 'M9.4 19.6h5.2' })]; break;
    case 'swingOff': kids = [el('circle', { key: 1, cx: 12, cy: 12, r: 1.4, fill: color }), el('path', { key: 2, d: 'M12 11c0-2.6 1.3-5.6 3.9-5.6' }), el('path', { key: 3, d: 'M11 13c-2.3 1.2-4.8 1-5.9-1.2' }), el('line', { key: 4, x1: 4.5, y1: 4.5, x2: 19.5, y2: 19.5 })]; break;
    case 'updown': kids = [el('line', { key: 1, x1: 12, y1: 3.5, x2: 12, y2: 20.5 }), el('polyline', { key: 2, points: '8.5,7.5 12,3.5 15.5,7.5' }), el('polyline', { key: 3, points: '8.5,16.5 12,20.5 15.5,16.5' })]; break;
    case 'leftright': kids = [el('line', { key: 1, x1: 3.5, y1: 12, x2: 20.5, y2: 12 }), el('polyline', { key: 2, points: '7.5,8.5 3.5,12 7.5,15.5' }), el('polyline', { key: 3, points: '16.5,8.5 20.5,12 16.5,15.5' })]; break;
    case 'move': kids = [el('line', { key: 1, x1: 12, y1: 3.5, x2: 12, y2: 20.5 }), el('line', { key: 2, x1: 3.5, y1: 12, x2: 20.5, y2: 12 }), el('polyline', { key: 3, points: '8.5,7.5 12,3.5 15.5,7.5' }), el('polyline', { key: 4, points: '8.5,16.5 12,20.5 15.5,16.5' }), el('polyline', { key: 5, points: '7.5,8.5 3.5,12 7.5,15.5' }), el('polyline', { key: 6, points: '16.5,8.5 20.5,12 16.5,15.5' })]; break;
    case 'leaf': kids = [el('path', { key: 1, d: 'M20 4C10 4 4 10 4 18c8 0 14-6 14-14Z' }), el('line', { key: 2, x1: 5, y1: 19, x2: 12, y2: 12 })]; break;
    case 'clock': kids = [el('circle', { key: 1, cx: 12, cy: 12, r: 8 }), el('path', { key: 2, d: 'M12 8v4l3 2' })]; break;
    case 'calDown': kids = [el('rect', { key: 1, x: 4, y: 5, width: 16, height: 15, rx: 2.5 }), el('line', { key: 2, x1: 4, y1: 10, x2: 20, y2: 10 }), el('line', { key: 3, x1: 8, y1: 3, x2: 8, y2: 6.5 }), el('line', { key: 4, x1: 16, y1: 3, x2: 16, y2: 6.5 }), el('path', { key: 5, d: 'M12 13v5m-2-2 2 2 2-2' })]; break;
    case 'calUp': kids = [el('rect', { key: 1, x: 4, y: 5, width: 16, height: 15, rx: 2.5 }), el('line', { key: 2, x1: 4, y1: 10, x2: 20, y2: 10 }), el('line', { key: 3, x1: 8, y1: 3, x2: 8, y2: 6.5 }), el('line', { key: 4, x1: 16, y1: 3, x2: 16, y2: 6.5 }), el('path', { key: 5, d: 'M12 18v-5m-2 2 2-2 2 2' })]; break;
    case 'bolt': kids = [el('polygon', { key: 1, points: '13,2 4,14 11,14 10,22 20,9 13,9', fill: color, stroke: 'none' })]; break;
    case 'moon': kids = [el('path', { key: 1, d: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z' })]; break;
    case 'shield': kids = [el('path', { key: 1, d: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z' }), el('path', { key: 2, d: 'M9 12l2 2 4-4' })]; break;
    case 'ban': kids = [el('circle', { key: 1, cx: 12, cy: 12, r: 8 }), el('line', { key: 2, x1: 6.3, y1: 6.3, x2: 17.7, y2: 17.7 })]; break;
    case 'lock': kids = [el('rect', { key: 1, x: 5, y: 11, width: 14, height: 9, rx: 2 }), el('path', { key: 2, d: 'M8 11V7a4 4 0 0 1 8 0v4' })]; break;
    case 'sparkle': kids = [el('path', { key: 1, d: 'M12 3v4M12 17v4M3 12h4M17 12h4' }), el('path', { key: 2, d: 'M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18' })]; break;
    case 'refresh': kids = [el('path', { key: 1, d: 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3' }), el('path', { key: 2, d: 'M18 3v4h-4M6 21v-4h4' })]; break;
    case 'radiator': kids = [el('rect', { key: 1, x: 5, y: 5, width: 14, height: 15, rx: 1.5 }), el('line', { key: 2, x1: 9, y1: 5, x2: 9, y2: 20 }), el('line', { key: 3, x1: 13, y1: 5, x2: 13, y2: 20 }), el('line', { key: 4, x1: 17, y1: 5, x2: 17, y2: 20 })]; break;
    case 'gauge': kids = [el('path', { key: 1, d: 'M4 15a8 8 0 1 1 16 0' }), el('line', { key: 2, x1: 12, y1: 15, x2: 15.5, y2: 10.5 }), el('circle', { key: 3, cx: 12, cy: 15, r: 1.4, fill: color })]; break;
    case 'alertCircle': kids = [el('circle', { key: 1, cx: 12, cy: 12, r: 8 }), el('line', { key: 2, x1: 12, y1: 8, x2: 12, y2: 13 }), el('circle', { key: 3, cx: 12, cy: 16, r: 1, fill: color, stroke: 'none' })]; break;
    case 'cloud': kids = [el('path', { key: 1, d: 'M7 18h10a4 4 0 0 0 .5-8 5.5 5.5 0 0 0-10.7 1.5A3.5 3.5 0 0 0 7 18Z' })]; break;
    case 'sofa': kids = [el('path', { key: 1, d: 'M5 12v6M19 12v6M5 12a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3H5Z' }), el('path', { key: 2, d: 'M6 10V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2' })]; break;
    case 'waves': kids = [el('path', { key: 1, d: 'M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0' }), el('path', { key: 2, d: 'M2 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0' }), el('path', { key: 3, d: 'M2 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0' })]; break;
    case 'wifi': kids = [el('path', { key: 1, d: 'M3 8.5a13 13 0 0 1 18 0' }), el('path', { key: 2, d: 'M6.2 12a8.5 8.5 0 0 1 11.6 0' }), el('path', { key: 3, d: 'M9.5 15.3a4 4 0 0 1 5 0' }), el('circle', { key: 4, cx: 12, cy: 18.3, r: 1, fill: color, stroke: 'none' })]; break;
    case 'server': kids = [el('rect', { key: 1, x: 4, y: 4.5, width: 16, height: 6.5, rx: 1.6 }), el('rect', { key: 2, x: 4, y: 13, width: 16, height: 6.5, rx: 1.6 }), el('circle', { key: 3, cx: 8, cy: 7.75, r: 0.9, fill: color, stroke: 'none' }), el('circle', { key: 4, cx: 8, cy: 16.25, r: 0.9, fill: color, stroke: 'none' })]; break;
    case 'plug': kids = [el('path', { key: 1, d: 'M9 3v5M15 3v5' }), el('rect', { key: 2, x: 7, y: 8, width: 10, height: 6, rx: 2 }), el('path', { key: 3, d: 'M12 14v3a3 3 0 0 1-3 3H8' })]; break;
    case 'beaker': kids = [el('path', { key: 1, d: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3' }), el('line', { key: 2, x1: 7, y1: 15, x2: 17, y2: 15 })]; break;
    case 'download': kids = [el('path', { key: 1, d: 'M12 4v11' }), el('polyline', { key: 2, points: '8,11 12,15 16,11' }), el('path', { key: 3, d: 'M5 18h14' })]; break;
    case 'archive': kids = [el('rect', { key: 1, x: 4, y: 8, width: 16, height: 12, rx: 1.5 }), el('path', { key: 2, d: 'M3 5h18v3H3z' }), el('line', { key: 3, x1: 10, y1: 13, x2: 14, y2: 13 })]; break;
    case 'wrench': kids = [el('path', { key: 1, d: 'M14.5 6.5a4 4 0 0 1-5.4 5.4L4 17l3 3 5.1-5.1a4 4 0 0 1 5.4-5.4l-2.3 2.3-2-2Z' })]; break;
    case 'tv': kids = [el('rect', { key: 1, x: 3.5, y: 5, width: 17, height: 12, rx: 1.6 }), el('line', { key: 2, x1: 9, y1: 20, x2: 15, y2: 20 })]; break;
    case 'cart': kids = [el('path', { key: 1, d: 'M4 5h2l2 10h9l2-7H7' }), el('circle', { key: 2, cx: 10, cy: 19, r: 1.2, fill: color, stroke: 'none' }), el('circle', { key: 3, cx: 16, cy: 19, r: 1.2, fill: color, stroke: 'none' })]; break;
    case 'phoneBattery': kids = [el('rect', { key: 1, x: 8, y: 2.5, width: 8, height: 19, rx: 2 }), el('rect', { key: 2, x: 10, y: 12.5, width: 4, height: 6, fill: color, stroke: 'none' })]; break;
    case 'camera': kids = [el('rect', { key: 1, x: 3, y: 7, width: 18, height: 12, rx: 2 }), el('path', { key: 2, d: 'M8 7l1.6-2.5h4.8L16 7' }), el('circle', { key: 3, cx: 12, cy: 13, r: 3.4 })]; break;
    case 'sun': {
      const rays = [];
      for (let r0 = 0; r0 < 8; r0++) rays.push(el('rect', { key: 'r' + r0, x: 11.2, y: 2.6, width: 1.6, height: 3.6, rx: 0.8, fill: color, stroke: 'none', transform: 'rotate(' + (r0 * 45) + ' 12 12)' }));
      kids = [el('circle', { key: 'c', cx: 12, cy: 12, r: 3.5, fill: 'none' })].concat(rays);
      break;
    }
    case 'cloudSun': kids = [el('circle', { key: 1, cx: 8, cy: 8, r: 2.6 }), el('path', { key: 2, d: 'M8 3v1.2M12.5 8h1.2M3.3 8h1.2M11 5l-.8.8M5 5l.8.8' }), el('path', { key: 3, d: 'M8.5 20h8a3.5 3.5 0 0 0 .4-7 4.8 4.8 0 0 0-9.2 1.3A3 3 0 0 0 8.5 20Z' })]; break;
    case 'rocket': kids = [el('path', { key: 1, d: 'M12 3c3 1 5 4 5 8 0 3-2 6-5 8-3-2-5-5-5-8 0-4 2-7 5-8Z' }), el('circle', { key: 2, cx: 12, cy: 10, r: 1.6 }), el('path', { key: 3, d: 'M9 17l-2 3M15 17l2 3' })]; break;
    case 'bell': kids = [el('path', { key: 1, d: 'M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z' }), el('path', { key: 2, d: 'M10 18a2 2 0 0 0 4 0' })]; break;
    case 'chat': kids = [el('path', { key: 1, d: 'M20 12a7 7 0 0 1-7 7H9l-4 2 1-3.5A7 7 0 1 1 20 12Z' })]; break;
    case 'close': kids = [el('path', { key: 1, d: 'M7 7l10 10M17 7 7 17' })]; break;
    // minus/plus ca SVG (viewBox simetric) — glifele de font stau pe linia de
    // bază şi nu se centrează optic în butoanele rotunde (bug 0.3, v1.1.0)
    case 'minus': kids = [el('path', { key: 1, d: 'M5 12h14' })]; break;
    case 'plus': kids = [el('path', { key: 1, d: 'M12 5v14M5 12h14' })]; break;
    case 'check': kids = [el('polyline', { key: 1, points: '6,12.6 10.2,16.6 18,7.8' })]; break;
    case 'plus': kids = [el('path', { key: 1, d: 'M12 6v12M6 12h12' })]; break;
    case 'sliders': kids = [el('path', { key: 1, d: 'M4 8h11M18.5 8H20M4 16h5M12.5 16H20' }), el('circle', { key: 2, cx: 16.6, cy: 8, r: 2 }), el('circle', { key: 3, cx: 10.6, cy: 16, r: 2 })]; break;
    case 'acUnit': kids = [el('rect', { key: 1, x: 2.6, y: 6.4, width: 18.8, height: 7.6, rx: 2.2 }), el('path', { key: 2, d: 'M4.6 14v1.4M19.4 14v1.4' }), el('path', { key: 3, d: 'M6.6 10.1h10.8' }), el('path', { key: 4, d: 'M8.4 17.2c1.1 0 1.1 1.6 2.2 1.6M13.4 17.2c1.1 0 1.1 1.6 2.2 1.6' })]; break;
    case 'tvUnit': kids = [el('rect', { key: 1, x: 2.4, y: 4.6, width: 19.2, height: 12.2, rx: 2 }), el('path', { key: 2, d: 'M9.2 20h5.6M12 16.8V20' })]; break;
    case 'pumpUnit': kids = [el('circle', { key: 1, cx: 10.4, cy: 12.6, r: 5.2 }), el('circle', { key: 2, cx: 10.4, cy: 12.6, r: 1.5 }), el('path', { key: 3, d: 'M10.4 7.4V4.6h6.2v3.6' }), el('path', { key: 4, d: 'M15.6 12.6h4.8v5.4' })]; break;
    case 'heatUnit': kids = [el('rect', { key: 1, x: 3.2, y: 5.6, width: 17.6, height: 12.8, rx: 2.4 }), el('circle', { key: 2, cx: 9.4, cy: 12, r: 3.6 }), el('path', { key: 3, d: 'M15.4 9.2h3.2M15.4 12h3.2M15.4 14.8h3.2' })]; break;
    case 'clorUnit': kids = [el('path', { key: 1, d: 'M8.4 4.6h7.2v3.2l2.6 4.4v5.6a2 2 0 0 1-2 2H7.8a2 2 0 0 1-2-2v-5.6l2.6-4.4V4.6Z' }), el('path', { key: 2, d: 'M6.4 14.2h11.2' }), el('circle', { key: 3, cx: 12, cy: 17, r: 1.3 })]; break;
    case 'chevronDown': kids = [el('polyline', { key: 1, points: '6.8,9.8 12,15.2 17.2,9.8' })]; break;
    case 'grip': kids = [el('circle', { key: 1, cx: 9.2, cy: 6.6, r: 1.25, fill: 'currentColor', stroke: 'none' }), el('circle', { key: 2, cx: 14.8, cy: 6.6, r: 1.25, fill: 'currentColor', stroke: 'none' }),
      el('circle', { key: 3, cx: 9.2, cy: 12, r: 1.25, fill: 'currentColor', stroke: 'none' }), el('circle', { key: 4, cx: 14.8, cy: 12, r: 1.25, fill: 'currentColor', stroke: 'none' }),
      el('circle', { key: 5, cx: 9.2, cy: 17.4, r: 1.25, fill: 'currentColor', stroke: 'none' }), el('circle', { key: 6, cx: 14.8, cy: 17.4, r: 1.25, fill: 'currentColor', stroke: 'none' })]; break;
    case 'chevLeft': kids = [el('polyline', { key: 1, points: '14,6.5 8.8,12 14,17.5' })]; break;
    case 'chevRight': kids = [el('polyline', { key: 1, points: '10,6.5 15.2,12 10,17.5' })]; break;
    default: kids = [el('circle', { key: 1, cx: 12, cy: 12, r: 8 })];
  }
  return el('svg', common, k === 1 ? kids : el('g', { transform: 'translate(12 12) scale(' + k + ') translate(-12 -12)' }, kids));
}
