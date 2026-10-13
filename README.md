# Open dag: Frikandelbroodjesweek

Een actiepagina die bezoekers zelf aanpassen (rechtermuisknop, of de knop "✏️ Bewerken" op een tablet).
De wijzigingen worden gecommit en gepusht naar GitHub, waarna een Playwright-pipeline in GitHub Actions
automatisch tests uitvoert en een rapport publiceert.

## Wat heb je nodig

- Node.js 20.6 of nieuwer
- Een GitHub-repo voor de demo
- Git (lokaal geconfigureerd en met pushrechten op de repo)
- Voor de **GitHub-API-modus** (optioneel): een fine-grained personal access token met alleen
  **Contents: Read and write** op die ene repo (GitHub → Settings → Developer settings → Fine-grained tokens)

## Eenmalig instellen

1. Clone of zet deze map in de repo en push hem één keer gewoon met git.
2. Zet de logo's in `public/logos/` als `graafschap-college.svg` en `ah.svg` (png, webp of jpg mag ook).
   Wordt de repo publiek, gebruik dan liever een eigen knipoog-logo voor de supermarkt dan het echte logo.
3. Kopieer `.env.example` naar `.env`. Kies een van de twee modi:
   - **Lokale modus (standaard aanbevolen):** zet `LOCAL_ONLY=true`. Je hebt dan geen token nodig.
     Wijzigingen worden pas gepusht als je op **"✓ Klaar met bewerken"** drukt; dat gebeurt via
     lokale `git commit && git push`.
   - **GitHub-API-modus:** laat `LOCAL_ONLY` leeg en vul `GITHUB_TOKEN`, `GITHUB_OWNER` en `GITHUB_REPO` in.
     Elke wijziging wordt dan direct door de server via de GitHub API gecommit en gepusht.
4. `npm install`

## Draaien op de open dag

```
npm start
```

Open daarna http://localhost:3000 in de browser (of `http://<ip-van-de-laptop>:3000` op een tablet
in hetzelfde netwerk).

- Klik op **✏️ Bewerken** om onderdelen aanpasbaar te maken. Klik of rechtsklik dan op een onderdeel
  om het bewerkvenster te openen.
- Klik op **✓ Klaar met bewerken** om de huidige staat op te slaan en te pushen.
  In LOCAL_ONLY-modus wordt `public/config.json` geschreven en lokaal gecommit en gepusht;
  in GitHub-API-modus is de push al tijdens het bewerken gedaan.
- **Reset**: ga naar http://localhost:3000/reset en klik op "Ja, reset nu". De sneltoets
  `Shift + Alt + R` op de pagina werkt ook.
- **Status van de laatste push**: http://localhost:3000/api/status

## Hoe het werkt

- `server.js` serveert `public/` en houdt de actuele config bij.
- De pagina haalt `config.json` op en stuurt wijzigingen naar `POST /api/config`.
- De server controleert alleen vorm en lengte (kleuren als `#rrggbb`, tekst tot 120 tekens,
  vaste keuzes voor foto en cookiebanner). Inhoudelijk "foute" waarden mogen juist, daar
  moeten de tests op falen.
- **LOCAL_ONLY-modus:** `POST /api/push` schrijft de in-memory config naar `public/config.json`
  en doet lokaal `git add -A && git commit && git push`. De knop "✓ Klaar met bewerken" roept
  dit endpoint aan.
- **GitHub-API-modus:** de server schrijft `public/config.json` direct in de repo via de
  GitHub API. Er is dan geen lokale git nodig en de token blijft op de server.
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
