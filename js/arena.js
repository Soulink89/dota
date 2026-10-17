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
  const PUSH_XP_ = 300; // esperienza per ogni 💪 spinta dei visitatori
  const LV_K = 20000; // livello n richiede LV_K·(n-1)² XP, senza tetto
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const big = (n) => (n >= 1e8 ? (n / 1e8).toFixed(1) + "亿" : n >= 1e4 ? (n / 1e4).toFixed(1) + "万" : n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n));

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
    if (p.cfg.persona?.arenaHero) return p.cfg.persona.arenaHero; // eroe scelto a mano (config.js)
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

  function farmShare(matches) {
    const lh = matches.reduce((t, m) => t + (m.last_hits || 0), 0);
    const min = matches.reduce((t, m) => t + (m.duration || 0), 0) / 60;
    const lpm = min ? lh / min : 0; // un carry farma ~7-9 补刀/分, un supporto ~1-2
    return { lpm, share: Math.min(0.75, lpm / 11) };
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
        // quanto farma:补刀 al minuto della settimana → quota di tempo passata a picchiare i creep
        farm: farmShare(matches),
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
    return { k: c(1, "k"), d: c(2, "d"), a: c(3, "a"), p: f.pushes || 0 };
  }
  const xpOf = (c) => c.k * XP.kill + c.a * XP.assist + (c.p || 0) * PUSH_XP_; // anche le spinte dei visitatori
  const levelOf = (xp) => 1 + Math.floor(Math.sqrt(xp / LV_K));
  const xpFor = (lv) => LV_K * (lv - 1) ** 2;
  const RANKS = [[1, "小兵"], [10, "野区新秀"], [25, "线上霸主"], [50, "团战核心"], [80, "肉山克星"], [120, "超神"], [200, "刀塔之神"]];
  const rankOf = (lv) => RANKS.filter(([l]) => lv >= l).pop()[1];

  const KILL_LINES = ["{a} 一套连招带走了 {t}", "{a} 把 {t} 按在草地上摩擦", "{a} 追了半张地图收下 {t}", "{t} 走位风骚，还是被 {a} 抓了", "{a} 收下 {t} 的人头，顺手嘲讽", "{a} 从树林里杀出，{t} 当场去世", "{a} 绕到背后，{t} 回头只看到灰屏"];
  const DEATH_LINES = ["{v} 倒下了，躺在草地上思考人生", "{v} 阵亡，复活时间够泡一碗面", "{v} 又死了，熟悉的灰屏", "{v} 卒，享年一波团", "{v} 被野怪顺手带走"];
  const ASSIST_LINES = ["{a} 助攻 +1，躲在后面补了个技能", "{a} 默默助攻，功劳全给别人", "{a} 一个控制，助攻到手", "{a} 路过放了个技能，助攻入账"];
  const SLAP_LINES = ["咚！大P神从天而降，一锤砸在大金神头上", "咚！大P神：「吹，接着吹」", "咚！大P神：「这也叫中单？」", "咚！大P神：「上个分再来跟我说话」",
    "咚！大P神锤完继续在云上吃瓜", "咚！大P神：「段位是吹出来的？」", "咚！大P神：「系统局？这锤也是系统给的」", "咚！大金神被锤进土里半截",
    "咚！大P神：「MVP？Most Victimized Player」", "咚！大P神：「中路单杀？先单杀这把锤子」", "咚！大P神：「下次甩锅之前先看看天上」", "咚！大P神：「被针对？对，就是针对你」"];
  const BONK = ["又吹？", "咚！", "坐下！", "这波你的", "哈？", "醒醒", "还吹吗", "看锤！", "清醒点", "超凡入圣？"];
  const JIN_OUCH = ["谁打我？！", "大P神你别太过分", "这锤是系统局", "我被针对了！", "头好痛……", "我要举报", "队友呢？救我！", "这不公平！"];
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
    ["大金神", "中路谁能单杀我？", "蜗牛大神", "要不要我再演示一遍"],
    ["Kaiju大神*", "这波兵是我的", "Soul大神", "你拿吧，反正你也只会补兵"],
    ["Ping大神", "你们这个出装不对", "大金神", "你先学会补刀再说"],
    ["大B神", "我要打团了！", "Yoki大神", "你先站起来，别躲树后面"],
    ["疯子大神", "这钩稳了", "Kaiju大神*", "钩到的是野怪"],
    ["蜗牛大神", "干干干！冲！", "大B神", "你冲吧，我在后面……看着"],
    ["Yoki大神", "这把我玩辅助", "Ping大神", "小黑辅助？理论上不存在"],
    ["大金神", "我这是战术性死亡", "Ping大神", "你一晚上战术性死了二十次"],
    ["Soul大神", "跟紧我", "Kaiju大神*", "跟紧你蹭经验是吧"],
    ["Kaiju大神*", "我四号位", "大金神", "四号位拿小鱼人抢我兵？"],
    ["大B神", "Ура！俄罗斯兄弟听我指挥", "疯子大神", "能指挥俄罗斯人，指挥不了自己的走位"],
    ["Ping大神", "等我抽完这根烟", "蜗牛大神", "等你抽完，高地都没了"],
    ["疯子大神", "老婆不在家，通宵！", "蜗牛大神", "这话我熟，我也说过"],
    ["大金神", "我段位比你们都高", "Soul大神", "嗯，嘴上的段位"],
    ["Yoki大神", "嗯嗯", "Ping大神", "我还没说完呢"],
  ];
  // altre battute singole
  const MORE_SAY = {
    "大金神": ["我一个人能打五个", "这把输了不怪我", "你们跟紧我的节奏", "我当年也是天梯前排", "中路给我，谁都别抢", "这装备不是我的问题", "对面是代练吧"],
    "Ping大神": ["我跟你们讲一下这个阵容", "打团之前先看小地图", "我这MMR是真的要命", "今晚就打一把，真的", "要不我们复盘一下", "别和我组排，掉分"],
    "大B神": ["让我先发育30分钟", "我开播了，给点面子", "等等我还没出BKB", "家里娃哭了，暂离一下", "小黑我再练练", "我切个跳刀先"],
    "Yoki大神": ["嗯", "哦", "行", "我玩小黑", "这个至宝好看吧", "嗯嗯嗯"],
    "蜗牛大神": ["冲冲冲！别怂！", "今晚谁走谁是狗……啊不说了", "我中路随便打", "再来一把！", "我明天还要上班……再来一把"],
    "疯子大神": ["这钩子我闭眼都能中", "我买眼了，你们放心", "电脑开机要五分钟", "这把我出个大根", "老婆在家，我小声点"],
    "Kaiju大神*": ["这野区归我了", "辅助的钱也是钱", "我跳了！谁跟？", "低分局才是真实的刀塔", "Ping，带我上分"],
    "Soul大神": ["胜利只是习惯", "稳一点，别浪", "我来开团", "这把轻松", "看我操作"],
  };
  for (const [k, v] of Object.entries(MORE_SAY)) SAY[k] = [...(SAY[k] || []), ...v];
  DIALOGS.push(
    ["大金神", "我一个人能打五个", "Soul大神", "那你先打赢一个"],
    ["大金神", "这装备不是我的问题", "蜗牛大神", "那是谁的？装备自己买的？"],
    ["大金神", "对面是代练吧", "疯子大神", "对面是你上把的队友"],
    ["大金神", "中路给我，谁都别抢", "Kaiju大神*", "放心，没人跟你抢送"],
    ["Ping大神", "我跟你们讲一下这个阵容", "大B神", "讲完游戏都结束了"],
    ["Ping大神", "今晚就打一把，真的", "Kaiju大神*", "上次你也这么说，打到天亮"],
    ["Ping大神", "要不我们复盘一下", "大金神", "复盘你补刀吗？"],
    ["大B神", "让我先发育30分钟", "大金神", "30分钟你能补20个兵吗"],
    ["大B神", "家里娃哭了，暂离一下", "Ping大神", "娃哭是因为看你玩PA"],
    ["大B神", "我切个跳刀先", "Soul大神", "你跳进去还是跳出来？"],
    ["Yoki大神", "我玩小黑", "大B神", "我也玩小黑，我们不一样"],
    ["Yoki大神", "这个至宝好看吧", "Kaiju大神*", "好看，可惜你不玩辅助"],
    ["蜗牛大神", "再来一把！", "疯子大神", "你说再来一把的时候已经准备下线了"],
    ["蜗牛大神", "我中路随便打", "大金神", "那是我状态不好！"],
    ["疯子大神", "我买眼了，你们放心", "Ping大神", "你眼插在泉水里"],
    ["疯子大神", "电脑开机要五分钟", "Soul大神", "换台电脑吧老板"],
    ["Kaiju大神*", "这野区归我了", "Yoki大神", "嗯嗯"],
    ["Kaiju大神*", "Ping，带我上分", "Ping大神", "我自己都在掉分"],
    ["Soul大神", "我来开团", "大金神", "等我！……我先回个家"],
    ["Soul大神", "这把轻松", "大B神", "你轻松，我被追了三条路"],
  );
  // terzetti: tre giocatori di fila
  const TRIOS = [
    ["大金神", "这把我MVP", "Ping大神", "你0/8的MVP？", "Yoki大神", "嗯嗯"],
    ["大B神", "谁来保护我", "Kaiju大神*", "我在打野", "疯子大神", "我在买眼……可能"],
    ["Ping大神", "这把理论上必赢", "蜗牛大神", "干干干！", "大金神", "等我最后选个英雄"],
    ["大金神", "被针对了！", "Soul大神", "没人针对你", "大B神", "我针对你，因为你骂我呆逼"],
    ["疯子大神", "老婆回来了", "蜗牛大神", "那我们也撤了", "Ping大神", "那我再抽根烟"],
  ];
  // dopo un'uccisione: il vincitore sfotte, a volte la vittima risponde
  const KILL_TAUNTS = [
    ["回泉水歇会吧", "刚才卡了"], ["就这？", "我网不好"], ["下次带个保姆", "保姆被你杀了"], ["站那么前干嘛", "我在吸引火力"],
    ["这个人头谢谢了", "送你的，不客气"], ["再来一次？", "等我买个装备"], ["技术问题", "运气而已"], ["你的走位很有想法", "……"],
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
  // 大P神: Goku a braccia conserte, con aureola e grandi ali piumate
  const WING = `<g class="gk-feathers">
      <path d="M78 122 C46 96 18 98 4 74 C24 78 32 70 44 74 C30 58 42 50 54 62 C46 44 62 40 68 58 C70 46 84 48 82 68 Z" fill="#fff"/>
      <path d="M76 134 C48 132 24 124 10 106 C30 110 40 106 50 110 C40 98 52 92 62 104 C58 92 72 92 74 106 Z" fill="#f1f5f9"/>
      <path d="M76 146 C54 150 36 146 24 134 C40 136 48 132 56 134 C50 126 60 122 68 130 Z" fill="#e2e8f0"/>
      <path d="M70 76 C56 72 40 76 30 70 M62 100 C46 98 30 100 20 92 M66 120 C50 120 36 118 26 112" stroke="#cbd5e1" stroke-width="1.4" fill="none"/>
    </g>`;
  const GOKU = `<svg viewBox="0 0 200 224" class="goku-svg" aria-hidden="true">
    <defs>
      <radialGradient id="gk-glow"><stop offset="0" stop-color="#fde047" stop-opacity=".5"/><stop offset="1" stop-color="#fde047" stop-opacity="0"/></radialGradient>
      <linearGradient id="gk-gi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff8a2a"/><stop offset="1" stop-color="#e2580f"/></linearGradient>
      <linearGradient id="gk-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd9b3"/><stop offset="1" stop-color="#f2b98a"/></linearGradient>
    </defs>
    <ellipse cx="100" cy="120" rx="98" ry="100" fill="url(#gk-glow)" class="gk-glow"/>
    <g class="wing wing-l">${WING}</g>
    <g class="wing wing-r"><g transform="translate(200 0) scale(-1 1)">${WING}</g></g>
    <ellipse cx="100" cy="12" rx="26" ry="6" fill="none" stroke="#fde047" stroke-width="4" class="gk-halo"/>
    <!-- gambe e stivali -->
    <path d="M62 176 L138 176 L146 206 L108 208 L100 192 L92 208 L54 206 Z" fill="url(#gk-gi)"/>
    <path d="M54 204 h40 v14 q-20 6 -42 0 Z M106 204 h40 v14 q-20 6 -42 0 Z" fill="#1d4ed8"/>
    <path d="M56 206 h36 M108 206 h36" stroke="#f5d0a9" stroke-width="3"/>
    <!-- busto -->
    <path d="M62 112 Q100 100 138 112 L144 172 Q100 182 56 172 Z" fill="url(#gk-gi)"/>
    <path d="M86 104 L100 132 L114 104 Z" fill="#1e3a8a"/>
    <rect x="58" y="166" width="84" height="12" rx="4" fill="#1d4ed8"/>
    <path d="M96 176 l-6 14 h8 Z M104 176 l6 14 h-8 Z" fill="#1d4ed8"/>
    <circle cx="124" cy="122" r="8" fill="#fff" stroke="#1e3a8a" stroke-width="1.5"/>
    <text x="124" y="126" font-size="10" text-anchor="middle" fill="#111" font-weight="900">悟</text>
    <!-- braccia conserte -->
    <path d="M62 114 Q46 130 56 154 L72 150 Q66 132 76 118 Z M138 114 Q154 130 144 154 L128 150 Q134 132 124 118 Z" fill="url(#gk-skin)"/>
    <rect x="56" y="136" width="86" height="15" rx="7.5" fill="url(#gk-skin)" stroke="#d99a6c" stroke-width="1"/>
    <rect x="58" y="148" width="86" height="15" rx="7.5" fill="url(#gk-skin)" stroke="#d99a6c" stroke-width="1"/>
    <rect x="128" y="135" width="12" height="17" rx="3" fill="#1d4ed8"/><rect x="60" y="147" width="12" height="17" rx="3" fill="#1d4ed8"/>
    <!-- testa -->
    <rect x="91" y="94" width="18" height="14" fill="#f2b98a"/>
    <circle cx="75" cy="76" r="6" fill="#f2b98a"/><circle cx="125" cy="76" r="6" fill="#f2b98a"/>
    <ellipse cx="100" cy="74" rx="24" ry="27" fill="url(#gk-skin)"/>
    <path d="M70 72 L50 62 L66 56 L42 40 L64 40 L48 18 L74 30 L74 4 L92 26 L104 0 L112 26 L130 6 L128 32 L154 20 L138 44 L160 46 L136 58 L152 68 L130 70 Q128 48 100 46 Q74 48 70 72 Z" fill="#14141c"/>
    <path d="M78 56 L84 70 L90 52 L97 68 L103 50 L110 66 L116 52 L120 68 L126 56 Q114 40 98 42 Q84 44 78 56 Z" fill="#14141c"/>
    <path d="M68 30 L74 4 L80 22 M104 0 L100 20 M130 6 L122 26" stroke="#3b3b4f" stroke-width="2" fill="none"/>
    <path d="M83 66 L97 71 M117 66 L103 71" stroke="#14141c" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M86 73 L97 75 L95 80 L87 79 Z M114 73 L103 75 L105 80 L113 79 Z" fill="#fff"/>
    <circle cx="93" cy="77" r="2.2" fill="#111"/><circle cx="107" cy="77" r="2.2" fill="#111"/>
    <path d="M93 90 Q101 94 109 87" stroke="#7c2d12" stroke-width="2" fill="none" stroke-linecap="round"/>
    <!-- il martello: appoggiato sulla spalla, si alza e cala su 大金神 -->
    <g class="gk-hammer">
      <rect x="138.5" y="60" width="8" height="92" rx="3.5" fill="#8b5a2b" stroke="#5b3a1a" stroke-width="1.5"/>
      <path d="M140 72 h5 M140 84 h5 M140 96 h5" stroke="#5b3a1a" stroke-width="1.5"/>
      <rect x="116" y="30" width="54" height="34" rx="6" fill="#9ca3af" stroke="#334155" stroke-width="2.5"/>
      <rect x="116" y="38" width="54" height="7" fill="#e5e7eb"/>
      <rect x="112" y="28" width="8" height="38" rx="3" fill="#64748b" stroke="#334155" stroke-width="2"/>
      <rect x="166" y="28" width="8" height="38" rx="3" fill="#64748b" stroke="#334155" stroke-width="2"/>
      <circle cx="142.5" cy="150" r="8" fill="url(#gk-skin)" stroke="#d99a6c"/>
    </g>
  </svg>`;

  // ora del giorno (vera): alba, giorno, tramonto, notte → tinta della scena
  const tod = (h = new Date().getHours()) => (h >= 5 && h < 8 ? "dawn" : h >= 8 && h < 17 ? "day" : h >= 17 && h < 20 ? "dusk" : "night");
  const SPARKS = Array.from({ length: 16 }, (_, i) =>
    `<span class="spark" style="left:${(i * 61) % 100}%;top:${45 + ((i * 29) % 50)}%;--d:${((i * 0.7) % 6).toFixed(1)}s;--t:${5 + (i % 4)}s"></span>`).join("");

  // creep (Radiant verdi da sinistra, Dire rossi da destra)
  const CREEP = `<svg viewBox="0 0 48 52" aria-hidden="true">
    <ellipse cx="24" cy="49" rx="14" ry="3" fill="rgba(0,0,0,.4)"/>
    <path d="M16 36 l-3 12 h6 l2 -10 Z M30 36 l3 12 h-6 l-2 -10 Z" fill="#3f2d20"/>
    <path d="M13 22 Q24 15 35 22 L34 38 Q24 42 14 38 Z" fill="var(--cc)" stroke="rgba(0,0,0,.45)"/>
    <path d="M14 30 Q24 34 34 30" stroke="rgba(0,0,0,.35)" stroke-width="1.5" fill="none"/>
    <path d="M10 20 Q14 14 21 18 L19 25 Q13 26 10 20 Z M38 20 Q34 14 27 18 L29 25 Q35 26 38 20 Z" fill="var(--ch)" stroke="rgba(0,0,0,.5)"/>
    <circle cx="24" cy="15" r="6.5" fill="#b98a62"/>
    <path d="M16 15 Q24 1 32 15 L30 17 Q24 12 18 17 Z" fill="var(--ch)" stroke="rgba(0,0,0,.5)"/>
    <path d="M24 3 L24 -1" stroke="var(--crest)" stroke-width="3" stroke-linecap="round"/>
    <path d="M20 16 h3 M25 16 h3" stroke="#1c1917" stroke-width="1.6"/>
    <circle cx="9" cy="30" r="7" fill="var(--sh)" stroke="rgba(0,0,0,.55)" stroke-width="1.5"/><circle cx="9" cy="30" r="2" fill="var(--ch)"/>
    <g class="cr-sword"><path d="M36 30 L46 12" stroke="#d6d3d1" stroke-width="3" stroke-linecap="round"/><path d="M33 28 l6 3" stroke="#57381c" stroke-width="3"/></g>
  </svg>`;

  // 💪 spinte: contatore condiviso da tutti i visitatori (abacus, gratuito, senza account)
  const PUSH_URL = (op, id) => `https://abacus.jasoncameron.dev/${op}/soulink89-dota-arena/push-${id}`;
  const PUSH_XP = PUSH_XP_;
  const PUSH_MINE = 10, PUSH_DAY = 100; // al giorno, per personaggio: per ogni visitatore / per tutti insieme
  const myKey = (id) => `tribunale:push:${id}:${dayIdx(Date.now())}`;
  const myPushes = (id) => { try { return Number(localStorage.getItem(myKey(id))) || 0; } catch { return 0; } };
  const setMyPushes = (id, v) => { try { localStorage.setItem(myKey(id), v); } catch {} };
  const getPushes = (id) => fetch(PUSH_URL("get", id)).then((r) => (r.ok ? r.json() : { value: 0 })).then((j) => j.value || 0).catch(() => 0);

  // ---------- schermata di caricamento ----------
  const TIPS = ["正在给大P神磨锤子…", "正在给Ping大神倒威士忌…", "正在给大B神冲奶粉…", "正在召唤小兵…", "正在加载英雄模型…",
    "正在统计大金神昨天死了几次…", "正在帮Kaiju大神找小鱼人…", "正在给疯子大神的电脑开机（需要五分钟）…", "正在擦亮Yoki大神的至宝…"];
  const loaderHTML = (p = 0) => `<div class="arena-loader" data-p="${p}">
      <div class="al-title">刀塔乱斗</div>
      <div class="al-bar"><i style="width:${Math.round(p * 100)}%"></i></div>
      <div class="al-info"><span class="al-tip">${TIPS[0]}</span><b class="al-pct">${Math.round(p * 100)}%</b></div>
    </div>`;
  function progress(el, p, tip) {
    const l = el?.querySelector(".arena-loader");
    if (!l) return;
    const v = Math.max(Number(l.dataset.p || 0), Math.min(1, p)); // la barra non torna mai indietro
    l.dataset.p = v;
    l.querySelector(".al-bar i").style.width = Math.round(v * 100) + "%";
    l.querySelector(".al-pct").textContent = Math.round(v * 100) + "%";
    l.querySelector(".al-tip").textContent = tip || TIPS[Math.floor(v * 100 / 12) % TIPS.length];
  }
  // segnaposto mostrato subito, mentre si caricano i dati dei giocatori
  function loader(el) {
    if (el) el.innerHTML = `<section class="arena arena-pre tod-${tod()}">${loaderHTML(0)}</section>`;
  }
  const loadImage = (src) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = src; });

  // ---------- montaggio ----------
  const FIELD = { x0: 6, x1: 90, y0: 64, y1: 94 };
  let timer = null, walker = null, chatter = null, spawner = null, sipper = null, io = null, active = true, onVis = null;
  async function mount(el, players) {
    if (!el) return;
    [timer, walker, chatter, spawner, sipper].forEach(clearInterval); io?.disconnect();
    const mobile = window.innerWidth < 700;
    FIELD.y0 = mobile ? 60 : 64;
    FIELD.y1 = mobile ? 86 : 94; // su telefono la chat sta in basso
    const startP = Number(el.querySelector(".arena-loader")?.dataset.p || 0);
    progress(el, 0.5, "正在读取乱斗战绩…");
    const [ids, hist] = await Promise.all([loadItemIds(), loadHistory()]);
    progress(el, 0.56, "正在统计大家的推力 💪…");
    const F = buildFighters(players, ids, hist);
    const today = dayIdx(Date.now());
    const [pushes, pushDays] = await Promise.all([Promise.all(F.map((f) => getPushes(f.id))), Promise.all(F.map((f) => getPushes(`${f.id}-d${today}`)))]);
    progress(el, 0.62);
    const jin = F.find((f) => f.name === "大金神");
    F.forEach((f, i) => {
      f.x = FIELD.x0 + ((i + 0.5) / F.length) * (FIELD.x1 - FIELD.x0);
      f.y = FIELD.y0 + (((i * 37) % 100) / 100) * (FIELD.y1 - FIELD.y0);
      f.busy = 0; f.lock = 0; f.hp = 100; f.pushes = pushes[i]; f.pushDay = pushDays[i];
    });
    const legend = players.find((p) => p.legend);
    const tier = legend?.data.profile?.rank_tier;
    const medalName = window.TribunaleRoast?.medalName?.(tier) || "";
    const medal = tier ? `<div class="gk-medal" title="${esc(medalName)}"><img src="${API.rankIcon(Math.floor(tier / 10))}" alt="">${tier % 10 && tier < 80 ? `<img src="${API.rankStar(tier % 10)}" alt="">` : ""}</div>` : "";

    el.innerHTML = `
      <section class="arena loading tod-${tod()}${LITE ? " lite" : ""}" aria-label="刀塔乱斗">
        ${loaderHTML(Math.max(startP, 0.62))}
        <div class="arena-bg"></div><div class="arena-tint"></div><div class="arena-ground"></div>
        <div class="arena-fx">${LITE ? "" : SPARKS}</div>
        <div class="arena-top">${F.map(scoreCell).join("")}</div>
        <div class="arena-badge"><b>刀塔乱斗</b><span id="arena-clock"></span></div>
        <div class="goku">${medal}<div class="gk-name">大P神${medalName ? ` · ${esc(medalName)}` : ""}</div>${GOKU}<span class="goku-bubble"></span></div>
        <div class="arena-field">${F.map((f, i) => fighterHTML(f, i)).join("")}</div>
        <ol class="arena-chat" id="arena-log"></ol>
      </section>
      <details class="arena-rules">
        <summary>📜 乱斗规则（点我）</summary>
        <ul>
          <li>每位选手化身<b>最近7天最常玩的英雄</b>（疯子大神固定屠夫，Kaiju大神*固定小鱼人，大B神固定幻影刺客），头顶是这个英雄最常出的装备；有至宝又玩了这个英雄的，直接穿上至宝。</li>
          <li>节奏全看<b>前一天（北京时间早6点到早6点）的真实战绩</b>：每10次击杀 = 每分钟出手1次，每10次死亡 = 每分钟阵亡1次，每10次助攻 = 每分钟助攻1次。前一天没打的，沿用最近一天打过的战绩（最多7天前）。</li>
          <li>出手只打<b>那天死得比自己多的人</b>；死得最多的那位，就是全场的沙包。<b>击杀</b> = 蓄力冲上去重砍，对手被打倒在地；<b>助攻</b> = 补一下轻击，对手只是跪下，马上爬起来。自己的<b>阵亡</b>（按死亡数）才会灵魂出窍、等复活。</li>
          <li>两边每30秒出一波小兵。<b>补刀越多的人（按这周每分钟补刀数）越爱去打兵</b>，比如小鱼人。</li>
          <li>击杀 +${XP.kill} 经验，助攻 +${XP.assist} 经验，每次被推一把 +${PUSH_XP} 经验；升到 N 级需要 ${LV_K.toLocaleString()}×(N−1)² 经验，<b>没有等级上限</b>。</li>
          <li><b>从 2026年10月17日 开打，永不清零</b>：每天的战绩都累计下去，谁天天打谁就越来越强。</li>
          <li>Soul大神在这里用的是<b>全部真实比赛</b>，输赢都算。</li>
          <li>大P神扛着锤子在云上观战，<b>每分钟随机下来锤大金神3次</b>，风雨无阻。天色跟着真实时间变。</li>
          <li><b>点选手 = 推他一把 💪</b>：每推一次 +${PUSH_XP} 经验，记在网站上，所有访客一起累计。每个选手每天你最多推 ${PUSH_MINE} 次，全体访客合计最多 ${PUSH_DAY} 次。</li>
        </ul>
      </details>`;

    const root = el.querySelector(".arena");
    const field = el.querySelector(".arena-field");
    const log = el.querySelector("#arena-log");
    const nodes = Object.fromEntries(F.map((f) => [f.id, el.querySelector(`[data-fid="${f.id}"]`)]));
    const cells = Object.fromEntries(F.map((f) => [f.id, el.querySelector(`[data-sid="${f.id}"]`)]));
    F.forEach((f) => place(nodes[f.id], f, 0));
    const heroReady = F.map((f) => setupHero(nodes[f.id], f));
    const isDead = (f) => nodes[f.id].classList.contains("dead");
    // video fermi quando l'arena non si vede (risparmia CPU e batteria)
    // fuori schermo o scheda nascosta: tutto in pausa (video, animazioni, timer) per non scaldare il telefono
    let visible = true;
    const setActive = () => {
      const on = visible && !document.hidden;
      root.classList.toggle("paused", !on);
      el.querySelectorAll("video").forEach((v) => (on ? v.play().catch(() => {}) : v.pause()));
      active = on;
    };
    io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; setActive(); });
    io.observe(root);
    document.removeEventListener("visibilitychange", onVis);
    onVis = setActive;
    document.addEventListener("visibilitychange", onVis);

    const push = (html, cls = "") => {
      const item = document.createElement("li");
      if (cls) item.className = cls;
      item.innerHTML = html;
      log.prepend(item);
      while (log.children.length > (mobile ? 3 : 5)) log.lastChild.remove();
    };
    const talk = (f, text) => {
      say(nodes[f.id], text);
      push(`<span class="ch">[全部]</span> ${tag(f)}: ${esc(text)}`, "talk");
    };

    // ---- spinte (click) ----
    let lastPush = 0;
    field.addEventListener("click", (ev) => {
      const n = ev.target.closest(".fighter");
      if (!n) return;
      const f = F.find((x) => String(x.id) === n.dataset.fid);
      const t = Date.now();
      if (!f || t - lastPush < 1200) return;
      lastPush = t;
      // limite giornaliero per personaggio: PUSH_MINE spinte a testa, PUSH_DAY in tutto (tutti i visitatori)
      const mine = myPushes(f.id);
      if (mine >= PUSH_MINE || f.pushDay >= PUSH_DAY) {
        say(n, mine >= PUSH_MINE ? "今天推够了，明天再来" : "今天大家推太多了，累了");
        pop(n, `今日已达上限`, "jabpop");
        return;
      }
      setMyPushes(f.id, mine + 1);
      f.pushes++; f.pushDay++;
      fetch(PUSH_URL("hit", f.id)).then((r) => r.json()).then((j) => { if (j.value) f.pushes = j.value; }).catch(() => {});
      fetch(PUSH_URL("hit", `${f.id}-d${dayIdx(t)}`)).then((r) => r.json()).then((j) => { if (j.value) f.pushDay = j.value; }).catch(() => {});
      // spinta: scivola via dal punto in cui hai cliccato
      const r = n.getBoundingClientRect(), dir = ev.clientX < r.left + r.width / 2 ? 1 : -1;
      n.classList.remove("pushed"); void n.offsetWidth; n.classList.add("pushed");
      setTimeout(() => n.classList.remove("pushed"), 700);
      if (!isDead(f)) { f.busy = t + walk(n, f, clamp(f.x + dir * 6, FIELD.x0, FIELD.x1), f.y, 30, true) + 400; }
      pop(n, `💪 +${PUSH_XP}经验`, "pushpop");
      if (Math.random() < 0.5) say(n, ["谁推我？", "别推别推", "好嘞，冲！", "感受到了力量", "再推我就上头了"][f.pushes % 5]);
    });

    // ---- creep ----
    const creeps = [];
    let cid = 0;
    const spawnWave = () => {
      if (creeps.length > 7) return;
      for (const side of [-1, 1]) for (let k = 0; k < 2; k++) {
        const c = { id: ++cid, side, x: side < 0 ? 1 : 99, y: FIELD.y0 + 4 + Math.random() * (FIELD.y1 - FIELD.y0 - 6), hp: 100, claimed: null };
        const e = document.createElement("div");
        e.className = `creep ${side < 0 ? "radiant" : "dire"}`;
        e.innerHTML = `<div class="cr-hp"><i></i></div>${CREEP}`;
        field.appendChild(e);
        c.el = e;
        placeCreep(c, 0);
        requestAnimationFrame(() => { c.x = side < 0 ? 18 + Math.random() * 22 : 60 + Math.random() * 22; placeCreep(c, 9000 + k * 900); });
        creeps.push(c);
      }
    };
    const hitCreep = (f, c) => {
      const n = nodes[f.id];
      if (!c.el.isConnected || isDead(f)) { c.claimed = null; return; }
      n.classList.remove("striking"); void n.offsetWidth; n.classList.add("striking");
      setTimeout(() => n.classList.remove("striking"), 420);
      c.hp -= 34 + Math.random() * 20;
      c.el.querySelector(".cr-hp i").style.width = Math.max(0, c.hp) + "%";
      c.el.classList.remove("cr-hit"); void c.el.offsetWidth; c.el.classList.add("cr-hit");
      if (c.hp <= 0) {
        creeps.splice(creeps.indexOf(c), 1);
        c.el.classList.add("cr-die");
        setTimeout(() => c.el.remove(), 900);
        pop(n, `+${38 + (c.id % 12)} 💰`, "goldpop");
      } else setTimeout(() => hitCreep(f, c), 650);
    };
    const goFarm = (f) => {
      const free = creeps.filter((c) => !c.claimed && c.hp > 0);
      if (!free.length) return false;
      const c = free.sort((a, b) => Math.abs(a.x - f.x) + Math.abs(a.y - f.y) - (Math.abs(b.x - f.x) + Math.abs(b.y - f.y)))[0];
      c.claimed = f.id;
      const side = f.x < c.x ? -1 : 1;
      const ms = walk(nodes[f.id], f, clamp(c.x + side * 5, FIELD.x0, FIELD.x1), c.y + 0.3, 10);
      nodes[f.id].classList.toggle("flip", side > 0);
      f.busy = Date.now() + ms + 2600;
      setTimeout(() => hitCreep(f, c), ms);
      return true;
    };

    // passeggiata: chi farma tanto va dai creep, gli altri girano senza finire addosso agli altri
    const wander = () => {
      const t = Date.now();
      for (const f of F) {
        if (f.busy > t || isDead(f)) continue;
        if (Math.random() < f.farm.share && goFarm(f)) continue;
        if (Math.random() < 0.45) continue;
        let nx = f.x, ny = f.y;
        for (let k = 0; k < 8; k++) {
          const cx = clamp(f.x + (Math.random() - 0.5) * 26, FIELD.x0, FIELD.x1);
          const cy = clamp(f.y + (Math.random() - 0.5) * 14, FIELD.y0, FIELD.y1);
          if (F.every((o) => o === f || Math.abs(o.x - cx) > 9 || Math.abs(o.y - cy) > 9)) { nx = cx; ny = cy; break; }
        }
        if (nx !== f.x || ny !== f.y) f.busy = t + walk(nodes[f.id], f, nx, ny, 6) + 600;
      }
    };

    const prev = {};
    let lastSlapMin = null, tauntI = 0;
    const tick = () => {
      const t = Date.now();
      if (F.length && dayIdx(t) !== F[0].today) { mount(el, players); return; } // nuova giornata: nuovi ritmi, conteggi che continuano
      root.className = `arena tod-${tod()}${LITE ? " lite" : ""}${active ? "" : " paused"}`;
      const minutes = Math.floor((t - dayStartMs(EPOCH)) / 60000);
      el.querySelector("#arena-clock").textContent = `开战第 ${Math.floor(minutes / 1440) + 1} 天 · ${String(Math.floor((minutes % 1440) / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
      F.forEach((f, i) => {
        const c = counts(f, i, t), p = prev[f.id];
        const n = nodes[f.id];
        if (!c) return;
        if (!isDead(f)) f.hp = Math.min(100, f.hp + 0.5); // rigenerazione
        updateHud(n, cells[f.id], f, c, t);
        if (!p) { prev[f.id] = c; return; }
        // uccisione: corre e colpisce
        if (c.k > p.k && f.targets.length && f.lock < t && !isDead(f)) {
          const tgt = f.targets.find((x, j) => j >= c.k % f.targets.length && !isDead(x)) || f.targets.find((x) => !isDead(x));
          if (tgt) {
            attack(root, n, nodes[tgt.id], f, tgt);
            push(`⚔️ ${fill(KILL_LINES[(c.k + i) % KILL_LINES.length], { a: tag(f), t: tag(tgt) })}`, "sys");
            if ((c.k + i) % 3 === 0) {
              const [l1, l2] = KILL_TAUNTS[tauntI++ % KILL_TAUNTS.length];
              setTimeout(() => talk(f, `${tgt.name}，${l1}`), 1300);
              setTimeout(() => talk(tgt, l2), 3000);
            }
          }
        }
        // morte: cade a terra, l'anima sale, poi rinasce
        if (c.d > p.d && !isDead(f)) {
          die(n, f, t);
          if (c.d % 2 === 0) push(`💀 ${fill(DEATH_LINES[(c.d + i) % DEATH_LINES.length], { v: tag(f) })}`, "sys");
        }
        // assist: da lontano, un incantesimo che stordisce
        if (c.a > p.a && !isDead(f)) {
          const tgt = f.targets.find((x) => !isDead(x)) || F.find((x) => x !== f && !isDead(x));
          if (tgt) assist(field, n, nodes[tgt.id], f, tgt);
          if (c.a % 4 === 0) push(`🤝 ${fill(ASSIST_LINES[(c.a + i) % ASSIST_LINES.length], { a: tag(f) })}`, "sys");
        }
        const lv = levelOf(xpOf(c));
        if (lv > levelOf(xpOf(p))) {
          pop(n, `升级! Lv.${lv}`, "lvup");
          n.classList.add("lvflash"); setTimeout(() => n.classList.remove("lvflash"), 1400);
          push(`✨ ${tag(f)} 升到 <b>Lv.${lv}</b>（${rankOf(lv)}）`, "sys");
        }
        prev[f.id] = c;
      });
      // martellate di 大P神: 3 al minuto, in secondi "casuali" ma uguali per tutti (derivati dal minuto)
      const minOfDay = Math.floor((t - dayStartMs(dayIdx(t))) / 60000);
      const sec = new Date(t).getSeconds();
      const hits = bonkSeconds(minOfDay);
      const k = hits.filter((s) => sec >= s).length - 1;
      const key = minOfDay * 3 + k;
      if (jin && k >= 0 && sec - hits[k] < 3 && lastSlapMin !== key) {
        lastSlapMin = key;
        slap(root, nodes[jin.id], jin, key);
        push(`🔨 ${SLAP_LINES[key % SLAP_LINES.length]}（今日第${key + 1}锤）`, "slap");
        if (key % 2 === 0) setTimeout(() => talk(jin, JIN_OUCH[(key / 2 | 0) % JIN_OUCH.length]), 1600);
      }
    };

    // chiacchiere: ogni 5 secondi qualcuno parla; un turno su tre è un botta e risposta
    const byName = Object.fromEntries(F.map((f) => [f.name, f]));
    const dialogs = DIALOGS.filter(([a, , b]) => byName[a] && byName[b]);
    let ci = Math.floor(Date.now() / 5000);
    const chat = () => {
      ci++;
      const trios = TRIOS.filter((x) => byName[x[0]] && byName[x[2]] && byName[x[4]]);
      if (trios.length && ci % 5 === 0) {
        const [a, l1, b, l2, c, l3] = trios[(ci / 5 | 0) % trios.length];
        if (isDead(byName[a])) return;
        talk(byName[a], l1);
        setTimeout(() => talk(byName[b], l2), 1800);
        setTimeout(() => talk(byName[c], l3), 3600);
        return;
      }
      if (dialogs.length && ci % 2 === 0) {
        const [a, l1, b, l2] = dialogs[(ci / 2 | 0) % dialogs.length];
        if (isDead(byName[a])) return;
        talk(byName[a], l1);
        setTimeout(() => talk(byName[b], l2), 1900);
        return;
      }
      const f = F[ci % F.length], lines = SAY[f.name];
      if (lines && !isDead(f)) talk(f, lines[Math.floor(ci / F.length) % lines.length]);
    };

    const now = Date.now();
    const lead = F.map((f, i) => ({ f, c: counts(f, i, now) })).filter((x) => x.c).sort((a, b) => xpOf(b.c) - xpOf(a.c))[0];
    if (lead) push(`🏆 当前领跑：${tag(lead.f)} Lv.${levelOf(xpOf(lead.c))}（${rankOf(levelOf(xpOf(lead.c)))}）`, "sys");
    // aspetta sfondo e modelli degli eroi (al massimo 12 secondi), aggiornando la barra; poi si parte
    const assets = [loadImage(LITE ? "assets/arena-bg-m.jpg" : "assets/arena-bg.jpg"), ...heroReady];
    let doneN = 0;
    assets.forEach((a) => a.then(() => progress(el, 0.62 + (0.38 * ++doneN) / assets.length)));
    await Promise.race([Promise.all(assets), new Promise((r) => setTimeout(r, 12000))]);
    progress(el, 1, "准备就绪！");
    await new Promise((r) => setTimeout(r, 350));
    root.classList.remove("loading");
    setTimeout(() => el.querySelector(".arena-loader")?.remove(), 700);
    spawnWave();
    tick();
    const alive = (fn, h) => () => (!document.contains(el) ? clearInterval(h()) : active && fn());
    timer = setInterval(alive(tick, () => timer), LITE ? 1000 : 500);
    walker = setInterval(alive(wander, () => walker), 1200);
    chatter = setInterval(alive(chat, () => chatter), 5000);
    // ogni tanto Ping beve un sorso e 大B神 si attacca al biberon
    let si = 0;
    const sip = () => {
      const who = F.filter((f) => PROPS[f.name] && !isDead(f) && f.lock < Date.now());
      if (!who.length) return;
      const f = who[si++ % who.length], n = nodes[f.id];
      replay(n, "sipping", 1800);
      if (si % 2 === 0) setTimeout(() => talk(f, PROPS[f.name].lines[(si / 2 | 0) % PROPS[f.name].lines.length]), 900);
    };
    sipper = setInterval(alive(sip, () => sipper), 7000);
    spawner = setInterval(alive(spawnWave, () => spawner), 30000);
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const tag = (f) => `<b style="color:${f.color}">${esc(f.name)}</b>`;

  // posizione + profondità (più in basso = più vicino = più grande e davanti)
  const depth = (y) => (0.78 + ((y - FIELD.y0) / (FIELD.y1 - FIELD.y0)) * 0.32).toFixed(3);
  function place(n, f, ms) {
    if (!n) return;
    n.style.transitionDuration = ms + "ms";
    n.style.left = f.x + "%";
    n.style.top = f.y + "%";
    n.style.zIndex = 10 + Math.round(f.y);
    n.style.setProperty("--sc", depth(f.y));
  }
  function placeCreep(c, ms) {
    c.el.style.transitionDuration = ms + "ms";
    c.el.style.left = c.x + "%";
    c.el.style.top = c.y + "%";
    c.el.style.zIndex = 10 + Math.round(c.y);
    c.el.style.setProperty("--sc", depth(c.y));
  }
  function walk(n, f, x, y, speed, keepFacing) {
    if (!n) return 0;
    const dist = Math.hypot(x - f.x, (y - f.y) * 1.6);
    const ms = Math.max(350, (dist / speed) * 1000);
    if (!keepFacing && Math.abs(x - f.x) > 0.5) n.classList.toggle("flip", x < f.x);
    f.x = x; f.y = y;
    n.classList.add("walking");
    place(n, f, ms);
    clearTimeout(n._w);
    n._w = setTimeout(() => n.classList.remove("walking"), ms);
    return ms;
  }

  // eroe animato (render ufficiale di dota2.com): .mov HEVC per Safari, .webm per gli altri; se non va, immagine fissa
  // prepara il modello dell'eroe; la promessa si risolve quando è pronto (o è fallito, così il gioco parte lo stesso)
  function setupHero(n, f) {
    return new Promise((done) => {
      const fallback = (el) => {
        if (el.isConnected) {
          const img = document.createElement("img");
          img.className = "f-hero flat";
          img.alt = f.heroName;
          img.src = f.portrait || f.avatar;
          el.replaceWith(img);
        }
        done();
      };
      // modalità leggera: il render PNG (1440×1440, ~8 MB in memoria) viene rimpicciolito in un canvas da 240×240 e poi liberato
      const cv = n.querySelector("canvas.f-hero");
      if (cv) {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => { cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height); img.onerror = null; img.removeAttribute("src"); done(); };
        img.onerror = () => fallback(cv);
        img.src = f.render;
        return;
      }
      const v = n.querySelector("video");
      if (!v) { const i = n.querySelector("img.f-hero"); return i && !i.complete ? (i.onload = i.onerror = done) : done(); }
      if (v.readyState >= 3) return done();
      v.addEventListener("canplay", done, { once: true });
      v.querySelector("source:last-of-type").addEventListener("error", () => fallback(v));
      v.addEventListener("error", () => fallback(v));
    });
  }

  // oggetti in mano dalla "lore": Ping大神 whisky + sigaretta, 大B神 il biberon
  const GLASS = `<svg viewBox="0 0 30 34" class="pr-glass"><path d="M3 4 L27 4 L24 31 Q15 34 6 31 Z" fill="rgba(226,232,240,.35)" stroke="#e2e8f0" stroke-width="1.6"/>
    <path d="M5 14 L25 14 L23.5 29.5 Q15 32 6.5 29.5 Z" fill="#c2410c" opacity=".9"/><path d="M5 14 L25 14" stroke="#fdba74" stroke-width="1.2"/>
    <rect x="8" y="10" width="7" height="7" rx="1.5" fill="rgba(255,255,255,.75)" transform="rotate(-12 11 13)"/><rect x="15" y="12" width="6" height="6" rx="1.5" fill="rgba(255,255,255,.6)" transform="rotate(15 18 15)"/>
    <path d="M7 6 L9 28" stroke="rgba(255,255,255,.6)" stroke-width="1.4"/></svg>`;
  const CIG = `<span class="pr-cig"><i></i><b></b><s class="smoke s1"></s><s class="smoke s2"></s><s class="smoke s3"></s></span>`;
  const BOTTLE = `<svg viewBox="0 0 22 44" class="pr-bottle"><path d="M8 2 Q11 -1 14 2 L15 8 L7 8 Z" fill="#fca5a5"/><rect x="4" y="8" width="14" height="5" rx="2" fill="#60a5fa"/>
    <rect x="3" y="13" width="16" height="29" rx="5" fill="rgba(255,255,255,.55)" stroke="#e2e8f0" stroke-width="1.5"/>
    <rect x="4.5" y="22" width="13" height="18.5" rx="3.5" fill="#fefce8"/><path d="M6 18 h4 M6 24 h4 M6 30 h4 M6 36 h4" stroke="#93c5fd" stroke-width="1.2"/>
    <circle cx="14" cy="31" r="2.6" fill="#fda4af"/></svg>`;
  const PROPS = {
    "Ping大神": { html: `<span class="prop pr-hand-l">${GLASS}</span><span class="prop pr-mouth">${CIG}</span>`, act: "sip",
      lines: ["再来一口", "威士忌加冰，理论上更清醒", "抽完这根就打团", "咳咳……没事，烟呛的", "喝一口，分就回来了"] },
    "大B神": { html: `<span class="prop pr-hand-l">${BOTTLE}</span>`, act: "sip",
      lines: ["喝口奶压压惊", "咕噜咕噜……", "奶瓶在手，天下我有", "别抢我奶瓶！", "喝完再打团"] },
  };
  const propsHTML = (f) => (PROPS[f.name] ? `<div class="f-props">${PROPS[f.name].html}</div>` : "");

  // telefoni e dispositivi con poca memoria: niente video, immagini piccole, meno animazioni
  const LITE = window.innerWidth < 900 || (navigator.deviceMemory && navigator.deviceMemory <= 4) || navigator.connection?.saveData ||
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  function heroMedia(f) {
    if (!f.key) return `<img class="f-hero flat" src="${esc(f.portrait || f.avatar)}" alt="">`;
    if (LITE) return `<canvas class="f-hero" width="240" height="240"></canvas>`;
    const base = `${CDN}/videos/dota_react/heroes/renders/${f.key}`;
    return `<video class="f-hero" autoplay loop muted playsinline preload="auto" disablepictureinpicture>
      <source src="${base}.mov" type='video/mp4; codecs="hvc1"'><source src="${base}.webm" type="video/webm"></video>`;
  }

  function scoreCell(f) {
    return `<div class="sc" data-sid="${f.id}" style="--pc:${f.color}" title="${esc(f.name)} · ${esc(f.heroName)}">
      <div class="sc-img" style="background-image:url('${esc(f.portrait || f.avatar)}')"><span class="sc-lv">1</span><span class="sc-rs"></span></div>
      <div class="sc-name">${esc(f.name)}</div><div class="sc-kda">0/0/0</div></div>`;
  }

  function fighterHTML(f, i) {
    const r = f.now;
    const when = !r.s ? "最近没上线" : r.back === 1 ? "昨天" : `${r.back}天前`;
    return `<div class="fighter ${f.arcana ? "has-arcana" : ""} ${r.s ? "" : "idle"}" data-fid="${f.id}"
        style="--pc:${f.color};--i:${i}" title="${esc(f.name)} · ${esc(f.heroName)}${r.s ? ` · 今日节奏来自${when}：${r.s.k}/${r.s.d}/${r.s.a}（${r.s.n}局）` : " · 最近没上线，树下乘凉"} · 点我推一把">
      <div class="f-in">
        <div class="f-plate">
          <div class="f-name">${esc(f.name)}<span class="f-push" ${f.pushes ? "" : "hidden"}>💪${big(f.pushes)}</span></div>
          <div class="f-bar"><span class="f-lv">1</span><div class="f-bars"><div class="f-hp"><i></i><span class="f-rs"></span></div><div class="f-xp"><i></i></div></div></div>
          ${f.items.length || f.arcana ? `<div class="f-items">${f.arcana ? `<img class="f-arc" src="${esc(f.arcana.img)}" alt="" title="${esc(f.arcana.name)}">` : ""}${f.items.map((u) => `<img src="${esc(u)}" alt="" loading="lazy" onerror="this.remove()">`).join("")}</div>` : ""}
        </div>
        <div class="f-body">
          <span class="f-shadow"></span>
          ${f.arcana ? `<span class="f-aura"></span>` : ""}
          <div class="f-pose">${heroMedia(f)}${propsHTML(f)}</div>
          <span class="f-stun">💫</span>
        </div>
      </div>
      <span class="f-soul">👻</span><span class="f-beam"></span>
    </div>`;
  }

  function updateHud(n, cell, f, c, t) {
    const xp = xpOf(c), lv = levelOf(xp);
    const lo = xpFor(lv), hi = xpFor(lv + 1);
    n.querySelector(".f-lv").textContent = lv;
    n.querySelector(".f-xp i").style.width = Math.round(((xp - lo) / (hi - lo)) * 100) + "%";
    const hp = n.querySelector(".f-hp i");
    hp.style.width = Math.round(f.hp) + "%";
    hp.classList.toggle("low", f.hp < 35);
    const rs = f.deadUntil > t ? Math.ceil((f.deadUntil - t) / 1000) : "";
    n.querySelector(".f-rs").textContent = rs ? `复活 ${rs}` : "";
    const pb = n.querySelector(".f-push");
    if (f.pushes) { pb.hidden = false; pb.textContent = `💪${big(f.pushes)}`; }
    if (cell) {
      cell.querySelector(".sc-lv").textContent = lv;
      cell.querySelector(".sc-kda").textContent = `${big(c.k)}/${big(c.d)}/${big(c.a)}`;
      cell.querySelector(".sc-rs").textContent = rs;
      cell.classList.toggle("dead", !!rs);
    }
  }

  function pop(n, text, cls) {
    const s = document.createElement("span");
    s.className = "f-pop " + cls;
    s.textContent = text;
    n.appendChild(s);
    setTimeout(() => s.remove(), 1500);
  }
  const replay = (n, cls, ms) => { n.classList.remove(cls); void n.offsetWidth; n.classList.add(cls); clearTimeout(n["_" + cls]); n["_" + cls] = setTimeout(() => n.classList.remove(cls), ms); };

  // uccisione: carica (rinculo), scatto, fendente arancione, bersaglio sbalzato indietro
  function attack(root, an, tn, f, tgt) {
    if (!an || !tn) return;
    const t = Date.now();
    const side = f.x < tgt.x ? -1 : 1;
    an.classList.toggle("flip", side > 0);
    replay(an, "windup", 260);
    f.lock = t + 2400; f.busy = t + 2600; tgt.busy = Math.max(tgt.busy, t + 3400);
    setTimeout(() => {
      const ms = walk(an, f, clamp(tgt.x + side * 7, FIELD.x0, FIELD.x1), clamp(tgt.y + 0.3, FIELD.y0, FIELD.y1), 34, true);
      an.classList.add("dashing");
      setTimeout(() => {
        an.classList.remove("dashing");
        replay(an, "striking", 420);
        const fx = document.createElement("span");
        fx.className = "slash" + (side > 0 ? " rev" : "");
        tn.appendChild(fx);
        setTimeout(() => fx.remove(), 520);
        const crit = Math.random() < 0.35;
        tgt.hp = Math.max(6, tgt.hp - (crit ? 38 : 24));
        pop(tn, crit ? `暴击 ${260 + ((f.x * 9) | 0)}!` : `-${150 + ((f.x * 7) | 0)}`, crit ? "critpop" : "hitpop");
        replay(tn, "knockdown", 2400); // atterrato: cade, resta giù un attimo, si rialza
        replay(root, "quake", 300);
        // sbalzato indietro
        if (tgt.lock < Date.now()) setTimeout(() => walk(tn, tgt, clamp(tgt.x - side * 3, FIELD.x0, FIELD.x1), tgt.y, 40, true), 80);
      }, ms);
    }, 260);
  }

  // assist: colpo leggero (fendente azzurro, niente carica): il bersaglio finisce solo in ginocchio e si rialza
  function assist(field, an, tn, f, tgt) {
    if (!an || !tn || f.lock > Date.now()) return;
    const t = Date.now();
    const side = f.x < tgt.x ? -1 : 1;
    an.classList.toggle("flip", side > 0);
    f.lock = t + 1800; f.busy = t + 2000; tgt.busy = Math.max(tgt.busy, t + 1600);
    const ms = walk(an, f, clamp(tgt.x + side * 7, FIELD.x0, FIELD.x1), clamp(tgt.y + 0.3, FIELD.y0, FIELD.y1), 22, true);
    setTimeout(() => {
      replay(an, "jab", 320);
      const fx = document.createElement("span");
      fx.className = "slash light" + (side > 0 ? " rev" : "");
      tn.appendChild(fx);
      setTimeout(() => fx.remove(), 420);
      tgt.hp = Math.max(6, tgt.hp - 12);
      pop(an, "+助攻", "assist");
      pop(tn, `-${60 + ((f.x * 3) | 0)}`, "jabpop");
      if (!tn.classList.contains("knockdown")) replay(tn, "kneel", 1300);
    }, ms);
  }

  // morte in più fasi: barcolla, in ginocchio, crolla, rimbalza, giace, l'anima sale; poi raggio di luce e rinascita
  const DEAD_MS = 5000;
  function die(n, f, t) {
    f.hp = 0;
    f.deadUntil = t + DEAD_MS;
    f.busy = t + DEAD_MS + 600; f.lock = f.busy;
    n.classList.remove("respawn");
    n.classList.add("dead");
    setTimeout(() => {
      n.classList.remove("dead");
      f.hp = 100;
      replay(n, "respawn", 1100);
    }, DEAD_MS);
  }

  // 3 secondi per minuto, uno per ogni terzo del minuto, pseudo-casuali dal numero del minuto
  function bonkSeconds(m) {
    const r = (s) => { const x = Math.sin(m * 12.9898 + s * 78.233) * 43758.5453; return x - Math.floor(x); };
    return [1 + Math.floor(r(1) * 16), 21 + Math.floor(r(2) * 16), 41 + Math.floor(r(3) * 16)];
  }

  // 大P神 vola giù, alza il martello e lo cala in testa a 大金神 (che si schiaccia), poi torna in cielo
  function slap(root, jn, jin, n) {
    const g = root.querySelector(".goku");
    const bub = root.querySelector(".goku-bubble");
    if (!g || !jn || jn.classList.contains("dead") || g.classList.contains("diving")) return;
    jin.busy = Date.now() + 3200; // 大金神 si ferma a prendersi la martellata
    bub.textContent = BONK[n % BONK.length];
    const a = root.getBoundingClientRect(), b = jn.getBoundingClientRect(), gb = g.getBoundingClientRect();
    const sc = window.innerWidth < 700 ? 0.8 : 0.7;
    const dx = b.left + b.width / 2 - (gb.left + gb.width / 2) - gb.width * sc * 0.5; // si mette a sinistra: il martello cala da destra
    const dy = b.top + b.height * 0.2 - (gb.top + gb.height * 0.62);
    g.classList.add("talk", "diving");
    g.style.transform = `translate(${dx}px, ${Math.min(dy, a.height)}px) scale(${sc})`;
    setTimeout(() => g.classList.add("raise"), 650);
    setTimeout(() => {
      g.classList.remove("raise");
      g.classList.add("swing");
      replay(jn, "bonked", 900);
      jin.hp = Math.max(6, jin.hp - 12);
      pop(jn, "咚!", "slappop");
      const fx = document.createElement("span");
      fx.className = "bonk-fx";
      fx.innerHTML = "<i>💥</i><b>⭐</b><b>⭐</b><b>⭐</b>";
      jn.appendChild(fx);
      replay(root, "quake", 300);
      setTimeout(() => { g.classList.remove("swing"); fx.remove(); }, 1000);
    }, 1050);
    setTimeout(() => { g.style.transform = ""; }, 2000);
    setTimeout(() => g.classList.remove("talk", "diving"), 3000);
  }

  window.TribunaleArena = { mount, loader, progress };
})();
