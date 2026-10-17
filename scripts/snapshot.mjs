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

// del profilo pubblichiamo solo lo stretto necessario (niente storico dei nickname ecc.)
const slim = (pr) => pr && ({ profile: { account_id: pr.profile?.account_id, personaname: pr.profile?.personaname, avatarfull: pr.profile?.avatarfull, steamid: pr.profile?.steamid }, rank_tier: pr.rank_tier ?? null, leaderboard_rank: pr.leaderboard_rank ?? null });

// Chiede a OpenDota di ri-scaricare da Steam le partite recenti di ogni giocatore, così il sito
// (che legge OpenDota in diretta) vede subito le partite nuove. Dal browser non è permesso, da qui sì.
for (const p of cfg.players) {
  const id = String(BigInt(p.steam64) - 76561197960265728n);
  try {
    const r = await fetch(`${OD}/players/${id}/refresh`, { method: "POST", signal: AbortSignal.timeout(20000) });
    console.log(`↻ refresh ${p.alias ?? id}: HTTP ${r.status}`);
  } catch (e) {
    console.error(`↻ refresh ${p.alias ?? id}: ${e.message}`);
  }
}
// lascia a OpenDota il tempo di elaborare le richieste prima di leggere i dati
await new Promise((res) => setTimeout(res, 60000));
let failures = 0;
const friendMatches = []; // partite in gruppo dei giocatori visibili, per ricostruire quelle dei giocatori "nascosti"
for (const p of cfg.players) {
  const id = String(BigInt(p.steam64) - 76561197960265728n);
  try {
    const proj = FIELDS.map((f) => "project=" + f).join("&");
    const profile = await getJSON(`${OD}/players/${id}`);
    const matches = await getJSON(`${OD}/players/${id}/matches?date=${days}&${proj}`);
    const wl = await getJSON(`${OD}/players/${id}/wl`).catch(() => null);
    const out = { profile: slim(profile), matches, wl, fetchedAt: Date.now() };
    for (const m of matches) if (m.party_size > 1) friendMatches.push(m);
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

// ---------- Giocatori con le partite nascoste (persona.friendsScan) ----------
// Chi ha disattivato "Expose Public Match Data" non ha uno storico su OpenDota, ma nei dettagli delle
// partite il suo account compare lo stesso. Guardiamo le partite in gruppo degli amici visibili e
// ritagliamo le sue righe. Ogni partita viene aperta una sola volta (archivio in data/scan-cache.json).
const targets = cfg.players.filter((p) => p.persona?.friendsScan).map((p) => ({ p, id: Number(BigInt(p.steam64) - 76561197960265728n) }));
if (targets.length) {
  const cacheUrl = new URL("../data/scan-cache.json", import.meta.url);
  let cache = {};
  try { cache = JSON.parse(await readFile(cacheUrl, "utf8")); } catch {}
  const cutoff = Date.now() / 1000 - days * 86400;
  const candidates = [...new Map(friendMatches.filter((m) => m.start_time >= cutoff).map((m) => [m.match_id, m])).values()]
    .filter((m) => !cache[m.match_id]).sort((a, b) => b.start_time - a.start_time);
  const MAX_PER_RUN = 40; // resta sotto il limite di 60 richieste al minuto di OpenDota
  let opened = 0;
  for (const m of candidates.slice(0, MAX_PER_RUN)) {
    try {
      const d = await getJSON(`${OD}/matches/${m.match_id}`);
      const found = {};
      for (const t of targets) {
        const pl = (d.players || []).find((x) => x.account_id === t.id);
        if (!pl) continue;
        const partySize = pl.party_id != null ? d.players.filter((x) => x.party_id === pl.party_id).length : null;
        found[t.id] = {
          match_id: d.match_id, start_time: d.start_time, duration: d.duration, radiant_win: d.radiant_win,
          game_mode: d.game_mode, lobby_type: d.lobby_type, player_slot: pl.player_slot, hero_id: pl.hero_id,
          kills: pl.kills, deaths: pl.deaths, assists: pl.assists, last_hits: pl.last_hits, gold_per_min: pl.gold_per_min,
          xp_per_min: pl.xp_per_min, hero_damage: pl.hero_damage, tower_damage: pl.tower_damage, hero_healing: pl.hero_healing,
          leaver_status: pl.leaver_status, lane_role: pl.lane_role ?? null, party_size: partySize, rank_tier: pl.rank_tier ?? null,
        };
      }
      cache[m.match_id] = { t: d.start_time, found };
      opened++;
    } catch (e) {
      console.error(`✘ partita ${m.match_id}: ${e.message}`);
    }
    await new Promise((res) => setTimeout(res, 1100));
  }
  // l'archivio tiene solo le partite dell'ultimo mese
  for (const [k, v] of Object.entries(cache)) if (v.t < Date.now() / 1000 - 30 * 86400) delete cache[k];
  await writeFile(cacheUrl, JSON.stringify(cache));
  console.log(`🔎 partite degli amici aperte: ${opened} (ne restano ${Math.max(0, candidates.length - opened)})`);

  for (const t of targets) {
    const matches = Object.values(cache).map((v) => v.found[t.id]).filter((x) => x && x.start_time >= cutoff)
      .sort((a, b) => b.start_time - a.start_time);
    let profile = null;
    try { profile = await getJSON(`${OD}/players/${t.id}`); } catch {}
    const latestRank = matches.find((x) => x.rank_tier)?.rank_tier ?? null;
    const out = { profile: slim(profile), matches, wl: null, fetchedAt: Date.now(), source: "friends", rankFromMatches: latestRank };
    await writeFile(new URL(`../data/${t.id}.json`, import.meta.url), JSON.stringify(out));
    console.log(`✔ ${t.p.alias}: ${matches.length} partite ricostruite dagli amici, rango ${latestRank ?? "?"}`);
  }
}
