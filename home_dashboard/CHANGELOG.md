# Changelog

## 1.0.6

Patru schimbări, un singur release:

**1. Eliminate cele 3 sloturi fără corespondent hardware** — `sensor.temp_exterior`,
`number.pompa_debit`, `sensor.pompa_consum` au dispărut complet din catalog
(butonul × din Mapare doar golea maparea, nu ştergea slotul). Afişajele
"Exterior" de pe pagina Climat (chip + rândul din "Temperaturi pe zone") citesc
acum `weather.main` direct, cu `attr: 'temperature'` — mecanismul FALLBACK din
`entities.js` a devenit gol şi e documentat ca atare. `UNMAPPED_REASONS` e gol:
fiecare slot rămas are mapare din audit.

**2. Dial-ul cardului "Pompă filtrare" eliminat** (decizia utilizatorului, era
raportat ca imposibil-de-legat în v1.0.5). Cardul păstrează toggle-ul on/off şi
temperatura apei; în locul cadranului apare un bloc de stare (iconiţă + text
"Pornită"/"Oprită") cu exact aceeaşi înălţime (132px), deci layout-ul rămâne
aliniat cu al celorlalte carduri, fără spaţiu gol. Mecanic: `dial: null` pe
card, `hasDial` în `buildDeviceCard`, ramură alternativă în `DeviceCard`;
inelul mic din sidebar arată "Pornită"/"Oprită" în loc de valoare. `buildModal`
avea deja garda `hasTarget: !!def.dial`, deci panoul de setări nu mai afişează
rândul de valoare ţintă de la sine.

**3. Switch Foişor + Switch Etaj pe pagina Reţea** — 10 sloturi noi
(`net.swf_*`, `net.swe_*`) mapate pe senzorii TP-Link Omada existenţi
(A8-29-48-ED-C7-2D = Foişor ES206XPP-M2, A8-29-48-EE-DE-FC = Etaj ES206X-M2),
cu etichete lizibile, nu MAC-uri. Monitoare noi "Switch Foişor" / "Switch Etaj"
(Stare/CPU/Memorie) lângă Gateway şi Switch Principal, plus "Switch Foişor ·
porturi 1–4" în cardul Consum PoE. Doar senzori read-only — comutatoarele PoE
rămân interzise. Easy Managed-urile nu au entitate de firmware, deci rândul
Firmware lipseşte intenţionat la ele.

**4. Indicatori add-on-uri pe Mentenanţă** — cele 4 `binary_sensor.*_running`
(Fusion, Get HACS, Home Dashboard, Matter Server) EXISTAU în registry dar erau
`disabled_by: integration`, deci invizibile în state machine — asta împacă
raportul v1.0.5 ("nu există") cu exportul pe device-uri ("există"): ambele erau
corecte, pe surse diferite. Au fost activate din registry (2026-08-22),
confirmate cu stări live, şi adăugate ca monitor read-only "Add-on-uri" pe
Mentenanţă. Comutatoarele `switch.fusion`/`switch.home_dashboard`/etc. NU se
expun — oprirea accidentală a unui add-on de pe dashboard e exact genul de
acţiune periculoasă evitată. Alte entităţi `*_running` nu există (căutat
explicit).

Bilanţ sloturi: **131 total, 131 mapate, 0 nemapate** (120 − 3 eliminate + 10
reţea + 4 add-on-uri).

## 1.0.5

Audit "zero elemente nefuncţionale": tot ce e vizibil pe dashboard trebuie să
funcţioneze, altfel se elimină sau se documentează explicit ca imposibil.

**Cauza reală a VERIFY-urilor de pe cardul Vortex** (raportate şi în v1.0.0):
cele 8 "Funcţii" încercau potrivirea pe `preset_modes` al entităţii
`climate.aux_cloud_ec0baeae4fb7_ac` — care NU are `preset_modes` deloc. În
realitate funcţiile sunt switch-uri AUX Cloud separate. Au fost adăugate 8
sloturi noi (`switch.vx_*`) mapate direct pe ele; chip-urile folosesc acum
`A.slot(...)` şi comută/reflectă starea reală.

Acelaşi tipar la **AC Etaj LG · Economie**: era `A.preset` pe un climate fără
preset_modes; acum e slotul `switch.lg_economie` →
`switch.etaj_aer_conditionat_lg_etaj_energy_saving`.

**Cronometrele LG** remapate de pe `sensor.*` (read-only) pe `number.*`
(controlabile prin `number.set_value`), la cererea explicită a utilizatorului,
şi expuse şi ca valori ţintă editabile în panoul acordeonului. Cheile de slot
rămân neschimbate ca să nu orfanizeze mapările din localStorage. "—" în
rândurile Cronometre e comportament corect (LG raportează unknown până setezi
un temporizator), documentat în cod.

**Eliminate (butoane/elemente care nu puteau face nimic, cu entitate
inexistentă):**
- Pompă filtrare: secţiunile "Viteză" şi "Program", setpoint-ul "Debit pompă",
  rândul "Consum", minis "Auto"/"Programat", cele 4 circles — pompa e strict
  on/off, nu există entităţi de viteză/program/consum. Ambient-ul cardului
  arată acum temperatura apei (reală) în loc de "Consum VERIFY".
- Pompă căldură: chip-ul "Doar ventilator" (fan_only nu există în hvac_modes
  [off, auto, cool, heat]) şi butonul inert "Temporizator".
- Clorinator: butoanele inerte "Oprit" şi "Auto după ORP".
- TV-uri: butonul inert "Redare" (toate cele 8 carduri); chip-ul "Plex"
  (inexistent în orice source_list) înlocuit cu "TV" (`live tv` pe LG, `TV` pe
  Samsung).

**Raportat ca imposibil, păstrat intenţionat:** dial-ul cardului Pompă filtrare
(element structural al designului; nu există nicio entitate numerică a pompei)
— afişează VERIFY ca marker onest. Chip-ul "Maxim" (Vivax, fan "full") rămâne
în aşteptarea confirmării fizice (TODO existent din v1.0.4).

**Energie:** inelul de pe Acasă şi rândul de pe pagina Energie nu mai afişează
"Energie VERIFY": `energy.total_luna` e mapat pe singurul contor real
(`sensor.etaj_aer_conditionat_lg_etaj_energy_this_month`), iar etichetele spun
explicit "AC Etaj" ca să nu pretindă că e totalul casei. Secţiunea "Rezervat
pentru extindere" (Grid/PV Growatt/APX/THOR) rămâne — e deja marcată onest ca
rezervată.

**Test corectat:** regula "niciun control interzis" folosea `^switch\.aux_`,
care ar fi blocat şi switch-urile legitime `switch.aux_cloud_*` (Vortex);
ancorat pe `^switch\.aux_\d+$` ca să interzică exact `switch.aux_1/2`
(ieşirile necunoscute ale clorinatorului).

Bilanţ sloturi: 120 total (111 + 8 Vortex + 1 Economie LG), 117 mapate,
3 rămase VERIFY cu motiv (temp exterior — se ia din weather; debit pompă şi
consum pompă filtrare — hardware fără astfel de entităţi).

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
