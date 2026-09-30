/* ==========================================================================
   UMBRA® — cursor.js
   Custom cursor: a single instant dot, composited with
   `mix-blend-mode: difference` so it inverts whatever it crosses. States are
   declared in the markup (`data-cursor-target="view"` + label) and resolved
   here through event delegation.

   Disabled entirely for touch and for reduced-motion users — the native
   cursor is an accessibility affordance, not decoration.
   ========================================================================== */
'use strict';

(function (U) {
  var root = U.qs('[data-cursor]');
  var dot = U.qs('[data-cursor-dot]');
  var label = U.qs('[data-cursor-label]');

  if (!root || !dot) return;

  var SCALE = { idle: 1, hover: 2.1, view: 4.6, drag: 3.4 };

  var pointer = { x: -100, y: -100, active: false };
  var state = 'idle';
  var labelText = '';
  var dotScale = 1;
  var enabled = false;

  function canUse() {
    return U.finePointer.matches && !U.reduced();
  }

  function enable() {
    if (enabled || !canUse()) return;
    enabled = true;
    /* The custom cursor is only revealed once the pointer actually moves —
       until then the native cursor stays visible. */
    U.ticker.add(tick);
    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver, { passive: true });
    document.addEventListener('mouseout', onOut, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    pointer.active = false;
    pointer.x = -200;
    pointer.y = -200;
    dotScale = 1;
    document.documentElement.classList.remove('has-custom-cursor');
    U.ticker.remove(tick);
    window.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseover', onOver);
    document.removeEventListener('mouseout', onOut);
    document.removeEventListener('mouseleave', onLeave);
    document.removeEventListener('mouseenter', onEnter);
    root.style.opacity = '';
  }

  function setState(next, text) {
    if (state === next && labelText === text) return;
    state = next;
    labelText = text || '';
    root.setAttribute('data-state', state);
    if (label) label.textContent = labelText;
  }

  function onMove(e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (!pointer.active) {
      pointer.active = true;
      document.documentElement.classList.add('has-custom-cursor');
    }
  }

  function onEnter() { root.style.opacity = ''; }
  function onLeave() { root.style.opacity = '0'; }

  /* Which state applies to whatever the pointer is now over. */
  function resolve(target) {
    var explicit = target.closest ? target.closest('[data-cursor-target]') : null;
    if (explicit) {
      var kind = explicit.getAttribute('data-cursor-target');
      var text = explicit.getAttribute('data-cursor-label') || '';
      if (kind === 'view') return setState('view', text || 'View');
      if (kind === 'drag') return setState('drag', text || 'Drag');
      if (kind === 'blend') return setState('hover', '');
    }

    var interactive = target.closest
      ? target.closest('a, button, [data-magnetic], input, textarea, summary')
      : null;

    return setState(interactive ? 'hover' : 'idle', '');
  }

  function onOver(e) { resolve(e.target); }

  function onOut(e) {
    /* Only reset when the pointer actually leaves the interactive ancestor. */
    if (!e.relatedTarget) return;
    resolve(e.relatedTarget);
  }

  function tick(dt) {
    if (!pointer.active) return;

    var target = SCALE[state] || 1;
    dotScale = U.damp(dotScale, target, 9, dt);

    /* Snap once close enough: idle frames stop writing styles entirely. */
    if (Math.abs(dotScale - target) < 0.002) dotScale = target;

    dot.style.transform =
      'translate3d(' + U.round(pointer.x, 2) + 'px,' + U.round(pointer.y, 2) + 'px,0) scale(' +
      U.round(dotScale, 3) + ')';
  }

  U.reduceMotion.addEventListener('change', function () {
    if (canUse()) enable();
    else disable();
  });

  U.finePointer.addEventListener('change', function () {
    if (canUse()) enable();
    else disable();
  });

  U.cursor = { enable: enable, disable: disable, setState: setState };

  /* Enable immediately: the pointer is useful before the preloader lifts. */
  enable();
})(window.UMBRA);
