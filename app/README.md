# Home Dashboard — aplicaţie live pe Home Assistant

Portare a designului `design-updatev1/Home Dashboard.dc.html` (Claude Design) într-o aplicaţie
web reală, conectată prin WebSocket la Home Assistant.
Designul vizual este păstrat 1:1 — aceleaşi culori, fonturi, dimensiuni,
gradienţi şi animaţii; s-au schimbat doar sursele de date şi comenzile.

## Pornire

```bash
npm install
npm run dev
```

Vite porneşte pe `http://localhost:5173` şi ascultă pe toate interfeţele
(`host: true`), deci poţi deschide dashboard-ul de pe telefon sau tabletă la
`http://<ip-ul-pc-ului>:5173`.

Alte comenzi:

- `npm test` — două verificări, fără să atingă HA-ul:
  - 42 de aserţiuni pe traducerea acţiune → serviciu HA, pe calculele de istoric,
    pe pragurile responsive şi pe maparea propusă (chei valide, domenii permise,
    zero controale interzise, fiecare slot nemapat cu motiv);
  - 44 de comparaţii care confirmă că string-urile de stil generate sunt
    **identice caracter cu caracter** cu cele din designul curent
    (`design-updatev1/Home Dashboard.dc.html`) — dacă cineva modifică o culoare
    sau un padding, testul pică.
- `npm run build` + `npm run preview` — build de producţie.

## Prima rulare

1. **Ecranul de conectare** cere adresa HA (ex. `http://192.168.0.10:8123`) şi
   un Long-Lived Access Token
   (HA → numele tău, stânga jos → tab-ul *Securitate* → *Create Token*).
   Ambele se salvează **doar** în `localStorage`-ul browserului. Nu sunt
   hardcodate în cod şi nu pleacă nicăieri în afară de instanţa ta de HA.
2. **Maparea entităţilor** — butonul cu glisoare din bara de sus. Aplicaţia
   citeşte lista de entităţi direct din HA şi îţi oferă câte un slot pentru
   fiecare loc din dashboard (108 sloturi). Alegi entitatea reală din
   autocomplete; sub fiecare rând vezi starea ei curentă, ca să confirmi că e
   cea corectă.

În ecranul de mapare există butonul **„Aplică maparea din audit (80)"**: umple
dintr-un clic cele 80 de sloturi identificate în auditul instanţei reale
(`src/ha/suggestedMap.js`, 2026-08-21). Nu suprascrie nimic din ce ai ales deja
manual şi te avertizează dacă vreo entitate propusă nu mai există în HA.
Sloturile rămase nemapate îşi arată motivul sub câmpul de căutare.

Poţi exporta / importa maparea ca JSON din acelaşi ecran.

## Marcajul VERIFY

Nu există niciun `entity_id` inventat în cod. Singurele ID-uri pre-completate
sunt cele patru pe care le-ai dat tu, şi **doar dacă entitatea chiar există** în
instanţa ta:

| Slot | ID propus de tine |
| --- | --- |
| AC Mansardă Vortex | `climate.ac_mansarda_vortex` |
| Pompă căldură Fairland | `climate.pompa_caldura_piscina` |
| Pompă filtrare piscină | `switch.pompa_filtrare` |
| TV Mansardă LG | `media_player.tv_mansarda` |

Orice slot nemapat rămâne **vizibil, la locul lui**, cu valoarea `VERIFY`
scrisă cu portocaliu, iar controlul e dezactivat. Layout-ul nu se schimbă —
vezi imediat ce mai ai de completat.

Acelaşi principiu se aplică şi comenzilor: un buton de mod / ventilator /
baleiaj / sursă se activează doar dacă valoarea corespunzătoare există chiar în
atributele entităţii (`hvac_modes`, `fan_modes`, `swing_modes`, `preset_modes`,
`source_list`). Dacă nu se potriveşte nimic, butonul rămâne gri şi tooltip-ul
spune de ce — niciodată nu se trimite o comandă ghicită.

## Ce controlează efectiv fiecare card

Toate interacţiunile apelează `callService` prin WebSocket:

| Control | Serviciu HA |
| --- | --- |
| Pornit / oprit card | `homeassistant.turn_on` / `turn_off`, iar pentru climate `climate.turn_off` / `set_hvac_mode` |
| Cadran temperatură (AC, pompă căldură) | `climate.set_temperature` |
| Butoane mod | `climate.set_hvac_mode` |
| Trepte ventilator | `climate.set_fan_mode` |
| Baleiaj | `climate.set_swing_mode` |
| Eco / Silenţios / Somn / Comfort / Boost | `climate.set_preset_mode` |
| Cadran producţie clor, debit pompă | `number.set_value` / `input_number.set_value` |
| Valori ţintă din panoul *Setări* | `climate.set_temperature` / `number.set_value` |
| Volum TV | `media_player.volume_set` |
| Mut | `media_player.volume_mute` |
| Sursă TV | `media_player.select_source` |
| IR camere, ştergător, automatizări | `homeassistant.turn_on` / `turn_off` |

