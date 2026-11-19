# Carburization Simulator — Depth Expansion (design)

**Date:** 2026-11-19
**Status:** Approach B approved by partner (2026-11-19); builder check incorporated; awaiting design approval
**Author:** Fahad + OpenCode (research: Lee/Matlock/Van Tyne, Idohara, Krauss, DANTE)

## Intent and why

The Transport Phenomena final-project demo (`index.html`) lost the "extent" arms race when the
competing team's demo surfaced (`Zircaloy in Steam.html` — a long-form instrument with an accident
transient, live verification table, validity window and linked sources). The benchmark for "good"
has just moved one class up. This project raises our demo to the same depth, **additively**:
keep our identity, stack, color scheme and single-file portability; add the layers the competition
set that we were missing. Same course deliverable, higher bar.

## Goals

1. **Consequences at the current settings** — six consequence cards + a verdict banner, every card
   recomputed live from the sliders (case depth vs 8620H spec window, surface carbon risk,
   as-quenched surface/core hardness, retained-austenite risk, carbon uptake, time to 1.0 mm).
2. **Two new charts** — "Case Growth" (effective case depth vs t, t / √t x-axis toggle,
   current point marked) and "As-quenched Hardness Traverse" (untempered martensite HV vs depth,
   510 HV ≈ 50 HRC line, case-depth crossing marked when within the 3 mm window).
3. **Verification, recomputed live** — a pass/fail table (erf independent check, mass balance vs
   truncated closed form, bisection residual, finite-difference vs erf at a fixed check case,
   D window, D(T,C) refinement info row).
4. **Validity window** — horizontal 800–1100 °C bar with practice window, grain-coarsening and
   sub-A3/above-validity segments, marker at current temperature, plus a "left out on purpose" list.
5. **Sources** — 7 linked, real references (see below), not invented citations.
6. **Multi-model overlay on the profile chart** — dashed "D(T,C) carbon-dependent (DANTE-style)"
   curve via the finite-difference model alongside the erf constant-D curve.
7. **Tests extended** — new pure physics covered in `tests/verify.mjs`; new DOM ids stubbed in
   `tests/app-smoke.mjs`. Both suites stay green.

## Non-goals / anti-goals

- Not a re-skin or rewrite (no new theme, no new framework, no new CDN dependencies).
- No fake thermal-runaway/"accident" mode. Carburization has no self-accelerating feedback;
  a manufactured one would be theater, not engineering.
- No boost/diffuse cycle scheduler, no decarburization fault mode (explicitly deselected by partner).
- No copy or paraphrase of the competition's code/text/solver. Only its *format* is being matched.
- No new runtime file dependencies; single `index.html` stays the deliverable.
- No HRC conversion arithmetic beyond the documented 510 HV ≈ 50 HRC equivalence
  (Idohara gives HV* in GPa; we render HV only, avoiding ASTM E140 chart conversions).

## Constraints

- Single self-contained `index.html`; base64 logo untouched (~227 KB floor stays).
- Marked test API stays: `// === PHYSICS START === … END ===` stays pure (no DOM);
  `// === APP START === … END ===` keeps `updateAll()`, `state`, marker names.
  New pure physics goes **inside** the PHYSICS block; new UI inside APP.
- Physics and the verification table must compute without any CDN (offline-safe).
  Chart.js/KaTeX remain optional enhancements inside existing guards.
- x stays in meters internally; mm for display. erf is Maclaurin (unchanged).
- `solveCaseDepth` still returns `null` when C(3 mm) ≥ 0.40.
- Current verified state: both node suites green; don't regress.

## Approach: B (approved by partner, 2026-11-19)

One clean pass through `index.html`: new sections in markup + styles matching current
(dark navy `#0b0f17`, amber `#f5a524`, Inter/Space Grotesk/JetBrains Mono), one inline script,
new renderers, new `PHYSICS` pure functions, tests extended together. Option A (bolt-on second
script) was rejected: splits plumbing and puts verification outside the test-visible block.

