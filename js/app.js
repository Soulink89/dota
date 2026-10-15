(function () {
  const CFG = window.TRIBUNALE_CONFIG;
  const API = window.TribunaleAPI;
  const R = window.TribunaleRoast;
  const app = document.getElementById("app");
  const DAYS = CFG.days || 7;
  const LOCALE = "zh-CN";


  const GAME_MODES = { 1: "全英雄选择", 2: "队长模式", 3: "随机征召", 4: "单一征召", 5: "全部随机", 16: "队长征召", 18: "技能征召", 22: "全英雄选择", 23: "加速模式" };

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

  // ---------- caricamento ----------
  const cache = new Map();
  async function getPlayer(cfg) {
    const id = API.toAccountId(cfg.steam64);
    if (!cache.has(id)) {
      cache.set(id, (async () => {
        const [data, heroes] = await Promise.all([API.loadPlayer(id, DAYS), API.loadHeroes()]);
        const p = data.profile?.profile || {};
        const name = cfg.alias || p.personaname || `玩家 ${id}`;
        const stats = R.computeStats(data.matches, DAYS);
        const ctx = { persona: cfg.persona, rankTier: data.profile?.rank_tier };
        return { id, cfg, data, heroes, name, steamName: p.personaname, stats, ctx,
          verdict: R.verdict(stats), roasts: R.buildRoasts(stats, name, heroes, ctx), facts: R.factCheck(stats, ctx) };
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

  // ---------- HOME ----------
  async function renderHome() {
    document.title = "刀塔法庭";
    app.innerHTML = `
      <section class="hero-intro">
        <p class="eyebrow">每周庭审 · 最近${DAYS}天</p>
        <h1>数据不会说谎。<br><span class="grad">我们会，但只是为了好笑。</span></h1>
        <p class="lead">本庭每周审查被告们的比赛，打分、出成绩单、当庭宣判。不接受上诉。</p>
      </section>
      <section class="cards" id="cards">
        ${CFG.players.map(() => `<article class="pcard skeleton"><div class="sk sk-av"></div><div class="sk sk-l"></div><div class="sk sk-s"></div></article>`).join("")}
        <article class="pcard pcard-empty">
          <div class="empty-icon">➕</div>
          <h3>被告席空缺</h3>
          <p>下一位被告即将到庭。会是谁呢？</p>
        </article>
      </section>`;

    const cards = document.querySelectorAll("#cards .pcard.skeleton");
    const tickerItems = [];
    await Promise.all(CFG.players.map(async (cfg, i) => {
      try {
        const p = await getPlayer(cfg);
        cards[i].outerHTML = playerCard(p);
        p.roasts.slice(0, 3).forEach((r) => tickerItems.push(`<b>${esc(p.name)}</b>：${esc(r.text)}`));
      } catch (e) {
        cards[i].outerHTML = `<article class="pcard pcard-error"><h3>证据暂缺</h3><p>OpenDota 没有响应，请稍后再试。</p></article>`;
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
            <span class="tag">${esc(p.cfg.accusa || defaultTag)}</span>
            <h3>${esc(p.name)}</h3>
            <span class="muted small">${esc(medalName(p.data.profile?.rank_tier))}</span>
          </div>
          <div class="grade grade-sm ${gradeClass(v.voto)}"><span>${esc(v.label)}</span></div>
        </div>
        <div class="pcard-stats">
          <div><b>${s.n}</b><span>场次</span></div>
          <div><b class="${s.wr >= 50 ? "pos" : "neg"}">${s.n ? Math.round(s.wr) + "%" : "–"}</b><span>胜率</span></div>
          <div><b>${s.n ? fmt1(s.avgKda) : "–"}</b><span>KDA</span></div>
        </div>
        ${resultStrip(s)}
        ${top ? `<p class="pcard-roast"><span>${top.icon}</span> ${esc(top.text)}</p>` : ""}
        <span class="pcard-cta">查看卷宗 →</span>
      </div>
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
    const life = wl && wl.win + wl.lose ? `${wl.win}胜 – ${wl.lose}负 · ${((wl.win / (wl.win + wl.lose)) * 100).toFixed(1)}%` : "–";
    const memeHeroes = s.heroes.length ? s.heroes.map((h) => p.heroes[h.hero_id]) : [null];

    app.innerHTML = `
      <section class="phero">
        <div class="phero-bg" style="${fav ? `background-image:url('${API.heroImg(fav)}')` : ""}"></div>
        <div class="phero-inner">
          <a href="#/" class="back">← 法庭</a>
          <div class="phero-main">
            ${avatar(p, p.name, "avatar-xl")}
            <div class="phero-id">
              <span class="tag">${esc(cfg.accusa || defaultTag)}</span>
              <h1>${esc(p.name)}</h1>
              ${p.steamName && p.steamName !== p.name ? `<p class="aka">Steam：${esc(p.steamName)}${cfg.persona?.claimedRank ? ` · 自称“${esc(cfg.persona.claimedRank)}实力”` : ""}</p>` : ""}
              <div class="phero-meta">
                ${medal(prof.rank_tier)}
                <div><span class="muted small">段位</span><b>${esc(medalName(prof.rank_tier))}${prof.leaderboard_rank ? ` · #${prof.leaderboard_rank}` : ""}</b></div>
                <div><span class="muted small">生涯战绩</span><b>${life}</b></div>
              </div>
              <div class="phero-links">
                ${sourceBadge(p)}
                <a class="pill pill-link" href="https://www.opendota.com/players/${id}" target="_blank" rel="noopener">OpenDota ↗</a>
                <a class="pill pill-link" href="https://www.dotabuff.com/players/${id}" target="_blank" rel="noopener">Dotabuff ↗</a>
                <a class="pill pill-link" href="https://steamcommunity.com/profiles/${esc(cfg.steam64)}" target="_blank" rel="noopener">Steam ↗</a>
              </div>
            </div>
            <div class="verdict">
              <span class="eyebrow">本周成绩单</span>
              <div class="grade ${gradeClass(v.voto)}"><span>${esc(v.label)}</span></div>
              <p>${esc(v.text)}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="kpis">
        ${kpi("场次", s.n, `浪费了 ${fmt1(s.hours)} 小时人生`)}
        ${kpi("胜率", s.n ? Math.round(s.wr) + "%" : "–", `${s.wins}胜 · ${s.losses}负`, s.n ? (s.wr >= 50 ? "pos" : "neg") : "")}
        ${kpi("KDA", s.n ? fmt1(s.avgKda) : "–", `${s.kills} / ${s.deaths} / ${s.assists}`)}
        ${kpi("死亡", s.deaths, s.n ? `每局 ${fmt1(s.avgDeaths)} 次` : "–", s.avgDeaths >= 8 ? "neg" : "")}
        ${kpi("平均GPM", s.n ? Math.round(s.avgGpm) : "–", s.n ? `${Math.round(s.avgXpm)} XPM` : "–")}
        ${kpi("当前连续", s.n ? `${s.streak}${s.streakWin ? "连胜" : "连败"}` : "–", s.n ? (s.streakWin ? "火力全开" : "自由落体") : "–", s.n ? (s.streakWin ? "pos" : "neg") : "")}
      </section>

      ${p.facts.length ? `
      <section class="block">
        <div class="block-head"><h2>吹牛鉴定</h2><span class="muted small">他说的 vs 数据说的</span></div>
        <div class="facts">${p.facts.map((f, i) => `
          <article class="fact fact-${f.verdict}" style="--d:${i * 70}ms">
            <div class="fact-claim"><span class="muted small">他说</span><b>${esc(f.claim)}</b></div>
            <div class="fact-reality"><span class="muted small">数据说</span><b>${esc(f.reality)}</b></div>
            <div class="stamp">${{ true: "属实", half: "存疑", false: "吹牛" }[f.verdict]}</div>
          </article>`).join("")}</div>
      </section>` : ""}

      <section class="block">
        <div class="block-head"><h2>战绩走势</h2><span class="muted small">从旧到新</span></div>
        ${resultStrip(s)}
      </section>

      ${p.roasts.length ? `
      <section class="block">
        <div class="block-head">
          <h2>本周表情包</h2>
          <button class="btn btn-ghost btn-sm" id="reroll">🎲 换一批</button>
        </div>
        <div class="memes" id="memes">${p.roasts.slice(0, 3).map((r, i) => memeCard(r, p.heroes[r.heroId] || memeHeroes[i % memeHeroes.length], i)).join("")}</div>
      </section>

      <section class="block">
        <div class="block-head"><h2>罪状</h2><span class="muted small">共 ${p.roasts.length} 项指控</span></div>
        <div class="charges">${p.roasts.map((r, i) => `
          <article class="charge" style="--d:${i * 60}ms">
            <div class="charge-icon">${r.icon}</div>
            <div><h4>${esc(r.title)}</h4><p>${esc(r.text)}</p></div>
          </article>`).join("")}</div>
      </section>` : ""}

      ${s.heroes.length ? `
      <section class="block">
        <div class="block-head"><h2>本周英雄</h2></div>
        <div class="heroes">${s.heroes.slice(0, 8).map((h) => heroTile(h, p.heroes[h.hero_id])).join("")}</div>
      </section>` : ""}

      <section class="block">
        <div class="block-head"><h2>最近比赛</h2><span class="muted small">最近${DAYS}天</span></div>
        ${s.n ? `<div class="matches">${s.matches.map((m) => matchRow(m, p.heroes[m.hero_id])).join("")}</div>`
              : `<p class="muted">最近${DAYS}天没有比赛。</p>`}
      </section>`;

    setTicker(p.roasts.map((r) => `<b>${esc(p.name)}</b>：${esc(r.text)}`));

    document.getElementById("reroll")?.addEventListener("click", () => {
      const fresh = R.buildRoasts(s, p.name, p.heroes, p.ctx);
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
        <b>${esc(hero?.localized_name || "英雄 #" + h.hero_id)}</b>
        <span>${h.games}场 · <em class="${wr >= 50 ? "pos" : "neg"}">${wr}%</em></span>
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
