# Local Post Studio: quick setup

Five minutes, no installs beyond the two below. Everything stays in folders on your
computer.

## You need

- **Node.js 18 or newer**: https://nodejs.org (the "LTS" download). Used for the small
  scripts that keep your workspace in step.
- **Chrome, Edge or Brave**: the studio page saves straight into your folder, which
  Safari and Firefox don't allow.
- **An AI that can read and write files**: Claude Cowork, Claude Code, Codex, Cursor or
  similar, pointed at the unzipped folder.

## Steps

1. **Unzip** this archive somewhere permanent, for example `Documents/local-post-studio`.
   Don't move it later; your workspaces remember where it is.
2. **Open your AI** on that folder and send:

   > Let's set up my social media. Read SKILL.md in this folder and walk me through it,
   > one step at a time.

   It will ask what you do, where your existing content lives, and where to keep your
   workspace. It creates the workspace folder for you.
3. **Open the studio** by double-clicking **Open Post Studio** inside your workspace
   folder (macOS: `.command`, Windows: `.cmd`). The first time, macOS may ask you to
   confirm in System Settings › Privacy & Security; Windows may show "protected your
   PC", choose *More info › Run anyway*. Then click **Open folder** and pick the same
   workspace folder.
4. **Work in both**: the AI writes brand, designs and captions into `workspace.json`;
   the page shows them live and lets you nudge colours, sizes and photos with sliders.
   Click any part of a picture to see its controls. "More options" hides the rest.
5. **Publish** only when you're ready: the AI asks for an explicit "yes, send" before
   anything leaves your computer.

## Good to know

- `example/` is a complete sample workspace. Open it in the studio to look around
  before you have your own.
- API keys go in your computer's keychain, never in files or chat.
- Nothing is sent anywhere except image searches you start and the posts you approve.
- Stuck? Tell the AI what you see on screen; `SKILL.md` has the answers it needs.
