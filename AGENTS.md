# AGENTS.md

Interactive 1-D carburization-of-steel simulator (Transport Phenomena demo). Single self-contained `index.html` in the repo root — no build step, no `package.json`, no framework.

## Commands

Node is **not on the default PATH**. Prefix commands with:

```bash
export PATH="$HOME/.nvm/versions/node/v26.13.1/bin:$PATH"
```

Run the verification suites directly (no npm scripts exist):

```bash
node tests/verify.mjs      # physics assertions (erf, D, profile, case depth, FD, HV, uptake)
node tests/app-smoke.mjs   # DOM-stubbed updateAll() smoke test incl. CDN-free stats + offline/null-depth cases
```

Both must pass before committing physics/app changes. Open `index.html` directly in a browser (`file://` is fine) to verify UI behavior; there is no dev server.

## Architecture & hard constraints

- **Everything lives in `index.html`**: markup + Tailwind Play CDN + inline `<style>` + inline `<script>` + base64-embedded logo. Do not split into multiple files, do not add a bundler — the single file is the graded deliverable.
- **Marked blocks are a test API.** Tests extract `index.html` text with regexes and `eval` it via `new Function`. Never rename or remove these markers:
  - `// === PHYSICS START ===` … `// === PHYSICS END ===` — pure functions only, no DOM, no CDNs: `erf`, `diffusivity`, `concentration`, `solveCaseDepth`, `profilePoints`, plus the depth-expansion set: `erfcQuadrature`, `uptakeWithin`, `carbonUptake`, `carbonUptakeMgCm2`, `martensiteHV`, `danteD`, `fdProfile`, `timeToCaseDepth`.
  - `// === APP START ===` … `// === APP END ===` — DOM wiring, `updateAll()`, Chart.js plugin.
- The depth expansion adds sections to `index.html`: consequences cards, case-growth chart (`t`/`√t`), HV hardness traverse, live verification table (`#vtable`; program-wide checks rerun on slider move — FD-vs-erf is a labeled fixed case 920 °C · 1 h), validity window bar (`#validityMark`), sources. Anchors: `#profile #growth #consequences #verification #sources`. App renderers warn-and-skip on failure, so the page still computes with any CDN blocked.
- **Physics/stat-card rendering must not depend on any CDN** (offline demos). Chart.js and KaTeX failing must not break computation — keep their init inside `try/catch` / `typeof X === 'undefined'` guards, as in the existing code.
- x is in **meters internally**; `profilePoints` returns `x` in **mm**. Case depth solve halves on `[0, 0.003]`; returns `null` when C(3 mm) ≥ 0.40 (UI shows `> 3.00 mm` and adds `.beyond` to the depth card) — do not return 3 mm as a "depth".
- Script order in `index.html` matters: physics/app inline script first, then a separate KaTeX `<script>` wrapped in `try/catch` so a blocked KaTeX can't kill the simulator.
- `index.html` is ~227 KB mostly due to the base64 logo. Don't "optimize" by extracting it to an external file — that breaks single-file portability.

## Testing quirks

- `tests/verify.mjs` / `tests/app-smoke.mjs` parse `index.html` with regex — if you reformat the markers or the physics signatures, the harness breaks (update both together).
- `app-smoke.mjs` stubs `document` and optionally `Chart`; it never touches the network. Case 5 pins the 8620H preset as `.active` at load to match the slider defaults — if you change slider default values, update the preset markup and this test too.
- Slider defaults are coupled: `8620H` preset (920 °C / 4 h / 0.95 / 0.20) must match the `input` default values and `.active` class.

## Docs vs. reality

`docs/superpowers/specs/` and `docs/superpowers/plans/` are dated, historical records. Where they conflict with the code, **the code wins**. Known stale claims:

- Spec/plan say erf = Abramowitz–Stegun 7.1.26 and the footer says "Maclaurin series" — the implementation is a **Maclaurin series** (A&S 7.1.26 misses the plan's 1e-7 tolerance; see `.superpowers/sdd/2026-11-18-carburization-simulator/progress.md`).
- Plan says "not a git repo / do not git init" — it now **is**: branch `main`, remote `origin` → `https://github.com/fahadroshan2007-stack/Carburization-Demo.git`.

## Gotchas

- `.superpowers/` (brainstorm mockups, SDD ledgers) is gitignored and must not be referenced by `index.html`.
- `Shrinking Core Particle Icon.png` in root is the 1.7 MB source asset; the page uses a small base64 crop embedded in `index.html`. Keep both.
- CDN hosts used: `cdn.tailwindcss.com`, `cdn.jsdelivr.net` (Chart.js @4, KaTeX 0.16.11), `fonts.googleapis.com` / `fonts.gstatic.com` — don't add others without reason.
- Physics equations: `D(T) = 2.3e-5 · exp(−148000 / (8.314 · (T+273.15)))` m²/s; `C(x,t) = Cs − (Cs − C0)·erf(x / (2√(D·t)))`; effective case depth is bisection where C = 0.40 wt%.
