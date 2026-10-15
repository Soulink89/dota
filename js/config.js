// ============================================================
//  GLI IMPUTATI
//  Per aggiungere un giocatore basta aggiungere una riga qui sotto
//  con il suo Steam64 ID (quello nell'URL steamcommunity.com/profiles/...).
//  "alias" e "accusa" sono opzionali: se mancano si usa il nome Steam.
//
//  "persona" (opzionale) attiva battute su misura e la sezione 吹牛鉴定:
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
// ============================================================
window.TRIBUNALE_CONFIG = {
  siteName: "刀塔法庭",
  days: 7, // finestra di osservazione (giorni)
  players: [
    {
      steam64: "76561198073722385",
      alias: "金神",
      accusa: "自封无敌中单",
      persona: {
        claimedRank: "超凡入圣",
        rival: "呆逼",
        traits: ["brag", "midKing", "kdaBrag", "blameTeam", "rigged", "selfMvp", "targeted", "lastPick", "trashTalk"],
      },
    },
    // { steam64: "7656119XXXXXXXXXX", alias: "Nome", accusa: "帕吉惯犯" },
  ],
};
