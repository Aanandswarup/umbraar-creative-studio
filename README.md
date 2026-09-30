# UMBRA® — a website built to award-winning standards

A single-page site for a fictional creative-technology studio, built to the standard that
Awwwards / FWA / CSS Design Awards juries actually score against.

**Zero dependencies. No build step. No framework. No bundler.** Plain HTML, CSS and
hand-written JavaScript — including a hand-written WebGL shader (no Three.js).

```bash
node server.js          # → http://127.0.0.1:4321/
```

Then open that URL. (`server.js` is a ~110-line zero-dependency static server; the site
itself also works if you just open `index.html` directly, since every script is a classic
`<script>` rather than an ES module.)

---

## 1. What "award-winning" actually means

I did not design this from taste alone. The judging criteria are documented and consistent
across the awarding bodies, and one practitioner source was unusually explicit about it:
Hon Tran (Awwwards juror, two-time Independent of the Year nominee) describes the gap
between a 6.5 and a 9 as always living in the same three places:

| Criterion | The failure mode | How this build answers it |
|---|---|---|
| **Art direction** | A decorated template. Screenshot the hero and it collapses. | A single idea — *"Making the unseen felt"* — carried through type, palette, grid and the one accent colour. The hero is designed as a static frame first; the shader is atmosphere behind it, not the subject. |
| **Directed motion** | Effects bolted on, no choreography. | Motion is sequenced: preloader hands over → hero lines wipe up → each section has its own entrance grammar → transitions between states (link swaps, page-wide theme blend) rather than hard cuts. Every transition is a CSS declaration, not a JS tween, so it can be neutralised in one place. |
| **Performance** | 18fps on a mid-range Android; 9MB of assets. | Zero dependencies, zero external assets (the artwork is inline SVG, the hero is a shader), DPR capped at 1.5, adaptive resolution, offscreen/tab-hidden rendering paused, reduced-motion path built in. |

---

## 2. Reference corpus

I surveyed more than 100 named winners across the three major circuits before making any
design decisions. Grouped by where they came from:

**Awwwards — Sites of the Year** (the ceiling of the discipline)
Lusion v3 (Lusion) · Messenger & Igloo Inc (abeto) · Don't Board Me & The Other Side of
Truth (The First The Last) · Opal Tadpole (Claudio Guglieri) · Noomo Agency · Mana Yerba
Mate (Louis Paquet) · KPR & Tracing Art & Navigate & Zentry & Pioneer (Resn) · Persepolis
Reimagined & Umami Land & Dark: Official Netflix Guide (Monks) · Pangram Pangram Foundry
(Locomotive) · Star Atlas (Hello Monday) · Prometheus Fuels & Active Theory v4 (Active
Theory) · Chungi Folio (Synchronized Studio) · Mammut Expedition Baikal & Frans Hals Museum
(Build in Amsterdam) · Kode Sports Club (Merci Michel) · Bruno Simon Portfolio · MA (Retail
710) · Nomadic Tribe (makemepulse) · Orano & The New Mobile Workforce (Immersive Garden) ·
Simply Chocolate (Spring/Summer) · Lando Norris (OFF+BRAND.)

**Awwwards — Sites of the Month** (Jan 2024 → Aug 2026)
ERA Residence · Lama Lama · Son Daven · Floema (Bürocratik) · Oryzo AI (Lusion) · GQ & AP
The Extraordinary Lab & Cartier Watches & Wonders 2025 & Montfort (Immersive Garden) · The
Renaissance Edition (Shopify Design) · MindMarket (Louis Paquet) · Ponpon Mania (Patrick
Heng) · Terminal Industries (REJOUICE®) · Anime.js (Julian Garnier) · Siena Film Foundation
(Niccolò Miranda) · Dropbox Brand (Daybreak Studio) · The Line Studio · Kriss.ai (Studio
28K) · Watson (Watson Design Group) · Slosh Seltzer (Active Theory) · Inkfish (DashDigital) ·
Akaru · Bennett & Clive (Spatzek Studio)

