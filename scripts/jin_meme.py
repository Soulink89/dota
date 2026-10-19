# Meme GIF: 大金神 (eroe chibi) sale la scala dell'MMR, perde, 大P神 lo martella. Partite vere da OpenDota.
# Uso: python scripts/jin_meme.py   -> gif/jin-meme-<data>.gif per gli ultimi 3 giorni con partite
import io, os, datetime
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import jin_gif as base   # riusa download, nomi cinesi e il disegno di 大P神

W = H = 240
OUT = base.OUT
FONT = base.FONT
f = lambda s: ImageFont.truetype(FONT, s)
GOKU = {k: v.resize((int(v.width * .5), int(v.height * .5)), Image.LANCZOS) for k, v in
        (("idle", base.GOKU_IDLE), ("up", base.GOKU_UP), ("down", base.GOKU_DOWN))}
MEDAL = base.goal.resize((26, 26), Image.LANCZOS)

def chibi(hid):
    """eroe intero dal render ufficiale, con contorno bianco da sticker"""
    key = base.HEROES[str(hid)]["name"].replace("npc_dota_hero_", "")
    # immagine chibi fornita a mano (PNG con sfondo trasparente): gif/chibi/<nome_eroe>.png, es. windrunner.png, zuus.png, lina.png
    own = os.path.join(OUT, "chibi", f"{key}.png")
    if os.path.exists(own):
        im = Image.open(own).convert("RGBA")
        im = im.crop(im.getchannel("A").point(lambda a: 255 if a > 60 else 0).getbbox())
        return im.resize((int(im.width * 80 / im.height), 80), Image.LANCZOS)
    # eroe intero (render ufficiale, come nella prima versione) con contorno bianco da sticker
    im = base.hero_sprite(hid, 84)
    pad = 4
    big = Image.new("RGBA", (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0)); big.alpha_composite(im, (pad, pad))
    edge = big.getchannel("A").point(lambda a: 255 if a > 60 else 0).filter(ImageFilter.MaxFilter(5))
    out = Image.new("RGBA", big.size, (0, 0, 0, 0)); out.paste((255, 255, 255, 255), mask=edge)
    out.alpha_composite(big)
    return out

