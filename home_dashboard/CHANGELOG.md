# Changelog

## 2.4.0

**AC Magazie intră în aplicaţie**, a doua unitate pe infraroşu, şi **se repară o
greşeală din 2.3.0**: rândul de „setări complete" al lui AC Casa Tata ajunsese în
acordeonul paginii **Piscină**, nu Climat. A fost livrat aşa. Unitatea apărea în
setările complete ale piscinei, iar pe Climat avea doar cardul.

Cauza e banală şi de aceea merită scrisă: cele două acordeoane trăiesc în
acelaşi fişier, iar inserţia a nimerit după ultima intrare a array-ului greşit.
Nimic n-a semnalat-o — nu exista niciun test pe acordeoane, iar auditul
responsive verifică aşezarea în pagină, nu apartenenţa. **Acum există cinci
invariante** care leagă fiecare intrare de acordeon de grupul cardului ei şi de
inventarul paginii; verificate că pică la reintroducerea greşelii, nu doar că
trec acum.

**AC Magazie** raportează exact aceleaşi capabilităţi ca AC Casa Tata — şase
moduri, patru viteze, patru baleiaje, 16–32 °C cu pasul 1 — deci primeşte exact
aceleaşi controale. Nu din copiere, ci fiindcă asta citim din entitate. A treia
placă din casă, **AC Foişor**, chiar diferă (baleiaj doar oprit/vertical, 16–31
cu pasul 0,5) şi tocmai de aceea nu a primit acelaşi card.

**Pagina Climat are acum cinci unităţi**, fiecare cu rândul şi dropdown-ul ei.
Cele două pe infraroşu poartă acelaşi marcaj discret ca înainte — *„Control IR ·
stare presupusă"* — iar în panoul extins, acolo unde se aleg modul, viteza şi
baleiajul, apare şi propoziţia care lipsea: **„Aparatul nu transmite feedback
către Home Assistant."** Acolo se trimit comenzile, deci acolo trebuie scris.

Niciuna nu apare în *Temperaturi pe zone* — nota de acolo le numeşte acum pe
amândouă. În *Stare unităţi* apar ca „Casa Tata · IR (comenzi)" şi „Magazie · IR
(comenzi)": istoricul comenzilor, nu al aparatelor.

Sloturi: 267 → **268**. Bundle: 552,69 → **555,38 kB**. 463 teste de logică
(+5 pe acordeoane), 44 de fidelitate de stil, 104 combinaţii responsive,
zero probleme, zero erori de consolă.

## 2.3.0

**AC Casa Tata intră în aplicaţie** — al patrulea aparat de climatizare, şi
primul comandat prin **infraroşu**. Un ESPHome pe placă d1_mini emite cadre
ballu/ELECTRA_AC către aparatul din bucătăria lui tata. Emiţătorul trimite;
aparatul nu răspunde niciodată înapoi.

**Consecinţa e vizibilă în interfaţă, nu ascunsă într-un tooltip.** Acolo unde
celelalte trei unităţi arată „Ambient 26,5 °C", aceasta scrie
**„Control IR · stare presupusă"** — pe card, în rândul din pagina Climat şi ca
rând propriu în panoul de setări avansate, care e locul de unde pleacă
comenzile. Ce vezi ca stare e ultima comandă trimisă, nu o observaţie.

**Nu am inventat nimic ca să umplem golurile.** Aparatul nu are senzor de
temperatură, deci cardul nu are ambient şi nu am împrumutat valoarea altei
camere. Nu apare în *Temperaturi pe zone* — iar acolo scrie de ce, ca absenţa
să nu arate a scăpare. În *Stare unităţi* apare etichetat „Casa Tata · IR
(comenzi)", fiindcă exact asta e: istoricul comenzilor, nu al aparatului.

**Controalele sunt cele validate fizic**, niciunul în plus: şase moduri (Oprit,
Răcire, Încălzire, Auto, Dezumidificare, Ventilare), patru viteze de ventilator,
patru moduri de baleiaj, ţintă 16–32 °C cu pasul de 1. Secţiunea de mod e
dedicată, nu cea comună: aparatul expune `heat_cool`, nu `auto`, iar secţiunea
comună ar fi adus un buton permanent inert. Nu are „Funcţii" (nu expune
presetări) şi nu are „Diagnostic" — nu există nimic de citit de la el.

**Pending-ul rămâne mecanismul existent, neatins.** Se închide când ESPHome
acceptă comanda — măsurat sub 300 ms — fiindcă nu există confirmare de la aparat
pe care să o aştepte. Ar aştepta la nesfârşit.

În *Dispozitive* apare placa ESPHome reală, cu disponibilitatea ei. Dacă placa
pică, aparatul devine necomandabil şi se vede — dar asta rămâne starea plăcii,
niciodată a aparatului.

Aparatul e disponibil şi în selectorul paginii *Acasă*, ca oricare alt card.
Nu l-am pus în lista implicită: nici celelalte două AC-uri nu sunt acolo.

Sloturi: 266 → **267**. 458 teste de logică, 44 de fidelitate de stil,
104 combinaţii responsive, zero probleme, zero erori de consolă.

## 2.2.0

**Rețeaua se administrează în Omada Controller.** Pagina *Reţea* iese din
aplicaţie. Integrarea TP-Link Omada rămâne în Home Assistant, neatinsă — cu tot
cu cele 19 dispozitive, 119 entităţi şi 35 de device tracker-e pe care se sprijină
prezenţa.

**Ce a dispărut.** Pagina cu cele cinci carduri — internet şi echipamente,
puncte de acces, consum PoE, porturi LAN, istoric infrastructură — cu monitoarele,
cronologia de 7 zile şi cele trei grafice. Plus intrarea din navigaţie, inelul
„Puncte de acces" din antet, cele **49 de sloturi `net.*`** şi cele 49 de mapări.
Aplicaţia are acum **8 pagini** în loc de 9.

**Ce a rămas, fiindcă era altceva decât părea.** Cuvântul „reţea" se foloseşte în
această casă pentru două lucruri diferite. Pe *Energie*, „Reţea" e reţeaua
electrică: cardul de export/import, direcţia schimbului, diagrama Sankey,
senzorii Growatt de import şi export. Toate rămân. La fel `laRetea` din
`HaProvider`, care ascultă evenimentul `online` al browserului şi n-are legătură
cu Omada.

Au rămas şi lucrurile care doar treceau prin pagină: cele cinci sloturi
`upd.eap_*` şi `upd.net_sw*` sunt în grupul *Mentenanţă* şi apar acolo — pagina
Reţea era doar al doilea lor consumator, iar acela a plecat. Iconul `wifi` era
partajat cu cardul „Conexiune" din *Dispozitive*, deci a rămas.

**Infrastructura nu a rămas fără loc.** Gateway-ul, cele cinci EAP-uri şi cele
şase switch-uri se văd în *Dispozitive*, unde Device Health le citeşte direct din
registrele HA. Diferenţa se vede bine: la 17:42, în timpul acestui release, Omada
a descoperit un switch nou (ES210X-M2) cu trei senzori. Pe pagina veche ar fi
cerut trei sloturi şi trei mapări scrise de mână ca să apară. În Dispozitive a
apărut singur.

**Subtitlurile care trimiteau la o pagină inexistentă** au fost corectate:
*Zone* spunea „infrastructura rămâne pe Reţea şi Mentenanţă" şi spune acum
„pe Mentenanţă şi Dispozitive". La fel comentariul din `ZonePage` şi cel care
justifica iconul paginii Dispozitive.

**Mapările salvate se curăţă singure.** `MAP_SCHEMA_VERSION` trece la 3, ceea ce
declanşează migrarea care şterge din localStorage cheile fără slot: cele 49
`net.*` de acum şi cele 11 CCTV rămase de la 2.1.0, unde incrementul lipsise.

Bundle: 560,36 → **550,37 kB**. Sloturi: 315 → **266**. 458 teste de logică,
44 de fidelitate de stil, 104 combinaţii responsive (8 pagini × 13 lăţimi),
zero probleme, zero erori de consolă.

## 2.1.0

**Camerele ies din aplicaţie.** Decizie de arhitectură: supravegherea se face
exclusiv din DMSS — live view, playback, PTZ, preseturi, evenimente, configurare.
Home Assistant şi Home Dashboard nu mai au camerele deloc. Nu e o amânare şi nu e
un „deferred": e o graniţă trasată.

**Ce a dispărut din aplicaţie.** Pagina *Camere* cu tot ce ţinea de ea: grila de
supraveghere, starea feed-urilor ONVIF, comenzile de iluminare IR, ştergătorul
Speed Dome, istoricul de disponibilitate. Plus intrarea din bara de navigaţie,
cele 11 sloturi şi cele 11 mapări, constructorul de bloc `cameraGrid`, randarea
lui, icoanele `cctv` şi `camera`, maparea domeniului `camera` din pagina Zone.
Aplicaţia are acum **9 pagini** în loc de 10.

**Şi din Home Assistant**, unde nu mai era decât un sistem care se plângea: cele
cinci intrări ONVIF (patru în `setup_error`, una în `setup_retry`), cinci
dispozitive şi **61 de entităţi**. Zero intrări orfane rămase în registre, zero
entităţi cu `device_id` mort.

**Ce a rămas, deliberat.** Trei senzori numiţi `camera_tehnica_piscina_*` — sunt
ai clorinatorului din *camera tehnică* a piscinei, nu ai vreunei camere video.
În română cuvântul e acelaşi; apartenenţa s-a citit din registre, nu din nume.
La fel, descrierile de climatizare care vorbesc despre „aerul din cameră" şi
pagina Zone, a cărei axă sunt încăperile.

**Referinţe curăţate, nu doar obiecte şterse.** Rândul „Cameră Speed Dome" din
*Integrări cu probleme* pe Mentenanţă arăta către un slot care nu mai există.
Nota despre PoE de pe Reţea şi cea de pe Mentenanţă nu mai vorbesc despre camere.
Comentariile care justificau decizii de layout cu „Ştergător Speed Dome" folosesc
acum eticheta cea mai lungă reală din aplicaţie, *„Pornire trimisă (min)"*
(21 de caractere). Fixturile din teste au fost redenumite: testau logica de
sănătate, nu camerele, aşa că au rămas — cu nume neutre.

