/* ==========================================================================
   UMBRA® — gallery.js
   Pinned horizontal gallery.

   Native scroll only: the section is given extra height equal to the track's
   overflow, the viewport sticks to the top, and scroll distance is mapped to
   translateX. No scroll hijacking, no virtual scroller, so wheel, trackpad,
   keyboard, scrollbar dragging and find-in-page all behave normally.

   Below 720px (and for reduced motion) this deliberately disables itself and
   CSS turns the gallery into an ordinary swipe rail — horizontal pinning is a
   bad touch experience.
   ========================================================================== */
'use strict';

(function (U) {
  var section = U.qs('.work');
  var viewport = U.qs('[data-hscroll]');
  var track = U.qs('[data-hscroll-track]');

  if (!section || !viewport || !track) return;

  var distance = 0;
  var offsetTop = 0;
  var x = 0;
  var enabled = false;
  var lastHeight = '';
  var arts = U.qsa('.project__media', track);

  function shouldDisable() {
    return U.reduced() || window.innerWidth < 720;
  }

  function measure() {
    if (shouldDisable()) {
      if (enabled) {
        enabled = false;
        distance = 0;
        x = 0;
        section.style.height = '';
        track.style.transform = '';
        U.each(arts, function (m) { m.style.removeProperty('--px'); });
        lastHeight = '';
        U.emit('umbra:layout');
      }
      return;
    }

    /* Reset so the measurement reflects the untransformed layout. */
    track.style.transform = '';
    viewport.scrollLeft = 0;

    var viewportWidth = viewport.getBoundingClientRect().width;
    distance = Math.max(0, track.scrollWidth - viewportWidth);
    var shell = U.qs('.shell', section);
    offsetTop = shell ? (shell.offsetTop + shell.offsetHeight) : 0;
    enabled = distance > 1;

    var height = enabled
      ? Math.ceil(offsetTop + viewport.getBoundingClientRect().height + distance) + 'px'
      : '';

    if (height !== lastHeight) {
      lastHeight = height;
      section.style.height = height;
      /* Page height changed — chrome needs to re-measure its section bands. */
      U.emit('umbra:layout');
    }
  }

  function update(dt) {
    if (!enabled) return;

    var rect = section.getBoundingClientRect();
    var travelled = -rect.top - offsetTop;
    var p = U.clamp(travelled / distance, 0, 1);

    /* A little damping so trackpad jitter doesn't read as a stutter. */
    var target = -p * distance;
    x = U.damp(x, target, 20, dt);
    if (Math.abs(x - target) < 0.12) x = target;

    track.style.transform = 'translate3d(' + U.round(x, 2) + 'px,0,0)';

    /* Per-card parallax, written as a CSS variable so the hover zoom in
       CSS still owns the rest of the transform. */
    var mid = U.scroll.vw * 0.5;
    for (var i = 0; i < arts.length; i++) {
      var r = arts[i].getBoundingClientRect();
      var delta = (r.left + r.width * 0.5 - mid) / U.scroll.vw;
      var shift = U.round(U.clamp(delta, -1.2, 1.2) * -4.5, 3);
      arts[i].style.setProperty('--px', shift + '%');
    }
  }

  U.onResize(measure);
  U.on('umbra:fonts', measure);
  U.ticker.add(update);

  measure();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      U.nextFrame(measure);
    });
  }

  U.gallery = { measure: measure };
})(window.UMBRA);
