// Contenuti extra della home, tutti calcolati in automatico:
// 今日黄历 (fortuna del giorno), 本周颁奖典礼 (premi della settimana), 耻辱排行榜 (classifica), 全员作息表.
(function () {
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ""));
  // generatore pseudo-casuale con seme: stessi risultati per tutto il giorno, diversi il giorno dopo
  function rng(seed) {
    let x = (seed * 2654435761) % 4294967296 || 1;
    return () => ((x = (x * 1664525 + 1013904223) % 4294967296) / 4294967296);
  }
  const dayNumber = (d = new Date()) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  const weekNumber = () => Math.floor((Date.now() / 86400000 + 3) / 7);

  // ---------- 今日黄历 ----------
  const YI = ["打辅助", "早点睡觉", "单排上分", "练习补刀", "开局先买眼", "听队友指挥", "选冷门英雄", "多喝热水", "关掉聊天框", "看录像复盘", "先出BKB", "给队友点赞", "安静打游戏", "打完就下线", "认真对线"];
  const JI = ["打中单", "秒选英雄", "最后一个选", "开麦吵架", "打天梯", "选carry", "连跪后再开一把", "凌晨两点后开局", "赛前立flag", "看别人直播学操作", "空血进野区", "一个人推高地"];
  // 忌 su misura in base ai vizi del giocatore (traits in config.js)
  const JI_TRAIT = {
    brag: "在群里吹牛", midKing: "抢中路", blameTeam: "赛后甩锅", rigged: "说系统局", lastPick: "最后一个选英雄", trashTalk: "嘲讽别人",
    drunk: "喝酒开黑", smoker: "赛后抽烟", theorist: "在DC讲课", xiuxian: "凌晨开局", mmrAnxiety: "盯着天梯分看", ancientOneDay: "幻想上万古",
    babysit: "不带保姆出门", milkAfk: "喂奶时排队", drowCurse: "玩小黑", scared: "躲在野区", jakiroOnly: "被迫打辅助",
    drowArcana: "选小黑", threeAxes: "用第四把斧头", noSupport: "抢辅助的钱", pingStudent: "听Ping神上课",
    allNighter: "喊通宵", loud: "开麦大喊",
    wifeAway: "当着老婆开黑", pcOld: "用老电脑排天梯", lowPrio: "排队时离开电脑", pudgeGod: "闭眼放钩子",
    slarkBody: "秒选小鱼人", pos4Slark: "四号位拿核心", lowRank: "查自己的段位",
  };
  const YI_PRAISE = ["带飞全场", "秀操作", "上分", "carry队友", "拿MVP"];
  const STAR = (n) => "★".repeat(n) + "☆".repeat(5 - n);

  function fortunes(players, heroes) {
    const day = dayNumber();
    const r = rng(day);
    const usedYi = new Set(), usedJi = new Set(), usedHero = new Set();
    const heroIds = Object.keys(heroes).map(Number).filter((id) => heroes[id]?.img);
    const take = (list, used) => {
      const free = list.filter((x) => !used.has(x));
      const pick = (free.length ? free : list)[Math.floor(r() * (free.length || list.length))];
      used.add(pick);
      return pick;
    };
    return players.map((p) => {
      const praise = p.praise;
      const traitJi = (p.cfg.persona?.traits || []).map((t) => JI_TRAIT[t]).filter(Boolean);
      const yi = praise ? take(YI_PRAISE, usedYi) : take(YI, usedYi);
      const ji = praise ? "手下留情" : take(traitJi.length ? traitJi : JI, usedJi);
      const own = p.stats.heroes.map((h) => h.hero_id);
      let hero = take(own.length ? own : heroIds, usedHero);
      if (!heroes[hero]) hero = take(heroIds, usedHero);
      const stars = praise ? 5 : 1 + Math.floor(r() * 4); // 1-4 stelle; 5 solo per i "大神" in modalità elogio
      return { p, yi, ji, hero, stars, starsText: STAR(stars) };
    });
  }

  // ---------- 本周颁奖典礼 ----------
  const lateGames = (s) => s.lateN;
  const AWARDS = [
    { id: "deaths", icon: "🪦", title: "送头之王", get: (s) => s.deaths, fmt: (v) => `${v}次阵亡`, min: 20,
      caps: ["{name}的复活读秒加起来，够看完一部电影。", "对面这周的经济，有一半是{name}赞助的。"] },
    { id: "hours", icon: "🛌", title: "肝帝", get: (s) => s.hours, fmt: (v) => `${v.toFixed(1)}小时`, min: 5,
      caps: ["{name}这周的刀塔时长，超过了很多人的加班时长。", "{name}：上班摸鱼，下班摸刀塔。"] },
    { id: "owl", icon: "🦉", title: "夜猫子", get: lateGames, fmt: (v) => `${v}局深夜局`, min: 2,
      caps: ["{name}的生物钟，已经调成了刀塔服务器时间。", "月亮不睡，{name}不睡。"] },
    { id: "streak", icon: "📉", title: "连败之王", get: (s) => s.worstRun, fmt: (v) => `最长${v}连败`, min: 3,
      caps: ["{name}的连败，比他的连胜记得更清楚。", "{name}这周的连败，让键盘都开始怀疑人生。"] },
    { id: "poor", icon: "🪙", title: "低保户", get: (s) => -s.avgGpm, fmt: (v) => `平均${Math.round(-v)} GPM`, min: -9999,
      caps: ["{name}的钱包，比对面的眼位还空。", "{name}这周的经济，信使都嫌少。"] },
    { id: "onegame", icon: "💀", title: "单局送头王", get: (s) => s.mostDeaths?.deaths ?? 0, fmt: (v) => `一局${v}死`, min: 12,
      caps: ["{name}在一局里，完成了别人一周的死亡量。", "那一局，{name}和复活读秒成了好朋友。"] },
    { id: "marathon", icon: "⏳", title: "马拉松选手", get: (s) => (s.longest ? s.longest.duration / 60 : 0), fmt: (v) => `一局${Math.round(v)}分钟`, min: 55,
      caps: ["{name}的最长一局，够看两集电视剧。", "{name}：那一局打完，天都亮了一半。"] },
    { id: "coin", icon: "⚖️", title: "五五开大师", get: (s) => (s.n >= 6 ? -Math.abs(s.wr - 50) : -999), fmt: (v, s) => `胜率${Math.round(s.wr)}%`, min: -6,
      caps: ["{name}的胜率，完美诠释了什么叫五五开。", "{name}：赢一把输一把，人生就是这么平衡。"] },
  ];

  function awards(players) {
    const w = weekNumber();
    const out = [];
    const winners = new Map(); // un giocatore riceve al massimo 2 premi, così ce n'è per tutti
    for (const a of AWARDS) {
      const ranked = players.map((p) => ({ p, v: a.get(p.stats) })).filter((x) => x.v != null && x.v >= a.min)
        .sort((x, y) => y.v - x.v);
      const top = ranked.find((x) => (winners.get(x.p.id) || 0) < 2);
      if (!top) continue;
      winners.set(top.p.id, (winners.get(top.p.id) || 0) + 1);
      out.push({ ...a, p: top.p, value: a.fmt(top.v, top.p.stats), caption: fill(a.caps[(w + out.length) % a.caps.length], { name: top.p.name }) });
    }
    return out;
  }

  // ---------- 耻辱排行榜 ----------
  const BOARDS = [
    { id: "deaths", label: "总阵亡", get: (s) => s.deaths, fmt: (v) => `${v}次` },
    { id: "avgd", label: "场均阵亡", get: (s) => s.avgDeaths, fmt: (v) => v.toFixed(1) },
    { id: "hours", label: "游戏时长", get: (s) => s.hours, fmt: (v) => `${v.toFixed(1)}h` },
    { id: "late", label: "深夜局", get: (s) => s.lateN, fmt: (v) => `${v}局` },
    { id: "streak", label: "最长连败", get: (s) => s.worstRun, fmt: (v) => `${v}连败` },
    { id: "gpm", label: "最穷GPM", get: (s) => s.avgGpm, fmt: (v) => `${Math.round(v)}`, asc: true },
  ];
  function board(players, id) {
    const b = BOARDS.find((x) => x.id === id) || BOARDS[0];
    const rows = players.map((p) => ({ p, v: b.get(p.stats) })).sort((x, y) => (b.asc ? x.v - y.v : y.v - x.v));
    const max = Math.max(...rows.map((x) => x.v), 1), min = Math.min(...rows.map((x) => x.v));
    return { b, rows: rows.map((x) => ({ ...x, text: b.fmt(x.v), pct: b.asc ? 25 + 75 * ((max - x.v) / Math.max(1, max - min)) : Math.max(4, (x.v / max) * 100) })) };
  }

  window.TribunaleHome = { fortunes, awards, board, BOARDS, dayNumber };
})();
