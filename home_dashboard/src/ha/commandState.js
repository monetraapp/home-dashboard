// Ciclul de viaţă al unei comenzi discrete (v1.7.3) — logică pură.
//
// PROBLEMA. Vrem răspuns vizual imediat la apăsare, fără să minţim despre starea
// aparatului. Până în v1.7.0 aplicaţia rezolva asta arătând starea DORITĂ ca şi
// cum ar fi fost reală; măsurat pe 26.08, asta însemna 3,9 secunde de stare
// inventată după ce eşecul era deja cunoscut. v1.7.1 a oprit minciuna. Aici
// adăugăm ce lipsea în loc: un indicator care spune „am trimis, aştept".
//
// STĂRILE
//   TRIMIS      — apelul de serviciu e pe fir, încă fără răspuns
//   ASTEPT      — HA a acceptat apelul; aşteptăm ca aparatul să confirme
//   CONFIRMAT   — HA a publicat starea ţintă (stare terminală)
//   ESUAT       — apelul a fost respins (stare terminală)
//   EXPIRAT     — nu a venit confirmare în fereastra alocată (stare terminală)
//
// Starea REALĂ a aparatului rămâne mereu cea din HA. Registrul ăsta descrie
// exclusiv soarta unei comenzi, nu starea unui dispozitiv.

export const CMD = {
  TRIMIS: 'trimis',
  ASTEPT: 'astept',
  CONFIRMAT: 'confirmat',
  ESUAT: 'esuat',
  EXPIRAT: 'expirat'
};

/** Stările terminale — intrarea se şterge din registru când ajunge aici. */
export const TERMINALE = [CMD.CONFIRMAT, CMD.ESUAT, CMD.EXPIRAT];
export const eTerminala = (st) => TERMINALE.indexOf(st) >= 0;

/**
 * Ferestrele de aşteptare, derivate din auditul de latenţă (`33_`), nu alese la
 * întâmplare. Un prag universal ar fi fost ori prea scurt pentru un televizor,
 * ori absurd de lung pentru un comutator local.
 *
 *   televizor PORNIRE — măsurat 2,3 s (Foişor), 11,4 s (Sofia Etaj),
 *                       6,3 s şi 33,1 s (Hisense, acelaşi aparat, două rulări).
 *                       45 s lasă loc peste maximul observat.
 *   televizor OPRIRE  — măsurat 2,3–2,8 s (Samsung) dar 32,8 s (Hisense).
 *                       40 s: mai scurt decât pornirea, dar peste ce am văzut.
 *                       NU e „mult mai scurt" — datele nu susţin aşa ceva.
 *   restul            — LG confirmă imediat, AUX ~712 ms (max 2,4 s),
 *                       Vivax 0,6–2,8 s. 15 s e generos faţă de maxim.
 */
export const FERESTRE = {
  'media_player:on': 45000,
  'media_player:off': 40000,
  // (v1.9.0) IMPULS — poarta. Nu are senzor de poziţie, deci nu aşteptăm
  // niciodată „poarta e deschisă": aşteptăm exact atât cât să vedem releul
  // Shelly închizându-se. Măsurat local: 59 ms de la apel la acceptare, releu
  // pornit în aceeaşi secundă. 8 s e cu trei ordine de mărime peste normal şi
  // tot scurt cât să nu lase indicatorul agăţat dacă releul chiar nu răspunde.
  impuls: 8000,
  implicit: 15000
};

/**
 * Fereastra pentru o comandă. `actiune` are prioritate faţă de domeniu: un
 * impuls e o categorie de comandă, nu o direcţie de pornire/oprire.
 */
export function fereastra(entityId, tinta, actiune) {
  if (actiune === 'impuls') return FERESTRE.impuls;
  const dom = String(entityId || '').split('.')[0];
  const cheie = dom + ':' + (tinta === 'off' ? 'off' : 'on');
  return FERESTRE[cheie] !== undefined ? FERESTRE[cheie] : FERESTRE.implicit;
}

/** Cheia din registru. O entitate poate avea o singură comandă de un fel. */
export const cheieComanda = (entityId, actiune) => entityId + '|' + actiune;

/**
 * Creează intrarea de registru.
 * `lastUpdated` = ce ştia HA despre entitate ÎN MOMENTUL trimiterii. E ancora
 * pentru „publicare nouă", şi e un ŞIR comparat ca şir: o comparaţie de ceasuri
 * între PC şi HA ar fi greşit tăcut la orice derivă de câteva secunde.
 */
export function creeaza({ entityId, actiune, tinta, lastUpdated, acum }) {
  return {
    entityId,
    actiune,
    tinta,
    lastUpdated: lastUpdated === undefined ? null : lastUpdated,
    pornitLa: acum,
    fereastra: fereastra(entityId, tinta, actiune),
    status: CMD.TRIMIS,
    eroare: null
  };
}

