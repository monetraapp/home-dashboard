import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// Versiunea add-on-ului, injectata la build. Pana acum o stia doar auditul, care
// citea config.yaml direct; aplicatia nu si-o putea spune singura, iar panoul de
// observabilitate are nevoie de ea ca sa poti compara ce ruleaza cu ce e instalat.
const APP_VERSION = (readFileSync(new URL('./config.yaml', import.meta.url), 'utf8')
  .match(/version:\s*"([^"]+)"/) || [])[1] || 'necunoscuta';

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  // Căi relative pentru asset-uri. Obligatoriu pentru ingress-ul Home Assistant:
  // add-on-ul e servit sub /api/hassio_ingress/<token>/, deci un `/assets/...`
  // absolut ar cădea în afara prefixului şi ar da 404. Cu './' browserul
  // rezolvă asset-urile relativ la documentul curent, corect şi în dev, şi sub ingress.
  base: './',
  server: {
    // 0.0.0.0 so the dashboard is reachable from phones/tablets on the LAN
    host: true,
    port: 5173,
    strictPort: false
  },
  preview: {
    host: true,
    port: 4173
  }
});
