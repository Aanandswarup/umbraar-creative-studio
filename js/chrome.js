/* ==========================================================================
   UMBRA® — chrome.js
   Everything that persists across the page: the continuous background/ink
   blending between sections, scroll progress, the section rail, the header,
   the overlay menu, clocks, magnetic hovers, the marquee and the capability
   peek card.

   The important idea here is the theme blend. Instead of hard-cutting between
   a dark and a light section, the background and text colours are interpolated
   from the viewport centre each frame — the document reads as one continuous
   surface rather than a stack of panels.
   ========================================================================== */
'use strict';

(function (U) {
  var THEMES = {
    dark: {
      bg: '#08090a',
      fg: '#f1eee5',
      soft: 'rgba(241,238,229,0.66)',
      faint: 'rgba(241,238,229,0.34)',
      line: 'rgba(255,255,255,0.14)',
      scheme: 'dark',
    },
    light: {
      bg: '#f1eee5',
      fg: '#0a0b0c',
      soft: 'rgba(10,11,12,0.62)',
      faint: 'rgba(10,11,12,0.38)',
      line: 'rgba(10,11,12,0.16)',
      scheme: 'light',
    },
  };

  var root = document.documentElement;

  /* ======================================================================
     Theme blending
     ====================================================================== */
  var bands = [];
  var lastTheme = '';

  function measureBands() {
    var y = U.scroll.y;
    bands = U.qsa('[data-theme]').map(function (el) {
      var r = el.getBoundingClientRect();
      return {
        el: el,
        theme: THEMES[el.getAttribute('data-theme')] ? el.getAttribute('data-theme') : 'dark',
        top: r.top + y,
        height: r.height,
        rail: el.getAttribute('data-rail') || '',
      };
    });
  }

  function bandAt(center) {
    if (!bands.length) return { current: THEMES.dark, next: null, f: 0, rail: '' };

    var i = 0;
    for (var k = 0; k < bands.length; k++) {
      if (center >= bands[k].top) i = k;
    }

    var current = bands[i];
    var next = bands[i + 1];

    if (!next) return { current: THEMES[current.theme], next: null, f: 0, rail: current.rail };

    /* Blend across a window half a viewport wide around the seam. */
    var seam = current.top + current.height;
    var w = U.scroll.vh * 0.85;
    var f = U.smoothstep(seam - w * 0.5, seam + w * 0.5, center);

    return {
      current: THEMES[current.theme],
      next: THEMES[next.theme],
      f: f,
      rail: f < 0.5 ? current.rail : next.rail,
    };
  }

  var applied = { bg: '', fg: '', soft: '', faint: '', line: '' };

  function applyTheme(band) {
    var a = band.current;
    var b = band.next || band.current;
    var t = band.next ? band.f : 0;

    var bg = U.colorString(U.mixColor(a.bg, b.bg, t));
    var fg = U.colorString(U.mixColor(a.fg, b.fg, t));
    var soft = U.colorString(U.mixColor(a.soft, b.soft, t));
    var faint = U.colorString(U.mixColor(a.faint, b.faint, t));
    var line = U.colorString(U.mixColor(a.line, b.line, t));

    if (bg !== applied.bg) { root.style.setProperty('--bg', bg); applied.bg = bg; }
    if (fg !== applied.fg) { root.style.setProperty('--fg', fg); applied.fg = fg; }
    if (soft !== applied.soft) { root.style.setProperty('--fg-soft', soft); applied.soft = soft; }
    if (faint !== applied.faint) { root.style.setProperty('--fg-faint', faint); applied.faint = faint; }
    if (line !== applied.line) { root.style.setProperty('--line', line); applied.line = line; }

    var resolved = t > 0.5 ? (band.next ? band.next.scheme : a.scheme) : a.scheme;
    if (resolved !== lastTheme) {
      lastTheme = resolved;
      root.style.setProperty('color-scheme', resolved);
    }
  }

  /* ======================================================================
     Progress + rail
     ====================================================================== */
  var progressNum = U.qs('[data-progress-num]');
  var progressLine = U.qs('[data-progress-line]');
  var railValue = U.qs('[data-rail-value]');
  var railEl = U.qs('.rail');
  var lastPercent = -1;
  var lastRail = '';

  function applyProgress() {
    var p = U.scroll.progress;

    if (progressLine) progressLine.style.transform = 'scaleY(' + U.round(p, 4) + ')';

    if (progressNum) {
      var pct = Math.round(p * 100);
      if (pct !== lastPercent) {
        lastPercent = pct;
        progressNum.textContent = (pct < 10 ? '0' : '') + pct;
      }
    }
  }

  function applyRail(rail) {
    /* The rail is orientation for the middle of the page, so it fades in just
       after the hero instead of sitting over the opening statement. */
    if (railEl) {
      var opacity = U.round(U.smoothstep(0.004, 0.035, U.scroll.progress), 3);
      if (opacity !== railEl.dataset.opacity) {
        railEl.dataset.opacity = opacity;
        railEl.style.opacity = opacity;
      }
    }

    if (!railValue || !rail || rail === lastRail) return;
    lastRail = rail;
    railValue.textContent = rail;
  }

  /* ======================================================================
     Header
     ====================================================================== */
  var header = U.qs('[data-header]');
  var headerPinned = false;
  var headerHidden = false;
  var lastY = 0;
  var menuOpen = false;

  function applyHeader() {
    if (!header) return;
    var y = U.scroll.y;

    var pinned = y > 24;
    if (pinned !== headerPinned) {
      headerPinned = pinned;
      header.classList.toggle('is-pinned', pinned);
    }

    /* Hide on the way down, return on the way up. */
    var shouldHide = !menuOpen && y > U.scroll.vh * 0.5 && y > lastY + 2;
    var shouldShow = menuOpen || y < lastY - 2 || y < U.scroll.vh * 0.5;

    if (shouldHide && !headerHidden) {
      headerHidden = true;
      header.classList.add('is-hidden');
    } else if (shouldShow && headerHidden) {
      headerHidden = false;
      header.classList.remove('is-hidden');
    }

    lastY = y;
  }

  /* ======================================================================
     Clock (both header and footer instances)
     ====================================================================== */
  var clocks = U.qsa('[data-clock]');

  function applyClock() {
    if (!clocks.length) return;
    var time;
    try {
      time = new Date().toLocaleTimeString('en-GB', {
        timeZone: 'Europe/London',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch (err) {
      time = new Date().toTimeString().slice(0, 8);
    }
    var text = time + ' GMT';
    clocks.forEach(function (el) {
      if (el.textContent !== text) el.textContent = text;
    });
    /* One update per second, scheduled off the minute so it never drifts. */
    window.setTimeout(applyClock, 1000 - (Date.now() % 1000) + 20);
  }

  /* ======================================================================
     Overlay menu
     ====================================================================== */
  var menu = U.qs('[data-menu]');
  var menuBtn = U.qs('[data-menu-btn]');
  var menuLabel = U.qs('[data-menu-btn-label]');
  var lastFocused = null;

  function setMenu(open) {
    if (!menu || !menuBtn) return;
    menuOpen = open;

    menu.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (menuLabel) menuLabel.textContent = open ? 'Close' : 'Menu';
    document.body.classList.toggle('is-locked', open);
    /* Lifts the header above the overlay so the toggle stays reachable. */
    document.documentElement.classList.toggle('is-menu-open', open);

    if (open) {
      lastFocused = document.activeElement;
      headerHidden = false;
      if (header) header.classList.remove('is-hidden');
      var first = U.qs('.menu__link', menu);
      if (first) window.setTimeout(function () { first.focus(); }, 420);
    } else if (lastFocused && lastFocused.focus) {
      lastFocused.focus();
    }
  }

  if (menuBtn) {
    menuBtn.addEventListener('click', function () { setMenu(!menuOpen); });
  }

  if (menu) {
    U.each(U.qsa('.menu__link', menu), function (link) {
      link.addEventListener('click', function () { setMenu(false); });
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuOpen) {
      setMenu(false);
      if (menuBtn) menuBtn.focus();
    }
  });

  /* ======================================================================
     Link text swap
     Each label gets an identical ghost stacked below it; hover slides the pair
     up by one line so the label appears to be replaced, not faded.
     ====================================================================== */
  U.each(U.qsa('.link-swap'), function (swap) {
    if (U.qs('.link-swap__ghost', swap)) return;
    var inner = U.qs('.link-swap__inner', swap);
    if (!inner) return;

    var ghost = inner.cloneNode(true);
    ghost.classList.remove('link-swap__inner');
    ghost.classList.add('link-swap__ghost');
    ghost.setAttribute('aria-hidden', 'true');
    swap.appendChild(ghost);
  });

  /* ======================================================================
     Magnetic elements
     ====================================================================== */
  var magnets = [];

  U.each(U.qsa('[data-magnetic], .btn'), function (el) {
    var state = { el: el, x: 0, y: 0, tx: 0, ty: 0, active: false };

    el.addEventListener('mousemove', function (e) {
      if (U.reduced()) return;
      var r = el.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      state.tx = U.clamp(dx, -1.4, 1.4) * r.width * 0.16;
      state.ty = U.clamp(dy, -1.4, 1.4) * r.height * 0.3;
      state.active = true;
    });

    el.addEventListener('mouseleave', function () {
      state.tx = 0;
      state.ty = 0;
      state.active = false;
    });

    magnets.push(state);
  });

  function applyMagnets(dt) {
    for (var i = 0; i < magnets.length; i++) {
      var m = magnets[i];
      m.x = U.damp(m.x, m.tx, 9, dt);
      m.y = U.damp(m.y, m.ty, 9, dt);
      if (Math.abs(m.x) < 0.02 && Math.abs(m.y) < 0.02 && !m.active) {
        if (m.el.style.transform) m.el.style.transform = '';
        continue;
      }
      m.el.style.transform =
        'translate3d(' + U.round(m.x, 2) + 'px,' + U.round(m.y, 2) + 'px,0)';
    }
  }

  /* ======================================================================
     Marquee
     ====================================================================== */
  var marquees = [];

  U.each(U.qsa('[data-marquee]'), function (el) {
    var track = U.qs('[data-marquee-track]', el);
    if (!track) return;

    var source = track.innerHTML;
    var guard = 0;

    /* Grow one copy until it is wider than the window, so two copies always
       overfill the viewport and the -50% loop has no gap. */
    while (track.scrollWidth < el.clientWidth + 2 && guard++ < 14) {
      track.innerHTML += source;
    }

    var clone = track.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.parentElement.appendChild(clone);

    var duration = U.clamp(track.scrollWidth / 70, 18, 72);
    el.style.setProperty('--marquee-dur', U.round(duration, 1) + 's');

    marquees.push({ el: el, skew: 0 });
  });

  function applyMarquees(dt) {
    var target = U.clamp(U.scroll.velocity * 0.004, -6, 6);
    for (var i = 0; i < marquees.length; i++) {
      var m = marquees[i];
      m.skew = U.damp(m.skew, target, 7, dt);
      var v = Math.abs(m.skew) < 0.01 ? 0 : U.round(m.skew, 3);
      if (v !== m.last) {
        m.last = v;
        m.el.style.setProperty('--skew', v);
      }
    }
  }

  /* ======================================================================
     Capabilities peek card
     ====================================================================== */
  var capsSection = U.qs('.capabilities');
  var capsWrap = U.qs('[data-caps]');
  var peek = U.qs('[data-caps-preview]');
  var peekLabel = U.qs('[data-caps-preview-label]');

  if (capsSection && capsWrap && peek) {
    var peekPos = { x: 0, y: 0, tx: 0, ty: 0, active: false, w: 0, h: 0 };

    function syncPeekSize() {
      var r = peek.getBoundingClientRect();
      peekPos.w = r.width;
      peekPos.h = r.height;
    }
    syncPeekSize();

    capsWrap.addEventListener('mousemove', function (e) {
      if (!U.finePointer.matches || U.reduced()) return;
      var r = capsSection.getBoundingClientRect();
      peekPos.tx = e.clientX - r.left;
      peekPos.ty = e.clientY - r.top;
      if (!peekPos.active) {
        peekPos.active = true;
        peekPos.x = peekPos.tx;
        peekPos.y = peekPos.ty;
      }
    });

    capsWrap.addEventListener('mouseleave', function () {
      peekPos.active = false;
      capsSection.classList.remove('is-peeking');
    });

    U.each(U.qsa('.cap', capsWrap), function (cap) {
      cap.addEventListener('mouseenter', function () {
        if (!U.finePointer.matches || U.reduced()) return;
        var color = cap.getAttribute('data-peek') || '#ff4d1c';
        peek.style.background =
          'radial-gradient(120% 120% at 30% 20%, ' + color + ' 0%, #08090a 78%)';
        if (peekLabel) peekLabel.textContent = cap.getAttribute('data-peek-label') || '';
        syncPeekSize();
        capsSection.classList.add('is-peeking');
      });
    });

    U.onResize(syncPeekSize);

    U.ticker.add(function (dt) {
      if (!peekPos.active) return;
      peekPos.x = U.damp(peekPos.x, peekPos.tx, 8, dt);
      peekPos.y = U.damp(peekPos.y, peekPos.ty, 8, dt);
      peek.style.transform =
        'translate3d(' + U.round(peekPos.x - peekPos.w - 18, 2) + 'px,' +
        U.round(peekPos.y - peekPos.h / 2, 2) + 'px,0)';
    });
  }

  /* ======================================================================
     Back to top
     ====================================================================== */
  U.each(U.qsa('[data-to-top]'), function (btn) {
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: U.reduced() ? 'auto' : 'smooth' });
    });
  });

  /* ======================================================================
     Frame loop
     ====================================================================== */
  U.ticker.add(function (dt) {
    var center = U.scroll.y + U.scroll.vh * 0.5;
    var band = bandAt(center);

    applyTheme(band);
    applyProgress();
    applyRail(band.rail);
    applyHeader();
    applyMagnets(dt);
    applyMarquees(dt);
  });

  function remeasure() {
    measureBands();
    lastY = U.scroll.y;
  }

  U.on('umbra:resize', remeasure);
  U.on('umbra:layout', remeasure);

  remeasure();
  applyClock();

  U.chrome = { remeasure: remeasure, setMenu: setMenu, isMenuOpen: function () { return menuOpen; } };
})(window.UMBRA);
