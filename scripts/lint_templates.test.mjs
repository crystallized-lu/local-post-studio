import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lintTemplate, lintWorkspace } from './lint_templates.mjs';

const root = new URL('..', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));

test('example and starter templates pass the lint', () => {
  assert.deepEqual(lintWorkspace(read('example/workspace.json')), {});
  assert.deepEqual(lintWorkspace(read('starter/workspace.json')), {});
});

test('hard-coded sizes, spacing, widths and framing are each caught', () => {
  const bad = '<div style="padding:40px 56px;gap:20px"><h1 data-field="title" style="font-size:40px;max-width:14ch"></h1>'
    + '<p data-field="body" style="font:400 22px/1.3 var(--font-body)"></p><img data-image style="object-position:50% 0"></div>';
  const p = lintTemplate({ id: 'x', html: bad });
  for (const re of [/font-size "40px"/, /font shorthand "400 22px/, /never reads --display-size/, /padding "40px 56px"/, /gap "20px"/, /max-width "14ch"/, /object-position/]) {
    assert.ok(p.some((s) => re.test(s)), String(re));
  }
});

test('sizes written against the variables pass, including px scaled by --k', () => {
  const ok = '<div style="padding:var(--pad);gap:calc(var(--k) * 20px)"><h1 data-field="title" style="font-size:calc(var(--display-size) * .53);max-width:min(100%, calc(14ch * var(--title-w, 1)))"></h1>'
    + '<p data-field="body" style="font:400 calc(var(--body-size) * .7)/1.3 var(--font-body);margin:0"></p><img data-image data-pos="50 0"></div>';
  assert.deepEqual(lintTemplate({ id: 'ok', html: ok }), []);
});
