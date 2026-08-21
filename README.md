# Home Dashboard — add-on Home Assistant

Dashboard propriu pentru casă, portat din Claude Design şi conectat live la
Home Assistant prin WebSocket. Împachetat ca add-on custom, instalabil direct
din acest repo.

## Instalare în Home Assistant

1. **Setări → Add-ons → Add-on Store**
2. Meniul ⋮ (dreapta sus) → **Repositories**
3. Adaugă:
   ```
   https://github.com/monetraapp/home-dashboard
   ```
4. Închide dialogul şi reîmprospătează pagina. Apare secţiunea
   *Home Dashboard — add-on repository*, cu add-on-ul **Home Dashboard**.
5. Deschide-l → **Install**.

Prima instalare compilează aplicaţia pe dispozitivul Home Assistant
(`npm ci` + build Vite), deci durează câteva minute. Pe HA Green sau alt
hardware ARM poate dura mai mult decât pe un x86.

6. **Start**, apoi **Open Web UI** — sau intrarea *Home Dashboard* din bara
   laterală, adăugată automat prin ingress.

Configurarea adresei HA şi a token-ului se face la prima deschidere, în
aplicaţie. Detalii şi motivaţie: [home_dashboard/DOCS.md](home_dashboard/DOCS.md).

## Actualizare

`git push` pe acest repo → în HA, **Add-on Store → ⋮ → Check for updates**.
Supervisor compară `version` din `home_dashboard/config.yaml`, deci
**incrementează versiunea la fiecare schimbare** pe care vrei s-o vadă HA.

## Structura repo-ului

```
repository.yaml              identifică repo-ul ca magazin de add-on-uri
home_dashboard/              add-on-ul (build context Docker)
  config.yaml                metadate, ingress, opţiuni
  build.yaml                 imaginile de bază per arhitectură
  Dockerfile                 build în 2 etape: node → nginx pe baza HA
  .dockerignore
  rootfs/                    copiat peste imaginea finală
    etc/nginx/nginx.conf
    etc/services.d/nginx/    serviciul s6 (run + finish)
  translations/              en, ro — pentru ecranul de opţiuni
  DOCS.md CHANGELOG.md
  package.json vite.config.js index.html
  src/ public/ test/         aplicaţia (neschimbată funcţional)
Home Dashboard.dc.html       designul original exportat
design-updatev1/             designul cu breakpoint-uri responsive
```

## Dezvoltare locală

Aplicaţia rulează în continuare direct, fără Docker:

```bash
cd home_dashboard && npm install && npm run dev
```

Vite ascultă pe toate interfeţele, deci merge şi de pe telefon la
`http://<ip-pc>:5173`.

```bash
cd home_dashboard && npm test
```

42 de aserţiuni pe logică, mapare şi breakpoint-uri + 44 de comparaţii care
verifică fidelitatea vizuală faţă de designul din `design-updatev1/`.

Documentaţia completă a aplicaţiei: [home_dashboard/README.md](home_dashboard/README.md).
