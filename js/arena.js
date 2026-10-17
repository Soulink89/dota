// ============================================================
//  刀塔乱斗 · idle game in cima alla home
//  Ogni giocatore appare come l'eroe più giocato degli ultimi 7 giorni, con gli oggetti che compra
//  più spesso, e passeggia per il prato. Il ritmo NON è casuale: per ogni giorno di gioco
//  (06:00 → 06:00, ora di Pechino) vale la K/D/A reale del giorno prima: ogni 10 uccisioni = 1 colpo
//  al minuto, ogni 10 morti = 1 morte al minuto, ogni 10 assist = 1 assist al minuto.
//  Il conteggio è CONTINUO dal lancio (17/10/2026): niente azzeramenti, il livello cresce per sempre.
//  Lo storico dei giorni vecchi lo salva lo script automatico in data/arena.json.
//  Tutto è calcolato dall'orologio: chiunque apra la pagina vede gli stessi numeri.
//  In cielo 大P神 (Goku con le ali) guarda, e ogni minuto dà uno schiaffo a 大金神.
// ============================================================
(function () {
  const API = window.TribunaleAPI;
  const CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2";
  const ITEMS_URL = "https://cdn.jsdelivr.net/npm/dotaconstants@latest/build/item_ids.json";
  const DAY_MS = 86400000;
  const XP = { kill: 100, assist: 50 };
  const LV_K = 20000; // livello n richiede LV_K·(n-1)² XP, senza tetto
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const big = (n) => (n >= 1e8 ? (n / 1e8).toFixed(2) + "亿" : n >= 1e4 ? (n / 1e4).toFixed(1) + "万" : String(n));

  // giorno di gioco: ora di Pechino (UTC+8) meno 6 ore → +2h rispetto a UTC
  const dayIdx = (ms) => Math.floor((ms + 2 * 3600000) / DAY_MS);
  const dayStartMs = (idx) => idx * DAY_MS - 2 * 3600000;
  const EPOCH = dayIdx(Date.UTC(2026, 9, 16, 23)); // 17/10/2026, giorno del lancio

  const BORING = new Set(["tpscroll", "ward_observer", "ward_sentry", "ward_dispenser", "smoke_of_deceit", "dust", "tango", "flask",
    "clarity", "enchanted_mango", "faerie_fire", "branches", "magic_stick", "quelling_blade", "blood_grenade", "aegis", "cheese", "refresher_shard"]);
  let itemIdsP;
  const loadItemIds = () => (itemIdsP ??= fetch(ITEMS_URL).then((r) => r.json()).catch(() => ({})));
  const loadHistory = () => fetch(`data/arena.json?t=${Date.now()}`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

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

  // statistiche per giorno: storico salvato + partite fresche (che vincono, sono più aggiornate)
  function dailyTable(p, hist) {
    const days = { ...(hist?.days?.[p.id] || {}) };
    const fresh = {};
    for (const m of p.rawMatches || []) {
      const d = (fresh[dayIdx(m.start_time * 1000)] ??= { k: 0, d: 0, a: 0, n: 0 });
      d.k += m.kills || 0; d.d += m.deaths || 0; d.a += m.assists || 0; d.n++;
    }
    const oldest = dayIdx(Date.now()) - 6; // il giorno al bordo della finestra può essere incompleto
    for (const [k, v] of Object.entries(fresh)) if (Number(k) >= oldest || !days[k]) days[k] = v;
    return days;
  }
  // ritmo del giorno D = statistiche del giorno prima; se quel giorno non ha giocato, l'ultimo giorno giocato (max 7 giorni prima)
  function rateFor(days, D) {
    for (let back = 1; back <= 7; back++) {
      const s = days[D - back];
      if (s && s.n) return { k: s.k / 10, d: s.d / 10, a: s.a / 10, back, s };
    }
    return { k: 0, d: 0, a: 0, back: 0, s: null };
  }

  function buildFighters(players, ids, hist) {
    const out = [];
    for (const p of players) {
      if (p.legend) continue; // 大P神 sta in cielo
      const matches = p.rawMatches || [];
      const heroId = heroOf(p);
      const hero = heroId ? p.heroes[heroId] : null;
      const key = hero?.name?.replace("npc_dota_hero_", "");
      const arc = p.ctx.inventory?.arcana?.find((a) => a.heroId === heroId);
      const days = dailyTable(p, hist);
      // ritmi di ogni giorno dal lancio a oggi (somma dei giorni completi precalcolata)
      const today = dayIdx(Date.now());
      const rates = {};
      const base = { k: 0, d: 0, a: 0 };
      for (let D = EPOCH; D <= today; D++) {
        rates[D] = rateFor(days, D);
        if (D < today) for (const t of ["k", "d", "a"]) base[t] += rates[D][t] * 1440;
      }
      out.push({
        id: p.id, name: p.name, color: p.cfg.color || "#f2b632",
        heroId, heroName: hero?.localized_name || "", key,
        render: key ? `${CDN}/videos/dota_react/heroes/renders/${key}.png` : "",
        portrait: API.heroImg(hero), avatar: p.data.profile?.profile?.avatarfull || "",
        items: topItems(matches, heroId, ids).map((k) => `${CDN}/images/dota_react/items/${k}.png`),
        arcana: arc ? { img: API.itemImg(arc.icon), name: arc.name } : null,
        today, rates, base, now: rates[today],
      });
    }
    // bersagli: chi nel giorno di riferimento è morto più di me (se nessuno, il più "morto" della compagnia)
    for (const f of out) {
      const dd = (x) => (x.now.s ? x.now.s.d : -1);
      let t = out.filter((o) => o !== f && o.now.s && dd(o) > dd(f)).sort((a, b) => dd(b) - dd(a));
      if (!t.length) t = out.filter((o) => o !== f && o.now.s).sort((a, b) => dd(b) - dd(a)).slice(0, 1);
      f.targets = t;
    }
    return out;
  }

  // conteggi cumulativi deterministici dal lancio; fase diversa per ogni giocatore
  const phase = (i, kind) => (i * 0.37 + kind * 0.21) % 1;
  function counts(f, i, t) {
    const D = dayIdx(t);
    if (D !== f.today) return null; // cambio di giornata: si ricostruisce tutto (mount)
    const min = (t - dayStartMs(D)) / 60000;
    const c = (kind, k) => Math.floor(f.base[k] + min * f.now[k] + phase(i, kind));
    return { k: c(1, "k"), d: c(2, "d"), a: c(3, "a") };
  }
  const xpOf = (c) => c.k * XP.kill + c.a * XP.assist;
  const levelOf = (xp) => 1 + Math.floor(Math.sqrt(xp / LV_K));
  const xpFor = (lv) => LV_K * (lv - 1) ** 2;
  const RANKS = [[1, "小兵"], [10, "野区新秀"], [25, "线上霸主"], [50, "团战核心"], [80, "肉山克星"], [120, "超神"], [200, "刀塔之神"]];
  const rankOf = (lv) => RANKS.filter(([l]) => lv >= l).pop()[1];

  const KILL_LINES = ["{a} 一套连招带走了 {t}", "{a} 把 {t} 按在草地上摩擦", "{a} 追了半张地图收下 {t}", "{t} 走位风骚，还是被 {a} 抓了", "{a} 收下 {t} 的人头，顺手嘲讽", "{a} 从树林里杀出，{t} 当场去世", "{a} 绕到背后，{t} 回头只看到灰屏"];
  const DEATH_LINES = ["{v} 倒下了，躺在草地上思考人生", "{v} 阵亡，复活时间够泡一碗面", "{v} 又死了，熟悉的灰屏", "{v} 卒，享年一波团", "{v} 被野怪顺手带走"];
  const ASSIST_LINES = ["{a} 助攻 +1，躲在后面补了个技能", "{a} 默默助攻，功劳全给别人", "{a} 一个控制，助攻到手", "{a} 路过放了个技能，助攻入账"];
  const SLAP_LINES = ["啪！大P神从天而降，给了大金神一巴掌", "啪！大P神：「吹，接着吹」", "啪！大P神：「这也叫中单？」", "啪！大P神：「上个分再来跟我说话」", "啪！大P神抽完继续在云上吃瓜", "啪！大P神：「段位是吹出来的？」"];
  const fill = (s, o) => s.replace(/\{(\w)\}/g, (_, k) => o[k]);

  // ---------- chiacchiere sul prato: battute dalla "lore" di ognuno, a volte con risposta ----------
  const SAY = {
    "大金神": ["我超凡入圣好吧", "这把系统局", "队友太菜了", "我又被针对了", "MVP 还是我", "等我最后选", "看看我这KDA"],
    "Ping大神": ["这波理论上能打", "我先抽根烟", "再来一杯威士忌", "补刀？不存在的", "掉分了掉分了", "今晚修仙", "我什么位置都能打"],
    "大B神": ["保姆呢？保姆在哪", "等我喂个奶", "别打我别打我", "双头龙启动", "Давай 兄弟们冲", "我在直播呢", "小黑又输了"],
    "Yoki大神": ["嗯嗯", "看我小黑至宝", "三板斧走起", "一到五号位都是小黑"],
    "蜗牛大神": ["干干干！", "今晚通宵！", "打完这把我先下了", "大金神？虐过"],
    "疯子大神": ["屠夫叼霸天", "老婆回来了，先撤", "电脑又卡住了", "来把OMG"],
    "Kaiju大神*": ["这把我小鱼人", "四号位也拿小鱼人", "钱都是我的", "低分局我无敌"],
    "Soul大神": ["稳住，能赢", "这把带你们飞", "基本操作", "又是一场胜利"],
  };
  const DIALOGS = [
    ["大金神", "我超凡入圣好吧", "蜗牛大神", "中路被我虐的那个？"],
    ["大金神", "呆逼你别送了", "大B神", "保姆呢！救命！"],
    ["Ping大神", "这波理论上能打", "Yoki大神", "嗯嗯"],
    ["大金神", "这把系统局", "Ping大神", "理论上你就是系统"],
    ["Kaiju大神*", "四号位也拿小鱼人", "大金神", "你别跟我一队"],
    ["疯子大神", "屠夫叼霸天", "大金神", "先钩中一个再说"],
    ["蜗牛大神", "今晚通宵！", "Ping大神", "两把就下，我赌一包烟"],
    ["Soul大神", "稳住，能赢", "大金神", "听Soul大神的"],
    ["大B神", "我在直播呢", "Kaiju大神*", "观众都是来看你送的"],
    ["Ping大神", "我什么位置都能打", "蜗牛大神", "那你补个刀看看"],
    ["Yoki大神", "看我小黑至宝", "大B神", "我的小黑从来没赢过……"],
    ["大金神", "MVP 还是我", "疯子大神", "MVP = 最会吹的人"],
  ];
  function say(n, text, ms = 3200) {
    if (!n) return;
    let b = n.querySelector(".f-say");
    if (!b) { b = document.createElement("span"); b.className = "f-say"; n.appendChild(b); }
    b.textContent = text;
    b.classList.remove("show"); void b.offsetWidth; b.classList.add("show");
    clearTimeout(b._t);
    b._t = setTimeout(() => b.classList.remove("show"), ms);
  }

  // ---------- grafica ----------
  const GOKU = `<svg viewBox="0 0 120 120" class="goku-svg" aria-hidden="true">
    <defs><radialGradient id="gk-aura"><stop offset="0" stop-color="#fde047" stop-opacity=".55"/><stop offset="1" stop-color="#fde047" stop-opacity="0"/></radialGradient></defs>
    <circle cx="60" cy="64" r="58" fill="url(#gk-aura)" class="gk-aura"/>
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

  // paesaggio: montagne, pini (alla Dota), torri Radiant / Dire
  const pine = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})" class="pine"><rect x="-3" y="-8" width="6" height="14" fill="#3b2414"/>
    <path d="M0 -70 L-18 -40 L-9 -40 L-24 -18 L-12 -18 L-30 4 L30 4 L12 -18 L24 -18 L9 -40 L18 -40 Z" fill="${c}"/></g>`;
  const SCENERY = (() => {
    const back = [], front = [];
    for (let i = 0; i < 22; i++) back.push(pine(i * 48 + (i % 3) * 9, 150 + (i % 4) * 6, 0.75 + ((i * 7) % 5) / 10, i % 2 ? "var(--pine1)" : "var(--pine2)"));
    for (let i = 0; i < 9; i++) front.push(pine(i * 125 + 30, 168 + (i % 2) * 8, 1.05 + (i % 3) / 8, "var(--pine3)"));
    return `<svg class="scenery" viewBox="0 0 1000 300" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <path d="M0 120 L80 60 L150 100 L240 40 L330 105 L420 55 L520 110 L610 35 L700 95 L790 50 L880 100 L1000 45 L1000 180 L0 180 Z" fill="var(--mount)"/>
      <path d="M240 40 L222 54 L258 54 Z M610 35 L590 52 L628 50 Z M790 50 L776 60 L804 60 Z" fill="var(--snow)"/>
      ${back.join("")}
      <g class="tower radiant" transform="translate(70 200)"><rect x="-14" y="-70" width="28" height="74" rx="4" fill="#cbd5e1"/><rect x="-20" y="-6" width="40" height="12" fill="#94a3b8"/>
        <path d="M-18 -70 L0 -96 L18 -70 Z" fill="#e2e8f0"/><circle cx="0" cy="-104" r="9" fill="#86efac" class="crystal"/></g>
      <g class="tower dire" transform="translate(930 200)"><rect x="-14" y="-70" width="28" height="74" rx="4" fill="#44403c"/><rect x="-20" y="-6" width="40" height="12" fill="#292524"/>
        <path d="M-18 -70 L0 -96 L18 -70 Z" fill="#57534e"/><circle cx="0" cy="-104" r="9" fill="#f87171" class="crystal"/></g>
      ${front.join("")}
    </svg>`;
  })();
  const DECOR = (() => {
    const out = [];
    const flowers = ["#f472b6", "#fde047", "#f8fafc", "#a78bfa", "#fb923c"];
    for (let i = 0; i < 26; i++) out.push(`<span class="flower-dot" style="left:${(i * 37) % 97 + 1}%;top:${8 + ((i * 53) % 88)}%;--c:${flowers[i % 5]}"></span>`);
    for (let i = 0; i < 7; i++) out.push(`<span class="rock" style="left:${(i * 29 + 5) % 95}%;top:${20 + ((i * 41) % 75)}%;--s:${0.6 + (i % 3) * 0.3}"></span>`);
    for (let i = 0; i < 5; i++) out.push(`<span class="mush" style="left:${(i * 47 + 12) % 92}%;top:${30 + ((i * 23) % 60)}%"></span>`);
    for (let i = 0; i < 14; i++) out.push(`<span class="spark" style="left:${(i * 61) % 100}%;top:${((i * 29) % 90)}%;--d:${(i * 0.7) % 6}s;--t:${5 + (i % 4)}s"></span>`);
    return out.join("");
  })();
  // cielo che segue l'ora vera: alba, giorno, tramonto, notte
  function skyClass(h = new Date().getHours()) {
    return h >= 5 && h < 8 ? "dawn" : h >= 8 && h < 17 ? "day" : h >= 17 && h < 20 ? "dusk" : "night";
  }

  // ---------- montaggio ----------
  const FIELD = { x0: 7, x1: 93, y0: 58, y1: 94 };
  let timer = null, walker = null, chatter = null;
  async function mount(el, players) {
    if (!el) return;
    clearInterval(timer); clearInterval(walker); clearInterval(chatter);
    const [ids, hist] = await Promise.all([loadItemIds(), loadHistory()]);
    FIELD.y1 = window.innerWidth < 700 ? 84 : 94; // su telefono la cronaca sta in basso
    const F = buildFighters(players, ids, hist);
    const jin = F.find((f) => f.name === "大金神");
    const cheers = readCheers();
    F.forEach((f, i) => {
      f.x = FIELD.x0 + ((i + 0.5) / F.length) * (FIELD.x1 - FIELD.x0);
      f.y = FIELD.y0 + (((i * 37) % 100) / 100) * (FIELD.y1 - FIELD.y0);
      f.busy = 0;
    });

    el.innerHTML = `
      <section class="arena sky-${skyClass()}" aria-label="刀塔乱斗">
        <div class="arena-sky"><span class="stars"></span><span class="sun"></span><span class="moon"></span>
          <span class="cloud c1"></span><span class="cloud c2"></span><span class="cloud c3"></span><span class="bird b1">︶</span><span class="bird b2">︶</span></div>
        ${SCENERY}
        <div class="arena-ground"><div class="arena-river"><i></i></div><div class="arena-path"></div>${DECOR}</div>
        <div class="goku" title="大P神 · 云端观战">${GOKU}<span class="goku-name">大P神</span><span class="goku-bubble"></span></div>
        <div class="arena-field">${F.map((f, i) => fighterHTML(f, i, cheers[f.id] || 0)).join("")}</div>
        <div class="arena-hud">
          <div class="arena-title"><b>刀塔乱斗</b><span>放置模式 · 永不停战</span></div>
          <div class="arena-clock" id="arena-clock"></div>
        </div>
        <ol class="arena-log" id="arena-log"></ol>
      </section>
      <details class="arena-rules">
        <summary>📜 乱斗规则（点我）</summary>
        <ul>
          <li>每位选手化身<b>最近7天最常玩的英雄</b>，头顶是这个英雄最常出的三件装备；有至宝又玩了这个英雄的，直接穿上至宝。</li>
          <li>节奏全看<b>前一天（北京时间早6点到早6点）的真实战绩</b>：每10次击杀 = 每分钟出手1次，每10次死亡 = 每分钟阵亡1次，每10次助攻 = 每分钟助攻1次。前一天没打的，沿用最近一天打过的战绩（最多7天前）。</li>
          <li>出手只打<b>那天死得比自己多的人</b>；死得最多的那位，就是全场的沙包。</li>
          <li>击杀 +${XP.kill} 经验，助攻 +${XP.assist} 经验；升到 N 级需要 ${LV_K.toLocaleString()}×(N−1)² 经验，<b>没有等级上限</b>。</li>
          <li><b>从 2026年10月17日 开打，永不清零</b>：每天的战绩都累计下去，谁天天打谁就越来越强。</li>
          <li>Soul大神在这里用的是<b>全部真实比赛</b>，输赢都算。</li>
          <li>大P神在云上观战，每分钟给大金神一巴掌，风雨无阻。天色跟着真实时间变。</li>
          <li>选手们会在草地上闲逛、互相聊天斗嘴（台词都来自群里的真实梗）。</li>
          <li>点选手可以为他加油 💐（只记在你自己的浏览器里）。</li>
        </ul>
      </details>`;

    const root = el.querySelector(".arena");
    const log = el.querySelector("#arena-log");
    const nodes = Object.fromEntries(F.map((f) => [f.id, el.querySelector(`[data-fid="${f.id}"]`)]));
    F.forEach((f) => place(nodes[f.id], f, 0));
    el.querySelectorAll(".fighter").forEach((n) => n.addEventListener("click", () => cheer(n, F.find((f) => String(f.id) === n.dataset.fid))));

    let li = 0;
    const push = (html) => {
      const item = document.createElement("li");
      item.innerHTML = html;
      log.prepend(item);
      while (log.children.length > 6) log.lastChild.remove();
    };

    // passeggiata: ognuno sceglie un punto vicino e ci cammina
    const wander = () => {
      const t = Date.now();
      for (const f of F) {
        if (f.busy > t || Math.random() < 0.35) continue;
        const nx = clamp(f.x + (Math.random() - 0.5) * 30, FIELD.x0, FIELD.x1);
        const ny = clamp(f.y + (Math.random() - 0.5) * 18, FIELD.y0, FIELD.y1);
        f.busy = t + walk(nodes[f.id], f, nx, ny, 9);
      }
    };

    const prev = {};
    let lastSlapMin = null;
    const tick = () => {
      const t = Date.now();
      if (F.length && dayIdx(t) !== F[0].today) { mount(el, players); return; } // nuova giornata: nuovi ritmi, conteggi che continuano
      root.className = `arena sky-${skyClass()}`;
      const minutes = Math.floor((t - dayStartMs(EPOCH)) / 60000);
      el.querySelector("#arena-clock").textContent = `开战第 ${Math.floor(minutes / 1440) + 1} 天 · 第 ${minutes.toLocaleString()} 分钟`;
      F.forEach((f, i) => {
        const c = counts(f, i, t), p = prev[f.id];
        const n = nodes[f.id];
        if (!c) return;
        updateHud(n, c);
        if (!p) { prev[f.id] = c; return; }
        if (c.k > p.k && f.targets.length && f.busy < t) {
          const tgt = f.targets[c.k % f.targets.length];
          attack(n, nodes[tgt.id], f, tgt);
          push(`⚔️ ${fill(KILL_LINES[li++ % KILL_LINES.length], { a: tag(f), t: tag(tgt) })}`);
        }
        if (c.d > p.d) {
          n.classList.add("dead");
          f.busy = t + 4000;
          setTimeout(() => n.classList.remove("dead"), 4000);
          if (c.d % 2 === 0) push(`💀 ${fill(DEATH_LINES[li++ % DEATH_LINES.length], { v: tag(f) })}`);
        }
        if (c.a > p.a) {
          pop(n, "+助攻", "assist");
          if (c.a % 4 === 0) push(`🤝 ${fill(ASSIST_LINES[li++ % ASSIST_LINES.length], { a: tag(f) })}`);
        }
        const lv = levelOf(xpOf(c));
        if (lv > levelOf(xpOf(p))) {
          pop(n, `升级! Lv.${lv}`, "lvup");
          n.classList.add("lvflash"); setTimeout(() => n.classList.remove("lvflash"), 1400);
          push(`✨ ${tag(f)} 升到 <b>Lv.${lv}</b>（${rankOf(lv)}）`);
        }
        prev[f.id] = c;
      });
      // schiaffo di 大P神: una volta al minuto, al secondo 30
      const minOfDay = Math.floor((t - dayStartMs(dayIdx(t))) / 60000);
      if (jin && new Date(t).getSeconds() >= 30 && lastSlapMin !== minOfDay) {
        lastSlapMin = minOfDay;
        slap(root, nodes[jin.id], jin, minOfDay);
        push(`👋 ${SLAP_LINES[minOfDay % SLAP_LINES.length]}（今日第${minOfDay + 1}掌）`);
      }
    };
    // all'apertura: classifica attuale
    const now = Date.now();
    const lead = F.map((f, i) => ({ f, c: counts(f, i, now) })).filter((x) => x.c).sort((a, b) => xpOf(b.c) - xpOf(a.c))[0];
    if (lead) push(`🏆 当前领跑：${tag(lead.f)} Lv.${levelOf(xpOf(lead.c))}（${rankOf(levelOf(xpOf(lead.c)))}）`);
    tick();
    timer = setInterval(() => (document.contains(el) ? tick() : clearInterval(timer)), 500);
    walker = setInterval(() => (document.contains(el) ? wander() : clearInterval(walker)), 1500);
    // chiacchiere: ogni 4 secondi qualcuno parla; un dialogo su tre ha la risposta di un altro
    const byName = Object.fromEntries(F.map((f) => [f.name, f]));
    const dialogs = DIALOGS.filter(([a, , b]) => byName[a] && byName[b]);
    let ci = Math.floor(Date.now() / 4000);
    const chat = () => {
      ci++;
      if (dialogs.length && ci % 3 === 0) {
        const [a, l1, b, l2] = dialogs[(ci / 3) % dialogs.length | 0];
        say(nodes[byName[a].id], l1);
        setTimeout(() => say(nodes[byName[b].id], l2), 1600);
        return;
      }
      const f = F[ci % F.length], lines = SAY[f.name];
      if (lines && !nodes[f.id].classList.contains("dead")) say(nodes[f.id], lines[Math.floor(ci / F.length) % lines.length]);
    };
    chatter = setInterval(() => (document.contains(el) ? chat() : clearInterval(chatter)), 4000);
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const tag = (f) => `<b style="color:${f.color}">${esc(f.name)}</b>`;

  // posizione + profondità (più in basso = più vicino = più grande e davanti)
  function place(n, f, ms) {
    if (!n) return;
    n.style.transitionDuration = ms + "ms";
    n.style.left = f.x + "%";
    n.style.top = f.y + "%";
    n.style.zIndex = 10 + Math.round(f.y);
    n.style.setProperty("--sc", (0.8 + ((f.y - FIELD.y0) / (FIELD.y1 - FIELD.y0)) * 0.28).toFixed(3));
  }
  function walk(n, f, x, y, speed) {
    if (!n) return 0;
    const dist = Math.hypot(x - f.x, (y - f.y) * 1.6);
    const ms = Math.max(400, (dist / speed) * 1000);
    if (Math.abs(x - f.x) > 0.5) n.classList.toggle("flip", x < f.x);
    f.x = x; f.y = y;
    n.classList.add("walking");
    place(n, f, ms);
    clearTimeout(n._w);
    n._w = setTimeout(() => n.classList.remove("walking"), ms);
    return ms;
  }

  function fighterHTML(f, i, cheersN) {
    const r = f.now;
    const when = !r.s ? "最近没上线" : r.back === 1 ? "昨天" : `${r.back}天前`;
    const img = f.render || f.portrait || f.avatar;
    return `<div class="fighter ${f.arcana ? "has-arcana" : ""} ${r.s ? "" : "idle"}" data-fid="${f.id}"
        style="--pc:${f.color};--i:${i}" title="${esc(f.name)} · ${esc(f.heroName)}${r.s ? ` · 今日节奏来自${when}：${r.s.k}/${r.s.d}/${r.s.a}（${r.s.n}局）` : ""}">
      <div class="f-in">
        <div class="f-tag"><span class="f-lv">Lv.<b>1</b></span><span class="f-name">${esc(f.name)}</span></div>
        <div class="f-rank"></div>
        <div class="f-xp"><i></i></div>
        ${f.items.length || f.arcana ? `<div class="f-items">${f.arcana ? `<img class="f-arc" src="${esc(f.arcana.img)}" alt="" title="${esc(f.arcana.name)}">` : ""}${f.items.map((u) => `<img src="${esc(u)}" alt="" loading="lazy" onerror="this.remove()">`).join("")}</div>` : ""}
        <div class="f-body">
          ${f.arcana ? `<span class="f-aura"></span>` : ""}
          <img class="f-hero" src="${esc(img)}" alt="${esc(f.heroName)}" loading="lazy" onerror="if('${esc(f.portrait)}'&&this.src!=='${esc(f.portrait)}'){this.src='${esc(f.portrait)}';this.classList.add('flat')}">
          <span class="f-shadow"></span>
        </div>
        <div class="f-live"><span>⚔<b>0</b></span><span>💀<b>0</b></span><span>🤝<b>0</b></span></div>
        <div class="f-kda">${r.s ? `节奏：${when} ${r.s.k}/${r.s.d}/${r.s.a}` : "树下乘凉"}</div>
      </div>
      <span class="f-cheer" ${cheersN ? "" : "hidden"}>💐${cheersN}</span>
    </div>`;
  }

  function updateHud(n, c) {
    const xp = xpOf(c), lv = levelOf(xp);
    const lo = xpFor(lv), hi = xpFor(lv + 1);
    n.querySelector(".f-lv b").textContent = lv;
    n.querySelector(".f-rank").textContent = rankOf(lv);
    n.querySelector(".f-xp i").style.width = Math.round(((xp - lo) / (hi - lo)) * 100) + "%";
    const [k, d, a] = n.querySelectorAll(".f-live b");
    k.textContent = big(c.k); d.textContent = big(c.d); a.textContent = big(c.a);
  }

  function pop(n, text, cls) {
    const s = document.createElement("span");
    s.className = "f-pop " + cls;
    s.textContent = text;
    n.appendChild(s);
    setTimeout(() => s.remove(), 1400);
  }

  // attacco: corre dal bersaglio, colpisce, il bersaglio vacilla
  function attack(an, tn, f, tgt) {
    if (!an || !tn) return;
    const t = Date.now();
    const side = f.x < tgt.x ? -1 : 1;
    const ms = walk(an, f, clamp(tgt.x + side * 6, FIELD.x0, FIELD.x1), tgt.y, 40);
    an.classList.toggle("flip", side > 0);
    f.busy = t + ms + 900; tgt.busy = Math.max(tgt.busy, t + ms + 600);
    setTimeout(() => {
      an.classList.add("striking");
      setTimeout(() => an.classList.remove("striking"), 350);
      tn.classList.add("hit");
      const fx = document.createElement("span");
      fx.className = "slash";
      tn.appendChild(fx);
      setTimeout(() => fx.remove(), 500);
      pop(tn, "砰!", "hitpop");
      setTimeout(() => tn.classList.remove("hit"), 450);
    }, ms);
  }

  function slap(root, jn, jin, n) {
    const g = root.querySelector(".goku");
    const bub = root.querySelector(".goku-bubble");
    if (!g || !jn) return;
    jin.busy = Date.now() + 2600; // 大金神 si ferma a prendere lo schiaffo
    bub.textContent = ["又吹？", "啪！", "坐下！", "这波你的", "哈？", "醒醒"][n % 6];
    g.classList.add("talk", "diving");
    g.style.left = `calc(${jin.x}% - 30px)`;
    g.style.top = `calc(${jin.y}% - 200px)`;
    setTimeout(() => {
      g.classList.add("swing");
      jn.classList.add("slapped");
      pop(jn, "啪!", "slappop");
      if (n % 3 === 0) setTimeout(() => say(jn, ["谁打我？！", "大P神你别太过分", "这巴掌是系统局"][(n / 3) % 3 | 0], 2400), 500);
      const fx = document.createElement("span");
      fx.className = "slap-fx";
      fx.textContent = "✋";
      jn.appendChild(fx);
      setTimeout(() => { jn.classList.remove("slapped"); g.classList.remove("swing"); fx.remove(); }, 700);
    }, 900);
    setTimeout(() => { g.classList.remove("diving"); g.style.left = ""; g.style.top = ""; }, 1900);
    setTimeout(() => g.classList.remove("talk"), 3000);
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
