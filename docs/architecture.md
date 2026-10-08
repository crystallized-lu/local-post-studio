# Architecture

## Principle: one folder, two editors

```
<skill folder>/                 ← this repo
  SKILL.md                      ← the pipeline any model follows
  AGENTS.md                     ← pointer for non-Claude harnesses
  studio.html                   ← control surface; copied into each workspace
  scripts/postproxy.mjs         ← login | profiles | schedule | status (Node ≥18, no deps)
  scripts/sync.mjs              ← register | forget | sync: central studio.html → every workspace
  workspaces.json               ← registry of the person's workspaces (git-ignored)
  reference/*.md                ← loaded only when a step needs them
  starter/workspace.json        ← neutral copy source for new workspaces (no samples, grey tokens)
  example/                      ← complete demo workspace (synthetic brand, CC0 photos, OFL fonts)

<user workspace>/               ← one folder on the person's computer
  workspace.json                ← brand, templates, fonts list, calendar, posts
  studio.html                   ← copy of the page
  fonts/                        ← font files (local only)
  images/                       ← the person's images, and picked stock images
  exports/<post-id>.png         ← written by the page
  sources/inventory.md          ← what ingestion found (no third-party personal data)
```

The AI edits the files directly. The page edits the same folder through the File
System Access API (Chromium browsers): it writes `workspace.json` 0.4 s after each
change and polls it every 1.5 s, so the AI's edits appear live; it also scans `fonts/`.
The folder handle is remembered in the browser's IndexedDB so reopening is one click.
There is no copy/paste or upload path for data (decision 2026-10-02). Requirement that
follows: the AI must have file access; the browser must be Chromium-based.

## Why these choices
- **No server.** PostProxy sends no CORS headers (verified 2026-10-02), so the page
  cannot schedule; the Node script (or a PostProxy connector, or the dashboard) does.
  Pexels and Openverse allow browser calls (verified), so image search lives in the page.
- **PostProxy accepts multipart uploads** (`media[]`): local PNGs go up directly.
- **Templates are data.** Inline-style HTML using CSS variables; fields bind via
  `data-field`, lists via `data-list`, images via `data-image`. The page sanitises
  template HTML and fills text with `textContent` only.
- **Local fonts only.** `workspace.fonts` lists files in `fonts/`; the page turns them
  into `@font-face` rules on blob URLs (a same-page `<style>`, so html-to-image embeds
  them in exports). File names are parsed to guess family/weight/style.
- **Nothing from CDNs.** html-to-image (MIT, 20 KB) is inlined in the page.

## workspace.json (v1) — the contract

```jsonc
{
  "version": 1,
  "timezone": "Europe/Luxembourg",
  "fonts": [ { "family": "Fraunces", "src": "fonts/Fraunces[opsz,wght].ttf", "weight": "100 900", "style": "normal" } ],
  "brand": {
    "name": "…", "handle": "@…",
    "voice": { "summary": "…", "do": ["…"], "avoid": ["…"], "address": "tu|vous|you", "languages": ["fr","en"] },
    "tokens": {
      "colors": { "bg": "#…", "surface": "#…", "text": "#…", "muted": "#…", "accent": "#…", "accent2": "#…" },
      "fonts":  { "display": "family from workspace.fonts", "body": "…", "accent": "…" },
      "type":   { "displaySize": 84, "bodySize": 30, "displayWeight": 600, "tracking": 0, "lineHeight": 1.1, "uppercase": false },
      "shape":  { "radius": 24, "border": 0, "shadow": 0.15 },
      "layout": { "padding": 80, "titleWidth": 1, "bodyWidth": 1, "align": "left" },
      "texture":{ "grain": 0.05, "overlay": 0.45, "imageSaturation": 1 },
      "logo":   { "text": "…", "src": "images/logo.png", "size": 1, "position": "bottom-right" }
    },
    "sources": ["https://…", "Instagram export 2026-09"]
  },
  "templates": [ { "id": "quote", "name": "Quote", "fields": ["title","body"], "html": "<div …>" } ],
  "imageSources": { "order": ["local","pexels","openverse","url"], "folders": ["images"], "notes": "…" },
  "calendar": [ { "date": "2027-06-23", "title": "National Day", "kind": "holiday|event|campaign", "note": "…" } ],
  "posts": [ {
    "id": "2026-10-10-mental-health", "date": "2026-10-10", "time": "09:00",
    "platforms": ["instagram","linkedin"], "template": "quote", "format": "portrait",
    "fields": { "eyebrow": "", "title": "", "body": "", "cta": "" },
    "image": { "src": "images/x.jpg | https://…", "credit": "Photo: … / Pexels", "x": 50, "y": 30, "zoom": 1.2,
               "fx": 80, "fy": 15, "fw": 28, "fh": 20, "rot": 0, "shape": "rounded|circle|square", "layer": "front|back" },
    "caption": "…", "overrides": { "colors": { "accent": "#…" } },
    "status": "idea|draft|approved|exported|scheduled|published|failed",
    "postproxy": { "id": "…", "status": "…", "checkedAt": "…" },
    "sent": { "at": "…", "caption": "…", "date": "…", "time": "…", "platforms": ["instagram"] },
    "exported": { "at": "…", "visual": "<snapshot string the page compares>" }
  } ]
}
```