def meme_text(d, xy, t, size, fill="white"):
    d.text(xy, t, font=f(size), fill=fill, anchor="mm", stroke_width=max(2, size // 7), stroke_fill="black")

def bubble(d, x, y, t, tail=None, size=12):
    """nuvoletta da fumetto con la punta verso chi parla"""
    tw = d.textlength(t, font=f(size)); x0 = max(2, min(W - tw - 18, x - tw / 2 - 8)); x1 = x0 + tw + 16
    if tail:
        bx = max(x0 + 10, min(x1 - 10, tail[0])); by = y + 12 if tail[1] > y else y - 12
        d.polygon([(bx - 6, by), (bx + 6, by), tail], fill="white", outline="black")
    d.rounded_rectangle([x0, y - 12, x1, y + 12], 10, fill="white", outline="black", width=2)
    if tail: d.line([(bx - 5, by), (bx + 5, by)], fill="white", width=3)
    d.text((x0 + 8 + tw / 2, y), t, font=f(size), fill="black", anchor="mm")

# faccine ufficiali delle chat di Dota 2 (animate), scaricate in gif/emo/
def load_emo(name, size=34):
    p = os.path.join(base.ROOT, "assets", "emo", f"{name}.gif")
    if not os.path.exists(p): return [Image.new("RGBA", (size, size))]
    g = Image.open(p); fr = []
    for i in range(getattr(g, "n_frames", 1)):
        g.seek(i); fr.append(g.convert("RGBA").resize((size, size), Image.LANCZOS))
    return fr
EMO = {n: load_emo(n) for n in ["cool", "cocky", "flex", "rage", "cry", "salty", "facepalm", "fuming", "laugh", "troll", "axe_laugh", "devil"]}
EMO_WIN, EMO_LOSE, EMO_PDS = ["cocky", "cool", "flex"], ["rage", "cry", "salty", "facepalm", "fuming"], ["laugh", "troll", "axe_laugh", "devil"]
_bg = Image.open(os.path.join(base.ROOT, "assets", "arena-bg-m.jpg")).convert("RGB")
_bg = _bg.crop((int(_bg.width * .58 - _bg.height / 2), 0, int(_bg.width * .58 + _bg.height / 2), _bg.height)).resize((W, H), Image.LANCZOS)
BG = Image.blend(_bg, Image.new("RGB", (W, H), (255, 246, 220)), .5).convert("RGBA")  # scena di Dota schiarita: il testo resta leggibile

WIN_CAP = ["我果然是超凡", "看到没？实力", "上分就是这么简单", "MVP还是我", "我一个人carry", "超凡只是时间问题", "天梯前一百在向我招手", "对面看到我就投了"]
JIN_BRAG = ["我超凡水平", "看我这中单", "看我KDA", "我中单打爆一切", "中路反补了60刀", "对面中单被我打哭了", "这就是超凡的操作", "一个人带四个躺赢",
            "中路solo，对面直接挂机", "我补刀比你们看小地图还快", "这把我MVP，没悬念", "看我这经济，领先两件装备", "天梯前一百也就这样", "我随便玩玩就上分"]
LOSE_CAP = ["又系统局了", "队友有优势不推塔", "队友全sb", "我中路赢了，其他路全崩", "四个队友在挂机", "辅助不插眼", "匹配的都是什么人", "对面肯定是代练",
            "这把我被针对了", "我网卡了，不算", "核心不发育，怪我？", "队友抢我兵"]
TAUNT = ["真菜", "嘴巴超凡", "笑死我了", "哎呀你这波操作", "小金金，接锤！", "又吹？", "就这？", "超凡入圣？在梦里", "看锤！", "还吹吗", "这也叫中单？", "清醒点", "回去补兵吧", "我退役了都比你强"]

RANKS = [(2310, "中军", 4), (2464, "中军", 5), (2618, "统帅", 1), (2772, "统帅", 2), (2926, "统帅", 3), (3080, "传奇", 1), (3234, "传奇", 2), (3388, "传奇", 3),
         (3542, "传奇", 4), (3696, "传奇", 5), (3850, "万古流芳", 1), (4004, "万古流芳", 2)]
TIER = {"中军": 4, "统帅": 4, "传奇": 5, "万古流芳": 6}
def rank_of(m):
    r = [x for x in RANKS if x[0] <= m]
    return r[-1] if r else RANKS[0]
_medals = {}
def rank_medal(r, size=22):
    k = (r[1], r[2], size)
    if k not in _medals:
        ic = Image.open(io.BytesIO(base.get(f"https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_{TIER[r[1]]}.png", f"rk{TIER[r[1]]}.png", True))).convert("RGBA")
        st = Image.open(io.BytesIO(base.get(f"https://www.opendota.com/assets/images/dota2/rank_icons/rank_star_{r[2]}.png", f"st{r[2]}.png", True))).convert("RGBA")
        ic.alpha_composite(st.resize(ic.size)); _medals[k] = ic.resize((size, size), Image.LANCZOS)
    return _medals[k]

DEST = None  # se impostato, la GIF viene salvata qui (es. data/jin-meme.gif per il sito)

def make(day, games, mmr0=3500, STEP=25):
    seq = [mmr0]
    for g in games: seq.append(seq[-1] + (STEP if g["win"] else -STEP))
    lo = min(min(seq) - 2 * STEP, rank_of(min(seq))[0] - STEP); hi = max(seq) + 2 * STEP; rungs = (hi - lo) // STEP + 1
    LX, BOT = 150, 228; sp = 120 / max(1, rungs - 1)  # tutta l'altezza della scala
    cam = [mmr0]  # la "telecamera" segue 大金神: ogni partita è un salto ben visibile
    PX = 22
    y_of = lambda m: int(178 - (m - cam[0]) / STEP * PX)
    frames, durs, cache = [], [], {}
    tick = [0]
    def scene(mmr, ch, cy, top, bottom, rot=0, squash=False, gk="idle", gpos=(6, 40), bub=None, wl=(0, 0), gi=0, emo=None, bub2=None, arrow=None):
        im = BG.copy(); d = ImageDraw.Draw(im); tick[0] += 1
        d.rectangle([LX - 2, 66, LX + 2, 236], fill=(110, 70, 30)); d.rectangle([LX + 38, 66, LX + 42, 236], fill=(110, 70, 30))
        off = int(cam[0] / STEP * PX) % 14
        for yy in range(BOT + off, 72, -14):  # pioli che scorrono con la telecamera
            d.rectangle([LX, yy - 2, LX + 40, yy + 1], fill=(150, 95, 40))
            pass
        # al posto dei numeri: le soglie dei ranghi con la medaglia ufficiale
        for rk in RANKS:
            if 70 < y_of(rk[0]) < 236:
                yy = y_of(rk[0])
                d.line([(LX - 4, yy), (LX + 44, yy)], fill=(200, 120, 0), width=2)
                im.alpha_composite(rank_medal(rk), (LX + 50, yy - 18)); d = ImageDraw.Draw(im)
                d.text((LX + 61, yy + 10), f"{rk[1]}{rk[2]}", font=f(10), fill=(120, 60, 0), anchor="mm", stroke_width=2, stroke_fill="white")
        im.alpha_composite(MEDAL, (LX + 7, 52)); d = ImageDraw.Draw(im)
        d.text((LX + 46, 64), "超凡", font=f(10), fill=(200, 120, 0), anchor="lm")
        pass
        g = GOKU[gk]; im.alpha_composite(g, (int(gpos[0]), int(gpos[1]))); d = ImageDraw.Draw(im)
        if ch is not None:
            c = ch.resize((ch.width + 10, int(ch.height * .65))) if squash else ch
            if rot: c = c.rotate(rot, expand=True, resample=Image.BICUBIC)
            im.alpha_composite(c, (int(LX + 20 - c.width / 2), int(cy - c.height))); d = ImageDraw.Draw(im)
        if emo:  # (nome, x, y): faccina animata accanto a chi parla
            fr = EMO[emo[0]]; im.alpha_composite(fr[tick[0] % len(fr)], (int(emo[1]), int(emo[2]))); d = ImageDraw.Draw(im)
        if arrow:  # grande freccia: verde su quando vince, rossa giù quando perde
            ax, ay = 112, 150
            up = arrow == "up"; c = (34, 197, 94) if up else (239, 68, 68)
            s1 = -1 if up else 1
            pts = [(ax, ay + 26 * s1), (ax + 22, ay), (ax + 9, ay), (ax + 9, ay - 26 * s1), (ax - 9, ay - 26 * s1), (ax - 9, ay), (ax - 22, ay)]
            d.polygon(pts, fill=c, outline="black", width=3)
        if bub: bubble(d, *bub)
        if bub2: bubble(d, *bub2)
        meme_text(d, (W / 2, 16), top, 17)
        meme_text(d, (W / 2, 38), f"{rank_of(mmr)[1]}{rank_of(mmr)[2]}  ·  {wl[0]}胜{wl[1]}负", 12, (255, 230, 120))
        if bottom: meme_text(d, (78, H - 22), bottom, 16)
        return im.convert("RGB")
    def add(im, ms): frames.append(im); durs.append(ms)
    mmr, w, l = mmr0, 0, 0
    for gi, g in enumerate(games, 1):
        if g["hero"] not in cache: cache[g["hero"]] = chibi(g["hero"])
        cam[0] = mmr; ch = cache[g["hero"]]; y0 = y_of(mmr)
        top = f"金神超凡之旅 {g.get("date", "")} 第{gi}局"
        kda = f'{base.ZH.get(g["hero"], "")} {g["k"]}/{g["d"]}/{g["a"]}'
        add(scene(mmr, ch, y0, top, kda, wl=(w, l)), 700)
        if g["win"]:
            w += 1; y1 = y_of(mmr + STEP)
            for t in range(1, 5): add(scene(mmr, ch, y0 + (y1 - y0) * t / 4 + (4 if t % 2 else 0), top, "上分！", wl=(w, l), arrow="up"), 130)
            mmr += STEP
            head = (LX + 20, y1 - ch.height + 6)
            brag = JIN_BRAG[(w + len(day)) % len(JIN_BRAG)]
            for t in range(4):  # si vanta, con la faccina animata accanto alla testa
                add(scene(mmr, ch, y1, top, WIN_CAP[gi % len(WIN_CAP)], wl=(w, l), emo=(EMO_WIN[gi % 3], LX + 44, head[1] - 4),
                          bub=(LX - 40, max(62, head[1] - 26), brag, (head[0] - 14, head[1] + 4))), 170)
        else:
            l += 1; tz = TAUNT[(gi * 5 + len(day)) % len(TAUNT)]
            tx, ty = LX + 20 - GOKU["up"].width + 4, max(60, y0 - 80 - GOKU["up"].height // 2)
            for t in range(2, 3): add(scene(mmr, ch, y0, top, kda, gk="up", gpos=(6 + (tx - 6) * t / 2, 40 + (ty - 40) * t / 2), wl=(w, l)), 110)
            gh = GOKU["down"]
            for t in range(3):  # martellata: 大P神 ride e sfotte
                add(scene(mmr, ch, y0, top, "咚！", squash=True, gk="down", gpos=(tx, ty), wl=(w, l), emo=(EMO_PDS[gi % 4], tx - 6, ty + 30),
                          bub=(tx + gh.width / 2, max(60, ty - 4), tz, (tx + gh.width / 2, ty + 18))), 140)
            y1 = y_of(mmr - STEP)
            for t in range(1, 4): add(scene(mmr, ch, y0 + (y1 - y0) * t / 3, top, "咚！", rot=-t * 30, gpos=(6, 40), wl=(w, l), arrow="down"), 120)
            mmr -= STEP
            for t in range(4):  # a terra: si lamenta, con la faccina arrabbiata / in lacrime
                add(scene(mmr, ch, y1, top, "掉分了！", rot=-15, wl=(w, l), emo=(EMO_LOSE[gi % 5], LX + 46, y1 - ch.height),
                          bub=(LX - 40, max(62, y1 - ch.height - 20), LOSE_CAP[(l + len(day)) % len(LOSE_CAP)], (LX + 10, y1 - ch.height + 8))), 160)
    diff = mmr - mmr0
    add(scene(mmr, cache[games[-1]["hero"]], y_of(mmr), (f"今日 {w}胜{l}负" if not games[0].get("date") else f"{games[0]['date']}至今 {w}胜{l}负"), f"{rank_of(mmr0)[1]}{rank_of(mmr0)[2]} → {rank_of(mmr)[1]}{rank_of(mmr)[2]}", wl=(w, l),
              emo=(("laugh" if diff < 0 else "cool"), 10, 34 + GOKU["idle"].height), bub=(110, 34 + GOKU["idle"].height // 2, "大P神：" + ("明天继续挨锤" if diff < 0 else "运气而已"), (60, 40 + GOKU["idle"].height // 2))), 2500)
    path = DEST or os.path.join(OUT, f"jin-meme-{day}.gif")
    pal = [fr.quantize(colors=40, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for fr in frames]
    pal[0].save(path, save_all=True, append_images=pal[1:], duration=durs, loop=0, optimize=True)
    return path, len(frames), os.path.getsize(path)

if __name__ == "__main__":
    # GIF con le partite degli ultimi 2 giorni di gioco (giornata 06:00-06:00 Pechino). Lanciato ogni giorno da GitHub Actions.
    import json, sys
    ms = base.get(f"https://api.opendota.com/api/players/{base.ACCOUNT}/matches?date=10&project=hero_id&project=kills&project=deaths&project=assists&project=start_time&project=player_slot&project=radiant_win")
    games = []
    for x in sorted(ms, key=lambda x: x["start_time"]):
        day = datetime.datetime.utcfromtimestamp(x["start_time"] + 2 * 3600)
        games.append({"day": day.strftime("%Y-%m-%d"), "date": day.strftime("%m/%d"), "hero": x["hero_id"], "k": x["kills"], "d": x["deaths"],
                      "a": x["assists"], "win": (x["player_slot"] < 128) == x["radiant_win"]})
    last2 = sorted({g["day"] for g in games})[-2:]
    games = [g for g in games if g["day"] in last2]
    # arrivo = rango attuale vero (OpenDota), a metà della stella; si risale al punto di partenza ±25 a partita
    prof = json.loads(base.urllib.request.urlopen(base.urllib.request.Request(f"https://api.opendota.com/api/players/{base.ACCOUNT}", headers={"User-Agent": "Mozilla/5.0"}), timeout=60).read())
    tier = prof.get("rank_tier") or 52
    names = {4: "中军", 5: "传奇", 6: "万古流芳"}
    rk = next((r for r in RANKS if r[1] == names.get(tier // 10) and r[2] == tier % 10), (3234, "传奇", 2))
    end = rk[0] + 77
    start = end - sum(25 if g["win"] else -25 for g in games)
    if "--site" in sys.argv:
        DEST = os.path.join(base.ROOT, "data", "jin-meme.gif")
        json.dump({"days": last2, "games": len(games), "wins": sum(g["win"] for g in games), "losses": sum(not g["win"] for g in games),
                   "from": f"{rank_of(start)[1]}{rank_of(start)[2]}", "to": f"{rank_of(end)[1]}{rank_of(end)[2]}",
                   "updatedAt": int(datetime.datetime.now().timestamp() * 1000)},
                  open(os.path.join(base.ROOT, "data", "jin-meme.json"), "w", encoding="utf8"), ensure_ascii=False)
    print(make("-".join(d[5:] for d in last2), games, start))
