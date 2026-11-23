// ==UserScript==
// @name         MTK PRIME
// @namespace    mtk-media
// @version      1.0.2
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
    const BR = /VidsRcprime|VidSrc ?Prime|VidsRcPrime/g;
    const brand = (n) => {
      if (n.nodeType === 3) { if (BR.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(BR, 'MTK MEDIA'); BR.lastIndex = 0; return; }
      if (n.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(n.nodeName)) return;
      const w = D.createTreeWalker(n, NodeFilter.SHOW_TEXT); let t;
      while ((t = w.nextNode())) { if (BR.test(t.nodeValue)) t.nodeValue = t.nodeValue.replace(BR, 'MTK MEDIA'); BR.lastIndex = 0; }
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
      for (const m of ms) for (const n of m.addedNodes) { fix(n); brand(n); }
      if (/vidsrc/i.test(D.title)) D.title = D.title.replace(/VidsRc ?prime|VidSrc ?Prime/gi, 'MTK MEDIA');
    }).observe(D, { childList: true, subtree: true });

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
    const P = history.pushState, R = history.replaceState;
    history.pushState = function (st, t, url) {
      try {
        const u = new URL(url, location.href);
        const m = u.pathname.match(/^\/movie\/(\d+[^/]*)\/?$/);
        if (m) url = '/watch/movie/' + m[1];
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

    function sync() {
      const r = route();
      let pl = D.getElementById('mtk-pl');
      if (!r) {
        if (pl) { pl.remove(); D.documentElement.classList.remove('mtk-on'); exitFull(); }
        return;
      }
      const s = src(r);
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
      if (!f || f.dataset.s !== s) {
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
      goFull(); wake();
      setTimeout(() => { try { f.focus(); } catch (e) {} }, 300);
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', sync); else sync();

    // TV remote: spatial navigation
    const FOC = 'a[href],button,input,select,[tabindex]:not([tabindex="-1"])';
    W.addEventListener('keydown', (e) => {
      if (D.getElementById('mtk-pl')) { if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack') { close(); e.preventDefault(); } return; }
      const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (!dir || e.defaultPrevented) return;
      const a = D.activeElement;
      if (a && a.nodeName === 'INPUT' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
      const vis = [...D.querySelectorAll(FOC)].filter((el) => { const b = el.getBoundingClientRect(); return b.width > 4 && b.height > 4 && !el.disabled && getComputedStyle(el).visibility !== 'hidden'; });
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
