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
  'Ventilator mediu': 'Setează ventilatorul pe viteza medie.',
  'Turbo': 'Viteza maximă de ventilator — răcire/încălzire rapidă, mai zgomotoasă.',

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
  'Temporizator somn (min)': 'Peste câte minute se opreşte singură unitatea. Gol = niciun temporizator activ.',
  'Pornire peste (min)': 'Peste câte minute porneşte singură unitatea. Gol = neprogramat.',
  'Oprire peste (min)': 'Peste câte minute se opreşte unitatea. Gol = neprogramat.',
  'Somn peste': 'Peste câte minute se opreşte singură unitatea.',
  'Pornire peste': 'Peste câte minute porneşte singură unitatea.',
  'Oprire peste': 'Peste câte minute se opreşte unitatea.',

  // -------------------------------------------------------------- Fairland
  'Încălzire apă': 'Încălzeşte apa piscinei până la temperatura ţintă.',
  'Răcire apă': 'Răceşte apa piscinei — util vara când apa trece de ţintă.',
  'Mod automat': 'Pompa alege singură între încălzire şi răcire după temperatura ţintă.',
  'Funcţii|Silenţios': 'Reduce turaţia compresorului şi a ventilatorului — mai lent, dar aproape silenţios.',
  'Smart': 'Regimul echilibrat recomandat: adaptează puterea după diferenţa faţă de ţintă.',
  'Funcţii|Turbo': 'Putere maximă pentru încălzire rapidă — consum mai mare, zgomot mai mare.',

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
  'Mut': 'Taie sunetul televizorului fără a-l opri.',

  // -------------------------------------------------------------- generice
  'Comfort': 'Presetul de confort al unităţii: temperatură şi ventilaţie echilibrate.',
  'Somn': 'Regim de somn: ajustează treptat ţinta şi reduce zgomotul pe timpul nopţii.'
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
