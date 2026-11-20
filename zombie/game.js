// =====================================================================
//  篝火守卫 — difendi il fuoco dell'accampamento dalle unità del Dire.
//  Di giorno raccogli legna e pietra e costruisci; di notte arrivano le ondate.
//  Mappa 44x28 tile (16px), vista 384x216 ingrandita a pixel interi.
// =====================================================================
(() => {
  const A = window.ART, CFG = window.TRIBUNALE_CONFIG || { players: [] };
  const TS = 16, MC = 44, MR = 28, MW = MC * TS, MH = MR * TS, VW = 384, VH = 216;
  const cv = document.getElementById("cv"), g = cv.getContext("2d");
  cv.width = VW; cv.height = VH; g.imageSmoothingEnabled = false;
  const [darkC, dk] = A.mk(VW, VH), [decalC, dc] = A.mk(MW, MH);
  const $ = (id) => document.getElementById(id);
  const rnd = (a, b) => a + Math.random() * (b - a), dist = (a, b, c, d) => Math.hypot(a - c, b - d);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const CAMP = { c: 22, r: 14, x: 22 * TS + 8, y: 14 * TS + 12 };
  const groundC = A.ground(MW, MH, CAMP.x, CAMP.y - 4, 7 * TS, 5 * TS);

  // =====================================================================
  //  DATI
  // =====================================================================
  const HEROES = {
    "大金神": { cls: "法师", w: "staff", ranged: true, proj: "fire", hp: 130, dmg: 11, rate: 1.3, range: 86, spd: 46, hair: "#c0392b", skill: "fire", sk: "神灭斩", skd: "对附近敌人一发火焰，造成巨额伤害", cd: 16 },
    "蜗牛大神": { cls: "战士", w: "sword", hp: 170, dmg: 14, rate: 1.5, spd: 48, hair: "#1a1a1a", skill: "rage", sk: "干干干！", skd: "6秒内攻速翻倍、移速+30%", cd: 18 },
    "Ping大神": { cls: "射手", w: "gun", ranged: true, proj: "bullet", hp: 120, dmg: 9, rate: 1.5, range: 92, spd: 46, hair: "#8a8a8a", skill: "whisky", sk: "威士忌", skd: "喝一口：回复60%生命，篝火+150", cd: 24 },
    "大B神": { cls: "刺客", w: "dagger", hp: 140, dmg: 13, rate: 1.6, spd: 50, hair: "#5a3a22", skill: "blink", sk: "幻影突袭", skd: "瞬移到敌人身后，4倍暴击", cd: 8, crit: 0.2 },
    "Yoki大神": { cls: "游侠", w: "bow", ranged: true, proj: "frost", hp: 115, dmg: 10, rate: 1.6, range: 104, spd: 47, hair: "#e8e8f0", skill: "frost", sk: "冰霜箭雨", skd: "扇形射出7支减速冰箭", cd: 11 },
    "疯子大神": { cls: "坦克", w: "hook", hp: 230, dmg: 15, rate: 1.0, spd: 42, hair: "#3a2a1a", skill: "hook", sk: "肉钩", skd: "把远处的敌人钩到面前，造成伤害", cd: 9 },
    "Kaiju大神*": { cls: "刺客", w: "dagger", hp: 130, dmg: 11, rate: 1.8, spd: 58, hair: "#2a4a8a", skill: "dash", sk: "小鱼突进", skd: "向前突进，沿途伤害并偷金币", cd: 8 },
    "Soul大神": { cls: "战士", w: "axe", hp: 180, dmg: 15, rate: 1.3, spd: 47, hair: "#e0c060", skill: "stun", sk: "MVP震地", skd: "范围伤害并眩晕2秒", cd: 15 },
    "金神大腿": { cls: "狙击", w: "gun", ranged: true, proj: "bullet", hp: 110, dmg: 17, rate: 0.85, range: 128, spd: 45, hair: "#4a2a5a", skill: "snipe", sk: "爆头", skd: "射杀最远处的敌人，超高伤害", cd: 14 },
    "辅助大神": { cls: "辅助", w: "staff", ranged: true, proj: "holy", hp: 125, dmg: 8, rate: 1.4, range: 84, spd: 47, hair: "#d8c8a0", skill: "heal", sk: "大治疗", skd: "篝火+300生命，自己回满", cd: 22 },
  };
  const ROSTER = CFG.players.filter((p) => HEROES[p.alias]).map((p) => ({ name: p.alias, color: p.color || "#5c8f4f", ...HEROES[p.alias] }));
  if (!ROSTER.length) Object.entries(HEROES).forEach(([name, d]) => ROSTER.push({ name, color: "#5c8f4f", ...d }));
  ROSTER.forEach((h) => (h.spr = A.heroSprite(h.color, h.hair)));

  const UNITS = {
    melee: { name: "近战小兵", hp: 55, spd: 14, dmg: 7, rate: 1, gold: 3, r: 5, cost: 1, minN: 1 },
    ranged: { name: "远程小兵", hp: 38, spd: 13, dmg: 6, rate: 0.8, range: 64, proj: "green", gold: 3, r: 5, cost: 1.5, minN: 1 },
    kobold: { name: "狗头人", hp: 28, spd: 21, dmg: 5, rate: 1.2, gold: 2, r: 4, cost: 0.7, minN: 1 },
    wolf: { name: "狼", hp: 52, spd: 30, dmg: 8, rate: 1.3, gold: 4, r: 6, cost: 1.4, minN: 2 },
    centaur: { name: "半人马", hp: 240, spd: 11, dmg: 22, rate: 0.7, gold: 12, r: 8, cost: 4, minN: 3 },
    siege: { name: "攻城车", hp: 190, spd: 8, dmg: 36, rate: 0.33, range: 96, proj: "rock", splash: 16, siege: true, gold: 10, r: 8, cost: 4, minN: 4 },
    ogre: { name: "食人魔", hp: 330, spd: 9, dmg: 26, rate: 0.6, gold: 15, r: 8, cost: 5, minN: 4 },
    golem: { name: "岩石傀儡", hp: 540, spd: 7, dmg: 40, rate: 0.5, gold: 25, r: 9, cost: 8, minN: 5 },
    dragon: { name: "远古黑龙", hp: 620, spd: 12, dmg: 30, rate: 0.6, range: 74, proj: "fire", splash: 14, fly: true, gold: 35, r: 10, cost: 12, minN: 6 },
    roshan: { name: "肉山", hp: 2600, spd: 8, dmg: 70, rate: 0.5, gold: 150, r: 13, boss: true },
  };
  for (const [k, u] of Object.entries(UNITS)) u.set = A.units[k];

  const BUILD = {
    fence: { name: "木栅栏", cost: { wood: 3 }, hp: 90, solid: true },
    wall: { name: "石墙", cost: { stone: 5 }, hp: 260, solid: true },
    spikes: { name: "尖刺陷阱", cost: { wood: 3, stone: 1 }, hp: 40, solid: false, dmg: 8 },
    arrow: { name: "箭塔", cost: { wood: 12, stone: 4 }, hp: 180, solid: true, range: 92, dmg: 9, rate: 1.4, proj: "arrow" },
    mage: { name: "法师塔", cost: { stone: 12, gold: 40 }, hp: 220, solid: true, range: 82, dmg: 15, rate: 0.75, proj: "magic" },
  };
  const ITEMS = {
    quelling_blade: { name: "补刀斧", cost: { wood: 8, gold: 20 }, desc: "采集速度×2，攻击+4" },
    boots: { name: "速度之靴", cost: { gold: 45 }, desc: "移动速度+30%" },
    flask: { name: "治疗药膏", cost: { gold: 15 }, desc: "按H使用：8秒回复150生命", stack: true },
    bfury: { name: "狂战斧", cost: { wood: 20, stone: 20, gold: 180 }, desc: "攻击+18，溅射50%，采集×3", needs: "quelling_blade" },
    camp: { name: "篝火升级", cost: { wood: 15, stone: 15 }, desc: "篝火生命上限+400并回满", camp: true },
  };
  const ITEM_IMG = (k) => (k === "camp" ? null : `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${k}.png`);

  // =====================================================================
  //  MAPPA: risorse generate (foreste a macchie), bordi liberi per gli spawn
  // =====================================================================
  let RES, resAt;
  function genMap() {
    RES = []; resAt = Array.from({ length: MR }, () => Array(MC).fill(null));
    const seed = Math.floor(Math.random() * 1000);
    for (let r = 1; r < MR - 1; r++) for (let c = 1; c < MC - 1; c++) {
      const camp = Math.hypot((c - CAMP.c) / 7, (r - CAMP.r) / 5);
      if (camp < 1.15) continue;
      const forest = A.hash(Math.floor(c / 4), Math.floor(r / 4), seed) * 0.5 + A.hash(c, r, seed + 1) * 0.5;
      const k = A.hash(c, r, seed + 2);
      let type = null;
      if (forest > 0.62 && k < 0.5) type = A.hash(c, r, seed + 3) < 0.45 ? "pine" : "tree";
      else if (k < 0.06) type = A.hash(c, r, seed + 3) < 0.5 ? "pine" : "tree";
      else if (k > 0.965) type = "rock";
      if (!type) continue;
      const o = { k: type, c, r, max: type === "rock" ? 14 : 12, dead: 0, shake: 0, v: Math.floor(A.hash(c, r, seed + 4) * 3) };
      o.amt = o.max; RES.push(o); resAt[r][c] = o;
    }
    // qualche roccia vicino alla radura così si comincia subito
    for (const [c, r] of [[CAMP.c - 9, CAMP.r + 2], [CAMP.c + 9, CAMP.r - 3], [CAMP.c + 4, CAMP.r + 7]]) if (!resAt[r][c]) { const o = { k: "rock", c, r, max: 14, amt: 14, dead: 0, shake: 0, v: 0 }; RES.push(o); resAt[r][c] = o; }
  }
  const SPR = { tree: [A.tree(3), A.tree(6), A.tree(11)], pine: [A.pine(2), A.pine(5), A.pine(9)], rock: [A.rock(2, true), A.rock(5, true), A.rock(8, true)] };
  const BUSH = [A.bush(1), A.bush(2), A.bush(4)];
  const DECOR = Array.from({ length: 40 }, (_, i) => ({ x: Math.floor(A.hash(i, 1, 99) * MW), y: Math.floor(A.hash(i, 2, 99) * MH), img: BUSH[i % 3] }))
    .filter((d) => Math.hypot((d.x - CAMP.x) / 120, (d.y - CAMP.y) / 80) > 1);

  // =====================================================================
  //  STATO
  // =====================================================================
  let S, HERO;
  function reset(hero) {
    HERO = hero; dc.clearRect(0, 0, MW, MH); genMap();
    S = {
      t: 0, day: 1, phase: "day", clock: 100, light: 0, nightT: 0, queue: [], kills: 0, over: false,
      res: { wood: 10, stone: 4, gold: 30 },
      camp: { hp: 1000, max: 1000, lvl: 1 },
      p: { x: CAMP.x, y: CAMP.y + 26, hp: hero.hp, max: hero.hp, cd: 0, skillCd: 0, face: 1, aim: 0, frame: 0, moving: false, job: null, gatherCd: 0, dead: 0, flash: 0, swing: 0, buff: {}, items: {}, salve: 0, heal: 0, hurt: -9 },
      es: [], grid: Array.from({ length: MR }, () => Array(MC).fill(null)), proj: [], parts: [], lights: [], texts: [], corpses: [],
      shake: 0, tool: null, hover: null, flow: null, cam: { x: 0, y: 0 },
    };
    recomputeFlow(); renderShop(); hud(true);
  }

  // =====================================================================
  //  PERCORSI (Dijkstra con heap sul tile del fuoco)
  // =====================================================================
  const inMap = (c, r) => c >= 0 && r >= 0 && c < MC && r < MR;
  const isCamp = (c, r) => c === CAMP.c && r === CAMP.r;
  const resLive = (c, r) => { const o = inMap(c, r) && resAt[r][c]; return o && !o.dead ? o : null; };
  function recomputeFlow() {
    const D = new Float32Array(MC * MR).fill(Infinity), heap = [];
    const push = (d, i) => { heap.push([d, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = k * 2 + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const ci = CAMP.r * MC + CAMP.c; D[ci] = 0; push(0, ci);
    while (heap.length) {
      const [d, i] = pop(); if (d > D[i]) continue;
      const c = i % MC, r = (i / MC) | 0;
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + a, nr = r + b; if (!inMap(nc, nr) || resLive(nc, nr)) continue;
        const s = S.grid[nr][nc], cost = 1 + (s && BUILD[s.k].solid ? s.hp / 12 : 0), ni = nr * MC + nc;
        if (d + cost < D[ni]) { D[ni] = d + cost; push(d + cost, ni); }
      }
    }
    S.flow = D;
  }
  const flowAt = (c, r) => (inMap(c, r) ? S.flow[r * MC + c] : Infinity);
  const tileAt = (x, y) => [Math.floor(x / TS), Math.floor(y / TS)];
  function solidAt(x, y) {
    const [c, r] = tileAt(x, y); if (!inMap(c, r)) return true;
    if (isCamp(c, r) || resLive(c, r)) return true;
    const s = S.grid[r][c]; return !!(s && BUILD[s.k].solid);
  }

  // =====================================================================
  //  AUDIO (molto basso)
  // =====================================================================
  let AC = null, NB = null, muted = false;
  function audio() { if (AC) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); NB = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } catch {} }
  function sfx(t) {
    if (!AC || muted) return;
    const P = { hit: [1200, 0.03, 0.05], chop: [500, 0.05, 0.08], mine: [1500, 0.04, 0.06], boom: [300, 0.14, 0.45], shot: [2200, 0.03, 0.04], build: [700, 0.05, 0.07], magic: [3000, 0.02, 0.12] }[t];
    const n = AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), gn = AC.createGain();
    s.buffer = NB; s.connect(f); f.connect(gn); gn.connect(AC.destination); f.type = "lowpass"; f.frequency.value = P[0];
    gn.gain.setValueAtTime(P[1], n); gn.gain.exponentialRampToValueAtTime(0.0001, n + P[2]); s.start(n); s.stop(n + P[2] + 0.02);
  }

  // =====================================================================
  //  EFFETTI
  // =====================================================================
  function blood(x, y, n, col = "#8a1414") {
    for (let i = 0; i < n; i++) S.parts.push({ x, y: y - 6, vx: rnd(-40, 40), vy: rnd(-55, -10), g: 160, life: rnd(0.3, 0.6), col, s: 1, splat: col });
  }
  function chips(x, y, col, n = 5) { for (let i = 0; i < n; i++) S.parts.push({ x, y, vx: rnd(-40, 40), vy: rnd(-60, -20), g: 170, life: rnd(0.3, 0.6), col, s: 1, floor: y + 6 }); }
  const light = (x, y, r, life) => S.lights.push({ x, y, r, life, max: life });
  const text = (x, y, t, col) => S.texts.push({ x, y, t, col, life: 1 });
  function banner(t, sub) { const b = $("banner"); b.innerHTML = t + (sub ? `<small>${sub}</small>` : ""); b.classList.remove("show"); void b.offsetWidth; b.classList.add("show"); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove("show"), 2600); }
  const afford = (cost) => Object.entries(cost).every(([k, v]) => S.res[k] >= v);
  const pay = (cost) => Object.entries(cost).forEach(([k, v]) => (S.res[k] -= v));

  // =====================================================================
  //  CICLO GIORNO / NOTTE E ONDATE
  // =====================================================================
  function startNight() {
    S.phase = "night"; S.nightT = 0;
    const n = S.day, pool = Object.entries(UNITS).filter(([, u]) => !u.boss && u.minN <= n);
    let budget = 7 + n * 5; const list = [];
    while (budget > 0) { const [k, u] = pool[Math.floor(Math.random() * pool.length)]; if (u.cost > budget + 1) { budget -= 0.5; continue; } list.push(k); budget -= u.cost; }
    if (n % 5 === 0) list.push("roshan");
    const sides = [0, 1, 2, 3].sort(() => Math.random() - 0.5).slice(0, n < 3 ? 1 : 2);
    S.queue = list.map((k, i) => ({ k, at: (i / list.length) * 38 + rnd(0, 2), side: sides[Math.floor(i / 4) % sides.length] })).sort((a, b) => a.at - b.at);
    banner(`第 ${n} 夜`, n % 5 === 0 ? "肉山出现了！" : "夜魇的军队来了");
  }
  function startDay() {
    S.phase = "day"; S.day++; S.clock = 80;
    const bonus = 10 + S.day * 5; S.res.gold += bonus;
    banner(`第 ${S.day} 天`, `天亮了 · 奖励 ${bonus} 金币`);
    // gli alberi tagliati ricrescono un po' di più all'alba
    RES.forEach((o) => { if (o.dead) o.dead = Math.min(o.dead, 20); });
  }
  function spawn(k, side) {
    const u = UNITS[k], scale = 1 + (S.day - 1) * 0.12;
    let x, y, tries = 0;
    do {
      const t = Math.random();
      if (side === 0) { x = -10; y = t * MH; } else if (side === 1) { x = MW + 10; y = t * MH; } else if (side === 2) { x = t * MW; y = -10; } else { x = t * MW; y = MH + 12; }
      tries++;
    } while (tries < 20 && !u.fly && !isFinite(flowAt(clamp(Math.floor(x / TS), 0, MC - 1), clamp(Math.floor(y / TS), 0, MR - 1))));
    const hp = Math.round(u.hp * scale);
    S.es.push({ k, u, x, y, hp, max: hp, cd: rnd(0, 1), face: 1, frame: rnd(0, 4), flash: 0, slow: 0, stun: 0 });
    if (u.boss) banner("肉山来了！", "击杀可获得不朽之守护");
  }

  // =====================================================================
  //  UPDATE
  // =====================================================================
  const keys = {};
  let joy = null;
  function update(dt) {
    S.t += dt;
    if (S.over) return;
    // tempo
    if (S.phase === "day") { S.clock -= dt; S.camp.hp = Math.min(S.camp.max, S.camp.hp + 4 * dt); if (S.clock <= 0) startNight(); } // di giorno il fuoco si riprende piano
    else {
      S.nightT += dt;
      while (S.queue.length && S.queue[0].at <= S.nightT) { const q = S.queue.shift(); spawn(q.k, q.side); }
      if (!S.queue.length && !S.es.length && S.nightT > 30) startDay();
    }
    const dusk = S.phase === "night" ? 1 : S.clock < 8 ? 1 - S.clock / 8 : 0;
    S.light += (dusk - S.light) * Math.min(1, dt * 1.5);

    updatePlayer(dt);
    updateBuildings(dt);
    updateEnemies(dt);
    updateProjectiles(dt);

    // risorse che ricrescono
    for (const o of RES) if (o.dead) { o.dead -= dt; if (o.dead <= 0) { const [pc, pr] = tileAt(S.p.x, S.p.y); if (pc === o.c && pr === o.r) o.dead = 3; else { o.dead = 0; o.amt = o.max; recomputeFlow(); } } }
    for (const o of RES) o.shake = Math.max(0, o.shake - dt);
    // effetti
    for (const q of S.parts) { q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.floor && q.y > q.floor) { q.y = q.floor; q.vy *= -0.3; q.vx *= 0.5; } }
    S.parts = S.parts.filter((q) => { if (q.life > 0) return true; if (q.splat) { dc.fillStyle = q.splat; dc.globalAlpha = 0.8; dc.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); dc.globalAlpha = 1; } return false; });
    S.lights.forEach((l) => (l.life -= dt)); S.lights = S.lights.filter((l) => l.life > 0);
    S.texts.forEach((t) => { t.life -= dt; t.y -= 14 * dt; }); S.texts = S.texts.filter((t) => t.life > 0);
    S.corpses.forEach((c) => (c.life -= dt)); S.corpses = S.corpses.filter((c) => c.life > 0);
    S.shake = Math.max(0, S.shake - dt * 10);
    if (Math.floor(S.t * 2) !== Math.floor((S.t - dt) * 2)) { dc.globalCompositeOperation = "destination-out"; dc.fillStyle = "rgba(0,0,0,0.01)"; dc.fillRect(0, 0, MW, MH); dc.globalCompositeOperation = "source-over"; }
    // telecamera
    S.cam.x = Math.round(clamp(S.p.x - VW / 2, 0, MW - VW)); S.cam.y = Math.round(clamp(S.p.y - VH / 2 - 6, 0, MH - VH));
    hud();
  }

  function heroStat(k) {
    const p = S.p, h = HERO;
    if (k === "dmg") return h.dmg + (p.items.quelling_blade ? 4 : 0) + (p.items.bfury ? 18 : 0);
    if (k === "rate") return h.rate * (p.buff.rage > 0 ? 2 : 1);
    if (k === "spd") return h.spd * (p.items.boots ? 1.3 : 1) * (p.buff.rage > 0 ? 1.3 : 1);
    if (k === "gather") return 0.7 / (p.items.bfury ? 3 : p.items.quelling_blade ? 2 : 1);
  }

  function updatePlayer(dt) {
    const p = S.p;
    for (const b in p.buff) p.buff[b] -= dt;
    p.skillCd = Math.max(0, p.skillCd - dt); p.flash = Math.max(0, p.flash - dt); p.swing = Math.max(0, p.swing - dt);
    if (p.dead > 0) { p.dead -= dt; if (p.dead <= 0) { p.hp = p.max; p.x = CAMP.x; p.y = CAMP.y + 24; banner("复活了"); } return; }
    // vicino al fuoco: ci si cura
    if (dist(p.x, p.y, CAMP.x, CAMP.y) < 44 && p.hp < p.max) p.hp = Math.min(p.max, p.hp + 5 * dt);
    if (p.heal > 0) { const h = Math.min(p.heal, 19 * dt); p.hp = Math.min(p.max, p.hp + h); p.heal -= h; }
    // movimento
    let mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), my = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
    if (joy) { mx = joy.dx; my = joy.dy; }
    let m = Math.hypot(mx, my);
    if (m > 0.15) p.job = null;
    // lavoro automatico: andare a raccogliere
    const job = p.job && !p.job.dead ? p.job : null;
    if (!job) p.job = null;
    const enemyNear = nearestEnemy(p.x, p.y, HERO.ranged ? HERO.range : 22);
    if (job && m <= 0.15) {
      const tx = job.c * TS + 8, ty = job.r * TS + 14, d = dist(p.x, p.y, tx, ty);
      if (d > 15) { mx = (tx - p.x) / d; my = (ty - p.y) / d; m = 1; }
      else if (!enemyNear) {
        p.face = tx >= p.x ? 1 : -1; p.aim = Math.atan2(ty - 8 - (p.y - 8), tx - p.x);
        p.gatherCd -= dt;
        if (p.gatherCd <= 0) gather(job);
      }
    }
    p.moving = m > 0.15;
    if (p.moving) {
      const sp = heroStat("spd") * Math.min(1, m) / Math.max(1, m), nx = p.x + mx * sp * dt, ny = p.y + my * sp * dt;
      if (!solidAt(nx + Math.sign(mx) * 3, p.y - 2)) p.x = clamp(nx, 4, MW - 4);
      if (!solidAt(p.x, ny + (my > 0 ? 1 : -3))) p.y = clamp(ny, 10, MH - 2);
      p.frame += dt * 9;
      if (!enemyNear) { p.aim = Math.atan2(my, mx); p.face = mx >= 0 ? 1 : -1; }
    } else p.frame = 0;
    // attacco automatico
    p.cd -= dt;
    if (enemyNear) {
      p.aim = Math.atan2(enemyNear.y - 7 - (p.y - 8), enemyNear.x - p.x); p.face = Math.cos(p.aim) >= 0 ? 1 : -1;
      if (p.cd <= 0) {
        p.cd = 1 / heroStat("rate");
        let dmg = heroStat("dmg"); if (HERO.crit && Math.random() < HERO.crit) { dmg *= 3; text(enemyNear.x, enemyNear.y - 20, "暴击!", "#ff5a3a"); }
        if (HERO.ranged) { fire(p.x + Math.cos(p.aim) * 10, p.y - 8 + Math.sin(p.aim) * 10, enemyNear, dmg, HERO.proj, "hero"); sfx("shot"); }
        else { p.swing = 0.2; hurtEnemy(enemyNear, dmg); sfx("hit"); if (p.items.bfury) for (const e of S.es) if (e !== enemyNear && dist(e.x, e.y, enemyNear.x, enemyNear.y) < 16) hurtEnemy(e, dmg * 0.5); }
      }
    }
  }
  function gather(o) {
    const p = S.p; p.gatherCd = heroStat("gather"); p.swing = 0.2; o.shake = 0.15;
    const kind = o.k === "rock" ? "stone" : "wood", n = Math.min(o.amt, 2);
    o.amt -= n; S.res[kind] += n;
    chips(o.c * TS + 8, o.r * TS + 8, kind === "stone" ? "#9da1aa" : "#b07a40");
    text(o.c * TS + 8, o.r * TS - 2, `+${n}`, kind === "stone" ? "#c8ccd6" : "#e0a860");
    sfx(kind === "stone" ? "mine" : "chop");
    if (o.amt <= 0) { o.dead = o.k === "rock" ? 200 : 140; p.job = null; recomputeFlow(); chips(o.c * TS + 8, o.r * TS + 4, kind === "stone" ? "#80848f" : "#2a6630", 12); }
  }
  function nearestEnemy(x, y, range, filter) {
    let best = null, bd = range;
    for (const e of S.es) { if (filter && !filter(e)) continue; const d = dist(x, y - 6, e.x, e.y - 6); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  function hurtEnemy(e, dmg) {
    if (e.hp <= 0) return;
    e.hp -= dmg; e.flash = 0.08; blood(e.x, e.y, 2, e.k === "golem" ? "#5a5e68" : e.k === "dragon" ? "#4a1030" : "#8a1414");
    if (e.hp <= 0) killEnemy(e);
  }
  function killEnemy(e) {
    const u = e.u; S.kills++; S.res.gold += u.gold; text(e.x, e.y - 18, "+" + u.gold, "#fde047");
    blood(e.x, e.y, u.boss ? 30 : 10, e.k === "golem" ? "#5a5e68" : "#8a1414");
    S.corpses.push({ img: u.set.r[0], x: e.x, y: e.y, face: e.face, life: 6 });
    if (u.boss) { S.p.items.aegis = 1; banner("击杀肉山！", "获得不朽之守护：下次阵亡立即复活"); renderShop(); }
  }
  function hurtPlayer(dmg) {
    const p = S.p; if (p.dead > 0) return;
    p.hp -= dmg; p.flash = 0.12; p.hurt = S.t; blood(p.x, p.y, 3);
    if (p.hp <= 0) {
      if (p.items.aegis) { p.items.aegis = 0; p.hp = p.max; banner("不朽之守护！", "原地复活"); light(p.x, p.y, 70, 0.6); renderShop(); return; }
      p.dead = 6; p.job = null; banner("你倒下了", "6秒后在篝火旁复活");
    }
  }
  function hurtCamp(dmg) { S.camp.hp -= dmg; S.shake = Math.max(S.shake, 1.5); if (S.camp.hp <= 0) gameOver(); }

  function updateBuildings(dt) {
    for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) {
      const s = S.grid[r][c]; if (!s) continue;
      const B = BUILD[s.k], cx = c * TS + 8, cy = r * TS + 8;
      s.cd -= dt;
      if (B.range) {
        const e = nearestEnemy(cx, cy - 8, B.range);
        if (e && s.cd <= 0) { s.cd = 1 / B.rate; fire(cx, cy - 16, e, B.dmg, B.proj, "tower"); sfx(s.k === "mage" ? "magic" : "shot"); }
      } else if (s.k === "spikes" && s.cd <= 0) {
        const hit = S.es.filter((e) => !e.u.fly && Math.floor(e.x / TS) === c && Math.floor(e.y / TS) === r);
        if (hit.length) { s.cd = 0.5; hit.forEach((e) => hurtEnemy(e, B.dmg)); s.hp -= 1; if (s.hp <= 0) breakStruct(c, r); }
      }
    }
  }
  function breakStruct(c, r) {
    const s = S.grid[r][c]; if (!s) return; S.grid[r][c] = null;
    chips(c * TS + 8, r * TS + 8, s.k === "wall" ? "#8c8f99" : "#8a5a2c", 14); S.shake = 2; recomputeFlow();
  }

  function updateEnemies(dt) {
    const p = S.p;
    for (const e of S.es) {
      const u = e.u;
      e.flash = Math.max(0, e.flash - dt); e.cd -= dt; e.slow = Math.max(0, e.slow - dt); e.bite = Math.max(0, (e.bite || 0) - dt);
      if (e.stun > 0) { e.stun -= dt; continue; }
      const spd = u.spd * (e.slow > 0 ? 0.55 : 1) * (S.nightT > 120 ? 1.6 : 1);
      const late = S.nightT > 120; // notte troppo lunga: gli ultimi nemici puntano dritti al fuoco
      const dp = p.dead > 0 || late ? 999 : dist(e.x, e.y, p.x, p.y), dCamp = dist(e.x, e.y, CAMP.x, CAMP.y);
      let goal = null, attack = null;
      if (u.range) {
        // tiratori: si fermano a distanza
        if (u.siege) { const s = nearestStruct(e.x, e.y, u.range); if (s) attack = s; else if (dCamp < u.range) attack = "camp"; }
        else if (dCamp < u.range) attack = "camp";
        else if (dp < u.range && e.cd <= 0) attack = "player"; // spara al giocatore quando può, poi continua ad avanzare
      } else {
        if (dp < (u.boss ? 60 : 36)) { goal = [p.x, p.y]; if (dp < 9 + u.r * 0.5) attack = "player"; }
        if (dCamp < 16 + u.r) attack = "camp";
      }
      if (!attack && !goal) {
        if (u.fly) goal = [CAMP.x, CAMP.y];
        else {
          let [c, r] = tileAt(e.x, e.y); c = clamp(c, 0, MC - 1); r = clamp(r, 0, MR - 1);
          const inside = e.x >= 0 && e.y >= 0 && e.x < MW && e.y < MH;
          if (!inside) goal = [c * TS + 8, r * TS + 12];
          else {
            let bc = c, br = r, bd = flowAt(c, r);
            for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = c + a, nr = r + b, f = isCamp(nc, nr) ? -1 : flowAt(nc, nr); if (f < bd) { bd = f; bc = nc; br = nr; } }
            goal = [bc * TS + 8, br * TS + 12];
            const s = inMap(bc, br) && S.grid[br][bc];
            if (s && BUILD[s.k].solid && dist(e.x, e.y, goal[0], goal[1]) < 13) attack = { s, c: bc, r: br };
            else if (u.range && s && BUILD[s.k].solid) attack = { s, c: bc, r: br };
          }
        }
      }
      if (attack) {
        const tx = attack === "player" ? p.x : attack === "camp" ? CAMP.x : attack.c * TS + 8;
        e.face = tx >= e.x ? 1 : -1;
        if (e.cd <= 0) {
          e.cd = 1 / u.rate; e.bite = 0.15;
          if (u.range) {
            const target = attack === "player" ? { kind: "player" } : attack === "camp" ? { kind: "camp" } : { kind: "struct", c: attack.c, r: attack.r };
            fireAt(e.x + e.face * 6, e.y - 10, target, u.dmg, u.proj, "enemy", u.splash);
          } else if (attack === "player") hurtPlayer(u.dmg);
          else if (attack === "camp") { hurtCamp(u.dmg); chips(CAMP.x, CAMP.y - 4, "#ffb03a", 3); }
          else { attack.s.hp -= u.dmg; chips(attack.c * TS + 8, attack.r * TS + 8, attack.s.k === "wall" ? "#9da1aa" : "#b07a40", 3); sfx("hit"); if (attack.s.hp <= 0) breakStruct(attack.c, attack.r); }
        }
      } else if (goal) {
        const a = Math.atan2(goal[1] - e.y, goal[0] - e.x);
        e.x += Math.cos(a) * spd * dt; e.y += Math.sin(a) * spd * dt;
        if (Math.abs(Math.cos(a)) > 0.2) e.face = Math.cos(a) > 0 ? 1 : -1;
        e.frame += dt * Math.max(3, spd / 4);
      }
    }
    for (let i = 0; i < S.es.length; i++) for (let j = i + 1; j < S.es.length; j++) {
      const a = S.es[i], b = S.es[j]; if (a.u.fly !== b.u.fly) continue;
      const d = dist(a.x, a.y, b.x, b.y), m = (a.u.r + b.u.r) * 0.8;
      if (d < m && d > 0.01) { const k = ((m - d) / d) * 0.25; a.x -= (b.x - a.x) * k; a.y -= (b.y - a.y) * k; b.x += (b.x - a.x) * k; b.y += (b.y - a.y) * k; }
    }
    S.es = S.es.filter((e) => e.hp > 0);
  }
  function nearestStruct(x, y, range) {
    let best = null, bd = range;
    for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) { const s = S.grid[r][c]; if (!s || !BUILD[s.k].solid) continue; const d = dist(x, y, c * TS + 8, r * TS + 8); if (d < bd) { bd = d; best = { s, c, r }; } }
    return best;
  }

  // ---------- proiettili ----------
  const PROJ = {
    fire: { col: "#ff8a2a", core: "#fff0a0", spd: 170, light: 18 }, bullet: { col: "#ffe08a", spd: 320, tracer: true }, frost: { col: "#7ad0ff", core: "#e6fbff", spd: 220, light: 10 },
    holy: { col: "#fff3a0", core: "#ffffff", spd: 190, light: 12 }, arrow: { col: "#d8c8a0", spd: 240, arrow: true }, magic: { col: "#9a7aff", core: "#e8deff", spd: 170, light: 14 },
    green: { col: "#8aff5a", core: "#e8ffd0", spd: 150, light: 10 }, rock: { col: "#8a8f99", spd: 110, arc: true }, hook: { col: "#c0c4cc", spd: 260, chain: true },
  };
  function fire(x, y, enemy, dmg, kind, from, extra = {}) { S.proj.push({ x, y, sx: x, sy: y, target: { kind: "enemy", e: enemy }, dmg, kind, from, ...extra }); }
  function fireAt(x, y, target, dmg, kind, from, splash) { S.proj.push({ x, y, sx: x, sy: y, target, dmg, kind, from, splash }); }
  function targetPos(t) {
    if (t.kind === "enemy") return t.e.hp > 0 ? [t.e.x, t.e.y - 7] : null;
    if (t.kind === "player") return S.p.dead > 0 ? null : [S.p.x, S.p.y - 7];
    if (t.kind === "camp") return [CAMP.x, CAMP.y - 6];
    if (t.kind === "struct") return S.grid[t.r][t.c] ? [t.c * TS + 8, t.r * TS + 6] : null;
    if (t.kind === "point") return [t.x, t.y];
  }
  function updateProjectiles(dt) {
    for (const q of S.proj) {
      const P = PROJ[q.kind], tp = targetPos(q.target);
      if (!tp) { q.dead = true; continue; }
      const d = dist(q.x, q.y, tp[0], tp[1]), step = P.spd * dt;
      q.ang = Math.atan2(tp[1] - q.y, tp[0] - q.x);
      if (d <= step + 2) { q.dead = true; impact(q, tp); continue; }
      q.x += Math.cos(q.ang) * step; q.y += Math.sin(q.ang) * step;
      if (P.light && Math.random() < 0.5) S.parts.push({ x: q.x, y: q.y, vx: 0, vy: 0, g: 0, life: 0.15, col: P.col, s: 1 });
    }
    S.proj = S.proj.filter((q) => !q.dead);
  }
  function impact(q, [x, y]) {
    const t = q.target;
    if (q.kind === "hook") { const e = t.e; if (e.hp > 0 && !e.u.boss) { e.x = S.p.x + S.p.face * 10; e.y = S.p.y; e.stun = 0.6; } hurtEnemy(e, q.dmg); blood(e.x, e.y, 8); return; }
    if (t.kind === "enemy") {
      hurtEnemy(t.e, q.dmg);
      if (q.kind === "frost" || q.kind === "magic") t.e.slow = 2;
      if (q.splash) for (const e of S.es) if (e !== t.e && dist(e.x, e.y, x, y) < q.splash) hurtEnemy(e, q.dmg * 0.6);
    } else if (t.kind === "player") hurtPlayer(q.dmg);
    else if (t.kind === "camp") hurtCamp(q.dmg);
    else if (t.kind === "struct") { const s = S.grid[t.r][t.c]; if (s) { s.hp -= q.dmg; if (s.hp <= 0) breakStruct(t.c, t.r); } }
    if (q.splash || q.kind === "fire") { for (let i = 0; i < 12; i++) S.parts.push({ x, y, vx: rnd(-60, 60), vy: rnd(-70, 10), g: 120, life: rnd(0.2, 0.45), col: q.kind === "rock" ? "#8a8f99" : ["#fff0a0", "#ff8a2a", "#d8402a"][i % 3], s: 1 }); light(x, y, 30, 0.2); if (q.from === "enemy") sfx("boom"); }
    else S.parts.push({ x, y, vx: 0, vy: 0, g: 0, life: 0.06, col: PROJ[q.kind].core || "#fff", s: 2 });
  }

  // ---------- abilità (Q) ----------
  function useSkill() {
    const p = S.p; if (p.dead > 0 || p.skillCd > 0) return;
    const h = HERO; let ok = true;
    if (h.skill === "fire") { const e = nearestEnemy(p.x, p.y, 120); if (!e) ok = false; else { hurtEnemy(e, 260 + S.day * 10); for (let i = 0; i < 30; i++) S.parts.push({ x: e.x, y: e.y - 6, vx: rnd(-50, 50), vy: rnd(-120, -20), g: 60, life: rnd(0.3, 0.7), col: ["#fff6c8", "#ffd24a", "#ff8a2a", "#d8402a"][i % 4], s: i % 4 ? 1 : 2 }); light(e.x, e.y, 60, 0.4); S.shake = 3; } }
    else if (h.skill === "rage") { p.buff.rage = 6; text(p.x, p.y - 24, "干干干！", "#ff6a3a"); }
    else if (h.skill === "whisky") { p.hp = Math.min(p.max, p.hp + p.max * 0.6); S.camp.hp = Math.min(S.camp.max, S.camp.hp + 150); text(p.x, p.y - 24, "威士忌！", "#e0a040"); }
    else if (h.skill === "blink") { const e = nearestEnemy(p.x, p.y, 130); if (!e) ok = false; else { for (let i = 0; i < 8; i++) S.parts.push({ x: p.x, y: p.y - 6, vx: rnd(-30, 30), vy: rnd(-30, 30), g: 0, life: 0.3, col: "#8ab4ff", s: 1 }); p.x = e.x - e.face * 10; p.y = e.y; hurtEnemy(e, heroStat("dmg") * 4); text(e.x, e.y - 22, "暴击!", "#ff5a3a"); } }
    else if (h.skill === "frost") { for (let i = -3; i <= 3; i++) { const a = p.aim + i * 0.16, tx = p.x + Math.cos(a) * 140, ty = p.y - 8 + Math.sin(a) * 140; const e = S.es.filter((e) => Math.abs(((Math.atan2(e.y - p.y, e.x - p.x) - a + 9.42) % 6.283) - 3.14) < 0.12 && dist(p.x, p.y, e.x, e.y) < 140).sort((x, y) => dist(p.x, p.y, x.x, x.y) - dist(p.x, p.y, y.x, y.y))[0]; if (e) fire(p.x, p.y - 8, e, 14, "frost", "hero"); else S.proj.push({ x: p.x, y: p.y - 8, target: { kind: "point", x: tx, y: ty }, dmg: 0, kind: "frost", from: "hero" }); } }
    else if (h.skill === "hook") { const e = S.es.filter((e) => !e.u.fly && dist(p.x, p.y, e.x, e.y) < 140).sort((a, b) => dist(p.x, p.y, b.x, b.y) - dist(p.x, p.y, a.x, a.y))[0]; if (!e) ok = false; else fire(p.x, p.y - 8, e, 120, "hook", "hero"); }
    else if (h.skill === "dash") { const a = p.aim; for (let k = 0; k < 14; k++) { const nx = p.x + Math.cos(a) * 5, ny = p.y + Math.sin(a) * 5; if (solidAt(nx, ny)) break; p.x = nx; p.y = ny; S.parts.push({ x: p.x, y: p.y - 6, vx: 0, vy: 0, g: 0, life: 0.25, col: "#3a6aca", s: 1 }); for (const e of S.es) if (!e.dashed && dist(e.x, e.y, p.x, p.y) < 12) { e.dashed = 1; hurtEnemy(e, 40); S.res.gold += 3; text(e.x, e.y - 18, "+3", "#fde047"); } } S.es.forEach((e) => (e.dashed = 0)); }
    else if (h.skill === "stun") { for (const e of S.es) if (dist(e.x, e.y, p.x, p.y) < 52) { e.stun = 2; hurtEnemy(e, 90); } for (let i = 0; i < 26; i++) { const a = (i / 26) * 6.283; S.parts.push({ x: p.x + Math.cos(a) * 8, y: p.y + Math.sin(a) * 5, vx: Math.cos(a) * 90, vy: Math.sin(a) * 55, g: 0, life: 0.35, col: "#e0c060", s: 1 }); } S.shake = 3; text(p.x, p.y - 24, "MVP!", "#ffd24a"); }
    else if (h.skill === "snipe") { const e = S.es.filter((e) => dist(p.x, p.y, e.x, e.y) < 220).sort((a, b) => dist(p.x, p.y, b.x, b.y) - dist(p.x, p.y, a.x, a.y))[0]; if (!e) ok = false; else { fire(p.x, p.y - 8, e, 230 + S.day * 12, "bullet", "hero"); text(e.x, e.y - 22, "爆头!", "#ff5a3a"); } }
    else if (h.skill === "heal") { S.camp.hp = Math.min(S.camp.max, S.camp.hp + 300); p.hp = p.max; light(CAMP.x, CAMP.y, 80, 0.6); text(CAMP.x, CAMP.y - 30, "+300", "#7aff9a"); }
    if (ok) { p.skillCd = h.cd; sfx("magic"); } else text(p.x, p.y - 24, "附近没有目标", "#9a90a8");
  }
  function useSalve() { const p = S.p; if (p.salve > 0 && p.dead <= 0) { p.salve--; p.heal += 150; text(p.x, p.y - 24, "+150", "#7aff9a"); renderShop(); } }

  // ---------- costruire / comprare ----------
  function canBuild(c, r, k) {
    if (!inMap(c, r) || isCamp(c, r) || resLive(c, r) || S.grid[r][c]) return false;
    const [pc, pr] = tileAt(S.p.x, S.p.y); if (BUILD[k].solid && pc === c && pr === r) return false;
    return afford(BUILD[k].cost);
  }
  function place(c, r) {
    const k = S.tool;
    if (k === "sell") { const s = inMap(c, r) && S.grid[r][c]; if (!s) return; for (const [rk, v] of Object.entries(BUILD[s.k].cost)) S.res[rk] += Math.floor(v / 2); S.grid[r][c] = null; recomputeFlow(); sfx("build"); return; }
    if (!k || !canBuild(c, r, k)) return;
    pay(BUILD[k].cost); S.grid[r][c] = { k, hp: BUILD[k].hp, max: BUILD[k].hp, cd: 0 };
    chips(c * TS + 8, r * TS + 14, "#a08a68", 6); sfx("build"); recomputeFlow();
  }
  function buy(k) {
    const it = ITEMS[k]; if (!afford(it.cost)) return;
    if (it.needs && !S.p.items[it.needs]) return;
    if (!it.stack && !it.camp && S.p.items[k]) return;
    pay(it.cost);
    if (k === "flask") S.p.salve++;
    else if (it.camp) { S.camp.max += 400; S.camp.hp = S.camp.max; S.camp.lvl++; light(CAMP.x, CAMP.y, 90, 0.8); banner(`篝火 Lv.${S.camp.lvl}`); }
    else { S.p.items[k] = 1; if (k === "bfury") delete S.p.items.quelling_blade; banner(`获得 ${it.name}`); }
    sfx("build"); renderShop();
  }
  function gameOver() {
    S.over = true; S.camp.hp = 0;
    let best = 0; try { best = Math.max(+localStorage.getItem("cf:best") || 0, S.day); localStorage.setItem("cf:best", best); } catch {}
    $("over-text").innerHTML = `${HERO.name} 守住了 <b>${S.day - (S.phase === "day" ? 1 : 0)}</b> 个夜晚 · 击杀 <b>${S.kills}</b><br>最佳纪录：第 ${best} 天`;
    $("over").hidden = false;
  }

  // =====================================================================
  //  DISEGNO
  // =====================================================================
  const dirIdx = (a) => ((Math.round((a / (Math.PI * 2)) * 32) % 32) + 32) % 32;
  function draw() {
    const cx = S.cam.x, cy = S.cam.y;
    g.save();
    if (S.shake) g.translate(Math.round(rnd(-S.shake, S.shake)), Math.round(rnd(-S.shake, S.shake)));
    g.drawImage(groundC, cx, cy, VW, VH, 0, 0, VW, VH);
    g.drawImage(decalC, cx, cy, VW, VH, 0, 0, VW, VH);
    g.translate(-cx, -cy);
    const vis = (x, y, m = 40) => x > cx - m && x < cx + VW + m && y > cy - m && y < cy + VH + m + 20;
    // piatti
    for (const o of RES) if (o.dead && vis(o.c * TS, o.r * TS)) { const im = o.k === "rock" ? A.rubble : A.stump; g.drawImage(im, o.c * TS + 8 - (im.width >> 1), o.r * TS + 15 - im.height); }
    for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) { const s = S.grid[r][c]; if (s && s.k === "spikes") g.drawImage(A.spikes, c * TS + 1, r * TS + 9); }
    for (const k of S.corpses) { if (!vis(k.x, k.y)) continue; g.save(); g.globalAlpha = Math.min(1, k.life / 2); g.translate(Math.round(k.x), Math.round(k.y)); g.rotate((k.face > 0 ? -1 : 1) * Math.PI / 2); g.drawImage(k.img, -k.img.height + 2, -(k.img.width >> 1)); g.restore(); }
    // ordinati per y
    const L = [];
    for (const o of RES) { if (o.dead || !vis(o.c * TS, o.r * TS)) continue; L.push({ y: o.r * TS + 15, d: () => {
      const im = SPR[o.k][o.v], sh = o.shake > 0 ? Math.round(Math.sin(S.t * 60) * 1) : 0;
      g.fillStyle = "rgba(0,0,0,.28)"; g.fillRect(o.c * TS + 1, o.r * TS + 12, 14, 4);
      g.drawImage(im, o.c * TS + 8 - Math.floor(im.width / 2) + sh, o.r * TS + 16 - im.height);
    } }); }
    for (const d of DECOR) if (vis(d.x, d.y)) L.push({ y: d.y, d: () => g.drawImage(d.img, d.x - (d.img.width >> 1), d.y - d.img.height) });
    L.push({ y: CAMP.y, d: drawCamp });
    for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) {
      const s = S.grid[r][c]; if (!s || s.k === "spikes" || !vis(c * TS, r * TS)) continue;
      L.push({ y: r * TS + 15, d: () => {
        const x0 = c * TS, y0 = r * TS, dmg = s.hp < s.max / 2 ? 1 : 0;
        if (s.k === "fence") g.drawImage(A.fence[dmg], x0 - 1, y0 + 4);
        else if (s.k === "wall") g.drawImage(A.stoneWall[dmg], x0 - 1, y0 + 4);
        else { const im = s.k === "arrow" ? A.towerArrow : A.towerMage; g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(x0 + 1, y0 + 12, 15, 4); g.drawImage(im, x0 - 2, y0 + 16 - im.height); }
      } });
    }
    for (const e of S.es) if (vis(e.x, e.y)) L.push({ y: e.u.fly ? e.y + 40 : e.y, d: () => drawUnit(e) });
    if (S.p.dead <= 0) L.push({ y: S.p.y, d: drawHero });
    L.sort((a, b) => a.y - b.y).forEach((o) => o.d());
    // proiettili e particelle
    for (const q of S.proj) {
      const P = PROJ[q.kind], x = Math.round(q.x), y = Math.round(q.y);
      if (P.tracer) { g.strokeStyle = "rgba(255,230,140,.9)"; g.beginPath(); g.moveTo(x + 0.5, y + 0.5); g.lineTo(x - Math.cos(q.ang) * 6 + 0.5, y - Math.sin(q.ang) * 6 + 0.5); g.stroke(); }
      else if (P.arrow) { g.fillStyle = P.col; for (let k = 0; k < 5; k++) g.fillRect(Math.round(x - Math.cos(q.ang) * k), Math.round(y - Math.sin(q.ang) * k), 1, 1); g.fillStyle = "#fff"; g.fillRect(x, y, 1, 1); }
      else if (P.chain) { g.strokeStyle = "#8a8f99"; g.beginPath(); g.moveTo(S.p.x + 0.5, S.p.y - 7.5); g.lineTo(x + 0.5, y + 0.5); g.stroke(); g.fillStyle = "#e6e9ef"; g.fillRect(x - 1, y - 1, 3, 3); }
      else { g.fillStyle = P.col; g.fillRect(x - 1, y - 1, 3, 3); g.fillStyle = P.core || P.col; g.fillRect(x, y, 1, 1); }
    }
    for (const q of S.parts) { g.fillStyle = q.col; g.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s); }
    g.restore();
    // ---- luce: giorno / notte ----
    const night = S.light;
    if (night > 0.02) {
      dk.globalCompositeOperation = "source-over"; dk.clearRect(0, 0, VW, VH);
      dk.fillStyle = `rgba(8,10,28,${0.74 * night})`; dk.fillRect(0, 0, VW, VH);
      dk.globalCompositeOperation = "destination-out";
      const L2 = (x, y, r, a = 1) => { x -= cx; y -= cy; if (x < -r || y < -r || x > VW + r || y > VH + r) return; const gr = dk.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.6})`); gr.addColorStop(1, "rgba(0,0,0,0)"); dk.fillStyle = gr; dk.fillRect(x - r, y - r, r * 2, r * 2); };
      const flick = 1 + Math.sin(S.t * 9) * 0.04 + Math.sin(S.t * 23) * 0.03;
      L2(CAMP.x, CAMP.y - 8, (78 + S.camp.lvl * 10) * flick, 0.95);
      if (S.p.dead <= 0) L2(S.p.x, S.p.y - 6, 40, 0.85);
      for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) { const s = S.grid[r][c]; if (s && s.k === "mage") L2(c * TS + 8, r * TS - 6, 26, 0.6); if (s && s.k === "arrow") L2(c * TS + 8, r * TS - 4, 16, 0.4); }
      for (const q of S.proj) { const P = PROJ[q.kind]; if (P.light) L2(q.x, q.y, P.light, 0.8); }
      for (const l of S.lights) L2(l.x, l.y, l.r, l.life / l.max);
      g.drawImage(darkC, 0, 0);
      g.globalCompositeOperation = "lighter";
      const glow = (x, y, r, col) => { x -= cx; y -= cy; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
      glow(CAMP.x, CAMP.y - 8, 34 * flick, `rgba(255,150,60,${0.28 * night})`);
      for (const l of S.lights) glow(l.x, l.y, l.r * 0.5, `rgba(255,170,60,${0.4 * l.life / l.max})`);
      g.globalCompositeOperation = "source-over";
      // occhi che brillano
      for (const e of S.es) { if (!vis(e.x, e.y) || e.k === "siege") continue; const im = e.u.set.r[0]; const ey = Math.round(e.y) - im.height + 5 - cy; g.fillStyle = e.k === "ranged" ? "#8aff5a" : "#ff6a3a"; g.fillRect(Math.round(e.x) + e.face * 2 - cx, ey, 1, 1); }
    } else {
      g.globalCompositeOperation = "lighter"; const gr = g.createRadialGradient(CAMP.x - cx, CAMP.y - 8 - cy, 0, CAMP.x - cx, CAMP.y - 8 - cy, 22); gr.addColorStop(0, "rgba(255,150,60,.18)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(CAMP.x - cx - 22, CAMP.y - cy - 30, 44, 44); g.globalCompositeOperation = "source-over";
    }
    // ---- sopra al buio: barre, anteprima, testi ----
    g.save(); g.translate(-cx, -cy);
    for (const e of S.es) if (e.hp < e.max && vis(e.x, e.y)) { const h = e.u.set.r[0].height; bar(e.x - 6, e.y - h - 2, e.u.boss ? 24 : 12, e.hp / e.max, "#e23b3b"); }
    for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) { const s = S.grid[r][c]; if (s && s.hp < s.max && s.k !== "spikes") bar(c * TS + 2, r * TS - (s.k === "arrow" || s.k === "mage" ? 18 : 0), 12, s.hp / s.max, "#4ade80"); }
    if (S.camp.hp < S.camp.max) bar(CAMP.x - 12, CAMP.y - 30, 24, S.camp.hp / S.camp.max, "#ffb03a");
    if (S.p.dead <= 0 && S.p.hp < S.p.max) bar(S.p.x - 6, S.p.y - 20, 12, S.p.hp / S.p.max, "#4ade80");
    if (S.p.job && !S.p.job.dead) { const o = S.p.job; g.strokeStyle = "rgba(255,230,140,.7)"; g.strokeRect(o.c * TS + 0.5, o.r * TS + 0.5, 15, 15); }
    if (S.tool && S.hover) {
      const [c, r] = S.hover;
      if (inMap(c, r)) {
        const ok = S.tool === "sell" ? !!S.grid[r][c] : canBuild(c, r, S.tool);
        if (S.tool !== "sell") { g.globalAlpha = 0.6; const im = { fence: A.fence[0], wall: A.stoneWall[0], spikes: A.spikes, arrow: A.towerArrow, mage: A.towerMage }[S.tool]; g.drawImage(im, c * TS + 8 - (im.width >> 1), r * TS + 16 - im.height); g.globalAlpha = 1; }
        g.strokeStyle = ok ? "rgba(120,255,140,.9)" : "rgba(255,80,80,.9)"; g.strokeRect(c * TS + 0.5, r * TS + 0.5, 15, 15);
        const B = BUILD[S.tool]; if (B && B.range) { g.strokeStyle = "rgba(255,255,255,.25)"; g.beginPath(); g.arc(c * TS + 8, r * TS + 8, B.range, 0, 7); g.stroke(); }
      }
    }
    g.font = "bold 7px monospace"; g.textAlign = "center";
    for (const t of S.texts) { g.globalAlpha = Math.min(1, t.life * 2); g.fillStyle = "#000"; g.fillText(t.t, Math.round(t.x) + 1, Math.round(t.y) + 1); g.fillStyle = t.col; g.fillText(t.t, Math.round(t.x), Math.round(t.y)); }
    g.globalAlpha = 1; g.restore();
  }
  function bar(x, y, w, p, col) { x = Math.round(x); y = Math.round(y); g.fillStyle = "#111"; g.fillRect(x - 1, y - 1, w + 2, 4); g.fillStyle = "#3a1010"; g.fillRect(x, y, w, 2); g.fillStyle = col; g.fillRect(x, y, Math.max(1, Math.round(w * clamp(p, 0, 1))), 2); }
  function drawCamp() {
    const b = A.camp.base, f = A.camp.flames[Math.floor(S.t * 10) % 6];
    g.fillStyle = "rgba(0,0,0,.25)"; g.fillRect(CAMP.x - 14, CAMP.y - 2, 28, 4);
    g.drawImage(b, CAMP.x - (b.width >> 1), CAMP.y + 2 - b.height);
    const s = 1 + (S.camp.lvl - 1) * 0.15;
    g.drawImage(f, Math.round(CAMP.x - (f.width * s) / 2), Math.round(CAMP.y - 6 - f.height * s), Math.round(f.width * s), Math.round(f.height * s));
    if (Math.random() < 0.3) S.parts.push({ x: CAMP.x + rnd(-3, 3), y: CAMP.y - 14, vx: rnd(-6, 6), vy: rnd(-30, -16), g: 0, life: rnd(0.4, 0.9), col: Math.random() < 0.5 ? "#ffb03a" : "#ffe27a", s: 1 });
  }
  function drawUnit(e) {
    const set = e.u.set, f = Math.floor(e.frame) % set.r.length;
    const im = e.flash > 0 ? (e.face > 0 ? set.w : set.wl)[f] : (e.face > 0 ? set.r : set.l)[f];
    const lunge = e.bite ? e.face * 2 : 0, x = Math.round(e.x) - (im.width >> 1) + lunge, y = Math.round(e.y) - im.height + 1 - (e.u.fly ? 14 + Math.round(Math.sin(S.t * 4) * 2) : 0);
    g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(Math.round(e.x) - e.u.r, Math.round(e.y) - 1, e.u.r * 2, 3);
    if (e.slow > 0) { g.globalAlpha = 0.9; }
    g.drawImage(im, x, y);
    if (e.slow > 0) { g.globalAlpha = 0.35; g.fillStyle = "#7ad0ff"; g.fillRect(x + 2, y + 2, im.width - 4, im.height - 4); g.globalAlpha = 1; }
    if (e.stun > 0) { g.fillStyle = "#ffe27a"; for (let k = 0; k < 3; k++) { const a = S.t * 6 + k * 2.1; g.fillRect(Math.round(e.x + Math.cos(a) * 5), Math.round(y - 2 + Math.sin(a) * 2), 1, 1); } }
  }
  function drawHero() {
    const p = S.p, f = p.moving ? Math.floor(p.frame) % 4 : 0, set = HERO.spr;
    const im = p.flash > 0 ? set.w[f] : (p.face > 0 ? set.r : set.l)[f];
    const x = Math.round(p.x), y = Math.round(p.y);
    g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x - 5, y - 1, 10, 3);
    if (p.buff.rage > 0) { g.globalAlpha = 0.35; g.fillStyle = "#ff3a2a"; g.fillRect(x - 7, y - 17, 14, 17); g.globalAlpha = 1; }
    let a = p.aim; if (p.swing > 0 && !HERO.ranged) a += (p.face > 0 ? 1 : -1) * (1.2 - (p.swing / 0.2) * 2.4);
    const wset = (Math.cos(a) >= 0 ? A.WEAPON_R : A.WEAPON_L)[HERO.w], R = wset[dirIdx(a)];
    const wpn = () => g.drawImage(R.img, x + (p.face > 0 ? 1 : -1) - R.ox, y - 9 - R.oy);
    if (Math.sin(a) < -0.3) wpn();
    g.drawImage(im, x - (im.width >> 1), y - im.height + 1);
    if (Math.sin(a) >= -0.3) wpn();
    if (p.swing > 0 && !HERO.ranged) { g.fillStyle = "rgba(255,255,255,.8)"; for (let k = -2; k <= 2; k++) { const b = p.aim + k * 0.3; g.fillRect(Math.round(x + Math.cos(b) * 13), Math.round(y - 8 + Math.sin(b) * 13), 1, 1); } }
    g.font = "bold 6px sans-serif"; g.textAlign = "center"; g.fillStyle = "#000"; g.fillText(HERO.name, x + 1, y - 21); g.fillStyle = HERO.color; g.fillText(HERO.name, x, y - 22);
  }

  // =====================================================================
  //  HUD, NEGOZIO, MINIMAPPA
  // =====================================================================
  const [mmC, mm] = A.mk(MC * 2, MR * 2);
  let lastKey = "";
  function hud(force) {
    const p = S.p;
    const status = S.phase === "day" ? `第 ${S.day} 天 · ${Math.ceil(S.clock)}秒后入夜` : `第 ${S.day} 夜 · 敌人 ${S.queue.length + S.es.length}`;
    const key = [Math.floor(S.res.wood), S.res.stone, S.res.gold, Math.ceil(S.camp.hp), S.camp.max, Math.ceil(p.hp), p.dead > 0, status, Math.ceil(p.skillCd), p.salve, S.tool].join("|");
    if (key !== lastKey || force) {
      lastKey = key;
      $("r-wood").textContent = S.res.wood; $("r-stone").textContent = S.res.stone; $("r-gold").textContent = S.res.gold;
      $("h-camp").style.width = (S.camp.hp / S.camp.max) * 100 + "%"; $("h-camp-t").textContent = `${Math.max(0, Math.ceil(S.camp.hp))}/${S.camp.max}`;
      $("h-hp").style.width = Math.max(0, p.hp / p.max) * 100 + "%"; $("h-hp-t").textContent = p.dead > 0 ? "复活中" : `${Math.ceil(p.hp)}/${p.max}`;
      $("status").textContent = status; $("status").className = "status " + S.phase;
      $("skill").classList.toggle("cd", p.skillCd > 0); $("skill-cd").textContent = p.skillCd > 0 ? Math.ceil(p.skillCd) : "";
      $("salve-n").textContent = p.salve; $("salve").classList.toggle("cd", p.salve <= 0);
      document.querySelectorAll("[data-b]").forEach((b) => { const k = b.dataset.b; b.classList.toggle("on", S.tool === k); b.classList.toggle("poor", !!BUILD[k] && !afford(BUILD[k].cost)); });
      document.querySelectorAll("[data-i]").forEach((b) => { const k = b.dataset.i, it = ITEMS[k]; b.classList.toggle("poor", !afford(it.cost) || (it.needs && !p.items[it.needs]) || (!it.stack && !it.camp && !!p.items[k])); });
    }
    // minimappa (4 volte al secondo)
    if (force || Math.floor(S.t * 4) !== Math.floor((S.t - 0.017) * 4)) {
      mm.fillStyle = "#1c3318"; mm.fillRect(0, 0, mmC.width, mmC.height);
      mm.fillStyle = "#3a2e20"; mm.beginPath(); mm.ellipse(CAMP.c * 2 + 1, CAMP.r * 2 + 1, 14, 10, 0, 0, 7); mm.fill();
      for (const o of RES) if (!o.dead) { mm.fillStyle = o.k === "rock" ? "#8a8f99" : "#0e2410"; mm.fillRect(o.c * 2, o.r * 2, 2, 2); }
      for (let r = 0; r < MR; r++) for (let c = 0; c < MC; c++) if (S.grid[r][c]) { mm.fillStyle = "#c08a4e"; mm.fillRect(c * 2, r * 2, 2, 2); }
      mm.fillStyle = "#ffb03a"; mm.fillRect(CAMP.c * 2 - 1, CAMP.r * 2 - 1, 4, 4);
      mm.fillStyle = "#ff3a3a"; for (const e of S.es) mm.fillRect(Math.round(e.x / 8) - (e.u.boss ? 1 : 0), Math.round(e.y / 8) - (e.u.boss ? 1 : 0), e.u.boss ? 3 : 2, e.u.boss ? 3 : 2);
      mm.fillStyle = "#fff"; mm.fillRect(Math.round(p.x / 8) - 1, Math.round(p.y / 8) - 1, 3, 3);
      mm.strokeStyle = "rgba(255,255,255,.5)"; mm.strokeRect(S.cam.x / 8 + 0.5, S.cam.y / 8 + 0.5, VW / 8, VH / 8);
      const m = $("minimap"), x = m.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(mmC, 0, 0);
    }
  }
  function costHTML(cost) { return Object.entries(cost).map(([k, v]) => `<em class="c-${k}">${v}</em>`).join(""); }
  function renderShop() {
    const BUILD_ICON = { fence: A.fence[0], wall: A.stoneWall[0], spikes: A.spikes, arrow: A.towerArrow, mage: A.towerMage };
    $("tab-build").innerHTML = Object.entries(BUILD).map(([k, b], i) => `<button class="slot" data-b="${k}" title="${b.name}"><canvas width="22" height="30" data-ic="${k}"></canvas><span>${b.name}</span><span class="cost">${costHTML(b.cost)}</span><i>${i + 1}</i></button>`).join("") +
      `<button class="slot" data-b="sell" title="拆除：返还一半材料"><canvas width="22" height="30" data-ic="sell"></canvas><span>拆除</span><span class="cost">½</span><i>6</i></button>`;
    $("tab-items").innerHTML = Object.entries(ITEMS).map(([k, it]) => {
      const owned = k === "flask" ? S.p.salve : S.p.items[k] ? "✔" : "";
      return `<button class="slot item" data-i="${k}" title="${it.desc}">${ITEM_IMG(k) ? `<img src="${ITEM_IMG(k)}" alt="">` : `<canvas width="22" height="30" data-ic="campfire"></canvas>`}<span>${it.name}</span><span class="cost">${costHTML(it.cost)}</span>${owned ? `<b class="own">${owned}</b>` : ""}</button>`;
    }).join("") + (S.p.items.aegis ? `<div class="slot item aegis"><img src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/aegis.png" alt=""><span>不朽之守护</span><span class="cost">已拥有</span></div>` : "");
    document.querySelectorAll("canvas[data-ic]").forEach((c) => {
      const x = c.getContext("2d"), k = c.dataset.ic; x.imageSmoothingEnabled = false;
      if (k === "sell") { x.fillStyle = "#e23b3b"; x.fillRect(5, 14, 12, 2); x.fillRect(10, 9, 2, 12); return; }
      const im = k === "campfire" ? A.camp.flames[2] : BUILD_ICON[k]; const s = Math.min(1, 22 / im.width, 30 / im.height);
      x.drawImage(im, Math.floor((22 - im.width * s) / 2), Math.floor((30 - im.height * s) / 2), im.width * s, im.height * s);
    });
    document.querySelectorAll("[data-b]").forEach((b) => (b.onclick = () => { S.tool = S.tool === b.dataset.b ? null : b.dataset.b; hud(true); }));
    document.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => buy(b.dataset.i)));
    hud(true);
  }
  document.querySelectorAll(".tab").forEach((t) => (t.onclick = () => { document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("on", x === t)); $("tab-build").hidden = t.dataset.t !== "build"; $("tab-items").hidden = t.dataset.t !== "items"; }));
  $("skill").onclick = () => useSkill();
  $("salve").onclick = () => useSalve();
  $("mute").onclick = () => { muted = !muted; $("mute").textContent = muted ? "🔇" : "🔊"; };

  // =====================================================================
  //  INPUT
  // =====================================================================
  const toWorld = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * VW + S.cam.x, ((e.clientY - r.top) / r.height) * VH + S.cam.y]; };
  addEventListener("keydown", (e) => {
    if (!S || !running) return;
    const k = e.key.toLowerCase(); keys[k] = true;
    if ("123456".includes(k) && k.length === 1) { S.tool = ["fence", "wall", "spikes", "arrow", "mage", "sell"][+k - 1]; hud(true); }
    if (k === "escape") { S.tool = null; hud(true); }
    if (k === "q") useSkill();
    if (k === "h") useSalve();
    if (k === "e") { const [c, r] = tileAt(S.p.x, S.p.y); let best = null, bd = 99; for (let dr = -1; dr <= 1; dr++) for (let d2 = -1; d2 <= 1; d2++) { const o = resLive(c + d2, r + dr); if (o) { const d = dist(S.p.x, S.p.y, o.c * TS + 8, o.r * TS + 8); if (d < bd) { bd = d; best = o; } } } if (best) S.p.job = best; }
    if (k.startsWith("arrow") || k === " ") e.preventDefault();
  });
  addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));
  cv.addEventListener("contextmenu", (e) => { e.preventDefault(); S.tool = null; hud(true); });
  cv.addEventListener("pointermove", (e) => { if (!S) return; const [x, y] = toWorld(e); S.hover = tileAt(x, y); if (joy && e.pointerId === joy.id) moveJoy(e); });
  cv.addEventListener("pointerdown", (e) => {
    if (!S || !running) return; audio();
    const [x, y] = toWorld(e), [c, r] = tileAt(x, y);
    if (S.tool) { if (e.button !== 2) place(c, r); return; }
    // tocco/clic su una risorsa: vai a raccogliere
    const o = resLive(c, r) || resLive(...tileAt(x, y + 10));
    if (o) { S.p.job = o; return; }
    if (e.pointerType === "touch") { joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 }; showJoy(); }
  });
  const endJoy = (e) => { if (joy && e.pointerId === joy.id) { joy = null; $("joy").hidden = true; } };
  cv.addEventListener("pointerup", endJoy); cv.addEventListener("pointercancel", endJoy);
  function moveJoy(e) { const dx = e.clientX - joy.ox, dy = e.clientY - joy.oy, m = Math.hypot(dx, dy), R = 40; joy.dx = dx / Math.max(m, R); joy.dy = dy / Math.max(m, R); showJoy(); }
  function showJoy() { const j = $("joy"), r = $("stage").getBoundingClientRect(); j.hidden = false; j.style.left = joy.ox - r.left + "px"; j.style.top = joy.oy - r.top + "px"; j.firstElementChild.style.transform = `translate(${joy.dx * 22}px,${joy.dy * 22}px)`; }

  function fit() {
    const maxW = Math.min(innerWidth - 16, 1500), maxH = innerHeight - 190;
    const k = Math.min(maxW / VW, maxH / VH), s = k >= 2 ? Math.floor(k) : Math.max(1, k);
    cv.style.width = VW * s + "px"; cv.style.height = VH * s + "px";
  }
  addEventListener("resize", fit); fit();

  // =====================================================================
  //  SCELTA DEL PERSONAGGIO E AVVIO
  // =====================================================================
  $("roster").innerHTML = ROSTER.map((h, i) => `<button class="hero-card" data-h="${i}" style="--pc:${h.color}"><canvas width="18" height="18"></canvas><b>${h.name}</b><span class="cls">${h.cls} · ${h.ranged ? "远程" : "近战"}</span><span class="sk">Q ${h.sk}</span><small>${h.skd}</small></button>`).join("");
  document.querySelectorAll(".hero-card canvas").forEach((c, i) => { const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(ROSTER[i].spr.r[0], 0, 0); });
  let running = false;
  document.querySelectorAll(".hero-card").forEach((b) => (b.onclick = () => {
    audio(); const h = ROSTER[+b.dataset.h];
    $("intro").hidden = true; reset(h); running = true;
    $("skill-name").textContent = h.sk; $("skill").title = h.skd;
    banner(`第 1 天 · ${h.name}`, "白天砍树挖石、造防御；入夜后夜魇来袭");
    try { localStorage.setItem("cf:hero", h.name); } catch {}
  }));
  $("again").onclick = () => { $("over").hidden = true; $("intro").hidden = false; running = false; };
  try { const b = +localStorage.getItem("cf:best"); if (b) $("intro-best").textContent = `最佳纪录：第 ${b} 天`; } catch {}

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (running && !document.hidden) { update(dt); draw(); }
    requestAnimationFrame(loop);
  }
  reset(ROSTER[0]); S.cam.x = CAMP.x - VW / 2; S.cam.y = CAMP.y - VH / 2; S.light = 0.6; draw();
  requestAnimationFrame(loop);
  if (location.search.includes("debug")) window.__cf = { get S() { return S; }, update, draw, startNight, startDay, spawn, place, buy, useSkill, pick: (i) => document.querySelectorAll(".hero-card")[i].click() };
})();
