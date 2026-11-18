# Carburization Simulator — Design (approved)

**Date:** 2026-11-18 · **Status:** Approved by Fahad (mockup v2 approved 2026-11-18)

## Intent
Single-file interactive web simulator of 1-D carburization of steel, built to showcase the superpowers plugin for a graded final project (Transport Phenomena). Must look polished and demonstrate the full brainstorm → mockup → plan → build → verify flow.

## Goals
- One self-contained `index.html` in the project root; opens in any browser, no build step.
- Real-time `C(x,t)` vs depth chart (0–3 mm) with horizontal dashed line at 0.40 wt% marking effective case depth.
- Sliders: Temperature (800–1050 °C, step 1), Time (1–24 h, step 0.5), Surface Carbon (0.8–1.3 wt%, step 0.01), Core Carbon (0–0.5 wt%, step 0.01, default 0.20).
- Live stat cards: D(T) in scientific notation, effective case depth at C = 0.40 wt% (mm, bisection solve), diffusion length √(Dt).
- Working preset buttons (e.g., 8620H, 1020, 4320 steel scenarios).

Non-goals: multi-file builds, frameworks, backend, units beyond metric, phase-change/moving-boundary models.

## Physics
- D(T) = 2.3e-5 · exp(−148000 / (8.314 · (T + 273.15))) m²/s
- C(x,t) = Cs − (Cs − C₀) · erf(x / (2√(D·t))), x ∈ [0, 3 mm]
- erf(x) implemented inline (Abramowitz–Stegun 7.1.26, |ε| ≤ 1.5e-7)
- Effective case depth: bisection root solve of C(x,t) = 0.40 wt% on [0, 3 mm]; display "> 3.0 mm" if no crossing

## Look & feel (approved via mockup v2)
- Dark "metallurgy lab" theme: deep slate background, blueprint grid, amber/orange heated-steel accents.
- Fonts: Space Grotesk (display), Inter (body), JetBrains Mono with tabular numerics (readouts/chart ticks).
- Equations rendered as LaTeX via KaTeX (CDN), display mode.
- Stat cards, dashed red 0.40 wt% limit line, gradient-filled Chart.js curve, case-depth intersection marker.
- Header brand mark: `Shrinking Core Particle Icon.png` (user-supplied), embedded as base64 data URI in `index.html` so the file stays truly single-file. Chart.js and Tailwind via CDN per request.
- Equations/assumptions footer note; inputs recompute everything live on `input` events.

## Approaches considered
1. Single file + CDN libs (chosen) — matches "single-file, open-anywhere" demo requirement; Tailwind + Chart.js as requested.
2. Framework + bundler (Vite/React) — rejected: build tooling defeats the single-file demo and adds nothing for this scope.
3. Multi-file static app (css/js separate) — rejected: same reasoning; one portable artifact is the graded deliverable.

## Left to the builder
Exact spacing/sizes, micro-interactions, preset definitions, chart annotation plugin details, erf implementation specifics.

## Notes
- Project is not a git repo; this doc lives at `docs/superpowers/specs/2026-11-18-carburization-simulator-design.md`, not committed.
- `.superpowers/` (brainstorm mockups) should be gitignored if the folder is ever put under version control.
- Logo file `Shrinking Core Particle Icon.png` stays in project root as source asset; the embedded copy is what the page uses.
