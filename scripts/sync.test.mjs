import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { register, syncAll, forget, stampPage } from "./sync.mjs";

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "lps sync "));
  const skillDir = path.join(root, "skill");
  fs.mkdirSync(skillDir);
  fs.writeFileSync(path.join(skillDir, "studio.html"), "<!doctype html>\n<html>\n<head>\n<title>v1</title>\n</head></html>");
  const ws = path.join(root, "Test Brand");
  fs.mkdirSync(ws);
  fs.writeFileSync(path.join(ws, "workspace.json"), JSON.stringify({ version: 1, brand: { name: "Test Brand" } }, null, 2) + "\n");
  return { root, skillDir, ws };
}
const readWs = (dir) => JSON.parse(fs.readFileSync(path.join(dir, "workspace.json"), "utf8"));

test("register gives the workspace a permanent id and a stamped studio", () => {
  const { skillDir, ws } = setup();
  const { entry, state } = register(ws, { skillDir });
  const id = readWs(ws).workspaceId;
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.equal(entry.id, id);
  assert.equal(state, "updated");
  assert.match(fs.readFileSync(path.join(ws, "studio.html"), "utf8"), new RegExp(`<meta name="workspace-id" content="${id}">`));
  assert.equal(JSON.parse(fs.readFileSync(path.join(skillDir, "workspaces.json"), "utf8")).workspaces.length, 1);
});

test("sync propagates a changed central studio and leaves current ones alone", () => {
  const { skillDir, ws } = setup();
  register(ws, { skillDir });
  assert.equal(syncAll({ skillDir })[0].state, "current");
  fs.writeFileSync(path.join(skillDir, "studio.html"), "<!doctype html>\n<html>\n<head>\n<title>v2</title>\n</head></html>");
  assert.equal(syncAll({ skillDir })[0].state, "updated");
  assert.match(fs.readFileSync(path.join(ws, "studio.html"), "utf8"), /v2/);
});

test("a moved workspace is recognised by its id; the old path reports missing until re-registered", () => {
  const { root, skillDir, ws } = setup();
  register(ws, { skillDir });
  const moved = path.join(root, "renamed");
  fs.renameSync(ws, moved);
  assert.equal(syncAll({ skillDir })[0].state, "missing");
  const r = register(moved, { skillDir });
  assert.equal(r.moved, ws);
  assert.equal(syncAll({ skillDir }).length, 1);
  assert.equal(syncAll({ skillDir })[0].state, "current");
});

test("a different workspace at a registered path is reported, not overwritten", () => {
  const { skillDir, ws } = setup();
  register(ws, { skillDir });
  fs.writeFileSync(path.join(ws, "workspace.json"), JSON.stringify({ workspaceId: "00000000-0000-4000-8000-000000000000" }));
  assert.equal(syncAll({ skillDir })[0].state, "mismatch");
});

test("forget removes only the list entry", () => {
  const { skillDir, ws } = setup();
  register(ws, { skillDir });
  assert.equal(forget(ws, { skillDir }), 1);
  assert.ok(fs.existsSync(path.join(ws, "workspace.json")));
});

test("stampPage replaces an old stamp and rejects non-uuid ids", () => {
  const a = stampPage("<head></head>", "11111111-1111-4111-8111-111111111111");
  const b = stampPage(a, "22222222-2222-4222-8222-222222222222");
  assert.equal((b.match(/workspace-id/g) || []).length, 1);
  assert.throws(() => stampPage("<head>", '"><script>'));
});

test("stampPage sets the version the update dot compares against; the central page keeps the archive placeholder", () => {
  const central = fs.readFileSync(new URL("../studio.html", import.meta.url), "utf8");
  assert.match(central, /<meta name="studio-version" content="\$Format:%cI\$">/, "central page must carry the git-archive placeholder");
  assert.match(fs.readFileSync(new URL("../.gitattributes", import.meta.url), "utf8"), /^studio\.html export-subst/m);
  const page = stampPage(central, "11111111-1111-4111-8111-111111111111", "2026-10-09T13:01:33+02:00");
  assert.match(page, /<meta name="studio-version" content="2026-10-09T13:01:33\+02:00">/);
  assert.doesNotMatch(page, /\$Format/);
  assert.match(stampPage(central, "11111111-1111-4111-8111-111111111111", null), /\$Format:%cI\$/, "no git: the placeholder stays, and the page skips the check");
});

test("sync writes double-click launchers next to the studio, for Mac and Windows", () => {
  const { skillDir, ws } = setup();
  register(ws, { skillDir });
  const mac = fs.readFileSync(path.join(ws, "Open Post Studio.command"), "utf8");
  const win = fs.readFileSync(path.join(ws, "Open Post Studio.cmd"), "utf8");
  assert.match(mac, /^#!\/bin\/(ba)?sh/);
  for (const b of ["Google Chrome", "Microsoft Edge", "Brave Browser", "Arc"]) assert.ok(mac.includes(b), b);
  assert.ok(fs.statSync(path.join(ws, "Open Post Studio.command")).mode & 0o100, "executable");
  for (const b of ["chrome", "msedge", "brave"]) assert.ok(win.includes(b), b);
  assert.ok(win.includes("%~dp0studio.html"));
  assert.ok(!mac.includes(ws), "launcher is relative, so a moved folder still works");
});

test("a workspace that cannot be written is reported and does not stop the others", () => {
  const { skillDir, ws, root } = setup();
  register(ws, { skillDir });
  const ws2 = path.join(root, "Second");
  fs.mkdirSync(ws2);
  fs.writeFileSync(path.join(ws2, "workspace.json"), JSON.stringify({ version: 1, brand: { name: "Second" } }) + "\n");
  register(ws2, { skillDir });
  fs.writeFileSync(path.join(skillDir, "studio.html"), "<!doctype html>\n<html>\n<head>\n<title>v3</title>\n</head></html>");
  fs.chmodSync(ws, 0o500);
  try {
    const states = syncAll({ skillDir }).map((r) => r.state);
    assert.deepEqual(states, ["unwritable", "updated"]);
  } finally { fs.chmodSync(ws, 0o700); }
});
