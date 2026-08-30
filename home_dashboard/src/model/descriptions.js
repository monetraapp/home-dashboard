// Dicţionar centralizat de descrieri pentru butoane/controale (v1.1.0).
// Cheia primară e "Context|Etichetă" (contextul = titlul secţiunii sau tipul
// cardului), cu fallback pe etichetă simplă. Textele explică CE face funcţia,
// pe înţelesul omului — nu ce valoare tehnică trimite.

const D = {
  // ------------------------------------------------------------ moduri AC
  'Răcire': 'Răceşte încăperea până la temperatura ţintă.',
  'Încălzire': 'Încălzeşte încăperea până la temperatura ţintă.',
  'Auto': 'Unitatea alege singură între răcire şi încălzire, după temperatura ţintă.',
  'Dezumidificare': 'Scoate umezeala din aer fără să răcească agresiv. Util în zilele umede.',
  'Ventilare': 'Doar ventilatorul, fără răcire sau încălzire — circulă aerul din cameră.',

  // ------------------------------------------------------ viteze ventilator
  'Ventilator|Silenţios': 'Cea mai mică viteză, aproape fără zgomot. Bun pentru somn.',
  'Ventilator|Scăzut': 'Viteză mică — discret, dar mişcă aerul mai mult decât Silenţios.',
  'Ventilator|Mediu': 'Viteză echilibrată între zgomot şi debit de aer.',
  'Ventilator|Ridicat': 'Viteză mare — răceşte/încălzeşte mai repede, se aude mai tare.',
  'Ventilator|Turbo': 'Viteza maximă, pentru atingerea rapidă a temperaturii. Cel mai zgomotos.',
  'Ventilator|Maxim': 'Treapta cea mai mare de ventilator raportată de unitate.',
  'Ventilator|Auto': 'Unitatea ajustează singură viteza ventilatorului după cât e de departe de ţintă.',
  'Ventilator auto': 'Unitatea ajustează singură viteza ventilatorului după cât e de departe de ţintă.',
  'Ventilator mediu': 'Setează ventilatorul pe viteza medie.',
  'Turbo': 'Treapta maximă — unitatea răceşte/încălzeşte cât de repede poate. Mai zgomotoasă, consum mai mare.',

  // -------------------------------------------------------------- baleiaj
  'Baleiaj|Oprit': 'Lamelele stau fixe, aerul merge într-o singură direcţie.',
  'Baleiaj|Pornit': 'Lamelele se mişcă permanent, împrăştiind aerul prin cameră.',
  'Baleiaj|Vertical': 'Lamelele se mişcă sus-jos, distribuind aerul pe verticală.',
  'Baleiaj|Orizontal': 'Lamelele se mişcă stânga-dreapta, acoperind camera pe lăţime.',
  'Baleiaj|Ambele': 'Mişcare pe ambele axe — distribuţia cea mai uniformă a aerului.',
  'Baleiaj': 'Porneşte/opreşte mişcarea lamelelor care împrăştie aerul prin cameră.',

  // --------------------------------------------------------- funcţii Vortex
  'Eco': 'Limitează consumul de energie, acceptând o răcire/încălzire mai lentă.',
  'Noapte': 'Regim de somn: ajustează treptat temperatura şi reduce zgomotul şi luminile.',
  'Health': 'Ionizează aerul pentru a reduce praful şi mirosurile din cameră.',
  'Comfort Wind': 'Orientează fluxul de aer ca să nu bată direct spre persoane.',
  'Anti-mucegai': 'După oprire, usucă interiorul unităţii ca să prevină mucegaiul din condens.',
  'Blocare copii': 'Blochează butoanele fizice ale unităţii şi telecomanda.',
  'Afişaj': 'Aprinde sau stinge afişajul luminos de pe unitatea interioară.',
  'Auto-curăţare': 'Rulează ciclul intern de curăţare şi uscare al unităţii.',
  'Încălzire auxiliară': 'Rezistenţă electrică suplimentară pentru încălzire mai rapidă pe frig sever.',
  'Limitare putere': 'Activează plafonul de putere setat mai jos — unitatea nu îl va depăşi.',
  'Limită putere': 'Plafonul de putere (în %) pe care unitatea nu are voie să-l depăşească.',

  // ------------------------------------------------------------------- LG
  'Economie': 'Modul de economisire al LG-ului: reduce consumul acceptând o abatere mică de la ţintă.',
  'Somn trimis (h)': 'Ultima comandă de sleep timer trimisă prin bridge, în ore. „Nesetat" = nicio comandă recentă; LG nu oferă readback continuu.',
  'Pornire trimisă (min)': 'Ultima comandă de pornire programată trimisă prin bridge, în minute (pas 15). „Nesetat" = nicio comandă recentă.',
  'Oprire trimisă (min)': 'Ultima comandă de oprire programată trimisă prin bridge, în minute (pas 15). „Nesetat" = nicio comandă recentă.',
  'Somn peste': 'Peste câte ore se opreşte singură unitatea (ore întregi — LG respinge minutele).',
  'Pornire peste': 'Peste câte minute porneşte singură unitatea (pas 15; cere AC oprit).',
  'Oprire peste': 'Peste câte minute se opreşte unitatea (pas 15; cere AC pornit).',

  // -------------------------------------------------------------- Fairland
  'Încălzire apă': 'Încălzeşte apa piscinei până la temperatura ţintă.',
  'Răcire apă': 'Răceşte apa piscinei — util vara când apa trece de ţintă.',
  'Mod automat': 'Pompa alege singură între încălzire şi răcire după temperatura ţintă.',
  'Funcţii|Silenţios': 'Reduce turaţia compresorului şi a ventilatorului — mai lent, dar aproape silenţios.',
  'Smart': 'Regimul echilibrat recomandat: adaptează puterea după diferenţa faţă de ţintă.',
  'Funcţii|Turbo': 'Putere maximă temporară pentru atingerea rapidă a ţintei — consum şi zgomot mai mari.',

  // ------------------------------------------------------------ clorinator
  'Producţie clor': 'Cât clor produce electroliza, în procente din capacitatea celulei.',
  'Regim redus': 'Producţie redusă de clor — pentru perioade fără înot sau apă deja echilibrată.',
  'Regim boost': 'Producţie maximă temporară — după furtună, mulţi înotători sau apă tulbure.',
  'Redus': 'Comută clorinatorul pe producţie redusă.',
  'Normal': 'Comută clorinatorul pe producţia normală de clor.',
  'Boost': 'Producţie maximă temporară de clor (şoc de clorinare).',
  'Boost 100%': 'Producţie maximă temporară de clor (şoc de clorinare).',
  'Producţie 25%': 'Setează producţia de clor la un sfert din capacitate.',
  'Producţie 50%': 'Setează producţia de clor la jumătate din capacitate.',
  'Producţie 75%': 'Setează producţia de clor la trei sferturi din capacitate.',
  'Producţie 100%': 'Setează producţia de clor la capacitate maximă.',
  'Viteză 1 · economic': 'Turaţie mică a pompei — filtrare lentă, consum minim.',

  // ------------------------------------------------------------------- TV
  'HDMI 1': 'Comută televizorul pe intrarea HDMI 1.',
  'TV': 'Comută pe tunerul TV (canale live).',
  'YouTube': 'Deschide aplicaţia YouTube pe televizor.',
  'Netflix': 'Deschide aplicaţia Netflix pe televizor.',
  'Mute': 'Taie sunetul televizorului fără a-l opri.',

  // -------------------------------------------------------------- generice
  'Comfort': 'Presetul de confort al unităţii: temperatură şi ventilaţie echilibrate.',
  'Somn': 'Regim de somn: ajustează treptat ţinta şi reduce zgomotul pe timpul nopţii.',

  // ----------------------------------------------------- energie · Growatt
  'Energie|Producţie': 'Cât produc panourile fotovoltaice chiar acum, pe toate stringurile.',
  'Energie|Consum casă': 'Cât consumă casa chiar acum, din orice sursă (soare, baterie sau reţea).',
  'Energie|Baterie': 'Nivelul bateriei APX şi ce face acum: se încarcă, se descarcă sau stă.',
  'Energie|Reţea': 'Schimbul cu reţeaua electrică: exporţi surplusul sau imporţi ce lipseşte.',
  'Putere PV totală': 'Puterea însumată a stringurilor de panouri, măsurată pe partea de curent continuu.',
  'Putere după conversie': 'Cât rămâne din puterea panourilor după conversia în curent alternativ.',
  'Energie solară azi': 'Energia produsă de panouri de la miezul nopţii încoace.',
  'Energie generată azi (AC)': 'Energia livrată de invertor în casă azi, după conversie.',
  'Energie generată total (AC)': 'Toată energia livrată de invertor de la punerea în funcţiune.',
  'Energie solară totală (DC)': 'Toată energia produsă de panouri de la punerea în funcţiune.',
  'Putere AC totală': 'Puterea totală livrată de invertor pe cele trei faze.',
  'Frecvenţă reţea': 'Frecvenţa reţelei electrice — normal foarte aproape de 50 Hz.',
  'Frecvenţă invertor': 'Frecvenţa la care lucrează invertorul, sincronizată cu reţeaua.',
  'Putere reactivă': 'Puterea care circulă fără să facă lucru util — normal mică faţă de cea activă.',
  'Grad de încărcare': 'Cât din capacitatea invertorului e folosită acum, în procente.',
  'Putere nominală': 'Puterea maximă pe care o poate livra invertorul: 25 kW.',
  'Stare de încărcare (SOC)': 'Cât din capacitatea bateriei e disponibilă acum.',
  'Sănătate baterie (SOH)': 'Starea de sănătate a bateriei faţă de capacitatea ei din fabrică.',
  'Baterie acum': 'Direcţia curentă a bateriei: primeşte energie, dă energie sau stă.',
  'Încărcată azi': 'Energia intrată în baterie de la miezul nopţii încoace.',
  'Încărcată total': 'Toată energia intrată în baterie de la instalare.',
  'Descărcată azi': 'Energia scoasă din baterie azi.',
  'Descărcată total': 'Toată energia scoasă din baterie de la instalare.',
  'Module instalate': 'Câte module de baterie APX sunt legate în sistem.',
  'Curent maxim încărcare': 'Limita de curent pe care BMS-ul o permite acum la încărcare. 0 la baterie plină.',
  'Curent maxim descărcare': 'Limita de curent pe care BMS-ul o permite acum la descărcare.',
  'Temperatură maximă celulă': 'Cea mai caldă celulă din baterie, raportată de BMS.',
  'Temperatură medie baterie': 'Media temperaturilor celulelor, raportată de BMS.',
  'Tensiune maximă celulă': 'Cea mai încărcată celulă din baterie. BMS-ul o publică în milivolţi; aici e afişată în volţi.',
  'Tensiune minimă celulă': 'Cea mai descărcată celulă din baterie, afişată în volţi.',
  'Dezechilibru celule': 'Diferenţa dintre cea mai încărcată şi cea mai descărcată celulă. Sub ~30 mV e foarte bine.',
  'Celula cu tensiune maximă': 'Poziţia (indexul) celulei cu tensiunea cea mai mare din stivă.',
  'Celula cu tensiune minimă': 'Poziţia (indexul) celulei cu tensiunea cea mai mică din stivă.',
  'Curent baterie': 'Curentul care intră sau iese din baterie chiar acum.',
  'Curent buck-boost': 'Curent intern al convertorului care adaptează tensiunea bateriei.',
  'Curent LLC': 'Curent intern al etajului de conversie izolat dintre baterie şi invertor.',
  'Convertor baterie (BDC)': 'Convertorul dintre baterie şi invertor — pornit înseamnă că bateria e conectată la sistem.',
  'Cerere de încărcare': 'Semnalul BMS-ului că bateria acceptă încărcare.',
  'Reţea acum': 'Direcţia curentă a schimbului cu reţeaua: export, import sau echilibru.',
  'Export azi': 'Energia trimisă în reţea de la miezul nopţii încoace.',
  'Export total': 'Toată energia trimisă în reţea de la instalare.',
  'Import azi': 'Energia luată din reţea azi.',
  'Import total': 'Toată energia luată din reţea de la instalare.',
  'Autoconsum azi': 'Energia produsă de sistem şi consumată direct în casă azi, fără să treacă prin reţea.',
  'Autoconsum total': 'Toată energia produsă şi consumată direct în casă.',
  'Energie sistem azi': 'Tot ce a produs sistemul azi: autoconsum plus export.',
  'Backup EPS|Stare': 'Ieşirea de rezervă a invertorului, folosită doar la pana de curent. Inactivă acum.',
  'Grad de încărcare EPS': 'Cât din capacitatea ieşirii de rezervă e folosită — 0 cât timp EPS-ul e inactiv.',
  'Temperatură maximă': 'Cea mai caldă dintre cele cinci sonde de temperatură ale invertorului.',
  'Temperatură invertor': 'Temperatura principală a invertorului. Creşte normal cu puterea livrată.',
  'Temperatură IPM': 'Temperatura modulului de putere inteligent (tranzistorii de conversie).',
  'Temperatură etaj PV': 'Temperatura etajului care preia puterea de la panouri.',
  'Temperatură boost': 'Temperatura convertorului care ridică tensiunea panourilor spre busul intern.',
  'Temperatură placă comunicaţie': 'Temperatura plăcii de comunicaţie a invertorului.',
  'Tensiune bus DC': 'Tensiunea magistralei interne de curent continuu a invertorului (~760 V).',
  'Ore de funcţionare': 'De câte ore funcţionează invertorul, cumulat de la instalare.',
  'Curent de scurgere (GFCI)': 'Curentul de scurgere spre pământ măsurat de protecţia diferenţială internă.',
  'Factor de putere': 'Raportul dintre puterea utilă şi cea totală — 1.00 înseamnă transfer perfect.',
  'Întârziere pornire': 'Câte secunde aşteaptă invertorul după revenirea reţelei înainte să pornească.',
  'Încărcare din AC azi': 'Energia băgată în baterie din reţea (nu din soare) azi — normal rară.',
  'Încărcare din AC total': 'Toată energia băgată în baterie din reţea de la instalare.',
  'Ultimul pachet de date': 'Când a trimis datalogger-ul ultima transmisie prin Grott. Normal la ~5 minute.',

  // -------------------------------------------- instrument Energie (v1.1.5)
  'Energie|Producţie acum': 'Puterea produsă de panouri chiar acum, pe toate stringurile.',
  'Energie|Stare de încărcare': 'Cât din capacitatea bateriei APX e disponibilă acum.',
  'Energie|Temperatură maximă': 'Cea mai caldă dintre cele cinci sonde principale ale invertorului.',
  'Energie|Export acum': 'Puterea trimisă în reţea chiar acum — surplusul de după casă şi baterie.',
  'Energie|Import acum': 'Puterea luată din reţea chiar acum — ce nu acoperă soarele şi bateria.',
  'Energie|Vârf azi': 'Cea mai mare putere atinsă azi, calculată din istoricul zilei. Gol până se adună date.',
  'Energie|Energie azi': 'Energia produsă de panouri de la miezul nopţii încoace.',
  'Energie|După conversie': 'Cât rămâne din puterea panourilor după conversia în curent alternativ.',
  'Energie|Autoconsum': 'Cât din producţia de azi a rămas în casă: autoconsum ÷ (autoconsum + export).',
  'Bilanţ azi|Consum casă': 'Cât a consumat casa azi. Calculat: autoconsum + import — contorul intern de consum al invertorului nu raportează.',
  'Bilanţ azi|Baterie ciclat': 'Suma energiei intrate şi ieşite din baterie azi (încărcat + descărcat).',
  'Schimb cumulat|Raport export/import': 'De câte ori e mai mare exportul total decât importul total. „—" cât timp importul e zero.',
  'Sistem|Factor de putere': 'Raportul dintre puterea utilă şi cea totală — 1.00 înseamnă transfer perfect. Registrul brut e ×1000.',
  'Arcul zilei': 'Soarele de la răsărit la apus: grosimea benzii urmăreşte producţia, linia interioară e consumul casei.',
  'Spectrul stringurilor': 'Puterea fiecărui string acum, faţă de vârful lui de azi, plus cota din energia zilei.',
  'Unde merge energia': 'Repartiţia producţiei în acest moment. PV→casă = putere după conversie − export − încărcare baterie.',

  // ------------------------------------------- contor racord (v1.2.8)
  'Contor racord|Net la racord': 'Saldo-ul măsurat de contorul de la racord, independent de invertor: Import când casa trage din reţea, Export când împinge surplus.',
  'Contor racord|Import total (contor)': 'Energia importată, contorizată PER FAZĂ: suma fazelor care trag din reţea, chiar dacă altele exportă simultan. De aceea diferă de registrul invertorului.',
  'Contor racord|Export total (contor)': 'Energia exportată, contorizată PER FAZĂ: suma fazelor care împing în reţea. Diferă de registrul invertorului, care face saldo pe toate fazele.',
  'Contor racord|Putere aparentă totală': 'Puterea totală vehiculată prin racord (V×A), inclusiv componenta reactivă care nu produce lucru util.',
  'Contor racord|Putere reactivă totală': 'Componenta care oscilează între reţea şi casă fără să producă lucru util. Negativă = caracter capacitiv.',
  'Contor racord|Frecvenţă la racord': 'Frecvenţa reţelei măsurată de contor — a doua opinie faţă de invertor.',
  'Contor racord|Invertor asociat': 'Seria invertorului pe care contorul îl deserveşte, aşa cum o raportează contorul.',
  'Faze la racord': 'Puterea activă pe fiecare fază, măsurată de contorul de la racord. Semnul poate diferi între faze: una poate importa în timp ce alta exportă.'
};

/**
 * Descrierea umană pentru un control. `context` = titlul secţiunii sau al
 * grupului (ex. "Ventilator"); se încearcă întâi cheia "Context|Etichetă",
 * apoi eticheta simplă. Fără potrivire → null (tooltip-ul cade pe etichetă).
 */
export function describe(context, label) {
  if (context && D[context + '|' + label] !== undefined) return D[context + '|' + label];
  return D[label] !== undefined ? D[label] : null;
}
