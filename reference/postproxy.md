# PostProxy: setup, scheduling, monitoring

Load this at the schedule step. Walk the person through one numbered step at a time
and wait for "done" before the next. Facts checked against postproxy.dev docs on
2026-10-02.

PostProxy (postproxy.dev) is a posting service with an API: it holds the connections
to Instagram, LinkedIn etc. and publishes at the scheduled time. This skill talks to
it through `scripts/postproxy.mjs` (terminal) or a PostProxy connector (chat).

## 1. Account and profiles (in the browser, by the person)

1. Go to postproxy.dev and sign up. A first profile group is created automatically.
   Look at the pricing page together and pick the plan that covers their accounts.
2. Dashboard → Profiles → connect each account. Each connected account becomes a
   "profile".
   - **Instagram**: must be a professional account (Business or Creator); personal
     accounts cannot publish via the API. Switch in the Instagram app: Settings →
     Account type and tools → Switch to professional account. Then follow PostProxy's
     connect screen; if it sends them through a Facebook login, that is Meta's consent
     step, not something to work around.
   - **LinkedIn**: one connection covers the personal profile; company pages the person
     administers appear as "placements" of that profile. Ask which one each post should
     go to: personal profile or company page.
3. Confirm each profile shows as active in the dashboard.

## 2. API key: into the computer's keychain

1. Dashboard → API keys (in settings) → create a key. A key scoped to one profile group
   is safer than an account-wide key.
2. The person runs, in their own terminal: `node scripts/postproxy.mjs login`
   It asks for the key (hidden as they paste) and stores it in the system keychain:
   macOS Keychain, or the Secret Service keyring on Linux (`secret-tool`). It never
   lands in a file, the chat, `workspace.json` or shell history. Every later command
   reads it from there.
   - Windows (no built-in keychain tool the script can use yet): set it for the current
     PowerShell session only, `$env:POSTPROXY_API_KEY='…'`.
   - To remove it on macOS: Keychain Access → search "local-post-studio" → delete.
3. If the key ever appears in chat, a file, or a screenshot: treat it as leaked. Delete
   it in the dashboard, create a new one, run `login` again.

As the model: tell the person which command to type. You never type, see or ask for
the key.

## 3. Commands (Node ≥ 18, run from the skill folder; `<ws>` = workspace folder)

| Command | What it does |
|---|---|
| `node scripts/postproxy.mjs login` | Stores the API key in the keychain (prompts, hidden). |
| `node scripts/postproxy.mjs profiles <ws>` | Lists connected profiles (id, platform, status). Run first to check the key and connections. |
| `node scripts/postproxy.mjs schedule <ws>` | **Dry run.** Validates posts that are `approved` + `exported` (future date, PNG exists, caption length per platform) and prints what would be sent. Sends nothing. |
| `node scripts/postproxy.mjs schedule <ws> --send` | Uploads each PNG (multipart `media[]`) with caption and `scheduled_at`, records `postproxy.id`, sets status `scheduled`. |
| `node scripts/postproxy.mjs status <ws>` | Fetches each scheduled post from PostProxy and updates `status` (`published` / `failed`) and `postproxy.checkedAt`. |

Sequence with the person: `profiles` → `schedule` (read the dry-run output together) →
explicit "yes, send" from the person → `schedule --send` → `status` the next day.
Never run `--send` without that explicit yes in the current conversation.

Limits to check in the dry run (PostProxy platform pages):
- Instagram: images JPG/PNG, ≤ 8 MB, min 200×200; caption ≤ 2,200 chars; ~100
  API posts per 24h. Stories take no caption.
- Carousels (`post.slides`): `schedule` sends every slide's PNG as repeated `media[]`, in order, and only
  when all `<id>-N.png` files exist. Instagram: up to 10 images (PostProxy's Instagram page, checked
  2026-10-08). That page also says "Images must be JPEG"; if a PNG carousel is refused with a format
  error, export is still PNG: convert the slides to JPG before sending. Other platforms: PostProxy's docs
  do not confirm multi-image posts, so the dry run prints a WARN and still sends.
- LinkedIn: images JPG/PNG/GIF, ≤ 8 MB, min 552×276; text ≤ 3,000 chars.
- Scheduled posts can be edited until 5 minutes before publish time.

## 4. Chat-only path (no terminal)

- If the person's chat app offers a PostProxy connector / MCP server (claude.ai has
  one; PostProxy also hosts one at `mcp.postproxy.dev`), the model uses its tools to
  list profiles, create scheduled posts and check status. Read the connector's own
  tool descriptions; don't assume names.
- Media must reach PostProxy: a public image URL or an upload the connector accepts.
  If the connector can't take the exported PNG, use the terminal path or the
  dashboard. Never put the person's images on a random public host to get a URL.
- Same gates as the terminal path: show the list of posts, dates, captions and
  platforms; wait for an explicit yes before creating anything.
- Connecting the hosted MCP manually puts the API key in a URL: only do this in a
  harness config file the person controls, never in chat.

## 5. Fallback: manual upload

If neither path works: the person opens the PostProxy dashboard, creates each post,
uploads `exports/<post-id>.png`, copies the caption from the post in the studio and
sets date/time. Then set the post's `status` to `scheduled`
in the workspace by hand (or via the studio).

## 6. Monitoring

- The day after the first scheduled post, run `status` (or ask the connector). Then
  weekly, or the day after each post.
- PostProxy states: post-level `scheduled`, `processing`, `processed`,
  `media_processing_failed`, `draft`; per platform `processing`, `published`, `failed`.
  Failures carry `error`, `error_details.platform_error_message`, and
  `error_details.postproxy_note`: read these to the person in plain words.

| Symptom | Likely cause | What to do |
|---|---|---|
| Profile `expired` / `inactive`, or posts fail with an auth/token error | Platform token expired or permission revoked (Instagram tokens last ~60 days unless refreshed) | Person reconnects the profile in the dashboard (Profiles → reconnect). Then reschedule the failed posts. |
| `media_processing_failed` | File too big, wrong format, too small, or unreachable URL | Check the PNG: ≤ 8 MB, JPG/PNG, dimensions above minimums. Re-export (the studio exports at real size, normally well under 8 MB) and resend. |
| Platform `failed` with a rate-limit message | Too many posts in 24h | Space posts out; resend later. |
| `failed`, caption error | Caption too long or not allowed (e.g. Instagram Story) | Shorten the caption; resend. |
| Still `scheduled` after its time | Delay at PostProxy or platform | Wait an hour, run `status` again; then check the dashboard. |

After a fix, set the post back to `exported` and run `schedule` (dry run) again.
Never resend a post that is `published`: that would post it twice.
