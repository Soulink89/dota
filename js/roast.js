// Statistiche della settimana + motore delle battute.
(function () {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ""));
  const isWin = (m) => (m.player_slot < 128) === m.radiant_win;
  const kdaOf = (m) => (m.kills + m.assists) / Math.max(1, m.deaths);
  const mins = (s) => Math.round(s / 60);

  function computeStats(matches, days) {
    const cutoff = Date.now() / 1000 - days * 86400;
    const ms = (matches || [])
      .filter((m) => m.start_time >= cutoff)
      .sort((a, b) => b.start_time - a.start_time)
      .map((m) => ({ ...m, win: isWin(m), kda: kdaOf(m) }));
    const n = ms.length;
    const sum = (f) => ms.reduce((t, m) => t + (f(m) || 0), 0);
    const wins = ms.filter((m) => m.win).length;

    const byHero = {};
    for (const m of ms) {
      const h = (byHero[m.hero_id] ??= { hero_id: m.hero_id, games: 0, wins: 0, k: 0, d: 0, a: 0 });
      h.games++; h.wins += m.win; h.k += m.kills; h.d += m.deaths; h.a += m.assists;
    }
    const heroes = Object.values(byHero).sort((a, b) => b.games - a.games || b.wins - a.wins);

    // streak attuale (dalla partita più recente)
    let streak = 0;
    for (const m of ms) { if (m.win === ms[0].win) streak++; else break; }
    // streak di sconfitte più lunga
    let worstRun = 0, run = 0;
    for (const m of [...ms].reverse()) { run = m.win ? 0 : run + 1; worstRun = Math.max(worstRun, run); }

    const maxBy = (f) => ms.reduce((b, m) => (b == null || f(m) > f(b) ? m : b), null);
    const minBy = (f) => ms.reduce((b, m) => (b == null || f(m) < f(b) ? m : b), null);

    return {
      matches: ms, n, wins, losses: n - wins,
      wr: n ? (wins / n) * 100 : 0,
      kills: sum((m) => m.kills), deaths: sum((m) => m.deaths), assists: sum((m) => m.assists),
      avgKda: n ? (sum((m) => m.kills) + sum((m) => m.assists)) / Math.max(1, sum((m) => m.deaths)) : 0,
      avgDeaths: n ? sum((m) => m.deaths) / n : 0,
      avgGpm: n ? sum((m) => m.gold_per_min) / n : 0,
      avgXpm: n ? sum((m) => m.xp_per_min) / n : 0,
      avgLh: n ? sum((m) => m.last_hits) / n : 0,
      hours: sum((m) => m.duration) / 3600,
      heroes, streak, streakWin: n ? ms[0].win : null, worstRun,
      mostDeaths: maxBy((m) => m.deaths),
      bestGame: maxBy((m) => m.kda + (m.win ? 2 : 0)),
      worstGame: minBy((m) => m.kda - (m.win ? 2 : 0)),
      longest: maxBy((m) => m.duration),
      shortestLoss: minBy((m) => (m.win ? 1e9 : m.duration)),
      lateNight: ms.filter((m) => { const h = new Date(m.start_time * 1000).getHours(); return h >= 1 && h < 6; }),
      turbo: ms.filter((m) => m.game_mode === 23).length,
      lowestGpm: minBy((m) => m.gold_per_min ?? 9999),
      zeroKill: ms.filter((m) => m.kills === 0).length,
    };
  }

  // ---------- Pagella ----------
  function verdict(s) {
    if (!s.n) return { voto: null, label: "N.C.", text: "Non classificato. Assente ingiustificato: o ha toccato l'erba, o ha cambiato account." };
    let v = 6 + (s.wr - 50) / 9 + (s.avgKda - 2.6) * 0.7 - Math.max(0, s.avgDeaths - 8) * 0.25;
    v = Math.max(1, Math.min(10, Math.round(v * 2) / 2));
    const lines =
      v <= 3 ? ["Gravemente insufficiente. Convocare i genitori.", "Bocciato. Ci vediamo a settembre, forse.", "Prestazione da segnalare all'Interpol."]
      : v <= 5 ? ["Insufficiente. Si impegna, ma non si applica.", "Rimandato. Ripassare il capitolo 'non morire'.", "Ha del potenziale. Ben nascosto."]
      : v <= 6.5 ? ["Sufficiente. Il minimo sindacale, come il suo warding.", "Sei politico. Né carne né Roshan.", "Passa, ma solo perché il prof è stanco."]
      : v <= 8 ? ["Buono. Comincia a sembrare un giocatore vero.", "Bravo. Sospetto aiuti da casa.", "Promosso con merito. Chi gli ha preso l'account?"]
      : ["Eccellente. Avviata indagine per smurfing.", "Dieci e lode. Torna nel tuo bracket, pro.", "Prestazione illegale in 14 paesi."];
    return { voto: v, label: String(v).replace(".5", "½"), text: pick(lines) };
  }

  // ---------- Battute specifiche per eroe ----------
  const HERO_JOKES = {
    14: ["Pudge di nuovo. Gli hook che prende sono meno dei pasti saltati.", "Fresh meat? No, carne surgelata dal 2013."],
    74: ["Invoker: 10 spell disponibili, ne usa 2. Efficienza italiana."],
    105: ["Techies. Il tribunale si rifiuta di commentare. Si procede d'ufficio."],
    8: ["Juggernaut: spin to win. Più spesso spin to lose."],
    44: ["Phantom Assassin: punta tutto sul crit. Come col fantacalcio."],
    2: ["Axe: Berserker's Call, poi corsa verso la fontana. Nemica."],
    35: ["Sniper: gioca da lontano per non sentire i flame del team."],
    106: ["Ember Spirit: tre remnant, zero idee."],
    129: ["Mars: l'arena serve più a intrappolare i suoi compagni."],
    86: ["Rubick: ruba le spell, mai la vittoria."],
    26: ["Lion: Finger of Death. Più spesso Finger nel naso."],
    1: ["Anti-Mage: farma 40 minuti, entra in fight a 41, il trono è già esploso."],
    11: ["Shadow Fiend: raze tutte e tre mancate, in fila, con eleganza."],
    19: ["Tiny: toss del compagno dentro la fontana nemica. Assist strategico."],
    41: ["Faceless Void: Chronosphere sui suoi compagni. Grande classico."],
    67: ["Spectre: 'tranquilli che a 50 minuti carico'. Il trono non era d'accordo."],
    114: ["Monkey King: si nasconde da albero. Unico momento utile della partita."],
    93: ["Slark: ruba statistiche agli avversari, non ne ha di proprie."],
  };

  // ---------- Regole delle battute ----------
  // Ogni regola: when(s) -> bool, weight, icon, title, texts[], meme {top,bottom}, heroFrom(s)
  function buildRoasts(s, name, heroes) {
    const H = (id) => heroes[id]?.localized_name || "eroe misterioso";
    const fav = s.heroes[0];
    const v = {
      name, n: s.n, wr: Math.round(s.wr), w: s.wins, l: s.losses,
      hours: s.hours.toFixed(1), deaths: s.deaths, kda: s.avgKda.toFixed(2),
      gpm: Math.round(s.avgGpm), streak: s.streak, worst: s.worstRun,
      favHero: fav ? H(fav.hero_id) : "", favGames: fav?.games,
      md: s.mostDeaths?.deaths, mdHero: s.mostDeaths ? H(s.mostDeaths.hero_id) : "",
      long: s.longest ? mins(s.longest.duration) : 0, longHero: s.longest ? H(s.longest.hero_id) : "",
      sl: s.shortestLoss && !s.shortestLoss.win ? mins(s.shortestLoss.duration) : 0,
      night: s.lateNight.length, turbo: s.turbo, zk: s.zeroKill,
      bk: s.bestGame ? `${s.bestGame.kills}/${s.bestGame.deaths}/${s.bestGame.assists}` : "",
      bkHero: s.bestGame ? H(s.bestGame.hero_id) : "",
      lowGpm: s.lowestGpm?.gold_per_min, lowGpmHero: s.lowestGpm ? H(s.lowestGpm.hero_id) : "",
      nightTime: s.lateNight[0] ? new Date(s.lateNight[0].start_time * 1000).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "",
    };

    const rules = [
      { id: "absent", when: () => s.n === 0, weight: 100, icon: "🌱", title: "Latitante",
        texts: ["{name} non gioca da 7 giorni. Le ipotesi: ha toccato l'erba, ha una ragazza, o l'ha disinstallato piangendo."],
        meme: ["NESSUNA PARTITA IN 7 GIORNI", "SINTOMI DA ASTINENZA IN ARRIVO"] },
      { id: "nolife", when: () => s.n >= 20, weight: 70, icon: "🛌", title: "Erba toccata: zero",
        texts: ["{n} partite in una settimana, {hours} ore. È un lavoro part-time, ma senza stipendio.", "{hours} ore di Dota in 7 giorni. Con lo stesso tempo poteva imparare il cinese. Invece ha imparato a morire in cinese."],
        meme: ["{n} PARTITE IN 7 GIORNI", "IL SOLE? MAI SENTITO"] },
      { id: "grind", when: () => s.n >= 8 && s.n < 20, weight: 30, icon: "⏳", title: "Dipendenza moderata",
        texts: ["{n} partite e {hours} ore questa settimana. Lo stretto indispensabile per non avere una vita sociale."],
        meme: ["SOLO UNA PARTITA", "— {name}, {n} PARTITE FA"] },
      { id: "feeder", when: () => s.mostDeaths?.deaths >= 12, weight: 90, icon: "💀", title: "Abbonato alla fontana",
        texts: ["Con {mdHero} è morto {md} volte in una sola partita. Il courier nemico ormai lo saluta per nome.", "{md} morti con {mdHero}. Non era una partita, era una donazione di oro al team avversario."],
        meme: ["{md} MORTI CON {mdHero}", "NON FEEDO, FACCIO BENEFICENZA"], hero: () => s.mostDeaths.hero_id },
      { id: "deaths", when: () => s.avgDeaths >= 8, weight: 60, icon: "⚰️", title: "Statistica morti",
        texts: ["{deaths} morti totali in settimana. Il pulsante 'buyback' ha l'impronta digitale consumata."],
        meme: ["{deaths} MORTI IN UNA SETTIMANA", "IL RESPAWN TIMER È CASA MIA"] },
      { id: "losestreak", when: () => s.worstRun >= 4, weight: 85, icon: "📉", title: "Tracollo in borsa",
        texts: ["{worst} sconfitte di fila. Nemmeno il Monte dei Paschi ha avuto un andamento così.", "Serie di {worst} sconfitte consecutive. A un certo punto bisogna chiedersi se il problema sono davvero i compagni."],
        meme: ["{worst} SCONFITTE DI FILA", "È COLPA DEL MATCHMAKING"] },
      { id: "hotstreak", when: () => s.streakWin && s.streak >= 4, weight: 75, icon: "🔥", title: "In fiamme (sospette)",
        texts: ["{streak} vittorie di fila in corso. Qualcuno controlli se ha comprato l'account o se gioca suo cugino."],
        meme: ["{streak} WIN DI FILA", "È SICURAMENTE SKILL E NON FORTUNA"] },
      { id: "lowwr", when: () => s.n >= 4 && s.wr < 40, weight: 80, icon: "🧊", title: "Winrate glaciale",
        texts: ["{wr}% di winrate questa settimana. Una moneta lanciata in aria avrebbe fatto meglio, e senza flammare.", "{w} vinte e {l} perse. Il matchmaking non lo odia: è solo obiettivo."],
        meme: ["WINRATE: {wr}%", "DIREI CHE È CALIBRAZIONE"] },
      { id: "highwr", when: () => s.n >= 4 && s.wr >= 65, weight: 70, icon: "🏆", title: "Winrate sospetto",
        texts: ["{wr}% di winrate in settimana. Si consiglia antidoping per i suoi tasti Q, W, E e R."],
        meme: ["{wr}% WINRATE", "TRANQUILLI, FRA POCO SI SCALA"] },
      { id: "onetrick", when: () => fav && s.n >= 4 && fav.games / s.n >= 0.5, weight: 65, icon: "🔁", title: "Monogamo",
        texts: ["{favGames} partite su {n} con {favHero}. Ci sono 120+ eroi, lui ha scelto la monogamia.", "Pool di eroi: {favHero}, e poi... {favHero}."],
        meme: ["{favHero}", "{favHero} {favHero} {favHero}"], hero: () => fav.hero_id },
      { id: "longgame", when: () => s.longest && s.longest.duration >= 3600, weight: 45, icon: "🕰️", title: "Partita infinita",
        texts: ["Una partita da {long} minuti con {longHero}. Più lunga di un film di Nolan, meno trama."],
        meme: ["PARTITA DA {long} MINUTI", "IL MEGA CREEPS ERA LÌ DA ME"], hero: () => s.longest.hero_id },
      { id: "quickloss", when: () => v.sl && v.sl <= 25, weight: 55, icon: "🏳️", title: "GG a velocità luce",
        texts: ["Persa in {sl} minuti. Ha visto la draft e ha deciso di soffrire il meno possibile.", "Sconfitta in {sl} minuti: il tempo di una pasta al dente."],
        meme: ["GG IN {sl} MINUTI", "ALMENO HO CENATO PRESTO"], hero: () => s.shortestLoss.hero_id },
      { id: "night", when: () => s.lateNight.length >= 1, weight: 50, icon: "🌙", title: "Turno di notte",
        texts: ["Partita iniziata alle {nightTime}. Il sonno è per chi non ha MMR da perdere.", "{night} partite tra l'1 e le 6 di notte. La mattina dopo al lavoro: inutile come in lane."],
        meme: ["ORE {nightTime}", "SOLO UN'ALTRA, POI DORMO"] },
      { id: "turbo", when: () => s.turbo >= 3, weight: 40, icon: "⚡", title: "Turbo-dipendente",
        texts: ["{turbo} partite in Turbo. Perché perdere lentamente è da boomer."],
        meme: ["{turbo} PARTITE TURBO", "IL RANKED FA PAURA"] },
      { id: "poor", when: () => s.lowestGpm && s.lowestGpm.gold_per_min < 300 && s.n > 0, weight: 40, icon: "🪙", title: "Soglia di povertà",
        texts: ["{lowGpm} GPM con {lowGpmHero}. Nel suo inventario c'erano solo tango e speranza."],
        meme: ["{lowGpm} GPM", "IL REDDITO DI CITTADINANZA DI DOTA"], hero: () => s.lowestGpm.hero_id },
      { id: "pacifist", when: () => s.zeroKill >= 2, weight: 45, icon: "🕊️", title: "Pacifista convinto",
        texts: ["{zk} partite chiuse con zero kill. Gandhi approverebbe, il team meno."],
        meme: ["0 KILL", "SONO UN SUPPORTO NELL'ANIMA"] },
      { id: "goodkda", when: () => s.n >= 3 && s.avgKda >= 4, weight: 35, icon: "🎯", title: "KDA da curriculum",
        texts: ["KDA medio {kda}. Lo scriverà sul CV alla voce 'competenze'."],
        meme: ["KDA MEDIO {kda}", "MA L'HO PERSA LO STESSO"] },
      { id: "best", when: () => s.bestGame && s.bestGame.kda >= 5, weight: 20, icon: "⭐", title: "Momento di gloria",
        texts: ["Partita migliore: {bk} con {bkHero}. Incorniciatela, non ricapita."],
        meme: ["{bk} CON {bkHero}", "SCREENSHOT O NON È SUCCESSO"], hero: () => s.bestGame.hero_id },
      { id: "mid", when: () => s.n >= 3 && s.wr >= 42 && s.wr <= 58, weight: 5, icon: "📊", title: "Nella media",
        texts: ["{n} partite, {wr}% winrate, KDA {kda}. Statistiche talmente medie che l'ISTAT lo usa come campione."],
        meme: ["{wr}% WINRATE", "MEDIOCRITÀ COSTANTE"] },
    ];

    const out = rules
      .filter((r) => { try { return r.when(); } catch { return false; } })
      .map((r) => ({
        id: r.id, icon: r.icon, title: r.title, weight: r.weight + Math.random() * 10,
        text: fill(pick(r.texts), v),
        meme: { top: fill(r.meme[0], v), bottom: fill(r.meme[1], v) },
        heroId: r.hero ? r.hero() : null,
      }));

    if (fav && HERO_JOKES[fav.hero_id]) {
      out.push({ id: "hero", icon: "🦸", title: `Il caso ${H(fav.hero_id)}`, weight: 58 + Math.random() * 10,
        text: pick(HERO_JOKES[fav.hero_id]), meme: { top: H(fav.hero_id).toUpperCase(), bottom: "ANCORA. DI NUOVO. SEMPRE." }, heroId: fav.hero_id });
    }
    return out.sort((a, b) => b.weight - a.weight);
  }

  window.TribunaleRoast = { computeStats, verdict, buildRoasts, isWin };
})();
