// ==UserScript==
// @name         MTK PRIME
// @namespace    mtk-media
// @version      1.1.0
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
    // watch history / continue watching
    const HK = 'mtk-hist';
    const hist = () => { try { return JSON.parse(localStorage.getItem(HK)) || []; } catch (e) { return []; } };
    const saveH = (h) => { try { localStorage.setItem(HK, JSON.stringify(h.slice(0, 30))); } catch (e) {} };
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
