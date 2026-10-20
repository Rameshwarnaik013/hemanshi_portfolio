// Prints cv.html to ../Hemanshi_Dubey_CV.pdf (A4, one page) with Playwright's Chromium.
// Fails if the content runs past the page's bottom margin.
// Usage: node cv/build-cv.cjs   (from the repo root)
const path = require("path");
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

(async () => {
  const src = path.join(__dirname, "cv.html");
  const out = path.join(__dirname, "..", "Hemanshi_Dubey_CV.pdf");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("file://" + src, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const fit = await page.evaluate(() => {
    const p = document.querySelector(".page"), r = p.getBoundingClientRect();
    const padBottom = parseFloat(getComputedStyle(p).paddingBottom);
    const last = [...p.querySelectorAll("section")].reduce((m, s) => Math.max(m, s.getBoundingClientRect().bottom), 0);
    return { contentBottom: Math.round(last), limit: Math.round(r.bottom - padBottom), spare: Math.round(r.bottom - padBottom - last) };
  });
  await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log(JSON.stringify(fit), "->", out);
  if (fit.spare < 0) { console.error("Content runs past the bottom margin: tighten the CV."); process.exit(1); }
})();
