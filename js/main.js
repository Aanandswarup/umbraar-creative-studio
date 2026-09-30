/* ==========================================================================
   UMBRA® — main.js
   Bootstrap. Its only job is to give the modules a shared start signal and to
   own the few cross-cutting behaviours (font readiness, reduced-motion flips,
   hash navigation and the console colophon).
   ========================================================================== */
'use strict';

(function (U) {
  var booted = false;

  function boot() {
    if (booted) return;
    booted = true;

    /* Fonts change every measured height — tell the layout modules. */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        U.refreshScroll();
        U.emit('umbra:fonts');
      });
    }

    U.on('umbra:ready', onReady);

    if (U.preloader) U.preloader.start();
  }

  function onReady() {
    document.documentElement.classList.add('is-ready');

    /* Deep link: the curtain lifted, now honour the hash without a slow
       animated scroll from the top. */
    if (window.location.hash) {
      var target = document.querySelector(window.location.hash);
      if (target) {
        window.setTimeout(function () {
          target.scrollIntoView({ behavior: 'auto', block: 'start' });
          U.refreshScroll();
        }, 60);
      }
    }

    /* A keyboard or reduced-motion visitor should never be left staring at
       content that is waiting for an animation that will not come. */
    if (U.reduced() && U.reveal) U.reveal.all();
  }

  /* If the system setting flips mid-session, honour it immediately. */
  U.on('umbra:reducedchange', function () {
    if (U.reduced() && U.reveal) U.reveal.all();
    if (U.chrome && U.chrome.remeasure) U.chrome.remeasure();
  });

  U.reduceMotion.addEventListener('change', function () {
    U.emit('umbra:reducedchange');
  });

  /* Keep the pinned gallery honest when the viewport changes shape
     (mobile browser chrome collapsing, devtools opening, etc.). */
  window.addEventListener(
    'pageshow',
    function () { U.refreshScroll(); },
    { passive: true }
  );

  if (window.console && console.info) {
    console.info(
      '%cUMBRA®%c  zero dependencies · 4 stylesheets · 8 scripts · hand-written WebGL\n' +
        'Colophon: index.html → css/{tokens,components,sections,motion}.css → js/{core,reveal,cursor,preloader,chrome,gallery,hero-gl,main}.js',
      'font:600 14px/1.4 monospace;color:#ff4d1c',
      'font:400 12px/1.4 monospace;color:#888'
    );
  }

  boot();
})(window.UMBRA);
