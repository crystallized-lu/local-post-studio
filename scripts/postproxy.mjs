#!/usr/bin/env node
// postproxy.mjs — schedule/monitor workspace.json posts on PostProxy.
//
// API shape verified against https://postproxy.dev/reference/posts/ and
// https://postproxy.dev/reference/profiles/ (fetched 2026-10-02). No live
// API key was available in this environment, so the request/response shapes
// below are doc-verified but NOT exercised against the real API. Noted
// uncertainty:
//   - Multipart field names use Rails-style bracket notation: `post[body]`,
//     `post[scheduled_at]`, repeated `profiles[]` and `media[]` fields. Docs
//     also describe a JSON body shape (`{"post": {...}, "profiles": [...]}`)
//     but only multipart supports raw file uploads for `media[]`, which is
//     what this script needs (PNG export files), so multipart is used.
//   - `scheduled_at` is documented as UTC ISO 8601 (e.g.
//     `2024-01-16T09:00:00.000Z`); this script always converts to UTC before
//     sending.
//   - POST /api/posts response: `{ id, body, status, scheduled_at,
//     created_at, platforms: [{ platform, profile_id, profile_name, status,
//     error, params, permalink, attempted_at }] }`.
//   - GET /api/posts/:id response adds `media` and `thread` arrays; platform
//     entries carry the same `status`/`error` fields used here.
//   - GET /api/profiles returns `{ data: [{ id, name, username, platform,
//     platform_id, status, profile_group_id, post_count, avatar_url,
//     platform_url }] }`.
//   - Per the project's architecture.md, PostProxy sends no CORS headers, so
//     this script (run in Node, not a browser) is the intended caller.

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const API_BASE = "https://api.postproxy.dev/api";

/** Export filename for a post id. Must match fileId() in studio.html; also keeps ids from escaping exports/. */
export const exportName = (id) => (String(id).replace(/[^a-z0-9_-]/gi, "-").slice(0, 80) || "post") + ".png";

/** Number of pictures a post sends: the post itself plus post.slides (a carousel). */
export const slideCount = (post) => 1 + (Array.isArray(post && post.slides) ? post.slides.length : 0);

/** Export files for a post, in slide order: <id>.png for one slide, <id>-1.png, <id>-2.png… for a carousel. Must match exportFile() in studio.html. */
export function exportNames(post) {
  const n = slideCount(post);
  if (n === 1) return [exportName(post.id)];
  const base = exportName(post.id).replace(/\.png$/, "");
  return Array.from({ length: n }, (_, i) => `${base}-${i + 1}.png`);
}

/** Most pictures one post may carry, per platform. Instagram: PostProxy's Instagram page says carousels take up to 10 images. */
export const CAROUSEL_LIMITS = { instagram: 10 };
/** Platforms where PostProxy's docs do not confirm multi-image posts (checked 2026-10-08): the dry run warns instead of blocking. */
export const CAROUSEL_UNVERIFIED = ["linkedin", "facebook", "threads", "bluesky", "x", "twitter", "tiktok"];

export const PLATFORM_LIMITS = {
  instagram: 2200,
  linkedin: 3000,
  facebook: 63206,
  x: 280,
  twitter: 280,
  threads: 500,
  bluesky: 300,
  tiktok: 2200,
};

const DEFAULT_TIMEZONE = "Europe/Luxembourg";

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** Strip control characters from a caption, keeping \n. */
export function sanitizeCaption(caption) {
  if (typeof caption !== "string") return "";
  // eslint-disable-next-line no-control-regex
  return caption.replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

function getOffsetMinutes(timeZone, date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
    hour: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value || "GMT+00:00";
  const m = tzPart.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
}

/**
 * Convert a local "YYYY-MM-DD" + "HH:MM" wall-clock time in `timezone` to a
 * UTC ISO 8601 string, DST-correct, using only Intl + stdlib.
 */
export function toUtcIso(dateStr, timeStr, timezone = DEFAULT_TIMEZONE) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeStr || "");
  if (!dateMatch || !timeMatch) {
    throw new Error(`invalid date/time: ${dateStr} ${timeStr}`);
  }
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  // Iterate to converge on the correct offset (handles DST transitions).
  let guessUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 3; i++) {
    const offsetMinutes = getOffsetMinutes(timezone, new Date(guessUtcMs));
    const nextGuess = Date.UTC(year, month - 1, day, hour, minute, 0) - offsetMinutes * 60000;
    if (nextGuess === guessUtcMs) break;
    guessUtcMs = nextGuess;
  }
  return new Date(guessUtcMs).toISOString();
}

