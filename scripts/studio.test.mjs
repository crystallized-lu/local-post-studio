import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { exportName } from './postproxy.mjs';

const root = new URL('..', import.meta.url);
const page = readFileSync(new URL('studio.html', root), 'utf8');

test('CLI runs from a path containing spaces (prints usage without args)', () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('scripts/postproxy.mjs', root))], { encoding: 'utf8' });
  assert.match(r.stderr, /Usage: node scripts\/postproxy\.mjs/);
});

test('exportName keeps ids inside exports/', () => {
  assert.equal(exportName('2026-10-08-open-studio'), '2026-10-08-open-studio.png');
  assert.equal(exportName('../../etc/passwd'), '------etc-passwd.png');
});

test('studio and script name export files the same way', () => {
  assert.match(page, /const fileId = \(id\) => String\(id\)\.replace\(\/\[\^a-z0-9_-\]\/gi, '-'\)\.slice\(0, 80\) \|\| 'post';/);
});

test('studio loads nothing from CDNs or font services (only user-initiated image searches go out)', () => {
  assert.doesNotMatch(page, /<script[^>]+src=|<link[^>]+href=|fonts\.googleapis|fonts\.gstatic|jsdelivr|unpkg|cdnjs/i);
});

test('every font listed in the example exists in example/fonts', () => {
  const ws = JSON.parse(readFileSync(new URL('example/workspace.json', root), 'utf8'));
  for (const f of ws.fonts) assert.ok(existsSync(new URL('example/' + f.src, root)), f.src);
});

test('example templates only use the documented bindings', () => {
  const ws = JSON.parse(readFileSync(new URL('example/workspace.json', root), 'utf8'));
  for (const t of ws.templates) {
    assert.doesNotMatch(t.html, /<script|on\w+=|javascript:/i, t.id);
    for (const f of t.fields) assert.ok(t.html.includes(`data-field="${f.key}"`) || t.html.includes(`data-list="${f.key}"`), `${t.id}.${f.key} not bound`);
  }
});

test('starter: same template layouts as the example, no demo content', () => {
  const ex = JSON.parse(readFileSync(new URL('example/workspace.json', root), 'utf8'));
  const st = JSON.parse(readFileSync(new URL('starter/workspace.json', root), 'utf8'));
  assert.deepEqual(st.templates, ex.templates.map(({ sample, ...t }) => t));
  assert.doesNotMatch(JSON.stringify(st), /lehm|clay|mug|remich|kleeschen/i);
  assert.equal(st.posts.length + st.calendar.length + st.fonts.length, 0);
});

test('carousels: the studio names slide files the way the script does, and old posts keep their export snapshot', async () => {
  const { exportNames } = await import('./postproxy.mjs');
  const helpers = page.match(/const rawPost = [^\n]*\n[\s\S]*?const exportFile = [^\n]*/)[0];
  const fileId = (id) => String(id).replace(/[^a-z0-9_-]/gi, '-').slice(0, 80) || 'post';
  const { exportFile, slideCount } = new Function('fileId', helpers + '\nreturn { exportFile, slideCount };')(fileId);
  for (const post of [{ id: 'a b' }, { id: 'a b', slides: [{}] }, { id: 'a b', slides: [{}, {}, {}] }])
    assert.deepEqual(Array.from({ length: slideCount(post) }, (_, i) => exportFile(post, i)), exportNames(post));
  // a post without slides must produce exactly the key it produced before carousels, or every old export would read "out of date"
  const line = page.match(/const visualKey = [^\n]*/)[0].replace(/ \/\/ slides only[^\n]*$/, '');
  const visualKey = new Function('ws', 'tplFor', line + '\nreturn visualKey;')({ brand: { tokens: { x: 1 } } }, () => ({ html: '<i>' }));
  const p = { template: 't', format: 'square', fields: { a: 1 }, image: {}, images: {}, overrides: {} };
  assert.equal(visualKey(p), JSON.stringify(['t', 'square', { a: 1 }, {}, {}, {}, { x: 1 }, '<i>']));
  assert.notEqual(visualKey({ ...p, slides: [{ template: 't', fields: {} }] }), visualKey(p));
});

test('carousels: the out-of-date check compares the whole post, not the slide that is open', () => {
  assert.match(page, /p\.exported\.visual !== visualKey\(rawPost\(p\)\)/);
  assert.match(page, /function addSlidePicker/); // every "add a slide" control lets you choose the new slide's template
});
