# Changelog

## 1.1.5

Pagina Energie, reconstruită după designul "Energie Redesign v2"
(claude.ai/design): instrument cu scenă-erou, categorii şi grafică proprie
per categorie. 6 sloturi noi (total 253, toate mapate).

1. **Layout nou complet**: KPI-erou cu context (bara de capacitate din
   `opfullwatt`, nu constante), diagrama de flux în scenă-erou (orizontală pe
   desktop/tabletă, verticală pe telefon), rând de 4 KPI secundare, navigaţie
   pe 5 categorii (Prezentare · Producţie · Baterie · Reţea · Invertor) cu
   valori live, tabelele detaliate rămase jos ca secţiune "doar informativ".
2. **KPI-ul principal urmează categoria şi perioada** (Prezentare/Producţie =
   producţie, Baterie = SOC, Reţea = direcţia schimbului, Invertor =
   temperatura maximă).
3. **Selector de perioadă Oră · Zi · Săpt. · Lună · An**: Oră/Zi din
   `history_during_period` (rezoluţie fină), Săptămână/Lună/An din
   `recorder/statistics_during_period` (hook nou `useStatistics`) — sursele
   sunt oglinzile-template cu `state_class` + senzorii Growatt curaţi;
   perioadele fără statistici încă afişează starea goală şi se populează
   singure.
4. **Grafică per categorie**: "Arcul zilei" (răsărit–apus din `sun.sun`,
   grosimea = producţia, linia interioară = consumul), "Producţie vs consum"
   suprapuse cu arie, "Spectrul stringurilor" (PV1–PV4 cu marcaj de vârf din
   istoric, PV4 estompat), "Pachet APX" (SOC + dezechilibru celule),
   "Unde merge energia" (formula corectată: PV→casă = pv_out − export −
   încărcare baterie), "Harta termică" FĂRĂ prag inventat (85 °C eliminat).
5. **Valori derivate cu comportament strict**: delta "vs ieri aceeaşi oră",
   "vârf azi la ora X" şi sparkline-urile din "Bilanţ azi" se calculează din
   recorder; datele lipsă = "—", niciodată zero inventat. Consumul casei =
   autoconsum + import (formula în tooltip); raport export/import = "—" la
   import zero.
6. **Panoul "Ce se întâmplă acum" NU e implementat** (motor de analiză —
   v1.1.6); rail-ul păstrează doar "Bilanţ azi".
7. Se păstrează din v1.1.4: logica particulelor (proporţionale, direcţie
   dinamică), pauza la `visibilitychange` + `prefers-reduced-motion`,
   comutatorul "Animaţii", tooltips prin portal cu long-press, opacity 0.55
   pentru zerouri valide. `Tip`/`Roll`/`pressProps` extrase în `overlay.jsx`.

## 1.1.4

Diagrama de flux energetic — piesa centrală a paginii Energie, în locul
barei orizontale din v1.1.3.

1. **Diagramă SVG cu 5 noduri** (Soare sus, Invertor centru, Baterie stânga,
   Casă dreapta, Reţea jos) şi trasee cu **particule luminoase** care curg în
   direcţia reală a fluxului. Direcţia se inversează dinamic: bateria descarcă
   → particulele merg spre invertor; import din reţea → la fel.
2. **Proporţionalitate reală**: viteza particulelor şi grosimea traseului
   cresc cu puterea (praguri 100 W … 15 kW — modul pur `flowMath.js`, acoperit
   de teste). Sub 100 W traseul rămâne static, fără particule.
3. **Lizibil de la distanţă, fără hover**: badge-uri cu valoarea în W/kW
   (min. 18px la lăţimea de referinţă, contur închis prin `paint-order` — nu
   doar glow), cuvânt de direcţie pe ramurile bidirecţionale, SOC pe nodul
   bateriei. Nodurile inactive se estompează la opacity 0.55.
4. **Curbă de producţie pe ziua curentă** sub diagramă (bloc nou `daychart`):
   arie umplută cu ore pe axa X, agregată din istoricul recorder al
   `pv_input_actual` (stare de sensor, nu atribut — lecţia v1.1.1), coşuri de
   15 minute cu carry-forward şi punct accentuat pe "acum".
