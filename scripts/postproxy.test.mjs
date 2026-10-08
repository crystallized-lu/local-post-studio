import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  toUtcIso,
  validatePost,
  selectPosts,
  buildForm,
  sanitizeCaption,
  cmdSchedule,
} from "./postproxy.mjs";

function mkWorkspace(posts, extra = {}) {
  return {
    version: 1,
    timezone: "Europe/Luxembourg",
    brand: { name: "Test Brand" },
    templates: [],
    posts,
    ...extra,
  };
}

function makeTempWorkspaceDir(ws, exportIds = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pps-test-"));
  fs.writeFileSync(path.join(dir, "workspace.json"), JSON.stringify(ws, null, 2) + "\n");
  fs.mkdirSync(path.join(dir, "exports"), { recursive: true });
  for (const id of exportIds) {
    fs.writeFileSync(path.join(dir, "exports", `${id}.png`), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  }
  return dir;
}

// ---------------------------------------------------------------------------
// toUtcIso — DST correctness
// ---------------------------------------------------------------------------

test("toUtcIso: summer (CEST, UTC+2) converts correctly", () => {
  const iso = toUtcIso("2027-06-23", "09:00", "Europe/Luxembourg");
  assert.equal(iso, "2027-06-23T07:00:00.000Z");
});

test("toUtcIso: winter (CET, UTC+1) converts correctly", () => {
  const iso = toUtcIso("2026-12-01", "09:00", "Europe/Luxembourg");
  assert.equal(iso, "2026-12-01T08:00:00.000Z");
});

// ---------------------------------------------------------------------------
// validatePost
// ---------------------------------------------------------------------------

test("validatePost: rejects a past date/time", () => {
  const result = validatePost(
    { date: "2020-01-01", time: "09:00", platforms: ["instagram"], caption: "hi" },
    "Europe/Luxembourg",
    new Date("2026-10-02T00:00:00Z")
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /not in the future/.test(e)));
});

test("validatePost: accepts a future date/time with valid platforms/caption", () => {
  const result = validatePost(
    { date: "2027-06-23", time: "09:00", platforms: ["instagram"], caption: "hello" },
    "Europe/Luxembourg",
    new Date("2026-10-02T00:00:00Z")
  );
  assert.equal(result.ok, true);
  assert.equal(result.utcIso, "2027-06-23T07:00:00.000Z");
});

test("validatePost: rejects caption too long for x/twitter", () => {
  const longCaption = "a".repeat(281);
  const result = validatePost(
    { date: "2027-06-23", time: "09:00", platforms: ["x"], caption: longCaption },
    "Europe/Luxembourg",
    new Date("2026-10-02T00:00:00Z")
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /exceeds x limit/.test(e)));
});

test("validatePost: rejects when no platforms selected", () => {
  const result = validatePost(
    { date: "2027-06-23", time: "09:00", platforms: [], caption: "hi" },
    "Europe/Luxembourg",
    new Date("2026-10-02T00:00:00Z")
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /no platforms/.test(e)));
});

test("validatePost: strips control characters from caption but keeps newlines", () => {
  const dirty = "line one\nline\x07two\x00!\x1Bend";
  const result = validatePost(
    { date: "2027-06-23", time: "09:00", platforms: ["instagram"], caption: dirty },
    "Europe/Luxembourg",
    new Date("2026-10-02T00:00:00Z")
  );
  assert.equal(result.caption, "line one\nlinetwo!end");
});

test("sanitizeCaption: strips control chars except \\n", () => {
  assert.equal(sanitizeCaption("a\x00b\x01c\nd\x7Fe"), "abc\nde");
});

// ---------------------------------------------------------------------------
// selectPosts
// ---------------------------------------------------------------------------

test("selectPosts: skips posts without an export or already scheduled", () => {
  const posts = [
    { id: "p1", status: "approved" }, // no export -> excluded
    { id: "p2", status: "approved" }, // has export -> included
    { id: "p3", status: "exported" }, // has export -> included
    { id: "p4", status: "approved", postproxy: { id: "already-sent" } }, // excluded
    { id: "p5", status: "draft" }, // wrong status -> excluded
  ];
  const exportedIds = new Set(["p2", "p3", "p4"]);
  const hasExport = (id) => exportedIds.has(id);
  const selected = selectPosts(posts, hasExport).map((p) => p.id);
  assert.deepEqual(selected, ["p2", "p3"]);
});

// ---------------------------------------------------------------------------
// buildForm
// ---------------------------------------------------------------------------

