// Open dag demo: serveert de actiepagina.
// Online modus: bij "✓ Klaar met bewerken" wordt lokaal gecommit en gepusht via git
// (gebruikt je bestaande git-credentials — geen GitHub-token nodig).
// Offline modus (LOCAL_ONLY=true): bij "✓ Klaar met bewerken" draait Playwright
// lokaal in plaats van git push.
import express from "express";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
const draaiGit = promisify(execFile);

const { PORT = 3000, LOCAL_ONLY } = process.env;
let lokaal = LOCAL_ONLY === "true";

const projectmap = fileURLToPath(new URL(".", import.meta.url));
const publiek = fileURLToPath(new URL("./public", import.meta.url));
const configOpSchijf = fileURLToPath(new URL("./public/config.json", import.meta.url));
const playwrightCli = fileURLToPath(new URL("./node_modules/@playwright/test/cli.js", import.meta.url));
const rapportMap = fileURLToPath(new URL("./playwright-report", import.meta.url));
const rapportIndex = fileURLToPath(new URL("./playwright-report/index.html", import.meta.url));
const rapportJson = fileURLToPath(new URL("./playwright-report/resultaat.json", import.meta.url));

const STANDAARD = JSON.parse(readFileSync(new URL("./standaard-config.json", import.meta.url), "utf8"));
// Rapport van de tests tegen de standaardversie. Getoond na het opstarten en na een reset,
// totdat er een echte testrun is geweest.
const STANDAARD_RAPPORT = JSON.parse(readFileSync(new URL("./standaard-rapport.json", import.meta.url), "utf8"));
let toonStandaardRapport = true;

/* ---------- Toegestane invoer: alleen deze velden, met deze regels ---------- */
// Inhoudelijk "foute" waarden (150% korting, gele tekst op wit) mogen juist wél:
// daar moeten de tests op falen. Alleen vorm en lengte worden bewaakt.
const tekst = max => v => typeof v === "string" && v.length <= max ? v.replace(/[\x00-\x1f\x7f]/g, "") : undefined;
const kleur = v => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : undefined;
const keuze = opties => v => opties.includes(v) ? v : undefined;
const SCHEMA = {
  titel:        { tekst: tekst(120), kleur },
  badge:        { tekst: tekst(120), achtergrond: kleur },
  productnaam:  { tekst: tekst(120) },
  beschrijving: { tekst: tekst(300) },
  prijs:        { tekst: tekst(120) },
  bestelknop:   { tekst: tekst(120), kleur, achtergrond: kleur },
  foto:         { bestand: keuze(["broodje.webp", "broodje-groot.png", "IMG_4382_ORIGINEEL.jpg"]), alt: tekst(120) },
  cookiebanner: { positie: keuze(["onder", "boven", "kaart"]) },
  pagina:       { achtergrond: kleur }
};
function valideer(invoer) {
  const uit = {};
  for (const [sleutel, velden] of Object.entries(SCHEMA)) {
    uit[sleutel] = {};
    for (const [prop, check] of Object.entries(velden)) {
      const waarde = check(invoer?.[sleutel]?.[prop]);
      if (waarde === undefined) throw new Error(`Ongeldige waarde voor ${sleutel}.${prop}`);
      uit[sleutel][prop] = waarde;
    }
  }
  return uit;
}

/* ---------- Toestand ---------- */
let huidig = structuredClone(STANDAARD);
let laatste = { commit: null, tijd: null, fout: null };

function schrijfConfig(cfg) {
  try { writeFileSync(configOpSchijf, JSON.stringify(cfg, null, 2) + "\n"); }
  catch (e) { console.error("Kon public/config.json niet schrijven:", e.message); }
}

/* ---------- Webserver ---------- */
const app = express();
app.use(express.json({ limit: "10kb" }));

app.get("/config.json", (req, res) => { res.set("Cache-Control", "no-store"); res.json(huidig); });

app.post("/api/config", (req, res) => {
  try {
    huidig = valideer(req.body);
    schrijfConfig(huidig);
    res.status(202).json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, fout: e.message });
  }
});

app.post("/api/reset", (req, res) => {
  huidig = structuredClone(STANDAARD);
  schrijfConfig(huidig);
  toonStandaardRapport = true;
  res.json({ ok: true });
});

app.get("/api/status", (req, res) => res.json({ lokaal, bezig: false, ...laatste }));

app.get("/api/modus", (req, res) => res.json({ lokaal }));

app.post("/api/modus", (req, res) => {
  lokaal = Boolean(req.body?.lokaal);
  console.log(`Modus gewisseld naar ${lokaal ? "offline (lokale Playwright)" : "online (git push)"}.`);
  res.json({ ok: true, lokaal });
});

