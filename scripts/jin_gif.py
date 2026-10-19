# GIF scherzosa: 大金神 sale la scala dell'MMR, perde, cade, e 大P神 lo martella.
# Uso: python scripts/jin_gif.py   (crea gif/jin-<data>.gif per gli ultimi giorni con partite)
import json, math, os, io, datetime, urllib.request
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "gif")
CACHE = os.path.join(ROOT, "gif", ".cache")
os.makedirs(CACHE, exist_ok=True)
ACCOUNT = 113456657
W, H = 480, 360
# font cinese: Windows in locale, Noto CJK sui server di GitHub (apt: fonts-noto-cjk)
FONT = next((p for p in ["C:/Windows/Fonts/msyhbd.ttc", "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc", "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"] if os.path.exists(p)), "C:/Windows/Fonts/msyhbd.ttc")
f = lambda s: ImageFont.truetype(FONT, s)

def get(url, name=None, binary=False):
    p = os.path.join(CACHE, name) if name else None
    if p and os.path.exists(p):
        return open(p, "rb").read() if binary else json.load(open(p, encoding="utf8"))
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    data = urllib.request.urlopen(req, timeout=60).read()
    if p: open(p, "wb").write(data)
    return data if binary else json.loads(data)

HEROES = get("https://cdn.jsdelivr.net/npm/dotaconstants@latest/build/heroes.json", "heroes.json")
ZH = {}
for line in open(os.path.join(ROOT, "js", "heroes-zh.js"), encoding="utf8"):
    import re
    for k, v in re.findall(r'"?(\d+)"?\s*:\s*"([^"]+)"', line): ZH[int(k)] = v

def hero_sprite(hid, h=150):
    key = HEROES[str(hid)]["name"].replace("npc_dota_hero_", "")
    raw = get(f"https://cdn.cloudflare.steamstatic.com/apps/dota2/videos/dota_react/heroes/renders/{key}.png", f"r_{key}.png", True)
    im = Image.open(io.BytesIO(raw)).convert("RGBA")
    im = im.crop(im.getchannel("A").point(lambda a: 255 if a > 60 else 0).getbbox())  # taglia anche la trasparenza quasi invisibile
    return im.resize((int(im.width * h / im.height), h), Image.LANCZOS)

