import { test, expect } from "@playwright/test";

const VERWACHT = {
  titel: "Frikandelbroodjesweek!",
  titelKleur: "rgb(255, 255, 255)",
  badge: "-25%",
  productnaam: "Frikandelbroodje",
  beschrijving:
    "Krokant bladerdeeg met een sappige frikandel en een vleugje curry. Vers uit onze oven, lekker als lunch of tussendoor.",
  prijs: "€ 1,99",
  achtergrondHex: "#0082C9",
  achtergrondRgb: "rgb(0, 130, 201)"
};

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("titel is 'Frikandelbroodjesweek!'", async ({ page }) => {
  await expect(page.getByTestId("titel")).toHaveText(VERWACHT.titel);
});

test("titelkleur is wit", async ({ page }) => {
  const kleur = await page
    .getByTestId("titel")
    .evaluate(el => getComputedStyle(el).color);
  expect(kleur).toBe(VERWACHT.titelKleur);
});

test("kortingsbadge toont -25%", async ({ page }) => {
  await expect(page.getByTestId("badge")).toHaveText(VERWACHT.badge);
});

test("productnaam is 'Frikandelbroodje'", async ({ page }) => {
  await expect(page.getByTestId("productnaam")).toHaveText(VERWACHT.productnaam);
});

test("omschrijving komt overeen met de verwachte tekst", async ({ page }) => {
  await expect(page.getByTestId("beschrijving")).toHaveText(VERWACHT.beschrijving);
});

test("prijs is € 1,99", async ({ page }) => {
  await expect(page.getByTestId("prijs")).toHaveText(VERWACHT.prijs);
});

test(`achtergrondkleur is AH blauw (${VERWACHT.achtergrondHex})`, async ({ page }) => {
  const kleur = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor
  );
  expect(kleur).toBe(VERWACHT.achtergrondRgb);
});
