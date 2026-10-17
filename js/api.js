// Recupero dati: snapshot statico (data/<id>.json) -> OpenDota live -> cache locale.
(function () {
  const OD = "https://api.opendota.com/api";
  const HEROES_URL = "https://cdn.jsdelivr.net/npm/dotaconstants@latest/build/heroes.json";
  const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com";
  const STEAM64_BASE = 76561197960265728n;

  const MATCH_FIELDS = [
    "hero_id", "kills", "deaths", "assists", "duration", "start_time",
    "player_slot", "radiant_win", "game_mode", "lobby_type", "last_hits",
    "gold_per_min", "xp_per_min", "hero_damage", "tower_damage", "hero_healing", "party_size", "lane_role", "leaver_status",
  ];

  const toAccountId = (steam64) => String(BigInt(steam64) - STEAM64_BASE);

  async function getJSON(url, timeout = 15000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(url, { signal: ctrl.signal, cache: "no-store" }); // niente cache del browser: dati sempre attuali
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

  async function fetchLive(id, days, timeout = 15000) {
    const proj = MATCH_FIELDS.map((f) => "project=" + f).join("&");
    const [profile, matches, wl] = await Promise.all([
      getJSON(`${OD}/players/${id}`, timeout),
      getJSON(`${OD}/players/${id}/matches?date=${days}&${proj}`, timeout),
      getJSON(`${OD}/players/${id}/wl`, timeout).catch(() => null),
    ]);
    return { profile, matches, wl, fetchedAt: Date.now() };
  }

  async function fetchSnapshot(id) {
    try { return await getJSON(`data/${id}.json?t=${Date.now()}`, 8000); }
    catch { return null; }
  }

  // OpenDota permette 60 richieste al minuto: per non superarle, i dati scaricati da meno di
  // LIVE_TTL vengono riusati (restano comunque attuali), quelli quasi fissi per SLOW_TTL.
  const LIVE_TTL = 5 * 60 * 1000, SLOW_TTL = 6 * 60 * 60 * 1000;
  async function cachedJSON(key, ttl, fn) {
    try {
      const c = JSON.parse(localStorage.getItem("tribunale:c:" + key));
      if (c && Date.now() - c.t < ttl) return c.v;
    } catch {}
    const v = await fn();
    try { localStorage.setItem("tribunale:c:" + key, JSON.stringify({ t: Date.now(), v })); } catch {}
    return v;
  }

  // Restituisce { profile, matches, wl, fetchedAt, source: 'live'|'snapshot'|'cache'|'demo' }
  // Prima sempre i dati in diretta da OpenDota (al massimo di 5 minuti fa); la copia salvata dallo
  // script automatico e la cache più vecchia servono solo se OpenDota non risponde.
  async function loadPlayer(id, days) {
    if (new URLSearchParams(location.search).has("demo")) return window.TribunaleDemo.make(id, days);
    const recent = readCache(id);
    if (recent && Date.now() - recent.fetchedAt < LIVE_TTL) return { ...recent, source: "live" };
    let err;
    for (const timeout of [15000, 25000]) {
      try {
        const live = await fetchLive(id, days, timeout);
        writeCache(id, live);
        return { ...live, source: "live" };
      } catch (e) {
        err = e;
        if (/HTTP 429/.test(e.message)) break; // troppe richieste: inutile riprovare subito
      }
    }
    const [snap, cached] = [await fetchSnapshot(id), readCache(id)];
    const best = [snap, cached].filter(Boolean).sort((a, b) => b.fetchedAt - a.fetchedAt)[0];
    if (best) return { ...best, source: best === snap ? "snapshot" : "cache", stale: true };
    throw err;
  }

  // Inventario Dota 2: Steam non permette di leggerlo dal browser, quindi lo salva lo script
  // automatico (scripts/snapshot.mjs) in data/inventory-<id>.json
  const loadInventory = (id) => getJSON(`data/inventory-${id}.json?t=${Date.now()}`, 8000).catch(() => null);
  // partite di carriera per eroe (per sapere quanto gioca gli eroi di cui ha l'arcana)
  const loadLifetimeHeroes = (id) => cachedJSON("heroes:" + id, SLOW_TTL, () => getJSON(`${OD}/players/${id}/heroes`, 20000)).catch(() => null);

  // Monumento (persona.mode = "legend"): dati di carriera per chi non gioca più (cambiano di rado)
  async function loadLegend(id) {
    return cachedJSON("legend:" + id, SLOW_TTL, async () => {
      const [recent, heroes, totals] = await Promise.all([
        getJSON(`${OD}/players/${id}/recentMatches`, 20000),
        getJSON(`${OD}/players/${id}/heroes`, 20000),
        getJSON(`${OD}/players/${id}/totals`, 20000),
      ]);
      const tot = (k) => totals.find((t) => t.field === k)?.sum ?? 0;
      return {
        lastMatch: recent[0] ? recent[0].start_time + recent[0].duration : null,
        heroes: heroes.filter((h) => h.games > 0).sort((a, b) => b.games - a.games).slice(0, 5),
        kills: tot("kills"), deaths: tot("deaths"), assists: tot("assists"), lastHits: tot("last_hits"), seconds: tot("duration"),
      };
    }).catch(() => ({}));
  }

  let heroesPromise;
  function loadHeroes() {
    heroesPromise ??= getJSON(HEROES_URL, 20000).catch(() => ({})).then((heroes) => {
      // nomi ufficiali in cinese, se disponibili
      for (const [id, zh] of Object.entries(window.HERO_NAMES_ZH || {})) if (heroes[id]) heroes[id].localized_name = zh;
      return heroes;
    });
    return heroesPromise;
  }

  window.TribunaleAPI = {
    toAccountId,
    loadPlayer,
    loadHeroes,
    loadInventory,
    loadLifetimeHeroes,
    loadLegend,
    itemImg: (icon) => `https://community.cloudflare.steamstatic.com/economy/image/${icon}/256fx192f`,
    heroImg: (hero) => (hero?.img ? STEAM_CDN + hero.img.replace(/\?$/, "") : ""),
    heroIcon: (hero) => (hero?.icon ? STEAM_CDN + hero.icon.replace(/\?$/, "") : ""),
    rankIcon: (tier) => `https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_${tier}.png`,
    rankStar: (star) => `https://www.opendota.com/assets/images/dota2/rank_icons/rank_star_${star}.png`,
  };
})();
