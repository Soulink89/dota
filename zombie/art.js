// =====================================================================
//  ART: tutta la pixel art è generata qui all'avvio (niente immagini esterne).
//  Sprite da matrici + palette con contorno automatico; terreno, alberi,
//  rocce, fuoco e costruzioni disegnati pixel per pixel con ombreggiatura
//  (luce da in alto a sinistra) e rumore.
// =====================================================================
(() => {
  const OUT = "#120c18";
  const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; return [c, x]; };
  const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  function noise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const px = (x, X, Y, col) => { x.fillStyle = col; x.fillRect(X, Y, 1, 1); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function outline(src, col = OUT) {
    const w = src.width, h = src.height, [c, x] = mk(w + 2, h + 2);
    const d = src.getContext("2d").getImageData(0, 0, w, h).data;
    const solid = (i, j) => i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 40;
    x.fillStyle = col;
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) if (!solid(i, j) && (solid(i - 1, j) || solid(i + 1, j) || solid(i, j - 1) || solid(i, j + 1))) x.fillRect(i + 1, j + 1, 1, 1);
    x.drawImage(src, 1, 1);
    return c;
  }
  function spr(rows, pal, opt = {}) {
    const w = Math.max(...rows.map((r) => r.length)), [c, x] = mk(w, rows.length);
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (pal[ch]) px(x, i, j, pal[ch]); }));
    return opt.noOutline ? c : outline(c);
  }
  function flip(src) { const [c, x] = mk(src.width, src.height); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; }
  function flipV(src) { const [c, x] = mk(src.width, src.height); x.translate(0, src.height); x.scale(1, -1); x.drawImage(src, 0, 0); return c; }
  function whiteOf(src) { const [c, x] = mk(src.width, src.height); x.drawImage(src, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); return c; }
  function rotPix(src, ang, cx, cy) {
    const R = Math.ceil(Math.hypot(src.width, src.height)) + 2, [c, x] = mk(R * 2, R * 2);
    const sd = src.getContext("2d").getImageData(0, 0, src.width, src.height).data, img = x.createImageData(R * 2, R * 2), od = img.data;
    const co = Math.cos(-ang), si = Math.sin(-ang);
    for (let j = 0; j < R * 2; j++) for (let i = 0; i < R * 2; i++) {
      const dx = i - R + 0.5, dy = j - R + 0.5, sx = Math.floor(dx * co - dy * si + cx), sy = Math.floor(dx * si + dy * co + cy);
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
      const k = (sy * src.width + sx) * 4, o = (j * R * 2 + i) * 4;
      od[o] = sd[k]; od[o + 1] = sd[k + 1]; od[o + 2] = sd[k + 2]; od[o + 3] = sd[k + 3];
    }
    x.putImageData(img, 0, 0);
    return { img: c, ox: R, oy: R };
  }
  const rot32 = (src, cx, cy) => Array.from({ length: 32 }, (_, i) => rotPix(src, (i / 32) * Math.PI * 2, cx, cy));
  // set di animazione: frames (destra), versione specchiata, versione bianca (colpito)
  const anim = (frames) => ({ r: frames, l: frames.map(flip), w: frames.map(whiteOf), wl: frames.map((f) => whiteOf(flip(f))) });
  const withLegs = (top, legs, pal) => anim(legs.map((l) => spr([...top, ...l], pal)));

  // =====================================================================
  //  EROI DEL GRUPPO (giocabili): stesso corpo, colori diversi
  // =====================================================================
  const HERO_TOP = [
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
  const HERO_LEGS = [
    [".....ppPpP......", ".....pp..pP.....", ".....pp..pP.....", ".....BB..BB....."],
    [".....ppPpP......", "....pp....pP....", "...pp......pP...", "...BB......BB..."],
    [".....ppPpP......", ".....pp..pP.....", ".....pp..pP.....", ".....BB..BB....."],
    [".....ppPpP......", "......pPpp......", "......pP.pp.....", "......BB.BB....."],
  ];
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => clamp(Math.round(v * k), 0, 255).toString(16).padStart(2, "0"); return "#" + f(n >> 16) + f((n >> 8) & 255) + f(n & 255); };
  function heroSprite(cloth, hair, skin = "#f2c29b") {
    return withLegs(HERO_TOP, HERO_LEGS, {
      h: shade(hair, 0.75), H: hair, k: skin, K: shade(skin, 0.82), e: "#1b1b2a",
      i: shade(cloth, 1.2), j: cloth, J: shade(cloth, 0.68), y: "#d9b44a", b: "#4a321c", p: "#3e4560", P: "#2a2f45", B: "#2a1d16",
    });
  }
  // armi (impugnatura a sinistra, pivot sulla mano)
  const WEAPON = {
    sword: spr(["kk.........", "kkwwwwwwwWW", "kk.g.......", "...g......."], { k: "#f2c29b", w: "#d6dae2", W: "#9aa0ac", g: "#8a6a2a" }),
    axe: spr(["kk......AA.", "kkhhhhhhAAA", "kk......AA.", "........A.."], { k: "#f2c29b", h: "#7a5230", A: "#b9bec8" }),
    bow: spr(["....bb...", "kk...b...", "kkSSSSbAA", "kk...b...", "....bb..."], { k: "#f2c29b", b: "#8a5a2a", S: "#e8e0d0", A: "#c9ccd6" }),
    staff: spr(["kk.......oO", "kkssssssoOo", "kk.......o."], { k: "#f2c29b", s: "#6b4a2a", o: "#7ad0ff", O: "#e6fbff" }),
    gun: spr(["...GGGG.......", "kkgggggggggGGG", "kk.GgggG......", "....GG.G......"], { k: "#f2c29b", g: "#7b8494", G: "#3c4350" }),
    hook: spr(["kk.........", "kkccccccccH", "kk.......HH", "........H.."], { k: "#f2c29b", c: "#9aa0ac", H: "#d6dae2" }),
    dagger: spr(["kk.....", "kkwwwwW", "kk.g..."], { k: "#f2c29b", w: "#e6e9ef", W: "#9aa0ac", g: "#2a4a6a" }),
  };
  const WEAPON_R = {}, WEAPON_L = {};
  for (const [k, im] of Object.entries(WEAPON)) { WEAPON_R[k] = rot32(im, 1, 1); WEAPON_L[k] = rot32(flipV(im), 1, im.height - 2); }

  // =====================================================================
  //  NEMICI: unità del Dire, neutrali, antichi, Roshan (guardano a destra)
  // =====================================================================
  const LEGS2 = (a, b) => [a, b, a, b.map((r) => r)];
  const melee = withLegs([
    "......hh.hh.....",
    ".....hRRRRh.....",
    "....RRrrrrRR....",
    "....RrkkkkrR....",
    "....RkekkekR....",
    ".....RkkkkR.....",
    "...AAAaaaaAAA...",
    "..AaaaqaqaaaA.w.",
    "..sAaaqaqaaAsww.",
    "..s.aaqaqaa.ww..",
    "....aaaaaa..w...",
    "....bbbbbb......",
  ], LEGS2(["....ll..ll......", "....ll..ll......", "...LLL..LLL....."], ["...ll....ll.....", "..ll......ll....", "..LLL.....LLL..."]),
  { h: "#d8d0b8", R: "#4a1616", r: "#7a2424", k: "#1a1014", e: "#ff7a2a", A: "#5a2420", a: "#3e3434", q: "#8a2a2a", s: "#8a6a5a", w: "#c9ccd6", b: "#2a1c12", l: "#3a3030", L: "#1f1818" });
  const ranged = withLegs([
    ".....HHHH.......",
    "....HhhhhH...o..",
    "...HhkkkkhH.oOo.",
    "...HkekkekH..o..",
    "....HkkkkH...|..",
    "...PPppppPP..|..",
    "..PppqqqqppP.|..",
    "..sPppqqppPs.|..",
    "...PppppppP..|..",
    "...PPppppPP..|..",
  ], LEGS2(["...PpppppP......", "....LL.LL.......", "....LL.LL......."], ["...PpppppP......", "...LL...LL......", "...LL...LL......"]),
  { H: "#24142e", h: "#43244f", k: "#120c18", e: "#8aff5a", P: "#24142e", p: "#43244f", q: "#a07a2a", s: "#7a6a5a", o: "#8aff5a", O: "#e8ffd0", "|": "#6b4a2a", L: "#1a1210" });
  const kobold = withLegs([
    "..ee..ee....",
    "..eYYYYe....",
    "..YyykyY..s.",
    "..YyyyyYn.s.",
    "...YmmY...s.",
    "..CccccC..s.",
    ".YCccccCYYs.",
    "..CccccC..s.",
  ], LEGS2(["...C..C.....", "...Y..Y....."], ["..C....C....", "..Y....Y...."]),
  { e: "#8a5a3a", Y: "#7a4e24", y: "#b07a3a", k: "#111", n: "#2a1a1a", m: "#5a2a1a", C: "#4a3a5a", c: "#6a5a7a", s: "#a0a0a8" });
  const wolf = withLegs([
    "................gg..",
    "...............gGGg.",
    "..............gGgkGG",
    "...gggggggggggGGGGGn",
    "..gGGGGGGGGGGGGGgmm.",
    ".gGgGGGGGGGGGGGGg...",
    "gg.gGGGGGGGGGGGg....",
    "g...gGGGGGGGGGg.....",
  ], LEGS2(["....gg.gg...gg.gg...", "....dd.dd...dd.dd..."], ["...gg...gg.gg...gg..", "...dd...dd.dd...dd.."]),
  { g: "#34343f", G: "#585868", k: "#ff4a2a", n: "#111", m: "#e8e0d0", d: "#1c1c22" });
  const centaur = withLegs([
    "..............jjj.......",
    ".............jSSSj......",
    ".............SsesS.aa...",
    "..............SsS.aAAa..",
    "............TTTTTTaAa...",
    "...........TttttttTa....",
    "...........sTtttttTs....",
    "..q........sttttt.......",
    ".qqHHHHHHHHHHtttt.......",
    "..HhhhhhhhhhhhhhhHH.....",
    "..HhhhhhhhhhhhhhhhH.....",
    "..HhhhhhhhhhhhhhhhH.....",
    "...HHHHHHHHHHHHHHH......",
  ], LEGS2(["...ll..ll.....ll..ll....", "...ll..ll.....ll..ll....", "...ff..ff.....ff..ff...."], ["..ll....ll...ll....ll...", "..ll....ll..ll......ll..", "..ff....ff..ff......ff.."]),
  { j: "#2a1a10", S: "#6a3a2a", s: "#9a5a3a", e: "#ffd04a", a: "#c9ccd6", A: "#7a7f8a", T: "#4a2a1a", t: "#7a4a2a", q: "#2a1a10", H: "#5a3a22", h: "#80553a", l: "#5a3a22", f: "#1a1210" });
  const OGRE_TOP = [
    "......SSSSSS........",
    ".....SsllllsS.......",
    ".....SssslsssS......",
    ".....SsesssesS......",
    ".....SssssssSS......",
    "......SmmmmsS...cc..",
    "....TTTTTTTTTT.cCc..",
    "...TtttttttttTTsC...",
    "..TttttttttttttsS...",
    "..TttttttttttttSS...",
    "..TtttttttttttT.....",
    "..TttttttttttTT.....",
    "...TtttttttttT......",
    "....yyyyyyyyy.......",
  ];
  const ogre = withLegs(OGRE_TOP, LEGS2(["....sssss.sss.......", "....sss....sss......", "...ffff....ffff....."], ["...sss.....sss......", "..sss.......sss.....", "..ffff......ffff...."]),
  { S: "#2e5a8a", s: "#4a82b8", l: "#7ab0e0", e: "#ffd23a", m: "#1a1020", T: "#3a6a9a", t: "#5a92c8", y: "#8a5a2a", c: "#8a6a3a", C: "#5a4022", f: "#1a2a3a" });
  // carro d'assedio (2 frame per le ruote)
  const SIEGE_TOP = [
    "..................ss....",
    ".................sSSs...",
    "................bbbbb...",
    "...............bb.......",
    "..............bb........",
    ".............bb.........",
    "..wwwwwwwwwwbbwww.......",
    "..wWWWWWWWWWWWWWw.......",
    "..wWWkWWWWWWkWWWw.......",
    "..wwwwwwwwwwwwwww.......",
  ];
  const siege = anim([["...OO........OO.........", "..OooO......OooO........", "..OooO......OooO........", "...OO........OO........."], ["...OO........OO.........", "..OoOO......OoOO........", "..OOoO......OOoO........", "...OO........OO........."]].map((l) => spr([...SIEGE_TOP, ...l], { s: "#7a7f8a", S: "#a0a4ac", b: "#6b4a2a", w: "#4a3018", W: "#7a5430", k: "#d8d0b8", O: "#2a1c12", o: "#8a6a3a" })).flatMap((f) => [f, f]));
  // golem di roccia: disegnato a "palle" ombreggiate, 2 frame (respiro)
  function golemFrame(b) {
    const [c, x] = mk(26, 28);
    const balls = [[13, 7, 5], [13, 15, 8], [5, 13 + b, 4], [21, 13 + b, 4], [4, 19 + b, 3], [22, 19 + b, 3], [9, 24, 3], [17, 24, 3]];
    const C = ["#3a3c44", "#50535d", "#686c77", "#82868f", "#a0a3ab"];
    for (let j = 0; j < 28; j++) for (let i = 0; i < 26; i++) {
      for (const [bx, by, r] of balls) {
        if (Math.hypot(i - bx, j - by) > r + (hash(i, j, 41) - 0.5) * 0.8) continue;
        const lit = 1 - Math.hypot(i - (bx - r * 0.5), j - (by - r * 0.6)) / (r * 2.1) + (hash(i, j, 42) - 0.5) * 0.25;
        px(x, i, j, hash(i, j, 43) < 0.07 ? "#4a7a3a" : C[clamp(Math.floor(lit * 5), 0, 4)]);
        break;
      }
    }
    px(x, 11, 7, "#7affd8"); px(x, 15, 7, "#7affd8"); // occhi
    return outline(c);
  }
  const golem = anim([golemFrame(0), golemFrame(1), golemFrame(0), golemFrame(-1)]);
  const DRAGON = (up) => spr(up ? [
    "......w.................w.......",
    ".....wW................wW.......",
    "....wWW...............wWW.......",
    "...wWWW..............wWWW.......",
    "..wWWWWW............wWWWWW......",
    ".wWWWWWWW..........wWWWWWW......",
    "wWWWWWWWWWDDDDDDDDWWWWWWW....ddd",
    "...WWWWWDDDDDDDDDDDDWWWW....ddDDd",
    ".....DDDdddddddddddDDDDDDDDDDDked",
    "...DDDddddddddddddddddDDDDDDDDDDd",
    ".tDDddddddddddddddddddDD..DDDmm..",
    "tt.DDDDdddddddddddddDDD....mm....",
    ".....DDDDDDDDDDDDDDDD............",
    "......ll...ll...ll..ll...........",
    "......ff...ff...ff..ff...........",
  ] : [
    "................................",
    "................................",
    "................................",
    "................................",
    "..........DDDDDDDD...........ddd",
    "........DDDDDDDDDDDD........ddDDd",
    ".....DDDdddddddddddDDDDDDDDDDDked",
    "...DDDddddddddddddddddDDDDDDDDDDd",
    ".tDDddWWWWWWWWWWWWddddDD..DDDmm..",
    "tt.DDWWWWWWWWWWWWWWWWDD....mm....",
    "....wWWWWWWWWWWWWWWWWWWw.........",
    "...wWWW.wWWW..wWWW..wWWWw........",
    "..ww....ww....ww.....www.........",
    "......ll...ll...ll..ll...........",
    "......ff...ff...ff..ff...........",
  ], { w: "#4a1a1a", W: "#2a0e14", D: "#1a1018", d: "#3a2430", k: "#ff9a2a", e: "#2a1a10", m: "#f0e0c0", t: "#1a1018", l: "#2a1a20", f: "#0e080c" });
  const dragon = anim([DRAGON(true), DRAGON(true), DRAGON(false), DRAGON(false)]);
  const ROSH_TOP = [
    "........hh..........hh..........",
    ".......hHh..........hHh.........",
    "......hHh....RRRR....hHh........",
    ".......hhRRRRrrrrRRRRhh.........",
    ".........RrrrrrrrrrrrR..........",
    "........RrreerrrreerrrR.........",
    "........RrrrrrrrrrrrrrR.........",
    ".........RrrmMMMMmrrrR..........",
    "......RRRRRrrmmmmrrRRRRR........",
    "....RRrrrrrRRRRRRRRrrrrrRR......",
    "...RrrrrrrrrrccccrrrrrrrrrR.....",
    "..RrrrrRrrrrccccccrrrrRrrrrR....",
    "..RrrrR.RrrrccccccrrrrR.RrrrR...",
    "..Rrrr..RrrrrccccrrrrR...rrrR...",
    "..kkkk..RrrrrrrrrrrrrR...kkkk...",
    "..kKKk...RrrrrrrrrrrR....kKKk...",
    "..........RRRRRRRRRR............",
  ];
  const roshan = withLegs(ROSH_TOP, LEGS2(["..........RRr....rRR............", ".........RRrr....rrRR...........", ".........Kkkk....kkkK..........."], [".........RRr......rRR...........", "........RRrr......rrRR..........", "........Kkkk......kkkK.........."]),
  { h: "#e8dcc0", H: "#a89a7a", R: "#3a2414", r: "#6a4428", e: "#ff3a2a", m: "#1a0c08", M: "#f0e8d8", c: "#b08a5a", k: "#2a1a10", K: "#5a3a20" });

  // =====================================================================
  //  TERRENO grande (mappa intera), radura al centro attorno al fuoco
  // =====================================================================
  function ground(W, H, cx, cy, rx, ry) {
    const [c, x] = mk(W, H);
    const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
    const GG = ["#24451f", "#2b5225", "#33602b", "#3c6f31", "#467d38"].map(hex), DD = ["#4a3a28", "#5a472f", "#6a5536", "#7a633f"].map(hex);
    const img = x.createImageData(W, H), d = img.data;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const n = noise(i / 11, j / 11, 1) * 0.6 + noise(i / 3, j / 3, 2) * 0.3 + hash(i, j, 3) * 0.22;
      const dirt = 1 - Math.hypot((i - cx) / rx, (j - cy) / ry) + (noise(i / 6, j / 6, 4) - 0.5) * 0.45;
      const isDirt = dirt > 0.2 + (hash(i, j, 5) - 0.5) * 0.12;
      const pal = isDirt ? DD : GG, k = clamp(Math.floor(n * pal.length * 0.95), 0, pal.length - 1);
      const o = (j * W + i) * 4; d[o] = pal[k][0]; d[o + 1] = pal[k][1]; d[o + 2] = pal[k][2]; d[o + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    for (let k = 0; k < (W * H) / 55; k++) {
      const i = Math.floor(hash(k, 1, 7) * W), j = Math.floor(hash(k, 2, 7) * H);
      const onDirt = Math.hypot((i - cx) / rx, (j - cy) / ry) < 0.8, r = hash(k, 4, 7);
      if (onDirt) { if (r < 0.4) { px(x, i, j, "#8a7556"); px(x, i + 1, j, "#a08a68"); px(x, i, j + 1, "#3a2c1e"); } }
      else if (r < 0.62) { px(x, i, j, "#55913f"); px(x, i + 1, j - 1, "#68a64c"); px(x, i + 2, j, "#4a8236"); px(x, i + 1, j + 1, "#1d3a1a"); }
      else if (r < 0.69) { px(x, i, j, "#e8e0f0"); px(x, i, j + 1, "#2c4f22"); }
      else if (r < 0.74) { px(x, i, j, "#f0c94a"); px(x, i, j + 1, "#2c4f22"); }
      else if (r < 0.77) { px(x, i, j, "#d9505a"); px(x, i, j + 1, "#2c4f22"); }
      else if (r < 0.79) { px(x, i, j, "#7a9ae8"); px(x, i, j + 1, "#2c4f22"); }
    }
    return c;
  }

  // =====================================================================
  //  RISORSE: alberi (latifoglie e pini), rocce, ceppi, macerie
  // =====================================================================
  function tree(seed) {
    const W = 30, H = 36, [c, x] = mk(W, H);
    for (let j = 24; j < 34; j++) for (let i = 12; i < 18; i++) px(x, i, j, i < 14 ? "#6b4526" : i < 16 ? "#553620" : "#3d2616");
    px(x, 11, 33, "#3d2616"); px(x, 18, 33, "#3d2616");
    const blobs = [[15, 13, 11], [8, 17, 7], [22, 17, 7], [15, 7, 7], [11, 22, 6], [19, 22, 6]];
    const C = ["#173d1e", "#1f4f25", "#2a6630", "#367c39", "#4b9446", "#66ad55"];
    for (let j = 0; j < 30; j++) for (let i = 0; i < W; i++) {
      if (!blobs.some(([bx, by, r]) => Math.hypot(i - bx, j - by) < r + (hash(i, j, seed) - 0.5) * 1.4)) continue;
      const lit = 1 - Math.hypot(i - 9, j - 6) / 24 + (noise(i / 3, j / 3, seed) - 0.5) * 0.5;
      px(x, i, j, C[clamp(Math.floor(lit * C.length), 0, C.length - 1)]);
    }
    if (seed % 3 === 0) for (const [i, j] of [[9, 12], [19, 9], [14, 18], [22, 15]]) px(x, i, j, "#d9505a"); // frutti
    return outline(c);
  }
  function pine(seed) {
    const W = 22, H = 38, [c, x] = mk(W, H);
    for (let j = 30; j < 37; j++) for (let i = 9; i < 13; i++) px(x, i, j, i < 10 ? "#6b4526" : i < 12 ? "#553620" : "#3d2616");
    const C = ["#0f3322", "#174630", "#1f5a3a", "#2a6e46", "#3a8754"];
    for (let tier = 0; tier < 4; tier++) {
      const top = 2 + tier * 7, half = 3 + tier * 2.4;
      for (let j = top; j < top + 11; j++) {
        const w = ((j - top) / 11) * half * 2 + 1;
        for (let i = 0; i < W; i++) {
          if (Math.abs(i - 10.5) > w / 2 + (hash(i, j, seed) - 0.5)) continue;
          const lit = 1 - (i - 4) / 18 - (j - top) / 22 + (hash(i, j, seed + 5) - 0.5) * 0.35;
          px(x, i, j, C[clamp(Math.floor(lit * 5), 0, 4)]);
        }
      }
    }
    return outline(c);
  }
  function rock(seed, big) {
    const W = big ? 20 : 15, H = big ? 15 : 11, [c, x] = mk(W, H);
    const C = ["#3e4049", "#51545f", "#676b77", "#80848f", "#9da1aa"];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      if (Math.hypot((i - W / 2 + 0.5) / (W / 2 - 0.3), (j - H * 0.55) / (H * 0.47)) > 1 + (hash(i, j, seed) - 0.5) * 0.15) continue;
      const lit = 1 - Math.hypot(i - W * 0.3, j - 2) / (W * 0.8) + (hash(i, j, seed + 9) - 0.5) * 0.3;
      px(x, i, j, C[clamp(Math.floor(lit * 5), 0, 4)]);
    }
    for (let k = 0; k < 3; k++) px(x, Math.floor(W * 0.45) + k, Math.floor(H * 0.5) + (k > 1 ? 1 : 0), "#3e4049");
    if (big) for (const [i, j] of [[5, 5], [12, 4], [8, 9]]) { px(x, i, j, "#c8e0ff"); } // venature (pietra buona)
    return outline(c);
  }
  const stump = spr(["..wwww..", ".wWWWWw.", ".wWrrWw.", ".bwwwwb.", "bb....bb"], { w: "#8a5a2c", W: "#b07a40", r: "#6b4422", b: "#4a2e14" });
  const rubble = spr(["..ss....", ".sSss.s.", "sSss.sSs"], { s: "#51545f", S: "#80848f" });
  function bush(seed) {
    const [c, x] = mk(14, 10), C = ["#1d4422", "#2a5c2c", "#3b7638", "#55924a"];
    for (let j = 0; j < 10; j++) for (let i = 0; i < 14; i++) {
      if (Math.hypot((i - 7) / 7, (j - 5.5) / 4.6) > 1 + (hash(i, j, seed) - 0.5) * 0.3) continue;
      const lit = 1 - Math.hypot(i - 4, j - 2) / 11 + (hash(i, j, seed + 3) - 0.5) * 0.4;
      px(x, i, j, C[clamp(Math.floor(lit * 4), 0, 3)]);
    }
    if (seed % 2) { px(x, 4, 3, "#d9505a"); px(x, 9, 5, "#d9505a"); }
    return outline(c);
  }

  // =====================================================================
  //  ACCAMPAMENTO: cerchio di pietre, tronchi, fiamme animate
  // =====================================================================
  function campBase() {
    const [c, x] = mk(30, 18);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) { // pietre in cerchio
      const sx = Math.round(15 + Math.cos(a) * 12), sy = Math.round(10 + Math.sin(a) * 6);
      for (const [i, j, col] of [[0, 0, "#9da1aa"], [1, 0, "#80848f"], [0, 1, "#676b77"], [1, 1, "#51545f"], [2, 1, "#3e4049"]]) px(x, sx + i - 1, sy + j - 1, col);
    }
    const log = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) { const X = Math.round(x0 + ((x1 - x0) * k) / n), Y = Math.round(y0 + ((y1 - y0) * k) / n); px(x, X, Y, "#b07a40"); px(x, X, Y + 1, "#6b4422"); px(x, X, Y + 2, "#3d2616"); } };
    log(7, 11, 23, 7); log(8, 7, 22, 12); log(11, 13, 19, 5);
    for (let i = 12; i < 19; i++) for (let j = 8; j < 11; j++) px(x, i, j, hash(i, j, 61) < 0.5 ? "#2a1810" : "#5a2a10"); // braci
    return outline(c);
  }
  function flame(f) {
    const [c, x] = mk(14, 18);
    for (let j = 0; j < 18; j++) for (let i = 0; i < 14; i++) {
      const cx = 7 + Math.sin(j * 0.6 + f * 1.7) * (1 - j / 18) * 1.6;
      const w = (j / 18) ** 0.8 * 6.4 * (0.75 + noise(i / 2, j / 3 + f * 2.3, 71) * 0.5);
      const d = Math.abs(i - cx);
      if (d > w) continue;
      const heat = 1 - d / (w + 0.01) * 0.6 - (1 - j / 18) * 0.7 + (hash(i, j, f + 72) - 0.5) * 0.2;
      px(x, i, j, heat > 0.75 ? "#fff6c8" : heat > 0.5 ? "#ffd24a" : heat > 0.25 ? "#ff8a2a" : "#d8402a");
    }
    return c;
  }
  const camp = { base: campBase(), flames: [0, 1, 2, 3, 4, 5].map(flame) };

  // =====================================================================
  //  COSTRUZIONI (più basse e piccole di prima)
  // =====================================================================
  function fence(dmg) {
    const [c, x] = mk(16, 12);
    for (const p of [1, 7, 13]) for (let j = 0; j < 12; j++) { if (j === 0 && p !== 7) continue; px(x, p, j, j < 2 ? "#d6a466" : "#94612f"); px(x, p + 1, j, j < 2 ? "#b07c43" : "#6e4622"); }
    for (const r of [4, 8]) for (let i = 0; i < 16; i++) { if ([1, 2, 7, 8, 13, 14].includes(i)) continue; px(x, i, r, "#a8723a"); px(x, i, r + 1, "#5a3818"); }
    if (dmg) { px(x, 4, 4, "#1a1214"); px(x, 5, 5, "#1a1214"); px(x, 10, 8, "#1a1214"); }
    return outline(c);
  }
  function stoneWall(dmg) {
    const [c, x] = mk(16, 12);
    for (let j = 0; j < 12; j++) for (let i = 0; i < 16; i++) {
      let col;
      if (j < 3) col = hash(i, j, 12) < 0.3 ? "#b9bcc4" : "#a6a9b2";
      else { const row = Math.floor((j - 3) / 3), bi = (i + (row % 2 ? 4 : 0)) % 8, mortar = (j - 3) % 3 === 2 || bi === 7; col = mortar ? "#4a4c55" : bi === 0 ? "#9a9da7" : hash(i, j, 13) < 0.25 ? "#7c7f89" : "#888b95"; }
      if (j === 11) col = "#3a3c44";
      px(x, i, j, col);
    }
    if (dmg) { let i = 6; for (let j = 3; j < 11; j++) { px(x, i, j, "#1a1214"); i += hash(i, j, 9) < 0.5 ? -1 : 1; } }
    return outline(c);
  }
  const spikes = spr([".s...s...s...", "sSs.sSs.sSs..", "wSw.wSw.wSw.s", "www.www.wwwsS", "bbbbbbbbbbbww"], { s: "#e8e0d0", S: "#b0a890", w: "#8a5a2c", b: "#4a2e14" });
  function tower(kind) {
    const [c, x] = mk(18, 30);
    const wood = kind === "arrow";
    for (let j = 10; j < 30; j++) for (let i = 2; i < 16; i++) {
      let col;
      if (wood) { const e = i % 4; col = e === 0 ? "#b07c43" : e === 3 ? "#5a3818" : "#94612f"; if ((j - 10) % 6 === 0) col = "#6e4622"; }
      else { const row = Math.floor(j / 3), bi = (i + (row % 2 ? 2 : 0)) % 5; col = j % 3 === 2 || bi === 4 ? "#3e3a4a" : bi === 0 ? "#8a8296" : "#6a6478"; }
      if (i === 2) col = wood ? "#c08a4e" : "#9a92a6"; if (i === 15) col = wood ? "#4a2e14" : "#3a3446";
      px(x, i, j, col);
    }
    // tetto / cima
    for (let j = 0; j < 10; j++) for (let i = 0; i < 18; i++) {
      if (wood) { if (Math.abs(i - 8.5) > j * 0.95 + 0.5) continue; px(x, i, j, j > 8 ? "#4a1e14" : (i + j) % 3 ? "#8a2e1e" : "#a8402a"); }
      else { if (j < 5 && Math.abs(i - 8.5) > 2.5) continue; if (j >= 5 && (i < 1 || i > 16)) continue; px(x, i, j, j < 5 ? (j < 2 ? "#e6fbff" : "#7ad0ff") : j === 5 ? "#9a92a6" : (i % 3 ? "#6a6478" : "#3e3a4a")); }
    }
    if (wood) for (let i = 5; i < 13; i++) px(x, i, 14, "#2a1a10"); // feritoia
    return outline(c);
  }

  // icone (risorse)
  const icons = {
    wood: spr(["...ww..", "..wWWw.", ".wWrWw.", "wWWWw..", ".ww...."], { w: "#6b4422", W: "#b07a40", r: "#8a5a2c" }),
    stone: spr([".ss...", "sSSs..", "sSsss.", ".ssss."], { s: "#676b77", S: "#a0a4ac" }),
    gold: spr([".yy..", "yYYy.", "yYyy.", ".yy.."], { y: "#d9a020", Y: "#ffe27a" }),
  };

  window.ART = {
    mk, hash, outline, flip, whiteOf, rotPix, rot32,
    heroSprite, WEAPON, WEAPON_R, WEAPON_L,
    units: { melee, ranged, kobold, wolf, centaur, ogre, siege, golem, dragon, roshan },
    ground, tree, pine, rock, stump, rubble, bush,
    camp, fence: [fence(false), fence(true)], stoneWall: [stoneWall(false), stoneWall(true)], spikes,
    towerArrow: tower("arrow"), towerMage: tower("mage"), icons,
  };
})();
