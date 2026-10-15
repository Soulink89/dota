// ============================================================
//  GLI IMPUTATI
//  Per aggiungere un giocatore basta aggiungere una riga qui sotto
//  con il suo Steam64 ID (quello nell'URL steamcommunity.com/profiles/...).
//  "alias" e "accusa" sono opzionali: se mancano si usa il nome Steam.
//
//  "color" (opzionale): colore personale della pagina. "bounty": il reato sul manifesto 通缉令.
//  "persona" (opzionale) attiva battute su misura, 语录 e 专项调查:
//    meter:       indice al posto del voto: "brag" (吹牛/甩锅指数), "drunk" (上头指数), "babysit" (minuti di 保姆), "axes" (三板斧浓度), "twoGames" (partite per sera); assente = voto su 100
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
//      jinTarget  preso sempre in giro da 金神
//      positions  gioca solo pos 1 o 3
//      tinyPool   pool di eroi minuscolo
//      jakiroOnly unico supporto: Jakiro (双头龙)
//      laneLoser  perde sempre la lane
//      threeAxes  "三板斧": gioca sempre gli stessi 3 eroi (barra con i ritratti)
//      drowArcana ha trovato l'arcana di Drow (小黑至宝) e gioca solo lei
//      drow15     dice di poter giocare Drow in ogni ruolo, da 1 a 5
//      noSupport  non ha mai giocato supporto
//      pingStudent una sera Ping神 gli ha fatto la lezione e lui ha risposto solo "嗯嗯"
//      hardToRoast gioca bene: "il tribunale non trova di cosa accusarlo"
//      twoAndGo   dice "gioco due partite e vado" (e invece no)
//      loud       voce altissima, urla "干干干"
//      allHeroes  sa giocare qualunque eroe
//      tooGood    gioca bene: il tribunale fatica a trovare accuse
//      jinMidKiller ha distrutto 金神 in mid
//    victim:      alias di un altro giocatore: pannello 克星 (solo dove batte lui)
//    nemesis:   alias di un altro giocatore: confronto 宿敌对比 (solo dove perde lui)
// ============================================================
window.TRIBUNALE_CONFIG = {
  siteName: "刀塔法庭",
  days: 7, // finestra di osservazione (giorni)
  players: [
    {
      steam64: "76561198073722385",
      alias: "金神",
      accusa: "自封无敌中单",
      color: "#f2b632",
      bounty: "吹牛罪",
      persona: {
        meter: "brag",
        claimedRank: "超凡入圣",
        rival: "呆逼",
        traits: ["brag", "midKing", "kdaBrag", "blameTeam", "rigged", "selfMvp", "targeted", "lastPick", "trashTalk"],
      },
    },
    {
      steam64: "76561198110591464",
      alias: "Ping神",
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
      alias: "B神",
      accusa: "人称呆逼",
      color: "#4fc3f7",
      bounty: "畏战罪",
      persona: {
        meter: "babysit",
        nemesis: "金神",
        traits: ["babysit", "milkAfk", "scared", "streamer", "russianCommander", "drowCurse", "jinTarget", "positions", "tinyPool", "jakiroOnly", "laneLoser"],
      },
    },
    {
      steam64: "76561198072997187",
      alias: "Yoki神",
      accusa: "小黑1-5号位",
      color: "#5eead4",
      bounty: "至宝炫耀罪",
      persona: {
        meter: "axes",
        traits: ["threeAxes", "drowArcana", "drow15", "noSupport", "pingStudent", "hardToRoast"],
      },
    },
    {
      steam64: "76561198092667598",
      alias: "南极神",
      accusa: "两把就走（并没有）",
      color: "#93c5fd",
      bounty: "两把诈骗罪",
      persona: {
        meter: "twoGames",
        victim: "金神",
        traits: ["twoAndGo", "loud", "allHeroes", "tooGood", "jinMidKiller"],
      },
    },
    // { steam64: "7656119XXXXXXXXXX", alias: "Nome", accusa: "帕吉惯犯" },
  ],
};
