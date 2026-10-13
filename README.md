# Open dag: Frikandelbroodjesweek

Een actiepagina die bezoekers zelf aanpassen (rechtermuisknop, of de knop "✏️ Bewerken" op een tablet).
Elke wijziging wordt door een kleine Node-server gecommit en gepusht naar GitHub.
Daar kan straks een Playwright-pipeline op starten.

## Wat heb je nodig

- Node.js 20.6 of nieuwer
- Een GitHub-repo voor de demo (bijvoorbeeld `opendag-frikandelbroodjesweek`)
- Een fine-grained personal access token met alleen **Contents: Read and write** op die ene repo
  (GitHub → Settings → Developer settings → Fine-grained tokens)

## Eenmalig instellen

1. Zet deze map in de repo en push hem één keer gewoon met git (het `.env`-bestand gaat niet mee).
2. Zet de logo's in `public/logos/` als `graafschap-college.svg` en `ah.svg` (png, webp of jpg mag ook).
   Wordt de repo publiek, gebruik dan liever een eigen knipoog-logo voor de supermarkt dan het echte logo.
3. Kopieer `.env.example` naar `.env` en vul token, eigenaar en reponaam in.
4. `npm install`

## Draaien op de open dag

```
npm start
```

Open daarna http://localhost:3000 in de browser (of `http://<ip-van-de-laptop>:3000` op een tablet in hetzelfde netwerk).

- Een wijziging wordt opgeslagen zodra het bewerkvenster sluit (of na 5 seconden).
- Snel achter elkaar wijzigen levert één commit op, met een bericht als
  `Bezoeker wijzigt prijs.tekst → GRATIS, bestelknop.achtergrond → #ffff00`.
- **Reset**: druk op de pagina op `Shift + Alt + R`, of `curl -X POST http://localhost:3000/api/reset`.
- **Status van de laatste push**: http://localhost:3000/api/status

## Hoe het werkt

- `server.js` serveert `public/` en houdt de actuele config bij.
- De pagina haalt `config.json` op en stuurt wijzigingen naar `POST /api/config`.
- De server controleert alleen vorm en lengte (kleuren als `#rrggbb`, tekst tot 120 tekens, vaste keuzes voor foto en cookiebanner).
  Inhoudelijk "foute" waarden mogen juist, daar moeten de tests op falen.
- De server schrijft `public/config.json` in de repo via de GitHub API. Er is dus geen lokale git nodig, en de token blijft op de server.
- Omdat de config in `public/` staat, kan een pipeline de site later gewoon statisch serveren en testen.

De pagina werkt ook als je `public/index.html` los opent, maar dan wordt er niets opgeslagen.
