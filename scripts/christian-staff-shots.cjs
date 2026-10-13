/* Makes the staff app's picture tutorial: real screenshots of the Melody + Nalu Vida guest apps at iPhone width, with the
   button to press circled and numbered. FAKE guest data only ("Test Guest", test.guest@example.com); the backend URL is
   empty in this repo state, so nothing leaves the browser (and every non-local request is blocked here anyway).
   Run:  python3 -m http.server 8778 --bind 127.0.0.1   (repo root), then
         PW=~/dev/antidote-outreach/node_modules/playwright node scripts/christian-staff-shots.cjs
   Output: staff/christian/img/<m|n>-<step>.jpg */
const path = require("path"), fs = require("fs");
const { chromium } = require(process.env.PW || "playwright");
const BASE = process.env.BASE || "http://127.0.0.1:8778/";
const OUT = path.join(__dirname, "..", "staff", "christian", "img");
const R = [["m", "demo/melody-lax/", "ssai_crm_melody-bar-grill"], ["n", "demo/nalu-vida/", "ssai_crm_nalu-vida"]];

async function mark(page, targets, opts) {   // targets: [[selector, label]] → rings + numbered badges, centred on the first
  return page.evaluate(([targets, opts]) => {
    document.querySelectorAll(".ssai-mk").forEach((x) => x.remove());
    let first = null;
    targets.forEach(([sel, lab], i) => {
      const el = typeof sel === "string" ? [...document.querySelectorAll(sel)].filter((e) => e.offsetParent || getComputedStyle(e).position === "fixed")[0] : null;
      if (!el) throw new Error("missing " + sel);
      if (!first) { first = el; if (opts.block !== "none") el.scrollIntoView({ block: opts.block || "center" }); }
    });
    return new Promise((res) => setTimeout(() => {
      targets.forEach(([sel, lab]) => {
        const el = [...document.querySelectorAll(sel)].filter((e) => e.offsetParent || getComputedStyle(e).position === "fixed")[0], r = el.getBoundingClientRect(), p = 6;
        const ring = document.createElement("div"); ring.className = "ssai-mk";
        ring.style.cssText = `position:fixed;z-index:2147483646;left:${r.left - p}px;top:${r.top - p}px;width:${r.width + 2 * p}px;height:${r.height + 2 * p}px;border:4px solid #ff2d55;border-radius:14px;box-shadow:0 0 0 3px #fff8,0 0 24px #ff2d55;pointer-events:none`;
        const b = document.createElement("div"); b.className = "ssai-mk"; b.textContent = lab;
        const bx = Math.min(window.innerWidth - 40, Math.max(4, r.right - 6)), by = Math.max(4, r.top - 22);
        b.style.cssText = `position:fixed;z-index:2147483647;left:${bx}px;top:${by}px;min-width:34px;height:34px;border-radius:17px;background:#ff2d55;color:#fff;font:900 19px/34px system-ui;text-align:center;box-shadow:0 2px 8px #0008;pointer-events:none;padding:0 6px`;
        document.body.append(ring, b);
      });
      res();
    }, 450));
  }, [targets, opts || {}]);
}
async function shot(page, name) { await page.screenshot({ path: path.join(OUT, name + ".jpg"), type: "jpeg", quality: 68 }); await page.evaluate(() => document.querySelectorAll(".ssai-mk").forEach((x) => x.remove())); console.log("  ", name); }
const click = (page, sel) => page.evaluate((s) => { const e = [...document.querySelectorAll(s)].filter((x) => x.offsetParent || getComputedStyle(x).position === "fixed")[0]; if (!e) throw new Error("no " + s); e.click(); }, sel);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const [k, url, key] of R) {
    console.log(k, url);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/Los_Angeles" });
    await ctx.route("**/*", (r) => { const u = r.request().url(); return u.startsWith(BASE) || u.startsWith("data:") || /fonts\.(googleapis|gstatic)\.com/.test(u) ? r.continue() : r.abort(); });
    const page = await ctx.newPage(); const errs = []; page.on("pageerror", (e) => errs.push(String(e)));
    await page.addInitScript((key) => { try { localStorage.setItem(key + "_earn_seen", "m"); } catch (e) {} }, key);   // skip the one-time "How to earn" sheet
    await page.goto(BASE + url, { waitUntil: "load" }); await page.waitForTimeout(1200);
    await page.addStyleTag({ content: ".a2hs,#a2hs,.ssai-a2hs,[class*=a2hs],.fly-l,.fly-d,[class^=fly]{display:none!important}" });
    // 1. helping a guest join: the join card's form
    await page.evaluate(() => { const f = document.querySelector("#crm-join form"); f.name.value = "Test Guest"; f.email.value = "test.guest@example.com"; f.ok.checked = true; });
    await page.evaluate(() => { document.querySelector("#crm-join input[name=name]").scrollIntoView({ block: "start" }); window.scrollBy(0, -150); });
    await mark(page, [["#crm-join input[name=name]", "1"], ["#crm-join input[name=email]", "2"], ["#crm-join input[name=ok]", "3"], ["#crm-join button.go", "4"]], { block: "none" });
    await shot(page, k + "-join");
    await click(page, "#crm-join button.go"); await page.waitForTimeout(700);
    // give the fake member enough points for a reward, then reload
    await page.evaluate((key) => { const l = JSON.parse(localStorage.getItem(key)); l[0].stars = 640; localStorage.setItem(key, JSON.stringify(l)); }, key);
    await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200);
    await page.addStyleTag({ content: ".a2hs,#a2hs,.ssai-a2hs,[class*=a2hs],.fly-l,.fly-d,[class^=fly]{display:none!important}" });
    // 2. the rewards card: Add my visit
    await mark(page, [["#crm-join [data-a=visit]", "1"]]); await shot(page, k + "-card");
    // 3. Add my visit sheet
    await click(page, "#crm-join [data-a=visit]"); await page.waitForTimeout(500);
    await page.evaluate(() => { const q = (s) => document.querySelector(".ir-sh [data-ir=" + s + "]"); q("check").value = "142"; q("total").value = "48.50"; });
    await mark(page, [[".ir-sh .ir-pick", "1"], [".ir-sh [data-ir=check]", "2"], [".ir-sh [data-ir=total]", "3"], [".ir-sh [data-ir=go]", "4"]], { block: "nearest" });
    await shot(page, k + "-visit");
    await click(page, ".ir-sh [data-ir=go]"); await page.waitForTimeout(3000);   // let the "+points" toast fade
    // 4. ladder: Use reward
    await mark(page, [["#crm-join button[data-redeem]:not([disabled])", "1"]]); await shot(page, k + "-ladder");
    await click(page, "#crm-join button[data-redeem]:not([disabled])"); await page.waitForTimeout(500);
    await mark(page, [[".ir-sh [data-ir=go]", "2"]], { block: "nearest" }); await shot(page, k + "-confirm");
    await click(page, ".ir-sh [data-ir=go]"); await page.waitForTimeout(1300);
    // 5. the live pass: clock, countdown, code, Toast button
    await mark(page, [[".ir-pass [data-ir=clock]", "1"], [".ir-pass [data-ir=cd]", "2"], [".ir-pass .ir-code", "3"], [".ir-pass .ir-srv", "4"]], { block: "nearest" });
    await shot(page, k + "-pass");
    // 6. expired / used
    await page.evaluate(() => SSAI_INTERIM.expireNow()); await page.waitForTimeout(800);
    await mark(page, [[".ir-pass .ir-stamp", "✕"]], { block: "nearest" }); await shot(page, k + "-expired");
    await click(page, ".ir-pass .ir-hide"); await page.waitForTimeout(400);
    // 7. one reward per visit
    await page.evaluate((key) => { const l = JSON.parse(localStorage.getItem(key)); l[0].stars = 900; localStorage.setItem(key, JSON.stringify(l)); }, key);
    await page.evaluate(() => SSAI_CRM.redraw()); await page.waitForTimeout(300);
    await click(page, "#crm-join button[data-redeem]:not([disabled])"); await page.waitForTimeout(500);
    await mark(page, [[".ir-sh h3", "!"]], { block: "nearest" }); await shot(page, k + "-onereward");
    if (errs.length) console.log("  page errors:", errs);
    await ctx.close();
    // ---- early-bird gift (fresh guest; a FAKE backend in the page, test hook window.SSAI_EB_FAKE) ----
    for (const mode of ["fixed", "wheel", "raffle"]) {
      const c2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, isMobile: true, hasTouch: true, locale: "en-US", timezoneId: "America/Los_Angeles" });
      await c2.route("**/*", (r) => { const u = r.request().url(); return u.startsWith(BASE) || u.startsWith("data:") || /fonts\.(googleapis|gstatic)\.com/.test(u) ? r.continue() : r.abort(); });
      const gift = k === "m" ? "Free Mac & Cheese" : "Free Jungle Fries";
      await c2.addInitScript(([key, mode, gift]) => {
        localStorage.setItem(key + "_earn_seen", "m");
        localStorage.setItem(key, JSON.stringify([{ id: "TESTEB01", name: "Test Guest", email: "test.guest@example.com", phone: "", bday: -1, visits: 1, stars: 120, last: Date.now(), joined: Date.now() - 9 * 864e5, code: "TEST-0001", ref: "TEST-K9", friends: [], ledger: [] }]));
        const golive = new Date().toLocaleDateString("en-CA");
        const S = { ok: true, on: true, cfg: { golive, mode, gift, days: 3, button: "App Reward – Early Bird Gift", drawDate: golive,
          slices: [["Free fries", 40], ["Free soft drink", 30], [gift, 20], ["Free starter", 10]], items: [[gift, 3], ["Free starter", 5]] }, state: mode === "raffle" ? "won" : "ready", item: mode === "raffle" ? gift : "", until: 0 };
        window.SSAI_EB_FAKE = (b) => new Promise((res) => setTimeout(() => {
          if (b.type === "status") return res(JSON.parse(JSON.stringify(S)));
          if (b.type === "eb_activate") { S.state = "active"; S.item = mode === "wheel" ? "Free fries" : gift; S.until = Date.now() + 3 * 864e5; return res({ ok: true, state: "active", item: S.item, until: S.until, slice: mode === "wheel" ? 0 : -1 }); }
          if (b.type === "eb_redeem") { S.state = "used"; return res({ ok: true, state: "used" }); }
          res({ ok: false });
        }, 60));
      }, [key, mode, gift]);
      const p2 = await c2.newPage(); p2.on("pageerror", (e) => errs.push(String(e)));
      await p2.goto(BASE + url, { waitUntil: "load" }); await p2.waitForTimeout(1500);
      await p2.addStyleTag({ content: ".a2hs,#a2hs,.ssai-a2hs,[class*=a2hs],.fly-l,.fly-d,[class^=fly]{display:none!important}" });
      await mark(p2, [["#eb-card .eb-go", "1"]], { block: "center" }); await shot(p2, k + "-eb-" + mode);
      if (mode === "fixed") {
        await click(p2, "#eb-card .eb-go"); await p2.waitForTimeout(700);
        await mark(p2, [["#eb-card .eb-go", "2"]], { block: "center" }); await shot(p2, k + "-eb-active");
        await click(p2, "#eb-card .eb-go"); await p2.waitForTimeout(1300);
        await mark(p2, [[".ir-pass .ir-rw", "1"], [".ir-pass .ir-srv", "2"]], { block: "nearest" }); await shot(p2, k + "-eb-pass");
      }
      await c2.close();
    }
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