For templates with `data-float`, `fx fy fw fh` place the photo (centre, % of the page), `rot` tilts it, `shape` (`rounded`, `circle`, `square`, or `cutout` for a frameless transparent PNG) and `layer` (front or behind the words) style it; a template can set defaults with `data-shape` and `data-layer` on the `<img>`. Without a chosen photo the floating photo is not drawn. Any template with a photo slot can also be freed per post with `image.free: true`: the photo then renders as a floating one (default `50 50 60 60`, on the page root), draggable and resizable like a `data-float` photo. A layout can have several named frames: `<img data-image="f1">`, one per frame. Their photos live in `post.images.f1 = {src, credit, x, y, zoom}` (x/y = which part of the photo shows, in %, set by dragging the photo inside its frame), and `template.sample.images` seeds new posts. Without a name, `data-image` is the post's single photo in `post.image`.

`sent` is written by the AI when it schedules or publishes; `exported` is written by the page on Share → Export as PNG. The page flags a scheduled or published post whose caption, date, time or platforms differ from `sent`, and any post whose on-image inputs (template, fields, image, overrides, brand tokens) differ from `exported.visual`. No snapshot means no warning.

Formats: `square` 1080×1080 · `portrait` 1080×1350 · `wide` 1350×1080 (5:4) · `story` 1080×1920 · `landscape` 1200×627.

### Carousels (2026-10-08)
A post is a one-slide post unless it has `slides`. The post's own `template`, `fields`, `image` and `images`
are slide 1; `post.slides` is an optional array of further slides, each `{ template, fields, image, images }`
in the same shapes. `format`, `overrides`, `caption`, `date`, `time`, `platforms`, `status` and everything else stay
on the post and apply to every slide. Maximum 10 slides in total (`MAX_SLIDES`). Export writes `exports/<id>.png`
for one slide and `exports/<id>-1.png`, `-2.png`… for more (`exportFile()` in `studio.html`, `exportNames()` in
`scripts/postproxy.mjs`; keep them identical). `exported.visual` includes `slides` only when there are some, so
posts exported before carousels existed do not read as out of date. In the page, `currentPost()` returns a Proxy
over the open slide's four keys; use `rawPost(p)` before cloning, comparing or deleting a post.

### Layout and photo controls
- `layout.titleWidth` and `layout.bodyWidth` (0.5 to 2, default 1 when missing) become the
  CSS variables `--title-w` and `--body-w`. Templates write text limits as
  `max-width:min(100%, calc(14ch * var(--title-w, 1)))`, so 1 is "as designed" and a larger
  number lets the words use more of the post. Like every token they can be overridden per
  post (`overrides.layout.titleWidth`).
- `post.image.x`, `.y` (percent, 0 to 100) and `.zoom` (1 to 3) frame a photo inside its
  slot: `x`/`y` set `object-position` and the zoom origin, `zoom` scales the photo and the
  slot clips it. When missing they fall back to the template's `data-pos="x y"` on the
  `<img data-image>` (else `50 50`) and `1`. Choosing a new image resets them.

## Secrets
The PostProxy key lives in the OS keychain (`security` on macOS, `secret-tool` on
Linux), stored by `postproxy.mjs login` through the tool's own hidden prompt.
`POSTPROXY_API_KEY` in the environment overrides it (Windows, CI). It never enters
`workspace.json`, argv or chat. The Pexels key is in the page's localStorage only.

## Status lifecycle
`idea → draft → approved` (human) `→ exported` (studio) `→ scheduled` (script/MCP)
`→ published|failed` (status check). Only `approved`+`exported` posts are sent.

## The studio's layout

`studio.html` is one page with three zones.
- **Top bar:** brand, the four sections (Posts, Calendar, Images, Brand), then the workspace name, the save state, **Switch folder** and **Share**. Share is a menu for the current post: Approve, Export as PNG, Copy the caption, and Ask your AI to schedule it (it copies the prompt from `schedulePrompt(p)`; the page never talks to PostProxy).
- **Editor rail (Posts section only):** one button per part of the post, `RAIL` in the source: Posts (the list), Text, Caption, When & where, Design, Photo, Status, Style. The drawer beside it shows only the chosen part. Every part is a `sec(name, …)` element carrying `data-sec` and `data-rail`; `applyRail()` hides the others. `Style` is the per-post override controls (`#ovr`). Click a part of the picture and `showControls()` opens the matching rail item and highlights the control. Add a new part by adding a `sec()` in `postEditor`, its id to `SECRAIL` and an icon to `RAIL`.
- **Stage:** the picture, the step strip and the Brand board or calendar.

Styling uses the website's tokens (navy, azure, purple; Libre Baskerville headings and Lato text, embedded as base64 `@font-face` under the names `Studio Serif` and `Studio Sans` so they never clash with a workspace font). Keep UI colours in the `--ui-*` variables at the top of the stylesheet. Light and dark live in the same variables; the theme button in the top bar cycles Auto, Light and Dark by setting `data-theme` on `<html>` (remembered in `localStorage` as `lps.theme`). The test suite forbids external fonts and scripts, so data URIs only.

## Workspace registry and sync (2026-10-08)
Each `workspace.json` has a permanent `workspaceId` (UUID, set by `sync.mjs register`).
`workspaces.json` maps ids to paths. `sync.mjs` writes the central `studio.html` into each
workspace with `<meta name="workspace-id">` stamped in. The page keys its remembered
folder handle by that id (file:// pages share one IndexedDB) and refuses a folder whose
`workspaceId` differs. If the browser still holds permission, the page opens the folder
without a click. Moved folder: `register` the new path; the id matches and the entry is
updated. Schema migrations, when `version` changes, belong in `sync.mjs` too.
