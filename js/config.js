// ============================================================
//  GLI IMPUTATI
//  Per aggiungere un giocatore basta aggiungere una riga qui sotto
//  con il suo Steam64 ID (quello nell'URL steamcommunity.com/profiles/...).
//  "alias" e "accusa" sono opzionali: se mancano si usa il nome Steam.
//
//  "color" (opzionale): colore personale della pagina. "bounty": il reato sul manifesto 通缉令.
//  "bio" (opzionale): presentazione (简介) mostrata sotto il nome.
//  "note" (opzionale): il sospiro del giudice (法官叹气), mostrato sotto l'indice.
//  "persona" (opzionale) attiva battute su misura, 语录 e 专项调查:
//    mode:        "praise" = modalità elogio: solo partite vinte, solo complimenti, manifesto 表彰令
//                 "legend" = monumento (纪念碑) per chi non gioca più: carriera, medaglia, 群聊冒泡; rival = chi viene "commentato"
//    alsoPraise:  true = oltre alle prese in giro, sezione "本庭也得承认" con elogi dalle vittorie
//    praiseFirst: true = in cima alla pagina un blocco di lodi (吹爆专区) dai dati veri:胜率, 连胜, 1-5号位, 绝活英雄
//    inventory:   true = scansione dell'inventario Dota 2 (至宝仓库); l'inventario Steam deve essere pubblico
//    friendsScan: true = partite nascoste: lo script le ricostruisce dalle partite in gruppo con gli altri giocatori
//    meter:      indice al posto del voto: "brag" (吹牛/甩锅指数), "drunk" (上头指数), "babysit" (minuti di 保姆), "axes" (三板斧浓度), "allNighter" (通宵兑现率: ore a sera / 8), "wifeAway" (ore di 放风), "fish" (小鱼人浓度); assente = voto su 100
//    claimedRank: la medaglia che dice di avere (先锋, 卫士, 中军, 统帅, 传奇, 万古流芳, 超凡入圣, 冠绝一世)
//    rival:       il giocatore che prende sempre in giro
//    traits:      i suoi vizi, a scelta tra:
//      brag       si vanta del suo livello (usa claimedRank)
//      midKing    dice di essere un mid imbattibile
//      kdaBrag    si vanta sempre del KDA
//      blameTeam  quando perde è colpa dei compagni
//      rigged     dice che Steam gli dà partite truccate (系统局)
//      selfMvp    quando vince è sempre MVP
//      targeted   quando perde in mid dice di essere "被针对"
//      lastPick   sceglie sempre per ultimo per paura dei counter
//      trashTalk  prende in giro gli altri (usa rival)
//      theorist   teorico in Discord: parla tanto, insegna, giudica
//      allRounder dice di saper giocare in ogni ruolo
//      cantLastHit dice di non saper fare last hit
//      drunk      gioca bevendo (curva dell'alcol: winrate per partita della serata)
//      smoker     una sigaretta dopo ogni partita
//      mmrAnxiety ossessionato dall'MMR
//      partyFear  ha paura di giocare in party col gruppo per non perdere MMR
//      ancientOneDay è salito ad Ancient per un giorno ed è ridisceso
//      xiuxian    gioca fino a tarda notte (修仙), con livello di 修仙
//      babysit    ha bisogno di protezione (保姆) per 30 minuti
//      milkAfk    a metà partita sparisce per dare il latte al figlio
//      scared     ha paura di combattere
//      streamer   fa dirette in prima persona
//      russianCommander  l'unico che riesce a dare ordini ai russi
//      drowCurse  non vince mai con Drow Ranger (小黑)
//      jinTarget  preso sempre in giro da 大金神
//      positions  gioca solo pos 1 o 3
//      tinyPool   pool di eroi minuscolo
//      jakiroOnly unico supporto: Jakiro (双头龙)
//      laneLoser  perde sempre la lane
//      threeAxes  "三板斧": gioca sempre gli stessi 3 eroi (barra con i ritratti)
//      drowArcana ha trovato l'arcana di Drow (小黑至宝) e gioca solo lei
//      drow15     dice di poter giocare Drow in ogni ruolo, da 1 a 5
//      noSupport  non ha mai giocato supporto
//      pingStudent una sera Ping大神 gli ha fatto la lezione e lui ha risposto solo "嗯嗯"
//      hardToRoast gioca bene: "il tribunale non trova di cosa accusarlo"
//      allNighter urla "stanotte si gioca fino all'alba" e scappa dopo 2-3 partite
//      loud       voce altissima, urla "干干干"
//      allHeroes  sa giocare qualunque eroe
//      tooGood    gioca bene: il tribunale fatica a trovare accuse
//      jinMidKiller ha distrutto 大金神 in mid
//      proSupport supporto di professione
//      pudgeGod   "屠夫叼霸天", si vanta del suo Pudge
//      bigBoss    capo milionario
//      pcOld      PC vecchio di 10 anni
//      wifeAway   gioca solo quando la moglie non c'è (meter "wifeAway" = ore di "libertà")
//      omg        ama la custom OMG
//      lowPrio    finisce in low priority (小黑屋) perché il PC non carica
//      pingBuddy  基友 inseparabile di Ping大神
//      lowRank    rango bassissimo
//      allPos1    gioca ogni eroe da pos 1
//      slarkBody  "小鱼人本体": Slark, più 骷髅王 e 死灵法师
//      pos4Slark  anche in pos 4 prende Slark e ruba il farm
//      jinHates   大金神 non lo sopporta
//      teletubby  conosciuto come "天线宝宝": giocarci insieme abbassa la media MMR della squadra
//      lowLevelGood nelle partite di basso livello se la cava
//      humbleBrag i "罪状" sono lodi travestite (colpevole di essere troppo forte)
//    arenaFarm:   true = nel 刀塔乱斗 è lui che farma i creep (gli altri li ignorano)
//    rankOverride: rank_tier mostrato al posto di quello di OpenDota
//    rankUnknown: true = nella tabella il rango è 未知
//    rankNote:    nota accanto al rango nella tabella (es. 小号)
//    arenaHero:   id dell'eroe con cui appare nel 刀塔乱斗 (altrimenti il più giocato della settimana)
//    heatTitle:   titolo personalizzato della tabella oraria
//    victim:     alias di un altro giocatore: pannello 克星 (solo dove batte lui)
//    nemesis:   alias di un altro giocatore: confronto 宿敌对比 (solo dove perde lui)
// ============================================================
window.TRIBUNALE_CONFIG = {
  siteName: "刀塔法庭",
  days: 7, // finestra di osservazione (giorni)
  players: [
    {
      steam64: "76561198073722385",
      alias: "大金神",
      accusa: "自封无敌中单",
      color: "#f2b632",
      bounty: "吹牛罪",
      persona: {
        meter: "brag",
        claimedRank: "超凡入圣",
        rival: "呆逼",
        traits: ["brag", "midKing", "kdaBrag", "blameTeam", "rigged", "selfMvp", "targeted", "lastPick", "trashTalk", "allNighter"],
      },
    },
    {
      steam64: "76561198092667598",
      alias: "蜗牛大神",
      accusa: "1-5号位全能大神",
      bio: "随便虐过大金神的“无敌中单”",
      note: "哎，实在没啥好黑的，打得没问题啊。",
      color: "#93c5fd",
      bounty: "太强罪",
      persona: {
        meter: "praise",
        victim: "大金神",
        alsoPraise: true,
        praiseFirst: true, // in cima alla pagina: 吹爆专区 (prima le lodi, poi le battute su 干干干)
        signatureExtra: [82, 11], // 绝活 sempre nel muro: 地卜师 (Meepo / Geomancer), 影魔 (Shadow Fiend)
        traits: ["allHeroes", "tooGood", "jinMidKiller", "humbleBrag"],
      },
    },
    {
      steam64: "76561198110591464",
      alias: "Ping大神",
      accusa: "DC首席理论家",
      color: "#8f7bff",
      bounty: "醉驾英雄罪",
      persona: {
        meter: "drunk",
        traits: ["theorist", "allRounder", "cantLastHit", "drunk", "smoker", "mmrAnxiety", "partyFear", "ancientOneDay", "xiuxian"],
      },
    },
    {
      steam64: "76561198070245875",
      alias: "大B神",
      accusa: "人称呆逼",
      color: "#4fc3f7",
      bounty: "畏战罪",
      persona: {
        meter: "babysit",
        arenaHero: 44, // 刀塔乱斗:幻影刺客 (PA)
        friendsScan: true, // partite nascoste: ricostruite dalle partite in gruppo con gli amici
        nemesis: "大金神",
        traits: ["babysit", "milkAfk", "scared", "streamer", "russianCommander", "drowCurse", "jinTarget", "positions", "tinyPool", "jakiroOnly", "laneLoser"],
      },
    },
    {
      steam64: "76561198072997187",
      alias: "Yoki大神",
      accusa: "小黑1-5号位",
      color: "#5eead4",
      bounty: "至宝炫耀罪",
      persona: {
        meter: "axes",
        alsoPraise: true,
        inventory: true, // scansione dell'inventario Dota 2 (至宝仓库)
        traits: ["threeAxes", "drowArcana", "drow15", "noSupport", "pingStudent", "hardToRoast"],
      },
    },
    {
      steam64: "76561198054177353",
      alias: "疯子大神",
      accusa: "职业辅助",
      bio: "屠夫叼霸天",
      color: "#fb923c",
      bounty: "十年不换电脑罪",
      persona: {
        meter: "wifeAway",
        arenaHero: 14, // 刀塔乱斗: 屠夫
        heatTitle: "老婆不在家的时段",
        traits: ["proSupport", "pudgeGod", "bigBoss", "pcOld", "wifeAway", "omg", "lowPrio"],
      },
    },
    {
      steam64: "76561198079480070",
      alias: "Kaiju大神*",
      accusa: "四号位小鱼人",
      color: "#38bdf8",
      bounty: "偷钱罪",
      persona: {
        meter: "fish",
        arenaHero: 93, // 刀塔乱斗: 小鱼人
        arenaFarm: true, // 刀塔乱斗: l'unico che va a picchiare i creep
        friendsScan: true, // partite nascoste: ricostruite dalle partite in gruppo con gli amici
        traits: ["pingBuddy", "lowRank", "allPos1", "slarkBody", "pos4Slark", "jinHates", "teletubby", "lowLevelGood"],
      },
    },
    {
      steam64: "76561198046980947",
      alias: "Soul大神",
      accusa: "本庭荣誉嘉宾",
      color: "#facc15",
      bounty: "刀塔传奇",
      // modalità elogio: solo partite vinte, nessuna presa in giro
      persona: { mode: "praise", meter: "praise" },
    },
    {
      steam64: "76561198084363077",
      alias: "大P神",
      accusa: "远古时代的超凡大神",
      color: "#cbd5e1",
      // monumento: non gioca più, pagina commemorativa (solo ironia affettuosa)
      persona: { mode: "legend", rival: "大金神" },
    },
    {
      steam64: "76561198977122789",
      alias: "辅助大神",
      accusa: "低分高能",
      bio: "低分局的救世主，辅助位的天花板",
      color: "#86efac",
      bounty: "太会辅助罪",
      // solo lodi; partite nascoste: ricostruite dalle partite con gli amici
      persona: { meter: "praise", praiseFirst: true, friendsScan: true, traits: ["humbleBrag"] },
    },
    {
      steam64: "76561198425331672",
      alias: "金神大腿",
      accusa: "开小号",
      bio: "大金神的大腿，金神一半的分都是靠他带上去的",
      color: "#f0abfc",
      bounty: "带飞大金神罪",
      persona: { rankNote: "小号", friendsScan: true, traits: ["threeAxes", "allNighter"] },
    },
    // { steam64: "7656119XXXXXXXXXX", alias: "Nome", accusa: "帕吉惯犯" },
  ],
};