**Nimic fizic nu a fost atins.** NVR-ul, camerele, IP-urile, parolele, ONVIF-ul
configurat în ele, înregistrările, Omada, VLAN-urile, PoE-ul şi DMSS rămân exact
cum erau. Eliminarea a fost strict din Home Assistant şi din această aplicaţie.

Bundle: 569,18 → **560,36 kB**. Sloturi: 326 → **315**. 458 teste de logică,
44 de fidelitate de stil, 117 combinaţii responsive (9 pagini × 13 lăţimi),
zero probleme, zero erori de consolă.

## 2.0.1

**Butonul Power spune acum, singur, că lucrează.** Cât timp comanda e pe drum,
în interiorul butonului se roteşte un inel portocaliu în jurul iconiţei Power.
Nimic altceva nu se schimbă: fundalul rămâne cel al stării REALE, iar inelul nu
promite un rezultat — spune doar „am trimis, aştept".

**De ce înăuntrul butonului, nu în jurul lui.** Pastila e portocalie când
controlul e pornit, deci un inel portocaliu desenat pe ea ar fi dispărut exact
în jumătate din cazuri. Knob-ul, în schimb, e gri închis când e oprit şi aproape
alb când e pornit — portocaliul are contrast pe amândouă. În plus nimic nu iese
din cutia butonului: măsurat, pastila rămâne 69×36, knob-ul 26×26, poziţiile în
card identice. **Zero deplasare de layout.** Zona de atingere rămâne 56 px.

**Durata animaţiei e durata comenzii, nu un cronometru al ei.** Inelul citeşte
acelaşi `inZbor` din registrul de comenzi introdus în v1.7.3 — nu s-a adăugat
niciun al doilea mecanism, niciun timer per buton, nicio buclă JS. Verificat cu
confirmarea suprimată la nivel de transport: inelul e acolo la 1,5 s, tot acolo
la 7,5 s, şi dispare când comanda expiră, lăsând loc mesajului de eroare
existent.

**Tehnică.** Un singur pseudo-element `::after`, conic-gradient tăiat în inel cu
`mask` acolo unde există, arc din borduri unde nu — deci nu există browser în
care indicatorul lipseşte. Se animă exclusiv `transform` şi `opacity`,
compozitate pe GPU. La `prefers-reduced-motion` rotaţia dispare, dar inelul
rămâne complet şi vizibil: el poartă informaţia, nu mişcarea.

**Acoperă butoanele Power discrete**, în toate cele şase locuri unde apar: card
de dispozitiv, bară laterală, antet de acordeon, modal, comutatorul de AC de pe
Acasă şi Service Mode. Valorile continue — temperatură, volum, number, moduri —
rămân neatinse, aşa cum trebuie: acolo nu există „pornire", ci o valoare care se
schimbă.

Măsurat pe 50 de interacţiuni: niciun inel rămas agăţat, heap 6,3 → 6,4 MB, zero
erori de consolă, încadrare corectă la şapte lăţimi de la 320 la 1440 px.

## 2.0.0

**Poarta te poate aștepta deschisă, dar numai dacă i-ai spus tu.** Notificarea de
apropiere are acum trei răspunsuri: **DESCHIDE LA SOSIRE**, **DESCHIDE ACUM** şi
**NU**. Prima nu mişcă nimic — memorează intenţia şi urmăreşte drumul; poarta
porneşte abia când datele arată că chiar ajungi. Confirmarea ta rămâne
obligatorie: nu există deschidere automată fără ea.

**Nu deschide pe distanţă.** Scenariul care contează: opreşti la 100 m de casă şi
vorbeşti un sfert de oră cu vecinul. Poarta trebuie să stea închisă. De aceea
regula nu se uită la „cât de aproape eşti", ci la **viteza de apropiere**,
calculată din două raportări consecutive: `(distanţa_anterioară − distanţa_curentă)
/ timp`. Mărimea asta dă în acelaşi număr şi direcţia, şi ritmul.

**Atributul `speed` nu e folosit deloc, şi asta e o decizie măsurată.** Pe
deplasările reale telefonul a raportat `speed = 0` sau `1` în timp ce se mişca cu
9,7–16,4 m/s. O regulă construită pe el ar fi tăcut exact în momentul sosirii.

**Momentul deschiderii se adaptează la viteză.** `ETA = distanţă / viteză de
apropiere`, iar poarta porneşte la ETA sub 20 s, cu distanţa plafonată la 300 m.
Cu maşina asta înseamnă ~200–280 m; pe jos, câţiva zeci de metri. Rulat peste
deplasările reale înregistrate: la sosirea de la 22:44 regula ar fi deschis la
**200 m, cu ETA 19 s**, iar la 629 m — corect — nu ar fi deschis.

**Trei filtre împotriva zgomotului.** Scăderea de distanţă trebuie să depăşească
acurateţea GPS înmulţită cu 1,5, altfel jitterul ar trece drept apropiere.
Acurateţea peste 50 m e refuzată. Iar viteza de apropiere e plafonată la 40 m/s:
în datele reale au apărut „apropieri" de 560–639 m/s — fixări GPS sărite, care
altfel ar fi deschis poarta singure.

**High Accuracy nu se mai opreşte când pleacă notificarea.** Dacă alegi DESCHIDE
LA SOSIRE, urmărirea deasă continuă exact de atunci încolo. Se opreşte la
deschidere, la NU, la intrarea în Home, la Service Mode, dacă notificarea rămâne
fără răspuns 6 minute, sau la expirarea intenţiei.

**Intenţia expiră în 30 de minute** şi se anulează dacă te îndepărtezi clar. La
repornirea Home Assistant, steagul se păstrează dar cronometrul nu — iar
deschiderea cere cronometrul activ, aşa că o confirmare veche nu poate deschide
poarta după o repornire.

**Service Mode e override master.** Pornit, anulează intenţia, dezarmează sosirea
şi opreşte urmărirea. Butonul manual rămâne funcţional.

**Android Auto.** Notificarea foloseşte `car_ui: true`, cheia oficială. Pentru
buton în maşină există `script.poarta_android_auto`, un înveliş peste scriptul
central — acelaşi cooldown, aceeaşi urmă în logbook, doar sursa diferă.

**Un singur drum către releu.** Dashboard, notificare, deschidere automată şi
Android Auto trec toate prin `script.deschide_poarta`, cu cooldown-ul lui de 45 s.

## 1.9.0

**Poarta de la intrare, fără să pretindem că ştim unde e.** Poarta nu are senzor
de poziţie. Nimic din instalaţie nu poate spune dacă e deschisă, închisă sau în
mişcare — aşa că interfaţa nu spune. Cardul arată **„Control disponibil"**, iar
după apăsare **„Comandă trimisă"**. Verificat în browser: zero apariţii ale
cuvintelor de poziţie în toată pagina.

**Un impuls, nu un comutator.** Shelly-ul e tehnic un `switch`, dar semantic e o
apăsare de o secundă pe intrarea START a controllerului Linomatik. Comanda trece
printr-un script HA, `Deschide poarta`, nu prin comutatorul brut — iar releul se
stinge singur după 1 s (Auto Off hardware). Măsurat pe releu: **impuls de
1003 ms**. Linomatik rămâne responsabil de motor, fotocelule, limitatoare şi
auto-close; nimic din ele nu a fost atins.

**Al doilea impuls ar însemna STOP.** Intrarea START e secvenţială: o a doua
apăsare nu deschide mai tare, ci opreşte poarta la jumătatea cursei. De aceea
scriptul are un cooldown de **45 s**, pornit *înainte* de impuls, iar butonul se
dezactivează cu numărătoare inversă. Testat: a doua comandă, trimisă imediat, nu
a produs niciun impuls, iar marcajul ultimei comenzi a rămas neatins — încercările
blocate nu se scriu ca reuşite.

**Aşteptare vizibilă, fără stare inventată.** Comanda intră în registrul generic
din v1.7.3 cu un tip nou, `impuls`, cu fereastră proprie de 8 s. Confirmarea vine
din releul Shelly publicat pe `on` — un fapt din HA, nu o presupunere despre
poartă. Eşantionat la 15 ms: **„Se trimite…" apare la +50 ms şi ţine 161 ms**,
cu `aria-busy` şi etichetă accesibilă, apoi confirmarea.

**Comandă de la distanţă, prin acelaşi buton.** Testat prin Nabu Casa: calea
activă *NABU CASA*, click → apel pe fir în **31,2 ms**, releu mişcat, card trecut
pe „Comandă trimisă". Shelly rămâne comandat **local** de Home Assistant; cloud-ul
Shelly nu e dependenţă, iar reţeaua n-a fost atinsă.

**Service Mode.** Cât e pornit: fără geofence, fără notificări de sosire, fără
auto-open — dar butonul manual rămâne funcţional. O notificare rămasă în coadă şi
apăsată în Service Mode e **refuzată explicit**, cu mesaj: nimeni nu mişcă poarta
peste cineva care lucrează la ea.

**Apropiere de casă, cu confirmare umană.** Zonă nouă `Apropiere Casă` (250 m) pe
coordonatele Home, neatinse. La intrarea în zonă dinspre exterior pleacă o
notificare cu **DESCHIDE / NU**, care expiră în 5 minute. V1 **nu** deschide
automat din GPS. Gating de 15 minute, ca oscilaţia GPS pe marginea zonei să nu
producă notificări repetate.

**Diagnostic real.** Poarta apare în *Dispozitive* ca „Sănătos · fără sursă de
ultimă comunicare" — starea integrării, nu un timestamp inventat. Semnalul Wi-Fi
şi uptime-ul Shelly au fost activate: **-67 dBm** la momentul verificării.

## 1.8.0

**Aplicaţia îşi alege singură drumul spre Home Assistant.** Aceeaşi pagină e
deschisă de pe tableta din bucătărie şi de pe telefon, de pe date mobile. Acasă,
drumul bun e adresa din LAN — fără ocol prin cloud. În afară, singurul drum e
tunelul Nabu Casa. Până acum, trecerea dintr-o parte în alta însemna schimbat un
URL cu mâna. Acum nu mai înseamnă nimic: se întâmplă singură.

**Proba nu e „am semnal", ci „HA răspunde".** `navigator.onLine` spune doar că
există o interfaţă de reţea activă; pe un Wi-Fi străin ar minţi cu convingere.
Sonda deschide un WebSocket şi duce autentificarea până la `auth_ok`, apoi
închide imediat conexiunea. LAN-ul primeşte **1,2 s** de răbdare — de o sută de
ori peste normalul măsurat de 10 ms — iar tunelul, care are de făcut TLS plus
ocolul prin cloud, primeşte 8 s.

