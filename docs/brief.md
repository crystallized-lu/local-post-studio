# Brief — Local Post Studio

**One line:** a model-agnostic skill that turns a person's existing content into a
brand, a set of coded post designs, and a content calendar, then schedules the
posts on PostProxy — with nothing running locally except a browser page and,
optionally, one small script.

## Who
Individuals and small businesses who use AI anywhere on the spectrum:
plain chat (no files) → chat with artifacts (claude.ai) → agentic harness with a
filesystem (Claude Code, Codex, opencode, Cursor, Goose…).

## Done for the prototype
- Given a folder with `SKILL.md`, any model can walk a user through:
  ingest → brand → demo posts → (optional) local calendar → compose → images →
  export → schedule → monitor.
- `studio.html` opens from disk (no server, no build), shows the brand and posts,
  and every visual token is adjustable with a slider, colour picker or font picker.
- Posts export to PNG; `scripts/postproxy.mjs` schedules them (dry run by default).
- No image generation anywhere. The skill pushes back and explains why.

## Not in the prototype (noted, not built)
Video, analytics, multi-user/team review, hosting.
