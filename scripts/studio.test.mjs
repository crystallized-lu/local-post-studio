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
