import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("titel, prijs en bestelknop zijn aanwezig en gevuld", async ({ page }) => {
  await expect(page.getByTestId("titel")).not.toBeEmpty();
  await expect(page.getByTestId("prijs")).not.toBeEmpty();
  const knop = page.getByTestId("bestelknop");
  await expect(knop).toBeVisible();
  await expect(knop).not.toBeEmpty();
});

test("prijs ligt tussen de €0,01 en €10", async ({ page }) => {
  const tekst = (await page.getByTestId("prijs").textContent()) ?? "";
  const bedrag = Number(tekst.replace(/€/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
  expect(Number.isFinite(bedrag)).toBe(true);
  expect(bedrag).toBeGreaterThan(0);
  expect(bedrag).toBeLessThan(10);
});

test("kortingsbadge toont een percentage tussen 1 en 99", async ({ page }) => {
  const tekst = (await page.getByTestId("badge").textContent()) ?? "";
  const match = tekst.match(/(\d+)\s*%/);
  expect(match, `badge "${tekst}" bevat geen percentage`).not.toBeNull();
  const pct = Number(match[1]);
  expect(pct).toBeGreaterThan(0);
  expect(pct).toBeLessThanOrEqual(99);
});

test("bestelknop heeft minimaal WCAG AA contrast (4.5:1)", async ({ page }) => {
  const knop = page.getByTestId("bestelknop");
  const kleuren = await knop.evaluate(el => {
    const s = getComputedStyle(el);
    return { voor: s.color, achter: s.backgroundColor };
  });
  const parse = c => (c.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
  const lin = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const l1 = lum(parse(kleuren.voor));
  const l2 = lum(parse(kleuren.achter));
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  expect(ratio, `contrast ${kleuren.voor} op ${kleuren.achter} is te laag`).toBeGreaterThanOrEqual(4.5);
});

test("productfoto staat binnen 3 seconden klaar", async ({ page }) => {
  await expect(page.locator("#laden")).not.toHaveClass(/aan/, { timeout: 3000 });
  await expect(page.getByTestId("productfoto")).toBeVisible();
});
