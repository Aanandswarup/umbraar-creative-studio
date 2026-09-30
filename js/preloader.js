/* ==========================================================================
   UMBRA® — preloader.js
   The curtain.

   Design rules: the counter never lies about being finished, the curtain is
   the only thing allowed to block the page, and it must always lift — even if
   the load event never fires, even if the rest of the JavaScript throws. The
   handover (revealing the hero) belongs to this module so there is exactly one
   owner of "the page is ready" state.
   ========================================================================== */
'use strict';

(function (U) {
  var el = U.qs('[data-preloader]');
  var count = U.qs('[data-preloader-count]');
  var bar = U.qs('[data-preloader-bar]');
  var status = U.qs('[data-preloader-status]');

  var MESSAGES = [
    { at: 0, text: 'Compiling shaders' },
    { at: 26, text: 'Measuring the grid' },
    { at: 50, text: 'Choreographing motion' },
    { at: 74, text: 'Warming the field' },
    { at: 92, text: 'Handing over' },
  ];

  var DURATION = U.reduced() ? 0.5 : 1.7; /* seconds */
  var HOLD = U.reduced() ? 0.25 : 0.4;

  var loaded = false;
  var started = false;
  var finished = false;
  var elapsed = 0;
  var shown = 0;
  var messageIndex = -1;

  /* Lock immediately, at parse time, so the page cannot be scrolled behind
     the curtain. */
  document.body.classList.add('is-locked');
  if (!window.location.hash) {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }

  if (document.readyState === 'complete') loaded = true;
  else window.addEventListener('load', function () { loaded = true; }, { once: true });

  function pad(n) {
    return n < 10 ? '00' + n : n < 100 ? '0' + n : String(n);
  }

  function setValue(v) {
    shown = v;
    if (count) count.textContent = pad(Math.round(v));
    if (bar) bar.style.transform = 'scaleX(' + U.round(v / 100, 4) + ')';

    for (var i = MESSAGES.length - 1; i >= 0; i--) {
      if (v >= MESSAGES[i].at) {
        if (i !== messageIndex) {
          messageIndex = i;
          if (status) status.textContent = MESSAGES[i].text;
        }
        break;
      }
    }
  }

  function finish() {
    if (finished) return;
    finished = true;

    setValue(100);
    U.ticker.remove(tick);

    if (el) {
      el.classList.add('is-done');
      el.setAttribute('aria-hidden', 'true');
      /* Remove it from the tree once the wipe is over so it can never
         intercept a click or hold a layer. */
      window.setTimeout(function () {
        el.style.display = 'none';
      }, U.reduced() ? 320 : 1200);
    }

    document.body.classList.remove('is-locked');

    /* Handover: reveals, then let anyone else in on the news. */
    if (U.reveal) U.reveal.init();
    U.refreshScroll();
    U.emit('umbra:ready');
  }

  function tick(dt) {
    elapsed += dt;

    var t = U.clamp(elapsed / DURATION, 0, 1);
    var eased = 1 - Math.pow(1 - t, 3);
    var ceiling = loaded ? 100 : 91;
    var value = eased * ceiling;

    /* The number is monotonic: whatever the network does, it never counts
       backwards. */
    setValue(Math.max(shown, value));

    if (t >= 1 && loaded) {
      window.setTimeout(finish, HOLD * 1000);
    }
  }

  function start() {
    if (started || finished) return;
    started = true;
    setValue(0);
    U.ticker.add(tick);

    /* Insurance: if `load` is being held up by a slow font or image, lift the
       curtain anyway once the minimum choreography has played. */
    window.setTimeout(function () {
      if (!finished) {
        loaded = true;
        window.setTimeout(finish, 220);
      }
    }, (DURATION + 2.6) * 1000);
  }

  U.reduceMotion.addEventListener('change', function () {
    if (U.reduced()) DURATION = 0.4;
  });

  U.preloader = { start: start, finish: finish };

  /* If the boot module never gets a chance to run, still lift the curtain. */
  window.setTimeout(function () { start(); }, 900);
})(window.UMBRA);
