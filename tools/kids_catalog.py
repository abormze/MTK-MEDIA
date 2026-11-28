#!/usr/bin/env python3
"""Build kids/cat.json: dimakids/arabic-toons (d), spacepowerfan (f), mycima (m), cartoontime (t), egydead (e).
mycima/egydead sit behind Cloudflare, so their lists come from kids/src/*.json (refreshed by browser crawl)."""
import concurrent.futures as cf, html, json, re, sys, time, urllib.request, urllib.parse, os

UA = 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36'
OUT = os.path.join(os.path.dirname(__file__), '..', 'kids', 'cat.json')


def get(url, tries=3):
    for i in range(tries):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30)
            return r.read().decode('utf-8', 'replace'), r.headers
        except Exception as e:
            err = e
            time.sleep(2 + i * 3)
    raise err


DK_A = re.compile(r'<a href="([^"]+?-(\d+)-(anime|movies)-streaming\.html)" title="([^"]+)">\s*<div class="series-item-swiper">.*?<img src="([^"]+)"', re.S)


def dk_page(base, page, n):
    for host in ('https://www.dimakids.com/', 'https://arabic-toons.com/'):
        try:
            s, _ = get(host + page + ('?next=%d' % n if n else ''))
            return [(u, i, kind, html.unescape(t).strip(), img) for u, i, kind, t, img in DK_A.findall(s)], s
        except Exception:
            continue
    return [], ''


def dimakids():
    out, seen = [], set()
    for page, mv in (('cartoon.php', False), ('movies.php', True)):
        first, s = dk_page(None, page, 0)
        last = max([int(x) for x in re.findall(r'next=(\d+)', s)] or [0])
        with cf.ThreadPoolExecutor(8) as ex:
            pages = [first] + [r[0] for r in ex.map(lambda n: dk_page(None, page, n), range(1, last + 1))]
        for items in pages:
            for u, i, kind, t, img in items:
                if i in seen:
                    continue
                seen.add(i)
                out.append({'k': 'd', 'id': i, 't': re.sub(r'^فيلم\s+', '', t) if mv else t, 'u': u, 'img': img, 'mv': kind == 'movies', 'g': [], 'age': 7})
    return out


SPF = 'https://spacepowerfan.com/wp-json/wp/v2/'
KIDS_G = re.compile(r'kids|أطفال|عائلي|family|childcare', re.I)


def spacepowerfan():
    genres = {}
    s, _ = get(SPF + 'genre?per_page=100&_fields=id,name')
    for g in json.loads(s):
        genres[g['id']] = html.unescape(g['name'])
    out = []
    for typ in ('cartoon', 'anime', 'series', 'movie'):
        page = 1
        while True:
            try:
                s, h = get(SPF + typ + '?per_page=100&page=%d&_fields=id,link,title,excerpt,genre,class_list,yoast_head_json.og_image,release_year' % page)
            except Exception:
                break
            rows = json.loads(s)
            for r in rows:
                cls = ' '.join(r.get('class_list') or [])
                if 'audio-dubbed' not in cls and typ != 'cartoon':
                    continue
                gs = [genres.get(g, '') for g in r.get('genre') or []]
                ar = [g for g in gs if re.match(r'^[\u0600-\u06ff ]{3,14}$', g)]
                img = ((r.get('yoast_head_json') or {}).get('og_image') or [{}])[0].get('url', '')
                desc = re.sub(r'<[^>]+>|\s+', ' ', html.unescape((r.get('excerpt') or {}).get('rendered', ''))).strip()[:260]
                out.append({'k': 'f', 'id': str(r['id']), 't': html.unescape(r['title']['rendered']).strip(), 'u': urllib.parse.urlparse(r['link']).path,
                            'img': img, 'mv': typ == 'movie', 'g': ar[:3], 'desc': desc,
                            'age': 7 if typ == 'cartoon' or any(KIDS_G.search(g) for g in gs) else 13})
            if page >= int(h.get('X-WP-TotalPages') or 1):
                break
            page += 1
    return out


