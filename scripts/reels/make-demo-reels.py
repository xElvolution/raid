"""Generate clearly labelled DEMO reels (540x960, 8 s, H.264) from REAL 1h price candles served by the RAID web app
(/api/market/ohlcv: GeckoTerminal / CoinGecko). No people, no faces, no voices. Usage: python3 make-demo-reels.py [base_url]
Writes ../../api/demo-reels/<coin>.mp4 and <coin>.json (the candles used, their source, and the fetch time)."""
import json, subprocess, sys, urllib.request, datetime
from PIL import Image, ImageDraw, ImageFont

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3410"
OUT = "../../api/demo-reels"
W, H, FPS, SECS = 540, 960, 24, 8
ARCH = "/usr/share/fonts/truetype/sand-box/google/Archivo Black/ArchivoBlack-Regular.ttf"
MONO = "/usr/share/fonts/truetype/sand-box/google/JetBrains Mono/JetBrainsMono-VariableFont_wght.ttf"
REELS = [
    {"coin": "PEPE", "raid": 3, "line": "2x", "color": (198, 255, 61), "hook": "FROG LEGION IS IN"},
    {"coin": "DOGE", "raid": 4, "line": "3x", "color": (51, 85, 255), "hook": "DOGE PACK SAYS 3X"},
    {"coin": "BRETT", "raid": 2, "line": "2x", "color": (122, 224, 255), "hook": "BRETT ON BASE"},
]
if len(sys.argv) > 2:  # one extra reel: COIN:RAID:LINE:HOOK (e.g. for the testnet E2E rehearsal), written as <COIN>-r<RAID>.mp4
    c, rid, line, hook = sys.argv[2].split(":", 3)
    REELS = [{"coin": c, "raid": int(rid), "line": line, "color": (198, 255, 61), "hook": hook, "name": f"{c}-r{rid}"}]
f = lambda p, s: ImageFont.truetype(p, s)

def fmt(p):
    if p >= 1: return f"${p:,.4f}"
    s = f"{p:.12f}".rstrip("0")
    return "$" + s[:min(len(s), 12)]

for r in REELS:
    data = json.load(urllib.request.urlopen(f"{BASE}/api/market/ohlcv?symbol={r['coin']}&tf=1h", timeout=30))
    closes = [c["c"] for c in data["candles"]][-72:]
    meta = {"coin": r["coin"], "source": data.get("source"), "tf": "1h", "fetched_at": datetime.datetime.now(datetime.timezone.utc).isoformat(), "candles": data["candles"][-72:], "label": "DEMO reel generated locally from real price candles"}
    json.dump(meta, open(f"{OUT}/{r.get('name', r['coin'])}.json", "w"))
    lo, hi = min(closes), max(closes)
    chg = (closes[-1] / closes[0] - 1) * 100
    x0, x1, y0, y1 = 36, W - 36, 330, 700
    pts = [(x0 + (x1 - x0) * i / (len(closes) - 1), y1 - (y1 - y0) * ((c - lo) / ((hi - lo) or 1))) for i, c in enumerate(closes)]
    proc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                             "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "26", "-movflags", "+faststart", f"{OUT}/{r.get('name', r['coin'])}.mp4"], stdin=subprocess.PIPE)
    n = FPS * SECS
    for k in range(n):
        t = k / n
        im = Image.new("RGB", (W, H), (4, 6, 26)); d = ImageDraw.Draw(im)
        for gx in range(0, W, 24):
            for gy in range(0, H, 24): d.point((gx, gy), fill=(28, 37, 88))
        d.rounded_rectangle((24, 28, 170, 66), 10, fill=(255, 92, 122)); d.text((38, 36), "DEMO REEL", font=f(ARCH, 20), fill=(255, 255, 255))
        d.text((W - 24, 40), "RAID", font=f(ARCH, 26), fill=(198, 255, 61), anchor="ra")
        d.text((36, 120), f"${r['coin']}", font=f(ARCH, 76), fill=(243, 245, 255))
        d.text((36, 214), fmt(closes[-1]), font=f(MONO, 34), fill=(243, 245, 255))
        d.text((36, 258), f"{chg:+.2f}% · 72h", font=f(MONO, 26), fill=(198, 255, 61) if chg >= 0 else (255, 92, 122))
        upto = max(2, int(len(pts) * min(1, t * 1.6)))
        d.line(pts[:upto], fill=r["color"], width=5, joint="curve")
        lx, ly = pts[upto - 1]; d.ellipse((lx - 9, ly - 9, lx + 9, ly + 9), fill=r["color"])
        if t > 0.55:
            a = min(1, (t - 0.55) / 0.15)
            mult = {"1.5x": 1.5, "2x": 2, "3x": 3}[r["line"]]
            d.rounded_rectangle((36, y1 + 22, x1, y1 + 62), 9, fill=(198, 255, 61)); d.text((50, y1 + 29), f"SELL LINE {r['line']} = {fmt(closes[-1] * mult)} IF BOUGHT NOW", font=f(ARCH, 17), fill=(10, 26, 0))
            d.text((36, 790), r["hook"], font=f(ARCH, int(40 * (0.9 + 0.1 * a))), fill=(243, 245, 255))
            d.text((36, 842), f"Back raid #{r['raid']} on RAID · {r['line']} line", font=f(MONO, 24), fill=(140, 147, 196))
        d.text((36, H - 52), f"Real 1h price · {data.get('source')} · {datetime.date.today().isoformat()}", font=f(MONO, 18), fill=(90, 97, 150))
        d.text((36, H - 28), "Demo content made by the RAID team. Not advice.", font=f(MONO, 16), fill=(90, 97, 150))
        proc.stdin.write(im.tobytes())
    proc.stdin.close(); proc.wait()
    print(r["coin"], "ok")
