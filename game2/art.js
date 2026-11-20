// =====================================================================
//  GAME 2 — ART (vista di profilo). Personaggi grandi disegnati da un
//  "manichino" procedurale: testa, busto, braccia e gambe con ombreggiatura,
//  armi, elmi, mantelli; animazioni di camminata, attacco e morte.
// =====================================================================
(() => {
  const OUT = "#120c18";
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; return [c, x]; };
  const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  function noise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => clamp(Math.round(v * k), 0, 255).toString(16).padStart(2, "0"); return "#" + f(n >> 16) + f((n >> 8) & 255) + f(n & 255); };

  function outline(src, col = OUT) {
    const w = src.width, h = src.height, [c, x] = mk(w + 2, h + 2);
    const d = src.getContext("2d").getImageData(0, 0, w, h).data;
    const solid = (i, j) => i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 40;
    x.fillStyle = col;
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) if (!solid(i, j) && (solid(i - 1, j) || solid(i + 1, j) || solid(i, j - 1) || solid(i, j + 1))) x.fillRect(i + 1, j + 1, 1, 1);
    x.drawImage(src, 1, 1); return c;
  }
  function flip(src) { const [c, x] = mk(src.width, src.height); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; }
  function whiteOf(src) { const [c, x] = mk(src.width, src.height); x.drawImage(src, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); return c; }
  function tint(src, col, a) { const [c, x] = mk(src.width, src.height); x.drawImage(src, 0, 0); x.globalCompositeOperation = "source-atop"; x.globalAlpha = a; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return c; }

  // ---------- primitive a pixel ----------
  function P(x) {
    const px = (X, Y, col) => { x.fillStyle = col; x.fillRect(Math.round(X), Math.round(Y), 1, 1); };
    // linea spessa con ombreggiatura (cols[0] = lato illuminato)
    const limb = (x0, y0, x1, y1, w, cols) => {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))), nx = -(y1 - y0) / n, ny = (x1 - x0) / n;
      for (let s = 0; s <= n; s++) { const X = x0 + ((x1 - x0) * s) / n, Y = y0 + ((y1 - y0) * s) / n; for (let j = 0; j < w; j++) { const o = j - (w - 1) / 2; px(X + nx * o, Y + ny * o, cols[Math.min(cols.length - 1, j)]); } }
    };
    // ellisse piena con luce dall'alto a sinistra
    const blob = (cx, cy, rx, ry, cols, seed = 1) => {
      for (let j = Math.floor(cy - ry); j <= Math.ceil(cy + ry); j++) for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++) {
        const d = Math.hypot((i - cx) / rx, (j - cy) / ry); if (d > 1) continue;
        const lit = 1 - Math.hypot((i - (cx - rx * 0.45)) / (rx * 1.6), (j - (cy - ry * 0.5)) / (ry * 1.6)) + (hash(i, j, seed) - 0.5) * 0.12;
        px(i, j, cols[clamp(Math.floor(lit * cols.length), 0, cols.length - 1)]);
      }
    };
    const rect = (x0, y0, w, h, col) => { x.fillStyle = col; x.fillRect(Math.round(x0), Math.round(y0), Math.round(w), Math.round(h)); };
    return { px, limb, blob, rect };
  }
  const tri = (c) => [shade(c, 1.25), c, shade(c, 0.7)];

  // =====================================================================
  //  MANICHINO UMANOIDE (guarda a destra). Base 44x52, piedi a y=50.
  // =====================================================================
  function doll(o, pose, t) {
    const k = o.k || 1, W = Math.ceil(46 * k), H = Math.ceil(54 * k);
    const [c, x] = mk(W, H), D = P(x);
    const S = (v) => v * k;
    const skin = tri(o.skin), arm = tri(o.armor), pants = tri(o.pants || shade(o.armor, 0.6)), boot = o.boot || "#2a1d16";
    // pose
    let legA = 0, armF = 0.25, armB = -0.15, bob = 0, lean = 0;
    if (pose === "walk") { const ph = (t / 4) * Math.PI * 2; legA = Math.sin(ph) * 0.5; armF = 0.2 - Math.sin(ph) * 0.35; armB = Math.sin(ph) * 0.35; bob = Math.abs(Math.cos(ph)) * -1; }
    if (pose === "attack") { armF = [-2.3, 1.1, 0.45][t]; lean = [-0.1, 0.18, 0.05][t]; armB = [0.3, -0.4, -0.1][t]; }
    if (pose === "cast") { armF = [-1.3, -1.6, -1.2][t]; armB = -0.8; }
    const hipX = S(20), hipY = S(31) + bob, shY = S(17) + bob;
    const legL = S(o.legLen || 14), torsoW = S(o.torsoW || 13);
    // mantello (dietro tutto)
    if (o.cape) { const fl = pose === "walk" ? Math.sin((t / 4) * 6.28) * 2 : 1; D.limb(hipX - S(3), shY + S(1), hipX - S(9) - fl, hipY + S(10), Math.ceil(S(4)), tri(o.cape)); }
    // coda / capelli lunghi dietro
    if (o.hair === "long") D.limb(hipX - S(1), shY - S(8), hipX - S(7), shY + S(6), Math.ceil(S(4)), tri(o.hairCol));
    // gamba posteriore
    const leg = (a, cols) => { const kx = hipX + Math.sin(a) * legL * 0.5, ky = hipY + Math.cos(a) * legL * 0.5, fx = hipX + Math.sin(a) * legL, fy = hipY + Math.cos(a) * legL; D.limb(hipX, hipY, kx, ky, Math.ceil(S(5.5)), cols); D.limb(kx, ky, fx, fy, Math.ceil(S(4.5)), cols); D.rect(fx - S(2), fy - S(2), S(7), S(3), boot); D.rect(fx - S(2), fy - S(2), S(7), 1, shade(boot, 1.6)); };
    leg(-legA, pants.map((cc) => shade(cc, 0.82)));
    // braccio posteriore
    const shB = [hipX - S(1), shY + S(2)];
    D.limb(shB[0], shB[1], shB[0] + Math.sin(armB) * S(10), shB[1] + Math.cos(armB) * S(10), Math.ceil(S(4.5)), (o.sleeve ? tri(o.sleeve) : skin).map((cc) => shade(cc, 0.75)));
    // scudo sul braccio posteriore
    if (o.shield) { const sx = shB[0] + Math.sin(armB) * S(9), sy = shB[1] + Math.cos(armB) * S(9); D.blob(sx, sy, S(4.5), S(5.5), tri(o.shield), 7); D.px(sx, sy, o.trim || "#d9b44a"); }
    // busto (con pancia per i grossi)
    const tx = hipX - torsoW / 2 + lean * S(6);
    for (let j = 0; j < hipY - shY + 1; j++) {
      const belly = o.belly ? Math.sin((j / (hipY - shY)) * Math.PI) * S(o.belly) : 0;
      for (let i = 0; i < torsoW + belly; i++) { const col = i < S(2) ? arm[0] : i > torsoW + belly - S(2.5) ? arm[2] : arm[1]; D.px(tx + i, shY + j, hash(i, j, 3) < 0.06 ? arm[2] : col); }
    }
    if (o.chest) for (let j = S(3); j < hipY - shY - S(2); j++) for (let i = S(3); i < torsoW - S(2); i++) D.px(tx + i + (o.belly ? S(1) : 0), shY + j, i < S(4.5) ? shade(o.chest, 1.15) : o.chest);
    if (o.trim) { for (let i = 0; i < torsoW; i++) D.px(tx + i, hipY - S(1), o.trim); for (let i = 0; i < torsoW; i++) D.px(tx + i, shY, shade(o.trim, 0.85)); }
    if (o.helmet && o.helmet !== "hood") { for (let i = S(1); i < torsoW - S(1); i++) D.px(tx + i, shY + S(6), arm[2]); }
    if (o.belt !== false) { D.rect(tx, hipY - S(2), torsoW, S(2), o.beltCol || "#4a2e14"); D.rect(tx + torsoW / 2, hipY - S(2), S(2), S(2), "#e0b030"); }
    if (o.skirt) for (let j = 0; j < S(4); j++) for (let i = -1; i < torsoW + 1; i++) D.px(tx + i, hipY + j, (i + j) % 4 === 0 ? arm[2] : arm[1]);
    if (o.scarf) { D.limb(tx + S(1), shY - S(1), tx + torsoW, shY + S(1), Math.ceil(S(3)), tri(o.scarf)); const fl = pose === "walk" ? Math.sin((t / 4) * 6.28) * 2 : 0; D.limb(tx, shY, tx - S(8), shY + S(3) + fl, Math.ceil(S(2.5)), tri(o.scarf)); }
    // gamba anteriore
    leg(legA, pants);
    // testa
    const hx = hipX + S(1) + lean * S(8), hy = shY - S(7);
    if (o.neck !== false) D.rect(hx - S(1.5), shY - S(3), S(4), S(4), skin[1]);
    D.blob(hx, hy, S(o.headR || 6.5), S(o.headR || 6.5), skin, 11);
    if (o.ears) { D.blob(hx - S(4), hy - S(5), S(2), S(2), skin, 12); }
    // capelli / elmi
    const hr = S(o.headR || 6.5);
    if (o.helmet === "steel" || o.helmet === "horned" || o.helmet === "gold") {
      const hc = tri(o.helmet === "gold" ? "#e0b030" : o.helmet === "horned" ? (o.helmetCol || "#4a2a2a") : (o.helmetCol || "#a8afba"));
      for (let j = -hr; j <= 0; j++) for (let i = -hr; i <= hr; i++) if (Math.hypot(i, j) <= hr + 0.6) D.px(hx + i, hy + j, i < -hr / 2 ? hc[0] : i > hr / 2 ? hc[2] : hc[1]);
      for (let i = -hr; i <= hr; i++) D.px(hx + i, hy + 1, hc[2]);
      if (o.helmet === "horned") { D.limb(hx - S(2), hy - hr, hx - S(5), hy - hr - S(5), Math.ceil(S(2)), tri("#e8dcc0")); D.limb(hx + S(2), hy - hr, hx + S(5), hy - hr - S(5), Math.ceil(S(2)), tri("#e8dcc0")); }
      if (o.plume) D.limb(hx - S(1), hy - hr, hx - S(6), hy - hr - S(3), Math.ceil(S(2)), tri(o.plume));
    } else if (o.helmet === "hood") {
      const hc = tri(o.hood || "#3a2050");
      for (let j = -hr - 1; j <= hr; j++) for (let i = -hr - 1; i <= hr; i++) { const d = Math.hypot(i, j); if (d <= hr + 1.2 && !(i > 0 && j > -2 && d < hr - 0.5)) D.px(hx + i, hy + j, i < -1 ? hc[0] : hc[1]); }
    } else if (o.hair) {
      const hc = tri(o.hairCol || "#3a2416");
      for (let j = -hr - 1; j <= -1; j++) for (let i = -hr - 1; i <= hr; i++) if (Math.hypot(i, j) <= hr + 1) D.px(hx + i, hy + j, i < 0 ? hc[0] : hc[1]);
      if (o.hair === "topknot") { D.blob(hx - S(1), hy - hr - S(2), S(2.2), S(2.2), hc, 9); }
      if (o.hair === "long") for (let j = -2; j <= hr; j++) D.px(hx - hr, hy + j, hc[1]);
    }
    // occhio
    // viso: sopracciglio, occhio, bocca
    D.rect(hx + S(1.5), hy - S(1.5), S(3), 1, shade(o.skin, 0.55));
    D.rect(hx + S(2.5), hy, S(1.5), S(1.5), o.eye || "#1b1b2a");
    if (o.eyeGlow) D.rect(hx + S(2.5), hy, S(1.5), S(1.5), o.eyeGlow);
    D.rect(hx + S(3), hy + S(3), S(2), 1, shade(o.skin, 0.6));
    if (o.beard) for (let i = 0; i < S(5); i++) for (let j = 0; j < S(3); j++) D.px(hx + i - S(1), hy + S(3) + j, tri(o.beard)[j > 1 ? 2 : 1]);
    if (o.horn) D.limb(hx + S(3), hy - S(3), hx + S(10), hy - S(9), Math.ceil(S(3)), tri("#e8e0cc"));
    if (o.tusks) { D.px(hx + S(4), hy + S(3), "#f0e8d8"); D.px(hx + S(4), hy + S(2), "#f0e8d8"); }
    // braccio anteriore + arma
    const shF = [hipX + S(2) + lean * S(6), shY + S(2)], handX = shF[0] + Math.sin(armF) * S(10), handY = shF[1] + Math.cos(armF) * S(10);
    const wAng = armF + (o.weapon === "bow" ? -1.57 : -1.2);
    const W2 = (len, wcol, w = 2) => { const ex = handX + Math.sin(wAng + 1.57) * S(len), ey = handY - Math.cos(wAng + 1.57) * S(len); D.limb(handX, handY, ex, ey, Math.ceil(S(w)), tri(wcol)); return [ex, ey]; };
    if (o.weapon === "sword") { W2(13, "#d6dae2", 2); D.limb(handX - S(1.5), handY - S(1), handX + S(1.5), handY + S(1), Math.ceil(S(2)), tri("#d9b44a")); }
    if (o.weapon === "axe") { const [ex, ey] = W2(15, "#7a5230", 2); D.blob(ex, ey, S(4.5), S(4), tri("#c9ccd6"), 5); }
    if (o.weapon === "bigaxe") { const [ex, ey] = W2(20, "#5a3a20", 2.5); D.blob(ex, ey, S(7), S(6), tri("#d6dae2"), 5); D.blob(ex, ey, S(3), S(3), tri("#7a1a1a"), 6); }
    if (o.weapon === "club") { const [ex, ey] = W2(14, "#8a5a2c", 3.5); D.blob(ex, ey, S(4), S(4), tri("#6b4422"), 8); }
    if (o.weapon === "staff") { const [ex, ey] = W2(16, "#6b4a2a", 2); D.blob(ex, ey, S(2.5), S(2.5), [o.orb2 || "#e8ffd0", o.orb || "#8aff5a", shade(o.orb || "#8aff5a", 0.6)], 4); }
    if (o.weapon === "spear") { const [ex, ey] = W2(18, "#7a5230", 1.6); D.limb(ex, ey, ex + Math.sin(wAng + 1.57) * S(4), ey - Math.cos(wAng + 1.57) * S(4), Math.ceil(S(2.5)), tri("#c9ccd6")); }
    if (o.weapon === "bow") { for (let a = -1.2; a <= 1.2; a += 0.08) D.px(handX + Math.cos(a) * S(2.5) + S(1), handY + Math.sin(a) * S(9), "#8a5a2a"); D.limb(handX - S(1), handY - S(8.5), handX - S(1), handY + S(8.5), 1, ["#e8e0d0"]); }
    if (o.weapon === "lightning") { D.blob(handX, handY, S(2.5), S(2.5), ["#ffffff", "#9ad8ff", "#3a8aff"], 3); }
    D.limb(shF[0], shF[1], handX, handY, Math.ceil(S(5)), o.sleeve ? tri(o.sleeve) : skin);
    D.blob(handX, handY, S(2.4), S(2.4), skin, 2);
    if (o.pauldron) D.blob(shF[0], shF[1] - S(1), S(4), S(3.2), tri(o.pauldron), 13);
    return outline(c);
  }

  // set completo di animazioni per un manichino
  function unitSet(o) {
    const make = (pose, n) => Array.from({ length: n }, (_, t) => doll(o, pose, t));
    const walk = make("walk", 4), atk = make("attack", 3), cast = make("cast", 3);
    const mirror = (a) => a.map(flip);
    return { walk, atk, cast, walkL: mirror(walk), atkL: mirror(atk), castL: mirror(cast), white: whiteOf(walk[0]), whiteL: whiteOf(flip(walk[0])), w: walk[0].width, h: walk[0].height };
  }

  // =====================================================================
  //  QUADRUPEDI (lupo; centauro = corpo di cavallo + busto)
  // =====================================================================
  function quad(o, t, atk) {
    const k = o.k || 1, W = Math.ceil(52 * k), H = Math.ceil(46 * k), [c, x] = mk(W, H), D = P(x), S = (v) => v * k;
    const body = tri(o.body), ph = (t / 4) * Math.PI * 2, lift = atk ? [0, -3, 0][t] : 0;
    const bx = S(22), by = S(30) + lift;
    if (o.tail) D.limb(bx - S(13), by - S(2), bx - S(20), by - S(8) + Math.sin(ph) * 2, Math.ceil(S(3)), tri(o.tail));
    const legs = [[-10, 0.5], [-6, -0.5], [7, -0.5], [11, 0.5]];
    legs.forEach(([lx, p], i) => { const a = Math.sin(ph + p * 3) * 0.45 * (i % 2 ? 1 : -1); const x0 = bx + S(lx), y0 = by + S(3); const cols = i < 2 ? body.map((cc) => shade(cc, 0.8)) : body; D.limb(x0, y0, x0 + Math.sin(a) * S(11), y0 + Math.cos(a) * S(11), Math.ceil(S(3.5)), cols); D.rect(x0 + Math.sin(a) * S(11) - S(1.5), y0 + Math.cos(a) * S(11) - S(1), S(4), S(2), o.hoof || "#1c1c22"); });
    D.blob(bx, by, S(15), S(7.5), body, 21);
    if (o.rider) {
      // busto del centauro
      const sx = bx + S(10), sy = by - S(6);
      D.limb(sx, sy, sx + S(2), sy - S(14), Math.ceil(S(9)), tri(o.rider.armor));
      D.blob(sx + S(3), sy - S(19), S(5), S(5), tri(o.rider.skin), 2);
      D.px(sx + S(5.5), sy - S(19.5), "#ffd04a");
      for (let j = -7; j <= -3; j++) for (let i = -5; i <= 3; i++) if (Math.hypot(i, j + 2) < 5.5) D.px(sx + S(3) + i, sy - S(19) + j, tri("#2a1a10")[i < 0 ? 0 : 1]);
      const aA = atk ? [-2.2, 1.0, 0.4][t] : 0.3, hx = sx + S(4) + Math.sin(aA) * S(11), hy = sy - S(11) + Math.cos(aA) * S(11);
      const ex = hx + Math.sin(aA - 1.2 + 1.57) * S(14), ey = hy - Math.cos(aA - 1.2 + 1.57) * S(14);
      D.limb(hx, hy, ex, ey, Math.ceil(S(2)), tri("#6b4422")); D.blob(ex, ey, S(5), S(4.5), tri("#c9ccd6"), 5);
      D.limb(sx + S(3), sy - S(11), hx, hy, Math.ceil(S(3.5)), tri(o.rider.skin));
    } else {
      // testa di lupo
      const hx = bx + S(15), hy = by - S(5) + lift;
      D.blob(hx, hy, S(6), S(5), body, 4);
      D.limb(hx + S(3), hy + S(1), hx + S(10), hy + S(2) + (atk && t === 1 ? 2 : 0), Math.ceil(S(4)), body);
      D.limb(hx - S(2), hy - S(4), hx - S(1), hy - S(9), Math.ceil(S(2.5)), body);
      D.px(hx + S(3), hy - S(1), o.eye || "#ff4a2a"); D.px(hx + S(10), hy + S(1), "#111");
      if (atk && t === 1) { D.px(hx + S(8), hy + S(4), "#f0e8d8"); D.px(hx + S(6), hy + S(4), "#f0e8d8"); }
    }
    return outline(c);
  }
  function quadSet(o) {
    const walk = [0, 1, 2, 3].map((t) => quad(o, t, false)), atk = [0, 1, 2].map((t) => quad(o, t, true));
    return { walk, atk, cast: atk, walkL: walk.map(flip), atkL: atk.map(flip), castL: atk.map(flip), white: whiteOf(walk[0]), whiteL: whiteOf(flip(walk[0])), w: walk[0].width, h: walk[0].height };
  }

  // =====================================================================
  //  GOLEM DI ROCCIA, DRAGO, CARRO D'ASSEDIO
  // =====================================================================
  function golem(t, atk) {
    const [c, x] = mk(56, 62), D = P(x), b = atk ? [0, 3, 1][t] : Math.round(Math.sin((t / 4) * 6.28) * 1.5);
    const rock = ["#a0a3ab", "#82868f", "#686c77", "#50535d", "#3a3c44"];
    const ball = (cx, cy, r, s) => D.blob(cx, cy, r, r, rock, s);
    ball(20, 50 - b * 0, 6, 1); ball(34, 50, 6, 2); // gambe
    ball(27, 32, 14, 3); // busto
    ball(27, 14 + b * 0.5, 7, 4); // testa
    const armX = atk ? [10, 46, 40][t] : 44, armY = atk ? [10, 30, 34][t] : 36;
    ball(10, 34, 6, 5); ball(armX, armY, 7, 6);
    for (const [i, j] of [[22, 26], [31, 36], [26, 40], [18, 32], [36, 24]]) { D.px(i, j, "#4a7a3a"); D.px(i + 1, j, "#5a9a4a"); } // muschio
    D.px(30, 13, "#7affd8"); D.px(31, 13, "#7affd8"); D.px(30, 12, "#c8fff0");
    return outline(c);
  }
  function golemSet() { const walk = [0, 1, 2, 3].map((t) => golem(t, false)), atk = [0, 1, 2].map((t) => golem(t, true)); return { walk, atk, cast: atk, walkL: walk.map(flip), atkL: atk.map(flip), castL: atk.map(flip), white: whiteOf(walk[0]), whiteL: whiteOf(flip(walk[0])), w: 56, h: 62 }; }
  function dragon(t) {
    const [c, x] = mk(80, 56), D = P(x), up = t % 2 === 0;
    const sc = ["#4a3048", "#2e1c2e", "#1a1018"];
    D.limb(14, 32, 2, 26, 4, sc); D.limb(2, 26, -2, 30, 3, sc); // coda
    D.blob(30, 32, 18, 9, sc, 3); // corpo
    D.limb(44, 28, 58, 18, 6, sc); // collo
    D.blob(62, 16, 8, 6, sc, 4); D.limb(66, 18, 74, 20, 4, sc); // testa, muso
    D.px(64, 14, "#ff9a2a"); D.px(65, 14, "#ffd06a"); D.limb(60, 10, 54, 4, 2, ["#e8dcc0", "#a89a7a"]);
    D.px(73, 21, "#f0e0c0"); D.px(71, 21, "#f0e0c0");
    // ali
    const wy = up ? -20 : 10;
    for (let s = 0; s < 1; s++) { D.limb(28, 26, 18, 26 + wy, 3, ["#5a2030", "#3a1420"]); D.limb(18, 26 + wy, 42, 22, 2, ["#5a2030"]); for (let i = 0; i < 18; i++) { const a = i / 18; D.limb(28 - a * 10, 26 + wy * a, 26 + a * 16, 24, 1, [i % 3 ? "#4a1a1a" : "#6a2a2a"]); } }
    D.limb(26, 38, 24, 48, 4, sc); D.limb(38, 38, 40, 48, 4, sc);
    return outline(c);
  }
  function dragonSet() { const walk = [0, 1, 2, 3].map(dragon), atk = [dragon(0), dragon(1), dragon(0)]; return { walk, atk, cast: atk, walkL: walk.map(flip), atkL: atk.map(flip), castL: atk.map(flip), white: whiteOf(walk[0]), whiteL: whiteOf(flip(walk[0])), w: 80, h: 56, fly: true }; }
  function siege(t, atk) {
    const [c, x] = mk(58, 46), D = P(x);
    const wood = tri("#7a5430"), dark = tri("#4a3018");
    D.limb(6, 30, 50, 30, 6, wood); D.limb(10, 24, 44, 24, 3, dark);
    const armA = atk ? [-0.2, 1.1, 0.6][t] : -0.2;
    D.limb(36, 26, 36 - Math.cos(armA) * 26, 26 - Math.sin(armA) * 26 - 4, 3, tri("#8a6040"));
    const bx = 36 - Math.cos(armA) * 26, by = 26 - Math.sin(armA) * 26 - 4;
    if (!(atk && t === 1)) D.blob(bx, by - 3, 4, 4, ["#b0b4bc", "#8a8f99", "#5a5e68"], 2);
    for (const wx of [14, 42]) { D.blob(wx, 37, 7, 7, tri("#5a3a1c"), 4); const r = (t * 0.8 + wx) % 6.28; for (let k = 0; k < 4; k++) { const a = r + (k * Math.PI) / 2; D.px(wx + Math.cos(a) * 4, 37 + Math.sin(a) * 4, "#2a1a10"); } D.px(wx, 37, "#d9b44a"); }
    D.blob(48, 22, 4, 4, ["#f0e8d8", "#d8ccb0", "#9a8a6a"], 3); D.px(49, 21, "#111"); D.px(47, 21, "#111"); // teschio del Dire
    return outline(c);
  }
  function siegeSet() { const walk = [0, 1, 2, 3].map((t) => siege(t, false)), atk = [0, 1, 2].map((t) => siege(t, true)); return { walk, atk, cast: atk, walkL: walk.map(flip), atkL: atk.map(flip), castL: atk.map(flip), white: whiteOf(walk[0]), whiteL: whiteOf(flip(walk[0])), w: 58, h: 46 }; }

  // =====================================================================
  //  L'ANTICO DEL RADIANT, SU UNA COLLINA
  // =====================================================================
  function ancient() {
    const [c, x] = mk(96, 120), D = P(x);
    // basamento a gradoni
    for (let tier = 0; tier < 3; tier++) { const y = 104 - tier * 9, w = 84 - tier * 16; for (let j = 0; j < 9; j++) for (let i = 0; i < w; i++) { const X = 48 - w / 2 + i, col = j === 0 ? "#d6d8de" : i < 3 ? "#c0c4cc" : i > w - 4 ? "#7a7f8a" : hash(X, y + j, 9) < 0.12 ? "#8a8f99" : "#a6aab4"; D.px(X, y + j, col); } for (let i = 0; i < w; i += 7) D.px(48 - w / 2 + i, y + 4, "#7a7f8a"); }
    // tronco dorato attorcigliato
    for (let j = 34; j < 88; j++) { const sw = Math.sin(j * 0.18) * 3; for (let i = -5; i <= 5; i++) { const X = 48 + i + sw; D.px(X, j, i < -2 ? "#fff4c8" : i < 2 ? "#e8c868" : "#a8823a"); } }
    // radici
    for (const a of [-1, 1]) D.limb(48, 80, 48 + a * 20, 87, 3, ["#fff4c8", "#e8c868", "#a8823a"]);
    // chioma di cristallo/luce
    D.blob(48, 30, 30, 24, ["#ffffff", "#e6fff0", "#b8f5cf", "#7ae0a0", "#3ab878", "#1e8a5a"], 7);
    for (let k = 0; k < 40; k++) { const i = 22 + hash(k, 1, 3) * 52, j = 10 + hash(k, 2, 3) * 40; if (Math.hypot((i - 48) / 30, (j - 30) / 24) < 0.95) D.px(i, j, hash(k, 3, 3) < 0.5 ? "#ffffff" : "#fff6b0"); }
    // gemma centrale
    D.blob(48, 30, 7, 9, ["#ffffff", "#e8fbff", "#9ad8ff", "#3a8aff"], 5);
    return outline(c, "#0e1a14");
  }

  // =====================================================================
  //  SFONDO: cielo al tramonto, montagne, foreste, terreno a strati
  // =====================================================================
  function background(W, H, groundY, hill) {
    const [c, x] = mk(W, H), D = P(x);
    for (let j = 0; j < groundY; j++) { const t = j / groundY; const r = Math.round(40 + t * 140), gg = Math.round(48 + t * 70), b = Math.round(90 + t * 40); x.fillStyle = `rgb(${r},${gg},${b})`; x.fillRect(0, j, W, 1); }
    // stelle in alto
    for (let k = 0; k < 40; k++) D.px(hash(k, 1, 5) * W, hash(k, 2, 5) * 40, "#ffffff");
    // montagne lontane
    for (let i = 0; i < W; i++) { const h = 50 + noise(i / 40, 1, 2) * 50; for (let j = groundY - h; j < groundY; j++) D.px(i, j, j < groundY - h + 3 ? "#7a6a9a" : "#5a4a7a"); }
    // foresta: Radiant (verde) a sinistra, Dire (rossastro, rami secchi) a destra
    for (let i = 0; i < W; i++) {
      const dire = clamp((i - W * 0.45) / (W * 0.35), 0, 1);
      const h = 26 + noise(i / 9, 3, 4) * 22;
      for (let j = groundY - h; j < groundY; j++) {
        const lit = (j - (groundY - h)) / h, base = dire > 0.5 ? ["#4a2a3a", "#3a2030", "#2a1824"] : ["#2f6a3a", "#245530", "#1a4026"];
        D.px(i, j, base[clamp(Math.floor(lit * 3 + (hash(i, j, 6) - 0.5)), 0, 2)]);
      }
    }
    // terreno
    for (let j = groundY; j < H; j++) for (let i = 0; i < W; i++) {
      const dire = clamp((i - W * 0.45) / (W * 0.35), 0, 1), top = j - groundY;
      let col;
      if (top < 3) col = dire > 0.5 ? (hash(i, j, 7) < 0.5 ? "#6a5a3a" : "#5a4a30") : (hash(i, j, 7) < 0.5 ? "#5a9a3a" : "#4a8a32");
      else if (top < 5) col = dire > 0.5 ? "#4a3a28" : "#3a6a2a";
      else col = (noise(i / 6, j / 4, 8) > 0.55 ? "#5a4630" : "#4a3a26");
      if (top > 6 && hash(i, j, 9) < 0.02) col = "#8a7a60";
      D.px(i, j, col);
    }
    // collina del Radiant a sinistra
    for (let i = 0; i < hill.w; i++) {
      const hy = groundY - hill.h * Math.cos((i / hill.w) * Math.PI * 0.5) ** 1.5;
      for (let j = Math.floor(hy); j < groundY + 2; j++) D.px(i, j, j - hy < 2 ? "#6ab04a" : j - hy < 4 ? "#4a8a32" : noise(i / 5, j / 4, 10) > 0.5 ? "#5a4630" : "#4a3a26");
    }
    // ciuffi e fiori sul bordo dell'erba
    for (let i = 0; i < W; i += 3) { if (hash(i, 1, 11) < 0.4) { const dire = i > W * 0.6; D.px(i, groundY - 1, dire ? "#7a6a4a" : "#7ac05a"); D.px(i + 1, groundY - 2, dire ? "#5a4a30" : "#5a9a3a"); } if (hash(i, 2, 11) < 0.05 && i < W * 0.55) D.px(i, groundY - 2, ["#f0c94a", "#e8e0f0", "#d9505a"][i % 3]); }
    return c;
  }

  window.ART2 = { mk, hash, shade, outline, flip, whiteOf, tint, doll, unitSet, quadSet, golemSet, dragonSet, siegeSet, ancient, background };
})();
