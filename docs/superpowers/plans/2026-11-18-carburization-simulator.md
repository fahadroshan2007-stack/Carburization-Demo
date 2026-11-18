# Carburization Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-file `index.html` interactive simulator of 1-D carburization of steel with live C(x,t) chart, effective-case-depth solve, and the approved dark "metallurgy lab" look.

**Architecture:** One self-contained `index.html` (markup + Tailwind CDN + inline CSS + inline JS). All physics lives in one clearly marked `// === PHYSICS START/END ===` block of pure functions so a Node harness (`tests/verify.mjs`) can extract and test them without a browser. Chart.js renders the profile; a custom plugin draws the dashed 0.40 wt% line and the case-depth marker.

**Tech Stack:** HTML, Tailwind Play CDN, Chart.js CDN, KaTeX CDN, Google Fonts (Space Grotesk, Inter, JetBrains Mono), vanilla JS. Test: Node (v26 available at `~/.nvm/versions/node/v26.13.1/bin`) extracting the physics block and asserting with `node:assert`.

**Spec:** `docs/superpowers/specs/2026-11-18-carburization-simulator-design.md` (approved 2026-11-18, mockup v2 approved).

## Global Constraints
- Single file: `index.html` in project root (`/mnt/d/Fahad/Apps/Code Projects/Transport Demo/index.html`); no build step, no local assets other than CDN URLs.
- `D(T) = 2.3e-5 * Math.exp(-148000 / (8.314 * (T + 273.15)))` m²/s, T in °C.
- `C(x,t) = Cs - (Cs - C0) * erf(x / (2 * sqrt(D * t)))`, x ∈ [0, 3 mm] (meters internally).
- Sliders: Temperature 800–1050 °C step 1 (default 920); Time 1–24 h step 0.5 (default 4.0); Surface Carbon 0.8–1.3 wt% step 0.01 (default 1.10); Core Carbon 0–0.5 wt% step 0.01 (default 0.20).
- Effective case depth = x where C(x,t) = 0.40 wt%, bisection on [0, 3 mm]; if C(3 mm) ≥ 0.40, display `> 3.00 mm`.
- Effective case-depth reference line: horizontal, dashed, red (#f87171), at C = 0.40 wt%.
- erf: Abramowitz–Stegun 7.1.26 (|ε| ≤ 1.5e-7), implemented inline — no math CDN.
- Logo: `Shrinking Core Particle Icon.png` embedded as base64 data URI (`<img src="data:image/png;base64,…">`); keep the source PNG in root.
- Fonts exactly: Space Grotesk (display), Inter (body), JetBrains Mono w/ tabular numerics (readouts, ticks). Equations via KaTeX display mode, `throwOnError: false`.
- Not a git repo: "Commit" steps are replaced by **Checkpoint** steps (save + list files changed). Do not `git init`.
- `.superpowers/` must not be referenced by `index.html`.

## Review Focus
Failure modes most likely to bite a grader/user, most likely first — each is pinned to a task:

1. **Core Carbon ≥ 0.4 wt%** → whole profile stays ≥ 0.40; bisection has no root in [0, 3 mm] and must not return `x = 3 mm` as if it were a depth. → Task 2, test `solveCaseDepth returns null when C stays above 0.40`.
2. **erf saturates** (large x/(2√Dt)) → erf must return exactly 1.0, not overshoot; and erf(0) = 0 exactly (profile starts at Cs). → Task 2, tests `erf(0) === 0`, `erf(3) === 1`, `erf matches known table values`.
3. **Extreme slider combos** (800 °C, 1 h) → D ~ 1e-13-scale, C(x,t) ≈ Cs nearly flat; chart and stats must not show NaN/undefined. → Task 2 test `profile is finite across slider extremes` + Task 3 live-update verification step.
4. **Case depth exactly at boundary** → when C(0) = Cs > 0.40 always (Cs ≥ 0.8), bisection bracketed by Cs > 0.40 > C(3mm) or null; no sign-change assumption on a flat profile. → Task 2, test `solveCaseDepth bisection converges to C = 0.40 ± 1e-6`.
5. **CDN unreachable (offline demo)** → page must still compute and plot nothing breaks catastrophically: KaTeX already `throwOnError:false`; Chart.js/Tailwind failing is accepted (CDN per spec) — but the *physics readouts and stat cards must not depend on CDNs at all*. → Task 3 keeps all computation CDN-free; Task 5 re-checks stats with JS libs blocked (or `<script>` tags inert).

---

### Task 1: Scaffold `index.html` shell matching mockup v2

**Files:**
- Create: `index.html`
- Read-only reference: `.superpowers/brainstorm/2389-1795027073/content/mockup-v2.html` (approved look), `Shrinking Core Particle Icon.png`

**Interfaces:**
- Produces: DOM ids used by later tasks — `tempSlider, timeSlider, surfSlider, coreSlider`; value spans `tempVal, timeVal, surfVal, coreVal`; stat values `dVal, depthVal, lenVal`; `<canvas id="profileChart">`; preset buttons `.preset[data-t][data-time][data-cs][data-c0]`; slider fill via CSS var `--fill` on each range input.

- [ ] **Step 1: Checkpoint the reference** — confirm mockup v2 file exists and project root PNG exists (`ls` both). Expected: both listed.
- [ ] **Step 2: Write `index.html`** with the full static shell: header (embedded-logo `<img>` — placeholder `data:image/png;base64,LOGO_PLACEHOLDER` to be swapped in Step 4), control panel (4 range inputs with min/max/step/default from Global Constraints, tick labels, preset buttons), stats row (D(T) / Effective Case Depth @ 0.40%C / √(Dt)), chart panel (`<canvas id="profileChart">` + legend), Governing Equations card with two KaTeX divs (`#eq1`, `#eq2`), Assumptions card, footer. Port the mockup v2 CSS verbatim into a `<style>` block, swapping the SVG chart for the canvas container. Head links: Google Fonts (Space Grotesk 500/600/700, Inter 400–700, JetBrains Mono 400–700), Tailwind Play CDN (`https://cdn.tailwindcss.com`), Chart.js CDN (`https://cdn.jsdelivr.net/npm/chart.js@4`), KaTeX CSS+JS, favicon → the embedded data URI. Set `<html color-scheme: dark>`.
- [ ] **Step 3: Verify shell structure** — run:
  `grep -c 'id="tempSlider"\|id="timeSlider"\|id="surfSlider"\|id="coreSlider"\|id="profileChart"\|id="eq1"\|id="eq2"' index.html`
  Expected: `7`. Also `grep -c 'https://' index.html` shows only the CDN/font hosts from Global Constraints.
- [ ] **Step 4: Embed the logo** — run:
  `python3 - <<'EOF'` building `data_uri = 'data:image/png;base64,' + base64(open('Shrinking Core Particle Icon.png','rb').read())` and replacing both `LOGO_PLACEHOLDER` occurrences (header img src and favicon link) with the full data URI. Verify: `grep -c 'LOGO_PLACEHOLDER' index.html` → `0`; file opens with `file:///` and shows the logo.
- [ ] **Step 5: Checkpoint** — list project root; confirm `index.html` parses as HTML (python3 `html.parser` walk without exceptions). Done when the page renders the static mockup look in a browser.

### Task 2: Physics core + Node verification harness

**Files:**
- Modify: `index.html` (add inline `<script>` before `</body>` containing the marked physics block; page must not call it yet)
- Create: `tests/verify.mjs`

**Interfaces:**
- Produces (inside `// === PHYSICS START ===` … `// === PHYSICS END ===`, plain script, no imports):
  - `erf(x: number): number`
  - `diffusivity(tempC: number): number` — m²/s
  - `concentration(x_m: number, tempC: number, timeH: number, cs: number, c0: number): number` — wt%
  - `solveCaseDepth(tempC: number, timeH: number, cs: number, c0: number): number | null` — meters, or `null` if C(3 mm) ≥ 0.40
  - `profilePoints(tempC, timeH, cs, c0, n=150): Array<{x: number (mm), c: number}>`
- `tests/verify.mjs` extracts the block with regex `/\/\/ === PHYSICS START ===([\s\S]*?)\/\/ === PHYSICS END ===/`, wraps it in a `new Function` returning the five functions, and asserts.

- [ ] **Step 1: Write the failing test** — create `tests/verify.mjs` with these assertions:
  ```js
  import { readFileSync } from 'node:fs';
  import assert from 'node:assert/strict';
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const block = html.match(/\/\/ === PHYSICS START ===([\s\S]*?)\/\/ === PHYSICS END ===/)[1];
  const { erf, diffusivity, concentration, solveCaseDepth, profilePoints } =
    new Function(`${block}; return { erf, diffusivity, concentration, solveCaseDepth, profilePoints };`)();

  // erf
  assert.equal(erf(0), 0);
  assert.equal(erf(3), 1);
  assert.ok(Math.abs(erf(1) - 0.8427007929) < 1e-7);
  assert.ok(Math.abs(erf(2) - 0.9953222650) < 1e-7);
  assert.ok(Math.abs(erf(-1.5) + 0.9661051465) < 1e-7);
  // diffusivity: positive, increases with T, correct ballpark at 920 °C
  const D = diffusivity(920);
  assert.ok(D > 1e-13 && D < 1e-9, `D out of range: ${D}`);
  assert.ok(diffusivity(1050) > D && D > diffusivity(800));
  // monotonic decrease of C with depth; starts at Cs
  const pts = profilePoints(920, 4, 1.1, 0.2);
  assert.equal(pts.length, 150);
  assert.ok(Math.abs(pts[0].c - 1.1) < 1e-9);
  for (let i = 1; i < pts.length; i++) assert.ok(pts[i].c <= pts[i - 1].c);
  assert.ok(pts.every(p => Number.isFinite(p.c)));
  // case depth: C at solution ≈ 0.40
  const d = solveCaseDepth(920, 4, 1.1, 0.2);
  assert.ok(d !== null && Math.abs(concentration(d, 920, 4, 1.1, 0.2) - 0.4) < 1e-6);
  // no root when profile never drops to 0.40 (core 0.5% C)
  assert.equal(solveCaseDepth(920, 4, 1.1, 0.5), null);
  // extremes are finite
  assert.ok(profilePoints(800, 1, 0.8, 0).every(p => Number.isFinite(p.c)));
  assert.ok(profilePoints(1050, 24, 1.3, 0).every(p => Number.isFinite(p.c)));
  console.log('verify.mjs: all assertions passed');
  ```
- [ ] **Step 2: Run it to verify it fails** — `export PATH="$HOME/.nvm/versions/node/v26.13.1/bin:$PATH" && node tests/verify.mjs`. Expected: FAIL (regex match of undefined / block missing).
- [ ] **Step 3: Implement the physics block** in `index.html`: erf via A&S 7.1.26 (t = 1/(1+0.3275911x), 5-term polynomial, sign-symmetric); `diffusivity` exactly per Global Constraints; `concentration(x_m,…)` with `t = timeH * 3600`; `solveCaseDepth` early-return `null` when `concentration(0.003,…) >= 0.40`, else 60 iterations of bisection; `profilePoints` returns 150 pts, x in mm.
- [ ] **Step 4: Run to verify it passes** — same command. Expected: `verify.mjs: all assertions passed`.
- [ ] **Step 5: Checkpoint** — record test output.

### Task 3: Wire sliders + presets to live recompute and stat cards

**Files:**
- Modify: `index.html` (add `// === APP START ===` block after physics, plus event listeners at end)

**Interfaces:**
- Consumes: `diffusivity`, `concentration`, `solveCaseDepth`, `profilePoints` (Task 2); DOM ids (Task 1).
- Produces: `readParams(): {tempC, timeH, cs, c0}`, `updateReadouts(p)`, `updateStats(p)`, `updateChart(p)` (stub calling Task 4's `renderChart`), `updateSliderFill(el)`; global `state` object; `updateAll()` invoked on every `input` event and on load.

- [ ] **Step 1: Add the app block** — `readParams()` parses the four sliders; `updateReadouts` writes `tempVal` (`920 °C`), `timeVal` (`4.0 h`), `surfVal`/`coreVal` (`1.10 wt%` via `toFixed(2)`); `updateStats` writes `dVal` (scientific notation, mantissa `toFixed(2)` + `×10⁻ᴺ` superscript, e.g. `7.55 ×10⁻¹² m²/s`), `lenVal` (`√(Dt)` in mm, `toFixed(2)`), and `depthVal` (`(d*1000).toFixed(2) + ' mm'`, or `'> 3.00 mm'` when `solveCaseDepth` returns null; color/mute styling of the `.stat.hot` card in that case).
- [ ] **Step 2: Slider fill** — on input, set `el.style.setProperty('--fill', pct + '%')` where `pct = (v-min)/(max-min)*100`; call once on load.
- [ ] **Step 3: Presets** — clicking `.preset` sets the four slider values from `data-*` attributes, moves `.active` to it, calls `updateAll()`. Presets: 8620H → 920 °C / 4 h / 1.10 / 0.20; 1020 → 950 °C / 6 h / 0.90 / 0.10; 4320 → 900 °C / 8 h / 1.15 / 0.15.
- [ ] **Step 4: Verify in browser-less smoke check** — `node` one-liner replicating `readParams` math is not possible (DOM); instead: open `index.html`, drag each slider to both extremes and confirm no `NaN`/`undefined` appears in any stat (800 °C/1 h case pinned by Task 2 tests); confirm `depthVal` reads `> 3.00 mm` when Core slider = 0.50.
- [ ] **Step 5: Checkpoint.**

### Task 4: Chart.js profile chart with case-depth marker

**Files:**
- Modify: `index.html` (chart init + `renderChart` inside the app block)

**Interfaces:**
- Consumes: `profilePoints`, `solveCaseDepth`, chart canvas `#profileChart`, legend markup (static HTML from Task 1).
- Produces: `renderChart(p)` — destroys/recreates or updates a Chart.js `line` chart; y-axis 0–max(1.3, Cs) wt%, x-axis 0–3 mm with title `Depth x (mm)`; dataset `C(x,t)` amber (#f5a524) 3.5 px tension 0.35 fill vertical gradient amber→transparent; plugin `caseDepthLine` draws dashed #f87171 line at y=0.40 across the plot + intersection dot at (caseDepth, 0.40) when not null (skip marker, line still drawn, when null).

- [ ] **Step 1: Implement chart init** — `new Chart(ctx, {type:'line', data:{datasets:[{label:'C(x,t)', data: pts, borderColor, fill:true, backgroundColor: gradient}]}, options:{parsing:false, responsive:true, maintainAspectRatio:false, scales:{x:{type:'linear',min:0,max:3,title:{display:true,text:'Depth x (mm)'}},y:{min:0, suggestedMax:1.3, title:{display:true,text:'C (wt%)'}}}, plugins:{legend:{display:false}, tooltip:{callbacks: label shows `C = x.xx wt% @ x.xx mm`}}}, plugins:[caseDepthLine]})`.
- [ ] **Step 2: Implement `caseDepthLine` plugin** — `afterDatasetsDraw(chart)`: `y = chart.scales.y.getPixelForValue(0.4)`; dashed line x from left to right; if case depth d ≠ null, x px at `scales.x.getPixelForValue(d*1000)`; draw filled circle + small label `${(d*1000).toFixed(2)} mm` next to it.
- [ ] **Step 3: Hook into `updateAll()`** — `updateAll` calls `renderChart(p)`; on subsequent calls, update `chart.data.datasets[0].data` and `chart.update('none')` (no flicker/animation on slider drag); recompute marker from a fresh `solveCaseDepth`.
- [ ] **Step 4: Verify** — browser: drag Temperature 800→1050 °C and confirm the curve and marker shift smoothly with no console errors (F12); confirm dashed line sits exactly at the 0.40 gridline; confirm marker vanishes and depth card reads `> 3.00 mm` at Core = 0.50.
- [ ] **Step 5: Checkpoint.**

### Task 5: Polish, equations, final verification

**Files:**
- Modify: `index.html`

- [ ] **Step 1: KaTeX equations** — render into `#eq1` and `#eq2` on load:
  `katex.render(String.raw`D(T) = 2.3 \times 10^{-5} \exp\!\left(-\frac{148\,000}{8.314 \, (T + 273.15)}\right) \;\; [\mathrm{m^2\,s^{-1}}]`, …)` and
  `katex.render(String.raw`C(x,t) = C_s - (C_s - C_0)\,\operatorname{erf}\!\left(\frac{x}{2 \sqrt{D \, t}}\right)`, …)` both `{displayMode: true, throwOnError: false}`. Confirm both equations appear correctly formatted in the browser.
- [ ] **Step 2: Assumptions/copy pass** — assumptions card text: "Semi-infinite solid; constant surface carbon (infinite source); constant D over the treatment range; no phase-change or moving-boundary effects; planar 1-D geometry. Effective case depth is the depth at which C = 0.40 wt%, solved by bisection." Footer: "Transport Demo · Diffusion in Solids" left; "erf: Abramowitz–Stegun 7.1.26 · Chart.js + Tailwind CDN · KaTeX" right.
- [ ] **Step 3: Offline resilience check** — temporarily block CDN requests (DevTools → Network → block, or open with Wi-Fi off) and confirm: sliders still update readouts/stats (they must not depend on CDNs), only chart and equations degrade — no JS errors halt `updateAll()`. Wrap Chart.js init and KaTeX render in `try/catch` so one failing library cannot kill the other.
- [ ] **Step 4: Full verification run** — `node tests/verify.mjs` → all assertions pass; `grep -n 'LOGO_PLACEHOLDER' index.html` → no match; confirm single file (root contains `index.html`, `Shrinking Core Particle Icon.png`, `tests/verify.mjs`, docs); open `index.html` fresh and walk the checklist: 4 sliders live-update, 3 presets work, stats correct at defaults (D ≈ 7.5×10⁻¹² m²/s order of magnitude; depth < 3 mm), dashed line + marker visible, equations rendered, logo + favicon show.
- [ ] **Step 5: Checkpoint** — final file listing; note `.superpowers/` should be gitignored if the folder ever becomes a repo (mention in Task 5 done message).
