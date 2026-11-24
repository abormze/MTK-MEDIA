// ==UserScript==
// @name         MTK ARABIC
// @namespace    https://abormze.github.io/MTK-MEDIA
// @version      1.0.0
// @description  MTK ARABIC - أفلام عربية ومسلسلات عربية وتركية بدون إعلانات وتشغيل مباشر
// @author       MTK
// @match        *://*.cimalight.co/*
// @match        *://cimalight.co/*
// @include      /^https?:\/\/([a-z0-9-]+\.)*cimalight\.[a-z.]+\/.*$/
// @match        *://anafast.org/*
// @match        *://vidoba.org/*
// @match        *://vidspeeds.org/*
// @match        *://uqload.vc/*
// @match        *://*.uqload.vc/*
// @match        *://vidtube.one/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://abormze.github.io/MTK-MEDIA/mtk-arabic.user.js
// @updateURL    https://abormze.github.io/MTK-MEDIA/mtk-arabic.user.js
// ==/UserScript==

function MTKARABIC() {
  'use strict';
  const W = window, D = document;
  if (W.__mtkOn) return;
  W.__mtkOn = true;
  if (D.documentElement) D.documentElement.setAttribute('data-mtk', '1');
  /* ---------------- popup / redirect-ad blocking (all frames) ---------------- */
  const isExternal = (href) => {
    try {
      const u = new URL(href, location.href);
      if (!/^https?:$/.test(u.protocol)) return false;
      return u.hostname !== location.hostname;
    } catch (e) { return false; }
  };
  const lockWin = (w) => {
    const fns = { open: () => null, alert: () => {}, confirm: () => false, prompt: () => null, print: () => {} };
    for (const k in fns) { try { Object.defineProperty(w, k, { value: fns[k], writable: false, configurable: false }); } catch (e) { try { w[k] = fns[k]; } catch (e2) {} } }
    try { if (w.Notification) w.Notification.requestPermission = () => Promise.resolve('denied'); } catch (e) {}
    try { const DP = w.HTMLDialogElement && w.HTMLDialogElement.prototype; if (DP) { DP.showModal = function () { this.remove(); }; DP.show = function () { this.remove(); }; } } catch (e) {}
  };
  lockWin(W);
  try {
    const cw = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', { configurable: true, get() { const w = cw.get.call(this); try { if (w) lockWin(w); } catch (e) {} return w; } });
  } catch (e) {}
  D.addEventListener('click', (e) => {
    const a = e.target && e.target.closest && e.target.closest('a[href]');
    if (a && (a.target === '_blank' || isExternal(a.href))) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);
  try {
    const nativeClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.target === '_blank' || isExternal(this.href)) return;
      return nativeClick.apply(this, arguments);
    };
  } catch (e) {}


  if (W.top !== W.self) { playerMode(); return; }
  if (!/cimalight/i.test(location.hostname) || /^\/(admin|login|register|cdn-cgi|uploads)/.test(location.pathname)) return;
  const CF = 'mtk-cf';
  if (sessionStorage.getItem(CF)) {
    sessionStorage.removeItem(CF);
    const t = setInterval(() => {
      if (D.readyState === 'complete' && !W._cf_chl_opt && !/just a moment|attention required|لحظة/i.test(D.title)) { clearInterval(t); setTimeout(() => location.reload(), 1200); }
    }, 1000);
    return;
  }
  try { W.stop(); } catch (e) {}
  appMode();

  function playerMode() {
    const AD_RE = /(doubleclick|googlesyndication|adservice|popads|popcash|propeller|adsterra|onclick|exoclick|juicyads|hilltopads|\/ads?\/|banner|vast)/i;
    const AD_TXT = /(aclib|zoneId|runPop|runAutoTag|runInterstitial|runBanner|madurird|acscdn|cchud|popunder|popMagic|adsbygoogle|adcash|monetag|VPN Toggle)/i;
    const OK_HOST = /(^|\.)(anafast\.[a-z]+|vidoba\.[a-z]+|vidspeeds?\.[a-z]+|uqload\.[a-z]+|cdnz\.quest|fasel[a-z0-9-]*\.[a-z.]+|scdns\.io|jwplayer\.com|jwpcdn\.com|jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com|googleapis\.com|gstatic\.com|jquery\.com|bootstrapcdn\.com|cloudflare\.com|hlsjs\.video-dev\.org|videojs\.com|plyr\.io)$/i;
    const badScript = (el) => {
      if (!el || el.nodeName !== 'SCRIPT') return false;
      const src = el.getAttribute('src');
      if (src) {
        try {
          const u = new URL(src, location.href);
          if (u.protocol === 'data:' || u.protocol === 'blob:') return AD_TXT.test(decodeURIComponent(u.href));
          return AD_RE.test(u.href) || AD_TXT.test(u.href) || (u.hostname !== location.hostname && !OK_HOST.test(u.hostname));
        } catch (e) { return true; }
      }
      const t = el.textContent || '';
      return AD_TXT.test(t) && !/jwplayer|\.setup\(|sources|m3u8|\.mp4|hls|videojs|clappr|plyr/i.test(t);
    };
    const kill = (el) => { try { el.type = 'javascript/blocked'; el.removeAttribute('src'); el.textContent = ''; el.remove(); } catch (e) {} };
    try {
      const NP = Node.prototype;
      ['appendChild', 'insertBefore', 'replaceChild'].forEach((m) => {
        const o = NP[m];
        NP[m] = function (n) {
          if (n && n.nodeName === 'SCRIPT' && badScript(n)) return n;
          if (n && n.nodeType === 11) n.querySelectorAll && n.querySelectorAll('script').forEach((x) => { if (badScript(x)) x.remove(); });
          return o.apply(this, arguments);
        };
      });
      const EP = Element.prototype;
      ['append', 'prepend', 'after', 'before', 'replaceWith'].forEach((m) => {
        const o = EP[m];
        if (!o) return;
        EP[m] = function (...a) { return o.apply(this, a.filter((n) => !(n && n.nodeName === 'SCRIPT' && badScript(n)))); };
      });
    } catch (e) {}
    try {
      new MutationObserver((ms) => {
        for (const m of ms) for (const n of m.addedNodes) {
          if (n.nodeName === 'SCRIPT') { if (badScript(n)) kill(n); }
          else if (n.querySelectorAll) n.querySelectorAll('script').forEach((x) => { if (badScript(x)) kill(x); });
        }
      }).observe(D, { childList: true, subtree: true });
    } catch (e) {}

    let jw;
    const patchInstance = (p) => {
      if (!p || p.__mtk || typeof p.setup !== 'function') return p;
      p.__mtk = true;
      const setup = p.setup;
      p.setup = function (cfg) {
        try {
          try { ['jwplayer.mute', 'jwplayer.volume'].forEach((k) => localStorage.removeItem(k)); localStorage.setItem('jwplayer.mute', 'false'); localStorage.setItem('jwplayer.volume', '100'); } catch (e) {}
          if (cfg) {
            delete cfg.advertising;
            cfg.autostart = true;
            cfg.mute = false;
            cfg.volume = 100;
            if (cfg.playlist && Array.isArray(cfg.playlist)) cfg.playlist.forEach((it) => { if (it) delete it.adschedule; });
          }
        } catch (e) {}
        const r = setup.call(this, cfg) || p;
        try {
          const loud = () => { try { r.setMute(false); r.setVolume(100); } catch (e) {} };
          r.on('ready', () => { loud(); try { r.play(); } catch (e) {} });
          r.on('play firstFrame', () => { if (!r.__mtkForcedMute) loud(); });
          r.on('autostartNotAllowed', () => {
            r.__mtkForcedMute = true;
            try { r.setMute(true); r.play(); } catch (e) {}
            onTap(() => { r.__mtkForcedMute = false; loud(); try { r.play(); } catch (e) {} });
          });
          r.on('adStarted adImpression adPlay', () => { try { r.skipAd(); } catch (e) {} });
        } catch (e) {}
        return r;
      };
      return p;
    };
    const wrapJW = (v) => {
      if (typeof v !== 'function' || v.__mtkProxy) return v;
      const px = new Proxy(v, {
        apply(t, th, args) { return patchInstance(Reflect.apply(t, th, args)); },
        get(t, k) { return k === '__mtkProxy' ? true : Reflect.get(t, k); },
      });
      return px;
    };
    try {
      Object.defineProperty(W, 'jwplayer', {
        configurable: true,
        get() { return jw; },
        set(v) { jw = wrapJW(v); },
      });
    } catch (e) {}

    const css = D.createElement('style');
    css.textContent = `
      html,body{background:#000!important;margin:0!important;overflow:hidden!important}
      .jw-logo,.jw-ad,.jw-flag-ads .jw-controlbar,[id*="pop" i]:not(video),[class*="popup" i],[class*="banner" i],[id*="banner" i]{display:none!important}
    `;
    const addCss = () => { const r = D.head || D.documentElement; if (r) { if (!css.isConnected) r.appendChild(css); return true; } return false; };
    if (!addCss()) D.addEventListener('readystatechange', addCss);

    const sweep = () => {
      D.querySelectorAll('iframe').forEach((f) => {
        const s = f.getAttribute('src') || '';
        if (!s || AD_RE.test(s)) f.remove();
      });
      D.querySelectorAll('script[src]').forEach((s) => { if (AD_RE.test(s.src)) s.remove(); });
      D.querySelectorAll('dialog, [popover]').forEach((el) => el.remove());
      if (D.body) D.body.querySelectorAll('div, section, aside, a, span').forEach((el) => {
        if (el.isConnected && !el.querySelector('video') && el.childElementCount < 30 && /VPN|Click to Download|Download Now|Install now|Get access|Watch hit movies|Full HD!/i.test(el.textContent || '')) {
          const box = el.closest('[style*="fixed"], [style*="absolute"]') || el;
          if (!box.querySelector('video')) box.remove();
        }
      });
      if (D.body) {
        Array.from(D.body.children).forEach((el) => {
          if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') return;
          const cs = getComputedStyle(el);
          if ((cs.position === 'fixed' || cs.position === 'absolute') && +cs.zIndex > 1000 &&
              !el.querySelector('video, .jwplayer, [class*="jw-"]') && !el.matches('video, .jwplayer')) el.remove();
        });
      }
    };
    function onTap(fn) {
      const h = () => { ['pointerdown', 'touchend', 'click', 'keydown'].forEach((t) => D.removeEventListener(t, h, true)); fn(); };
      ['pointerdown', 'touchend', 'click', 'keydown'].forEach((t) => D.addEventListener(t, h, true));
    }
    const tryPlay = () => {
      D.querySelectorAll('video').forEach((v) => {
        if (v.__mtk) return;
        v.__mtk = true;
        v.setAttribute('playsinline', '');
        v.muted = false;
        v.volume = 1;
        const p = v.play && v.play();
        if (p && p.catch) p.catch(() => {
          v.muted = true;
          v.play().catch(() => {});
          onTap(() => { v.muted = false; v.volume = 1; v.play().catch(() => {}); });
        });
      });
    };
    const RT = +((location.hash.match(/mtkt=(\d+)/) || [])[1] || 0);
    let sought = 0;
    const seekRT = (v) => {
      if (sought < 2 && RT > 0 && v.duration > RT + 30 && v.currentTime < RT - 5) { sought++; try { v.currentTime = RT; } catch (e) {} }
    };
    D.addEventListener('loadedmetadata', (e) => seekRT(e.target), true);
    D.addEventListener('playing', (e) => seekRT(e.target), true);
    const rep = () => {
      const v = D.querySelector('video');
      if (v && v.duration > 60 && v.currentTime > 5 && (!RT || sought)) try { parent.postMessage({ mtk: 'pos', p: v.currentTime, d: v.duration, r: v.playbackRate }, '*'); } catch (e) {}
    };
    let tick = 0;
    setInterval(() => {
      const v = D.querySelector('video');
      if (++tick % 5 === 0 || (v && v.duration > 60 && v.duration - v.currentTime < 25)) rep();
    }, 1000);
    D.addEventListener('pause', rep, true);
    W.addEventListener('message', (e) => { const m = e.data; if (m && m.mtk && e.source !== W && W.parent !== W) { try { parent.postMessage(m, '*'); } catch (x) {} } });
    let RATE = 1;
    W.addEventListener('message', (e) => {
      const m = e.data;
      if (!m || !m.mtk2) return;
      const v = D.querySelector('video');
      if (m.rate) { RATE = m.rate; if (v) v.playbackRate = RATE; }
      if (m.toggle && v) { if (v.paused) v.play(); else v.pause(); }
      if (m.seek && v && v.duration) v.currentTime = Math.min(v.duration - 5, v.currentTime + m.seek);
      D.querySelectorAll('iframe').forEach((f) => { try { f.contentWindow.postMessage(m, '*'); } catch (x) {} });
    });
    D.addEventListener('playing', (e) => { if (RATE !== 1 && e.target.playbackRate !== RATE) e.target.playbackRate = RATE; }, true);
    D.addEventListener('ended', () => { try { parent.postMessage({ mtk: 'end' }, '*'); } catch (e) {} }, true);
    new MutationObserver(() => { addCss(); sweep(); tryPlay(); }).observe(D, { childList: true, subtree: true });
    D.addEventListener('DOMContentLoaded', () => { sweep(); tryPlay(); });
    let n = 0;
    const iv = setInterval(() => { sweep(); tryPlay(); if (++n > 30) clearInterval(iv); }, 1000);
  }

  /* ============================== APP ============================== */
  function appMode() {
  const ORIGIN = location.origin;
  function cfFail() {
    const n = +(sessionStorage.getItem('mtk-cfn') || 0);
    if (n >= 3) return;
    sessionStorage.setItem('mtk-cfn', n + 1);
    sessionStorage.setItem(CF, '1');
    location.reload();
  }
  const docs = {};
  async function fetchDoc(u, ttl) {
    const key = u;
    if (docs[key]) return docs[key];
    let t = null;
    if (ttl) { try { const c = JSON.parse(sessionStorage.getItem('mtk-d-' + key)); if (c && Date.now() - c.t < ttl) t = c.v; } catch (e) {} }
    if (!t) {
      const r = await fetch(u, { credentials: 'include' });
      t = await r.text();
      if (/<title>\s*(Just a moment|Attention Required)/i.test(t) || /_cf_chl_opt/.test(t)) { cfFail(); throw new Error('cf'); }
      sessionStorage.removeItem('mtk-cfn');
      if (ttl) { try { sessionStorage.setItem('mtk-d-' + key, JSON.stringify({ t: Date.now(), v: t })); } catch (e) {} }
    }
    const d = new DOMParser().parseFromString(t, 'text/html');
    const b = d.createElement('base'); b.href = ORIGIN + '/'; d.head.prepend(b);
    return (docs[key] = d);
  }
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const clean = (t) => String(t || '').replace(/(سيما\s*لايت|cima\s*light)/gi, 'MTK').replace(/\s+/g, ' ').trim();
  const vidOf = (u) => { try { return new URL(u, ORIGIN).searchParams.get('vid') || ''; } catch (e) { return ''; } };
  function mkItem(vid, t, img, dur, g) {
    t = clean(t);
    const epm = t.match(/الحلقة\s*(\d+)/);
    const ser = /^مسلسل/.test(t) || !!epm;
    const name = t.replace(/^(مسلسل|فيلم)\s+/, '').replace(/\s*الحلقة\s*\d+.*$/, '').replace(/\s+(كامل|مترجم[ةه]?|مدبلج[ةه]?|اون\s*لاين)(\s.*)?$/, '').replace(/\s+الموسم\s+\S+.*$/, '').trim() || t;
    const x = { vid, t, img: img ? new URL(img, ORIGIN).href : '', ser, mv: !ser, ep: epm ? +epm[1] : 0, name, dur: (dur || '').trim(), g: g ? [g] : [] };
    x.full = t; x.t = name;
    x.k = ser ? 'n' : 'v';
    x.id = ser ? normN(name) : vid;
    return x;
  }
  const normN = (s) => String(s || '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^\u0600-\u06ffA-Za-z0-9]+/g, '').toLowerCase();
  function parseList(doc, g) {
    const out = [];
    doc.querySelectorAll('.pm-video-thumb').forEach((b) => {
      const a = b.querySelector('a[href*="watch.php"]');
      if (!a) return;
      const vid = vidOf(a.getAttribute('href'));
      if (!vid) return;
      const im = b.querySelector('img');
      const img = im && (im.getAttribute('data-echo') || im.getAttribute('data-original') || im.getAttribute('data-src') || im.getAttribute('src'));
      out.push(mkItem(vid, a.getAttribute('title') || (im && im.alt) || txt(a), img, txt(b.querySelector('.pm-label-duration')), g));
    });
    return out;
  }
  const BAD = /(هندي|هندية|كوري|كورية|اسيوي|اسيوية|انمي|انمى|كرتون|ياباني|صيني|تايلاندي)/;
  const allowed = (x) => !BAD.test(x.full) && (x.ser ? /[\u0600-\u06ff]/.test(x.name) : !/مترجم/.test(x.full) && !/[A-Za-z]{3,}/.test(x.name));
  const CATS = {
    am: { t: 'أفلام عربية', c: ['arabic-movies10'] },
    as: { t: 'مسلسلات عربية', c: ['arabic-series18', 'arabic-serie', 'ramadan-2026', 'ramadan-series'], ser: 1 },
    ts: { t: 'مسلسلات تركية', c: ['turkish-series22'], ser: 1 },
  };
  const CAT_T = { 'arabic-movies10': 'أفلام عربية', 'arabic-series18': 'مسلسلات عربية', 'arabic-serie': 'مسلسلات مصرية', 'ramadan-2026': 'رمضان 2026', 'ramadan-series': 'مسلسلات رمضان', 'turkish-series22': 'مسلسلات تركية' };
  const catUrl = (c, page, sort) => '/category.php?cat=' + c + '&page=' + (page || 1) + '&sortby=' + (sort || 'date');
  async function catList(c, page, sort) {
    const d = await fetchDoc(catUrl(c, page, sort), 600e3);
    return parseList(d, CAT_T[c] || '').filter((x) => c === 'arabic-movies10' ? !x.ser && allowed(x) : x.ser && allowed(x));
  }
  function groupSer(items) {
    const m = new Map();
    items.forEach((x) => { const k = x.id; if (!m.has(k)) m.set(k, Object.assign({}, x, { n: 1 })); else m.get(k).n++; });
    return Array.from(m.values());
  }
  /* ---------- helpers ---------- */
  const h = (tag, attrs, ...kids) => {
    const el = D.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    kids.flat(Infinity).forEach((c) => { if (c != null && c !== false) el.append(c.nodeType ? c : String(c)); });
    if (tag === 'img') {
      el.referrerPolicy = 'no-referrer';
      el.addEventListener('error', () => { const f = el.dataset.fb; if (f && el.src !== new URL(f, location.href).href) { el.src = f; delete el.dataset.fb; } else el.style.visibility = 'hidden'; });
    }
    return el;
  };
  const icon = (name) => {
    const P = {
      home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
      film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4',
      tv: 'M3 6h18v12H3zM8 21h8M12 18v3',
      search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
      back: 'M9 5l7 7-7 7', play: 'M7 4l13 8-13 8z', close: 'M5 5l14 14M19 5L5 19',
      next: 'M15 5l-7 7 7 7', prev: 'M9 5l7 7-7 7',
      star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
      heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
      rocket: 'M12 2c4 3 5 8 3 13H9C7 10 8 5 12 2zM9 15l-3 4 4-1M15 15l3 4-4-1M12 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
    };
    const s = D.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ic');
    const p = D.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', P[name]);
    if (name === 'play') p.setAttribute('fill', 'currentColor');
    s.append(p);
    return s;
  };
  const loader = (sm) => h('div', { class: 'loader' + (sm ? ' small' : '') }, h('i'), h('i'), h('i'));
  const mins = (s) => Math.floor(s / 60);

  /* ---------- profiles / storage ---------- */
  const PROFS = 'mtk-profs', PINS = 'mtk-pins';
  const pins = () => { try { return JSON.parse(localStorage.getItem(PINS)) || {}; } catch (e) { return {}; } };
  const pinH = (v) => { let x = 7; for (const c of v) x = (x * 31 + c.charCodeAt(0)) >>> 0; return 'h' + x.toString(36); };
  const setPin = (id, v) => { const m = pins(); if (v) m[id] = pinH(v); else delete m[id]; localStorage.setItem(PINS, JSON.stringify(m)); };
  const profs = () => { try { return JSON.parse(localStorage.getItem(PROFS)) || []; } catch (e) { return []; } };
  const pid = () => localStorage.getItem('mtk-prof') || '';
  const prof = () => profs().find((x) => x.id === pid()) || { id: '', n: 'الرئيسي' };
  const kids = () => !!prof().k;
  const pk = (k) => (pid() ? k + '@' + pid() : k);
  const getJ = (k, d) => { try { return JSON.parse(localStorage.getItem(pk(k))) || d; } catch (e) { return d; } };
  const setJ = (k, v) => { try { localStorage.setItem(pk(k), JSON.stringify(v)); } catch (e) {} };
  const hist = () => getJ('mtk-hist', []);
  const posMap = () => getJ('mtk-pos', {});
  const myList = () => getJ('mtk-list', []).filter((y) => y && y.k);
  const taste = () => getJ('mtk-taste', {});
  const sk = (x) => x.k + ':' + x.id;
  const inList = (x) => myList().some((y) => sk(y) === sk(x));
  function toggleList(x) { const l = myList(), has = inList(x); setJ('mtk-list', has ? l.filter((y) => sk(y) !== sk(x)) : [{ k: x.k, id: x.id, t: x.t, img: x.img, vid: x.vid, mv: x.mv, ser: x.ser, ep: x.ep, g: x.g }].concat(l).slice(0, 200)); return !has; }
  const done = (p, d) => d > 0 && p > d - Math.min(120, d * 0.08);
  function learn(x) { const t = taste(); x.g.forEach((g) => { t[g] = (t[g] || 0) + 1; }); setJ('mtk-taste', t); }
  const topG = () => Object.entries(taste()).sort((a, b) => b[1] - a[1]).map((e) => e[0]);

  /* ---------- shell ---------- */
  if (!D.documentElement) D.appendChild(D.createElement('html'));
  D.documentElement.innerHTML = '<head></head><body></body>';
  D.documentElement.setAttribute('lang', 'ar');
  D.documentElement.setAttribute('dir', 'rtl');
  D.documentElement.setAttribute('data-mtk', '1');
  D.head.append(
    h('meta', { charset: 'utf-8' }),
    h('meta', { name: 'viewport', content: 'width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover' }),
    h('meta', { name: 'theme-color', content: '#0a0a10' }),
    h('meta', { name: 'referrer', content: 'origin' }),
    h('title', null, 'MTK ARABIC'),
    h('style', null, CSS())
  );
  const main = h('main', { id: 'mtk-main' });
  const backBtn = h('button', { class: 'hbtn', id: 'mtk-back', 'aria-label': 'رجوع', onclick: () => (history.length > 1 ? history.back() : go('/main31', true)) }, icon('back'));
  const profBtn = h('button', { class: 'pbtn', 'aria-label': 'الملف', onclick: () => openProfiles() });
  function paintProf() {
    const x = prof();
    profBtn.textContent = '';
    profBtn.append(h('span', { class: 'pav sm' + (x.k ? ' kid' : '') }, x.n.slice(0, 1)), h('small', null, x.n));
  }
  const header = h('header', { id: 'mtk-head' }, backBtn,
    h('a', { class: 'logo', href: '/main31', 'data-spa': '' }, h('b', null, 'MTK'), ' ARABIC'),
    h('div', { class: 'hside' }, profBtn, h('button', { class: 'hbtn', 'aria-label': 'بحث', onclick: () => go('/mtk/search', false) }, icon('search'))));
  const NAV = [['home', 'الرئيسية', '/main31'], ['film', 'أفلام عربية', '/mtk/am'], ['tv', 'مسلسلات عربية', '/mtk/as'], ['star', 'مسلسلات تركية', '/mtk/ts'], ['heart', 'قائمتي', '/mtk/list']];
  const nav = h('nav', { id: 'mtk-nav' }, NAV.map(([ic, t, u]) => h('a', { href: u, 'data-spa': '', 'data-p': u }, icon(ic), h('span', null, t))));
  const sheet = h('div', { id: 'mtk-sheet', onclick: (e) => { if (e.target === sheet) closeSheet(); } });
  const fsBox = h('div', { id: 'mtk-fs' });
  const mine = new Set([header, main, nav, sheet, fsBox]);
  const purge = () => {
    if (!D.body) return;
    Array.from(D.documentElement.children).forEach((el) => { if (el !== D.head && el !== D.body) el.remove(); });
    Array.from(D.body.children).forEach((el) => { if (!mine.has(el)) el.remove(); });
    D.querySelectorAll('script,dialog,[popover]').forEach((el) => el.remove());
    D.querySelectorAll('iframe').forEach((f) => { if (!fsBox.contains(f)) f.remove(); });
  };
  new MutationObserver(purge).observe(D.documentElement, { childList: true, subtree: true });
  const mount = () => { if (!D.body) return setTimeout(mount, 10); D.body.append(header, main, nav, sheet, fsBox); };
  mount();
  function closeSheet() { if (sheet.dataset.lock) return; sheet.classList.remove('open'); sheet.textContent = ''; }
  /* ---------- TV remote navigation ---------- */
  const DIRS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const FOC = 'a[href],button,input,[tabindex]:not([tabindex="-1"])';
  const visEl = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.disabled; };
  function spatial(dir, cur) {
    const open = sheet.classList.contains('open');
    const all_ = [];
    (open ? [sheet] : [main, header, nav]).forEach((c) => c.querySelectorAll(FOC).forEach((el) => { if (visEl(el)) all_.push(el); }));
    const a = cur.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    const pick = (list) => {
      let best = null, bs = Infinity;
      list.forEach((el) => {
        if (el === cur || el.contains(cur) || cur.contains(el)) return;
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        let pri, sec, ov;
        if (dir[0]) { pri = (cx - ax) * dir[0]; ov = r.top < a.bottom - 2 && r.bottom > a.top + 2; sec = ov ? 0 : Math.abs(cy - ay); }
        else { pri = (cy - ay) * dir[1]; ov = r.left < a.right - 2 && r.right > a.left + 2; sec = ov ? Math.abs(cx - ax) * 0.3 : Math.abs(cx - ax); }
        if (pri < 4) return;
        const sc = pri + sec * (dir[0] ? 4 : 2);
        if (sc < bs) { bs = sc; best = el; }
      });
      return best;
    };
    if (open) return pick(all_);
    const mainEls = all_.filter((el) => main.contains(el));
    if (main.contains(cur)) return pick(mainEls) || (dir[1] > 0 ? pick(all_.filter((el) => nav.contains(el))) : dir[1] < 0 ? pick(all_.filter((el) => header.contains(el))) : null);
    const bar = header.contains(cur) ? header : nav;
    const same = pick(all_.filter((el) => bar.contains(el)));
    if (dir[0]) return same;
    const vv = mainEls.filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > 60 && r.top < innerHeight - 60; });
    return pick(vv.length ? vv : mainEls) || same;
  }
  D.addEventListener('keydown', (e) => {
    if (fsOn) return fsKey(e);
    if (sheet.querySelector('.pkeys')) {
      const k = /^[0-9]$/.test(e.key) ? e.key : e.key === 'Backspace' ? 'del' : '';
      if (k) { e.preventDefault(); e.stopPropagation(); sheet._pin(k); return; }
    }
    const dir = DIRS[e.key];
    if (!dir || e.altKey || e.ctrlKey || e.metaKey) return;
    const cur = D.activeElement;
    if (cur && cur.tagName === 'INPUT' && dir[0]) return;
    e.preventDefault();
    e.stopPropagation();
    let nx;
    if (!cur || cur === D.body || !visEl(cur) || !(main.contains(cur) || header.contains(cur) || nav.contains(cur) || sheet.contains(cur))) {
      const c = (sheet.classList.contains('open') ? sheet : main).querySelectorAll(FOC);
      nx = Array.from(c).find((el) => { if (!visEl(el)) return false; const r = el.getBoundingClientRect(); return r.bottom > 60 && r.top < innerHeight - 60; }) || c[0];
    } else nx = spatial(dir, cur);
    if (!nx) return;
    nx.focus({ preventScroll: true });
    if (main.contains(nx) || sheet.contains(nx)) {
      const sc = nx.closest('.scroller');
      if (sc) {
        const r = nx.getBoundingClientRect(), sr = sc.getBoundingClientRect();
        if (r.left < sr.left + 10 || r.right > sr.right - 10) sc.scrollBy({ left: r.left + r.width / 2 - (sr.left + sr.width / 2), behavior: 'smooth' });
      }
      const r = nx.getBoundingClientRect();
      if (r.top < 70 || r.bottom > innerHeight - 80) W.scrollBy({ top: r.top + r.height / 2 - innerHeight / 2, behavior: 'smooth' });
    }
  }, true);

  /* ---------- catalog ---------- */
  const vis = (l) => l;
  const showHref = (x) => '/watch.php?vid=' + x.vid;
  const SECS = { am: 'أفلام عربية', as: 'مسلسلات عربية', ts: 'مسلسلات تركية' };
  const inSec = (x, s) => CATS[s].c.some((c) => x.g.includes(CAT_T[c]));
  const norm = (s) => String(s || '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[\u064B-\u0652]/g, '').toLowerCase().trim();
  let ALL = null;
  async function all() {
    if (ALL) return ALL;
    const jobs = [];
    Object.keys(CAT_T).forEach((c) => {
      [1, 2].forEach((p) => jobs.push(catList(c, p).then((l) => l.map((x, i) => Object.assign(x, { pos: (p - 1) * 40 + i }))).catch(() => [])));
      jobs.push(catList(c, 1, 'views').then((l) => l.map((x, i) => Object.assign(x, { v: 100 - i, pos: 999 }))).catch(() => []));
    });
    const m = new Map();
    (await Promise.all(jobs)).flat().forEach((x) => {
      x.v = x.v || 0;
      const k = sk(x), o = m.get(k);
      if (!o) return m.set(k, x);
      o.v = Math.max(o.v, x.v); o.pos = Math.min(o.pos, x.pos);
      if (x.ser && x.ep > o.ep) { o.ep = x.ep; o.vid = x.vid; o.img = x.img || o.img; }
      x.g.forEach((g) => { if (!o.g.includes(g)) o.g.push(g); });
    });
    ALL = Array.from(m.values());
    if (!ALL.length) throw new Error('empty');
    return ALL;
  }
  async function getWatch(vid) {
    const d = await fetchDoc('/watch.php?vid=' + vid, 600e3);
    const title = clean(txt(d.querySelector('h1')));
    const og = d.querySelector('meta[property="og:image"]');
    const de = d.querySelector('.pm-video-description [itemprop=description]') || d.querySelector('[itemprop=description]');
    const desc = clean(txt(de)).replace(/^مشاهدة\s+(و\s*)?تحميل[^،,]*[،,]\s*/, '');
    const em = d.querySelector('link[itemprop=embedUrl]');
    const seasons = [];
    d.querySelectorAll('.SeasonsBoxUL .tablinks').forEach((b) => {
      const id = ((b.getAttribute('onclick') || '').match(/'([^']+)'/) || [])[1];
      const box = id && d.getElementById(id);
      if (!box) return;
      const eps = Array.from(box.querySelectorAll('a[href*="watch.php"]')).map((a) => ({ id: vidOf(a.getAttribute('href')), n: +((txt(a).match(/\d+/) || [])[0] || 0) })).filter((e) => e.id).sort((a, b) => a.n - b.n);
      if (eps.length) seasons.push({ t: txt(b), eps });
    });
    const cats = Array.from(d.querySelectorAll('.seasonEp a[href*="category.php"]')).map((a) => { try { return new URL(a.getAttribute('href'), ORIGIN).searchParams.get('cat'); } catch (e) { return ''; } });
    const related = parseList(d, '').filter(allowed);
    return { vid, title, img: og ? og.getAttribute('content') : '', desc, emb: em ? em.getAttribute('href') : '', seasons, cats, related };
  }
  const HOSTS = [[/anafast\./i, 'Anafast'], [/vidoba\./i, 'VidoBA'], [/vidspeeds?\./i, 'VidSpeed'], [/uqload\./i, 'Uqload']];
  async function servers(w) {
    const out = [];
    const push = (u, n) => { if (u && !out.some((s) => s.u === u)) out.push({ u, n }); };
    if (w.emb && /^https:/.test(w.emb)) push(w.emb, (HOSTS.find((x) => x[0].test(w.emb)) || [0, 'سيرفر 1'])[1]);
    try {
      const d = await fetchDoc('/downloads.php?vid=' + w.vid, 600e3);
      d.querySelectorAll('a[href]').forEach((a) => {
        const href = a.getAttribute('href') || '';
        const hh = HOSTS.find((x) => x[0].test(href));
        const m = hh && href.match(/^(https:\/\/[^/]+)\/(?:d\/|embed-)?([a-z0-9]{8,})(?:\.html)?/i);
        if (m) push(m[1] + '/embed-' + m[2] + '.html', hh[1]);
      });
    } catch (e) {}
    return out;
  }
  function epsOf(x, w) {
    if (x.mv || !w.seasons.length) return [{ id: w.vid, n: 1, t: x.t }];
    const r = [];
    w.seasons.forEach((s, si) => s.eps.forEach((e) => r.push({ id: e.id, n: e.n, s: si, t: (w.seasons.length > 1 ? s.t + ' - ' : '') + 'الحلقة ' + e.n })));
    return r;
  }
  function itemOf(w) {
    const t = mkItem(w.vid, w.title, w.img, '', '');
    const o = ALL.find((y) => sk(y) === sk(t));
    if (o) return o;
    w.cats.forEach((c) => { if (CAT_T[c]) t.g.push(CAT_T[c]); });
    return t;
  }
  async function startShow(c) {
    const w = await getWatch(c.vid).catch(() => null);
    if (!w) return;
    const eps = epsOf(c, w);
    if (eps.length) play(c, eps, eps[0]);
  }

  /* ---------- router ---------- */
  let navToken = 0;
  D.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented) return;
    const u = new URL(a.getAttribute('href'), location.href);
    e.preventDefault();
    if (u.host !== location.host) return;
    go(u.pathname + u.search, false);
  }, true);
  W.addEventListener('popstate', () => { if (fsOn) closeFS(); route(); });
  function go(u, replace) {
    if (fsOn) closeFS();
    history[replace ? 'replaceState' : 'pushState'](null, '', u);
    route();
  }
  const isHome = (p) => p === '/' || /^\/(main\d*|index\.php|home\.php)$/.test(p);
  async function route() {
    const tok = ++navToken;
    const p = location.pathname.replace(/\/+$/, '') || '/';
    const q = new URLSearchParams(location.search);
    nav.querySelectorAll('a').forEach((a) => a.classList.toggle('on', a.dataset.p === p || (isHome(p) && a.dataset.p === '/main31')));
    backBtn.style.visibility = isHome(p) ? 'hidden' : 'visible';
    main.textContent = '';
    main.append(loader());
    W.scrollTo(0, 0);
    let m;
    try {
      await all();
      if (tok !== navToken) return;
      main.textContent = '';
      if ((m = p.match(/^\/mtk\/(am|as|ts)$/))) return browse(m[1]);
      if (p === '/mtk/c') return catPage(q.get('c'));
      if (p === '/category.php' && CAT_T[q.get('cat')]) return catPage(q.get('cat'));
      if (p === '/mtk/list') return listPage();
      if (p === '/mtk/search' || p === '/search.php') return searchPage(q.get('q') || q.get('keywords') || '');
      if (p === '/watch.php' && q.get('vid')) return await detail(q.get('vid'), q.get('mtkp'), tok);
      return home();
    } catch (e) {
      if (tok !== navToken) return;
      main.textContent = '';
      main.append(h('div', { class: 'empty' }, 'ما قدرت جيب المحتوى', h('button', { class: 'btn big', onclick: () => location.reload() }, 'جرّب كمان مرة')));
    }
  }

  /* ---------- pages ---------- */
  const top10 = (L) => L.filter((x) => x.v).sort((a, b) => b.v - a.v).slice(0, 10);
  const latest = (L) => L.slice().sort((a, b) => a.pos - b.pos);
  function newEpsRow() {
    const fol = hist().filter((e) => e.show.startsWith('n:'));
    const items = fol.map((e) => { const x = ALL.find((y) => sk(y) === e.show); return x && x.ep > (e.epN || 0) ? x : null; }).filter(Boolean);
    return rowEl('حلقات جديدة من مسلسلاتك', items, { card: (x) => cardEl(x, { href: '/watch.php?vid=' + x.vid + '&mtkp=1', badge: 'حلقة جديدة', sub: 'الحلقة ' + x.ep }) });
  }
  function home() {
    const L = ALL;
    D.title = 'MTK ARABIC';
    const seen = new Set(hist().map((e) => e.show));
    const add = (r) => r && main.append(r);
    const pool = L.filter((x) => x.v && x.img && !seen.has(sk(x)));
    if (pool.length) main.append(heroes(shuffle(pool, day).slice(0, 6)));
    const cw = cwEl(); if (cw) main.append(cw);
    add(rowEl('قائمتي', myList(), { more: '/mtk/list' }));
    add(newEpsRow());
    const tg = topG().slice(0, 2);
    const recs = shuffle(L.filter((x) => !seen.has(sk(x)) && x.g.some((g) => tg.includes(g))), day).slice(0, 20);
    if (recs.length > 4) add(rowEl('مقترح لك', recs));
    add(rowEl('أعلى 10 أفلام عربية', top10(L.filter((x) => inSec(x, 'am'))), { num: 1, cls: 'top10' }));
    add(rowEl('أعلى 10 مسلسلات عربية', top10(L.filter((x) => inSec(x, 'as'))), { num: 1, cls: 'top10' }));
    add(rowEl('أعلى 10 مسلسلات تركية', top10(L.filter((x) => inSec(x, 'ts'))), { num: 1, cls: 'top10' }));
    tg.forEach((g) => add(rowEl('لأنك بتحب ' + g, shuffle(L.filter((x) => x.g.includes(g) && !seen.has(sk(x))), day + 1).slice(0, 20))));
    add(rowEl('أحدث الأفلام العربية', latest(L.filter((x) => inSec(x, 'am'))).slice(0, 24), { more: '/mtk/am' }));
    add(rowEl('أحدث الحلقات العربية', latest(L.filter((x) => inSec(x, 'as'))).slice(0, 24), { more: '/mtk/as' }));
    add(rowEl('أحدث الحلقات التركية', latest(L.filter((x) => inSec(x, 'ts'))).slice(0, 24), { more: '/mtk/ts' }));
    ['arabic-serie', 'ramadan-2026', 'ramadan-series'].forEach((c) => add(rowEl(CAT_T[c], latest(L.filter((x) => x.g.includes(CAT_T[c]))).slice(0, 24), { more: '/mtk/c?c=' + c })));
  }
  function browse(s) {
    const S = CATS[s];
    D.title = S.t + ' | MTK ARABIC';
    const L = ALL.filter((x) => inSec(x, s));
    const add = (r) => r && main.append(r);
    main.append(h('h2', { class: 'ptitle' }, S.t), S.c.length > 1 ? h('div', { class: 'gchips' }, S.c.map((c) => h('a', { class: 'chip', href: '/mtk/c?c=' + c, 'data-spa': '' }, CAT_T[c]))) : null);
    add(rowEl('الأعلى مشاهدة', top10(L), { num: 1, cls: 'top10' }));
    const seen = new Set(hist().map((e) => e.show));
    add(rowEl('ما شفتها لسا', shuffle(L.filter((x) => !seen.has(sk(x))), day).slice(0, 20)));
    if (S.c.length > 1) S.c.forEach((c) => add(rowEl(CAT_T[c], latest(L.filter((x) => x.g.includes(CAT_T[c]))).slice(0, 24), { more: '/mtk/c?c=' + c })));
    main.append(h('h3', { class: 'ptitle' }, s === 'am' ? 'كل الأفلام' : 'كل المسلسلات'));
    pager(S.c);
  }
  function pager(cs) {
    const g = h('div', { class: 'grid' });
    const keys = new Set();
    let page = 0, busy = false;
    const more = h('button', { class: 'btn big more' }, 'المزيد');
    const load = async () => {
      if (busy) return;
      busy = true; more.textContent = '...';
      page++;
      const l = (await Promise.all(cs.map((c) => catList(c, page).catch(() => [])))).flat();
      l.forEach((x) => { const k = sk(x); if (keys.has(k)) return; keys.add(k); g.append(cardEl(ALL.find((y) => sk(y) === k) || x)); });
      busy = false; more.textContent = 'المزيد';
      if (!l.length) more.remove();
    };
    more.onclick = load;
    main.append(g, more);
    load();
  }
  function catPage(c) {
    const t = CAT_T[c] || '';
    D.title = t + ' | MTK ARABIC';
    main.append(h('h2', { class: 'ptitle' }, t));
    pager([c]);
  }
  function grid(items) { return h('div', { class: 'grid' }, items.map((x) => cardEl(x))); }
  function listPage() {
    D.title = 'قائمتي | MTK ARABIC';
    const L = myList();
    main.append(h('h2', { class: 'ptitle' }, 'قائمتي'), L.length ? grid(L) : h('div', { class: 'empty' }, 'قائمتك فاضية. اكبس «قائمتي» بصفحة أي فيلم أو مسلسل لتضيفو هون.'));
  }
  function searchPage(q0) {
    D.title = 'بحث | MTK ARABIC';
    const inp = h('input', { type: 'search', placeholder: 'دوّر على فيلم أو مسلسل...', value: q0, enterkeyhint: 'search' });
    const res = h('div');
    let tk = 0;
    const run = async () => {
      const q = norm(inp.value), my = ++tk;
      res.textContent = '';
      history.replaceState(null, '', '/mtk/search' + (inp.value ? '?q=' + encodeURIComponent(inp.value) : ''));
      if (!q) return res.append(rowEl('الأكثر مشاهدة', top10(ALL).concat(top10(ALL.filter((x) => x.ser)))) || '');
      const loc = ALL.filter((x) => norm(x.t).includes(q));
      const g = grid(loc);
      res.append(g);
      const ld = loader(true); res.append(ld);
      let rem = [];
      try { rem = parseList(await fetchDoc('/search.php?keywords=' + encodeURIComponent(inp.value.trim()), 300e3), '').filter(allowed); } catch (e) {}
      if (my !== tk) return;
      ld.remove();
      const ks = new Set(loc.map(sk));
      rem.forEach((x) => { if (!ks.has(sk(x))) { ks.add(sk(x)); g.append(cardEl(x)); } });
      if (!ks.size) res.append(h('div', { class: 'empty' }, 'ما لقيت شي لـ «' + inp.value + '»'));
    };
    let t = 0;
    inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 500); });
    main.append(h('form', { class: 'sform', onsubmit: (e) => { e.preventDefault(); run(); inp.blur(); } }, inp, h('button', { class: 'sbtn', type: 'submit' }, icon('search'))), res);
    run();
    setTimeout(() => { try { inp.focus(); } catch (e) {} }, 50);
  }

  /* ---------- detail ---------- */
  async function detail(vid, auto, tok) {
    const w = await getWatch(vid);
    if (tok !== navToken) return;
    if (BAD.test(w.title)) { main.append(h('div', { class: 'empty' }, 'هالمحتوى مش ضمن MTK ARABIC')); return; }
    const x = itemOf(w);
    x.img = x.img || w.img;
    D.title = x.t + ' | MTK ARABIC';
    const eps = epsOf(x, w);
    const he = hist().find((e) => e.show === sk(x));
    const pm = posMap();
    main.append(h('div', { class: 'dtop' },
      h('img', { class: 'dban', src: w.img || x.img, alt: '' }),
      h('div', { class: 'single' }, h('img', { class: 'poster', src: x.img || w.img, alt: '' }),
        h('div', { class: 'sinfo' }, h('h1', null, x.t),
          h('div', { class: 'meta' }, [x.g.join(' • '), !x.mv ? eps.length + ' حلقة' : ''].filter(Boolean).join(' • '))))));
    const cont = he && eps.find((e) => e.id === he.epId);
    const playB = h('button', { class: 'btn big' }, icon('play'), ' ', cont ? (x.mv ? 'كمّل' : 'كمّل الحلقة ' + cont.n) : 'شاهد');
    playB.onclick = () => play(x, eps, cont || eps[0]);
    main.append(h('div', { class: 'acts' }, playB, listBtn(x)), w.desc ? h('p', { class: 'desc' }, w.desc.slice(0, 600)) : null);
    if (!x.mv && eps.length) {
      const box = h('div', { class: 'eplist' });
      const show = (si) => {
        box.textContent = '';
        eps.filter((e) => e.s === si).forEach((e) => {
          const q = pm[sk(x) + ':' + e.id];
          box.append(h('button', { class: 'epi' + (he && he.epId === e.id ? ' on' : ''), onclick: () => play(x, eps, e) },
            h('div', { class: 'ethumb' }, h('b', null, e.n), h('span', { class: 'pl' }, icon('play')),
              q && q[1] ? h('span', { class: 'cwb' }, h('i', { style: 'width:' + Math.min(100, Math.round(q[0] * 100 / q[1])) + '%' })) : null),
            h('div', { class: 'etitle' }, 'الحلقة ' + e.n)));
        });
      };
      const cur = (cont || eps.find((e) => e.id === vid) || eps[0]).s;
      const tabs = w.seasons.length > 1 ? h('div', { class: 'gchips' }, w.seasons.map((s, si) => h('button', { class: 'chip' + (si === cur ? ' on' : ''), onclick: (ev) => { tabs.querySelectorAll('.chip').forEach((c) => c.classList.remove('on')); ev.currentTarget.classList.add('on'); show(si); } }, s.t))) : null;
      main.append(h('h3', { class: 'ptitle' }, 'الحلقات'), tabs, box);
      show(cur);
    }
    const ks = new Set([sk(x)]);
    const sim = w.related.concat(shuffle(ALL.filter((y) => y.mv === x.mv && y.g.some((g) => x.g.includes(g))), day)).filter((y) => !ks.has(sk(y)) && ks.add(sk(y))).slice(0, 20);
    const r = rowEl(x.mv ? 'أفلام قد تعجبك' : 'مسلسلات قد تعجبك', sim);
    if (r) main.append(r);
    if (auto) { const e = eps.find((y) => y.id === vid) || eps[0]; if (e) play(x, eps, e); }
  }
  /* ---------- cards / rows ---------- */
  function cardEl(x, o) {
    o = o || {};
    const pp = o.prog;
    return h('a', { class: 'card' + (o.wide ? ' wide' : ''), href: o.href || showHref(x), 'data-spa': '' },
      h('div', { class: 'thumb' },
        (o.img || x.img) ? h('img', { src: o.img || x.img, 'data-fb': o.img && x.img && o.img !== x.img ? x.img : null, loading: 'lazy', alt: '' }) : null,
        o.badge ? h('span', { class: 'badge' }, o.badge) : (x.mv ? h('span', { class: 'badge mv' }, 'فيلم') : null),
        o.num ? h('span', { class: 'tnum' }, String(o.num)) : null,
        o.x ? h('span', { class: 'cwx', role: 'button', tabindex: '0', 'aria-label': 'شيل', onclick: (e) => { e.preventDefault(); e.stopPropagation(); o.x(); }, onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); o.x(); } } }, icon('close')) : null,
        pp ? h('span', { class: 'cwb' }, h('i', { style: 'width:' + Math.min(100, Math.round(pp * 100)) + '%' })) : null,
        h('span', { class: 'pl' }, icon('play'))),
      h('div', { class: 'ctitle' }, o.title || x.t),
      (o.sub || (x.ser && x.ep ? 'الحلقة ' + x.ep : '')) ? h('div', { class: 'cws' }, o.sub || 'الحلقة ' + x.ep) : null);
  }
  function rowEl(title, items, o) {
    o = o || {};
    if (!items.length) return null;
    return h('section', { class: 'row' + (o.cls ? ' ' + o.cls : ''), id: o.id || null },
      h('div', { class: 'rhead' }, h('h3', null, title), o.more ? h('a', { href: o.more, 'data-spa': '' }, 'الكل') : null),
      h('div', { class: 'scroller' }, items.map((x, i) => (o.card ? o.card(x, i) : cardEl(x, o.num ? { num: i + 1 } : null)))));
  }
  const shuffle = (a, seed) => { const r = a.slice(); let s = seed || 1; for (let i = r.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
  const day = Math.floor(Date.now() / 864e5);
  const byG = (list, g) => list.filter((x) => x.g.includes(g) || x.cat === g);
  const gl = (g, t) => '/mtk/g?n=' + encodeURIComponent(g) + (t ? '&t=' + t : '');
  function cwEl() {
    const l = hist().slice(0, 20);
    if (!l.length) return null;
    return rowEl('تابع المشاهدة', l, { id: 'mtk-cw', card: (e) => cardEl({ img: e.img, t: e.title, mv: false }, { href: e.href, title: e.title, sub: [e.ep, e.p > 60 ? 'كمّل من ' + mins(e.p) + ' د' : ''].filter(Boolean).join(' • '), prog: e.d ? e.p / e.d : 0, x: () => { setJ('mtk-hist', hist().filter((y) => y.sid !== e.sid)); refreshCW(); } }) });
  }
  function refreshCW() { const o = D.getElementById('mtk-cw'); if (!o) return; const n = cwEl(); if (n) o.replaceWith(n); else o.remove(); }
  function hero(x) {
    return h('section', { class: 'hero' },
      h('img', { src: x.hero || x.img, 'data-fb': x.img, alt: '' }),
      h('div', { class: 'hinfo' },
        h('h2', null, x.t),
        h('div', { class: 'meta' }, [x.cat, x.y, x.n > 1 ? x.n + ' حلقة' : ''].filter(Boolean).join(' • ')),
        h('div', { class: 'hbtns' },
          h('a', { class: 'btn big', href: showHref(x), 'data-spa': '' }, icon('play'), ' شاهد'),
          listBtn(x))));
  }
  function listBtn(x) {
    const b = h('button', { class: 'btn mylist' + (inList(x) ? ' on' : ''), onclick: () => { const on = toggleList(x); b.classList.toggle('on', on); b.lastChild.textContent = on ? ' بقائمتي' : ' قائمتي'; } }, icon('heart'), inList(x) ? ' بقائمتي' : ' قائمتي');
    return b;
  }
  function heroes(list) {
    if (!list.length) return null;
    if (list.length === 1) return hero(list[0]);
    let i = 0, t = 0;
    const slides = list.map((x) => hero(x));
    const dots = h('div', { class: 'hdots' }, list.map((_, j) => h('i', { onclick: () => step(j - i) })));
    const paint = () => { slides.forEach((s, j) => s.classList.toggle('on', j === i)); Array.from(dots.children).forEach((d, j) => d.classList.toggle('on', j === i)); };
    const auto = () => { clearInterval(t); t = setInterval(() => { if (!box.isConnected) return clearInterval(t); if (!(box.contains(D.activeElement) && D.activeElement.matches(':focus-visible'))) { i = (i + 1) % list.length; paint(); } }, 6000); };
    const step = (d) => { i = (i + d + list.length) % list.length; paint(); auto(); };
    const box = h('div', { class: 'hcar' }, slides,
      h('button', { class: 'harr hnext', 'aria-label': 'التالي', onclick: () => step(1) }, icon('prev')),
      h('button', { class: 'harr hprev', 'aria-label': 'السابق', onclick: () => step(-1) }, icon('next')), dots);
    let sx = 0;
    box.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', (e) => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 45) step(dx > 0 ? -1 : 1); }, { passive: true });
    paint(); auto();
    return box;
  }
  /* ---------- player ---------- */
  let fsOn = false, hls = null, vid = null, curSid = '', curUp = null, upCancel = false, upT = 0, upBox = null, lastPlay = null, skipAt = null, uiT = 0;
  const RATES = [1, 1.25, 1.5, 0.75], SLEEPS = [0, 30, 60, 90];
  let rate = 1, sleepIdx = 0, sleepT = 0;
  const showUI = () => { fsBox.classList.add('ui'); clearTimeout(uiT); uiT = setTimeout(() => fsBox.classList.remove('ui'), 3500); };
  function openFS() {
    fsBox.textContent = '';
    fsBox.classList.add('open');
    D.documentElement.classList.add('fs');
    if (fsOn) return;
    fsOn = true;
    try {
      const rq = fsBox.requestFullscreen || fsBox.webkitRequestFullscreen;
      const p = rq && rq.call(fsBox, { navigationUI: 'hide' });
      const lock = () => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} };
      if (p && p.then) p.then(lock, () => {}); else lock();
    } catch (e) {}
  }
  function closeFS() {
    hideUp();
    curFrame = null; clearTimeout(srvT);
    clearTimeout(sleepT); sleepIdx = 0;
    if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }
    if (vid) { try { vid.pause(); vid.removeAttribute('src'); vid.load(); } catch (e) {} vid = null; }
    if (!fsOn) return;
    fsOn = false;
    fsBox.classList.remove('open', 'ui');
    fsBox.textContent = '';
    D.documentElement.classList.remove('fs');
    try { screen.orientation.unlock(); } catch (e) {}
    const fe = D.fullscreenElement || D.webkitFullscreenElement;
    if (fe) { try { (D.exitFullscreen || D.webkitExitFullscreen).call(D); } catch (e) {} }
    refreshCW();
  }
  const onFsChange = () => { if (fsOn && !(D.fullscreenElement || D.webkitFullscreenElement) && fsBox.dataset.fsd) closeFS(); };
  D.addEventListener('fullscreenchange', () => { if (D.fullscreenElement) fsBox.dataset.fsd = '1'; else { onFsChange(); delete fsBox.dataset.fsd; } });
  function setPos(sid, p, d) {
    if (!sid || !(d > 0)) return;
    const m = posMap();
    m[sid] = [Math.round(p), Math.round(d)];
    const ks = Object.keys(m);
    if (ks.length > 600) ks.slice(0, ks.length - 600).forEach((k) => delete m[k]);
    setJ('mtk-pos', m);
    const l = hist(), e = l.find((y) => y.sid === sid);
    if (!e) return;
    e.p = Math.round(p); e.d = Math.round(d); e.at = Date.now();
    if (done(p, d) && e.nx) { Object.assign(e, e.nx, { p: 0, d: 0 }); delete e.nx; }
    setJ('mtk-hist', l);
  }
  function record(x, eps, ep, i) {
    const nxt = eps[i + 1], show = sk(x);
    const e = { sid: show + ':' + ep.id, show, href: '/watch.php?vid=' + ep.id + '&mtkp=1', title: x.t, ep: x.mv ? '' : 'الحلقة ' + ep.n, epN: ep.n, epId: ep.id, img: x.img, p: 0, d: 0, at: Date.now() };
    if (nxt) e.nx = { sid: show + ':' + nxt.id, href: '/watch.php?vid=' + nxt.id + '&mtkp=1', ep: 'الحلقة ' + nxt.n, epN: nxt.n, epId: nxt.id };
    const q = posMap()[e.sid];
    if (q) { e.p = q[0]; e.d = q[1]; }
    setJ('mtk-hist', [e].concat(hist().filter((y) => y.show !== show)).slice(0, 40));
    return e;
  }
  function upNext(x, eps, i) {
    if (eps[i + 1]) return { label: 'الحلقة التالية', title: x.t + ' - ' + eps[i + 1].t, img: x.img, run: () => play(x, eps, eps[i + 1]) };
    const seen = new Set(hist().map((e) => e.show));
    const c = ALL.filter((y) => sk(y) !== sk(x) && y.mv === x.mv && !seen.has(sk(y)) && y.g.some((g) => x.g.includes(g))).sort((a, b) => b.v - a.v)[0];
    return c ? { label: x.mv ? 'الفيلم التالي' : 'مسلسل قد يعجبك', title: c.t, img: c.img, run: () => startShow(c) } : null;
  }
  function hideUp() { clearInterval(upT); if (upBox) upBox.remove(); upBox = null; }
  function playUp() { const u = curUp; hideUp(); curUp = null; if (u) u.run(); }
  function showUp() {
    if (upBox || !curUp || upCancel || !fsOn) return;
    let n = 10;
    const cnt = h('b', null, String(n));
    const g = h('button', { class: 'upgo', onclick: playUp }, icon('play'), ' شغّل الآن');
    upBox = h('div', { class: 'upn' }, curUp.img ? h('img', { src: curUp.img, alt: '' }) : null,
      h('div', { class: 'upt' }, h('small', null, curUp.label, ' بعد ', cnt, ' ث'), h('div', null, curUp.title)),
      h('div', { class: 'upb' }, g, h('button', { class: 'upx', onclick: () => { upCancel = true; hideUp(); } }, 'إلغاء')));
    fsBox.append(upBox);
    try { g.focus({ preventScroll: true }); } catch (e) {}
    upT = setInterval(() => { if (--n <= 0) playUp(); else cnt.textContent = String(n); }, 1000);
  }
  W.__mtkCur = () => { const q = posMap()[curSid]; return JSON.stringify({ k: curSid || '', p: q && q[0] > 30 && !done(q[0], q[1]) ? q[0] : 0, u: curUp && !upCancel ? curUp.label + ': ' + curUp.title : '' }); };
  W.__mtkNext = () => { if (curUp) { const u = curUp; curUp = null; u.run(); } };
  W.__mtkSetPos = (k, p, d) => { setPos(k, p, d); refreshCW(); };
  W.__mtkBack = () => {
    if (fsOn) { closeFS(); return true; }
    if (sheet.classList.contains('open') && !sheet.dataset.lock) { closeSheet(); return true; }
    return false;
  };
  W.__mtkReplay = () => { if (lastPlay) play(...lastPlay); };
  W.__mtkPrefs = () => JSON.stringify({ rate, sleep: sleepIdx ? SLEEPS[sleepIdx] : 0 });
  function loadHls() {
    if (W.Hls) return Promise.resolve(W.Hls);
    return new Promise((ok, no) => {
      const s = D.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
      s.onload = () => ok(W.Hls); s.onerror = no;
      D.head.append(s);
    });
  }
  const sleepLbl = () => (sleepIdx ? 'نوم بعد ' + SLEEPS[sleepIdx] + 'د' : 'مؤقّت النوم');
  function setSleep() { clearTimeout(sleepT); if (sleepIdx) sleepT = setTimeout(() => { sleepIdx = 0; closeFS(); }, SLEEPS[sleepIdx] * 60000); }
  let curFrame = null, posAt = { p: 0, d: 0 }, curSkip = null, srvT = 0;
  const send = (m) => { try { curFrame.contentWindow.postMessage(Object.assign({ mtk2: 1 }, m), '*'); } catch (e) {} };
  W.addEventListener('message', (e) => {
    const m = e.data;
    if (!m || !m.mtk || !fsOn || !curFrame) return;
    if (m.mtk === 'pos') {
      clearTimeout(srvT);
      posAt = m;
      setPos(curSid, m.p, m.d);
      if (m.d > 60 && m.d - m.p <= 25) showUp();
      if (curSkip) curSkip.style.display = m.p < 240 ? '' : 'none';
    } else if (m.mtk === 'end') {
      setPos(curSid, posAt.d || 1, posAt.d || 1);
      if (curUp && !upCancel) playUp();
    }
  });
  async function play(x, eps, ep, si) {
    const i = eps.indexOf(ep);
    lastPlay = [x, eps, ep];
    openFS();
    hideUp();
    clearTimeout(srvT);
    curFrame = null;
    fsBox.textContent = '';
    const close = h('button', { class: 'hbtn fsx', 'aria-label': 'إغلاق', onclick: () => closeFS() }, icon('close'));
    fsBox.append(loader(), close);
    showUI();
    if (!si) learn(x);
    const rec = record(x, eps, ep, i);
    curSid = rec.sid;
    curUp = upNext(x, eps, i);
    upCancel = false;
    const w = await getWatch(ep.id).catch(() => null);
    const sv = w ? await servers(w) : [];
    if (!fsOn || lastPlay[2] !== ep) return;
    if (!sv.length) { fsBox.textContent = ''; fsBox.append(h('div', { class: 'empty' }, 'ما قدرت شغّل هالحلقة', h('button', { class: 'btn big', onclick: () => play(x, eps, ep) }, 'جرّب كمان مرة')), close); return; }
    si = (si || 0) % sv.length;
    const start = rec.p > 30 && !done(rec.p, rec.d) ? Math.floor(rec.p) : 0;
    posAt = { p: start, d: rec.d };
    const fr = curFrame = h('iframe', { src: sv[si].u + (start ? '#mtkt=' + start : ''), allow: 'autoplay; fullscreen; encrypted-media; picture-in-picture', allowfullscreen: true, referrerpolicy: 'origin', scrolling: 'no' });
    const skipB = curSkip = !x.mv ? h('button', { class: 'fsk', onclick: () => { send({ seek: 85 }); skipB.style.display = 'none'; } }, 'تخطّي المقدمة ', icon('next')) : null;
    const nx = eps[i + 1] ? h('button', { class: 'fsn', onclick: () => play(x, eps, eps[i + 1]) }, 'الحلقة التالية ', icon('next')) : null;
    const pv = eps[i - 1] ? h('button', { class: 'fsn fsp', onclick: () => play(x, eps, eps[i - 1]) }, icon('prev'), ' الحلقة السابقة') : null;
    const sp = h('button', { class: 'fsc', onclick: () => { rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length]; send({ rate }); sp.textContent = 'السرعة ' + rate + 'x'; } }, 'السرعة ' + rate + 'x');
    const sl = h('button', { class: 'fsc', onclick: () => { sleepIdx = (sleepIdx + 1) % SLEEPS.length; setSleep(); sl.textContent = sleepLbl(); } }, sleepLbl());
    const sw = sv.length > 1 ? h('button', { class: 'fsc', onclick: () => play(x, eps, ep, si + 1) }, 'سيرفر: ' + sv[si].n + ' (' + (si + 1) + '/' + sv.length + ')') : null;
    const ttl = h('div', { class: 'fst' }, x.t, x.mv ? '' : h('small', null, ep.t));
    fsBox.textContent = '';
    fsBox.append(fr, close, ttl, nx, pv, skipB, h('div', { class: 'fsbar' }, sp, sl, sw));
    fr.addEventListener('load', () => { if (rate !== 1) setTimeout(() => send({ rate }), 1500); });
    showUI();
    if (si + 1 < sv.length) srvT = setTimeout(() => { if (curFrame === fr && fsOn && !posAt.d) play(x, eps, ep, si + 1); }, 40000);
  }
  function fsKey(e) {
    const k = e.key;
    showUI();
    if (k === 'Escape' || k === 'Backspace' || k === 'GoBack' || k === 'BrowserBack') { e.preventDefault(); closeFS(); return; }
    if (upBox && (k === 'Enter' || DIRS[k])) return;
    const a = D.activeElement;
    const onBtn = a && fsBox.contains(a) && a.tagName === 'BUTTON';
    if (!curFrame) return;
    if (k === 'ArrowRight' || k === 'ArrowLeft') {
      if (onBtn) return;
      e.preventDefault(); e.stopPropagation();
      send({ seek: k === 'ArrowRight' ? 10 : -10 });
    } else if (k === 'ArrowUp') {
      if (onBtn) return;
      e.preventDefault(); e.stopPropagation();
      const b = fsBox.querySelector('.fsbar .fsc'); if (b) b.focus();
    } else if (k === 'ArrowDown') {
      e.preventDefault(); e.stopPropagation();
      const bs = Array.from(fsBox.querySelectorAll('button')).filter(visEl); const j = bs.indexOf(a); const n = bs[(j + 1) % bs.length]; if (n) n.focus();
    } else if (k === 'Enter' || k === ' ' || k === 'MediaPlayPause') {
      if (onBtn && k === 'Enter') return;
      e.preventDefault(); e.stopPropagation();
      send({ toggle: 1 });
    } else if (k === 'ContextMenu' || k === 'F1') {
      const b = fsBox.querySelectorAll('.fsbar .fsc')[1]; if (b) b.click();
    }
  }
  /* ---------- app password (once per device) ---------- */
  const GATE_H = 'f1626dc324001b104467125a902fcdb4e92c4757c56064507f1d926a39ba13a4';
  function gate(next) {
    if (localStorage.getItem('mtk-gate') === GATE_H.slice(0, 16)) return next();
    sheet.dataset.lock = '1';
    sheet.textContent = '';
    const inp = h('input', { type: 'password', class: 'ginp', placeholder: 'كلمة السر', autocomplete: 'off', dir: 'ltr' });
    const msg = h('div', { class: 'pmsg' });
    const ok = async () => {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('mtk-gate:' + inp.value));
      const hx = Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
      if (hx !== GATE_H) { msg.textContent = 'كلمة السر غلط'; inp.value = ''; return; }
      localStorage.setItem('mtk-gate', GATE_H.slice(0, 16));
      delete sheet.dataset.lock;
      sheet.classList.remove('open');
      sheet.textContent = '';
      next();
    };
    sheet.append(h('div', { class: 'panel pgate' }, h('div', { class: 'phead' }, h('b', null, 'أدخل كلمة السر')), msg,
      h('form', { class: 'gform', onsubmit: (e) => { e.preventDefault(); ok(); } }, inp, h('button', { class: 'btn big', type: 'submit' }, 'دخول'))));
    sheet.classList.add('open');
    setTimeout(() => { try { inp.focus(); } catch (e) {} }, 60);
  }
  /* ---------- profiles ---------- */
  function pinPad(title, sub, doneF, back) {
    sheet.textContent = '';
    let v = '';
    const dots = h('div', { class: 'pdots' });
    const msg = h('div', { class: 'pmsg' }, sub || '');
    const paint = () => { dots.textContent = ''; for (let i = 0; i < 4; i++) dots.append(h('i', { class: i < v.length ? 'on' : '' })); };
    const press = (d) => {
      if (d === 'del') v = v.slice(0, -1); else if (v.length < 4) v += d;
      paint();
      if (v.length === 4 && doneF(v) === false) {
        v = '';
        msg.textContent = 'رمز غلط، جرّب كمان مرة';
        dots.classList.add('err');
        setTimeout(() => { dots.classList.remove('err'); paint(); }, 450);
      }
    };
    sheet._pin = press;
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'back', '0', 'del'];
    sheet.append(h('div', { class: 'panel pgate' }, h('div', { class: 'phead' }, h('b', null, title)), msg, dots,
      h('div', { class: 'pkeys' }, keys.map((k) => h('button', { class: 'pkey' + (k === 'back' ? ' pk2' : ''), onclick: () => (k === 'back' ? back() : press(k)) }, k === 'back' ? 'رجوع' : k === 'del' ? '⌫' : k)))));
    paint();
    sheet.classList.add('open');
    setTimeout(() => { try { sheet.querySelector('.pkey').focus({ preventScroll: true }); } catch (e) {} }, 50);
  }
  function openProfiles(force) {
    sheet.textContent = '';
    if (force) sheet.dataset.lock = '1';
    const allP = [{ id: '', n: 'الرئيسي' }].concat(profs());
    const enter = (id) => {
      sessionStorage.setItem('mtk-unl', '1');
      const same = force && id === pid();
      localStorage.setItem('mtk-prof', id);
      localStorage.setItem('mtk-picked', '1');
      delete sheet.dataset.lock;
      closeSheet();
      paintProf();
      if (!same) go('/', true);
    };
    const pick = (id) => {
      const lk = pins()[id];
      if (lk && (force || id !== pid())) {
        const x = allP.find((a) => a.id === id) || { n: '' };
        return pinPad('أدخل رمز PIN', x.n, (v) => (pinH(v) === lk ? (enter(id), true) : false), () => openProfiles(force));
      }
      enter(id);
    };
    const inp = h('input', { type: 'text', placeholder: 'اسم الملف...', maxlength: '20' });
    const kid = h('input', { type: 'checkbox' });
    const npin = h('input', { type: 'password', inputmode: 'numeric', maxlength: '4', placeholder: 'PIN (اختياري)', class: 'npin' });
    const form = h('form', { class: 'pform', onsubmit: (e) => {
      e.preventDefault();
      const n = inp.value.trim(), pv = npin.value.trim();
      if (!n) return;
      if (pv && !/^\d{4}$/.test(pv)) { npin.value = ''; npin.placeholder = 'لازم 4 أرقام'; return; }
      const id = Date.now().toString(36);
      localStorage.setItem(PROFS, JSON.stringify(profs().concat([{ id, n, k: kid.checked }])));
      if (pv) setPin(id, pv);
      enter(id);
    } }, inp, npin, h('label', { class: 'pkid' }, kid, ' ملف أطفال صغار'), h('button', { type: 'submit', class: 'btn' }, 'إضافة'));
    sheet.append(h('div', { class: 'panel' + (force ? ' pgate' : '') },
      h('div', { class: 'phead' }, h('b', null, 'مين عم يتفرّج؟'), force ? null : h('button', { class: 'hbtn', onclick: closeSheet }, icon('close'))),
      h('div', { class: 'profs' }, allP.map((x) => h('button', { class: 'prof' + (x.id === pid() ? ' on' : ''), onclick: () => pick(x.id) },
        h('span', { class: 'pav' + (x.k ? ' kid' : '') }, x.n.slice(0, 1), pins()[x.id] ? h('i', { class: 'plock' }, '🔒') : null), h('small', null, x.n + (x.k ? ' (صغار)' : ''))))),
      force ? null : h('div', { class: 'pacts' },
        pins()[pid()]
          ? h('button', { class: 'chip', onclick: () => pinPad('أدخل الرمز الحالي', 'لتشيل القفل عن «' + prof().n + '»', (v) => (pinH(v) === pins()[pid()] ? (setPin(pid(), ''), openProfiles(), true) : false), () => openProfiles()) }, 'شيل رمز PIN')
          : h('button', { class: 'chip', onclick: () => pinPad('رمز PIN جديد', 'اختار 4 أرقام لـ «' + prof().n + '»', (v) => { pinPad('أكّد الرمز', 'اكتبو كمان مرة', (v2) => (v2 === v ? (setPin(pid(), v), openProfiles(), true) : false), () => openProfiles()); return true; }, () => openProfiles()) }, 'قفل بـ PIN'),
        pid() ? h('button', { class: 'chip', onclick: () => { setPin(pid(), ''); localStorage.setItem(PROFS, JSON.stringify(profs().filter((x) => x.id !== pid()))); enter(''); } }, 'حذف هالملف') : null),
      h('div', { class: 'mgroup' }, h('h4', null, 'ملف جديد'), form)));
    sheet.classList.add('open');
    setTimeout(() => { const b = sheet.querySelector('.prof.on') || sheet.querySelector('.prof'); try { b.focus({ preventScroll: true }); } catch (e) {} }, 50);
  }

  /* ---------- boot ---------- */
  const boot = () => {
    if (!D.body || !main.isConnected) return setTimeout(boot, 10);
    paintProf();
    route();
    gate(() => { if (!localStorage.getItem('mtk-picked') || (pins()[pid()] && !sessionStorage.getItem('mtk-unl'))) openProfiles(true); });
  };
  boot();

  function CSS() {
    return `
:root{--bg:#0d0a0a;--card:#1f1716;--line:#3a2a26;--txt:#fff8f0;--mut:#c9b7a8;--acc:#d4a017;--acc2:#e50914;--acc3:#ffcf5a}
#mtk-fs iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#000}
button.epi{background:none;border:0;color:inherit;font:inherit;text-align:inherit;padding:0;cursor:pointer}
.more{display:block;margin:16px auto}
.chip.on{background:var(--acc);color:#000}
.hcar{position:relative}
.hcar>.hero{display:none}
.hcar>.hero.on{display:block;animation:hfade .6s ease}
@keyframes hfade{from{opacity:.25}to{opacity:1}}
.harr{position:absolute;top:42%;z-index:3;width:42px;height:42px;border-radius:50%;border:0;background:rgba(0,0,0,.45);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}
.harr .ic{width:24px;height:24px}
.harr:focus{outline:3px solid var(--acc);background:rgba(0,0,0,.75)}
.hnext{right:8px}.hprev{left:8px}
.hdots{position:absolute;bottom:10px;left:0;right:0;display:flex;gap:6px;justify-content:center;z-index:3}
.hdots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.45);cursor:pointer}
.hdots i.on{background:var(--acc);width:22px;border-radius:4px}
.gform{display:flex;flex-direction:column;gap:12px;margin-top:12px}
.ginp{font-size:20px;padding:12px;border-radius:10px;border:1px solid var(--line);background:var(--card);color:var(--txt);text-align:center}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;background:var(--bg);color:var(--txt);font-family:system-ui,-apple-system,"Segoe UI",Tahoma,Arial,sans-serif;font-size:15px}
body{max-width:520px;margin:0 auto;padding:calc(56px + env(safe-area-inset-top)) 0 calc(70px + env(safe-area-inset-bottom));min-height:100vh;background:radial-gradient(1200px 600px at 80% -10%,#24306e 0,transparent 60%),var(--bg)}
a{color:inherit;text-decoration:none}
.ic{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#mtk-head{position:fixed;top:0;left:0;right:0;z-index:50;height:calc(56px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 8px 0;display:flex;align-items:center;justify-content:space-between;background:rgba(11,16,38,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line);max-width:520px;margin:0 auto}
.logo{font-size:21px;font-weight:900;letter-spacing:1px;position:absolute;left:50%;transform:translateX(-50%);color:var(--acc2)}
.logo b{background:linear-gradient(90deg,var(--acc3),var(--acc));-webkit-background-clip:text;background-clip:text;color:transparent}
.hbtn{background:none;border:0;color:var(--txt);width:44px;height:44px;display:grid;place-items:center;border-radius:12px}
.hside{display:flex;align-items:center;gap:2px}
.pbtn{background:var(--card);border:1px solid var(--line);color:var(--txt);display:flex;align-items:center;gap:6px;border-radius:999px;padding:3px 10px 3px 3px;max-width:96px;font:inherit}
.pbtn small{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#mtk-nav{position:fixed;bottom:0;left:0;right:0;z-index:50;display:flex;justify-content:space-around;background:rgba(11,16,38,.96);border-top:1px solid var(--line);padding:6px 0 calc(6px + env(safe-area-inset-bottom));max-width:520px;margin:0 auto}
#mtk-nav a{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;color:var(--mut);flex:1;padding:4px 0}
#mtk-nav a.on{color:var(--acc)}
#mtk-sheet{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.6);display:none}
#mtk-sheet.open{display:block}
.panel{position:absolute;bottom:0;left:0;right:0;max-width:520px;margin:0 auto;background:#121940;border-radius:20px 20px 0 0;padding:14px 14px calc(20px + env(safe-area-inset-bottom));max-height:80vh;overflow:auto}
.phead{display:flex;justify-content:space-between;align-items:center;font-size:17px}
.mgroup h4{margin:14px 4px 8px;color:var(--mut);font-weight:600}
.chip{background:var(--card);border:1px solid var(--line);padding:8px 14px;border-radius:999px;font-size:13px;color:inherit;font-family:inherit}
.chip.ghost{padding:4px 10px;font-size:12px;color:var(--mut)}
a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid var(--acc)!important;outline-offset:2px}
.card:focus-visible{transform:scale(1.06);z-index:2}
.row{margin:16px 0 4px}
.rhead{display:flex;justify-content:space-between;align-items:center;padding:0 14px;margin-bottom:10px}
.rhead h3{margin:0;font-size:16px;border-right:4px solid var(--acc);padding-right:8px;border-radius:2px}
.rhead a{color:var(--acc);font-size:13px}
.scroller{display:flex;gap:10px;overflow-x:auto;padding:6px 14px;scroll-snap-type:x mandatory;scrollbar-width:none}
.scroller::-webkit-scrollbar{display:none}
.scroller .card{flex:0 0 31%;scroll-snap-align:start}
.scroller .card.wide{flex-basis:62%}
.card{display:block;min-width:0;transition:transform .15s}
.thumb{position:relative;border-radius:14px;overflow:hidden;background:var(--card);aspect-ratio:2/3}
.card.wide .thumb{aspect-ratio:16/9}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.badge{position:absolute;top:6px;right:6px;background:var(--acc3);color:#fff;font-size:10px;padding:2px 6px;border-radius:6px;max-width:85%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.badge.mv{background:var(--acc2);color:#062}
.cwb{position:absolute;left:0;right:0;bottom:0;height:4px;background:rgba(255,255,255,.25)}
.cwb i{display:block;height:100%;background:var(--acc);margin-left:auto}
.cws{font-size:11px;color:var(--mut);margin-top:2px}
.thumb .cwx{position:absolute;top:6px;left:6px;z-index:2;width:26px;height:26px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:rgba(0,0,0,.65);color:#fff}
.thumb .cwx svg{width:14px;height:14px}
.pl{position:absolute;inset:0;display:grid;place-items:center;opacity:0;transition:.2s;background:rgba(0,0,0,.35)}
.card:active .pl,.card:focus .pl{opacity:1}
.ctitle{font-size:12.5px;line-height:1.35;margin-top:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;direction:auto}
.top10 .card{position:relative;padding-right:30px}
.top10 .tnum{position:absolute;right:-30px;bottom:-4px;z-index:1;font-size:64px;font-weight:900;line-height:1;color:var(--bg);-webkit-text-stroke:2px var(--acc);pointer-events:none}
.top10 .thumb{overflow:visible}.top10 .thumb img{border-radius:14px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px 10px;padding:0 14px}
.ptitle{font-size:18px;margin:16px 14px 12px}
.gchips{display:flex;gap:8px;overflow-x:auto;padding:0 14px 6px;scrollbar-width:none}
.gchips::-webkit-scrollbar{display:none}
.gchips .chip{flex:0 0 auto;white-space:nowrap}
.hero{position:relative;margin:0 0 6px;aspect-ratio:16/10;overflow:hidden}
.hero img{width:100%;height:100%;object-fit:cover;display:block}
.hero:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,var(--bg) 0,rgba(11,16,38,.4) 45%,transparent 70%)}
.hinfo{position:absolute;left:0;right:0;bottom:8px;z-index:1;padding:0 14px;text-align:center}
.hinfo h2{margin:0 0 4px;font-size:22px;text-shadow:0 2px 8px #000}
.meta{color:var(--mut);font-size:12.5px}
.hbtns,.acts{display:flex;gap:10px;justify-content:center;margin-top:10px}
.acts{margin:6px 14px}
.btn{display:flex;align-items:center;justify-content:center;gap:6px;background:var(--card);border:1px solid var(--line);color:var(--txt);border-radius:14px;padding:11px 16px;font:inherit;font-size:15px;font-weight:700}
.btn.big{background:linear-gradient(90deg,var(--acc3),var(--acc));border:0;color:#fff}
.acts .btn{flex:1}
.mylist.on{border-color:var(--acc3);color:var(--acc3)}
.dtop{position:relative}
.dban{width:100%;aspect-ratio:16/8;object-fit:cover;display:block;mask-image:linear-gradient(0deg,transparent,#000 50%);-webkit-mask-image:linear-gradient(0deg,transparent,#000 50%)}
.single{display:flex;gap:12px;padding:0 14px;margin-top:-60px;position:relative}
.poster{width:100px;aspect-ratio:2/3;object-fit:cover;border-radius:12px;flex:none;box-shadow:0 6px 20px rgba(0,0,0,.5)}
.sinfo{min-width:0;align-self:flex-end}
.sinfo h1{font-size:18px;margin:0 0 6px;line-height:1.4}
.gtags{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.desc{color:var(--mut);font-size:13.5px;line-height:1.7;margin:8px 14px 4px}
.eplist{display:flex;flex-direction:column;gap:8px;padding:0 14px}
.epi{display:flex;gap:10px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:6px}
.epi.on{border-color:var(--acc)}
.ethumb{position:relative;width:120px;aspect-ratio:16/9;border-radius:8px;overflow:hidden;background:#0d1433;flex:none;display:grid;place-items:center}
.ethumb img{width:100%;height:100%;object-fit:cover}
.ethumb b{font-size:22px;color:var(--acc)}
.epi:focus .pl{opacity:1}
.etitle{font-size:13.5px;line-height:1.4;min-width:0}
.etitle small{display:block;color:var(--mut);font-size:11.5px}
.sform{display:flex;gap:8px;padding:14px}
.sform input{flex:1;background:var(--card);border:1px solid var(--line);color:var(--txt);border-radius:14px;padding:12px 14px;font-size:16px;outline:none}
.sbtn{background:var(--acc);border:0;color:#fff;border-radius:14px;width:50px;display:grid;place-items:center}
.empty{text-align:center;color:var(--mut);padding:60px 20px;display:flex;flex-direction:column;gap:14px;align-items:center}
.loader{display:flex;justify-content:center;gap:6px;padding:80px 0}
.loader.small{padding:24px 0}
.loader i{width:12px;height:12px;border-radius:50%;background:var(--acc);animation:b 1s infinite ease-in-out}
.loader i:nth-child(2){animation-delay:.15s;background:var(--acc2)}.loader i:nth-child(3){animation-delay:.3s;background:var(--acc3)}
@keyframes b{0%,80%,100%{transform:scale(.5);opacity:.4}40%{transform:scale(1);opacity:1}}
#mtk-fs{display:none;position:fixed;inset:0;z-index:2147483647;background:#000;width:100vw;height:100vh;height:100dvh}
#mtk-fs.open{display:block}
#mtk-fs video{position:absolute;inset:0;width:100%;height:100%;background:#000}
#mtk-fs .loader{height:100%;padding:0;align-items:center}
#mtk-fs .empty,#mtk-fs .ferr{position:absolute;inset:0;justify-content:center;background:rgba(0,0,0,.7);z-index:5;color:#fff}
#mtk-fs .ferr{display:flex;flex-direction:column;gap:14px;align-items:center}
#mtk-fs .fsx,#mtk-fs .fsn,#mtk-fs .fsbar,#mtk-fs .fst{opacity:0;transition:opacity .3s;pointer-events:none}
#mtk-fs.ui .fsx,#mtk-fs.ui .fsn,#mtk-fs.ui .fsbar,#mtk-fs.ui .fst,#mtk-fs .loader~.fsx{opacity:1;pointer-events:auto}
#mtk-fs .fsx{position:absolute;top:calc(10px + env(safe-area-inset-top));left:10px;z-index:3;background:rgba(0,0,0,.55);border-radius:50%;color:#fff}
#mtk-fs .fst{position:absolute;top:calc(14px + env(safe-area-inset-top));left:64px;right:180px;z-index:3;color:#fff;font-weight:800;font-size:15px;text-shadow:0 1px 4px #000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#mtk-fs .fst small{display:block;font-weight:400;font-size:12px;color:#ddd}
#mtk-fs .fsn{position:absolute;top:calc(10px + env(safe-area-inset-top));right:10px;z-index:3;display:flex;align-items:center;gap:4px;background:rgba(0,0,0,.55);color:#fff;border:0;border-radius:20px;padding:8px 12px;font:inherit;font-size:13px;font-weight:700}
#mtk-fs .fsn.fsp{top:calc(56px + env(safe-area-inset-top))}
#mtk-fs .fsbar{position:absolute;top:calc(10px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:3;display:flex;gap:8px;margin-top:44px}
#mtk-fs .fsc{background:rgba(0,0,0,.6);color:#fff;border:1px solid rgba(255,255,255,.3);border-radius:18px;padding:7px 12px;font:inherit;font-size:12px;font-weight:700;white-space:nowrap}
#mtk-fs .fsk{position:absolute;bottom:calc(80px + env(safe-area-inset-bottom));right:16px;z-index:3;display:flex;align-items:center;gap:4px;background:rgba(20,20,20,.85);color:#fff;border:2px solid #fff;border-radius:6px;padding:10px 16px;font:inherit;font-size:14px;font-weight:800}
html.fs,html.fs body{overflow:hidden!important}
#mtk-fs .upn{position:absolute;right:16px;bottom:calc(24px + env(safe-area-inset-bottom));z-index:4;display:flex;align-items:center;gap:12px;max-width:min(460px,calc(100% - 32px));background:rgba(11,16,38,.94);border:1px solid var(--line);border-radius:16px;padding:10px;box-shadow:0 8px 30px rgba(0,0,0,.6)}
#mtk-fs .upn img{width:64px;aspect-ratio:2/3;object-fit:cover;border-radius:8px;flex:none}
#mtk-fs .upt{min-width:0;flex:1;font-size:14px;font-weight:700;line-height:1.4;color:#fff}
#mtk-fs .upt small{display:block;color:var(--mut);font-weight:400;font-size:12px}
#mtk-fs .upt small b{color:var(--acc)}
#mtk-fs .upt div{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#mtk-fs .upb{display:flex;flex-direction:column;gap:6px;flex:none}
#mtk-fs .upb button{border:0;border-radius:10px;padding:8px 12px;font:inherit;font-size:13px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;gap:4px}
#mtk-fs .upgo{background:linear-gradient(90deg,var(--acc3),var(--acc))}
#mtk-fs .upx{background:rgba(255,255,255,.12)}
#mtk-fs .upb .ic{width:16px;height:16px}
.panel.pgate{inset:0;max-width:none;max-height:none;border-radius:0;background:var(--bg);display:flex;flex-direction:column;justify-content:center;padding:calc(20px + env(safe-area-inset-top)) 20px calc(20px + env(safe-area-inset-bottom))}
.pgate .phead{justify-content:center;font-size:22px}
.pgate .pav{width:96px;height:96px;font-size:40px}
.pgate .mgroup{max-width:520px;margin:10px auto 0;width:100%}
.profs{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;padding:16px 8px}
.prof{background:none;border:0;color:inherit;font:inherit;display:flex;flex-direction:column;align-items:center;gap:6px}
.pav{position:relative;width:72px;height:72px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:900;color:#fff;background:linear-gradient(135deg,var(--acc3),#7a1b9e)}
.pav.kid{background:linear-gradient(135deg,#f5b400,#22b14c)}
.pav.sm{width:28px;height:28px;font-size:14px;border-radius:50%;flex:0 0 auto}
.prof.on .pav,.prof:focus .pav{outline:3px solid #fff}
.plock{position:absolute;bottom:-4px;left:-4px;font-size:16px;font-style:normal;background:var(--bg);border-radius:50%;padding:2px;line-height:1}
.pform{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:0 4px}
.pform input[type=text],.pform .npin{flex:1 1 160px;background:var(--card);border:1px solid var(--line);color:var(--txt);border-radius:10px;padding:10px;font:inherit}
.pform .npin{flex:0 1 130px}
.pacts{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.pmsg{text-align:center;color:var(--mut);margin:4px 0 14px;min-height:20px}
.pdots{display:flex;gap:14px;justify-content:center;margin-bottom:22px}
.pdots i{width:16px;height:16px;border-radius:50%;border:2px solid #fff;display:block}
.pdots i.on{background:#fff}
.pdots.err{animation:pshake .4s}
.pdots.err i{border-color:#ff4f4f}
@keyframes pshake{25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
.pkeys{display:grid;grid-template-columns:repeat(3,72px);gap:12px;justify-content:center;direction:ltr}
.pkey{height:60px;border-radius:14px;border:1px solid var(--line);background:var(--card);color:var(--txt);font:inherit;font-size:24px;font-weight:700}
.pkey.pk2{font-size:15px}
.pkey:focus{outline:3px solid #fff}
@media (min-width:880px){
body{max-width:none;padding-bottom:calc(64px + env(safe-area-inset-bottom))}
#mtk-head,#mtk-nav{max-width:none;padding-left:24px;padding-right:24px}
.panel{max-width:760px}
.scroller{gap:14px;padding:6px 24px}
.scroller .card{flex:0 0 12.5%}
.scroller .card.wide{flex-basis:24%}
.grid{grid-template-columns:repeat(7,1fr);gap:16px 14px;padding:0 24px}
.rhead{padding:0 24px}.rhead h3{font-size:18px}
.ptitle{margin:16px 24px 12px}
.hero{aspect-ratio:auto;height:56vh}
.hinfo{text-align:right;padding:0 48px;bottom:40px;max-width:60%}
.hinfo h2{font-size:34px}.hbtns{justify-content:flex-start}
.dban{aspect-ratio:auto;height:46vh}
.single{padding:0 24px}.poster{width:170px}
.desc{margin:10px 24px;max-width:1100px}
.acts{max-width:520px;margin:10px 24px}
.eplist{display:grid;grid-template-columns:repeat(4,1fr);padding:0 24px}
.epi{flex-direction:column;align-items:stretch}.ethumb{width:100%}
.sform{max-width:760px;margin:0 auto}
}
`;
  }
  }
}

(function boot() {
  try {
    const s = document.createElement('script');
    s.textContent = '(' + MTKARABIC.toString() + ')();';
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  } catch (e) {}
  if (!(document.documentElement && document.documentElement.hasAttribute('data-mtk'))) MTKARABIC();
})();
