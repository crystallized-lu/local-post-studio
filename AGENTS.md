# Local Post Studio: instructions for AI agents

This file is the single entry point for every coding or desktop agent (Codex, Cursor,
GitHub Copilot, Gemini CLI, opencode, Goose, Amp, Windsurf, Jules, Claude Code…).
`CLAUDE.md` and `GEMINI.md` only point here.

## If someone wants to set up or run their social media posts

This folder is a skill. Read `SKILL.md` in full and follow it from Step 0, one step at a
time. It is written for any model: it says what to check, what to ask, which files to
write and which commands to run.

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
