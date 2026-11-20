// =====================================================================
//  GAME 2 — 守护遗迹 (vista di profilo, stile "piante contro zombie" in salsa Dota)
//  A sinistra l'Antico del Radiant sulla collina. Da destra arrivano le ondate
//  del Dire. Giochi come 大金神 (Windranger), evochi creep del Radiant
//  (3 livelli), compri oggetti e chiami dal cielo 大B神 / Yoki大神 / 蜗牛大神.
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
  const FACE = { hero_windrunner: 1, hero_phantom_assassin: -1, hero_earthshaker: 1, hero_invoker: 1, rmelee: -1, rranged: -1, rmegam: -1, rmegar: -1,
    dmelee: -1, dranged: -1, siege: 1, kobold: -1, wolf: -1, centaur: -1, ogre: -1, golem: 1, dragon: -1, roshan: -1, tower: 1 };
  const VER = "4"; const SET = {};
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
    windranger: { name: "风行者", look: "hero_windrunner", ranged: true, proj: "arrow", hp: 780, dmg: 38, rate: 1.4, range: 110, arm: 2, spd: 62,
      sk: [["windrunner_shackleshot", "束缚击", 10, "击晕最近的两个敌人"], ["windrunner_powershot", "强力击", 9, "向前穿透一排敌人"], ["windrunner_windrun", "风行", 14, "加速并闪避80%伤害"], ["windrunner_focusfire", "集中火力", 40, "8秒攻速×3（6级）"]] },
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
    roshan: { name: "肉山", hp: 5200, dmg: 130, arm: 8, rate: 0.6, range: 24, spd: 18, gold: 600, boss: true },
  };
  // creep del Radiant evocabili (per livello della caserma)
  const ALLY = {
    melee: { name: "近战兵", cost: 45, hp: 380, dmg: 20, arm: 2, rate: 1, range: 14, spd: 32 },
    ranged: { name: "远程兵", cost: 55, hp: 210, dmg: 24, arm: 0, rate: 0.9, range: 92, spd: 32, proj: "magic" },
  };
  const LV = [{ hp: 1, dmg: 1, arm: 0, name: "" }, { hp: 1.7, dmg: 1.6, arm: 3, name: "超级" }, { hp: 2.8, dmg: 2.5, arm: 6, name: "超级巨型" }];
  const BARRACKS_COST = [0, 400, 1200];
  const allySet = (kind) => (S.barracks >= 2 ? SET[kind === "melee" ? "rmegam" : "rmegar"] : SET[kind === "melee" ? "rmelee" : "rranged"]);
  // i giocatori del sito scendono dal cielo per qualche secondo
  const HELP = {
    bshen: { name: "大B神", hero: "幻影刺客", look: "hero_phantom_assassin", col: "#f9a8d4", key: "3", cost: 90, cd: 20, life: 12, hp: 750, dmg: 46, rate: 1.6, range: 18, spd: 80, arm: 4, aggro: 420, blink: true, crit: 0.35, critMul: 3.5,
      desc: "闪烁到敌人身边，疯狂暴击", hi: "奶瓶放下，开刀！", lines: ["恩赐解脱！", "宝宝别哭，叔叔砍完就回来", "暴击！看到没", "一刀一个", "奶瓶在手，暴击我有"], bye: "喂奶时间到了，先撤" },
    yoki: { name: "Yoki大神", hero: "撼地者", look: "hero_earthshaker", col: "#fcd34d", key: "4", cost: 280, cd: 45, life: 9, hp: 1600, dmg: 70, rate: 0.8, range: 22, spd: 40, arm: 7, aggro: 160,
      desc: "大吼着砸下来，直接回音击", hi: "啊啊啊啊啊——！！！", lines: ["看我至宝！", "至宝特效懂不懂", "这就是至宝的力量", "跳刀回音，一波五个"], bye: "至宝展示完毕，收工" },
    snail: { name: "蜗牛大神", hero: "祈求者", look: "hero_invoker", col: "#93c5fd", key: "5", cost: 600, cd: 75, life: 16, hp: 1300, dmg: 55, rate: 1.1, range: 110, spd: 45, arm: 5, proj: "magic", aggro: 260,
      desc: "落地：熔炉精灵+超震声波+灵动迅捷，然后飓风、陨石、天火、冰墙轮流轰炸", hi: "飓风陨石天火冰墙，一套带走", lines: ["干干干！", "今晚通宵！", "这把我来带", "飓风接陨石，懂？"], bye: "我先下了，明天还要上班……" },
  };
  const TOWER = { name: "一塔", hp: 3000, dmg: 110, arm: 14, rate: 0.9, range: 128, spd: 0, proj: "tower", tower: true, aggro: 128 };
  const FORGE = { name: "熔炉精灵", hp: 320, dmg: 34, arm: 0, rate: 1, range: 96, spd: 40, proj: "fire" };
  const INVOKE = [["invoker_forge_spirit", "熔炉精灵"], ["invoker_deafening_blast", "超震声波"], ["invoker_alacrity", "灵动迅捷"], ["invoker_tornado", "强袭飓风"], ["invoker_chaos_meteor", "混沌陨石"], ["invoker_sun_strike", "天火·灾难"], ["invoker_ice_wall", "寒冰之墙"]];
  // negozio come in Dota 2: componenti base + oggetti assemblati (parts + ricetta)
  const ITEMS = {
    boots: { name: "速度之靴", cost: 100, desc: "移速+25%", ms: 0.25 },
    blades_of_attack: { name: "攻击之爪", cost: 150, desc: "攻击力+12", dmg: 12 },
    ring_of_regen: { name: "回复戒指", cost: 175, desc: "每秒回血5", hpReg: 5 },
    chainmail: { name: "锁子甲", cost: 180, desc: "护甲+5", arm: 5 },
    gloves: { name: "加速手套", cost: 200, desc: "攻速+20%", as: 0.2 },
    headdress: { name: "恢复头巾", cost: 220, desc: "光环：友军每秒回血3", aura: { hpr: 3 } },
    vitality_booster: { name: "活力之球", cost: 300, desc: "生命+250", hp: 250 },
    javelin: { name: "标枪", cost: 450, desc: "攻击+10，20%几率额外40伤害", dmg: 10, jav: true },
    mithril_hammer: { name: "秘银锤", cost: 500, desc: "攻击力+24", dmg: 24 },
    ogre_axe: { name: "食人魔之斧", cost: 500, desc: "生命+200", hp: 200 },
    hyperstone: { name: "振奋宝石", cost: 900, desc: "攻速+45%", as: 0.45 },
    demon_edge: { name: "恶魔刀锋", cost: 1100, desc: "攻击力+40", dmg: 40 },
    reaver: { name: "掠夺者之斧", cost: 1100, desc: "生命+350", hp: 350 },
    relic: { name: "圣者遗物", cost: 1400, desc: "攻击力+50", dmg: 50 },
    // assemblati
    power_treads: { name: "动力鞋", parts: ["boots", "gloves"], rc: 150, desc: "移速+25%、攻速+35%", ms: 0.25, as: 0.35 },
    mekansm: { name: "梅肯斯姆", parts: ["headdress", "chainmail"], rc: 250, desc: "光环回血+护甲；每20秒自动治疗全体友军、小兵和塔250", aura: { hpr: 3, arm: 2 }, mek: 250, mekCd: 20 },
    guardian_greaves: { name: "卫士胫甲", parts: ["mekansm", "boots"], rc: 450, desc: "移速+25%；更强光环；每16秒治疗全体400", ms: 0.25, aura: { hpr: 6, arm: 4 }, mek: 400, mekCd: 16 },
    vladmir: { name: "祭品", parts: ["headdress", "blades_of_attack"], rc: 300, desc: "光环：友军攻击+20%、吸血15%", aura: { dmgp: 0.2, ls: 0.15, hpr: 3 } },
    maelstrom: { name: "漩涡", parts: ["javelin", "mithril_hammer"], rc: 200, desc: "攻击+34，25%几率闪电链弹4个敌人", dmg: 34, chain: 0.25 },
    desolator: { name: "黯灭", parts: ["mithril_hammer", "mithril_hammer"], rc: 300, desc: "攻击力+55，攻击降低敌人6点护甲", dmg: 55, deso: true },
    black_king_bar: { name: "黑皇杖", parts: ["ogre_axe", "mithril_hammer"], rc: 500, desc: "生命+200、攻击+24，免疫眩晕和减速", hp: 200, dmg: 24, bkb: true },
    assault: { name: "强袭胸甲", parts: ["hyperstone", "chainmail"], rc: 600, desc: "攻速+45%、护甲+10；光环：友军护甲+5、攻速+20%", as: 0.45, arm: 10, aura: { arm: 5, as: 0.2 } },
    greater_crit: { name: "代达罗斯之殇", parts: ["demon_edge", "blades_of_attack"], rc: 400, desc: "攻击+60，30%几率2.25倍暴击", dmg: 60, crit: 0.3 },
    monkey_king_bar: { name: "金箍棒", parts: ["demon_edge", "javelin"], rc: 300, desc: "攻击+55，35%几率额外70伤害", dmg: 55, mkb: true },
    heart: { name: "恐鳌之心", parts: ["reaver", "vitality_booster"], rc: 400, desc: "生命+700，每秒回复2%", hp: 700, regen: 0.02 },
    radiance: { name: "辉耀", parts: ["relic"], rc: 900, desc: "攻击+60，灼烧周围敌人每秒50", dmg: 60, burn: 50 },
  };
  // prezzo totale (ricorsivo) e quanto manca considerando ciò che hai già
  const fullCost = (k) => { const it = ITEMS[k]; return it.parts ? it.rc + it.parts.reduce((t, p) => t + fullCost(p), 0) : it.cost; };
  function planBuy(k, inv) { // ritorna { cost, use: [indici consumati] }
    const it = ITEMS[k]; if (!it.parts) return { cost: it.cost, use: [] };
    let cost = it.rc; const use = [];
    for (const p of it.parts) {
      const idx = inv.findIndex((x, i) => x === p && !use.includes(i));
      if (idx >= 0) use.push(idx); else { const sub = planBuy(p, inv.map((x, i) => (use.includes(i) ? null : x))); cost += sub.cost; use.push(...sub.use); }
    }
    return { cost, use };
  }
  for (const k in ITEMS) ITEMS[k].cost = ITEMS[k].cost || fullCost(k);
  const has = (k) => S.items.includes(k), itemSum = (f) => S.items.reduce((t, k) => t + (ITEMS[k][f] || 0), 0);


  // =====================================================================
  //  SUONI (sintetizzati con Web Audio, nessun file esterno)
  // =====================================================================
  const SFX = (() => {
    let ac = null, master = null, nbuf = null, muted = false; const last = {};
    try { muted = localStorage.getItem("g2:mute") === "1"; } catch {}
    function init() {
      if (ac) { if (ac.state === "suspended") ac.resume(); return; }
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.gain.value = 0.32; master.connect(ac.destination);
        nbuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } catch { ac = null; }
    }
    function tone(f, dur, type = "square", vol = 0.2, slide = 0, delay = 0) {
      const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
    }
    function noise(dur, vol = 0.2, freq = 1000, type = "bandpass", q = 1, sweep = 0, delay = 0) {
      const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(); s.buffer = nbuf;
      f.type = type; f.frequency.setValueAtTime(freq, t); if (sweep) f.frequency.exponentialRampToValueAtTime(freq * sweep, t + dur); f.Q.value = q;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    }
    const arp = (fs, step, type = "triangle", vol = 0.15, dur = 0.18) => fs.forEach((f, i) => tone(f, dur, type, vol, 0, i * step));
    const P = {
      arrow: () => { noise(0.08, 0.12, 3500, "highpass"); tone(1100, 0.05, "triangle", 0.04, 0.6); },
      hit: () => noise(0.07, 0.14, 380, "lowpass"),
      die: () => { tone(200, 0.16, "square", 0.06, 0.45); noise(0.12, 0.08, 600, "lowpass"); },
      gold: () => { tone(1318, 0.06, "square", 0.05); tone(1976, 0.12, "square", 0.05, 0, 0.05); },
      rank: () => arp([523, 659, 784, 1046, 1318], 0.08, "triangle", 0.16, 0.25),
      wave: () => { tone(196, 0.7, "sawtooth", 0.09); tone(147, 0.7, "sawtooth", 0.08); tone(294, 0.5, "sawtooth", 0.05, 0, 0.35); },
      roshan: () => { tone(110, 1.1, "sawtooth", 0.22, 0.45); noise(1.0, 0.25, 280, "lowpass"); },
      echo: () => { tone(70, 1.0, "sine", 0.55, 0.35); noise(0.9, 0.45, 220, "lowpass"); tone(140, 0.5, "square", 0.08, 0.4, 0.15); },
      meteorFall: () => { noise(0.5, 0.25, 2000, "bandpass", 1, 0.2); tone(500, 0.5, "sawtooth", 0.05, 0.2); },
      meteor: () => { tone(60, 1.2, "sine", 0.5, 0.5); noise(1.6, 0.35, 450, "lowpass", 1, 0.4); },
      sunCharge: () => tone(300, 0.7, "triangle", 0.08, 3),
      sun: () => { noise(0.35, 0.3, 900, "lowpass"); tone(130, 0.3, "sine", 0.3, 0.5); tone(1800, 0.15, "sine", 0.06, 0.5); },
      cyclone: () => { noise(1.4, 0.3, 500, "bandpass", 4, 4); noise(1.4, 0.15, 1500, "bandpass", 6, 0.5); },
      blast: () => { tone(220, 0.45, "sawtooth", 0.1, 5); tone(330, 0.45, "sawtooth", 0.08, 5); noise(0.45, 0.2, 800, "bandpass", 2, 4); },
      tp: () => { tone(330, 1.6, "sine", 0.1, 3); tone(495, 1.6, "triangle", 0.06, 3); noise(1.6, 0.05, 3000, "bandpass", 8, 1.5); },
      tpEnd: () => { arp([1046, 1568], 0.06, "sine", 0.12, 0.3); noise(0.25, 0.12, 2500, "highpass"); },
      drop: () => noise(0.7, 0.18, 400, "bandpass", 2, 6),
      land: () => { tone(80, 0.35, "sine", 0.4, 0.5); noise(0.3, 0.3, 300, "lowpass"); },
      crit: () => { noise(0.14, 0.28, 2600, "highpass"); tone(1600, 0.14, "sawtooth", 0.07, 0.3); },
      tower: () => tone(880, 0.13, "square", 0.05, 0.45),
      heal: () => arp([784, 988, 1175, 1568], 0.07, "sine", 0.12, 0.3),
      buy: () => { tone(1318, 0.06, "square", 0.06); tone(1760, 0.14, "square", 0.06, 0, 0.06); },
      craft: () => arp([659, 880, 1046, 1318], 0.06, "square", 0.07, 0.2),
      summon: () => { tone(660, 0.08, "square", 0.06); tone(990, 0.12, "square", 0.06, 0, 0.07); },
      shackle: () => { tone(420, 0.25, "square", 0.08, 0.6); noise(0.2, 0.12, 1200, "bandpass", 3); },
      powershot: () => { noise(0.45, 0.3, 2500, "bandpass", 2, 0.25); tone(900, 0.4, "sawtooth", 0.06, 0.3); },
      windrun: () => noise(0.6, 0.22, 700, "bandpass", 2, 3),
      focus: () => arp([660, 880, 1100], 0.05, "square", 0.08, 0.15),
      heroDie: () => { tone(392, 0.6, "triangle", 0.18, 0.5); tone(311, 0.7, "triangle", 0.14, 0.5, 0.18); },
      totem: () => { tone(65, 0.4, "sine", 0.5, 0.5); noise(0.35, 0.4, 260, "lowpass"); },
      ancient: () => tone(160, 0.12, "sine", 0.12, 0.7),
      sc: () => arp([1046, 1318, 1568], 0.06, "sine", 0.08, 0.25),
      win: () => arp([523, 659, 784, 1046, 784, 1046, 1318], 0.13, "square", 0.12, 0.3),
      lose: () => arp([392, 349, 311, 262, 196], 0.22, "triangle", 0.16, 0.45),
      upgrade: () => arp([392, 523, 659, 784, 1046], 0.07, "square", 0.08, 0.2),
    };
    const GAP = { hit: 0.06, arrow: 0.05, die: 0.05, gold: 0.08, tower: 0.08, sun: 0.07, ancient: 0.35, crit: 0.1 };
    function play(k) { if (muted || !ac || !P[k]) return; const now = ac.currentTime; if (last[k] && now - last[k] < (GAP[k] || 0.03)) return; last[k] = now; try { P[k](); } catch {} }
    return { init, play, toggle() { muted = !muted; try { localStorage.setItem("g2:mute", muted ? "1" : "0"); } catch {} if (!muted) init(); return muted; }, get muted() { return muted; } };
  })();
  const sfx = (k) => SFX.play(k);
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
  const PDS = ["大P神：小金金，守住基地", "大P神：这波再送就锤你", "大P神：小金金，别吹了，好好打", "大P神：笑死我了，又来一波"];

  // =====================================================================
  //  STATO
  // =====================================================================
  let S, HD;
  // difficoltà: 负冲统帅 (facile) · 冲击万古 (normale) · 冲击超凡 (difficile)
  const DIFF = {
    easy: { name: "负冲统帅", tier: 4, hp: 0.7, dmg: 0.75, gold: 1.2, budget: 0.8, desc: "最简单 · 适合大金神的真实水平",
      winT: "负冲成功！欢迎大金神回到统帅老家", winS: ["大P神：小金金，统帅才是你的家，别出去乱跑了", "大金神：这把不算，统帅局的队友太菜带不动", "蜗牛大神：负冲也是一种实力（棒读）"],
      chat: [[0, "统帅守住了哈哈哈哈"], ["大P神", "小金金，统帅才是你的家"], [0, "负冲成功！"], [0, "这难度我奶奶都能过"], ["Ping大神", "理论上统帅不该这么难"], [0, "主播：这把不算"]] },
    normal: { name: "冲击万古", tier: 6, hp: 1, dmg: 1, gold: 1, budget: 1, desc: "正常难度",
      winT: "恭喜大金神达到万古！", winS: ["大金神：万古只是开始，超凡指日可待", "大P神：小金金，这次没送，奖励一锤", "金神大腿：这分有我一半"],
      chat: [[0, "万古！！！"], [0, "恭喜金神上万古"], ["大P神", "万古一日游？"], ["Ping大神", "万古一日游，懂的都懂"], [0, "截图发群里了"], ["蜗牛大神", "可以，有点东西"]] },
    hard: { name: "冲击超凡", tier: 7, hp: 1.25, dmg: 1.15, gold: 0.9, budget: 1.15, desc: "最难 · 嘴巴超凡的终极考验",
      winT: "恭喜大金神达到超凡！", winS: ["大金神：我早就说了我是超凡水平", "大P神：小金金……这次真的服了", "蜗牛大神：中路我还是虐过你"],
      chat: [[0, "超凡！！！真的超凡了！"], [0, "嘴巴超凡变成真超凡了"], ["大P神", "小金金……这次真的服了"], [0, "名场面！"], ["Yoki大神", "比我至宝还亮"], [0, "金神yyds"]] },
  };
  function reset(heroKey, dk = "normal") {
    HD = HEROES[heroKey];
    S = {
      t: 0, gold: 260, inc: 0, diff: DIFF[dk], diffKey: dk, won: false, wave: 0, nextWave: 12, queue: [], kills: 0, over: false, barracks: 0, helpCd: { bshen: 0, yoki: 0, snail: 0 }, later: [], alac: 0,
      ancient: { hp: 5000, max: 5000, arm: 12, flash: 0 },
      hero: makeUnit("hero", { ...HD, look: HD.look }, 130, 4), units: [], proj: [], parts: [], texts: [], fx: [], items: [], empower: 0,
    };
    const h = S.hero; h.mmr = 3150; h.lvl = 2; h.xp = 0; h.cds = [0, 0, 0, 0]; h.buffs = {}; h.respawn = 0; h.mx = 0;
    S.towerLv = 1; S.towerXp = 0; S.mekT = 5; spawnTower();
    viewers = 480000 + Math.floor(Math.random() * 60000); chatT = 1;
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
      if (k === "spd") v = v * (u.buffs.windrun > 0 ? 1.6 : 1) * (1 + itemSum("ms"));
    }
    if (u.team !== "enemy") {
      if (k === "dmg") v *= 1 + (au.dmgp || 0) + (S.empower > 0 ? 0.3 : 0);
      if (k === "rate") v *= 1 + (au.as || 0);
      if (k === "arm") v += au.arm || 0;
      if (k === "spd") v *= 1 + (au.ms || 0);
      if (k === "rate" && S.alac > 0) v *= 1.35;
      if (k === "dmg" && S.alac > 0) v += 15;
    } else {
      if (k === "arm" && u.armDown > 0) v -= 6;
      if (k === "rate" && has("shivas_guard")) v *= 0.75;
    }
    if (k === "spd" && u.slow > 0 && !(u.team === "hero" && has("black_king_bar"))) v *= 0.55;
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
    if (u.team === "hero" && has("butterfly") && !opts.pure && Math.random() < 0.35) { text(u.x, feetY(u) - 40, "闪避", "#9ad8ff"); return 0; }
    if (u.drop > 0 || u.tp > 0) return 0;
    const dr = u.team !== "enemy" ? auras().dr || 0 : 0;
    const real = Math.max(1, Math.round(dmg * (1 - dr) * (opts.pure ? 1 : armorMul(stat(u, "arm")))));
    u.hp -= real; u.flash = 0.08; sfx("hit"); u.hitT = S.t; u.hitDir = from ? (Math.sign(u.x - from.x) || 1) : (u.team === "enemy" ? 1 : -1);
    if (opts.show !== false && (u.team === "enemy" ? real >= 40 : u.team === "hero")) text(u.x, feetY(u) - (u.d.boss ? 70 : 38), "-" + real, u.team === "enemy" ? "#ffd06a" : "#ff6a5a", opts.crit);
    burst(u.x, feetY(u) - 14, u.team === "enemy" && (u.type === "golem") ? ["#8a8f99"] : ["#9a1414", "#c02424"], 3, 40);
    // lifesteal (祭品)
    const ls = from && from.team !== "enemy" && !opts.noLs ? (auras().ls || 0) + (from.team === "hero" ? itemSum("ls") : 0) : 0;
    if (ls && from.hp > 0) from.hp = Math.min(from.max, from.hp + real * ls);
    // spirale di Axe: quando lo colpiscono
    if (u.team === "hero" && u.hp < u.max * 0.3 && !u.saidHurt) { u.saidHurt = 1; say(u, pick(JIN.hurt)); }
    if (u.hp <= 0) kill(u, from);
    return real;
  }
  function kill(u, from) {
    if (u.team === "hero") {
      u.respawn = 8; u.hp = 0; u.mmr = Math.max(0, u.mmr - 50); say(u, pick(JIN.die), 3); react("die"); sfx("heroDie"); banner("大金神阵亡 · -50 MMR", "8秒后复活 · " + pick(JIN.die));
      return;
    }
    if (u.towerU) { react("tower"); banner("一塔被推了！", "大P神：小金金，塔都守不住？"); S.shake = 6; burst(u.x, feetY(u) - 40, ["#e6fff0", "#9ae8ff", "#8a8f99"], 30, 90); }
    if (u.helper && HELP[u.helper]) { say(u, "我先挂了……", 2); text(u.x, feetY(u) - 50, HELP[u.helper].name + "阵亡", "#ff9a9a", true); }
    u.dead = 0.9; u.deadDir = u.hitDir || (u.team === "enemy" ? 1 : -1);
    burst(u.x, feetY(u) - 4, ["#8a7a62", "#b8a888", "#5a4a3a"], u.d.boss ? 18 : 8, 30, 60);
    if (u.team === "enemy") {
      const tw = towerUnit(); if (tw && S.towerLv < 3 && Math.abs(u.x - tw.x) < 190) S.towerXp += u.d.gold * (from === tw ? 2 : 1);
      S.gold += u.d.gold; S.kills++; sfx("die"); sfx("gold"); if (S.kills % 30 === 0) react("streak", { k: S.kills }); text(u.x, feetY(u) - 30, "+" + u.d.gold + "金", "#fde047");
      burst(u.x, feetY(u) - 10, ["#fde047", "#ffb03a"], 4, 40);
      gainXp(u.d.gold * 2);
      if (u.d.boss) { react("roshanDie"); banner("击杀肉山！", "+600金 · 大P神：小金金这次没送"); S.ancient.hp = Math.min(S.ancient.max, S.ancient.hp + 1500); }
      if (from && from.team === "hero" && Math.random() < 0.12) say(from, pick(JIN.kill));
    }
  }
  // progressione in MMR (come la classificata di Dota 2): ogni 100 MMR = un "livello" di statistiche
  const RANKS = [["先锋", 0], ["卫士", 770], ["中军", 1540], ["统帅", 2310], ["传奇", 3080], ["万古流芳", 3850], ["超凡入圣", 4620], ["冠绝一世", 5420]];
  function rankOf(m) { let t = 0; RANKS.forEach((r, i) => { if (m >= r[1]) t = i; }); const star = t >= 7 ? 0 : Math.min(5, Math.floor((m - RANKS[t][1]) / 154) + 1); return { tier: t + 1, star, name: RANKS[t][0] + (star ? star : "") }; }
  const lvlOf = (m) => clamp(1 + Math.floor((m - 3000) / 100), 1, 25); // 3150 = 传奇1 (Lv2), 3500 = 传奇3 (Lv6, ultimate)
  function gainXp(x) {
    const h = S.hero, before = rankOf(h.mmr).name; h.mmr += Math.max(1, Math.round(x / 5));
    const nl = lvlOf(h.mmr);
    while (h.lvl < nl) { h.lvl++; const r = h.hp / h.max; h.max = Math.round(HD.hp * (1 + (h.lvl - 1) * 0.08)) + itemSum("hp"); h.hp = h.max * r; burst(h.x, feetY(h) - 20, ["#fde047", "#fff6c8"], 14); if (h.lvl === 6) banner("传奇3！大招解锁", "大金神：超凡指日可待"); }
    const after = rankOf(h.mmr).name; if (after !== before) { react("rank", { r: after }); sfx("rank"); text(h.x, feetY(h) - 58, "上分！" + after, "#fde047", true); if (Math.random() < 0.6) say(h, pick(JIN.lvl)); }
  }

  // =====================================================================
  //  ONDATE
  // =====================================================================
  function startWave() {
    S.wave++; const w = S.wave;
    let budget = (3 + w * 2.3 + Math.max(0, w - 8) ** 1.3) * S.diff.budget; const list = ["dmelee", "dmelee", "dranged"];
    const pool = Object.entries(EN).filter(([, e]) => !e.boss && e.minW <= w);
    while (budget > 0) { const [k, e] = pool[Math.floor(Math.random() * pool.length)]; if (e.cost > budget + 1) { budget -= 0.5; continue; } list.push(k); budget -= e.cost; }
    if (w % 5 === 0) list.push("roshan");
    S.queue = list.map((k, i) => ({ k, at: S.t + i * 0.9 + rnd(0, 0.3) }));
    S.nextWave = 34;
    react(w % 5 === 0 ? "roshan" : "wave", { w }); sfx("wave");
    banner(`第 ${w} 波`, w % 5 === 0 ? "大P神：肉山来了，小金金别送！" : pick(PDS));
  }
  function spawnEnemy(k) {
    const e = EN[k], sc = e.boss ? 1 + (S.wave / 5 - 1) * 0.25 : 1 + (S.wave - 1) * 0.1 + Math.max(0, S.wave - 8) ** 2 * 0.006, d = { ...e, hp: Math.round(e.hp * sc * S.diff.hp), dmg: Math.round(S.diff.dmg * e.dmg * (e.boss ? 1 + (S.wave / 5 - 1) * 0.15 : 1 + (S.wave - 1) * 0.05)), gold: Math.round(e.gold * 1.4 * S.diff.gold), set: SET[k] };
    const u = makeUnit("enemy", d, W + 30 + rnd(0, 10), e.fly ? 2 : Math.floor(rnd(0, 10)), { type: k });
    S.units.push(u);
    if (e.boss) { say(u, "吼——！！", 3); S.shake = 4; sfx("roshan"); }
  }
  function summon(kind) {
    const a = ALLY[kind], lv = LV[S.barracks];
    if (S.gold < a.cost) return flash("金币不够");
    if (S.units.filter((u) => u.kind).length >= 12) return flash("最多12个兵");
    S.gold -= a.cost;
    const d = { ...a, hp: Math.round(a.hp * lv.hp), dmg: Math.round(a.dmg * lv.dmg), arm: a.arm + lv.arm, set: allySet(kind) };
    const guard = kind === "melee" ? rnd(122, 150) : rnd(100, 116);
    const u = makeUnit("ally", d, ANC.front - 6, Math.floor(rnd(0, 10)), { kind, guard });
    S.units.push(u); burst(u.x, feetY(u) - 20, ["#fff6c8", "#7ae0a0"], 10, 30, 0); hud(true); sfx("summon");
  }
  function summonHelp(k) {
    const Hp = HELP[k];
    if (S.units.some((u) => u.helper === k && !u.dead)) return flash(Hp.name + "已经在场上了");
    if (S.helpCd[k] > 0) return flash(`${Hp.name}还在冷却 ${Math.ceil(S.helpCd[k])}秒`);
    if (S.gold < Hp.cost) return flash("金币不够");
    S.gold -= Hp.cost; S.helpCd[k] = Hp.cd;
    const front = enemies().sort((a, b) => a.x - b.x)[0];
    const x = k === "snail" ? 175 : clamp(front ? front.x - (k === "yoki" ? 6 : 16) : 190, ANC.front + 20, W - 30);
    const u = makeUnit("ally", { ...Hp, set: SET[Hp.look] }, x, 6, { helper: k, life: Hp.life, guard: x, drop: k === "bshen" ? 0 : 0.7, tp: k === "bshen" ? 1.6 : 0, castT: 0.6, step: 0, blinkCd: 0 });
    S.units.push(u); say(u, Hp.hi, 2.4); react(k); sfx(k === "bshen" ? "tp" : "drop"); if (k === "bshen") react("tp"); banner(`${Hp.name} 降临！`, `${Hp.hero} · 限时${Hp.life}秒 · ${Hp.hi}`); hud(true);
  }
  // atterraggio dal cielo
  function land(u) {
    if (u.helper === "bshen") { burst(u.x, feetY(u) - 20, ["#9ad8ff", "#c084fc", "#ffffff"], 22, 60, 0); text(u.x, feetY(u) - 84, "TP到达！", "#9ad8ff", true); sfx("tpEnd"); }
    else { sfx("land"); S.shake = Math.max(S.shake || 0, u.helper === "yoki" ? 7 : 3); burst(u.x, feetY(u) - 2, ["#b8a888", "#8a7a62", "#fff6c8"], 18, 70, 120); }
    if (u.helper === "bshen") { const t = nearestEnemy(u.x, 260, false); if (t) { t.slow = 3; hurt(t, 60, u); S.fx.push({ k: "beam", x1: u.x, x2: t.x, y: feetY(t) - 20, col: "#c084fc", life: 0.2, w: 2 }); text(u.x, feetY(u) - 70, "窒息之刃", "#f9a8d4", true); } }
    if (u.helper === "yoki") { later(0.25, () => echoSlam(u)); later(1.1, () => totem(u)); }
  }
  // 强化图腾: il colpo dopo fa danno ×4 in area e stordisce
  function totem(u) {
    if (u.dead) return; u.anim = "cast"; u.at = 0.35; u.totem = true;
    text(u.x, feetY(u) - 80, "强化图腾！", "#fcd34d", true); S.fx.push({ k: "zap", x: u.x, y: feetY(u) - 30, life: 0.4, r: 26, col: "#ff6a3a" }); burst(u.x, feetY(u) - 40, ["#ff6a3a", "#fcd34d"], 12, 40, 0);
    if (Math.random() < 0.5) say(u, pick(["图腾砸下去！", "这一锤至宝特效", "强化图腾，一锤一个"]), 2);
    later(3, () => { if (!u.dead && u.life > 0.5) totem(u); });
  }
  function echoSlam(u) {
    if (u.dead) return; u.anim = "cast"; u.at = 0.35;
    const ts = enemies().filter((e) => Math.abs(e.x - u.x) < 150), n = ts.length;
    ts.forEach((e) => { hurt(e, 140 + 45 * n, u, { pure: true }); e.stun = Math.max(e.stun, 1.3); });
    S.fx.push({ k: "zap", x: u.x, y: feetY(u) - 4, life: 0.5, r: 150, col: "#fcd34d" }); S.fx.push({ k: "zap", x: u.x, y: feetY(u) - 4, life: 0.35, r: 100, col: "#ffffff" });
    react("echo", { n }); sfx("echo"); S.shake = 8; text(u.x, feetY(u) - 78, `回音击！×${n}`, "#fcd34d", true); say(u, pick(HELP.yoki.lines), 2.4);
    burst(u.x, feetY(u) - 4, ["#8a6a3a", "#c9a060", "#fcd34d"], 30, 110, 140);
  }
  const later = (sec, fn) => S.later.push({ at: S.t + sec, fn });
  // Invoker: i dieci incantesimi, uno dopo l'altro
  function invoke(u) {
    const si = u.step < 3 ? u.step : 3 + ((u.step - 3) % 4); u.step++; const [icon, nm] = INVOKE[si], x = u.x, y = feetY(u) - 24, es = enemies(), ahead = es.filter((e) => e.x > x - 10).sort((a, b) => a.x - b.x);
    u.anim = "cast"; u.at = 0.35; u.face = 1; text(x, feetY(u) - 80, nm, "#93c5fd", true); u.lastSpell = icon;
    if (icon === "invoker_cold_snap") { const t = ahead[0]; if (t) { t.stun = 1.8; hurt(t, 120, u); S.fx.push({ k: "beam", x1: x, x2: t.x, y, col: "#bfe8ff", life: 0.25, w: 2 }); burst(t.x, feetY(t) - 20, ["#e0f7ff", "#7ad0ff"], 12, 40, 0); } }
    if (icon === "invoker_tornado") { sfx("cyclone"); S.fx.push({ k: "cyclone", x: x + 10, y: feetY(u), v: 210, life: 1.5, max: 1.5, hit: [], from: u }); }
    if (icon === "invoker_chaos_meteor") { sfx("meteorFall"); S.fx.push({ k: "meteor", x0: x + 30, x1: x + 300, y: feetY(u) - 14, life: 2.4, max: 2.4, fall: 0.5, from: u }); }
    if (icon === "invoker_emp") { const c = ahead[Math.floor(ahead.length / 2)]; const cx = c ? c.x : x + 100; S.fx.push({ k: "emp", x: cx, y: feetY(u) - 20, life: 1 }); later(1, () => { for (const e of enemies()) if (Math.abs(e.x - cx) < 60) hurt(e, 230, u, { pure: true }); S.fx.push({ k: "zap", x: cx, y: feetY(u) - 20, life: 0.35, r: 60, col: "#c084fc" }); }); }
    if (icon === "invoker_alacrity") { S.alac = 7; banner("灵动迅捷！", "蜗牛大神：全体攻速拉满"); burst(x, y, ["#ffb347", "#ff6a3a"], 16, 50, 0); }
    if (icon === "invoker_sun_strike") { const pts = [...es].sort((a, b) => b.hp - a.hp).slice(0, 6).map((e) => e.x); while (pts.length < 10) pts.push(rnd(x + 40, Math.min(W - 10, x + 320))); text(x, feetY(u) - 92, "天火·灾难（神杖）", "#ffb703", true); sfx("sunCharge"); pts.forEach((sx, n) => { const d = 0.8 + n * 0.12; S.fx.push({ k: "sunmark", x: sx, life: d }); later(d, () => { for (const e of enemies()) if (Math.abs(e.x - sx) < 26) hurt(e, 420, u, { pure: true }); S.fx.push({ k: "sun", x: sx, life: 0.55 }); sfx("sun"); burst(sx, GY - 4, ["#fff6b0", "#ffb703", "#ff6a00"], 10, 70, 100); S.shake = Math.max(S.shake || 0, 3); }); }); }
    if (icon === "invoker_forge_spirit") for (let k = 0; k < 2; k++) { const f = makeUnit("ally", { ...FORGE, set: SET.rranged }, x + 8 + k * 10, 3 + k * 4, { helper: "forge", life: 10, guard: x + 20 + k * 12, drop: 0, forge: true }); S.units.push(f); burst(f.x, feetY(f) - 16, ["#ff8a2a", "#fff0a0"], 10, 40, 0); }
    if (icon === "invoker_ice_wall") { S.fx.push({ k: "ice", x1: x + 25, x2: x + 190, life: 5 }); for (let k = 0; k < 10; k++) later(k * 0.5, () => { for (const e of enemies()) if (e.x > x + 25 && e.x < x + 190) { e.slow = 1; hurt(e, 45, u, { show: false, pure: true }); } }); }
    if (icon === "invoker_deafening_blast") { sfx("blast"); S.fx.push({ k: "blast", x: x + 12, y: feetY(u) - 24, v: 260, life: 1.1, max: 1.1, hit: [], from: u }); }
    if (icon === "invoker_ghost_walk") { u.ghost = 3; for (const e of es) if (Math.abs(e.x - x) < 80) e.slow = 3; say(u, "你看不见我，看不见我", 2); }
    if (Math.random() < 0.3) say(u, pick(HELP.snail.lines), 2);
  }
  function upgradeBarracks() {
    if (S.barracks >= 2) return flash("已经是超级巨型兵了");
    const c = BARRACKS_COST[S.barracks + 1]; if (S.gold < c) return flash("金币不够");
    S.gold -= c; S.barracks++;
    for (const u of S.units) if (u.kind) { const a = ALLY[u.kind], lv = LV[S.barracks]; u.d = { ...a, hp: Math.round(a.hp * lv.hp), dmg: Math.round(a.dmg * lv.dmg), arm: a.arm + lv.arm, set: allySet(u.kind) }; u.max = u.d.hp; u.hp = u.max; }
    banner(`兵营升级：${LV[S.barracks].name}兵`, S.barracks === 2 ? "超级巨型兵出场！" : "超级兵出场！"); renderShop();
  }
  function recalcHp() { const h = S.hero, r = h.hp / h.max; h.max = Math.round(HD.hp * (1 + (h.lvl - 1) * 0.08)) + itemSum("hp"); h.hp = Math.max(1, h.max * r); }
  function buy(k) {
    const it = ITEMS[k], plan = planBuy(k, S.items);
    if (it.parts && S.items.includes(k)) return flash("已经有了");
    if (S.items.length - plan.use.length + 1 > 6) return flash("物品栏满了（点物品栏可以卖）");
    if (S.gold < plan.cost) return flash(`金币不够（还差${plan.cost - S.gold}）`);
    S.gold -= plan.cost; S.items = S.items.filter((_, i) => !plan.use.includes(i)); S.items.push(k); recalcHp();
    sfx(it.parts ? "craft" : "buy");
    if (it.parts) { banner(`合成 ${it.name}`, it.desc); burst(S.hero.x, feetY(S.hero) - 30, ["#fde047", "#ffffff"], 16, 50, 0); } else banner(`购买 ${it.name}`, it.desc);
    renderShop(); if (it.parts || Math.random() < 0.3) react("buy", { i: it.name });
  }
  function sell(i) { const k = S.items[i]; if (!k) return; const v = Math.floor(ITEMS[k].cost / 2); S.items.splice(i, 1); S.gold += v; recalcHp(); text(S.hero.x, feetY(S.hero) - 52, `卖出 ${ITEMS[k].name} +${v}`, "#fde047"); renderShop(); }
  // torre: 3 livelli
  const TOWER_LV = [null, { hp: 3000, dmg: 110, arm: 14, multi: 1, splash: 0 }, { hp: 4500, dmg: 160, arm: 18, multi: 2, splash: 0, cost: 500, xp: 300 }, { hp: 6500, dmg: 220, arm: 22, multi: 3, splash: 24, cost: 1200, xp: 1500 }];
  const REBUILD = 600;
  const towerUnit = () => S.units.find((u) => u.towerU && !u.dead);
  function upgradeTower() {
    const t = towerUnit();
    if (!t) { if (S.gold < REBUILD) return flash("金币不够"); S.gold -= REBUILD; spawnTower(); banner("防御塔重建！", "大P神：小金金，这次守住"); renderShop(); return; }
    if (S.towerLv >= 3) return flash("防御塔已经满级"); const L = TOWER_LV[S.towerLv + 1];
    if (S.towerXp < L.xp) return flash(`防御塔经验不够（${Math.floor(S.towerXp)}/${L.xp}）`); if (S.gold < L.cost) return flash("金币不够");
    S.gold -= L.cost; S.towerXp -= L.xp; S.towerLv++; const r = t.hp / t.max; t.d = towerData(); t.max = t.d.hp; t.hp = t.max; burst(t.x, feetY(t) - 50, ["#9ae8ff", "#ffffff", "#fde047"], 24, 60, 0);
    banner(`防御塔升到 ${S.towerLv} 级`, S.towerLv === 3 ? "三连射 + 溅射" : "双连射"); react("towerUp"); sfx("upgrade"); renderShop();
  }
  const towerData = () => ({ ...TOWER, ...TOWER_LV[S.towerLv], set: SET.tower });
  function spawnTower() { S.units.push(makeUnit("ally", towerData(), 114, 0, { guard: 114, towerU: true })); }
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
    const ok = doSkill(i); if (ok !== false) sfx(["shackle", "powershot", "windrun", "focus"][i]);
    if (ok === false) return flash("附近没有目标");
    h.cds[i] = sk[2]; h.anim = "cast"; h.at = 0.35;
  }
  function doSkill(i) {
    const h = S.hero, x = h.x, y = feetY(h) - 18, lvl = h.lvl;
    if (HD === HEROES.windranger) {
      if (i === 0) { const t = nearestEnemy(x, 170, true); if (!t) return false; const t2 = enemies().filter((e) => e !== t && e.x > t.x && e.x - t.x < 60)[0]; for (const e of [t, t2]) if (e) { e.stun = 2.5; hurt(e, 80 + lvl * 8, h); S.fx.push({ k: "chain", x1: t.x, x2: e.x, y: feetY(e) - 20, life: 2.5 }); } S.fx.push({ k: "beam", x1: x, x2: t.x, y, col: "#d8c8a0", life: 0.15 }); }
      if (i === 1) { let dmg = 220 + lvl * 18; for (const e of enemies().filter((e) => e.x > x && e.x < x + 260).sort((a, b) => a.x - b.x)) { hurt(e, dmg, h); dmg *= 0.88; } S.fx.push({ k: "beam", x1: x, x2: x + 260, y, col: "#e8fbff", life: 0.35, w: 3 }); }
      if (i === 2) { h.buffs.windrun = 4; burst(x, y, ["#e8fbff", "#9ad8ff"], 12, 40, 0); }
      if (i === 3) { react("ult"); h.buffs.focus = 8; text(x, y - 30, "集中火力!", "#9ae0a0", true); }
    }
  }


  // =====================================================================
  //  DIRETTA: chat degli spettatori (lore del sito)
  // =====================================================================
  const VIEW = {
    "大P神": { col: "#cbd5e1", say: ["小金金，你的弹幕比你的操作好看", "今天锤了小金金几次？我数不过来", "小金金又在跟弹幕吵架", "小金金又在吹了", "锤子已备好🔨", "小金金，这波稳住", "笑死，嘴巴超凡", "真菜", "哎呀你这波操作", "我当年超凡的时候……", "小金金别看弹幕了，看小地图", "小金金你这补刀是认真的？", "这风行谁教的，退钱", "小金金今天又吹了几次超凡？", "我不玩了，但我还能锤你", "远古时代的超凡大神前来视察"] },
    "Ping大神": { col: "#8f7bff", say: ["这波我在理论上已经赢了三次", "烟抽完了，下一根", "万古那一天我记得很清楚", "喝一口再看🍺", "这把我理论上能赢", "我先点根烟🚬", "从理论上讲这个塔可以不死", "DC首席理论家报到", "万古一日游，懂的都懂", "喝多了，刚才谁杀的？", "休闲局别那么认真", "理论上风行应该先出漩涡", "我掉分了，来看看金神掉不掉", "主播的走位不符合理论", "再来一瓶"] },
    "大B神": { col: "#4fc3f7", say: ["老婆让我去洗碗，等我", "我TP很快的", "金神别针对我了", "宝宝睡了，我来看会", "喂奶中，挂机一下🍼", "主播能不能叫我下来砍几刀", "我只会玩双头龙", "刚才谁说我呆逼？", "俄罗斯指挥官上线", "看不懂但大受震撼", "黑弓又被抓了吗？哦这是风行", "我不敢上，你们先", "孩子哭了，等我两分钟", "金神你又针对我"] },
    "Yoki大神": { col: "#5eead4", say: ["主播要不要借我的至宝", "跳刀回音一波五个，主播学着点", "我有至宝，主播有吗💎", "三把斧了解一下", "黑弓至宝特效拉满", "Ping老师教的", "主播风行好像没至宝", "小黑1-5号位，啥都能玩", "我黑弓15连胜的时候……", "至宝不是用来打的，是用来看的", "我不玩辅助的"] },
    "疯子大神": { col: "#fb923c", say: ["老婆在看电视，我小声看", "这直播把我电脑卡死了", "老婆不在家，终于能看直播了", "我这电脑十年了，卡成PPT", "屠夫一勾一个", "OMG！", "低优先级出来了，来看看", "职业辅助给主播插个眼", "屠夫叼霸天", "老婆回来了，先撤", "主播要不要买个肉山盾"] },
    "Kaiju大神*": { col: "#38bdf8", say: ["小鱼人偷完钱来看直播", "金神你又抢我的兵", "小鱼人偷钱去了🐟", "四号位小鱼人报到", "金神又骂我", "天线宝宝向你问好", "四号位也能carry", "我等级低但我打得好", "金神别抢我的兵", "偷完钱就跑"] },
    "蜗牛大神": { col: "#93c5fd", say: ["金神这把还行，比上次强一点", "我中路那把你还记得吗", "干干干！", "今晚通宵！", "主播中路我虐过", "叫我下来，飓风陨石给你看", "金神你这补刀不行啊", "这把我来带", "我随便玩玩", "影魔三连压给你看", "地卜师分身比你这兵多"] },
    "Soul大神": { col: "#facc15", say: ["稳住，能赢", "主播加油", "刀塔传奇路过", "这波可以打"] },
    "辅助大神": { col: "#86efac", say: ["辅助视角：主播站位有问题", "低分局救世主报到", "我来给主播插眼", "辅助的天花板在此", "主播你缺个好辅助"] },
    "金神大腿": { col: "#f0abfc", say: ["金神一半的分是我带的", "大腿在此，别慌", "开小号来看看", "通宵吗金神", "没我你上不了传奇"] },
  };
  const RANDN = ["路人甲", "水友8848", "中单之王粉丝", "刀塔老玩家", "白嫖党", "夜魇间谍", "肉山本山", "补刀机器", "天辉守护者", "老卡尔", "一塔守护者", "萌新求带", "超凡观众", "弹幕护体", "小金金后援会", "风行老婆", "通宵党", "反补大师", "系统局受害者", "大P神粉丝团"];
  const RCOL = ["#a3e635", "#fca5a5", "#c4b5fd", "#fdba74", "#67e8f9", "#f9a8d4", "#d9f99d", "#e5e7eb"];
  const SC = {
    "大P神": ["小金金，这钱给你买个眼，别再送了", "锤子基金，专门锤小金金", "小金金守过20波我就请吃饭"],
    "Yoki大神": ["买个至宝吧主播，看着寒酸", "至宝赞助，别谢"],
    "蜗牛大神": ["通宵基金，今晚别睡", "叫我下来的出场费"],
    "Ping大神": ["啤酒钱，理论上够喝一晚", "主播理论课学费"],
    "大B神": ["奶粉钱都给你了", "宝宝说主播加油"],
    "疯子大神": ["老婆不知道我打赏了", "换电脑的钱先给你"],
    "金神大腿": ["上分辛苦费", "带飞费结一下"],
    _: ["主播加油！"],
  };
  const RSAY = ["前面的说得对", "这波我在第一排", "已三连", "关注了，主播下次几点播？", "从B站过来的", "刚下班，错过了什么", "这游戏哪里下载", "主播能不能露个脸", "主播声音呢？", "听说主播自称超凡？", "他风行箭都歪的", "这是天辉还是夜魇", "肉山快来了吧", "我也想被大P神锤", "大P神是谁，好凶", "蜗牛大神是什么神仙", "求大B神开播", "Yoki的至宝到底多少钱", "主播mmr是真的还是吹的", "这KDA可以发朋友圈了", "下饭直播", "妈妈问我为什么跪着看", "破防了", "绷不住了", "典", "孝", "急了急了", "主播别急", "这波是天胡开局", "有没有一种可能，主播其实很菜", "有一说一，这把打得还行", "弹幕护体！", "前方核能", "这就是刀塔的魅力吗", "看饿了，点个外卖", "凌晨三点还在看，我也是通宵党", "这直播间比比赛还好看", "666", "主播真猛", "这就是超凡？", "前面的别吹了", "主播几分？", "风行还得是金神", "主播又在吹", "老铁们刷波礼物", "这塔能守住吗", "+1", "哈哈哈哈哈", "主播开个大", "系统局预警", "建议改名大吹神", "主播别说话专心打", "这操作我奶奶都会", "赌五毛这波塔没了", "主播传奇几？", "求主播出辉耀", "风行大招呢？", "前方高能", "名场面", "下一波肉山吗", "kda战神", "主播今天通宵吗", "嘴巴超凡，手传奇", "又是我MVP（主播语录）", "补刀60是真的吗", "叫蜗牛大神下来啊", "叫大B神，便宜", "Yoki至宝出场费多少", "截图发群里了", "主播别吹了，看兵", "这风行箭法可以", "金神yyds", "说好的超凡入圣呢"];
  const GIFT = [["大P神", "🔨锤子"], ["Yoki大神", "💎至宝"], ["蜗牛大神", "🐌蜗牛"], ["大B神", "🍼奶瓶"], ["Ping大神", "🍺啤酒"], ["疯子大神", "🪝肉钩"], ["Kaiju大神*", "🐟小鱼干"], ["金神大腿", "🦵大腿"], ["Soul大神", "👑皇冠"]];
  const REACT = {
    die: [["大P神", "小金金又送了，锤！"], [0, "又系统局？"], [0, "金神送了"], [0, "笑死"], [0, "这就是超凡中单？"], [0, "-50分哈哈哈"], [0, "网卡了是吧"], [0, "战术性死亡懂不懂"], ["蜗牛大神", "我中路虐过的人"], [0, "队友呢？哦没有队友"], ["Ping大神", "理论上他不该死"], ["Kaiju大神*", "这次不能怪我了吧"]],
    rank: [[0, "上分了！{r}"], [0, "恭喜金神 {r}"], ["大P神", "{r}？虚胖分"], [0, "主播起飞"], [0, "嘴巴超凡，分也快超凡了"], [0, "赶紧截图发群里"], ["金神大腿", "这分有我一半"], ["Ping大神", "我理论上早就{r}了"]],
    wave: [[0, "第{w}波来了"], [0, "这波稳吗"], [0, "兄弟们坐好"], [0, "{w}波了还没死，可以"], ["大P神", "小金金，第{w}波别送"]],
    roshan: [[0, "肉山来了！！"], [0, "金神别送盾"], [0, "肉山：我来拿分"], ["大P神", "小金金，肉山都比你会打"], [0, "刷礼物给肉山"], ["疯子大神", "肉山也要老婆不在家才敢出来"]],
    roshanDie: [[0, "肉山没了！"], [0, "金神打肉山了？截图！"], ["大P神", "这次居然没送"]],
    tower: [[0, "一塔没了"], [0, "塔都守不住？"], [0, "主播在干嘛"], [0, "塔：我尽力了"], ["大P神", "小金金，塔都守不住？"]],
    low: [[0, "遗迹快没了！！"], [0, "主播回家啊！"], [0, "GG预定"], [0, "要输了要输了"], ["蜗牛大神", "叫我啊！"]],
    bshen: [[0, "大B神不是在喂奶吗？"], [0, "呆逼下凡了"], [0, "PA一刀999"], [0, "奶瓶放下了吗"], ["大B神", "我来了我来了"], ["Yoki大神", "呆逼居然敢上"]],
    yoki: [[0, "Yoki大神至宝出场"], [0, "啊啊啊啊啊"], [0, "回音击来了！"], [0, "跳刀呢？"], ["Yoki大神", "看我至宝特效"], ["Ping大神", "我教的"]],
    snail: [[0, "蜗牛大神降临！"], [0, "卡尔！飓风陨石天火！"], [0, "蜗牛：金神让开"], [0, "蜗牛中路虐过主播"], ["蜗牛大神", "干干干！"], [0, "手速拉满"]],
    echo: [[0, "回音击 {n} 个！！"], [0, "这波至宝特效"], [0, "地震了地震了"], ["Yoki大神", "一波{n}个，至宝的力量"]],
    crit: [[0, "恩赐解脱！！"], [0, "一刀999"], [0, "大B神这刀够买一个月奶粉"], ["大B神", "暴击了暴击了"]],
    buy: [[0, "买{i}了！"], [0, "{i}？主播有钱"], [0, "这装备谁教的"], ["Ping大神", "理论上应该先出{i}"], [0, "出{i}，懂哥"]],
    streak: [[0, "主播杀疯了"], [0, "{k}杀了"], [0, "这才像超凡"], [0, "金神今天开挂了？"], ["大P神", "{k}杀？小金金今天吃药了"]],
    ult: [[0, "风行大招！"], [0, "集中火力！！"], [0, "射爆！"], [0, "这攻速谁顶得住"]],
    over: [[0, "GG"], [0, "系统局！"], [0, "主播又要说：这把不算"], [0, "下播吧"], ["大P神", "锤！🔨"], [0, "第{w}波，还行吧"], ["蜗牛大神", "叫我我就守住了"]],
    tp: [[0, "TP来了！"], [0, "大B神TP支援！"], ["大B神", "TP到了，奶瓶先放下"], [0, "这TP速度比喂奶还快"], ["Ping大神", "理论上应该早点TP"]],
    totem: [[0, "图腾一锤！"], [0, "Yoki这锤子比大P神的还狠"], ["大P神", "这锤子我认可"]],
    mek: [[0, "梅肯奶了一口"], ["辅助大神", "梅肯！这才是辅助装"], [0, "主播终于会出辅助装了"]],
    towerUp: [[0, "塔升级了，稳了"], [0, "一塔变三连射了"], ["疯子大神", "这塔比我电脑强"]],
    start: [[0, "开播了！"], [0, "金神今天玩风行"], ["大P神", "小金金，守住遗迹"], [0, "来了来了"], [0, "主播今天几分？"]],
  };
  let chatT = 2, viewers = 500000;
  const fmtV = (v) => (v >= 10000 ? (v / 10000).toFixed(1) + "万" : String(v));
  function chatMsg(name, col, text, gift) {
    const box = $("chat-list"); if (!box) return;
    const d = document.createElement("div"); d.className = "cm" + (gift ? " gift" : "");
    d.innerHTML = `<b style="color:${col}">${name}</b>${gift ? " " : "："}${text}`;
    box.appendChild(d); while (box.children.length > 40) box.firstChild.remove();
  }
  function chatSC(who, amt, text) {
    const box = $("chat-list"); if (!box) return;
    const d = document.createElement("div"); d.className = "cm sc"; d.style.borderColor = (VIEW[who] || {}).col || "#fde047";
    d.innerHTML = `<b style="color:${(VIEW[who] || {}).col || "#fff"}">${who}</b> <span class="amt">¥${amt}</span><br>${text}`;
    box.appendChild(d); while (box.children.length > 40) box.firstChild.remove(); viewers += 5000; sfx("sc");
  }
  function chatSay(who, text) {
    if (!who) { const n = pick(RANDN); chatMsg(n, RCOL[n.length % RCOL.length], text); }
    else chatMsg(who, (VIEW[who] || {}).col || "#fff", text);
  }
  function react(ev, vars = {}) {
    const pool = REACT[ev]; if (!pool) return;
    const n = 2 + Math.floor(Math.random() * 3), used = new Set();
    for (let i = 0; i < n; i++) { const [who, t] = pick(pool); if (used.has(t)) continue; used.add(t); const txt = t.replace(/\{(\w)\}/g, (_, k) => vars[k] ?? ""); setTimeout(() => chatSay(who || null, txt), 250 + i * rnd(350, 900)); }
    viewers += 3000 + Math.floor(Math.random() * 12000);
  }
  function chatTick(dt) {
    chatT -= dt; if (chatT > 0) return;
    chatT = rnd(1.1, 2.6);
    const r = Math.random();
    if (r < 0.035) { const who = pick(Object.keys(VIEW)); chatSC(who, pick([30, 50, 100, 200, 520, 1314]), pick(SC[who] || SC._)); }
    else if (r < 0.07) { const [who, gft] = pick(GIFT); chatMsg(who, VIEW[who].col, `送出 ${gft} ×${pick([1, 1, 2, 5, 10, 66])}`, true); }
    else if (r < 0.55) { const who = pick(Object.keys(VIEW)); chatSay(who, pick(VIEW[who].say)); }
    else chatSay(null, pick(RSAY));
    viewers = Math.max(300000, viewers + Math.floor(rnd(-2500, 3200)) + S.wave * 400); $("viewers").textContent = fmtV(viewers);
    if (Math.random() < 0.05 && S.hero.respawn <= 0 && !S.hero.bubble) say(S.hero, pick(["弹幕别带节奏", "谢谢老铁的礼物", "弹幕说我菜的，你上你也不行", "大P神别刷锤子了", "看好了，超凡操作"]));
  }
  // =====================================================================
  //  UPDATE
  // =====================================================================
  const keys = {};
  function update(dt) {
    S.t += dt; if (S.over) return;
    S.nextWave -= dt;
    if (S.wave === 20 && !S.won) { S.nextWave = Math.max(S.nextWave, 1); if (!S.queue.length && !enemies().length) return win(); }
    if (S.nextWave <= 0) startWave();
    while (S.queue.length && S.queue[0].at <= S.t) spawnEnemy(S.queue.shift().k);
    for (const k in S.helpCd) S.helpCd[k] = Math.max(0, S.helpCd[k] - dt); S.alac = Math.max(0, S.alac - dt);
    if (S.later.length) { const due = S.later.filter((l) => l.at <= S.t); S.later = S.later.filter((l) => l.at > S.t); due.forEach((l) => l.fn()); }
    for (const f of S.fx) if (f.k === "meteor") { const age = f.max - f.life; if (age < f.fall) continue; const px = f.x0 + ((age - f.fall) / (f.max - f.fall)) * (f.x1 - f.x0); if (!f.landed) { f.landed = 1; S.shake = 6; sfx("meteor"); burst(f.x0, GY - 4, ["#ff8a2a", "#fff0a0", "#3a1a0a"], 24, 90, 120); for (const e of enemies()) if (Math.abs(e.x - f.x0) < 45) hurt(e, 200, f.from, { pure: true }); } f.tick = (f.tick || 0) - dt; if (f.tick <= 0) { f.tick = 0.2; for (const e of enemies()) if (Math.abs(e.x - px) < 40) { hurt(e, 110, f.from, { show: false, pure: true }); e.dot = Math.max(e.dot, 2.5); } } }
    // ciclone e onda sonora: proiettili che avanzano e colpiscono chi attraversano
    for (const f of S.fx) if (f.k === "cyclone" || f.k === "blast") { f.x += f.v * dt; for (const e of enemies()) if (!f.hit.includes(e) && Math.abs(e.x - f.x) < (f.k === "blast" ? 18 : 16)) { f.hit.push(e); if (f.k === "cyclone") { hurt(e, 180, f.from); if (!e.d.boss) { e.stun = Math.max(e.stun, 2.4); e.lift = 2.4; } else e.stun = Math.max(e.stun, 0.8); } else { hurt(e, 220, f.from); e.stun = Math.max(e.stun, 0.6); if (!e.d.boss) e.x = Math.min(W + 20, e.x + 45); burst(e.x, feetY(e) - 20, ["#ff6ad5", "#7ad0ff", "#fde047", "#7aff9a"], 8, 50, 0); } } }
    S.empower = Math.max(0, S.empower - dt); S.shake = Math.max(0, (S.shake || 0) - dt * 10);
    S.ancient.flash = Math.max(0, S.ancient.flash - dt);
    const mk = has("guardian_greaves") ? ITEMS.guardian_greaves : has("mekansm") ? ITEMS.mekansm : null;
    S.mekT = Math.max(0, (S.mekT || 0) - dt);
    if (mk && S.mekT <= 0 && S.hero.respawn <= 0) { const team = [S.hero, ...S.units.filter((u) => u.team === "ally" && !u.dead)]; if (team.some((u) => u.hp < u.max * 0.75)) { S.mekT = mk.mekCd; for (const u of team) { u.hp = Math.min(u.max, u.hp + mk.mek); burst(u.x, feetY(u) - 20, ["#7aff9a", "#e6ffe6"], 5, 30, 0); } S.fx.push({ k: "zap", x: S.hero.x, y: feetY(S.hero) - 10, life: 0.5, r: 90, col: "#7aff9a" }); text(S.hero.x, feetY(S.hero) - 64, (mk === ITEMS.mekansm ? "梅肯斯姆" : "卫士胫甲") + " +" + mk.mek, "#7aff9a", true); if (Math.random() < 0.4) react("mek"); sfx("heal"); } } chatTick(dt); S.inc += dt * 1.5; if (S.inc >= 1) { S.gold += Math.floor(S.inc); S.inc -= Math.floor(S.inc); }
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
    if (has("heart")) h.hp = Math.min(h.max, h.hp + h.max * 0.02 * dt);
    if (itemSum("hpReg")) h.hp = Math.min(h.max, h.hp + itemSum("hpReg") * dt);
    if (auras().hpr) h.hp = Math.min(h.max, h.hp + auras().hpr * dt);
    if (has("black_king_bar")) h.stun = 0;
    if (has("radiance")) { h.burnT = (h.burnT || 0) - dt; if (h.burnT <= 0) { h.burnT = 0.5; for (const e of enemies()) if (Math.abs(e.x - h.x) < 75) hurt(e, 50 * 0.5, h, { pure: true, show: false, noLs: true }); } }
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
      if (has("greater_crit") && Math.random() < 0.3) { dmg *= 2.25; crit = true; }
      if (has("monkey_king_bar") && Math.random() < 0.35) dmg += 70;
      if (has("javelin") && Math.random() < 0.2) dmg += 40;
      if (has("desolator")) t.armDown = 5;
      if (has("maelstrom") && Math.random() < 0.25) { let prev = t; const hit = [t]; for (let k = 0; k < 3; k++) { const nx = enemies().filter((e) => !hit.includes(e) && Math.abs(e.x - prev.x) < 70)[0]; if (!nx) break; hit.push(nx); prev = nx; } hit.forEach((e, k) => { hurt(e, 120, h, { show: false }); if (k) S.fx.push({ k: "beam", x1: hit[k - 1].x, x2: e.x, y: feetY(e) - 22, col: "#bfe8ff", life: 0.15, w: 1 }); }); }
      if (HD.ranged) shoot(h, t, dmg, HD.proj, { crit });
      else { hurt(t, dmg, h, { crit }); if (S.empower > 0) for (const e of enemies()) if (e !== t && Math.abs(e.x - t.x) < 26) hurt(e, dmg * 0.5, h, { show: false }); S.fx.push({ k: "slash", x: t.x, y: feetY(t) - 20, life: 0.18 }); }
      }
  }

  function updateUnit(u, dt) {
    if (u.dead) return;
    u.flash = Math.max(0, u.flash - dt); u.slow = Math.max(0, u.slow - dt); u.taunt = Math.max(0, u.taunt - dt); u.at = Math.max(0, u.at - dt);
    if (u.dot > 0) { u.dot -= dt; hurt(u, 30 * dt * (1 + S.hero.lvl * 0.05), S.hero, { pure: true, show: false }); if (u.hp <= 0) return; }
    u.armDown = Math.max(0, (u.armDown || 0) - dt); u.lift = Math.max(0, (u.lift || 0) - dt); u.ghost = Math.max(0, (u.ghost || 0) - dt);
    if (u.team === "ally" && auras().hpr) u.hp = Math.min(u.max, u.hp + auras().hpr * dt);
    if (u.helper) {
      if (u.drop > 0) { u.drop -= dt; if (u.drop <= 0) { u.drop = 0; land(u); } return; }
      if (u.tp > 0) { u.tp -= dt; if (Math.random() < 0.6) S.parts.push({ x: u.x + rnd(-12, 12), y: feetY(u) - rnd(0, 40), vx: 0, vy: -rnd(20, 50), g: 0, life: 0.5, col: pick(["#9ad8ff", "#c084fc", "#ffffff"]), s: 1 }); if (u.tp <= 0) { u.tp = 0; land(u); } return; }
      u.life -= dt; u.blinkCd = Math.max(0, (u.blinkCd || 0) - dt);
      const Hp = HELP[u.helper];
      if (Hp && Math.random() < dt * 0.15) say(u, pick(Hp.lines), 2.2);
      if (u.life <= 0) { u.dead = 0.7; u.ascend = true; if (Hp) say(u, Hp.bye, 2.5); burst(u.x, feetY(u) - 20, [Hp ? Hp.col : "#ff8a2a", "#ffffff"], 16, 40, 0); return; }
      if (u.helper === "snail") { u.castT -= dt; if (u.castT <= 0 && u.stun <= 0) { u.castT = u.step < 3 ? 0.55 : 1.7; invoke(u); } }
    }
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
        if (!block && !u.d.fly) { u.x -= stat(u, "spd") * dt; u.face = -1; u.anim = "walk"; u.frame += dt * stat(u, "spd") / 6; }
        else if (u.d.fly) { u.x -= stat(u, "spd") * dt; u.face = -1; u.anim = "walk"; u.frame += dt * 6; }
        else target = block;
      }
    } else {
      // alleati: difendono la loro posizione davanti all'Antico
      const aggro = u.d.aggro || (range > 30 ? range : 70);
      target = enemies().filter((e) => (u.helper || e.x >= u.x - 20) && Math.abs(e.x - u.x) <= aggro).sort((a, b) => Math.abs(a.x - u.x) - Math.abs(b.x - u.x))[0];
      if (target && Math.abs(target.x - u.x) > range + 2 && u.d.blink && u.blinkCd <= 0) { // 幻影突袭:闪到敌人身边
        const fx0 = u.x; u.x = target.x + (target.x > u.x ? -14 : 14); u.face = target.x >= u.x ? 1 : -1; u.blinkCd = 1.2; u.cd = 0;
        S.fx.push({ k: "beam", x1: fx0, x2: u.x, y: feetY(u) - 24, col: "rgba(192,132,252,.7)", life: 0.18, w: 3 }); burst(fx0, feetY(u) - 24, ["#c084fc", "#1e1b4b"], 10, 40, 0);
      }
      if (target && Math.abs(target.x - u.x) > range + 2) { const dir = Math.sign(target.x - u.x); u.x += dir * stat(u, "spd") * dt; u.face = dir; u.anim = "walk"; u.frame += dt * 6; target = null; }
      else if (!target) { const dx = u.guard - u.x; if (Math.abs(dx) > 2) { u.x += Math.sign(dx) * stat(u, "spd") * dt; u.face = Math.sign(dx); u.anim = "walk"; u.frame += dt * 6; } else { u.face = 1; if (u.at <= 0) u.anim = "idle"; } }
    }
    if (target && u.cd <= 0) {
      u.cd = 1 / stat(u, "rate"); u.anim = "atk"; u.at = 0.35;
      const tx = target === "ancient" ? ANC.front : target.x; u.face = tx >= u.x ? 1 : -1;
      let dmg = stat(u, "dmg");
      if (u.totem && target !== "ancient") { u.totem = false; dmg *= 4; for (const e of enemies()) if (e !== target && Math.abs(e.x - target.x) < 55) { hurt(e, dmg * 0.6, u); e.stun = Math.max(e.stun, 0.8); } target.stun = Math.max(target.stun, 1.2); S.fx.push({ k: "zap", x: target.x, y: feetY(target) - 4, life: 0.4, r: 55, col: "#fcd34d" }); burst(target.x, feetY(target) - 4, ["#8a6a3a", "#fcd34d", "#c9a060"], 18, 80, 140); S.shake = Math.max(S.shake || 0, 4); text(target.x, feetY(target) - 60, "图腾一击 " + Math.round(dmg), "#fcd34d", true); sfx("totem"); if (Math.random() < 0.4) react("totem"); }
      if (u.d.crit && Math.random() < u.d.crit) { dmg *= u.d.critMul; sfx("crit"); if (Math.random() < 0.3) react("crit"); text(target.x || u.x, feetY(u) - 56, "恩赐解脱 " + Math.round(dmg) + "!", "#ff3a5a", true); S.fx.push({ k: "slash", x: target.x, y: feetY(u) - 22, life: 0.25 }); S.shake = Math.max(S.shake || 0, 2); }
      if (u.d.proj) { shoot(u, target, dmg, u.d.proj, u.d.splash ? { splash: u.d.splash } : {}); if (u.d.multi > 1 && target !== "ancient") enemies().filter((e) => e !== target && Math.abs(e.x - u.x) <= range).slice(0, u.d.multi - 1).forEach((e) => shoot(u, e, dmg, u.d.proj, u.d.splash ? { splash: u.d.splash } : {})); }
      else if (target === "ancient") hurtAncient(dmg);
      else { hurt(target, dmg, u); if (u.team !== "enemy" && S.empower > 0) for (const e of enemies()) if (e !== target && Math.abs(e.x - target.x) < 24) hurt(e, dmg * 0.4, u, { show: false }); }
    } else if (target && u.at <= 0) u.anim = "idle";
  }
  function hurtAncient(dmg) {
    const a = S.ancient, real = Math.max(1, Math.round(dmg * armorMul(a.arm)));
    const was = a.hp / a.max; a.hp -= real; a.flash = 0.1; sfx("ancient"); if ((was > 0.5 && a.hp / a.max <= 0.5) || (was > 0.2 && a.hp / a.max <= 0.2)) react("low"); burst(ANC.x + 10, ANC.y - 40, ["#e6fff0", "#7ae0a0"], 3, 50);
    if (a.hp <= 0 && !S.over) gameOver();
  }

  // ---------- proiettili ----------
  const PROJ = { arrow: { col: "#e8e0c8", spd: 300, kind: "arrow" }, spark: { col: "#9ad8ff", core: "#ffffff", spd: 260 }, magic: { col: "#7ad0ff", core: "#e6fbff", spd: 220 }, tower: { col: "#9ae8ff", core: "#ffffff", spd: 280 },
    green: { col: "#8aff5a", core: "#e8ffd0", spd: 200 }, rock: { col: "#8a8f99", spd: 160, arc: 40 }, fire: { col: "#ff8a2a", core: "#fff0a0", spd: 200 } };
  function shoot(u, target, dmg, kind, extra = {}) {
    if (u.team === "hero") sfx("arrow"); else if (u.towerU) sfx("tower");
    const sx = u.x + u.face * (u.d.tower ? 4 : 10), sy = feetY(u) - (u.d.fly ? 50 : u.d.tower ? 74 : 24);
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
  // vittoria all'ondata 20: finire o continuare
  function win() {
    sfx("win");
    S.won = true; running = false; const D = S.diff;
    for (const [who, t] of D.chat) chatSay(who || null, t);
    $("win-title").textContent = D.winT;
    $("win-text").innerHTML = `难度：<b>${D.name}</b> · 守住 <b>20</b> 波 · 击杀 <b>${S.kills}</b> · <b>${S.hero.mmr}</b> MMR<br>` + D.winS.map((l) => `<span style="color:#ffd76a">${l}</span>`).join("<br>");
    $("win-medal").src = `https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_${D.tier}.png`;
    try { const k = "g2:win:" + S.diffKey; localStorage.setItem(k, Math.max(+localStorage.getItem(k) || 0, 1)); } catch {}
    $("win").hidden = false;
  }
  function gameOver() {
    react("over", { w: S.wave }); sfx("lose");
    S.over = true; S.ancient.hp = 0;
    let best = 0; try { best = Math.max(+localStorage.getItem("g2:best") || 0, S.wave); localStorage.setItem("g2:best", best); } catch {}
    $("over-text").innerHTML = `${S.diff.name} · 大金神（${HD.name}）守到第 <b>${S.wave}</b> 波 · 击杀 <b>${S.kills}</b><br>最佳纪录：第 ${best} 波<br><span style="color:#ff9a6a">大金神：系统局！这把不算！</span>`;
    $("over").hidden = false;
  }

  // =====================================================================
  //  DISEGNO
  // =====================================================================
  function frameOf(u) {
    const set = u.d.set || SET[HD.look], R = u.face >= 0;
    if (u.kind && S.barracks === 1) return R ? set.gold : set.goldL;
    return R ? set.R : set.L;
  }
  // animazione a trasformazioni: ritorna spostamento, rotazione e squash/stretch (pivot ai piedi)
  const ATK_T = 0.35;
  function pose(u) {
    const f = u.face >= 0 ? 1 : -1, o = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1, swing: -1 };
    if (u.d.tower) { if (u.anim === "atk" && u.at > 0) o.swing = 1 - u.at / ATK_T; return o; }
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
      if (f.k === "meteor") { const age = f.max - f.life, R = 17;
        if (age < f.fall) { const k = age / f.fall, mx = f.x0 - 90 * (1 - k), my = -20 + (f.y + 20) * k; for (let t = 1; t < 8; t++) { g.fillStyle = `rgba(255,${120 + t * 15},40,${0.7 - t * 0.08})`; g.beginPath(); g.arc(mx - t * 7, my - t * 9, R - t * 1.6, 0, 7); g.fill(); } g.fillStyle = "#3a1a0a"; g.beginPath(); g.arc(mx, my, R, 0, 7); g.fill(); g.fillStyle = "#ff8a2a"; g.beginPath(); g.arc(mx + 2, my - 2, R - 5, 0, 7); g.fill(); }
        else { const px = f.x0 + ((age - f.fall) / (f.max - f.fall)) * (f.x1 - f.x0), py = f.y - 4, rot = age * 8;
          for (let t = 1; t < 9; t++) { g.fillStyle = t % 2 ? "rgba(255,138,42,.55)" : "rgba(255,220,120,.45)"; g.beginPath(); g.arc(px - t * 6, py - Math.sin(age * 20 + t) * 3 - t, R - t * 1.5, 0, 7); g.fill(); }
          g.fillStyle = "rgba(255,90,20,.35)"; g.fillRect(f.x0, GY - 3, px - f.x0, 4);
          g.save(); g.translate(px, py); g.rotate(rot); g.fillStyle = "#2a1208"; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill(); g.fillStyle = "#ff6a00"; for (let k = 0; k < 5; k++) { g.fillRect(Math.cos(k * 1.3) * 8 - 3, Math.sin(k * 1.3) * 8 - 3, 6, 6); } g.fillStyle = "#fff0a0"; g.beginPath(); g.arc(0, 0, 5, 0, 7); g.fill(); g.restore(); } }
      if (f.k === "cyclone") { const a = Math.min(1, f.life * 3); for (let k = 0; k < 9; k++) { const yy = f.y - 4 - k * 6, w = 5 + k * 2.4, sw = Math.sin(S.t * 18 + k) * 3; g.strokeStyle = `rgba(${220 - k * 6},${235 - k * 4},255,${0.85 * a})`; g.lineWidth = 2; g.beginPath(); g.ellipse(f.x + sw, yy, w, 2.2, 0, 0, 7); g.stroke(); } g.lineWidth = 1; g.fillStyle = `rgba(140,120,90,${0.8 * a})`; for (let k = 0; k < 6; k++) { const an = S.t * 14 + k; g.fillRect(Math.round(f.x + Math.cos(an) * (8 + k * 3)), Math.round(f.y - 10 - k * 7), 2, 2); } }
      if (f.k === "blast") { const a = Math.min(1, f.life * 2.5), cols = ["#ff4d6d", "#ffb703", "#fde047", "#7aff9a", "#7ad0ff", "#c084fc"]; for (let k = 0; k < cols.length; k++) { g.strokeStyle = cols[(k + Math.floor(S.t * 12)) % cols.length]; g.globalAlpha = a * (1 - k * 0.12); g.lineWidth = 3; g.beginPath(); g.arc(f.x - k * 7, f.y, 22 + k * 2, -1.1, 1.1); g.stroke(); } g.globalAlpha = 1; g.lineWidth = 1; }
      if (f.k === "sunmark") { g.strokeStyle = "rgba(255,220,90,.9)"; g.beginPath(); g.ellipse(f.x, GY, 14, 3, 0, 0, 7); g.stroke(); }
      if (f.k === "sun") { const a = Math.min(1, f.life * 3); g.globalAlpha = a * 0.5; g.fillStyle = "#ffd76a"; g.fillRect(f.x - 16, 0, 32, GY); g.globalAlpha = a; g.fillStyle = "#fff6b0"; g.fillRect(f.x - 9, 0, 18, GY); g.fillStyle = "#ffffff"; g.fillRect(f.x - 3, 0, 6, GY); g.fillStyle = "#ffb703"; g.beginPath(); g.ellipse(f.x, GY - 2, 26, 6, 0, 0, 7); g.fill(); g.globalAlpha = 1; }
      if (f.k === "emp") { g.strokeStyle = "rgba(192,132,252,.9)"; g.beginPath(); g.arc(f.x, f.y, 6 + (1 - f.life) * 50, 0, 7); g.stroke(); }
      if (f.k === "ice") { g.globalAlpha = Math.min(1, f.life); for (let x = f.x1; x < f.x2; x += 8) { g.fillStyle = "#bfe8ff"; g.fillRect(x, GY - 14, 6, 14); g.fillStyle = "#e8fbff"; g.fillRect(x + 1, GY - 13, 2, 10); } g.globalAlpha = 1; }
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
      if (u.towerU && !u.dead) { g.font = "bold 8px sans-serif"; g.textAlign = "center"; g.fillStyle = "#000"; g.fillText(`一塔 Lv${S.towerLv}`, u.x + 1, top - 7); g.fillStyle = "#9ae8ff"; g.fillText(`一塔 Lv${S.towerLv}`, u.x, top - 8); if (S.towerLv < 3) { const p = Math.min(1, S.towerXp / TOWER_LV[S.towerLv + 1].xp); g.fillStyle = "#111"; g.fillRect(Math.round(u.x - 11), Math.round(top + 1), 22, 3); g.fillStyle = p >= 1 ? "#fde047" : "#8a6aff"; g.fillRect(Math.round(u.x - 10), Math.round(top + 2), Math.round(20 * p), 1); } }
      const Hp = HELP[u.helper], dropY = u.drop > 0 ? (u.drop / 0.7) ** 2 * 170 : 0;
      if (Hp && !u.dead) { const t = `${Hp.name} ${Math.ceil(u.life)}s`; g.font = "bold 8px sans-serif"; g.textAlign = "center"; g.fillStyle = "#000"; g.fillText(t, u.x + 1, top - 7 - dropY); g.fillStyle = Hp.col; g.fillText(t, u.x, top - 8 - dropY); }
      if (u.bubble) bubble(u.x, top - dropY - (u.team === "hero" ? 36 : Hp ? 22 : 12), u.bubble.t, Hp ? Hp.col : u.team === "hero" ? "#f2b632" : "#ff6a3a");
    }
    bar(ANC.x - 24, ANC.y - 116, 48, S.ancient.hp / S.ancient.max, "#7ae0a0");
    g.font = "bold 9px sans-serif"; g.textAlign = "center";
    for (const t of S.texts) { g.globalAlpha = Math.min(1, t.life * 2); g.font = t.big ? "bold 10px sans-serif" : "bold 7px sans-serif"; g.fillStyle = "#000"; g.fillText(t.t, Math.round(t.x) + 1, Math.round(t.y) + 1); g.fillStyle = t.col; g.fillText(t.t, Math.round(t.x), Math.round(t.y)); }
    g.globalAlpha = 1; g.restore();
  }
  function drawUnit(u) {
    const im = frameOf(u), set = u.d.set || SET[HD.look], R = u.face >= 0, fly = (isFly(u) ? 30 + Math.sin(S.t * 3) * 3 : 0) + (u.drop > 0 ? (u.drop / 0.7) ** 2 * 170 : 0) + (u.lift > 0 ? 16 + Math.sin(S.t * 20) * 2 : 0), fy = feetY(u), cx = Math.round(u.x);
    if (u.dead && u.ascend) { const k = 1 - Math.max(0, u.dead) / 0.7; g.save(); g.globalAlpha = Math.max(0, 1 - k); g.drawImage(im, cx - (im.width >> 1), fy - im.height + 2 - k * 140); g.restore(); return; }
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
    if (u.lift > 0) { g.strokeStyle = "rgba(232,244,255,.7)"; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(cx, fy - 4 - k * 6, 8 + k * 3, 2, 0, 0, 7); g.stroke(); } }
    if (u.tp > 0) { const k = 1 - u.tp / 1.6; g.strokeStyle = `rgba(154,216,255,${0.5 + 0.4 * Math.sin(S.t * 20)})`; g.lineWidth = 2; for (let r = 0; r < 3; r++) { g.beginPath(); g.ellipse(cx, fy - 1, 14 + r * 5 - k * 4, 3 + r, 0, 0, 7); g.stroke(); } g.lineWidth = 1;
      const gr = g.createLinearGradient(0, fy - 60, 0, fy); gr.addColorStop(0, "rgba(154,216,255,0)"); gr.addColorStop(1, `rgba(192,132,252,${0.35 + k * 0.35})`); g.fillStyle = gr; g.fillRect(cx - 12, fy - 60, 24, 60);
      g.globalAlpha = k * 0.7; g.drawImage(im, cx - (im.width >> 1), fy - im.height + 2); g.globalAlpha = 1; return; }
    if (u.drop > 0) { g.fillStyle = `rgba(255,255,220,${0.25 + (1 - u.drop / 0.7) * 0.3})`; g.fillRect(cx - 10, 0, 20, fy); }
    g.save(); if (u.ghost > 0) g.globalAlpha = 0.4; g.translate(cx + o.dx, fy + 2 - fly + o.dy); g.rotate(u.lift > 0 ? 0 : o.rot); g.scale(o.sx, o.sy);
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
    if (u.helper && HELP[u.helper]) glow("#93c5fd", 0.12 + Math.sin(S.t * 6) * 0.06);
    if (u.forge) glow("#ffd06a", 0.45);
    if (u.towerU && S.towerLv > 1) glow(S.towerLv === 3 ? "#ffd06a" : "#93c5fd", 0.18 + Math.sin(S.t * 3) * 0.06);
    g.restore();
    // scia dell'arma (mischia) / lampo di sparo (distanza)
    if (o.swing >= 0) {
      const f = u.face >= 0 ? 1 : -1, r = Math.max(12, im.height * 0.42), hx = cx + f * im.width * 0.18, hy = fy - im.height * 0.5;
      if (!u.d.ranged && !(u.team === "hero" && HD.ranged)) {
        g.strokeStyle = `rgba(255,255,255,${0.85 * (1 - o.swing * 0.6)})`; g.lineWidth = 2; g.beginPath();
        const a0 = f > 0 ? -1.3 : Math.PI + 1.3, a1 = f > 0 ? -1.3 + 2.2 * o.swing : Math.PI + 1.3 - 2.2 * o.swing; g.arc(hx, hy, r, Math.min(a0, a1), Math.max(a0, a1)); g.stroke();
        g.strokeStyle = `rgba(255,220,140,${0.5 * (1 - o.swing)})`; g.beginPath(); g.arc(hx, hy, r - 3, Math.min(a0, a1), Math.max(a0, a1)); g.stroke(); g.lineWidth = 1;
      } else if (u.d.tower) { if (o.swing < 0.4) { g.fillStyle = `rgba(200,245,255,${1 - o.swing * 2.5})`; g.beginPath(); g.arc(cx, fy - 74, 4 + o.swing * 8, 0, 7); g.fill(); } }
      else if (o.swing < 0.5) { g.fillStyle = `rgba(255,240,180,${1 - o.swing * 2})`; g.beginPath(); g.arc(cx + f * im.width * 0.42, hy - 2, 3 + o.swing * 4, 0, 7); g.fill(); }
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
    const key = [S.gold, Math.ceil(S.ancient.hp), S.towerLv, Math.floor(S.towerXp), Math.ceil(h.hp), h.max, h.mmr, S.wave, Math.ceil(S.nextWave), h.cds.map(Math.ceil).join(","), Object.values(S.helpCd).map(Math.ceil).join(","), S.barracks, h.respawn > 0 ? Math.ceil(h.respawn) : 0].join("|");
    if (key === lastKey && !force) return; lastKey = key;
    $("gold").textContent = S.gold; $("wave").textContent = S.wave; $("next").textContent = Math.ceil(S.nextWave);
    $("anc").style.width = (S.ancient.hp / S.ancient.max) * 100 + "%"; $("anc-t").textContent = `${Math.max(0, Math.ceil(S.ancient.hp))}/${S.ancient.max}`;
    $("hp").style.width = Math.max(0, h.hp / h.max) * 100 + "%"; $("hp-t").textContent = h.respawn > 0 ? `复活 ${Math.ceil(h.respawn)}` : `${Math.ceil(h.hp)}/${h.max}`;
    const rk = rankOf(h.mmr); $("mmr").textContent = h.mmr; $("rank").textContent = rk.name;
    $("medal").src = `https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_${rk.tier}.png`; $("star").src = rk.star ? `https://www.opendota.com/assets/images/dota2/rank_icons/rank_star_${rk.star}.png` : ""; $("star").hidden = !rk.star;
    document.querySelectorAll(".skill").forEach((b, i) => { const cd = h.cds[i], locked = i === 3 && h.lvl < 6; b.classList.toggle("cd", cd > 0 || locked); b.querySelector(".cdn").textContent = locked ? "传奇3" : cd > 0 ? Math.ceil(cd) : ""; });
    document.querySelectorAll("[data-buy]").forEach((b) => { const k = b.dataset.buy, own = ITEMS[k].parts && S.items.includes(k); b.classList.toggle("poor", !own && S.gold < +b.dataset.price); b.classList.toggle("own", !!own); });
    const tw = towerUnit(); $("twr").classList.toggle("poor", tw ? S.towerLv >= 3 || S.gold < TOWER_LV[S.towerLv + 1].cost || S.towerXp < TOWER_LV[S.towerLv + 1].xp : S.gold < REBUILD);
    if (tw && S.towerLv < 3) { const need = TOWER_LV[S.towerLv + 1].xp; $("twr-xp").style.width = Math.min(100, (S.towerXp / need) * 100) + "%"; $("twr-xpt").textContent = `经验 ${Math.min(need, Math.floor(S.towerXp))}/${need}`; } else if ($("twr-xpt")) $("twr-xpt").textContent = tw ? "满级" : "";
    $("sum-melee").classList.toggle("poor", S.gold < ALLY.melee.cost); $("sum-ranged").classList.toggle("poor", S.gold < ALLY.ranged.cost);
    for (const [k, Hp] of Object.entries(HELP)) { $("help-" + k).classList.toggle("poor", S.gold < Hp.cost || S.helpCd[k] > 0); $("help-cd-" + k).textContent = S.helpCd[k] > 0 ? Math.ceil(S.helpCd[k]) + "s" : Hp.cost; }
    $("upg").classList.toggle("poor", S.barracks >= 2 || S.gold < BARRACKS_COST[S.barracks + 1]);
    $("upg-cost").textContent = S.barracks >= 2 ? "满级" : BARRACKS_COST[S.barracks + 1];
  }
  function iconCanvas(set) { const c = document.createElement("canvas"); const im = set.R; c.width = im.width; c.height = im.height; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0); return c; }
  function renderShop() {
    const lvKey = S.barracks + 1;
    $("units").innerHTML = `
      <button class="slot" id="sum-melee"><i>1</i><span class="pic" data-pic="${S.barracks >= 2 ? "rmegam" : "rmelee"}"></span><b>${LV[S.barracks].name}近战兵</b><em>${ALLY.melee.cost}</em></button>
      <button class="slot" id="sum-ranged"><i>2</i><span class="pic" data-pic="${S.barracks >= 2 ? "rmegar" : "rranged"}"></span><b>${LV[S.barracks].name}远程兵</b><em>${ALLY.ranged.cost}</em></button>
      <button class="slot" id="twr"><i>T</i><span class="pic" data-pic="tower"></span><b>${!towerUnit() ? "重建防御塔" : S.towerLv >= 3 ? "防御塔满级" : `升级防御塔 → ${S.towerLv + 1}级`}</b><em>${!towerUnit() ? REBUILD : S.towerLv >= 3 ? "3级" : TOWER_LV[S.towerLv + 1].cost}</em><span class="meter xp" style="width:80px"><i id="twr-xp"></i></span><small id="twr-xpt"></small><small>${S.towerLv >= 3 ? "三连射+溅射" : S.towerLv === 2 ? "下一级：三连射+溅射" : "下一级：双连射"}</small></button>
      <button class="slot" id="upg"><i>U</i><span class="pic" data-pic="rmegam"></span><b>${S.barracks >= 2 ? "兵营满级" : "升级兵营 → " + LV[S.barracks + 1].name}</b><em id="upg-cost"></em></button>
      ${Object.entries(HELP).map(([k, Hp]) => `<button class="slot snail" id="help-${k}" style="border-color:${Hp.col}" title="${Hp.desc}"><i>${Hp.key}</i><span class="pic" data-pic="${Hp.look}"></span><b>${Hp.name}<br><small>${Hp.hero} · ${Hp.life}秒</small></b><em id="help-cd-${k}"></em><small>${Hp.desc}</small></button>`).join("")}`;
    const IMG = (k) => `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${k}.png`;
    const card = ([k, it]) => { const pl = planBuy(k, S.items); return `<button class="slot item${it.parts ? " big" : ""}" data-buy="${k}" data-price="${pl.cost}" title="${it.desc}"><img src="${IMG(k)}" alt=""><b>${it.name}</b><em>${pl.cost}${pl.cost < it.cost ? `<s>${it.cost}</s>` : ""}</em>${it.parts ? `<span class="parts">${it.parts.map((p) => `<img src="${IMG(p)}" title="${ITEMS[p].name}" class="${S.items.includes(p) ? "have" : ""}">`).join("+")}+<img src="${IMG("recipe")}" title="卷轴 ${it.rc}"></span>` : ""}<small>${it.desc}</small></button>`; };
    const all = Object.entries(ITEMS).sort((a, b) => a[1].cost - b[1].cost);
    $("shop").innerHTML = `<div class="shop-h">基础物品</div>${all.filter(([, it]) => !it.parts).map(card).join("")}<div class="shop-h">合成物品 · 已有的零件会自动合成，只付差价</div>${all.filter(([, it]) => it.parts).map(card).join("")}`;
    const invHtml = Array.from({ length: 6 }, (_, i) => S.items[i] ? `<img src="${IMG(S.items[i])}" data-sell="${i}" title="${ITEMS[S.items[i]].name} · 点击卖出 +${Math.floor(ITEMS[S.items[i]].cost / 2)}">` : `<span></span>`).join(""); document.querySelectorAll(".inv").forEach((el) => (el.innerHTML = invHtml));
    document.querySelectorAll("[data-sell]").forEach((b) => (b.onclick = () => { if (confirm(`卖出 ${ITEMS[S.items[+b.dataset.sell]].name}？`)) sell(+b.dataset.sell); }));
    document.querySelectorAll("[data-pic]").forEach((s) => { s.appendChild(iconCanvas(SET[s.dataset.pic])); });
    $("sum-melee").onclick = () => summon("melee"); $("sum-ranged").onclick = () => summon("ranged"); for (const k in HELP) $("help-" + k).onclick = () => summonHelp(k); $("twr").onclick = upgradeTower; $("upg").onclick = upgradeBarracks;
    document.querySelectorAll("[data-buy]").forEach((b) => (b.onclick = () => buy(b.dataset.buy)));
    hud(true); requestAnimationFrame(fit);
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
    if (k === "1") summon("melee"); if (k === "2") summon("ranged"); for (const [hk, Hp] of Object.entries(HELP)) if (k === Hp.key) summonHelp(hk); if (k === "u") upgradeBarracks(); if (k === "t") upgradeTower();
    if (k.startsWith("arrow")) e.preventDefault();
  });
  addEventListener("pointerdown", () => SFX.init()); addEventListener("keydown", () => SFX.init());
  const muteBtn = $("mute"); if (muteBtn) { muteBtn.textContent = SFX.muted ? "🔇" : "🔊"; muteBtn.onclick = (e) => { e.stopPropagation(); muteBtn.textContent = SFX.toggle() ? "🔇" : "🔊"; }; }
  addEventListener("keyup", (e) => (keys[e.key.toLowerCase()] = false));
  for (const [id, dir] of [["left", -1], ["right", 1]]) { const b = $(id); const on = (e) => { e.preventDefault(); if (S) S.hero.mx = dir; }, off = () => { if (S && S.hero.mx === dir) S.hero.mx = 0; }; b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointerleave", off); b.addEventListener("pointercancel", off); }
  const MOB = matchMedia("(max-width: 760px), (max-height: 520px)");
  function fit() {
    const mob = MOB.matches, bar = $("bar"), hudH = document.querySelector(".hud").offsetHeight;
    if (mob) document.body.style.setProperty("--dockh", bar.offsetHeight + 8 + "px"); else document.body.style.removeProperty("--dockh");
    const chat = document.querySelector(".chat"), chatH = mob && getComputedStyle(chat).position === "static" ? chat.offsetHeight : 0;
    const maxW = Math.min(innerWidth - (mob ? 12 : 16), 1500), maxH = innerHeight - hudH - (mob ? bar.offsetHeight + chatH + 22 : 230);
    const k = Math.min(maxW / W, Math.max(120, maxH) / H), sc = k >= 2 ? Math.floor(k) : Math.max(0.5, k); cv.style.width = Math.floor(W * sc) + "px"; cv.style.height = Math.floor(H * sc) + "px";
    // in verticale la chat riempie lo spazio libero tra il campo e la barra comandi
    if (mob && getComputedStyle(chat).position === "static") { const free = innerHeight - hudH - H * sc - bar.offsetHeight - 40; chat.style.height = Math.max(84, Math.min(320, free)) + "px"; } else chat.style.height = "";
  }
  $("shopbtn").onclick = () => { $("shoppanel").classList.add("open"); }; $("shopclose").onclick = () => $("shoppanel").classList.remove("open");
  addEventListener("orientationchange", () => setTimeout(fit, 300));
  addEventListener("resize", fit); fit();

  let running = false;
  Promise.all([ready, ancP]).then(() => {
  $("pick").innerHTML = `<div class="hero" style="cursor:default"><span class="pic" data-hp="hero_windrunner"></span><b>风行者</b><small>远程 · 束缚击 · 强力击 · 风行 · 集中火力</small></div>` +
    Object.entries(DIFF).map(([k, d]) => `<button class="hero diff" data-d="${k}"><img src="https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_${d.tier}.png" alt=""><b>${d.name}</b></button>`).join("");
  document.querySelectorAll("[data-hp]").forEach((s) => s.appendChild(iconCanvas(SET[s.dataset.hp])));
  document.querySelectorAll("[data-d]").forEach((b) => (b.onclick = () => { $("intro").hidden = true; reset("windranger", b.dataset.d); renderSkills(); running = true; banner("大金神 · " + S.diff.name, "大P神：小金金，守住遗迹！守20波就算你赢"); $("chat-list").innerHTML = ""; chatMsg("系统", "#ff6a3a", `大金神开播了 · 守护遗迹 · ${S.diff.name}`, true); react("start"); }));
  $("win-end").onclick = () => { $("win").hidden = true; $("intro").hidden = false; running = false; };
  $("win-go").onclick = () => { $("win").hidden = true; running = true; S.nextWave = 6; banner("无尽模式", "大P神：小金金，看你能守到第几波"); chatSay("大P神", "还不下播？那就继续锤"); };
  $("again").onclick = () => { $("over").hidden = true; $("intro").hidden = false; running = false; };
  try { const b = +localStorage.getItem("g2:best"); if (b) $("best").textContent = `最佳纪录：第 ${b} 波`; } catch {}

  let last = performance.now();
  function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (running && !document.hidden) { update(dt); draw(); } requestAnimationFrame(loop); }
  reset("windranger", "normal"); renderSkills(); draw(); requestAnimationFrame(loop);
  });
  if (location.search.includes("debug")) window.__g2 = { get S() { return S; }, update, draw, startWave, summon, summonHelp, upgradeBarracks, upgradeTower, sell, buy, cast, spawnEnemy, reset, win };
})();