5. **Cifrele din rândul-erou rulează** spre valoarea nouă (~400ms, ease-out),
   nu mai sar brusc.
6. **Constrângeri pentru tableta montată**: rAF-ul se opreşte când pagina nu
   e vizibilă (`visibilitychange`) şi respectă `prefers-reduced-motion`;
   comutator nou "Animaţii" în bara de sus (persistat în preferinţe) — oprit,
   diagrama rămâne complet funcţională static.

## 1.1.3

Pagina Energie, reconstruită în jurul invertorului hibrid Growatt 25 kW
(device MQTT KNN2E3S00W, prin Grott). 111 sloturi noi, toate mapate pe
entity_id-uri confirmate live şi validate de auditul de coerenţă fizică
din 2026-08-22.

1. **Rând-erou cu 4 valori mari** — Producţie (PV total), Consum casă,
   Baterie (SOC + indicator încărcare/descărcare din pchr/pdischr) şi
   Reţea (direcţie export/import/echilibru din ptogridtotal/ptousertotal).
2. **Bară de flux orizontală** soare → casă → baterie → reţea, cu lăţimea
   segmentelor proporţională cu puterea instantanee.
3. **Şase secţiuni cu rezumat vizibil + detaliu extensibil** (bloc nou
   `expand`): Producţie fotovoltaică, AC trifazat (cu bare de echilibru al
   fazelor), Baterie APX, Reţea, Backup EPS, Stare invertor. Detaliile se
   deschid dintr-un buton "Detalii (N)".
4. **Zerourile valide se afişează estompat** (opacity 0.55): string PV4 şi
   ieşirea EPS — hardware inexistent/inactiv, nu senzori defecţi.
5. **Valori scalate la afişare** (opţiunea nouă `scale` din `fmt`): factorul
   de putere brut ×1000 → 1.00, tensiunile de celulă din mV → V; rând
   calculat "Dezechilibru celule" (max−min, în mV).
6. **Registrele respinse de audit NU sunt mapate** (bmsbatteryavgtemp,
   esystotal ×10, ipf, iso negativ, eload* nepopulate, pchrxxxl etc.) —
   verificat şi de un test dedicat.
7. **Descrieri RO noi (~60)** pentru toate rândurile Growatt + tooltip-uri pe
   rândurile de monitor (portal, long-press pe mobil), iconuri Lucide noi
   (battery-charging, utility-pole, activity, car-front).
8. Cardul "AC Etaj LG" şi graficul de consum rămân pe pagină; slotul
   rezervat s-a restrâns la încărcătorul EV THOR (neinstalat).

## 1.1.2

Şase ajustări punctuale din turul vizual al v1.1.1.

1. **Vivax "Maxim" mapat pe `fan_mode: 'full'`** — ambiguitatea a fost închisă
   de investigaţia read-only: Turbo-ul fizic de pe telecomandă = preset
   `boost` (deja pe card), iar `full` = treapta de ventilator 100% (Midea:
   silent 20 / low 40 / medium 60 / high 80 / full 100). Implementat printr-un
   **set de cuvinte-cheie dedicat** (`FAN.full`), nu prin extinderea lui
   `FAN.turbo` — setul partajat e folosit şi de chip-ul Turbo al Vortex-ului
   şi nu trebuie să-şi schimbe potrivirea pe alte unităţi.
2. **"Boost" → "Turbo" doar pe cardul Vivax** (chip-ul din Funcţii + cercul de
   pe cardul compact), ca să corespundă etichetei fizice de pe telecomandă.
   Maparea rămâne `preset_mode: boost`, neschimbată. Regimul "Boost" al
   clorinatorului (Piscină) NU a fost atins — verificat explicit cu grep.