/**
 * Validate a post for scheduling. Returns { ok, errors, utcIso, caption }.
 * `caption` is the sanitized caption (control chars stripped, \n kept).
 */
export function validatePost(post, timezone = DEFAULT_TIMEZONE, now = new Date()) {
  const errors = [];
  const caption = sanitizeCaption(post && post.caption);

  let utcIso = null;
  if (!post || !post.date || !post.time) {
    errors.push("missing date or time");
  } else {
    try {
      utcIso = toUtcIso(post.date, post.time, timezone);
      if (new Date(utcIso).getTime() <= now.getTime()) {
        errors.push("scheduled time is not in the future");
      }
    } catch (err) {
      errors.push(`invalid date/time: ${err.message}`);
    }
  }

  const platforms = Array.isArray(post && post.platforms) ? post.platforms : [];
  if (platforms.length === 0) {
    errors.push("no platforms selected");
  }
  for (const platform of platforms) {
    const limit = PLATFORM_LIMITS[platform];
    if (limit === undefined) {
      errors.push(`unknown platform: ${platform}`);
      continue;
    }
    if (caption.length > limit) {
      errors.push(`caption exceeds ${platform} limit (${caption.length}/${limit})`);
    }
  }

  const slides = slideCount(post);
  const warnings = [];
  if (slides > 1) {
    for (const platform of platforms) {
      const max = CAROUSEL_LIMITS[platform];
      if (max !== undefined && slides > max) errors.push(`${slides} slides exceeds the ${platform} carousel limit (${max})`);
      if (CAROUSEL_UNVERIFIED.includes(platform)) warnings.push(`${platform}: multi-image posts are not confirmed in PostProxy's docs; the platform may take only some slides or refuse`);
    }
  }

  return { ok: errors.length === 0, errors, warnings, utcIso, caption };
}

/**
 * Select posts eligible for scheduling: status approved|exported, an
 * exports/<id>.png present (via hasExport(id) => bool), and no
 * postproxy.id yet.
 */
export function selectPosts(posts, hasExport) {
  return (posts || []).filter((post) => {
    if (!post || !post.id) return false;
    if (post.status !== "approved" && post.status !== "exported") return false;
    if (post.postproxy && post.postproxy.id) return false;
    return hasExport(post.id);
  });
}

/** Build the multipart FormData body for POST /api/posts. */
export function buildForm(post, utcIso, imageBuffer, imageFilename) {
  const form = new FormData();
  form.append("post[body]", sanitizeCaption(post.caption));
  if (utcIso) form.append("post[scheduled_at]", utcIso);
  for (const platform of post.platforms || []) {
    form.append("profiles[]", platform);
  }
  // One picture, or a carousel: an array of { buffer, filename } in slide order (media[] repeats, order is kept).
  const files = Array.isArray(imageBuffer) ? imageBuffer : imageBuffer ? [{ buffer: imageBuffer, filename: imageFilename || `${post.id}.png` }] : [];
  for (const f of files) form.append("media[]", new Blob([f.buffer], { type: "image/png" }), f.filename);
  return form;
}

// ---------------------------------------------------------------------------
// Key / I/O helpers
// ---------------------------------------------------------------------------

// The API key lives in the operating system's keychain (macOS Keychain, or the
// Secret Service keyring on Linux via `secret-tool`). `login` stores it through
// the keychain tool's own hidden prompt, so it never appears in argv, a file or
// shell history. POSTPROXY_API_KEY in the environment overrides it (CI, Windows).
export const KEYCHAIN = { service: "local-post-studio", account: "postproxy" };

