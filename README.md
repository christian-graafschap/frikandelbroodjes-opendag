# Open dag: Frikandelbroodjesweek

Een actiepagina die bezoekers zelf aanpassen. Bij "✓ Klaar met bewerken" draaien Playwright-tests
op de pagina: lokaal (offline modus) of via een push naar GitHub Actions (online modus).

## Wat heb je nodig

- **Node.js 20.6 of nieuwer** (https://nodejs.org, LTS). Controleer met `node -v`; met een oudere
  versie start de server niet.
- **Git**, met pushrechten op deze repo en ingestelde `user.name` en `user.email`
  (alleen nodig voor de online modus).

## Installeren

```
git clone https://github.com/christian-graafschap/frikandelbroodjes-opendag.git
cd frikandelbroodjes-opendag
npm install
npx playwright install chromium
copy .env.example .env
```

- `npx playwright install chromium` haalt de testbrowser op. Die staat niet in de projectmap,
  dus dit moet per laptop één keer.
- In `.env` kies je de modus waarmee de server start: `LOCAL_ONLY=true` (offline) of
  `LOCAL_ONLY=false` (online).

Staat het project al op de laptop, dan is `git pull` gevolgd door `npm install` genoeg.

## Starten

Dubbelklik op `start.bat`. De server start en http://localhost:3000 opent in de browser.
Op een tablet in hetzelfde netwerk gebruik je `http://<ip-van-de-laptop>:3000`.

- **✏️ Bewerken**: klik of rechtsklik daarna op een onderdeel om het aan te passen.
- **✓ Klaar met bewerken**:
  - *Offline modus*: de tests draaien lokaal en het [testrapport](#testrapport-rapport-eigen)
    opent in een nieuw tabblad. Er gaat niets naar GitHub.
  - *Online modus*: de wijziging wordt gecommit en gepusht, waarna GitHub Actions de tests draait.
    Het rapport staat als artifact `playwright-report` bij de workflow-run op GitHub.

## Config-pagina (`/config`)

Op http://localhost:3000/config wissel je tussen offline en online modus. Na een herstart van de
server geldt weer de modus uit `.env`.

## Reset-pagina (`/reset`)

Op http://localhost:3000/reset zet **Ja, reset nu** de pagina terug naar `standaard-config.json`,
bijvoorbeeld tussen twee groepjes bezoekers door. Op de actiepagina doet `Shift + Alt + R` hetzelfde.
Een reset wordt niet gepusht; dat gebeurt pas bij de volgende "✓ Klaar met bewerken" in online modus.

## Testrapport (`/rapport-eigen`)

In de offline modus toont de demo een eigen (custom) Playwright-rapport in de stijl van de
actiepagina, zodat bezoekers het kunnen volgen. Per test zie je of hij geslaagd is, en bij een
gefaalde test de verwachte en de werkelijke waarde. Onderaan linkt het naar het volledige
standaardrapport van Playwright (`/rapport/`).

Playwright schrijft de uitslag via een extra `json`-reporter naar `playwright-report/resultaat.json`
(zie `playwright.config.js`); `public/rapport.html` toont die via `/api/rapport-data`.

## De tests

`tests/actiepagina.spec.js` controleert onder andere of de prijs tussen €0,01 en €10 ligt, of de
kortingsbadge een percentage tussen 1 en 99 toont en of de bestelknop WCAG AA-contrast heeft.
Een bezoeker die "€ 150" of een gele knop op wit instelt, laat de tests falen — en dat is precies de
bedoeling. De server controleert daarom alleen vorm en lengte van de invoer, niet de inhoud.