test("buildForm: builds multipart form with body, scheduled_at, profiles[] and media[]", () => {
  const post = { id: "p1", caption: "hello\nworld", platforms: ["instagram", "linkedin"] };
  const form = buildForm(post, "2027-06-23T07:00:00.000Z", Buffer.from("fake-png"), "p1.png");
  assert.ok(form instanceof FormData);
  assert.equal(form.get("post[body]"), "hello\nworld");
  assert.equal(form.get("post[scheduled_at]"), "2027-06-23T07:00:00.000Z");
  assert.deepEqual(form.getAll("profiles[]"), ["instagram", "linkedin"]);
  const media = form.get("media[]");
  assert.ok(media instanceof Blob);
});

// ---------------------------------------------------------------------------
// cmdSchedule — dry run vs --send, using a stubbed fetch
// ---------------------------------------------------------------------------

test("cmdSchedule: dry run makes no fetch calls", async (t) => {
  const ws = mkWorkspace([
    {
      id: "post-a",
      status: "approved",
      date: "2027-06-23",
      time: "09:00",
      platforms: ["instagram"],
      caption: "hello",
    },
  ]);
  const dir = makeTempWorkspaceDir(ws, ["post-a"]);

  let called = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    called = true;
    throw new Error("fetch should not be called in dry-run mode");
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const result = await cmdSchedule(dir, { send: false });
  assert.equal(called, false);
  assert.equal(result.sent, 0);
  assert.equal(result.dryRun, 1);
});

test("cmdSchedule: --send writes postproxy.id back to workspace.json", async (t) => {
  const ws = mkWorkspace([
    {
      id: "post-b",
      status: "approved",
      date: "2027-06-23",
      time: "09:00",
      platforms: ["instagram"],
      caption: "hello",
    },
  ]);
  const dir = makeTempWorkspaceDir(ws, ["post-b"]);

  const originalFetch = globalThis.fetch;
  const originalKey = process.env.POSTPROXY_API_KEY;
  process.env.POSTPROXY_API_KEY = "test-key-not-real";
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "https://api.postproxy.dev/api/posts");
    assert.equal(options.headers.Authorization, "Bearer test-key-not-real");
    return {
      ok: true,
      json: async () => ({ id: "pp-123", status: "scheduled" }),
    };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.POSTPROXY_API_KEY;
    else process.env.POSTPROXY_API_KEY = originalKey;
  });

  const result = await cmdSchedule(dir, { send: true });
  assert.equal(result.sent, 1);

  const written = JSON.parse(fs.readFileSync(path.join(dir, "workspace.json"), "utf8"));
  const post = written.posts.find((p) => p.id === "post-b");
  assert.equal(post.postproxy.id, "pp-123");
  assert.equal(post.postproxy.status, "scheduled");
  assert.ok(post.postproxy.checkedAt);
  assert.equal(post.status, "scheduled");
  // 2-space formatting preserved
  const raw = fs.readFileSync(path.join(dir, "workspace.json"), "utf8");
  assert.ok(raw.startsWith('{\n  "version"'));
});

test("cmdSchedule: without --send, requireKey is never invoked (no key needed)", async () => {
  const ws = mkWorkspace([
    {
      id: "post-c",
      status: "exported",
      date: "2027-06-23",
      time: "09:00",
      platforms: ["instagram"],
      caption: "hello",
    },
  ]);
  const dir = makeTempWorkspaceDir(ws, ["post-c"]);
  const originalKey = process.env.POSTPROXY_API_KEY;
  delete process.env.POSTPROXY_API_KEY;
  try {
    const result = await cmdSchedule(dir, { send: false });
    assert.equal(result.dryRun, 1);
  } finally {
    if (originalKey !== undefined) process.env.POSTPROXY_API_KEY = originalKey;
  }
});

import { readKey, cmdLogin, KEYCHAIN } from "./postproxy.mjs";

test("readKey: env var wins and the keychain is not touched", () => {
  let called = false;
  const key = readKey({ env: { POSTPROXY_API_KEY: " k1 " }, platform: "darwin", run: () => { called = true; } });
  assert.equal(key, "k1");
  assert.equal(called, false);
});

test("readKey: macOS reads the generic password for our service/account", () => {
  let seen;
  const key = readKey({ env: {}, platform: "darwin", run: (cmd, args) => { seen = [cmd, args]; return { status: 0, stdout: "secret\n" }; } });
  assert.equal(key, "secret");
  assert.deepEqual(seen, ["security", ["find-generic-password", "-s", KEYCHAIN.service, "-a", KEYCHAIN.account, "-w"]]);
});

test("readKey: missing keychain item gives empty string; Windows falls back to env only", () => {
  assert.equal(readKey({ env: {}, platform: "linux", run: () => ({ status: 1, stdout: "" }) }), "");
  assert.equal(readKey({ env: {}, platform: "win32", run: () => { throw new Error("should not run"); } }), "");
});

