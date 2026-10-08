# Design principles for social posts

Load this when you design templates (step: brand) or review demo posts.
Every rule is checkable. Sizes are in pixels on the real export canvas
(`square` 1080×1080, `portrait` 1080×1350, `story` 1080×1920, `landscape` 1200×627).

Explain choices to the person in plain words ("the title is bigger so the eye lands
there first"), not design jargon.

## 1. Hierarchy

- One focal point per post: a headline, a photo, or a number. Not two.
- At most 3 text levels: headline, supporting line, small label (eyebrow, CTA, handle).
- Each level must differ clearly from the next: at least 1.5× in size, or a change in
  weight plus colour.
- Squint test: blur the post mentally. The thing you see first must be the message.
- The CTA, if present, is the last thing read, not the first.

## 2. Type

- Max 2 families per post (display + body). A third (accent/script) only for one or
  two words, never for sentences.
- Pair by contrast: expressive display (serif, condensed, heavy) with a calm, legible
  body (humanist sans or text serif). Do not pair two similar sans-serifs.
- Minimum sizes on a 1080-wide canvas, so text survives a phone screen:
  - body / supporting text ≥ 28px (prefer 30–36)
  - small labels ≥ 22px, and only for short labels (handle, date)
  - headline usually 64–120px
- Line length: 20–40 characters per line for body on a post. Break long lines.
- Line height: headlines 1.0–1.2, body 1.3–1.5.
- ALL CAPS: only for short labels; add tracking (letter-spacing) of +0.05em to +0.15em.
  Never set a full sentence in caps.
- Script fonts: never below ~48px, never for anything that must be read quickly.
- Left-align body text. Centre only short headlines and quotes (≤ 3 lines).

## 3. Colour

- 60-30-10: about 60% dominant (background), 30% secondary (surface, photo, blocks),
  10% accent (CTA, one highlight word, a line). The accent is rare on purpose.
- Contrast (WCAG 2.x): body text ≥ 4.5:1 against its background; large text
  (≥ 24px regular or ≥ 18.66px bold at 1× screen, which every post headline exceeds)
  ≥ 3:1. Treat headlines as large, everything else as body. Check with any contrast
  checker; if unsure, darken or lighten until it passes.
- Text over photos always needs help: a scrim (gradient from transparent to 50–80%
  dark), a solid panel behind the text, or placing text on a calm, even area of the
  photo. Check contrast against the busiest part under the text, not the average.
- Use the brand tokens (`bg`, `surface`, `text`, `muted`, `accent`, `accent2`). Do not
  invent new colours per post; use `overrides` sparingly and on purpose.
- Never encode meaning in colour alone (e.g. "red = sold out").

## 4. Layout, margins and safe zones

- Outer margin ≥ 64px on 1080 canvases (token `layout.padding`, default 80). Nothing
  important touches the edge.
- Align everything to a few shared edges. Fewer alignment lines = calmer post.
- Group related items; separate groups with more space than items inside a group.
- White space is a feature. If it feels cramped, remove an element before shrinking text.

Per format:

| Format | Size | Rules |
|---|---|---|
| Instagram feed, recommended | 1080×1350 (`portrait`, 4:5) | Takes the most screen height in the feed. |
| Instagram profile grid | shows a 3:4 centre crop | Since early 2025 the profile grid previews posts at 3:4 (verified via several secondary sources reporting Instagram's January 2025 change; not checked against an official Meta page). On a 1080×1350 post, about 45px top and bottom are hidden in the grid: keep headline and logo out of the top/bottom ~60px. |
| Instagram feed, square | 1080×1080 | Still valid; the grid crops the sides to 3:4, so keep text away from the left/right ~100px. |
| Story | 1080×1920 (`story`) | Keep ≥ 250px at the top and ≥ 340px at the bottom free of text and logos (profile bar, reply box). Keep ~65px clear on each side. |
| LinkedIn link-style / landscape | 1200×627 (`landscape`) | Short headline only; text gets small in the feed. |
| LinkedIn feed image | 1080×1080 or 1080×1350 | Square or portrait takes more of the mobile feed than landscape. |

## 5. Copy on the image

- Headline ≤ ~12 words. If it needs more, the rest goes in the caption.
- Total words on the image ≤ ~25 for most posts (lists/steps posts excepted, max 5 items).
- One idea per post.
- The image text and the caption must not repeat each other word for word: the image
  hooks, the caption explains.
- Use the brand's `voice.address` (tu / vous / you) and `languages` consistently.

## 6. Consistency vs variety

- The account should be recognisable from the grid without reading: same palette,
  same 2 fonts, same logo position, same corner radius and texture.
- Variety comes from layouts, not from new styles: rotate 3–5 templates (e.g. quote,
  photo + headline, tip/list, announcement, event).
- Do not use the same template more than twice in a row on the calendar.
- Change one variable at a time when experimenting (layout or colour emphasis,
  not both).

## 7. Accessibility

- Every post with meaningful imagery gets alt text. Put it in the caption's last line
  ("Image: …") unless the platform alt-text field is set; describe what matters, ≤ 125
  characters.
- No information only in the image: dates, prices, addresses, links also go in the
  caption.
- Emoji: max ~3 per caption, never replacing words, never in the middle of a sentence
  (screen readers read their names aloud).
- Hashtags: 3–5 relevant ones, at the end, CamelCase for multi-word tags
  (`#SmallBusinessLuxembourg`) so screen readers pronounce them.
- No flashing or tiny low-contrast text "for style".

## 8. Deriving a brand's vibe without copying

Use this when the person shows existing work (their own past posts, website, flyers)
or work they admire (someone else's account).

1. **Observe and write down**, in `sources/inventory.md`, for each source:
   - palette: 3–6 dominant colours (hex), which is background vs accent
   - type personality: serif/sans/script, heavy or light, tight or airy, caps or not
   - density: lots of text vs mostly image; how much empty space
   - shape language: sharp vs rounded corners, lines, circles, organic blobs, frames
   - photo style: warm/cool, bright/moody, people/objects/places, close/wide, saturation
   - tone of voice: formal/casual, tu/vous, short/long, humour, emoji use
2. **Abstract** each observation into a token or a rule ("rounded 24px corners",
   "muted warm palette, one saturated accent", "photos of hands and materials, no faces").
3. **Re-express**: build templates from those tokens and rules with your own layout.
   Pick fonts with the same personality that the person may use: their own licensed
   fonts, or open-licence fonts (Google Fonts, Fontshare…) downloaded into `fonts/`.
   Never reuse another account's licensed font files, logos, illustrations or photos.
4. **Never trace**: do not reproduce another account's exact layout, wording, or
   signature graphic. If a template could be mistaken for theirs, change the
   composition. Admired accounts inform mood; the person's own work defines the brand.
5. Record in `brand.sources` where each idea came from, so every choice is traceable.

## 9. Review checklist (run on every demo post)

Answer each line yes/no. Fix every "no" before showing the post, or tell the person
why you left it.

- [ ] One focal point; the message is what I see first.
- [ ] ≤ 3 text levels; ≤ 2 font families (+ optional accent for 1–2 words).
- [ ] Body text ≥ 28px; labels ≥ 22px; caps only on short labels, with tracking.
- [ ] Headline ≤ ~12 words; whole image ≤ ~25 words.
- [ ] Contrast: body ≥ 4.5:1, headline ≥ 3:1, checked on the busiest area under text.
- [ ] Text over photo has a scrim, panel, or sits on a calm area.
- [ ] Margins ≥ 64px; nothing important in the format's crop or safe zone.
- [ ] Colours come from brand tokens; accent used ~10%.
- [ ] Looks like the rest of the account (fonts, logo position, radius, texture).
- [ ] Not the same template as the previous two posts.
- [ ] Image has a recorded `image.credit` and the person has the right to use it.
- [ ] Caption carries all key facts, alt text, ≤ 3 emoji, 3–5 hashtags at the end.
- [ ] Nothing in the design is traced from someone else's work.
