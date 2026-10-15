// Recupero dati: snapshot statico (data/<id>.json) -> OpenDota live -> cache locale.
(function () {
  const OD = "https://api.opendota.com/api";
  const HEROES_URL = "https://cdn.jsdelivr.net/npm/dotaconstants@latest/build/heroes.json";
  const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com";
  const STEAM64_BASE = 76561197960265728n;
  const SNAPSHOT_FRESH_MS = 3 * 60 * 60 * 1000;

  const MATCH_FIELDS = [
    "hero_id", "kills", "deaths", "assists", "duration", "start_time",
    "player_slot", "radiant_win", "game_mode", "lobby_type", "last_hits",
    "gold_per_min", "xp_per_min", "hero_damage", "tower_damage", "hero_healing", "party_size",
  ];

  const toAccountId = (steam64) => String(BigInt(steam64) - STEAM64_BASE);

  async function getJSON(url, timeout = 15000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } finally {
      clearTimeout(t);
    }
  }

  const cacheKey = (id) => "tribunale:" + id;
  function readCache(id) {
    try { return JSON.parse(localStorage.getItem(cacheKey(id))); } catch { return null; }
  }
  function writeCache(id, data) {
    try { localStorage.setItem(cacheKey(id), JSON.stringify(data)); } catch {}
  }

  async function fetchLive(id, days) {
    const proj = MATCH_FIELDS.map((f) => "project=" + f).join("&");
    const [profile, matches, wl] = await Promise.all([
      getJSON(`${OD}/players/${id}`),
      getJSON(`${OD}/players/${id}/matches?date=${days}&${proj}`),
      getJSON(`${OD}/players/${id}/wl`).catch(() => null),
    ]);
    return { profile, matches, wl, fetchedAt: Date.now() };
  }

  async function fetchSnapshot(id) {
    try { return await getJSON(`data/${id}.json?t=${Math.floor(Date.now() / 600000)}`, 8000); }
    catch { return null; }
  }

  // Restituisce { profile, matches, wl, fetchedAt, source: 'live'|'snapshot'|'cache'|'demo' }
  async function loadPlayer(id, days) {
    if (new URLSearchParams(location.search).has("demo")) return window.TribunaleDemo.make(id, days);

    const snap = await fetchSnapshot(id);
    if (snap && Date.now() - snap.fetchedAt < SNAPSHOT_FRESH_MS) return { ...snap, source: "snapshot" };

    try {
      const live = await fetchLive(id, days);
      writeCache(id, live);
      return { ...live, source: "live" };
    } catch (err) {
      const cached = readCache(id);
      const best = [snap, cached].filter(Boolean).sort((a, b) => b.fetchedAt - a.fetchedAt)[0];
      if (best) return { ...best, source: best === snap ? "snapshot" : "cache", stale: true };
      throw err;
    }
  }

  let heroesPromise;
  function loadHeroes() {
    heroesPromise ??= getJSON(HEROES_URL, 20000).catch(() => ({}));
    return heroesPromise;
  }

  window.TribunaleAPI = {
    toAccountId,
    loadPlayer,
    loadHeroes,
    heroImg: (hero) => (hero?.img ? STEAM_CDN + hero.img.replace(/\?$/, "") : ""),
    heroIcon: (hero) => (hero?.icon ? STEAM_CDN + hero.icon.replace(/\?$/, "") : ""),
    rankIcon: (tier) => `https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_${tier}.png`,
    rankStar: (star) => `https://www.opendota.com/assets/images/dota2/rank_icons/rank_star_${star}.png`,
  };
})();
