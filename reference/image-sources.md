# Image sources

Load this at the images step, or whenever the person asks "where do I get pictures?".
Ask which sources they prefer, record the answer in `workspace.imageSources`, then use
sources in that order.

## Privacy and rights rules (read first, always apply)

1. **Only images the person owns or has the right to use.** Their own photos, photos
   they commissioned with usage rights, or stock/open-licence images whose licence
   allows it. If unsure, do not use it; ask.
2. **People in photos need their consent** to appear in a business post. Ask: "Is
   everyone recognisable in this photo OK with it being posted?" Children: only with a
   parent's consent, and prefer photos where they are not identifiable.
3. **Never read chat text into the model.** Chat exports (`_chat.txt`, `messages.html`,
   `result.json`, `message_1.json`, iMessage databases) contain other people's
   messages and personal data. Do not open, read, summarise, or search them. Work only
   with the media files.
4. **Copy only media files into `images/inbox/`** (jpg, jpeg, png, heic, webp). Then
   the person picks; picked files move to `images/`. Leave everything else where it was.
5. **Strip location data before posting where possible.** Photos from phones often
   carry GPS coordinates in EXIF. Optional, if `exiftool` is installed:
   `exiftool -gps:all= -overwrite_original images/<file>.jpg`
   Exporting to PNG from the studio also drops the original EXIF (inferred: the PNG is
   re-rendered from a canvas).
6. **Record credit and licence on every post** in `image.credit`, e.g.
   `"Own photo"`, `"Photo: Ana Lima / Pexels"`,
   `"Photo: J. Doe, CC BY 4.0, via Openverse (Flickr)"`.
   No credit recorded = post is not ready.

## 1. The person's own folders

- Ask for a folder path (agentic mode) or ask them to drag images into the studio
  ("Open folder" or drag-drop).
- Copy (or symlink) chosen files into the workspace `images/` folder. Never move or
  rename the originals.
- Look at filenames and image content only; do not crawl the whole home directory.

## 2. Cloud drives via desktop sync folders

The simplest route: the drive's desktop app shows files as a normal folder. Many apps
keep only placeholders until a file is opened, so ask the person to mark the folder
as offline first, otherwise copying may fail or be slow.

| Service | Desktop app | Make files local |
|---|---|---|
| Google Drive | Google Drive for desktop | Right-click folder → Offline access → Available offline (or set "Mirror files") |
| OneDrive | OneDrive app (built into Windows; Mac app) | Right-click → Always keep on this device |
| Dropbox | Dropbox desktop app | Right-click → Make available offline |
| iCloud Drive (Mac) | Built into macOS (Finder → iCloud Drive) | Control-click → Keep Downloaded (macOS Sequoia and later) |
| Proton Drive | Proton Drive desktop app (on-demand sync on macOS) | Right-click → Make Available Offline |
| Nextcloud | Nextcloud desktop client | With virtual files enabled: right-click → Always available locally |

Then treat it as section 1. Photos stored in Google Photos or iCloud Photos (not Drive)
are a different service: ask the person to export or select and download them into a
folder first.

## 3. URLs

- Accept direct image URLs the person gives, for images they have rights to (their own
  website, their own hosted media).
- Prefer downloading into `images/` over hotlinking, so posts do not break later.
  Exception: Unsplash (see below).
- Do not take images from other people's websites or social accounts.

## 4. Image APIs

All verified 2026-10-02 against the provider pages unless marked.

**Pexels** (search lives in the studio page)
- Needs a free API key (pexels.com/api). The person pastes it into the studio; it stays
  in that browser only, never in `workspace.json` or chat.
- Licence: free to use and modify; attribution not required but appreciated. Not
  allowed: showing identifiable people in a bad light, implying endorsement, selling
  unaltered copies, using as a logo/trademark.
- API guidelines ask apps to show a prominent link to Pexels and credit photographers
  where possible ("Photo by X on Pexels"). We always record it in `image.credit`.
- Default limit 200 requests/hour, 20,000/month.

**Openverse** (search lives in the studio page)
- No key needed for basic search (anonymous requests are rate-limited and capped at
  20 results per page).
- Results are Creative Commons or public-domain works from many sites; each result
  includes `license`, `license_url`, `creator`, and an `attribution` string.
- Openverse does not verify licences. Open the source page and confirm the licence
  before use.
- Most CC licences require credit: author, licence name with link, source. Use the
  `attribution` field as `image.credit`. Avoid `-ND` (no derivatives) works if the
  image will be cropped or overlaid (cropping as adaptation is debated; avoid to be safe),
  and `-NC` (non-commercial) works for business posts.