export function readKey({ env = process.env, platform = process.platform, run = spawnSync } = {}) {
  if (env.POSTPROXY_API_KEY) return env.POSTPROXY_API_KEY.trim();
  const { service, account } = KEYCHAIN;
  const cmd =
    platform === "darwin" ? ["security", ["find-generic-password", "-s", service, "-a", account, "-w"]]
    : platform === "linux" ? ["secret-tool", ["lookup", "service", service, "account", account]]
    : null;
  if (!cmd) return "";
  const r = run(cmd[0], cmd[1], { encoding: "utf8" });
  return r.status === 0 ? String(r.stdout).trim() : "";
}

export function requireKey(opts) {
  const key = readKey(opts);
  if (!key) {
    throw new Error(
      "No PostProxy API key found. Run `node scripts/postproxy.mjs login` to store it in your keychain " +
        "(or, on Windows, set POSTPROXY_API_KEY in your shell)."
    );
  }
  return key;
}

export function cmdLogin({ platform = process.platform, run = spawnSync } = {}) {
  const { service, account } = KEYCHAIN;
  const label = "PostProxy API key (Local Post Studio)";
  const cmd =
    // `-w` last with no value makes `security` prompt for the secret without echoing it.
    platform === "darwin" ? ["security", ["add-generic-password", "-U", "-s", service, "-a", account, "-l", label, "-w"]]
    : platform === "linux" ? ["secret-tool", ["store", `--label=${label}`, "service", service, "account", account]]
    : null;
  if (!cmd) {
    console.log("No keychain tool on this system. Set POSTPROXY_API_KEY in your shell instead.");
    return false;
  }
  console.log("Paste your PostProxy API key when asked (it won't be shown).");
  const r = run(cmd[0], cmd[1], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("The keychain did not save the key.");
  console.log("Saved in your keychain. Check it works with: node scripts/postproxy.mjs profiles <workspace-dir>");
  return true;
}

function readWorkspace(workspaceDir) {
  const wsPath = path.join(workspaceDir, "workspace.json");
  const raw = fs.readFileSync(wsPath, "utf8");
  return { wsPath, ws: JSON.parse(raw) };
}

function writeWorkspaceAtomic(wsPath, ws) {
  const dir = path.dirname(wsPath);
  const tmpPath = path.join(dir, `.workspace.json.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(tmpPath, JSON.stringify(ws, null, 2) + "\n", "utf8");
  fs.renameSync(tmpPath, wsPath);
}

function printTable(headers, rows) {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[i] ?? "").length))
  );
  const fmt = (row) => row.map((cell, i) => String(cell ?? "").padEnd(widths[i])).join("  ");
  console.log(fmt(headers));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const row of rows) console.log(fmt(row));
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export async function cmdProfiles() {
  const key = requireKey();
  const res = await fetch(`${API_BASE}/profiles`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!res.ok) {
    throw new Error(`profiles request failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.data || [];
  const rows = list.map((p) => [p.platform, p.username || p.name || "", p.id]);
  printTable(["platform", "name", "id"], rows);
  return list;
}

export async function cmdSchedule(workspaceDir, { send = false, only = null } = {}) {
  const { wsPath, ws } = readWorkspace(workspaceDir);
  const timezone = ws.timezone || DEFAULT_TIMEZONE;
  const byId = new Map((ws.posts || []).map((p) => [p.id, p]));
  // every slide's picture must exist, not just the first
  const hasExport = (id) => exportNames(byId.get(id)).every((f) => fs.existsSync(path.join(workspaceDir, "exports", f)));

  let candidates = selectPosts(ws.posts || [], hasExport);
  if (only) candidates = candidates.filter((p) => p.id === only);

  const now = new Date();
  const checked = candidates.map((post) => ({ post, v: validatePost(post, timezone, now) }));
  const invalid = checked.filter((c) => !c.v.ok);
  const valid = checked.filter((c) => c.v.ok);

  for (const { post, v } of invalid) {
    console.log(`SKIP  ${post.id}  ${v.errors.join("; ")}`);
  }
  for (const { post, v } of valid) {
    for (const w of v.warnings) console.log(`WARN  ${post.id}  ${w}`);
  }

  if (!send) {
    for (const { post, v } of valid) {
      console.log(
        `DRY-RUN  ${post.id}  platforms=${(post.platforms || []).join(",")}  at=${v.utcIso}${slideCount(post) > 1 ? `  slides=${slideCount(post)}` : ""}  (use --send to submit)`
      );
    }
    return { sent: 0, skipped: invalid.length, dryRun: valid.length };
  }

  const key = requireKey();
  let sentCount = 0;
  for (const { post, v } of valid) {
    const files = exportNames(post).map((filename) => ({ filename, buffer: fs.readFileSync(path.join(workspaceDir, "exports", filename)) }));
    const form = buildForm(post, v.utcIso, files);
    let res;
    try {
      res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      });
    } catch (err) {
      console.log(`FAIL  ${post.id}  ${err.message}`);
      continue;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.log(`FAIL  ${post.id}  HTTP ${res.status} ${text}`);
      continue;
    }
    const data = await res.json();
    post.postproxy = {
      id: data.id,
      status: data.status,
      checkedAt: new Date().toISOString(),
    };
    post.status = "scheduled";
    sentCount++;
    console.log(`SENT  ${post.id}  -> ${data.id} (${data.status})`);
  }

  if (sentCount > 0) writeWorkspaceAtomic(wsPath, ws);
  return { sent: sentCount, skipped: invalid.length };
}

