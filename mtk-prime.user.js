// ==UserScript==
// @name         MTK PRIME
// @namespace    mtk-media
// @version      1.2.0
// @description  MTK MEDIA for vidsrcprime: no ads, direct fullscreen player, Arabic subtitles, TV remote support
// @match        *://vidsrcprime.site/*
// @match        *://*.vidsrcprime.site/*
// @match        *://cinesrc.st/*
// @match        *://*.cinesrc.st/*
// @run-at       document-start
// @grant        none
// @updateURL    https://abormze.github.io/MTK-MEDIA/mtk-prime.user.js
// @downloadURL  https://abormze.github.io/MTK-MEDIA/mtk-prime.user.js
// ==/UserScript==
(function MTKPRIME() {
  'use strict';
  const W = window, D = document, H = location.hostname;
  const IS_SITE = /vidsrcprime/i.test(H), IS_PLAYER = /cinesrc/i.test(H);
  if (!IS_SITE && !IS_PLAYER) return;
  const SUB = 'Arabic';
  const AD = /(magsrv|bancadeltempoidea|adexchangerapid|usrpubtrk|ouijarapper|\/\/a2?\.cineflix\.st|ijarwjciakkmj|nxsha\.app|doubleclick|googlesyndication|googletagmanager|adservice|popads|popcash|propeller|adsterra|exoclick|juicyads|hilltopads|monetag|highperformanceformat|effectivegatecpm|profitabledisplay|realsrv|onclicka|madurird|acscdn|aclib|clickadu|adcash|a-ads\.com|popunder|disable-devtool)/i;
  const isAdUrl = (u) => { try { return AD.test(new URL(u, location.href).href); } catch (e) { return false; } };

  // ---- popups / dialogs
  try { Object.defineProperty(W, 'open', { value: () => null, writable: false, configurable: false }); } catch (e) { W.open = () => null; }
  W.alert = W.confirm = W.prompt = () => {};
  try { Object.defineProperty(W, 'atOptions', { get: () => undefined, set: () => {}, configurable: false }); } catch (e) {}

  // ---- block ad scripts / iframes / requests
  const bad = (n) => {
    if (!n || n.nodeType !== 1) return false;
    const t = n.nodeName;
    if (t === 'SCRIPT') return (n.src && isAdUrl(n.src)) || /atOptions|ad-provider|AdProvider|popunder|zoneid/i.test(n.textContent || '');
    if (t === 'IFRAME') return !!n.src && isAdUrl(n.src) && !(n.parentNode && n.parentNode.id === 'mtk-pl');
    if (t === 'INS') return true;
    return false;
  };
  const kill = (n) => { try { if (n.nodeName === 'SCRIPT') { n.type = 'javascript/blocked'; n.removeAttribute('src'); n.textContent = ''; } else if (n.nodeName === 'IFRAME') n.src = 'about:blank'; n.remove(); } catch (e) {} };
  try {
    const NP = Node.prototype;
    ['appendChild', 'insertBefore', 'replaceChild'].forEach((m) => {
      const o = NP[m];
      NP[m] = function (n) { if (bad(n)) return n; return o.apply(this, arguments); };
    });
    const EP = Element.prototype;
    ['append', 'prepend', 'after', 'before'].forEach((m) => {
      const o = EP[m]; if (!o) return;
      EP[m] = function (...a) { return o.apply(this, a.filter((n) => !bad(n))); };
    });
    const of = W.fetch;
    if (of) W.fetch = function (i) { const u = typeof i === 'string' ? i : (i && i.url); if (u && isAdUrl(u)) return Promise.reject(new TypeError('blocked')); return of.apply(this, arguments); };
    const xo = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (m, u) { if (u && isAdUrl(u)) u = 'data:,'; return xo.call(this, m, u, ...[].slice.call(arguments, 2)); };
    if (navigator.sendBeacon) navigator.sendBeacon = () => true;
  } catch (e) {}
  D.addEventListener('click', (e) => {
    const a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    let u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (isAdUrl(u.href) || (a.target === '_blank' && u.hostname !== location.hostname)) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  const css = (txt) => {
    const add = () => { const s = D.createElement('style'); s.textContent = txt; (D.head || D.documentElement).appendChild(s); };
    if (D.documentElement) add(); else new MutationObserver((m, o) => { if (D.documentElement) { o.disconnect(); add(); } }).observe(D, { childList: true });
  };

  if (IS_PLAYER) return player();
  site();

  // =================== cinesrc player frame ===================
  function player() {
    css('ins,iframe[src*="cineflix"],iframe[src*="adexchange"]{display:none!important}');
    const skip = () => D.querySelectorAll('button').forEach((b) => { if (/^\s*Continue Anyways?\s*$/i.test(b.textContent || '')) b.click(); });
    new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) { if (bad(n)) kill(n); else if (n.querySelectorAll) { n.querySelectorAll('script,iframe,ins').forEach((x) => { if (bad(x)) kill(x); }); if (n.querySelector('button')) skip(); } } })
      .observe(D, { childList: true, subtree: true });
    const ping = () => { try { parent.postMessage('mtk-act', '*'); } catch (e) {} };
    ['pointerdown', 'touchstart', 'mousemove', 'keydown'].forEach((t) => W.addEventListener(t, ping, true));
    const RT = +((location.hash.match(/mtkt=(\d+)/) || [])[1] || 0);
    let sought = 0;
    const seekRT = (v) => { if (sought < 2 && RT > 0 && v.duration > RT + 30 && v.currentTime < RT - 5) { sought++; try { v.currentTime = RT; } catch (e) {} } };
    D.addEventListener('loadedmetadata', (e) => seekRT(e.target), true);
    D.addEventListener('playing', (e) => seekRT(e.target), true);
    const rep = () => { const v = D.querySelector('video'); if (v && v.duration > 60 && v.currentTime > 5 && (!RT || sought)) try { parent.postMessage({ mtk: 'pos', p: v.currentTime, d: v.duration }, '*'); } catch (e) {} };
    setInterval(rep, 5000); D.addEventListener('pause', rep, true);
    let tries = 0, userPaused = false;
    const kick = (v) => {
      if (!v || userPaused) return;
      try { v.muted = false; v.volume = 1; v.playsInline = true; } catch (e) {}
      if (v.paused && tries++ < 12) v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    };
    D.addEventListener('canplay', (e) => kick(e.target), true);
    D.addEventListener('loadedmetadata', (e) => kick(e.target), true);
    D.addEventListener('pause', (e) => { if (e.isTrusted && tries > 0 && e.target.currentTime > 1) userPaused = true; }, true);
    const unmute = () => { const v = D.querySelector('video'); if (v && v.muted) { v.muted = false; v.volume = 1; } };
    W.addEventListener('pointerdown', unmute, true); W.addEventListener('keydown', unmute, true);
    const t = setInterval(() => { const v = D.querySelector('video'); if (v && v.readyState >= 2) kick(v); if (tries >= 12) clearInterval(t); }, 1500);
    W.addEventListener('message', (e) => {
      const m = e.data, v = D.querySelector('video');
      if (!m || m.mtk !== 'cmd' || !v) return;
      if (m.rate) try { v.playbackRate = m.rate; } catch (x) {}
      if (m.seek) try { v.currentTime += m.seek; } catch (x) {}
      if (m.pause) { userPaused = true; v.pause(); }
    });
    D.addEventListener('ended', () => { try { parent.postMessage({ mtk: 'end' }, '*'); } catch (x) {} }, true);
    // TV remote
    W.addEventListener('keydown', (e) => {
      if (e.defaultPrevented) return;
      const v = D.querySelector('video'); if (!v) return;
      const a = D.activeElement;
      if (a && a !== D.body && /BUTTON|INPUT|SELECT|A/.test(a.nodeName)) return;
      if (e.key === 'Enter' || e.key === 'MediaPlayPause') { userPaused = !v.paused; v.paused ? v.play() : v.pause(); e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'MediaFastForward') { v.currentTime += 10; e.preventDefault(); }
      else if (e.key === 'ArrowLeft' || e.key === 'MediaRewind') { v.currentTime -= 10; e.preventDefault(); }
    });
  }

  // =================== vidsrcprime site ===================
  function site() {
    const LOGO = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="60" viewBox="0 0 300 60"><defs><linearGradient id="g"><stop offset="0" stop-color="#ff2d55"/><stop offset="1" stop-color="#ffb020"/></linearGradient></defs><text x="0" y="46" font-family="Arial,sans-serif" font-weight="900" font-size="46" fill="url(#g)">MTK</text><text x="112" y="46" font-family="Arial,sans-serif" font-weight="800" font-size="46" fill="#fff">MEDIA</text></svg>');
    css(`ins,iframe[src*="bancadeltempo"],iframe[src*="magsrv"],iframe[src*="nxsha"]{display:none!important}
#mtk-pl{position:fixed;inset:0;z-index:2147483647;background:#000}
#mtk-pl iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000}
#mtk-pl button{position:absolute;top:12px;z-index:2;background:rgba(0,0,0,.6);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:22px;padding:8px 16px;font:700 15px system-ui,sans-serif;transition:opacity .4s}
#mtk-x{left:12px}#mtk-n{right:12px}
#mtk-pl.idle button{opacity:0;pointer-events:none}
html.mtk-on,html.mtk-on body{overflow:hidden!important}
a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,[tabindex]:focus-visible{outline:3px solid #ff2d55!important;outline-offset:2px}
.card-hover:focus-visible{transform:scale(1.06);z-index:2}`);

    // DOM cleanup + branding
    const fix = (n) => {
      if (n.nodeType !== 1) return;
      if (bad(n)) return kill(n);
      const list = n.querySelectorAll ? n.querySelectorAll('script,iframe,ins,img,span,p') : [];
      [n, ...list].forEach((x) => {
        if (x !== n && bad(x)) return kill(x);
        if (x.nodeName === 'IFRAME' && x.parentNode && x.parentNode.id !== 'mtk-pl' && /nxsha|cinesrc/.test(x.src || '')) { x.src = 'about:blank'; x.style.display = 'none'; }
        else if (x.nodeName === 'IMG' && /blogger\.googleusercontent/.test(x.src || '')) { x.src = LOGO; x.alt = 'MTK MEDIA'; }
        else if (x.nodeName === 'P' && /^\s*Disclaimer: This is a demo/i.test(x.textContent || '')) x.textContent = 'MTK MEDIA — أفلام ومسلسلات بدون إعلانات، مع ترجمة عربي.';
        else if (x.nodeName === 'P' && /VidsRcprime\. All rights reserved/i.test(x.textContent || '')) { x.textContent = '© ' + new Date().getFullYear() + ' MTK MEDIA — جميع الحقوق محفوظة. برمجة: محمد محاجنة'; x.dir = 'rtl'; }
        else if (x.nodeName === 'SPAN' && /^\s*Advertisement\s*$/i.test(x.textContent || '') && x.parentElement) x.parentElement.style.display = 'none';
      });
    };
    const MY = 'https://abormze.github.io/MTK-MEDIA';
    const rb = (v) => v.replace(/(?:https?:\/\/)?(?:www\.)?vidsrcprime\.site/gi, MY).replace(/VidsRc ?prime|VidSrc ?Prime/gi, 'MTK MEDIA');
    const BR = /vidsrc ?prime/i;
    const txt = (t) => { if (BR.test(t.nodeValue)) t.nodeValue = rb(t.nodeValue); };
    try {
      const cb = navigator.clipboard;
      if (cb && cb.writeText) { const wt = cb.writeText.bind(cb); cb.writeText = (v) => wt(rb(String(v))); }
    } catch (e) {}
    const brand = (n) => {
      if (n.nodeType === 3) return txt(n);
      if (n.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(n.nodeName)) return;
      const w = D.createTreeWalker(n, NodeFilter.SHOW_TEXT); let t;
      while ((t = w.nextNode())) txt(t);
      (n.querySelectorAll ? n.querySelectorAll('[aria-label],[title],[alt]') : []).forEach((x) => ['aria-label', 'title', 'alt'].forEach((a) => { const v = x.getAttribute(a); if (v && BR.test(v)) x.setAttribute(a, rb(v)); }));
      const h = n.nodeName === 'H1' ? [n] : (n.querySelectorAll ? n.querySelectorAll('h1') : []);
      h.forEach((x) => {
        if (!/^\s*API DOCUMENTATION\s*$/i.test(x.textContent || '')) return;
        x.textContent = 'MTK MEDIA API';
        if (D.getElementById('mtk-dev') || !x.parentElement) return;
        const c = D.createElement('div'); c.id = 'mtk-dev'; c.dir = 'rtl';
        c.style.cssText = 'margin:16px 0;padding:14px 16px;border-radius:14px;background:linear-gradient(90deg,rgba(255,45,85,.15),rgba(255,176,32,.12));border:1px solid rgba(255,45,85,.4);color:#fff;font:600 14px/1.8 system-ui,sans-serif';
        c.innerHTML = '<div style="font-size:18px;font-weight:900"><span style="color:#ff2d55">MTK</span> MEDIA</div>'
          + '<div>برمجة وتطوير: <b>محمد محاجنة</b></div>'
          + '<div>بدون إعلانات • تشغيل مباشر • ترجمة عربي تلقائي • يدعم Android TV</div>'
          + '<div style="margin-top:6px"><a href="https://abormze.github.io/MTK-MEDIA/prime/" style="color:#ffb020">تطبيق MTK PRIME</a> • <a href="https://github.com/abormze" style="color:#ffb020">GitHub</a></div>';
        x.parentElement.appendChild(c);
      });
    };
    new MutationObserver((ms) => {
      for (const m of ms) { if (m.type === 'characterData') txt(m.target); else for (const n of m.addedNodes) { fix(n); brand(n); } }
      if (BR.test(D.title)) D.title = rb(D.title);
    }).observe(D, { childList: true, subtree: true, characterData: true });

    // fullscreen helpers
    const goFull = () => {
      try { if (W.MTKApp) return W.MTKApp.full(true); } catch (e) {}
      try { const el = D.documentElement; if (!D.fullscreenElement && el.requestFullscreen) el.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}); } catch (e) {}
    };
    const exitFull = () => {
      try { if (W.MTKApp) return W.MTKApp.full(false); } catch (e) {}
      try { if (D.fullscreenElement) D.exitFullscreen(); } catch (e) {}
    };

    // routes
    const route = () => {
      const m = location.pathname.match(/^\/watch\/(movie|tv)\/(\d+)([^/]*)(?:\/(\d+)\/(\d+))?/);
      return m ? { t: m[1], id: m[2], slug: m[2] + m[3], s: +(m[4] || 1), e: +(m[5] || 1) } : null;
    };
    const src = (r) => r.t === 'movie'
      ? `https://cinesrc.st/embed/movie/${r.id}?autoplay=true&subtitlelang=${SUB}`
      : `https://cinesrc.st/embed/tv/${r.id}?s=${r.s}&e=${r.e}&autoplay=true&subtitlelang=${SUB}`;
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
      askPw('أدخل كلمة السر', 'MTK PRIME', async (v) => (await sha('mtk-gate:' + v)) === GATE_H, () => { localStorage.setItem('mtk-gate', GATE_H.slice(0, 16)); ovClose(); next(); }, null, true);
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
.mtk-b{background:#e50914;color:#fff}.mtk-b2{background:#22222c;color:#ddd;margin-top:10px;width:100%}
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

    // watch history / continue watching (per profile)
    const hist = () => { try { return JSON.parse(localStorage.getItem(HKf())) || []; } catch (e) { return []; } };
    const saveH = (h) => { try { localStorage.setItem(HKf(), JSON.stringify(h.slice(0, 30))); } catch (e) {} };
    const slugT = (sl) => sl.replace(/^\d+-?/, '').split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    let meta = {}, curSid = null;
    const grab = (el) => {
      const onDetail = /^\/(movie|tv)\//.test(location.pathname);
      if (onDetail) {
        const h = D.querySelector('h1'), im = [...D.images].find((i) => /image\.tmdb\.org\/t\/p\/w(342|500|780)\//.test(i.src));
        return { title: h ? h.textContent.trim() : '', poster: im ? im.src.replace(/\/w\d+\//, '/w342/') : '' };
      }
      const a = el && el.closest && el.closest('a[href],[role="link"],div');
      const im = a && (a.querySelector('img') || (a.closest('a') && a.closest('a').querySelector('img')));
      return im ? { title: (im.alt || '').trim(), poster: /tmdb/.test(im.src) ? im.src.replace(/\/w\d+\//, '/w342/') : im.src } : {};
    };
    D.addEventListener('click', (e) => { meta = grab(e.target); }, true);
    const record = (r) => {
      const sid = r.t + ':' + r.id, h = hist(), i = h.findIndex((x) => x.sid === sid), old = i >= 0 ? h[i] : null;
      const same = old && old.s === r.s && old.e === r.e;
      const ent = { sid, t: r.t, id: r.id, slug: r.slug, s: r.s, e: r.e,
        title: (meta.title && meta.title.length < 120 ? meta.title : '') || (old && old.title) || slugT(r.slug),
        poster: meta.poster || (old && old.poster) || '', p: same ? old.p || 0 : 0, d: same ? old.d || 0 : 0, at: Date.now() };
      if (i >= 0) h.splice(i, 1);
      h.unshift(ent); saveH(h); meta = {}; curSid = sid;
      return ent;
    };
    const setPos = (sid, p, d) => { const h = hist(), x = h.find((y) => y.sid === sid); if (!x || !(p > 0)) return; x.p = p; if (d > 0) x.d = d; x.at = Date.now(); saveH(h); };
    W.addEventListener('message', (e) => { const m = e.data; if (m && m.mtk === 'pos' && curSid) setPos(curSid, m.p, m.d); });
    W.__mtkCur = () => { const x = hist().find((y) => y.sid === curSid); return JSON.stringify({ k: curSid || '', p: x && x.p > 30 && !(x.d && x.p > x.d - 120) ? Math.floor(x.p) : 0 }); };
    W.__mtkSetPos = (k, p, d) => { setPos(k, p, d); cw(); };
    css('#mtk-cw{padding:18px 4% 6px;position:relative;z-index:2}#mtk-cw h2{font-size:22px;font-weight:800;color:#fff;margin:0 0 12px}'
      + '.mtk-cw-row{display:flex;gap:14px;overflow-x:auto;padding:4px 4px 8px;scrollbar-width:none}.mtk-cw-c{flex:0 0 auto;width:150px;color:#fff;text-decoration:none;border-radius:12px;overflow:hidden;background:#1a1a22;outline:none;direction:ltr}'
      + '.mtk-cw-c:focus,.mtk-cw-c:hover{box-shadow:0 0 0 3px #ff2d55;transform:scale(1.04)}.mtk-cw-c img{width:150px;height:225px;object-fit:cover;display:block;background:#2a2a33}'
      + '.mtk-cw-t{font-size:13px;font-weight:700;padding:7px 8px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mtk-cw-s{font-size:12px;color:#aaa;padding:2px 8px 7px;direction:rtl;text-align:right}'
      + '.mtk-cw-b{height:4px;background:#444}.mtk-cw-b i{display:block;height:100%;background:#ff2d55}');
    const wurl = (x) => x.t === 'movie' ? '/watch/movie/' + x.slug : '/watch/tv/' + x.slug + '/' + x.s + '/' + x.e;
    function cw() {
      let box = D.getElementById('mtk-cw');
      if (location.pathname !== '/') { if (box) box.remove(); return; }
      const h = hist().filter((x) => !(x.t === 'movie' && x.d && x.p > x.d - 180)).slice(0, 20);
      if (!h.length) { if (box) box.remove(); return; }
      const first = [...D.querySelectorAll('section')].find((x) => x.id !== 'mtk-cw');
      if (!first) return;
      const sig = JSON.stringify(h.map((x) => [x.sid, x.s, x.e, Math.round((x.p || 0) / 30), x.poster]));
      if (box && box.dataset.sig === sig && box.nextElementSibling === first) return;
      if (!box) { box = D.createElement('section'); box.id = 'mtk-cw'; box.dir = 'rtl'; }
      if (box.dataset.sig !== sig) {
        box.dataset.sig = sig;
        box.innerHTML = '<h2>تابع المشاهدة</h2><div class="mtk-cw-row"></div>';
        const row = box.lastChild;
        h.forEach((x) => {
          const a = D.createElement('a'); a.className = 'mtk-cw-c'; a.href = wurl(x);
          const pc = x.d ? Math.min(100, Math.round(100 * x.p / x.d)) : 0;
          a.innerHTML = '<img loading="lazy" alt=""><div class="mtk-cw-t"></div><div class="mtk-cw-s"></div><div class="mtk-cw-b"><i style="width:' + pc + '%"></i></div>';
          if (x.poster) a.querySelector('img').src = x.poster;
          a.querySelector('.mtk-cw-t').textContent = x.title;
          a.querySelector('.mtk-cw-s').textContent = (x.t === 'tv' ? 'م' + x.s + ' • ح' + x.e + ' • ' : '') + (x.p > 30 ? 'كمّل من ' + Math.floor(x.p / 60) + ' د' : 'من البداية');
          a.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopImmediatePropagation(); history.pushState({}, '', a.getAttribute('href')); }, true);
          row.appendChild(a);
        });
      }
      if (box.nextElementSibling !== first) first.parentNode.insertBefore(box, first);
    }
    let cwT = 0;
    new MutationObserver(() => { if (!cwT) cwT = setTimeout(() => { cwT = 0; cw(); }, 400); }).observe(D, { childList: true, subtree: true });

    const P = history.pushState, R = history.replaceState;
    history.pushState = function (st, t, url) {
      try {
        const u = new URL(url, location.href);
        const m = u.pathname.match(/^\/movie\/(\d+[^/]*)\/?$/);
        if (m) url = '/watch/movie/' + m[1];
        if (/^\/watch\//.test(new URL(url, location.href).pathname) && /^\/(movie|tv)\//.test(location.pathname) && !meta.poster) meta = grab(null);
        if (/^\/watch\//.test(new URL(url, location.href).pathname)) goFull();
      } catch (e) {}
      const r = P.call(this, st, t, url); setTimeout(sync, 0); return r;
    };
    history.replaceState = function () { const r = R.apply(this, arguments); setTimeout(sync, 0); return r; };
    W.addEventListener('popstate', () => setTimeout(sync, 0));

    let idleT;
    const wake = () => { const pl = D.getElementById('mtk-pl'); if (!pl) return; pl.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => pl.classList.add('idle'), 3000); };
    W.addEventListener('message', (e) => { if (e.data === 'mtk-act') wake(); });
    const close = () => {
      const before = location.pathname;
      history.back();
      setTimeout(() => { if (location.pathname === before && route()) { R.call(history, {}, '', '/'); W.dispatchEvent(new PopStateEvent('popstate')); } }, 400);
    };
    W.__mtkBack = () => { if (!D.getElementById('mtk-pl')) return false; close(); return true; };

    // ---- player extras: speed, sleep, skip intro, prev/next, autoplay next episode
    const SPEEDS = [1, 1.25, 1.5, 0.75], SLEEPS = [0, 30, 60, 90];
    let spI = 0, slI = 0, slT = 0, upT = 0, upOff = false, upKey = '';
    const tell = (m) => { const f = D.querySelector('#mtk-pl iframe'); try { f && f.contentWindow.postMessage(Object.assign({ mtk: 'cmd' }, m), '*'); } catch (e) {} };
    const goEp = (d) => { const c = route(); if (!c || c.t !== 'tv') return; const e = c.e + d; if (e < 1) return; upOff = false; history.replaceState({}, '', `/watch/tv/${c.slug}/${c.s}/${e}`); };
    const upHide = () => { clearInterval(upT); upT = 0; const u = D.getElementById('mtk-up'); if (u) u.remove(); };
    function upShow() {
      const pl = D.getElementById('mtk-pl'), c = route();
      if (!pl || !c || c.t !== 'tv' || upOff || D.getElementById('mtk-up')) return;
      let n = 10;
      const lab = el('b', null, 'الحلقة التالية بعد ' + n + ' ث');
      const go = el('button', { class: 'mtk-upgo', onclick: () => { upHide(); goEp(1); } }, '▶ شغّل الآن');
      const no = el('button', { class: 'mtk-upno', onclick: () => { upOff = true; upHide(); } }, 'إلغاء');
      pl.append(el('div', { id: 'mtk-up', dir: 'rtl' }, el('div', null, 'م' + c.s + ' • ح' + (c.e + 1)), lab, el('div', { class: 'mtk-upb' }, go, no)));
      setTimeout(() => { try { go.focus(); } catch (e) {} }, 50);
      upT = setInterval(() => { n--; lab.textContent = 'الحلقة التالية بعد ' + n + ' ث'; if (n <= 0) { upHide(); goEp(1); } }, 1000);
    }
    W.addEventListener('message', (e) => {
      const m = e.data; if (!m || !D.getElementById('mtk-pl')) return;
      if (m.mtk === 'end') upShow();
      else if (m.mtk === 'pos' && m.d > 300 && m.d - m.p < 35) upShow();
      else if (m.mtk === 'pos') { const sk = D.getElementById('mtk-sk'); if (sk && m.p > 240) sk.remove(); }
    });
    function ctl(pl, r) {
      const key = r.t + r.id + ':' + r.s + ':' + r.e;
      if (upKey !== key) { upKey = key; upOff = false; upHide(); }
      let bar = D.getElementById('mtk-bar');
      if (bar && bar.dataset.k === key) return;
      if (bar) bar.remove();
      const sp = el('button', { onclick: () => { spI = (spI + 1) % SPEEDS.length; sp.textContent = 'السرعة ' + SPEEDS[spI] + 'x'; tell({ rate: SPEEDS[spI] }); } }, 'السرعة ' + SPEEDS[spI] + 'x');
      const sl = el('button', { onclick: () => {
        slI = (slI + 1) % SLEEPS.length; clearTimeout(slT);
        sl.textContent = SLEEPS[slI] ? 'مؤقّت النوم ' + SLEEPS[slI] + ' د' : 'مؤقّت النوم';
        if (SLEEPS[slI]) slT = setTimeout(() => { tell({ pause: 1 }); slI = 0; const b = D.querySelector('#mtk-bar .mtk-sl'); if (b) b.textContent = 'مؤقّت النوم'; }, SLEEPS[slI] * 60000);
      }, class: 'mtk-sl' }, SLEEPS[slI] ? 'مؤقّت النوم ' + SLEEPS[slI] + ' د' : 'مؤقّت النوم');
      bar = el('div', { id: 'mtk-bar' }, r.t === 'tv' && r.e > 1 ? el('button', { onclick: () => goEp(-1) }, '⏮ الحلقة السابقة') : null, sp, sl,
        r.t === 'tv' ? el('button', { id: 'mtk-sk', onclick: (e) => { tell({ seek: 85 }); e.currentTarget.remove(); } }, 'تخطّي المقدمة ⏩') : null);
      bar.dataset.k = key;
      pl.append(bar);
      if (spI) setTimeout(() => tell({ rate: SPEEDS[spI] }), 4000);
    }
    css(`#mtk-bar{position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:2;display:flex;gap:8px;transition:opacity .4s}
#mtk-pl #mtk-bar button{position:static}
#mtk-pl.idle #mtk-bar{opacity:0;pointer-events:none}
#mtk-pl #mtk-bar #mtk-sk{background:#fff;color:#000}
#mtk-up{position:absolute;bottom:70px;right:24px;z-index:3;background:rgba(10,10,16,.92);border:1px solid rgba(255,255,255,.2);border-radius:14px;padding:14px 18px;color:#fff;font:15px system-ui,sans-serif;display:flex;flex-direction:column;gap:8px;min-width:240px}
#mtk-up b{font-size:18px}.mtk-upb{display:flex;gap:8px}
#mtk-pl #mtk-up button{position:static;opacity:1!important;pointer-events:auto!important}
#mtk-pl #mtk-up .mtk-upgo{background:#e50914;border-color:#e50914}
@media (max-width:700px){#mtk-bar{top:auto;bottom:14px;flex-wrap:wrap;justify-content:center;width:94%}#mtk-bar button{font-size:13px!important;padding:6px 10px!important}}`);

    function sync() {
      const r = route();
      let pl = D.getElementById('mtk-pl');
      cw();
      if (!r) {
        if (pl) { pl.remove(); D.documentElement.classList.remove('mtk-on'); exitFull(); }
        curSid = null;
        return;
      }
      let s = src(r);
      const cur = hist()[0], ek = r.t + ':' + r.id;
      const ent = cur && cur.sid === ek && cur.s === r.s && cur.e === r.e && curSid === ek ? cur : record(r);
      if (ent.p > 30 && !(ent.d && ent.p > ent.d - 120)) s += '#mtkt=' + Math.floor(ent.p);
      if (!pl) {
        pl = D.createElement('div'); pl.id = 'mtk-pl';
        const x = D.createElement('button'); x.id = 'mtk-x'; x.textContent = '✕'; x.onclick = close;
        pl.appendChild(x);
        (D.body || D.documentElement).appendChild(pl);
        D.documentElement.classList.add('mtk-on');
        pl.addEventListener('pointerdown', wake); pl.addEventListener('mousemove', wake);
      }
      let n = D.getElementById('mtk-n');
      if (r.t === 'tv' && !n) {
        n = D.createElement('button'); n.id = 'mtk-n'; n.textContent = 'الحلقة التالية ⏭';
        n.onclick = () => { const c = route(); if (c) history.replaceState({}, '', `/watch/tv/${c.slug}/${c.s}/${c.e + 1}`); };
        pl.appendChild(n);
      } else if (r.t !== 'tv' && n) n.remove();
      let f = pl.querySelector('iframe');
      if (!f || f.dataset.s.split('#')[0] !== s.split('#')[0]) {
        if (f) f.remove();
        f = D.createElement('iframe');
        f.dataset.s = s;
        f.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
        f.setAttribute('allowfullscreen', '');
        f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-presentation');
        f.src = s;
        pl.insertBefore(f, pl.firstChild);
        f.addEventListener('load', () => { try { f.focus(); f.contentWindow.focus(); } catch (e) {} });
      }
      ctl(pl, r);
      goFull(); wake();
      setTimeout(() => { try { f.focus(); } catch (e) {} }, 300);
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', sync); else sync();

    // TV remote: spatial navigation
    const FOC = 'a[href],button,input,select,[tabindex]:not([tabindex="-1"])';
    const scopeOf = () => (ov && ov.classList.contains('on') ? ov : D.getElementById('mtk-up') || D);
    W.addEventListener('keydown', (e) => {
      if (ov && ov.classList.contains('on') && (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack')) { if (!ovLock) ovClose(); e.preventDefault(); return; }
      if (D.getElementById('mtk-pl')) { if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack') { close(); e.preventDefault(); } return; }
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
  }
})();
