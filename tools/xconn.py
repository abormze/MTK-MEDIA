#!/usr/bin/env python3
"""Generate the XCONN-branded copy of the MTK app family into ./xconn."""
import json, os, re, shutil, sys
from PIL import Image, ImageDraw, ImageFont
import qrcode, qrcode.image.svg

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
X = os.path.join(R, 'xconn')
BASE = 'https://abormze.github.io/MTK-MEDIA'
XB = BASE + '/xconn'
LOGO = sys.argv[1] if len(sys.argv) > 1 else os.path.join(X, 'logo.jpg')
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
# key, android dir, MTK page dir, label, accent
APPS = [('media', 'android', 'mobile', 'MEDIA', '#ffcc00'),
        ('prime', 'android-prime', 'prime', 'PRIME', '#ffb020'),
        ('kids', 'android-kids', 'kids', 'KIDS', '#3ddc84'),
        ('classic', 'android-classic', 'classic', 'CLASSIC', '#de8723'),
        ('wwe', 'android-wwe', 'wwe', 'WWE', '#e11d2e')]
BRAND = re.compile(r'(?<!function )\bMTK\b(?![-(.])')

def brand(s): return BRAND.sub('XCONN', s)

def userscript(k, page):
    s = open(os.path.join(R, f'mtk-{k}.user.js'), encoding='utf-8').read()
    s = s.replace(f'{BASE}/mtk-{k}.user.js', f'{XB}/xconn-{k}.user.js')
    s = s.replace(f'{BASE}/{page}/', f'{XB}/{k}/')
    def logo(m):
        w, h, rest, nx = int(m.group(1)), m.group(2), m.group(3), int(m.group(4))
        return f'width="{w+100}" height="{h}" viewBox="0 0 {w+100} {h}"{rest}>XCONN</text><text x="{nx+100}"'
    s = re.sub(r'width="(\d+)" height="(\d+)" viewBox="0 0 \d+ \d+"(.*?)>MTK</text><text x="(\d+)"', logo, s)
    s = brand(s)
    s = s.replace('function gate(next) {', 'function gate(next) { return next();', 1)
    open(os.path.join(X, f'xconn-{k}.user.js'), 'w', encoding='utf-8').write(s)

