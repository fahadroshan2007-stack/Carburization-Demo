// Smoke test for the APP block: stubs just enough DOM to run updateAll()
// and checks the stat cards read finite, correctly formatted values across
// slider extremes — including the core-0.50 "> 3.00 mm" case.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const phys = html.match(/\/\/ === PHYSICS START ===([\s\S]*?)\/\/ === PHYSICS END ===/)?.[1];
const app = html.match(/\/\/ === APP START ===([\s\S]*?)\/\/ === APP END ===/)?.[1];
assert.ok(phys, 'physics block missing');
assert.ok(app, 'APP block missing');

function makeEl(id, { value = '', min = 0, max = 100, step = 1 } = {}) {
  const classes = new Set();
  return {
    id, value: String(value), min: String(min), max: String(max), step: String(step),
    innerHTML: '', textContent: '', style: { setProperty() {} },
    classList: {
      add: c => classes.add(c),
      remove: c => classes.delete(c),
      toggle: (c, force) => {
        const want = force === undefined ? !classes.has(c) : !!force;
        want ? classes.add(c) : classes.delete(c);
      },
      contains: c => classes.has(c),
    },
    dataset: {},
    addEventListener() {},
  };
}

function buildDom() {
  const tbody = makeEl('tbody');
  const els = {
    tempSlider: makeEl('tempSlider', { value: '800', min: 800, max: 1050, step: 1 }),
    timeSlider: makeEl('timeSlider', { value: '1', min: 1, max: 24, step: 0.5 }),
    surfSlider: makeEl('surfSlider', { value: '0.8', min: 0.8, max: 1.3, step: 0.01 }),
    coreSlider: makeEl('coreSlider', { value: '0', min: 0, max: 0.5, step: 0.01 }),
    tempVal: makeEl('tempVal'), timeVal: makeEl('timeVal'),
    surfVal: makeEl('surfVal'), coreVal: makeEl('coreVal'),
    dVal: makeEl('dVal'), depthVal: makeEl('depthVal'), lenVal: makeEl('lenVal'),
    depthCard: makeEl('depthCard'),
    // depth-expansion sections
    verdict: makeEl('verdict'), cqCards: makeEl('cqCards'),
    cardDepth: makeEl('cardDepth'), cardSurfaceC: makeEl('cardSurfaceC'), cardHV: makeEl('cardHV'),
    cardRA: makeEl('cardRA'), cardUptake: makeEl('cardUptake'), cardTime1mm: makeEl('cardTime1mm'),
    growthChart: Object.assign(makeEl('growthChart'), {
      getContext: () => ({ createLinearGradient: () => ({ addColorStop() {} }) }),
    }),
    hardnessChart: Object.assign(makeEl('hardnessChart'), {
      getContext: () => ({ createLinearGradient: () => ({ addColorStop() {} }) }),
    }),
    growthNote: makeEl('growthNote'), hardnessNote: makeEl('hardnessNote'),
    growthT: makeEl('growthT'), growthRt: makeEl('growthRt'),
    validityMark: makeEl('validityMark'),
    vtable: Object.assign(makeEl('vtable'), { querySelector: sel => (sel === 'tbody' ? tbody : undefined) }),
    showCD: Object.assign(makeEl('showCD'), { checked: true }),
    profileChart: Object.assign(makeEl('profileChart'), {
      getContext: () => ({
        createLinearGradient: () => ({ addColorStop() {} }),
      }),
    }),
  };
  const document = {
    getElementById: id => els[id],
    querySelectorAll: () => [],
    querySelector: () => null,
  };
  return { els, document, tbody };
}

function load(dom) {
  global.document = dom.document;
  return new Function(`${phys}; ${app}; return { readParams, updateAll, state: typeof state !== 'undefined' ? state : null };`)();
}

// Case 1: coolest/shortest process — everything must be finite, no NaN leaks
{
  const dom = buildDom();
  const { updateAll } = load(dom);
  updateAll();
  for (const id of ['dVal', 'depthVal', 'lenVal']) {
    assert.ok(!/NaN|undefined|Infinity/.test(dom.els[id].innerHTML), `${id} not finite: ${dom.els[id].innerHTML}`);
  }
  assert.match(dom.els.dVal.innerHTML, /×10/, 'D must render in scientific notation');
  assert.match(dom.els.tempVal.innerHTML ?? dom.els.tempVal.textContent, /800/);
}

// Case 2: core 0.50 wt% — no 0.40 wt% contour can form (C₀ ≥ 0.40)
{
  const dom = buildDom();
  const { els } = dom;
  els.coreSlider.value = '0.5';
  const { updateAll } = load(dom);
  updateAll();
  assert.match(els.depthVal.innerHTML, /n\/a/, `expected n/a for noContour case, got: ${els.depthVal.innerHTML}`);
  assert.ok(els.depthCard.classList.contains('beyond'), 'depth card should carry .beyond styling');
}

