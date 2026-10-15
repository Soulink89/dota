// Dati finti per provare la grafica quando OpenDota non risponde (aprire il sito con ?demo).
window.TribunaleDemo = {
  make(id, days) {
    let seed = Number(id) % 2147483647 || 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const heroes = [14, 14, 14, 74, 8, 44, 106, 2, 129, 35, 86, 26];
    const now = Math.floor(Date.now() / 1000);
    const matches = Array.from({ length: 14 }, (_, i) => {
      const deaths = Math.floor(rnd() * 15);
      return {
        match_id: 8000000000 + i,
        hero_id: pick(heroes),
        kills: Math.floor(rnd() * 16),
        deaths,
        assists: Math.floor(rnd() * 22),
        duration: 1200 + Math.floor(rnd() * 3000),
        start_time: now - Math.floor(rnd() * days * 86400),
        player_slot: rnd() > 0.5 ? 1 : 130,
        radiant_win: rnd() > 0.55,
        game_mode: rnd() > 0.8 ? 23 : 22,
        lobby_type: 7,
        last_hits: Math.floor(rnd() * 320),
        gold_per_min: 250 + Math.floor(rnd() * 450),
        xp_per_min: 300 + Math.floor(rnd() * 500),
        hero_damage: 5000 + Math.floor(rnd() * 40000),
        tower_damage: Math.floor(rnd() * 8000),
        hero_healing: 0,
        party_size: 1,
      };
    }).sort((a, b) => b.start_time - a.start_time);
    return {
      source: "demo",
      fetchedAt: Date.now(),
      profile: {
        profile: { account_id: Number(id), personaname: "Giocatore Demo", avatarfull: "", last_login: null },
        rank_tier: 54,
        leaderboard_rank: null,
      },
      wl: { win: 1520, lose: 1498 },
      matches,
    };
  },
};
