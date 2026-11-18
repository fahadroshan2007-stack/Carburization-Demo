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
  const els = {
    tempSlider: makeEl('tempSlider', { value: '800', min: 800, max: 1050, step: 1 }),
    timeSlider: makeEl('timeSlider', { value: '1', min: 1, max: 24, step: 0.5 }),
    surfSlider: makeEl('surfSlider', { value: '0.8', min: 0.8, max: 1.3, step: 0.01 }),
    coreSlider: makeEl('coreSlider', { value: '0', min: 0, max: 0.5, step: 0.01 }),
    tempVal: makeEl('tempVal'), timeVal: makeEl('timeVal'),
    surfVal: makeEl('surfVal'), coreVal: makeEl('coreVal'),
    dVal: makeEl('dVal'), depthVal: makeEl('depthVal'), lenVal: makeEl('lenVal'),
    depthCard: makeEl('depthCard'),
  };
  const document = {
    getElementById: id => els[id],
    querySelectorAll: () => [],
    querySelector: () => null,
  };
  return { els, document };
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

// Case 2: core 0.50 wt% — profile never reaches 0.40, depth must read > 3.00 mm
{
  const dom = buildDom();
  const { els } = dom;
  els.coreSlider.value = '0.5';
  const { updateAll } = load(dom);
  updateAll();
  assert.match(els.depthVal.innerHTML, /(?:>|&gt;)\s*3\.00/, `expected bounded-case-depth message, got: ${els.depthVal.innerHTML}`);
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

console.log('app-smoke.mjs: all assertions passed');
