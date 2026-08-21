# Changelog

## 1.0.4

Șapte corecții de etichetă/mapare, toate verificate manual în aplicațiile
native ale producătorilor (nu doar deduse din atributele HA):

1. **AC Etaj LG — Programare pornire/oprire.** Confirmat: decalaje în minute
   de-acum, nu ore fixe. Etichete schimbate din "Programare pornire" /
   "Programare oprire" în "Pornire peste (min)" / "Oprire peste (min)",
   remapate pe `sensor.etaj_aer_conditionat_lg_etaj_schedule_turn_on` /
   `_turn_off` (nu `number.*` — sensor-ul are `device_class: duration` și
   unitatea corectă `min`; number-ul avea `h`, greșit, pentru aceeași
   valoare brută). Rândurile au trecut din secțiunea "Funcții" (butoane
   dezactivate cu explicație "HA nu expune temporizatoarele") într-o
   secțiune nouă "Cronometre", ca valori citite real din HA.
2. **AC Etaj LG — Sleep timer.** Aceeași corecție de unitate, remapat pe
   `sensor.etaj_aer_conditionat_lg_etaj_sleep_timer` (min).
3. **AC Mansardă Vortex — High vs Turbo.** Confirmat corect așa cum era:
   trepte distincte în appul AUX Cloud nativ. Nicio schimbare de cod.
4. **AC Mansardă Vivax — treapta "full".** Nu s-a putut confirma
   corespondența exactă cu eticheta "Maxim" (appul Midea nativ arată doar
   un slider continuu, fără etichete separate). Eticheta a rămas
   neschimbată; adăugat un comentariu TODO în `accordions.js` lângă acest
   buton, documentând ambiguitatea pentru verificare ulterioară — butonul
   rămâne VERIFY, nu ghicim maparea.
5. **Pompă căldură Fairland — preset_modes.** Confirmat din appul Tuya
   nativ: Silențios / Smart / Turbo (nu Silențios / Eco / Turbo cum arăta
   design-ul). Eticheta "Eco" → "Smart" peste tot unde apărea (mini-buton
   pe cardul principal + panoul de Funcții din acordeon). În plus, butonul
   "Turbo" avea un bug real, independent de etichetă: lista lui de
   cuvinte-cheie (`boost`/`turbo`/`powerful`) nu conținea niciodată
   `quick` — valoarea reală din `preset_modes` — deci butonul nu se activa
   niciodată. Adăugat `quick` în lista de cuvinte-cheie; acum funcționează.
6. **Pompă căldură — "Debit apă".** `binary_sensor.pompa_caldura_piscina_water_flow`
   are `device_class: problem`, deci e un flag binar de eroare, nu o rată
   de debit. Etichetă schimbată din "Debit apă" în "Problemă debit apă",
   afișare Da/Nu (nu mai Pornit/Oprit), în toate cele 3 locuri unde apărea
   (pagina Piscină, cardul pompei de filtrare, cardul pompei de căldură).
7. **Event AC Etaj — Notification.** `event_types` conține o singură
   valoare posibilă (`water_is_full`). Nu există niciun slot/rând în design
   pentru acest event momentan, deci nu era nimic de reetichetat — notat
   aici pentru referință, în caz că se adaugă un rând pentru el mai târziu
   (ar trebui să se numească explicit "Alertă: rezervor plin", nu
   "Notificare" generică).

Catalogul de sloturi a crescut de la 108 la 111 (cele 3 sloturi noi pentru
cronometrele LG, punctele 1-2 de mai sus), iar cele mapate din audit de la
104 la 107 — cele 4 sloturi VERIFY rămase sunt neschimbate (fără
corespondent real în HA, vezi `UNMAPPED_REASONS`).

## 1.0.3

Maparea din audit (`SUGGESTED_MAP`, aceeaşi din spatele butonului "Aplică
maparea din audit") devine implicitul aplicaţiei, nu doar o acţiune manuală.
Până acum `loadMap()` întorcea direct ce era în `localStorage` — gol la prima
încărcare pe orice browser/device nou, deci ingress-ul din HA (origine diferită
de `localhost:5173` folosit la testare) pornea mereu nemapat, fiind nevoie de
un click pe "Aplică din audit" pe fiecare device.

`loadMap()` întoarce acum `{ ...SUGGESTED_MAP, ...stored }`: cele 104 potriviri
din audit sunt baza, iar orice alegere salvată explicit din ecranul de Mapare
suprascrie implicitul, nu invers. Cele 4 sloturi fără corespondent confirmat în
audit (`UNMAPPED_REASONS`) rămân nemapate şi afişează VERIFY, neschimbat.

Pentru ca "suprascrie" să funcţioneze şi în sens invers — cineva şterge manual
un slot care are implicit din audit —, butonul X din Mapare (`setSlot`) nu mai
şterge cheia din `entityMap`, ci o setează explicit la `''`. O cheie lipsă
înseamnă acum "fără opinie, foloseşte implicitul"; o cheie prezentă cu valoare
goală înseamnă "am ales explicit să nu mapez asta". Fără schimbarea asta,
implicitul din audit ar fi reapărut la următoarea încărcare a paginii, iar
butonul de ştergere n-ar mai fi putut aduce un slot înapoi la VERIFY.

Butonul "Aplică maparea din audit" rămâne — nu mai e necesar la prima
încărcare, dar tot are rost dacă cineva a şters manual un slot şi vrea implicitul
înapoi, sau dacă `SUGGESTED_MAP` se actualizează cu un audit mai nou.

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
