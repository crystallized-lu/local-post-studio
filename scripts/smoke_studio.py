"""Smoke test for studio.html: loads the page in headless Chromium with a stubbed folder handle and the
example workspace, clicks through tabs, rail, sliders, share menu and slides, and prints any page error.
    python3 scripts/smoke_studio.py <repo-root>
Needs: pip install playwright && playwright install chromium. Not part of npm test (needs a browser)."""
import sys, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(sys.argv[1])
ws = (root/"example"/"workspace.json").read_text()
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width":1400,"height":900})
    pg.set_default_timeout(5000)  # a missing control should fail fast, not hang
    pg.on("pageerror", lambda e: errors.append("PAGEERROR " + str(e)))
    pg.on("console", lambda m: errors.append("CONSOLE " + m.text) if m.type in ("error",) else None)
    pg.goto((root/"studio.html").as_uri(), wait_until="load")
    pg.wait_for_timeout(500)
    # stub folder handle: reads example/workspace.json, swallows writes. idb() is replaced because a stub with
    # functions cannot be stored in IndexedDB, and useFolder is not awaited so a hang shows up as missing UI, not a crash.
    try:
        pg.evaluate("""(text) => {
          window.idb = async () => null;
          const file = { getFile: async () => new File([window.__ws ?? text], 'workspace.json', {lastModified: 1}), createWritable: async () => ({ write: async (d) => { window.__ws = d; }, close: async () => {} }) };
          window.__dir = { name: 'example', getFileHandle: async (n) => { if (n==='workspace.json') return file; throw new Error('no '+n); }, getDirectoryHandle: async () => { throw new Error('nodir'); }, queryPermission: async()=>'granted', requestPermission: async()=>'granted' };
          useFolder(window.__dir).catch((e) => console.error('useFolder: ' + e));
          return 0;
        }""", ws)
    except Exception as e:
        errors.append(f"EVALUATE: {e}")
    pg.wait_for_timeout(1500)
    if pg.evaluate("document.body.classList.contains('nows')"): errors.append("WORKSPACE did not open (welcome screen still showing)")
    def step(name, fn):
        try: fn(); pg.wait_for_timeout(250)
        except Exception as e: errors.append(f"STEP {name}: {e}")
    for t in ["posts","calendar","images","brand","posts"]:
        step("tab "+t, lambda: pg.click(f'nav.tabs button[data-tab={t}]'))
    for rail in ["Text","Caption","When & where","Design","Photo","Status","Style","Posts"]:  # names from RAIL in studio.html
        step("rail "+rail, lambda: pg.click(f'nav.rail button:has-text("{rail}")'))
    step("first post", lambda: pg.click('.prow .main >> nth=0'))
    # move every range input in Style and Brand
    def wiggle():
        for r in pg.query_selector_all('#panel input[type=range]'):
            mn, mx = float(r.get_attribute('min')), float(r.get_attribute('max'))
            r.evaluate("(el,v)=>{el.value=v; el.dispatchEvent(new Event('input',{bubbles:true}))}", (mn+mx)/2)
    step("rail Style", lambda: pg.click('nav.rail button:has-text("Style")'))
    step("wiggle style", wiggle)
    for sel in pg.query_selector_all('#panel select'):  # only the open rail section is visible; hidden selects are not controls
        if sel.is_visible(): step("select", lambda: sel.select_option(index=min(1, sel.evaluate("e=>e.options.length-1")), timeout=3000))
    step("brand tab", lambda: pg.click('nav.tabs button[data-tab=brand]'))
    step("wiggle brand", wiggle)
    step("open more", lambda: [d.evaluate("e=>e.open=true") for d in pg.query_selector_all('#panel details')])
    step("wiggle brand more", wiggle)
    step("posts tab", lambda: pg.click('nav.tabs button[data-tab=posts]'))
    step("click canvas", lambda: pg.click('.preview > .canvas', position={"x":30,"y":30}))
    step("click field", lambda: pg.click('.preview [data-field] >> nth=0'))
    step("share", lambda: pg.click('#btnShare'))
    step("approve", lambda: pg.click('#shareMenu button:has-text("Approve")'))
    step("share2", lambda: pg.click('#btnShare'))
    step("add slide", lambda: pg.select_option('.slides select', index=1))
    step("dup slide", lambda: pg.click('.slides button:has-text("Duplicate")'))
    step("move slide", lambda: pg.click('.slides button[title="Move this slide earlier"]'))
    pg.once("dialog", lambda d: d.accept())
    step("remove slide", lambda: pg.click('.slides button:has-text("Remove")'))
    step("calendar next", lambda: (pg.click('nav.tabs button[data-tab=calendar]'), pg.click('#stagebar button:has-text("›")')))
    step("new from brand board", lambda: (pg.click('nav.tabs button[data-tab=brand]'), pg.click('.gallery figure button >> nth=0')))
    step("theme", lambda: pg.click('#btnTheme'))
    saved = pg.evaluate("window.__ws ? JSON.parse(window.__ws).posts.length : -1")
    print("posts saved:", saved)
    b.close()
print("\n".join(errors) or "no errors")
sys.exit(1 if errors else 0)
