# Open dag: Frikandelbroodjesweek

Een actiepagina die bezoekers zelf aanpassen (rechtermuisknop, of de knop "✏️ Bewerken" op een tablet).
De wijzigingen worden gecommit en gepusht naar GitHub, waarna een Playwright-pipeline in GitHub Actions
automatisch tests uitvoert en een rapport publiceert.

## Wat heb je nodig

- Node.js 20.6 of nieuwer
- Een GitHub-repo voor de demo
- Git (lokaal geconfigureerd en met pushrechten op de repo — bijvoorbeeld via de Windows
  Credential Manager of een SSH-sleutel)

## Eenmalig instellen

1. Clone of zet deze map in de repo en push hem één keer gewoon met git.
2. Zet de logo's in `public/logos/` als `graafschap-college.svg` en `ah.svg` (png, webp of jpg mag ook).
   Wordt de repo publiek, gebruik dan liever een eigen knipoog-logo voor de supermarkt dan het echte logo.
3. Kopieer `.env.example` naar `.env`. Kies een van de twee modi (schakelbaar via
   http://localhost:3000/config):
   - **Online modus** (`LOCAL_ONLY=false`): wijzigingen worden in `public/config.json`
     opgeslagen en bij **"✓ Klaar met bewerken"** doet de server lokaal
     `git add && git commit && git push`. Er is geen GitHub-token nodig; `git push`
     gebruikt je bestaande credentials. Daarna draait de Actions-pipeline op GitHub.
   - **Offline modus** (`LOCAL_ONLY=true`): wijzigingen worden ook in `public/config.json`
     opgeslagen, maar bij **"✓ Klaar met bewerken"** draait de Playwright-testsuite lokaal
     tegen de draaiende server. Er wordt niets naar GitHub gestuurd.
4. `npm install`
5. Voor offline modus: `npx playwright install chromium` om de browser voor de lokale
   testruns binnen te halen.

## Draaien op de open dag

```
npm start
```

Open daarna http://localhost:3000 in de browser (of `http://<ip-van-de-laptop>:3000` op een tablet
in hetzelfde netwerk).

- Klik op **✏️ Bewerken** om onderdelen aanpasbaar te maken. Klik of rechtsklik dan op een onderdeel
  om het bewerkvenster te openen.
- Klik op **✓ Klaar met bewerken** om de huidige staat af te sluiten.
  In online modus wordt de wijziging lokaal gecommit en met `git push` naar GitHub gezet,
  waarna de Actions-pipeline de tests draait. In offline modus draait de Playwright-testsuite
  lokaal tegen de draaiende server en wordt er niets naar GitHub gestuurd.
- **Reset**: ga naar http://localhost:3000/reset en klik op "Ja, reset nu". De sneltoets
  `Shift + Alt + R` op de pagina werkt ook.
- **Status van de laatste push**: http://localhost:3000/api/status

## Hoe het werkt

- `server.js` serveert `public/` en houdt de actuele config bij.
- De pagina haalt `config.json` op en stuurt wijzigingen naar `POST /api/config`.
- De server controleert alleen vorm en lengte (kleuren als `#rrggbb`, tekst tot 120 tekens,
  vaste keuzes voor foto en cookiebanner). Inhoudelijk "foute" waarden mogen juist, daar
  moeten de tests op falen.
- Elke `POST /api/config` schrijft meteen `public/config.json`, in beide modi. De wijziging
  overleeft dus een herstart van de server.
- **Online modus:** op `POST /api/push` (de knop "✓ Klaar met bewerken") doet de server
  `git add -A && git commit && git push`. Er is géén GitHub-token in het spel; `git push`
  gebruikt je bestaande git-credentials.
- **Offline modus:** op `POST /api/push` draait de server lokaal `npx playwright test`
  tegen de eigen draaiende instance en geeft de uitslag terug. Er wordt géén git-commando
  uitgevoerd en er gaat niets naar GitHub.
- De modus is tijdens de demo om te schakelen via http://localhost:3000/config.
- Omdat de config in `public/` staat, test de pipeline straks tegen de echte gepushte waarden.

De pagina werkt ook als je `public/index.html` los opent, maar dan wordt er niets opgeslagen.

## Playwright-pipeline

Bij elke push draait `.github/workflows/playwright.yml` op GitHub Actions:

1. Node.js en afhankelijkheden installeren.
2. Chromium ophalen (uit cache als de Playwright-versie niet veranderd is).
3. `npm test` draait `tests/actiepagina.spec.js` tegen de gepushte `public/config.json`.
4. Het HTML-rapport wordt als artifact `playwright-report` gepubliceerd (14 dagen bewaard).

De tests kijken onder andere of de prijs tussen €0,01 en €10 ligt, of de kortingsbadge een
percentage tussen 1 en 99 toont, en of de bestelknop WCAG AA contrast heeft. Een bezoeker die
"€ 150" of een gele knop op wit instelt, maakt de pipeline rood — en dat is precies de bedoeling.