/**
 * Evaluează o intrare faţă de starea curentă a entităţii şi de ceas.
 * Întoarce intrarea NOUĂ (nu mută pe loc), ca să fie uşor de testat.
 *
 * REGULA DE CONFIRMARE, spusă explicit:
 *   confirmăm doar dacă (a) HA a publicat ceva NOU pentru entitate faţă de
 *   momentul trimiterii — `last_updated` diferă — ŞI (b) starea publicată e
 *   chiar ţinta. Fără (a), o stare veche care se întâmplă să fie deja ţinta ar
 *   confirma o comandă care n-a produs nimic. Fără (b), orice schimbare de
 *   atribut ar trece drept succes.
 */
export function evalueaza(cmd, stare, acum) {
  if (!cmd || eTerminala(cmd.status)) return cmd;
  if (acum - cmd.pornitLa >= cmd.fereastra) {
    return { ...cmd, status: CMD.EXPIRAT };
  }
  if (!stare) return cmd;
  const publicareNoua = cmd.lastUpdated === null || stare.last_updated !== cmd.lastUpdated;
  if (publicareNoua && stare.state === cmd.tinta) {
    return { ...cmd, status: CMD.CONFIRMAT };
  }
  return cmd;
}

/** Apelul a fost respins de HA sau de integrare: terminal, imediat. */
export function marcheazaEsec(cmd, mesaj) {
  if (!cmd) return cmd;
  return { ...cmd, status: CMD.ESUAT, eroare: mesaj || 'comandă respinsă' };
}

/** Apelul a fost acceptat; de acum aşteptăm aparatul. */
export function marcheazaAcceptat(cmd) {
  if (!cmd || cmd.status !== CMD.TRIMIS) return cmd;
  return { ...cmd, status: CMD.ASTEPT };
}

/** O comandă e „în zbor" cât timp nu a ajuns într-o stare terminală. */
export const eInZbor = (cmd) => !!cmd && !eTerminala(cmd.status);

/** Textul de sub control cât timp aşteptăm. */
export function textAsteptare(cmd) {
  if (!eInZbor(cmd)) return null;
  // Poarta nu se „porneşte": i se trimite un impuls. Textul spune ce facem
  // noi, nu ce presupunem despre poartă.
  if (cmd.actiune === 'impuls') return 'Se trimite…';
  return cmd.tinta === 'off' ? 'Oprire…' : 'Pornire…';
}

/** Eticheta pentru cititoarele de ecran. */
export function textAccesibil(cmd) {
  if (!eInZbor(cmd)) return null;
  if (cmd.actiune === 'impuls') return 'Comandă în curs de trimitere';
  return cmd.tinta === 'off' ? 'Oprire în curs' : 'Pornire în curs';
}

/** Mesajul de neconfirmare, în cuvintele cerute. */
export function textExpirat(cmd) {
  if (!cmd) return null;
  if (cmd.actiune === 'impuls') return 'Comanda nu a fost confirmată';
  return cmd.tinta === 'off' ? 'Oprirea nu a fost confirmată' : 'Pornirea nu a fost confirmată';
}

/**
 * DESPRE STĂRILE TRANZITORII ALE TELEVIZOARELOR.
 *
 * Auditul a arătat că televizoarele raportează `on` spontan şi revin la `off`
 * în câteva secunde, fără nicio comandă în spate (Foişor: on 06:30:31 → off
 * 06:30:34). Întrebarea era dacă cerem o confirmare STABILĂ, ţinută N secunde.
 *
 * NU cerem. Trei motive:
 *   1. Cerinţa explicită e ca indicatorul să dispară când HA confirmă — „dacă
 *      HA confirmă ON la 2 s, loading dispare la 2 s". O fereastră de
 *      stabilitate ar întârzia exact cazul bun, care e şi cel mai frecvent.
 *   2. Interfaţa nu minte în niciun moment: afişează mereu starea reală. Dacă
 *      aparatul revine la `off`, se vede `off` — nu o stare inventată.
 *   3. „Dacă nu e nevoie, nu complica." O fereastră de stabilitate ar fi adăugat
 *      un al doilea cronometru şi o a doua sursă de comportament surprinzător.
 *
 * Consecinţa acceptată: la un televizor care pâlpâie, indicatorul poate dispărea
 * pe un `on` tranzitoriu, iar starea reală revine apoi la `off`. E o pâlpâire
 * reală a aparatului, redată fidel — nu o afirmaţie falsă a aplicaţiei.
 */
export const NOTA_TRANZITORII = 'confirmare la prima publicare care egalează ţinta';
