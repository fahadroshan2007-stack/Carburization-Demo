# Carburization Depth Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise the carburization demo to the competition's depth, additively — consequences cards, growth/hardness charts, live verification table, validity window, sources, D(T,C) overlay — without changing our identity or stack.

**Architecture:** One `index.html` (~232 KB). New pure physics goes inside the existing `// === PHYSICS START ===` block (test-visible via `tests/verify.mjs` regex eval). New markup sections get new CSS in the existing `<style>` block and new JS renderers inside the existing `// === APP START ===` block, wired into `updateAll()`. Verification is string-injected into `#vtable tbody`; charts are Chart.js (v4) inside existing `typeof Chart !== 'undefined'` guards.

**Tech Stack:** vanilla JS (ES2015-style, like the existing inline script), Chart.js v4 CDN, KaTeX 0.16.11 CDN, Tailwind Play CDN, node test harness (node ≥ 18, path via AGENTS.md).

**Spec:** `docs/superpowers/specs/2026-11-19-carburization-depth-expansion-design.md` (read it first — this plan argues from it)

## Global Constraints

- Single self-contained `index.html`; base64 logo untouched.
- Marked test API: `// === PHYSICS START ===` … `// === PHYSICS END ===` stays pure (no DOM, no CDN); `// === APP START ===` … `// === APP END ===` keeps `updateAll()` and `state`; marker names/signatures of existing fns (`erf`, `diffusivity`, `concentration`, `solveCaseDepth`, `profilePoints`) unchanged.
- Physics and the verification table must compute with no CDN available (Chart.js, KaTeX optional, inside guards).
- x in meters internally, mm for display; erf stays Maclaurin; `solveCaseDepth` still returns `null` when C(3 mm) ≥ 0.40.
- No new CDN dependencies; no new files except `docs/superpowers/plans/2026-11-19-carburization-depth-expansion.md` (this plan).
- Both test suites green before any commit that touches physics or APP: `export PATH="$HOME/.nvm/versions/node/v26.13.1/bin:$PATH" && node tests/verify.mjs && node tests/app-smoke.mjs`.
- Claims about sources/links stay verbatim from the spec's Sources list.
- Null case (C(3 mm) ≥ 0.40 at slider extremes) must degrade gracefully everywhere: stats card `> 3.00 mm` (existing), Card 1 `> 3.00` + crit pill, verdict warns, growth curve truncates, hardness crossing marker omitted, verification row 3 shows "n/a"/pass.
- Colors: `--bg #0b0f17`, `--panel #131926`, `--panel-2 #1a2233`, `--line #263049`, `--amber #f5a524`, `--orange #ea580c`, `--muted #8b96b0`, `--text #e7ebf4`. Fonts: `--font-mono` (JetBrains Mono) for values/labels, body Inter, display Space Grotesk.
- Do not touch `Zircaloy in Steam.html`, the screenshot, `.superpowers/`, the base64 logo, or preset defaults (8620H must stay `.active` at load; no slider default moves).

## Review Focus

1. **Chart.js blocked at `file://` offline** — every new chart renderer must sit inside the existing `typeof Chart !== 'undefined'` pattern; all cards/tables/validity/sources are DOM/string work and must render regardless. → Task 4 (new smoke Case 6).
2. **Slider extremes make depth null (core 0.50 wt%) before a live audience** — every new renderer must show the bounded messages, never NaN. → Task 4 (extended Case 2 with new ids).
3. **Time slider at 24 h / 1050 °C** — `fdProfile` and `timeToCaseDepth` must stay cheap and finite; `timeToCaseDepth` treats `solveCaseDepth === null` as "already deeper than 3 mm" (i.e., satisfies any target ≤ 3 mm). → Task 1 (fdProfile finiteness assert), Task 1 (timeToCaseDepth round-trip assert).
4. **Profile stays correct under the D(T,C) overlay across the whole carbon range (0…1.3 wt%)** — `fdProfile(carbonDep=true)` must not blow up (explicit Euler-style instability); backward Euler is stable by construction; assert finite + non-increasing-ish behavior in Task 1's verify asserts (finiteness only; monotonicity not guaranteed for D(C) — do not assert it).
5. **Verification table must be genuinely live, not decorative** — every row except row 4 (labeled fixed case) must change with sliders; smoke Case 7 asserts `vtable` innerHTML contains "920" and values derived from defaults (see Task 4).

