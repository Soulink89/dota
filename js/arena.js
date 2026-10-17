// ============================================================
//  刀塔乱斗 · idle game in cima alla home
//  Ogni giocatore appare come l'eroe più giocato degli ultimi 7 giorni, con gli oggetti che compra
//  più spesso. Il ritmo NON è casuale: viene dalle partite reali del "giorno di gioco" precedente
//  (06:00 → 06:00): ogni 10 uccisioni = 1 colpo al minuto, ogni 10 morti = 1 morte al minuto,
//  ogni 10 assist = 1 assist al minuto. Chi colpisce sceglie chi ieri è morto più di lui.
//  Tutto è calcolato dall'orologio (non da Math.random): chiunque apra la pagina vede la stessa
//  partita allo stesso punto, e il livello cresce per tutto il giorno.
//  In cielo 大P神 (Goku con le ali) guarda, e ogni minuto dà uno schiaffo a 大金神.
// ============================================================
(function () {
  const API = window.TribunaleAPI;
  const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2";
  const ITEMS_URL = "https://cdn.jsdelivr.net/npm/dotaconstants@latest/build/item_ids.json";
  const DAY_START_HOUR = 6;
  const XP = { kill: 100, assist: 50 };
  const MAX_LV = 30;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isWin = (m) => (m.player_slot < 128) === m.radiant_win;

  // oggetti "di base" che non dicono niente dello stile di un giocatore
  const BORING = new Set(["tpscroll", "ward_observer", "ward_sentry", "ward_dispenser", "smoke_of_deceit", "dust", "tango", "flask",
    "clarity", "enchanted_mango", "faerie_fire", "branches", "magic_stick", "quelling_blade", "blood_grenade", "aegis", "cheese", "refresher_shard"]);
  let itemIdsP;
  const loadItemIds = () => (itemIdsP ??= fetch(ITEMS_URL).then((r) => r.json()).catch(() => ({})));

  function dayStart(now = Date.now()) {
    const d = new Date(now);
    d.setHours(DAY_START_HOUR, 0, 0, 0);
    if (d.getTime() > now) d.setDate(d.getDate() - 1);
    return d.getTime();
  }

  // partite di ieri; se ieri non ha giocato, l'ultimo giorno della settimana in cui ha giocato
  function dayStats(matches) {
    const today = dayStart();
    for (let back = 1; back <= 7; back++) {
      const from = today - back * 86400000, to = from + 86400000;
      const ms = matches.filter((m) => m.start_time * 1000 >= from && m.start_time * 1000 < to);
      if (ms.length) {
        const sum = (k) => ms.reduce((t, m) => t + (m[k] || 0), 0);
        return { back, n: ms.length, wins: ms.filter(isWin).length, k: sum("kills"), d: sum("deaths"), a: sum("assists") };
      }
    }
    return null;
  }

  function topItems(matches, heroId, ids) {
    const cnt = {};
    for (const m of matches) {
      if (heroId && m.hero_id !== heroId) continue;
      for (let i = 0; i < 6; i++) {
        const key = ids[m["item_" + i]];
        if (key && !BORING.has(key) && !/^recipe_/.test(key)) cnt[key] = (cnt[key] || 0) + 1;
      }
    }
    return Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  }

  function heroOf(p) {
    const counts = {};
    for (const m of p.rawMatches || []) counts[m.hero_id] = (counts[m.hero_id] || 0) + 1;
    const arcHeroes = new Set((p.ctx.inventory?.arcana || []).map((a) => a.heroId));
    // chi ha un'arcana e questa settimana ha giocato quell'eroe si presenta "vestito a festa"
    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top = ranked.find(([id]) => arcHeroes.has(Number(id))) || ranked[0];
    return top ? Number(top[0]) : null;
  }

  function buildFighters(players, ids) {
    const out = [];
    for (const p of players) {
      if (p.legend) continue; // 大P神 sta in cielo
      const matches = p.rawMatches || [];
      const heroId = heroOf(p);
      const hero = heroId ? p.heroes[heroId] : null;
      const key = hero?.name?.replace("npc_dota_hero_", "");
      const day = dayStats(matches);
      // arcana: se ha l'arcana dell'eroe che gioca (inventario scansionato), la indossa
      const arc = p.ctx.inventory?.arcana?.find((a) => a.heroId === heroId);
      out.push({
        id: p.id, name: p.name, color: p.cfg.color || "#f2b632",
        heroId, heroName: hero?.localized_name || "", key,
        render: key ? `${CDN}/videos/dota_react/heroes/renders/${key}.png` : "",
        portrait: API.heroImg(hero), avatar: p.data.profile?.profile?.avatarfull || "",
        items: topItems(matches, heroId, ids).map((k) => `${CDN}/images/dota_react/items/${k}.png`),
        arcana: arc ? { img: API.itemImg(arc.icon), name: arc.name } : null,
        day, rate: day ? { k: day.k / 10, d: day.d / 10, a: day.a / 10 } : { k: 0, d: 0, a: 0 },
      });
    }
    // bersagli: chi ieri è morto più di me (se nessuno, il più "morto" della compagnia)
    for (const f of out) {
      const dd = (x) => x.day?.d ?? -1;
      let t = out.filter((o) => o !== f && o.day && dd(o) > dd(f)).sort((a, b) => dd(b) - dd(a));
      if (!t.length) t = out.filter((o) => o !== f && o.day).sort((a, b) => dd(b) - dd(a)).slice(0, 1);
      f.targets = t;
    }
    return out;
  }

  // conteggio deterministico degli eventi dall'inizio della giornata: fase diversa per ogni giocatore
  const phase = (i, kind) => ((i * 0.37 + kind * 0.21) % 1);
  function counts(f, i, t) {
    const min = (t - dayStart(t)) / 60000;
    const c = (r, kind) => (r > 0 ? Math.floor(min * r + phase(i, kind)) : 0);
    return { k: c(f.rate.k, 1), d: c(f.rate.d, 2), a: c(f.rate.a, 3) };
  }
  const xpOf = (c) => c.k * XP.kill + c.a * XP.assist;
  // livello n richiede 2000·(n-1)² XP: i primi salgono in fretta, poi serve tutta la giornata
  const levelOf = (xp) => Math.min(MAX_LV, 1 + Math.floor(Math.sqrt(xp / 2000)));
  const xpFor = (lv) => 2000 * (lv - 1) ** 2;

  const KILL_LINES = ["{a} 一套连招带走了 {t}", "{a} 把 {t} 按在草地上摩擦", "{a} 越塔强杀 {t}", "{t} 走位风骚，还是被 {a} 抓了", "{a} 收下 {t} 的人头，顺手嘲讽", "{a} 从树林里杀出，{t} 当场去世"];
  const DEATH_LINES = ["{v} 倒下了，躺在草地上思考人生", "{v} 阵亡，复活时间够泡一碗面", "{v} 又死了，熟悉的灰屏", "{v} 卒，享年一波团"];
  const ASSIST_LINES = ["{a} 助攻 +1，躲在后面补了个技能", "{a} 默默助攻，功劳全给别人", "{a} 一个控制，助攻到手"];
  const SLAP_LINES = ["啪！大P神从天而降，给了大金神一巴掌", "啪！大P神：「吹，接着吹」", "啪！大P神：「这也叫中单？」", "啪！大P神：「上个分再来跟我说话」", "啪！大P神抽完继续在云上吃瓜"];
  const fill = (s, o) => s.replace(/\{(\w)\}/g, (_, k) => o[k]);

  // ---------- Goku con le ali (SVG) ----------
  const GOKU = `<svg viewBox="0 0 120 120" class="goku-svg" aria-hidden="true">
    <g class="wing wing-l"><path d="M48 62 C20 40 6 46 2 30 C18 36 22 28 30 32 C24 22 34 18 40 26 C40 16 50 18 52 34 Z" fill="#fff" stroke="#cbd5e1" stroke-width="1.5"/></g>
    <g class="wing wing-r"><path d="M72 62 C100 40 114 46 118 30 C102 36 98 28 90 32 C96 22 86 18 80 26 C80 16 70 18 68 34 Z" fill="#fff" stroke="#cbd5e1" stroke-width="1.5"/></g>
    <ellipse cx="60" cy="9" rx="15" ry="4" fill="none" stroke="#fde047" stroke-width="3"/>
    <path d="M42 70 Q60 64 78 70 L82 100 Q60 106 38 100 Z" fill="#f97316"/>
    <path d="M44 78 L76 78 L76 84 L44 84 Z" fill="#1d4ed8"/>
    <path d="M52 66 L60 80 L68 66 Z" fill="#1d4ed8"/>
    <rect x="40" y="100" width="16" height="12" rx="3" fill="#f97316"/><rect x="64" y="100" width="16" height="12" rx="3" fill="#f97316"/>
    <rect x="38" y="110" width="19" height="6" rx="2" fill="#1d4ed8"/><rect x="63" y="110" width="19" height="6" rx="2" fill="#1d4ed8"/>
    <circle cx="60" cy="48" r="16" fill="#fcd9b6"/>
    <path d="M42 46 L34 26 L46 36 L44 16 L54 32 L60 12 L66 32 L76 16 L74 36 L86 26 L78 46 Q74 34 60 34 Q46 34 42 46 Z" fill="#111"/>
    <path d="M51 47 l6 2 M69 47 l-6 2" stroke="#111" stroke-width="2" stroke-linecap="round"/>
    <circle cx="54" cy="51" r="1.8" fill="#111"/><circle cx="66" cy="51" r="1.8" fill="#111"/>
    <path d="M55 58 Q60 61 65 58" stroke="#111" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <g class="slap-hand"><circle cx="92" cy="78" r="7" fill="#fcd9b6"/><path d="M78 74 L90 76" stroke="#f97316" stroke-width="7" stroke-linecap="round"/></g>
  </svg>`;

  const TREES = Array.from({ length: 11 }, (_, i) => {
    const x = (i * 9.5 + (i % 2) * 3) % 100, s = 0.75 + ((i * 37) % 10) / 20;
    return `<span class="tree" style="left:${x}%;--s:${s};--h:${(i * 23) % 30}"></span>`;
  }).join("");

  let timer = null;
  async function mount(el, players) {
    if (!el) return;
    if (timer) clearInterval(timer);
    const ids = await loadItemIds();
    const F = buildFighters(players, ids);
    const active = F.filter((f) => f.day);
    const jin = F.find((f) => f.name === "大金神");
    const cheers = readCheers();

    // posizioni sul prato: due file sfalsate
    F.forEach((f, i) => {
      const row = i % 2, col = Math.floor(i / 2), cols = Math.ceil(F.length / 2);
      f.x = 12 + (col + (row ? 0.5 : 0)) * (76 / Math.max(1, cols - 0.5));
      f.y = row ? 90 : 57;
    });

    el.innerHTML = `
      <section class="arena" aria-label="刀塔乱斗">
        <div class="arena-sky"><span class="sun"></span><span class="cloud c1"></span><span class="cloud c2"></span><span class="cloud c3"></span></div>
        <div class="goku" title="大P神 · 云端观战">${GOKU}<span class="goku-name">大P神</span><span class="goku-bubble"></span></div>
        <div class="arena-trees">${TREES}</div>
        <div class="arena-river"></div>
        <div class="arena-field">
          ${F.map((f, i) => fighterHTML(f, i, cheers[f.id] || 0)).join("")}
        </div>
        <div class="arena-hud">
          <div class="arena-title"><b>刀塔乱斗</b><span>放置模式 · 24小时不停打</span></div>
          <div class="arena-clock" id="arena-clock"></div>
        </div>
        <ol class="arena-log" id="arena-log"></ol>
      </section>
      <details class="arena-rules">
        <summary>📜 乱斗规则（点我）</summary>
        <ul>
          <li>每位选手化身<b>最近7天最常玩的英雄</b>，头顶是最常出的三件装备；有至宝的直接穿上至宝。</li>
          <li>节奏全看<b>昨天（早6点到早6点）的真实战绩</b>：每10次击杀 = 每分钟出手1次，每10次死亡 = 每分钟阵亡1次，每10次助攻 = 每分钟助攻1次。昨天没打的，用这周最近一天的战绩。</li>
          <li>出手只打<b>昨天死得比自己多的人</b>；死得最多的那位，就是全场的沙包。</li>
          <li>击杀 +${XP.kill} 经验，助攻 +${XP.assist} 经验；升到 N 级需要 2000×(N−1)² 经验，最高 ${MAX_LV} 级。每天早上6点清零重打。</li>
          <li>Soul大神在这里用的是<b>全部真实比赛</b>，输赢都算。</li>
          <li>大P神在云上观战，每分钟给大金神一巴掌，风雨无阻。</li>
          <li>点选手可以为他加油 💐（只记在你自己的浏览器里）。</li>
        </ul>
      </details>`;

    const log = el.querySelector("#arena-log");
    const nodes = Object.fromEntries(F.map((f) => [f.id, el.querySelector(`[data-fid="${f.id}"]`)]));
    el.querySelectorAll(".fighter").forEach((n) => n.addEventListener("click", () => cheer(n, F.find((f) => String(f.id) === n.dataset.fid))));

    let li = 0;
    const push = (html) => {
      const item = document.createElement("li");
      item.innerHTML = html;
      log.prepend(item);
      while (log.children.length > 6) log.lastChild.remove();
    };

    const prev = {};
    let lastSlapMin = null;
    const tick = () => {
      const t = Date.now();
      const minOfDay = Math.floor((t - dayStart(t)) / 60000);
      el.querySelector("#arena-clock").textContent = `第 ${minOfDay + 1} 分钟 · 已开打 ${Math.floor(minOfDay / 60)}小时${minOfDay % 60}分`;
      F.forEach((f, i) => {
        const c = counts(f, i, t), p = prev[f.id];
        const n = nodes[f.id];
        updateHud(n, f, c);
        if (!p) { prev[f.id] = c; return; }
        if (c.k > p.k && f.targets.length) {
          const tgt = f.targets[c.k % f.targets.length];
          lunge(n, nodes[tgt.id], f, tgt);
          push(`⚔️ ${fill(KILL_LINES[li++ % KILL_LINES.length], { a: tag(f), t: tag(tgt) })}`);
        }
        if (c.d > p.d) {
          n.classList.add("dead");
          setTimeout(() => n.classList.remove("dead"), 4000);
          push(`💀 ${fill(DEATH_LINES[li++ % DEATH_LINES.length], { v: tag(f) })}`);
        }
        if (c.a > p.a) {
          pop(n, "+助攻", "assist");
          if (c.a % 3 === 0) push(`🤝 ${fill(ASSIST_LINES[li++ % ASSIST_LINES.length], { a: tag(f) })}`);
        }
        if (levelOf(xpOf(c)) > levelOf(xpOf(p))) { pop(n, `升级! Lv.${levelOf(xpOf(c))}`, "lvup"); n.classList.add("lvflash"); setTimeout(() => n.classList.remove("lvflash"), 1200); }
        prev[f.id] = c;
      });
      // schiaffo di 大P神: una volta al minuto (al secondo 30, così si vede subito aprendo la pagina)
      const sec = new Date(t).getSeconds();
      if (jin && sec >= 30 && lastSlapMin !== minOfDay) {
        lastSlapMin = minOfDay;
        slap(el, nodes[jin.id], minOfDay);
        push(`👋 ${SLAP_LINES[minOfDay % SLAP_LINES.length]}（今日第${minOfDay + 1}掌）`);
      }
    };
    // all'apertura: riassunto della giornata finora
    const now = Date.now();
    const lead = F.map((f, i) => ({ f, lv: levelOf(xpOf(counts(f, i, now))) })).sort((a, b) => b.lv - a.lv)[0];
    if (lead) push(`🏆 今日领跑：${tag(lead.f)} Lv.${lead.lv}`);
    if (!active.length) push("😴 昨天全员没打，草地上只有风声");
    tick();
    timer = setInterval(() => (document.contains(el) ? tick() : clearInterval(timer)), 500);
  }

  const tag = (f) => `<b style="color:${f.color}">${esc(f.name)}</b>`;

  function fighterHTML(f, i, cheersN) {
    const d = f.day;
    const when = !d ? "本周没上线" : d.back === 1 ? "昨天" : `${d.back}天前`;
    const img = f.render || f.portrait || f.avatar;
    return `<div class="fighter ${f.arcana ? "has-arcana" : ""} ${d ? "" : "idle"}" data-fid="${f.id}"
        style="left:${f.x}%;top:${f.y}%;--pc:${f.color};--i:${i}" title="${esc(f.name)} · ${esc(f.heroName)}${d ? ` · ${when} ${d.k}/${d.d}/${d.a}（${d.n}局）` : ""}">
      <div class="f-tag">
        <span class="f-lv">Lv.<b>1</b></span>
        <span class="f-name">${esc(f.name)}</span>
      </div>
      <div class="f-xp"><i></i></div>
      ${f.items.length || f.arcana ? `<div class="f-items">${f.arcana ? `<img class="f-arc" src="${esc(f.arcana.img)}" alt="" title="${esc(f.arcana.name)}">` : ""}${f.items.map((u) => `<img src="${esc(u)}" alt="" loading="lazy" onerror="this.remove()">`).join("")}</div>` : ""}
      <div class="f-body">
        <img class="f-hero" src="${esc(img)}" alt="${esc(f.heroName)}" loading="lazy" onerror="if(this.src!=='${esc(f.portrait)}'&&'${esc(f.portrait)}'){this.src='${esc(f.portrait)}';this.classList.add('flat')}">
        ${f.arcana ? `<span class="f-aura"></span>` : ""}
        <span class="f-shadow"></span>
      </div>
      <div class="f-kda">${d ? `<span title="${when}战绩">${when} ${d.k}/${d.d}/${d.a}</span>` : `<span>树下乘凉</span>`}</div>
      <div class="f-live"><span class="k">⚔<b>0</b></span><span class="d">💀<b>0</b></span><span class="a">🤝<b>0</b></span></div>
      ${cheersN ? `<span class="f-cheer">💐${cheersN}</span>` : `<span class="f-cheer" hidden></span>`}
    </div>`;
  }

  function updateHud(n, f, c) {
    const xp = xpOf(c), lv = levelOf(xp);
    const lo = xpFor(lv), hi = xpFor(lv + 1);
    n.querySelector(".f-lv b").textContent = lv;
    n.querySelector(".f-xp i").style.width = (lv >= MAX_LV ? 100 : Math.round(((xp - lo) / (hi - lo)) * 100)) + "%";
    const [k, d, a] = n.querySelectorAll(".f-live b");
    k.textContent = c.k; d.textContent = c.d; a.textContent = c.a;
  }

  function pop(n, text, cls) {
    const s = document.createElement("span");
    s.className = "f-pop " + cls;
    s.textContent = text;
    n.appendChild(s);
    setTimeout(() => s.remove(), 1400);
  }

  function lunge(an, tn, f, tgt) {
    if (!an || !tn || !an.animate) return;
    const a = an.getBoundingClientRect(), b = tn.getBoundingClientRect();
    const dx = (b.left - a.left) * 0.8, dy = (b.top - a.top) * 0.8;
    an.animate([{ transform: "translate(-50%,-100%)" }, { transform: `translate(calc(-50% + ${dx}px), calc(-100% + ${dy}px))`, offset: 0.45 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-100% + ${dy}px))`, offset: 0.6 }, { transform: "translate(-50%,-100%)" }],
    { duration: 900, easing: "ease-in-out" });
    an.style.zIndex = 5;
    setTimeout(() => { an.style.zIndex = ""; tn.classList.add("hit"); pop(tn, "砰!", "hitpop"); setTimeout(() => tn.classList.remove("hit"), 450); }, 420);
  }

  function slap(root, jn, n) {
    const g = root.querySelector(".goku");
    const bub = root.querySelector(".goku-bubble");
    if (!g || !jn || !g.animate) return;
    const a = g.getBoundingClientRect(), b = jn.getBoundingClientRect();
    const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top - a.top - a.height * 0.4;
    bub.textContent = ["又吹？", "啪！", "坐下！", "这波你的", "哈？"][n % 5];
    g.classList.add("talk");
    g.animate([{ transform: "translate(0,0)" }, { transform: `translate(${dx}px, ${dy}px) rotate(-12deg)`, offset: 0.4 },
      { transform: `translate(${dx}px, ${dy}px) rotate(14deg)`, offset: 0.5 }, { transform: "translate(0,0)" }],
    { duration: 1800, easing: "ease-in-out" });
    setTimeout(() => { jn.classList.add("slapped"); pop(jn, "啪!", "slappop"); setTimeout(() => jn.classList.remove("slapped"), 700); }, 800);
    setTimeout(() => g.classList.remove("talk"), 2600);
  }

  // 💐 tifo: solo nel browser di chi guarda
  function readCheers() { try { return JSON.parse(localStorage.getItem("tribunale:cheers")) || {}; } catch { return {}; } }
  function cheer(n, f) {
    if (!f) return;
    const c = readCheers();
    c[f.id] = (c[f.id] || 0) + 1;
    try { localStorage.setItem("tribunale:cheers", JSON.stringify(c)); } catch {}
    const b = n.querySelector(".f-cheer");
    b.hidden = false;
    b.textContent = `💐${c[f.id]}`;
    pop(n, ["加油!", "冲!", "666", "稳住!", "干干干!"][c[f.id] % 5], "cheerpop");
  }

  window.TribunaleArena = { mount };
})();
