# Stories (prototype)

1. **Skill pipeline.** Given any harness loads `SKILL.md`, when the user says
   "set up my social posts", then the model detects its mode (chat / artifacts /
   files), creates the workspace, and walks steps 0–9 one at a time with human gates.
2. **Brand from ingestion.** Given links/exports, when step 2 runs, then
   `sources/inventory.md` and `brand` + 4–6 adapted `templates` exist, each traceable
   to something observed.
3. **One folder, two editors.** Given `studio.html` opened from disk in a Chromium
   browser, when the person opens a workspace folder, then page edits save to
   `workspace.json`, the AI's edits appear within ~2 s, and the folder is offered for
   one-click reopening. No copy/paste or upload of data exists.
3b. **Local fonts.** Fonts load only from `fonts/`; dropped files are registered
   automatically; a missing family shows guidance to add its files; exports embed them.
4. **Sliders.** Every token in `brand.tokens` has a control; changes re-render live;
   per-post overrides are possible.
5. **Images.** Local folder, drag-drop, URL, Pexels (key), Openverse (no key);
   credit is recorded on the post; a palette can be extracted from an image.
6. **Calendar.** Month view shows calendar events and posts. Local events are offered as an option and researched at runtime, never shipped as data.
7. **Export.** Share → "Export as PNG" writes `exports/<id>.png` and sets status `exported`.
8. **Schedule.** `login` stores the key in the OS keychain via a hidden prompt.
   `node scripts/postproxy.mjs schedule <ws>` dry-runs by default,
   validates (approved, exported, future date, caption length per platform), and with
   `--send` uploads multipart and records the PostProxy id. `status` refreshes states.
9. **No image generation.** Asked to generate an image, the model declines and
   explains the CO₂ rationale, then offers the coded-design/existing-image route.
