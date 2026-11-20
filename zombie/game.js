// =====================================================================
//  僵尸围城 — difendi il bunker dalle ondate di zombie
//  Risoluzione logica 320x176 (tile da 16px), ingrandita a pixel interi.
// =====================================================================
(() => {
  const A = window.ART;
  const TS = 16, COLS = 20, ROWS = 11, W = COLS * TS, H = ROWS * TS;
  const cv = document.getElementById("cv"), g = cv.getContext("2d");
  cv.width = W; cv.height = H; g.imageSmoothingEnabled = false;
  const [darkC, dk] = A.mk(W, H);
  const [decalC, dc] = A.mk(W, H);
  const $ = (id) => document.getElementById(id);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const dist = (a, b, c, d) => Math.hypot(a - c, b - d);

  // ---------- mappa ----------
  const BASE = { c: 9, r: 4, w: 2, h: 2, x: 160, y: 96 }; // 2x2 tile al centro, y = base dei piedi
  const OBST = [ // alberi e rocce: bloccano
    { k: "tree", c: 1, r: 1 }, { k: "tree", c: 4, r: 9 }, { k: "tree", c: 16, r: 1 }, { k: "tree", c: 18, r: 7 },
    { k: "tree", c: 13, r: 9 }, { k: "tree", c: 7, r: 0 }, { k: "rock", c: 3, r: 5 }, { k: "rock", c: 15, r: 4 },
    { k: "rock", c: 11, r: 1 }, { k: "rock", c: 6, r: 8 },
  ];
  const DECOR = [{ k: "bush", x: 40, y: 140 }, { k: "bush", x: 250, y: 30 }, { k: "bush", x: 290, y: 150 }, { k: "bush", x: 120, y: 160 }, { k: "bush", x: 205, y: 125 }];
  const groundC = A.ground(W, H, [{ x: 160, y: 84, rx: 78, ry: 50 }]);
  const sprTree = [A.tree(3), A.tree(7), A.tree(11)], sprRock = [A.rock(2), A.rock(5)], sprBush = [A.bush(1), A.bush(2), A.bush(4)];
  OBST.forEach((o, i) => (o.img = o.k === "tree" ? sprTree[i % 3] : sprRock[i % 2]));
  DECOR.forEach((o, i) => (o.img = sprBush[i % 3]));

  // braccio con mitra ruotato (32 direzioni; a sinistra capovolto per non averlo "a testa in giù")
  const GUNv = (() => { const [c, x] = A.mk(A.GUN.width, A.GUN.height); x.translate(0, c.height); x.scale(1, -1); x.drawImage(A.GUN, 0, 0); return c; })();
  const GUN_R = Array.from({ length: 32 }, (_, i) => A.rotPix(A.GUN, (i / 32) * Math.PI * 2, 2, 3));
  const GUN_L = Array.from({ length: 32 }, (_, i) => A.rotPix(GUNv, (i / 32) * Math.PI * 2, 2, GUNv.height - 4));
  const dirIdx = (a) => ((Math.round((a / (Math.PI * 2)) * 32) % 32) + 32) % 32;

  // ---------- definizioni ----------
  const BUILD = {
    wood: { name: "木墙", cost: 10, hp: 120, solid: true, img: () => A.woodWall[0] },
    stone: { name: "石墙", cost: 30, hp: 420, solid: true, img: () => A.stoneWall[0] },
    mg: { name: "机枪", cost: 70, hp: 160, solid: true, range: 66, rate: 7, dmg: 6, img: () => A.nest },
    mine: { name: "地雷", cost: 25, hp: 1, solid: false, img: () => A.mineOn },
  };
  const ZT = {
    walker: { set: A.walker, hp: 40, spd: 13, dmg: 8, rate: 1, gold: 4, r: 5 },
    runner: { set: A.runner, hp: 26, spd: 25, dmg: 6, rate: 1.4, gold: 5, r: 5 },
    brute: { set: A.brute, hp: 190, spd: 8.5, dmg: 24, rate: 0.7, gold: 16, r: 7 },
  };

  // ---------- stato ----------
  let S;
  function reset() {
    dc.clearRect(0, 0, W, H);
    S = {
      t: 0, gold: 120, wave: 0, phase: "build", timer: 25, toSpawn: 0, spawnCd: 0, kills: 0,
      baseHp: 600, baseMax: 600, over: false,
      p: { x: 160, y: 112, hp: 100, max: 100, face: 1, aim: 0, frame: 0, moving: false, cd: 0, dead: 0, hurt: 0, flash: 0 },
      zs: [], grid: Array.from({ length: ROWS }, () => Array(COLS).fill(null)), parts: [], tracers: [], lights: [], texts: [], corpses: [],
      shake: 0, tool: null, hover: null, flow: null,
    };
    recomputeFlow();
    updateHud();
  }

  // ---------- griglia, ostacoli, percorso (flow field) ----------
  const isObst = (c, r) => OBST.some((o) => o.c === c && o.r === r);
  const isBase = (c, r) => c >= BASE.c && c < BASE.c + BASE.w && r >= BASE.r && r < BASE.r + BASE.h;
  const inMap = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;
  function recomputeFlow() {
    const D = Array.from({ length: ROWS }, () => Array(COLS).fill(Infinity));
    const q = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (isBase(c, r)) { D[r][c] = 0; q.push([0, c, r]); }
    while (q.length) { // Dijkstra semplice (la mappa è piccola)
      q.sort((a, b) => a[0] - b[0]);
      const [d, c, r] = q.shift();
      if (d > D[r][c]) continue;
      for (const [dc_, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc_, nr = r + dr;
        if (!inMap(nc, nr) || isObst(nc, nr) || isBase(nc, nr)) continue;
        const s = S.grid[nr][nc];
        const cost = 1 + (s && BUILD[s.k].solid ? s.hp / 14 : 0); // i muri si possono "attraversare" sfondandoli, ma costa
        if (d + cost < D[nr][nc]) { D[nr][nc] = d + cost; q.push([d + cost, nc, nr]); }
      }
    }
    S.flow = D;
  }
  const tileAt = (x, y) => [Math.floor(x / TS), Math.floor(y / TS)];
  function solidAt(x, y) {
    const [c, r] = tileAt(x, y);
    if (!inMap(c, r)) return false;
    if (isObst(c, r) || isBase(c, r)) return true;
    const s = S.grid[r][c]; return !!(s && BUILD[s.k].solid);
  }

  // ---------- suoni (WebAudio, molto bassi) ----------
  let AC = null, noiseBuf = null, muted = false;
  function audio() {
    if (AC) return; try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function sfx(type) {
    if (!AC || muted) return;
    const t = AC.currentTime, src = AC.createBufferSource(), f = AC.createBiquadFilter(), gn = AC.createGain();
    src.buffer = noiseBuf; src.connect(f); f.connect(gn); gn.connect(AC.destination);
    const P = { shot: [1800, 0.035, 0.05], mg: [2400, 0.025, 0.03], boom: [300, 0.18, 0.5], hit: [900, 0.04, 0.04], build: [600, 0.05, 0.06] }[type];
    f.type = "lowpass"; f.frequency.value = P[0];
    gn.gain.setValueAtTime(P[1], t); gn.gain.exponentialRampToValueAtTime(0.0001, t + P[2]);
    src.start(t); src.stop(t + P[2] + 0.02);
  }

  // ---------- effetti ----------
  function blood(x, y, n, big) {
    for (let i = 0; i < n; i++) S.parts.push({ x, y: y - 6, vx: rnd(-40, 40), vy: rnd(-55, -10), g: 160, life: rnd(0.3, 0.6), col: Math.random() < 0.5 ? "#8a1414" : "#b01e1e", s: 1, splat: true });
    for (let i = 0; i < (big ? 9 : 3); i++) { // macchie permanenti sul terreno
      const bx = Math.round(x + rnd(-6, 6)), by = Math.round(y + rnd(-3, 3));
      dc.fillStyle = Math.random() < 0.6 ? "rgba(110,14,14,.85)" : "rgba(70,8,8,.85)";
      dc.fillRect(bx, by, Math.random() < 0.3 ? 2 : 1, 1);
    }
  }
  function spark(x, y, col = "#ffe08a") { for (let i = 0; i < 3; i++) S.parts.push({ x, y, vx: rnd(-50, 50), vy: rnd(-50, 50), g: 0, life: 0.12, col, s: 1 }); }
  function shell(x, y) { S.parts.push({ x, y, vx: rnd(-25, 25), vy: rnd(-40, -20), g: 140, life: 0.5, col: "#d9b44a", s: 1, floor: y + 6 }); }
  function flashLight(x, y, r, life) { S.lights.push({ x, y, r, life, max: life }); }
  function text(x, y, t, col) { S.texts.push({ x, y, t, col, life: 0.9 }); }

  // ---------- costruzione ----------
  function canBuild(c, r, k) {
    if (!inMap(c, r) || isObst(c, r) || isBase(c, r) || S.grid[r][c]) return false;
    const [pc, pr] = tileAt(S.p.x, S.p.y); if (BUILD[k].solid && pc === c && pr === r) return false;
    return S.gold >= BUILD[k].cost;
  }
  function place(c, r) {
    const k = S.tool;
    if (k === "sell") {
      const s = inMap(c, r) && S.grid[r][c]; if (!s) return;
      const back = Math.floor((BUILD[s.k].cost * s.hp) / s.max / 2); S.gold += back; S.grid[r][c] = null; text(c * TS + 8, r * TS + 4, "+" + back, "#fde047"); recomputeFlow(); updateHud(); sfx("build"); return;
    }
    if (!k || !canBuild(c, r, k)) return;
    S.gold -= BUILD[k].cost;
    S.grid[r][c] = { k, hp: BUILD[k].hp, max: BUILD[k].hp, cd: 0, ang: 0, blink: 0 };
    for (let i = 0; i < 6; i++) S.parts.push({ x: c * TS + 8, y: r * TS + 14, vx: rnd(-30, 30), vy: rnd(-20, 0), g: 60, life: 0.35, col: "#a08a68", s: 1 });
    sfx("build"); recomputeFlow(); updateHud();
  }

  // ---------- ondate ----------
  function startWave() {
    S.wave++; S.phase = "wave"; S.toSpawn = 5 + S.wave * 3; S.spawnCd = 0.5;
    banner(`第 ${S.wave} 波`);
  }
  function spawnZombie() {
    const w = S.wave, r = Math.random();
    const type = w >= 3 && r < 0.12 + w * 0.01 ? "brute" : w >= 2 && r < 0.45 ? "runner" : "walker";
    const T = ZT[type], side = Math.floor(Math.random() * 4);
    let x, y;
    if (side === 0) { x = -8; y = rnd(16, H - 8); } else if (side === 1) { x = W + 8; y = rnd(16, H - 8); }
    else if (side === 2) { x = rnd(8, W - 8); y = -4; } else { x = rnd(8, W - 8); y = H + 10; }
    const hp = Math.round(T.hp * (1 + (w - 1) * 0.13));
    S.zs.push({ type, T, x, y, hp, max: hp, cd: 0, frame: Math.random() * 4, face: x < W / 2 ? 1 : -1, flash: 0 });
  }

  // ---------- update ----------
  const keys = {};
  let joy = null;
  function update(dt) {
    S.t += dt;
    if (S.over) return;
    // fasi
    if (S.phase === "build") { S.timer -= dt; if (S.timer <= 0) startWave(); }
    else {
      S.spawnCd -= dt;
      if (S.toSpawn > 0 && S.spawnCd <= 0) { spawnZombie(); S.toSpawn--; S.spawnCd = Math.max(0.3, 1.5 - S.wave * 0.09) * rnd(0.6, 1.3); }
      if (S.toSpawn === 0 && !S.zs.length) {
        const bonus = 20 + S.wave * 6; S.gold += bonus; S.phase = "build"; S.timer = 15;
        banner(`第 ${S.wave} 波 清除！ +${bonus}`);
      }
    }
    // giocatore
    const p = S.p;
    if (p.dead > 0) { p.dead -= dt; if (p.dead <= 0) { p.hp = p.max; p.x = BASE.x; p.y = BASE.y + 14; } }
    else {
      let mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
      let my = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
      if (joy) { mx = joy.dx; my = joy.dy; }
      const m = Math.hypot(mx, my);
      p.moving = m > 0.15;
      if (p.moving) {
        const sp = 46 * Math.min(1, m) / Math.max(1, m);
        const nx = p.x + mx * sp * dt, ny = p.y + my * sp * dt;
        if (!solidAt(nx, p.y) && nx > 4 && nx < W - 4) p.x = nx;
        if (!solidAt(p.x, ny) && ny > 10 && ny < H - 2) p.y = ny;
        p.frame += dt * 9;
      } else p.frame = 0;
      if (p.hp < p.max && S.t - p.hurt > 4) p.hp = Math.min(p.max, p.hp + 3 * dt);
      // mira e spara al più vicino
      let best = null, bd = 84;
      for (const z of S.zs) { const d = dist(p.x, p.y - 7, z.x, z.y - 7); if (d < bd) { bd = d; best = z; } }
      if (best) { p.aim = Math.atan2(best.y - 7 - (p.y - 8), best.x - p.x); p.face = Math.cos(p.aim) >= 0 ? 1 : -1; }
      else if (p.moving) { p.aim = Math.atan2(my, mx); p.face = mx >= 0 ? 1 : -1; }
      p.cd -= dt;
      if (best && p.cd <= 0) { p.cd = 0.28; shoot(p.x + Math.cos(p.aim) * 12, p.y - 8 + Math.sin(p.aim) * 12, best, 10, "shot"); shell(p.x, p.y - 8); }
    }
    // torrette e mine
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const s = S.grid[r][c]; if (!s) continue;
      const cx = c * TS + 8, cy = r * TS + 8;
      if (s.k === "mg") {
        let best = null, bd = BUILD.mg.range;
        for (const z of S.zs) { const d = dist(cx, cy, z.x, z.y - 6); if (d < bd) { bd = d; best = z; } }
        s.cd -= dt;
        if (best) {
          s.ang = Math.atan2(best.y - 6 - cy, best.x - cx);
          if (s.cd <= 0) { s.cd = 1 / BUILD.mg.rate; shoot(cx + Math.cos(s.ang) * 11, cy - 2 + Math.sin(s.ang) * 11, best, BUILD.mg.dmg, "mg"); shell(cx, cy); }
        }
      } else if (s.k === "mine") {
        s.blink += dt;
        if (S.zs.some((z) => dist(cx, cy + 4, z.x, z.y) < 7)) explode(cx, cy + 4, c, r);
      }
    }
    // zombie
    for (const z of S.zs) {
      z.flash = Math.max(0, z.flash - dt); z.cd -= dt;
      const T = z.T;
      // vicino al giocatore: lo insegue
      const dp = p.dead > 0 ? 999 : dist(z.x, z.y, p.x, p.y);
      let tx, ty, target = null;
      if (dp < 30) { tx = p.x; ty = p.y; if (dp < 8) target = "player"; }
      else {
        let [c, r] = tileAt(z.x, z.y);
        c = Math.max(0, Math.min(COLS - 1, c)); r = Math.max(0, Math.min(ROWS - 1, r));
        const inside = z.x >= 0 && z.x < W && z.y >= 0 && z.y < H;
        if (!inside) { tx = c * TS + 8; ty = r * TS + 12; }
        else {
          let bc = c, br = r, bd = S.flow[r][c];
          for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nc = c + a, nr = r + b; if (inMap(nc, nr) && (S.flow[nr][nc] < bd || isBase(nc, nr))) { bd = isBase(nc, nr) ? -1 : S.flow[nr][nc]; bc = nc; br = nr; } }
          tx = bc * TS + 8; ty = br * TS + 12;
          if (isBase(bc, br) && dist(z.x, z.y, tx, ty) < 14) target = "base";
          else { const s = S.grid[br][bc]; if (s && BUILD[s.k].solid && dist(z.x, z.y, tx, ty) < 13) target = s; }
        }
      }
      if (target) { // attacca
        if (z.cd <= 0) {
          z.cd = 1 / T.rate; z.bite = 0.15;
          if (target === "player") { p.hp -= T.dmg; p.hurt = S.t; p.flash = 0.12; blood(p.x, p.y, 3); if (p.hp <= 0) { p.dead = 4; banner("你倒下了… 4秒后在基地复活"); } }
          else if (target === "base") { S.baseHp -= T.dmg; S.shake = Math.max(S.shake, 2); spark(z.x + z.face * 5, z.y - 8, "#c9ced6"); if (S.baseHp <= 0) gameOver(); }
          else { target.hp -= T.dmg; spark(z.x + z.face * 5, z.y - 8, "#c9a070"); sfx("hit"); if (target.hp <= 0) destroyStruct(target); }
        }
      } else {
        const a = Math.atan2(ty - z.y, tx - z.x);
        z.x += Math.cos(a) * T.spd * dt; z.y += Math.sin(a) * T.spd * dt;
        if (Math.abs(Math.cos(a)) > 0.2) z.face = Math.cos(a) > 0 ? 1 : -1;
        z.frame += dt * (T.spd / 4);
      }
      z.bite = Math.max(0, (z.bite || 0) - dt);
    }
    // separazione tra zombie
    for (let i = 0; i < S.zs.length; i++) for (let j = i + 1; j < S.zs.length; j++) {
      const a = S.zs[i], b = S.zs[j], d = dist(a.x, a.y, b.x, b.y), m = a.T.r + b.T.r;
      if (d < m && d > 0.01) { const k = ((m - d) / d) * 0.5; a.x -= (b.x - a.x) * k * 0.5; a.y -= (b.y - a.y) * k * 0.5; b.x += (b.x - a.x) * k * 0.5; b.y += (b.y - a.y) * k * 0.5; }
    }
    // morti
    S.zs = S.zs.filter((z) => {
      if (z.hp > 0) return true;
      S.gold += z.T.gold; S.kills++; text(z.x, z.y - 16, "+" + z.T.gold, "#fde047");
      blood(z.x, z.y, 10, true);
      S.corpses.push({ img: (z.face > 0 ? z.T.set.r : z.T.set.l)[0], x: z.x, y: z.y, face: z.face, life: 8 });
      return false;
    });
    // particelle, traccianti, luci, testi, cadaveri
    for (const q of S.parts) { q.life -= dt; q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.floor && q.y > q.floor) { q.y = q.floor; q.vy *= -0.3; q.vx *= 0.5; } }
    S.parts = S.parts.filter((q) => { if (q.life > 0) return true; if (q.splat) { dc.fillStyle = "rgba(120,14,14,.8)"; dc.fillRect(Math.round(q.x), Math.round(q.y), 1, 1); } return false; });
    S.tracers.forEach((t) => (t.life -= dt)); S.tracers = S.tracers.filter((t) => t.life > 0);
    S.lights.forEach((l) => (l.life -= dt)); S.lights = S.lights.filter((l) => l.life > 0);
    S.texts.forEach((t) => { t.life -= dt; t.y -= 14 * dt; }); S.texts = S.texts.filter((t) => t.life > 0);
    S.corpses.forEach((c) => (c.life -= dt)); S.corpses = S.corpses.filter((c) => c.life > 0);
    p.flash = Math.max(0, p.flash - dt); S.shake = Math.max(0, S.shake - dt * 10);
    // le macchie di sangue sbiadiscono lentamente
    if (Math.floor(S.t * 2) !== Math.floor((S.t - dt) * 2)) { dc.globalCompositeOperation = "destination-out"; dc.fillStyle = "rgba(0,0,0,0.012)"; dc.fillRect(0, 0, W, H); dc.globalCompositeOperation = "source-over"; }
    updateHud();
  }
  function shoot(x, y, z, dmg, type) {
    z.hp -= dmg; z.flash = 0.08;
    S.tracers.push({ x1: x, y1: y, x2: z.x + rnd(-2, 2), y2: z.y - 7 + rnd(-2, 2), life: 0.06 });
    flashLight(x, y, type === "mg" ? 22 : 28, 0.06);
    S.parts.push({ x, y, vx: 0, vy: 0, g: 0, life: 0.05, col: "#fff3b0", s: 2 });
    blood(z.x, z.y, 2);
    sfx(type);
  }
  function explode(x, y, c, r) {
    S.grid[r][c] = null;
    for (const z of S.zs) { const d = dist(x, y, z.x, z.y); if (d < 26) { z.hp -= 95 * (1 - d / 40); z.flash = 0.1; } }
    if (dist(x, y, S.p.x, S.p.y) < 18 && S.p.dead <= 0) { S.p.hp -= 15; S.p.hurt = S.t; }
    for (let i = 0; i < 26; i++) S.parts.push({ x, y, vx: rnd(-90, 90), vy: rnd(-110, 20), g: 120, life: rnd(0.2, 0.6), col: ["#fff3b0", "#ffb03a", "#ff6a2a", "#5a5a5a"][i % 4], s: i % 5 === 0 ? 2 : 1 });
    for (let i = 0; i < 40; i++) { const a = rnd(0, 6.3), rr = rnd(0, 9); dc.fillStyle = `rgba(20,16,14,${rnd(0.4, 0.8)})`; dc.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr * 0.6), 1, 1); }
    flashLight(x, y, 70, 0.3); S.shake = 4; sfx("boom"); recomputeFlow();
  }
  function destroyStruct(s) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (S.grid[r][c] === s) {
      S.grid[r][c] = null;
      for (let i = 0; i < 14; i++) S.parts.push({ x: c * TS + 8, y: r * TS + 6, vx: rnd(-50, 50), vy: rnd(-70, -10), g: 160, life: 0.6, col: s.k === "stone" ? "#8c8f99" : s.k === "wood" ? "#8a5a2c" : "#c2ae80", s: 1, floor: r * TS + 15 });
    }
    S.shake = 2; recomputeFlow();
  }
  function gameOver() {
    S.over = true; S.baseHp = 0;
    let best = 0; try { best = Math.max(+localStorage.getItem("zb:best") || 0, S.wave); localStorage.setItem("zb:best", best); } catch {}
    $("over-text").innerHTML = `坚持到第 <b>${S.wave}</b> 波 · 击杀 <b>${S.kills}</b> 只僵尸<br>最佳纪录：第 ${best} 波`;
    $("over").hidden = false;
  }

  // ---------- disegno ----------
  function draw() {
    g.save();
    if (S.shake) g.translate(Math.round(rnd(-S.shake, S.shake)), Math.round(rnd(-S.shake, S.shake)));
    g.drawImage(groundC, 0, 0);
    g.drawImage(decalC, 0, 0);
    // mine e cadaveri (piatti)
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const s = S.grid[r][c]; if (!s || s.k !== "mine") continue;
      g.drawImage(Math.floor(s.blink * 2) % 2 ? A.mineOn : A.mineOff, c * TS + 4, r * TS + 9);
    }
    for (const k of S.corpses) {
      g.save(); g.globalAlpha = Math.min(1, k.life / 2); g.translate(Math.round(k.x), Math.round(k.y));
      g.rotate((k.face > 0 ? -1 : 1) * Math.PI / 2); g.drawImage(k.img, -k.img.width + 2, -k.img.width / 2); g.restore();
    }
    // tutto ciò che ha "altezza", ordinato per y
    const L = [];
    OBST.forEach((o) => L.push({ y: o.r * TS + 15, d: () => {
      const im = o.img; g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(o.c * TS + 1, o.r * TS + 12, 14, 4);
      g.drawImage(im, o.c * TS + 8 - Math.floor(im.width / 2), o.r * TS + 16 - im.height);
    } }));
    DECOR.forEach((o) => L.push({ y: o.y, d: () => g.drawImage(o.img, o.x - (o.img.width >> 1), o.y - o.img.height) }));
    L.push({ y: BASE.y + 1, d: () => {
      g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(BASE.c * TS - 1, BASE.y - 4, 34, 6);
      g.drawImage(A.bunker, BASE.x - 18, BASE.y + 2 - A.bunker.height);
    } });
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const s = S.grid[r][c]; if (!s || s.k === "mine") continue;
      L.push({ y: r * TS + 15, d: () => {
        const x0 = c * TS, y0 = r * TS;
        if (s.k === "wood" || s.k === "stone") { const im = (s.k === "wood" ? A.woodWall : A.stoneWall)[s.hp < s.max / 2 ? 1 : 0]; g.drawImage(im, x0 - 1, y0 + 17 - im.height); }
        else if (s.k === "mg") {
          g.drawImage(A.nest, x0 - 2, y0 + 3);
          const R = A.MG_DIRS[dirIdx(s.ang)]; g.drawImage(R.img, x0 + 8 - R.ox, y0 + 6 - R.oy);
        }
      } });
    }
    for (const z of S.zs) L.push({ y: z.y, d: () => drawZombie(z) });
    if (S.p.dead <= 0) L.push({ y: S.p.y, d: drawPlayer });
    L.sort((a, b) => a.y - b.y).forEach((o) => o.d());
    // traccianti
    for (const t of S.tracers) { g.strokeStyle = "rgba(255,230,140,.9)"; g.lineWidth = 1; g.beginPath(); g.moveTo(t.x1 + 0.5, t.y1 + 0.5); g.lineTo(t.x2 + 0.5, t.y2 + 0.5); g.stroke(); }
    for (const q of S.parts) { g.fillStyle = q.col; g.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s); }
    // notte + luci
    dk.globalCompositeOperation = "source-over"; dk.clearRect(0, 0, W, H);
    dk.fillStyle = "rgba(8,10,26,0.72)"; dk.fillRect(0, 0, W, H);
    dk.globalCompositeOperation = "destination-out";
    const light = (x, y, r, a = 1) => { const gr = dk.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.6})`); gr.addColorStop(1, "rgba(0,0,0,0)"); dk.fillStyle = gr; dk.fillRect(x - r, y - r, r * 2, r * 2); };
    light(BASE.x, BASE.y - 22, 62, 0.95);
    if (S.p.dead <= 0) {
      light(S.p.x, S.p.y - 6, 34, 0.9);
      // torcia: cono nella direzione di mira
      const a = S.p.aim; dk.save(); dk.translate(S.p.x, S.p.y - 8); dk.rotate(a);
      const gr = dk.createRadialGradient(0, 0, 4, 0, 0, 95); gr.addColorStop(0, "rgba(0,0,0,.85)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      dk.fillStyle = gr; dk.beginPath(); dk.moveTo(0, 0); dk.arc(0, 0, 95, -0.42, 0.42); dk.closePath(); dk.fill(); dk.restore();
    }
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const s = S.grid[r][c]; if (s && s.k === "mg") light(c * TS + 8, r * TS + 8, 22, 0.6); }
    for (const l of S.lights) light(l.x, l.y, l.r, l.life / l.max);
    g.drawImage(darkC, 0, 0);
    // bagliori caldi
    g.globalCompositeOperation = "lighter";
    const glow = (x, y, r, col) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
    glow(BASE.x, BASE.y - 24, 26, "rgba(255,200,90,.22)");
    for (const l of S.lights) glow(l.x, l.y, l.r * 0.5, `rgba(255,170,60,${0.5 * l.life / l.max})`);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const s = S.grid[r][c]; if (s && s.k === "mine" && Math.floor(s.blink * 2) % 2) glow(c * TS + 7, r * TS + 11, 5, "rgba(255,40,40,.6)"); }
    g.globalCompositeOperation = "source-over";
    // occhi degli zombie che brillano nel buio
    for (const z of S.zs) {
      const im = z.T.set.r[0], eyes = A.EYES[z.type], list = Array.isArray(eyes[0]) ? eyes : [eyes];
      const col = z.type === "runner" ? "255,210,60" : "255,70,50";
      for (const [ex, ey] of list) {
        const x = Math.round(z.x) - (im.width >> 1) + (z.face > 0 ? ex : im.width - 1 - ex) + (z.bite ? z.face * 2 : 0), y = Math.round(z.y) - im.height + 1 + ey;
        g.fillStyle = `rgba(${col},.95)`; g.fillRect(x, y, 1, 1);
        g.globalCompositeOperation = "lighter"; g.fillStyle = `rgba(${col},.18)`; g.fillRect(x - 1, y - 1, 3, 3); g.globalCompositeOperation = "source-over";
      }
    }
    // barre vita (sopra al buio)
    for (const z of S.zs) if (z.hp < z.max) bar(z.x - 5, z.y - (z.type === "brute" ? 22 : 18), 10, z.hp / z.max, "#e23b3b");
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const s = S.grid[r][c]; if (s && s.k !== "mine" && s.hp < s.max) bar(c * TS + 2, r * TS - 3, 12, s.hp / s.max, "#4ade80"); }
    if (S.p.dead <= 0 && S.p.hp < S.p.max) bar(S.p.x - 6, S.p.y - 20, 12, S.p.hp / S.p.max, "#4ade80");
    // anteprima costruzione
    if (S.tool && S.hover) {
      const [c, r] = S.hover;
      if (inMap(c, r)) {
        const ok = S.tool === "sell" ? !!S.grid[r][c] : canBuild(c, r, S.tool);
        if (S.tool !== "sell") { g.globalAlpha = 0.65; const im = BUILD[S.tool].img(); g.drawImage(im, c * TS + 8 - (im.width >> 1), r * TS + (S.tool === "mine" ? 9 : 17 - im.height)); g.globalAlpha = 1; }
        g.strokeStyle = ok ? "rgba(120,255,140,.9)" : "rgba(255,80,80,.9)"; g.strokeRect(c * TS + 0.5, r * TS + 0.5, TS - 1, TS - 1);
        if (S.tool === "mg") { g.strokeStyle = "rgba(255,255,255,.25)"; g.beginPath(); g.arc(c * TS + 8, r * TS + 8, BUILD.mg.range, 0, 7); g.stroke(); }
      }
    }
    // testi
    g.font = "bold 7px monospace"; g.textAlign = "center";
    for (const t of S.texts) { g.globalAlpha = Math.min(1, t.life * 2); g.fillStyle = "#000"; g.fillText(t.t, Math.round(t.x) + 1, Math.round(t.y) + 1); g.fillStyle = t.col; g.fillText(t.t, Math.round(t.x), Math.round(t.y)); }
    g.globalAlpha = 1;
    g.restore();
  }
  function bar(x, y, w, p, col) { x = Math.round(x); y = Math.round(y); g.fillStyle = "#111"; g.fillRect(x - 1, y - 1, w + 2, 4); g.fillStyle = "#3a1010"; g.fillRect(x, y, w, 2); g.fillStyle = col; g.fillRect(x, y, Math.max(1, Math.round(w * p)), 2); }
  function drawZombie(z) {
    const set = z.T.set, f = Math.floor(z.frame) % 4;
    const im = z.flash > 0 ? set.w[f] : (z.face > 0 ? set.r : set.l)[f];
    const lunge = z.bite ? z.face * 2 : 0;
    g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(Math.round(z.x) - 5, Math.round(z.y) - 1, 10, 3);
    const flipW = z.flash > 0 && z.face < 0;
    if (flipW) { g.save(); g.translate(Math.round(z.x) + lunge, 0); g.scale(-1, 1); g.drawImage(im, -(im.width >> 1), Math.round(z.y) - im.height + 1); g.restore(); }
    else g.drawImage(im, Math.round(z.x) - (im.width >> 1) + lunge, Math.round(z.y) - im.height + 1);
  }
  function drawPlayer() {
    const p = S.p, f = p.moving ? Math.floor(p.frame) % 4 : 0;
    const im = p.flash > 0 ? A.survivorW[f] : (p.face > 0 ? A.survivor : A.survivorL)[f];
    const x = Math.round(p.x), y = Math.round(p.y);
    g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(x - 5, y - 1, 10, 3);
    const behind = Math.sin(p.aim) < -0.3; // se mira in alto, l'arma va dietro
    const gun = () => { const set = p.face > 0 ? GUN_R : GUN_L; const R = set[dirIdx(p.aim)]; g.drawImage(R.img, x + (p.face > 0 ? 1 : -1) - R.ox, y - 9 - R.oy); };
    if (behind) gun();
    g.drawImage(im, x - (im.width >> 1), y - im.height + 1);
    if (!behind) gun();
  }

  // ---------- HUD ----------
  let lastHud = "";
  function updateHud() {
    const st = S.phase === "build" ? `准备阶段 · ${Math.ceil(S.timer)}秒后来袭` : `第 ${S.wave} 波 · 还剩 ${S.toSpawn + S.zs.length} 只`;
    const key = [S.wave, S.gold, Math.ceil(S.baseHp), Math.ceil(S.p.hp), st, S.tool].join("|");
    if (key === lastHud) return; lastHud = key;
    $("h-wave").textContent = S.wave; $("h-gold").textContent = S.gold;
    $("h-base").style.width = Math.max(0, (S.baseHp / S.baseMax) * 100) + "%"; $("h-base-t").textContent = Math.max(0, Math.ceil(S.baseHp));
    $("h-hp").style.width = Math.max(0, (S.p.hp / S.p.max) * 100) + "%"; $("h-hp-t").textContent = S.p.dead > 0 ? "复活中" : Math.ceil(S.p.hp);
    $("status").textContent = st;
    $("next").hidden = S.phase !== "build";
    document.querySelectorAll(".tool").forEach((b) => { b.classList.toggle("on", b.dataset.k === S.tool); const k = b.dataset.k; b.classList.toggle("poor", !!BUILD[k] && S.gold < BUILD[k].cost); });
  }
  let banT = 0;
  function banner(t) { const b = $("banner"); b.textContent = t; b.classList.remove("show"); void b.offsetWidth; b.classList.add("show"); clearTimeout(banT); banT = setTimeout(() => b.classList.remove("show"), 2200); }

  // barra costruzioni con icone pixel
  const TOOLS = [["wood", A.woodWall[0]], ["stone", A.stoneWall[0]], ["mg", (() => { const [c, x] = A.mk(20, 18); x.drawImage(A.nest, 1, 4); const R = A.MG_DIRS[28]; x.drawImage(R.img, 10 - R.ox, 7 - R.oy); return c; })()], ["mine", A.mineOn]];
  $("tools").innerHTML = TOOLS.map(([k], i) => `<button class="tool" data-k="${k}" title="${BUILD[k].name}"><canvas width="20" height="20"></canvas><span>${BUILD[k].name}</span><b>${BUILD[k].cost}</b><i>${i + 1}</i></button>`).join("") +
    `<button class="tool" data-k="sell" title="拆除（返还一半）"><canvas width="20" height="20"></canvas><span>拆除</span><b>½</b><i>5</i></button>`;
  document.querySelectorAll(".tool canvas").forEach((c, i) => {
    const x = c.getContext("2d"); x.imageSmoothingEnabled = false;
    if (i < TOOLS.length) { const im = TOOLS[i][1]; const s = Math.min(1, 20 / Math.max(im.width, im.height)); x.drawImage(im, Math.floor((20 - im.width * s) / 2), Math.floor((20 - im.height * s) / 2), im.width * s, im.height * s); }
    else { x.fillStyle = "#e23b3b"; x.fillRect(4, 9, 12, 2); x.fillRect(9, 4, 2, 12); x.save(); }
  });
  document.querySelectorAll(".tool").forEach((b) => b.addEventListener("click", () => { S.tool = S.tool === b.dataset.k ? null : b.dataset.k; updateHud(); }));
  $("next").onclick = () => { if (S.phase === "build") S.timer = 0; };
  $("mute").onclick = () => { muted = !muted; $("mute").textContent = muted ? "🔇" : "🔊"; };

  // ---------- input ----------
  const toLogical = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase(); keys[k] = true;
    if ("12345".includes(k) && k.length === 1) { S.tool = ["wood", "stone", "mg", "mine", "sell"][+k - 1]; updateHud(); }
    if (k === "escape") { S.tool = null; updateHud(); }
    if (k === " " && S.phase === "build") { S.timer = 0; e.preventDefault(); }
    if (k.startsWith("arrow")) e.preventDefault();
  });
  addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));
  cv.addEventListener("pointermove", (e) => { const [x, y] = toLogical(e); S.hover = tileAt(x, y); if (joy && e.pointerId === joy.id) moveJoy(e); });
  cv.addEventListener("contextmenu", (e) => { e.preventDefault(); S.tool = null; updateHud(); });
  cv.addEventListener("pointerdown", (e) => {
    audio();
    const [x, y] = toLogical(e);
    // telefono: joystick nella metà sinistra in basso quando non stai costruendo
    if (e.pointerType === "touch" && !S.tool) { joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 }; showJoy(); return; }
    S.hover = tileAt(x, y);
    if (e.button === 2) return;
    place(...tileAt(x, y));
  });
  const endJoy = (e) => { if (joy && e.pointerId === joy.id) { joy = null; $("joy").hidden = true; } };
  cv.addEventListener("pointerup", endJoy); cv.addEventListener("pointercancel", endJoy);
  function moveJoy(e) { const dx = e.clientX - joy.ox, dy = e.clientY - joy.oy, m = Math.hypot(dx, dy), R = 40; joy.dx = (dx / Math.max(m, R)); joy.dy = (dy / Math.max(m, R)); showJoy(); }
  function showJoy() { const j = $("joy"); j.hidden = false; const r = $("stage").getBoundingClientRect(); j.style.left = joy.ox - r.left + "px"; j.style.top = joy.oy - r.top + "px"; j.firstElementChild.style.transform = `translate(${joy.dx * 22}px,${joy.dy * 22}px)`; }

  // ---------- scala a pixel interi ----------
  function fit() {
    const maxW = Math.min(innerWidth - 16, 1400), maxH = innerHeight - 150;
    const s = Math.max(1, Math.floor(Math.min(maxW / W, maxH / H)));
    const fs = Math.min(maxW / W, maxH / H) < 1.5 ? Math.min(maxW / W, maxH / H) : s; // su telefono riempie la larghezza
    cv.style.width = W * fs + "px"; cv.style.height = H * fs + "px";
  }
  addEventListener("resize", fit); fit();

  // ---------- loop ----------
  let last = performance.now(), running = false;
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (running && !document.hidden) { update(dt); draw(); }
    requestAnimationFrame(loop);
  }
  $("start").onclick = () => { audio(); $("intro").hidden = true; reset(); running = true; banner("建造防御 · 第1波即将来袭"); };
  $("again").onclick = () => { $("over").hidden = true; reset(); running = true; };
  reset(); draw();
  try { const b = +localStorage.getItem("zb:best"); if (b) $("intro-best").textContent = `你的最佳纪录：第 ${b} 波`; } catch {}
  requestAnimationFrame(loop);
  if (location.search.includes("debug")) window.__zb = { get S() { return S; }, update, draw, startWave, place };
})();