**Măsurat cap-coadă, pe cele patru situaţii reale.** În LAN se alege *LOCAL*. Cu
LAN-ul inaccesibil, sonda locală eşuează în **218 ms** şi tunelul e conectat la
**606 ms**. Dacă LAN-ul cade în timpul sesiunii, comutarea pe tunel durează
**2,76 s**, din care 2,5 s sunt fereastra de graţie deliberată — restul, 257 ms,
e munca propriu-zisă. Când LAN-ul revine, ne întoarcem pe el în **2,7 s**.

**Întoarcerea acasă nu se caută cu insistenţă.** O sondă la două minute, plus
verificare la revenirea reţelei şi la reafişarea paginii — momentele în care
chiar se schimbă ceva. Un ping continuu pe date mobile ar fi exact ce nu vrem.
Şi nu comutăm pe speranţă: doar dacă adresa locală chiar a răspuns.

**Reconectare curată, verificată la 50 de comutări consecutive.** Toate 50 au
reuşit. Fiecare conexiune reală poartă **cel mult 5 abonamente** (entităţile plus
cele patru registre) şi **niciuna nu are un abonament duplicat**. La final rămâne
**un singur socket viu**, iar memoria stă pe loc: 6,9 → 7,1 MB. Zero erori de
consolă.

**Ecranul de conectare apare doar când chiar nu există drum.** Iar în
diagnosticul din *Dispozitive* se vede, read-only, calea realmente conectată:
`LOCAL` sau `NABU CASA`. Nu se afişează o cale „probabilă" — dacă nu răspunde
niciuna, nu inventăm una.

**Adresa Nabu Casa nu intră în repozitoriu.** E date ale instanţei şi trăieşte
doar în configuraţia locală a browserului, lângă token. Token-ul nu e duplicat:
aceeaşi credenţială serveşte ambele drumuri.

## 1.7.3

**Răspuns imediat la apăsare, fără să pretindem un rezultat.** Până acum
apăsarea unui control lent nu avea niciun ecou: v1.7.1 oprise minciuna
optimistă, dar nu pusese nimic în loc. Acum apare un inel care se roteşte şi
textul **„Pornire…" / „Oprire…"** — iar starea afişată rămâne, tot timpul, cea
reală din Home Assistant.

**Un registru generic, nu un artificiu per card.** Cheia e `entity_id|acţiune`,
stările sunt `TRIMIS → ASTEPT → CONFIRMAT | ESUAT | EXPIRAT`, iar intrarea se
şterge când ajunge într-o stare terminală. Verificat pe 50 de comenzi reale:
**zero spinnere şi zero `aria-busy` rămase** la final.

**Confirmarea e reală, nu un cronometru.** Se cere şi publicare NOUĂ pentru
entitate (`last_updated` diferă faţă de momentul trimiterii), şi potrivire cu
ţinta. Fără prima condiţie, o stare veche care se întâmplă să fie deja ţinta ar
confirma o comandă care n-a produs nimic. Comparăm **şiruri**, nu ceasuri.
Pentru climate ţinta e chiar modul trimis (`cool`), nu „on" — altfel nu s-ar fi
confirmat niciodată.

**Ferestre pe familie, din auditul de latenţă**, nu un prag universal:
televizor pornire **45 s**, televizor oprire **40 s** (măsurat 32,8 s la
Hisense — nu „mult mai scurt", cât arată datele), restul **15 s**. Dacă HA
confirmă la 2 s, indicatorul dispare la 2 s.

**Măsurat pe dispozitive reale:**

| Caz | rezultat |
|:--|:--|
| TV Foişor (se trezeşte) | indicator la 262 ms → dispare la **6.321 ms**, la confirmarea reală |
| TV Bucătărie (nu se trezeşte) | indicator ţinut **45.232 ms**, apoi starea reală „Standby" şi mesajul „Pornirea nu a fost confirmată" |
| Climate Vivax | dispare la **802 ms** |
| Comutator cloud AUX | indicator la **3,5 ms**, dispare la **18,6 ms** |

**Latenţa indicatorului: 3,5 ms** (cerinţa era sub 100 ms), iar trimiterea
comenzii rămâne neatinsă — T0→T1 = 0,1 ms, exact ca înainte.

**Dublu clic:** cinci apăsări în fereastra de aşteptare produc **o singură
comandă**. Alte funcţii ale aceluiaşi aparat rămân disponibile — se blochează
perechea entitate+acţiune, nu aparatul. Fără retry automat.

**Eşecul se închide pe loc**, fără să aştepte fereastra: eroarea reală e deja
cunoscută. Iar mesajul de neconfirmare nu mai primeşte prefixul „Comanda nu a
ajuns la HA" — la expirare comanda **a** ajuns la HA; doar aparatul n-a
confirmat.

**Accesibilitate:** `aria-busy` pe control, text ascuns vizual „Pornire în curs"
/ „Oprire în curs" — inelul singur nu spune nimic unui cititor de ecran. La
`prefers-reduced-motion` rotaţia se opreşte, dar inelul **rămâne vizibil**: el
poartă informaţia, nu mişcarea.

**Stări tranzitorii:** confirmăm la prima publicare care egalează ţinta, fără
fereastră de stabilitate. Motivul e scris în cod: o astfel de fereastră ar fi
întârziat exact cazul bun, iar interfaţa oricum nu minte — dacă televizorul
revine la `off`, se vede `off`.

Corectat şi un contrast sub prag: pilula „Offline" de pe Dispozitive avea
4,43:1 la 12px, prinsă de audit în clipa în care un dispozitiv chiar a ajuns
offline. Acum ~4,95:1.

Teste: 406 logică + 44 stil. Audit responsive: 130/130, 0 probleme.

## 1.7.2

**Coalescare pe valorile continue** — temperatură ţintă, volum, number. Nu şi pe
ON/OFF: acolo intenţia e discretă, nu continuă.

**Măsurat înainte**, pe AC Mansardă Vortex (aux_cloud), aparat pornit de cineva
din casă: cinci apăsări rapide pe „+" trimit **cinci** comenzi `set_temperature`
(la 1, 139, 264, 398, 528 ms). Cloud-ul AUX le serializează intern — durata unui
apel urcă de la ~712 ms izolat la **2.400–3.875 ms** în rafală, iar valoarea
finală se aşază după **~3,9 s**. Aparatul îşi schimbă ţinta de cinci ori pentru
o singură intenţie.

**Măsurat după:** cinci apăsări → **o comandă**, trimisă la 914 ms, confirmată la
1.222 ms. O apăsare singură pleacă la 355 ms şi se confirmă la 659 ms — nimic
pierdut.

| | comenzi către aparat | valoare finală aşezată |
|:--|--:|--:|
| înainte | **5** | ~3,9 s |
| după | **1** | ~1,2 s |

Fereastra e trailing, **350 ms**: tastarea rapidă măsurată e la ~130 ms între
apăsări, deci rafala se strânge într-o comandă, iar o apăsare singură rămâne sub
pragul de percepţie — cu atât mai mult cu cât numărul afişat e chiar selecţia
utilizatorului, nu o stare pretinsă a aparatului.

Ce e în aşteptare la închiderea paginii **se trimite**, nu se aruncă: altfel
ultima apăsare s-ar fi pierdut tăcut.

**`data-sp` pe butoanele +/−**, ca `data-acc` şi `data-page`. Fără identificatori
stabili, o sondă trebuie să caute butonul după forma glifei.

Teste: 365 logică + 44 stil. Audit responsive: 130/130, 0 probleme.

## 1.7.1

**Interfaţa nu mai pretinde o stare pe care dispozitivul n-a confirmat-o.**

Măsurat, nu dedus. Comutatorul „Economie" al LG-ului, apăsat cu aerul
condiţionat oprit — caz în care LG răspunde `Command not supported in POWER
OFF`:

| moment | ce se întâmpla ÎNAINTE |
|:--|:--|
| t = 136 ms | dala trece pe PORNIT (valoare optimistă) |
| t = 543 ms | LG respinge comanda; HA raportează eroarea |
| t = 4.057 ms | dala revine pe OPRIT (expiră cronometrul de 4 s) |

Adică **3,9 secunde de stare inventată după ce eşecul era deja cunoscut**. Exact
simptomul „apăs ON, pare că merge, apoi revine OFF" — nu o ciudăţenie de
televizor, ci mecanismul de „optimistic UI" al aplicaţiei, vizibil pe orice
control care nu confirmă în patru secunde.

**Trei schimbări, toate în stratul de stare, niciuna cosmetică:**

1. `isOn()` întoarce starea **reală**, niciodată valoarea optimistă.
2. Un apel eşuat stinge marcajul **pe loc**, nu după patru secunde.
3. Marcajul se stinge şi când HA publică o stare nouă pentru entitate —
   comparând şiruri `last_updated`, nu ceasuri, fiindcă o diferenţă de ceas
   între PC şi HA ar fi greşit tăcut.

Comanda în zbor rămâne vizibilă, dar ca **ce este**: un contur portocaliu subţire
care spune „a plecat", nu o stare care spune „s-a făcut". Fără el o dală de
televizor ar părea moartă zeci de secunde.

Costul e zero pe căile rapide: podeaua măsurată e **19 ms** cap-coadă
(clic → pixeli), iar starea AUX ajunge în HA în **8 ms**.

**Rezultat măsurat pe acelaşi scenariu:** reversia de la 4.057 ms **a
dispărut**. Overhead-ul aplicaţiei rămâne neschimbat — T0→T1 = 0,1 ms, exact un
apel de serviciu per apăsare, un singur WebSocket, un singur abonament.

Teste: 365 logică + 44 stil. Audit responsive: 130/130, 0 probleme.

## 1.7.0

**Programare la oră exactă pentru AC Etaj LG.** Secţiune nouă „Programare" în
cardul existent, sub „Cronometre" — care rămâne neatinsă. Cele două nu se
amestecă deliberat: la „Cronometre" scheduler-ul e cloud-ul LG (cronometre
relative, prin bridge-ul `lg_thinq_timers`), la „Programare" e **Home
Assistant** (oră exactă, prin helpere + automatizări). Ora exactă NU se
converteşte într-un cronometru relativ LG.