**CSS Design Awards — Top 100 CSS websites**
Casa di Solare · Higglo Digital · End Speciesism · LandEarly · Airscream · Pixel Matters ·
Reborn · Cadence · Drool Design Studio · Times Event · TECHYSCOUTS · 11 Tanjung · 1LG ·
ABA Rank · Jean Rottner · LazyAnt · Alexander Volkmar · ALIEN Design · AMZIGO · Navana Real
Estate · Nikola Radeski · Qure XR · 9PM Store · BLNK · Brandvision · Logpoint · Mitrakos ·
NECjAR · Nelka · Onmi · QURE VR · Tony Hall · Wanderlust App · AntarA · Motivity · 9PM
Esports · Cultura X Pepper Agency · Every Season · Kovo Haken · Nizek · Pixelmatters · Supa
Stellar · Szymon Dziukiewicz · workflow · Zain Tahir · Creative Click Media · Dream Studios ·
DreamX · KAOS · Maxime's Portfolio · Nomads Egypt Ice Hockey · UPDOT · Voom Insurance · Zeus
Studio · Dreamstime · Elite Hockey HQ · HireAIScore · Jacob Read · Lambda · mameed · Outlink
AI · Plomb Type · Roobinium · thedsgnjunkies · ThriveAbility · TV-Turm Alexanderplatz ·
viresh pawar · Website Doctors · Amazon Multi-Channel Fulfillment · Authentic Imagination ·
Casework · Diego Sevilla · Fastbreak AI · Friendly Accountancy · iOTA · MikaEl Fekadu ·
Native Frame · Olympia Mobile Detailing · Onyx8 · Thrive Next Gen · United Studios of Self
Defense · Zaneffi · C&K Paving · Erfan Mirasadi · heydaysss · Houndstooth · Interadsion
Studio · Jesse Klotz · Julien Miscischia · Lola Lee Beauty

**Studios whose craft sets the technical bar**
Active Theory (production-scale real-time 3D that still ships to phones) · Lusion
(research-grade shader and particle work) · Resn (playful, character-driven interaction) ·
Obys Agency (editorial art direction — static frames that already look like posters) ·
Unseen Studio (type-led restraint; see also their WebGL Rain lab) · Immersive Garden
(lighting used for atmosphere rather than spectacle) · Uncommon Studio · By-Kin · Iventions ·
Mat Voyce (kinetic typography) · Minh Pham · Darkroom Engineering (Lenis) · Codrops /
tympanus.net (technique reference)

### What I took from the corpus

- **Restraint reads as premium.** The most decorated sites (Obys, Unseen, By-Kin) do less,
  better. Hence: one accent colour, one idea, no gradient soup, no carousel.
- **Type does the heavy lifting.** Oversized display type against tiny tracked mono labels
  is the dominant 2025–26 pattern; it also carries the whole design without images.
- **Continuous surfaces beat stacked sections.** The strongest sites feel like one
  continuous camera move. That is why the background and ink are interpolated across section
  boundaries here rather than hard-cut.
- **Transitions are where craft is visible.** "Cheap sites cut; award-winners move."
- **Performance is what kills contenders.** Jurors throttle to 4× CPU and Fast 3G. Which is
  why this build has no dependencies at all.
- **A reduced-motion path is a craft signal**, not a checkbox.

---

## 3. Art direction

**Concept.** A studio whose work is about making intangible things felt. The site has to
demonstrate that claim rather than assert it.

**Palette.** Near-black ink (`#08090a`) and warm paper (`#f1eee5`) as the two register
states, with exactly one signal colour — vermilion `#ff4d1c`. Lilac and electric blue exist
only inside the shader and the artwork, never in UI.

**Type.** A three-way contrast system: `Instrument Serif` for display (the italic
`unseen` inside the grotesk headline is the single most characteristic gesture in the
identity), `Inter` for the mechanical uppercase mega-type, and `JetBrains Mono` for the
oversized/tiny metadata layer carrying tracking of `0.18em`. Fallback stacks are chosen to
still look deliberate offline.

**Grid.** A 12-column grid that is allowed to break on purpose: mixed card widths in the
gallery, an indented second hero line, a shifted footer CTA.

**Sections.** 01 Hero · 02 Studio · 03 Selected work · 04 Capabilities · 05 Process ·
06 Recognition · 07 Contact.

**Artwork.** Five projects, each an inline SVG composition built from gradients, masks and
patterns — a domain-warped colour field, a lime wireframe sphere, a type specimen, halftone
wave bands, and a moiré interference. No image files: nothing to download, nothing to
distort at any viewport.

---

## 4. Technique inventory

| Technique | Where |
|---|---|
| Hand-written GLSL fBm field with domain warping + thin warped filament lines, mouse-reactive | `js/hero-gl.js` |
| Continuous background/ink interpolation between sections (hex mixing per frame, driven from the viewport centre) | `js/chrome.js` → `bandAt` / `applyTheme` |
| Preloader with monotonic counter, staged status lines, clip-path curtain wipe | `js/preloader.js` |
| Split-text (per-character and per-word) with `--i`-driven staggered reveals | `js/core.js` → `split`, `js/reveal.js` |
| Masked line reveals for display type | `css/motion.css` → `.mask-line` |
| Pinned horizontal gallery driven by native scroll (extra section height + sticky viewport + translateX) with per-card parallax | `js/gallery.js` |
| Custom cursor: instant dot + damped ring, `mix-blend-mode: difference`, state + label via event delegation | `js/cursor.js` |
| Magnetic hover with damping, shared across buttons | `js/chrome.js` |
| Marquee with scroll-velocity skew, auto-duplicated for seamless looping | `js/chrome.js` |
| Capabilities peek card that chases the pointer | `js/chrome.js` |
| Text-swap links (label + ghost sliding a line) | `js/chrome.js`, `css/components.css` |
| Rotating SVG `textPath` seal | `index.html` |
| Sticky process column, expanding capability rows (`grid-template-rows: 0fr → 1fr`) | `css/sections.css` |
| Film grain as one fixed SVG-noise layer | `css/components.css` |
| Live London clock, scroll progress, section rail | `js/chrome.js` |

