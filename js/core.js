/* ==========================================================================
   UMBRA® — core.js
   The only shared dependency: maths, colour, a single rAF ticker, scroll
   state, resize and DOM helpers. Everything else builds on this.
   ========================================================================== */
'use strict';

window.UMBRA = window.UMBRA || {};

(function (U) {
  /* --- Maths ------------------------------------------------------------- */
  U.clamp = function (v, min, max) { return v < min ? min : v > max ? max : v; };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };

  /* Frame-rate independent damping: same feel at 60Hz and 144Hz. */
  U.damp = function (a, b, lambda, dt) {
    return U.lerp(a, b, 1 - Math.exp(-lambda * dt));
  };

  U.smoothstep = function (edge0, edge1, x) {
    var t = U.clamp((x - edge0) / (edge1 - edge0 || 1), 0, 1);
    return t * t * (3 - 2 * t);
  };

  U.round = function (v, places) {
    var p = Math.pow(10, places || 0);
    return Math.round(v * p) / p;
  };

  /* --- User preferences --------------------------------------------------- */
  U.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  U.finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  U.reduced = function () { return U.reduceMotion.matches; };

  /* --- DOM --------------------------------------------------------------- */
  U.qs = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  U.qsa = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };
  U.each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* --- Colour ------------------------------------------------------------- */
  /* Accepts #rgb, #rrggbb and rgb()/rgba(). Returns {r,g,b,a} on 0-255. */
  U.parseColor = function (input) {
    var s = String(input).trim();

    if (s.charAt(0) === '#') {
      var hex = s.slice(1);
      if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      var n = parseInt(hex, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
    }

    var m = s.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      var parts = m[1].split(',').map(function (v) { return parseFloat(v); });
      return {
        r: parts[0] || 0,
        g: parts[1] || 0,
        b: parts[2] || 0,
        a: parts.length > 3 ? parts[3] : 1,
      };
    }

    return { r: 0, g: 0, b: 0, a: 1 };
  };

  U.mixColor = function (a, b, t) {
    var ca = U.parseColor(a);
    var cb = U.parseColor(b);
    return {
      r: Math.round(U.lerp(ca.r, cb.r, t)),
      g: Math.round(U.lerp(ca.g, cb.g, t)),
      b: Math.round(U.lerp(ca.b, cb.b, t)),
      a: U.round(U.lerp(ca.a, cb.a, t), 3),
    };
  };

  U.colorString = function (c) {
    return c.a >= 1
      ? 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')'
      : 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + c.a + ')';
  };

  /* --- Scroll state ------------------------------------------------------- */
  /* Written once per frame by the ticker, read by everyone else. */
  U.scroll = {
    y: 0,
    prev: 0,
    delta: 0,
    velocity: 0,
    progress: 0,
    limit: 1,
    vw: 0,
    vh: 0,
    moving: false,
    idle: 0,
  };

  function measure() {
    var s = U.scroll;
    s.vw = window.innerWidth;
    s.vh = window.innerHeight;
    var doc = document.documentElement;
    s.limit = Math.max(1, (doc.scrollHeight || 0) - s.vh);
  }

  function readScroll(dt) {
    var s = U.scroll;
    s.prev = s.y;
    s.y = window.pageYOffset || document.documentElement.scrollTop || 0;
    s.delta = s.y - s.prev;

    /* Smoothed velocity, in px/second — used for the marquee skew. */
    var target = dt > 0 ? s.delta / dt : 0;
    s.velocity = U.damp(s.velocity, target, 10, dt);
    if (Math.abs(s.velocity) < 4) s.velocity = 0;

    s.moving = Math.abs(s.delta) > 0.4;
    s.idle = s.moving ? 0 : s.idle + dt;
    s.progress = U.clamp(s.y / s.limit, 0, 1);
  }

  U.refreshScroll = measure;

  /* --- Resize ------------------------------------------------------------- */
  var resizeFns = [];
  var resizePending = false;

  U.onResize = function (fn) { resizeFns.push(fn); };

  function runResize() {
    resizePending = false;
    measure();
    U.each(resizeFns, function (fn) { fn(U.scroll.vw, U.scroll.vh); });
    U.emit('umbra:resize');
  }

  function queueResize() {
    if (resizePending) return;
    resizePending = true;
    window.requestAnimationFrame(runResize);
  }

  window.addEventListener('resize', queueResize, { passive: true });
  window.addEventListener('orientationchange', queueResize, { passive: true });

  /* The document height changes as sections measure themselves — watch it. */
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(queueResize);
    ro.observe(document.body);
  }

  /* --- Ticker -------------------------------------------------------------
     One rAF loop for the whole site. Frame work is ordered: timestamps and
     scroll state first, then subscribers in registration order.
     ------------------------------------------------------------------------ */
  var subs = [];
  var rafId = 0;
  var running = false;
  var lastTime = 0;

  U.ticker = {
    add: function (fn) {
      subs.push(fn);
      U.ticker.start();
      return fn;
    },
    remove: function (fn) {
      var i = subs.indexOf(fn);
      if (i > -1) subs.splice(i, 1);
      if (!subs.length) U.ticker.stop();
    },
    start: function () {
      if (running) return;
      running = true;
      lastTime = 0;
      rafId = window.requestAnimationFrame(frame);
    },
    stop: function () {
      if (!running) return;
      running = false;
      window.cancelAnimationFrame(rafId);
    },
    get running() { return running; },
  };

  function frame(now) {
    if (!running) return;
    rafId = window.requestAnimationFrame(frame);

    var t = now / 1000;
    var dt = lastTime ? Math.min(t - lastTime, 1 / 20) : 1 / 60;
    lastTime = t;

    readScroll(dt);

    for (var i = 0; i < subs.length; i++) {
      subs[i](dt, t);
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) U.ticker.stop();
    else if (subs.length) U.ticker.start();
  });

  U.nextFrame = function (fn) { window.requestAnimationFrame(fn); };

  /* --- Events ------------------------------------------------------------- */
  U.emit = function (name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail: detail }));
  };

  U.on = function (name, fn) { window.addEventListener(name, fn); };

  /* --- Split text --------------------------------------------------------
     Wraps words/chars in spans. `--i` drives the stagger from CSS, so the
     animation stays declarative and the markup can be restored exactly.
     ------------------------------------------------------------------------ */
  U.split = function (el, mode) {
    if (!el || el.dataset.splitDone === mode) return;

    var source = el.dataset.splitSource;
    if (source === undefined) {
      source = el.textContent.replace(/\s+/g, ' ').trim();
      el.dataset.splitSource = source;
    }

    var words = source.split(' ');
    var frag = document.createDocumentFragment();
    var index = 0;

    words.forEach(function (word, w) {
      if (mode === 'chars') {
        var wrap = document.createElement('span');
        wrap.className = 'word-wrap';
        wrap.style.display = 'inline-block';
        wrap.style.whiteSpace = 'nowrap';

        word.split('').forEach(function (ch) {
          var c = document.createElement('span');
          c.className = 'char';
          c.style.setProperty('--i', index++);
          c.textContent = ch;
          wrap.appendChild(c);
        });

        frag.appendChild(wrap);
      } else {
        var s = document.createElement('span');
        s.className = 'word';
        s.style.setProperty('--i', index++);
        s.textContent = word;
        frag.appendChild(s);
      }

      if (w < words.length - 1) frag.appendChild(document.createTextNode(' '));
    });

    el.textContent = '';
    el.appendChild(frag);
    el.dataset.splitDone = mode;
    el.classList.add(mode === 'chars' ? 'split-chars' : 'split-words');
  };

  /* --- Boot -------------------------------------------------------------- */
  measure();
  readScroll(0);
})(window.UMBRA);