SRC = os.path.join(os.path.dirname(__file__), '..', 'kids', 'src')
PAGES = 'https://abormze.github.io/MTK-MEDIA/kids/'
FILLER = re.compile(r'\b(?:HD|FHD|4K)\b|مشاهده|مشاهدة|فيلم|افلام|أفلام|كرتون|الكرتون|انمي|أنمي|مدبلجة|مدبلج|مترجمة|مترجم|بالعربية|بالعربي|اون لاين|أون لاين|اونلاين|كامل|مباشرة|مباشره|ماي سيما|مصري|بجودة عالية|وتحميل|تحميل|[\-|–:()\[\]]')
YEAR = re.compile(r'\b(19[3-9]\d|20[0-3]\d)\b')
# hosts whose embed page exposes a direct m3u8/mp4 (plain, packed eval, ok.ru options, bitchute, odysee API)
GOOD = ['liiivideo', 'egybestvid', 'vidmoly', 'uqload', 'callistanise', 'jodwish', 'swhoi', 'minochinos', 'vidspeed', 'vidoba',
        'mp4plus', 'ok.ru', 'bitchute', 'odysee', 'videa', 'my.mail.ru']


def clean(t):
    t = html.unescape(t)
    y = (YEAR.findall(t) or [''])[-1]
    t = re.sub(r'\s+', ' ', YEAR.sub(' ', FILLER.sub(' ', t))).strip(' -–')
    return t, y


def embeds(urls):
    out = []
    for u in urls:
        u = html.unescape(u.strip())
        if u.startswith('//'):
            u = 'https:' + u
        r = next((i for i, g in enumerate(GOOD) if g in u), None)
        if r is not None and u not in (x[1] for x in out):
            out.append((r, u))
    return [u for _, u in sorted(out, key=lambda x: x[0])]


def mycima():
    out = []
    for x in json.load(open(os.path.join(SRC, 'mycima.json'))):
        t, y = clean(x['t'])
        e = embeds(x.get('e') or [])
        if not (t and e):
            continue
        img = PAGES + 'img/m/' + x['id'] + '.jpg' if os.path.exists(os.path.join(SRC, '..', 'img', 'm', x['id'] + '.jpg')) else ''
        out.append({'k': 'm', 'id': x['id'], 't': t, 'y': y, 'img': img, 'mv': True, 'g': ['ديزني'] if re.search(r'ديزني|disney', x['t'], re.I) else [],
                    'age': 7 if 'مدبلج' in x['t'] else 13, 'e': e})
    return out


def egydead():
    out = []
    for x in json.load(open(os.path.join(SRC, 'egydead.json'))):
        t, y = clean(x['t'])
        e = embeds(x.get('e') or [])
        if not (t and e):
            continue
        out.append({'k': 'e', 'id': x['id'], 't': t, 'y': x.get('y') or y, 'img': x.get('img', ''), 'hero': x.get('hero', ''), 'mv': True, 'g': [],
                    'desc': x.get('desc', ''), 'age': 7 if 'مدبلج' in x['t'] else 13, 'e': e})
    return out


def cartoontime():
    t, _ = get('https://cartoontime.net/wp-json/wp/v2/posts?per_page=100&_embed=wp:featuredmedia&_fields=id,title,content,categories,excerpt,_links,_embedded')
    out = []
    for p in json.loads(t):
        if 1 in p.get('categories', []):  # series posts link to episode pages; movies only
            continue
        raw = html.unescape(p['title']['rendered'])
        e = embeds(re.findall(r'<iframe[^>]+src="([^"]+)"', p['content']['rendered']))
        if not e:
            continue
        ti, y = clean(raw)
        fm = (p.get('_embedded') or {}).get('wp:featuredmedia') or [{}]
        desc = re.sub(r'<[^>]+>', '', html.unescape((p.get('excerpt') or {}).get('rendered', ''))).strip()[:400]
        out.append({'k': 't', 'id': str(p['id']), 't': ti, 'y': y, 'img': fm[0].get('source_url', ''), 'mv': True,
                    'g': ['ديزني'] if re.search(r'ديزني|disney', raw, re.I) else [], 'desc': desc, 'age': 7, 'e': e})
    return out


def main():
    try:
        old = json.load(open(OUT))
    except Exception:
        old = {}
    res = {}
    for name, f in (('d', dimakids), ('f', spacepowerfan), ('m', mycima), ('t', cartoontime), ('e', egydead)):
        try:
            res[name] = f()
        except Exception as e:
            print(name, 'failed', e, file=sys.stderr)
        if len(res.get(name) or []) < (20 if name in 'df' else 5):
            res[name] = (old.get('src') or {}).get(name, [])
    json.dump({'t': int(time.time()), 'src': res}, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
    print({k: len(v) for k, v in res.items()})


if __name__ == '__main__':
    main()
