// ==UserScript==
// @name         MTK CLASSIC
// @namespace    https://abormze.github.io/MTK-MEDIA
// @version      1.0.0
// @description  MTK CLASSIC - shoofmax بدون إعلانات، تشغيل مباشر، ملفات وPIN، تابع المشاهدة، الحلقة التالية تلقائياً
// @match        *://shoofmax.com/*
// @match        *://*.shoofmax.com/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://abormze.github.io/MTK-MEDIA/mtk-classic.user.js
// @updateURL    https://abormze.github.io/MTK-MEDIA/mtk-classic.user.js
// ==/UserScript==
(function MTKCLASSIC() {
  'use strict';
  const W = window, D = document;
  if (!/shoofmax\.com$/i.test(location.hostname) || W.top !== W.self || W.__mtkOn) return;
  W.__mtkOn = true;
  const AD = /(imasdk\.googleapis|googlesyndication|doubleclick|googletagservices|googletagmanager|2mdn\.net|adtrafficquality|cookiebot|google-analytics|adservice|popads|popcash|propeller)/i;
  try { Object.defineProperty(W, 'open', { value: () => null, writable: false, configurable: false }); } catch (e) { W.open = () => null; }
  const kill = (n) => { try { if (n.nodeName === 'SCRIPT') { n.type = 'javascript/blocked'; n.removeAttribute('src'); } n.remove(); } catch (e) {} };
  const bad = (n) => n.nodeType === 1 && ((n.nodeName === 'SCRIPT' && AD.test(n.src || '')) || (n.nodeName === 'IFRAME' && AD.test(n.src || '')) || n.nodeName === 'INS' || (n.classList && (n.classList.contains('adsbygoogle') || n.id === 'CybotCookiebotDialog')));
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) { if (bad(n)) kill(n); else if (n.querySelectorAll) n.querySelectorAll('script,iframe,ins,.adsbygoogle').forEach((x) => { if (bad(x)) kill(x); }); } }).observe(D, { childList: true, subtree: true });
  // Radiant player: drop ads, autoplay
  let RMP;
  const wrap = (C) => {
    if (!C || !C.prototype || C.__mtk) return C;
    const init = C.prototype.init;
    C.prototype.init = function (s) {
      try { s = Object.assign({}, s); s.ads = false; delete s.adTagUrl; delete s.adSchedule; delete s.adTagWaterfall; s.autoplay = true; } catch (e) {}
      W.__mtkRmp = this;
      return init.call(this, s);
    };
    C.__mtk = 1; return C;
  };
  try { Object.defineProperty(W, 'RadiantMP', { configurable: true, get: () => RMP, set: (v) => { RMP = wrap(v); } }); } catch (e) {}
  const css = (txt) => { const add = () => { const s = D.createElement('style'); s.textContent = txt; (D.head || D.documentElement).appendChild(s); }; if (D.documentElement) add(); else setTimeout(() => css(txt), 20); };
  css('#mtk-pc{left:16px!important;transform:none!important;top:12px!important}ins,.adsbygoogle,#CybotCookiebotDialog,[id^="google_ads"],.ad-container,.ads-container,.rmp-ad-container{display:none!important}a:focus-visible,button:focus-visible,input:focus-visible,[tabindex]:focus-visible{outline:3px solid #de8723!important;outline-offset:2px}');

  // branding
  const LOGO = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="64" viewBox="0 0 320 64"><defs><linearGradient id="g"><stop offset="0" stop-color="#f5c15c"/><stop offset="1" stop-color="#de8723"/></linearGradient></defs><text x="0" y="46" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="44" fill="url(#g)">MTK</text><text x="120" y="46" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="44" fill="#fff">CLASSIC</text></svg>');
  const BR = /(شوف ?ماكس|shoof ?max)(?![.\w-])/gi;
  const brandTxt = (t) => { const pe = t.parentNode; if (pe && /^(SCRIPT|STYLE|NOSCRIPT)$/.test(pe.nodeName)) return; if (BR.test(t.nodeValue)) t.nodeValue = t.nodeValue.replace(BR, 'MTK CLASSIC'); BR.lastIndex = 0; };
  const brand = (n) => {
    if (n.nodeType === 3) return brandTxt(n);
    if (n.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(n.nodeName)) return;
    const w = D.createTreeWalker(n, NodeFilter.SHOW_TEXT); let t; while ((t = w.nextNode())) brandTxt(t);
    (n.matches && n.matches('img') ? [n] : n.querySelectorAll ? [...n.querySelectorAll('img')] : []).forEach((i) => { if (/sm-deep|logo/i.test(i.src || '')) { i.src = LOGO; i.alt = 'MTK CLASSIC'; i.style.maxHeight = '34px'; } });
  };
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) brand(n); if (BR.test(D.title)) D.title = D.title.replace(BR, 'MTK CLASSIC'); BR.lastIndex = 0; }).observe(D, { childList: true, subtree: true });

  // ---- password gate + profiles (PIN)
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
    askPw('أدخل كلمة السر', 'MTK CLASSIC', async (v) => (await sha('mtk-gate:' + v)) === GATE_H, () => { localStorage.setItem('mtk-gate', GATE_H.slice(0, 16)); ovClose(); next(); }, null, true);
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
.mtk-b{background:#de8723;color:#fff}.mtk-b2{background:#22222c;color:#ddd;margin-top:10px;width:100%}
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


  // ---- history / continue watching (per profile)
  const hist = () => jget(HKf(), []);
  const saveH = (h) => { try { localStorage.setItem(HKf(), JSON.stringify(h.slice(0, 30))); } catch (e) {} };
  const prog = () => { const m = location.pathname.match(/^\/program\/(\d+)/); return m ? { id: m[1], ep: +(new URLSearchParams(location.search).get('ep') || 0) } : null; };
  function cur() {
    const r = prog(); if (!r) return null;
    const h1 = D.querySelector('h1.watch-title');
    const title = h1 ? (h1.childNodes[0] ? h1.childNodes[0].textContent : h1.textContent).trim() : D.title;
    const bg = (D.querySelector('.watch-section') || {}).style;
    const img = bg && (bg.backgroundImage || '').match(/url\(["']?([^"')]+)/);
    return Object.assign(r, { title, img: img ? img[1] : '' });
  }
  function record(p, d) {
    const c = cur(); if (!c) return;
    const h = hist(), i = h.findIndex((x) => x.id === c.id), old = i >= 0 ? h[i] : null;
    const same = old && old.ep === c.ep;
    const e = { id: c.id, ep: c.ep, title: c.title || (old && old.title) || '', img: c.img || (old && old.img) || '', p: p != null ? p : same ? old.p || 0 : 0, d: d || (same ? old.d || 0 : 0), at: Date.now() };
    if (i >= 0) h.splice(i, 1); h.unshift(e); saveH(h);
  }
  const href = (x) => '/program/' + x.id + (x.ep ? '?ep=' + x.ep : '');
  function cw() {
    let box = D.getElementById('mtk-cw');
    if (location.pathname !== '/') { if (box) box.remove(); return; }
    const h = hist().filter((x) => !(x.d && x.p > x.d - 60 && !x.ep)).slice(0, 20);
    if (!h.length) { if (box) box.remove(); return; }
    const anchor = D.querySelector('#home-carousel');
    const host = anchor && (anchor.closest('section') || anchor);
    if (!host || !host.parentNode) return;
    if (!box) { box = el('section', { id: 'mtk-cw', dir: 'rtl' }); }
    const sig = JSON.stringify(h.map((x) => [x.id, x.ep, Math.round(x.p / 30)]));
    if (box.dataset.sig !== sig) {
      box.dataset.sig = sig; box.textContent = '';
      box.append(el('h2', null, 'تابع المشاهدة'), el('div', { class: 'mtk-cw-row' }, h.map((x) => {
        const pc = x.d ? Math.min(100, Math.round(100 * x.p / x.d)) : 0;
        const rm = el('button', { class: 'mtk-cw-x', 'aria-label': 'شيل', onclick: (ev) => { ev.preventDefault(); ev.stopPropagation(); saveH(hist().filter((y) => y.id !== x.id)); cw(); } }, '×');
        return el('a', { class: 'mtk-cw-c', href: href(x) }, x.img ? el('img', { src: x.img, alt: '', loading: 'lazy' }) : el('div', { class: 'mtk-cw-ph' }), rm,
          el('div', { class: 'mtk-cw-t' }, x.title), el('div', { class: 'mtk-cw-s' }, (x.ep ? 'الحلقة ' + x.ep + ' • ' : '') + (x.p > 30 ? 'كمّل من ' + Math.floor(x.p / 60) + ' د' : 'من البداية')),
          el('div', { class: 'mtk-cw-b' }, el('i', { style: 'width:' + pc + '%' })));
      })));
    }
    if (box.previousElementSibling !== host) host.after(box);
  }
  css(`#mtk-cw{padding:18px 3% 6px;direction:rtl}#mtk-cw h2{font-size:22px;font-weight:800;color:#fff;margin:0 0 12px}
.mtk-cw-row{display:flex;gap:14px;overflow-x:auto;padding:4px 4px 10px;scrollbar-width:none}
.mtk-cw-c{position:relative;flex:0 0 auto;width:260px;color:#fff;text-decoration:none;border-radius:10px;overflow:hidden;background:#1a1a22}
.mtk-cw-c:focus,.mtk-cw-c:hover{box-shadow:0 0 0 3px #de8723;transform:scale(1.03)}
.mtk-cw-c img,.mtk-cw-ph{width:260px;height:146px;object-fit:cover;display:block;background:#2a2a33}
.mtk-cw-t{font-size:14px;font-weight:700;padding:7px 9px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mtk-cw-s{font-size:12px;color:#aaa;padding:2px 9px 8px}.mtk-cw-b{height:4px;background:#444}.mtk-cw-b i{display:block;height:100%;background:#de8723}
.mtk-cw-x{position:absolute;top:6px;left:6px;width:28px;height:28px;border-radius:50%;border:0;background:rgba(0,0,0,.7);color:#fff;font-size:18px;cursor:pointer}
@media (max-width:600px){.mtk-cw-c,.mtk-cw-c img,.mtk-cw-ph{width:200px}.mtk-cw-c img,.mtk-cw-ph{height:112px}}`);
  let cwT = 0;
  new MutationObserver(() => { if (!cwT) cwT = setTimeout(() => { cwT = 0; cw(); }, 500); }).observe(D, { childList: true, subtree: true });

  // ---- player: direct play, resume, progress, autoplay next episode, speed, sleep
  const vid = () => D.querySelector('#main-player video, .main-video video');
  const nextHref = () => { const c = prog(); if (!c || !c.ep) return ''; const a = D.querySelector('a[href*="/program/' + c.id + '?ep=' + (c.ep + 1) + '"]'); return a ? a.getAttribute('href') : ''; };
  let resumed = false, upOff = false, upT = 0, lastRec = 0;
  function upShow() {
    const nx = nextHref(), box = D.getElementById('main-player');
    if (!nx || upOff || !box || D.getElementById('mtk-up')) return;
    let n = 10;
    const lab = el('b', null, 'الحلقة التالية بعد ' + n + ' ث');
    const go = () => { clearInterval(upT); location.href = nx; };
    const ok = el('button', { class: 'mtk-upgo', onclick: go }, '▶ شغّل الآن');
    box.append(el('div', { id: 'mtk-up', dir: 'rtl' }, el('div', null, 'الحلقة ' + (prog().ep + 1)), lab, el('div', { class: 'mtk-upb' }, ok, el('button', { onclick: () => { upOff = true; clearInterval(upT); const u = D.getElementById('mtk-up'); if (u) u.remove(); } }, 'إلغاء'))));
    setTimeout(() => { try { ok.focus(); } catch (e) {} }, 50);
    upT = setInterval(() => { n--; lab.textContent = 'الحلقة التالية بعد ' + n + ' ث'; if (n <= 0) go(); }, 1000);
  }
  D.addEventListener('loadedmetadata', (e) => {
    const v = e.target; if (v !== vid() || resumed) return; resumed = true;
    const c = prog(), x = c && hist().find((y) => y.id === c.id && y.ep === c.ep);
    if (x && x.p > 30 && v.duration > x.p + 60) try { v.currentTime = x.p; } catch (er) {}
  }, true);
  D.addEventListener('timeupdate', (e) => {
    const v = e.target; if (v !== vid() || !(v.duration > 60)) return;
    if (Date.now() - lastRec > 5000 && v.currentTime > 5) { lastRec = Date.now(); record(v.currentTime, v.duration); }
    if (v.duration - v.currentTime < 25) upShow();
  }, true);
  D.addEventListener('ended', (e) => { if (e.target === vid()) upShow(); }, true);
  const SPEEDS = [1, 1.25, 1.5, 0.75], SLEEPS = [0, 30, 60, 90];
  let spI = 0, slI = 0, slT = 0;
  function bar() {
    const box = D.getElementById('main-player');
    if (!box || D.getElementById('mtk-bar')) return;
    const sp = el('button', { onclick: () => { spI = (spI + 1) % 4; sp.textContent = 'السرعة ' + SPEEDS[spI] + 'x'; const v = vid(); if (v) v.playbackRate = SPEEDS[spI]; } }, 'السرعة 1x');
    const sl = el('button', { onclick: () => { slI = (slI + 1) % 4; clearTimeout(slT); sl.textContent = SLEEPS[slI] ? 'مؤقّت النوم ' + SLEEPS[slI] + ' د' : 'مؤقّت النوم'; if (SLEEPS[slI]) slT = setTimeout(() => { const v = vid(); if (v) v.pause(); slI = 0; sl.textContent = 'مؤقّت النوم'; }, SLEEPS[slI] * 60000); } }, 'مؤقّت النوم');
    const c = prog(), pv = c && c.ep > 1 ? D.querySelector('a[href*="/program/' + c.id + '?ep=' + (c.ep - 1) + '"]') : null;
    const nx = nextHref();
    box.append(el('div', { id: 'mtk-bar', dir: 'rtl' }, pv ? el('button', { onclick: () => { location.href = pv.getAttribute('href'); } }, '⏮ السابقة') : null, sp, sl, nx ? el('button', { onclick: () => { location.href = nx; } }, 'التالية ⏭') : null));
  }
  css(`#mtk-bar{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:30;display:flex;gap:8px;opacity:0;transition:opacity .3s}
#main-player:hover #mtk-bar,#main-player:focus-within #mtk-bar,#main-player.rmp-chrome #mtk-bar{opacity:1}
#mtk-bar button,#mtk-up button{background:rgba(0,0,0,.65);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:20px;padding:7px 14px;font:700 14px system-ui,sans-serif;cursor:pointer}
#mtk-up{position:absolute;bottom:70px;right:20px;z-index:31;background:rgba(10,10,16,.92);border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:14px 18px;color:#fff;font:15px system-ui,sans-serif;display:flex;flex-direction:column;gap:8px;min-width:230px}
#mtk-up b{font-size:18px}.mtk-upb{display:flex;gap:8px}#mtk-up .mtk-upgo{background:#de8723;border-color:#de8723}`);
  function autoPlay() {
    if (!prog()) return;
    record();
    let n = 0;
    const t = setInterval(() => {
      const v = vid(), b = D.querySelector('.watch-section-play');
      if (++n > 40) return clearInterval(t);
      if (b && b.offsetParent && !(v && v.currentTime > 0)) { try { if (typeof W.showPlayer === 'function') W.showPlayer(); else b.click(); } catch (e) {} }
      if (v && D.getElementById('main-player')) bar();
      if (v && v.currentTime > 0) { clearInterval(t); bar(); }
      else if (v && v.paused && v.readyState >= 2) v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    }, 700);
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', autoPlay); else autoPlay();

  // TV remote: spatial navigation
  const FOC = 'a[href],button,input,select,[tabindex]:not([tabindex="-1"])';
  const scopeOf = () => (ov && ov.classList.contains('on') ? ov : D.getElementById('mtk-up') || D);
  W.addEventListener('keydown', (e) => {
    if (ov && ov.classList.contains('on') && (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack')) { if (!ovLock) ovClose(); e.preventDefault(); return; }
    const v = D.querySelector('#main-player video');
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