---

### Task 1: Pure physics + verification harness (PHYSICS block & tests/verify.mjs)

**Files:**
- Modify: `index.html` lines 193–241 (`// === PHYSICS START ===` … `// === PHYSICS END ===`)
- Modify: `tests/verify.mjs`

**Interfaces:**
- Consumes: existing `erf`, `diffusivity`, `concentration`, `solveCaseDepth`, `profilePoints`.
- Produces (all pure, no DOM): `erfcQuadrature(x)`, `uptakeWithin(cs, c0, D, t, L)`, `carbonUptake(cs, c0, D, t)`, `carbonUptakeMgCm2(cs, c0, D, t)`, `martensiteHV(cWt)`, `danteD(tempC, cWt)`, `fdProfile(cs, c0, tempC, timeH, xMax, n, carbonDep)` → `{x:number[] (m), c:number[] (wt%)}`, `timeToCaseDepth(tempC, cs, c0, target_m)` → seconds `number|null`.
  - `uptakeWithin(cs, c0, D, t, L)` — truncated closed form `(cs−c0)·(L − 2√Dt·(a·erf a + e^{−a²}/√π − 1/√π))` with `a = L/(2√Dt)`; units wt%·m.
  - `carbonUptake` — `2·(cs−c0)·sqrt(D·t/Math.PI)` (wt%·m, semi-infinite).
  - `carbonUptakeMgCm2` — `carbonUptake × 7850` (mg/cm²; × 78.5 → kg/m², × 100 → mg/cm²).
  - `martensiteHV(cWt)` — `(1.75 + 8.2*cWt) * 101.97` (Idohara HV* GPa → HV; uncapped).
  - `danteD(tempC, cWt)` — `0.47*exp(-1.6*cWt)*exp(-(37000-6600*cWt)/(1.986*(tempC+273.15))) * 1e-4` (cm²/s → m²/s).
  - `fdProfile` — uniform grid `n` cells on `[0, xMax_m]` (interface points), backward-Euler in time, Dirichlet left (`c=cs`), zero-flux right via ghost mirror at the last node; `steps = 200`; `dt = t/steps`; `D` per node = `diffusivity(tempC)` (constant) or `danteD(tempC, c_node)` evaluated on the **previous** step's `c`; initialization `c = c0` everywhere. Returns arrays in meters and wt%.
  - `timeToCaseDepth(tempC, cs, c0, target_m)` — bisection on `t` in seconds over `(1e-3, 200*3600]`, treat `solveCaseDepth(tempC, t/3600, cs, c0) === null` as `+∞` (deeper than 3 mm); return seconds or `null` if depth at 200 h < target.

- [ ] **Step 1: Write failing assertions** in `tests/verify.mjs` after the existing block (keep everything above unchanged), including:

