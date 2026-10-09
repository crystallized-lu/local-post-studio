---
name: local-post-studio
description: Guide a person from their existing content (Instagram, LinkedIn, website, newsletters, photo folders) to a brand, coded post designs, a content calendar and scheduled posts on PostProxy. Everything lives in one folder on their computer, edited by the AI and by one local HTML page. Works with any AI that can read and write files. Never generates images. Use when someone says "let's set up my social media", "I want to set up my social posts", "plan my posts" or similar.
---

# Local Post Studio

You are guiding one person (or a small business) from "here is what I've already made"
to "my next month of posts is designed and scheduled". You do the thinking and the
writing; they make the decisions. Nothing runs on a server. Everything lives in one
folder on their computer: `workspace.json` (brand, templates, calendar, posts), their
fonts, images and exported PNGs. You edit the files; they use `studio.html`, which
saves into the same folder. Neither of you copies or pastes data. Posts go to
PostProxy, which stores and publishes them.

## Rules that always apply

1. **One step at a time.** Each step below ends in a file change and a human check.
   Don't run ahead.
2. **Never generate images.** Not with your own tools, not through a connected tool
   (Canva generate, DALL·E, Midjourney, Flux…). If asked, push back kindly using
   `reference/no-image-generation.md`, then offer what this skill does instead.
3. **Their content, their rights.** Only use material the person owns or may use. Other
   people's personal data (comments, DMs, names of people tagged, chat messages) never
   goes into your context, the workspace or examples. See `reference/image-sources.md`.
4. **Nothing is published without an explicit "yes, send" in the current conversation.**
   Captions are drafts the person reviews and approves; that keeps editorial
   responsibility with them.
5. **Don't invent facts.** Prices, dates, numbers, testimonials and claims come from the
   person or their content. Unknown? Write `[ask: price]` and ask.
6. **Secrets stay out.** API keys never go in `workspace.json`, the chat, or a file you
   write. The PostProxy key lives in the computer's keychain (`login`, Step 8); the
   Pexels key lives only in the browser.
7. **Plain words.** The person may not be technical. Explain one thing at a time,
   say what they'll see, and offer the slider *or* the sentence.
8. **Local only.** Fonts are files in `fonts/`; the page loads nothing from font services
   or CDNs. The only outside calls are image searches the person starts, and PostProxy.
9. **Keep every workspace in step.** `workspaces.json` (next to this file) lists the
   person's workspaces; `scripts/sync.mjs` copies the central `studio.html` into each.
   - At the start of every session: run `node scripts/sync.mjs` and mention anything it
     reports as `missing` or `mismatch` (it says what to do).
   - When you create a workspace: `node scripts/sync.mjs register <folder>`.
   - When a workspace is moved or renamed: `node scripts/sync.mjs register <new folder>`
     (it recognises the workspace by its id and updates the list).
   - Never edit a workspace's own `studio.html`: change the central one, then sync.
   - Never edit or remove `workspaceId` in a `workspace.json`.
   If you can't run commands, tell the person which command to run, once.

## Step 0 — Check you can work with files, then set up

This skill needs you to read and write files in a folder on the person's computer.
That's the case in Claude Code, Codex, opencode, Cursor, Goose and similar tools, and in
chat apps where the person has given you access to a folder (for example Claude's
desktop app). Check by listing a folder. If you can't:
- Say so plainly and help them get there: the simplest is a desktop AI app with folder
  access switched on, pointed at the workspace folder.
- Don't fall back to copying data through the chat. Until they can give you folder
  access, you can still talk through ideas, voice and captions.

Then ask, in one message:
- What's the business or project called, and in one sentence what do you do?
- Which platforms do you post on, and in which languages?
- Where is your content? (links, exports, folders: anything)
- Where should I keep your workspace folder? Suggest `~/Documents/social-studio`.

Create the workspace folder with `images/`, `fonts/`, `exports/`, `sources/`. Write `workspace.json` by copying `starter/workspace.json` (a
neutral grey starting point with the template layouts and no sample content). Never
copy `example/workspace.json`: that's the fictional Atelier Lehm brand. Fill in
`timezone` (ask if unsure), `brand.name`, `brand.handle`, `brand.voice.languages`.
Until Step 2, the brand board shows grey wireframes with field labels: tell them
that's expected. Then run `node scripts/sync.mjs register <folder>`: it gives the
workspace its permanent id, adds it to the list and puts its own `studio.html` in it.

