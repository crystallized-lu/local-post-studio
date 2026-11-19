#!/usr/bin/env node
// git-sync.mjs: keep one workspace in step with its mirror in this repo, so
// the workspace can be edited from anywhere (an OpenWebUI session committing
// through a PR while the M1 is asleep) and merged back next time this runs.
//
//   node scripts/git-sync.mjs <workspace-folder> [--mirror remote-workspaces/<name>]
//
// What syncs: workspace.json only — templates, posts, brand tokens, calendar.
// What stays local: fonts/, images/, exports/ (binary; the studio and the local
// agent own those; away-hours sessions reference photos by https URL).
//
// Merge model, three-way with the last agreed copy as the base
// (workspace.json.bak-gitsync-base in the workspace folder):
//   - posts merge by id, field by field; status/sent/exported/postproxy prefer
//     the repo copy (away-hours scheduling/export state), everything else the
//     studio copy (human edits at the sliders);
//   - other keys: the side that changed since the base wins; changed on both
//     sides keeps the studio copy and is reported;
//   - nothing is dropped silently: every two-sided change is listed at the
//     end, and workspace.json.bak-pre-gitsync holds the pre-run studio copy.
// The script refuses to run while the repo has other uncommitted changes, and
// never commits anything but the mirror file.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Fields whose truth lives away from the studio (scheduling, export state).
const REMOTE_WINS = new Set(["status", "sent", "exported", "postproxy"]);

function die(msg) { console.error(`Error: ${msg}`); process.exit(1); }
function git(args) {
  try { return execFileSync("git", ["-C", SKILL_DIR, ...args], { encoding: "utf8" }); }
  catch (e) { die(`git ${args.join(" ")} failed: ${(e.stderr || e.message || "").toString().split("\n")[0]}`); }
}
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
function writeAtomic(file, text) { const tmp = `${file}.tmp-${process.pid}`; fs.writeFileSync(tmp, text); fs.renameSync(tmp, file); }
const pretty = (v) => JSON.stringify(v, null, 2) + "\n";

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v).sort()) o[k] = sortKeys(v[k]); return o; }
  return v;
}
const stable = (v) => JSON.stringify(sortKeys(v));
const eq = (a, b) => stable(a) === stable(b);

/** One value: three-way against the base, reported when both sides changed. */
function mergeValue(where, local, remote, base, report, remoteWins = false) {
  if (eq(local, remote)) return local;
  const lc = !eq(local, base), rc = !eq(remote, base);
  if (lc && rc) {
    report.push(`${where}: changed in the studio and in the repo; kept the ${remoteWins ? "repo" : "studio"} copy`);
    return remoteWins ? remote : local;
  }
  return rc ? remote : local;
}

/** posts: union by id; shared ids merge field by field. */
function mergePosts(localPosts, remotePosts, basePosts, report) {
  const byId = (arr) => Object.fromEntries((arr || []).map((p) => [p.id, p]));
  const L = byId(localPosts), R = byId(remotePosts), B = byId(basePosts);
  const out = Object.keys(L).map((id) => L[id]);
  for (const id of Object.keys(R)) if (!(id in L)) out.push(R[id]); // added away from the studio
  for (let i = 0; i < out.length; i++) {
    const l = out[i], r = R[l.id];
    if (!r || eq(l, r)) continue;
    const b = B[l.id] ?? r; // no base entry: treat the repo copy as the base, so studio edits win
    const merged = {};
    for (const k of new Set([...Object.keys(l), ...Object.keys(r)]))
      merged[k] = mergeValue(`post ${l.id}.${k}`, l[k], r[k], b?.[k], report, REMOTE_WINS.has(k));
    out[i] = merged;
  }
  return out;
}

/** Whole workspace: posts by id, other keys three-way. */
export function mergeWorkspace(local, remote, base, report = []) {
  const merged = { ...local };
  for (const key of new Set([...Object.keys(local), ...Object.keys(remote), ...Object.keys(base)])) {
    if (key === "posts") { merged.posts = mergePosts(local[key], remote[key], base[key], report); continue; }
    if (!(key in remote)) { if (key in base) delete merged[key]; continue; } // deleted away from the studio
    if (!(key in local)) { merged[key] = remote[key]; continue; } // added away from the studio
    merged[key] = mergeValue(key, local[key], remote[key], base[key], report);
  }
  return merged;
}

function main() {
  const argv = process.argv.slice(2);
  const mi = argv.indexOf("--mirror");
  const folderArg = argv.find((a, i) => i !== mi && i !== mi + 1 && !a.startsWith("--"));
  if (!folderArg) die("Usage: node scripts/git-sync.mjs <workspace-folder> [--mirror remote-workspaces/<name>]");
  const folder = path.resolve(folderArg);
  const wsFile = path.join(folder, "workspace.json");
  if (!fs.existsSync(wsFile)) die(`no workspace.json in ${folder}`);
  const mirrorRel = (mi >= 0 ? argv[mi + 1] : `remote-workspaces/${path.basename(folder)}`).split(path.sep).join("/");
  const mirrorFile = path.join(SKILL_DIR, ...mirrorRel.split("/"));
  const preFile = path.join(folder, "workspace.json.bak-pre-gitsync");
  const baseFile = path.join(folder, "workspace.json.bak-gitsync-base");

  if (git(["status", "--porcelain"]).trim()) die("the repo has uncommitted changes; commit or stash them first");
  git(["pull", "--rebase"]); // merged away-hours PRs land here

  const local = readJson(wsFile);
  const name = local.brand?.name || path.basename(folder);

  if (!fs.existsSync(mirrorFile)) { // first run: mirror, don't merge
    fs.copyFileSync(wsFile, preFile);
    fs.mkdirSync(path.dirname(mirrorFile), { recursive: true });
    writeAtomic(mirrorFile, pretty(local));
    git(["add", `${mirrorRel}/workspace.json`]);
    git(["commit", "-m", `chore(sync): first mirror of ${name}`]);
    git(["push"]);
    fs.copyFileSync(wsFile, baseFile);
    console.log(`First mirror pushed: ${mirrorRel} — ${(local.posts || []).length} posts, ${(local.templates || []).length} templates.`);
    return;
  }

  const remote = readJson(mirrorFile);
  const base = fs.existsSync(baseFile) ? readJson(baseFile) : null;
  if (!base) console.log("No base file; treating the repo copy as the base (studio edits win).");
  const report = [];
  const merged = mergeWorkspace(local, remote, base || remote, report);

  const studioChanged = !eq(merged, local);
  const repoChanged = !eq(merged, remote);
  if (studioChanged) { fs.copyFileSync(wsFile, preFile); writeAtomic(wsFile, pretty(merged)); }
  if (repoChanged) {
    fs.mkdirSync(path.dirname(mirrorFile), { recursive: true });
    writeAtomic(mirrorFile, pretty(merged));
    git(["add", `${mirrorRel}/workspace.json`]);
    git(["commit", "-m", `chore(sync): ${name} from the studio`]);
    git(["push"]);
  }
  fs.copyFileSync(wsFile, baseFile); // the new agreed state

  if (studioChanged) console.log("Studio updated from the repo. studio.html picks it up within ~1.5 s.");
  if (repoChanged) console.log("Repo mirror updated and pushed.");
  if (report.length) console.log(`Needs a look (${report.length}):\n  ${report.join("\n  ")}`);
  if (!studioChanged && !repoChanged && !report.length) console.log(`${name}: studio and repo in step.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
