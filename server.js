// Open dag demo: serveert de actiepagina en commit + pusht elke wijziging naar GitHub.
import express from "express";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const draaiGit = promisify(execFile);

const {
  GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO,
  GITHUB_BRANCH = "main", CONFIG_PATH = "public/config.json", PORT = 3000,
  LOCAL_ONLY
} = process.env;
const lokaal = LOCAL_ONLY === "true";

if (!lokaal && (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO)) {
  console.error("Vul GITHUB_TOKEN, GITHUB_OWNER en GITHUB_REPO in het .env-bestand in, of zet LOCAL_ONLY=true.");
  process.exit(1);
}

const STANDAARD = JSON.parse(readFileSync(new URL("./standaard-config.json", import.meta.url), "utf8"));
const API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${CONFIG_PATH}`;
const HEADERS = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "opendag-demo"
};

/* ---------- Toegestane invoer: alleen deze velden, met deze regels ---------- */
// Inhoudelijk "foute" waarden (150% korting, gele tekst op wit) mogen juist wél:
// daar moeten de tests op falen. Alleen vorm en lengte worden bewaakt.
const tekst = max => v => typeof v === "string" && v.length <= max ? v.replace(/[\u0000-\u001f\u007f]/g, "") : undefined;
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

/* ---------- GitHub ---------- */
async function haalOp() {
  const r = await fetch(`${API}?ref=${encodeURIComponent(GITHUB_BRANCH)}`, { headers: HEADERS });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub GET ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return { sha: data.sha, config: JSON.parse(Buffer.from(data.content, "base64").toString("utf8")) };
}
async function schrijf(cfg, bericht, sha) {
  const r = await fetch(API, {
    method: "PUT",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: bericht,
      content: Buffer.from(JSON.stringify(cfg, null, 2) + "\n", "utf8").toString("base64"),
      branch: GITHUB_BRANCH,
      committer: { name: "Open dag bezoeker", email: "opendag@example.nl" },
      ...(sha ? { sha } : {})
    })
  });
  if (!r.ok) { const e = new Error(`GitHub PUT ${r.status}: ${await r.text()}`); e.status = r.status; throw e; }
  return r.json();
}

/* ---------- Toestand en wachtrij ---------- */
let huidig = structuredClone(STANDAARD);   // wat de pagina toont
let gepusht = structuredClone(STANDAARD);  // wat er laatst op GitHub staat
let sha = null;
let wachtend = null;                       // { cfg, bericht? }
let bezig = false;
let laatste = { commit: null, tijd: null, fout: null };

function beschrijfVerschil(oud, nieuw) {
  const delen = [];
  for (const k of Object.keys(nieuw))
    for (const p of Object.keys(nieuw[k]))
      if (oud?.[k]?.[p] !== nieuw[k][p]) delen.push(`${k}.${p} → ${String(nieuw[k][p]).slice(0, 40)}`);
  return delen.length ? `Bezoeker wijzigt ${delen.join(", ")}` : null;
}

async function verwerk() {
  if (bezig) return;
  bezig = true;
  while (wachtend) {
    const { cfg, bericht } = wachtend;
    wachtend = null;
    const msg = bericht || beschrijfVerschil(gepusht, cfg);
    if (!msg) continue;                    // niets veranderd ten opzichte van GitHub
    try {
      let res;
      try { res = await schrijf(cfg, msg, sha); }
      catch (e) {
        if (e.status !== 409 && e.status !== 422) throw e;
        sha = (await haalOp())?.sha ?? null; // iemand anders pushte: nieuwste sha ophalen en opnieuw
        res = await schrijf(cfg, msg, sha);
      }
      sha = res.content.sha;
      gepusht = cfg;
      laatste = { commit: res.commit.sha, tijd: new Date().toISOString(), fout: null };
      console.log(`✔ ${res.commit.sha.slice(0, 7)} ${msg}`);
    } catch (e) {
      laatste = { ...laatste, fout: e.message };
      console.error("✖ Push mislukt:", e.message);
    }
  }
  bezig = false;
}
function zetInWachtrij(cfg, bericht) {
  if (lokaal) { gepusht = cfg; laatste = { commit: null, tijd: new Date().toISOString(), fout: null }; return; }
  wachtend = { cfg, bericht }; verwerk();
}

/* ---------- Webserver ---------- */
const app = express();
app.use(express.json({ limit: "10kb" }));

app.get("/config.json", (req, res) => { res.set("Cache-Control", "no-store"); res.json(huidig); });

app.post("/api/config", (req, res) => {
  try {
    huidig = valideer(req.body);
    zetInWachtrij(huidig);
    res.status(202).json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, fout: e.message });
  }
});

app.post("/api/reset", (req, res) => {
  huidig = structuredClone(STANDAARD);
  zetInWachtrij(huidig, "Reset naar de standaardinstellingen");
  res.json({ ok: true });
});

app.get("/api/status", (req, res) => res.json({ bezig: bezig || !!wachtend, ...laatste }));

const publiek = fileURLToPath(new URL("./public", import.meta.url));
const projectmap = fileURLToPath(new URL(".", import.meta.url));
const configOpSchijf = fileURLToPath(new URL("./public/config.json", import.meta.url));
async function git(...args) {
  const { stdout, stderr } = await draaiGit("git", args, { cwd: projectmap });
  return (stdout + stderr).trim();
}
app.post("/api/push", async (req, res) => {
  const bericht = String(req.body?.bericht || "").trim().slice(0, 200)
    || `Wijziging via demo op ${new Date().toLocaleString("nl-NL")}`;
  try {
    writeFileSync(configOpSchijf, JSON.stringify(huidig, null, 2) + "\n");
    await git("add", "-A");
    const status = await git("status", "--porcelain");
    if (!status) return res.json({ ok: true, bericht: "Niets om te committen" });
    await git("-c", "user.email=opendag@example.nl", "-c", "user.name=Open dag demo", "commit", "-m", bericht);
    await git("push");
    res.json({ ok: true, bericht: `Gecommit en gepusht: "${bericht}"` });
  } catch (e) {
    res.status(500).json({ ok: false, fout: (e.stderr || e.stdout || e.message).toString().trim() });
  }
});
app.get("/reset", (req, res) => res.sendFile("reset.html", { root: publiek }));
app.use(express.static(publiek));

/* ---------- Start ---------- */
if (lokaal) {
  try {
    const opSchijf = JSON.parse(readFileSync(configOpSchijf, "utf8"));
    huidig = valideer({ ...STANDAARD, ...opSchijf });
    gepusht = structuredClone(huidig);
    console.log("LOCAL_ONLY: config geladen uit public/config.json.");
  } catch {
    console.log("LOCAL_ONLY: geen bruikbare public/config.json, standaardconfig gebruikt.");
  }
} else {
  try {
    const opGitHub = await haalOp();
    if (opGitHub) {
      huidig = valideer({ ...STANDAARD, ...opGitHub.config });
      gepusht = structuredClone(huidig);
      sha = opGitHub.sha;
      console.log(`Config geladen uit ${GITHUB_OWNER}/${GITHUB_REPO}/${CONFIG_PATH}`);
    } else {
      console.log("Nog geen config in de repo, standaardconfig wordt gepusht.");
      gepusht = null;
      zetInWachtrij(huidig, "Eerste versie van de actiepagina");
    }
  } catch (e) {
    console.error("Kon config niet ophalen van GitHub:", e.message);
    process.exit(1);
  }
}
app.listen(PORT, () => console.log(`Actiepagina draait op http://localhost:${PORT}`));
