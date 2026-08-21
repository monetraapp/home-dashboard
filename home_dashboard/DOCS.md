# Home Dashboard

Dashboard propriu pentru casă, conectat live la Home Assistant prin WebSocket.

## Pornire

După instalare apasă **Start**, apoi **Open Web UI** (sau intrarea *Home
Dashboard* din bara laterală).

La prima deschidere aplicaţia cere:

1. **Adresa Home Assistant** — aceeaşi pe care o foloseşti în browser,
   de exemplu `http://192.168.0.10:8123`.
2. **Long-Lived Access Token** — HA → numele tău (stânga jos) → tab-ul
   *Securitate* → jos, *Create Token*.

Ambele se salvează **doar în localStorage-ul browserului**, nu în configuraţia
add-on-ului şi nu pe disc. Dacă deschizi dashboard-ul de pe alt dispozitiv, îl
configurezi din nou acolo — asta e intenţionat, vezi mai jos.

## De ce nu sunt adresa şi token-ul opţiuni de add-on

Ar fi fost posibil, dar ar fi înrăutăţit lucrurile:

- Aplicaţia rulează **în browser**, nu pe server. Ca browserul să primească
  token-ul, add-on-ul ar trebui să-l injecteze în pagină — adică orice persoană
  care poate deschide dashboard-ul l-ar putea citi din sursa paginii.
- Token-ul ar ajunge scris pe disc, în configuraţia add-on-ului, şi vizibil în
  interfaţa Supervisor.
- Comportamentul actual e deja testat şi funcţional; mutarea lui ar fi însemnat
  modificarea logicii aplicaţiei.

Aşa cum e acum, token-ul nu părăseşte browserul tău, iar accesul la dashboard e
protejat de autentificarea Home Assistant prin ingress.

## Opţiuni

```yaml
log_level: info
```

- **log_level** — cât de detaliat scrie add-on-ul în jurnal.
  Valori: `trace`, `debug`, `info`, `notice`, `warning`, `error`, `fatal`.

## Maparea entităţilor

În bara de sus a dashboard-ului, butonul cu glisoare deschide ecranul **Mapare
entităţi**. Acolo, butonul *Aplică maparea din audit* completează dintr-un clic
sloturile identificate în instanţa ta. Maparea se salvează tot în localStorage
şi poate fi exportată/importată ca JSON.

## Reţea

Add-on-ul nu publică niciun port pe host. E accesibil exclusiv prin ingress,
iar nginx acceptă conexiuni doar de la Supervisor (`172.30.32.2`).

## Fonturi

Interfaţa foloseşte Plus Jakarta Sans, EB Garamond şi Doto, încărcate de la
Google Fonts. Le descarcă **browserul**, nu serverul Home Assistant. Dacă
dispozitivul de pe care deschizi dashboard-ul n-are acces la internet, textul
apare cu fonturile de rezervă din sistem — restul funcţionează normal.