**Unsplash** (not built into the studio; manual or agentic only)
- Needs a registered app and Access Key; keep it secret.
- API guidelines: hotlink images using the returned `photo.urls`, trigger the
  `download_location` endpoint when a photo is chosen, and credit photographer and
  Unsplash with links (with `utm_source`/`utm_medium=referral` parameters).
- Simplest for a non-technical person: download from unsplash.com in the browser and
  credit "Photo: Name / Unsplash".

**Wikimedia Commons**
- No key needed. Every file has its own licence (CC BY, CC BY-SA, CC0, public domain…).
- Credit must include author, licence, and source unless the licence says otherwise.
  The API's `imageinfo` with `extmetadata` returns `Artist`, `LicenseShortName`,
  `AttributionRequired`.
- Good for places, landmarks, historical images; check that people shown consented
  or are public figures in a public context.

## 5. Social media exports (the person's own posts)

**Instagram "Download your information"**
- Path: Accounts Center → Your information and permissions → Export / Download your
  information → choose the account, "Some of your information" → Content, format JSON,
  quality High. Meta emails a ZIP link (can take hours).
- Look at the folder structure of the actual ZIP (it changes): find the JSON with the
  person's posts and the folder with their photos.
- Copy only the person's own post images. You may read the posts JSON for their own
  captions and dates (useful for voice and brand), but do NOT open messages, comments
  or follower files: those are other people's data.

**LinkedIn data export**
- Path: Me → Settings & Privacy → Data privacy → Get a copy of your data. Choose
  "Posts"/specific files, or the larger archive (emailed, up to ~24h).
- Gives CSVs such as `Shares.csv` (your post text, dates, links). Images are easiest
  to take from the person's own originals.
- Do not read `Connections.csv`, `messages.csv`, or invitations: third-party data.

## 6. Messaging apps (photos sent to the person)

Only for photos the person took, or received with permission to post. Ask first:
"Who took this, and are the people in it OK with it being posted?"

**WhatsApp**: chat → contact/group name → Export chat → Attach media. The ZIP holds
`_chat.txt` plus the media files.
Unzip, copy only image files to `images/inbox/`, never open `_chat.txt`. Alternative:
open the photo in WhatsApp and Save, then use section 1.

**Signal Desktop**: no built-in bulk media export. Open the conversation → media
gallery or the image → Save / Download, one at a time, into a folder. Do not try to
read Signal's data folder: it holds other people's messages.

**Telegram Desktop**: chat → ⋮ → Export chat history → tick only Photos (untick
videos, voice, files etc.), format HTML or JSON. The export folder still contains
`messages.html` or `result.json` with the chat text: copy only the `photos/` folder,
never open the message files.

**iMessage (macOS)**: attachments live under `~/Library/Messages/Attachments/`.
Reading that folder needs Full Disk Access for the terminal app (System Settings →
Privacy & Security → Full Disk Access). Prefer the manual route: open Messages,
select photos → drag to a folder, or Save to Photos. If using the folder, copy only
image files and never touch `~/Library/Messages/chat.db`.

## 7. Recording preferences: `workspace.imageSources`

Shape: `{ "order": [...], "folders": [...], "notes": "..." }`.
`order` values used by the studio: `local`, `pexels`, `openverse`, `url`. Other
sources (whatsapp, instagram-export, drive…) are noted in `notes` and land in a folder.

**Example 1**
> Person: "I've got loads of photos in my Google Drive, folder 'Shop 2026'. Stock photos are fine if needed but I'd rather use mine."

```json
{
  "order": ["local", "pexels"],
  "folders": ["images", "~/Google Drive/My Drive/Shop 2026"],
  "notes": "Prefers own photos. Drive folder marked available offline. Pexels only as fallback."
}
```

**Example 2**
> Person: "My clients send me photos on WhatsApp after workshops, they've all agreed. No stock photos, they look fake."

```json
{
  "order": ["local"],
  "folders": ["images", "images/inbox"],
  "notes": "Workshop photos from WhatsApp exports (media only, consent confirmed by person for each workshop). No stock photos. Never open _chat.txt."
}
```

**Example 3**
> Person: "I don't have good photos. Can we use free ones, and maybe old paintings? I like that look."

```json
{
  "order": ["openverse", "pexels", "url"],
  "folders": ["images"],
  "notes": "No own photo library. Likes classical paintings: Openverse/Wikimedia public-domain or CC0 first; avoid NC/ND licences; credit always recorded. Pexels for modern scenes. Consider typographic layouts when no image fits."
}
```