**Arhitectura.** 26 de helpere + 2 senzori template + 2 automatizări, toate în
HA. Programarea supravieţuieşte reîncărcării paginii, repornirii add-on-ului şi
repornirii Home Assistant, fiindcă dashboard-ul nu ţine nimic — e doar interfaţă
de configurare şi afişare.

**Şapte booleeni de zi, nu un şir „1,2,3".** Aşa condiţia din automatizare
rămâne 100% nativă — `condition: time` cu `weekday` plus `condition: state` —
deci e validată la încărcarea configuraţiei şi nu poate eşua tăcut pe un şir
malformat. În plus o zi se comută cu un singur apel de serviciu, fără
citeşte-modifică-scrie peste un CSV care s-ar bate cu el însuşi la două
atingeri rapide.

**Ordinea comenzilor, măsurată live, nu presupusă.** `climate.set_hvac_mode`
porneşte **şi** setează modul dintr-un singur apel; temperatura şi ventilatorul
sunt acceptate imediat după, fără pauză. Readback-ul LG întârzie ~15 s, dar
comanda intră — deci nu am pus un `delay` pe care măsurătoarea nu îl cere.
Dacă modul e „Nu schimba", se foloseşte `climate.turn_on` şi modul anterior
rămâne. Ce nu e ales nu se atinge.

**Ce nu inventează interfaţa.** „Următoarea execuţie" vine din HA
(`sensor.*_urmatoarea`, device_class timestamp) — browserul doar formatează un
instant deja decis, nu calculează el fusul orar. „Ultima execuţie" e scrisă de
automatizare ca **ultim pas**, deci un apel eşuat opreşte secvenţa înainte de
marcaj şi dashboard-ul nu poate pretinde că a executat. O programare activă pe
„zile alese" fără nicio zi bifată nu s-ar declanşa niciodată — scrie asta, în
loc să arate „Activ" lângă un „Următoarea: —".

**Testat cap-coadă pe dispozitivul real**, nu doar pe urma automatizării:
oprire programată `off` la 22:57:03, pornire programată din `off` la 23:00:07 cu
`cool` · 25 °C · ventilator mic — toate trei setările opţionale aplicate,
one-shot dezactivat singur, marcaj de execuţie scris. Ramura recurentă a fost
verificată pe o zi care nu era cea curentă: declanşatorul a pornit, condiţia a
blocat (`execution: failed_conditions`), aerul condiţionat neatins.

Cronometrele relative LG au rămas `unknown` pe tot parcursul — nu au fost
apelate niciodată.

Catalog: 291 → **319 sloturi**, toate mapate. Teste: 365 logică + 44 stil.

## 1.6.1

Un invariant semantic, verificat cu test de proprietate în loc de exemple: pentru
un dispozitiv **fără sursă reală de ultimă comunicare**, `HEALTHY` înseamnă
strict „integrare încărcată + toate entităţile disponibile", `freshness` rămâne
`UNKNOWN`, iar `SLOW` şi `STALE` sunt **inaccesibile**. Testul plimbă 600 de
combinaţii de integrare × entităţi × indisponibilitate × vechime şi cade dacă
vreuna produce un verdict de comunicare fără sursă de comunicare.

Verificarea a scos la iveală o margine care îl încălca. Un dispozitiv cu doar o
parte din entităţi indisponibile primea **`SLOW`**, etichetat „Întârziat" — adică
un verdict despre *cât de repede comunică*, dedus din disponibilitate, pe un
dispozitiv care în 83 de cazuri din 85 nu are nicio sursă de comunicare. Acum
primeşte clasa proprie **„Parţial indisponibil"**, iar `SLOW`/`STALE` rămân
exclusiv verdicte de freshness.

Niciun dispozitiv real nu era afectat în momentul reparaţiei — ramura avea zero
ocupanţi. Era latentă, nu vizibilă.

## 1.6.0

Pagina a zecea, **Dispozitive**: starea celor 85 de dispozitive din registre,
plus un panou de observabilitate pentru stocare şi memorie. Read-only —
niciun buton reporneşte ceva.

**Regula care dă forma paginii.** Un interval dedus din schimbări de stare nu
e un interval de comunicare. Freshness se calculează exclusiv dintr-o sursă
reală — last-seen, timestamp de pachet, heartbeat. Inventarul, măsurat nu
presupus: **două** dispozitive din 85 au aşa ceva, cele două senzoare
`grott_last_data_push`. Zero entităţi de tip uptime, last_seen sau heartbeat în
rest; singurul alt `device_class: timestamp` relevant e
`camera_speed_dome_last_reboot`, care e un moment de repornire, nu o bătaie de
inimă. Celelalte 83 afişează explicit **„fără sursă de ultimă comunicare"** şi
nu pot fi declarate învechite din vechimea stării: un întrerupător neatins de o
zi are starea veche şi funcţionează perfect. Vechimea stării se arată, dar
etichetată ca atare şi fără drept de vot în clasificare. Semnalul primar rămâne
disponibilitatea.

**Cadenţa reală a celor două surse e de 5 minute**, citită din istoricul
valorilor (17:00:53 → 17:05:53 → … → 17:40:49). Nu din diferenţa până la „acum":
aceea dă doar timpul scurs de la ultimul pachet şi m-a dus o dată la concluzia
greşită că push-ul ar fi la un minut.

**Distincţia care evită cinci alarme false.** `state: "not_loaded"` nu înseamnă
defect: toate cele şase intrări `not_loaded` de aici au `source: "ignore"` —
descoperiri respinse deliberat. Raportate ca „integrare căzută" ar fi produs
şase alarme permanente. `setup_retry`, în schimb, chiar e defect, iar pagina
arată corect **cele cinci intrări ONVIF** aflate acolo.

**Linia de bază vine din istoric, nu din răbdare.** Fără sămânţă, intervalul
normal s-ar fi adunat doar cât stă pagina deschisă, deci o tăcere n-ar fi fost
detectabilă decât după un sfert de oră de privit ecranul. O singură cerere de
istoric pe fereastră de două ore rezolvă asta la încărcare. Şi, cât timp linia
de bază lipseşte, dispozitivul rămâne **sănătos**, nu „necunoscut" — altfel a
avea o sursă reală l-ar fi făcut să arate mai rău decât unul care nu raportează
nimic.

**Observabilitate**, din `system_health/info`: disc 7,4 GB din 28 GB (26%),
uzură 0%, bază de date 62,2 MB pe motor sqlite. Ritmul de creştere se arată ca
medie pe fereastra păstrată, cu rezerva scrisă lângă cifră: recorder-ul purjează
la un orizont fix, deci dimensiunea **se plafonează**. O proiecţie „disc plin în
N zile" ar fi fost o alarmă inventată. Aplicaţia îşi ştie acum versiunea
(injectată la build din `config.yaml`), iar conexiunea îşi numără căderile.

**Memorie, măsurată în două tururi.** 80 de navigări: turul 1 +1,5 MB, turul 2
+0,2 MB. Un cache care se umple, nu o scurgere — un singur tur n-ar fi putut
deosebi cele două. localStorage rămâne la 3 chei şi ~1 KB; inelul de momente de
comunicare e mărginit la 24 per dispozitiv prin construcţie.

**Un defect vechi, prins de matricea nouă.** Antetul de acordeon de pe Climat
tăia „AC Mansarda Vortex Air Conditioner" — un `friendly_name` venit din HA, nu
o etichetă pe care s-o scurtăm noi. Măsurat cu sondă, nu estimat: la 320px
coloana numelui rămâne **61px** şi textul cere şase rânduri; la 414px încape.
Soluţia e lăţimea, nu clamp-ul — sub 400px numele trece pe rând propriu şi
comenzile coboară sub el. La 414px nimic nu s-a schimbat.

Audit responsive: **130 din 130 combinaţii măsurate, 0 probleme** (10 pagini ×
11 lăţimi + 2 ramuri touch). Teste: 323 logică + 44 stil.

## 1.5.6

Etichetele nu se mai taie pe ecrane înguste — şi, mai important, **auditul le
vede acum**. Până acum raporta zero probleme pe Piscină la 320px, în timp ce pe
ecran scria `Re...` în loc de „Regim redus".

**Fals-negativul.** Detectorul de text trunchiat cerea `text-overflow: ellipsis`.
Dar aplicaţia nu taie cu ellipsis: foloseşte `-webkit-line-clamp`, care pune
elipsa pe verticală, la capătul ultimei linii permise, şi lasă
`text-overflow: clip` cu `scrollWidth == clientWidth`. Nimic de detectat.
Detectorul nou compară `scrollHeight` cu `clientHeight` pe orice element cu
line-clamp activ şi raportează câţi pixeli de text s-au pierdut. Pus pe
build-ul nereparat, a găsit imediat **15 probleme**: nu doar cele trei ştiute de
pe Piscină, ci şi „Ştergător Speed Dome" pe Camere şi patru etichete de Climat.

Matricea creşte de la 9 la **11 lăţimi** — adăugate 320, 375 şi 430 — deci de la
99 la **117 combinaţii**.

**Cauzele, două, măsurate.** Prima: chip-urile de sub 360px erau limitate la o
singură linie, iar „Regim redus" pierdea 44px. Acum au trei, ca restul
etichetelor la aceeaşi lăţime. A doua, cea care conta de fapt: `grid(3, …)`
randa trei dale **şi la 320px**, lăsând ~30px de text fiecare — „Regim redus"
ar fi avut nevoie de patru linii ca să încapă. Nu era problemă de clamp, ci de
lăţime; sub 360px grilele se plafonează la două coloane.

Ultima ruptură inelegantă a plecat şi ea: `word-break:break-word` rupea
„Clorinator" în „Clorinat/or" deşi cuvântul încăpea pe linia următoare.
Înlocuit cu `overflow-wrap:break-word` + `hyphens:auto`.

Nimic nu s-a redesenat, niciun font nu a scăzut, nicio ţintă tactilă nu a
coborât sub 44px — dalele doar cresc în înălţime acolo unde textul o cere.

Audit responsive: **117 din 117 combinaţii măsurate, 0 probleme.**
Teste: 229 logică + 44 stil.

## 1.5.5

Cronometrele LG sunt conectate la bridge-ul `lg_thinq_timers` şi ies din
regimul de estimare. Până acum dashboard-ul scria în `number.*`-urile LG, care
raportau valori pe care aparatul nu le respecta; acum fiecare comandă merge
prin cele şase servicii ale bridge-ului, cu schema lor reală citită din HA.