```js
const { erf, diffusivity, concentration, solveCaseDepth, profilePoints,
        erfcQuadrature, uptakeWithin, carbonUptake, carbonUptakeMgCm2,
        martensiteHV, danteD, fdProfile, timeToCaseDepth } =
  new Function(`${match[1]}; return { erf, diffusivity, concentration, solveCaseDepth, profilePoints,
    erfcQuadrature, uptakeWithin, carbonUptake, carbonUptakeMgCm2, martensiteHV, danteD, fdProfile, timeToCaseDepth };`)();

// erfcQuadrature: independent algorithm, must agree with erf
for (const x of [0, 0.5, 1, 1.5, 2]) assert.ok(Math.abs(erf(x) - (1 - erfcQuadrature(x))) < 1e-12, `erfcQuadrature(${x})`);

// uptake: integral of our profile on [0, 3 mm] must match the truncated closed form
{
  const D = diffusivity(920), t = 4 * 3600, L = 0.003;
  let trap = 0; const n = 500;
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * L, wgt = (i === 0 || i === n) ? 0.5 : 1;
    trap += wgt * ((1.1 - concentration(x, 920, 4, 1.1, 0.2)));
  }
  trap *= L / n;
  const closed = uptakeWithin(1.1, 0.2, D, t, L);
  assert.ok(Math.abs(trap / closed - 1) < 0.005, `mass balance off: trap=${trap} closed=${closed}`);
  assert.ok(carbonUptake(1.1, 0.2, D, t) > closed, 'truncated form must be < semi-infinite');
  assert.ok(Math.abs(carbonUptakeMgCm2(1.1, 0.2, D, t) / (carbonUptake(1.1, 0.2, D, t) * 7850) - 1) < 1e-12, 'conversion factor');
}

// Idohara true hardness at 0.4 %C ≈ 50 HRC
assert.ok(Math.abs(martensiteHV(0.4) - 513) < 15, `HV(0.4): ${martensiteHV(0.4)}`);
assert.ok(martensiteHV(1.1) > martensiteHV(0.2), 'HV must rise with C');

// DANTE D rises with carbon
assert.ok(danteD(950, 1.0) > danteD(950, 0.2), 'D(T,C) must rise with C');

// fixed check case FD vs erf (920 °C, 1 h) — same as verification row 4
{
  const { c } = fdProfile(1.1, 0.2, 920, 1, 0.002, 240, false);
  let maxErr = 0;
  for (let i = 0; i < c.length; i++) {
    const x = (i / (c.length - 1)) * 0.002;
    maxErr = Math.max(maxErr, Math.abs(c[i] - concentration(x, 920, 1, 1.1, 0.2)));
  }
  assert.ok(maxErr < 0.01, `FD vs erf max err: ${maxErr}`);
  const dcd = fdProfile(1.1, 0.2, 920, 4, 0.003, 240, true);
  assert.ok(dcd.c.every(Number.isFinite), 'carbon-dependent FD must stay finite');
}

// timeToCaseDepth round-trip: depth at returned t must be ≈ target
{
  const tS = timeToCaseDepth(920, 1.1, 0.2, 0.001);
  assert.ok(tS !== null && tS > 60 && tS < 200 * 3600, `timeToCaseDepth: ${tS}`);
  const d = solveCaseDepth(920, tS / 3600, 1.1, 0.2);
  assert.ok(d === null || Math.abs(d - 0.001) / 0.001 < 0.02, `round-trip: ${d}`);
}
```

- [ ] **Step 2: Run and confirm new asserts fail** — run `node tests/verify.mjs`; expected: fail with `ReferenceError`/`SyntaxError: erfcQuadrature is not defined` (functions missing). Existing asserts should still pass (they are before the new block).
- [ ] **Step 3: Implement the eight functions** inside the PHYSICS block, after `profilePoints`. Signatures exactly as the Interfaces block. `erfcQuadrature` = standard modified-Lentz continued fraction on `1/(x + (1/2)/(x + 1/(x + (3/2)/…)))`, `erfc(x) = e^{−x²} / √π · (1/f)`. `fdProfile` = backward Euler tridiagonal (Thomas), Dirichlet left, ghost-mirror zero-flux right.
- [ ] **Step 4: Run `node tests/verify.mjs`** — expected: `verify.mjs: all assertions passed`.
- [ ] **Step 5: Commit**

```bash
git add index.html tests/verify.mjs
git commit -m "feat: pure physics for depth expansion (FD, D(T,C), HV, uptake) + verification harness"
```

---

### Task 2: Markup + CSS — nav, consequences, growth/hardness row, verification, validity, sources, eq3/eq4

**Files:**
- Modify: `index.html` `<head><style>` block; `<header>`; `<main>` tail; `.notes`; after `.notes`; `<footer>`; add KaTeX divs + new KaTeX block before `</body>`.

