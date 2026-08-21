# Changelog

## 1.0.2

Nivelul de log nu mai poate împiedica pornirea serviciului. `bashio::config
'log_level'` interoghează API-ul Supervisor; dacă răspunsul lipseşte sau e gol,
`bashio::log.level` trata valoarea ca invalidă şi apela `exit.nok`, aşa că
scriptul murea înainte de `exec nginx` — dashboard-ul cădea din cauza unei
simple preferinţe de jurnalizare. Citirea e acum protejată cu
`bashio::config.has_value`, iar la lipsa valorii se continuă cu implicitul.

Prima versiune verificată prin build Docker local complet: imaginea se
construieşte (73 MB), containerul rămâne pornit sub s6, nginx ascultă pe 8099,
serveşte index.html, bundle-ul, imaginea hero şi fallback-ul SPA, iar accesul
din afara reţelei Supervisor primeşte 403, conform configuraţiei.

## 1.0.1

Reparare build: `.dockerignore` excludea `rootfs/` din build context, iar
`COPY rootfs /` din Dockerfile nu găsea ce să copieze, deci instalarea eşua.
`rootfs` a fost scos din lista de excluderi, cu o notă în fişier ca să nu fie
reintrodus. Restul excluderilor rămân — niciuna nu se mai suprapune cu vreun
`COPY`, verificat pentru toate cele 7.

## 1.0.0

Prima versiune împachetată ca add-on Home Assistant.

- Dashboard-ul portat din Claude Design, servit static de nginx prin ingress.
- Build în două etape: `node:22-alpine` compilează, imaginea finală conţine doar
  asset-urile şi nginx.
- Aceeaşi aplicaţie ca varianta rulată cu `npm run dev` — conexiunea WebSocket,
  maparea entităţilor şi comenzile către Home Assistant sunt neschimbate.
