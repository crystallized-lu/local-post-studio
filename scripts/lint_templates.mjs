#!/usr/bin/env node
// lint_templates.mjs: do a workspace's templates follow the brand sliders?
//
//   node scripts/lint_templates.mjs <workspace-folder | workspace.json | templates.json>
//
// Exit 1 and one line per problem when a template hard-codes what a slider should control:
// text sizes (--display-size / --body-size), spacing (--k, --pad), text width (--title-w / --body-w),
// photo framing (data-pos, never object-position), plus scripts and event handlers, which the page strips.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SIZE_VARS = /var\(--(display|body)-size\)/;
// A size scaled by --k (a fixed caption, a credit line) is allowed on one element; the whole template still has to read the size variables.
const SIZE_OK = /var\(--(display-size|body-size|k)\)/;
const prop = (html, name) => [...html.matchAll(new RegExp(`(?<![-\\w])${name}:\\s*([^;"]+)`, "g"))].map((m) => m[1].trim());

/** Problems with one template's html, as short strings; [] when it is fine. */
export function lintTemplate(t) {
  const html = t.html || "";
  const out = [];
  if (/<script|\son\w+=|javascript:/i.test(html)) out.push("script or event handler (the page strips them)");
  for (const v of prop(html, "font-size")) if (!SIZE_OK.test(v)) out.push(`font-size "${v}" ignores the text-size sliders; write it as calc(var(--display-size) * …) or calc(var(--body-size) * …)`);
  for (const v of prop(html, "font")) if (!SIZE_OK.test(v)) out.push(`font shorthand "${v}" ignores the text-size sliders; put var(--display-size) or var(--body-size) in it`);
  if (/data-(field|list)=/.test(html) && !SIZE_VARS.test(html)) out.push("has text but never reads --display-size or --body-size");
  for (const p of ["padding", "gap", "margin"]) for (const v of prop(html, `${p}(?:-[a-z]+)?`)) if (/\d+px/.test(v) && !/var\(--(k|pad)\)/.test(v)) out.push(`${p} "${v}" is fixed pixels; scale it with var(--k) (calc(var(--k) * 24px)) or use var(--pad)`);
  for (const v of prop(html, "max-width")) if (/\d(ch|px)/.test(v) && !/var\(--(title-w|body-w|k)/.test(v)) out.push(`max-width "${v}" ignores the width sliders; write calc(14ch * var(--title-w, 1)) or calc(30ch * var(--body-w, 1))`);
  if (/object-position:/.test(html)) out.push("inline object-position; use data-pos=\"x y\" on the <img> so the person's pan and zoom apply");
  return out;
}

/** { id: [problems] } for every template in a workspace object or { templates } object. */
export function lintWorkspace(ws) {
  const r = {};
  for (const t of ws.templates || []) { const p = lintTemplate(t); if (p.length) r[t.id] = p; }
  return r;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2];
  if (!arg) { console.error("Usage: node scripts/lint_templates.mjs <workspace-folder | workspace.json | templates.json>"); process.exit(2); }
  const file = fs.statSync(arg).isDirectory() ? path.join(arg, "workspace.json") : arg;
  const bad = lintWorkspace(JSON.parse(fs.readFileSync(file, "utf8")));
  const ids = Object.keys(bad);
  for (const id of ids) for (const p of bad[id]) console.log(`${id}: ${p}`);
  console.log(ids.length ? `${ids.length} template(s) need fixing` : "all templates follow the brand sliders");
  process.exit(ids.length ? 1 : 0);
}