// Case 3: defaults-ish mid case — depth must render a finite mm value
{
  const dom = buildDom();
  const { els } = dom;
  els.tempSlider.value = '920'; els.timeSlider.value = '4';
  els.surfSlider.value = '1.10'; els.coreSlider.value = '0.20';
  const { updateAll } = load(dom);
  updateAll();
  assert.match(els.depthVal.innerHTML, /\d\.\d{2}<small> mm/, `expected mm depth, got: ${els.depthVal.innerHTML}`);
  assert.ok(!els.depthCard.classList.contains('beyond'));
}

// Case 4: chart renders through a Chart stub; update mutates instead of recreating
{
  const instances = [];
  global.Chart = class {
    constructor(ctx, cfg) { this.data = cfg.data; this.options = cfg.options; this.$caseDepth = undefined; instances.push(this); }
    update() {}
    destroy() {}
  };
  const dom = buildDom();
  const { els } = dom;
  els.tempSlider.value = '920'; els.timeSlider.value = '4';
  els.surfSlider.value = '1.10'; els.coreSlider.value = '0.20';
  const { updateAll } = load(dom);
  updateAll();
  assert.equal(instances.length, 3, 'profile + growth + hardness charts created once');
  assert.equal(instances[0].data.datasets[0].data.length, 150);
  assert.ok(instances[0].$caseDepth > 0 && instances[0].$caseDepth < 0.003,
    `case depth out of range: ${instances[0].$caseDepth}`);
  els.tempSlider.value = '1050';
  updateAll();
  assert.equal(instances.length, 3, 'slider drag must update, not recreate, the charts');
  delete global.Chart;
}

// Case 6: offline / no CDN at all — updateAll must not throw; cards and table still render
{
  delete global.Chart;
  const dom = buildDom();
  const { updateAll } = load(dom);
  updateAll();
  const { els, tbody } = dom;
  assert.ok(!/NaN|undefined|Infinity/.test(els.cqCards.innerHTML), `cqCards not finite: ${els.cqCards.innerHTML}`);
  assert.ok(els.cqCards.innerHTML.includes('mg/cm²'), 'uptake card must render');
  assert.match(els.verdict.innerHTML, /Within carburizing practice|Shallow|Over-carburized|deeper than/, `verdict: ${els.verdict.innerHTML}`);
  assert.ok(tbody.innerHTML.includes('FD vs erf'), 'verification table must render the FD row offline');
  assert.ok((tbody.innerHTML.match(/PASS/g) || []).length >= 1, 'at least one row must pass');
}

// Case 7: core 0.50 wt% — depth is null everywhere; every renderer stays bounded
{
  delete global.Chart;
  const dom = buildDom();
  const { els, tbody } = dom;
  els.tempSlider.value = '920'; els.timeSlider.value = '4';
  els.surfSlider.value = '0.85'; els.coreSlider.value = '0.5';
  const { updateAll } = load(dom);
  updateAll();
  assert.match(els.verdict.innerHTML, /No 0\.40 wt% case forms/i, `verdict: ${els.verdict.innerHTML}`);
  assert.ok(els.cqCards.innerHTML.includes('no contour'), `cardDepth must degrade to the no-contour message: ${els.cqCards.innerHTML}`);
  assert.ok(!/NaN/.test(els.cqCards.innerHTML), 'cqCards must not contain NaN');
  assert.ok(tbody.innerHTML.includes('no contour'), 'bisection row must degrade to no contour');
  assert.ok(els.growthNote.textContent.includes('No case forms'), `growth note: ${els.growthNote.textContent}`);
}

// Case 8: verification table renders live rows at defaults; uptake card formatted
{
  global.Chart = class {
    constructor(ctx, cfg) { this.data = cfg.data; this.options = cfg.options; }
    update() {}
    destroy() {}
  };
  const dom = buildDom();
  const { els, tbody } = dom;
  els.tempSlider.value = '920'; els.timeSlider.value = '4';
  els.surfSlider.value = '1.10'; els.coreSlider.value = '0.20';
  const { updateAll } = load(dom);
  updateAll();
  assert.ok(!/NaN/.test(els.cqCards.innerHTML), 'cqCards must be finite');
  assert.match(els.cqCards.innerHTML, /\d+\.\d{2}<small> mg\/cm²/, `uptake card: ${els.cqCards.innerHTML}`);
  assert.ok(tbody.innerHTML.includes('920'), 'fixed check case must name its temperature');
  assert.ok((tbody.innerHTML.match(/PASS/g) || []).length >= 4, `expected ≥4 PASS rows, got: ${tbody.innerHTML}`);
  delete global.Chart;
}

// Case 5: at load, the preset matching slider defaults (8620H) is marked active
{
  const m = html.match(/<button class="preset([^"]*)"[^>]*data-t="920"/);
  assert.ok(m, 'default 8620H preset button not found');
  assert.match(m[1], /\bactive\b/, 'default 8620H preset should carry .active to match initial slider values');
}

console.log('app-smoke.mjs: all assertions passed');
