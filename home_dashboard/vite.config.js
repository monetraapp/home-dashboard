import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
