import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const match = html.match(/\/\/ === PHYSICS START ===([\s\S]*?)\/\/ === PHYSICS END ===/);
assert.ok(match, 'physics block markers not found in index.html');

const { erf, diffusivity, concentration, solveCaseDepth, profilePoints } =
  new Function(`${match[1]}; return { erf, diffusivity, concentration, solveCaseDepth, profilePoints };`)();

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

console.log('verify.mjs: all assertions passed');
