import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const match = html.match(/\/\/ === PHYSICS START ===([\s\S]*?)\/\/ === PHYSICS END ===/);
assert.ok(match, 'physics block markers not found in index.html');

const { erf, diffusivity, concentration, solveCaseDepth, profilePoints,
        erfcQuadrature, uptakeWithin, carbonUptake, carbonUptakeMgCm2,
        martensiteHV, danteD, fdProfile, timeToCaseDepth } =
  new Function(`${match[1]}; return { erf, diffusivity, concentration, solveCaseDepth, profilePoints,
    erfcQuadrature, uptakeWithin, carbonUptake, carbonUptakeMgCm2, martensiteHV, danteD, fdProfile, timeToCaseDepth };`)();

// --- erf ---
assert.equal(erf(0), 0);
assert.equal(erf(3), 1);
assert.ok(Math.abs(erf(1) - 0.8427007929) < 1e-7, `erf(1): ${erf(1)}`);
assert.ok(Math.abs(erf(2) - 0.9953222650) < 1e-7, `erf(2): ${erf(2)}`);
assert.ok(Math.abs(erf(-1.5) + 0.9661051465) < 1e-7, `erf(-1.5): ${erf(-1.5)}`);

// --- diffusivity ---
const D = diffusivity(920);
assert.ok(D > 1e-13 && D < 1e-9, `D out of range: ${D}`);
assert.ok(diffusivity(1050) > D && D > diffusivity(800), 'D must increase with temperature');

// --- concentration profile shape ---
const pts = profilePoints(920, 4, 1.1, 0.2);
assert.equal(pts.length, 150);
assert.ok(Math.abs(pts[0].c - 1.1) < 1e-9, 'surface point must equal Cs');
for (let i = 1; i < pts.length; i++) {
  assert.ok(pts[i].c <= pts[i - 1].c, 'profile must be non-increasing');
}
assert.ok(pts.every(p => Number.isFinite(p.c)), 'profile must be finite');

// --- effective case depth ---
const depth = solveCaseDepth(920, 4, 1.1, 0.2);
assert.ok(depth !== null, 'expected a finite case depth at defaults');
assert.ok(Math.abs(concentration(depth, 920, 4, 1.1, 0.2) - 0.4) < 1e-6,
  `C at solved depth must be 0.40, got ${concentration(depth, 920, 4, 1.1, 0.2)}`);

// core at 0.50 wt%: profile never reaches 0.40 -> null
assert.equal(solveCaseDepth(920, 4, 1.1, 0.5), null);

// --- extremes stay finite ---
assert.ok(profilePoints(800, 1, 0.8, 0).every(p => Number.isFinite(p.c)));
assert.ok(profilePoints(1050, 24, 1.3, 0).every(p => Number.isFinite(p.c)));

// --- structural: no duplicate function declarations in the PHYSICS block ---
{
  const fns = [...match[1].matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(m => m[1]);
  const dupes = fns.filter((f, i) => fns.indexOf(f) !== i);
  assert.deepEqual(dupes, [], `duplicate function declarations in PHYSICS block: ${dupes.join(', ')}`);
}

// --- depth expansion: pure physics ---
// erfcQuadrature: independent algorithm, must agree with erf
for (const x of [0, 0.5, 1, 1.5, 2]) assert.ok(Math.abs(erf(x) - (1 - erfcQuadrature(x))) < 1e-12, `erfcQuadrature(${x})`);

// uptake: integral of our profile on [0, 3 mm] must match the truncated closed form
{
  const D = diffusivity(920), t = 4 * 3600, L = 0.003;
  let trap = 0; const n = 500;
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * L, wgt = (i === 0 || i === n) ? 0.5 : 1;
    trap += wgt * (concentration(x, 920, 4, 1.1, 0.2) - 0.2);
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

console.log('verify.mjs: all assertions passed');