# ---------- 大P神 (Goku con ali, aureola, martello), disegnato in 4x e rimpicciolito ----------
def goku(hammer_angle=18, scale=0.62):
    S = 4
    im = Image.new("RGBA", (200 * S, 224 * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    P = lambda pts: [(x * S, y * S) for x, y in pts]
    def wing(m):
        pts = [(78,122),(46,96),(18,98),(4,74),(24,78),(32,70),(44,74),(30,58),(42,50),(54,62),(46,44),(62,40),(68,58),(70,46),(84,48),(82,68)]
        pts2 = [(76,134),(48,132),(24,124),(10,106),(30,110),(40,106),(50,110),(40,98),(52,92),(62,104),(58,92),(72,92),(74,106)]
        for pp, c in ((pts, (255,255,255,255)), (pts2, (241,245,249,255))):
            if m: pp = [(200 - x, y) for x, y in pp]
            d.polygon(P(pp), fill=c, outline=(203,213,225,255))
    wing(False); wing(True)
    d.ellipse([74*S, 6*S, 126*S, 18*S], outline=(253,224,71,255), width=4*S)
    d.polygon(P([(62,176),(138,176),(146,206),(108,208),(100,192),(92,208),(54,206)]), fill=(249,115,22,255))
    d.rectangle([54*S,204*S,94*S,218*S], fill=(29,78,216,255)); d.rectangle([106*S,204*S,146*S,218*S], fill=(29,78,216,255))
    d.polygon(P([(62,112),(100,100),(138,112),(144,172),(100,182),(56,172)]), fill=(249,115,22,255))
    d.polygon(P([(86,104),(100,132),(114,104)]), fill=(30,58,138,255))
    d.rectangle([58*S,166*S,142*S,178*S], fill=(29,78,216,255))
    d.ellipse([116*S,114*S,132*S,130*S], fill="white", outline=(30,58,138,255), width=S)
    d.text((124*S,122*S), "悟", font=ImageFont.truetype(FONT, 10*S), fill="black", anchor="mm")
    skin = (252,217,182,255)
    d.rounded_rectangle([56*S,136*S,142*S,151*S], 7*S, fill=skin, outline=(217,154,108,255))
    d.rounded_rectangle([58*S,148*S,144*S,163*S], 7*S, fill=skin, outline=(217,154,108,255))
    d.rectangle([128*S,135*S,140*S,152*S], fill=(29,78,216,255)); d.rectangle([60*S,147*S,72*S,164*S], fill=(29,78,216,255))
    d.rectangle([91*S,94*S,109*S,108*S], fill=(242,185,138,255))
    d.ellipse([69*S,70*S,81*S,82*S], fill=(242,185,138,255)); d.ellipse([119*S,70*S,131*S,82*S], fill=(242,185,138,255))
    d.ellipse([76*S,47*S,124*S,101*S], fill=skin)
    d.polygon(P([(70,72),(50,62),(66,56),(42,40),(64,40),(48,18),(74,30),(74,4),(92,26),(104,0),(112,26),(130,6),(128,32),(154,20),(138,44),(160,46),(136,58),(152,68),(130,70),(128,50),(100,46),(74,50)]), fill=(20,20,28,255))
    d.polygon(P([(78,56),(84,70),(90,52),(97,68),(103,50),(110,66),(116,52),(120,68),(126,56),(114,42),(98,42),(84,44)]), fill=(20,20,28,255))
    d.line(P([(83,66),(97,71)]), fill=(20,20,28,255), width=3*S); d.line(P([(117,66),(103,71)]), fill=(20,20,28,255), width=3*S)
    d.polygon(P([(86,73),(97,75),(95,80),(87,79)]), fill="white"); d.polygon(P([(114,73),(103,75),(105,80),(113,79)]), fill="white")
    d.ellipse([91*S,75*S,95*S,79*S], fill="black"); d.ellipse([105*S,75*S,109*S,79*S], fill="black")
    d.arc([93*S,82*S,109*S,94*S], 20, 160, fill=(124,45,18,255), width=2*S)
    # martello, ruotato attorno alla mano (142,150)
    hm = Image.new("RGBA", im.size, (0, 0, 0, 0)); hd = ImageDraw.Draw(hm)
    hd.rounded_rectangle([138*S,60*S,147*S,152*S], 3*S, fill=(139,90,43,255), outline=(91,58,26,255), width=S)
    hd.rounded_rectangle([116*S,30*S,170*S,64*S], 6*S, fill=(156,163,175,255), outline=(51,65,85,255), width=2*S)
    hd.rectangle([116*S,38*S,170*S,45*S], fill=(229,231,235,255))
    hd.rounded_rectangle([112*S,28*S,120*S,66*S], 3*S, fill=(100,116,139,255)); hd.rounded_rectangle([166*S,28*S,174*S,66*S], 3*S, fill=(100,116,139,255))
    hm = hm.rotate(-hammer_angle, center=(142.5*S, 150*S), resample=Image.BICUBIC)
    im.alpha_composite(hm)
    d = ImageDraw.Draw(im); d.ellipse([134*S,142*S,150*S,158*S], fill=skin, outline=(217,154,108,255))
    return im.resize((int(200*scale), int(224*scale)), Image.LANCZOS)

GOKU_IDLE, GOKU_UP, GOKU_DOWN = goku(18), goku(-45), goku(115)
medal = Image.open(io.BytesIO(get("https://www.opendota.com/assets/images/dota2/rank_icons/rank_icon_7.png", "rank7.png", True))).convert("RGBA")
star = Image.open(io.BytesIO(get("https://www.opendota.com/assets/images/dota2/rank_icons/rank_star_3.png", "star3.png", True))).convert("RGBA")
medal.alpha_composite(star.resize(medal.size)); goal = medal.resize((44, 44), Image.LANCZOS); medal = goal

bg = Image.open(os.path.join(ROOT, "assets", "arena-bg.jpg")).convert("RGB")
bg = bg.resize((int(bg.width * H / bg.height * 1.15), int(H * 1.15)), Image.LANCZOS)
bx = int(bg.width * 0.55 - W / 2); bg = bg.crop((bx, 30, bx + W, 30 + H))
dark = Image.new("RGB", (W, H), (8, 10, 20)); bg = Image.blend(bg, dark, 0.35).convert("RGBA")

TAUNTS = ["小金金，接锤！", "小金金，又吹？", "超凡入圣？", "这也叫中单？", "段位是吹出来的？", "看锤！", "系统局？锤也是系统给的", "小金金，跪下",
          "清醒点，小金金", "还吹吗", "MVP？挨锤冠军", "回去补兵吧"]
JIN = ["队友太菜了", "系统局！", "我被针对了", "这把不算", "我网卡了", "对面是代练"]

def outline_text(d, xy, text, font, fill, anchor="mm", sw=3):
    d.text(xy, text, font=font, fill=fill, anchor=anchor, stroke_width=sw, stroke_fill=(0, 0, 0))

def bubble(d, x, y, text, font, border=(253,224,71)):
    tw = d.textlength(text, font=font)
    x0 = max(4, min(W - tw - 24, x - tw / 2 - 10))
    d.rounded_rectangle([x0, y - 14, x0 + tw + 20, y + 14], 12, fill="white", outline=border, width=2)
    d.text((x0 + 10 + tw / 2, y), text, font=font, fill="black", anchor="mm")

def make(day, games, mmr0):
    STEP = 25
    seq = []
    m = mmr0
    for g in games:
        m += STEP if g["win"] else -STEP
        seq.append(m)
    lo, hi = min([mmr0] + seq), max([mmr0] + seq)
    rungs = (hi - lo) // STEP + 1
    LX, BOT = 300, 345
    sp = min(28, (BOT - 175) // max(1, rungs - 1)) if rungs > 1 else 28
    y_of = lambda mm: BOT - (mm - lo) // STEP * sp - 6
    frames, durs = [], []
    sprites = {}
    def scene(mmr_shown, hero_img, hx, hy, k, gi, rot=0, goku_pos=(18, 70), goku_img=GOKU_IDLE, texts=(), wl=(0, 0), extra=None):
        im = bg.copy(); d = ImageDraw.Draw(im)
        # scala
        top = 62
        # obiettivo in cima: 超凡入圣 (~5420 MMR), lontanissimo
        im.alpha_composite(goal, (LX + 10, 34))
        d = ImageDraw.Draw(im)
        outline_text(d, (LX + 4, 50), "目标：超凡入圣", f(12), (253, 224, 71), anchor="rm", sw=2)
        outline_text(d, (LX + 4, 66), "≈5420 MMR", f(11), (253, 224, 71), anchor="rm", sw=2)
        for yy in range(84, y_of(hi) - 4, 8): d.line([(LX + 32, yy), (LX + 32, yy + 4)], fill=(253, 224, 71), width=2)
        outline_text(d, (LX + 72, 64), f"还差 {5420 - mmr_shown}", f(12), (248, 113, 113), anchor="lm", sw=2)
        d.rectangle([LX - 3, top, LX + 3, BOT + 8], fill=(120, 72, 30)); d.rectangle([LX + 61, top, LX + 67, BOT + 8], fill=(120, 72, 30))
        for r in range(rungs):
            yy = BOT - r * sp - 6 + 6
            d.rectangle([LX, yy - 2, LX + 64, yy + 2], fill=(160, 100, 45))
            d.text((LX + 72, yy), str(lo + r * STEP), font=f(11), fill=(253, 230, 138), anchor="lm", stroke_width=2, stroke_fill="black")
        # 大P神 + medaglia
        gx, gy = goku_pos
        im.alpha_composite(medal, (int(gx + goku_img.width / 2 - 22), int(gy - 40)))
        im.alpha_composite(goku_img, (int(gx), int(gy)))
        d = ImageDraw.Draw(im)
        outline_text(d, (gx + goku_img.width / 2, gy - 4), "大P神", f(12), (253, 224, 71), sw=2)
        # eroe di 大金神
        if hero_img is not None:
            hi_ = hero_img.rotate(rot, expand=True, resample=Image.BICUBIC) if rot else hero_img
            im.alpha_composite(hi_, (int(hx - hi_.width / 2), int(hy - hi_.height)))
            d = ImageDraw.Draw(im)
            if k: outline_text(d, (hx, hy - hero_img.height - 26), "大金神", f(13), (242, 182, 50), sw=2); outline_text(d, (hx, hy - hero_img.height - 10), k, f(13), "white", sw=2)
        # barra in alto
        d.rectangle([0, 0, W, 30], fill=(10, 12, 20, 230))
        d.text((8, 15), f"{day}", font=f(12), fill=(203, 213, 225), anchor="lm")
        d.text((W / 2, 15), f"MMR {mmr_shown}", font=f(18), fill=(253, 224, 71), anchor="mm")
        d.text((W - 8, 15), f"第{gi}/{len(games)}局  {wl[0]}胜{wl[1]}负", font=f(12), fill=(203, 213, 225), anchor="rm")
        for t in texts: t(d)
        if extra: extra(im)
        return im.convert("RGB")
    def add(im, ms): frames.append(im); durs.append(ms)

    mmr, wins, losses = mmr0, 0, 0
    title = bg.copy(); td = ImageDraw.Draw(title)
    outline_text(td, (W / 2 + 60, 120), "大金神的上分之路", f(30), (242, 182, 50))
    outline_text(td, (W / 2 + 60, 165), f"{day} · 共{len(games)}局", f(18), "white")
    outline_text(td, (W / 2 + 60, 195), "目标：超凡入圣", f(18), (253, 224, 71))
    outline_text(td, (W / 2 + 60, 228), "（MMR为估算：赢+25 输−25）", f(13), (203, 213, 225), sw=2)
    title.alpha_composite(GOKU_IDLE, (18, 70)); add(title.convert("RGB"), 1600)
    for gi, g in enumerate(games, 1):
        if g["hero"] not in sprites: sprites[g["hero"]] = hero_sprite(g["hero"], 74)
        sp_img = sprites[g["hero"]]
        y0 = y_of(mmr); hx = LX + 32
        k = f'{ZH.get(g["hero"], "")} {g["k"]}/{g["d"]}/{g["a"]}'
        # entra in scena / prepara
        for t in range(1):
            add(scene(mmr, sp_img, hx, y0, k, gi, wl=(wins, losses),
                      texts=[lambda d: outline_text(d, (120, 300), f"第{gi}局 · {ZH.get(g['hero'], '')}", f(18), "white")]), 700)
        if g["win"]:
            wins += 1
            y1 = y_of(mmr + 25)
            for t in range(1, 7):
                yy = y0 + (y1 - y0) * t / 6 + (4 if t % 2 else 0)
                add(scene(mmr, sp_img, hx, yy, k, gi, wl=(wins, losses)), 110)
            mmr += 25
            for t in range(1):
                add(scene(mmr, sp_img, hx, y1, k, gi, wl=(wins, losses), texts=[lambda d: outline_text(d, (120, 300), "胜利 +25", f(26), (74, 222, 128))]), 1000)
        else:
            losses += 1
            taunt = TAUNTS[(gi * 7 + len(day)) % len(TAUNTS)]
            tx, ty = hx - GOKU_UP.width - 20, max(40, y0 - GOKU_UP.height + 10)
            for t in range(1, 5):  # 大P神 scende
                gx = 18 + (tx - 18) * t / 4; gy = 70 + (ty - 70) * t / 4
                add(scene(mmr, sp_img, hx, y0, k, gi, goku_pos=(gx, gy), goku_img=GOKU_UP, wl=(wins, losses),
                          texts=[lambda d: bubble(d, gx + 70, gy - 52, taunt, f(14))]), 80)
            for t in range(4):  # martellata
                squash = sp_img.resize((sp_img.width + 14, int(sp_img.height * 0.7)))
                add(scene(mmr, squash if t < 2 else sp_img, hx, y0, k, gi, goku_pos=(tx, ty), goku_img=GOKU_DOWN, wl=(wins, losses),
                          texts=[lambda d: outline_text(d, (hx + 40, y0 - 70), "咚！", f(34), (251, 146, 60)), lambda d: bubble(d, tx + 70, ty - 52, taunt, f(14))]), 120)
            y1 = y_of(mmr - 25)
            ouch = JIN[gi % len(JIN)]
            for t in range(1, 7):  # cade giù di un gradino, ruotando
                yy = y0 + (y1 - y0) * min(1, t / 4) - (8 if t == 5 else 0)
                gx = tx + (18 - tx) * t / 6; gy = ty + (70 - ty) * t / 6
                add(scene(mmr - (25 if t > 3 else 0), sp_img, hx - t * 2, yy, k, gi, rot=(-t * 20 if t < 5 else -24), goku_pos=(gx, gy), wl=(wins, losses),
                          texts=[lambda d: outline_text(d, (120, 300), "失败 −25", f(26), (248, 113, 113)), lambda d: bubble(d, hx, max(46, y1 - 150), ouch, f(13), (242, 182, 50))]), 90)
            mmr -= 25
            add(scene(mmr, sp_img, hx, y1, k, gi, wl=(wins, losses), texts=[lambda d: bubble(d, hx, max(46, y1 - 150), ouch, f(13), (242, 182, 50))]), 500)
    end = scene(mmr, None, 0, 0, None, len(games), wl=(wins, losses))
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(ov).rounded_rectangle([110, 120, 400, 265], 14, fill=(0, 0, 0, 170))
    end = Image.alpha_composite(end.convert("RGBA"), ov).convert("RGB")
    ed = ImageDraw.Draw(end)
    diff = mmr - mmr0
    outline_text(ed, (255, 150), f"今日 {wins}胜{losses}负", f(28), "white")
    outline_text(ed, (255, 195), f"MMR {'+' if diff >= 0 else '−'}{abs(diff)}", f(30), (74, 222, 128) if diff >= 0 else (248, 113, 113))
    outline_text(ed, (255, 240), "大P神：小金金，明天继续挨锤" if diff < 0 else "大P神：运气好而已，小金金", f(15), (253, 224, 71), sw=2)
    add(end, 3000)
    path = os.path.join(OUT, f"jin-{day}.gif")
    pal = [fr.resize((360, 270), Image.LANCZOS).quantize(colors=64, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for fr in frames]
    pal[0].save(path, save_all=True, append_images=pal[1:], duration=durs, loop=0, optimize=True, disposal=1)
    return path, len(frames), os.path.getsize(path)

if __name__ == "__main__":
    ms = get(f"https://api.opendota.com/api/players/{ACCOUNT}/matches?date=4&project=hero_id&project=kills&project=deaths&project=assists&project=start_time&project=player_slot&project=radiant_win")
    days = {}
    for x in sorted(ms, key=lambda x: x["start_time"]):
        day = datetime.datetime.utcfromtimestamp(x["start_time"] + 2 * 3600).strftime("%Y-%m-%d")  # giornata 06:00-06:00 Pechino
        days.setdefault(day, []).append({"hero": x["hero_id"], "k": x["kills"], "d": x["deaths"], "a": x["assists"], "win": (x["player_slot"] < 128) == x["radiant_win"]})
    for day in sorted(days)[-3:]:
        print(make(day, days[day], 3500))  # ~传奇3