**Interfaces:**
- Consumes: nothing (static markup).
- Produces (DOM ids every later task and `tests/app-smoke.mjs` will use):
  - Header nav: `<nav class="topnav" aria-label="Sections">` with links `#profile #growth #consequences #verification #sources`; add `id="profile"` to the existing `.chart-panel`.
  - Consequences: `<section class="band" id="consequences">` containing `<h2 class="band-h">Consequences at the current settings</h2>`, `<div class="verdict" id="verdict"></div>`, `<div class="cq-cards" id="cqCards"></div>` (cards injected in Task 3; container here).
  - Charts row: `<section class="band charts2" id="growth">` (full width, `display:grid; grid-template-columns: 1fr 1fr; gap:22px;` collapsing to 1 col ≤ 980 px) with two `.chart-panel` children: left `h2 Case Growth`, toggle buttons `#growthT`, `#growthRt` (pill-style), `<div class="canvas-wrap-sm"><canvas id="growthChart"></canvas></div>`, `<div class="chart-note" id="growthNote"></div>`; right `h2 As-Quenched Hardness Traverse`, `<canvas id="hardnessChart"></canvas>`, `<div class="chart-note" id="hardnessNote"></div>`. Canvas heights: 300 px.
  - Verification: `<section class="band" id="verification">` with `h2 Verification, recomputed live`, one `p.lede` ("Every check reruns whenever you move a slider, except the labeled fixed case."), `<div class="tbl-wrap"><table class="vtable" id="vtable"><thead><tr><th>Check</th><th>What it compares</th><th>Result</th><th>Status</th></tr></thead><tbody></tbody></table></div>`.
  - Validity: `<section class="band" id="validity">` with `h2 Validity window`, `<div class="validity"><div class="wbar" id="wbarV">…</div><div class="wmark" id="validityMark"></div></div>`, `<p class="blab-v"` caption, plus `.notes`-style split card `<div class="note-card left-out">` with the 9 "Left out on purpose" bullets from the spec. Static bar segments (800–1100 °C): `<div class="wseg sluggish" style="left:0%;width:15%">sluggish</div>` `<div class="wseg practice" style="left:15%;width:55%">carburizing practice</div>` `<div class="wseg grain" style="left:70%;width:13.33%">grain coarsening</div>` `<div class="wseg beyond" style="left:83.33%;width:16.67%">above validity</div>` (845→15%, 1010→70%, 1050→83.3% of the 300 °C span); CSS absolute-positioned labels inside a relative `.wbar` height 44 px with mono 10.5 px text; `#validityMark` = a `|` tick positioned by Task 3 (`left: calc((T−800)/300*100%)`).
  - Sources: `<section class="band" id="sources">` with `h2 Sources`, `<ol class="refs">` containing exactly the 7 sources from the spec verbatim, each a link `target="_blank" rel="noopener"`.
  - Footer: append ` · Physics & verification checked live · sources below` to the left `<span>`.
  - KaTeX: add `<div class="eq" id="eq3"></div><div class="eq" id="eq4"></div>` to the Governing Equations card; new KaTeX `<script>` block after the existing one, own `try/catch`:
    - eq3: `String.raw`D(T,C) = 0.47 e^{-1.6 C} exp\!\left(-\frac{37000 - 6600 C}{1.986 (T + 273.15)}\right) [cm^2\,s^{-1}]``
    - eq4: `String.raw`HV^{*} [GPa] = 1.75 + 8.2\,(wt\%C) \approx HV``
