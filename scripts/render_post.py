#!/usr/bin/env python3
"""Render one post to a PNG exactly as the studio's Export PNG button would, with no browser window.

    python3 scripts/render_post.py <workspace-folder> <post-id> <out.png> [--studio studio.html] [--needs]

Use it to look at your own work (and to compare with a reference: see compare.py). It opens studio.html
in headless Chromium, hands it an in-memory copy of the workspace folder, picks the post and runs the
studio's own export, so what you see is what the person will get.

A carousel post exports every slide; --slide N picks which one this writes (default 1).

Needs: pip install playwright   (and a Chromium that Playwright can find; in the cloud workspace one is preinstalled)
--needs  just prints the files the post depends on (workspace.json, fonts, images) and exits. Use it to stage
         them when the workspace folder lives on the person's computer and this script runs elsewhere.
Only files named in workspace.json are loaded, so a big images/ folder costs nothing.
"""
import argparse, base64, json, os, re, sys

ap = argparse.ArgumentParser()
ap.add_argument('workspace'); ap.add_argument('post_id'); ap.add_argument('out')
ap.add_argument('--studio', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'studio.html'))
ap.add_argument('--needs', action='store_true')
ap.add_argument('--slide', type=int, default=1, help='for a carousel: which slide to write out (1 = the first)')
ap.add_argument('--width', type=int, default=1500)
a = ap.parse_args()

ws_path = os.path.join(a.workspace, 'workspace.json')
raw = open(ws_path, encoding='utf-8').read()
refs = set(re.findall(r'(?:images|fonts)/[^"\\\s\')]+', raw))  # every relative file the workspace points at
files = ['workspace.json'] + sorted(f for f in refs if os.path.splitext(f)[1])  # files only, not folders
if a.needs:
    print('\n'.join(files)); sys.exit(0)

data, missing = {}, []
for f in files:
    p = os.path.join(a.workspace, f)
    if os.path.isfile(p): data[f] = base64.b64encode(open(p, 'rb').read()).decode()
    else: missing.append(f)
if missing: print('Not found (rendered without them):', *missing, sep='\n  ', file=sys.stderr)

INIT = """
(() => {
  const files = %s;
  const mime = (n) => /\\.json$/.test(n) ? 'application/json' : /\\.webp$/.test(n) ? 'image/webp' : /\\.png$/.test(n) ? 'image/png' : /\\.jpe?g$/.test(n) ? 'image/jpeg' : /\\.svg$/.test(n) ? 'image/svg+xml' : /\\.woff2$/.test(n) ? 'font/woff2' : /\\.woff$/.test(n) ? 'font/woff' : /\\.ttf$/.test(n) ? 'font/ttf' : 'application/octet-stream';
  const bytes = (b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
  const mk = (name) => ({ kind: 'directory', name, kids: new Map() });
  const root = mk('workspace');
  const put = (path, data) => { const parts = path.split('/'); let d = root; for (const p of parts.slice(0, -1)) { if (!d.kids.has(p)) d.kids.set(p, mk(p)); d = d.kids.get(p); } d.kids.set(parts.at(-1), { kind: 'file', name: parts.at(-1), data }); };
  for (const [p, b] of Object.entries(files)) put(p, bytes(b));
  for (const d of ['exports', 'sources']) root.kids.set(d, mk(d));
  const wrapDir = (n) => ({
    kind: 'directory', name: n.name,
    async getFileHandle(name, o) { let f = n.kids.get(name); if (!f || f.kind !== 'file') { if (o && o.create) { f = { kind: 'file', name, data: new Uint8Array() }; n.kids.set(name, f); } else throw new DOMException('nf', 'NotFoundError'); } return wrapFile(f); },
    async getDirectoryHandle(name, o) { let d = n.kids.get(name); if (!d || d.kind !== 'directory') { if (o && o.create) { d = mk(name); n.kids.set(name, d); } else throw new DOMException('nf', 'NotFoundError'); } return wrapDir(d); },
    async *entries() { for (const [k, v] of n.kids) yield [k, v.kind === 'directory' ? wrapDir(v) : wrapFile(v)]; },
    async queryPermission() { return 'granted'; }, async requestPermission() { return 'granted'; },
    async removeEntry(name) { n.kids.delete(name); }, async isSameEntry(o) { return o && o.name === n.name; },
  });
  const wrapFile = (f) => ({
    kind: 'file', name: f.name,
    async getFile() { return new File([f.data], f.name, { type: mime(f.name), lastModified: Date.now() }); },
    async createWritable() { let buf = []; return { async write(d) { buf.push(d); }, async close() { f.data = new Uint8Array(await new Blob(buf).arrayBuffer()); } }; },
    async queryPermission() { return 'granted'; }, async requestPermission() { return 'granted'; },
  });
  const _put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (v, k) { try { return _put.call(this, v, k); } catch (e) { return _put.call(this, { name: 'fake' }, k); } };
  window.showDirectoryPicker = async () => wrapDir(root);
  window.__exported = (name) => { const f = root.kids.get('exports').kids.get(name); if (!f || !f.data.length) return null; let s = ''; const u = f.data; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
})();
""" % json.dumps(data)

from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width': a.width, 'height': 1000})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(INIT)
    pg.goto('file://' + os.path.abspath(a.studio)); pg.wait_for_timeout(400)
    pg.get_by_role('button', name='Open a folder…').first.click(); pg.wait_for_timeout(2000)
    ok = pg.evaluate("(id) => { const p = ws.posts.find((x) => x.id === id); if (!p) return false; currentId = id; tab = 'posts'; render(); return true; }", a.post_id)
    if not ok:
        print('No post with id', a.post_id, '. Posts:', pg.evaluate("ws.posts.map((p) => p.id)"), file=sys.stderr); sys.exit(2)
    pg.wait_for_timeout(500)
    name = pg.evaluate("([id, i]) => exportFile(ws.posts.find((x) => x.id === id), i)", [a.post_id, a.slide - 1])
    pg.evaluate("exportPost(currentPost())")
    png = None
    for _ in range(40):
        pg.wait_for_timeout(500)
        png = pg.evaluate("(n) => window.__exported(n)", name)
        if png: break
    b.close()
if not png:
    print('Export did not finish.', *errs[:3], file=sys.stderr); sys.exit(1)
open(a.out, 'wb').write(base64.b64decode(png))
print('Wrote', a.out)
