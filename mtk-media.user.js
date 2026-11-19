// ==UserScript==
// @name         MTK MEDIA
// @namespace    https://abormze.github.io/MTK-MEDIA
// @version      1.6.0
// @description  MTK MEDIA - واجهة موبايل بدون إعلانات لموقع فاصل، تشغيل مباشر من السيرفر الأول
// @author       MTK
// @match        *://fasel-hd.co/*
// @match        *://*.fasel-hd.co/*
// @include      /^https?:\/\/([a-z0-9-]+\.)*fasel-?hds?\.[a-z.]+\/.*$/
// @run-at       document-start
// @grant        none
// @downloadURL  https://abormze.github.io/MTK-MEDIA/mtk-media.user.js
// @updateURL    https://abormze.github.io/MTK-MEDIA/mtk-media.user.js
// ==/UserScript==

function MTK() {
  'use strict';
  const W = window;
  const D = document;
  const NATIVE_KEY = 'mtk_native';
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

  if (/^\/video_player/.test(location.pathname) || W.top !== W.self) {
    playerMode();
    return;
  }
  if (sessionStorage.getItem(NATIVE_KEY) === location.href) {
    sessionStorage.removeItem(NATIVE_KEY);
    return;
  }
  if (/^\/(wp-admin|wp-login|account|login|register|cdn-cgi)/.test(location.pathname)) return;
  try { W.stop(); } catch (e) {}
  try { const top = setTimeout(() => {}, 0); for (let i = 0; i <= top + 50; i++) { clearTimeout(i); clearInterval(i); } } catch (e) {}
  appMode();

  /* ============================== PLAYER ============================== */
  function playerMode() {
    const AD_RE = /(doubleclick|googlesyndication|adservice|popads|popcash|propeller|adsterra|onclick|exoclick|juicyads|hilltopads|\/ads?\/|banner|vast)/i;
    const AD_TXT = /(aclib|zoneId|runPop|runAutoTag|runInterstitial|runBanner|madurird|acscdn|cchud|popunder|popMagic|adsbygoogle|adcash|monetag|VPN Toggle)/i;
    const OK_HOST = /(^|\.)(fasel[a-z0-9-]*\.[a-z.]+|scdns\.io|jwplayer\.com|jwpcdn\.com|jsdelivr\.net|cdnjs\.cloudflare\.com|unpkg\.com|googleapis\.com|gstatic\.com|jquery\.com|bootstrapcdn\.com|cloudflare\.com|hlsjs\.video-dev\.org|videojs\.com|plyr\.io)$/i;
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
    new MutationObserver(() => { addCss(); sweep(); tryPlay(); }).observe(D, { childList: true, subtree: true });
    D.addEventListener('DOMContentLoaded', () => { sweep(); tryPlay(); });
    let n = 0;
    const iv = setInterval(() => { sweep(); tryPlay(); if (++n > 30) clearInterval(iv); }, 1000);
  }

  /* ============================== APP ============================== */
  function appMode() {
    const ORIGIN = location.origin;
    const cache = new Map();
    let navToken = 0;

    const MENU = [
      ['الأفلام', [['جميع الأفلام', '/all-movies'], ['أفلام أجنبي', '/movies'], ['أفلام مدبلجة', '/dubbed-movies'], ['أفلام هندي', '/hindi'], ['أفلام آسيوي', '/asian-movies'], ['أفلام أنمي', '/anime-movies'], ['الأعلى مشاهدة', '/movies_top_views'], ['الأعلى تقييماً IMDB', '/movies_top_imdb']]],
      ['المسلسلات', [['جميع المسلسلات', '/series'], ['أحدث الحلقات', '/episodes'], ['الأعلى مشاهدة', '/series_top_views'], ['الأعلى تقييماً IMDB', '/series_top_imdb'], ['المسلسلات القصيرة', '/short_series']]],
      ['البرامج', [['جميع البرامج', '/tvshows'], ['أحدث الحلقات', '/tvepisodes']]],
      ['آسيوي', [['المسلسلات الآسيوية', '/asian-series'], ['أحدث الحلقات', '/asian-episodes']]],
      ['أنمي', [['جميع الأنمي', '/anime'], ['أحدث الحلقات', '/anime-episodes']]],
    ];

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
      return el;
    };
    const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
    const abs = (u, base) => { try { const x = new URL(u, base || ORIGIN); if (/fasel/i.test(x.hostname) && !/cdn|static|img/i.test(x.hostname)) { x.protocol = location.protocol; x.host = location.host; } return x.href; } catch (e) { return ''; } };
    const imgOf = (img, base) => {
      if (!img) return '';
      const u = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.getAttribute('src') || '';
      if (!u || /blank\.gif|^data:/i.test(u)) return '';
      try { return new URL(u, base || ORIGIN).href; } catch (e) { return ''; }
    };
    const isInternal = (u) => { try { return new URL(u, location.href).host === location.host; } catch (e) { return false; } };
    const icon = (name) => {
      const P = {
        home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
        film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4',
        tv: 'M3 6h18v12H3zM8 21h8M12 18v3',
        list: 'M4 6h16M4 12h16M4 18h16',
        search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
        back: 'M9 5l7 7-7 7',
        play: 'M7 4l13 8-13 8z',
        close: 'M5 5l14 14M19 5L5 19',
        next: 'M15 5l-7 7 7 7',
      };
      const s = D.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ic');
      const p = D.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', P[name]);
      if (name === 'play') p.setAttribute('fill', 'currentColor');
      s.append(p);
      return s;
    };

    /* ---------- shell ---------- */
    if (!D.documentElement) D.appendChild(D.createElement('html'));
    D.documentElement.innerHTML = '<head></head><body></body>';
    D.documentElement.setAttribute('lang', 'ar');
    D.documentElement.setAttribute('dir', 'rtl');
    D.head.append(
      h('meta', { charset: 'utf-8' }),
      h('meta', { name: 'viewport', content: 'width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover' }),
      h('meta', { name: 'theme-color', content: '#0a0a10' }),
      h('meta', { name: 'referrer', content: 'origin' }),
      h('title', null, 'MTK MEDIA'),
      h('style', null, CSS())
    );
    const main = h('main', { id: 'mtk-main' });
    const backBtn = h('button', { class: 'hbtn', id: 'mtk-back', 'aria-label': 'رجوع', onclick: () => history.length > 1 ? history.back() : go('/mobile', true) }, icon('back'));
    const header = h('header', { id: 'mtk-head' },
      backBtn,
      h('a', { class: 'logo', href: '/mobile', 'data-spa': '' }, h('b', null, 'MTK'), ' MEDIA'),
      h('button', { class: 'hbtn', 'aria-label': 'بحث', onclick: openSearch }, icon('search'))
    );
    const tabs = [
      ['home', 'الرئيسية', '/mobile'],
      ['film', 'أفلام', '/all-movies'],
      ['tv', 'مسلسلات', '/series'],
      ['play', 'حلقات', '/episodes'],
      ['list', 'الأقسام', null],
    ];
    const nav = h('nav', { id: 'mtk-nav' }, tabs.map(([ic, label, url]) =>
      url ? h('a', { href: url, 'data-spa': '', 'data-tab': url }, icon(ic), h('span', null, label))
          : h('a', { href: '#', onclick: (e) => { e.preventDefault(); openMenu(); } }, icon(ic), h('span', null, label))
    ));
    const sheet = h('div', { id: 'mtk-sheet', onclick: (e) => { if (e.target.id === 'mtk-sheet') closeSheet(); } });
    const fsBox = h('div', { id: 'mtk-fs' });
    D.body.append(header, main, nav, sheet, fsBox);
    const mine = new Set([header, main, nav, sheet, fsBox]);
    const headKeep = new Set(Array.from(D.head.children));
    const purge = () => {
      Array.from(D.documentElement.children).forEach((el) => { if (el !== D.head && el !== D.body) el.remove(); });
      Array.from(D.body.children).forEach((el) => { if (!mine.has(el)) el.remove(); });
      Array.from(D.head.children).forEach((el) => { if (!headKeep.has(el) && (el.tagName === 'SCRIPT' || el.tagName === 'IFRAME' || el.tagName === 'LINK')) el.remove(); });
      D.querySelectorAll('dialog, [popover], script').forEach((el) => el.remove());
      D.querySelectorAll('iframe').forEach((f) => { if (!f.closest('#mtk-fs')) f.remove(); });
    };
    new MutationObserver(purge).observe(D.documentElement, { childList: true, subtree: true });

    /* ---------- fullscreen player ---------- */
    let fsOn = false;
    let fsNative = false;
    let uiT = 0;
    const showUI = () => {
      fsBox.classList.add('ui');
      clearTimeout(uiT);
      uiT = setTimeout(() => fsBox.classList.remove('ui'), 3000);
    };
    const guard = (fn) => (e) => {
      if (!fsBox.classList.contains('ui')) { e.preventDefault(); e.stopPropagation(); showUI(); return; }
      fn(e);
    };
    const fsClose = () => h('button', { class: 'hbtn fsx', 'aria-label': 'إغلاق', onclick: guard(closeFS) }, icon('close'));
    const playerFrame = (src) => h('iframe', {
      src, allow: 'autoplay; fullscreen; encrypted-media; picture-in-picture', allowfullscreen: true, frameborder: '0', scrolling: 'no', referrerpolicy: 'origin',
      sandbox: 'allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock',
    });
    function openFS() {
      fsBox.textContent = '';
      fsBox.append(h('div', { class: 'loader' }, h('i'), h('i'), h('i')), fsClose());
      fsBox.classList.add('open');
      D.documentElement.classList.add('fs');
      showUI();
      if (fsOn) return;
      fsOn = true;
      try {
        const rq = fsBox.requestFullscreen || fsBox.webkitRequestFullscreen;
        if (!rq) return;
        fsNative = true;
        const p = rq.call(fsBox, { navigationUI: 'hide' });
        const lock = () => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} };
        if (p && p.then) p.then(lock, () => { fsNative = false; }); else lock();
      } catch (e) { fsNative = false; }
    }
    function playFS(src, next) {
      if (!fsOn) return;
      fsBox.textContent = '';
      const fr = playerFrame(src);
      fr.addEventListener('load', () => {
        try { ['pointerdown', 'touchstart', 'mousemove'].forEach((t) => fr.contentDocument.addEventListener(t, showUI, { capture: true, passive: true })); } catch (e) {}
      });
      const nx = next ? h('a', { class: 'fsn playfs', href: next }, 'الحلقة التالية ', icon('next')) : null;
      if (nx) nx.addEventListener('click', (e) => { if (!fsBox.classList.contains('ui')) { e.preventDefault(); e.stopImmediatePropagation(); showUI(); } }, true);
      fsBox.append(fr, fsClose(), nx);
      showUI();
    }
    function closeFS() {
      if (!fsOn) return;
      fsOn = false;
      fsNative = false;
      fsBox.classList.remove('open');
      fsBox.textContent = '';
      D.documentElement.classList.remove('fs');
      try { screen.orientation.unlock(); } catch (e) {}
      const fe = D.fullscreenElement || D.webkitFullscreenElement;
      if (fe) { try { (D.exitFullscreen || D.webkitExitFullscreen).call(D); } catch (e) {} }
    }
    const onFsChange = () => { if (fsOn && fsNative && !(D.fullscreenElement || D.webkitFullscreenElement)) closeFS(); };
    D.addEventListener('fullscreenchange', onFsChange);
    D.addEventListener('webkitfullscreenchange', onFsChange);

    function closeSheet() { sheet.classList.remove('open'); sheet.textContent = ''; }
    function openMenu() {
      sheet.textContent = '';
      sheet.append(h('div', { class: 'panel' },
        h('div', { class: 'phead' }, h('b', null, 'الأقسام'), h('button', { class: 'hbtn', onclick: closeSheet }, icon('close'))),
        MENU.map(([g, items]) => h('div', { class: 'mgroup' }, h('h4', null, g),
          h('div', { class: 'chips' }, items.map(([l, u]) => h('a', { class: 'chip', href: u, 'data-spa': '' }, l)))))
      ));
      sheet.classList.add('open');
    }
    function openSearch() {
      sheet.textContent = '';
      const inp = h('input', { type: 'search', placeholder: 'ابحث عن فيلم أو مسلسل...', enterkeyhint: 'search' });
      const form = h('form', { onsubmit: (e) => { e.preventDefault(); const q = inp.value.trim(); if (q) { closeSheet(); go('/?s=' + encodeURIComponent(q), true); } } },
        inp, h('button', { type: 'submit', class: 'sbtn' }, icon('search')));
      sheet.append(h('div', { class: 'panel top' }, form));
      sheet.classList.add('open');
      setTimeout(() => inp.focus(), 50);
    }

    D.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented) return;
      const href = a.getAttribute('href');
      if (!href || href === '#' || href.startsWith('javascript')) return;
      if (isInternal(a.href)) {
        e.preventDefault();
        closeSheet();
        const fs = a.matches('.card, .ep, .btn.big, .btn.nxt, .playfs');
        if (fs) openFS();
        go(a.href, true, fs);
      }
    });
    W.addEventListener('popstate', () => go(location.href, false));

    go(location.href, false);

    /* ---------- router ---------- */
    function fetchUrlFor(u) {
      const x = new URL(u, ORIGIN);
      if ((x.pathname === '/' || /^\/mobile\/?$/.test(x.pathname)) && !x.searchParams.get('s') && !x.searchParams.get('p')) return ORIGIN + '/main';
      return x.href;
    }
    async function load(url) {
      if (cache.has(url)) return cache.get(url);
      const r = await fetch(url, { credentials: 'include' });
      const html = await r.text();
      if (/<title>\s*Just a moment|challenge-platform|cf-chl/i.test(html.slice(0, 6000))) {
        const err = new Error('cf'); err.cf = true; throw err;
      }
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const res = { doc, url: r.url || url };
      cache.set(url, res);
      return res;
    }
    async function go(url, push, fs) {
      const token = ++navToken;
      if (!fs) closeFS();
      const target = abs(url);
      if (push) {
        try { history.replaceState(Object.assign({}, history.state, { y: W.scrollY }), ''); } catch (e) {}
        history.pushState({}, '', target);
      }
      const fu = fetchUrlFor(target);
      const p = new URL(target).pathname;
      backBtn.style.visibility = /^\/(mobile\/?|main\/?)?$/.test(p) ? 'hidden' : 'visible';
      nav.querySelectorAll('a[data-tab]').forEach((a) => a.classList.toggle('on', new URL(a.href).pathname === p || (a.dataset.tab === '/mobile' && /^\/(main)?$/.test(p))));
      main.textContent = '';
      main.append(h('div', { class: 'loader' }, h('i'), h('i'), h('i')));
      let res;
      try { res = await load(fu); } catch (e) {
        if (token !== navToken) return;
        closeFS();
        if (e.cf) {
          sessionStorage.setItem(NATIVE_KEY, fu);
          location.replace(fu);
          return;
        }
        main.textContent = '';
        main.append(h('div', { class: 'empty' }, 'صار خطأ بالتحميل', h('button', { class: 'btn', onclick: () => go(target, false) }, 'إعادة المحاولة')));
        return;
      }
      if (token !== navToken) return;
      render(res.doc, res.url, fs);
      const st = history.state;
      W.scrollTo(0, (!push && st && st.y) || 0);
    }

    /* ---------- parsing ---------- */
    function parseCard(el, base) {
      const a = el.querySelector('a[href]') || (el.matches('a[href]') ? el : null);
      let href = a && a.getAttribute('href');
      if (!href) { const m = (el.getAttribute('onclick') || '').match(/['"]([^'"]+)['"]/); href = m && m[1]; }
      if (!href) return null;
      const img = el.querySelector('img');
      const ep = el.classList.contains('epDivHome');
      let title = txt(el.querySelector('.h1, .h5, .h4, .title')) || (img && img.getAttribute('alt')) || '';
      title = title.replace(/^\d+(?=\D)/, '');
      const badge = txt(el.querySelector('.quality')) || txt(el.querySelector('.epStatus'));
      const rate = txt(el.querySelector('.imdbRate, .bimdb'));
      return { href: abs(href, base), img: imgOf(img, base), title, badge, rate, ep };
    }
    const CARD_SEL = '.postDiv, .blockMovie, .epDivHome, .seasonDiv, #homeSlide .slideInner, .swiper-slide .slideInner';
    function groups(doc, base) {
      const map = new Map();
      const seen = new Set();
      doc.querySelectorAll(CARD_SEL).forEach((el) => {
        const c = parseCard(el, base);
        if (!c || seen.has(c.href)) return;
        seen.add(c.href);
        const box = el.closest('#homeSlide, .viewsOrderSlider, .owl-carousel, section, #seasonList, .container') || doc.body;
        if (!map.has(box)) {
          let title = '';
          const head = box.querySelector('.blockHead .h3, .blockHead .h4, .subHead .h4');
          if (head) title = txt(head);
          else { let prev = box.previousElementSibling; for (let i = 0; i < 3 && prev && !title; i++, prev = prev.previousElementSibling) title = txt(prev.querySelector && prev.querySelector('.h3, .h4')); }
          if (box.id === 'homeSlide' || box.closest('#homeSlide')) title = 'مميز';
          const more = box.querySelector('.blockHead a[href]');
          map.set(box, { title, more: more ? abs(more.getAttribute('href'), base) : '', items: [], slider: !!box.closest('#homeSlide, .owl-carousel, .viewsOrderSlider') });
        }
        map.get(box).items.push(c);
      });
      return Array.from(map.values()).filter((g) => g.items.length);
    }
    function nextPage(doc, base) {
      const act = doc.querySelector('.pagination .active, .pagination .current');
      let a = act && act.closest('li') && act.closest('li').nextElementSibling && act.closest('li').nextElementSibling.querySelector('a[href]');
      if (!a) a = Array.from(doc.querySelectorAll('.pagination a[href]')).find((x) => /›|next|التالي/i.test(x.textContent));
      return a ? abs(a.getAttribute('href'), base) : '';
    }
    function firstServer(doc, base) {
      const lis = doc.querySelectorAll('.signleWatch li[onclick], .tabs-ul li[onclick], [onclick*="player_iframe"]');
      for (const li of lis) {
        const m = (li.getAttribute('onclick') || '').match(/['"]((?:https?:)?\/\/[^'"]+|\/video_player[^'"]*)['"]/);
        if (m) return abs(m[1], base);
      }
      const f = doc.querySelector('iframe[name="player_iframe"]');
      const s = f && (f.getAttribute('data-src') || f.getAttribute('src'));
      return s ? abs(s, base) : '';
    }

    /* ---------- views ---------- */
    function cardEl(c, wide) {
      return h('a', { class: 'card' + (wide || c.ep ? ' wide' : ''), href: c.href, 'data-spa': '' },
        h('div', { class: 'thumb' },
          c.img ? h('img', { src: c.img, loading: 'lazy', alt: '', referrerpolicy: 'no-referrer-when-downgrade' }) : null,
          c.badge ? h('span', { class: 'badge' }, c.badge) : null,
          c.rate ? h('span', { class: 'rate' }, '★ ' + c.rate.replace(/[^\d.]/g, '')) : null,
          h('span', { class: 'pl' }, icon('play'))),
        h('div', { class: 'ctitle' }, c.title));
    }
    function rowEl(g) {
      return h('section', { class: 'row' },
        h('div', { class: 'rhead' }, h('h3', null, g.title || 'المزيد'), g.more ? h('a', { href: g.more, 'data-spa': '' }, 'الكل') : null),
        h('div', { class: 'scroller' }, g.items.map((c) => cardEl(c))));
    }
    function render(doc, base, fs) {
      main.textContent = '';
      const hasPlayer = !!doc.querySelector('iframe[name="player_iframe"], .signleWatch');
      const isSingle = hasPlayer || !!doc.querySelector('.singleInfo, .posterImg');
      if (isSingle) return renderSingle(doc, base, hasPlayer, fs);
      closeFS();
      renderList(doc, base);
    }
    function renderList(doc, base) {
      const gs = groups(doc, base);
      const isHome = /\/main\/?$/.test(new URL(base).pathname);
      const pageTitle = txt(doc.querySelector('.singleTitle, #blockList .blockHead .h3, h1')) || '';
      const q = new URL(location.href).searchParams.get('s');
      if (!gs.length) {
        main.append(h('div', { class: 'empty' }, q ? 'ما في نتائج لـ «' + q + '»' : 'ما في محتوى'));
        return;
      }
      if (isHome) { gs.forEach((g) => main.append(rowEl(g))); return; }
      let biggest = gs.reduce((a, b) => (b.items.length > a.items.length && !b.slider ? b : a), gs.find((g) => !g.slider) || gs[0]);
      gs.forEach((g) => { if (g !== biggest && g.slider) main.append(rowEl(g)); });
      main.append(h('h2', { class: 'ptitle' }, q ? 'نتائج البحث: ' + q : (biggest.title || pageTitle || doc.title.split(/[-|–]/)[0].trim())));
      const grid = h('div', { class: 'grid' + (biggest.items.every((c) => c.ep) ? ' wide' : '') });
      const seen = new Set();
      const add = (items) => items.forEach((c) => { if (!seen.has(c.href)) { seen.add(c.href); grid.append(cardEl(c)); } });
      add(biggest.items);
      main.append(grid);
      let next = nextPage(doc, base);
      if (!next) return;
      const sentinel = h('div', { class: 'loader small' }, h('i'), h('i'), h('i'));
      main.append(sentinel);
      const tok = navToken;
      let busy = false;
      const io = new IntersectionObserver(async (ents) => {
        if (!ents[0].isIntersecting || busy || tok !== navToken) return;
        busy = true;
        try {
          const r = await load(next);
          if (tok !== navToken) return;
          const g2 = groups(r.doc, r.url);
          const big2 = g2.reduce((a, b) => (b.items.length > a.items.length ? b : a), g2[0] || { items: [] });
          add(big2.items);
          next = nextPage(r.doc, r.url);
        } catch (e) { next = ''; }
        busy = false;
        if (!next) { io.disconnect(); sentinel.remove(); }
      }, { rootMargin: '600px' });
      io.observe(sentinel);
    }
    function renderSingle(doc, base, hasPlayer, fs) {
      const tEl = doc.querySelector('.singleInfo .h1, .singleInfo h1, .streamHeader .h3, h1');
      let title = '';
      if (tEl) { const c = tEl.cloneNode(true); c.querySelectorAll('.singleStar').forEach((x) => x.remove()); title = txt(c); }
      const rating = txt(doc.querySelector('.singleStar strong'));
      const poster = imgOf(doc.querySelector('.posterImg img'), base);
      const desc = txt(doc.querySelector('.singleDesc'));
      const info = Array.from(doc.querySelectorAll('#singleList span')).map(txt).filter(Boolean).slice(0, 10);
      D.title = (title ? title + ' | ' : '') + 'MTK MEDIA';

      const eps = Array.from(doc.querySelectorAll('#epAll a[href], .epAll a[href]'));
      const here = decodeURIComponent(new URL(base).pathname);
      let curIdx = -1;
      const epLinks = eps.map((a, i) => {
        const href = abs(a.getAttribute('href'), base);
        const on = a.classList.contains('active') || decodeURIComponent(new URL(href).pathname) === here;
        if (on) curIdx = i;
        return h('a', { class: 'ep' + (on ? ' on' : ''), href, 'data-spa': '' }, txt(a).replace(/الحلقة\s*/, ''));
      });
      const nxt = curIdx >= 0 && eps[curIdx + 1] ? abs(eps[curIdx + 1].getAttribute('href'), base) : '';

      if (hasPlayer) {
        const src = firstServer(doc, base);
        if (src && fs) playFS(src, nxt);
        else if (fs) closeFS();
        main.append(h('div', { class: 'player' }, src
          ? h('button', { class: 'tap', style: poster ? 'background-image:url("' + poster.replace(/"/g, '%22') + '")' : null, onclick: () => { openFS(); playFS(src, nxt); } }, h('span', null, icon('play')))
          : h('div', { class: 'empty' }, 'ما في سيرفر مشاهدة لهالعمل')));
      } else if (fs && eps.length) {
        const tok = navToken;
        load(abs(eps[0].getAttribute('href'), base)).then((r) => {
          if (tok !== navToken) return;
          const src = firstServer(r.doc, r.url);
          const e2 = r.doc.querySelectorAll('#epAll a[href], .epAll a[href]');
          if (src) playFS(src, e2[1] ? abs(e2[1].getAttribute('href'), r.url) : ''); else closeFS();
        }, () => closeFS());
      } else if (fs) closeFS();

      const head = h('div', { class: 'single' },
        poster ? h('img', { class: 'poster', src: poster, alt: '' }) : null,
        h('div', { class: 'sinfo' },
          h('h1', null, title),
          rating ? h('div', { class: 'srate' }, '★ ', h('b', null, rating), ' / 10') : null,
          h('div', { class: 'chips' }, info.slice(0, 6).map((i) => h('span', { class: 'chip ghost' }, i.replace(/^[^:]*:\s*/, ''))))));
      main.append(head);
      if (desc) main.append(h('p', { class: 'desc' }, desc));

      if (eps.length) {
        if (!hasPlayer) main.append(h('a', { class: 'btn big', href: abs(eps[0].getAttribute('href'), base), 'data-spa': '' }, icon('play'), ' شغّل الحلقة الأولى'));
        if (nxt) main.append(h('a', { class: 'btn nxt', href: nxt, 'data-spa': '' }, 'الحلقة التالية ', icon('next')));
        main.append(h('section', { class: 'row' }, h('div', { class: 'rhead' }, h('h3', null, 'الحلقات (' + eps.length + ')')), h('div', { class: 'eps' }, epLinks)));
      }

      const seasons = Array.from(doc.querySelectorAll('.seasonDiv')).map((el) => {
        const c = parseCard(el, base);
        if (c) c.on = el.classList.contains('active');
        return c;
      }).filter(Boolean);
      if (seasons.length) {
        main.append(h('section', { class: 'row' }, h('div', { class: 'rhead' }, h('h3', null, 'المواسم')),
          h('div', { class: 'scroller' }, seasons.map((c) => { const e = cardEl(c); if (c.on) e.classList.add('on'); return e; }))));
      }

      const seasonHrefs = new Set(seasons.map((s) => s.href));
      const rel = [];
      const seen = new Set();
      doc.querySelectorAll('.postDiv, .blockMovie, .epDivHome').forEach((el) => {
        const c = parseCard(el, base);
        if (c && !seen.has(c.href) && !seasonHrefs.has(c.href)) { seen.add(c.href); rel.push(c); }
      });
      if (rel.length) main.append(rowEl({ title: 'قد يعجبك', items: rel.slice(0, 20) }));
    }

    function CSS() {
      return `
:root{--bg:#0a0a10;--card:#15151f;--line:#23232f;--txt:#f1f1f5;--mut:#9a9aab;--acc:#ff2d55;--acc2:#ffb020}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;background:var(--bg);color:var(--txt);font-family:system-ui,-apple-system,"Segoe UI",Tahoma,Arial,sans-serif;font-size:15px}
body{max-width:520px;margin:0 auto;padding:calc(56px + env(safe-area-inset-top)) 0 calc(70px + env(safe-area-inset-bottom));min-height:100vh}
a{color:inherit;text-decoration:none}
.ic{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#mtk-head{position:fixed;top:0;left:0;right:0;z-index:50;height:calc(56px + env(safe-area-inset-top));padding:env(safe-area-inset-top) 8px 0;display:flex;align-items:center;justify-content:space-between;background:rgba(10,10,16,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--line);max-width:520px;margin:0 auto}
.logo{font-size:20px;font-weight:800;letter-spacing:1px}
.logo b{background:linear-gradient(90deg,var(--acc),var(--acc2));-webkit-background-clip:text;background-clip:text;color:transparent}
.hbtn{background:none;border:0;color:var(--txt);width:44px;height:44px;display:grid;place-items:center;border-radius:12px}
.hbtn:active{background:var(--card)}
#mtk-nav{position:fixed;bottom:0;left:0;right:0;z-index:50;display:flex;justify-content:space-around;background:rgba(10,10,16,.96);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid var(--line);padding:6px 0 calc(6px + env(safe-area-inset-bottom));max-width:520px;margin:0 auto}
#mtk-nav a{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;color:var(--mut);flex:1;padding:4px 0}
#mtk-nav a.on{color:var(--acc)}
#mtk-sheet{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.6);display:none}
#mtk-sheet.open{display:block}
.panel{position:absolute;bottom:0;left:0;right:0;max-width:520px;margin:0 auto;background:#12121a;border-radius:20px 20px 0 0;padding:14px 14px calc(20px + env(safe-area-inset-bottom));max-height:80vh;overflow:auto}
.panel.top{top:0;bottom:auto;border-radius:0 0 20px 20px;padding-top:calc(14px + env(safe-area-inset-top))}
.phead{display:flex;justify-content:space-between;align-items:center;font-size:17px}
.mgroup h4{margin:14px 4px 8px;color:var(--mut);font-weight:600}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chip{background:var(--card);border:1px solid var(--line);padding:8px 14px;border-radius:999px;font-size:13px}
.chip.ghost{padding:4px 10px;font-size:12px;color:var(--mut)}
form{display:flex;gap:8px}
form input{flex:1;background:var(--card);border:1px solid var(--line);color:var(--txt);border-radius:14px;padding:12px 14px;font-size:16px;outline:none}
form input:focus{border-color:var(--acc)}
.sbtn{background:var(--acc);border:0;color:#fff;border-radius:14px;width:50px;display:grid;place-items:center}
.row{margin:16px 0 4px}
.rhead{display:flex;justify-content:space-between;align-items:center;padding:0 14px;margin-bottom:10px}
.rhead h3{margin:0;font-size:16px;border-right:3px solid var(--acc);padding-right:8px}
.rhead a{color:var(--acc);font-size:13px}
.scroller{display:flex;gap:10px;overflow-x:auto;padding:0 14px 4px;scroll-snap-type:x mandatory;scrollbar-width:none}
.scroller::-webkit-scrollbar{display:none}
.scroller .card{flex:0 0 31%;scroll-snap-align:start}
.scroller .card.wide{flex-basis:62%}
.card{display:block;min-width:0}
.card.on .thumb{outline:2px solid var(--acc)}
.thumb{position:relative;border-radius:12px;overflow:hidden;background:var(--card);aspect-ratio:2/3}
.card.wide .thumb{aspect-ratio:16/9}
.thumb img{width:100%;height:100%;object-fit:cover;display:block}
.badge{position:absolute;top:6px;right:6px;background:var(--acc);color:#fff;font-size:10px;padding:2px 6px;border-radius:6px;max-width:85%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rate{position:absolute;bottom:6px;left:6px;background:rgba(0,0,0,.7);color:var(--acc2);font-size:11px;padding:2px 6px;border-radius:6px}
.pl{position:absolute;inset:0;display:grid;place-items:center;opacity:0;transition:.2s;background:rgba(0,0,0,.35)}
.card:active .pl{opacity:1}
.ctitle{font-size:12.5px;line-height:1.35;margin-top:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;direction:auto}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px 10px;padding:0 14px}
.grid.wide{grid-template-columns:repeat(2,1fr)}
.ptitle{font-size:18px;margin:16px 14px 12px}
.player{position:sticky;top:calc(56px + env(safe-area-inset-top));z-index:40;background:#000;aspect-ratio:16/9;width:100%}
.player iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.player .empty{color:var(--mut);height:100%;display:grid;place-items:center}
.player .tap{position:absolute;inset:0;width:100%;height:100%;border:0;display:grid;place-items:center;background:#000 center/cover;cursor:pointer}
.player .tap span{width:68px;height:68px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(90deg,var(--acc),#ff5e3a);color:#fff;box-shadow:0 0 0 8px rgba(0,0,0,.35)}
.player .tap .ic{width:30px;height:30px}
#mtk-fs{display:none;position:fixed;inset:0;z-index:2147483647;background:#000;width:100vw;height:100vh;height:100dvh}
#mtk-fs.open{display:block}
#mtk-fs iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
#mtk-fs .loader{height:100%;padding:0;align-items:center}
#mtk-fs .fsx,#mtk-fs .fsn{opacity:0;transition:opacity .3s}
#mtk-fs.ui .fsx,#mtk-fs.ui .fsn,#mtk-fs .loader~.fsx{opacity:1}
#mtk-fs .fsx{position:absolute;top:calc(10px + env(safe-area-inset-top));left:10px;z-index:3;background:rgba(0,0,0,.55);border-radius:50%;color:#fff}
#mtk-fs .fsn{position:absolute;top:calc(10px + env(safe-area-inset-top));right:10px;z-index:3;display:flex;align-items:center;gap:4px;background:rgba(0,0,0,.55);color:#fff;border-radius:20px;padding:8px 12px;font-size:13px;font-weight:700}
html.fs,html.fs body{overflow:hidden!important}
.single{display:flex;gap:12px;padding:14px}
.poster{width:96px;aspect-ratio:2/3;object-fit:cover;border-radius:10px;flex:none}
.sinfo{min-width:0}
.sinfo h1{font-size:17px;margin:0 0 6px;line-height:1.4;direction:auto}
.srate{color:var(--acc2);font-size:13px;margin-bottom:8px}
.desc{color:var(--mut);font-size:13.5px;line-height:1.7;margin:0 14px 10px}
.eps{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;padding:0 14px}
.ep{background:var(--card);border:1px solid var(--line);border-radius:10px;text-align:center;padding:10px 0;font-weight:700;font-size:14px}
.ep.on{background:var(--acc);border-color:var(--acc)}
.btn{display:flex;align-items:center;justify-content:center;gap:6px;margin:6px 14px;background:var(--card);border:1px solid var(--line);color:var(--txt);border-radius:14px;padding:12px;font-size:15px;font-weight:700}
.btn.big{background:linear-gradient(90deg,var(--acc),#ff5e3a);border:0}
.empty{text-align:center;color:var(--mut);padding:60px 20px;display:flex;flex-direction:column;gap:14px;align-items:center}
.loader{display:flex;justify-content:center;gap:6px;padding:80px 0}
.loader.small{padding:24px 0}
.loader i{width:10px;height:10px;border-radius:50%;background:var(--acc);animation:b 1s infinite ease-in-out}
.loader i:nth-child(2){animation-delay:.15s}.loader i:nth-child(3){animation-delay:.3s}
@keyframes b{0%,80%,100%{transform:scale(.5);opacity:.4}40%{transform:scale(1);opacity:1}}
`;
    }
  }
}

(function boot() {
  try {
    const s = document.createElement('script');
    s.textContent = '(' + MTK.toString() + ')();';
    (document.head || document.documentElement).appendChild(s);
    s.remove();
  } catch (e) {}
  if (!(document.documentElement && document.documentElement.hasAttribute('data-mtk'))) MTK();
})();
