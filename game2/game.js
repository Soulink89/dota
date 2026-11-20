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
  const bg = A.background(W, H, GY - 2, HILL), ancientImg = A.ancient();

  // =====================================================================
  //  ASPETTO DELLE UNITÀ
  // =====================================================================
  const LOOK = {
    windranger: { skin: "#f2c9a8", armor: "#3f7a3a", sleeve: "#3f7a3a", pants: "#5a4a2a", hair: "long", hairCol: "#c0392b", weapon: "bow", cape: "#2f6a3a", trim: "#d9b44a" },
    storm: { skin: "#4a7ad8", armor: "#3a5aa8", pants: "#2a3a6a", weapon: "lightning", scarf: "#c0302a", ears: true, headR: 6 },
    axe: { k: 1.15, skin: "#c0392b", armor: "#5a2a1a", pants: "#3a2a1a", hair: "topknot", hairCol: "#1a1a1a", weapon: "bigaxe", belly: 2, beard: "#1a1a1a" },
    magnus: { k: 1.15, skin: "#6a5a4a", armor: "#4a3a2a", pants: "#3a2a1a", weapon: "spear", horn: true, beard: "#d8d0c0", belly: 3 },
    snail: { k: 1.1, skin: "#f2c29b", armor: "#5a8ad8", sleeve: "#5a8ad8", pants: "#2a3a5a", hair: "short", hairCol: "#1a1a1a", weapon: "sword", cape: "#93c5fd", trim: "#e8e0f0", pauldron: "#cfe0ff" },
    rm1: { skin: "#e0b48a", armor: "#3c7a3a", helmet: "steel", weapon: "sword", shield: "#2f6a9a", trim: "#d9b44a", pauldron: "#c9ced6", skirt: true },
    rm2: { k: 1.1, skin: "#e0b48a", armor: "#2f8a5a", helmet: "steel", helmetCol: "#d6dae2", plume: "#3a8ad8", weapon: "sword", shield: "#3a8ad8", trim: "#e8e0f0", pauldron: "#e8ecf2", skirt: true },
    rm3: { k: 1.25, skin: "#e0b48a", armor: "#d9a020", helmet: "gold", plume: "#e8e0f0", weapon: "sword", shield: "#e0b030", trim: "#fff4c0", pauldron: "#fff0a0", skirt: true },
    rr1: { skin: "#e0b48a", armor: "#2f6a9a", helmet: "hood", hood: "#e8e0d0", weapon: "staff", orb: "#7ad0ff", orb2: "#e6fbff", trim: "#d9b44a" },
    rr2: { k: 1.1, skin: "#e0b48a", armor: "#3a4aaa", helmet: "hood", hood: "#f4f0e8", weapon: "staff", orb: "#9ae0ff", orb2: "#ffffff", trim: "#e8e0f0", cape: "#3a8ad8" },
    rr3: { k: 1.25, skin: "#e0b48a", armor: "#d9a020", helmet: "hood", hood: "#fff6c8", weapon: "staff", orb: "#fff07a", orb2: "#ffffff", trim: "#fff4c0", cape: "#e0b030" },
    dmelee: { skin: "#8a6a5a", armor: "#4a2424", helmet: "horned", helmetCol: "#3a1a1a", weapon: "sword", shield: "#3a1a1a", trim: "#8a2a2a", eyeGlow: "#ff7a2a", pauldron: "#5a2a2a", skirt: true },
    dranged: { skin: "#7a6a5a", armor: "#43244f", helmet: "hood", hood: "#24142e", weapon: "staff", orb: "#8aff5a", eyeGlow: "#8aff5a", trim: "#a07a2a" },
    kobold: { k: 0.8, skin: "#9a6a3a", armor: "#4a3a5a", weapon: "spear", ears: true },
    ogre: { k: 1.45, skin: "#4a82b8", armor: "#5a92c8", pants: "#8a5a2a", weapon: "club", belly: 5, tusks: true, belt: false },
    roshan: { k: 1.9, skin: "#6a4428", armor: "#5a3a22", chest: "#b08a5a", pants: "#3a2414", helmet: "horned", helmetCol: "#5a3a22", belly: 5, eyeGlow: "#ff3a2a", belt: false },
  };
  const SET = {};
  for (const [k, o] of Object.entries(LOOK)) SET[k] = A.unitSet(o);
  SET.wolf = A.quadSet({ body: "#585868", eye: "#ff4a2a", tail: "#34343f" });
  SET.centaur = A.quadSet({ k: 1.2, body: "#80553a", tail: "#2a1a10", hoof: "#1a1210", rider: { armor: "#4a2a1a", skin: "#9a5a3a" } });
  SET.golem = A.golemSet(); SET.dragon = A.dragonSet(); SET.siege = A.siegeSet();

  // =====================================================================
  //  EROI (大金神 sceglie chi interpretare)
  // =====================================================================
  const ICON = (n) => `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/${n}.png`;
  const HEROES = {
    windranger: { name: "风行者", look: "windranger", ranged: true, proj: "arrow", hp: 620, dmg: 32, rate: 1.4, range: 110, arm: 2, spd: 62,
      sk: [["windrunner_shackleshot", "束缚击", 10, "击晕最近的两个敌人"], ["windrunner_powershot", "强力击", 9, "向前穿透一排敌人"], ["windrunner_windrun", "风行", 14, "加速并闪避80%伤害"], ["windrunner_focusfire", "集中火力", 40, "8秒攻速×3（6级）"]] },
    storm: { name: "风暴之灵", look: "storm", ranged: true, proj: "spark", hp: 660, dmg: 30, rate: 1.3, range: 92, arm: 3, spd: 60,
      sk: [["storm_spirit_static_remnant", "残影", 4, "周围范围电击"], ["storm_spirit_electric_vortex", "电子漩涡", 12, "把敌人拉过来并击晕"], ["storm_spirit_overload", "超负荷", 0, "被动：放技能后下一击范围伤害"], ["storm_spirit_ball_lightning", "球状闪电", 8, "化身闪电冲过敌阵（6级）"]] },
    axe: { name: "斧王", look: "axe", ranged: false, hp: 1150, dmg: 46, rate: 1.0, range: 18, arm: 6, spd: 56,
      sk: [["axe_berserkers_call", "狂战士之吼", 12, "嘲讽周围敌人，护甲+20"], ["axe_battle_hunger", "战斗饥渴", 10, "5个敌人持续掉血并减速"], ["axe_counter_helix", "反击螺旋", 0, "被动：被打时概率转圈砍"], ["axe_culling_blade", "淘汰之刃", 30, "斩杀残血敌人（6级）"]] },
    magnus: { name: "马格纳斯", look: "magnus", ranged: false, hp: 1050, dmg: 50, rate: 0.9, range: 18, arm: 5, spd: 56,
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
    const h = S.hero; h.lvl = 1; h.xp = 0; h.cds = [0, 0, 0, 0]; h.buffs = {}; h.respawn = 0; h.overload = false; h.mx = 0;
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
    u.hp -= real; u.flash = 0.08;
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
      u.respawn = 10; u.hp = 0; say(u, pick(JIN.die), 3); banner("大金神阵亡", "10秒后复活 · " + pick(JIN.die));
      return;
    }
    u.dead = 0.9;
    if (u.team === "enemy") {
      S.gold += u.d.gold; S.kills++; text(u.x, feetY(u) - 30, "+" + u.d.gold + "金", "#fde047");
      burst(u.x, feetY(u) - 10, ["#fde047", "#ffb03a"], 4, 40);
      gainXp(u.d.gold * 2);
      if (u.d.boss) { banner("击杀肉山！", "+600金 · 大P神：小金金这次没送"); S.ancient.hp = Math.min(S.ancient.max, S.ancient.hp + 1500); }
      if (from && from.team === "hero" && Math.random() < 0.12) say(from, pick(JIN.kill));
    }
  }
  function gainXp(x) { const h = S.hero; if (h.lvl >= 25) return; h.xp += x; while (h.xp >= h.lvl * 100 && h.lvl < 25) { h.xp -= h.lvl * 100; h.lvl++; const r = h.hp / h.max; h.max = Math.round((HD.hp + (S.items.includes("heart") ? 600 : 0)) * (1 + (h.lvl - 1) * 0.08)); h.hp = h.max * r; text(h.x, feetY(h) - 50, "升级! Lv." + h.lvl, "#fde047", true); burst(h.x, feetY(h) - 20, ["#fde047", "#fff6c8"], 14); if (h.lvl === 6) banner("6级！", "大招解锁了"); else if (Math.random() < 0.4) say(h, pick(JIN.lvl)); } }

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
    const d = { ...a, hp: Math.round(a.hp * lv.hp), dmg: Math.round(a.dmg * lv.dmg), arm: a.arm + lv.arm, set: SET[(kind === "melee" ? "rm" : "rr") + (S.barracks + 1)] };
    const guard = kind === "melee" ? rnd(122, 150) : rnd(100, 116);
    const u = makeUnit("ally", d, ANC.front - 6, Math.floor(rnd(0, 10)), { kind, guard });
    S.units.push(u); burst(u.x, feetY(u) - 20, ["#fff6c8", "#7ae0a0"], 10, 30, 0); hud(true);
  }
  function summonSnail() {
    if (S.snailCd > 0) return flash(`蜗牛大神还在睡觉 ${Math.ceil(S.snailCd)}秒`);
    if (S.gold < SNAIL.cost) return flash("金币不够");
    S.gold -= SNAIL.cost; S.snailCd = SNAIL.cd;
    const u = makeUnit("ally", { ...SNAIL, set: SET.snail }, ANC.front, 6, { snail: true, life: SNAIL.life, guard: 170 });
    S.units.push(u); say(u, "干干干！今晚通宵！", 3); banner("蜗牛大神来了！", "限时45秒 · 干干干！");
    burst(u.x, feetY(u) - 20, ["#93c5fd", "#ffffff"], 20, 50, 0); hud(true);
  }
  function upgradeBarracks() {
    if (S.barracks >= 2) return flash("已经是超级巨型兵了");
    const c = BARRACKS_COST[S.barracks + 1]; if (S.gold < c) return flash("金币不够");
    S.gold -= c; S.barracks++;
    for (const u of S.units) if (u.team === "ally" && !u.snail) { const a = ALLY[u.kind], lv = LV[S.barracks]; u.d = { ...a, hp: Math.round(a.hp * lv.hp), dmg: Math.round(a.dmg * lv.dmg), arm: a.arm + lv.arm, set: SET[(u.kind === "melee" ? "rm" : "rr") + (S.barracks + 1)] }; u.max = u.d.hp; u.hp = u.max; }
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
    if (i === 3 && h.lvl < 6) return flash("6级解锁大招");
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
      h.cd = 1 / stat(h, "rate"); h.face = t.x >= h.x ? 1 : -1; h.anim = "atk"; h.at = 0.3;
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
    if (u.flash > 0) return R ? set.white : set.whiteL;
    if (u.anim === "atk") { const f = clamp(Math.floor((1 - u.at / 0.35) * 3), 0, 2); return (R ? set.atk : set.atkL)[f]; }
    if (u.anim === "cast") return (R ? set.cast : set.castL)[1];
    if (u.anim === "idle") return (R ? set.walk : set.walkL)[0];
    return (R ? set.walk : set.walkL)[Math.floor(u.frame) % 4];
  }
  function draw() {
    g.save();
    if (S.shake) g.translate(Math.round(rnd(-S.shake, S.shake)), Math.round(rnd(-S.shake, S.shake)));
    g.drawImage(bg, 0, 0);
    // Antico con alone
    const pulse = 0.5 + Math.sin(S.t * 2) * 0.15;
    g.globalCompositeOperation = "lighter"; const gr = g.createRadialGradient(ANC.x, ANC.y - 70, 4, ANC.x, ANC.y - 70, 60); gr.addColorStop(0, `rgba(180,255,210,${0.35 * pulse})`); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(ANC.x - 60, ANC.y - 130, 120, 120); g.globalCompositeOperation = "source-over";
    g.drawImage(S.ancient.flash > 0 ? A.whiteOf(ancientImg) : ancientImg, ANC.x - (ancientImg.width >> 1), ANC.y - ancientImg.height + 4);
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
      if (u.team === "hero") { g.font = "bold 7px sans-serif"; g.textAlign = "center"; g.fillStyle = "#000"; g.fillText(`大金神 Lv${u.lvl}`, u.x + 1, top - 7); g.fillStyle = "#f2b632"; g.fillText(`大金神 Lv${u.lvl}`, u.x, top - 8); }
      if (u.snail) { g.font = "bold 7px sans-serif"; g.textAlign = "center"; g.fillStyle = "#000"; g.fillText(`蜗牛大神 ${Math.ceil(u.life)}s`, u.x + 1, top - 7); g.fillStyle = "#93c5fd"; g.fillText(`蜗牛大神 ${Math.ceil(u.life)}s`, u.x, top - 8); }
      if (u.bubble) bubble(u.x, top - (u.team === "hero" || u.snail ? 22 : 12), u.bubble.t, u.snail ? "#93c5fd" : u.team === "hero" ? "#f2b632" : "#ff6a3a");
    }
    bar(ANC.x - 24, ANC.y - 118, 48, S.ancient.hp / S.ancient.max, "#7ae0a0");
    g.font = "bold 9px sans-serif"; g.textAlign = "center";
    for (const t of S.texts) { g.globalAlpha = Math.min(1, t.life * 2); g.font = t.big ? "bold 10px sans-serif" : "bold 7px sans-serif"; g.fillStyle = "#000"; g.fillText(t.t, Math.round(t.x) + 1, Math.round(t.y) + 1); g.fillStyle = t.col; g.fillText(t.t, Math.round(t.x), Math.round(t.y)); }
    g.globalAlpha = 1; g.restore();
  }
  function drawUnit(u) {
    const im = frameOf(u), fly = isFly(u) ? 30 + Math.round(Math.sin(S.t * 3) * 3) : 0;
    let x = Math.round(u.x) - (im.width >> 1), y = feetY(u) - im.height + 2 - fly;
    if (u.dead) { g.save(); g.globalAlpha = Math.max(0, u.dead); g.translate(Math.round(u.x), feetY(u)); g.rotate((u.team === "enemy" ? 1 : -1) * (1 - u.dead) * 1.5); g.drawImage(im, -(im.width >> 1), -im.height + 2); g.restore(); return; }
    g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(Math.round(u.x) - 10, feetY(u) - 1, 20, 3);
    if (u.team === "hero" && u.buffs.windrun > 0) { g.globalAlpha = 0.4; g.drawImage(im, x - u.face * 4, y); g.globalAlpha = 1; }
    if ((u.team !== "enemy" && S.empower > 0) || (u.team === "hero" && u.buffs.focus > 0)) { g.globalCompositeOperation = "lighter"; g.globalAlpha = 0.35; g.drawImage(A.tint(im, u.buffs && u.buffs.focus > 0 ? "#7aff9a" : "#ffd06a", 1), x, y); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; }
    if (u.team === "hero" && u.buffs.ball > 0) { g.fillStyle = "rgba(170,220,255,.8)"; g.beginPath(); g.arc(u.x, feetY(u) - 18, 9, 0, 7); g.fill(); return; }
    g.drawImage(im, x, y);
    if (u.stun > 0) { g.fillStyle = "#ffe27a"; for (let k = 0; k < 3; k++) { const a = S.t * 6 + k * 2.1; g.fillRect(Math.round(u.x + Math.cos(a) * 6), Math.round(y - 3 + Math.sin(a) * 2), 2, 2); } }
    if (u.slow > 0 || u.dot > 0) { g.fillStyle = u.dot > 0 ? "rgba(255,70,50,.5)" : "rgba(122,208,255,.5)"; g.fillRect(x + 4, y + im.height - 6, im.width - 8, 2); }
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
    const key = [S.gold, Math.ceil(S.ancient.hp), Math.ceil(h.hp), h.max, h.lvl, S.wave, Math.ceil(S.nextWave), h.cds.map(Math.ceil).join(","), Math.ceil(S.snailCd), S.barracks, h.respawn > 0 ? Math.ceil(h.respawn) : 0].join("|");
    if (key === lastKey && !force) return; lastKey = key;
    $("gold").textContent = S.gold; $("wave").textContent = S.wave; $("next").textContent = Math.ceil(S.nextWave);
    $("anc").style.width = (S.ancient.hp / S.ancient.max) * 100 + "%"; $("anc-t").textContent = `${Math.max(0, Math.ceil(S.ancient.hp))}/${S.ancient.max}`;
    $("hp").style.width = Math.max(0, h.hp / h.max) * 100 + "%"; $("hp-t").textContent = h.respawn > 0 ? `复活 ${Math.ceil(h.respawn)}` : `${Math.ceil(h.hp)}/${h.max}`;
    $("lvl").textContent = h.lvl; $("xp").style.width = (h.lvl >= 25 ? 100 : (h.xp / (h.lvl * 100)) * 100) + "%";
    document.querySelectorAll(".skill").forEach((b, i) => { const cd = h.cds[i], locked = i === 3 && h.lvl < 6; b.classList.toggle("cd", cd > 0 || locked); b.querySelector(".cdn").textContent = locked ? "6级" : cd > 0 ? Math.ceil(cd) : ""; });
    document.querySelectorAll("[data-buy]").forEach((b) => { const k = b.dataset.buy, it = ITEMS[k]; b.classList.toggle("poor", S.gold < it.cost && !S.items.includes(k)); b.classList.toggle("own", S.items.includes(k)); });
    $("sum-melee").classList.toggle("poor", S.gold < ALLY.melee.cost); $("sum-ranged").classList.toggle("poor", S.gold < ALLY.ranged.cost);
    $("sum-snail").classList.toggle("poor", S.gold < SNAIL.cost || S.snailCd > 0); $("snail-cd").textContent = S.snailCd > 0 ? Math.ceil(S.snailCd) + "s" : SNAIL.cost;
    $("upg").classList.toggle("poor", S.barracks >= 2 || S.gold < BARRACKS_COST[S.barracks + 1]);
    $("upg-cost").textContent = S.barracks >= 2 ? "满级" : BARRACKS_COST[S.barracks + 1];
  }
  function iconCanvas(set) { const c = document.createElement("canvas"); const im = set.walk[0]; c.width = im.width; c.height = im.height; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0); return c; }
  function renderShop() {
    const lvKey = S.barracks + 1;
    $("units").innerHTML = `
      <button class="slot" id="sum-melee"><i>1</i><span class="pic" data-pic="rm${lvKey}"></span><b>${LV[S.barracks].name}近战兵</b><em>${ALLY.melee.cost}</em></button>
      <button class="slot" id="sum-ranged"><i>2</i><span class="pic" data-pic="rr${lvKey}"></span><b>${LV[S.barracks].name}远程兵</b><em>${ALLY.ranged.cost}</em></button>
      <button class="slot" id="upg"><i>U</i><span class="pic" data-pic="rm${Math.min(3, lvKey + 1)}"></span><b>${S.barracks >= 2 ? "兵营满级" : "升级兵营 → " + LV[S.barracks + 1].name}</b><em id="upg-cost"></em></button>
      <button class="slot snail" id="sum-snail"><i>3</i><span class="pic" data-pic="snail"></span><b>召唤蜗牛大神</b><em id="snail-cd"></em></button>`;
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
  $("pick").innerHTML = Object.entries(HEROES).map(([k, h]) => `<button class="hero" data-h="${k}"><span class="pic" data-hp="${h.look}"></span><b>${h.name}</b><small>${h.ranged ? "远程" : "近战"} · 生命${h.hp} · 攻击${h.dmg}</small><span class="abil">${h.sk.map((s) => `<img src="${ICON(s[0])}" title="${s[1]}：${s[3]}">`).join("")}</span></button>`).join("");
  document.querySelectorAll("[data-hp]").forEach((s) => s.appendChild(iconCanvas(SET[s.dataset.hp])));
  document.querySelectorAll(".hero").forEach((b) => (b.onclick = () => { $("intro").hidden = true; reset(b.dataset.h); renderSkills(); running = true; banner("大金神 · " + HD.name, "大P神：小金金，守住遗迹！"); }));
  $("again").onclick = () => { $("over").hidden = true; $("intro").hidden = false; running = false; };
  try { const b = +localStorage.getItem("g2:best"); if (b) $("best").textContent = `最佳纪录：第 ${b} 波`; } catch {}

  let last = performance.now();
  function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (running && !document.hidden) { update(dt); draw(); } requestAnimationFrame(loop); }
  reset("windranger"); renderSkills(); draw(); requestAnimationFrame(loop);
  if (location.search.includes("debug")) window.__g2 = { get S() { return S; }, update, draw, startWave, summon, summonSnail, upgradeBarracks, buy, cast, spawnEnemy, reset };
})();
