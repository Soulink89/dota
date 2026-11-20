// =====================================================================
//  ART: tutta la pixel art è generata qui, una volta, all'avvio.
//  - sprite da matrici di caratteri + palette, con contorno automatico
//  - terreno, alberi, rocce, muri e torrette disegnati pixel per pixel
//    con ombreggiatura (luce da in alto a sinistra) e un po' di rumore
// =====================================================================
(() => {
  const OUT = "#120c18"; // colore del contorno

  // ---------- utilità ----------
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; return [c, x]; };
  const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  function noise(x, y, s) { // value noise morbido
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const px = (x, X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); };

  // contorno di 1px attorno ai pixel pieni (aggiunge 1px di margine)
  function outline(src, col = OUT) {
    const w = src.width, h = src.height;
    const [c, x] = mk(w + 2, h + 2);
    const d = src.getContext("2d").getImageData(0, 0, w, h).data;
    const solid = (i, j) => i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 40;
    x.fillStyle = col;
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
      if (solid(i, j)) continue;
      if (solid(i - 1, j) || solid(i + 1, j) || solid(i, j - 1) || solid(i, j + 1)) x.fillRect(i + 1, j + 1, 1, 1);
    }
    x.drawImage(src, 1, 1);
    return c;
  }
  // sprite da matrice
  function spr(rows, pal, opt = {}) {
    const [c, x] = mk(rows[0].length, rows.length);
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (pal[ch]) px(x, i, j, pal[ch]); }));
    return opt.noOutline ? c : outline(c);
  }
  function flip(src) { const [c, x] = mk(src.width, src.height); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; }
  // versione tutta bianca (per il lampo quando viene colpito)
  function whiteOf(src) { const [c, x] = mk(src.width, src.height); x.drawImage(src, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); return c; }
  // rotazione "a pixel" (campionamento nearest): niente sfocature
  function rotPix(src, ang, cx, cy) {
    const R = Math.ceil(Math.hypot(src.width, src.height)) + 2;
    const [c, x] = mk(R * 2, R * 2);
    const sd = src.getContext("2d").getImageData(0, 0, src.width, src.height).data;
    const img = x.createImageData(R * 2, R * 2), od = img.data;
    const co = Math.cos(-ang), si = Math.sin(-ang);
    for (let j = 0; j < R * 2; j++) for (let i = 0; i < R * 2; i++) {
      const dx = i - R + 0.5, dy = j - R + 0.5;
      const sx = Math.floor(dx * co - dy * si + cx), sy = Math.floor(dx * si + dy * co + cy);
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
      const k = (sy * src.width + sx) * 4, o = (j * R * 2 + i) * 4;
      od[o] = sd[k]; od[o + 1] = sd[k + 1]; od[o + 2] = sd[k + 2]; od[o + 3] = sd[k + 3];
    }
    x.putImageData(img, 0, 0);
    return { img: c, ox: R, oy: R }; // il pivot finisce al centro
  }

  // =====================================================================
  //  PERSONAGGI (guardano a destra; flip per sinistra)
  // =====================================================================
  const SURV_PAL = { h: "#3b2416", H: "#5e3a22", k: "#f2c29b", K: "#cf9670", e: "#1b1b2a", i: "#6f9a52", j: "#4c7a3a", J: "#33562a", b: "#6b4423", y: "#d9b44a", p: "#3e4560", P: "#2a2f45", B: "#2a1d16", w: "#e8e0d0" };
  const SURV_TOP = [
    "................",
    "......hhhh......",
    ".....hHHHhhh....",
    ".....hkkkkhh....",
    ".....kkkekKh....",
    ".....kkkkkK.....",
    "......KkkK......",
    ".....ijjjjJJ....",
    "....iijjjjjJJ...",
    "....ijjjjyjJJ...",
    "....ijjjjjjJ....",
    ".....bbbbbb.....",
  ];
  const SURV_LEGS = [
    [".....ppPpP......", ".....pp..pP.....", ".....pp..pP.....", ".....BB..BB....."],
    [".....ppPpP......", "....pp....pP....", "...pp......pP...", "...BB......BB..."],
    [".....ppPpP......", ".....pp..pP.....", ".....pp..pP.....", ".....BB..BB....."],
    [".....ppPpP......", "......pPpp......", "......pP.pp.....", "......BB.BB....."],
  ];
  const survivor = SURV_LEGS.map((l) => spr([...SURV_TOP, ...l], SURV_PAL));
  // braccio + mitra: pivot sulla spalla (1,2)
  const GUN = spr([
    "...GGGG.......",
    "kkgggggggggGGG",
    "kk.GgggG......",
    "....GG.G......",
    "....G.........",
  ], { k: "#f2c29b", g: "#7b8494", G: "#3c4350" });

  // zombie: pelle verde, vestiti strappati, occhi che brillano
  function zombieSet(pal, top, legs) { const f = legs.map((l) => spr([...top, ...l], pal)); return { r: f, l: f.map(flip), w: f.map(whiteOf) }; }
  const Z_TOP = [
    "................",
    ".....SSSS.......",
    "....SslllS......",
    "....SsslssS.....",
    "....SssseSs.....",
    "....SssssSS.....",
    ".....SmmsS......",
    "......SsS.......",
    "....TtttttT.....",
    "...TttttrtTssssS",
    "...TtrtttttSSSSS",
    "...TtttttrT.....",
  ];
  const Z_LEGS = [
    ["....pppPpp......", "....pp..pP......", "....pp..pP......", "....ff..ff......"],
    ["....pppPpp......", "...pp....pP.....", "..pp......pP....", "..ff.......ff..."],
    ["....pppPpp......", "....pp..pP......", "....pp..pP......", "....ff..ff......"],
    ["....pppPpp......", ".....pPpp.......", ".....pP.pp......", ".....ff..ff....."],
  ];
  const walker = zombieSet({ S: "#4f6e3c", s: "#7ea35e", l: "#a8c983", e: "#ff4a3a", m: "#3a1420", T: "#4a3a63", t: "#6d5a8e", r: "#8a1c1c", p: "#475166", P: "#2e3546", f: "#2b2019" }, Z_TOP, Z_LEGS);
  const runner = zombieSet({ S: "#6b6e3a", s: "#9aa35a", l: "#c3c97d", e: "#ffd23a", m: "#3a1420", T: "#7a2626", t: "#a83a3a", r: "#4a0f0f", p: "#2f3a2f", P: "#1e261e", f: "#2b2019" }, Z_TOP, Z_LEGS);
  const B_TOP = [
    "....................",
    "......SSSSSS........",
    ".....SsllllsS.......",
    ".....SssslsssS......",
    ".....SsesssesS......",
    ".....SssssssSS......",
    "......SmmmmsS.......",
    "....TTTTTTTTTT......",
    "...TtttttttttTTsssS.",
    "..TtttrrttttttTsssSS",
    "..TttrttttttttTSssSS",
    "..TtttttttttrtT.SSS.",
    "..TttttttttttTT.....",
    "...TttttttttT.......",
  ];
  const B_LEGS = [
    ["....pppppPppp.......", "....pppp..pPpp......", "....ppp....Ppp......", "....ppp....Ppp......", "...ffff...ffff......"],
    ["....pppppPppp.......", "...pppp....pPpp.....", "..ppp.......Ppp.....", "..ppp........Ppp....", ".ffff........ffff..."],
    ["....pppppPppp.......", "....pppp..pPpp......", "....ppp....Ppp......", "....ppp....Ppp......", "...ffff...ffff......"],
    ["....pppppPppp.......", ".....pppPpp.........", ".....ppP.ppp........", ".....ppP..ppp.......", ".....fff..ffff......"],
  ];
  const EYES = { walker: [9, 5], runner: [9, 5], brute: [[8, 5], [12, 5]] };
  const brute = zombieSet({ S: "#57506e", s: "#857da3", l: "#aca5c9", e: "#ff5a2a", m: "#2a1020", T: "#3c4a3a", t: "#566b52", r: "#8a1c1c", p: "#5a4632", P: "#3a2d20", f: "#1f1812" }, B_TOP, B_LEGS);

  // =====================================================================
  //  TERRENO: prato di notte, terra battuta attorno al bunker, fiori, ciuffi
  // =====================================================================
  function ground(W, H, clearings) {
    const [c, x] = mk(W, H);
    const G = ["#24451f", "#2b5225", "#33602b", "#3c6f31", "#467d38"];
    const D = ["#4a3a28", "#5a472f", "#6a5536", "#7a633f"];
    const img = x.createImageData(W, H), d = img.data;
    const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
    const GG = G.map(hex), DD = D.map(hex);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const n = noise(i / 9, j / 9, 1) * 0.6 + noise(i / 3, j / 3, 2) * 0.3 + hash(i, j, 3) * 0.25;
      // quanto è "terra" in questo punto (radure attorno al bunker)
      let dirt = 0;
      for (const cl of clearings) dirt = Math.max(dirt, 1 - Math.hypot((i - cl.x) / cl.rx, (j - cl.y) / cl.ry));
      dirt += (noise(i / 5, j / 5, 4) - 0.5) * 0.5;
      const isDirt = dirt > 0.25 + (hash(i, j, 5) - 0.5) * 0.15; // bordo frastagliato (dither)
      const pal = isDirt ? DD : GG;
      const k = Math.max(0, Math.min(pal.length - 1, Math.floor(n * pal.length * 0.95)));
      const o = (j * W + i) * 4; d[o] = pal[k][0]; d[o + 1] = pal[k][1]; d[o + 2] = pal[k][2]; d[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    // ciuffi d'erba, sassolini, fiori
    for (let k = 0; k < (W * H) / 60; k++) {
      const i = Math.floor(hash(k, 1, 7) * W), j = Math.floor(hash(k, 2, 7) * H);
      const onDirt = clearings.some((cl) => Math.hypot((i - cl.x) / cl.rx, (j - cl.y) / cl.ry) < 0.7);
      if (onDirt) {
        if (hash(k, 3, 7) < 0.5) { px(x, i, j, "#8a7556"); px(x, i + 1, j, "#a08a68"); px(x, i, j + 1, "#3a2c1e"); }
      } else {
        const r = hash(k, 4, 7);
        if (r < 0.62) { px(x, i, j, "#55913f"); px(x, i + 1, j - 1, "#68a64c"); px(x, i + 2, j, "#4a8236"); px(x, i + 1, j + 1, "#1d3a1a"); }
        else if (r < 0.7) { px(x, i, j, "#e8e0f0"); px(x, i, j + 1, "#2c4f22"); }
        else if (r < 0.76) { px(x, i, j, "#f0c94a"); px(x, i, j + 1, "#2c4f22"); }
        else if (r < 0.8) { px(x, i, j, "#d9505a"); px(x, i, j + 1, "#2c4f22"); }
      }
    }
    return c;
  }

  // =====================================================================
  //  OGGETTI: alberi, rocce, cespugli (luce da in alto a sinistra)
  // =====================================================================
  function tree(seed) {
    const W = 30, H = 36;
    const [c, x] = mk(W, H);
    // tronco
    for (let j = 24; j < 34; j++) for (let i = 12; i < 18; i++) px(x, i, j, i < 14 ? "#6b4526" : i < 16 ? "#553620" : "#3d2616");
    px(x, 11, 33, "#3d2616"); px(x, 18, 33, "#3d2616");
    // chioma: unione di cerchi, ombreggiata
    const blobs = [[15, 13, 11], [8, 17, 7], [22, 17, 7], [15, 7, 7], [11, 22, 6], [19, 22, 6]];
    const C = ["#173d1e", "#1f4f25", "#2a6630", "#367c39", "#4b9446", "#66ad55"];
    for (let j = 0; j < 30; j++) for (let i = 0; i < W; i++) {
      let inside = false; for (const [bx, by, r] of blobs) if (Math.hypot(i - bx, j - by) < r + (hash(i, j, seed) - 0.5) * 1.4) inside = true;
      if (!inside) continue;
      const lit = 1 - Math.hypot(i - 9, j - 6) / 24 + (noise(i / 3, j / 3, seed) - 0.5) * 0.5;
      const k = Math.max(0, Math.min(C.length - 1, Math.floor(lit * C.length)));
      px(x, i, j, C[k]);
    }
    return outline(c);
  }
  function rock(seed) {
    const [c, x] = mk(15, 11);
    const C = ["#3e4049", "#51545f", "#676b77", "#80848f", "#9da1aa"];
    for (let j = 0; j < 11; j++) for (let i = 0; i < 15; i++) {
      if (Math.hypot((i - 7) / 7.2, (j - 6) / 5.2) > 1 + (hash(i, j, seed) - 0.5) * 0.15) continue;
      const lit = 1 - Math.hypot(i - 4, j - 2) / 12 + (hash(i, j, seed + 9) - 0.5) * 0.3;
      px(x, i, j, C[Math.max(0, Math.min(4, Math.floor(lit * 5)))]);
    }
    px(x, 6, 5, "#3e4049"); px(x, 7, 6, "#3e4049"); px(x, 8, 6, "#3e4049"); // crepa
    return outline(c);
  }
  function bush(seed) {
    const [c, x] = mk(14, 10);
    const C = ["#1d4422", "#2a5c2c", "#3b7638", "#55924a"];
    for (let j = 0; j < 10; j++) for (let i = 0; i < 14; i++) {
      if (Math.hypot((i - 7) / 7, (j - 5.5) / 4.6) > 1 + (hash(i, j, seed) - 0.5) * 0.3) continue;
      const lit = 1 - Math.hypot(i - 4, j - 2) / 11 + (hash(i, j, seed + 3) - 0.5) * 0.4;
      px(x, i, j, C[Math.max(0, Math.min(3, Math.floor(lit * 4)))]);
    }
    if (seed % 2) { px(x, 4, 3, "#d9505a"); px(x, 9, 5, "#d9505a"); }
    return outline(c);
  }

  // =====================================================================
  //  COSTRUZIONI (16x16 + "altezza" verso l'alto, vista 3/4)
  // =====================================================================
  function woodWall(dmg) {
    const [c, x] = mk(16, 20);
    for (let j = 0; j < 20; j++) for (let i = 0; i < 16; i++) {
      const plank = Math.floor(i / 4), e = i % 4;
      let col = j < 4 ? ["#c08a4e", "#b07c43", "#c08a4e", "#a87440"][plank] : ["#94612f", "#86562a", "#94612f", "#7d5027"][plank];
      if (e === 0) col = j < 4 ? "#d6a466" : "#a8723a";
      if (e === 3) col = "#5a3818";
      if (j === 19 || j === 4) col = "#4a2e14";
      if (hash(i, j, 11) < 0.08 && j > 4) col = "#6e4622";
      px(x, i, j, col);
    }
    for (const [i, j] of [[1, 6], [5, 6], [9, 6], [13, 6], [1, 16], [5, 16], [9, 16], [13, 16]]) px(x, i + 1, j, "#9aa0a8");
    if (dmg) crack(x, 16, 20, 21);
    return outline(c);
  }
  function stoneWall(dmg) {
    const [c, x] = mk(16, 20);
    for (let j = 0; j < 20; j++) for (let i = 0; i < 16; i++) {
      let col;
      if (j < 4) col = hash(i, j, 12) < 0.3 ? "#b9bcc4" : "#a6a9b2";
      else {
        const row = Math.floor((j - 4) / 4), off = row % 2 ? 4 : 0, bi = (i + off) % 8;
        const mortar = (j - 4) % 4 === 3 || bi === 7;
        col = mortar ? "#4a4c55" : bi === 0 || (j - 4) % 4 === 0 ? "#9a9da7" : hash(i, j, 13) < 0.25 ? "#7c7f89" : "#888b95";
      }
      if (j === 19) col = "#3a3c44";
      px(x, i, j, col);
    }
    if (dmg) crack(x, 16, 20, 22);
    return outline(c);
  }
  function crack(x, w, h, s) {
    let i = 4 + Math.floor(hash(1, 2, s) * 8), j = 5;
    while (j < h - 2) { px(x, i, j, "#1a1214"); j++; i += hash(i, j, s) < 0.5 ? -1 : 1; i = Math.max(1, Math.min(w - 2, i)); }
  }
  function sandbagNest() {
    const [c, x] = mk(18, 14);
    const bag = (bx, by) => {
      for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) {
        if ((i === 0 || i === 5) && (j === 0 || j === 3)) continue;
        px(x, bx + i, by + j, j === 0 ? "#d9c79a" : j === 3 ? "#8a7650" : i === 5 ? "#a8956a" : "#c2ae80");
      }
      px(x, bx + 2, by + 1, "#e8dcb4");
    };
    [[1, 6], [6, 7], [11, 6], [0, 9], [6, 10], [12, 9], [3, 3], [9, 3]].forEach(([a, b]) => bag(a, b));
    return outline(c);
  }
  // mitragliatrice: canna lunga + scatola munizioni, pivot al centro (5,3)
  const MG = spr([
    "...KKKK........",
    ".KkkkkkKggggggg",
    "KkkhkkkkGGGGGGG",
    ".KkkkkkK...a...",
    "..aa.aa...aa...",
  ], { K: "#2b2f38", k: "#5c6370", h: "#8a93a3", g: "#9aa3b2", G: "#4a505c", a: "#6b5a2a" });
  const MG_DIRS = Array.from({ length: 32 }, (_, i) => rotPix(MG, (i / 32) * Math.PI * 2, 5, 3));
  const mine = (on) => spr([
    ".KKKKK.",
    "KkkhkkK",
    "Kk" + (on ? "rr" : "dd") + "kkK",
    "KkkkkkK",
    ".KKKKK.",
  ], { K: "#2b2f38", k: "#5f6b52", h: "#8a9a74", r: "#ff3030", d: "#5a1414" });
  const mineOn = mine(true), mineOff = mine(false);

  // bunker (2x2 tile, più alto) con porta, lampada, sacchetti
  function bunker() {
    const W = 34, H = 40;
    const [c, x] = mk(W, H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      let col = null;
      if (j < 10 && i > 1 && i < W - 2) col = j < 2 ? "#a3a8b0" : hash(i, j, 31) < 0.2 ? "#7f858e" : "#8c929b"; // tetto
      else if (j >= 10 && j < 34) {
        col = hash(i, j, 32) < 0.15 ? "#5d636c" : "#6b717a";
        if (j === 10) col = "#454a52";
        if (i < 3) col = "#7c828b"; if (i > W - 4) col = "#50555d";
        if (j > 16 && j < 20 && i > 5 && i < 14) col = "#1a1d22"; // feritoia
        if (j > 16 && j < 20 && i > 20 && i < 29) col = "#1a1d22";
        if (j > 21 && i > 12 && i < 21) col = j === 22 ? "#3a2a1a" : i === 13 || i === 20 ? "#3a2a1a" : "#5a4128"; // porta
        if (j > 21 && i === 19 && j === 28) col = "#d9b44a";
      }
      if (col) px(x, i, j, col);
    }
    // strisce gialle/nere
    for (let i = 3; i < W - 3; i++) px(x, i, 11, Math.floor(i / 2) % 2 ? "#e0b030" : "#22201c");
    // lampada
    px(x, 16, 13, "#fff4c0"); px(x, 17, 13, "#fff4c0"); px(x, 16, 14, "#d9b44a"); px(x, 17, 14, "#d9b44a");
    // ruggine che cola dalle feritoie
    for (const rx of [7, 12, 22, 27]) for (let j = 20; j < 20 + 3 + (rx % 4); j++) px(x, rx, j, j % 2 ? "#7a4a2a" : "#8a5a32");
    // tetto: botola e sfiato
    for (let i = 6; i < 12; i++) for (let j = 3; j < 7; j++) px(x, i, j, j === 3 ? "#b8bdc5" : i === 6 || i === 11 || j === 6 ? "#5d636c" : "#767c85");
    for (let i = 23; i < 27; i++) for (let j = 2; j < 6; j++) px(x, i, j, j === 2 ? "#4a4f57" : (i + j) % 2 ? "#2e3238" : "#5d636c");
    // antenna con lucina rossa
    for (let j = 0; j < 4; j++) px(x, 29, j, "#3a3e45"); px(x, 29, 0, "#ff4040");
    // sacchetti di sabbia ai lati della porta
    const bag = (bx, by) => { for (let j = 0; j < 4; j++) for (let i = 0; i < 6; i++) { if ((i === 0 || i === 5) && (j === 0 || j === 3)) continue; px(x, bx + i, by + j, j === 0 ? "#d9c79a" : j === 3 ? "#8a7650" : i === 5 ? "#a8956a" : "#c2ae80"); } };
    [[2, 30], [7, 31], [21, 31], [26, 30], [4, 27], [24, 27]].forEach(([a, b]) => bag(a, b));
    return outline(c);
  }

  // icone 16x16 per la barra dei comandi
  function icon(src, scale = 1) { const [c, x] = mk(20, 20); x.drawImage(src, Math.floor((20 - src.width * scale) / 2), Math.floor((20 - src.height * scale) / 2), src.width * scale, src.height * scale); return c; }

  window.ART = {
    mk, hash, outline, flip, whiteOf, rotPix,
    survivor, survivorL: survivor.map(flip), survivorW: survivor.map(whiteOf), GUN,
    walker, runner, brute, EYES,
    ground, tree, rock, bush,
    woodWall: [woodWall(false), woodWall(true)], stoneWall: [stoneWall(false), stoneWall(true)],
    nest: sandbagNest(), MG_DIRS, mineOn, mineOff, bunker: bunker(),
    icon,
  };
})();