- [ ] **Step 1: Write the markup** (insertion order: header nav → consequences after `</main>` → growth row → `.notes` (extended eq3/eq4) → verification → validity → sources → footer line). Section spacing via existing `.notes`-style margin utilities; add CSS:
  - `.topnav` (flex, mono 11.5px, gap 18px, `a` colors `--muted` → hover `--amber`)
  - `.band` (`margin-top:22px`, `.band-h` same style as `.note-card h3`)
  - `.verdict` + `.verdict.ok|.warn|.crit` (left-accent cards, colors `--amber`/#f87171/#34d399 on ok)
  - `.cq-cards` grid (`repeat(6, 1fr)` → 3 → 2 → 1, responsive like `.stats`), `.card .pill` (`.ok`/`.warn`/`.crit`/`.info` outlined pills), `.card .meter` with `i` fill + `b` marker
  - `.charts2` + `.canvas-wrap-sm{height:300px}` + `.chart-note` (12px muted mono) + toggle `.mt-toggle` (segmented like `.presets`)
  - `.tbl-wrap` (overflow-x auto card) + `.vtable` (full width, mono right-aligned Result, pill statuses `.pill`)
  - `.validity` (positioning context, `.wbar`/`.wseg`/labels, `.wmark` tick) + `.left-out` list styling + `.refs` (grid, 13px, links amber-ish)
- [ ] **Step 2: Run both suites** — `node tests/verify.mjs && node tests/app-smoke.mjs`; expected: both pass unchanged (markup changes cannot break regexes; smoke `querySelectorAll` already stubbed to `[]`).
- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: markup and styles for depth expansion sections (consequences, growth, hardness, verification, validity, sources)"
```

---

### Task 3: APP renderers + wiring (consequences, growth, hardness, verification, validity, overlay toggle)

**Files:**
- Modify: `index.html` `// === APP START ===` block (extend `const state = { chart: null }` to `const state = { chart: null, growthChart: null, hardnessChart: null, growthAxis: 't', showCD: true };`; insert renderers after `updateReadouts`/before `updateStats`; wire inside `updateAll()`), plus the profile-chart creation (`renderChart`) to add the D(T,C) dashed dataset and a checkbox in `.chart-head` (`<label class="overlay-toggle"><input type="checkbox" id="showCD" checked> D(T,C)</label>`).

**Interfaces:**
- Consumes (Task 1): `fdProfile`, `uptakeWithin`, `carbonUptakeMgCm2`, `martensiteHV`, `danteD`, `timeToCaseDepth`, plus existing `erf`, `diffusivity`, `concentration`, `solveCaseDepth`.
- Produces (in APP block): `renderConsequences(p)`, `renderGrowth(p)`, `renderHardness(p)`, `renderVerification(p)`, `renderValidity(p)`; `p` is the object from `readParams()` (`{tempC, timeH, cs, c0}`). Row helper: `vRow(name, compare, result, pillClass, pillText)` returns `<tr>`.

- [ ] **Step 1: Write the five renderers + overlay dataset.** Exact behavior per spec:

  - `renderConsequences(p)`:
    - `D = diffusivity(p.tempC)`, `t = p.timeH*3600`, `d = solveCaseDepth(...)`.
    - Card 1 `#cardDepth`: `d === null` → big `&gt; 3.00 mm`, pill `crit` "DEEPER THAN WINDOW"; meter fill 100 %, marker hidden. Else pill `ok` (0.8–1.2), `warn` (0.5–0.8 or 1.2–1.5), `crit` (< 0.5); meter = min(depth/1.5, 1) fill, marker at 1/1.5 = 66.7 %.
    - Card 2 `#cardSurfaceC`: value `p.cs.toFixed(2) wt%`; pill crit ≥ 0.9 ("CARBIDE NETWORK"), warn ≥ 0.7 ("RETAINED AUSTENITE"), else ok.
    - Card 3 `#cardHV`: `martensiteHV(p.cs)` big (HV), subline `Core ${martensiteHV(p.c0).toFixed(0)} HV`.
    - Card 4 `#cardRA`: pill ok < 0.5 / warn 0.5–0.7 / info ≥ 0.7 with text "RA expected; temper or refrigerate".
    - Card 5 `#cardUptake`: `carbonUptakeMgCm2(...).toFixed(2)` mg/cm²; subline "semi-infinite closed form".
    - Card 6 `#cardTime1mm`: `timeToCaseDepth(p.tempC, p.cs, p.c0, 0.001)` → `h mm min` via `fmtH(s)` (`X.X h` or `> 200 h`), subline "at this T, Cs vs C₀".
    - Verdict `#verdict` (exactly one, crit > warn > ok): `p.cs >= 0.9` → crit "Over-carburized — carbide network risk at the surface"; `d === null` → warn "Case deeper than the 3 mm window — over-carburization/grain-coarsening territory at long times"; `d !== null && d*1000 < 0.8` → warn "Shallow case — below the typical 0.8–1.2 mm 8620H window"; else if `p.cs >= 0.7` → warn "High surface carbon — retained austenite expected"; else ok "Within carburizing practice — 50 HRC case, ductile core".
    - Cards markup: each `<div class="card cq"><span class="pill X">LABEL</span><h3>title</h3><div class="big">value</div><meter/>?<p class="small muted">body</p></div>` — innerHTML strings, no whitespace user input anywhere.
  - `renderGrowth(p)`: fixed domain 0→24 h. Resolve `depthAt(tH)` via `solveCaseDepth(p.tempC, tH, p.cs, p.c0)` — `null` means "deeper than 3 mm". Build arrays of 50 points `t = i/49*24`; stop at first index whose `solveCaseDepth` is null (record `t*` in `#growthNote`: "Depth exceeds the 3 mm window beyond ~${t*.toFixed(1)} h"). Current point `(p.timeH, d*1000)` amber dot (omit when d null or p.timeH > t*). Chart.js `type:'line'`, dataset amber solid; dashed gray "√t parity" dataset = `y = yFinal * sqrt(t/24)` only up to truncation; toggle buttons swap x values between `t` and `Math.sqrt(t)` (`state.growthChart` mutation like `state.chart`, never recreate). Axis labels: x → `Time (h)` or `√Time (√h)`; y → `Effective case depth (mm)`.
  - `renderHardness(p)`: profile via 200 pts; `hv(x_mm) = martensiteHV(concentration(x_m, …))`; dataset amber; dashed gray constant 510 line labeled `510 HV (≈ 50 HRC)`; crossing marker dataset (one point at `(d*1000, 510)`) with label, omitted when d null; `#hardnessNote` text: `Surface ${hv(0).toFixed(0)} HV · core ${hv(3).toFixed(0)} HV` + retained-austenite caveat when cs ≥ 0.7.
  - `renderVerification(p)` rows exactly per spec:
    1. `erfc vs 1−erf` — result `toPrecision(3)` of max err; pass if < 1e-13.
    2. `Mass balance` — trapezoid (500 pt) vs `uptakeWithin(p.cs, p.c0, D, t, 0.003)`; rel err; pass < 0.5 %.
    3. `Bisection residual` — `d===null` → `n/a` (pass); else `|C(d)−0.40|` pass < 1e-9.
    4. `FD vs erf (fixed 920 °C · 1 h)` — recomputed per run; pass < 0.01 wt%; label "fixed check case".
    5. `D window` — `1e-13 < D < 1e-9`.
    6. `DANTE D(T,C) refinement` — FD carbonDep on 0–3 mm, effective depth by linear interpolation at 0.40; `Δ = (dDante−dErf)/dErf*100` (when dErf null → "> 3 mm"/info); pill `info`, label "DANTE-style refinement".
    - Status pills: `.pill.ok` "PASS", `.pill.crit` "FAIL", `.pill.info` "INFO". On any FAIL, add class `failed` to `#vtable` for outline styling.
  - `renderValidity(p)`: position `#validityMark` at `calc(${((p.tempC-800)/300)*100}% )`; also update the marker label `#validityMarkT` to `${p.tempC} °C`.
  - Overlay toggle `#showCD`: on change, toggle visibility of the second dataset in the profile chart (`state.chart.data.datasets[1].hidden = !checked`; `state.chart.update('none')`).
  - Wire all five renderers into `updateAll()` after `updateChart(p)`:

```js
  renderConsequences(p); renderGrowth(p); renderHardness(p); renderVerification(p); renderValidity(p);
```

  (Each wrapped in its own `try/catch` + `console.warn` so one failure can't blank the rest — same philosophy as `updateChart`.)

- [ ] **Event wiring** (in the wiring section at the bottom of the APP block, next to the preset listeners):

```js
// growth axis toggle
for (const [id, axis] of [['growthT', 't'], ['growthRt', 'rt']]) {
  $(id).addEventListener('click', () => {
    state.growthAxis = axis;
    $('growthT').setAttribute('aria-pressed', axis === 't');
    $('growthRt').setAttribute('aria-pressed', axis === 'rt');
    updateAll();
  });
}
// D(T,C) overlay toggle (profile chart dataset index 1)
$('showCD').addEventListener('change', (e) => {
  state.showCD = !!e.target.checked;
  if (state.chart) {
    state.chart.data.datasets[1].hidden = !state.showCD;
    state.chart.update('none');
  }
});
```

  (If Chart is absent, `state.chart` stays null and both wirings are no-ops — no errors.)
- [ ] **Step 2: Run smoke suite** — `node tests/app-smoke.mjs`; expected: pass (existing stubs suffice for Task 2 markup; new ids unused until Task 4; no assertion on them yet).
- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: wire consequences, growth, hardness, verification, validity renderers into updateAll"
```

---

### Task 4: Extend tests/app-smoke.mjs — stubs, offline case, null-case, live-table case

**Files:**
- Modify: `tests/app-smoke.mjs`

**Interfaces:**
- Consumes: APP block ids from Task 2 (`verdict`, `cqCards`, `growthChart`, `hardnessChart`, `growthT`, `growthRt`, `vtable`, `validityMark`, `showCD`).
- Produces: three new cases; all prior cases unchanged.

- [ ] **Step 1: Extend `buildDom()`** — add stubs: `verdict`, `cqCards`, `cardDepth`, `cardSurfaceC`, `cardHV`, `cardRA`, `cardUptake`, `cardTime1mm`, `growthChart`, `hardnessChart`, `growthNote`, `hardnessNote` (all plain `makeEl`), canvases with `getContext(() => ({ createLinearGradient: () => ({ addColorStop() {} }) }))`, plus `growthT`, `growthRt`, `showCD` (checkbox-like `{ checked: true }`). Extend `querySelectorAll` to return `[]` as today.
- [ ] **Step 2: Add Case 6 (offline / no Chart)** — build dom, ensure `global.Chart` is undefined, call `updateAll()`, assert: no throw; `els.verdict.innerHTML` non-empty and matches /Within carburizing practice|Shallow|Over-carburized|deeper than/; `els.vtable` tbody innerHTML contains "FD vs erf" and a PASS pill; `els.cqCards.innerHTML` contains "mg/cm²" and no /NaN/.
- [ ] **Step 3: Add Case 7 (null depth everywhere)** — set `coreSlider.value = '0.5'`, defaults elsewhere 920/4/1.10; `updateAll()`; assert: `verdict` matches /deeper than the 3 mm window/, `cardDepth.innerHTML` matches /> 3.00/, `cardTime1mm.innerHTML` matches /h|>/, `vtable` tbody contains "n/a" in the bisection row, growth note `growthNote.textContent` matches /beyond/ or `growthChart` path handled gracefully (no throw).
- [ ] **Step 4: Add Case 8 (verification is live)** — defaults 920/4/1.10/0.20; assert `els.vtable.innerHTML` contains "920" (check case label), "PASS" appears ≥ 4 times, and `cardUptake.innerHTML` matches /\d+\.\d{2}/.
- [ ] **Step 5: Run both suites** — expected: `app-smoke.mjs: all assertions passed` (and verify.mjs green).
- [ ] **Step 6: Commit**

```bash
git add tests/app-smoke.mjs
git commit -m "test: smoke offline, null-depth, and live-verification coverage"
```

---

### Task 5: Manual verification sweep + AGENTS.md touch-up

**Files:**
- Modify: `AGENTS.md` (one line: the physics markers now additionally export `erfcQuadrature, uptakeWithin, carbonUptake(MgCm2), martensiteHV, danteD, fdProfile, timeToCaseDepth`; note the new sections ids; note verification row 4 is a labeled fixed case 920 °C/1 h)
- Manual: `file://` browser session

- [ ] **Step 1: Browser check at `file://…/index.html`** — checklist: dark theme intact; header nav anchors scroll; profile chart renders + overlay checkbox toggles dashed curve; slider drag keeps all renderers updating without flicker; Consequences verdict banner changes color classes when dragging cs to 1.30 (crit) and to 0.8 spec shallow case (warn); Growth toggle switches t/√t labels; Hardness chart shows 510 HV dashed line and crossing dot; Verification table all rows PASS at defaults; drag T to 1050 °C + time 24 h (row 4 still PASS — fixed case); drag core to 0.50 (verdict + cards bounded); Validity marker moves with T; Sources links open (HTTP 200 on one sample); KaTeX eq3/eq4 render.
- [ ] **Step 2: CDN-blocked check** — DevTools network block jsdelivr/tailwind, reload; stats + cards + verification table + validity + sources all still render (charts may be absent — must not blank sections).
- [ ] **Step 3: Update AGENTS.md** markers line; keep every other line intact.
- [ ] **Step 4: Final full run** — `export PATH="$HOME/.nvm/versions/node/v26.13.1/bin:$PATH" && node tests/verify.mjs && node tests/app-smoke.mjs`; expected: both print their passed lines.
- [ ] **Step 5: Commit**

```bash
git add AGENTS.md
git commit -m "docs: note new pure physics exports and sections in AGENTS.md"
```
