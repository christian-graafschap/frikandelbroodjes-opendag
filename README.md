# Open dag: Frikandelbroodjesweek

Een actiepagina die bezoekers zelf aanpassen. Bij "✓ Klaar met bewerken" draaien Playwright-tests
op de pagina en zien bezoekers in een testrapport wat er goed en fout gaat.

## Wat heb je nodig

- **Node.js 20.6 of nieuwer** (https://nodejs.org, LTS). Controleer met `node -v`; met een oudere
  versie start de server niet.

## Installeren

```
git clone https://github.com/christian-graafschap/frikandelbroodjes-opendag.git
cd frikandelbroodjes-opendag
npm install
npx playwright install chromium
copy .env.example .env
```

`npx playwright install chromium` haalt de testbrowser op. Die staat niet in de projectmap,
dus dit moet per laptop één keer.

Staat het project al op de laptop, dan is `git pull` gevolgd door `npm install` genoeg.

## Starten

Dubbelklik op `start.bat`. De server start en http://localhost:3000 opent in de browser.
Op een tablet in hetzelfde netwerk gebruik je `http://<ip-van-de-laptop>:3000`.

- **✏️ Bewerken**: klik of rechtsklik daarna op een onderdeel om het aan te passen.
- **✓ Klaar met bewerken**: de tests draaien en het [testrapport](#testrapport-rapport-eigen)
  opent in een nieuw tabblad.

## Reset-pagina (`/reset`)

Op http://localhost:3000/reset zet **Ja, reset nu** de pagina terug naar `standaard-config.json`,
bijvoorbeeld tussen twee groepjes bezoekers door. Op de actiepagina doet `Shift + Alt + R` hetzelfde.

## Testrapport (`/rapport-eigen`)

De demo toont een eigen (custom) Playwright-rapport in de stijl van de actiepagina, zodat bezoekers
het kunnen volgen. Per test zie je of hij geslaagd is, en bij een gefaalde test de verwachte en de
werkelijke waarde. Onderaan linkt het naar het volledige standaardrapport van Playwright (`/rapport/`).

Playwright schrijft de uitslag via een extra `json`-reporter naar `playwright-report/resultaat.json`
(zie `playwright.config.js`); `public/rapport.html` toont die via `/api/rapport-data`.

## De tests

`tests/actiepagina.spec.js` controleert zeven onderdelen: titel, titelkleur, kortingsbadge,
productnaam, omschrijving, prijs en de achtergrondkleur van de pagina. De verwachte waarden staan
in `VERWACHT` bovenaan het testbestand.

De standaardversie van de pagina (`standaard-config.json`) bevat bewust fouten, zodat vijf van de
zeven tests falen. De opdracht voor bezoekers is de pagina zo aan te passen dat alle tests slagen.
Een reset zet de pagina terug naar deze foutieve versie.

## Online modus

Standaard draait de demo offline: alles blijft op de laptop. In de online modus wordt een wijziging
bij "✓ Klaar met bewerken" gecommit en gepusht naar GitHub, waarna GitHub Actions de tests draait.
Het rapport staat dan als artifact `playwright-report` bij de workflow-run op GitHub; het eigen
testrapport wordt niet gebruikt.

Daarvoor heb je nodig:

- **Git**, met pushrechten op deze repo en ingestelde `user.name` en `user.email`.

Inschakelen kan op twee manieren:

- Vast: zet `LOCAL_ONLY=false` in `.env` en start de server opnieuw.
- Tijdelijk: zet op http://localhost:3000/config het vinkje bij **Offline modus** uit en klik op
  **Opslaan**. Na een herstart geldt weer de modus uit `.env`.

Een reset wordt niet apart gepusht; de teruggezette versie gaat mee bij de volgende "✓ Klaar met bewerken".