Limitele şi paşii (min/max/step) se citesc din atributele entităţii, nu din
constante scrise în cod.

## Ce NU este expus (intenţionat)

Nu există niciun control pentru:

- comutare PoE pe porturile switch-ului;
- repornire cameră;
- repornire Home Assistant;
- ieşirile Aux1 / Aux2 ale clorinatorului.

Pagina Reţea e integral read-only, iar în Mentenanţă blocul „Controale cu risc"
din mockup a fost înlocuit cu o notă informativă.

## Responsive

Breakpoint-urile vin din `design-updatev1/` şi sunt aplicate în JS (nu prin
media queries), exact ca în design — layout-ul se recalculează din lăţimea
ferestrei:

| | desktop ≥ 1180px | tabletă 760–1179px | telefon < 760px |
| --- | --- | --- | --- |
| Coloane | stânga 376px + dreapta | stivuite pe verticală | stivuite pe verticală |
| Hero | 520px | 400px | 300px |
| Titlu hero | 36px | 30px | 24px |
| Salut | 46px | 46px | 32px |
| Grile de tile-uri | cât cere secţiunea | max 3 | max 2 |
| Carduri de pagină | 2 coloane | 2 coloane | 1 coloană |
| Carduri dispozitiv | min. 298px | min. 298px | min. 260px |
| Grafice | viewBox 640×196 | 640×196 | 330×176, etichete din două în două |

Numărul de coloane al secţiunilor din panourile *Setări* rămâne cel stabilit pe
desktop (Mod 5, Ventilator 6, Diagnostic 3 …) şi e doar plafonat pe ecrane mici.

Ascultătorul de resize e throttled pe `requestAnimationFrame`, ca în design, cu
un timer de rezervă şi o re-citire la `visibilitychange`: rAF nu rulează cât timp
pagina e ascunsă, iar fără plasă layout-ul ar rămâne pe breakpoint-ul vechi după
o rotire a telefonului făcută cu tab-ul în fundal.

## Stare offline

Dacă WebSocket-ul cade, apare o bandă fixă în partea de sus (`position: fixed`,
deci nu împinge nimic din layout) cu motivul şi două butoane: *Reîncearcă* şi
*Schimbă datele*. Dashboard-ul rămâne pe ecran cu ultimele valori primite, iar
indicatorul din bara de sus şi chip-ul din hero trec pe „Deconectat".

## Istoric (grafice pe 7 zile)

Graficele şi benzile de tip timeline citesc date reale din recorder prin
`history/history_during_period`, pentru entităţile mapate. Dacă o serie nu are
entitate mapată sau recorder-ul nu are date, blocul afişează „fără date în
recorder" în loc de valori inventate.

## Structura

```
src/
  design/      tokens, iconuri, gauge-uri, grafice — copiate 1:1 din design
  ha/          conexiune WS, sloturi, rezolvare entităţi, istoric, vreme
  model/       definiţia cardurilor şi paginilor (referinţe la sloturi)
  view/        markup-ul portat + constructorii de stiluri
  screens/     ecranul de conectare şi cel de mapare
```

## Modificări faţă de mockup

- Secţiunile „Unităţi de climatizare · setări complete" (Climat) şi
  „Echipamente piscină · setări complete" (Piscină) sunt la locul lor, cu rânduri
  complete şi buton *Setări* care desfăşoară panoul — ca în design.
  Din panoul original lipsesc doar sub-blocurile de **programări** (ore de
  pornire/oprire pe zile): Home Assistant nu expune programele ca entitate
  editabilă, iar valorile din mockup erau fictive. Programările se editează în
  HA; dacă ai helpere `schedule.*` sau `input_datetime.*`, le pot lega.
- Blocul „Controale cu risc" a fost înlocuit cu o notă (vezi mai sus).
- Inelul „Consum energie" arată în centru consumul real, iar arcul urmăreşte cât
  din luna curentă a trecut — mockup-ul avea acolo un procent fix.
- Butonul de chat din bara de sus a devenit butonul *Mapare entităţi* (acelaşi
  buton rotund, alt glif), pentru că aplicaţia are nevoie de o cale către ecranul
  de mapare.