async function git(...args) {
  const { stdout, stderr } = await draaiGit("git", args, { cwd: projectmap });
  return (stdout + stderr).trim();
}
function draaiPlaywright() {
  return new Promise(resolve => {
    const kind = spawn(process.execPath, [playwrightCli, "test"], { cwd: projectmap });
    let uit = "", fout = "";
    kind.stdout.on("data", d => uit += d.toString());
    kind.stderr.on("data", d => fout += d.toString());
    kind.on("error", e => resolve({ code: -1, uit, fout: fout + e.message }));
    kind.on("close", code => resolve({ code: code ?? -1, uit, fout }));
  });
}
function stripAnsi(s) { return s.replace(/\x1b\[[0-9;]*m/g, ""); }
function verzamelTests(suites, uit = []) {
  for (const suite of suites || []) {
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        const res = t.results?.[0] || {};
        const foutRuw = res.errors?.[0]?.message || res.error?.message || "";
        const fout = foutRuw ? stripAnsi(foutRuw) : "";
        const vMatch = fout.match(/Expected(?:\s+string)?:\s*(.+)/);
        const rMatch = fout.match(/Received(?:\s+string)?:\s*(.+)/);
        uit.push({
          titel: spec.title,
          status: res.status || "unknown",
          duurMs: Math.round(res.duration || 0),
          verwacht: vMatch ? vMatch[1].trim().replace(/^"|"$/g, "") : null,
          werkelijk: rMatch ? rMatch[1].trim().replace(/^"|"$/g, "") : null,
          fout
        });
      }
    }
    if (suite.suites) verzamelTests(suite.suites, uit);
  }
  return uit;
}
function vatPlaywrightSamen(uit, code) {
  const g = (uit.match(/(\d+)\s+passed/) || [])[1];
  const f = (uit.match(/(\d+)\s+failed/) || [])[1];
  const delen = [];
  if (g) delen.push(`${g} geslaagd`);
  if (f) delen.push(`${f} gefaald`);
  if (delen.length) return delen.join(", ");
  return code === 0 ? "geen tests" : "fout bij draaien";
}
app.post("/api/push", async (req, res) => {
  if (lokaal) {
    const { code, uit, fout } = await draaiPlaywright();
    toonStandaardRapport = false;
    const samenvatting = vatPlaywrightSamen(uit, code);
    console.log(`Playwright-run klaar (exit ${code}): ${samenvatting}`);
    if (uit) console.log(uit.trim());
    if (fout) console.error(fout.trim());
    const output = (uit + (fout ? "\n" + fout : "")).trim();
    const rapportUrl = existsSync(rapportJson) ? "/rapport-eigen" : (existsSync(rapportIndex) ? "/rapport/" : null);
    const ok = code === 0;
    return res.json({ ok, bericht: `Lokaal getest — ${samenvatting}`, output, rapportUrl });
  }
  const bericht = String(req.body?.bericht || "").trim().slice(0, 200)
    || `Wijziging via demo op ${new Date().toLocaleString("nl-NL")}`;
  try {
    await git("add", "-A");
    const status = await git("status", "--porcelain");
    if (!status) return res.json({ ok: true, bericht: "Niets om te committen" });
    await git("-c", "user.email=opendag@example.nl", "-c", "user.name=Open dag demo", "commit", "-m", bericht);
    await git("push");
    laatste = { commit: null, tijd: new Date().toISOString(), fout: null };
    res.json({ ok: true, bericht: `Gecommit en gepusht: "${bericht}"` });
  } catch (e) {
    const fout = (e.stderr || e.stdout || e.message).toString().trim();
    laatste = { ...laatste, fout };
    res.status(500).json({ ok: false, fout });
  }
});
app.get("/reset", (req, res) => res.sendFile("reset.html", { root: publiek }));
app.get("/config", (req, res) => res.sendFile("config.html", { root: publiek }));
app.get("/rapport-eigen", (req, res) => res.sendFile("rapport.html", { root: publiek }));
app.get("/api/rapport-data", (req, res) => {
  res.set("Cache-Control", "no-store");
  if (toonStandaardRapport) return res.json({ ...STANDAARD_RAPPORT, standaard: true });
  try {
    const data = JSON.parse(readFileSync(rapportJson, "utf8"));
    res.json({
      tijd: data.stats?.startTime || null,
      duurMs: data.stats?.duration || 0,
      tests: verzamelTests(data.suites)
    });
  } catch {
    res.status(404).json({ fout: "Geen testrapport gevonden" });
  }
});
app.use("/rapport", express.static(rapportMap, { etag: false, lastModified: false, setHeaders: res => res.set("Cache-Control", "no-store") }));
app.use(express.static(publiek));

/* ---------- Start ---------- */
try {
  const opSchijf = JSON.parse(readFileSync(configOpSchijf, "utf8"));
  huidig = valideer({ ...STANDAARD, ...opSchijf });
  console.log("Config geladen uit public/config.json.");
} catch {
  console.log("Geen bruikbare public/config.json, standaardconfig gebruikt.");
}
app.listen(PORT, () => console.log(`Actiepagina draait op http://localhost:${PORT} (${lokaal ? "offline" : "online"}-modus).`));