## Research findings that shape the physics

1. **Case depth = 50 HRC (≈ 510 HV) line** — Krauss, *Microstructures and Properties of
   Carburized Steels* (Surface Hardening of Steels, ASM). Our existing 0.40 wt% C threshold is the
   same convention (0.40 %C ↔ ≈ 510 HV ↔ ≈ 50 HRC). The hardness chart visualizes this directly.
2. **Hardness vs carbon (untempered martensite, "true" hardness)** — Idohara et al.,
   *Estimation of True Hardness and Quantitative Evaluation of Auto-Tempering in As-Quenched
   Martensitic Steels*, ISIJ Int. 64(10):1599–1606 (2024), open access:
   `HV*[GPa] = 1.75 + 8.2 × mass %C`. At 0.40 %C → 5.03 GPa ≈ 513 HV ≈ 50 HRC; cross-checks against
   the Pyrowear53 impulse-carburizing study's LNnl fit H[HV0.5] = 468·%C + 296 (→ 483 HV at 0.40;
   used as an unlisted sanity cross-check only, not cited in the UI). Good to ≈ 0.6 %C; above
   ≈ 0.7–0.8 %C retained austenite caps measured hardness — rendered with a flag, uncapped.
3. **Carbon-dependent diffusivity (DANTE-style)** — Thermal Processing Magazine (Sims, Feb 2020),
   Eq. 2: `D(T,C) = 0.47 · e^(−1.6·C) · e^(−(37000 − 6600·C)/R/T)` — R = 1.986 cal/mol·K,
   D in cm²/s, C in wt%. At 920 °C: C = 0.2 → ≈ 9.9×10⁻¹² m²/s (our constant-D Arrhenius gives
   ≈ 7.5×10⁻¹²); C = 1.1 → ≈ 2.9×10⁻¹¹. Confirms D rises with C (Bhadeshia, Met. Sci. 15 (1981)
   477; Lee/Matlock/Van Tyne ISIJ Int. 51(11):1903–1911 (2011), open access). Shown as the dashed
   overlay and as an informational verification row — labeled "refinement", not truth.
4. **Validity window** — gas-carburizing practice ≈ 845–1010 °C; below ≈ 845 sluggish sub-A3
   kinetics; above ≈ 1010–1050 austenite grain coarsening degrades toughness (8620H is carburized
   ~920–950 °C; slider already spans 800–1050).
5. **Retained austenite / carbides** — RA grows steeply > ≈ 0.6–0.7 wt% C (Krauss, MSE A273–275
   (1999) 40); ≥ 0.9 wt% C → carbide networks / over-carburization risk (rejected in fatigue).
   Card 4 flags these bands.
6. **8620H spec depth window 0.8–1.2 mm (0.030–0.050 in)** — typical for the preset's parts;
   cards benchmark against 1.0 mm.

## Design

### New markup sections

