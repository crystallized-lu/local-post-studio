# Local Post Studio: instructions for AI agents

This file is the single entry point for every coding or desktop agent (Codex, Cursor,
GitHub Copilot, Gemini CLI, opencode, Goose, Amp, Windsurf, Jules, Claude Code…).
`CLAUDE.md` and `GEMINI.md` only point here.

## If someone wants to set up or run their social media posts

This folder is a skill. Read `SKILL.md` in full and follow it from Step 0, one step at a
time. It is written for any model: it says what to check, what to ask, which files to
write and which commands to run.

## Repo map

- `SKILL.md` — the operating manual; read in full before running a person's post
  workflow, from Step 0. Everything else routes through it.
- `studio.html` — the entire app in one file (no build step). Must load nothing
  remote; a test enforces it. Fonts ship as local files in `starter/fonts/`,
  `example/fonts/`.
- `scripts/` — Node 18+: `sync.mjs` (run first in every session, SKILL.md rule 9),
  `postproxy.mjs` (send pipeline), `lint_templates.mjs`, `smoke_studio.py` (loads
  `studio.html` in headless Chromium, prints page errors). Optional Python image
  helpers: `render_post.py`, `cutout.py`, `frames_to_template.py`,
  `trace_frames.py`, `compare.py`. `*.test.mjs` run via `npm test` (`node --test`).
- `starter/` — blank workspace template (fonts + `workspace.json`); `example/` —
  demo workspace (synthetic data only). Never put a real person's data in either.
- `docs/` — `architecture.md` holds the `workspace.json` contract; `brief.md`,
  `stories.md`; `decision-log.md` is local-only (untracked).
- `reference/` — design principles, image sourcing, the no-image-generation rule,
  postproxy notes.
- `workspaces/`, `workspaces.json`, `exports/`, real person's data — local only, never
  committed.
- `package.json` — no build, no deps; only `npm test`. Run it after touching
  `scripts/`, `studio.html`, `starter/`, or `example/`.

- Run commands from this folder (`node scripts/…`, `python3 scripts/…`). Node 18+ is
  needed; Python only for the optional image helpers.
- The person's work lives in their own workspace folder, never in this one.
- Start every session with `node scripts/sync.mjs` (rule 9 in `SKILL.md`).
- Never generate images, never send posts without an explicit "yes, send", never put
  API keys in files or chat. `SKILL.md` explains each rule.

If your tool supports skills natively (a `SKILL.md` with name/description front matter),
you can install this folder as a skill instead; the instructions are the same.

## If you are changing the skill itself

- Contract for `workspace.json`: `docs/architecture.md`. Decisions: `docs/decision-log.md`
  (kept locally, not committed; add an entry for every change).
- `npm test` after changing `scripts/`, `studio.html`, `starter/` or `example/`.
- `studio.html` must load nothing remote (a test enforces it); fonts are local files.
- After changing `studio.html`, run `node scripts/sync.mjs` to update registered workspaces.
- Never commit `workspaces/`, `workspaces.json`, exports, or any real person's data.
