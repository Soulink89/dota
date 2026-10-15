// Scarica le statistiche degli ultimi N giorni di ogni giocatore e le salva in data/<account_id>.json.
// Gira in automatico su GitHub Actions (vedi .github/workflows/snapshot.yml). Richiede Node 18+.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import vm from "node:vm";

const OD = "https://api.opendota.com/api";
const FIELDS = ["hero_id", "kills", "deaths", "assists", "duration", "start_time", "player_slot", "radiant_win",
  "game_mode", "lobby_type", "last_hits", "gold_per_min", "xp_per_min", "hero_damage", "tower_damage", "hero_healing", "party_size"];

const ctx = { window: {} };
vm.runInNewContext(await readFile(new URL("../js/config.js", import.meta.url), "utf8"), ctx);
const cfg = ctx.window.TRIBUNALE_CONFIG;
const days = cfg.days || 7;

async function getJSON(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((res) => setTimeout(res, 5000 * i));
    }
  }
}

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
let failures = 0;
for (const p of cfg.players) {
  const id = String(BigInt(p.steam64) - 76561197960265728n);
  try {
    const proj = FIELDS.map((f) => "project=" + f).join("&");
    const profile = await getJSON(`${OD}/players/${id}`);
    const matches = await getJSON(`${OD}/players/${id}/matches?date=${days}&${proj}`);
    const wl = await getJSON(`${OD}/players/${id}/wl`).catch(() => null);
    const out = { profile, matches, wl, fetchedAt: Date.now() };
    await writeFile(new URL(`../data/${id}.json`, import.meta.url), JSON.stringify(out));
    console.log(`✔ ${profile?.profile?.personaname ?? id}: ${matches.length} partite`);
  } catch (e) {
    failures++;
    console.error(`✘ ${id}: ${e.message} (tengo il file precedente)`);
  }
}
if (failures === cfg.players.length) process.exitCode = 1;