test("cmdLogin: key is never passed as an argument (tool prompts for it)", () => {
  let seen;
  cmdLogin({ platform: "darwin", run: (cmd, args, opts) => { seen = { cmd, args, opts }; return { status: 0 }; } });
  assert.equal(seen.cmd, "security");
  assert.equal(seen.args.at(-1), "-w");
  assert.equal(seen.opts.stdio, "inherit");
});

// ---------------------------------------------------------------------------
// carousels: post.slides
// ---------------------------------------------------------------------------

import { exportNames, slideCount, CAROUSEL_LIMITS } from "./postproxy.mjs";

const carousel = (n, extra = {}) => ({
  id: "2027-01-05-trip", date: "2099-01-05", time: "10:00", platforms: ["instagram"], caption: "Hello",
  status: "exported", template: "t", fields: {}, slides: Array.from({ length: n - 1 }, () => ({ template: "t", fields: {} })), ...extra,
});

test("exportNames: one file for a single post, numbered files for a carousel, in slide order", () => {
  assert.equal(slideCount({ id: "a" }), 1);
  assert.deepEqual(exportNames({ id: "a" }), ["a.png"]);
  assert.deepEqual(exportNames({ id: "a", slides: [] }), ["a.png"]);
  assert.deepEqual(exportNames({ id: "a b", slides: [{}, {}] }), ["a-b-1.png", "a-b-2.png", "a-b-3.png"]);
});

test("buildForm: a carousel sends every picture as repeated media[] in order", () => {
  const form = buildForm({ id: "p", caption: "c", platforms: ["instagram"] }, "2099-01-05T09:00:00.000Z",
    [1, 2, 3].map((n) => ({ buffer: Buffer.from("png" + n), filename: `p-${n}.png` })));
  assert.deepEqual(form.getAll("media[]").map((f) => f.name), ["p-1.png", "p-2.png", "p-3.png"]);
});

test("validatePost: Instagram carousels stop at the limit; other platforms get a warning, not a block", () => {
  const ok = validatePost(carousel(CAROUSEL_LIMITS.instagram), "Europe/Luxembourg", new Date("2098-01-01"));
  assert.equal(ok.ok, true); assert.deepEqual(ok.warnings, []);
  const tooMany = validatePost(carousel(CAROUSEL_LIMITS.instagram + 1), "Europe/Luxembourg", new Date("2098-01-01"));
  assert.equal(tooMany.ok, false); assert.match(tooMany.errors.join(), /carousel limit/);
  const li = validatePost(carousel(3, { platforms: ["linkedin"] }), "Europe/Luxembourg", new Date("2098-01-01"));
  assert.equal(li.ok, true); assert.match(li.warnings.join(), /linkedin/);
  assert.deepEqual(validatePost({ ...carousel(1), platforms: ["linkedin"] }, "Europe/Luxembourg", new Date("2098-01-01")).warnings, []);
});

test("cmdSchedule: a carousel needs every slide's PNG, then sends them all in order", async (t) => {
  const post = carousel(3);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pps-car-"));
  fs.writeFileSync(path.join(dir, "workspace.json"), JSON.stringify(mkWorkspace([post])));
  fs.mkdirSync(path.join(dir, "exports"));
  fs.writeFileSync(path.join(dir, "exports", "2027-01-05-trip-1.png"), "one");
  fs.writeFileSync(path.join(dir, "exports", "2027-01-05-trip-2.png"), "two");
  const logs = []; const log = console.log; console.log = (...a) => logs.push(a.join(" "));
  try {
    const r = await cmdSchedule(dir, { send: false });
    assert.equal(r.dryRun ?? 0, 0, "slide 3 is missing, so nothing is eligible");
    fs.writeFileSync(path.join(dir, "exports", "2027-01-05-trip-3.png"), "three");
    const r2 = await cmdSchedule(dir, { send: false });
    assert.equal(r2.dryRun, 1);
    assert.match(logs.join("\n"), /slides=3/);
  } finally { console.log = log; }

  let seen;
  const realFetch = globalThis.fetch;
  process.env.POSTPROXY_API_KEY = "test-key";
  globalThis.fetch = async (url, init) => { seen = init.body; return new Response(JSON.stringify({ id: "pp1", status: "scheduled" }), { status: 200 }); };
  t.after(() => { globalThis.fetch = realFetch; delete process.env.POSTPROXY_API_KEY; });
  console.log = () => {};
  try { await cmdSchedule(dir, { send: true }); } finally { console.log = log; }
  assert.deepEqual(seen.getAll("media[]").map((f) => f.name), ["2027-01-05-trip-1.png", "2027-01-05-trip-2.png", "2027-01-05-trip-3.png"]);
});