**Semantica e cea a aparatului, nu una inventată.** Pornirea şi oprirea
programată acceptă ore + minute; temporizatorul de somn acceptă **doar ore**,
fiindcă LG respinge minutele cu 2201 pe acest model. Pornirea programată cere
aparatul oprit, oprirea îl cere pornit — condiţii pe care UI-ul le blochează
înainte de trimitere, cu motivul scris, iar bridge-ul rămâne autoritatea
finală. Sub valoarea minimă comanda devine *anulare*, nu „zero minute": un
timer de zero nu există la LG.

**Timerele rămân WRITE-ONLY.** Nu există readback continuu, deci nu inventăm
nici countdown, nici confirmare. După o comandă acceptată, cardul arată
`Trimis 1h 30m · 00:42 · fără confirmare continuă LG`. Confirmarea fizică e
schimbarea stării din integrarea oficială, nu un număr desenat de noi.
Receipt-urile se ţin în `localStorage`, maximum trei, fără istoric nelimitat.

**Erorile se afişează aşa cum sunt.** 2302, 2304 şi 2201 primesc explicaţie în
română; lipsa unei metode din `thinqconnect` e semnalată ca bridge indisponibil,
iar deconectarea spune că nu s-a trimis nimic.

Aici a ieşit la iveală un bug pe care testele nu-l puteau vedea: bridge-ul
produce **două** formate de eroare — unul venit de la LG, `"(LG 2302)"`, şi unul
din pre-validarea locală, `"(LG rejects with 2304 while it is off)"`. Regexul
cerea cifrele imediat după „LG" şi îl rata pe al doilea, deci mesajul ar fi
apărut netradus. L-am prins printr-un **apel real pe bridge**, nu din teste,
pentru că testele foloseau formatul presupus. Testele au fost rescrise pe
şirurile copiate din sursa bridge-ului, iar potrivirea acoperă acum ambele
formate fără să extragă un cod fals din `device_id`-ul hexazecimal.

Teste: 229 logică (+46 pe cronometre) + 44 stil.

## 1.5.4

Butoanele +/- ale cronometrelor LG porneau corect din starea „nesetat", cu
valoare optimistă până la confirmarea HA. Adăugat `ha/numberStep.js`.
*(Intrare completată retroactiv în 1.5.5 — commitul `4a8248e` a rămas
nepublicat până atunci.)*

## 1.5.3

Semantica „nesetat" pentru cronometrele LG când ThinQ raportează `unknown`:
un timer inexistent nu se mai afişează ca zero. **Versiunea live până la 1.5.5.**
*(Intrare completată retroactiv.)*

## 1.5.2

Reparat textul tăiat pe cardurile Piscinei la 320px şi accesibilitatea
modalului. *(Intrare completată retroactiv.)*

## 1.5.1

Reparaţie de accesibilitate şi de unealtă, plus două defecte reale pe pagina
„Zone" pe care abia auditul reparat le-a putut vedea.

**Fiecare tab de navigaţie poartă acum `aria-label` cu numele complet al
paginii**, indiferent dacă eticheta vizuală e afişată, plus `role="tab"`,
`data-page`, `aria-selected` şi acces de la tastatură (Enter/Space).
Ascunderea etichetelor în 1.5.0 lăsase opt taburi din nouă **nenumite pentru un
cititor de ecran** — o regresie de accesibilitate pe care n-a văzut-o nimeni,
fiindcă arăta bine.

**Auditul responsive nu mai navighează după textul vizibil.** Selecta taburile
cu `getByText(label, { exact: true })`, iar în 1.5.0 textul dispăruse de pe
taburile inactive: opt pagini din nouă au picat la navigare şi au fost raportate
ca 26 de „probleme", deşi în realitate erau **nemăsurate**. Un caz a fost şi mai
neplăcut: pentru „Piscină" exista pe Acasă un alt element cu exact acelaşi text,
deci clickul a nimerit un element greşit şi eşecul a apărut abia la verificarea
de final, cu alt mesaj. Selecţia se face acum pe `[data-page]`, iar confirmarea
că pagina s-a schimbat pe `aria-selected` — nu pe subtitlul din hero.

**Lista de pagini a auditului nu mai e hardcodată.** Era o copie manuală a lui
`NAV`, iar pagina „Zone", adăugată în 1.5.0, nu fusese măsurată niciodată:
raportul spunea 80 de combinaţii şi părea complet. Acum lista se citeşte din
bara randată de aplicaţie (`[role="tab"][data-page]`), deci orice pagină nouă
intră automat în matrice. Dacă bara nu expune atributele, auditul **se opreşte**
în loc să raporteze un subset drept întreg. Raportul scrie explicit numele
paginilor, totalul de combinaţii şi **câte au fost măsurate efectiv** — dacă
cele două numere nu coincid, „0 probleme" nu mai poate fi confundat cu „curat".

Cele două defecte găsite astfel, ambele pe pagina „Zone" şi ambele reale:
numărătorul de zone de lângă numele etajului avea **contrast 3,81:1** la 13px,
sub pragul WCAG de 4,5:1, în 16 combinaţii; iar numele lungi de zone
(„Camera Tehnica Piscina", „Dormitor Sofia Parter") erau **tăiate cu ellipsis**
pe ecrane înguste, pierzând până la 60px — exact informaţia pentru care există
cardul. Primul: TXT2 în loc de TXT3. Al doilea: numele se înfăşoară pe mai multe
rânduri, cu iconiţa aliniată la prima linie.

Matricea trece de la 80 la **90 de combinaţii** (9 pagini × 8 lăţimi + 2 ramuri
de tabletă × 9 pagini), toate măsurate, zero probleme.

Teste: 170 logică (+6 pe contractul de navigaţie: fiecare pagină din `NAV` are
antet în `PAGE_HERO` şi invers, chei unice, subtitluri unice) + 44 stil.

## 1.5.0

Pagină nouă, **„Zone"** — a noua axă de navigare: pe încăperi, nu pe funcţie.
Un card per zonă, grupate pe etaje în ordinea `level`; la atingere se deschide
tot ce e în zona aceea, grupat pe climat, media, lumini, comutatoare, camere şi
senzori.

**Nu are sloturi în catalog.** Structura vine integral din registrele HA, citite
la execuţie peste WebSocket-ul deja deschis: `config/floor_registry/list`,
`config/area_registry/list`, `config/device_registry/list`,
`config/entity_registry/list`. Consecinţa care justifică alegerea: mut un
dispozitiv în altă zonă din Home Assistant şi pagina se actualizează singură,
fără release. O mapare manuală ar fi însemnat 14 sloturi noi şi un release la
fiecare mutare — sloturi care s-ar fi învechit tăcut. Cele patru liste se cer o
singură dată, la prima intrare pe pagină (tabletele pornesc pe Acasă, deci nu
plătesc costul), şi se reîmprospătează la evenimentele de registru, cu 1,5s de
amânare, fiindcă o singură mutare în interfaţa HA emite mai multe evenimente.

Două subtilităţi, ambele cu test dedicat. **`area_id` setat direct pe entitate
bate zona dispozitivului** — aşa funcţionează şi HA, iar o entitate mutată
manual trebuie să apară unde ai pus-o, nu unde stă restul dispozitivului. Şi
**cele 60 de dispozitive fără zonă nu apar nicăieri**: sunt infrastructura
ţinută deliberat neatribuită (decizie din `04_`), deja acoperită integral pe
Reţea şi Mentenanţă. Nu li se inventează o zonă şi nu sunt arătate ca lipsă —
o secţiune „fără zonă" ar fi arătat ca o listă de neterminat şi ar fi tentat pe
cineva s-o „repare", anulând decizia. Omisiunea e spusă în subtitlul paginii.

**Bara de navigaţie: eticheta apare doar pe tabul activ.** Cu a noua pagină
conţinutul barei ar fi ajuns la 1205px, iar pe tableta montată (1180px) se
vedeau 7 taburi din 9, cu derulare — pe un ecran fix la care ajungi cu un deget
în trecere, asta e o degradare reală. Fără etichete, conţinutul scade la 603px,
deci **încap toate nouă fără derulare**. Măsurat, nu presupus: la 360px 1 tab
întreg devin 2, la 414px 2 devin 3, iar la 1180px 7-din-9-cu-derulare devin
9-din-9. `navItemStyle` şi `navLabel` sunt în `tokens.js` şi **nu s-au atins**:
suprascrierea se adaugă la locul apelului, unde `s()` e last-wins.

