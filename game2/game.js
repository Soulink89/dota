// =====================================================================
//  GAME 2 — 守护遗迹 (vista di profilo, stile "piante contro zombie" in salsa Dota)
//  A sinistra l'Antico del Radiant sulla collina. Da destra arrivano le ondate
//  del Dire. Giochi come 大金神 (Windranger / Storm / Axe / Magnus), evochi
//  creep del Radiant (3 livelli), compri oggetti con aure e chiami 蜗牛大神.
// =====================================================================
(() => {
  const A = window.ART2;
  const W = 480, H = 220, GY = 184; // GY = linea del terreno (piedi)
  const HILL = { w: 100, h: 44 }, ANC = { x: 46, y: GY - 42, front: 96 };
  const cv = document.getElementById("cv"), g = cv.getContext("2d");
  cv.width = W; cv.height = H; g.imageSmoothingEnabled = false;
  const $ = (id) => document.getElementById(id);
  const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const bg = A.background(W, H, GY - 2, HILL);

  // =====================================================================
  //  ASPETTO DELLE UNITÀ
  // =====================================================================
  // sprite pixel ricavati dai modelli ufficiali di Dota 2 (sprites/*.png); FACE = verso in cui guarda il modello
  const FACE = { hero_windrunner: 1, hero_storm_spirit: 1, hero_axe: -1, hero_magnataur: -1, hero_nevermore: 1, rmelee: -1, rranged: -1, rmegam: -1, rmegar: -1,
    dmelee: -1, dranged: -1, siege: 1, kobold: 1, wolf: 1, centaur: -1, ogre: -1, golem: 1, dragon: -1, roshan: 1 };
  const VER = "3"; const SET = {};
  const loadSprite = (k) => new Promise((res) => { const im = new Image(); im.onload = () => {
    const [c, x] = A.mk(im.width, im.height); x.drawImage(im, 0, 0);
    const R = FACE[k] === 1 ? c : A.flip(c), L = FACE[k] === 1 ? A.flip(c) : c; // R = guarda a destra
    const gold = A.tint(R, "#ffe27a", 0.35), glowR = (col) => A.tint(R, col, 1), glowL = (col) => A.tint(L, col, 1);
    SET[k] = { R, L, white: A.whiteOf(R), whiteL: A.whiteOf(L), gold, goldL: A.flip(gold), w: c.width, h: c.height,
      glow: { "#ffd06a": [glowR("#ffd06a"), glowL("#ffd06a")], "#7aff9a": [glowR("#7aff9a"), glowL("#7aff9a")], "#93c5fd": [glowR("#93c5fd"), glowL("#93c5fd")] } }; res(); }; im.onerror = res; im.src = `sprites/${k}.png?v=${VER}`; });
  const ready = Promise.all(Object.keys(FACE).map(loadSprite));
  let ancientImg = null; const ancP = new Promise((res) => { const im = new Image(); im.onload = () => { ancientImg = im; res(); }; im.onerror = res; im.src = "sprites/ancient.png?v=" + VER; });
  // medaglie di rango (icone ufficiali Dota 2) sopra la testa di 大金神
  const MEDAL = {}; for (let t = 1; t <= 8; t++) { const im = new Image(); im.src = `https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_${t}.png`; MEDAL["i" + t] = im; } for (let n = 1; n <= 5; n++) { const im = new Image(); im.src = `https://www.opendota.com/assets/images/dota2/rank_icons/rank_star_${n}.png`; MEDAL["s" + n] = im; }

  // =====================================================================
  //  EROI (大金神 sceglie chi interpretare)
  // =====================================================================
  const ICON = (n) => `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/${n}.png`;
  const HEROES = {
    windranger: { name: "风行者", look: "hero_windrunner", ranged: true, proj: "arrow", hp: 620, dmg: 32, rate: 1.4, range: 110, arm: 2, spd: 62,
      sk: [["windrunner_shackleshot", "束缚击", 10, "击晕最近的两个敌人"], ["windrunner_powershot", "强力击", 9, "向前穿透一排敌人"], ["windrunner_windrun", "风行", 14, "加速并闪避80%伤害"], ["windrunner_focusfire", "集中火力", 40, "8秒攻速×3（6级）"]] },
    storm: { name: "风暴之灵", look: "hero_storm_spirit", ranged: true, proj: "spark", hp: 660, dmg: 30, rate: 1.3, range: 92, arm: 3, spd: 60,
      sk: [["storm_spirit_static_remnant", "残影", 4, "周围范围电击"], ["storm_spirit_electric_vortex", "电子漩涡", 12, "把敌人拉过来并击晕"], ["storm_spirit_overload", "超负荷", 0, "被动：放技能后下一击范围伤害"], ["storm_spirit_ball_lightning", "球状闪电", 8, "化身闪电冲过敌阵（6级）"]] },
    axe: { name: "斧王", look: "hero_axe", ranged: false, hp: 1150, dmg: 46, rate: 1.0, range: 18, arm: 6, spd: 56,
      sk: [["axe_berserkers_call", "狂战士之吼", 12, "嘲讽周围敌人，护甲+20"], ["axe_battle_hunger", "战斗饥渴", 10, "5个敌人持续掉血并减速"], ["axe_counter_helix", "反击螺旋", 0, "被动：被打时概率转圈砍"], ["axe_culling_blade", "淘汰之刃", 30, "斩杀残血敌人（6级）"]] },
    magnus: { name: "马格纳斯", look: "hero_magnataur", ranged: false, hp: 1050, dmg: 50, rate: 0.9, range: 18, arm: 5, spd: 56,
      sk: [["magnataur_shockwave", "震荡波", 8, "向前一道冲击波"], ["magnataur_empower", "授予力量", 18, "全体友军攻击+30%并溅射"], ["magnataur_skewer", "巨角冲撞", 12, "向前冲撞，带走敌人"], ["magnataur_reverse_polarity", "两极反转", 45, "把周围敌人全吸过来击晕（6级）"]] },
  };

  // nemici del Dire
  const EN = {
    dmelee: { name: "夜魇近战兵", hp: 260, dmg: 18, arm: 2, rate: 1, range: 14, spd: 26, gold: 12, minW: 1, cost: 1 },
    dranged: { name: "夜魇远程兵", hp: 180, dmg: 22, arm: 0, rate: 0.9, range: 86, spd: 26, gold: 14, proj: "green", minW: 1, cost: 1.3 },
    kobold: { name: "狗头人", hp: 140, dmg: 12, arm: 0, rate: 1.2, range: 12, spd: 40, gold: 7, minW: 1, cost: 0.6 },
    wolf: { name: "狼", hp: 320, dmg: 24, arm: 1, rate: 1.3, range: 14, spd: 58, gold: 16, minW: 2, cost: 1.5 },
    centaur: { name: "半人马", hp: 950, dmg: 50, arm: 4, rate: 0.75, range: 18, spd: 30, gold: 40, minW: 3, cost: 4 },
    siege: { name: "攻城车", hp: 520, dmg: 70, arm: 0, rate: 0.33, range: 140, spd: 18, gold: 30, proj: "rock", splash: 26, minW: 4, cost: 4 },
    ogre: { name: "食人魔", hp: 1150, dmg: 55, arm: 3, rate: 0.7, range: 18, spd: 24, gold: 45, minW: 4, cost: 5 },
    golem: { name: "岩石傀儡", hp: 1900, dmg: 85, arm: 6, rate: 0.55, range: 20, spd: 18, gold: 80, minW: 6, cost: 8 },
    dragon: { name: "远古黑龙", hp: 2100, dmg: 75, arm: 4, rate: 0.6, range: 100, spd: 28, gold: 110, proj: "fire", splash: 22, fly: true, minW: 7, cost: 11 },
    roshan: { name: "肉山", hp: 9000, dmg: 170, arm: 12, rate: 0.6, range: 24, spd: 18, gold: 600, boss: true },
  };
  // creep del Radiant evocabili (per livello della caserma)
  const ALLY = {
    melee: { name: "近战兵", cost: 45, hp: 320, dmg: 20, arm: 2, rate: 1, range: 14, spd: 32 },
    ranged: { name: "远程兵", cost: 55, hp: 210, dmg: 24, arm: 0, rate: 0.9, range: 92, spd: 32, proj: "magic" },
  };
  const LV = [{ hp: 1, dmg: 1, arm: 0, name: "" }, { hp: 1.7, dmg: 1.6, arm: 3, name: "超级" }, { hp: 2.8, dmg: 2.5, arm: 6, name: "超级巨型" }];
  const BARRACKS_COST = [0, 400, 1200];
  const allySet = (kind) => (S.barracks >= 2 ? SET[kind === "melee" ? "rmegam" : "rmegar"] : SET[kind === "melee" ? "rmelee" : "rranged"]);
  const SNAIL = { name: "蜗牛大神", cost: 350, hp: 1800, dmg: 75, arm: 8, rate: 1.6, range: 18, spd: 50, life: 45, cd: 70 };
  const ITEMS = {
    blades_of_attack: { name: "攻击之爪", cost: 150, desc: "攻击力+12", dmg: 12 },
    chainmail: { name: "锁子甲", cost: 180, desc: "护甲+6", arm: 6 },
    gloves: { name: "加速手套", cost: 200, desc: "攻速+25%", as: 0.25 },
    ancient_janggo: { name: "韧鼓", cost: 450, desc: "光环：友军攻速+15%、移速+15%", aura: { as: 0.15, ms: 0.15 } },
    vladmir: { name: "祭品", cost: 600, desc: "光环：友军攻击+20%、吸血15%", aura: { dmgp: 0.2, ls: 0.15 } },
    assault: { name: "强袭胸甲", cost: 1400, desc: "自身护甲+10；光环：友军护甲+5、攻速+20%", arm: 10, aura: { arm: 5, as: 0.2 } },
    greater_crit: { name: "代达罗斯之殇", cost: 1300, desc: "30%几率2.25倍暴击", crit: 0.3 },
    heart: { name: "恐鳌之心", cost: 1500, desc: "生命+600，每秒回复2%", hp: 600, regen: 0.02 },
  };

  // =====================================================================
  //  BATTUTE (dal sito)
  // =====================================================================
  const JIN = {
    start: ["这把我超凡操作", "中路是我的，你们别抢", "看我KDA就完事了", "这就是传说中的中单之王"],
    kill: ["中路反补了60刀", "看到没？这就是实力", "我一出手对面就打字GG", "又是我MVP"],
    hurt: ["队友呢？？", "这把被针对了", "系统局！", "辅助不插眼的吗"],
    die: ["系统局！队友太菜了", "这把不算，网卡了", "我这是战术性死亡"],
    lvl: ["又升级了，超凡指日可待", "等级压制懂不懂", "这经验我先吃了"],
  };
  const SNAIL_LINES = ["干干干！", "今晚通宵！", "大金神？我中路虐过", "这把我来带", "别怂，冲！"];
  const SNAIL_BYE = "我先下了，明天还要上班……";
  const PDS = ["大P神：小金金，守住基地", "大P神：这波再送就锤你", "大P神：小金金，别吹了，好好打", "大P神：笑死我了，又来一波"];

  // =====================================================================
  //  STATO
  // =====================================================================
  let S, HD;
  function reset(heroKey) {
    HD = HEROES[heroKey];
    S = {
      t: 0, gold: 180, wave: 0, nextWave: 12, queue: [], kills: 0, over: false, barracks: 0, snailCd: 0,
      ancient: { hp: 4000, max: 4000, arm: 12, flash: 0 },
      hero: makeUnit("hero", { ...HD, look: HD.look }, 130, 4), units: [], proj: [], parts: [], texts: [], fx: [], items: [], empower: 0,
    };
    const h = S.hero; h.mmr = 3150; h.lvl = 2; h.xp = 0; h.cds = [0, 0, 0, 0]; h.buffs = {}; h.respawn = 0; h.overload = false; h.mx = 0;
    say(h, pick(JIN.start)); renderShop(); hud(true);
  }
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  function makeUnit(team, d, x, lane, extra = {}) {
    return { team, d, x, lane, hp: d.hp, max: d.hp, cd: rnd(0, 0.5), anim: "walk", at: 0, frame: rnd(0, 4), face: team === "enemy" ? -1 : 1, flash: 0, stun: 0, slow: 0, dot: 0, taunt: 0, bubble: null, dead: 0, ...extra };
  }

  // statistiche con oggetti e aure
  const auras = () => S.items.reduce((a, k) => { const au = ITEMS[k].aura; if (au) for (const [s, v] of Object.entries(au)) a[s] = (a[s] || 0) + v; return a; }, {});
  function stat(u, k) {
    const au = u.team === "enemy" ? {} : auras();
    let v = u.d[k] || 0;
    if (u.team === "hero") {
      const it = S.items.map((i) => ITEMS[i]), lvl = u.lvl - 1;
      if (k === "dmg") v = v + lvl * 3 + it.reduce((t, i) => t + (i.dmg || 0), 0);
      if (k === "arm") v = v + lvl * 0.5 + it.reduce((t, i) => t + (i.arm || 0), 0) + (u.buffs.call > 0 ? 20 : 0);
      if (k === "rate") v = v * (1 + it.reduce((t, i) => t + (i.as || 0), 0)) * (u.buffs.focus > 0 ? 3 : 1);
      if (k === "spd") v = v * (u.buffs.windrun > 0 ? 1.6 : 1);
    }
    if (u.team !== "enemy") {
      if (k === "dmg") v *= 1 + (au.dmgp || 0) + (S.empower > 0 ? 0.3 : 0);
      if (k === "rate") v *= 1 + (au.as || 0);
      if (k === "arm") v += au.arm || 0;
      if (k === "spd") v *= 1 + (au.ms || 0);
    }
    if (k === "spd" && u.slow > 0) v *= 0.55;
    return v;
  }
  const armorMul = (a) => 1 - (0.06 * a) / (1 + 0.06 * Math.abs(a)); // formula di Dota
  const feetY = (u) => GY - 4 + u.lane;
  const isFly = (u) => !!u.d.fly;

  // =====================================================================
  //  EFFETTI
  // =====================================================================
  const text = (x, y, t, col, big) => S.texts.push({ x, y, t, col, life: 1, big });
  function burst(x, y, cols, n, spd = 60, g = 120) { for (let i = 0; i < n; i++) S.parts.push({ x, y, vx: rnd(-spd, spd), vy: rnd(-spd * 1.3, spd * 0.2), g, life: rnd(0.3, 0.7), col: cols[i % cols.length], s: i % 5 ? 1 : 2 }); }
  function say(u, line, sec = 2.6) { u.bubble = { t: line, life: sec }; }
  function banner(t, sub) { const b = $("banner"); b.innerHTML = t + (sub ? `<small>${sub}</small>` : ""); b.classList.remove("show"); void b.offsetWidth; b.classList.add("show"); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove("show"), 2600); }

  // =====================================================================
  //  DANNI
  // =====================================================================
  function hurt(u, dmg, from, opts = {}) {
    if (!u || u.dead || u.hp <= 0) return 0;
    if (u.team === "hero" && u.buffs.windrun > 0 && Math.random() < 0.8) { text(u.x, feetY(u) - 40, "闪避", "#9ad8ff"); return 0; }
    if (u.team === "hero" && u.buffs.ball > 0) return 0;
    const real = Math.max(1, Math.round(dmg * (opts.pure ? 1 : armorMul(stat(u, "arm")))));
    u.hp -= real; u.flash = 0.08; u.hitT = S.t; u.hitDir = from ? (Math.sign(u.x - from.x) || 1) : (u.team === "enemy" ? 1 : -1);
    if (opts.show !== false && (u.team === "enemy" ? real >= 40 : u.team === "hero")) text(u.x, feetY(u) - (u.d.boss ? 70 : 38), "-" + real, u.team === "enemy" ? "#ffd06a" : "#ff6a5a", opts.crit);
    burst(u.x, feetY(u) - 14, u.team === "enemy" && (u.type === "golem") ? ["#8a8f99"] : ["#9a1414", "#c02424"], 3, 40);
    // lifesteal (祭品)
    const ls = from && from.team !== "enemy" ? auras().ls || 0 : 0;
    if (ls && from.hp > 0) from.hp = Math.min(from.max, from.hp + real * ls);
    // spirale di Axe: quando lo colpiscono
    if (u.team === "hero" && HD === HEROES.axe && from && Math.random() < 0.2) { for (const e of S.units) if (e.team === "enemy" && Math.abs(e.x - u.x) < 42) hurt(e, 120 + u.lvl * 8, u, { pure: true }); S.fx.push({ k: "spin", x: u.x, y: feetY(u) - 16, life: 0.3 }); }
    if (u.team === "hero" && u.hp < u.max * 0.3 && !u.saidHurt) { u.saidHurt = 1; say(u, pick(JIN.hurt)); }
    if (u.hp <= 0) kill(u, from);
    return real;
  }
  function kill(u, from) {
    if (u.team === "hero") {
      u.respawn = 10; u.hp = 0; u.mmr = Math.max(0, u.mmr - 50); say(u, pick(JIN.die), 3); banner("大金神阵亡 · -50 MMR", "10秒后复活 · " + pick(JIN.die));
      return;
    }
    u.dead = 0.9; u.deadDir = u.hitDir || (u.team === "enemy" ? 1 : -1);
    burst(u.x, feetY(u) - 4, ["#8a7a62", "#b8a888", "#5a4a3a"], u.d.boss ? 18 : 8, 30, 60);
    if (u.team === "enemy") {
      S.gold += u.d.gold; S.kills++; text(u.x, feetY(u) - 30, "+" + u.d.gold + "金", "#fde047");
      burst(u.x, feetY(u) - 10, ["#fde047", "#ffb03a"], 4, 40);
      gainXp(u.d.gold * 2);
      if (u.d.boss) { banner("击杀肉山！", "+600金 · 大P神：小金金这次没送"); S.ancient.hp = Math.min(S.ancient.max, S.ancient.hp + 1500); }
      if (from && from.team === "hero" && Math.random() < 0.12) say(from, pick(JIN.kill));
    }
  }
  // progressione in MMR (come la classificata di Dota 2): ogni 100 MMR = un "livello" di statistiche
  const RANKS = [["先锋", 0], ["卫士", 770], ["中军", 1540], ["统帅", 2310], ["传奇", 3080], ["万古流芳", 3850], ["超凡入圣", 4620], ["冠绝一世", 5420]];
  function rankOf(m) { let t = 0; RANKS.forEach((r, i) => { if (m >= r[1]) t = i; }); const star = t >= 7 ? 0 : Math.min(5, Math.floor((m - RANKS[t][1]) / 154) + 1); return { tier: t + 1, star, name: RANKS[t][0] + (star ? star : "") }; }
  const lvlOf = (m) => clamp(1 + Math.floor((m - 3000) / 100), 1, 25); // 3150 = 传奇1 (Lv2), 3500 = 传奇3 (Lv6, ultimate)
  function gainXp(x) {
    const h = S.hero, before = rankOf(h.mmr).name; h.mmr += Math.max(1, Math.round(x / 4));
    const nl = lvlOf(h.mmr);
    while (h.lvl < nl) { h.lvl++; const r = h.hp / h.max; h.max = Math.round((HD.hp + (S.items.includes("heart") ? 600 : 0)) * (1 + (h.lvl - 1) * 0.08)); h.hp = h.max * r; burst(h.x, feetY(h) - 20, ["#fde047", "#fff6c8"], 14); if (h.lvl === 6) banner("传奇3！大招解锁", "大金神：超凡指日可待"); }
    const after = rankOf(h.mmr).name; if (after !== before) { text(h.x, feetY(h) - 58, "上分！" + after, "#fde047", true); if (Math.random() < 0.6) say(h, pick(JIN.lvl)); }
  }

  // =====================================================================
  //  ONDATE
  // =====================================================================
  function startWave() {
    S.wave++; const w = S.wave;
    let budget = 4 + w * 2.6; const list = ["dmelee", "dmelee", "dranged"];
    const pool = Object.entries(EN).filter(([, e]) => !e.boss && e.minW <= w);
    while (budget > 0) { const [k, e] = pool[Math.floor(Math.random() * pool.length)]; if (e.cost > budget + 1) { budget -= 0.5; continue; } list.push(k); budget -= e.cost; }
    if (w % 5 === 0) list.push("roshan");
    S.queue = list.map((k, i) => ({ k, at: S.t + i * 0.9 + rnd(0, 0.3) }));
    S.nextWave = 32;
    banner(`第 ${w} 波`, w % 5 === 0 ? "大P神：肉山来了，小金金别送！" : pick(PDS));
  }
  function spawnEnemy(k) {
    const e = EN[k], sc = 1 + (S.wave - 1) * 0.12, d = { ...e, hp: Math.round(e.hp * sc), dmg: Math.round(e.dmg * (1 + (S.wave - 1) * 0.06)), set: SET[k] };
    const u = makeUnit("enemy", d, W + 30 + rnd(0, 10), e.fly ? 2 : Math.floor(rnd(0, 10)), { type: k });
    S.units.push(u);
    if (e.boss) { say(u, "吼——！！", 3); S.shake = 4; }
  }
  function summon(kind) {
    const a = ALLY[kind], lv = LV[S.barracks];
    if (S.gold < a.cost) return flash("金币不够");
    if (S.units.filter((u) => u.team === "ally" && !u.snail).length >= 12) return flash("最多12个兵");
    S.gold -= a.cost;
    const d = { ...a, hp: Math.round(a.hp * lv.hp), dmg: Math.round(a.dmg * lv.dmg), arm: a.arm + lv.arm, set: allySet(kind) };
    const guard = kind === "melee" ? rnd(122, 150) : rnd(100, 116);
    const u = makeUnit("ally", d, ANC.front - 6, Math.floor(rnd(0, 10)), { kind, guard });
    S.units.push(u); burst(u.x, feetY(u) - 20, ["#fff6c8", "#7ae0a0"], 10, 30, 0); hud(true);
  }
  function summonSnail() {
    if (S.snailCd > 0) return flash(`蜗牛大神还在睡觉 ${Math.ceil(S.snailCd)}秒`);
    if (S.gold < SNAIL.cost) return flash("金币不够");
    S.gold -= SNAIL.cost; S.snailCd = SNAIL.cd;
    const u = makeUnit("ally", { ...SNAIL, set: SET.hero_nevermore }, ANC.front, 6, { snail: true, life: SNAIL.life, guard: 170 });
    S.units.push(u); say(u, "干干干！今晚通宵！", 3); banner("蜗牛大神来了！", "限时45秒 · 干干干！");
    burst(u.x, feetY(u) - 20, ["#93c5fd", "#ffffff"], 20, 50, 0); hud(true);
  }
  function upgradeBarracks() {
    if (S.barracks >= 2) return flash("已经是超级巨型兵了");
    const c = BARRACKS_COST[S.barracks + 1]; if (S.gold < c) return flash("金币不够");
    S.gold -= c; S.barracks++;
    for (const u of S.units) if (u.team === "ally" && !u.snail) { const a = ALLY[u.kind], lv = LV[S.barracks]; u.d = { ...a, hp: Math.round(a.hp * lv.hp), dmg: Math.round(a.dmg * lv.dmg), arm: a.arm + lv.arm, set: allySet(u.kind) }; u.max = u.d.hp; u.hp = u.max; }
    banner(`兵营升级：${LV[S.barracks].name}兵`, S.barracks === 2 ? "超级巨型兵出场！" : "超级兵出场！"); renderShop();
  }
  function buy(k) {
    const it = ITEMS[k]; if (S.items.includes(k)) return; if (S.items.length >= 6) return flash("物品栏满了");
    if (S.gold < it.cost) return flash("金币不够");
    S.gold -= it.cost; S.items.push(k);
    if (it.hp) { S.hero.max += it.hp; S.hero.hp += it.hp; }
    banner(`购买 ${it.name}`, it.desc); renderShop();
  }
  function flash(t) { const h = S.hero; text(h.x, feetY(h) - 52, t, "#ff9a9a"); }

  // =====================================================================
  //  ABILITÀ (Q W E R)
  // =====================================================================
  const enemies = () => S.units.filter((u) => u.team === "enemy" && !u.dead);
  const nearestEnemy = (x, range, ahead) => enemies().filter((e) => Math.abs(e.x - x) <= range && (!ahead || e.x >= x - 10)).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
  function cast(i) {
    const h = S.hero; if (h.respawn > 0 || h.stun > 0) return;
    const sk = HD.sk[i]; if (!sk[2]) return flash("被动技能");
    if (i === 3 && h.lvl < 6) return flash("MMR 3500（传奇3）解锁大招");
    if (h.cds[i] > 0) return;
    const ok = doSkill(i);
    if (ok === false) return flash("附近没有目标");
    h.cds[i] = sk[2]; h.anim = "cast"; h.at = 0.35;
    if (HD === HEROES.storm) h.overload = true;
  }
  function doSkill(i) {
    const h = S.hero, x = h.x, y = feetY(h) - 18, lvl = h.lvl;
    if (HD === HEROES.windranger) {
      if (i === 0) { const t = nearestEnemy(x, 170, true); if (!t) return false; const t2 = enemies().filter((e) => e !== t && e.x > t.x && e.x - t.x < 60)[0]; for (const e of [t, t2]) if (e) { e.stun = 2.5; hurt(e, 80 + lvl * 8, h); S.fx.push({ k: "chain", x1: t.x, x2: e.x, y: feetY(e) - 20, life: 2.5 }); } S.fx.push({ k: "beam", x1: x, x2: t.x, y, col: "#d8c8a0", life: 0.15 }); }
      if (i === 1) { let dmg = 220 + lvl * 18; for (const e of enemies().filter((e) => e.x > x && e.x < x + 260).sort((a, b) => a.x - b.x)) { hurt(e, dmg, h); dmg *= 0.88; } S.fx.push({ k: "beam", x1: x, x2: x + 260, y, col: "#e8fbff", life: 0.35, w: 3 }); }
      if (i === 2) { h.buffs.windrun = 4; burst(x, y, ["#e8fbff", "#9ad8ff"], 12, 40, 0); }
      if (i === 3) { h.buffs.focus = 8; text(x, y - 30, "集中火力!", "#9ae0a0", true); }
    }
    if (HD === HEROES.storm) {
      if (i === 0) { S.fx.push({ k: "remnant", x, y, life: 0.45 }); setTimeout(() => { for (const e of enemies()) if (Math.abs(e.x - x) < 62) hurt(e, 160 + lvl * 14, h, { pure: true }); S.fx.push({ k: "zap", x, y, life: 0.25, r: 62 }); }, 350); }
      if (i === 1) { const t = nearestEnemy(x, 180, false); if (!t) return false; if (!t.d.boss) t.x = x + 22; t.stun = 1.6; hurt(t, 60, h); S.fx.push({ k: "beam", x1: x, x2: t.x, y, col: "#9ad8ff", life: 0.6, w: 2 }); }
      if (i === 3) { h.buffs.ball = 0.6; const tx = clamp(x + 170, 110, W - 20); for (const e of enemies()) if (e.x > x && e.x < tx) hurt(e, 140 + lvl * 15, h, { pure: true }); S.fx.push({ k: "beam", x1: x, x2: tx, y, col: "#bfe8ff", life: 0.3, w: 5 }); h.x = tx; }
    }
    if (HD === HEROES.axe) {
      if (i === 0) { h.buffs.call = 2.6; let n = 0; for (const e of enemies()) if (Math.abs(e.x - x) < 80) { e.taunt = 2.4; n++; } if (!n) return false; text(x, y - 30, "过来！", "#ff5a3a", true); S.fx.push({ k: "zap", x, y, life: 0.3, r: 80, col: "#ff5a3a" }); }
      if (i === 1) { const ts = enemies().sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x)).slice(0, 5).filter((e) => Math.abs(e.x - x) < 220); if (!ts.length) return false; ts.forEach((e) => { e.dot = 8; e.slow = 8; }); }
      if (i === 3) { const lim = 400 + lvl * 40; const t = enemies().filter((e) => Math.abs(e.x - x) < 70).sort((a, b) => a.hp - b.hp)[0]; if (!t) return false; if (t.hp <= lim && !t.d.boss) { hurt(t, t.hp + 99, h, { pure: true }); text(t.x, feetY(t) - 50, "淘汰！", "#ff3a2a", true); h.cds[3] = -1; S.fx.push({ k: "slash", x: t.x, y: feetY(t) - 20, life: 0.3 }); } else hurt(t, 300, h, { pure: true }); }
    }
    if (HD === HEROES.magnus) {
      if (i === 0) { for (const e of enemies()) if (e.x > x && e.x < x + 260) { hurt(e, 160 + lvl * 14, h); e.slow = 2; } S.fx.push({ k: "wave", x, life: 0.6, y: feetY(h) }); }
      if (i === 1) { S.empower = 10; banner("授予力量！", "全体友军攻击+30%"); }
      if (i === 2) { const tx = clamp(x + 140, 110, W - 20), caught = enemies().filter((e) => e.x > x && e.x < tx && !e.d.boss && !isFly(e)); caught.forEach((e) => { e.x = tx + 10; hurt(e, 100 + lvl * 10, h); e.stun = 0.5; }); h.x = tx; S.fx.push({ k: "beam", x1: x, x2: tx, y: y + 6, col: "#d8c8b0", life: 0.25, w: 4 }); }
      if (i === 3) { const ts = enemies().filter((e) => Math.abs(e.x - x) < 130); if (!ts.length) return false; ts.forEach((e) => { if (!e.d.boss) e.x = x + 20 + rnd(-4, 4); e.stun = 3; hurt(e, 250 + lvl * 20, h); }); S.fx.push({ k: "zap", x, y, life: 0.5, r: 130, col: "#d8c8b0" }); S.shake = 5; text(x, y - 40, "两极反转!", "#ffd06a", true); }
    }
  }

  // =====================================================================
  //  UPDATE
  // =====================================================================
  const keys = {};
  function update(dt) {
    S.t += dt; if (S.over) return;
    S.nextWave -= dt; if (S.nextWave <= 0) startWave();
    while (S.queue.length && S.queue[0].at <= S.t) spawnEnemy(S.queue.shift().k);
    S.snailCd = Math.max(0, S.snailCd - dt); S.empower = Math.max(0, S.empower - dt); S.shake = Math.max(0, (S.shake || 0) - dt * 10);
    S.ancient.flash = Math.max(0, S.ancient.flash - dt);
    updateHero(dt);
    for (const u of S.units) updateUnit(u, dt);
    // separazione leggera sulla corsia
    S.units = S.units.filter((u) => !(u.dead && (u.dead -= dt) <= 0) || u.dead > 0);
    S.units = S.units.filter((u) => !u.dead || u.dead > 0);
    updateProj(dt);
    for (const p of S.parts) { p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.y > GY + 8) { p.y = GY + 8; p.vy *= -0.3; p.vx *= 0.6; } }
    S.parts = S.parts.filter((p) => p.life > 0);
    S.texts.forEach((t) => { t.life -= dt; t.y -= 16 * dt; }); S.texts = S.texts.filter((t) => t.life > 0);
    S.fx.forEach((f) => (f.life -= dt)); S.fx = S.fx.filter((f) => f.life > 0);
    for (const u of [S.hero, ...S.units]) if (u.bubble) { u.bubble.life -= dt; if (u.bubble.life <= 0) u.bubble = null; }
    hud();
  }

  function updateHero(dt) {
    const h = S.hero;
    for (const b in h.buffs) h.buffs[b] -= dt;
    h.cds = h.cds.map((c) => Math.max(0, c - dt)); h.flash = Math.max(0, h.flash - dt);
    if (h.respawn > 0) { h.respawn -= dt; if (h.respawn <= 0) { h.hp = h.max; h.x = ANC.front + 20; h.saidHurt = 0; say(h, "我回来了，这次认真打"); } return; }
    if (S.items.includes("heart")) h.hp = Math.min(h.max, h.hp + h.max * 0.02 * dt);
    if (h.hp > h.max * 0.5) h.saidHurt = 0;
    if (h.stun > 0) { h.stun -= dt; return; }
    const mx = (keys.d || keys.arrowright || h.mx > 0 ? 1 : 0) - (keys.a || keys.arrowleft || h.mx < 0 ? 1 : 0);
    if (mx) { h.x = clamp(h.x + mx * stat(h, "spd") * dt, ANC.front - 4, W - 12); h.face = mx; h.frame += dt * 8; h.anim = h.at > 0 ? h.anim : "walk"; }
    h.at = Math.max(0, h.at - dt);
    if (!mx && h.at <= 0) { h.anim = "idle"; }
    // attacco automatico
    h.cd -= dt;
    const t = nearestEnemy(h.x, stat(h, "range") + (HD.ranged ? 0 : 6), false);
    if (t && h.cd <= 0) {
      h.cd = 1 / stat(h, "rate"); h.face = t.x >= h.x ? 1 : -1; h.anim = "atk"; h.at = 0.35;
      let dmg = stat(h, "dmg"), crit = false;
      if (S.items.includes("greater_crit") && Math.random() < 0.3) { dmg *= 2.25; crit = true; }
      if (HD.ranged) shoot(h, t, dmg, HD.proj, { crit });
      else { hurt(t, dmg, h, { crit }); if (S.empower > 0) for (const e of enemies()) if (e !== t && Math.abs(e.x - t.x) < 26) hurt(e, dmg * 0.5, h, { show: false }); S.fx.push({ k: "slash", x: t.x, y: feetY(t) - 20, life: 0.18 }); }
      if (h.overload) { h.overload = false; for (const e of enemies()) if (Math.abs(e.x - t.x) < 40) hurt(e, 80 + h.lvl * 6, h, { pure: true }); S.fx.push({ k: "zap", x: t.x, y: feetY(t) - 18, life: 0.2, r: 40 }); }
    }
  }

  function updateUnit(u, dt) {
    if (u.dead) return;
    u.flash = Math.max(0, u.flash - dt); u.slow = Math.max(0, u.slow - dt); u.taunt = Math.max(0, u.taunt - dt); u.at = Math.max(0, u.at - dt);
    if (u.dot > 0) { u.dot -= dt; hurt(u, 30 * dt * (1 + S.hero.lvl * 0.05), S.hero, { pure: true, show: false }); if (u.hp <= 0) return; }
    if (u.snail) { u.life -= dt; if (Math.random() < dt * 0.12) say(u, pick(SNAIL_LINES)); if (u.life <= 0) { u.dead = 0.6; say(u, SNAIL_BYE); burst(u.x, feetY(u) - 20, ["#93c5fd", "#ffffff"], 16, 40, 0); return; } }
    if (u.stun > 0) { u.stun -= dt; return; }
    u.cd -= dt;
    const range = u.d.range, h = S.hero;
    let target = null;
    if (u.team === "enemy") {
      // il nemico cerca: eroe (se provocato), unità alleate davanti, poi l'Antico
      const foes = [h.respawn > 0 ? null : h, ...S.units.filter((a) => a.team === "ally" && !a.dead)].filter(Boolean);
      if (u.taunt > 0 && h.respawn <= 0) target = h;
      else target = foes.filter((f) => Math.abs(f.x - u.x) <= range + 4 + (u.d.fly ? 0 : 0)).sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x))[0];
      if (u.d.proj === "rock") target = null; // l'assedio punta all'Antico e ai soldati più vicini sulla strada
      if (!target && u.x - ANC.front <= range) target = "ancient";
      if (u.d.proj === "rock" && !target) target = S.units.filter((a) => a.team === "ally" && !a.dead && u.x - a.x < range && a.x < u.x)[0] || null;
      if (!target) {
        // blocco: non attraversa gli alleati in mischia
        const block = foes.find((f) => f.x < u.x && u.x - f.x < 16 && Math.abs((f.lane || 0) - u.lane) < 99);
        if (!block && !u.d.fly) { u.x -= stat(u, "spd") * dt; u.anim = "walk"; u.frame += dt * stat(u, "spd") / 6; }
        else if (u.d.fly) { u.x -= stat(u, "spd") * dt; u.anim = "walk"; u.frame += dt * 6; }
        else target = block;
      }
    } else {
      // alleati: difendono la loro posizione davanti all'Antico
      const aggro = range > 30 ? range : 70;
      target = enemies().filter((e) => e.x >= u.x - 20 && Math.abs(e.x - u.x) <= aggro).sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x))[0];
      if (target && Math.abs(target.x - u.x) > range + 2) { const dir = Math.sign(target.x - u.x); u.x += dir * stat(u, "spd") * dt; u.face = dir; u.anim = "walk"; u.frame += dt * 6; target = null; }
      else if (!target) { const dx = u.guard - u.x; if (Math.abs(dx) > 2) { u.x += Math.sign(dx) * stat(u, "spd") * dt; u.face = Math.sign(dx); u.anim = "walk"; u.frame += dt * 6; } else { u.face = 1; if (u.at <= 0) u.anim = "idle"; } }
    }
    if (target && u.cd <= 0) {
      u.cd = 1 / stat(u, "rate"); u.anim = "atk"; u.at = 0.35;
      const tx = target === "ancient" ? ANC.front : target.x; u.face = tx >= u.x ? 1 : -1;
      const dmg = stat(u, "dmg");
      if (u.d.proj) shoot(u, target, dmg, u.d.proj);
      else if (target === "ancient") hurtAncient(dmg);
      else { hurt(target, dmg, u); if (u.team !== "enemy" && S.empower > 0) for (const e of enemies()) if (e !== target && Math.abs(e.x - target.x) < 24) hurt(e, dmg * 0.4, u, { show: false }); }
    } else if (target && u.at <= 0) u.anim = "idle";
  }
  function hurtAncient(dmg) {
    const a = S.ancient, real = Math.max(1, Math.round(dmg * armorMul(a.arm)));
    a.hp -= real; a.flash = 0.1; burst(ANC.x + 10, ANC.y - 40, ["#e6fff0", "#7ae0a0"], 3, 50);
    if (a.hp <= 0 && !S.over) gameOver();
  }

  // ---------- proiettili ----------
  const PROJ = { arrow: { col: "#e8e0c8", spd: 300, kind: "arrow" }, spark: { col: "#9ad8ff", core: "#ffffff", spd: 260 }, magic: { col: "#7ad0ff", core: "#e6fbff", spd: 220 },
    green: { col: "#8aff5a", core: "#e8ffd0", spd: 200 }, rock: { col: "#8a8f99", spd: 160, arc: 40 }, fire: { col: "#ff8a2a", core: "#fff0a0", spd: 200 } };
  function shoot(u, target, dmg, kind, extra = {}) {
    const sx = u.x + u.face * 10, sy = feetY(u) - (u.d.fly ? 50 : 24);
    S.proj.push({ x: sx, y: sy, sx, sy, from: u, target, dmg, kind, t: 0, splash: u.d.splash, ...extra });
  }
  function updateProj(dt) {
    for (const p of S.proj) {
      const P = PROJ[p.kind];
      const tx = p.target === "ancient" ? ANC.x + 16 : p.target.x, ty = p.target === "ancient" ? ANC.y - 40 : feetY(p.target) - (p.target.d.fly ? 40 : 18);
      if (p.target !== "ancient" && (p.target.dead || p.target.hp <= 0 || (p.target.team === "hero" && p.target.respawn > 0))) { p.done = true; continue; }
      const d = Math.hypot(tx - p.x, ty - p.y), step = P.spd * dt;
      p.ang = Math.atan2(ty - p.y, tx - p.x);
      if (d <= step + 3) { p.done = true; impact(p, tx, ty); continue; }
      p.x += Math.cos(p.ang) * step; p.y += Math.sin(p.ang) * step;
      if (P.core && Math.random() < 0.6) S.parts.push({ x: p.x, y: p.y, vx: 0, vy: 0, g: 0, life: 0.15, col: P.col, s: 1 });
    }
    S.proj = S.proj.filter((p) => !p.done);
  }
  function impact(p, x, y) {
    if (p.target === "ancient") hurtAncient(p.dmg); else hurt(p.target, p.dmg, p.from, { crit: p.crit });
    if (p.crit) text(x, y - 18, "暴击!", "#ff5a3a", true);
    if (p.splash) { const foes = p.from.team === "enemy" ? [S.hero, ...S.units.filter((u) => u.team === "ally")] : enemies(); for (const f of foes) if (f !== p.target && !f.dead && f.hp > 0 && Math.abs(f.x - x) < p.splash) hurt(f, p.dmg * 0.6, p.from, { show: false }); burst(x, y, p.kind === "rock" ? ["#8a8f99", "#5a5e68"] : ["#fff0a0", "#ff8a2a", "#d8402a"], 14, 70); S.shake = Math.max(S.shake || 0, 1.5); }
    else burst(x, y, [PROJ[p.kind].core || "#fff", PROJ[p.kind].col], 4, 30, 0);
  }
  function gameOver() {
    S.over = true; S.ancient.hp = 0;
    let best = 0; try { best = Math.max(+localStorage.getItem("g2:best") || 0, S.wave); localStorage.setItem("g2:best", best); } catch {}
    $("over-text").innerHTML = `大金神（${HD.name}）守到第 <b>${S.wave}</b> 波 · 击杀 <b>${S.kills}</b><br>最佳纪录：第 ${best} 波<br><span style="color:#ff9a6a">大金神：系统局！这把不算！</span>`;
    $("over").hidden = false;
  }

  // =====================================================================
  //  DISEGNO
  // =====================================================================
  function frameOf(u) {
    const set = u.d.set || SET[HD.look], R = u.face >= 0;
    if (u.team === "ally" && S.barracks === 1 && !u.snail) return R ? set.gold : set.goldL;
    return R ? set.R : set.L;
  }
  // animazione a trasformazioni: ritorna spostamento, rotazione e squash/stretch (pivot ai piedi)
  const ATK_T = 0.35;
  function pose(u) {
    const f = u.face >= 0 ? 1 : -1, o = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, swing: -1 };
    if (u.anim === "atk" && u.at > 0) {
      const p = 1 - u.at / ATK_T; // 0..1
      if (p < 0.45) { const k = p / 0.45; o.dx = -2.5 * k * f; o.rot = -0.12 * k * f; o.sy = 1 + 0.06 * k; o.sx = 1 - 0.04 * k; } // carica: indietro e allungato
      else if (p < 0.7) { const k = (p - 0.45) / 0.25; o.dx = (-2.5 + 7.5 * k) * f; o.rot = (-0.12 + 0.3 * k) * f; o.sy = 1.06 - 0.16 * k; o.sx = 0.96 + 0.14 * k; o.swing = k; } // affondo: schiacciato in avanti
      else { const k = (p - 0.7) / 0.3; o.dx = 5 * (1 - k) * f; o.rot = 0.18 * (1 - k) * f; o.sy = 0.9 + 0.1 * k; o.sx = 1.1 - 0.1 * k; } // ritorno
    } else if (u.anim === "cast" && u.at > 0) {
      const p = 1 - u.at / ATK_T; o.dy = -Math.sin(p * Math.PI) * 5; o.sy = 1 + Math.sin(p * Math.PI) * 0.08; o.sx = 1 - Math.sin(p * Math.PI) * 0.05; o.rot = -0.08 * f * Math.sin(p * Math.PI);
    } else if (u.anim === "walk") {
      const ph = u.frame * 1.6; // passo: dondolio + rimbalzo + squash all'appoggio
      o.dy = -Math.abs(Math.sin(ph)) * 2.2; o.rot = Math.sin(ph) * 0.07 + 0.04 * f; const land = 1 - Math.abs(Math.sin(ph)); o.sy = 1 - land * 0.05; o.sx = 1 + land * 0.04;
    } else { const b = Math.sin(S.t * 2.4 + u.x * 0.37); o.sy = 1 + b * 0.025; o.sx = 1 - b * 0.012; } // respiro
    // contraccolpo quando viene colpito
    const age = u.hitT != null ? S.t - u.hitT : 9;
    if (age < 0.16 && !u.d.boss) { const k = 1 - age / 0.16; o.dx += (u.hitDir || 1) * 3 * k; o.rot += (u.hitDir || 1) * 0.1 * k; }
    return o;
  }
  function draw() {
    g.save();
    if (S.shake) g.translate(Math.round(rnd(-S.shake, S.shake)), Math.round(rnd(-S.shake, S.shake)));
    g.drawImage(bg, 0, 0);
    // Antico con alone
    const pulse = 0.5 + Math.sin(S.t * 2) * 0.15;
    g.globalCompositeOperation = "lighter"; const gr = g.createRadialGradient(ANC.x, ANC.y - 70, 4, ANC.x, ANC.y - 70, 60); gr.addColorStop(0, `rgba(180,255,210,${0.35 * pulse})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(ANC.x - 60, ANC.y - 130, 120, 120); g.globalCompositeOperation = "source-over";
    if (ancientImg) { if (S.ancient.flash > 0) g.globalAlpha = 0.6; g.drawImage(ancientImg, ANC.x - (ancientImg.width >> 1), ANC.y - ancientImg.height + 6); g.globalAlpha = 1; }
    for (let k = 0; k < 3; k++) { const a = S.t * 1.5 + k * 2.1; g.fillStyle = "#fff6b0"; g.fillRect(Math.round(ANC.x + Math.cos(a) * 26), Math.round(ANC.y - 74 + Math.sin(a) * 10), 2, 2); }
    // effetti a terra
    for (const f of S.fx) if (f.k === "wave") { const p = 1 - f.life / 0.6, x = f.x + p * 260; g.fillStyle = "rgba(216,200,176,.8)"; for (let k = 0; k < 6; k++) g.fillRect(Math.round(x - k * 6), f.y - 2 - (k % 3) * 3, 4, 3); }
    // unità ordinate per corsia
    const all = [...S.units]; if (S.hero.respawn <= 0) all.push(S.hero);
    all.sort((a, b) => a.lane - b.lane + (isFly(a) - isFly(b)) * 50);
    for (const u of all) drawUnit(u);
    // proiettili
    for (const p of S.proj) {
      const P = PROJ[p.kind], x = Math.round(p.x), y = Math.round(p.y);
      if (P.kind === "arrow") { g.fillStyle = P.col; for (let k = 0; k < 7; k++) g.fillRect(Math.round(x - Math.cos(p.ang) * k), Math.round(y - Math.sin(p.ang) * k), 1, 1); g.fillStyle = "#fff"; g.fillRect(x, y, 1, 1); }
      else { g.fillStyle = P.col; g.fillRect(x - 2, y - 2, 4, 4); g.fillStyle = P.core || P.col; g.fillRect(x - 1, y - 1, 2, 2); }
    }
    // effetti
    for (const f of S.fx) {
      if (f.k === "beam") { g.globalAlpha = Math.min(1, f.life * 5); g.fillStyle = f.col; g.fillRect(Math.min(f.x1, f.x2), Math.round(f.y - (f.w || 1) / 2), Math.abs(f.x2 - f.x1), f.w || 1); g.globalAlpha = 1; }
      if (f.k === "zap" || f.k === "remnant") { g.strokeStyle = f.col || "#9ad8ff"; g.globalAlpha = Math.min(1, f.life * 4); g.beginPath(); g.ellipse(f.x, f.y, (f.r || 18) * (f.k === "remnant" ? 0.3 : 1 - f.life), (f.r || 18) * 0.25, 0, 0, 7); g.stroke(); g.globalAlpha = 1; if (f.k === "remnant") { g.fillStyle = "rgba(154,216,255,.5)"; g.fillRect(f.x - 4, f.y - 14, 8, 22); } }
      if (f.k === "slash") { g.strokeStyle = "rgba(255,255,255,.9)"; g.beginPath(); g.arc(f.x, f.y, 10, -1.2, 0.6); g.stroke(); }
      if (f.k === "spin") { g.strokeStyle = "rgba(255,90,58,.9)"; g.beginPath(); g.ellipse(f.x, f.y, 40 * (1 - f.life * 2), 8, 0, 0, 7); g.stroke(); }
      if (f.k === "chain") { g.fillStyle = "#c9a060"; g.fillRect(Math.min(f.x1, f.x2), f.y, Math.abs(f.x2 - f.x1) || 1, 1); }
    }
    for (const p of S.parts) { g.fillStyle = p.col; g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
    // barre vita e nuvolette
    for (const u of all) {
      const im = frameOf(u), top = feetY(u) - im.height - (isFly(u) ? 30 : 0);
      if (u.hp < u.max || u.team === "hero") bar(u.x - 10, top - 4, u.d.boss ? 36 : 20, u.hp / u.max, u.team === "enemy" ? "#e23b3b" : u.team === "hero" ? "#5fd068" : "#7ae0a0");
      if (u.team === "hero") {
        const rk = rankOf(u.mmr), t1 = `大金神 · ${rk.name}`, t2 = `${u.mmr} MMR`, mi = MEDAL["i" + rk.tier], si = rk.star ? MEDAL["s" + rk.star] : null;
        g.font = "bold 8px sans-serif"; const tw = Math.max(g.measureText(t1).width, 40), ms = 20, bw = ms + 4 + tw + 6, bx = clamp(Math.round(u.x - bw / 2), 2, W - bw - 2), by = Math.round(top - 30);
        g.fillStyle = "rgba(10,8,16,.72)"; g.fillRect(bx, by, bw, 22); g.fillStyle = "#f2b632"; g.fillRect(bx, by, bw, 1); g.fillRect(bx, by + 21, bw, 1);
        if (mi && mi.complete && mi.naturalWidth) { g.imageSmoothingEnabled = true; g.drawImage(mi, bx + 1, by + 1, ms, ms); if (si && si.complete && si.naturalWidth) g.drawImage(si, bx + 1, by + 1, ms, ms); g.imageSmoothingEnabled = false; }
        g.textAlign = "left"; g.fillStyle = "#000"; g.fillText(t1, bx + ms + 5, by + 10); g.fillStyle = "#ffd76a"; g.fillText(t1, bx + ms + 4, by + 9);
        g.font = "bold 7px sans-serif"; g.fillStyle = "#000"; g.fillText(t2, bx + ms + 5, by + 19); g.fillStyle = "#cfe8ff"; g.fillText(t2, bx + ms + 4, by + 18); g.textAlign = "center";
      }
      if (u.snail) { g.font = "bold 7px sans-serif"; g.textAlign = "center"; g.fillStyle = "#000"; g.fillText(`蜗牛大神 ${Math.ceil(u.life)}s`, u.x + 1, top - 7); g.fillStyle = "#93c5fd"; g.fillText(`蜗牛大神 ${Math.ceil(u.life)}s`, u.x, top - 8); }
      if (u.bubble) bubble(u.x, top - (u.team === "hero" ? 36 : u.snail ? 22 : 12), u.bubble.t, u.snail ? "#93c5fd" : u.team === "hero" ? "#f2b632" : "#ff6a3a");
    }
    bar(ANC.x - 24, ANC.y - 116, 48, S.ancient.hp / S.ancient.max, "#7ae0a0");
    g.font = "bold 9px sans-serif"; g.textAlign = "center";
    for (const t of S.texts) { g.globalAlpha = Math.min(1, t.life * 2); g.font = t.big ? "bold 10px sans-serif" : "bold 7px sans-serif"; g.fillStyle = "#000"; g.fillText(t.t, Math.round(t.x) + 1, Math.round(t.y) + 1); g.fillStyle = t.col; g.fillText(t.t, Math.round(t.x), Math.round(t.y)); }
    g.globalAlpha = 1; g.restore();
  }
  function drawUnit(u) {
    const im = frameOf(u), set = u.d.set || SET[HD.look], R = u.face >= 0, fly = isFly(u) ? 30 + Math.sin(S.t * 3) * 3 : 0, fy = feetY(u), cx = Math.round(u.x);
    if (u.dead) { // caduta: si inclina all'indietro, affonda e svanisce
      const k = 1 - Math.max(0, u.dead) / 0.9, dir = u.deadDir || 1;
      g.save(); g.globalAlpha = Math.max(0, Math.min(1, u.dead * 1.6)); g.translate(cx + dir * k * 6, fy + k * 4 - fly * (1 - k));
      g.rotate(dir * Math.min(1, k * 1.8) * 1.45); g.scale(1, 1 - k * 0.15); g.drawImage(im, -(im.width >> 1), -im.height + 2);
      if (k < 0.25) { g.globalAlpha = 0.6 * (1 - k * 4); g.drawImage(R ? set.white : set.whiteL, -(im.width >> 1), -im.height + 2); }
      g.restore(); return;
    }
    const o = pose(u);
    g.fillStyle = "rgba(0,0,0,.32)"; g.beginPath(); g.ellipse(cx + o.dx * 0.5, fy, Math.max(8, im.width * 0.36) * (fly ? 0.7 : 1) * (1 - Math.min(0.3, -o.dy / 20)), 3, 0, 0, 7); g.fill();
    if (u.team === "hero" && u.buffs.ball > 0) { g.fillStyle = "rgba(170,220,255,.8)"; g.beginPath(); g.arc(u.x, fy - 18, 10, 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(u.x, fy - 18, 4 + Math.sin(S.t * 30), 0, 7); g.fill(); return; }
    // alone del cast
    if (u.anim === "cast" && u.at > 0) { const p = 1 - u.at / ATK_T; g.strokeStyle = `rgba(150,220,255,${0.9 * (1 - p)})`; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, fy - 1, 10 + p * 22, 3 + p * 6, 0, 0, 7); g.stroke(); g.lineWidth = 1; }
    // aura dorata permanente intorno a 大金神 per vederlo meglio
    if (u.team === "hero") { const a = 0.22 + Math.sin(S.t * 3) * 0.06, gr = g.createRadialGradient(cx, fy - im.height / 2, 4, cx, fy - im.height / 2, im.height * 0.62); gr.addColorStop(0, `rgba(255,214,110,${a})`); gr.addColorStop(1, "rgba(255,214,110,0)"); g.fillStyle = gr; g.fillRect(cx - im.height, fy - im.height * 1.2, im.height * 2, im.height * 1.3); }
    g.save(); g.translate(cx + o.dx, fy + 2 - fly + o.dy); g.rotate(o.rot); g.scale(o.sx, o.sy);
    const ox = -(im.width >> 1), oy = -im.height;
    if (u.team === "hero" && u.buffs.windrun > 0) { g.globalAlpha = 0.35; g.drawImage(im, ox - u.face * 6, oy); g.drawImage(im, ox - u.face * 12, oy); g.globalAlpha = 1; }
    if (u.team === "hero") { // contorno chiaro per staccarlo dallo sfondo
      g.globalAlpha = 0.9; const wh = R ? set.white : set.whiteL; for (const [ddx, ddy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(wh, ox + ddx, oy + ddy); g.globalAlpha = 1;
    }
    g.drawImage(im, ox, oy);
    const age = u.hitT != null ? S.t - u.hitT : 9;
    if (age < 0.1) { g.globalAlpha = 0.5 * (1 - age / 0.1); g.drawImage(R ? set.white : set.whiteL, ox, oy); g.globalAlpha = 1; } // lampo breve quando viene colpito
    const glow = (col, al) => { const gl = set.glow && set.glow[col]; if (!gl) return; g.globalCompositeOperation = "lighter"; g.globalAlpha = al; g.drawImage(gl[R ? 0 : 1], ox, oy); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; };
    if (u.team === "hero" && u.buffs.focus > 0) glow("#7aff9a", 0.3); else if (u.team !== "enemy" && S.empower > 0) glow("#ffd06a", 0.3);
    if (u.snail) glow("#93c5fd", 0.22 + Math.sin(S.t * 6) * 0.1);
    g.restore();
    // scia dell'arma (mischia) / lampo di sparo (distanza)
    if (o.swing >= 0) {
      const f = u.face >= 0 ? 1 : -1, r = Math.max(12, im.height * 0.42), hx = cx + f * im.width * 0.18, hy = fy - im.height * 0.5;
      if (!u.d.ranged && !(u.team === "hero" && HD.ranged)) {
        g.strokeStyle = `rgba(255,255,255,${0.85 * (1 - o.swing * 0.6)})`; g.lineWidth = 2; g.beginPath();
        const a0 = f > 0 ? -1.3 : Math.PI + 1.3, a1 = f > 0 ? -1.3 + 2.2 * o.swing : Math.PI + 1.3 - 2.2 * o.swing; g.arc(hx, hy, r, Math.min(a0, a1), Math.max(a0, a1)); g.stroke();
        g.strokeStyle = `rgba(255,220,140,${0.5 * (1 - o.swing)})`; g.beginPath(); g.arc(hx, hy, r - 3, Math.min(a0, a1), Math.max(a0, a1)); g.stroke(); g.lineWidth = 1;
      } else if (o.swing < 0.5) { g.fillStyle = `rgba(255,240,180,${1 - o.swing * 2})`; g.beginPath(); g.arc(cx + f * im.width * 0.42, hy - 2, 3 + o.swing * 4, 0, 7); g.fill(); }
    }
    if (u.stun > 0) { g.fillStyle = "#ffe27a"; for (let k = 0; k < 3; k++) { const a = S.t * 6 + k * 2.1; g.fillRect(Math.round(u.x + Math.cos(a) * 8), Math.round(fy - im.height - 3 - fly + Math.sin(a) * 2), 2, 2); } }
    if (u.slow > 0 || u.dot > 0) { g.fillStyle = u.dot > 0 ? "rgba(255,70,50,.55)" : "rgba(122,208,255,.55)"; g.fillRect(cx - (im.width >> 1) + 4, fy - 3 - fly, im.width - 8, 2); }
  }
  function bar(x, y, w, p, col) { x = Math.round(x); y = Math.round(y); g.fillStyle = "#111"; g.fillRect(x - 1, y - 1, w + 2, 4); g.fillStyle = "#3a1010"; g.fillRect(x, y, w, 2); g.fillStyle = col; g.fillRect(x, y, Math.max(1, Math.round(w * clamp(p, 0, 1))), 2); }
  function bubble(x, y, t, col) {
    g.font = "bold 8px sans-serif"; const w = g.measureText(t).width + 10, bx = clamp(Math.round(x - w / 2), 2, W - w - 2), by = Math.round(y - 12);
    g.fillStyle = "#fff"; g.strokeStyle = col; g.lineWidth = 1;
    g.beginPath(); g.roundRect ? g.roundRect(bx + 0.5, by + 0.5, w, 12, 4) : g.rect(bx + 0.5, by + 0.5, w, 12); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(clamp(x, bx + 4, bx + w - 4) - 3, by + 12.5); g.lineTo(clamp(x, bx + 4, bx + w - 4), by + 17); g.lineTo(clamp(x, bx + 4, bx + w - 4) + 3, by + 12.5); g.fill();
    g.fillStyle = "#111"; g.textAlign = "center"; g.fillText(t, bx + w / 2, by + 9);
  }

  // =====================================================================
  //  HUD / NEGOZIO
  // =====================================================================
  let lastKey = "";
  function hud(force) {
    const h = S.hero;
    const key = [S.gold, Math.ceil(S.ancient.hp), Math.ceil(h.hp), h.max, h.mmr, S.wave, Math.ceil(S.nextWave), h.cds.map(Math.ceil).join(","), Math.ceil(S.snailCd), S.barracks, h.respawn > 0 ? Math.ceil(h.respawn) : 0].join("|");
    if (key === lastKey && !force) return; lastKey = key;
    $("gold").textContent = S.gold; $("wave").textContent = S.wave; $("next").textContent = Math.ceil(S.nextWave);
    $("anc").style.width = (S.ancient.hp / S.ancient.max) * 100 + "%"; $("anc-t").textContent = `${Math.max(0, Math.ceil(S.ancient.hp))}/${S.ancient.max}`;
    $("hp").style.width = Math.max(0, h.hp / h.max) * 100 + "%"; $("hp-t").textContent = h.respawn > 0 ? `复活 ${Math.ceil(h.respawn)}` : `${Math.ceil(h.hp)}/${h.max}`;
    const rk = rankOf(h.mmr); $("mmr").textContent = h.mmr; $("rank").textContent = rk.name;
    $("medal").src = `https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_${rk.tier}.png`; $("star").src = rk.star ? `https://www.opendota.com/assets/images/dota2/rank_icons/rank_star_${rk.star}.png` : ""; $("star").hidden = !rk.star;
    document.querySelectorAll(".skill").forEach((b, i) => { const cd = h.cds[i], locked = i === 3 && h.lvl < 6; b.classList.toggle("cd", cd > 0 || locked); b.querySelector(".cdn").textContent = locked ? "传奇3" : cd > 0 ? Math.ceil(cd) : ""; });
    document.querySelectorAll("[data-buy]").forEach((b) => { const k = b.dataset.buy, it = ITEMS[k]; b.classList.toggle("poor", S.gold < it.cost && !S.items.includes(k)); b.classList.toggle("own", S.items.includes(k)); });
    $("sum-melee").classList.toggle("poor", S.gold < ALLY.melee.cost); $("sum-ranged").classList.toggle("poor", S.gold < ALLY.ranged.cost);
    $("sum-snail").classList.toggle("poor", S.gold < SNAIL.cost || S.snailCd > 0); $("snail-cd").textContent = S.snailCd > 0 ? Math.ceil(S.snailCd) + "s" : SNAIL.cost;
    $("upg").classList.toggle("poor", S.barracks >= 2 || S.gold < BARRACKS_COST[S.barracks + 1]);
    $("upg-cost").textContent = S.barracks >= 2 ? "满级" : BARRACKS_COST[S.barracks + 1];
  }
  function iconCanvas(set) { const c = document.createElement("canvas"); const im = set.R; c.width = im.width; c.height = im.height; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0); return c; }
  function renderShop() {
    const lvKey = S.barracks + 1;
    $("units").innerHTML = `
      <button class="slot" id="sum-melee"><i>1</i><span class="pic" data-pic="${S.barracks >= 2 ? "rmegam" : "rmelee"}"></span><b>${LV[S.barracks].name}近战兵</b><em>${ALLY.melee.cost}</em></button>
      <button class="slot" id="sum-ranged"><i>2</i><span class="pic" data-pic="${S.barracks >= 2 ? "rmegar" : "rranged"}"></span><b>${LV[S.barracks].name}远程兵</b><em>${ALLY.ranged.cost}</em></button>
      <button class="slot" id="upg"><i>U</i><span class="pic" data-pic="rmegam"></span><b>${S.barracks >= 2 ? "兵营满级" : "升级兵营 → " + LV[S.barracks + 1].name}</b><em id="upg-cost"></em></button>
      <button class="slot snail" id="sum-snail"><i>3</i><span class="pic" data-pic="hero_nevermore"></span><b>召唤蜗牛大神</b><em id="snail-cd"></em></button>`;
    $("shop").innerHTML = Object.entries(ITEMS).map(([k, it]) => `<button class="slot item" data-buy="${k}" title="${it.desc}"><img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${k}.png" alt=""><b>${it.name}</b><em>${it.cost}</em><small>${it.desc}</small></button>`).join("");
    $("inv").innerHTML = Array.from({ length: 6 }, (_, i) => S.items[i] ? `<img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${S.items[i]}.png" title="${ITEMS[S.items[i]].name}">` : `<span></span>`).join("");
    document.querySelectorAll("[data-pic]").forEach((s) => { s.appendChild(iconCanvas(SET[s.dataset.pic])); });
    $("sum-melee").onclick = () => summon("melee"); $("sum-ranged").onclick = () => summon("ranged"); $("sum-snail").onclick = summonSnail; $("upg").onclick = upgradeBarracks;
    document.querySelectorAll("[data-buy]").forEach((b) => (b.onclick = () => buy(b.dataset.buy)));
    hud(true);
  }
  function renderSkills() {
    $("skills").innerHTML = HD.sk.map((s, i) => `<button class="skill" title="${s[1]}：${s[3]}"><img src="${ICON(s[0])}" alt=""><i>${"QWER"[i]}</i><span class="cdn"></span><small>${s[1]}</small></button>`).join("");
    document.querySelectorAll(".skill").forEach((b, i) => (b.onclick = () => cast(i)));
  }

  // =====================================================================
  //  INPUT, AVVIO
  // =====================================================================
  addEventListener("keydown", (e) => {
    if (!S || !running) return; const k = e.key.toLowerCase(); keys[k] = true;
    const qi = "qwer".indexOf(k); if (qi >= 0) cast(qi);
    if (k === "1") summon("melee"); if (k === "2") summon("ranged"); if (k === "3") summonSnail(); if (k === "u") upgradeBarracks();
    if (k.startsWith("arrow")) e.preventDefault();
  });
  addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));
  for (const [id, dir] of [["left", -1], ["right", 1]]) { const b = $(id); const on = (e) => { e.preventDefault(); if (S) S.hero.mx = dir; }, off = () => { if (S && S.hero.mx === dir) S.hero.mx = 0; }; b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off); }
  function fit() { const maxW = Math.min(innerWidth - 16, 1500), maxH = innerHeight - 230, k = Math.min(maxW / W, maxH / H), s = k >= 2 ? Math.floor(k) : Math.max(1, k); cv.style.width = W * s + "px"; cv.style.height = H * s + "px"; }
  addEventListener("resize", fit); fit();

  let running = false;
  Promise.all([ready, ancP]).then(() => {
  $("pick").innerHTML = Object.entries(HEROES).map(([k, h]) => `<button class="hero" data-h="${k}"><span class="pic" data-hp="${h.look}"></span><b>${h.name}</b><small>${h.ranged ? "远程" : "近战"} · 生命${h.hp} · 攻击${h.dmg}</small><span class="abil">${h.sk.map((s) => `<img src="${ICON(s[0])}" title="${s[1]}：${s[3]}">`).join("")}</span></button>`).join("");
  document.querySelectorAll("[data-hp]").forEach((s) => s.appendChild(iconCanvas(SET[s.dataset.hp])));
  document.querySelectorAll(".hero").forEach((b) => (b.onclick = () => { $("intro").hidden = true; reset(b.dataset.h); renderSkills(); running = true; banner("大金神 · " + HD.name, "大P神：小金金，守住遗迹！"); }));
  $("again").onclick = () => { $("over").hidden = true; $("intro").hidden = false; running = false; };
  try { const b = +localStorage.getItem("g2:best"); if (b) $("best").textContent = `最佳纪录：第 ${b} 波`; } catch {}

  let last = performance.now();
  function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (running && !document.hidden) { update(dt); draw(); } requestAnimationFrame(loop); }
  reset("windranger"); renderSkills(); draw(); requestAnimationFrame(loop);
  });
  if (location.search.includes("debug")) window.__g2 = { get S() { return S; }, update, draw, startWave, summon, summonSnail, upgradeBarracks, buy, cast, spawnEnemy, reset };
})();