1. **Header nav** (new): brand | links `Profile · Growth · Consequences · Verification · Sources` | badge.
2. **Consequences** (new, full width): `h2 Consequences at the current settings`, verdict banner
   `#verdict` (ok/warn/crit), six cards `#cqCards`:
   1. `#cardDepth` — Case depth @ 0.40 %C: value mm, or `> 3.00` when solveCaseDepth returns
      null (null → pill crit, meter full, no marker); pill ok 0.8–1.2 mm, warn 0.5–0.8 or
      1.2–1.5 mm, crit < 0.5 mm; meter with marker at 1.0 mm.
   2. `#cardSurfaceC` — Surface carbon: value wt%; pill crit ≥ 0.9 ("carbide network"),
      warn ≥ 0.7 ("retained austenite"), else ok.
   3. `#cardHV` — As-quenched case hardness: HV (Idohara untempered); subline core HV.
   4. `#cardRA` — Retained austenite risk: ok < 0.5, warn 0.5–0.7, info ≥ 0.7 ("expect RA; temper
      or refrigerate").
   5. `#cardUptake` — Carbon uptake: mg/cm² (`carbonUptakeMgCm2` — semi-infinite closed form,
      labeled as such); subline "= ∫(C−C₀)dx over the profile".
   6. `#cardTime1mm` — Time to 1.0 mm case depth at current T/Cs/C₀ (`timeToCaseDepth`); "> 200 h"
      when unreachable.
   Verdict logic (crit > warn > ok): cs ≥ 0.9 → crit "Over-carburized"; depth null → warn
   "Case deeper than the 3 mm window — check for over-carburization/grain coarsening at long times";
   depth < 0.8 → warn "Shallow case — below typical 8620H spec"; cs ≥ 0.7 → warn "High surface
   carbon — retained austenite expected"; else ok "Within carburizing practice".
3. **Two-column charts row** (new, full width, after consequences; `id="growth"`, used by nav):
   left `#growthChart` — case depth (mm) vs time **0 → 24 h fixed domain**; toggle `#growthT` /
   `#growthRt` switches x between t (h) and √t (√h, labeled `√(t)  (√h)`) — on the √t axis the
   curve is (nearly) straight while the wall is semi-infinite; 50-point curve; where
   solveCaseDepth(t) is null the curve truncates at the last finite t and a small note is shown
   ("depth exceeds 3 mm beyond ~t*"); current (t, depth) point as an amber dot (hidden when t >
   last finite t).
   right `#hardnessChart` — HV vs depth 0–3 mm, profile-driven curve, dashed 510 HV line with
   label `≈ 50 HRC`, case-depth crossing marker + label (omitted when depth is null, with note).
4. **Verification** (new, full width): `h2 Verification, recomputed live`, copy:
   "Recomputed whenever you move a slider; fixed-case rows say so", `#vtable` with
   `Check | What it compares | Result | Status`. Rows (rows 1,2,3,5,6 recompute live;
   row 4 is a fixed check case):
   1. erfc vs 1−erf — max |erf(x) − (1 − erfcQuadrature(x))| on {0, 0.5, 1, 1.5, 2} — pass < 1e−13.
   2. Mass balance — ∫₀^3mm (C−C₀)dx (500-pt trapezoid of our profile) vs the **truncated** closed
      form M(L) = (Cs−C₀)·(L − 2√Dt·(a·erf a + e^{−a²}/√π − 1/√π)), a = L/(2√Dt), L = 3 mm —
      pass < 0.5 % rel. (Comparing against the semi-infinite total fails at high T·t — that was
      the trap; the interval matches, so a correct implementation passes.)
   3. Bisection residual — |C(solveCaseDepth(…)) − 0.40| — pass < 1e−9; when depth is null the row
      shows "n/a" and passes by definition.
   4. Finite difference vs erf — **fixed check case** (labeled): 920 °C, 1 h,
      xMax = 2 mm, n = 240, backward-Euler + Thomas, zero-flux outer BC, 200 time steps;
      max |C_FD − C_erf| — pass < 0.01 wt%. (Fixed, not slider-fed: the semi-infinite domain and
      the reflection error would make a live comparison fail at extreme settings.)
   5. D window — diffusivity(T) ∈ (1e−13, 1e−9) m²/s — pass/fail.
   6. DANTE D(T,C) refinement — info row: FD solve with
      D(cell, C) per node (xMax = 3 mm, zero-flux outer BC); effective depth by **linear
      interpolation between the nodes bracketing the 0.40 crossing**; Δ% = signed change vs this
      model's erf constant-D depth — pill `info`. (Labeled "DANTE-style refinement", not truth.)
5. **Validity window** (new): `h2 Validity window`, horizontal bar `#validityBar`
   (800–845 "sluggish"/warn → 845–1010 "carburizing practice"/ok → 1010–1050 "grain coarsening"/
   warn → 1050–1100 "above validity"/crit), marker `#validityMark` at current T, plus a split
   **"Left out on purpose"** note-card:
   constant-Cs atmosphere (ideal) · no surface-reaction control · no carbide precipitation ·
   no austenite grain-growth law · no nitrogen (carbonitriding) · no quench / retained-austenite
   transformation · no Cr/Mn/Si drag on D · flat, semi-infinite geometry only ·
   (my call — partner may trim at approval).
6. **Sources** (new): `h2 Sources`, 7 linked refs (each verified to resolve; new tab):
   1. Idohara et al., ISIJ Int. 64(10):1599–1606 (2024) — https://www.jstage.jst.go.jp/article/isijinternational/64/10/64_ISIJINT-2024-140/_html/-char/ja
   2. Lee, Matlock & Van Tyne, ISIJ Int. 51(11):1903–1911 (2011) — https://www.jstage.jst.go.jp/article/isijinternational/51/11/51_11_1903/_pdf
   3. Sims, "Simulation tools to effectively calculate process", Thermal Processing Magazine (Feb 2020) — https://www.thermalprocessing.com/simulation-tools-to-effectively-calculate-process
   4. Krauss, "Martensite in steel: strength and structure", Mater. Sci. Eng. A273–275:40–57 (1999) — https://www.sciencedirect.com/science/article/pii/S0921509399002889
   5. Krauss, "Microstructures and Properties of Carburized Steels", Surface Hardening of Steels (ASM) — author's hosted copy — https://wpfiles.mines.edu/wp-content/uploads/aspprc/ResearchMaterials/Publications/036-Krauss.pdf
   6. Bhadeshia, "Diffusion of carbon in austenite", Met. Sci. 15:477 (1981) — author's hosted copy — https://www.phase-trans.msm.cam.ac.uk/2002/carbon.diffusion.bhadeshia.metal.science.1981.pdf
   7. Mohrbacher, "Metallurgical concepts for optimized processing and properties of carburizing steel", Adv. Manuf. 4:105–114 (2016), open access — https://link.springer.com/article/10.1007/s40436-016-0142-9
   (every link verified to resolve; no guessed DOIs)
7. Footer: append "Physics and verification checked live · sources below".

### New pure physics (PHYSICS block only)

```js
function erfcQuadrature(x)         // Lentz continued fraction; independent of Maclaurin erf
function carbonUptake(cs, c0, D, t) // 2(cs-c0)*sqrt(D*t/PI)  [wt%·m]
function carbonUptakeMgCm2(cs, c0, D, t)  // carbonUptake × 7850 → mg/cm²  (= × 78.5 kg/m² × 100; ρ_steel = 7850 kg/m³)
function martensiteHV(cWt)        // (1.75 + 8.2*cWt) * 101.97  [HV]
function danteD(tempC, cWt)       // 0.47*exp(-1.6*C)*exp(-(37000-6600*C)/(1.986*(T+273.15))) × 1e-4 → m²/s
function fdProfile(cs, c0, tempC, timeH, xMax_m, n, carbonDep)
                                   // implicit backward-Euler + Thomas; zero-flux outer BC;
                                   // D from diffusivity(tempC) or danteD(tempC, C_node) when carbonDep
                                   // returns {x:[m], c:[wt%]}
function timeToCaseDepth(tempC, cs, c0, target_m)
                                   // bisection on t (0..200 h) of solveCaseDepth vs target; null past 200 h
```

APP-block renderers: `renderConsequences(p)`, `renderGrowth(p)`, `renderHardness(p)`,
`renderVerification(p)`, `renderValidity(p)`; all invoked from `updateAll()`; chart renderers
wrapped in `typeof Chart !== 'undefined'` guards; DOM reads via existing `$()`;
verification table is pure string injection into `#vtable tbody`.

### Stats row

Unchanged (D, case depth, √(Dt)). The requested additions do not fight it.

### Governing Equations card

Append KaTeX: `D(T,C) = 0.47 e^{-1.6C} e^{-(37000 - 6600 C)/RT}` and
`HV* [GPa] = 1.75 + 8.2·(wt%C)`. Rendered in a separate try/catch guarded block like the others.

### Layout / insertion points

- `.notes` row stays as is (Governing Equations gets the two new KaTeX equations).
- Consequences: full-width section after `<main>`, before `.notes`.
- Charts row: full-width two-column section after consequences (right under it), `id="growth"`.
- Verification: full-width section after `.notes` (mirrors competition "evidence" placement).
- Validity: full-width after verification.
- Sources: full-width after validity, before footer.
- Styles: reuse panel/card classes; new CSS only for pills, meter, validity bar, verdict banner
  (modeled on competition's structure, hand-written in our palette — dark navy + amber).

## Testing

- `tests/verify.mjs`: add asserts for every new pure fn:
  - `erfcQuadrature(1.5) + erf(1.5) ≈ 1` (1e-12), plus `≈ 2` on negative? No — erfc(-x) = 2 − erfc(x); assert `erfcQuadrature(-1.5) ≈ 2 - erfcQuadrature(1.5)`? Keep the single identity check + |erf−(1−erfcQuadrature)| on sample grid < 1e-12.
  - `carbonUptake` vs trapezoid of profilePoints-like sampling on [0, 3mm] with truncated closed
    form (same formula as row 2) — agreement < 0.5 %.
  - `martensiteHV(0.4)` ∈ [498, 528] HV; monotonic non-decreasing over 0.1…1.1.
  - `danteD(950, 1.0) > danteD(950, 0.2)` (D rises with C) and `danteD(950, 0.2) > 0`.
  - `fdProfile` (constant D) vs `concentration()` at the fixed check case — max err < 0.01 wt%.
  - `fdProfile(carbonDep=true)` runs and stays finite over the grid.
  - `timeToCaseDepth(920, 1.1, 0.2, 0.001)` — solveCaseDepth at the returned t must reproduce
    1.0 mm ± 2 % (round-trip).
- `tests/app-smoke.mjs`: extend stub ids: `growthChart`, `hardnessChart` (with getContext returning
  the linear-gradient stub like `profileChart`), `vtable`, `verdict`, `cqCards` card ids,
  `validityBar`, `validityMark`, plus any `$()`-queried new elements; keep Cases 1–5 assertions
  passing byte-for-byte (defaults coupling unchanged).
- Both suites under the nvm Node path per AGENTS.md. Manual browser check at file:// at the end
  (dark theme, 2 breakpoints, empty Chart.js path).

## Risks / open items

- FD cost: backward-Euler + Thomas, n = 240, ≤ 200 steps — trivially cheap; fine per slider input.
- Null (depth > 3 mm) handling is uniform across renderers: stats card `> 3.00 mm` (existing),
  Card 1 `> 3.00`/crit/full meter, verdict warn, hardness chart omits crossing marker,
  growth curve truncates, row 3 passes-by-definition.
- Row 2 uses the truncated closed form; the semi-infinite total is only used for Card 5 (labeled).
- Growth chart fixed 0–24 h domain: 50 solveCaseDepth calls per update — ~50×60 erf iterations,
  fine; remains honest on √t axis.
- timeToCaseDepth worst case may exceed 200 h → UI "> 200 h"; test uses the 920 °C default.
- Chart.js absent: cards/table/validity/sources render (all DOM/string work), charts skip silently.

## Calls made without the partner (veto-able)

- Left-out-on-purpose list contents (voice).
- Growth chart fixed 0–24 h domain and √h units.
- Row 4 fixed check case (labeled) instead of slider-fed.
- Row 2 truncated closed form; tolerance 0.5 %.
- Pyrowear53 fit used as unlisted sanity cross-check only; not in the Sources section.