**Iconurile de navigaţie, refăcute** — în modul de mai sus silueta e singurul
indiciu, deci fiecare pagină primeşte un obiect concret: Climat trece de la
triunghiul de avertizare (`TriangleAlert`, care pe o pagină de climatizare citea
„ceva e stricat") la `AirVent`; Media de la o glifă desenată manual, un „cast"
cu arce care se certa vizual cu Wifi, la `Tv`; Camere de la `ShieldCheck`
(„securitate", nu „camere") la `Cctv`; Energie de la `BarChart3` la `bolt`,
singura abstracţie rămasă într-o bară de obiecte. `alertTri` **rămâne** în hartă
neschimbat — e folosit în alte 12 locuri (starea meteo `exceptional`, modul Auto
din acordeoane); s-a schimbat doar ce cere bara. Piscina (`waves`) şi Energia
(`bolt`) sunt vecine: verificat la 19px că nu se confundă — bandă orizontală
dungată vs formă diagonală compactă, axe perpendiculare.

Verificat pe DOM real, la 1180px şi 360px: 9 taburi cu o singură etichetă, cele
6 etaje în ordinea corectă, 14 carduri de zonă, entitatea mutată manual apare în
zona ei nouă şi nu în cea a dispozitivului, gateway-ul fără zonă nu apare
nicăieri, deschiderea şi închiderea unei zone funcţionează, zero cardGap.

Teste: 164 logică (+11 pe registre) + 44 stil.

## 1.4.2

Cardul „Automatizări" de pe Mentenanţă rămânea cu **53px goi la bază**. Auditul
responsive pe v1.4.1 l-a semnalat în 6 combinaţii, toate de la 760px în sus;
sub 760px pagina e pe o coloană, deci nu avea de unde să apară.

**Cauza nu a fost curăţenia de sloturi din 1.4.1.** Ipoteza firească — că
scoaterea rândurilor Fusion şi Get HACS a scurtat un card şi a lăsat un gol —
a fost verificată A/B, cu acelaşi build şi acelaşi mock, pe 1.4.0 şi pe 1.4.1:
golul de 53px e **identic pe amândouă**. Cardul scurtat („Add-on-uri") are 13px
goi în ambele versiuni, pentru că blocul lui `monitor` creşte şi îşi absoarbe
singur surplusul. Cele două carduri nici măcar nu sunt pe acelaşi rând.

Cauza reală vine din regula introdusă în 1.3.5: surplusul se distribuie doar în
blocurile cu rânduri (`monitor`, `expand`), iar grilele au fost excluse pentru
că o grilă de dale întinsă arată ca un bloc gol. Raţionamentul e corect pentru
grilele cu 2-3 coloane, dar cardul „Automatizări" e un `grid` cu **o singură
coloană** — adică o listă de trei rânduri, vizual identică cu un tabel. Nu avea
ce să crească, iar vecinul lui de rând, „Actualizări sistem", are cinci rânduri
faţă de trei.

Excepţia e ţintită: creşte doar grila cu o coloană — singura din aplicaţie —
prin `flex:1 1 auto` şi `align-content: stretch`, care împarte surplusul EGAL
între cele trei rânduri. Dala are deja `flex:1 1 auto` şi conţinutul centrat în
`tokens.js`, deci se înalţă exact ca un rând de `monitor`. Grilele cu 2-3
coloane rămân excluse.

`align-items: stretch` pe grile **nu s-a atins**: înălţimile rândurilor sunt
identice înainte şi după (222 / 292 / 432 / 257 / 134px). Faza A rămâne
documentată ca greşită în 1.3.5 şi nu se reintroduce.

Măsurat pe DOM real, la 1180px şi 760px: „Automatizări" 53px → **15px**, în
linie cu restul cardurilor (13px). Niciun alt card nu s-a mişcat.

Teste: 153 logică + 44 stil.

## 1.4.1

Curăţenie: sloturile **`addon.fusion`** şi **`addon.get_hacs`** au fost scoase
din catalog, din maparea implicită şi din pagina „Mentenanţă", pentru că
add-on-urile din spatele lor au fost dezinstalate din Home Assistant.

Fusion era un experiment abandonat, iar „Get HACS" e un instalator care şi-a
făcut treaba o dată, în 2024 — HACS rulează de atunci pe cont propriu şi
rămâne neatins (slotul `upd.hacs`, care urmăreşte actualizările HACS, e
nemodificat). Sloturile au ieşit odată cu add-on-urile ca să nu rămână în
selectorul de mapare două locuri care nu se mai pot lega de nimic; un slot
gol nu e o rezervă, e o eroare viitoare.

Catalogul scade de la 293 la **291 de sloturi**, toate mapate. Rândurile
rămase în blocul „Stare add-on-uri" sunt Home Dashboard şi Matter Server.

Fără nicio schimbare vizuală şi fără modificări de comportament în restul
aplicaţiei.

Teste: 153 logică + 44 stil.

## 1.4.0

Graficul din cardul „Temperatură piscină", refăcut complet: **curbă netedă cu
arie umplută** şi gradient care se estompează spre bază, pe **date orare**, cu
indicator la hover şi la atingere. Dot-plot-ul cu tije (o valoare pe zi) şi
rândul de etichete zilnice au dispărut — momentul se citeşte acum din antet,
la poziţia indicatorului.

**Sursa de date: statistici ORARE, nu istoric brut.** Senzorul are
`state_class: measurement`, deci HA îi calculează singur media pe oră; 7 zile
înseamnă cel mult 168 de puncte — mărginit, precis şi rezistent la epurarea
recorder-ului (istoricul brut ar fi fost nemărginit şi s-ar fi pierdut după 10
zile). Fereastra e ancorată la ORA curentă, nu la ceasul care bate în fiecare
secundă, altfel interogarea s-ar reface continuu. Orele fără statistici de la
capete se taie: senzorul-oglindă a fost creat pe 20.08, deci acum există ~96 de
ore, iar curba se întinde pe toată lăţimea şi subtitlul spune sincer „în 4
zile" — în loc să înghesuie graficul în dreapta şi să pretindă 7 zile.
Subtitlul devine „în 7 zile" de la sine, pe măsură ce se adună statistici.

**Interpolare monotonă** (Fritsch–Carlson, `design/curve.js`, modul pur): între
două ore măsurate curba nu poate depăşi valorile lor. O netezire obişnuită ar fi
desenat, între 31 °C şi 33 °C, un vârf la 33,4 °C — un maxim care nu s-a
măsurat niciodată. Golurile din statistici rup curba în tronsoane, ca să nu
apară o linie dreaptă peste ore fără date.

**Interacţiune.** Cu mouse-ul: indicator la hover, dispare la ieşire. Cu
degetul (tabletă montată, `pointer: coarse`): atingerea şi glisarea mută
indicatorul, iar `touch-action: pan-y` lasă pagina să deruleze pe verticală, dar
ne dă glisarea pe orizontală. După ridicarea degetului valoarea rămâne
citibilă 2,5 secunde — altfel ar dispărea exact în clipa în care îţi iei
degetul de pe ecran ca s-o citeşti; dacă browserul preia gestul pentru derulare
(`pointercancel`), indicatorul dispare imediat. Cu indicatorul activ, antetul
arată valoarea DIN ACEL PUNCT şi momentul ei („31,7°" · „Sâmbătă 11:00"); fără
indicator, valoarea curentă, ca înainte.

Cardul rămâne la înălţimea fixă de 230px; aria iese în marginile lui (margin
negativ + `overflow:hidden`), ca în referinţă. Paleta şi fonturile sunt cele
existente. Fără date: aceeaşi stare goală onestă.

Teste: 153 logică (+16 pe `curve.js`, între care verificarea că nicio porţiune
de curbă nu depăşeşte valorile măsurate) + 44 stil. Verificat pe DOM real:
formă (1 curbă, 1 arie, 0 tije), hover, ieşirea cursorului, `pointer: coarse`,
glisare, persistenţa de 2,5s şi anularea la derulare.

## 1.3.6

Coloana stângă de pe Acasă, reorganizată: **ceas → ziua şi data → vreme →
temperatură piscină → control climat → cadranele mici**.

Card nou „ziua şi data", cu acelaşi tratament vizual ca ceasul: aceeaşi
înălţime (88px, fixă prin construcţie — 44px caseta iconului + padding +
bordură, `box-sizing` fiind border-box global), aceeaşi casetă de icon
(calendar) şi cifrele în DOTO, ca la ceas. Ziua lunii e valoarea mare, cu
numele zilei şi luna/anul alături. Din cardul „Ora" a dispărut linia cu ziua
şi data — rămâne doar ceasul.

Cardul „Temperatură piscină" a fost mutat între „Vreme" şi „Control climat" şi
are acum înălţime FIXĂ, egală cu a cardului Vreme (230px — măsurat identic la
1440/900/390). Nu mai creşte niciodată, deci nu mai e „absorbantul" coloanei.
Graficul se încadrează în spaţiul rămas: `poolChart` primeşte un PLAFON de
înălţime (nu o înălţime impusă), aşa că se reduce cât e nevoie dar nu depăşeşte
118px; cardul are `overflow:hidden` ca garanţie suplimentară. La 230px iese
114px de grafic, fără tăiere.

Efectul mutării, verificat: coloana stângă devine cea care DEFINEŞTE înălţimea
rândului (conţinutul ei o depăşeşte pe cea dreaptă la toate cele trei lăţimi),
deci niciun card din ea nu mai e întins şi sub ultimul card rămân 0px goi.
Detectorul cardGap rămâne tăcut: 237 măsurători de card pe 8 pagini × 3 lăţimi,
zero carduri cu gol la bază peste 48px şi zero rânduri cu înălţimi inegale.

## 1.3.5

Revenire la `align-items: stretch` peste tot (grila de dispozitive, grila de
carduri a paginilor, rândul de coloane de pe Acasă) — toate cardurile dintr-un
rând au din nou aceeaşi înălţime. Diferenţa faţă de v1.3.3: surplusul nu se mai
adună la baza cardului, ci se distribuie ÎNĂUNTRU, după modelul cardului
„Control climat".

Carduri de dispozitiv: cardul devine container flex vertical — antetul stă sus
(fix), zona cadranului creşte şi îşi centrează conţinutul (`flex:1 1 auto`;
varianta fără cadran păstrează silueta de 132px prin `min-height`), iar
„Setări avansate" rămâne lipit de bază. Carduri de pagină: spaţiul liber se
împarte între TOATE secţiunile cu rânduri (monitor/expand), proporţional, deci
densitatea rândurilor rămâne uniformă în tot cardul; blocurile fără rânduri
(notă, grafic, grilă) nu cresc. Cardul piscinei absoarbe surplusul coloanei,
dar graficul NU se întinde — stă la 118px, centrat vertical.

Două variante încercate şi respinse pe parcurs, consemnate în cod ca să nu se
reintroducă: `space-between` pe cardul de pagină (lasă un gol mare chiar sub
titlu) şi creşterea doar a ultimului bloc (rânduri de 87px lângă rânduri de
26px în acelaşi card).

Verificat pe DOM-ul real, 8 pagini × 3 lăţimi (1440/900/390): 234 măsurători de
card, 42 de rânduri cu cel puţin două carduri — zero carduri cu gol la bază
peste 48px şi zero rânduri cu înălţimi inegale. Detectorul cardGap din audit
rămâne valid şi tăcut.

## 1.3.4

Cardurile nu se mai întind ca să egalizeze rândul (Faza A). Erau trei
mecanisme de întindere: grila de dispozitive (stretch implicit), grila de
carduri a paginilor (`alignItems: stretch`) și rândul celor două coloane
de pe Acasă (`align-items: stretch`). Un card scurt lângă unul înalt
căpăta zeci sau sute de px goi sub ultimul element ("Pompă filtrare",
"TV Dormitor Etaj"), iar cardul piscinei — "grower"-ul coloanei — întindea
graficul prin FitPoolChart, deformându-l. Acum: `align-items: start` pe
ambele grile, `flex-start` pe rândul de coloane, cardul piscinei la
înălțime naturală, iar FitPoolChart eliminat (poolChart revine la 118px
ficși, parametrul `hPx` scos). Compromis acceptat deliberat: rândurile nu
mai sunt aliniate jos — golul dintre rânduri arată ca separare, cel din
card arăta ca element lipsă. Masonry în JS (Faza B) a fost respins:
motor de layout cu re-măsurare la resize și la fiecare valoare live, pe
tabletă montată sub Fully Kiosk.

Detector nou în auditul responsive: "spațiu gol excesiv la baza cardului"
(MEDIU, prag 48px). Măsoară
`golBază = card.bottom − celMaiDeJosCopil.bottom − padding-bottom`
pe containerele marcate `data-card` (marcaj nou — stilurile fiind inline,
detectorul n-avea altfel cum să recunoască un card). Criteriul e CUTIA în
flux, nu conținutul: un spacer gol cu înălțime explicită (locul rezervat
graficului când nu sunt date în recorder) rezervă spațiul deliberat și nu
se semnalează. Cardurile cu `justify-content: space-between`
("Control climat") își împing ultimul copil la bază, deci ies natural cu
golBază ≈ 0 — fără nicio excepție specială. Verificat pe DOM-ul real, ca
experiment controlat: pagina cu Faza A dă 0 semnalări; cu `stretch`
reintrodus la runtime dă 4 (458px, 458px, 126px, 82px); "Control climat"
rămâne la 1px în toate trecerile.

TV în standby: cadranul de volum se desena plin, cu "—" în centru și cu
−/+ aparent active. Acum tot blocul e estompat (0.55 — aceeași convenție
ca la cadranul static Hisense), iar butoanele rămân la opacitate 1 în
interiorul lui, ca să nu se compună (0,55 × 0,45 ≈ 0,25 = ilizibil).

## 1.3.3

TV Dormitor Etaj (Hisense 65E7QE) remapat de pe HomeKit pe integrarea
Vidaa (MQTT, HACS warrenrees/ha_vidaatv), imperecheata prin PIN +
certificate mTLS. Noul media_player expune supported_features 24461
(VOLUME_SET + VOLUME_MUTE + SELECT_SOURCE) fata de 18817 pe HomeKit, deci
cardul revine automat la cadran de volum ACTIV si sectiunea de volum
reapare in modal (gatingul citeste supported_features, cod nemodificat).
Volum 0-100 verificat stabil dupa trecerea pe auth static (dinamicul
oscila pe MAC-ul gresit). Mute ramane pe switch-ul HomeKit dedicat pana
se confirma in timp fiabilitatea mute-ului Vidaa. HomeKit ramane instalat
ca plasa de siguranta pentru on/off.

## 1.3.2

Modalul respectă acum aceleaşi reguli de feature-gating ca şi cardul.
`resolveAction` distinge nesuportatul STRUCTURAL (integrarea nu expune
funcţia deloc: bit `supported_features` lipsă, mod/sursă absente din
listele entităţii) de cel TRANZITORIU (TV în standby, entitate
indisponibilă). Modalul ELIMINĂ structuralele — pe Hisense dispar
TV/YouTube/Netflix (HomeKit nu le expune) — păstrează tranzitoriile
dezactivate cu motivul în tooltip, iar eticheta VERIFY rămâne doar
pentru sloturi nemapate. Secţiunile goale dispar („Opţiuni” la toate
cele 8 TV-uri, ambele la pompa de filtrare). Volumul fără VOLUME_SET
(Hisense) devine bloc static cu sursa curentă — fără −/+ şi fără
„pas 1 · interval 0–100” care promiteau un control inexistent.
Lista de surse se verifică înaintea standby-ului (nevidă), ca butonul
inexistent să nu reapară cu TV-ul stins.

Acasă: graficul „Temperatură piscină” umple cardul — cardul se
întinde deliberat (egalizează coloana), dar graficul avea 118px ficşi
ţintuiţi la bază, cu gol mare sub titlu; FitPoolChart măsoară spaţiul
alocat şi redă graficul la înălţimea reală.

Teste: 137 logică (+4 pe structural/tranzitoriu) + 44 stil.

## 1.3.1

Separatorul zecimal devine VIRGULA pe toată aplicaţia — interfaţa e
integral în română, deci „9,2 kW”, „25,0 °C”, „3,336 V”, „57,1 MWh”.
Implementat prin `dec()` în design/format.js (aplicat în toate funcţiile
canonice) + măturarea ultimelor situri de afişare din afara modulului:
euristica de rezervă din E.fmt, celulele diff/maxOf/stats/dial/setpoint,
legendele şi tooltip-urile graficelor, axele (doar etichetele —
coordonatele SVG rămân cu punct), deltele (▲ 9,8%), temperaturile şi
factorul de putere din instrument, dezechilibrul de celule, media casei
şi apa piscinei de pe Acasă. Componenta Roll (cifrele animate din erou)
parsează şi redă acum virgula — altfel animaţia murea mut pe noul
format. Teste: 133 logică + 44 stil.

## 1.3.0

Formatare canonică a unităţilor pe toată aplicaţia — un singur modul
(`design/format.js`), fără logică duplicată. Înainte coexistau PATRU
formattere de putere (rândurile de tabel nu converteau niciodată W→kW:
„12300 W”; barele afişau „25.0 kW”; eroul „9.20 kW”; badge-urile
„12.3 kW”), iar energia apărea ca „9034.4 Wh” pe Acasă şi „57117 kWh”
la Energie.

Reguli: putere <1000 W în W întregi, 1–10 kW cu 1 zecimală, ≥10 kW
întregi, apoi MW la fel (var/VA pe aceeaşi scară: kvar/kVA/Mvar/MVA);
energie <1 kWh în Wh, 1–10 kWh cu 1 zecimală, 10–999 kWh întregi,
peste — MWh cu 1 zecimală mereu (contoarele cumulative rămân
comparabile); °C cu 1 zecimală peste tot; V ≥100 întregi / <10 cu 3
zecimale (celule); A cu 1 zecimală; Hz cu 2; procente şi durate întregi.
Pragurile se aplică după rotunjire (9999 W → „10 kW”, nu „10.0 kW”).

`E.fmt` auto-formatează după familia unităţii (câştigă în faţa
zecimalelor per-rând); familiile necunoscute (pH, texte) cad pe euristica
veche. Toate căile trec prin modul: rând-erou, strip, badge-uri, tabele,
carduri, inelul de pe Acasă (Wh→kWh), semnăturile SVG (arcul zilei,
spectrul stringurilor, pachetul APX, Sankey), Contor racord. Separatorul
zecimal rămâne punctul. Teste: 131 logică (+28) + 44 stil.

## 1.2.9

Oglinzi-template pentru contorul de racord (create în HA, tiparul
oglinzilor Growatt): `contor_import_total` / `contor_export_total`
(kWh, energy, total_increasing) şi `contor_faza_1/2/3_putere` (W, power,
measurement) — registrele brute GPG0A450ZS nu au `state_class`, deci HA
nu le agrega. Sloturi noi `energie.stat_ctr_*` (288 → 293).

Pe categoria Reţea a instrumentului, graficul de Săpt/Lună/An devine
comparaţia „Import / export · invertor vs contor”: două linii de net
(export − import) — invertorul face saldo vectorial, contorul contorizează
per fază, iar diferenţa dintre linii e chiar mărimea schimbului
între faze. Seria contorului apare singură pe măsură ce se strâng
statisticile (fără valori inventate până atunci).

Cardul Contor racord primeşte graficul „Faze · medie zilnică” (7 zile,
L1/L2/L3) pe oglinzi. Teste: 103 logică + 44 stil.

## 1.2.8

Contorul inteligent de la racord (GPG0A450ZS) intră în dashboard: card nou
„Contor racord” pe pagina Energie — bare pe faze, net semnat la racord
(celulă nouă `sdir` pe un singur registru: pozitiv = import, negativ =
export), totaluri import/export, detaliu per fază (V/A/W/VA/var/PF) şi
diagnostic. 27 de sloturi `ctr.*`, exclusiv registrele validate de auditul
de coerenţă din 2026-08-23 (Σ faze ≈ total ±2%, PF=P/S ±1%, cross-check
cu invertorul ±1.5%, delta-check pe contoare); `pos_act_power`,
`rev_act_power` (dubluri bit-cu-bit ale netului) şi `power_factor` total
(nu se închide pe P/S) sunt respinse, cu test dedicat. Contorizarea e PER
FAZĂ — documentată în note şi tooltip-uri.

Găuri de mapare închise (auditul HA): firmware Switch Foişor/Etaj (randuri
noi pe Reţea + Actualizări reţea), starea EAP-urilor (monitor „EAP ·
Stare”), comutatorul „Limitare putere” al Vortexului (fără el, number-ul
pwrlimit nu se aplica). `ph_sp` nu se mapează: ţinta pH e deja acoperită
de template-ul cu scală corectată (`ph_sp/10`).

253 → 288 sloturi mapate; teste: 102 logică + 44 stil.

## 1.2.7

Imaginea de antet înlocuită (vilă aeriană nocturnă, 1579×996 webp).
Comportamentul rămâne cel din v1.1.6: fundal cu titlu suprapus pe desktop
(capul coloanei drepte), primul element al paginii pe mobil/tabletă,
gradient spre jos pentru titlu şi chips. Încadrare verificată pe
360/760/1440 cu capturi: pe telefon fâşia de 150px prindea acoperişul
întunecat din treimea de sus, aşa că `object-position` e `center 62%` pe
mobil (banda cu terasele luminate); tableta şi desktopul rămân `center`.


## 1.2.6

Cardul TV Hisense (Dormitor Etaj) păstrează silueta grilei Media: în locul
zonei goale (icon + „Pornit"), un cadran static identic ca dimensiune —
inel estompat 0.55, sursa curentă (sau Standby) în centru, spacer-e de
lăţimea butoanelor −/+ pentru aliniere cu celelalte 7 carduri. Nu e
clickabil (Hisense/HomeKit nu expune VOLUME_SET); tooltip-ul explică.
Mute prin switch-ul dedicat şi butoanele de sursă rămân funcţionale.


## 1.2.5

Suprapunerea din diagrama verticală, închisă de-adevăratelea. Cauza pe
care mutările de badge n-o puteau ocoli: subtitlul „autoconsum NN %" al
nodului Casă întindea bbox-ul grupului până la x≈256, lăsând un culoar de
38px — mai îngust decât orice badge. Pe vertical, nodul Casă nu mai are
subtitlu (informaţia e dublată de celula „Autoconsum" din strip, imediat
sub diagramă); pe orizontal rămâne. Verificat cu valori late REALE pe
ecran (12.3/11.3/9.99 kW — dovada de randare face parte din verificare,
după ce verificarea anterioară măsurase badge-uri goale „—"): zero
suprapuneri ≥25%.


## 1.2.4

Ultima problemă din auditul complet (1 CRITIC, restul zero): badge-ul de
consum din diagrama verticală intersecta bounding-box-ul nodului Casă —
întins spre stânga de subtitlul „autoconsum NN %". Badge-ul revine
deasupra traseului, ancorat START la x=218 (imediat după bbox-ul
Invertorului, creşte spre dreapta doar cât are text). Verificat cu
valorile cele mai late posibile (12.30 kW): zero suprapuneri ≥25%.


## 1.2.3

Batch-ul post-audit v1.2.2 (rulat pe build proaspăt de acum înainte).

1. **CRITIC** — badge-ul de consum din diagrama verticală trece SUB traseu
   (axa corectă): la y=150 nu există loc orizontal între halo-urile
   Invertorului şi Casei; mutările orizontale doar plimbau suprapunerea.
2. **hdTapY −8 → −10** — pill-urile de 25px (minis) ajung la 45px zonă
   efectivă (rămăseseră la 41).
3. **Etichetele de tile/chip se rup pe 2 linii** (LABEL_WRAP2, append peste
   labelFor la punctul de folosire — tokens.js neatins): „Regim boost",
   „Ştergător Speed Dome", „Clorinator", chips-urile din acordeoane,
   etichetele de timeline; `hyphens:auto` desparte cuvintele unice lungi.
   Nicio etichetă scurtată la sursă.
4. **Audit**: build NECONDIŢIONAT la fiecare rulare + versiunea şi hash-ul
   bundle-ului în antetul raportului (de două ori într-o zi s-a raportat pe
   date greşite); line-clamp recunoscut ca trunchiere intenţionată; 30px
   acceptat pe pointer:fine la ≥760px (decizia v1.2.2) — pragul 44 rămâne
   pe lăţimile de telefon şi pe ramura touch. Testele de istoric ancorate
   la amiază (flake la rulările dintre 23:00 şi 00:00).


## 1.2.2

**Ţintele tactile urmează tipul de input, nu lăţimea ecranului.**
Dashboard-ul rulează pe tablete montate pe perete, atinse cu degetul de la
1-2m — o tabletă de 10" poate raporta 1180px şi tot cu degetul e atinsă.
`useBreakpoint` expune acum câmpul `coarse` (`matchMedia('(pointer: coarse)')`,
deliberat NU `any-pointer` — ţintim exact tableta; desktopul cu mouse rămâne
pe dimensiunile fine), recalculat împreună cu breakpoint-urile. Ambele situri
cu tiparul `mob ? 44 : 30` folosesc acum `mob || coarse`: butoanele −/+ ale
setpoint-urilor din acordeoane şi butoanele rotunde ale cadranelor
(DeviceCard + modal). Inventar complet: doar aceste două — restul
potrivirilor „44" erau lăţimi de sparkline şi fonturi.


## 1.2.1

Batch-ul de fix-uri din auditul v1.2.0, în ordinea severităţii.

1. **CRITIC responsive** — Media @360px: rândul din „Redare curentă" îşi
   împingea badge-ul de stare 3px în afara viewportului; pe mobil rândul
   se rupe acum (flex-wrap) cu spaţieri reduse.
2. **CRITIC diagramă** — layoutul vertical: nodul Invertor păstrează doar
   subtitlul („X % din YY kW"), urcat la poziţia etichetei (nu se mai
   suprapune cu badge-ul reţelei); badge-ul de consum mutat în afara
   halo-ului nodului Casă. Layoutul orizontal neatins.
3. **MEDIU** — ultimele 13 ţinte tactile (siturile ratate de v1.1.8):
   minis-urile DeviceCard şi pill-ul „Control climat" (hdTapY), −/+ din
   sliderRow şi butoanele de transport media (hdTap), min-width:44px pe
   segmentele de perioadă din Energie.

## 1.2.0

1. **Cardul „Scurtături · Dispozitive urmărite" ELIMINAT** de pe toate
   subpaginile, împreună cu codul asociat (quickRows, buildQuickRow).
   Sistemul „tracked" + ecranul Gestionează rămân — alimentează secţiunea
   şi inelul „Dispozitive" de pe Acasă.
2. **Titlurile nu se mai taie după ~10 caractere pe mobil**: numele
   rândurilor de acordeon (bug-ul „Pompă filt…"/„Pompa C…" de pe Piscină la
   390px), numele cardurilor de dispozitiv, numele din „Control rapid",
   titlurile cardurilor de pagină şi titlul modalului se rup acum pe maxim
   2 linii (-webkit-line-clamp), cu elipsă abia la capătul liniei a doua.
   Rândurile au align-items:center, deci toggle-ul şi butonul de setări
   rămân centrate vertical. Valorile şi metadatele rămân pe o linie.
3. **Butonul „Setări" al acordeoanelor devine doar chevron pe mobil** —
   textul nu adăuga informaţie şi elibera ~50px pentru titlu.
4. Auditul detectează de acum **ellipsis orizontal activ**
   (text-overflow:ellipsis + scrollWidth > clientWidth) ca problemă MEDIE —
   regresiile de tip „Pompă filt…" se prind automat.

## 1.1.9

Bug confirmat investigând banda offline din audit: `lastCallError` („Comanda
nu a ajuns la HA") se curăţa DOAR la o comandă ulterioară reuşită sau la
închiderea manuală — o eroare tranzitorie de reţea lăsa banda pe ecran la
nesfârşit. Acum expiră singură după 12 secunde şi se şterge la revenirea
conexiunii (evenimentul 'ready'). Butonul de închidere manuală rămâne.

Notă: banda văzută în audit NU era aceasta, ci varianta „Deconectat" —
aplicaţia din browserul de audit nu s-a putut conecta deloc la HA (TCP
refuzat pe 192.168.0.100:8123 de pe PC, cauză externă aplicaţiei).

## 1.1.8

Toate problemele CRITICE şi MEDII din auditul responsive (134 distincte,
652 apariţii pe 8 pagini × 8 lăţimi).

1. **CRITIC — suprapunere în diagrama de flux** (telefon): eticheta
   „Soare / 3 stringuri" stătea peste badge-ul de putere PV pe layoutul
   vertical — mutată în stânga nodului (aranjamentul v1.1.4).
2. **MEDIU — 133 de ţinte tactile sub 44×44px**, toate interactive reale:
   - clase globale `hdTap` (+7px pe toate laturile) şi `hdTapY` (+8px doar
     vertical) — pseudo-elemente `::after` care extind zona de atingere FĂRĂ
     nicio schimbare vizuală; varianta doar-verticală acolo unde vecinii sunt
     lipiţi orizontal (pill-uri, chips-uri, segmente de perioadă);
   - hdTapY: toggle-urile pill (46×25, 69×36) din Scurtături / carduri /
     acordeoane / modal, chips-urile de zonă Media (72×31), segmentele
     Oră–An din Energie (55×29);
   - hdTap: săgeţile caruselului AC (30×30), butoanele −/+ ale cadranelor pe
     desktop (30×30), IR + ştergător pe camere (34×34);
   - min-height 44 direct: „Detalii (N)" (Energie), „Setări avansate"
     (acordeoane), „Gestionează" (Acasă), butoanele din banda offline
     („Reîncearcă" / „Schimbă datele", 83×21 → ≥44).
   Tokens.js nu a fost atins — testul de fidelitate a stilului compară cu
   designul original şi rămâne verde.
3. Auditul măsoară de acum zona efectivă de atingere (elementul + expansiunea
   `::after`), nu doar dreptunghiul elementului.

## 1.1.7

Bug real găsit de auditul Playwright: banda „Deconectat / Se reconectează"
(OfflineBanner) era `position:fixed` peste bara de navigaţie — cât timp era
vizibilă (reconectare, call-error neînchis), taburile de sub ea nu primeau
niciun click. Masca de fade din v1.1.6 a fost exonerată: e `mask-image` pe
containerul de scroll, afectează doar pixelii, nu hit-testing-ul — nu există
niciun element de fade suprapus.

- OfflineBanner: `fixed` → `sticky` — împinge conţinutul în jos în loc să-l
  acopere; butoanele ei rămân active, taburile rămân apăsabile.
- Auditul e acum rezistent la eşecuri: click normal → fallback click
  programatic (aplicaţia nu are rute URL) → verificare pe subtitlul paginii;
  interceptările clickului normal se raportează ca problemă CRITICĂ separată,
  combinaţiile nenavigabile se marchează în raport şi rularea continuă.

## 1.1.6

Fix-uri pentru mobil (360–414px), verificate după refactorizarea v1.1.5.

1. **Navigaţia principală (8 pagini)**: scrollul orizontal cu scrollbar ascuns
   şi fade la dreapta existau deja din v1.1.2, iar iconurile din dreapta erau
   deja în afara containerului de scroll — rămăseseră de făcut: fade-ul e acum
   dinamic (apare doar pe marginea unde mai există taburi), scroll-snap pe
   elemente, ţinte tactile ≥44px (butoane 40→44px, taburi min-height 44px).
2. **Avatarul "B" ELIMINAT** — un singur utilizator, autentificare prin token,
   butonul nu comuta nimic.
3. **Clopoţelul ELIMINAT** — nu afişa notificări sau repairs HA; era doar un
   indicator de conexiune (icon + title cu URL-ul), redundant cu banda
   OfflineBanner care semnalează deja deconectarea.
4. **Antetul cu imagine de pe Acasă**: pe ecrane înguste e acum PRIMUL element
   al paginii (stătea în coloana dreaptă, care pe mobil venea după toată
   coloana stângă). Pe telefon: ~150px, gradient întărit spre jos, imagine
   centrată (object-position), fără gradientul lateral de desktop care o tăia
   din stânga. Titlul + cele 3 chips rămân suprapuse.
5. **Graficul săptămânal "Temperatură piscină"**: cauza aspectului "gol" —
   graficul e prin design un dot-plot cu liniuţe orizontale (nu bare), iar
   scala veche forţa un span de minim 3° (min−1.5…max+1.5); cu apa stabilă
   toate liniuţele cădeau la acelaşi nivel. Datele existau (badge-ul e din
   aceeaşi serie). Acum spanul urmăreşte variaţia reală (minim 2°) şi fiecare
   marcaj are o tijă verticală până la bază.

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