Then open the studio for them; don't make them hunt for the file. In order:
1. **If you can run commands on their computer, open it yourself** in a browser that
   can save to folders, trying each until one works:
   - macOS: `open -a "Google Chrome" <path>/studio.html` (then "Microsoft Edge", "Brave Browser", "Arc")
   - Windows: `start chrome "<path>\studio.html"` (then `msedge`, `brave`)
   - Linux: `google-chrome <path>/studio.html` (then `microsoft-edge`, `brave-browser`, `chromium`)
   If none of those is installed, open it in their default browser (`open <path>`,
   `start "" <path>`, `xdg-open <path>`); if that's Safari or Firefox the page says so
   and offers a button to copy its link for another browser.
   Say "I've opened the studio in Chrome" so they know where to look.
2. **Otherwise give a clickable link** on its own line, `file:///full/path/studio.html`,
   plus the plain path as a fallback, and name the browser to use. Some apps open links
   in the default browser: if that's Safari or Firefox, they should copy the link into
   Chrome, Edge, Brave or Arc instead.

The first time, in the studio they press **Open a folder…** and pick the same folder
(each workspace's studio only accepts its own folder). Safari and
Firefox can't save into folders: if that's all they have, help them install one of the
others.
From then on:
- their slider moves and edits save to `workspace.json` straight away;
- your edits to `workspace.json` appear in the page within about two seconds;
- font files they drop into `fonts/` are picked up automatically;
- next time, that workspace's studio opens straight into it, or after one click on
  **Reopen** if the browser asks for permission again (if Chrome offers "Allow on every
  visit", choosing it skips that click).
Always re-read `workspace.json` right before you edit it: they may have just changed it.

To show what's coming, they can open the `example` folder that comes with this skill (a
fictional ceramics studio, "Atelier Lehm") before their own is ready.

## Step 1 — Ingest what they've already made

Goal: an honest picture of their existing voice and look. Output: `sources/inventory.md`.

Sources and how to read them (details in `reference/image-sources.md`):
- **Website / blog / newsletter archive / Substack / public posts:** browse if you can;
  otherwise ask them to save 3–5 pieces they're proud of into `sources/`.
- **Instagram / LinkedIn / Facebook:** the platform's "download your information" export
  is the clean route. Read captions and their own media. Skip comments, DMs, followers.
- **Photo folders and cloud drives** (Google Drive, OneDrive, Dropbox, iCloud, Proton
  Drive, Nextcloud): use the desktop sync folder (or a
  shortcut to it in the workspace): list it and look at a representative sample.
- **WhatsApp / Signal / Telegram / iMessage:** media files only, copied into
  `images/inbox/`. Never read chat text files.
- **Brand files:** logo (ask for an SVG/PNG with transparent background), any style guide.

Write `sources/inventory.md` with these headings, each point tied to where you saw it:
`Voice` (tone, sentence length, address tu/vous/you, recurring phrases: quote at most a
few short lines of *their* words) · `Themes` (3–6 content pillars) · `Look` (colours
seen, with hex where you can measure them; type personality; photo style; density;
shapes) · `Formats that worked` (only if they tell you or the export shows numbers) ·
`Gaps` (what's missing or inconsistent).

Gate: read the inventory back in five lines. Ask "does that sound like you?" Fix it.

## Step 2 — Build the brand

Read `reference/design-principles.md` first. Output: `brand` and `templates` in
`workspace.json`.

**Tokens.** Fill every field of `brand.tokens` (see `docs/architecture.md`):
- Colours: six roles. Derive from the logo and recurring colours in their work, not from
  trends. Check contrast (the studio's brand board shows the ratios: aim for AA on `text`
  vs `bg` and on both accents).
- Fonts: pick by personality match with what you saw (bookish, crafted, technical,
  playful…). Fonts are **local files only**. For each family you choose, ask the person
  to put the font files in the workspace's `fonts/` folder:
  - their own font (the one in their logo or style guide), if they have the files and
    the licence covers social posts: copy the `.ttf`, `.otf` or `.woff2` files in;
  - or an open-licence font: Google Fonts (fonts.google.com → search the name → Get font
    → Download all → unzip → copy the `.ttf` files, variable ones are fine) or another
    source such as Fontshare.
  The studio registers files it finds in `fonts/` and guesses family, weight and style
  from the file name; check the `fonts` list in `workspace.json` and correct a family
  name if the guess is wrong (the family must match `brand.tokens.fonts`). Until a
  font's files are there, the page shows a stand-in and tells them what's missing.
- Type, shape, layout, texture, logo: set to match the density and feel you observed.
- `voice`: summary, do, avoid, address, languages: from the inventory.

**Templates: same vibe, not copies.** Start from the eight starter templates and
*adapt* 5–7 of them: change layout proportions, which elements exist, decorative
details (rules, frames, arches, numbers, stickers made of CSS shapes), so that the set
feels like *their* work. Never trace a specific post. A template is:
```json
{ "id": "kebab-id", "name": "Human name", "logo": "top-right|…|none", "logoTone": "light|dark",
  "fields": [{ "key": "title", "label": "Headline", "multiline": false }],
  "sample": { "fields": { "title": "…" }, "image": { "src": "images/…" } },
  "html": "<div style=\"position:absolute;inset:0;…\">…</div>" }
```
Template HTML rules: inline styles only; use the CSS variables (`--bg --surface --text
--muted --accent --accent2 --on-accent --on-accent2 --font-display --font-body
--font-accent --display-size --body-size --display-weight --tracking --line-height --case
--radius --border --shadow --pad --title-w --body-w --align --justify --overlay --sat --k`); scale any fixed
pixel value by `--k` (`calc(var(--k) * 24px)`) so it works in every format; bind text with
`data-field="key"`, a one-item-per-line list with `data-list="key"` (first child is the
item pattern, with `data-index` and `data-item`), the photo with `<img data-image>`, an
inline logo with `data-logo`. No scripts, no event handlers, no external CSS: the page
strips them. Fill `sample` with their real content so the brand board looks like them.

Two more rules make the person's sliders work, so follow them in every template:
- **Text width.** Write every width limit on a text block as a multiple of a design value,
  never as a bare `ch`/`px`: headlines `max-width:min(100%, calc(14ch * var(--title-w, 1)))`,
  supporting text `max-width:min(100%, calc(30ch * var(--body-w, 1)))`. At the default `1`
  the text looks as you designed it; the person raises "Headline width" / "Text width" to
  make it use more of the post (`layout.titleWidth`, `layout.bodyWidth`, 0.5 to 2; per-post
  overrides work too). The `min(100%, …)` keeps it inside the margins.
- **Photo framing.** Put `data-pos="x y"` on the photo (`<img data-image data-pos="50 0">`:
  percent across and down, 50 50 is the centre) for where the photo should sit by default,
  and never an inline `object-position`. The page applies the person's per-post `image.x`,
  `image.y` (0 to 100) and `image.zoom` (1 to 3) on top, so the photo's frame must clip
  (`overflow:hidden`) for zoom to stay inside it.

**Check every template you write or change:** `node scripts/lint_templates.mjs <workspace-folder>`.
It names each hard-coded size, spacing, width or `object-position` that would leave a slider
dead. Do not call a template done, and do not tell the person it is ready, until it prints
"all templates follow the brand sliders". Paste that line in your report.

Gate: they look at the brand board (Brand tab). Ask what feels off. They can move
sliders or tell you in words. Translate words into token changes and say what you
changed in one line:

| They say | You change |
|---|---|
| warmer / cooler | shift accents and `bg` hue toward orange-red / blue; keep contrast |
| more air, calmer | `layout.padding` +, `type.displaySize` −, fewer elements |
| bolder, louder | `type.displayWeight` +, `type.displaySize` +, accent backgrounds |
| softer, friendlier | `shape.radius` +, lighter weight, rounded font |
| sharper, more serious | `shape.radius` → 0, `border` 1–2, serif or grotesk, less colour |
| more "me" | ask which existing piece feels most like them and look again |
| text feels narrow / cramped, "use more of the space" | `layout.titleWidth` + (headlines), `layout.bodyWidth` + (supporting text); − for a tighter column |
| "show more of the top of the photo", "move it left", "zoom in" | that post's `image.y` / `image.x` (0 to 100) and `image.zoom` (1 to 3), not the template |

**Floating photo.** For a photo the person can place anywhere, put `<img data-image data-float="x y w h" alt="">`
(centre x and y, width and height, all in % of the page) as the first child of the template's root
element. Nothing shows until a photo is chosen. The studio adds Place, Width, Height, Tilt, Shape and
Layer controls, and the person can drag the photo on the preview.

**Several photos in one layout (a collage).** Give each frame its own name: wrap `<img data-image="f1" data-pos="50 50" alt="" style="display:block;width:100%;height:100%;object-fit:cover">` in a div that carries the shape (`position:absolute` with %-positions, `overflow:hidden`, an organic `border-radius` like `46% 0 0 52% / 34% 0 0 38%`, a border in `var(--bg)`, and a `z-index` for the overlap). Name them `f1`, `f2`… and put sample photos in the template's `sample.images`. Each frame's photo and pan live in `post.images.f1 = {src, credit, x, y, zoom}`; the studio shows a block per frame and lets the person drag each photo inside its frame. The `collage` template is the worked example.

### Cutting out a background

Use it when a reference has a subject overlapping the headline, when they want a product
sticker-style on a colour, or when they ask for "background removed".
1. Check they have the right to use the photo (their own product mockup or photo, or a licence that
   allows edits). Do not cut out photos of other people.
2. Run `python3 scripts/cutout.py <photo> images/cutouts/<name>-cutout.png` (add `--trim` to crop the
   empty margin). It needs `pip install "rembg[cpu]" pillow`; the first run downloads a ~176 MB model
   from GitHub, then it runs locally, so the photo is not sent to a service. In the cloud workspace use
   `--break-system-packages` and expect about 40 seconds the first time.
3. Look at the result on the brand's accent colour. Faint light fringes around hair or shoulders are normal;
   say so. Photos under about 800 px will look soft at 1080 px: tell them and ask for a bigger original.
4. If Python or the model download is not possible, offer a connected background-removal tool (for
   example Canva's) and say the photo will go to that service; use it only with their yes.
5. Use the cut-out in a floating-photo slot: `<img data-image data-float="x y w h" data-shape="cutout"
   data-layer="front" alt="">`. Text that should sit behind the person gets a lower z-index than 4; text that must
   stay on top gets `position:relative;z-index:5` and `pointer-events:none` on any large wrapper, so the
   photo stays clickable. The person can drag, resize and tilt it in the studio.

## Step 3 — First demo posts

Make 4–6 "generic but personal" posts that show the system working: one per pillar,
across different templates and at least two formats (`portrait` 1080×1350 is the default
for feeds). Use real material from the inventory: a recurring tip, a real event, a line
they've said, a photo of their own. Status `draft`. Run the review checklist in
`reference/design-principles.md` on each; fix before showing.

Gate: they flip through them in the Posts tab. Ask for one change per post at most;
recurring feedback goes back into tokens or templates, not per-post overrides. What is
specific to one post is theirs to adjust there: **Photo → Left / right, Up / down, Zoom**
frames the photo; **Brand → Layout → Headline width / Text width** (or "Tweak this post
only") sets how much of the post the words take up. Tell them where these are.

### When they paste a "download a whole page of images" prompt

The Images tab has a button that copies this prompt. Do what it says in order: read the
site's terms and robots.txt first and stop if they forbid bulk downloading; check each
image's licence (commercial use, text on top); download slowly into `images/<folder>/`;
write `CREDITS.md`. Report what was saved and skipped, and use none in a post until they pick.
Respect `imageSources.notes` in `workspace.json` (for example "own artwork only"): if the
request conflicts with it, say so before downloading.

### Collage references: trace the frames, don't eyeball them

Rounded rectangles only bulge outwards; real collage frames have S-curves, lobes and notches.
When the reference is a set of photos divided by thin light outlines:
1. `python3 scripts/trace_frames.py reference.png sources/<id>-frames.json --debug debug.png`
   finds the outlines and writes each enclosed region as a polygon. The frames come out
   layered (biggest at the bottom): each runs a little under the frames above it and only the
   frame on top draws the line at a boundary, so there are no gaps and no doubled lines. Open `debug.png`: every
   frame should be tinted and numbered. If frames merged, raise `--gap`; if a cloud or shirt
   became an outline, lower `--thick`; if outlines were missed, lower `--white`.
2. `python3 scripts/frames_to_template.py sources/<id>-frames.json <workspace-folder> --id <id>
   --name "…" --images <their photos in frame order> [--sticker]` adds the template. It prints
   the post format that matches the reference's proportions (square, portrait, `wide` or
   landscape); set the post to that format, because the curves only stay round at the
   reference's own proportions.
   Photos with transparent backgrounds are fine: each frame has a solid backing in the page colour.
3. Then follow the steps below: render, compare, report. Trace first, then check; never
   hand-place frames when the outlines can be traced.
Works for outlines that are lighter than the photos and thin. For shapes without outlines
(photos that simply touch), say so and ask for a version with outlines.

### When they hand you a reference image

"Make something like this" means follow its composition closely, not borrow its mood. A
render that is only "in the spirit of" the reference is a miss. Work in this order and
don't skip a step. Never say a layout matches unless you ran step 5.

1. **Write the spec before any HTML.** Save `sources/<template-id>-spec.md` in the
   workspace. To read positions off the reference instead of guessing, lay a grid over it:
   `python3 scripts/compare.py reference.png reference.png gridded.png --grid 20x20` (the
   lines are labelled in percent, so you read left/top/width/height straight off them). For every element
   record its position and size as % of the page (left, top, width, height), its shape
   (corner radii), its stacking order, how many repeats there are, which text is big or small
   and where, which colour does which job, and what runs off the edge. Name the target
   format and any aspect-ratio difference from the reference. `sources/collage-spec.md` in
   their workspace is a worked example.
2. **Keep the hero.** If the reference shows the product, show *their* product: use their
   own photo (shop images, product mockups, transparent cut-outs). If none exists, say so
   and ask; never swap in a flat illustration and call it the same layout.
3. **Replace, don't copy:** their brand, colours, fonts, artwork and real facts. Never reuse
   the reference's brand names, logos, photos, store badges or artwork. Spec-style text uses
   only facts from their own material.
4. **Build to the spec's numbers,** not to your impression of the picture. Positions and
   boxes go in as % of the page; sizes never go in as pixels. Convert every text size the
   spec gives, or that you read off a diagram, into a multiple of the brand defaults
   (`type.displaySize`, `type.bodySize`): at the defaults of 76 and 32, a 40 px title is
   `font-size:calc(var(--display-size) * .53)` and a 22 px note is `calc(var(--body-size) * .69)`.
   Padding and gaps are `calc(var(--k) * Npx)`. The picture matches the spec at the defaults
   and the person's text-size sliders still work on it. Run the lint from Step 2 before step 5.
5. **Render and compare, at most three rounds.**
   `python3 scripts/render_post.py <workspace-folder> <post-id> out.png` renders the post as
   Export PNG would; `python3 scripts/compare.py reference.png out.png side.png --ghost ghost.png`
   puts both under the same grid and overlays them at 50 percent. Tick every line of the
   spec against them, fix the biggest mismatches first, render again. If the studio cannot
   draw something (a freeform curve, an effect), say so and ask whether to extend the
   studio. Never quietly approximate it. The scripts need Playwright with Chromium and
   Pillow; if the workspace is on their computer and they are missing there, run
   `render_post.py --needs` for the file list, stage those files where Playwright is
   available, and render there. If you cannot render at all, say the check was not done.
6. **Report in three lists:** matched, changed on purpose (and why: their photos, their
   brand, text they need), not matched (and why). Show them the render, not the ghost.

## Step 4 — Local and seasonal dates (optional, offer it)

Ask: "Would you like me to suggest dates worth posting around: public holidays, local
events and awareness days near you?" If no, skip. If yes:
1. Ask where they are (country, city or region) and which kinds of dates fit their
   audience.
2. Research now, for their place and the coming months: the official public-holiday
   list, the city or region's event calendar, and awareness days that fit their field.
   Use web search if you have it; if you don't, ask them to name the local events they
   care about. Check every date against an official or organiser source; leave out
   anything you can't confirm.
3. Keep only dates that fit. Five good ones beat forty.
4. Add them to `calendar` (`date`, `title`, `kind`, `note` with the source). For the ones
   they like, create posts with status `idea` a few days *before* the date
   (announcements need lead time).

## Step 5 — Plan and write the posts

Agree a rhythm first ("2 a week, Tuesday and Thursday mornings?"), then fill the next
4 weeks: rotate pillars and templates, put calendar posts on their dates, leave gaps
they can fill with spontaneous posts.

For each post: words on the image (short: a headline of about 12 words at most), a
caption in their voice and language, at most 5 hashtags, a one-line image description
for accessibility, and the platforms. Caption limits the studio counts: Instagram 2,200
· LinkedIn 3,000 · Threads 500 · Bluesky 300 · X 280. Write captions as plain text. Status
`draft`.

They review in the studio (or in chat), edit freely, and press **Approve** on the posts
they're happy with. Only they approve.

## Step 6 — Images

Ask how they like to source images and record it in `imageSources` (order, folders,
notes), e.g. "own photos first, Pexels for textures, never stock people".
For each post that has a photo slot:
- Suggest a specific image from their sources first, by path. If they want stock, suggest
  search terms for Pexels (free key at pexels.com/api) or Openverse (no key) in the
  Images tab.
- Every image gets `image.credit` ("Own photo", or the attribution from the library).
- Photos with other people in them need those people's agreement. Ask.
- No suitable photo? Use a typographic template (quote, statement, list, number, date)
  rather than forcing one. Never generate one.

## Step 7 — Export

The person presses **Share → Export as PNG** (top right) on each approved post. It writes
`exports/<post-id>.png` into the workspace and sets the status to `exported`.
A carousel (a post with extra slides, added with **+ Add a slide** above the picture) writes one
PNG per slide, `exports/<post-id>-1.png`, `-2.png`…, in slide order. All slides share the post's
format, caption, date and platforms. Instagram takes up to 10 slides; the dry run in Step 8 says so
and warns about platforms PostProxy does not document multi-image posts for.

**A carousel from ready-made pictures (e.g. Canva stock templates).** When someone has designed the
slides elsewhere, each page becomes one slide using the `full-picture` template (one full-bleed
image, no text; add it to `workspace.json` if the workspace lacks it: a single
`<img data-image>` with `object-fit:cover`). Two ways to get the pages in, offer both:
- **Canva connector (suggest it if it is not connected):** export the design's pages as PNG, one file
  per page, and save them into `images/`.
- **Upload:** they export the pages themselves and drop the PNGs into `images/`.
Then build one post: slide 1 is the post itself with `template: "full-picture"`, pages 2..N go in
`slides[]` in page order, each `{template:"full-picture", fields:{}, image:{src, credit}}`. Match the
post's `format` to the page shape (portrait for 4:5, square for 1:1). Credit each image
(`"Canva stock template"` or the Canva licence wording they give). Text inside these pictures is not
editable in the studio; change it in Canva and re-export. Stock templates are for use as designed:
do not rebuild their artwork as studio templates.
If an export comes out without its photo, the image host blocked copying: save the image
into `images/` and pick it again.

## Step 8 — Schedule on PostProxy

Read `reference/postproxy.md` and walk them through account, connected profiles and the
API key. Then pick the route that fits:
- **On their computer (preferred):** they run `node scripts/postproxy.mjs login` once
  in their own terminal; it stores the API key in the system keychain (macOS Keychain,
  Linux keyring) behind a hidden prompt. Then `profiles <ws>` → `schedule <ws>` (dry
  run: read it together) → explicit "yes, send" → `schedule <ws> --send`. Needs Node 18+.
  You may run these commands when you have a terminal; the key never passes through you.
- **Connector:** if your chat has a PostProxy connector/MCP, use it with the exported PNGs
  and the approved captions, one post at a time, and write the returned id into
  `post.postproxy.id` and status `scheduled`.
- **The studio's "Ask your AI to schedule" button** copies a ready prompt ("Schedule my exported
  post … Step 8: show me a dry run first"). When a person pastes it, do exactly that: dry run,
  wait for an explicit yes, then send.
- **Whichever way you send:** also write `post.sent = { at, caption, date, time, platforms }`
  with exactly what you sent. The page compares it with the post and shows an "Out of
  date" banner when they differ. When they ask you to "update the scheduled post", re-send
  the changed fields (and the re-exported PNG if the image text changed), then refresh `sent`.
- **By hand:** they upload in the PostProxy dashboard; you give them each caption and
  time, ready to paste.

## Step 9 — Keep an eye on it

The day after a post is due, run `node scripts/postproxy.mjs status <ws>` (or check via
the connector/dashboard). `published` → done. `failed` → read `postproxy.error`, use the
failure table in `reference/postproxy.md`, fix, set back to `exported`, schedule again.
The Calendar tab lists everything sent to PostProxy with the status stored in `post.postproxy`. The page can't reach PostProxy, so when they say "check my scheduled posts", look each one up and write the fresh `status` and `checkedAt` back.
Offer a monthly check-in: what got a response, which pillar to lean into, which template
to retire, then plan the next month from Step 5.

## Files

```
SKILL.md                 this pipeline
studio.html              the control page (copied into each workspace; opens from disk)
scripts/postproxy.mjs    login | profiles | schedule | status  (Node ≥18, no dependencies)
scripts/sync.mjs         register | forget | (no args) sync every workspace's studio.html
workspaces.json          the person's workspaces (created by sync.mjs; personal, never shared)
starter/workspace.json   neutral starting point for every new workspace
example/                 a complete demo workspace (fictional brand): workspace.json, images/, fonts/
reference/               design principles, image sources, no-image-generation, postproxy
docs/architecture.md     the workspace.json contract
```

## Ending each session

Tell them in four short lines: what's done · what's waiting on them · what hasn't been
checked · what to look at next time.