3. **"Mut" → "Mute"** peste tot + mutat din rândul de toggle-uri în **rândul
   de butoane rotunde**, ca al cincilea buton (activ/inactiv prin culoare, ca
   restul). Zona goală din stânga cardului TV a dispărut; rândul de toggle-uri
   nu se mai randează deloc când e gol (repara în trecere şi rândul gol de pe
   cardul Pompă filtrare). Ruta specială Hisense (switch-ul dedicat de mute)
   şi gating-ul pe standby sunt păstrate — acţiunea e aceeaşi, doar locul şi
   forma butonului s-au schimbat.
4. **Tooltip pe controale dezactivate — cauza reală**: nu pointer-events
   (bula e în portal, în afara cardului), ci **coordonate fixe devenite
   stale**: poziţia se calcula o singură dată, la apariţie; dacă pagina se
   derula cu tooltip-ul deschis, bula rămânea la coordonatele vechi, peste
   alte elemente. Acum se reancorează imediat la scroll (capture) şi resize.
   În plus, fundalul e aproape opac (0.97) pentru lizibilitate pe orice
   fundal, iar cazul raportat (tooltip-ul lui Mute peste rândul de surse)
   dispare şi structural — Mute e acum chiar în rândul de jos.
5. **Logo-ul "fusion" eliminat** din bara de sus (branding rămas din portarea
   designului); taburile încep din stânga barei, fără gol suspect.
6. **Salut adaptiv corect**: 05–10:59 "Bună dimineaţa" / 11–17:59 "Bună ziua"
   / 18–21:59 "Bună seara" / 22–04:59 **"Noapte bună"** (pragurile vechi
   afişau "Bună dimineaţa" la 02:47). Ora e cea locală a browserului; `now`
   se actualizează la fiecare secundă, deci salutul se schimbă şi cu pagina
   deschisă. Fade-in de 280ms care rulează O SINGURĂ DATĂ per schimbare
   (`key={greeting}` remontează elementul doar când textul se schimbă) — fără
   animaţie în buclă.

## 1.1.1

Corecţii găsite la turul vizual al utilizatorului după v1.1.0.

**P1 · Tooltip-uri — rescrise pe portal.** Soluţie: `createPortal` în `<body>`
+ poziţionare calculată manual cu `getBoundingClientRect` (fără dependinţe noi
— Floating UI ar fi fost overkill pentru un singur tip de element). Rezolvă
toate cele 5 defecte dintr-o mişcare:
- 1.1 nu mai poate fi tăiat de viewport: shift pe X până încape complet,
  niciodată trunchiere;
- 1.2 două tooltip-uri simultan — cauza reală: chei duplicate (`'tile:' +
  slot`) când acelaşi slot apărea de două ori pe o pagină (ex.
  `binary_sensor.pc_debit` pe cardul pompei de filtrare ŞI al pompei de
  căldură) — ambele elemente credeau că sunt hovered. Cheile includ acum
  contextul (card+secţiune / poziţie în grilă);
- 1.3 nu mai acoperă butoane: `pointer-events:none` + offset 10px + portal
  (nu mai e în fluxul cardului);
- 1.4 săgeată către element, orientată corect după plasarea finală
  (sus/jos), aliniată pe centrul elementului şi limitată la corpul bulei;
- 1.5 regulă fixă de poziţionare: implicit DEDESUBT; flip deasupra doar dacă
  nu încape jos; consecvent peste tot.

**P2.1 · Producţie clor — cele 4 butoane VERIFY eliminate.** Investigat:
iAqualink nu expune NICIO entitate reglabilă de producţie — doar switch-urile
`production`/`low`/`boost` şi senzorii `swc` (50) / `swc_low` (10). Treptele
25/50/75/100% nu pot fi comandate din HA; reglajul fin se face doar din appul
iAqualink, iar regimurile reale (Redus/Normal/Boost) există deja pe card.
Eliminate şi dublurile: cercurile "Producţie 25–100%" de pe ambele carduri de
clorinator şi setpoint-ul "Producţie clor" (valoarea e deja în centrul
cadranului, care rămâne afişaj read-only al senzorului).