function derivePostStatus(platforms) {
  if (!platforms || platforms.length === 0) return { status: "scheduled", error: null };
  const allPublished = platforms.every((p) => p.status === "published");
  if (allPublished) return { status: "published", error: null };
  const failed = platforms.filter((p) => p.status === "failed");
  if (failed.length > 0) {
    const error = failed.map((p) => `${p.platform}: ${p.error || "unknown error"}`).join("; ");
    return { status: "failed", error };
  }
  return { status: "scheduled", error: null };
}

export async function cmdStatus(workspaceDir, { only = null } = {}) {
  const { wsPath, ws } = readWorkspace(workspaceDir);
  const key = requireKey();

  let posts = (ws.posts || []).filter((p) => p.postproxy && p.postproxy.id);
  if (only) posts = posts.filter((p) => p.id === only);

  const rows = [];
  let changed = false;
  for (const post of posts) {
    const res = await fetch(`${API_BASE}/posts/${post.postproxy.id}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      rows.push([post.id, post.postproxy.id, "HTTP_ERROR", String(res.status)]);
      continue;
    }
    const data = await res.json();
    post.postproxy.status = data.status;
    post.postproxy.checkedAt = new Date().toISOString();
    const { status: mapped, error } = derivePostStatus(data.platforms);
    post.status = mapped;
    if (error) post.postproxy.error = error;
    else delete post.postproxy.error;
    changed = true;
    rows.push([post.id, post.postproxy.id, post.status, data.status]);
  }

  if (changed) writeWorkspaceAtomic(wsPath, ws);
  printTable(["post", "postproxy_id", "status", "remote_status"], rows);
  return rows;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const [cmd, workspaceDir, ...rest] = argv;
  const send = rest.includes("--send");
  const onlyIdx = rest.indexOf("--only");
  const only = onlyIdx !== -1 ? rest[onlyIdx + 1] : null;
  return { cmd, workspaceDir, send, only };
}

async function main() {
  const { cmd, workspaceDir, send, only } = parseArgs(process.argv.slice(2));
  if (cmd === "login") {
    try { cmdLogin(); } catch (err) { console.error(`Error: ${err.message}`); process.exitCode = 1; }
    return;
  }
  if (!cmd || !workspaceDir) {
    console.error(
      "Usage: node scripts/postproxy.mjs login\n       node scripts/postproxy.mjs <profiles|schedule|status> <workspace-dir> [--send] [--only <post-id>]"
    );
    process.exitCode = 1;
    return;
  }
  try {
    if (cmd === "profiles") {
      await cmdProfiles();
    } else if (cmd === "schedule") {
      await cmdSchedule(workspaceDir, { send, only });
    } else if (cmd === "status") {
      await cmdStatus(workspaceDir, { only });
    } else {
      console.error(`Unknown command: ${cmd}`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exitCode = 1;
  }
}

// pathToFileURL encodes spaces etc., so this also works from folders like "Social Media Planning".
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
