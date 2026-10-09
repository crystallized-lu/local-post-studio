#!/usr/bin/env node
// sync.mjs: keep every workspace's studio.html in step with the central one.
//
//   node scripts/sync.mjs register <workspace-dir>   add a new workspace, or record that one moved
//   node scripts/sync.mjs                             copy the central studio.html into every workspace
//   node scripts/sync.mjs forget <id-or-dir>          stop tracking a workspace (its files are untouched)
//
// The list lives in workspaces.json next to SKILL.md (git-ignored: it holds personal paths).
// Each workspace.json carries a permanent workspaceId, so a moved folder is the same workspace.
// Each copied studio.html carries that id, so a studio can't open somebody else's folder.

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); // decodes spaces in paths
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function writeAtomic(file, text) {
  const tmp = `${file}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const registryFile = (skillDir) => path.join(skillDir, "workspaces.json");
function readRegistry(skillDir) {
  try { return readJson(registryFile(skillDir)); } catch { return { workspaces: [] }; }
}
const writeRegistry = (skillDir, reg) => writeAtomic(registryFile(skillDir), JSON.stringify(reg, null, 2) + "\n");

/** The central page with this workspace's id stamped in, and its version set to `version` when given. */
export function stampPage(page, id, version) {
  if (!ID_RE.test(id)) throw new Error(`bad workspace id: ${id}`);
  const clean = page.replace(/<meta name="workspace-id"[^>]*>\n?/, "");
  const stamped = clean.replace("<head>", `<head>\n<meta name="workspace-id" content="${id}">`);
  return version ? stamped.replace(/(<meta name="studio-version" content=")[^"]*(")/, `$1${version}$2`) : stamped;
}

/** Date of the skill's last commit (the page's version), or null without git. A ZIP download is stamped by git archive instead. */
export function skillVersion(skillDir = SKILL_DIR) {
  try {
    const d = execFileSync("git", ["-C", skillDir, "log", "-1", "--format=%cI"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return /^\d{4}-/.test(d) ? d : null;
  } catch { return null; }
}

/** Copy the central studio into one workspace. Returns a short state word. */
export function syncOne(entry, { skillDir = SKILL_DIR } = {}) {
  const wsFile = path.join(entry.path, "workspace.json");
  if (!fs.existsSync(wsFile)) return "missing";
  let ws;
  try { ws = readJson(wsFile); } catch { return "unreadable"; }
  if (ws.workspaceId !== entry.id) return "mismatch";
  entry.name = ws.brand?.name || path.basename(entry.path);
  const page = stampPage(fs.readFileSync(path.join(skillDir, "studio.html"), "utf8"), entry.id, skillVersion(skillDir));
  const target = path.join(entry.path, "studio.html");
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
  entry.lastSynced = new Date().toISOString();
  if (current === page) return "current";
  writeAtomic(target, page);
  return "updated";
}

export function register(dir, { skillDir = SKILL_DIR } = {}) {
  const abs = path.resolve(dir);
  const wsFile = path.join(abs, "workspace.json");
  if (!fs.existsSync(wsFile)) throw new Error(`No workspace.json in ${abs}`);
  const ws = readJson(wsFile);
  if (!ID_RE.test(ws.workspaceId || "")) {
    ws.workspaceId = randomUUID();
    writeAtomic(wsFile, JSON.stringify(ws, null, 2) + "\n");
  }
  const reg = readRegistry(skillDir);
  let entry = reg.workspaces.find((w) => w.id === ws.workspaceId);
  const moved = entry && entry.path !== abs ? entry.path : null;
  if (!entry) reg.workspaces.push((entry = { id: ws.workspaceId, registered: new Date().toISOString() }));
  entry.path = abs;
  const state = syncOne(entry, { skillDir });
  writeRegistry(skillDir, reg);
  return { entry, moved, state };
}

export function syncAll({ skillDir = SKILL_DIR } = {}) {
  const reg = readRegistry(skillDir);
  const results = reg.workspaces.map((entry) => ({ entry, state: syncOne(entry, { skillDir }) }));
  writeRegistry(skillDir, reg);
  return results;
}

export function forget(key, { skillDir = SKILL_DIR } = {}) {
  const reg = readRegistry(skillDir);
  const abs = path.resolve(key);
  const before = reg.workspaces.length;
  reg.workspaces = reg.workspaces.filter((w) => w.id !== key && w.path !== abs);
  writeRegistry(skillDir, reg);
  return before - reg.workspaces.length;
}

const HELP = {
  missing: "not found there. If it moved: node scripts/sync.mjs register <new folder>",
  mismatch: "that folder now holds a different workspace. Register the right folder.",
  unreadable: "workspace.json isn't valid JSON right now. Fix it, then sync again.",
};

function main() {
  const [cmd, arg] = process.argv.slice(2);
  try {
    if (cmd === "register") {
      if (!arg) throw new Error("Usage: node scripts/sync.mjs register <workspace-dir>");
      const { entry, moved, state } = register(arg);
      console.log(moved ? `Moved: ${entry.name} ${moved} → ${entry.path} (studio ${state})` : `Registered: ${entry.name} at ${entry.path} (studio ${state})`);
    } else if (cmd === "forget") {
      console.log(forget(arg) ? "Forgotten. The folder itself is untouched." : "No such workspace in the list.");
    } else if (!cmd) {
      const results = syncAll();
      if (!results.length) console.log("No workspaces registered yet. Run: node scripts/sync.mjs register <workspace-dir>");
      for (const { entry, state } of results) console.log(`${state.padEnd(10)} ${entry.name || entry.id}  ${entry.path}${HELP[state] ? "  ← " + HELP[state] : ""}`);
    } else {
      throw new Error(`Unknown command: ${cmd}`);
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