**P2.2 · "Evoluţie temperaturi" gol — cauză diagnosticată şi reparată.**
Seriile erau definite pe ATRIBUTE (`climate.vortex` + `attr:
current_temperature`), dar fetch-ul de istoric foloseşte `no_attributes:true`
(by design, eficient) — deci atributele nu pot avea istoric, indiferent de
mapare. Recorder-ul ARE datele pe senzorii dedicaţi (verificat live:
envtemp 1305 puncte/3 zile, setpoint Vortex 145, ac_etaj_ambient 37,
vivax_ambient 201). 4 sloturi noi de serie (`sensor.mans_ambient`,
`sensor.mans_setpoint`, `sensor.lg_ambient`, `sensor.vv_ambient`) mapate pe
ei; ambele grafice Climat funcţionează acum. Notă: istoricul setpoint-ului
Vortex conţine scurte căderi reale la 0.0 (raportate de integrare) — apar în
grafic pentru că sunt în date. Acelaşi diagnostic a curăţat şi Piscina: seria
"Ţintă pompă căldură" (atribut, fără senzor-sursă) a fost eliminată din
graficul de temperatură apă — ar fi rămas permanent goală.

**P3 · Intervale corectate (pagina Piscină).** Ţintele pH/ORP sunt senzori
read-only fără `min`/`max`/`step` declarate (verificat în entităţi), deci
default-ul generic 0–100 pas 1 era fals — ORP-ul real (730 mV) ieşea din
interval. `spNumber` acceptă acum limite de rezervă folosite DOAR când
entitatea nu declară nimic: pH 6.8–8.0 pas 0.1 (afişează 7.3, nu 7), ORP
600–850 mV pas 10. Verificare generală: toate celelalte controale numerice au
valoarea curentă în interval (producţie clor 50 în 0–100, volum 0–100,
temperaturi în min/max din entităţi, cronometre LG 0–100 nativ) — singurul
out-of-range era ORP.

Sloturi: 136 total, 136 mapate. Nemapat vizual rămâne DOAR chip-ul Vivax
"Maxim" (fan `full`) — intenţionat, în aşteptarea confirmării fizice
(decizia utilizatorului, neatinsă).

## 1.1.0

Design & UX (4 commit-uri incrementale, un singur rebuild).

**P0 — bug-uri:**
- **0.1 · Ţinta LG dispărea cu unitatea oprită.** Confirmat live: doar
  `lg_thinq` raportează `temperature: null` la oprire (Vortex/Vivax/Fairland
  păstrează valoarea). Acum ultima ţintă non-null a FIECĂREI entităţi climate e
  memorată (sesiune + localStorage `hd.ha.lastTargets`), cu fallback unic din
  istoricul HA (`history_during_period`, 7 zile) când nu există nimic salvat.
  Valoarea memorată se afişează estompat (opacity 0.55) în dial, sidebar,
  panoul de setări, modal şi cardul "Control climat"; fără nimic → "—".
- **0.2 · Etichete trunchiate** (`swing_mo...`): valorile tehnice de sub
  etichete au fost eliminate complet (vezi P1).
- **0.3 · Glife −/+ necentrate optic:** înlocuite caracterele text cu iconuri
  SVG `minus`/`plus` (viewBox simetric) în TOATE butoanele: dialurile
  cardurilor, setpoints din acordeoane, modalul de device şi slider-ul din
  "Control climat".
- **0.4 · Controale TV active în standby:** `mute` şi `select_source` sunt
  acum blocate (dezactivate vizual + funcţional, cu explicaţie în tooltip)
  când media_player-ul e `off`/`standby` — comanda nu mai pleacă spre HA ca să
  eşueze. Volumul era deja tratat în v1.0.7. Butonul de pornire rămâne activ.
  AC-urile NU au fost gate-uite: `set_hvac_mode` pe unitate oprită e chiar
  modul standard de pornire în HA; comportamentul fan/preset cu unitatea
  oprită nu a fost testat prin comenzi reale (hardware real) — dacă apar
  erori, acelaşi mecanism se extinde trivial.
