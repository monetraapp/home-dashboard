# Sesiune HA 8 — Handoff (23.08.2026)

Sesiunea a închis două lucruri mari: **controlul real de volum pe TV-ul Hisense**
(pe care HomeKit nu-l expunea deloc) și **curățenia din Home Assistant** —
trei dashboard-uri șterse, două add-on-uri dezinstalate, trei template-uri
moarte eliminate, un tracker duplicat scos. Între ele au încăput o rescriere
completă a formatării unităților, trecerea pe virgulă zecimală, o rundă de
layout **greșită și revertită**, și un grafic de piscină refăcut de la zero.

---

## 1. STAREA EXACTĂ LA FINALUL SESIUNII

| Componentă | Stare |
|:--|:--|
| Add-on Home Dashboard | **v1.5.1** in repo si pe GitHub; **add-on-ul din HA a ramas pe v1.5.0** (`index-c3ETjZJm.js`) — vezi §7 |
| `ingress_panel` | **`true`, setat prin Supervisor API** — bifa „Show in sidebar" nu se mai pune manual. Confirmat cu `get_panels` |
| Catalog de sloturi | **291**, toate mapate, zero nemapate (era 293) |
| Suită de teste | **170 logică + 44 stil, 0 picate** |
| Audit responsive | **90/90 combinaţii măsurate, 0 probleme** pe v1.5.1, rulat împotriva unui mock. Matricea a crescut de la 80 la 90: pagina „Zone" nu fusese măsurată niciodată (§3.7). **De rerulat pe instanţa reală** după ce add-on-ul ajunge la v1.5.1 |
| Dashboard-uri Lovelace | **0 în registru** — rămâne doar Overview-ul implicit (auto-generat) |
| Etaje / zone HA | **6 etaje, 14 zone, toate atribuite** (§2.11). 60 de dispozitive rămân deliberat fără zonă |
| Pagini în Home Dashboard | **9** (a noua: „Zone"), bara fără derulare pe tabletă |
| Add-on-uri instalate | **6** (erau 8), toate pornite: Matter Server, Mosquitto, Grott, AdGuard, File editor, Home Dashboard |
| Repository-uri store | 8 (scos `677650a1` ha-fusion) |
| Integrări HACS | **5, toate folosite** — nimic de scos |
| Helpere template | **20** (erau 23) |
| `person.bogdan` | `home`, sursă `device_tracker.buleandra_s_s26_ultra`, 2 trackere legate |
| Tokenuri long-lived | **2** — „Claude MCP" și „HA-MCP Server". De revocat de Bogdan |
| Backup de siguranță | `4e065f3f` · „Inainte de curatenie HA8 2026-08-23" · **52.090.880 octeți** · protejat |
| Integrarea Wake on LAN | **RĂMÂNE** — vezi verdictul B2, §4 |
| ONVIF | neatins, tot în „Failed setup, will retry" — singura problemă funcțională rămasă |

---

## 2. CE S-A FĂCUT

### 2.1 Contorul GPG0A450ZS și oglinzile de statistici

27 de sloturi `ctr.*` adăugate și mapate după un audit de coerență pe registre
(citirile invertorului sunt saldo vectorial, contorul e măsurare independentă la
branșament — fără ambele nu se poate compara lunar). S-a creat secțiunea
**„Contor racord"** pe pagina Energie.

Peste asta, **5 oglinzi template** cu `state_class`, ca la Growatt:
`Contor Import Total`, `Contor Export Total` și puterile active pe cele trei
faze. Motivul e mecanic: fără `state_class` HA nu produce statistici pe termen
lung, iar istoricul brut se epurează la 10 zile. Selectorul Săpt/Lună/An
funcționează pentru că citește statistici, nu istoric.

Registrele interzise ale contorului (3) au test dedicat, ca cele 26 de la
Growatt — nu pot fi mapate accidental fără să pice suita.

### 2.2 `ac_etaj_tinta` — diagnostic și reparație

Era `unavailable` de la fiecare pornire. Cauza reală: integrarea LG ThinQ
**scapă atributul `temperature`** din `climate.etaj_aer_conditionat_lg_etaj`
în intervale, nu doar la boot. Reparația a fost un template care ține ultima
valoare bună (auto-referință: `states('sensor.ac_etaj_tinta')` ca rezervă).

**Notă onestă:** senzorul acesta a fost **șters astăzi** (§2.9) — reparația din
HA 7 a fost făcută pentru că auditul semnalase „unavailable", nu pentru că
cineva îl afișa undeva. A fost muncă pe un senzor pe care nu-l consuma nimic.

### 2.3 Prezență

Trackerele Omada activate, `person.bogdan` scos din `unknown`. Aplicația
companion oferă tracker GPS (`device_tracker.s26_ultra`, `source_type: gps`),
dar el raportează încă `unknown` — permisiunea de locație în fundal nu e dată.
Rămâne task pentru Bogdan (§7).

### 2.4 Găuri de mapare

Firmware Switch Foișor și Switch Etaj (auditul mai vechi spunea greșit că „nu
au entitate de firmware"), `device_status` pe cele 5 EAP-uri, `ph_sp`, și
`pwrlimitswitch` pe Vortex.

### 2.5 Formatarea unităților — un singur modul (v1.3.0)

Înainte, pe ecran apăreau `9034 Wh` pe Acasă și `57117 kWh` pe Energie: fiecare
componentă își formata singură valorile. Acum există **`src/design/format.js`**,
cu `fmtScale3` (W → kW → MW, cu prag la 999,5 și o zecimală sub 10),
`fmtEn` pentru energie și `fmtUnitAuto` care alege regula după unitate.
Regula a fost propusă și aprobată înainte de aplicare. Puține zecimale,
pentru că se citește de la 1–2 m de o tabletă de perete.

### 2.6 Virgulă zecimală (v1.3.1)

`9,2 kW`, nu `9.2 kW` — interfața e integral în română. Testul de fidelitate de
stil a fost actualizat, nu ocolit (designul e al nostru).

**Capcană prinsă la timp:** componenta `Roll` avea un regex care aștepta punct;
cu virgulă s-ar fi rupt tăcut. Și coordonatele SVG **trebuie** să rămână cu
punct — `design/curve.js` are avertismentul scris în antet, ca să nu treacă
cineva mai târziu path-urile prin `dec()`.

### 2.7 Modalul Hisense și inventarul de feature-gating (v1.3.2)

Cardul respecta `supported_features`, modalul nu: arăta control de volum activ,
surse „VERIFY" și o secțiune OPȚIUNI goală. S-a aplicat aceeași filtrare, s-a
introdus `structural: true` pentru cazurile permanent nesuportate, iar
verificarea sursei s-a mutat **înaintea** verificării de standby.

Inventarul cerut: problema era doar la modale — cardurile respectau regula peste
tot.

### 2.8 TV Hisense — control real de volum (v1.3.3)

HomeKit expunea `supported_features: 18817`, fără `VOLUME_SET`. S-a instalat
`warrenrees/ha_vidaatv` din HACS, s-au pus certificatele de client VIDAA în
`/config/certs/`, s-a făcut împerecherea cu PIN. Entitatea nouă expune
**24461**, deci volum 0–100 real.

Două lucruri importante:
- **HomeKit a rămas neatins**, ca plasă de siguranță pentru pornirea din standby;
  trezirea prin MQTT a fost testată explicit.
- **Prima ipoteză a fost greșită.** MQTT-ul dădea cod 7 în fiecare secundă și
  am pus-o pe seama conexiunilor reziduale din fluxurile mele expirate. Un
  restart n-a rezolvat nimic — cauza reală era autentificarea dinamică, care
  hashuia MAC-ul de Ethernet în timp ce TV-ul e pe WiFi. Fix: `auth_mode: static`.

Mute-ul a rămas pe switch-ul HomeKit dedicat.

### 2.9 Curățenia (v1.4.1 + partea HA)

**Șterse din HA:**
- Dashboard-urile `404 Home`, `404 Rapoarte`, `Map`
- Add-on-urile **Fusion** și **Get HACS** + repository-ul `677650a1` (ha-fusion)
- 4 entități orfane: `binary_sensor.fusion_running`, `update.fusion_update`,
  `binary_sensor.get_hacs_running`, `update.get_hacs_update`
- Trackerul duplicat `device_tracker.s26_ultra_bogdan`
- Template-urile `ac_etaj_tinta`, `vivax_tinta`, `temperatura_medie_casa`

**Exportate pe disc înainte de ștergere** (drum de întoarcere, non-negociabil):
- `_arhiva\lovelace.404_home.json` — 42.572 caractere, 6 view-uri, 183 carduri
- `_arhiva\lovelace.404_rapoarte.json` — 13.886 caractere, 7 view-uri, 85 carduri

Ambele validate: JSON parsabil, wrapper `.storage` întreg, lungime = originalul
+ `\n` final.

`Map` a fost șters abia după ce i-am citit configurația: `{"strategy":{"type":"map"}}`
— strategia automată, zero configurație proprie, se recreează în 10 secunde.

**PĂSTRAT, contra planului inițial: `sensor.mansarda_temperatura_ambient`.**
Criteriul care a decis: sursa lui, `sensor.aux_cloud_ec0baeae4fb7_envtemp`,
**nu are `state_class`** — deci integrarea AUX Cloud nu produce statistici pe
termen lung. Oglinda template e **singura sursă de istoric pe termen lung
pentru temperatura mansardei** din toată instalarea. Ștergerea ei ar fi
distrus definitiv acel istoric, fără nimic care să-l înlocuiască.

`temperatura_medie_casa` a fost ștearsă tocmai pentru că trece testul opus:
e media dintre `envtemp` și temperatura curentă a LG-ului, iar ambele au acum
serii proprii păstrate (`mansarda_temperatura_ambient` și `ac_etaj_ambient`) —
media e recalculabilă, deci nu se pierde nimic irecuperabil.

**Un singur release** pentru toate sloturile, cum s-a cerut: commit `a212bb6`,
push `65808b1..a212bb6`, apoi ciclul uninstall → remove_repository →
add_repository → install → start.

**HACS: nimic de scos.** Cele 5 integrări sunt toate în uz — AUX Cloud (AC
Mansardă Vortex), Tuya Local (pompa Fairland), Vidaa TV (instalat azi), HA-MCP
(canalul prin care lucrez) și HACS însuși. Zero carduri Lovelace, teme,
AppDaemon sau python_script instalate.

### 2.10 cardGap pe „Automatizări" (v1.4.2)

Auditul rulat de Bogdan pe v1.4.1 a întors 4 rânduri de raport, care sunt
**același defect**: același detector (`cardGap`), același element, aceeași
măsurătoare (53px goi, card 292px, conținut până la 219px). Cele 4 rânduri
apar pentru că selectorul CSS diferă între layout-ul de 760/1179 și cel de
1180/1440, plus ramurile touch — în total 6 combinații, toate ≥760px.

Cauza s-a dovedit a fi **în v1.3.5, nu în curățenie** (§3.3). Cardul
„Automatizări" are un singur bloc, `grid(1, …)`, iar regula din v1.3.5 exclude
grilele de la creștere. Corect pentru grilele de dale, greșit pentru o grilă cu
o singură coloană, care e o listă de rânduri — singura din aplicație.

Fixul: `flex:1 1 auto` + `align-content: stretch` pe grilele cu **o** coloană,
ceea ce împarte surplusul egal între cele trei rânduri; dala are deja
`flex:1 1 auto` și conținutul centrat în `tokens.js` (neatins). Măsurat pe DOM
real la 1180px și 760px: **53px → 15px**, în linie cu restul cardurilor (13px),
fără ca vreo altă înălțime să se schimbe. `align-items: stretch` pe grile nu a
fost atins.

**Confirmat pe instanța reală**, nu doar pe mock: auditul rulat pe v1.4.2
(antet `index-BVn9WZ_Y.js`) întoarce **0 probleme distincte** pe toate cele 80
de combinații, cele 6 de pe Mentenanță incluse, fără regresii pe alte pagini.

---

### 2.11 Etaje, zone și pagina „Zone" (v1.5.0)

Overview-ul auto-generat arăta 9 intrări în „Other areas". Verificarea a găsit
**8** zone fără etaj, iar a noua intrare, „Devices", **nu era o zonă**: nu apare
în registrul de zone, registrul de etichete e gol, iar dashboard-ul implicit nu
are configurație stocată — e integral generat de strategie. „Devices" e coșul ei
pentru cele **60 de dispozitive fără zonă**, adică exact infrastructura. Nu era
nimic de șters.

S-au creat trei etaje — **Casa Tata** (level 3), **Exterior** (4), **Tehnic**
(5) — și s-au atribuit cele 8 zone rămase. Cele 6 deja corecte nu au fost
atinse: `modified_at` la `kitchen`, `bedroom`, `mansarda`, `dormitor_sofia_etaj`,
`hol_etaj` și `dormitor_sofia_parter` a rămas cel vechi. Zero `entity_id`
schimbat, zero redenumiri. `level` e strict cheie de sortare în HA; 3/4/5
reproduce ordinea cerută: Parter → Etaj → Mansarda → Casa Tata → Exterior →
Tehnic.

Peste asta, **pagina „Zone"** în Home Dashboard. Nu are sloturi în catalog:
structura vine din cele patru registre citite la execuție peste WebSocket-ul
deja deschis. Mut un dispozitiv în altă zonă din HA și pagina se actualizează
singură, fără release — o mapare manuală ar fi cerut 14 sloturi noi și un
release la fiecare mutare.

Două subtilități, ambele cu test dedicat: `area_id` setat **direct pe entitate**
bate zona dispozitivului (ca în HA), iar cele 60 de dispozitive fără zonă nu
apar nicăieri și nu sunt arătate ca lipsă — o secțiune „fără zonă" ar fi arătat
ca o listă de neterminat și ar fi tentat pe cineva s-o „repare", anulând decizia
din `04_`. Omisiunea e scrisă în subtitlul paginii.

**Bara de navigație: eticheta doar pe tabul activ.** Măsurătoarea făcută înainte
de implementare a infirmat premisa: la 360px nu se vedeau ~3,5 taburi, ci
**unul** — bara are acolo doar 224px, restul fiind luat de cele două butoane
rotunde. Iar bara depășea **deja** pe tabletă, cu opt taburi. A noua pagină nu
costa niciun tab vizibil la nicio lățime măsurată. Ce conta era tableta: 7 din 9
cu derulare. Fără etichete, conținutul scade de la 1205px la 603px, deci **9/9
fără derulare la 1180px**; la 360px 1 tab devine 2, la 414px 2 devin 3.
`tokens.js` nu s-a atins — suprascrierea se adaugă la locul apelului, unde `s()`
e last-wins.

Etichete mai scurte au fost **măsurate și respinse**: „Mentenanţă" → „Service"
scădea conținutul cu 31px și nu câștiga niciun tab, în plus băga un cuvânt
englezesc într-o interfață integral românească.

**Iconurile de navigație, refăcute**, pentru că în modul de mai sus silueta e
singurul indiciu: Climat `TriangleAlert` → `AirVent` (un triunghi de avertizare
pe o pagină de climatizare citea „ceva e stricat"), Media `tag` desenat manual →
`Tv` (glifa veche era un „cast" cu arce, care se certa vizual cu Wifi de la
Reţea), Camere `ShieldCheck` → `Cctv`, Energie `BarChart3` → `bolt`. Maparea
`alertTri` a rămas neschimbată — e folosită în alte 12 locuri (starea meteo
`exceptional`, modul Auto din acordeoane). Piscina și Energia sunt vecine în
bară: verificat la 19px că nu se confundă — bandă orizontală dungată vs formă
diagonală compactă, axe perpendiculare.

---

## 3. DRUMURI GREȘITE ȘI REVENIRI

Sunt scrise separat pentru că lecția e în ele, nu în rezultat.

### 3.1 Faza A de layout — **greșită, revertită integral** (v1.3.4 → v1.3.5)

Problema reală era că un card se întindea ca să egalizeze rândul și rămânea cu
o gaură la bază. Am propus și am implementat Faza A: `align-items: start` pe
secțiuni, carduri la înălțime naturală.

**Rezultatul a fost mai rău decât problema.** Grila arăta neîngrijită, cu
carduri de înălțimi aleatorii unul lângă altul. Bogdan a cerut revenirea, fără
faze și fără compromisuri: toate cardurile dintr-un rând au **aceeași**
înălțime (`align-items: stretch`), iar surplusul **nu se adună la bază** — se
distribuie în interiorul cardului, între secțiuni, după modelul cardului
„Control climat".

Pe drumul spre varianta finală au mai picat **două variante intermediare**,
respinse pe bază de capturi:
- „crește doar ultimul bloc" → rânduri de 87px lângă rânduri de 26px;
- `space-between` pe cardul de pagină → gol mare sub titlu.

Varianta care a rămas: **toate blocurile purtătoare de rânduri cresc uniform**
(`growable = isMonitor || isExpand`). Ambele variante respinse sunt documentate
în comentarii în cod, ca să nu fie reintroduse de cineva care „optimizează".

### 3.2 Detectorul `cardGap` — prima regulă era greșită

Detectorul nou din auditul responsive (marchează gol la baza cardului > 48px)
a dat fals-pozitiv pe cardul piscinei (119px). Prima regulă căuta „ultimul
copil **cu conținut**", dar placeholder-ul piscinei e un spațiu gol
intenționat. Corectat prin măsurarea **cutiilor din flux**, nu a conținutului.

### 3.3 Ipoteza „curățenia a produs golul" — plauzibilă, dar falsă

Auditul pe v1.4.1 a semnalat 53px goi la baza cardului „Automatizări" de pe
Mentenanță. Explicația care se oferea singură: scosesem două rânduri dintr-un
card de pe aceeași pagină, deci grila s-a reechilibrat.

Măsurat A/B pe v1.4.0 și v1.4.1, sub același mock: **53px identic pe ambele**.
Cardul pe care îl scurtasem („Add-on-uri") avea 13px goi în ambele versiuni,
pentru că blocul lui `monitor` crește și își absoarbe singur surplusul — și
nici nu e pe același rând de grilă cu „Automatizări" (`top=644` față de
`top=880`). Cauza reală era regula din **v1.3.5**, care exclude grilele de la
creștere; corectă pentru grilele de dale, greșită pentru `grid(1, …)`, care e
o listă de rânduri. Reparat în v1.4.2, cu excepția limitată la o singură
coloană.

### 3.4 `config.yaml` golit de propria mea comandă

Un one-liner care deschidea fișierul pentru scriere înainte să-l citească a
lăsat `config.yaml` gol, iar Supervisor-ul a respins add-on-ul
(„Invalid app config! Got {}"). Restaurat din `git show 1dc35f2:...`.
De atunci **citesc-apoi-scriu, cu assert pe lungime** — regula e aplicată și
în modificările de azi.

### 3.5 API-ul File editor, folosit greșit de două ori

`/api/file` cu POST → „Invalid method". `/api/newfolder` cu JSON → „Generic
failure". Ambele rezolvate abia după citirea sursei upstream:
totul e **form-encoded**, iar `newfolder` vrea `path` (părintele absolut) +
`name` separat.

### 3.6 Certificatele VIDAA — trei blocaje, zero ocoliri

Clasificatorul de permisiuni a blocat scrierea certificatului și a cheii de
client. Nu am căutat o cale ocolită; am explicat ce sunt și am cerut aprobare.
După aprobarea explicită blocajul a apărut din nou, iar Bogdan a pus fișierele
manual. **Comportamentul corect a fost să mă opresc, nu să găsesc altă rută.**

---


### 3.7 Unealta de audit, ruptă tăcut de propria mea schimbare

Ascunderea etichetelor de pe taburile inactive (v1.5.0) a rupt auditul
responsive, care selecta taburile cu `getByText(label, { exact: true })`.
Rezultatul raportat a fost **26 de „probleme"**; realitatea era că **8 pagini
din 9 nu fuseseră măsurate deloc**. Singura care ieșea curată, `acasa`, era
curată pentru că e tabul activ inițial — deci singurul cu etichetă.

Un caz a fost mai urât decât restul. Pentru `piscina`, `getByText` **a găsit
ceva**: pe pagina Acasă există un alt element cu exact textul „Piscină" (un DIV
de 10,5px, `cursor: auto` — măsurat, nu presupus; celelalte opt etichete
returnau zero potriviri). Clickul a nimerit acel element, pagina nu s-a
schimbat, iar eșecul a apărut abia la verificarea finală, cu alt mesaj. Aceeași
cauză, altă etapă — și cu atât mai greu de diagnosticat.

Peste asta, lista de pagini a uneltei era o **copie manuală** a lui `NAV`. Pagina
„Zone", adăugată tot în v1.5.0, nu apărea deloc în raport: matricea spunea 80 de
combinații și părea completă, deși pagina nouă nu fusese măsurată niciodată.

Reparat în v1.5.1: selecție pe `[data-page]`, confirmare pe `aria-selected`,
listă citită din bara randată de aplicație, iar dacă bara nu expune atributele
auditul **se oprește** în loc să raporteze un subset drept întreg. Raportul
scrie acum numărul de combinații și **câte au fost măsurate efectiv**.

Auditul reparat a găsit imediat **două defecte reale pe pagina Zone**, pe care
verificările mele nu le prinseseră: contrast 3,81:1 la numărătorul de zone și
nume de zone tăiate cu ellipsis pe ecrane înguste. Ambele reparate.

Și încă una, care nu e despre unelte: ascunderea etichetelor lăsase opt taburi
din nouă **nenumite pentru un cititor de ecran**. O regresie de accesibilitate
pe care n-am văzut-o pentru că arăta bine. `aria-label` nu e un artificiu ca să
treacă testul — e reparația reală, iar testul se sprijină pe ea.

---


### 3.8 „Rescrierea Growatt a dispărut" — diagnostic fals-pozitiv

Înainte de release-ul v1.5.1 am verificat starea instalării și am raportat că
rescrierea DNS `server.growatt.com → 192.168.0.100` **nu mai există**, cu
concluzia că dongle-ul trimite datele către cloud-ul Growatt și că fluxul spre
Grott e rupt. **Era fals. Nimic nu era rupt.**

Realitatea, din Query Log-ul AdGuard filtrat pe clientul `192.168.0.20`:
`server.growatt.com`, Type A, Plain DNS, răspuns **Rewritten**, la 06:53:23,
06:53:25, 06:53:27 și 06:55:03 pe 25.08.2026. În Filters → DNS rewrites
rescrierea e prezentă și bifată, cu „Rewrites are enabled".

**Cauza nu a fost lipsa rigorii, ci un martor compromis.** Toate testele au
rulat cu `nslookup` de pe `192.168.0.111` — exact PC-ul pe care `11_` şi `15_`
îl declară martor DNS invalid, din cauza serviciului Windows ICS/SharedAccess.
Handoff-ul numeşte şi martorul curat: laptopul MSI, din VLAN 20.

Ce face cazul instructiv e că **aparenţa de rigoare a fost chiar problema**. Am
produs un tabel cu cinci nume de gazdă Growatt, am verificat explicit dacă
`SharedAccess` rulează, am confirmat că nimic nu ascultă pe `:53` local, am
verificat ruta către `.100`, am comparat cu gateway-ul şi cu 1.1.1.1, şi am
adăugat două controale negative cu servere DNS inexistente (`.198`, `.199`) ca
să demonstrez că interogările ajung la adresa cerută. Şase verificări
independente — dar **toate au ieşit prin aceeaşi uşă defectă**. Un control care
foloseşte instrumentul suspect nu poate valida instrumentul suspect;
circularitatea era chiar miezul problemei, iar volumul de verificări a
ascuns-o în loc s-o scoată la iveală.

Am scris explicit „am verificat capcana şi rezultatul e valid". Regula din
handoff nu avea excepţia aceea, iar eu am fabricat-o dintr-un sub-test rulat pe
acelaşi martor pe care regula îl declară invalid.

Consecinţa practică a fost mică — nu s-a modificat nimic în instalare, iar
release-ul oricum nu putea rula fără canalul MCP. Costul real a fost al lui
Bogdan: a trebuit să deschidă AdGuard şi să infirme un raport care suna sigur
pe el.

---

## 4. VERDICTELE VERIFICĂRILOR (B1 / B2 / B3)

### B1 — template-urile, cu grep pe TOATĂ clona

Metoda a fost validată întâi pe **martori de control**, ca să nu raportez „0"
dintr-un grep care nu funcționa:

```
home_dashboard/src/ha/suggestedMap.js:31:  'sensor.lg_ambient': 'sensor.ac_etaj_ambient',
```
`ac_etaj_ambient` → **1** apariție în bundle-ul compilat `index-BYxqxXXd.js`.
`vivax_ambient` → **1**.

Cei patru candidați, în sursă **și** în bundle-ul compilat:

| Candidat | Sursă | Bundle |
|:--|--:|--:|
| `ac_etaj_tinta` | 0 | **0** |
| `vivax_tinta` | 0 | **0** |
| `mansarda_temperatura_ambient` | 0 | **0** |
| `temperatura_medie_casa` | 0 | **0** |

Pe partea HA (`ha_search` peste automatizări, scripturi, scene, helpere,
dashboard-uri): `ac_etaj_tinta` apare **doar în propria definiție** —
auto-referința din reparația HA 7; la fel `temperatura_medie_casa` și
`vivax_tinta`.

**`mansarda_temperatura_ambient` ERA folosit** — de dashboard-ul `404 Rapoarte`,
view-ul „Climat", graficul „Ambient mansardă". Ceea ce **contrazice
presupunerea că cele patru erau uniform moarte.**

### B2 — Wake on LAN: **integrarea RĂMÂNE**

Toate cele 7 automatizări „Pornire TV · *" apelează serviciul:

```yaml
- action: wake_on_lan.send_magic_packet
```

MAC-uri: `4c:c9:5e:25:52:e8` (broadcast .103), `54:3a:d6:20:a2:46` (.105),
`54:3a:d6:21:87:e4` (.107), `e0:9d:13:93:6a:48`, `b0:99:d7:bf:2c:3a`,
`8C:19:B5:F0:9A:38`, `24:E8:53:FE:E4:1A`.

Intrarea de configurare `01M0DJ7C628KZMP2J60KX7676F` este **singura**, e
`loaded`, iar în `configuration.yaml` **nu există** cheia `wake_on_lan:` —
deci ea este ce înregistrează serviciul.

**Asta contrazice apăsat inventarul anterior**, care o trecea drept „integrare
rămasă dintr-un test". Ștergerea ei ar fi rupt pornirea tuturor televizoarelor.

### B3 — tokenuri long-lived

Din metadatele `.storage/auth` (fără valori de token):

| # | Nume | Creat | Ultima folosire |
|--:|:--|:--|:--|
| 5 | Claude MCP | 2026-08-19 06:59:59 | 2026-08-19 06:59:59 |
| 8 | HA-MCP Server | 2026-08-19 07:34:35 | 2026-08-23 10:59:39 |

Plus 4 tokenuri `normal` de sesiune de browser (IP-uri `192.168.0.111` și
`192.168.0.118`).

**Nu există niciun token numit `HD_HA_TOKEN`.**

**Nuanță care contează:** `last_used_at` **nu** se actualizează la fiecare
cerere pentru tokenurile long-lived — propriul meu token, folosit activ în
momentul citirii, arăta o dată veche de ~2 ore. Deci „Claude MCP" **nu poate fi
declarat mort** pe baza timestamp-ului. Decizia de revocare e a lui Bogdan, dar
criteriul corect e „îl recunosc / nu-l recunosc", nu „pare nefolosit".

---

## 5. LECȚII METODOLOGICE NOI

1. **Reinstalarea add-on-ului îi distruge entitățile `hassio`.** După ciclul de
   release, `binary_sensor.home_dashboard_running` dispăruse complet din
   registru — nici măcar dezactivat. Revine doar după
   `homeassistant.reload_config_entry` pe intrarea `hassio`
   (`01M0AD0XMARHB2KKYBHW4V3DNH`) sau după un restart HA. Foarte probabil
   **toate release-urile anterioare au lăsat slotul rupt până la următorul
   restart**, fără ca cineva să observe. De verificat după fiecare release.

2. **`ingress_panel` se poate seta prin Supervisor API.**
   `POST /addons/<slug>/options` cu `{"ingress_panel": true}` funcționează și
   scapă de bifa „Show in sidebar" pusă manual după fiecare reinstalare —
   memento care stătea în handoff-uri de la HA 4 încoace. Rezolvat.

3. **Înainte de a șterge un senzor „nefolosit", verifică `state_class` pe
   sursa lui.** Un senzor template fără consumatori poate fi totuși singura
   sursă de statistici pe termen lung pentru mărimea aceea. „Nefolosit de
   nimeni acum" și „fără valoare" sunt lucruri diferite. Exact criteriul care a
   salvat `mansarda_temperatura_ambient`.

4. **Când o ștergere pe care o fac eu invalidează dependența altcuiva, asta nu
   e automat permisiune să șterg și dependentul.** `404 Rapoarte` era singurul
   consumator al oglinzii mansardei; după ștergerea lui, oglinda a devenit
   „nefolosită" **din cauza mea**. Nu e același lucru cu „era nefolosită".

5. **Martorul de control înaintea concluziei negative.** Un grep care întoarce
   0 nu dovedește nimic până nu arăți că același grep întoarce ≠0 pe ceva
   despre care știi că există. B1 s-a sprijinit pe `ac_etaj_ambient` și
   `vivax_ambient` ca martori — altfel „0 apariții" ar fi fost doar o comandă
   scrisă greșit.

6. **Timestamp-urile de audit nu sunt toate live.** `last_used_at` pe tokenurile
   long-lived se actualizează leneș. Aplicabil general: înainte să declari ceva
   mort pe baza unei date, verifică pe un obiect despre care **știi** că e viu.

7. **Interpolarea trebuie să fie monotonă pe curbe de temperatură.** O netezire
   obișnuită desena, între 31 °C și 33 °C măsurate, un vârf la 33,4 °C — un
   maxim care nu s-a măsurat niciodată. Fritsch–Carlson (`design/curve.js`)
   garantează că nicio porțiune de curbă nu depășește valorile măsurate; există
   test dedicat.

8. **Separatorul zecimal e o decizie de prezentare, nu de date.** Virgula merge
   în text, dar coordonatele SVG rămân cu punct. Granița e scrisă în antetul
   modulului, pentru că e exact genul de lucru pe care îl „uniformizează"
   cineva peste șase luni.

9. **Un audit „0/0/0" acoperă doar versiunea pe care a rulat.** Rularea curată
   de la 12:57 era pe v1.3.2. Între ea și v1.4.1 au intrat rescrierea de
   layout, cardul de zi/dată și graficul de piscină — iar defectul de pe
   „Automatizări" a intrat cu regula din **v1.3.5** și a stat nedescoperit trei
   versiuni. Regula practică: dacă ultima rulare nu e pe bundle-ul curent,
   trateaz-o ca inexistentă, nu ca dovadă.

10. **Ipoteza despre cauză se testează A/B, nu se acceptă pentru că sună
    logic.** Ipoteza că scoaterea sloturilor `addon.*` a produs golul era
    perfect plauzibilă — card scurtat, grilă care egalizează rândul. Am
    construit build-ul v1.4.0 din `65808b1` și l-am măsurat sub același mock:
    **53px identic pe ambele versiuni**. Cardul scurtat („Add-on-uri") avea
    13px goi în ambele, pentru că blocul lui `monitor` își absoarbe surplusul,
    iar cele două carduri nici nu sunt pe același rând de grilă (`top` diferit
    în măsurătoare). Metoda — recompilează versiunea anterioară în același
    arbore, cu `git checkout <commit> -- <fișiere>`, măsoară, apoi
    `git restore --source=HEAD --staged --worktree` — costă câteva minute și
    înlocuiește o presupunere cu o cifră.

11. **`git checkout <commit> -- <fișiere>` STAGEAZĂ fișierele.** Un
    `git checkout -- <fișiere>` de „restaurare" le ia atunci din index, adică
    tot versiunea veche, și pare că a funcționat. Restaurarea corectă e
    `git restore --source=HEAD --staged --worktree`. Verificarea care prinde
    greșeala: `git status --short` trebuie să fie **gol**, iar hash-ul
    bundle-ului reconstruit trebuie să revină la cel de dinainte.

12. **O unealtă de test care navighează după text vizibil se rupe tăcut la
    orice schimbare de prezentare.** Navigarea în teste se face pe
    identificatori stabili — `data-*`, `aria-label`, rute — nu pe ce se vede pe
    ecran. Textul e o decizie de design și se schimbă; identificatorul e un
    contract. Corolarul, la fel de important: dacă textul e totuși folosit,
    poate exista un al doilea element cu exact același text, iar unealta va
    face clic pe el fără să se plângă (cazul `piscina`, §3.7).

13. **Orice unealtă care iterează peste o listă trebuie să spună câte elemente
    a procesat, nu doar câte probleme a găsit.** Raportul spunea „80 de
    combinații" din numărul teoretic, în timp ce 8 pagini din 9 eșuau la
    navigare. Acum tipărește combinațiile totale ȘI câte au fost măsurate
    efectiv: dacă cele două nu coincid, „0 probleme" nu mai poate fi confundat
    cu „curat". Un „0" trebuie să fie mereu însoțit de numitorul lui.

14. **Listele hardcodate care oglindesc altă structură se învechesc tăcut.**
    Lista de pagini a auditului era o copie manuală a lui `NAV`; pagina nouă
    n-a fost măsurată niciodată și nimic nu a semnalat-o. Se derivă din sursă —
    aici, citită din DOM-ul randat de aplicație — sau, dacă nu se poate, se
    pune un test care compară cele două liste și pică la divergență.

15. **O regulă documentată despre un martor invalid nu se ocolește cu
    sub-teste rulate prin acel martor.** Dacă o infirmi, o infirmi cu martorul
    pe care regula îl recomandă — aici, laptopul MSI din VLAN 20, numit
    explicit în `11_` și `15_`. Corolarul, care e partea contraintuitivă:
    **numărul de verificări nu compensează un instrument compromis.** Șase
    controale independente care trec toate prin același rezolver defect nu sunt
    șase dovezi, sunt una singură, repetată — iar aparența de rigoare face
    eroarea mai greu de văzut, nu mai ușor (§3.8).

---

## 6. TASK-URI DESCHISE

### Prioritar — funcțional
- **De ce a căzut canalul MCP către HA pe 25.08** — fără explicaţie. Când revine, de citit logul supervisor/core în jurul intervalului. **Nu se speculează până atunci** — vezi §3.8 pentru ce se întâmplă când un diagnostic se construieşte pe dovezi care nu susţin concluzia.
- **ONVIF**: 5 camere Dahua în „Failed setup, will retry". **Singura problemă
  funcțională rămasă.** Neatins în această sesiune, la cerere.
- **Backup-uri pe destinație externă** — toate sunt încă pe HA Green. Singurul
  risc real din audit. *(rămâne din 14_)*
- **`warncode 703`** la invertor — de întrebat instalatorul. *(rămâne)*
- **Proba de scan pe portul 80** (22.08, `/cgi-bin/webproc…etc/passwd`) — de
  lămurit dacă HA e expus spre internet. *(rămâne)*

### Curățenie HA — **ÎNCHISĂ**
Toate punctele din secțiunea C a `13_AUDIT_HA_READONLY.md` sunt rezolvate:
- ~~duplicate de trackere~~ — **făcut**
- ~~integrarea Wake on LAN~~ — **RĂMÂNE**; verificarea B2 a arătat că e activă
  și necesară. Punctul se închide cu verdict invers față de inventar.
- ~~template-urile din era Fusion~~ — 3 șterse, 1 păstrat motivat (§2.9)
- ~~dashboard-urile 404~~ — exportate și șterse
- ~~add-on-ul Fusion~~ — dezinstalat
- ~~tokenuri long-lived~~ — listate; **revocarea rămâne la Bogdan** (§7)
- ~~inventar HACS~~ — 5 integrări, toate în uz, nimic de scos

### Energie / automatizări
- **Automatizare de surplus PV** (pompă filtrare pe export) — nedemarată.
  Necesar consumul real al pompei. Prag de pornire > prag de oprire
  (histerezis), declanșare pe **export**, nu pe producție. *(rămâne)*
- Tarife → costuri în Energy + secțiunea Economii. *(rămâne)*
- `device_consumption` gol în Energy. **Nou disponibil:** acum există oglinzile
  de contor cu `state_class`, deci se poate alimenta și import/export de rețea.
- Panoul „Ce se întâmplă acum" (Energie) — reguli de definit. *(rămâne)*

### Dashboard
- Carduri pentru dispozitive **offline** — nu se semnalează. *(rămâne)*
- Dashboard **fără sidebar HA** (kiosk sau port direct) pentru tablete.
  *(rămâne)*
- **Faza B layout (masonry în JS) — respinsă motivat**, nu doar amânată.
  Argumentul e în CHANGELOG-ul v1.3.5: e un motor de layout în JS cu
  re-măsurare la fiecare resize și la fiecare schimbare de valoare live, pe o
  tabletă montată sub Fully Kiosk.
- ~~rerularea auditului responsive~~ — închis pe v1.4.2 (80/80 combinații).
  **Redeschis pentru v1.5.0** — vezi §7.
- ~~pagină pe zone~~ — **FĂCUT** (§2.11): 6 etaje, 14 zone, pagina derivată din
  registrele HA, deci se actualizează singură la mutări.
- **NOU:** iconițele de navigație — `Cctv` e cea mai densă glifă din set și stă
  lângă `bolt`. Se disting, dar dacă vreuna dă bătăi de cap pe tabletă, aceea e.

### Prezență / automatizări noi
- **GPS în aplicația companion** — `device_tracker.s26_ultra` e încă `unknown`.
  Setări → Companion App → Manage sensors → Background location + permisiunea
  Android „Allow all the time" + scoatere din optimizarea de baterie.
- **NOU — MAC randomizat pe telefon:** duplicatul șters (`3E-FD-9A-B8-90-02`)
  era un MAC randomizat vechi pe care Omada încă îl ține minte. Dacă reapare,
  remediul durabil e scoaterea clientului vechi din lista Omada sau
  dezactivarea randomizării MAC pentru SSID-ul de acasă.
- **Poarta** — automatizare de deschidere la apropiere. Cablarea o face un
  electrician. Telecomanda **rămâne**. *(rămâne)*
- **Assist cu wake word „hey jarvis"** — test gratuit de 10 minute în aplicația
  companion, înainte de orice hardware. *(rămâne)*

### Fizic
- Switch Mansardă (.18), ES206GP Magazie (.19) + Camera Magazie (.54)
- Aux1/Aux2 Zodiac, Switch Etaj P2, Switch Principal P5, RSTP
- **Tablete de perete**: decizie montaj. **Evită RK3288**; minim RK3566, 4GB
  RAM. Lenovo Tab M11 **8GB**. Exterior doar sub streașină — temperaturile
  negative sunt problema reală (0–35 °C declarat).

---

## 7. NECESITĂ BOGDAN

1. **Ciclul de release pentru v1.5.1 nu s-a putut face** — conexiunea MCP
   către Home Assistant a căzut în timpul lucrului. Codul e comis şi împins
   (`bbd8475`), dar add-on-ul din HA a rămas pe **v1.5.0**. De rulat ciclul
   obişnuit: uninstall → `remove_repository(e382af62)` → `add_repository` →
   install → start, apoi `ingress_panel=true` şi **`reload_config_entry` pe
   `hassio`** (lecţia 1). După aceea, rerularea auditului pe instanţa reală:
   aştept 90 de combinaţii, toate măsurate, zero probleme.

2. **Revocarea tokenurilor long-lived** — nu există API. Profil → Securitate.
   Cele două sunt „Claude MCP" (19.08) și „HA-MCP Server" (19.08, canalul meu
   activ — dacă îl revoci, îmi tai accesul). Criteriul: îl recunoști sau nu,
   **nu** „pare nefolosit" (vezi B3).

3. **Hard refresh (Ctrl+Shift+R)** pe orice tab care are dashboard-ul deschis.
   Tab-urile vechi rulează JS din memorie și par funcționale la nesfârșit.

4. **Permisiunea de locație în fundal** pentru aplicația companion (§6).

5. **Testarea automatizărilor WOL** dimineața, cu televizoarele oprite peste
   noapte — cum ai spus. Integrarea a rămas pe loc, deci testul e valid.

*(Rerularea auditului responsive a ieșit de pe listă: rulat pe instanța reală
pe v1.4.2, antet `index-BVn9WZ_Y.js`, **0 probleme distincte** pe toate cele
80 de combinații — inclusiv cele 6 de pe Mentenanță, fără efecte colaterale.
Măsurătoarea mea pe mock, 53px → 15px, e confirmată de instanța reală.)*

*(Sidebar-ul nu mai e pe listă: `get_panels` confirmă panoul
`e382af62_home_dashboard`, titlu „Home Dashboard", `show_in_sidebar: true`.
Aceeași verificare arată că panourile `404-home`, `404-rapoarte` și `map` au
dispărut, și că a rămas doar `lovelace` — Overview-ul implicit.)*

---

## 8. OPERARE (memento-uri)

- **Clona de lucru: `C:\HomeDashboard-Standalone-git`**. Release: commit+push,
  apoi uninstall → `remove_repository(e382af62)` → `add_repository` →
  `install` → `start`. Push-ul merge cu
  `TOKEN=$(gh auth token)` + `git -c http.https://github.com/.extraheader=…`
  (Git Credential Manager e stricat).
- **„Show in sidebar" — REZOLVAT.** Se setează cu
  `POST /addons/<slug>/options` → `{"ingress_panel": true}` prin `supervisor/api`.
  Nu mai e nevoie de bifa manuală.
- **NOU: după fiecare release, reîncarcă intrarea `hassio`**
  (`homeassistant.reload_config_entry`, entry `01M0AD0XMARHB2KKYBHW4V3DNH`),
  altfel `binary_sensor.<addon>_running` rămâne dispărut din registru.
- **Hard refresh (Ctrl+Shift+R) după fiecare release.**
- Store-ul Supervisor are nevoie de ~25 s ca să indexeze după `add_repository`.
- Audit: `$env:HD_HA_TOKEN='…'; npm run audit:responsive` din `home_dashboard\`.
  Antetul raportului spune versiunea și bundle-ul măsurat. **Nu rula auditul cât
  se face deploy** — măsoară o aplicație care se schimbă sub el.
- **`tokens.js` nu se atinge** — testul de fidelitate de stil compară la
  execuție cu HTML-ul de design original (44 de aserțiuni).
- Registrele Growatt respinse (26) și cele de contor (3) au teste dedicate — nu
  pot fi mapate accidental fără să pice suita.
- **Capcană PC**: serviciul Windows **ICS/SharedAccess** pe `192.168.0.111`
  (pornit de Hyper-V/WSL) invalidează testele DNS locale. Folosește laptopul MSI
  pentru teste din VLAN 20.
- **AdGuard**: race condition la boot — poate rămâne legat doar pe `127.0.0.1`.
  Remediu: restart add-on cu rețeaua sus. Verificare:
  `listening to udp addr=192.168.0.100:53`.
- **HA Green ascultă pe portul 80.** `8123` nu ascultă nimic. Toate URL-urile
  către HA folosesc `http://192.168.0.100`.
