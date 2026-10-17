// Scarica le statistiche degli ultimi N giorni di ogni giocatore e le salva in data/<account_id>.json.
// Gira in automatico su GitHub Actions (vedi .github/workflows/snapshot.yml). Richiede Node 18+.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import vm from "node:vm";

const OD = "https://api.opendota.com/api";
const FIELDS = ["hero_id", "kills", "deaths", "assists", "duration", "start_time", "player_slot", "radiant_win",
  "game_mode", "lobby_type", "last_hits", "gold_per_min", "xp_per_min", "hero_damage", "tower_damage", "hero_healing", "party_size", "lane_role", "leaver_status"];

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
  // inventario Dota 2 (至宝仓库): il browser non può leggerlo da Steam, quindi lo salviamo qui
  if (p.persona?.inventory) {
    try {
      const inv = await getJSON(`https://steamcommunity.com/inventory/${p.steam64}/570/2?l=schinese&count=2000`);
      const tag = (d, cat) => (d.tags || []).find((t) => t.category === cat)?.localized_tag_name;
      const descs = inv.descriptions || [];
      const rarity = {};
      for (const a of inv.assets || []) {
        const d = descs.find((x) => x.classid === a.classid && x.instanceid === a.instanceid);
        const r = (d && tag(d, "Rarity")) || "其他";
        rarity[r] = (rarity[r] || 0) + 1;
      }
      const arcana = descs.filter((d) => /至宝/.test(tag(d, "Rarity") || ""))
        .map((d) => ({ name: d.market_name || d.name, hero: tag(d, "Hero") || null, icon: d.icon_url }));
      const out = { fetchedAt: Date.now(), total: inv.total_inventory_count, rarity, arcana };
      await writeFile(new URL(`../data/inventory-${id}.json`, import.meta.url), JSON.stringify(out));
      console.log(`✔ inventario ${id}: ${out.total} oggetti, ${arcana.length} 至宝`);
    } catch (e) {
      console.error(`✘ inventario ${id}: ${e.message} (tengo il file precedente)`);
    }
  }
}
if (failures === cfg.players.length) process.exitCode = 1;