- **0.5 · Verificare `supported_features` (principiu general):** acţiunile
  media verifică acum biţii reali (VOLUME_MUTE=8, VOLUME_SET=4,
  SELECT_SOURCE=2048). Hisense (HomeKit, features=18817) nu are mute/volum
  prin media_player: mute-ul lui e rutat prin switch-ul dedicat
  (`switch...hisense_mute`, slot nou `media.etaj_hisense_mute`), iar dial-ul
  de volum se ascunde singur (bloc de stare în loc). Per TV: Samsung/LG
  (24509) au tot; Hisense are pornire/oprire, surse, play/pauză — fără volum.
  Teste noi în suita de logică acoperă standby + feature-gating.
- **0.6 · Zecimale:** formatare unificată după pas (`tempDecimals`): pas
  întreg → fără zecimală ("19°"), pas 0.5 → o zecimală. Aplicat în dial,
  setpoints, modal şi "Control climat" (fostul "Ţinta 19.0 °C").

**P1 — descrieri:** dicţionar centralizat `src/model/descriptions.js` (~60 de
intrări în română, concrete — ce face funcţia, nu ce valoare trimite), cheie
`Context|Etichetă` cu fallback pe etichetă. Tooltip nou: colţuri 12px, fundal
cu blur, animaţie de intrare 160ms (keyframes injectate), max-width 240px,
text pe mai multe rânduri. Mobil: **long-press ≥450ms** pe orice buton arată
descrierea şi suprimă activarea; tap-ul scurt comută normal — ales pentru că
nu adaugă UI suplimentar şi nu intră în conflict cu tap-ul obişnuit. Fără
săgeată către element şi fără repoziţionare inteligentă la marginea
viewport-ului (limitare cunoscută, notată).

**P2 — iconuri:** pachetul **Lucide** (licenţă ISC, lucide.dev) prin
`lucide-react` — grilă 24px, stroke uniform (absoluteStrokeWidth), centrare
optică garantată; în bundle intră doar iconurile importate. Mapări semantice
corectate: Anti-mucegai → DropletOff (uscare, nu "interzis"), Health →
HeartPulse, Mut → VolumeX, HDMI → Cable, Netflix → Clapperboard, Afişaj →
Monitor. Iconurile compozite proprii designului (unităţile AC/clorinator/
pompă/TV, barele de viteză, boost, swingOff) rămân cele originale.

**P3 — responsive (parţial):** ţinte de tap ≥44px pe mobil (butoanele −/+ ale
dialurilor, cercurile de acţiune, setpoints, modal), dial scalat la 116px pe
telefon cu ticks şi knob proporţionale. **Nevalidat vizual pe cele 7
breakpoint-uri** — vezi nota de mai jos.

**Notă de onestitate:** verificarea vizuală breakpoint-cu-breakpoint (360→2560
pe 8 pagini) şi auditul complet de coerenţă (P4: scală de spacing, contrast
WCAG, ierarhie tipografică) NU au putut fi executate în această sesiune:
aplicaţia cere autentificare cu token HA, pe care asistentul nu are voie să-l
introducă, deci nu poate vedea dashboard-ul randat. Cele 44 de comparaţii de
stil rămân verzi legitim: toate schimbările vizuale trăiesc în build/
Dashboard/icons, nu în tokens.js (care păstrează fidelitatea cu mockup-ul).

## 1.0.7

Bug-uri + normalizare controale numerice. Fără modificări de design major.

**0.1 · "Regresia" Vortex — diagnostic.** Codul v1.0.6 NU poate afişa VERIFY pe
chip-urile Vortex: referinţele vechi (preset-uri, `sensor.pompa_consum`,
dial-ul pompei) nu mai există în surse şi nici în bundle-ul compilat (verificat
cu grep pe `dist/` după build). Elementele din capturi provin de la un client
vechi: un tab deschis de dinainte de 1.0.5 (SPA-ul păstrează JS-ul vechi în
memorie şi vorbeşte direct cu HA prin WebSocket, deci "merge" la nesfârşit cu
cod vechi chiar dacă add-on-ul a fost reconstruit) sau serverul de dev local pe
un checkout vechi. nginx-ul add-on-ului avea DEJA `no-cache` pe index.html şi
cache imutabil doar pe asset-urile cu hash, deci HTTP caching între versiuni
era exclus. Remediu: un refresh al tabului. Ca prevenţie de clasă s-a
implementat oricum punctul următor.

