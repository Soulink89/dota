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
        text: pickFor(["本周吹牛素材充足，库存够用到下个月。", "吹牛指数爆表，建议群友提前戴好耳机。", `指数已超过他的段位（${rank}），可喜可贺。`], ctx) };
      return { title: "本周甩锅指数", voto: 0, cls: "g-bad", label: String(clamp(50 + s.losses * 4)),
        text: pickFor(["系统局、被针对、队友菜——甩锅三件套已备齐。", "锅已备好，队友请排队领取。"], ctx) };
    }
    if (meter === "drunk") {
      if (!s.n) return { title: "本周上头指数", voto: 0, label: "0", cls: "g-bad", text: "本周没上线，可能还在醒酒。" };
      const late = groupWr(s.curve.slice(3)), sober = s.curve[0].wr;
      return { title: "本周上头指数", voto: 0, cls: "g-bad",
        label: String(clamp(30 + s.lateN * 3 + s.sessions * 4 + Math.max(0, sober - late) / 3)),
        text: pickFor(["本庭建议：开黑前先吹一下酒精测试仪。", "喝到第几局，他自己也数不清了。", "键盘上的威士忌，比他的眼位还多。"], ctx) };
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
    return { voto: v, label: String(v), text: pickFor(lines, ctx) };
  }

  // ---------- Battute specifiche per eroe: [testo, meme sopra, meme sotto] ----------
  const HERO_JOKES = {
    14: [["又是帕吉。钩子命中率比他吃饭的次数还低。", "帕吉", "钩子全空"], ["新鲜的肉？不，是2013年的冻肉。", "新鲜的肉", "冷冻十年"]],
    74: [["祈求者：十个技能，只会用两个。性价比之王。", "十个技能", "只会两个"], ["祈求者切球切到手抽筋，伤害全打在空气上。", "切球大师", "空气受到了伤害"]],
    105: [["工程师。本庭拒绝评论，直接判刑。", "工程师", "无需审判"], ["玩工程师的人，本庭建议直接拉黑。", "埋雷", "埋的是队友的心态"]],
    8: [["主宰：转起来就能赢？更多时候是转起来就送。", "剑刃风暴", "转进了对面五个人里"], ["主宰的治疗守卫，放在了对面也能吃到的位置。", "治疗守卫", "对面谢谢你"]],
    44: [["幻影刺客：全靠暴击，跟他的人生一样靠运气。", "全靠暴击", "暴击率：0%"], ["幻影刺客跳进去，暴击没出，人先没了。", "窒息之刃", "窒息的是队友"]],
    2: [["斧王：跳进去吼一声，然后直接回泉水——对面的泉水。", "狂战士之吼", "吼完就死"], ["斧王的淘汰之刃，斩杀线永远差一点。", "淘汰之刃", "差50血"]],
    35: [["狙击手：站得那么远，就是为了听不见队友骂人。", "站得够远", "就听不见骂声"], ["狙击手被对面一个跳刀秒了，暗杀还在读条。", "暗杀读条中", "人已经没了"]],
    106: [["灰烬之灵：三个残焰，零个想法。", "三个残焰", "零个想法"], ["灰烬之灵飞来飞去，蓝飞没了，人也飞没了。", "火之余烬", "余烬也灭了"]],
    129: [["玛尔斯：竞技场主要用来关自己的队友。", "神之谴戒", "关住了队友"], ["玛尔斯的盾挡住了一切，除了对面的魔法伤害。", "铜墙铁壁", "纸糊的"]],
    86: [["拉比克：技能偷得到，胜利偷不到。", "技能偷到了", "胜利没偷到"], ["拉比克偷了个大招，然后不知道怎么用。", "偷到大招", "不会用"]],
    26: [["莱恩：死亡一指？更像是一指禅送人头。", "死亡一指", "指向了自己"], ["莱恩的穿刺永远差一个身位。", "地刺", "差一点点"]],
    1: [["敌法师：发育40分钟，第41分钟出来参团，基地已经炸了。", "发育40分钟", "基地没了"], ["敌法师闪烁进去切后排，切到一半被晕到死。", "闪烁", "闪进了坟墓"]],
    11: [["影魔：三个影压全空，空得整整齐齐。", "三个影压", "全空"], ["影魔的魂收集了二十个，死一次全掉光。", "魂之挽歌", "魂丢光了"]],
    19: [["小小：把队友扔进对面泉水，这也算助攻吧。", "投掷", "投进了对面泉水"], ["小小长大了，脑子没长。", "成长", "只长个子"]],
    41: [["虚空假面：大招罩住了自己的四个队友。经典。", "时间结界", "罩住了队友"], ["虚空假面时间回溯，回溯到了上一次送人头之前。", "时间回溯", "回到送之前"]],
    67: [["幽鬼：“放心，五十分钟后我就起飞了。”基地：我等不了。", "五十分钟起飞", "基地等不了"], ["幽鬼开大全图支援，每个地方都晚到一步。", "全图支援", "全部迟到"]],
    114: [["齐天大圣：变成一棵树，全场最有用的时刻。", "变成一棵树", "全场MVP时刻"], ["齐天大圣大招开了，猴子猴孙全打在空气上。", "大闹天宫", "天宫没事"]],
    93: [["斯拉克：偷对面的属性，因为自己的没法看。", "偷属性", "因为自己的不够"], ["斯拉克跳进去，暗影之舞也救不了他。", "暗影之舞", "舞完就走了"]],
    25: [["莉娜：神灭斩一发入魂——可惜是对面先手的那一发。", "神灭斩", "对面先放的"], ["莉娜光击阵永远落在对面刚离开的地方。", "光击阵", "打中了地板"]],
    21: [["风行者：强力击打空三次，风之巨人方向全错。", "强力击打", "空了三发"], ["风行者的束缚击，把自己绑在了树上。", "束缚击", "绑住了自己"]],
    17: [["风暴之灵：球状闪电飞进对面五个人中间，蓝都没了。", "球状闪电", "飞进了五个人里"], ["风暴之灵的残影放了一地，对面一个都没碰。", "残影", "无人问津"]],
    39: [["痛苦女王：闪烁进场，闪烁出场，中间顺便死了。", "闪烁进场", "顺便死了"], ["痛苦女王的超声冲击波，清兵一流，打人随缘。", "超声冲击波", "清兵专用"]],
    22: [["宙斯：大招放得勤，补刀没几根。", "雷神之怒", "补刀为零"], ["宙斯的大招抢人头一流，团战站位一塌糊涂。", "雷神之怒", "只会抢人头"]],
    28: [["斯拉达：鱼人守卫把对面拍晕了，自己也被拍死了。", "鱼人碎击", "一起晕"], ["斯拉达的深海重击，重击在了空气上。", "深海重击", "击中了空气"]],
    76: [["殁境神蚀者：星体禁锢了自己的队友。", "星体禁锢", "禁锢了队友"], ["殁境神蚀者的大招，对面智力比他还高。", "精气光环", "对面更聪明"]],
  };

  // Ogni giocatore riceve una variante diversa della stessa battuta (index = posizione in config.js),
  // e la variante ruota ogni settimana. Le battute generiche senza variante libera vengono saltate.
  const pickFor = (arr, ctx, generic) => {
    if (!arr || !arr.length) return null;
    const idx = ctx.index || 0, week = ctx.week || 0;
    if (generic && idx >= arr.length) return null;
    return arr[(idx + week) % arr.length];
  };

  const groupWr = (gs) => { const n = gs.reduce((t, g) => t + g.n, 0); return n ? (gs.reduce((t, g) => t + g.wins, 0) / n) * 100 : 0; };
  const groupN = (gs) => gs.reduce((t, g) => t + g.n, 0);

  // ---------- Regole delle battute ----------
  // v: varianti [testo, meme sopra, meme sotto]. generic: vale per tutti i giocatori.
  // match: la partita citata (se già usata nei 语录 la battuta viene saltata).
  function buildRoasts(s, name, heroes, ctx = {}) {
    const H = (id) => heroes[id]?.localized_name || "神秘英雄";
    const fav = s.heroes[0];
    const persona = ctx.persona || {};
    const traits = new Set(persona.traits || []);
    const used = ctx.usedMatches || new Set();
    const T = (t) => traits.has(t);
    const v = {
      rank: medalName(ctx.rankTier), mmr: approxMmr(ctx.rankTier) ?? "?",
      claimed: persona.claimedRank || "超凡入圣", rival: persona.rival || "队友",
      distinct: s.distinctHeroes, core: s.core, sup: s.sup, lh10: Math.round(s.lh10), avgLh: Math.round(s.avgLh), lhTotal: s.lhTotal,
      wr1: Math.round(s.curve[0].wr), wr3: Math.round(groupWr(s.curve.slice(2))), bottles: s.sessions,
      mmrD: (s.mmrDelta > 0 ? "+" : "") + s.mmrDelta, late: s.lateN, xlevel: xiuxian(s.lateHours).level,
      partyN: s.party.n, partyWr: Math.round(s.party.wr),
      name, n: s.n, wr: Math.round(s.wr), w: s.wins, l: s.losses,
      hours: s.hours.toFixed(1), hours2: (s.hours * 2).toFixed(0), deaths: s.deaths, avgD: s.avgDeaths.toFixed(1), kda: s.avgKda.toFixed(2),
      streak: s.streak, worst: s.worstRun,
      favHero: fav ? H(fav.hero_id) : "", favGames: fav?.games,
      md: s.mostDeaths?.deaths, mdHero: s.mostDeaths ? H(s.mostDeaths.hero_id) : "",
      long: s.longest ? mins(s.longest.duration) : 0, longHero: s.longest ? H(s.longest.hero_id) : "", longRes: s.longest?.win ? "赢" : "输",
      sl: s.shortestLoss && !s.shortestLoss.win ? mins(s.shortestLoss.duration) : 0, slHero: s.shortestLoss ? H(s.shortestLoss.hero_id) : "",
      night: s.lateNight.length, turbo: s.turbo, zk: s.zeroKill,
      bk: s.bestGame ? `${s.bestGame.kills}/${s.bestGame.deaths}/${s.bestGame.assists}` : "",
      bkHero: s.bestGame ? H(s.bestGame.hero_id) : "",
      lowGpm: s.lowestGpm?.gold_per_min, lowGpmHero: s.lowestGpm ? H(s.lowestGpm.hero_id) : "",
      nightTime: s.lateNight[0] ? new Date(s.lateNight[0].start_time * 1000).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }) : "",
    };

    const rules = [
      // ----- generiche -----
      { id: "absent", generic: 1, when: () => s.n === 0, weight: 100, icon: "🌱", title: "在逃人员", titles: ["在逃人员", "疑似练小号", "失踪人口"], v: [
        ["{name} 已经7天没打刀了。可能性：出门摸草了、谈恋爱了，或者哭着卸载了。", "七天零场", "戒断反应即将到来"],
        ["{name} 本周一局没打。本庭怀疑他在偷偷练小号，准备下周回来继续丢人。", "本周零场", "在偷偷练小号"],
        ["{name} 失踪7天。寻人启事：最后一次出现时正在甩锅。", "寻人启事", "最后出现在泉水"]] },
      { id: "nolife", generic: 1, when: () => s.n >= 20, weight: 70, icon: "🛌", title: "从不摸草", titles: ["从不摸草", "语言天才", "椅子认主"], v: [
        ["一周{n}场，{hours}小时。这是一份兼职，只是没有工资。", "一周{n}场", "太阳是什么？没听说过"],
        ["7天打了{hours}小时刀塔。这些时间够学一门外语了，结果他学会了用各国语言送人头。", "{hours}小时刀塔", "学会八国语言送人头"],
        ["{n}场比赛，{hours}小时。他的椅子已经长出了他的形状。", "一周{n}场", "椅子已认主"]] },
      { id: "grind", generic: 1, when: () => s.n >= 8 && s.n < 20, weight: 30, icon: "⏳", title: "中度成瘾", titles: ["中度成瘾", "最后一把", "投入产出比"], v: [
        ["本周{n}场，{hours}小时。刚好够让他没有社交生活。", "就打最后一把", "——{n}把之前"],
        ["{n}场、{hours}小时。每一场开始前都说“最后一把”。", "最后一把", "第{n}次说"],
        ["本周投入{hours}小时，产出：一堆借口。", "投入{hours}小时", "产出：借口"]] },
      { id: "feeder", generic: 1, match: () => s.mostDeaths, when: () => s.mostDeaths?.deaths >= 12, weight: 90, icon: "💀", title: "泉水VIP会员", titles: ["泉水VIP会员", "泡面时间", "慈善家"], hero: () => s.mostDeaths.hero_id, v: [
        ["用{mdHero}一局死了{md}次。对面的信使都已经认识他了。", "{mdHero} 死了{md}次", "我不是送，是做慈善"],
        ["{mdHero}一局{md}死，复活读秒加起来够他泡十碗面。", "一局{md}死", "泉水是我第二个家"],
        ["{mdHero}死了{md}次。这不是打比赛，这是给对面捐钱。", "{md}次死亡", "对面经济全靠我"]] },
      { id: "deaths", generic: 1, when: () => s.avgDeaths >= 8, weight: 60, icon: "⚰️", title: "死亡统计", titles: ["死亡统计", "定时刷新的野怪", "黑白电视爱好者"], v: [
        ["本周一共死了{deaths}次。买活键上已经磨出他的指纹了。", "一周死了{deaths}次", "复活倒计时是我家"],
        ["{deaths}次死亡，场均{avgD}次。对面打他像刷野怪一样，定时刷新。", "场均{avgD}死", "我是对面的野怪"],
        ["本周阵亡{deaths}次。灰屏的时间比彩屏还长。", "{deaths}次灰屏", "黑白电视爱好者"]] },
      { id: "losestreak", generic: 1, when: () => s.worstRun >= 4, weight: 85, icon: "📉", title: "股市崩盘", titles: ["股市崩盘", "自由落体", "队友背锅"], v: [
        ["{worst}连败。A股看了都直呼内行。", "{worst}连败", "都是匹配机制的错"],
        ["{worst}连败。他的天梯分正在做自由落体运动，牛顿看了都点头。", "{worst}连败", "牛顿：理论没错"],
        ["连输{worst}把。到了某个时候，得问问问题是不是真的出在队友身上。", "连输{worst}把", "肯定是队友的问题"]] },
      { id: "hotstreak", generic: 1, when: () => s.streakWin && s.streak >= 4, weight: 75, icon: "🔥", title: "火力全开（可疑）", titles: ["火力全开（可疑）", "疑似代打", "高利贷"], v: [
        ["目前{streak}连胜中。请查一下他是不是买号了，或者是他表哥在打。", "{streak}连胜", "这绝对是实力"],
        ["{streak}连胜？本庭已申请调取他的键盘指纹，怀疑有人代打。", "{streak}连胜", "代打费已付"],
        ["{streak}连胜中。别急，按他的习惯，下周就要连本带利还回去。", "{streak}连胜", "下周还回去"]] },
      { id: "lowwr", generic: 1, when: () => s.n >= 4 && s.wr < 40, weight: 80, icon: "🧊", title: "胜率冰点", titles: ["胜率冰点", "系统很客观", "天气预报"], v: [
        ["本周胜率{wr}%。抛硬币都比他强，而且硬币不喷人。", "胜率 {wr}%", "我说这是定级赛"],
        ["{w}胜{l}负。匹配系统不是针对他，只是比较客观。", "{w}胜{l}负", "系统：我很客观"],
        ["胜率{wr}%，比天气预报还不准。", "胜率{wr}%", "天气预报都比我准"]] },
      { id: "highwr", generic: 1, when: () => s.n >= 4 && s.wr >= 65, weight: 70, icon: "🏆", title: "胜率可疑", titles: ["胜率可疑", "对面是演员", "嘴炮预警"], v: [
        ["本周胜率{wr}%。建议对他的QWER键进行兴奋剂检测。", "胜率 {wr}%", "QWER需要尿检"],
        ["胜率{wr}%。本庭判断：对面是真的菜，不是他真的强。", "胜率{wr}%", "对面：我们是演员"],
        ["胜率{wr}%，赢这么多，下周的嘴炮素材又有了。群友请做好心理准备。", "胜率{wr}%", "群友：救命"]] },
      { id: "onetrick", generic: 1, match: () => null, when: () => fav && s.n >= 4 && fav.games / s.n >= 0.5, weight: 65, icon: "🔁", title: "专一的男人", titles: ["专一的男人", "英雄池告急", "一ban就废"], hero: () => fav.hero_id, v: [
        ["{n}场里有{favGames}场玩{favHero}。一百多个英雄，他选择了专一。", "{favHero}", "{favHero} {favHero} {favHero}"],
        ["英雄池：{favHero}，还有……{favHero}。", "我的英雄池", "只有{favHero}"],
        ["{favGames}场{favHero}。对面一ban，他就只能挂机了。", "ban掉{favHero}", "他就不会玩了"]] },
      { id: "longgame", generic: 1, match: () => s.longest, when: () => s.longest && s.longest.duration >= 3600, weight: 45, icon: "🕰️", title: "无尽之战", titles: ["无尽之战", "逝去的青春", "泡面泡烂了"], hero: () => s.longest.hero_id, v: [
        ["用{longHero}打了一局{long}分钟。比电视剧还长，剧情还更少。", "一局{long}分钟", "超级兵都是我养大的"],
        ["{longHero}一局{long}分钟，最后还{longRes}了。这{long}分钟本可以用来睡觉。", "{long}分钟", "我的青春"],
        ["{longHero}打了{long}分钟，对面的泡面都泡了三碗。", "{long}分钟大战", "泡面泡烂了"]] },
      { id: "quickloss", generic: 1, match: () => s.shortestLoss, when: () => v.sl && v.sl <= 25, weight: 55, icon: "🏳️", title: "光速GG", titles: ["光速GG", "外卖速度", "面还没泡好"], hero: () => s.shortestLoss.hero_id, v: [
        ["{sl}分钟就输了。看了一眼阵容，决定少受点罪。", "{sl}分钟GG", "至少能早点吃饭"],
        ["{sl}分钟投降，速度堪比外卖小哥。", "{sl}分钟GG", "比外卖还快"],
        ["{slHero}{sl}分钟结束战斗：泡面都还没泡好。", "{sl}分钟输了", "面还没泡好"]] },
      { id: "night", generic: 1, when: () => s.lateNight.length >= 1 && !T("xiuxian"), weight: 50, icon: "🌙", title: "夜班选手", titles: ["夜班选手", "熬夜冠军", "熊猫眼"], v: [
        ["凌晨{nightTime}开了一局。睡觉是给那些没有分可掉的人准备的。", "凌晨 {nightTime}", "再来一把就睡"],
        ["凌晨1点到6点之间打了{night}局。第二天上班：跟对线一样没用。", "凌晨{night}局", "明天上班靠咖啡"],
        ["{nightTime}还在打刀。他的黑眼圈比熊猫还专业。", "凌晨{nightTime}", "熊猫：自愧不如"]] },
      { id: "turbo", generic: 1, when: () => s.turbo >= 3, weight: 40, icon: "⚡", title: "加速模式成瘾", titles: ["加速模式成瘾", "效率至上"], v: [
        ["打了{turbo}局加速模式。因为慢慢输太老派了。", "{turbo}局加速模式", "天梯？不敢不敢"],
        ["{turbo}局加速。连输都要追求效率。", "加速模式", "加速送"]] },
      { id: "poor", generic: 1, match: () => s.lowestGpm, when: () => s.lowestGpm && s.lowestGpm.gold_per_min < 300 && s.n > 0, weight: 40, icon: "🪙", title: "贫困线以下", titles: ["贫困线以下", "比辅助还穷", "攒不出跳刀"], hero: () => s.lowestGpm.hero_id, v: [
        ["用{lowGpmHero}打出了{lowGpm} GPM。物品栏里只有树枝和希望。", "{lowGpm} GPM", "刀塔低保户"],
        ["{lowGpmHero} {lowGpm} GPM。对面辅助都比他有钱。", "{lowGpm} GPM", "对面辅助比我富"],
        ["{lowGpm} GPM。打完一局，连个跳刀都没攒出来。", "{lowGpm} GPM", "跳刀是什么"]] },
      { id: "pacifist", generic: 1, when: () => s.zeroKill >= 2, weight: 45, icon: "🕊️", title: "和平主义者", titles: ["和平主义者", "刀塔甘地"], v: [
        ["有{zk}局零击杀。佛祖会点赞，队友不会。", "零击杀", "我本质上是个辅助"],
        ["{zk}局一个人头都没拿。刀塔界的甘地。", "{zk}局零杀", "非暴力不合作"]] },
      { id: "goodkda", generic: 1, when: () => s.n >= 3 && s.avgKda >= 4 && !T("kdaBrag"), weight: 35, icon: "🎯", title: "简历级KDA", titles: ["简历级KDA", "助攻蹭王", "苟王"], v: [
        ["平均KDA {kda}。他会把这个写进简历的“个人技能”一栏。", "KDA {kda}", "但我还是输了"],
        ["KDA {kda}，全靠助攻堆出来的。别人打架他按A，然后截图。", "KDA {kda}", "全靠蹭"],
        ["KDA {kda}。苟得好，KDA就好。", "KDA {kda}", "苟住就是胜利"]] },
      { id: "best", generic: 1, match: () => s.bestGame, when: () => s.bestGame && s.bestGame.kda >= 5, weight: 20, icon: "⭐", title: "高光时刻", titles: ["高光时刻", "对面在挂机", "对面在练英雄"], hero: () => s.bestGame.hero_id, v: [
        ["本周最佳：{bkHero} {bk}。裱起来吧，下次不一定有了。", "{bkHero} {bk}", "没截图等于没发生"],
        ["{bkHero} {bk}，一周唯一的高光。本庭合理怀疑对面在挂机。", "{bk}", "对面在挂机"],
        ["{bkHero} {bk}——本庭合理怀疑对面在练新英雄。", "{bk}", "对面：我们在练英雄"]] },
      { id: "mid", generic: 1, when: () => s.n >= 3 && s.wr >= 42 && s.wr <= 58, weight: 5, icon: "📊", title: "平平无奇", titles: ["平平无奇", "卡在中间"], v: [
        ["{n}场，胜率{wr}%，KDA {kda}。数据平均到国家统计局拿他当样本。", "胜率 {wr}%", "稳定的平庸"],
        ["胜率{wr}%，不上不下，跟他的段位一样卡在中间。", "{wr}%", "上不去也掉不完"]] },

      // ----- 金神: vanteria (le frasi tipiche sono già nei 语录, qui solo angoli diversi) -----
      { id: "p-hours", when: () => persona.meter === "brag" && s.n > 0, weight: 88, icon: "🎺", title: "吹牛时长", v: [
        ["本周打了{hours}小时刀，按他的习惯，赛后吹牛至少再翻一倍。群友的耳朵本周加班{hours2}小时。", "打刀{hours}小时", "吹牛{hours2}小时"]] },
      { id: "p-name", when: () => persona.meter === "brag", weight: 84, icon: "🥇", title: "金神的“金”", v: [
        ["外号“金神”，金子的金。可惜段位是{rank}，含金量约等于镀金。", "金神", "镀金的"]] },
      { id: "p-shots", when: () => persona.meter === "brag" && s.wins > 0, weight: 80, icon: "📸", title: "截图狂魔", v: [
        ["每赢一把就要在群里发截图。本周{w}胜，群相册已经满了。", "赢一把", "发十张截图"]] },
      { id: "p-silent", when: () => persona.meter === "brag" && s.losses > 0, weight: 82, icon: "🤐", title: "选择性沉默", v: [
        ["输了{l}把，群里一张截图都没有。奇怪，难道截图键只在赢的时候能用？", "输了{l}把", "截图键坏了"]] },

      // ----- Ping神 -----
      { id: "p-allround", when: () => T("allRounder") && s.distinctHeroes >= 5, weight: 80, icon: "🎲", title: "全能选手", v: s.wr < 50
        ? [["本周{n}场用了{distinct}个英雄，一号位到五号位全试了一遍。什么位置都会打，什么位置都会输。", "什么位置都会打", "什么位置都会输"]]
        : [["{n}场{distinct}个英雄。什么位置都会打，什么位置都打得一般。", "{distinct}个英雄", "没有一个精通"]] },
      { id: "p-lasthit", when: () => T("cantLastHit") && s.n > 0, weight: 76, icon: "🗡️", title: "补刀残疾人士", v: s.core && s.lh10 >= 50
        ? [["天天说自己不会补刀，好让队友把兵线让给他。理论大师的又一套理论。", "我不会补刀", "兵线让给我"], ["嘴上“我不会补刀”，手上抢兵比谁都快。补刀不会，演技满分。", "我不会补刀", "（抢兵中）"]]
        : [["自称不会补刀——这是本庭收到的唯一一句真话：每10分钟补刀{lh10}个。", "我不会补刀", "终于说了句实话"]] },
      { id: "p-theory", when: () => T("theorist") && s.n > 0, weight: 87, icon: "🎙️", title: "DC首席理论家", v: [
        ["DC里理论一套一套的，本周实战KDA {kda}、胜率{wr}%。理论超凡入圣，实战{rank}。", "理论：超凡入圣", "实战：{rank}"],
        ["在DC指导了全队一晚上，结论：大家都有问题，除了他。", "DC指导员", "除了我都有问题"],
        ["话多到语音频道需要扩容。DC里说话从不换气，团战里倒是第一个没声。", "DC里从不停嘴", "团战里第一个阵亡"],
        ["评判别人头头是道，轮到自己：{l}场失败，没有一场是他的问题（他说的）。", "我来点评一下", "（输了{l}把）"]] },
      { id: "p-judge", when: () => T("theorist") && s.losses > 0, weight: 72, icon: "🧑‍🏫", title: "赛后点评专家", v: [
        ["每局结束都要开一场复盘会，主讲人是他，主题是别人哪里打错了。", "赛后复盘", "错的都是别人"],
        ["DC里评判别人站位、出装、意识，评完了自己{l}场失败。", "站位不对", "说的是别人"]] },
      { id: "p-drunk", when: () => T("drunk") && s.curve[0].n > 0 && groupN(s.curve.slice(2)) > 0, weight: 93, icon: "🥃", title: "醉拳传人", v: s.curve[0].wr > groupWr(s.curve.slice(2))
        ? [["每晚第1局（清醒）胜率{wr1}%，第3局以后（上头）胜率{wr3}%。威士忌才是他最大的对手。", "一晚一瓶威士忌", "第3局胜率{wr3}%"]]
        : [["离谱：喝得越多赢得越多。第1局胜率{wr1}%，第3局以后{wr3}%。建议直接喝完一瓶再排。", "清醒：{wr1}%", "喝醉：{wr3}%"]] },
      { id: "p-whisky", when: () => T("drunk") && s.sessions > 0, weight: 60, icon: "🍾", title: "酒精账单", v: [
        ["一晚一瓶威士忌，本周喝了{bottles}个晚上。醉驾英雄，扣的是天梯分。", "本周{bottles}瓶威士忌", "肝：救命"]] },
      { id: "p-smoke", when: () => T("smoker") && s.n > 0, weight: 62, icon: "🚬", title: "一局一根", v: [
        ["每局结束都要来一根。肺比他的高地还脆。", "每局一根烟", "肺：我也想投降"],
        ["游戏时长{hours}小时，抽烟时长另算。赛后烟比赛前热身还准时。", "GG", "先抽一根"]] },
      { id: "p-mmr", when: () => T("mmrAnxiety") && s.n > 0, weight: 85, icon: "📊", title: "天梯分焦虑症", v: s.mmrDelta < 0
        ? [["比谁都在乎天梯分，本周估算{mmrD}分。在乎也没用啊兄弟。", "我很在乎天梯分", "本周：{mmrD}"]]
        : [["本周估算{mmrD}分，今晚可以多喝一杯了。下周记得还回去。", "上分了", "庆祝：再开一瓶"]] },
      { id: "p-party", when: () => T("partyFear") && s.party.n > 0 && s.party.wr < 55, weight: 74, icon: "🙈", title: "开黑恐惧症", v: [
        ["说怕跟主团开黑掉分。本周组排{partyN}场，胜率{partyWr}%——看来掉分跟主团没关系。", "跟主团开黑？", "不了，怕掉分"]] },
      { id: "p-ancient", when: () => T("ancientOneDay"), weight: 89, icon: "🎟️", title: "万古一日游", v: (ctx.rankTier || 0) >= 61
        ? [["又上万古了！本庭郑重提醒：这次请坚持超过24小时。", "又上万古了", "倒计时24小时"]]
        : [["上了万古1，待了一天，又掉回{rank}。万古一日游，门票都没回本。", "万古一日游", "现居：{rank}"], ["万古的空气只呼吸了一天。现居地：{rank}。", "万古一日游", "已返程"]] },
      { id: "p-xiuxian", when: () => T("xiuxian") && s.lateN > 0, weight: 83, icon: "🧘", title: "修仙中", v: [
        ["本周深夜修仙{late}局，修为已达【{xlevel}】。照这个速度，很快就升天了。", "修仙中，勿扰", "境界：{xlevel}"],
        ["凌晨的刀塔最养人：修仙{late}局，境界【{xlevel}】。再修下去就不是飞升，是升天了。", "深夜修仙", "离升天不远了"]] },
    ];

    const out = [];
    for (const r of rules) {
      let ok;
      try { ok = r.when(); } catch { ok = false; }
      if (!ok) continue;
      const m = r.match?.();
      if (m && used.has(m.match_id)) continue;
      const pick3 = pickFor(r.v, ctx, r.generic);
      if (!pick3) continue;
      out.push({ id: r.id, icon: r.icon, title: r.titles?.[r.v.indexOf(pick3)] || r.title, weight: r.weight,
        text: fill(pick3[0], v), meme: { top: fill(pick3[1], v), bottom: fill(pick3[2], v) },
        heroId: r.hero ? r.hero() : null });
    }

    const hj = fav && pickFor(HERO_JOKES[fav.hero_id], ctx, true);
    if (hj) out.push({ id: "hero", icon: "🦸", title: `${H(fav.hero_id)}专案`, weight: 58,
      text: hj[0], meme: { top: hj[1], bottom: hj[2] }, heroId: fav.hero_id });
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
    // ogni frase cita una partita diversa
    const usedM = new Set();
    const take = (list, f) => {
      const m = list.filter((x) => !usedM.has(x.match_id)).reduce((b, x) => (b == null || f(x) > f(b) ? x : b), null);
      if (m) usedM.add(m.match_id);
      return m;
    };
    const q = [];

    if (t.has("brag")) q.push({ quote: `我是${claimed}实力`, stamp: "做梦",
      reply: `系统显示：${rank}（约${mmr}分）。${claimed}只存在于他的嘴里和梦里。` });
    const midM = t.has("midKing") && take(s.matches.filter(isMid), (m) => m.deaths - m.kills);
    if (midM) q.push({ quote: "我是无敌中单，打爆一切", stamp: "吹牛", heroId: midM.hero_id,
      reply: `本周中路${H(midM.hero_id)}打出 ${kd(midM)}。被打爆的“一切”里，也包括他自己。` });
    const kdaM = t.has("kdaBrag") && take(s.matches, (m) => -m.kda);
    if (kdaM) q.push({ quote: "我KDA很好的", stamp: "失忆", heroId: kdaM.hero_id,
      reply: `请看${H(kdaM.hero_id)}这把：${kd(kdaM)}。这一把的KDA，他选择性失忆了。` });
    if (t.has("blameTeam") && s.losses) q.push({ quote: "输了都是队友的锅", stamp: "甩锅",
      reply: `${s.losses}场失败，他自己场均死${s.inLosses.avgDeaths.toFixed(1)}次。队友：这锅太沉，背不动。` });
    if (t.has("rigged")) q.push({ quote: "Steam给我匹配系统局", stamp: "碰瓷",
      reply: s.wr >= 50 ? `胜率${Math.round(s.wr)}%的系统局？系统：我对你还不够好吗？` : `胜率${Math.round(s.wr)}%。系统：别碰瓷，我也很无辜。` });
    const mvpM = t.has("selfMvp") && take(s.matches.filter((m) => m.win), (m) => -m.kda);
    if (mvpM) q.push({ quote: "赢了都是我MVP", stamp: "自封", heroId: mvpM.hero_id,
      reply: `${H(mvpM.hero_id)} ${kd(mvpM)} 也叫MVP？那是队友把他抬过了终点线。` });
    if (t.has("targeted")) q.push({ quote: "对面故意选英雄针对我", stamp: "想多了",
      reply: "对面五个人连他的ID都没点开过。被针对？对面只是正常选了个英雄。" });
    if (t.has("lastPick")) q.push({ quote: "我最后选，免得被克制", stamp: "怂",
      reply: "每局最后一个选，选完照样被克制。克制他的不是英雄，是他自己。" });
    const trashM = t.has("trashTalk") && take(s.matches, (m) => m.deaths);
    if (trashM) q.push({ quote: `${rival}太菜了`, stamp: "双标", heroId: trashM.hero_id,
      reply: `说这话的人，本周用${H(trashM.hero_id)}一局死了${trashM.deaths}次。${rival}：谢谢，有被安慰到。` });
    q.usedMatches = usedM;
    return q;
  }

  // ---------- 专项调查: pannelli speciali, solo dati che lo mettono in ridicolo ----------
  function specials(s, ctx = {}) {
    const traits = new Set(ctx.persona?.traits || []);
    if (!s.n) return null;
    const cards = [];
    if (traits.has("drunk")) cards.push({ icon: "🥃", label: "威士忌（估算）", value: `${s.sessions} 瓶`, sub: `按一晚一瓶估算 · ${s.sessions}个晚上` });
    if (traits.has("smoker")) cards.push({ icon: "🚬", label: "香烟（估算）", value: `${s.n} 根`, sub: `按一局一根估算 · ${s.n}局` });
    if (traits.has("mmrAnxiety") && s.mmrDelta < 0) cards.push({ icon: "📉", label: "天梯分（估算）", value: String(s.mmrDelta), sub: `${s.wins}胜${s.losses}负 · 每局±25分`, cls: "neg" });
    if (traits.has("partyFear") && s.party.n && s.party.wr < 55) cards.push({ icon: "🙈", label: "组排胜率", value: `${Math.round(s.party.wr)}%`, sub: `组排${s.party.n}场 · 单排${s.solo.n}场`, cls: "neg" });
    if (traits.has("theorist")) cards.push({ icon: "🎙️", label: "DC发言 vs 补刀", value: "∞ : " + s.lhTotal, sub: "本周补刀总数" });
    if (traits.has("cantLastHit") && s.core && s.lh10 < 50) cards.push({ icon: "🗡️", label: "核心局补刀", value: `${Math.round(s.lh10)}/10分钟`, sub: "打核心时的平均值", cls: "neg" });
    return {
      cards,
      curve: traits.has("drunk") && s.sessions ? s.curve.map((g, i) => ({ label: CURVE_LABELS[i], n: g.n, wr: g.wr })) : null,
      xiuxian: traits.has("xiuxian") ? { ...xiuxian(s.lateHours), games: s.lateN } : null,
    };
  }

  window.TribunaleRoast = { computeStats, verdict, buildRoasts, quotes, specials, isWin, isMid, medalName, approxMmr };
})();