def art(word, accent, W, H, logo_w, out):
    src = Image.open(LOGO).convert('RGB')
    src = src.crop((340, 535, 935, 742))
    lw = logo_w; lh = round(src.height * lw / src.width)
    img = Image.new('RGB', (W, H), '#000')
    f = ImageFont.truetype(FONT, max(12, round(lh * .42)))
    tw = ImageDraw.Draw(img).textlength(word, font=f)
    gap = round(lh * .18); th = f.size
    y0 = (H - lh - gap - th) // 2
    img.paste(src.resize((lw, lh), Image.LANCZOS), ((W - lw) // 2, y0))
    d = ImageDraw.Draw(img)
    d.text(((W - tw) / 2, y0 + lh + gap - round(th * .1)), word, font=f, fill=accent)
    img.save(out)

def android(k, adir, word, accent, store=False):
    src = os.path.join(R, adir); dst = os.path.join(X, adir)
    shutil.rmtree(dst, ignore_errors=True)
    shutil.copytree(src, dst, ignore=shutil.ignore_patterns('build', '.gradle', 'assets', '*.apk'))
    jold = os.path.join(dst, 'app/src/main/java/com/mtk', k)
    jnew = os.path.join(dst, 'app/src/main/java/com/xconn', k)
    os.makedirs(os.path.dirname(jnew), exist_ok=True)
    shutil.move(jold, jnew); shutil.rmtree(os.path.join(dst, 'app/src/main/java/com/mtk'))
    for root, _, files in os.walk(dst):
        for fn in files:
            if not fn.endswith(('.java', '.xml', '.gradle')): continue
            p = os.path.join(root, fn); s = open(p, encoding='utf-8').read(); o = s
            s = s.replace(f'com.mtk.{k}', f'com.xconn.{k}')
            if store:
                s = s.replace(f'{BASE}/store/', f'{XB}/store/').replace('(?i)^MTK\\\\s*', '(?i)^XCONN\\\\s*')
            else:
                s = s.replace(f'{BASE}/mtk-{k}.user.js', f'{XB}/xconn-{k}.user.js')
                s = s.replace(f'{BASE}/{APPD[k]}/version.json', f'{XB}/{k}/version.json')
                s = s.replace(f'"mtk-{k}.user.js"', f'"xconn-{k}.user.js"')
                s = s.replace(f'/../mtk-{k}.user.js', f'/../xconn-{k}.user.js')
            s = re.sub(r'\bMTK (?=[A-Z])', 'XCONN ', s)
            if fn == 'settings.gradle': s = s.replace("'MTK-", "'XCONN-")
            s = s.replace('android:label="MTK ', 'android:label="XCONN ')
            if fn == 'colors.xml': s = re.sub(r'(<color name="bg">)[^<]*', r'\g<1>#000000', s)
            if s != o: open(p, 'w', encoding='utf-8').write(s)
    res = os.path.join(dst, 'app/src/main/res')
    for n in ('ic_fg.xml', 'banner.xml'):
        q = os.path.join(res, 'drawable', n)
        if os.path.exists(q): os.remove(q)
    nd = os.path.join(res, 'drawable-nodpi'); os.makedirs(nd, exist_ok=True)
    art(word, accent, 432, 432, 250, os.path.join(nd, 'ic_fg.png'))
    art(word, accent, 640, 360, 420, os.path.join(nd, 'banner.png'))
    art(word, accent, 512, 512, 400, os.path.join(X, k, 'icon.png'))

def page(k, pdir, apk):
    s = open(os.path.join(R, pdir, 'index.html'), encoding='utf-8').read()
    s = s.replace(f'{BASE}/{pdir}/', f'{XB}/{k}/').replace(f'MTK-{apk}.apk', f'XCONN-{apk}.apk')
    s = re.sub(r'\s*<li>[^\n]*(?:كود|الكود)[^\n]*\d{6,}[^\n]*</li>', '', s)
    s = re.sub(r'<b>\d{6,}</b>', '', s)
    s = brand(s).replace('برمجة: محمد محاجنة', '')
    s = s.replace('<head>', '<head>\n<link rel="icon" href="icon.png">', 1)
    open(os.path.join(X, k, 'index.html'), 'w', encoding='utf-8').write(s)
    url = f'{XB}/{k}/XCONN-{apk}.apk'
    qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage, border=4).save(os.path.join(X, k, 'qr.svg'))
    v = json.load(open(os.path.join(R, pdir, 'version.json'), encoding='utf-8'))
    v['url'] = url; v['notes'] = brand(v.get('notes', ''))
    json.dump(v, open(os.path.join(X, k, 'version.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

APPD = {k: p for k, _, p, _, _ in APPS}
os.makedirs(X, exist_ok=True)
if LOGO != os.path.join(X, 'logo.jpg'): shutil.copy(LOGO, os.path.join(X, 'logo.jpg')); LOGO = os.path.join(X, 'logo.jpg')
for k, adir, pdir, word, acc in APPS:
    os.makedirs(os.path.join(X, k), exist_ok=True)
    userscript(k, pdir); android(k, adir, word, acc); page(k, pdir, word)
os.makedirs(os.path.join(X, 'store'), exist_ok=True)
android('store', 'android-store', 'STORE', '#ffcc00', store=True); page('store', 'store', 'STORE')
cat = json.load(open(os.path.join(R, 'store/apps.json'), encoding='utf-8'))
for a in cat:
    k = a['pkg'].split('.')[-1]
    a['name'] = brand(a['name']); a['pkg'] = f'com.xconn.{k}'; a['version'] = f'{XB}/{k}/version.json'
    for f in list(a):
        if isinstance(a[f], str) and f not in ('name', 'pkg', 'version'): a[f] = brand(a[f])
json.dump(cat, open(os.path.join(X, 'store/apps.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok')