**0.1 · Versionarea schemei de mapare (prevenţie).** localStorage nu mai ţine
snapshot-uri complete ale mapării (sursa reală a "îngheţării" default-urilor —
ex. cronometrele LG blocate pe `sensor.*` la cine apăsase "Aplică din audit" pe
v1.0.4). Formatul devine `{ __v: 2, map: {doar diferenţele} }`; la încărcare,
o mapare veche e migrată automat: cheile sloturilor eliminate se curăţă,
valorile egale cu default-uri vechi se aduc la cele noi
(`LEGACY_VALUE_MIGRATIONS`), snapshot-urile se reduc la diferenţe, iar golirile
explicite moştenite primesc o amnistie unică. Sloturile noi primesc automat
default-ul din cod. Utilizatorul nu mai atinge niciodată localStorage manual.

**0.2 · Unitate dublată** ("Apă 32.0 °C °C"): `ambientText`/compose lăsa `fmt`
să adauge unitatea entităţii şi apoi adăuga şi sufixul propriu. `fmt` primeşte
acum `unit:''`, sufixul definiţiei fiind singura unitate. Acelaşi tipar exista
şi pe cardurile Clorinator (ORP " mV" dublat) — acoperit de aceeaşi corecţie.

**0.3 / 0.4-pompă:** deja rezolvate în 1.0.5/1.0.6; vezi diagnosticul 0.1 —
apariţiile din capturi sunt ale clientului vechi, imposibile în bundle-ul curent.

**0.4 · TV în standby:** dial-ul de volum nu mai arată "—%": centrul afişează
"—" fără unitate, butoanele −/+ devin inactive, iar starea "Standby" e vizibilă
în rândul de stare al cardului şi în inelul mic din sidebar ("Standby" în loc de
valoare). Se aplică automat tuturor celor 8 televizoare.

**0.5 · Cardul de energie:** titlu "AC Etaj · consum luna curentă", linia
secundară "N din M zile" (procentul scurs din lună nu mai poate fi confundat cu
consumul; arcul inelului îl reprezintă în continuare vizual). Overflow-ul
inelului reparat: `flex:1` şi `height:118px` intrau în conflict (în coloană
flex-basis bate height), inelul depăşind cardul de 190px — wrap-ul umple acum
corect spaţiul, iar inelele au 104px ca să încapă (şi cel din "Dispozitive",
pentru consistenţă).

**1.1 + 1.3 · Butoanele −/+ şi valorile laterale:** − şi + flanchează acum
cadranul direct — simetrice, aceeaşi distanţă faţă de margine, centrate
vertical pe mijlocul cercului, pe toate cardurile. Valorile laterale ambigue au
fost scoase: ţinta din dreapta dubla exact valoarea din centrul cadranului
(redundantă), iar pasul din stânga e comunicat acum prin tooltip-ul butoanelor
("pas 1°"). Stilul butoanelor e neschimbat.

**1.2 · Paşi de incrementare** (verificaţi întâi în HA, pe atributele reale):
- AC Vortex / LG / Vivax: `target_temp_step: 0.5` vine de la integrări, dar
  0.5 e granularitatea minimă acceptată, nu una impusă — comenzile în paşi de
  1° sunt valide (multipli de 0.5). UI-ul foloseşte acum `max(1, step)` în dial
  şi în valorile ţintă din acordeon; un hardware care ar declara pas >1° ar fi
  respectat.
- Volum TV: 5 → 1 (ambele definiţii de card).
- Fairland: pas nativ 1° — neatins.
- Producţie clor: rămâne pe 5, read-only — slotul e mapat pe un senzor
  (`sensor.piscina_productie_clor`), nu pe o entitate reglabilă.
- Limită putere Vortex şi cronometrele LG: pas nativ 1 (citit din entitate) —
  neschimbate.

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
