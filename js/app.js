(function () {
  const CFG = window.TRIBUNALE_CONFIG;
  const API = window.TribunaleAPI;
  const R = window.TribunaleRoast;
  const app = document.getElementById("app");
  const DAYS = CFG.days || 7;
  const LOCALE = "zh-CN";

  const GAME_MODES = { 1: "全英雄选择", 2: "队长模式", 3: "随机征召", 4: "单一征召", 5: "全部随机", 16: "队长征召", 18: "技能征召", 22: "全英雄选择", 23: "加速模式" };
  const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : "–");
  const dur = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  function ago(ts) {
    const d = Date.now() / 1000 - ts;
    if (d < 3600) return `${Math.max(1, Math.round(d / 60))}分钟前`;
    if (d < 86400) return `${Math.round(d / 3600)}小时前`;
    const g = Math.round(d / 86400);
    return g === 1 ? "昨天" : `${g}天前`;
  }
  const medalName = R.medalName;
  const defaultTag = "被告";
  const colorStyle = (cfg) => (cfg.color ? `--pc:${cfg.color};` : "");

  // ---------- caricamento ----------
  const cache = new Map();
  async function getPlayer(cfg) {
    const id = API.toAccountId(cfg.steam64);
    if (!cache.has(id)) {
      cache.set(id, (async () => {
        let [data, heroes] = await Promise.all([API.loadPlayer(id, DAYS), API.loadHeroes()]);
        const p = data.profile?.profile || {};
        const name = cfg.alias || p.personaname || `玩家 ${id}`;
        // modalità elogio: si contano solo le partite vinte
        const praise = cfg.persona?.mode === "praise";
        if (praise) data = { ...data, matches: (data.matches || []).filter((m) => (m.player_slot < 128) === m.radiant_win) };
        const stats = R.computeStats(data.matches, DAYS);
        // index: ogni giocatore riceve varianti diverse delle battute; week: ruotano ogni settimana
        const ctx = { persona: cfg.persona, rankTier: data.profile?.rank_tier,
          index: CFG.players.indexOf(cfg), week: Math.floor((Date.now() / 86400000 + 3) / 7),
          // posizione tra i giocatori "elogiati": ognuno riceve versioni diverse degli elogi
          praiseIndex: CFG.players.filter((c) => c.persona?.mode === "praise" || c.persona?.alsoPraise).indexOf(cfg),
          // partite nascoste: "Expose Public Match Data" disattivato in Dota 2
          hidden: !(data.matches || []).length && !(data.wl && data.wl.win + data.wl.lose) && data.source !== "demo" };
        // inventario Dota 2 (至宝仓库), solo per chi ha persona.inventory
        if (cfg.persona?.inventory) {
          const [inv, life] = await Promise.all([API.loadInventory(id), API.loadLifetimeHeroes(id)]);
          ctx.inventory = buildInventory(inv, life, stats);
        }
        const quotes = R.quotes(stats, ctx, heroes);
        ctx.usedMatches = quotes.usedMatches; // le partite citate nei 语录 non vengono ripetute
        const roasts = R.buildRoasts(stats, name, heroes, ctx);
        return { id, cfg, data, heroes, name, steamName: p.personaname, stats, ctx, praise,
          verdict: R.verdict(stats, ctx), roasts, quotes, special: R.specials(stats, ctx),
          split: splitRoasts(roasts), kudos: alsoPraise(cfg, data, heroes, ctx, quotes, roasts) };
      })().catch((e) => { cache.delete(id); throw e; }));
    }
    return cache.get(id);
  }



  // incrocia l'inventario con le partite: per ogni arcana, quante volte ha giocato quell'eroe
  function buildInventory(inv, life, stats) {
    if (!inv || !inv.arcana) return null;
    const byName = Object.fromEntries(Object.entries(window.HERO_NAMES_ZH || {}).map(([id, zh]) => [zh, Number(id)]));
    const lifeGames = Object.fromEntries((life || []).map((h) => [Number(h.hero_id), h.games]));
    const weekGames = Object.fromEntries(stats.heroes.map((h) => [h.hero_id, h.games]));
    const arcana = inv.arcana.map((a) => {
      const heroId = byName[a.hero] ?? null;
      return { ...a, heroId, life: heroId ? lifeGames[heroId] ?? 0 : 0, week: heroId ? weekGames[heroId] ?? 0 : 0 };
    }).sort((a, b) => b.life - a.life);
    const arcanaHeroes = new Set(arcana.map((a) => a.heroId).filter(Boolean));
    const top3 = (life || []).filter((h) => h.games > 0).sort((a, b) => b.games - a.games).slice(0, 3).map((h) => Number(h.hero_id));
    return { ...inv, arcana, arcanaHeroes: [...arcanaHeroes], top3, top3WithArcana: top3.filter((id) => arcanaHeroes.has(id)).length };
  }
  // 本庭也得承认: elogi (dalle sole vittorie) per chi gioca bene, accanto alle prese in giro
  function alsoPraise(cfg, data, heroes, ctx, quotes, roasts) {
    if (!cfg.persona?.alsoPraise) return [];
    const usedM = new Set([...(quotes.usedMatches || []), ...roasts.map((r) => r.matchId).filter(Boolean)]);
    const wins = (data.matches || []).filter((m) => (m.player_slot < 128) === m.radiant_win && !usedM.has(m.match_id));
    return R.praiseList(R.computeStats(wins, DAYS), heroes, ctx)
      .filter((x) => x.id !== "g-pool") // non contraddire le battute sul pool di eroi
      .slice(0, 4);
  }
  // Ogni battuta compare una sola volta: 3 diventano meme (preferibilmente con un eroe), le altre capi d'accusa.
  // roasts[0] resta nei capi d'accusa perché è anche la frase del manifesto in home.
  function splitRoasts(roasts, shuffle = false) {
    const pool = roasts.slice(1);
    if (shuffle) pool.sort(() => Math.random() - 0.5);
    const memes = [...pool.filter((r) => r.heroId), ...pool.filter((r) => !r.heroId)].slice(0, 3);
    return { memes, charges: roasts.filter((r) => !memes.includes(r)) };
  }

  // Notizie flash per il ticker: solo dati, così non ripetono le battute delle pagine
  function headlines(p) {
    const s = p.stats, n = esc(p.name), H = (id) => esc(p.heroes[id]?.localized_name || "");
    if (p.ctx.hidden) return [`<b>${n}</b>：比赛数据未公开，本庭无法统计`];
    if (p.praise) {
      if (!s.n) return [`<b>${n}</b>：本周休养生息`];
      const b = s.bestGame;
      return [`<b>${n}</b>：本周拿下${s.n}场胜利`, ...(b ? [`<b>${n}</b>：最佳一局 ${H(b.hero_id)} ${b.kills}/${b.deaths}/${b.assists}`] : [])];
    }
    if (!s.n) return [`<b>${n}</b>：本周一局未打`];
    const out = [`<b>${n}</b>：本周${s.n}场 · ${s.wins}胜${s.losses}负`];
    if (s.mostDeaths) out.push(`<b>${n}</b>：最惨一局 ${H(s.mostDeaths.hero_id)} ${s.mostDeaths.kills}/${s.mostDeaths.deaths}/${s.mostDeaths.assists}`);
    out.push(`<b>${n}</b>：当前${s.streak}${s.streakWin ? "连胜" : "连败"}`);
    if (s.heroes[0]) out.push(`<b>${n}</b>：本周最常用英雄 ${H(s.heroes[0].hero_id)}（${s.heroes[0].games}场）`);
    return out;
  }
  async function allHeadlines() {
    const res = await Promise.allSettled(CFG.players.map(getPlayer));
    return res.filter((r) => r.status === "fulfilled").flatMap((r) => headlines(r.value));
  }

  // ---------- pezzi riutilizzabili ----------
  function avatar(p, name, cls = "") {
    const src = p.data.profile?.profile?.avatarfull;
    return src
      ? `<img class="avatar ${cls}" src="${esc(src)}" alt="" loading="lazy">`
      : `<div class="avatar avatar-fallback ${cls}">${esc(name.slice(0, 1).toUpperCase())}</div>`;
  }

  function medal(tier) {
    if (!tier) return `<div class="medal medal-none" title="未定级">?</div>`;
    const star = tier % 10;
    return `<div class="medal" title="${esc(medalName(tier))}">
      <img src="${API.rankIcon(Math.floor(tier / 10))}" alt="" onerror="this.parentNode.classList.add('medal-none');this.remove()">
      ${star && tier < 80 ? `<img class="medal-star" src="${API.rankStar(star)}" alt="">` : ""}
    </div>`;
  }

  function sourceBadge(p) {
    const d = p.data;
    const when = new Date(d.fetchedAt).toLocaleString(LOCALE, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    if (d.source === "demo") return `<span class="pill pill-warn">演示数据——非真实</span>`;
    if (d.stale) return `<span class="pill pill-warn" title="OpenDota 无响应，显示最近保存的数据">已保存数据 · ${when}</span>`;
    return `<span class="pill"><span class="dot"></span>已更新 · ${when}</span>`;
  }

  function resultStrip(stats) {
    if (!stats.n) return `<div class="strip strip-empty">暂无比赛</div>`;
    return `<div class="strip">${[...stats.matches].reverse()
      .map((m) => `<span class="strip-cell ${m.win ? "w" : "l"}" title="${m.win ? "胜利" : "失败"} · ${m.kills}/${m.deaths}/${m.assists}"></span>`).join("")}</div>`;
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

  // numero animato: <b data-count="123" data-suffix="%">0</b>
  const counter = (n, suffix = "", dec = 0) => `<span data-count="${n}" data-dec="${dec}" data-suffix="${esc(suffix)}">${Number(n).toFixed(dec)}${esc(suffix)}</span>`;
  function animateCounters(root = document) {
    root.querySelectorAll("[data-count]").forEach((el) => {
      const to = Number(el.dataset.count), dec = Number(el.dataset.dec || 0), suf = el.dataset.suffix || "";
      if (!Number.isFinite(to) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const t0 = performance.now(), D = 900;
      const step = (t) => {
        const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
        el.textContent = (to * e).toFixed(dec) + suf;
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  // ---------- HOME ----------
  async function renderHome() {
    document.title = "刀塔法庭";
    app.innerHTML = `
      <section class="hero-intro">
        <div class="hero-intro-text">
          <p class="eyebrow">每周庭审 · 最近${DAYS}天</p>
          <h1>数据不会说谎。<br><span class="grad">我们会，但只是为了好笑。</span></h1>
          <p class="lead">本庭每周审查被告们的比赛，专挑最丢人的数据，当庭宣判。不接受上诉，不接受甩锅。</p>
        </div>
        <div class="hero-gavel" aria-hidden="true">⚖</div>
      </section>
      <section class="court-stats" id="court-stats"></section>
      <div id="fortune-home"></div>
      <div id="daily-home"></div>
      <div id="arcana-home"></div>
      <div class="block-head"><h2>通缉榜</h2><span class="muted small">点击海报查看卷宗</span></div>
      <section class="wanted-grid" id="cards">
        ${CFG.players.map(() => `<article class="wanted skeleton"><div class="sk sk-av"></div><div class="sk sk-l"></div><div class="sk sk-s"></div></article>`).join("")}
        <article class="wanted wanted-empty">
          <div class="wanted-top"><span>通缉令</span><small>WANTED</small></div>
          <div class="wanted-photo"><span>?</span></div>
          <h3>虚位以待</h3>
          <p>下一位被告即将到庭。会是谁呢？</p>
        </article>
      </section>
      <div id="awards-home"></div>
      <div id="board-home"></div>
      <div id="group-heat"></div>`;

    const cards = document.querySelectorAll("#cards .wanted.skeleton");
    const loaded = [];
    await Promise.all(CFG.players.map(async (cfg, i) => {
      try {
        const p = await getPlayer(cfg);
        loaded.push(p);
        cards[i].outerHTML = wantedPoster(p, i);
      } catch (e) {
        cards[i].outerHTML = `<article class="wanted wanted-empty"><h3>证据暂缺</h3><p>OpenDota 没有响应，请稍后再试。</p></article>`;
      }
    }));
    const accused = loaded.filter((p) => !p.praise); // i giocatori in modalità elogio non sono "imputati"
    const sum = (f) => accused.reduce((t, p) => t + f(p.stats), 0);
    document.getElementById("court-stats").innerHTML = `
      <div class="cs"><span>💀</span><b>${counter(sum((s) => s.deaths))}</b><em>本周被告合计送头</em></div>
      <div class="cs"><span>⏳</span><b>${counter(sum((s) => s.hours), "", 1)}</b><em>合计浪费小时</em></div>
      <div class="cs"><span>📉</span><b>${counter(sum((s) => s.losses))}</b><em>合计输掉场次</em></div>
      <div class="cs"><span>🧑‍⚖️</span><b>${counter(accused.length)}</b><em>在押被告</em></div>`;
    animateCounters(document.getElementById("court-stats"));
    renderDailyHome();
    renderHomeExtras(loaded.sort((a, b) => a.ctx.index - b.ctx.index));
    allHeadlines().then(setTicker);
  }

  function wantedPoster(p, i) {
    const s = p.stats, v = p.verdict, top = p.roasts[0];
    const bounty = Math.max(1, s.deaths) * 300;
    const tilt = [-2.2, 1.8, -1.2, 2.4][i % 4];
    return `<a class="wanted" href="#/p/${p.id}" style="--tilt:${tilt}deg;${colorStyle(p.cfg)}">
      <span class="pin" aria-hidden="true"></span>
      <div class="wanted-top">${p.praise ? "<span>表彰令</span><small>HALL OF FAME · 本庭特别嘉奖</small>" : "<span>通缉令</span><small>WANTED · 死活不论</small>"}</div>
      <div class="wanted-photo">${avatar(p, p.name, "avatar-wanted")}<div class="wanted-meter"><small>${esc(v.title || "成绩")}</small><b>${esc(v.label)}</b></div></div>
      <h3>${esc(p.name)}</h3>
      <p class="wanted-crime">${p.praise ? "荣誉" : "罪名"}：${esc(p.cfg.bounty || p.cfg.accusa || "打刀塔")}</p>
      ${p.cfg.bio ? `<p class="wanted-bio">简介：${esc(p.cfg.bio)}</p>` : ""}
      <div class="wanted-bounty"><span>${p.praise ? "奖金" : "悬赏"}</span><b>🪙 ${p.ctx.hidden ? "机密" : (p.praise ? Math.max(1, s.kills) * 300 : bounty).toLocaleString(LOCALE)}</b><span>金</span></div>
      <div class="wanted-stats">
        <div><b>${p.ctx.hidden ? "?" : s.n}</b><span>场</span></div>
        <div><b>${p.ctx.hidden ? "?" : p.praise ? "*" : s.n ? Math.round(s.wr) + "%" : "–"}</b><span>胜率</span></div>
        ${p.praise ? `<div><b>${s.kills}</b><span>击杀</span></div>` : `<div><b>${p.ctx.hidden ? "?" : s.deaths}</b><span>送头</span></div>`}
      </div>
      ${resultStrip(s)}
      ${top ? `<p class="wanted-quote">${top.icon} ${esc(top.text)}</p>` : ""}
      <span class="wanted-cta">查看卷宗 →</span>
    </a>`;
  }

  const gradeClass = (v) => (v == null ? "g-nc" : v < 60 ? "g-bad" : v < 75 ? "g-mid" : "g-good");

  // ---------- PAGINA GIOCATORE ----------
  async function renderPlayer(id) {
    const cfg = CFG.players.find((c) => API.toAccountId(c.steam64) === id);
    if (!cfg) { app.innerHTML = `<section class="notice"><h2>查无此人</h2><a href="#/">← 返回法庭</a></section>`; return; }

    app.innerHTML = `<section class="loading"><div class="gavel">⚖</div><p>法庭正在审查证据……</p></section>`;
    let p;
    try { p = await getPlayer(cfg); }
    catch (e) {
      app.innerHTML = `<section class="notice"><h2>法庭休庭中</h2>
        <p>OpenDota 暂时没有响应（服务器过载时会这样），请过几分钟再试。</p>
        <p><button class="btn" onclick="location.reload()">重试</button> <a class="btn btn-ghost" href="?demo#/p/${id}">查看演示</a></p></section>`;
      return;
    }
    document.title = `${p.name} · 刀塔法庭`;
    const s = p.stats, v = p.verdict, prof = p.data.profile || {};
    const fav = s.heroes[0] && p.heroes[s.heroes[0].hero_id];
    const wl = p.data.wl;
    // Soul: le sconfitte di carriera sono "censurate"
    const life = !wl || !(wl.win + wl.lose) ? "–" : p.praise ? `${wl.win}胜 – *负 · 胜率 *` : `${wl.win}胜 – ${wl.lose}负 · ${((wl.win / (wl.win + wl.lose)) * 100).toFixed(1)}%`;
    const memeHeroes = s.heroes.length ? s.heroes.map((h) => p.heroes[h.hero_id]) : [null];
    const collage = s.heroes.slice(0, 5).map((h) => p.heroes[h.hero_id]).filter(Boolean);

    app.innerHTML = `
      <div class="player" style="${colorStyle(cfg)}">
      <section class="phero">
        <div class="phero-bg" style="${fav ? `background-image:url('${API.heroImg(fav)}')` : ""}"></div>
        <div class="phero-collage" aria-hidden="true">${collage.map((h, i) => `<i style="background-image:url('${API.heroImg(h)}');--i:${i}"></i>`).join("")}</div>
        <div class="phero-inner">
          <a href="#/" class="back">← 法庭</a>
          <div class="phero-main">
            <div class="avatar-ring">${avatar(p, p.name, "avatar-xl")}</div>
            <div class="phero-id">
              <span class="tag">${esc(cfg.accusa || defaultTag)}</span>
              <h1>${esc(p.name)}</h1>
              ${p.steamName && p.steamName !== p.name ? `<p class="aka">Steam：${esc(p.steamName)}${cfg.persona?.claimedRank ? ` · 自称“${esc(cfg.persona.claimedRank)}实力”` : ""}</p>` : ""}
              ${cfg.bio ? `<p class="bio">简介：${esc(cfg.bio)}</p>` : ""}
              <div class="phero-meta">
                ${medal(prof.rank_tier)}
                <div><span class="muted small">段位</span><b>${esc(medalName(prof.rank_tier))}${prof.leaderboard_rank ? ` · #${prof.leaderboard_rank}` : ""}</b></div>
                <div><span class="muted small">生涯战绩</span><b>${life}</b></div>
              </div>
              <div class="phero-links">
                ${sourceBadge(p)}
                ${p.praise ? `<span class="pill pill-gold">🏅 本页仅展示胜场</span>` : ""}
                <a class="pill pill-link" href="https://www.opendota.com/players/${id}" target="_blank" rel="noopener">OpenDota ↗</a>
                <a class="pill pill-link" href="https://www.dotabuff.com/players/${id}" target="_blank" rel="noopener">Dotabuff ↗</a>
                <a class="pill pill-link" href="https://steamcommunity.com/profiles/${esc(cfg.steam64)}" target="_blank" rel="noopener">Steam ↗</a>
              </div>
            </div>
            <div class="verdict">
              <span class="eyebrow">${esc(v.title || "本周成绩单")}</span>
              <div class="grade ${v.cls || gradeClass(v.voto)}"><span>${esc(v.label)}</span></div>
              <p>${esc(v.text)}</p>
              ${cfg.note ? `<p class="judge-note">🧑‍⚖️ 法官叹气：${esc(cfg.note)}</p>` : ""}
            </div>
          </div>
        </div>
      </section>

      ${p.praise ? `
      <section class="wins-only">
        <div class="wins-only-seal">只收<br>胜场</div>
        <div><h3>本页特别说明</h3><p>根据本庭特别条例，<b>${esc(p.name)}</b>的页面<b>只收录胜利的比赛</b>：统计、图表、比赛列表和海报全部只看胜场，败场一律不予记录。</p></div>
      </section>` : ""}

      ${p.ctx.hidden ? `
      <section class="classified">
        <div class="classified-stamp">机密</div>
        <div><h3>比赛数据：不予公开</h3><p>Dota 2 设置 → 社交 → “公开比赛数据”：关闭。以下判决依据群友证词。</p></div>
      </section>` : `
      <section class="kpis">
        ${p.praise ? kpi("胜场", s.n ? counter(s.n) : "0", `胜利用时 ${fmt1(s.hours)} 小时`, "pos") : kpi("场次", s.n ? counter(s.n) : "0", `浪费了 ${fmt1(s.hours)} 小时人生`)}
        ${p.praise ? kpi("胜率", "*", `${s.wins}胜 · *负`) : kpi("胜率", s.n ? counter(Math.round(s.wr), "%") : "–", `${s.wins}胜 · ${s.losses}负`)}
        ${kpi("KDA", s.n ? counter(s.avgKda, "", 1) : "–", `${s.kills} / ${s.deaths} / ${s.assists}`)}
        ${p.praise ? kpi("击杀", s.n ? counter(s.kills) : "0", s.n ? `每局 ${fmt1(s.kills / s.n)} 个` : "–", "pos") : kpi("送头", s.n ? counter(s.deaths) : "0", s.n ? `每局 ${fmt1(s.avgDeaths)} 次` : "–", "neg")}
        ${kpi("平均GPM", s.n ? counter(Math.round(s.avgGpm)) : "–", s.n ? `${Math.round(s.avgXpm)} XPM` : "–")}
        ${p.praise ? kpi("最佳一局", s.bestGame ? `${s.bestGame.kills}/${s.bestGame.deaths}/${s.bestGame.assists}` : "–", s.bestGame ? esc(p.heroes[s.bestGame.hero_id]?.localized_name || "") : "–", "pos") : kpi("最惨一局", s.mostDeaths ? `${s.mostDeaths.deaths}死` : "–", s.mostDeaths ? `${esc(p.heroes[s.mostDeaths.hero_id]?.localized_name || "")} · ${s.mostDeaths.kills}/${s.mostDeaths.deaths}/${s.mostDeaths.assists}` : "–", "neg")}
      </section>`}

      ${p.quotes.length ? `
      <section class="block">
        <div class="block-head"><h2>${esc(p.name)}语录</h2><span class="muted small">原话 · 本庭点评</span></div>
        <div class="quotes">${p.quotes.map((q, i) => {
          const hero = q.heroId && p.heroes[q.heroId];
          return `<article class="quote" style="--d:${i * 70}ms">
            ${hero ? `<div class="quote-bg" style="background-image:url('${API.heroImg(hero)}')"></div>` : ""}
            <div class="quote-body">
              <p class="quote-text">${esc(q.quote)}</p>
              <p class="quote-reply"><b>本庭：</b>${esc(q.reply)}</p>
            </div>
            <div class="stamp">${esc(q.stamp)}</div>
          </article>`; }).join("")}</div>
      </section>` : ""}

      ${specialBlock(p.special, p.heroes)}
      ${p.ctx.inventory ? inventoryBlock(p) : ""}
      ${cfg.persona?.nemesis || cfg.persona?.victim ? `<div id="nemesis"></div>` : ""}

      ${s.n ? `
      <section class="block">
        <div class="block-head"><h2>数据图鉴</h2><span class="muted small">${p.praise ? "只看胜场" : "只挑丢人的看"}</span></div>
        <div class="viz-grid">
          <div class="sp-panel">
            <div class="sp-head"><span>💀</span><div><h4>${p.praise ? "每局表现" : "人头 vs 送头"}</h4><p class="muted small">每局击杀（上）和死亡（下），从旧到新</p></div></div>
            ${kdChart(s.matches, p.heroes)}
          </div>
          <div class="sp-panel">
            <div class="sp-head"><span>🕯️</span><div><h4>${esc(cfg.persona?.heatTitle || (cfg.persona?.traits?.includes("xiuxian") ? "修仙作息表" : "作息表"))}</h4><p class="muted small">什么时候在打刀（颜色越亮局数越多）</p></div></div>
            ${heatmap(s.matches)}
          </div>
        </div>
        <div class="strip-wrap"><span class="muted small">胜负走势</span>${resultStrip(s)}</div>
      </section>` : ""}

      <div id="daily-p"></div>

      ${p.roasts.length ? `
      <section class="block">
        <div class="block-head">
          <h2>${p.praise ? "荣耀海报" : "本周表情包"}</h2>
          <button class="btn btn-ghost btn-sm" id="reroll">🎲 换一批</button>
        </div>
        <div class="memes" id="memes"></div>
      </section>

      <section class="block">
        <div class="block-head"><h2>${p.praise ? "功绩" : "罪状"}</h2><span class="muted small" id="charges-count"></span></div>
        <div class="charges" id="charges"></div>
      </section>` : ""}

      ${p.kudos.length ? `
      <section class="block">
        <div class="block-head"><h2>本庭也得承认</h2><span class="muted small">骂归骂，这几局确实打得漂亮</span></div>
        <div class="kudos">${p.kudos.map((k, i) => { const h = k.heroId && p.heroes[k.heroId]; return `
          <article class="kudo" style="--d:${i * 70}ms">
            ${h ? `<div class="kudo-bg" style="background-image:url('${API.heroImg(h)}')"></div>` : ""}
            <span class="kudo-icon">${k.icon}</span>
            <div><h4>${esc(k.title)}</h4><p>${esc(k.text)}</p></div>
          </article>`; }).join("")}</div>
      </section>` : ""}

      ${s.heroes.length ? `
      <section class="block">
        <div class="block-head"><h2>${p.praise ? "本周招牌英雄" : "本周受害英雄"}</h2><span class="muted small">${p.praise ? "带来胜利的英雄" : "被他玩过的英雄"}</span></div>
        <div class="heroes">${s.heroes.slice(0, 8).map((h) => heroTile(h, p.heroes[h.hero_id], p.praise)).join("")}</div>
      </section>` : ""}

      <section class="block">
        <div class="block-head"><h2>最近比赛</h2><span class="muted small">最近${DAYS}天${p.praise ? " · 仅显示胜场" : ""}</span></div>
        ${s.n ? `<div class="matches">${s.matches.map((m) => matchRow(m, p.heroes[m.hero_id])).join("")}</div>`
              : `<p class="muted">最近${DAYS}天没有比赛。</p>`}
      </section>
      </div>`;

    animateCounters(app);
    allHeadlines().then(setTicker);

    // meme e capi d'accusa si dividono le battute: nessuna compare due volte
    const renderJokes = (split) => {
      const memesEl = document.getElementById("memes"), chargesEl = document.getElementById("charges");
      if (!memesEl) return;
      memesEl.innerHTML = split.memes.map((r, i) => memeCard(r, p.heroes[r.heroId] || memeHeroes[i % memeHeroes.length], i)).join("");
      chargesEl.innerHTML = split.charges.map((r, i) => `
          <article class="charge" style="--d:${i * 60}ms">
            <div class="charge-icon">${r.icon}</div>
            <div><h4>${esc(r.title)}</h4><p>${esc(r.text)}</p></div>
          </article>`).join("");
      document.getElementById("charges-count").textContent = p.praise ? `共 ${split.charges.length} 项功绩` : `共 ${split.charges.length} 项指控`;
    };
    renderJokes(p.split);
    renderDailyPlayer(p);
    if (cfg.persona?.nemesis) renderNemesis(p, cfg.persona.nemesis);
    else if (cfg.persona?.victim) renderNemesis(p, cfg.persona.victim, "better");
    document.getElementById("reroll")?.addEventListener("click", () => renderJokes(splitRoasts(p.roasts, true)));
  }


  // 宿敌对比 (mode "worse": solo dove il giocatore perde) / 克星 (mode "better": solo dove batte il rivale)
  async function renderNemesis(p, nemesisAlias, mode = "worse") {
    const el = document.getElementById("nemesis");
    const ncfg = CFG.players.find((c) => c.alias === nemesisAlias);
    if (!el || !ncfg || !p.stats.n) return;
    let q;
    try { q = await getPlayer(ncfg); } catch { return; }
    if (!q.stats.n) return;
    const a = p.stats, b = q.stats;
    const metrics = [
      { label: "胜率", av: a.wr, bv: b.wr, fmt: (x) => Math.round(x) + "%", worse: a.wr < b.wr, better: a.wr > b.wr },
      { label: "KDA", av: a.avgKda, bv: b.avgKda, fmt: (x) => x.toFixed(2), worse: a.avgKda < b.avgKda, better: a.avgKda > b.avgKda },
      { label: "场均死亡", av: a.avgDeaths, bv: b.avgDeaths, fmt: (x) => x.toFixed(1), worse: a.avgDeaths > b.avgDeaths, better: a.avgDeaths < b.avgDeaths },
      { label: "平均GPM", av: a.avgGpm, bv: b.avgGpm, fmt: (x) => Math.round(x), worse: a.avgGpm < b.avgGpm, better: a.avgGpm > b.avgGpm },
      { label: "场均击杀", av: a.kills / a.n, bv: b.kills / b.n, fmt: (x) => x.toFixed(1), worse: a.kills / a.n < b.kills / b.n, better: a.kills / a.n > b.kills / b.n },
    ].filter((m) => m[mode]);
    if (!metrics.length) return;
    const better = mode === "better";
    el.innerHTML = `
      <section class="block">
        <div class="block-head"><h2>${better ? `${esc(q.name)}克星` : "宿敌对比"}</h2><span class="muted small">${esc(p.name)} vs ${esc(q.name)} · ${better ? `只列${esc(q.name)}输掉的项目` : "只列他输掉的项目"}</span></div>
        <div class="sp-panel nemesis ${better ? "flip" : ""}">
          <div class="nem-head">
            <div>${avatar(p, p.name)}<b>${esc(p.name)}</b></div>
            <span class="nem-vs">VS</span>
            <div>${avatar(q, q.name)}<b>${esc(q.name)}</b></div>
          </div>
          ${metrics.map((m) => {
            const tot = Math.abs(m.av) + Math.abs(m.bv) || 1;
            return `<div class="nem-row"><span class="nem-val">${m.fmt(m.av)}</span>
              <div class="nem-bar"><i class="l" style="width:${(Math.abs(m.av) / tot) * 100}%"></i><i class="r" style="width:${(Math.abs(m.bv) / tot) * 100}%"></i><em>${m.label}</em></div>
              <span class="nem-val win">${m.fmt(m.bv)}</span></div>`; }).join("")}
          <p class="muted small">${better ? `本周${metrics.length}项数据，${esc(q.name)}全部落后。` : `连被${esc(q.name)}说菜都没法反驳：以上${metrics.length}项全部输给了他。`}</p>
        </div>
      </section>`;
  }

  // ---------- 昨日表情包 (generati ogni giorno dalle partite di ieri) ----------
  let dailyPromise;
  function loadDaily() {
    dailyPromise ??= Promise.allSettled(CFG.players.map(getPlayer)).then((res) => {
      const players = res.filter((r) => r.status === "fulfilled").map((r) => r.value).map((p) => ({
        id: p.id, index: p.ctx.index, name: p.name, heroes: p.heroes, data: p.data, hidden: p.ctx.hidden, praise: p.praise,
        arcanaHeroes: p.ctx.inventory?.arcanaHeroes || [],
        // le partite già usate nelle battute settimanali non vengono ripetute
        exclude: new Set([...(p.quotes.usedMatches || []), ...p.roasts.map((r) => r.matchId).filter(Boolean)]),
      }));
      return { ...window.TribunaleDaily.generate(players), byId: new Map(players.map((x) => [x.id, x])) };
    });
    return dailyPromise;
  }

  function dailyCard(m, heroes, i, withName) {
    const hero = m.heroId && heroes[m.heroId];
    return `<figure class="meme daily" style="--d:${i * 80}ms">
      <div class="meme-img" style="${hero ? `background-image:url('${API.heroImg(hero)}')` : ""}"></div>
      <figcaption>
        <span class="meme-top">${esc(m.top)}</span>
        <span class="meme-bottom">${esc(m.bottom)}</span>
      </figcaption>

      <span class="daily-info">${withName ? `<a class="daily-name" href="#/p/${m.playerId}">${esc(m.name)}</a> · ` : ""}${esc(m.info)}</span>
    </figure>`;
  }

  const dailyDate = (d) => d.toLocaleDateString(LOCALE, { month: "long", day: "numeric", weekday: "short" });

  // conto alla rovescia fino alle 6:00 (quando i meme di ieri si rigenerano)
  let countdownTimer;
  function startCountdown() {
    clearInterval(countdownTimer);
    const tick = () => {
      const el = document.getElementById("dcount");
      if (!el) return clearInterval(countdownTimer);
      const now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 6);
      if (next <= now) next.setDate(next.getDate() + 1);
      const t = Math.floor((next - now) / 1000), pad = (n) => String(n).padStart(2, "0");
      el.textContent = `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`;
    };
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  async function renderDailyHome() {
    const el = document.getElementById("daily-home");
    if (!el) return;
    const d = await loadDaily();
    const top = [...d.memes.values()].map((l) => l[0]).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 6);
    el.innerHTML = `
      <section class="block daily-block">
        <div class="block-head"><h2>昨日表情包</h2><span class="muted small">${dailyDate(d.date)}晚 · 下次更新 <b class="countdown" id="dcount"></b></span></div>
        ${top.length ? `<div class="memes daily-grid">${top.map((m, i) => dailyCard(m, d.byId.get(m.playerId).heroes, i, true)).join("")}</div>`
                     : `<p class="muted daily-empty">昨天全员休战，本庭今日无料可黑。</p>`}
      </section>`;
    startCountdown();
  }

  async function renderDailyPlayer(p) {
    const el = document.getElementById("daily-p");
    if (!el || p.ctx.hidden) return;
    const d = await loadDaily();
    const list = d.memes.get(p.id) || [];
    if (!list.length || location.hash.indexOf(p.id) < 0) return;
    el.innerHTML = `
      <section class="block daily-block">
        <div class="block-head"><h2>昨日表情包</h2><span class="muted small">${dailyDate(d.date)}晚 · 根据昨晚的比赛自动生成</span></div>
        <div class="memes daily-grid">${list.map((m, i) => dailyCard(m, p.heroes, i, false)).join("")}</div>
      </section>`;
  }

  // ---------- Home: 今日黄历, 颁奖典礼, 耻辱排行榜, 全员作息表 (tutto automatico) ----------
  function renderHomeExtras(players) {
    const X = window.TribunaleHome;
    const heroes = players[0]?.heroes || {};
    // premi e classifiche: solo "imputati" con partite visibili
    const accused = players.filter((p) => !p.praise && !p.ctx.hidden && p.stats.n > 0);

    // 今日黄历
    const today = new Date();
    const fEl = document.getElementById("fortune-home");
    if (fEl) fEl.innerHTML = `
      <section class="block">
        <div class="block-head"><h2>今日黄历</h2><span class="muted small">${today.toLocaleDateString(LOCALE, { month: "long", day: "numeric", weekday: "long" })} · 每天自动更新</span></div>
        <div class="almanac">${X.fortunes(players, heroes).map((f, i) => {
          const h = heroes[f.hero];
          return `<a class="alm ${f.p.praise ? "alm-gold" : ""}" href="#/p/${f.p.id}" style="--d:${i * 60}ms">
            <div class="alm-head"><b>${esc(f.p.name)}</b><span class="alm-stars">${f.starsText}</span></div>
            <div class="alm-row yi"><i>宜</i><span>${esc(f.yi)}</span></div>
            <div class="alm-row ji"><i>忌</i><span>${esc(f.ji)}</span></div>
            <div class="alm-hero">${h ? `<img src="${API.heroIcon(h)}" alt="" loading="lazy">` : ""}<span>幸运英雄：${esc(h?.localized_name || "随缘")}</span></div>
          </a>`; }).join("")}</div>
      </section>`;

    // 本周颁奖典礼
    const aEl = document.getElementById("awards-home");
    const aw = X.awards(accused);
    if (aEl && aw.length) aEl.innerHTML = `
      <section class="block">
        <div class="block-head"><h2>本周颁奖典礼</h2><span class="muted small">没有人想要的奖项 · 每周自动评选</span></div>
        <div class="awards">${aw.map((a, i) => `
          <a class="award" href="#/p/${a.p.id}" style="--d:${i * 80}ms;${colorStyle(a.p.cfg)}">
            <div class="award-trophy">${a.icon}</div>
            <div class="award-title">${esc(a.title)}</div>
            ${avatar(a.p, a.p.name, "award-av")}
            <b class="award-name">${esc(a.p.name)}</b>
            <span class="award-value">${esc(a.value)}</span>
            <p>${esc(a.caption)}</p>
          </a>`).join("")}</div>
      </section>`;

    // 耻辱排行榜
    const bEl = document.getElementById("board-home");
    if (bEl && accused.length >= 2) {
      const draw = (id) => {
        const { b, rows } = X.board(accused, id);
        bEl.querySelector(".board-rows").innerHTML = rows.map((r, i) => `
          <a class="brow" href="#/p/${r.p.id}" style="--d:${i * 60}ms;${colorStyle(r.p.cfg)}">
            <span class="brank">${i === 0 ? "👑" : i + 1}</span>
            ${avatar(r.p, r.p.name, "brow-av")}
            <span class="bname">${esc(r.p.name)}</span>
            <div class="bbar"><i style="width:${r.pct}%"></i></div>
            <b class="bval">${esc(r.text)}</b>
          </a>`).join("");
        bEl.querySelectorAll(".btab").forEach((t) => t.classList.toggle("on", t.dataset.id === b.id));
      };
      bEl.innerHTML = `
        <section class="block">
          <div class="block-head"><h2>耻辱排行榜</h2><span class="muted small">第一名不是什么好事</span></div>
          <div class="sp-panel board">
            <div class="btabs">${X.BOARDS.map((b) => `<button class="btab" data-id="${b.id}">${b.label}</button>`).join("")}</div>
            <div class="board-rows"></div>
          </div>
        </section>`;
      bEl.querySelectorAll(".btab").forEach((t) => t.addEventListener("click", () => draw(t.dataset.id)));
      draw("deaths");
    }


    // 至宝追踪器: per chi ha l'inventario attivo, quanto gioca gli eroi di cui ha l'arcana
    const tEl = document.getElementById("arcana-home");
    const trackers = players.filter((p) => p.ctx.inventory && p.stats.n);
    if (tEl && trackers.length) {
      const wk = Math.floor((Date.now() / 86400000 + 3) / 7);
      const CAPS = ["至宝不上场，等于白抽。", "钱花在哪里，英雄就选在哪里。", "每一局至宝出场，都是在给抽奖的钱一个交代。"];
      tEl.innerHTML = trackers.map((p) => {
        const inv = p.ctx.inventory;
        const ids = new Set(inv.arcanaHeroes);
        const games = p.stats.matches.filter((m) => ids.has(m.hero_id)).length;
        const pct = Math.round((games / p.stats.n) * 100);
        const fav = [...inv.arcana].sort((a, b) => b.week - a.week)[0];
        return `
      <section class="block">
        <div class="block-head"><h2>${esc(p.name)} · 至宝追踪</h2><span class="muted small">本周${p.stats.n}局 · 根据Steam库存与比赛自动统计</span></div>
        <a class="sp-panel tracker" href="#/p/${p.id}" style="${colorStyle(p.cfg)}">
          <div class="tracker-ring" style="--p:${pct}"><div><b>${pct}%</b><span>至宝出场率</span></div></div>
          <div class="tracker-main">
            <p class="tracker-line">本周<b>${games}</b>局用了有至宝的英雄${fav && fav.week ? `，出场最多的是<b>${esc(fav.hero)}</b>（${fav.week}局）` : ""}。<em>${CAPS[wk % CAPS.length]}</em></p>
            <div class="tracker-items">${inv.arcana.map((a, i) => `
              <div class="titem ${a.week ? "on" : ""}" style="--d:${i * 70}ms" title="${esc(a.name)} · 本周${a.week}局">
                <img src="${API.itemImg(a.icon)}" alt="" loading="lazy">
                <span>${esc(a.hero || "")}</span>
                <b>${a.week ? `×${a.week}` : "吃灰中"}</b>
              </div>`).join("")}</div>
          </div>
        </a>
      </section>`; }).join("");
    }
    // 全员作息表
    const gEl = document.getElementById("group-heat");
    const all = players.filter((p) => !p.ctx.hidden).flatMap((p) => p.stats.matches);
    if (gEl && all.length) gEl.innerHTML = `
      <section class="block">
        <div class="block-head"><h2>全员作息表</h2><span class="muted small">这群人到底什么时候睡觉 · 本周${all.length}局</span></div>
        <div class="sp-panel">${heatmap(all)}</div>
      </section>`;
  }
  // ---------- grafici ----------
  function kdChart(matches, heroes) {
    const ms = [...matches].reverse();
    const max = Math.max(5, ...ms.map((m) => Math.max(m.kills, m.deaths)));
    const W = 26, H = 90, w = ms.length * W;
    const bars = ms.map((m, i) => {
      const x = i * W + 5, kh = (m.kills / max) * H, dh = (m.deaths / max) * H;
      const name = esc(heroes[m.hero_id]?.localized_name || "");
      return `<g class="kd-bar" style="--d:${i * 30}ms"><title>${name} ${m.kills}/${m.deaths}/${m.assists} · ${m.win ? "胜" : "负"}</title>
        <rect class="k" x="${x}" y="${H - kh}" width="${W - 10}" height="${kh}" rx="3"/>
        <rect class="d" x="${x}" y="${H + 4}" width="${W - 10}" height="${dh}" rx="3"/>
        <circle class="${m.win ? "w" : "l"}" cx="${x + (W - 10) / 2}" cy="${H + 2}" r="2.4"/>
        ${m.deaths >= 10 ? `<text class="skull" x="${x + (W - 10) / 2}" y="${H + 4 + dh + 13}">💀</text>` : ""}
      </g>`;
    }).join("");
    return `<svg class="kd-chart" viewBox="0 0 ${w} ${H * 2 + 24}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="人头与死亡">
      <line x1="0" x2="${w}" y1="${H + 2}" y2="${H + 2}" class="axis"/>${bars}</svg>
      <div class="legend"><span><i class="lg-k"></i>击杀</span><span><i class="lg-d"></i>死亡</span><span>💀 单局10死以上</span></div>`;
  }

  function heatmap(matches) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: DAYS }, (_, i) => new Date(today.getTime() - (DAYS - 1 - i) * 86400000));
    const grid = days.map(() => Array(24).fill(0));
    for (const m of matches) {
      const d = new Date(m.start_time * 1000);
      const row = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - days[0]) / 86400000);
      if (row >= 0 && row < DAYS) grid[row][d.getHours()]++;
    }
    const max = Math.max(1, ...grid.flat());
    return `<div class="heat">
      <div class="heat-hours"><span></span>${Array.from({ length: 24 }, (_, h) => `<span>${h % 6 === 0 ? h : ""}</span>`).join("")}</div>
      ${grid.map((row, r) => `<div class="heat-row"><span>${WEEKDAYS[days[r].getDay()]}</span>${row.map((c, h) =>
        `<i class="${h >= 23 || h < 6 ? "late" : ""}" style="--a:${c ? 0.25 + (c / max) * 0.75 : 0}" title="${WEEKDAYS[days[r].getDay()]} ${h}:00 · ${c}局"></i>`).join("")}</div>`).join("")}
      <div class="legend"><span><i class="lg-heat"></i>打刀时段</span><span><i class="lg-late"></i>23点–6点（修仙时段）</span></div>
    </div>`;
  }


  // 至宝仓库: galleria delle arcana + rarità dell'inventario
  const RARITY_COLORS = { "至宝": "#ade55c", "不朽": "#e4ae39", "传说": "#d32ce6", "神话": "#8847ff", "稀有": "#4b69ff", "罕见": "#5e98d9", "普通": "#b0c3d9", "赛季": "#fff34f" };
  function inventoryBlock(p) {
    const inv = p.ctx.inventory;
    const order = ["至宝", "不朽", "传说", "神话", "稀有", "罕见", "普通", "赛季"];
    const rar = order.filter((r) => inv.rarity?.[r]).map((r) => ({ r, n: inv.rarity[r] }));
    const tot = rar.reduce((t, x) => t + x.n, 0) || 1;
    const when = new Date(inv.fetchedAt).toLocaleDateString(LOCALE, { month: "numeric", day: "numeric" });
    return `
      <section class="block">
        <div class="block-head"><h2>至宝仓库</h2><span class="muted small">Steam库存自动扫描 · ${when}</span></div>
        <div class="sp-panel vault">
          <div class="vault-stats">
            <div><b>${inv.total}</b><span>件饰品</span></div>
            <div class="arc"><b>${inv.rarity?.["至宝"] ?? inv.arcana.length}</b><span>至宝</span></div>
            <div><b>${inv.rarity?.["不朽"] ?? 0}</b><span>不朽</span></div>
            <div><b>${inv.rarity?.["传说"] ?? 0}</b><span>传说</span></div>
          </div>
          <div class="rarity-bar">${rar.map((x) => `<i style="flex:${x.n};background:${RARITY_COLORS[x.r]}" title="${x.r} ${x.n}"></i>`).join("")}</div>
          <div class="rarity-legend">${rar.map((x) => `<span><i style="background:${RARITY_COLORS[x.r]}"></i>${x.r} ${x.n}</span>`).join("")}</div>
          <div class="arcanas">${inv.arcana.map((a, i) => `
            <figure class="arcana" style="--d:${i * 90}ms">
              <div class="arcana-img"><img src="${API.itemImg(a.icon)}" alt="" loading="lazy"></div>
              <figcaption><b>${esc(a.name)}</b><span>${esc(a.hero || "")}</span>
                <em>生涯出场 ${a.life}场${a.week ? ` · 本周${a.week}场` : ""}</em></figcaption>
            </figure>`).join("")}</div>
        </div>
      </section>`;
  }
  function specialBlock(sp, heroesMap = {}) {
    if (!sp || (!sp.cards.length && !sp.curve && !sp.xiuxian && !sp.babysit && !sp.axes)) return "";
    const curve = sp.curve ? `
      <div class="sp-panel sp-curve">
        <div class="sp-head"><span>🥃</span><div><h4>酒精曲线</h4><p class="muted small">每晚第几局的胜率——越喝越……</p></div></div>
        <div class="curve">${sp.curve.map((c, i) => `
          <div class="curve-col" style="--h:${c.n ? Math.max(6, c.wr) : 0}%;--d:${i * 120}ms">
            <b class="${c.n ? (c.wr >= 50 ? "pos" : "neg") : "muted"}">${c.n ? Math.round(c.wr) + "%" : "–"}</b>
            <div class="curve-bar"><i class="lvl${i}"></i><span class="glass">${["🥃", "🥃🥃", "🥃🥃🥃", "🍾"][i]}</span></div>
            <span>${esc(c.label)}</span><em>${c.n}场</em>
          </div>`).join("")}</div>
      </div>` : "";
    const xx = sp.xiuxian ? `
      <div class="sp-panel sp-xiu">
        <div class="sp-head"><span>🧘</span><div><h4>修仙进度</h4><p class="muted small">23点后开的局：${sp.xiuxian.games}场 · ${fmt1(sp.xiuxian.hours)}小时</p></div></div>
        <div class="xiu-level">${esc(sp.xiuxian.level)}</div>
        <div class="xiu-bar"><i style="width:${Math.max(4, Math.min(100, sp.xiuxian.pct)).toFixed(0)}%"></i></div>
        <div class="xiu-steps">${["炼气", "筑基", "金丹", "元婴", "化神", "渡劫", "飞升"].map((l) => `<span class="${l === sp.xiuxian.level ? "on" : ""}">${l}</span>`).join("")}</div>
        <p class="muted small">${sp.xiuxian.next ? `距离【${esc(sp.xiuxian.next)}】还差 ${fmt1(sp.xiuxian.toNext)} 小时深夜刀塔。再往后就不是飞升，是升天。` : "已飞升。下一步：升天。"}</p>
      </div>` : "";
    const ax = sp.axes && sp.axes.n ? `
      <div class="sp-panel sp-axes">
        <div class="sp-head"><span>🪓</span><div><h4>三板斧</h4><p class="muted small">本周${sp.axes.n}场，按英雄分配</p></div></div>
        <div class="axes-bar">${sp.axes.top.map((a, i) => { const h = heroesMap[a.hero_id]; return `<div class="axe" style="flex:${a.games};--d:${i * 150}ms;${h ? `background-image:url('${API.heroImg(h)}')` : ""}"><b>${a.games}</b><span>${esc(h?.localized_name || "")}</span></div>`; }).join("")}${sp.axes.others ? `<div class="axe other" style="flex:${sp.axes.others}"><b>${sp.axes.others}</b><span>其他</span></div>` : ""}</div>
      </div>` : "";
    const bs = sp.babysit ? (() => {
      const max = Math.max(40, (sp.babysit.minutes || 0) + 5), pct = (m) => (m / max) * 100;
      return `
      <div class="sp-panel sp-baby">
        <div class="sp-head"><span>👩‍🍼</span><div><h4>保姆计时器</h4><p class="muted small">前期需要被保护多少分钟才能自己走路</p></div></div>
        <div class="baby-row"><span>普通人</span><div class="baby-track"><i style="width:${pct(sp.babysit.normal)}%"></i><em style="left:${pct(sp.babysit.normal)}%">${sp.babysit.normal}分钟</em></div></div>
        <div class="baby-row hot"><span>B神</span><div class="baby-track"><i class="${sp.babysit.minutes ? "" : "inf"}" style="width:${sp.babysit.minutes ? pct(sp.babysit.minutes) : 100}%"></i><em style="left:${sp.babysit.minutes ? pct(sp.babysit.minutes) : 96}%">${sp.babysit.minutes ? sp.babysit.minutes + "分钟" : "∞"}</em></div></div>
        <div class="baby-scale">${[0, 10, 20, 30, 40].filter((m) => m <= max).map((m) => `<span style="left:${pct(m)}%">${m}'</span>`).join("")}</div>
      </div>`; })() : "";
    return `
      <section class="block">
        <div class="block-head"><h2>专项调查</h2><span class="muted small">部分数据为估算，但丢人是真的</span></div>
        ${sp.cards.length ? `<div class="sp-cards">${sp.cards.map((c) => `
          <div class="kpi sp-card"><span class="sp-icon">${c.icon}</span><span class="kpi-label">${esc(c.label)}</span><b class="kpi-val ${c.cls || ""}">${esc(c.value)}</b><span class="kpi-sub">${esc(c.sub)}</span></div>`).join("")}</div>` : ""}
        ${curve || xx ? `<div class="sp-grid">${curve}${xx}</div>` : ""}
        ${bs}${ax}
      </section>`;
  }

  function kpi(label, value, sub, cls = "") {
    return `<div class="kpi"><span class="kpi-label">${label}</span><b class="kpi-val ${cls}">${value}</b><span class="kpi-sub">${sub}</span></div>`;
  }

  function heroTile(h, hero, praise = false) {
    const wr = Math.round((h.wins / h.games) * 100);
    return `<div class="htile">
      <div class="htile-img" style="${hero ? `background-image:url('${API.heroImg(hero)}')` : ""}"></div>
      <div class="htile-body">
        <b>${esc(hero?.localized_name || "英雄 #" + h.hero_id)}</b>
        <span>${praise ? `${h.wins}场胜利` : `${h.games}场 · <em class="${wr >= 50 ? "pos" : "neg"}">${wr}%</em> · 死${h.d}次`}</span>
        <div class="bar"><i style="width:${wr}%"></i></div>
      </div>
    </div>`;
  }

  function matchRow(m, hero) {
    const mode = GAME_MODES[m.game_mode] || "其他";
    const ranked = m.lobby_type === 7 ? "天梯" : "普通";
    return `<a class="mrow ${m.win ? "w" : "l"}" href="https://www.opendota.com/matches/${m.match_id}" target="_blank" rel="noopener">
      <div class="mrow-hero" style="${hero ? `background-image:url('${API.heroImg(hero)}')` : ""}"></div>
      <div class="mrow-name"><b>${esc(hero?.localized_name || "英雄")}</b><span>${ranked} · ${mode}</span></div>
      <div class="mrow-res"><b>${m.win ? "胜利" : "失败"}</b><span>${ago(m.start_time)}</span></div>
      <div class="mrow-kda"><b>${m.kills}<i>/</i>${m.deaths}<i>/</i>${m.assists}</b><span>KDA ${fmt1(m.kda)}</span></div>
      <div class="mrow-x"><b>${m.gold_per_min ?? "–"}</b><span>GPM</span></div>
      <div class="mrow-x"><b>${m.last_hits ?? "–"}</b><span>补刀</span></div>
      <div class="mrow-x"><b>${dur(m.duration)}</b><span>时长</span></div>
    </a>`;
  }

  // ---------- ticker + nav ----------
  function setTicker(items) {
    const el = document.getElementById("ticker");
    if (!items.length) { el.textContent = "暂无新闻：被告们本周表现良好。非常可疑。"; return; }
    const html = items.map((t) => `<span class="ticker-item">${t}</span>`).join("");
    el.innerHTML = html + html; // duplicato per lo scorrimento continuo
    el.style.setProperty("--dur", Math.max(30, items.length * 9) + "s");
  }

  async function renderNav() {
    const nav = document.getElementById("topnav");
    nav.innerHTML = CFG.players.map((c) => {
      const id = API.toAccountId(c.steam64);
      return `<a href="#/p/${id}" data-id="${id}" style="${colorStyle(c)}">${esc(c.alias || "…")}</a>`;
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
