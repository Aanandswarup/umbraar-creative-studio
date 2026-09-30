/* ==========================================================================
   UMBRA® — reveal.js
   Split-text + IntersectionObserver reveals.

   One observer toggles `.is-in`; all the actual animation lives in CSS, which
   keeps the motion declarative and lets `prefers-reduced-motion` neutralise it
   in a single place.

   Reveals deliberately do not start until the preloader has handed over, so
   nothing animates behind the curtain.
   ========================================================================== */
'use strict';

(function (U) {
  var SELECTOR =
    '[data-reveal], .mask-line, .split-chars, .split-words, [data-clip], [data-wipe]';
  var BASE_DELAY = 60;   /* ms between siblings revealed in the same batch */
  var MAX_DELAY = 320;
  var started = false;
  var observed = [];

  function markIn(el, delay) {
    if (el.classList.contains('is-in')) return;

    /* Explicit inline --d wins; otherwise apply the batch stagger. */
    if (!el.style.getPropertyValue('--d') && delay) {
      el.style.setProperty('--d', delay + 'ms');
    }

    el.classList.add('is-in');
  }

  /* Nearest horizontally scrollable ancestor, if any. The pinned gallery
     becomes a native swipe rail on small screens, so its cards need a scroller
     root or they would never intersect. */
  function scrollerFor(el) {
    var node = el.parentElement;
    while (node && node !== document.body) {
      var ox = window.getComputedStyle(node).overflowX;
      if (ox === 'auto' || ox === 'scroll') return node;
      node = node.parentElement;
    }
    return null;
  }

  function makeObserver(root) {
    return new IntersectionObserver(
      function (entries) {
        var shown = 0;

        entries.forEach(function (entry) {
          /* `isIntersecting` covers the normal case. The second test catches
             elements that were skipped over — a jump to an anchor, a restored
             scroll position, a fast flick — which are now above the viewport
             and would otherwise stay invisible forever. */
          var passed = entry.boundingClientRect.top < 0;
          if (!entry.isIntersecting && !passed) return;
          markIn(entry.target, Math.min(shown * BASE_DELAY, MAX_DELAY));
          shown++;
          unobserve(entry.target);
        });
      },
      {
        root: root || null,
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.12,
      }
    );
  }

  var observers = new Map();

  function unobserve(el) {
    observers.forEach(function (ob) {
      ob.unobserve(el);
    });
  }

  function observerFor(el) {
    var root = scrollerFor(el);
    var key = root || 'viewport';
    if (!observers.has(key)) observers.set(key, makeObserver(root));
    return observers.get(key);
  }

  function collect() {
    U.qsa(SELECTOR).forEach(function (el) {
      /* Split-text elements animate per word/char; the generic transform would
         fight that, so they are handed over to the split system entirely. */
      if (el.hasAttribute('data-split')) {
        el.removeAttribute('data-reveal');
      }
      observed.push(el);
    });
  }

  function observeAll() {
    observed.forEach(function (el) {
      if (!el.classList.contains('is-in')) observerFor(el).observe(el);
    });
  }

  function revealNow(list) {
    list.forEach(function (el) { markIn(el, 0); });
  }

  function init() {
    if (started) return;
    started = true;

    /* Split before measuring: the spans change the box height. */
    U.qsa('[data-split]').forEach(function (el) {
      U.split(el, el.getAttribute('data-split'));
    });

    collect();
    U.refreshScroll();

    if (!('IntersectionObserver' in window)) {
      revealNow(observed);
      return;
    }

    observeAll();

    /* Anything already on screen at handover resolves on the next frame, so
       the hero gets its entrance without a scroll event. */
    U.nextFrame(function () { U.refreshScroll(); });

    window.setTimeout(sweep, 1200);

    /* Safety net. The observer is the primary trigger and gives the better
       timing, but the contract is "content is never left invisible", so a
       throttled sweep also resolves anything at or above the fold. This is
       what makes fast flicks, deep links and mid-page reloads safe. */
    var pending = 0;
    window.addEventListener(
      'scroll',
      function () {
        if (pending) return;
        pending = window.setTimeout(function () {
          pending = 0;
          sweep();
        }, 260);
      },
      { passive: true }
    );
  }

  function sweep() {
    var vh = U.scroll.vh;
    var vw = U.scroll.vw;

    observed.forEach(function (el) {
      if (el.classList.contains('is-in')) return;
      var r = el.getBoundingClientRect();
      if (r.height === 0) return;
      /* At or above the fold, and horizontally within the viewport — the
         second test matters for the sideways gallery on touch. */
      if (r.top < vh * 0.92 && r.left < vw && r.right > 0) markIn(el, 0);
    });
  }

  /* Re-check after a resize: pinned sections change how tall the page is. */
  U.on('umbra:resize', function () {
    if (!started) return;
    observed.forEach(function (el) {
      if (!el.classList.contains('is-in')) observerFor(el).observe(el);
    });
    sweep();
  });

  U.reveal = {
    init: init,
    sweep: sweep,
    all: function () { revealNow(observed); },
    refresh: function () {
      observers.forEach(function (ob) { ob.disconnect(); });
      observers.clear();
      observeAll();
    },
  };
})(window.UMBRA);
