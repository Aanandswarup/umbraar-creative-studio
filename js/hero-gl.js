/* ==========================================================================
   UMBRA® — hero-gl.js
   The hero field: a hand-written WebGL fragment shader (domain-warped fBm)
   rendered onto a single full-screen quad. No Three.js, no library — just
   ~2KB of GLSL and the raw WebGL API.

   Performance rules applied here, because this is where most "award-winning"
   sites actually lose:
     • device pixel ratio is capped, and the backing store is scaled down
       further if frame time slips (adaptive quality);
     • rendering stops when the hero scrolls out of view or the tab is hidden;
     • context loss is survivable — the CSS gradient underneath is the fallback;
     • reduced motion renders one static frame and stops.
   ========================================================================== */
'use strict';

(function (U) {
  var canvas = U.qs('[data-hero-canvas]');
  var hero = U.qs('.hero');
  if (!canvas || !hero) return;

  /* Template literals, not arrays of quoted lines: GLSL is multi-line by
     nature, and a stray newline inside a quoted string is a parse error that
     takes the whole module down with it. */
  var VERT = `
attribute vec2 a_pos;

void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

  var FRAG = `
precision highp float;

uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mouse;
uniform float u_scroll;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

// A thin band wherever t crosses a half-integer. This is the filament
// primitive: driving t with the warp field makes the lines flow, and unlike a
// thresholded fBm it stays thin no matter how the noise is distributed.
float ridgeLine(float t, float width) {
  float d = abs(fract(t) - 0.5);
  return smoothstep(width, 0.0, d);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;

  // Clamp the sampling aspect: on a portrait phone the field is cropped
  // rather than squeezed, so the filaments keep their shape.
  float field = max(aspect, 1.15);
  vec2 p = (uv - 0.5) * vec2(field, 1.0);
  float t = u_time * 0.022;

  // Pointer influence, in the same space as p.
  vec2 m = (u_mouse - 0.5) * vec2(field, 1.0);
  float pull = exp(-length(p - m) * 3.0);

  // Two-stage domain warp: q bends the field over long distances, r adds the
  // finer structure that the filament lines ride on.
  vec2 q = vec2(fbm(p * 0.75 + vec2(t, -t * 0.7)), fbm(p * 0.75 + vec2(4.7, t * 0.5)));
  vec2 r = vec2(
    fbm(p * 1.7 + 1.6 * q + vec2(1.7, 9.2) + t * 0.5),
    fbm(p * 1.7 + 1.6 * q + vec2(8.3, 2.8) - t * 0.4)
  );
  float f = fbm(p * 1.3 + 1.9 * r * (0.9 + pull * 1.0) + vec2(0.0, u_scroll * 0.7));

  vec3 ink   = vec3(0.021, 0.024, 0.030);
  vec3 deep  = vec3(0.030, 0.050, 0.115);
  vec3 cool  = vec3(0.09, 0.18, 0.75);
  vec3 lilac = vec3(0.60, 0.53, 1.00);
  vec3 warm  = vec3(1.00, 0.28, 0.09);

  // Restraint: the base stays close to ink and colour has to be earned. The
  // type is the subject; this is only atmosphere behind it.
  vec3 col = mix(ink, deep, smoothstep(0.34, 0.92, f));
  col = mix(col, cool, smoothstep(0.74, 1.05, f) * 0.45);
  col = mix(col, lilac, smoothstep(0.78, 1.05, q.y) * 0.26);

  // Filaments. Warping the line coordinate through q and r makes them wander
  // like flowing silk; the veil term lets them fade in and out so they never
  // read as uniform scanlines.
  float warp = (q.x - 0.5) * 1.9 + (r.y - 0.5) * 0.9;
  float line1 = ridgeLine(p.y * 1.45 + warp * 2.4 + t * 0.30, 0.085);
  float line2 = ridgeLine(p.y * 2.60 + warp * 3.1 - t * 0.20 + 0.5, 0.055);
  float line3 = ridgeLine(p.x * 0.55 + warp * 0.7 + t * 0.14, 0.070);
  float veil  = smoothstep(0.14, 0.78, f);

  col += warm  * line1 * 0.44 * veil;
  col += lilac * line2 * 0.24 * veil;
  col += warm  * line3 * 0.20 * veil;
  col += warm  * pull * 0.06;

  float vig = 1.0 - smoothstep(0.32, 1.05, length(uv - vec2(0.46, 0.52)));
  col *= mix(0.40, 1.0, vig);

  // Dither: kills banding across the wide gradients.
  col += (hash(uv * u_res) - 0.5) * 0.014;

  gl_FragColor = vec4(col, 1.0);
}
`;

  var gl = null;
  var program = null;
  var quad = null;
  var uniforms = {};
  var scale = 1;
  var dpr = 1;
  var frameTimes = [];
  var visible = true;
  var frozen = false;
  var time = 0;
  var mouse = { x: 0.62, y: 0.68, tx: 0.62, ty: 0.68 };
  var heroProgress = 0;
  var lastDraw = { w: 0, h: 0 };

  function compile(type, src) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      /* Silently bail: the CSS gradient underneath is the designed fallback. */
      if (window.console) console.warn('UMBRA shader:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function build() {
    var vs = compile(gl.VERTEX_SHADER, VERT);
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;

    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;

    gl.useProgram(program);

    quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    var loc = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    uniforms.res = gl.getUniformLocation(program, 'u_res');
    uniforms.time = gl.getUniformLocation(program, 'u_time');
    uniforms.mouse = gl.getUniformLocation(program, 'u_mouse');
    uniforms.scroll = gl.getUniformLocation(program, 'u_scroll');

    return true;
  }

  function resize() {
    if (!gl) return;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    var rect = canvas.getBoundingClientRect();
    var w = Math.max(1, Math.round(rect.width * dpr * scale));
    var h = Math.max(1, Math.round(rect.height * dpr * scale));

    if (w === lastDraw.w && h === lastDraw.h) return;
    lastDraw.w = w;
    lastDraw.h = h;

    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }

  function draw(dt) {
    if (!gl || !program) return;

    time += dt;
    mouse.x = U.damp(mouse.x, mouse.tx, 4, dt);
    mouse.y = U.damp(mouse.y, mouse.ty, 4, dt);

    gl.uniform2f(uniforms.res, canvas.width, canvas.height);
    gl.uniform1f(uniforms.time, time);
    gl.uniform2f(uniforms.mouse, mouse.x, mouse.y);
    gl.uniform1f(uniforms.scroll, heroProgress);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  /* Drop resolution once if we are consistently missing 60fps. */
  function checkQuality(dt) {
    frameTimes.push(dt);
    if (frameTimes.length < 90) return;

    var sum = 0;
    for (var i = 0; i < frameTimes.length; i++) sum += frameTimes[i];
    var avg = sum / frameTimes.length;
    frameTimes.length = 0;

    if (avg > 0.022 && scale > 0.55) {
      scale = Math.max(0.55, scale - 0.25);
      lastDraw.w = 0;
      lastDraw.h = 0;
      resize();
    }
  }

  function start() {
    if (!gl || frozen) return;
    frozen = false;
    U.ticker.add(loop);
  }

  function loop(dt) {
    if (!visible || document.hidden) return;
    draw(dt);
    checkQuality(dt);
  }

  function init() {
    var options = {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
    };

    gl = canvas.getContext('webgl', options) || canvas.getContext('experimental-webgl', options);
    if (!gl) return;

    if (!build()) {
      gl = null;
      return;
    }

    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      gl = null;
      canvas.classList.remove('is-live');
    });

    resize();
    canvas.classList.add('is-live');

    if (U.reduced()) {
      /* Motion sensitive: one composed frame, no motion. */
      frozen = true;
      draw(0.001);
      frozen = false;
      return;
    }

    /* Static seed positions so the field never starts from a flat frame. */
    U.ticker.add(loop);

    U.onResize(function () {
      lastDraw.w = 0;
      lastDraw.h = 0;
      resize();
    });
  }

  /* Pointer influence, in canvas space with y pointing up. */
  window.addEventListener(
    'mousemove',
    function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.tx = U.clamp((e.clientX - r.left) / r.width, 0, 1);
      mouse.ty = U.clamp(1 - (e.clientY - r.top) / r.height, 0, 1);
    },
    { passive: true }
  );

  /* Hero progress feeds the shader so the field drifts as you scroll away. */
  U.ticker.add(function () {
    var y = U.scroll.y;
    heroProgress = U.clamp(y / Math.max(1, hero.offsetHeight), 0, 1);
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      function (entries) {
        visible = entries[0].isIntersecting;
      },
      { threshold: 0 }
    ).observe(hero);
  }

  U.reduceMotion.addEventListener('change', function () {
    if (U.reduced()) {
      U.ticker.remove(loop);
      draw(0.001);
    } else if (gl) {
      U.ticker.add(loop);
    }
  });

  init();

  U.heroGL = { active: function () { return !!gl; } };
})(window.UMBRA);
