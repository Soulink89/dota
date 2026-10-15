// Statistiche della settimana + motore delle battute (testi in cinese semplificato).
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

    // serie attuale (dalla partita più recente)
    let streak = 0;
    for (const m of ms) { if (m.win === ms[0].win) streak++; else break; }
    // serie di sconfitte più lunga
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

  // ---------- Pagella: voto d'esame cinese su 100 (60 = sufficienza) ----------
  function verdict(s) {
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

  // ---------- Regole delle battute ----------
  function buildRoasts(s, name, heroes) {
    const H = (id) => heroes[id]?.localized_name || "神秘英雄";
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

  window.TribunaleRoast = { computeStats, verdict, buildRoasts, isWin };
})();