### One rAF loop

Every animation is a subscriber to a single `requestAnimationFrame` loop in `js/core.js`,
with frame-rate-independent damping (`1 - e^(-λ·dt)`). One loop means one place to pause
everything (tab hidden), one place to read scroll, and no competing timers.

### Transform ownership

`transform` is written by exactly one owner per element, so CSS hover effects and JS motion
never fight. Where both are needed the shared value is passed as a custom property — e.g.
`.project__art` composes `translate3d(var(--px), 0, 0) scale(1.02)`, so the parallax (JS) and
the hover zoom (CSS) coexist.

---

## 5. Performance & accessibility

**Performance**
- No dependencies, no network requests except the optional webfont (which degrades to a
  tuned fallback stack offline).
- Canvas backing store capped at DPR 1.5.
- **Adaptive quality:** frame times are sampled over 90 frames and the render scale steps
  down (1 → 0.75 → 0.55) if the average slips past 22ms.
- Rendering stops when the hero is offscreen or the tab is hidden.
- WebGL context loss is handled and falls back to a CSS gradient atmosphere.
- All animation is `transform`/`opacity`/`clip-path`; no layout-thrashing properties.
- `will-change` only on elements that actually animate.

**Accessibility**
- Hidden reveal states are only applied under `html.js`, so a JS failure degrades to a fully
  readable static document rather than a blank one.
- The reveal system's contract is *"content is never left invisible"*: an IntersectionObserver
  for timing, plus a throttled sweep that also resolves anything already scrolled past
  (deep links, mid-page reloads, fast flicks).
- `prefers-reduced-motion` neutralises every entrance, un-pins the gallery (it becomes a
  swipe rail) and renders one static shader frame. Verified: with the declarations forced,
  every reveal is `opacity: 1`, every clip is open, and no character stays offset.
- Skip link, semantic landmarks, one `h1`, `aria-labelledby` on every section, labelled nav,
  the menu as a `role="dialog"` with focus moved in and returned on close, Esc to close,
  and a toggle that stays reachable above the overlay it opens.
- Custom cursor is disabled for touch and reduced-motion users — the native cursor is an
  affordance, not decoration.

---

## 6. Files

```
index.html            all markup, plus the five inline SVG artworks
css/tokens.css        palette, type scale, spacing, easing, reset
css/components.css    persistent chrome: grain, cursor, preloader, header, menu, buttons, marquee
css/sections.css      the seven sections
css/motion.css        reveal primitives, keyframes, reduced-motion escape hatch
js/core.js            maths, colour mixing, one rAF ticker, scroll state, split-text
js/reveal.js          split-text + IntersectionObserver reveals + safety sweep
js/cursor.js          custom cursor
js/preloader.js       curtain, counter, handover to the reveal system
js/chrome.js          theme blending, progress, rail, header, menu, magnetic, marquee, peek card
js/gallery.js         pinned horizontal gallery
js/hero-gl.js         the WebGL hero field
js/main.js            bootstrap
server.js             zero-dependency static server
_qa/desktop.html      QA harness
```

### QA harness

The preview pane used during development was only ~1034px wide, so `_qa/desktop.html`
renders the site inside iframes at real desktop widths (1440×900 at 0.7 scale, plus a
420×900 phone at 1:1). Because an iframe establishes its own viewport, media queries
evaluate at the iframe's width — this is the genuine desktop layout, not a scaled
screenshot. Useful probes:

```js
// in the harness console
document.getElementById('d').contentWindow.scrollTo({ top: 2400, behavior: 'instant' })
document.getElementById('d').contentDocument.querySelector('[data-menu-btn]').click()
```

---

## 7. Known limitations

- **No audio.** A sound layer would suit the concept (Nocturne FM is in the portfolio) but
  needs real assets and a considered unmute affordance — out of scope here.
- **The work section is fiction.** Five invented projects with generated artwork; swapping in
  real image or video media means changing `.project__media` and the parallax hook.
- **The shader is tuned by eye**, not by a perceptual target. If you want to push the art
  direction further, `js/hero-gl.js` is self-contained and hot-reloads with a refresh.
