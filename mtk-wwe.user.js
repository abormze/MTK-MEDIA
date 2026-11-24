// ==UserScript==
// @name         MTK WWE
// @namespace    https://abormze.github.io/MTK-MEDIA
// @version      1.0.3
// @description  MTK WWE - عروض المصارعة بدون إعلانات، مشاهدة الآن بأول سيرفر، ملفات وPIN، تابع المشاهدة، قائمتي
// @match        *://shahed4u.here/*
// @match        *://*.shahed4u.here/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://abormze.github.io/MTK-MEDIA/mtk-wwe.user.js
// @updateURL    https://abormze.github.io/MTK-MEDIA/mtk-wwe.user.js
// ==/UserScript==
(function MTKWWE() {
  'use strict';
  const W = window, D = document;
  if (!/shahed4u/i.test(location.hostname) || W.top !== W.self || W.__mtkOn) return;
  W.__mtkOn = true;
  const CAT = '/category/%D8%B9%D8%B1%D9%88%D8%B6-%D9%85%D8%B5%D8%A7%D8%B1%D8%B9%D8%A9';
  const path = decodeURIComponent(location.pathname);
  if (!/^\/(category\/عروض-مصارعة|post\/|watch\/|search|m\/)/.test(path)) { location.replace(CAT); return; }
  const AD = /(googlesyndication|doubleclick|googletagservices|googletagmanager|adtrafficquality|rtmark|luugy|ipify|popads|popcash|propeller|adsterra|hilltopads|monetag|yandex)/i;
  try { Object.defineProperty(W, 'open', { value: () => null, writable: false, configurable: false }); } catch (e) { W.open = () => null; }
  const kill = (n) => { try { if (n.nodeName === 'SCRIPT') { n.type = 'javascript/blocked'; n.removeAttribute('src'); } n.remove(); } catch (e) {} };
  const bad = (n) => n.nodeType === 1 && ((/^(SCRIPT|IFRAME)$/.test(n.nodeName) && AD.test(n.src || '')) || n.nodeName === 'INS' || (n.classList && n.classList.contains('adsbygoogle')));
  const noGenre = () => D.querySelectorAll('select[onchange*="\'genre\'"]').forEach((x) => { if (x.parentElement) x.parentElement.style.display = 'none'; });
  D.addEventListener('DOMContentLoaded', noGenre);
  const unblock = () => { if (D.body && D.body.style.overflow === 'hidden' && !D.querySelector('.mtk-gate,#mtk-pg,#mtk-prof')) D.body.style.overflow = ''; };
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) { if (n.nodeType === 1 && n.classList && n.classList.contains('ignielAdBlock')) { n.remove(); unblock(); continue; } if (bad(n)) kill(n); else if (n.querySelectorAll) n.querySelectorAll('script,iframe,ins').forEach((x) => { if (bad(x)) kill(x); }); } }).observe(D, { childList: true, subtree: true });
  const css = (txt) => { const add = () => { const s = D.createElement('style'); s.textContent = txt; (D.head || D.documentElement).appendChild(s); }; if (D.documentElement) add(); else setTimeout(() => css(txt), 20); };
  css(`#mtk-pc{left:16px!important;transform:none!important;top:12px!important}div:has(> select[onchange*="'genre'"]),.ignielAdBlock,ins,.adsbygoogle,[id^="google_ads"],iframe[src*="doubleclick"]{display:none!important}
a:focus-visible,button:focus-visible,input:focus-visible,[tabindex]:focus-visible{outline:3px solid #e11d2e!important;outline-offset:2px}
nav a[href*="/category/"]:not([href*="%D9%85%D8%B5%D8%A7%D8%B1%D8%B9%D8%A9"]):not([href*="مصارعة"]),.dropdown-menu a[href*="/category/"]:not([href*="%D9%85%D8%B5%D8%A7%D8%B1%D8%B9%D8%A9"]):not([href*="مصارعة"]){display:none!important}`);

  const LOGO = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="64" viewBox="0 0 300 64"><text x="0" y="47" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="46" fill="#fff">MTK</text><text x="128" y="47" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="46" fill="#e11d2e" font-style="italic">WWE</text></svg>');
  const BR = /(شاهد ?فور ?يو|شاهد4يو|shah[ei]d ?4 ?u)(?![.\w-])/gi;
  const brandTxt = (t) => { const pe = t.parentNode; if (pe && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(pe.nodeName)) return; if (BR.test(t.nodeValue)) t.nodeValue = t.nodeValue.replace(BR, 'MTK WWE'); BR.lastIndex = 0; };
  const brand = (n) => {
    if (n.nodeType === 3) return brandTxt(n);
    if (n.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(n.nodeName)) return;
    D.querySelectorAll('div.footer').forEach((c) => { if (!c.querySelector('*:not(br)') && c.textContent.trim() !== 'جميع الحقوق محفوظة © MTK WWE') c.textContent = 'جميع الحقوق محفوظة © MTK WWE'; });
    const w = D.createTreeWalker(n, NodeFilter.SHOW_TEXT); let t; while ((t = w.nextNode())) brandTxt(t);
    (n.matches && n.matches('img') ? [n] : n.querySelectorAll ? [...n.querySelectorAll('img')] : []).forEach((i) => { if (/logo/i.test((i.src || '') + (i.className || '') + (i.alt || ''))) { i.src = LOGO; i.alt = 'MTK WWE'; i.style.cssText = 'width:150px;max-width:38vw;height:auto;max-height:40px'; } });
    const lg = D.querySelector('.site-logo-title a');
    if (lg && !lg.dataset.mtk) { lg.dataset.mtk = 1; lg.textContent = ''; lg.title = 'MTK WWE'; lg.append(el('img', { src: LOGO, alt: 'MTK WWE', style: 'width:190px;max-width:45vw;height:auto' })); }
    D.querySelectorAll('.bar > a, .bar > .dropdown').forEach((b) => { const a = b.matches('a') ? b : b.querySelector('a'); const hr = a ? decodeURIComponent(a.getAttribute('href') || '') : ''; if (!/مصارعة/.test(hr) && !/^https?:\/\/[^/]+\/?$/.test(hr)) b.style.display = 'none'; });
    n.querySelectorAll && n.querySelectorAll('a[href]').forEach((a) => { if (/^https?:\/\/[^/]+\/?$/.test(a.href) && a.host === location.host) a.href = CAT; });
  };
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) brand(n); if (BR.test(D.title)) D.title = D.title.replace(BR, 'MTK WWE'); BR.lastIndex = 0; }).observe(D, { childList: true, subtree: true });

  const el = (t, a, ...k) => { const e = D.createElement(t); if (a) for (const x in a) { if (x.startsWith('on')) e.addEventListener(x.slice(2), a[x]); else e.setAttribute(x, a[x]); } k.flat().forEach((c) => c != null && e.append(c)); return e; };
  const sha = async (s) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map((x) => x.toString(16).padStart(2, '0')).join('');
  const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const profs = () => { const p = jget('mtk-profs', []); return p.length ? p : [{ id: 'p0', n: 'الرئيسي' }]; };
  const pid = () => localStorage.getItem('mtk-prof') || 'p0';
  const prof = () => profs().find((p) => p.id === pid()) || profs()[0];
  const pins = () => jget('mtk-pins', {});
  const HKf = () => (pid() === 'p0' ? 'mtk-hist' : 'mtk-hist:' + pid());
  const COL = ['#ff2d55', '#ffb020', '#22d3a6', '#3b82f6', '#a855f7', '#f97316'];
  const avatar = (p) => el('span', { class: 'mtk-av', style: 'background:' + COL[Math.max(0, profs().findIndex((x) => x.id === p.id)) % 6] }, p.n.charAt(0));
  let ov = null, ovLock = false;
  const ovOpen = (node, lock) => { if (!ov) { ov = el('div', { id: 'mtk-ov', dir: 'rtl' }); (D.body || D.documentElement).append(ov); } ovLock = !!lock; ov.textContent = ''; ov.append(node); ov.classList.add('on'); };
  const ovClose = () => { if (ov) { ov.classList.remove('on'); ov.textContent = ''; } ovLock = false; };
  function askPw(title, sub, check, done, back, lock) {
    const inp = el('input', { type: 'password', class: 'mtk-in', autocomplete: 'off', dir: 'ltr' });
    const msg = el('div', { class: 'mtk-msg' });
    const f = el('form', { onsubmit: async (e) => { e.preventDefault(); if (await check(inp.value)) done(); else { msg.textContent = 'غلط، جرّب كمان مرة'; inp.value = ''; inp.focus(); } } },
      inp, el('button', { class: 'mtk-b', type: 'submit' }, 'دخول'), back ? el('button', { class: 'mtk-b2', type: 'button', onclick: back }, 'رجوع') : null);
    ovOpen(el('div', { class: 'mtk-box' }, el('h2', null, title), sub ? el('p', null, sub) : null, msg, f), lock);
    setTimeout(() => { try { inp.focus(); } catch (e) {} }, 80);
  }
  function gate(next) {
    const GATE_H = 'f1626dc324001b104467125a902fcdb4e92c4757c56064507f1d926a39ba13a4';
    if (localStorage.getItem('mtk-gate') === GATE_H.slice(0, 16)) return next();
    askPw('أدخل كلمة السر', 'MTK WWE', async (v) => (await sha('mtk-gate:' + v)) === GATE_H, () => { localStorage.setItem('mtk-gate', GATE_H.slice(0, 16)); ovClose(); next(); }, null, true);
  }
  function enter(id) { localStorage.setItem('mtk-prof', id); localStorage.setItem('mtk-picked', '1'); sessionStorage.setItem('mtk-unl', id); ovClose(); chip(); try { cw(); } catch (e) {} }
  const setPinOf = async (id, v) => { const m = pins(); if (v) m[id] = await sha('mtk-pin:' + v); else delete m[id]; localStorage.setItem('mtk-pins', JSON.stringify(m)); };
  function profiles(force) {
    const pn = pins(), cur = prof();
    const grid = el('div', { class: 'mtk-pg' }, profs().map((p) => el('button', { class: 'mtk-pf', onclick: () => (pn[p.id]
      ? askPw('أدخل رمز PIN', p.n, async (v) => (await sha('mtk-pin:' + v)) === pn[p.id], () => enter(p.id), () => profiles(force), force)
      : enter(p.id)) }, avatar(p), el('b', null, p.n + (pn[p.id] ? ' 🔒' : '')))));
    const nm = el('input', { class: 'mtk-in', placeholder: 'اسم الملف...', maxlength: '20' });
    const np = el('input', { class: 'mtk-in', type: 'password', inputmode: 'numeric', maxlength: '4', placeholder: 'PIN (اختياري)', dir: 'ltr' });
    const add = el('form', { class: 'mtk-add', onsubmit: async (e) => {
      e.preventDefault(); const n = nm.value.trim(); if (!n) return;
      const l = profs(), id = 'p' + Date.now().toString(36); l.push({ id, n }); localStorage.setItem('mtk-profs', JSON.stringify(l));
      if (/^\d{4}$/.test(np.value)) await setPinOf(id, np.value);
      profiles(force);
    } }, el('h3', null, 'ملف جديد'), nm, np, el('button', { class: 'mtk-b', type: 'submit' }, 'إضافة'));
    const lockBtn = force ? null : el('button', { class: 'mtk-b2', type: 'button', onclick: () => (pn[cur.id]
      ? askPw('أدخل الرمز الحالي', cur.n, async (v) => (await sha('mtk-pin:' + v)) === pn[cur.id], async () => { await setPinOf(cur.id, ''); profiles(); }, () => profiles())
      : askPw('رمز PIN جديد (4 أرقام)', cur.n, async (v) => { if (!/^\d{4}$/.test(v)) return false; await setPinOf(cur.id, v); return true; }, () => profiles(), () => profiles())) },
    pn[cur.id] ? 'شيل قفل PIN عن «' + cur.n + '»' : 'قفل «' + cur.n + '» بـ PIN');
    ovOpen(el('div', { class: 'mtk-box wide' }, el('h2', null, 'مين عم يتفرّج؟'), grid, add, lockBtn,
      force ? null : el('button', { class: 'mtk-b2', type: 'button', onclick: ovClose }, 'إغلاق')), force);
  }
  function chip() {
    if (!D.body) return;
    let c = D.getElementById('mtk-pc');
    if (!c) { c = el('button', { id: 'mtk-pc', 'aria-label': 'الملف', onclick: () => profiles() }); D.body.append(c); }
    const p = prof();
    if (c.dataset.p !== p.id + p.n) { c.dataset.p = p.id + p.n; c.textContent = ''; c.append(avatar(p), el('b', null, p.n)); }
    if (!c.isConnected) D.body.append(c);
  }
  css(`#mtk-ov{position:fixed;inset:0;z-index:2147483647;background:#0b0b10;display:none;align-items:center;justify-content:center;overflow:auto;font:15px system-ui,sans-serif;color:#fff}
#mtk-ov.on{display:flex}
.mtk-box{width:min(92vw,420px);text-align:center;padding:24px 0}.mtk-box.wide{width:min(94vw,760px)}
.mtk-box h2{font-size:28px;font-weight:900;margin:0 0 18px}.mtk-box h3{margin:18px 0 8px;color:#ffb020;font-size:16px}.mtk-box p{color:#aaa;margin:-8px 0 12px}
.mtk-msg{color:#ff6b81;min-height:20px;margin-bottom:6px}
.mtk-box form{display:flex;flex-direction:column;gap:10px}
.mtk-in{font-size:18px;padding:12px;border-radius:10px;border:1px solid #333;background:#16161f;color:#fff;text-align:center}
.mtk-b,.mtk-b2{font:700 16px system-ui,sans-serif;padding:12px;border-radius:10px;border:0;cursor:pointer}
.mtk-b{background:#e11d2e;color:#fff}.mtk-b2{background:#22222c;color:#ddd;margin-top:10px;width:100%}
.mtk-pg{display:flex;flex-wrap:wrap;gap:18px;justify-content:center}
.mtk-pf{background:none;border:0;color:#ddd;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;padding:6px;border-radius:12px}
.mtk-pf .mtk-av{width:96px;height:96px;font-size:44px;border-radius:12px}
.mtk-pf:focus,.mtk-pf:hover{outline:3px solid #fff;color:#fff}
.mtk-av{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;color:#fff;font-weight:900}
#mtk-pc{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:6px;background:rgba(20,20,28,.85);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:20px;padding:4px 12px 4px 5px;font:700 13px system-ui,sans-serif;cursor:pointer}
html.mtk-on #mtk-pc{display:none}`);
  const bootProf = () => { chip(); gate(() => { if (!localStorage.getItem('mtk-picked') || (pins()[pid()] && sessionStorage.getItem('mtk-unl') !== pid())) profiles(true); }); };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', bootProf); else bootProf();
  setInterval(chip, 2000);



  const LK = () => 'mtk-wwe-list:' + pid();
  const hist = () => jget(HKf(), []);
  const saveH = (h) => { try { localStorage.setItem(HKf(), JSON.stringify(h.slice(0, 30))); } catch (e) {} };
  const mylist = () => jget(LK(), []);
  const slug = (u) => { const m = decodeURIComponent(new URL(u, location.href).pathname).match(/^\/(?:post|watch)\/(.+)$/); return m ? m[1] : ''; };
  const meta = (p) => (D.querySelector('meta[property="' + p + '"]') || {}).content || '';
  const curItem = () => ({ id: slug(location.href), title: (meta('og:title') || D.title).replace(BR, 'MTK WWE').replace(/\s+[-|–]\s+.*MTK WWE.*$/, '').replace(/^\s*(مشاهدة|صالة العرض)\s*[-|:]?\s*/, '').trim(), img: meta('og:image') });
  function record(x) { if (!x.id) return; const h = hist().filter((y) => y.id !== x.id); h.unshift(Object.assign({}, x, { at: Date.now() })); saveH(h); }
  const catList = () => [...D.querySelectorAll('a.show-card')].map((a) => ({ id: slug(a.href), title: (a.querySelector('.title') || a).textContent.trim(), img: (a.querySelector('img') || {}).src || '' })).filter((x) => x.id);
  if (catList.length === 0) {}
  // ---- player: watch page, first server (EarnVids) fullscreen
  let slT = 0;
  const watchUrl = (id) => '/watch/' + encodeURIComponent(id);
  function play(x) {
    const box = D.getElementById('player'), f = box && box.querySelector('iframe');
    if (!f || D.getElementById('mtk-plbar')) return;
    record(x);
    const seq = jget('mtk-wwe-seq', []), i = seq.findIndex((y) => y.id === x.id);
    const nx = i > 0 ? seq[i - 1] : null, pv = i >= 0 && i < seq.length - 1 ? seq[i + 1] : null;
    const close = () => { clearTimeout(slT); try { if (D.fullscreenElement) D.exitFullscreen(); } catch (e) {} location.href = CAT; };
    box.close = close; box.id = 'player'; D.documentElement.classList.add('mtk-full');
    const go = (y) => { location.href = watchUrl(y.id); };
    let sl = 0; const SL = [0, 30, 60, 90];
    const slb = el('button', { onclick: () => { sl = (sl + 1) % 4; clearTimeout(slT); slb.textContent = SL[sl] ? 'مؤقّت النوم ' + SL[sl] + ' د' : 'مؤقّت النوم'; if (SL[sl]) slT = setTimeout(close, SL[sl] * 60000); } }, 'مؤقّت النوم');
    const bar = el('div', { id: 'mtk-plbar', class: 'mtk-plbar', dir: 'rtl' }, el('button', { onclick: close }, '✕ رجوع'), el('b', null, x.title), pv ? el('button', { onclick: () => go(pv) }, '⏮ العرض السابق') : null, slb, nx ? el('button', { onclick: () => go(nx) }, 'العرض التالي ⏭') : null);
    D.body.appendChild(bar);
    f.setAttribute('allow', 'autoplay; fullscreen; encrypted-media');
    setTimeout(() => { try { f.focus(); } catch (e) {} }, 400);
  }
  
  css(`html.mtk-full,html.mtk-full body{overflow:hidden!important}html.mtk-full #player{position:fixed!important;inset:0!important;z-index:2147483600!important;width:100vw!important;max-width:none!important;height:100vh!important;padding:0!important;margin:0!important;background:#000}html.mtk-full #player iframe{width:100%!important;height:100%!important;border:0}
.mtk-plbar{position:fixed;z-index:2147483601;top:0;left:0;right:0;display:flex;gap:8px;align-items:center;padding:10px 14px;background:linear-gradient(#000c,#0000);opacity:0;transition:opacity .3s}
html.mtk-full:hover .mtk-plbar,.mtk-plbar:focus-within,.mtk-plbar:hover{opacity:1}.mtk-plbar b{color:#fff;font:700 15px system-ui,sans-serif;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mtk-plbar button,.mtk-add{background:rgba(0,0,0,.6);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:7px 14px;font:700 14px system-ui,sans-serif;cursor:pointer}`);
  // ---- pages
  function onPost() {
    const x = curItem();
    D.querySelectorAll('a[href*="/watch/"]').forEach((a) => {
      if (a.dataset.mtk) return; a.dataset.mtk = 1;
      a.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); record(x); location.href = watchUrl(x.id); }, true);
      if (!a.parentNode.querySelector('.mtk-add')) {
        const inL = () => mylist().some((y) => y.id === x.id);
        const b = el('button', { class: 'mtk-add', style: 'margin:0 8px', onclick: (e) => { e.preventDefault(); const l = mylist().filter((y) => y.id !== x.id); if (!inL()) l.unshift(x); localStorage.setItem(LK(), JSON.stringify(l.slice(0, 50))); b.textContent = inL() ? '✓ بقائمتي' : '+ قائمتي'; } }, inL() ? '✓ بقائمتي' : '+ قائمتي');
        a.after(b);
      }
    });
    D.querySelectorAll('a[href*="/download/"]').forEach((a) => { a.style.display = 'none'; });
    if (location.hash === '#mtk-play') { record(x); location.replace(watchUrl(x.id)); }
  }
  let wN = 0;
  function onWatch() {
    const f = D.querySelector('#player iframe');
    if (!f || D.getElementById('mtk-plbar')) return;
    if (!/\/m\/|\/\/[^/]+\/(e|embed)\//.test(f.getAttribute('src') || '')) {
      if (++wN === 12) { const first = D.querySelector('#servers .btn-server[data-token]:not([data-honeytoken])'); if (first) first.click(); }
      return setTimeout(onWatch, 500);
    }
    play(curItem());
  }
  function row(id, title, list, rm) {
    return el('section', { id, class: 'mtk-row', dir: 'rtl' }, el('h2', null, title), el('div', { class: 'mtk-rw' }, list.map((x) => el('a', { class: 'mtk-c', href: watchUrl(x.id) }, x.img ? el('img', { src: x.img, alt: '', loading: 'lazy' }) : el('div', { class: 'mtk-ph' }), rm ? el('button', { class: 'mtk-x', onclick: (e) => { e.preventDefault(); e.stopPropagation(); rm(x); home(true); } }, '×') : null, el('div', { class: 'mtk-t' }, x.title)))));
  }
  function hero(list) {
    let i = 0, t = 0;
    const slides = list.map((x) => el('div', { class: 'mtk-hs' }, el('div', { class: 'mtk-hbg', style: 'background-image:url("' + x.img + '")' }), el('div', { class: 'mtk-hi' }, el('span', null, 'عروض مصارعة • مترجم'), el('h1', null, x.title), el('a', { class: 'mtk-hplay', href: watchUrl(x.id) }, '▶ مشاهدة الآن'))));
    const dots = el('div', { class: 'mtk-hd' }, list.map((_, j) => el('i', { onclick: () => step(j - i) })));
    const paint = () => { slides.forEach((s, j) => s.classList.toggle('on', j === i)); [...dots.children].forEach((d, j) => d.classList.toggle('on', j === i)); };
    const auto = () => { clearInterval(t); t = setInterval(() => { if (!box.isConnected) return clearInterval(t); if (!(box.contains(D.activeElement) && D.activeElement.matches(':focus-visible'))) { i = (i + 1) % list.length; paint(); } }, 6000); };
    const step = (d) => { i = (i + d + list.length) % list.length; paint(); auto(); };
    const box = el('section', { id: 'mtk-hero', dir: 'rtl' }, slides, el('button', { class: 'mtk-ha mtk-hn', 'aria-label': 'التالي', onclick: () => step(1) }, '‹'), el('button', { class: 'mtk-ha mtk-hp', 'aria-label': 'السابق', onclick: () => step(-1) }, '›'), dots);
    let sx = 0;
    box.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 45) step(dx > 0 ? -1 : 1); }, { passive: true });
    paint(); auto(); return box;
  }
  function home(force) {
    const grid = D.querySelector('.shows-container'); if (!grid) return;
    const cards = catList();
    if (cards.length && !location.search.includes('page=') ) localStorage.setItem('mtk-wwe-seq', JSON.stringify(cards));
    D.querySelectorAll('a.show-card').forEach((a) => { if (!a.dataset.mtk) { a.dataset.mtk = 1; const id = slug(a.href); a.href = watchUrl(id); a.addEventListener('click', () => record({ id, title: (a.querySelector('.title') || a).textContent.trim(), img: (a.querySelector('img') || {}).src || '' }), true); } });
    const anchor = grid.closest('.container') || grid;
    if (!D.getElementById('mtk-hero') && cards.length && !location.search.includes('page=')) anchor.before(hero(cards.slice(0, 6)));
    if (force) D.querySelectorAll('#mtk-cw,#mtk-ml').forEach((n) => n.remove());
    if (!D.getElementById('mtk-cw')) { const h = hist(); if (h.length) anchor.before(row('mtk-cw', 'تابع المشاهدة', h.slice(0, 20), (x) => saveH(hist().filter((y) => y.id !== x.id)))); }
    if (!D.getElementById('mtk-ml')) { const l = mylist(); if (l.length) anchor.before(row('mtk-ml', 'قائمتي', l, (x) => localStorage.setItem(LK(), JSON.stringify(mylist().filter((y) => y.id !== x.id))))); }
  }
  css(`#mtk-hero{position:relative;height:min(62vh,560px);overflow:hidden;margin-bottom:10px}
.mtk-hs{position:absolute;inset:0;opacity:0;transition:opacity .8s}.mtk-hs.on{opacity:1;z-index:1}
.mtk-hbg{position:absolute;inset:0;background-size:cover;background-position:center 25%;filter:brightness(.55)}
.mtk-hs::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,#0b0b0f 0%,transparent 55%),linear-gradient(270deg,#000a,transparent 60%)}
.mtk-hi{position:absolute;right:5%;bottom:14%;z-index:2;max-width:620px;color:#fff}.mtk-hi span{color:#e11d2e;font-weight:800}
.mtk-hi h1{font-size:clamp(22px,3.4vw,44px);font-weight:900;margin:8px 0 16px;text-shadow:0 2px 8px #000}
.mtk-hplay{display:inline-block;background:#e11d2e;color:#fff!important;text-decoration:none;padding:11px 26px;border-radius:8px;font-weight:800;font-size:17px}
.mtk-ha{position:absolute;top:45%;z-index:3;width:46px;height:46px;border-radius:50%;border:0;background:rgba(0,0,0,.5);color:#fff;font-size:30px;line-height:40px;cursor:pointer}
.mtk-hn{left:14px}.mtk-hp{right:14px}.mtk-hd{position:absolute;bottom:14px;left:0;right:0;z-index:3;display:flex;justify-content:center;gap:6px}
.mtk-hd i{width:9px;height:9px;border-radius:50%;background:#fff6;cursor:pointer}.mtk-hd i.on{background:#e11d2e;width:22px;border-radius:5px}
.mtk-row{padding:10px 3%}.mtk-row h2{color:#fff;font-size:21px;font-weight:800;margin:0 0 10px}
.mtk-rw{display:flex;gap:12px;overflow-x:auto;padding:4px 4px 10px;scrollbar-width:none}
.mtk-c{position:relative;flex:0 0 auto;width:150px;color:#fff;text-decoration:none;border-radius:10px;overflow:hidden;background:#1a1a22}
.mtk-c:focus,.mtk-c:hover{box-shadow:0 0 0 3px #e11d2e;transform:scale(1.04)}.mtk-c img,.mtk-ph{width:150px;height:225px;object-fit:cover;display:block;background:#222}
.mtk-t{font-size:13px;font-weight:700;padding:6px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mtk-x{position:absolute;top:6px;left:6px;width:28px;height:28px;border-radius:50%;border:0;background:#000b;color:#fff;font-size:18px;cursor:pointer}`);
  let tm = 0;
  const tick = () => { tm = 0; const p = decodeURIComponent(location.pathname); if (p.startsWith('/post/')) onPost(); else if (p.startsWith('/watch/')) onWatch(); else home(); };
  new MutationObserver(() => { if (!tm) tm = setTimeout(tick, 400); }).observe(D, { childList: true, subtree: true });
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', tick); else tick();

  // TV remote: spatial navigation
  const FOC = 'a[href],button,input,select,[tabindex]:not([tabindex="-1"])';
  const scopeOf = () => (ov && ov.classList.contains('on') ? ov : D.getElementById('mtk-up') || D);
  W.addEventListener('keydown', (e) => {
    if (ov && ov.classList.contains('on') && (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack')) { if (!ovLock) ovClose(); e.preventDefault(); return; }
    const pl = D.getElementById('mtk-plbar') && D.getElementById('player'); if (pl && (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack') && !(ov && ov.classList.contains('on'))) { pl.close(); e.preventDefault(); return; }
    const v = null;
    if (v && D.fullscreenElement && !(ov && ov.classList.contains('on'))) { if (e.key === 'Enter' || e.key === 'MediaPlayPause') { v.paused ? v.play() : v.pause(); e.preventDefault(); return; } if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { v.currentTime += e.key === 'ArrowRight' ? 10 : -10; e.preventDefault(); return; } }
    const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    if (!dir || e.defaultPrevented) return;
    const a = D.activeElement;
    if (a && a.nodeName === 'INPUT' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
    const vis = [...scopeOf().querySelectorAll(FOC)].filter((el) => { const b = el.getBoundingClientRect(); return b.width > 4 && b.height > 4 && !el.disabled && getComputedStyle(el).visibility !== 'hidden'; });
    if (!vis.length) return;
    if (!a || a === D.body || !vis.includes(a)) { vis[0].focus(); e.preventDefault(); return; }
    const ab = a.getBoundingClientRect(), ax = ab.left + ab.width / 2, ay = ab.top + ab.height / 2;
    let best = null, bs = Infinity;
    for (const el of vis) {
      if (el === a || a.contains(el) || el.contains(a)) continue;
      const b = el.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
      const dx = x - ax, dy = y - ay, main = dx * dir[0] + dy * dir[1];
      if (main <= 4) continue;
      const cross = Math.abs(dx * dir[1] + dy * dir[0]);
      const sc = main + cross * 2.5;
      if (sc < bs) { bs = sc; best = el; }
    }
    if (best) { best.focus({ preventScroll: true }); best.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' }); e.preventDefault(); }
  }, true);


})();
