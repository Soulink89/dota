// Statistiche della settimana + motore delle battute (testi in cinese semplificato).
(function () {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ""));
  const isWin = (m) => (m.player_slot < 128) === m.radiant_win;
  const kdaOf = (m) => (m.kills + m.assists) / Math.max(1, m.deaths);
  const mins = (s) => Math.round(s / 60);

  // Medaglie e MMR approssimativo (ogni medaglia = 5 stelle da ~154 MMR)
  const MEDALS = ["", "先锋", "卫士", "中军", "统帅", "传奇", "万古流芳", "超凡入圣", "冠绝一世"];
  const medalName = (t) => (t ? (t >= 80 ? "冠绝一世" : `${MEDALS[Math.floor(t / 10)]} ${t % 10}`) : "未定级");
  const approxMmr = (t) => (t ? Math.round(((Math.floor(t / 10) - 1) * 770 + Math.max(0, (t % 10) - 1) * 154) / 100) * 100 : null);

  // Livelli di 修仙 in base alle ore giocate di notte
  const XIUXIAN = [[0, "炼气"], [2, "筑基"], [5, "金丹"], [8, "元婴"], [12, "化神"], [16, "渡劫"], [20, "飞升"]];
  function xiuxian(hours) {
    let i = 0;
    while (i + 1 < XIUXIAN.length && hours >= XIUXIAN[i + 1][0]) i++;
    const next = XIUXIAN[i + 1];
    return { level: XIUXIAN[i][1], next: next?.[1] ?? null, hours,
      pct: next ? ((hours - XIUXIAN[i][0]) / (next[0] - XIUXIAN[i][0])) * 100 : 100, toNext: next ? next[0] - hours : 0 };
  }
  const CURVE_LABELS = ["第1局 · 清醒", "第2局 · 微醺", "第3局 · 上头", "第4局+ · 断片"];

  // OpenDota quasi mai ha la corsia per le partite non analizzate: usiamo gli eroi tipici da mid.
  const MID_HEROES = new Set([10, 11, 13, 17, 21, 22, 25, 34, 36, 39, 43, 45, 46, 47, 49, 52, 59, 74, 76, 106, 113, 120, 126]);
  const isMid = (m) => (m.lane_role ? m.lane_role === 2 : MID_HEROES.has(m.hero_id));

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

    // serie attuale (dalla partita più recente)
    let streak = 0;
    for (const m of ms) { if (m.win === ms[0].win) streak++; else break; }
    // serie di sconfitte più lunga
    let worstRun = 0, run = 0;
    for (const m of [...ms].reverse()) { run = m.win ? 0 : run + 1; worstRun = Math.max(worstRun, run); }

    const maxBy = (f) => ms.reduce((b, m) => (b == null || f(m) > f(b) ? m : b), null);
    const minBy = (f) => ms.reduce((b, m) => (b == null || f(m) < f(b) ? m : b), null);
    const group = (list) => {
      const k = list.reduce((t, m) => t + m.kills, 0), d = list.reduce((t, m) => t + m.deaths, 0), a = list.reduce((t, m) => t + m.assists, 0);
      const w = list.filter((m) => m.win).length;
      return { n: list.length, wins: w, losses: list.length - w, wr: list.length ? (w / list.length) * 100 : 0,
        kda: (k + a) / Math.max(1, d), avgDeaths: list.length ? d / list.length : 0 };
    };
    const winsList = ms.filter((m) => m.win), lossList = ms.filter((m) => !m.win);

    // core/supporto stimato dai last hit al minuto
    const lhpm = (m) => (m.last_hits ?? 0) / Math.max(1, m.duration / 60);
    const coreList = ms.filter((m) => lhpm(m) >= 3.5), supList = ms.filter((m) => lhpm(m) < 3.5);
    const lh10 = coreList.length ? (coreList.reduce((t, m) => t + lhpm(m), 0) / coreList.length) * 10 : 0;

    // serate: partite a meno di 90 minuti dalla fine della precedente
    const sessions = [];
    for (const m of [...ms].reverse()) {
      const cur = sessions[sessions.length - 1], prev = cur?.[cur.length - 1];
      if (prev && m.start_time - (prev.start_time + prev.duration) < 90 * 60) cur.push(m); else sessions.push([m]);
    }
    const byIdx = [[], [], [], []];
    for (const sess of sessions) sess.forEach((m, i) => byIdx[Math.min(i, 3)].push(m));

    // partite "da 修仙": iniziate tra le 23 e le 6 (ora locale)
    const late = ms.filter((m) => { const h = new Date(m.start_time * 1000).getHours(); return h >= 23 || h < 6; });
    const ranked = ms.filter((m) => m.lobby_type === 7);
    const party = ms.filter((m) => m.party_size > 1), solo = ms.filter((m) => m.party_size === 1);

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
      mid: group(ms.filter(isMid)),
      inWins: group(winsList),
      inLosses: group(lossList),
      worstWin: winsList.reduce((b, m) => (b == null || m.kda < b.kda ? m : b), null),
      distinctHeroes: heroes.length,
      core: coreList.length, sup: supList.length, lh10,
      lhTotal: sum((m) => m.last_hits),
      sessions: sessions.length,
      curve: byIdx.map(group),
      lateN: late.length, lateHours: late.reduce((t, m) => t + m.duration, 0) / 3600,
      mmrDelta: (ranked.filter((m) => m.win).length * 2 - ranked.length) * 25,
      party: group(party), solo: group(solo),
    };
  }

  // ---------- Pagella: voto d'esame cinese su 100 (60 = sufficienza) ----------
  // Ogni giocatore può avere il suo "indice" al posto del voto (persona.meter in config.js)
  function verdict(s, ctx = {}) {
    const meter = ctx.persona?.meter;
    const clamp = (x) => Math.max(1, Math.min(99, Math.round(x)));
    if (meter === "brag") {
      const rank = medalName(ctx.rankTier);
      if (!s.n) return { title: "本周吹牛指数", voto: 99, label: "∞", cls: "g-mid", text: "一把没打，吹得比打得还多。" };
      if (s.wr >= 50) return { title: "本周吹牛指数", voto: 99, cls: "g-mid",
        label: String(clamp(55 + s.wr * 0.4 + s.streak * 2 + s.n * 0.3)),
        text: pick([`赢了${s.wins}把，群里预计要吹${s.wins * 3}遍。建议提前屏蔽。`, "本周吹牛素材充足，库存够用到下个月。", `“我早说了我是超凡实力”——某${rank}玩家`]) };
      return { title: "本周甩锅指数", voto: 0, cls: "g-bad", label: String(clamp(50 + s.losses * 4)),
        text: pick([`输了${s.losses}把，${s.losses}口锅已全部分发给队友。`, "系统局、被针对、队友菜——甩锅三件套已备齐。"]) };
    }
    if (meter === "drunk") {
      if (!s.n) return { title: "本周上头指数", voto: 0, label: "0", cls: "g-bad", text: "本周没上线，可能还在醒酒。" };
      const late = groupWr(s.curve.slice(3)), sober = s.curve[0].wr;
      return { title: "本周上头指数", voto: 0, cls: "g-bad",
        label: String(clamp(30 + s.lateN * 3 + s.sessions * 4 + Math.max(0, sober - late) / 3)),
        text: pick([
          s.curve[3].n ? `每晚第4局以后胜率${Math.round(late)}%。建议酒驾入刑。` : "一晚一瓶威士忌，喝到第3局就开始送。",
          `修仙修到【${xiuxian(s.lateHours).level}】，离升天只差一瓶。`,
          "清醒时理论超凡，喝完后实战先锋。",
        ]) };
    }
    if (!s.n) return { voto: null, label: "缺考", text: "本周缺考。要么出门摸草了，要么换小号了。" };
    let v = 60 + (s.wr - 50) * 1.1 + (s.avgKda - 2.6) * 7 - Math.max(0, s.avgDeaths - 8) * 2.5;
    v = Math.max(0, Math.min(100, Math.round(v)));
    const lines =
      v === 59 ? ["59分。差一分及格，这一分就是你送的那个人头。"]
      : v < 40 ? ["严重不及格。请家长来学校一趟。", "建议卸载重装——不是游戏，是你自己。", "这成绩，对面都不好意思举报你。"]
      : v < 60 ? ["不及格。态度端正，技术感人。", "补考吧，重点复习《如何不死》。", "有潜力，只是藏得比较深。"]
      : v < 75 ? ["及格。刚好够用，跟他的插眼一样。", "60分万岁，多一分浪费。", "勉强及格，老师批卷时心情不错。"]
      : v < 90 ? ["良好。开始像个真正的玩家了。", "优秀苗子，怀疑有人代打。", "成绩不错，账号是不是借的？"]
      : ["满分作文。已启动炸鱼调查。", "建议回到你自己的分段，大佬。", "这表现在14个国家属于违法行为。"];
    return { voto: v, label: String(v), text: pick(lines) };
  }

  // ---------- Battute specifiche per eroe ----------
  const HERO_JOKES = {
    14: ["又是帕吉。钩子命中率比他吃饭的次数还低。", "新鲜的肉？不，是2013年的冻肉。"],
    74: ["祈求者：十个技能，只会用两个。性价比之王。"],
    105: ["工程师。本庭拒绝评论，直接判刑。"],
    8: ["主宰：转起来就能赢？更多时候是转起来就送。"],
    44: ["幻影刺客：全靠暴击，跟他的人生一样靠运气。"],
    2: ["斧王：跳进去吼一声，然后直接回泉水——对面的泉水。"],
    35: ["狙击手：站得那么远，就是为了听不见队友骂人。"],
    106: ["灰烬之灵：三个残焰，零个想法。"],
    129: ["玛尔斯：竞技场主要用来关自己的队友。"],
    86: ["拉比克：技能偷得到，胜利偷不到。"],
    26: ["莱恩：死亡一指？更像是一指禅送人头。"],
    1: ["敌法师：发育40分钟，第41分钟出来参团，基地已经炸了。"],
    11: ["影魔：三个影压全空，空得整整齐齐。"],
    19: ["小小：把队友扔进对面泉水，这也算助攻吧。"],
    41: ["虚空假面：大招罩住了自己的四个队友。经典。"],
    67: ["幽鬼：“放心，五十分钟后我就起飞了。”基地：我等不了。"],
    114: ["齐天大圣：变成一棵树，全场最有用的时刻。"],
    93: ["斯拉克：偷对面的属性，因为自己的没法看。"],
    25: ["莉娜：神灭斩一发入魂——可惜是对面先手的那一发。"],
    21: ["风行者：强力击打空三次，风之巨人方向全错。"],
    17: ["风暴之灵：球状闪电飞进对面五个人中间，蓝都没了。"],
    39: ["痛苦女王：闪烁进场，闪烁出场，中间顺便死了。"],
    22: ["宙斯：大招放得勤，补刀没几根。"],
  };

  const groupWr = (gs) => { const n = gs.reduce((t, g) => t + g.n, 0); return n ? (gs.reduce((t, g) => t + g.wins, 0) / n) * 100 : 0; };
  const groupN = (gs) => gs.reduce((t, g) => t + g.n, 0);

  // ---------- Regole delle battute ----------
  function buildRoasts(s, name, heroes, ctx = {}) {
    const H = (id) => heroes[id]?.localized_name || "神秘英雄";
    const fav = s.heroes[0];
    const persona = ctx.persona || {};
    const traits = new Set(persona.traits || []);
    const v = {
      rank: medalName(ctx.rankTier), mmr: approxMmr(ctx.rankTier) ?? "?",
      claimed: persona.claimedRank || "超凡入圣", rival: persona.rival || "队友",
      midN: s.mid.n, midWr: Math.round(s.mid.wr), midD: s.mid.avgDeaths.toFixed(1), midL: s.mid.losses,
      lossD: s.inLosses.avgDeaths.toFixed(1), winKda: s.inWins.kda.toFixed(1),
      worstWinKda: s.worstWin ? `${s.worstWin.kills}/${s.worstWin.deaths}/${s.worstWin.assists}` : "",
      worstWinHero: s.worstWin ? H(s.worstWin.hero_id) : "",
      distinct: s.distinctHeroes, core: s.core, sup: s.sup, lh10: Math.round(s.lh10), avgLh: Math.round(s.avgLh), lhTotal: s.lhTotal,
      wr1: Math.round(s.curve[0].wr), wr3: Math.round(groupWr(s.curve.slice(2))), bottles: s.sessions,
      mmrD: (s.mmrDelta > 0 ? "+" : "") + s.mmrDelta, late: s.lateN, xlevel: xiuxian(s.lateHours).level,
      partyN: s.party.n, partyWr: Math.round(s.party.wr), soloN: s.solo.n,
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
      nightTime: s.lateNight[0] ? new Date(s.lateNight[0].start_time * 1000).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "",
    };

    const rules = [
      { id: "absent", when: () => s.n === 0, weight: 100, icon: "🌱", title: "在逃人员",
        texts: ["{name} 已经7天没打刀了。可能性：出门摸草了、谈恋爱了，或者哭着卸载了。"],
        meme: ["七天零场", "戒断反应即将到来"] },
      { id: "nolife", when: () => s.n >= 20, weight: 70, icon: "🛌", title: "从不摸草",
        texts: ["一周{n}场，{hours}小时。这是一份兼职，只是没有工资。", "7天打了{hours}小时刀塔。这些时间够学一门外语了，结果他学会了用各国语言送人头。"],
        meme: ["一周{n}场", "太阳是什么？没听说过"] },
      { id: "grind", when: () => s.n >= 8 && s.n < 20, weight: 30, icon: "⏳", title: "中度成瘾",
        texts: ["本周{n}场，{hours}小时。刚好够让他没有社交生活。"],
        meme: ["就打最后一把", "——{name}，{n}把之前"] },
      { id: "feeder", when: () => s.mostDeaths?.deaths >= 12, weight: 90, icon: "💀", title: "泉水VIP会员",
        texts: ["用{mdHero}一局死了{md}次。对面的信使都已经认识他了。", "{mdHero}死了{md}次。这不是打比赛，这是给对面捐钱。"],
        meme: ["{mdHero} 死了{md}次", "我不是送，我是在做慈善"], hero: () => s.mostDeaths.hero_id },
      { id: "deaths", when: () => s.avgDeaths >= 8, weight: 60, icon: "⚰️", title: "死亡统计",
        texts: ["本周一共死了{deaths}次。买活键上已经磨出他的指纹了。"],
        meme: ["一周死了{deaths}次", "复活倒计时是我家"] },
      { id: "losestreak", when: () => s.worstRun >= 4, weight: 85, icon: "📉", title: "股市崩盘",
        texts: ["{worst}连败。A股看了都直呼内行。", "连输{worst}把。到了某个时候，得问问问题是不是真的出在队友身上。"],
        meme: ["{worst}连败", "都是匹配机制的错"] },
      { id: "hotstreak", when: () => s.streakWin && s.streak >= 4, weight: 75, icon: "🔥", title: "火力全开（可疑）",
        texts: ["目前{streak}连胜中。请查一下他是不是买号了，或者是他表哥在打。"],
        meme: ["{streak}连胜", "这绝对是实力不是运气"] },
      { id: "lowwr", when: () => s.n >= 4 && s.wr < 40, weight: 80, icon: "🧊", title: "胜率冰点",
        texts: ["本周胜率{wr}%。抛硬币都比他强，而且硬币不喷人。", "{w}胜{l}负。匹配系统不是针对他，只是比较客观。"],
        meme: ["胜率 {wr}%", "我说这是定级赛"] },
      { id: "highwr", when: () => s.n >= 4 && s.wr >= 65, weight: 70, icon: "🏆", title: "胜率可疑",
        texts: ["本周胜率{wr}%。建议对他的QWER键进行兴奋剂检测。"],
        meme: ["胜率 {wr}%", "别急，马上就要上分了"] },
      { id: "onetrick", when: () => fav && s.n >= 4 && fav.games / s.n >= 0.5, weight: 65, icon: "🔁", title: "专一的男人",
        texts: ["{n}场里有{favGames}场玩{favHero}。一百多个英雄，他选择了专一。", "英雄池：{favHero}，还有……{favHero}。"],
        meme: ["{favHero}", "{favHero} {favHero} {favHero}"], hero: () => fav.hero_id },
      { id: "longgame", when: () => s.longest && s.longest.duration >= 3600, weight: 45, icon: "🕰️", title: "无尽之战",
        texts: ["用{longHero}打了一局{long}分钟。比电视剧还长，剧情还更少。"],
        meme: ["一局{long}分钟", "超级兵都是我养大的"], hero: () => s.longest.hero_id },
      { id: "quickloss", when: () => v.sl && v.sl <= 25, weight: 55, icon: "🏳️", title: "光速GG",
        texts: ["{sl}分钟就输了。看了一眼阵容，决定少受点罪。", "{sl}分钟结束战斗：泡面都还没泡好。"],
        meme: ["{sl}分钟GG", "至少能早点吃饭"], hero: () => s.shortestLoss.hero_id },
      { id: "night", when: () => s.lateNight.length >= 1, weight: 50, icon: "🌙", title: "夜班选手",
        texts: ["凌晨{nightTime}开了一局。睡觉是给那些没有分可掉的人准备的。", "凌晨1点到6点之间打了{night}局。第二天上班：跟对线一样没用。"],
        meme: ["凌晨 {nightTime}", "再来一把就睡"] },
      { id: "turbo", when: () => s.turbo >= 3, weight: 40, icon: "⚡", title: "加速模式成瘾",
        texts: ["打了{turbo}局加速模式。因为慢慢输太老派了。"],
        meme: ["{turbo}局加速模式", "天梯？不敢不敢"] },
      { id: "poor", when: () => s.lowestGpm && s.lowestGpm.gold_per_min < 300 && s.n > 0, weight: 40, icon: "🪙", title: "贫困线以下",
        texts: ["用{lowGpmHero}打出了{lowGpm} GPM。物品栏里只有树枝和希望。"],
        meme: ["{lowGpm} GPM", "刀塔低保户"], hero: () => s.lowestGpm.hero_id },
      { id: "pacifist", when: () => s.zeroKill >= 2, weight: 45, icon: "🕊️", title: "和平主义者",
        texts: ["有{zk}局零击杀。佛祖会点赞，队友不会。"],
        meme: ["零击杀", "我本质上是个辅助"] },
      { id: "goodkda", when: () => s.n >= 3 && s.avgKda >= 4, weight: 35, icon: "🎯", title: "简历级KDA",
        texts: ["平均KDA {kda}。他会把这个写进简历的“个人技能”一栏。"],
        meme: ["KDA {kda}", "但我还是输了"] },
      { id: "best", when: () => s.bestGame && s.bestGame.kda >= 5, weight: 20, icon: "⭐", title: "高光时刻",
        texts: ["本周最佳：{bkHero} {bk}。裱起来吧，下次不一定有了。"],
        meme: ["{bkHero} {bk}", "没截图等于没发生"], hero: () => s.bestGame.hero_id },
      { id: "mid", when: () => s.n >= 3 && s.wr >= 42 && s.wr <= 58, weight: 5, icon: "📊", title: "平平无奇",
        texts: ["{n}场，胜率{wr}%，KDA {kda}。数据平均到国家统计局拿他当样本。"],
        meme: ["胜率 {wr}%", "稳定的平庸"] },
    ];

    // ---------- Battute su misura (attivate dai "traits" in config.js) ----------
    const T = (t) => traits.has(t);
    const personaRules = [
      { id: "p-brag", when: () => T("brag") && s.n > 0, weight: 92, icon: "🎺", title: "吹牛专业户",
        texts: ["自称{claimed}实力，系统显示{rank}（约{mmr}分）。中间差的那一截，大概是被系统偷走了。", "嘴上{claimed}，账号{rank}。这个落差，比他的中路塔掉得还快。"],
        meme: ["自称：{claimed}", "实际：{rank}"] },
      { id: "p-mid-bad", when: () => T("midKing") && s.mid.n >= 2 && s.mid.wr < 60, weight: 90, icon: "👑", title: "“无敌中单”",
        texts: ["自称无敌中单。本周玩中路英雄{midN}场，胜率{midWr}%，场均死{midD}次。无敌的应该是对面中单吧。"],
        meme: ["我是无敌中单", "中路胜率 {midWr}%"] },
      { id: "p-mid-good", when: () => T("midKing") && s.mid.n >= 2 && s.mid.wr >= 60, weight: 70, icon: "👑", title: "“无敌中单”（又来了）",
        texts: ["中路胜率{midWr}%，于是这周他在群里把“无敌中单”说了{midN}遍。群友的耳朵比他对面的中单还受罪。", "中路赢了几把，现在已经开始自称“中路之神”了。下周输回来记得别甩锅。"],
        meme: ["中路赢了两把", "开始自称中路之神"] },
      { id: "p-kda-ok", when: () => T("kdaBrag") && s.n >= 3 && s.avgKda >= 3.5, weight: 66, icon: "📈", title: "KDA信徒",
        texts: ["KDA {kda}，又够他吹一个月了。可惜KDA不能换成分，所以他还是{rank}。", "天天把KDA挂嘴边，好像KDA高就能从{rank}直接跳到超凡。"],
        meme: ["我KDA很好的", "所以为什么还是{rank}"] },
      { id: "p-kda-bad", when: () => T("kdaBrag") && s.n >= 3 && s.avgKda < 3.5, weight: 80, icon: "📉", title: "KDA信徒",
        texts: ["天天吹KDA，本周KDA {kda}。建议换个东西吹。"],
        meme: ["我KDA很好的", "KDA：{kda}"] },
      { id: "p-blame", when: () => T("blameTeam") && s.losses > 0, weight: 88, icon: "🫵", title: "甩锅大师",
        texts: ["输了{l}把，按他的说法全是队友的锅。可是输的局里他场均死{lossD}次——队友再能背，也背不动这么多。", "{l}场失败，{l}口锅，全部甩给队友。物流效率比顺丰还高。"],
        meme: ["都是队友的锅", "（输的局我场均死{lossD}次）"] },
      { id: "p-rigged", when: () => T("rigged") && s.n > 0, weight: 84, icon: "🎰", title: "系统局受害者",
        texts: s.wr >= 50
          ? ["坚称Steam给他安排系统局。本周胜率{wr}%——如果这是系统局，系统对他还挺好的。"]
          : ["胜率{wr}%，他说是系统局。系统表示：这锅我不背。"],
        meme: ["这是系统局", "——某{rank}玩家"] },
      { id: "p-mvp", when: () => T("selfMvp") && s.wins > 0 && s.worstWin, weight: 78, icon: "🥇", title: "自封MVP",
        texts: ["赢了{w}把，每把都是他MVP（他自己评的）。其中一把{worstWinHero}打了{worstWinKda}，这也叫MVP？", "赢了是我MVP，输了是队友的锅。这套逻辑，本庭听了都想点赞。"],
        meme: ["赢了：我是MVP", "输了：队友的锅"], hero: () => s.worstWin.hero_id },
      { id: "p-targeted", when: () => T("targeted") && s.mid.losses > 0, weight: 82, icon: "🎯", title: "被针对专家",
        texts: ["中路输了{midL}把，每把都是“被针对了”“对面故意选克制我的”。兄弟，对面根本不知道你是谁。"],
        meme: ["对面故意针对我", "对面：你谁啊？"] },
      { id: "p-lastpick", when: () => T("lastPick"), weight: 64, icon: "⏱️", title: "最后一选",
        texts: ["每局都要最后一个选英雄，生怕被克制。选完照样被打爆，然后说被针对。完美闭环。"],
        meme: ["我要最后一个选", "依然被克制"] },
      { id: "p-trash", when: () => T("trashTalk") && s.mostDeaths, weight: 86, icon: "🗣️", title: "嘴强王者",
        texts: ["天天嘲讽{rival}。但本周他自己最惨的一局死了{md}次，{rival}看了都要笑出声。", "嘲讽{rival}的时候声音最大，送人头的时候也不含糊：单局最多{md}死。"],
        meme: ["嘲讽{rival}的男人", "一局死了{md}次"], hero: () => s.mostDeaths.hero_id },
      { id: "p-allround", when: () => T("allRounder") && s.distinctHeroes >= 5, weight: 80, icon: "🎲", title: "全能选手",
        texts: s.wr < 50
          ? ["本周{n}场用了{distinct}个英雄，一号位到五号位全试了一遍。什么位置都会打，什么位置都会输。"]
          : ["{n}场{distinct}个英雄，核心{core}场、辅助{sup}场。什么位置都会打，什么位置都打得一般。"],
        meme: s.wr < 50 ? ["什么位置都会打", "什么位置都会输"] : ["{distinct}个英雄", "没有一个精通"] },
      { id: "p-lasthit", when: () => T("cantLastHit") && s.n > 0, weight: 76, icon: "🗡️", title: "补刀残疾人士",
        texts: s.core && s.lh10 >= 50
          ? ["天天说自己不会补刀，好让队友把兵线让给他。理论大师的又一套理论。", "嘴上“我不会补刀”，手上抢兵比谁都快。补刀不会，演技满分。"]
          : s.core
          ? ["自称不会补刀——这是本庭收到的唯一一句真话：打核心时平均每10分钟补刀{lh10}个。", "说自己不会补刀，本周核心局每10分钟{lh10}刀。兵线：谢谢你放过我们。"]
          : ["自称不会补刀，所以本周干脆全打辅助，平均补刀{avgLh}。聪明的规避。"],
        meme: ["我不会补刀", "终于说了句实话"] },
      { id: "p-theory", when: () => T("theorist") && s.n > 0, weight: 87, icon: "🎙️", title: "DC首席理论家",
        texts: ["DC里理论一套一套的，本周实战KDA {kda}、胜率{wr}%。理论超凡入圣，实战{rank}。", "在DC指导了全队一晚上，结论：大家都有问题，除了他。", "话多到语音频道需要扩容。本周他说的话比他补的刀还多（补刀一共才{lhTotal}个）。", "评判别人头头是道，轮到自己：{l}场失败，没有一场是他的问题（他说的）。"],
        meme: ["理论：超凡入圣", "实战：{rank}"] },
      { id: "p-drunk", when: () => T("drunk") && s.curve[0].n > 0 && groupN(s.curve.slice(2)) > 0, weight: 93, icon: "🥃", title: "醉拳传人",
        texts: s.curve[0].wr > groupWr(s.curve.slice(2))
          ? ["每晚第1局（清醒）胜率{wr1}%，第3局以后（上头）胜率{wr3}%。威士忌才是他最大的对手。"]
          : ["离谱：喝得越多赢得越多。第1局胜率{wr1}%，第3局以后{wr3}%。建议直接喝完一瓶再排。"],
        meme: ["一晚一瓶威士忌", "醉拳打法，第3局胜率{wr3}%"] },
      { id: "p-whisky", when: () => T("drunk") && s.sessions > 0, weight: 60, icon: "🍾", title: "酒精账单",
        texts: ["本周开了{bottles}个晚上，按一晚一瓶算，估计喝掉{bottles}瓶威士忌。醉驾英雄，扣的是天梯分。"],
        meme: ["本周{bottles}瓶威士忌", "肝：救命"] },
      { id: "p-smoke", when: () => T("smoker") && s.n > 0, weight: 62, icon: "🚬", title: "一局一根",
        texts: ["每局结束都要来一根，本周{n}局={n}根烟。肺比他的高地还脆。", "{n}局游戏，{n}根烟。游戏时长{hours}小时，抽烟时长另算。"],
        meme: ["每局一根烟", "本周已抽{n}根"] },
      { id: "p-mmr", when: () => T("mmrAnxiety") && s.n > 0, weight: 85, icon: "📊", title: "天梯分焦虑症",
        texts: s.mmrDelta < 0
          ? ["比谁都在乎天梯分，本周估算{mmrD}分。在乎也没用啊兄弟。"]
          : ["本周估算{mmrD}分，今晚可以多喝一杯了。下周记得还回去。"],
        meme: ["我很在乎天梯分", "本周：{mmrD}"] },
      { id: "p-party", when: () => T("partyFear") && s.party.n > 0, weight: 74, icon: "🙈", title: "开黑恐惧症",
        texts: ["说怕跟主团开黑掉分。本周组排{partyN}场，胜率{partyWr}%——看来掉分跟主团没关系。"],
        meme: ["跟主团开黑？", "不了，怕掉分"] },
      { id: "p-ancient", when: () => T("ancientOneDay"), weight: 89, icon: "🎟️", title: "万古一日游",
        texts: (ctx.rankTier || 0) >= 61
          ? ["又上万古了！本庭郑重提醒：这次请坚持超过24小时。"]
          : ["上了万古1，待了一天，又掉回{rank}。万古一日游，门票都没回本。", "万古的空气只呼吸了一天。现居地：{rank}。"],
        meme: ["万古一日游", "现居：{rank}"] },
      { id: "p-xiuxian", when: () => T("xiuxian") && s.lateN > 0, weight: 83, icon: "🧘", title: "修仙中",
        texts: ["本周深夜修仙{late}局，修为已达【{xlevel}】。照这个速度，很快就升天了。", "凌晨的刀塔最养人：修仙{late}局，境界【{xlevel}】。再修下去就不是飞升，是升天了。"],
        meme: ["修仙中，勿扰", "当前境界：{xlevel}"] },
    ];
    rules.push(...personaRules);

    const out = rules
      .filter((r) => { try { return r.when(); } catch { return false; } })
      .map((r) => ({
        id: r.id, icon: r.icon, title: r.title, weight: r.weight + Math.random() * 10,
        text: fill(pick(r.texts), v),
        meme: { top: fill(r.meme[0], v), bottom: fill(r.meme[1], v) },
        heroId: r.hero ? r.hero() : null,
      }));

    if (fav && HERO_JOKES[fav.hero_id]) {
      out.push({ id: "hero", icon: "🦸", title: `${H(fav.hero_id)}专案`, weight: 58 + Math.random() * 10,
        text: pick(HERO_JOKES[fav.hero_id]), meme: { top: H(fav.hero_id), bottom: "又是他。还是他。永远是他。" }, heroId: fav.hero_id });
    }
    return out.sort((a, b) => b.weight - a.weight);
  }

  // ---------- 语录: le sue frasi tipiche + la risposta del tribunale ----------
  // I dati vengono scelti apposta per smontarlo (partita peggiore, più morti, ecc.).
  function quotes(s, ctx = {}, heroes = {}) {
    const persona = ctx.persona || {};
    const t = new Set(persona.traits || []);
    if (!s.n) return [];
    const H = (id) => heroes[id]?.localized_name || "某英雄";
    const kd = (m) => `${m.kills}/${m.deaths}/${m.assists}`;
    const rank = medalName(ctx.rankTier), mmr = approxMmr(ctx.rankTier) ?? "?";
    const claimed = persona.claimedRank || "超凡入圣", rival = persona.rival || "队友";
    const worst = (list, f) => list.reduce((b, m) => (b == null || f(m) > f(b) ? m : b), null);
    const worstMid = worst(s.matches.filter(isMid), (m) => m.deaths - m.kills);
    const worstKda = worst(s.matches, (m) => -m.kda);
    const q = [];

    if (t.has("brag")) q.push({ quote: `我是${claimed}实力`, stamp: "做梦",
      reply: `系统显示：${rank}（约${mmr}分）。${claimed}只存在于他的嘴里和梦里。` });
    if (t.has("midKing") && worstMid) q.push({ quote: "我是无敌中单，打爆一切", stamp: "吹牛", heroId: worstMid.hero_id,
      reply: `本周中路${H(worstMid.hero_id)}打出 ${kd(worstMid)}。被打爆的“一切”里，也包括他自己。` });
    if (t.has("kdaBrag") && worstKda) q.push({ quote: "我KDA很好的", stamp: "失忆", heroId: worstKda.hero_id,
      reply: `请看${H(worstKda.hero_id)}这把：${kd(worstKda)}。这一把的KDA，他选择性失忆了。` });
    if (t.has("blameTeam") && s.losses) q.push({ quote: "输了都是队友的锅", stamp: "甩锅",
      reply: `${s.losses}场失败，他自己场均死${s.inLosses.avgDeaths.toFixed(1)}次。队友：这锅太沉，背不动。` });
    if (t.has("rigged")) q.push({ quote: "Steam给我匹配系统局", stamp: "碰瓷",
      reply: s.wr >= 50 ? `胜率${Math.round(s.wr)}%的系统局？系统：我对你还不够好吗？` : `胜率${Math.round(s.wr)}%。系统：别碰瓷，我也很无辜。` });
    if (t.has("selfMvp") && s.worstWin) q.push({ quote: "赢了都是我MVP", stamp: "自封", heroId: s.worstWin.hero_id,
      reply: `${H(s.worstWin.hero_id)} ${kd(s.worstWin)} 也叫MVP？那是队友把他抬过了终点线。` });
    if (t.has("targeted")) q.push({ quote: "对面故意选英雄针对我", stamp: "想多了",
      reply: "对面五个人连他的ID都没点开过。被针对？对面只是正常选了个英雄。" });
    if (t.has("lastPick")) q.push({ quote: "我最后选，免得被克制", stamp: "怂",
      reply: "每局最后一个选，选完照样被克制。克制他的不是英雄，是他自己。" });
    if (t.has("trashTalk") && s.mostDeaths) q.push({ quote: `${rival}太菜了`, stamp: "双标", heroId: s.mostDeaths.hero_id,
      reply: `说这话的人，本周用${H(s.mostDeaths.hero_id)}一局死了${s.mostDeaths.deaths}次。${rival}：谢谢，有被安慰到。` });
    return q;
  }

  // ---------- 专项调查: pannelli speciali, solo dati che lo mettono in ridicolo ----------
  function specials(s, ctx = {}) {
    const traits = new Set(ctx.persona?.traits || []);
    if (!s.n) return null;
    const cards = [];
    if (traits.has("drunk")) cards.push({ icon: "🥃", label: "威士忌（估算）", value: `${s.sessions} 瓶`, sub: `本周喝了${s.sessions}个晚上 · 一晚一瓶` });
    if (traits.has("smoker")) cards.push({ icon: "🚬", label: "香烟（估算）", value: `${s.n} 根`, sub: "一局一根，从不落下" });
    if (traits.has("mmrAnxiety") && s.mmrDelta < 0) cards.push({ icon: "📉", label: "天梯分（估算）", value: String(s.mmrDelta), sub: "最在乎分的人，掉得最多", cls: "neg" });
    if (traits.has("partyFear") && s.party.n && s.party.wr < 55) cards.push({ icon: "🙈", label: "怕跟主团开黑", value: `${Math.round(s.party.wr)}%`, sub: `结果组排${s.party.n}场，胜率就这样`, cls: "neg" });
    if (traits.has("theorist")) cards.push({ icon: "🎙️", label: "DC发言 vs 补刀", value: "∞ : " + s.lhTotal, sub: "说的话永远比补的刀多" });
    if (traits.has("cantLastHit") && s.core && s.lh10 < 50) cards.push({ icon: "🗡️", label: "核心局补刀", value: `${Math.round(s.lh10)}/10分钟`, sub: "兵线：谢谢不杀之恩", cls: "neg" });
    return {
      cards,
      curve: traits.has("drunk") && s.sessions ? s.curve.map((g, i) => ({ label: CURVE_LABELS[i], n: g.n, wr: g.wr })) : null,
      xiuxian: traits.has("xiuxian") ? { ...xiuxian(s.lateHours), games: s.lateN } : null,
    };
  }

  window.TribunaleRoast = { computeStats, verdict, buildRoasts, quotes, specials, isWin, isMid, medalName, approxMmr };
})();
