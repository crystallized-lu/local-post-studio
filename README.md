# Local Post Studio

Turn what you've already made into a brand, a set of post designs and a month of
scheduled posts, with the AI of your choice. Everything stays in one folder on your
computer. No app to install, no server, no image generation. Posts are stored and
published by [PostProxy](https://postproxy.dev).

## Start here

Open your AI (Claude Cowork, Claude Code, Codex…), give it access to this folder, and
send:

> **Let's set up my social media. Read SKILL.md in this folder and walk me through it, one step at a time.**

If the skill is already installed in your AI, this is enough:

> **I want to set up my social media posts.**

It will ask what you do, where your existing content lives (website, Instagram,
newsletters, photo folders) and where to keep your workspace. Then follow along.

## What's in the box

| | |
|---|---|
| `SKILL.md` | The step-by-step guide your AI follows. |
| `studio.html` | The control page. A step strip (Write, Approve, Export, Schedule) shows what to do next; the editor folds into sections; the post list groups drafts, scheduled and an archive, with delete and reordering; clicking a part of the picture lights up its controls. Sliders for every colour, size, corner and shadow, how wide the text runs, and where a photo sits in its frame; posts, calendar, image search, PNG export. Saves straight into your folder. |
| `scripts/cutout.py` | Removes a photo's background locally (rembg), saving a transparent PNG for cut-out layouts. |
| `scripts/render_post.py` | Renders a post to PNG headlessly, exactly like Export PNG. Used to check work against a reference. |
| `scripts/compare.py` | Puts a reference and a render side by side under one grid, with an optional 50 percent overlay. |
| `scripts/trace_frames.py` | Finds the frames of a collage reference (photos divided by thin outlines) and writes their shapes as polygons. |
| `scripts/frames_to_template.py` | Turns traced frames into a studio template with clipped photo slots and drawn dividing lines. |
| `scripts/sync.mjs` | Keeps every workspace's copy of the studio up to date: `register <folder>` when one is created or moved, no arguments to sync them all. Your list of workspaces lives in `workspaces.json` (private, never shared). |
| `scripts/postproxy.mjs` | Stores your PostProxy key in your keychain, sends approved posts (dry run unless you add `--send`), checks their status. |
| `reference/` | Design rules, where images can come from, why no AI images, PostProxy setup. |
| `example/` | A complete made-up workspace (ceramics studio) with its own photos and fonts. |

## How it works

You need an AI that can read and write files in a folder, and run a command or two.
It doesn't matter which one:

| Tool | How it finds the instructions |
|---|---|
| Codex, Cursor, GitHub Copilot, opencode, Amp, Windsurf, Jules, Goose… | `AGENTS.md` (read automatically when you open this folder) |
| Claude Code, Claude Cowork / desktop app | `CLAUDE.md` → `AGENTS.md`, or install the folder as a skill (`SKILL.md`) |
| Gemini CLI | `GEMINI.md` → `AGENTS.md` |
| Anything else with file access | Say "read AGENTS.md and SKILL.md in this folder" |

Give it this folder and say "help me set up my social posts". It creates your workspace
folder, registers it, and puts that workspace's own copy of `studio.html` in it.

Open that `studio.html` in Chrome, Edge, Brave or Arc and press **Open a folder…**, then
pick the workspace. From then on:
- what you change in the page saves to `workspace.json` immediately;
- what the AI changes shows up in the page within a couple of seconds;
- fonts you drop into `fonts/` are picked up automatically;
- next time, one click on **Reopen**.

Safari and Firefox can't save into folders yet, so the page asks for one of the browsers
above.

**Fonts are local files.** Copy your own font files into `fonts/`, or download free ones
(e.g. Google Fonts: search → Get font → Download all → unzip → copy the `.ttf` files).
The page never loads anything from a font service or CDN.

## Scheduling

```sh
node scripts/postproxy.mjs login                       # once: key goes into your keychain
node scripts/postproxy.mjs profiles ~/Documents/social-studio
node scripts/postproxy.mjs schedule ~/Documents/social-studio          # dry run
node scripts/postproxy.mjs schedule ~/Documents/social-studio --send   # for real
node scripts/postproxy.mjs status   ~/Documents/social-studio
```
Needs Node 18 or newer. `login` uses the macOS Keychain or the Linux keyring; on
Windows set `POSTPROXY_API_KEY` for the session instead. Only posts you've approved
*and* exported are sent.

## Try the prototype in 10 minutes

1. Copy the `example` folder somewhere (so the original stays clean), e.g. to
   `~/Documents/atelier-test`.
2. Open `studio.html` in Chrome → **Open a folder…** → pick your copy. Move sliders on
   the Brand tab, switch a post's format, export a PNG (it lands in `exports/`).
3. Images tab → Openverse → search "pottery" → click one: it's copied into `images/`,
   placed on the selected post with its credit, and its colours become swatches.
4. Drop any font file into `fonts/` and watch it appear in the font menus.
5. With your AI agent in that folder: "make the accent deep blue and add more air around
   the text", and watch the page update.
6. Try the scheduler: `node scripts/postproxy.mjs login`, then `schedule <folder>`.
7. Full run: start fresh with `SKILL.md` and your own content.

## Development

`npm test` (no dependencies).

## Licence

MIT (see `LICENSE`). `studio.html` inlines [html-to-image](https://github.com/bubkoo/html-to-image)
(MIT) and embeds Libre Baskerville and Lato for its own interface (SIL Open Font License).
The fonts in `example/fonts/` are under the SIL Open Font License (`OFL-*.txt`
next to them). The example photos are CC0 from the WordPress Photo Directory.
