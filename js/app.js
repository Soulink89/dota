(function () {
  const CFG = window.TRIBUNALE_CONFIG;
  const API = window.TribunaleAPI;
  const R = window.TribunaleRoast;
  const app = document.getElementById("app");
  const DAYS = CFG.days || 7;

  const MEDALS = ["", "Herald", "Guardian", "Crusader", "Archon", "Legend", "Ancient", "Divine", "Immortal"];
  const GAME_MODES = { 1: "All Pick", 2: "Captains Mode", 3: "Random Draft", 4: "Single Draft", 5: "All Random", 16: "Captains Draft", 18: "Ability Draft", 22: "All Pick", 23: "Turbo" };

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : "–");
  const dur = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  function ago(ts) {
    const d = Date.now() / 1000 - ts;
    if (d < 3600) return `${Math.max(1, Math.round(d / 60))} min fa`;
    if (d < 86400) return `${Math.round(d / 3600)} h fa`;
    const g = Math.round(d / 86400);
    return g === 1 ? "ieri" : `${g} giorni fa`;
  }
  const medalName = (t) => (t ? (t >= 80 ? "Immortal" : `${MEDALS[Math.floor(t / 10)]} ${t % 10}`) : "Non calibrato");

  // ---------- caricamento ----------
  const cache = new Map();
  async function getPlayer(cfg) {
    const id = API.toAccountId(cfg.steam64);
    if (!cache.has(id)) {
      cache.set(id, (async () => {
        const [data, heroes] = await Promise.all([API.loadPlayer(id, DAYS), API.loadHeroes()]);
        const p = data.profile?.profile || {};
        const name = cfg.alias || p.personaname || `Giocatore ${id}`;
        const stats = R.computeStats(data.matches, DAYS);
        return { id, cfg, data, heroes, name, stats, verdict: R.verdict(stats), roasts: R.buildRoasts(stats, name, heroes) };
      })().catch((e) => { cache.delete(id); throw e; }));
    }
    return cache.get(id);
  }

  // ---------- pezzi riutilizzabili ----------
  function avatar(p, name, cls = "") {
    const src = p.data.profile?.profile?.avatarfull;
    return src
      ? `<img class="avatar ${cls}" src="${esc(src)}" alt="" loading="lazy">`
      : `<div class="avatar avatar-fallback ${cls}">${esc(name.slice(0, 1).toUpperCase())}</div>`;
  }

  function medal(tier) {
    if (!tier) return `<div class="medal medal-none" title="Non calibrato">?</div>`;
    const star = tier % 10;
    return `<div class="medal" title="${esc(medalName(tier))}">
      <img src="${API.rankIcon(Math.floor(tier / 10))}" alt="" onerror="this.parentNode.classList.add('medal-none');this.remove()">
      ${star && tier < 80 ? `<img class="medal-star" src="${API.rankStar(star)}" alt="">` : ""}
    </div>`;
  }

  function sourceBadge(p) {
    const d = p.data;
    const when = new Date(d.fetchedAt).toLocaleString("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
    if (d.source === "demo") return `<span class="pill pill-warn">DATI DEMO — non reali</span>`;
    if (d.stale) return `<span class="pill pill-warn" title="OpenDota non risponde, mostro gli ultimi dati salvati">Dati salvati · ${when}</span>`;
    return `<span class="pill"><span class="dot"></span>Aggiornato · ${when}</span>`;
  }

  function resultStrip(stats) {
    if (!stats.n) return `<div class="strip strip-empty">Nessuna partita</div>`;
    return `<div class="strip">${[...stats.matches].reverse()
      .map((m) => `<span class="strip-cell ${m.win ? "w" : "l"}" title="${m.win ? "Vittoria" : "Sconfitta"} · ${m.kills}/${m.deaths}/${m.assists}"></span>`).join("")}</div>`;
  }

  function memeCard(roast, hero, i) {
    const img = API.heroImg(hero);
    return `<figure class="meme" style="--d:${i * 80}ms">
      <div class="meme-img" style="${img ? `background-image:url('${img}')` : ""}"></div>
      <figcaption>
        <span class="meme-top">${esc(roast.meme.top)}</span>
        <span class="meme-bottom">${esc(roast.meme.bottom)}</span>
      </figcaption>
    </figure>`;
  }

  // ---------- HOME ----------
  async function renderHome() {
    document.title = "Dota Tribunale";
    app.innerHTML = `
      <section class="hero-intro">
        <p class="eyebrow">Udienza settimanale · ultimi ${DAYS} giorni</p>
        <h1>Le statistiche non mentono.<br><span class="grad">Noi sì, ma solo per far ridere.</span></h1>
        <p class="lead">Ogni settimana il Tribunale esamina le partite dei suoi imputati, assegna un voto e pronuncia la sentenza. Nessun appello possibile.</p>
      </section>
      <section class="cards" id="cards">
        ${CFG.players.map(() => `<article class="pcard skeleton"><div class="sk sk-av"></div><div class="sk sk-l"></div><div class="sk sk-s"></div></article>`).join("")}
        <article class="pcard pcard-empty">
          <div class="empty-icon">➕</div>
          <h3>Posto libero in aula</h3>
          <p>Il prossimo imputato verrà aggiunto presto. Chi sarà?</p>
        </article>
      </section>`;

    const cards = document.querySelectorAll("#cards .pcard.skeleton");
    const tickerItems = [];
    await Promise.all(CFG.players.map(async (cfg, i) => {
      try {
        const p = await getPlayer(cfg);
        cards[i].outerHTML = playerCard(p);
        p.roasts.slice(0, 3).forEach((r) => tickerItems.push(`<b>${esc(p.name)}</b> — ${esc(r.text)}`));
      } catch (e) {
        cards[i].outerHTML = `<article class="pcard pcard-error"><h3>Prove non disponibili</h3><p>OpenDota non risponde. Riprova tra qualche minuto.</p></article>`;
      }
    }));
    setTicker(tickerItems);
  }

  function playerCard(p) {
    const s = p.stats, v = p.verdict, top = p.roasts[0];
    const fav = s.heroes[0] && p.heroes[s.heroes[0].hero_id];
    return `<a class="pcard" href="#/p/${p.id}">
      <div class="pcard-bg" style="${fav ? `background-image:url('${API.heroImg(fav)}')` : ""}"></div>
      <div class="pcard-body">
        <div class="pcard-head">
          ${avatar(p, p.name)}
          <div class="pcard-id">
            <span class="tag">${esc(p.cfg.accusa || "Imputato")}</span>
            <h3>${esc(p.name)}</h3>
            <span class="muted small">${esc(medalName(p.data.profile?.rank_tier))}</span>
          </div>
          <div class="grade grade-sm ${gradeClass(v.voto)}"><span>${esc(v.label)}</span></div>
        </div>
        <div class="pcard-stats">
          <div><b>${s.n}</b><span>partite</span></div>
          <div><b class="${s.wr >= 50 ? "pos" : "neg"}">${s.n ? Math.round(s.wr) + "%" : "–"}</b><span>winrate</span></div>
          <div><b>${s.n ? fmt1(s.avgKda) : "–"}</b><span>KDA medio</span></div>
        </div>
        ${resultStrip(s)}
        ${top ? `<p class="pcard-roast"><span>${top.icon}</span> ${esc(top.text)}</p>` : ""}
        <span class="pcard-cta">Apri il fascicolo →</span>
      </div>
    </a>`;
  }

  const gradeClass = (v) => (v == null ? "g-nc" : v < 5 ? "g-bad" : v < 6.5 ? "g-mid" : "g-good");

  // ---------- PAGINA GIOCATORE ----------
  async function renderPlayer(id) {
    const cfg = CFG.players.find((c) => API.toAccountId(c.steam64) === id);
    if (!cfg) { app.innerHTML = `<section class="notice"><h2>Imputato non trovato</h2><a href="#/">← Torna all'aula</a></section>`; return; }

    app.innerHTML = `<section class="loading"><div class="gavel">⚖</div><p>Il Tribunale sta esaminando le prove…</p></section>`;
    let p;
    try { p = await getPlayer(cfg); }
    catch (e) {
      app.innerHTML = `<section class="notice"><h2>Il Tribunale è in pausa caffè</h2>
        <p>OpenDota non risponde in questo momento (succede quando è sovraccarico). Riprova tra qualche minuto.</p>
        <p><button class="btn" onclick="location.reload()">Riprova</button> <a class="btn btn-ghost" href="?demo#/p/${id}">Vedi una demo</a></p></section>`;
      return;
    }
    document.title = `${p.name} · Dota Tribunale`;
    const s = p.stats, v = p.verdict, prof = p.data.profile || {};
    const fav = s.heroes[0] && p.heroes[s.heroes[0].hero_id];
    const wl = p.data.wl;
    const life = wl && wl.win + wl.lose ? `${wl.win}V – ${wl.lose}S · ${((wl.win / (wl.win + wl.lose)) * 100).toFixed(1)}%` : "–";
    const memeHeroes = s.heroes.length ? s.heroes.map((h) => p.heroes[h.hero_id]) : [null];

    app.innerHTML = `
      <section class="phero">
        <div class="phero-bg" style="${fav ? `background-image:url('${API.heroImg(fav)}')` : ""}"></div>
        <div class="phero-inner">
          <a href="#/" class="back">← Aula</a>
          <div class="phero-main">
            ${avatar(p, p.name, "avatar-xl")}
            <div class="phero-id">
              <span class="tag">${esc(cfg.accusa || "Imputato")}</span>
              <h1>${esc(p.name)}</h1>
              <div class="phero-meta">
                ${medal(prof.rank_tier)}
                <div><span class="muted small">Medaglia</span><b>${esc(medalName(prof.rank_tier))}${prof.leaderboard_rank ? ` · #${prof.leaderboard_rank}` : ""}</b></div>
                <div><span class="muted small">Carriera</span><b>${life}</b></div>
              </div>
              <div class="phero-links">
                ${sourceBadge(p)}
                <a class="pill pill-link" href="https://www.opendota.com/players/${id}" target="_blank" rel="noopener">OpenDota ↗</a>
                <a class="pill pill-link" href="https://www.dotabuff.com/players/${id}" target="_blank" rel="noopener">Dotabuff ↗</a>
                <a class="pill pill-link" href="https://steamcommunity.com/profiles/${esc(cfg.steam64)}" target="_blank" rel="noopener">Steam ↗</a>
              </div>
            </div>
            <div class="verdict">
              <span class="eyebrow">Pagella della settimana</span>
              <div class="grade ${gradeClass(v.voto)}"><span>${esc(v.label)}</span></div>
              <p>${esc(v.text)}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="kpis">
        ${kpi("Partite", s.n, `${fmt1(s.hours)} ore di vita spese`)}
        ${kpi("Winrate", s.n ? Math.round(s.wr) + "%" : "–", `${s.wins}V · ${s.losses}S`, s.n ? (s.wr >= 50 ? "pos" : "neg") : "")}
        ${kpi("KDA medio", s.n ? fmt1(s.avgKda) : "–", `${s.kills} / ${s.deaths} / ${s.assists}`)}
        ${kpi("Morti", s.deaths, s.n ? `${fmt1(s.avgDeaths)} a partita` : "–", s.avgDeaths >= 8 ? "neg" : "")}
        ${kpi("GPM medio", s.n ? Math.round(s.avgGpm) : "–", s.n ? `${Math.round(s.avgXpm)} XPM` : "–")}
        ${kpi("Serie attuale", s.n ? `${s.streak}${s.streakWin ? "V" : "S"}` : "–", s.n ? (s.streakWin ? "in fiamme" : "in caduta libera") : "–", s.n ? (s.streakWin ? "pos" : "neg") : "")}
      </section>

      <section class="block">
        <div class="block-head"><h2>Andamento</h2><span class="muted small">dalla più vecchia alla più recente</span></div>
        ${resultStrip(s)}
      </section>

      ${p.roasts.length ? `
      <section class="block">
        <div class="block-head">
          <h2>Meme della settimana</h2>
          <button class="btn btn-ghost btn-sm" id="reroll">🎲 Nuove battute</button>
        </div>
        <div class="memes" id="memes">${p.roasts.slice(0, 3).map((r, i) => memeCard(r, p.heroes[r.heroId] || memeHeroes[i % memeHeroes.length], i)).join("")}</div>
      </section>

      <section class="block">
        <div class="block-head"><h2>Capi d'accusa</h2><span class="muted small">${p.roasts.length} imputazioni</span></div>
        <div class="charges">${p.roasts.map((r, i) => `
          <article class="charge" style="--d:${i * 60}ms">
            <div class="charge-icon">${r.icon}</div>
            <div><h4>${esc(r.title)}</h4><p>${esc(r.text)}</p></div>
          </article>`).join("")}</div>
      </section>` : ""}

      ${s.heroes.length ? `
      <section class="block">
        <div class="block-head"><h2>Eroi della settimana</h2></div>
        <div class="heroes">${s.heroes.slice(0, 8).map((h) => heroTile(h, p.heroes[h.hero_id])).join("")}</div>
      </section>` : ""}

      <section class="block">
        <div class="block-head"><h2>Partite recenti</h2><span class="muted small">ultimi ${DAYS} giorni</span></div>
        ${s.n ? `<div class="matches">${s.matches.map((m) => matchRow(m, p.heroes[m.hero_id])).join("")}</div>`
              : `<p class="muted">Nessuna partita negli ultimi ${DAYS} giorni.</p>`}
      </section>`;

    setTicker(p.roasts.map((r) => `<b>${esc(p.name)}</b> — ${esc(r.text)}`));

    document.getElementById("reroll")?.addEventListener("click", () => {
      const fresh = R.buildRoasts(s, p.name, p.heroes);
      const shuffled = fresh.sort(() => Math.random() - 0.5).slice(0, 3);
      const off = Math.floor(Math.random() * memeHeroes.length);
      document.getElementById("memes").innerHTML = shuffled.map((r, i) => memeCard(r, p.heroes[r.heroId] || memeHeroes[(i + off) % memeHeroes.length], i)).join("");
    });
  }

  function kpi(label, value, sub, cls = "") {
    return `<div class="kpi"><span class="kpi-label">${label}</span><b class="kpi-val ${cls}">${value}</b><span class="kpi-sub">${sub}</span></div>`;
  }

  function heroTile(h, hero) {
    const wr = Math.round((h.wins / h.games) * 100);
    return `<div class="htile">
      <div class="htile-img" style="${hero ? `background-image:url('${API.heroImg(hero)}')` : ""}"></div>
      <div class="htile-body">
        <b>${esc(hero?.localized_name || "Eroe #" + h.hero_id)}</b>
        <span>${h.games} ${h.games === 1 ? "partita" : "partite"} · <em class="${wr >= 50 ? "pos" : "neg"}">${wr}%</em></span>
        <div class="bar"><i style="width:${wr}%"></i></div>
      </div>
    </div>`;
  }

  function matchRow(m, hero) {
    const mode = GAME_MODES[m.game_mode] || "Altro";
    const ranked = m.lobby_type === 7 ? "Ranked" : "Normale";
    return `<a class="mrow ${m.win ? "w" : "l"}" href="https://www.opendota.com/matches/${m.match_id}" target="_blank" rel="noopener">
      <div class="mrow-hero" style="${hero ? `background-image:url('${API.heroImg(hero)}')` : ""}"></div>
      <div class="mrow-name"><b>${esc(hero?.localized_name || "Eroe")}</b><span>${ranked} · ${mode}</span></div>
      <div class="mrow-res"><b>${m.win ? "Vittoria" : "Sconfitta"}</b><span>${ago(m.start_time)}</span></div>
      <div class="mrow-kda"><b>${m.kills}<i>/</i>${m.deaths}<i>/</i>${m.assists}</b><span>KDA ${fmt1(m.kda)}</span></div>
      <div class="mrow-x"><b>${m.gold_per_min ?? "–"}</b><span>GPM</span></div>
      <div class="mrow-x"><b>${m.last_hits ?? "–"}</b><span>LH</span></div>
      <div class="mrow-x"><b>${dur(m.duration)}</b><span>durata</span></div>
    </a>`;
  }

  // ---------- ticker + nav ----------
  function setTicker(items) {
    const el = document.getElementById("ticker");
    if (!items.length) { el.textContent = "Nessuna notizia: gli imputati si sono comportati bene. Sospetto."; return; }
    const html = items.map((t) => `<span class="ticker-item">${t}</span>`).join("");
    el.innerHTML = html + html; // duplicato per lo scorrimento continuo
    el.style.setProperty("--dur", Math.max(30, items.length * 9) + "s");
  }

  async function renderNav() {
    const nav = document.getElementById("topnav");
    nav.innerHTML = CFG.players.map((c) => {
      const id = API.toAccountId(c.steam64);
      return `<a href="#/p/${id}" data-id="${id}">${esc(c.alias || "…")}</a>`;
    }).join("");
    for (const c of CFG.players) {
      if (c.alias) continue;
      getPlayer(c).then((p) => { const a = nav.querySelector(`[data-id="${p.id}"]`); if (a) a.textContent = p.name; }).catch(() => {});
    }
  }

  function route() {
    const m = location.hash.match(/^#\/p\/(\d+)/);
    document.querySelectorAll("#topnav a").forEach((a) => a.classList.toggle("active", m && a.dataset.id === m[1]));
    window.scrollTo({ top: 0 });
    m ? renderPlayer(m[1]) : renderHome();
  }

  window.addEventListener("hashchange", route);
  renderNav();
  route();
})();
