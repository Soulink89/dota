// 昨日表情包: meme generati ogni giorno dalle partite di IERI (ora locale di chi guarda).
// Nessun server: a mezzanotte la data cambia e i meme si rigenerano da soli.
// Regole: solo momenti imbarazzanti; due giocatori non ricevono mai la stessa battuta nello stesso giorno;
// le partite già citate nelle battute settimanali di un giocatore vengono saltate.
(function () {
  const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ""));
  const isWin = (m) => (m.player_slot < 128) === m.radiant_win;
  const kdaOf = (m) => (m.kills + m.assists) / Math.max(1, m.deaths);
  const hhmm = (ts) => new Date(ts * 1000).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });

  // [sopra, sotto] — testi diversi da quelli delle battute settimanali
  const T = {
    deaths: [["昨天{hero}一局死了{d}次", "复活读秒比游戏时间还长"], ["{hero}：{k}/{d}/{a}", "昨晚的对面说谢谢"], ["昨日阵亡{d}次", "泉水打卡成功"], ["{d}死的{hero}", "建议改名叫复活石"]],
    kda: [["昨日KDA {kda}", "四舍五入等于零"], ["{hero} {k}/{d}/{a}", "这把建议删录像"], ["KDA {kda}", "辅助看了都摇头"], ["{hero}：KDA {kda}", "数据面板不忍直视"]],
    streak: [["昨天{n}连败", "睡一觉就好了（并没有）"], ["连输{n}把", "鼠标：不是我的问题"], ["昨日{n}连跪", "膝盖已碎"], ["{n}连败", "排队按钮：你还来？"]],
    netloss: [["昨天{w}胜{l}负", "今天还敢来吗"], ["昨日战绩{w}-{l}", "天梯分：我先走了"], ["{l}场失败", "昨晚的DC很安静"], ["{w}胜{l}负", "明天一定（又是明天）"]],
    poor: [["{hero} {gpm} GPM", "昨天是来扶贫的"], ["昨日GPM {gpm}", "打工都比这赚钱"], ["{gpm}经济", "买双鞋都要攒半天"], ["{hero}的钱包", "{gpm}每分钟"]],
    longloss: [["{dur}分钟的拉锯战", "最后还是输了"], ["鏖战{dur}分钟", "换来一个失败"], ["{dur}分钟", "青春献给了刀塔"], ["打了{dur}分钟", "结局：失败"]],
    quickloss: [["{dur}分钟GG", "比广告还短"], ["{dur}分钟投降", "对面还没热身"], ["昨天{dur}分钟", "就结束了"], ["{hero} {dur}分钟", "速通失败"]],
    late: [["凌晨{time}还在开局", "闹钟：你认真的吗"], ["{time}的刀塔", "明天的你会恨今天的你"], ["昨夜{time}", "肝在哭泣"], ["{time}开新局", "睡眠：已离线"]],
    binge: [["昨天打了{n}局", "今天的腰：救命"], ["一天{n}局", "生活：已读不回"], ["{n}局刀塔", "一天就这么没了"], ["昨日{n}连坐", "椅子都热了"]],
    zerokill: [["{hero} 0击杀", "昨天是来观光的"], ["零人头", "昨日佛系"], ["{hero}：0/{d}/{a}", "人头？不需要"], ["0杀", "和平主义发作了"]],
    heroloss: [["{hero}连输{n}把", "还要接着玩"], ["昨天的{hero}", "输了{n}次还不放弃"], ["{hero}×{n}", "全败"], ["输了{n}把{hero}", "英雄：放过我吧"]],
    good: [["昨天赢了{w}把", "今天准备还回去"], ["昨日{w}胜", "运气用完了"], ["{w}胜{l}负", "别得意，今天还有"], ["昨天还行", "本庭表示怀疑"]],
    // modalità elogio
    pbest: [["昨天{hero} {k}/{d}/{a}", "大神就是大神"], ["{hero}：{k}/{d}/{a}", "昨日最佳"], ["昨日神操作", "{hero} {k}/{d}/{a}"]],
    pwins: [["昨天拿下{w}场胜利", "手感火热"], ["昨日{w}胜", "状态拉满"]],
    passist: [["{hero} {a}次助攻", "团队的灵魂"], ["昨日助攻王", "{a}次助攻"]],
  };

  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  function yesterdayRange(now = new Date()) {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(end.getTime() - 86400000);
    return { start: start.getTime() / 1000, end: end.getTime() / 1000, date: start };
  }

  // tutti i momenti imbarazzanti di ieri per un giocatore, dal peggiore al meno grave
  function moments(p, range) {
    const H = (id) => p.heroes[id]?.localized_name || "某英雄";
    const ms = (p.data.matches || []).filter((m) => m.start_time >= range.start && m.start_time < range.end)
      .sort((a, b) => a.start_time - b.start_time).map((m) => ({ ...m, win: isWin(m), kda: kdaOf(m) }));
    if (!ms.length) return [];
    if (p.praise) return praiseMoments(ms, H);
    const exclude = p.exclude || new Set();
    const free = ms.filter((m) => !exclude.has(m.match_id));
    const out = [];
    const add = (type, score, vars, m) => out.push({ type, score, vars, heroId: m?.hero_id ?? null, matchId: m?.match_id ?? null,
      info: m ? `${hhmm(m.start_time)} · ${H(m.hero_id)} ${m.kills}/${m.deaths}/${m.assists} · ${m.win ? "胜" : "负"}` : `昨天${ms.length}局 · ${ms.filter((x) => x.win).length}胜${ms.filter((x) => !x.win).length}负` });
    const by = (list, f) => list.reduce((b, m) => (b == null || f(m) > f(b) ? m : b), null);
    const mv = (m) => ({ hero: H(m.hero_id), k: m.kills, d: m.deaths, a: m.assists, kda: m.kda.toFixed(1), gpm: m.gold_per_min, dur: Math.round(m.duration / 60), time: hhmm(m.start_time) });

    // solo morti davvero imbarazzanti: sconfitta con 8+ morti, oppure 12+ morti in qualunque caso
    const md = by(free.filter((m) => (!m.win && m.deaths >= 8) || m.deaths >= 12), (m) => m.deaths + (m.win ? 0 : 5));
    if (md) add("deaths", md.deaths * 3 + (md.win ? 0 : 10), mv(md), md);
    const wk = by(free.filter((m) => m !== md && !m.win), (m) => -m.kda);
    if (wk && wk.kda < 1.5) add("kda", (1.5 - wk.kda) * 25 + 10, mv(wk), wk);
    let run = 0, best = 0;
    for (const m of ms) { run = m.win ? 0 : run + 1; best = Math.max(best, run); }
    if (best >= 2) add("streak", best * 10, { n: best });
    const w = ms.filter((m) => m.win).length, l = ms.length - w;
    if (l > w && l >= 2) add("netloss", (l - w) * 8 + 5, { w, l });
    const poor = by(free.filter((m) => m.gold_per_min != null && !m.win), (m) => -m.gold_per_min);
    if (poor && poor.gold_per_min < 350) add("poor", (350 - poor.gold_per_min) / 6, mv(poor), poor);
    const longL = by(free.filter((m) => !m.win), (m) => m.duration);
    if (longL && longL.duration >= 50 * 60) add("longloss", longL.duration / 300, mv(longL), longL);
    const quickL = by(free.filter((m) => !m.win), (m) => -m.duration);
    if (quickL && quickL.duration <= 27 * 60) add("quickloss", 22, mv(quickL), quickL);
    const late = by(free, (m) => { const h = new Date(m.start_time * 1000).getHours(); return h < 6 ? h + 24 : h; });
    if (late) { const h = new Date(late.start_time * 1000).getHours(); if (h >= 1 && h < 6) add("late", 14 + h, mv(late), late); }
    if (ms.length >= 6) add("binge", ms.length * 2, { n: ms.length });
    const zk = free.find((m) => m.kills === 0 && !m.win);
    if (zk) add("zerokill", 16, mv(zk), zk);
    const losses = {};
    for (const m of ms) if (!m.win) losses[m.hero_id] = (losses[m.hero_id] || 0) + 1;
    const [hid, hn] = Object.entries(losses).sort((a, b) => b[1] - a[1])[0] || [];
    if (hn >= 2) add("heroloss", hn * 9, { hero: H(hid), n: hn }, { ...ms.find((m) => String(m.hero_id) === hid), hideInfo: true });
    if (!out.length && w) add("good", 3, { w, l });

    // un solo momento per tipo, dal più grave
    const seen = new Set();
    return out.sort((a, b) => b.score - a.score).filter((x) => !seen.has(x.type) && seen.add(x.type));
  }

  // modalità elogio: solo vittorie di ieri, solo complimenti
  function praiseMoments(ms, H) {
    const wins = ms.filter((m) => m.win);
    if (!wins.length) return [];
    const info = (m) => `${hhmm(m.start_time)} · ${H(m.hero_id)} ${m.kills}/${m.deaths}/${m.assists} · 胜`;
    const best = wins.reduce((b, m) => (b == null || m.kda > b.kda ? m : b), null);
    const out = [{ type: "pbest", score: 30, heroId: best.hero_id, info: info(best),
      vars: { hero: H(best.hero_id), k: best.kills, d: best.deaths, a: best.assists } }];
    if (wins.length >= 2) out.push({ type: "pwins", score: 20, heroId: wins[wins.length - 1].hero_id, info: `昨天${wins.length}场胜利`, vars: { w: wins.length } });
    const ass = wins.reduce((b, m) => (b == null || m.assists > b.assists ? m : b), null);
    if (ass !== best && ass.assists >= 15) out.push({ type: "passist", score: 15, heroId: ass.hero_id, info: info(ass), vars: { hero: H(ass.hero_id), a: ass.assists } });
    return out;
  }

  // players: [{ id, index, name, heroes, data, exclude }] → Map(id → [meme...])
  function generate(players, now = new Date()) {
    const range = yesterdayRange(now);
    const seed = Math.floor(range.start / 86400);
    const used = new Set();
    const lists = players.map((p) => ({ p, ms: p.hidden ? [] : moments(p, range) }));
    const result = new Map(players.map((p) => [p.id, []]));
    // a turno: prima il momento peggiore di ognuno, poi il secondo, poi il terzo
    for (let round = 0; round < 3; round++) {
      for (const { p, ms } of lists) {
        const mo = ms[round];
        if (!mo) continue;
        const bank = T[mo.type];
        let k = (seed + p.index * 3 + round) % bank.length, tries = 0;
        while (used.has(`${mo.type}:${k}`) && tries < bank.length) { k = (k + 1) % bank.length; tries++; }
        if (used.has(`${mo.type}:${k}`)) continue;
        used.add(`${mo.type}:${k}`);
        result.get(p.id).push({ top: fill(bank[k][0], mo.vars), bottom: fill(bank[k][1], mo.vars), heroId: mo.heroId,
          info: mo.info, score: mo.score, name: p.name, playerId: p.id });
      }
    }
    return { date: range.date, memes: result };
  }

  window.TribunaleDaily = { generate, dayKey };
})();
