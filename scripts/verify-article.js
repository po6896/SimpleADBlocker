#!/usr/bin/env node
/*
 * Open a site's top page, follow the first real article link, apply the
 * blocker there, and report visible external ad links/iframes + screenshot.
 * Article pages often carry a different ad layout than the index.
 *
 * Usage: node scripts/verify-article.js <topUrl> <siteDomain> <tag>
 */
const { chromium } = require('playwright');
const { installBlocker } = require('../test/harness/sleipnir-shim');
const fs = require('fs');
const path = require('path');

const SLEX = path.join(__dirname, '..', 'sleipnir-adblock.slex.js');
const EL = fs.readFileSync(path.join(__dirname, 'easylist.txt'), 'utf8');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36 Sleipnir/4';
const OUT = path.join(__dirname, '..', 'test', 'reports');

(async () => {
  const top = process.argv[2];
  const site = process.argv[3] || '';
  const tag = process.argv[4] || 'article';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  try { await page.goto(top, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { console.log('goto top:', e.message); }
  await page.waitForTimeout(1500);

  const link = await page.evaluate((site) => {
    const as = [...document.querySelectorAll('a[href]')];
    for (const a of as) {
      try {
        const u = new URL(a.href);
        if (u.hostname.endsWith(site) && u.pathname.length > 8 && !/\/(category|tag|page|author|wp-)/.test(u.pathname)) {
          return a.href;
        }
      } catch (_) {}
    }
    return null;
  }, site);
  console.log('article:', link);
  if (!link) { await browser.close(); return; }

  try { await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { console.log('goto article:', e.message); }
  await page.waitForTimeout(2000);
  await installBlocker(page, SLEX, { easylistText: EL });
  await page.waitForTimeout(6500);
  await page.evaluate(async () => {
    for (let i = 0; i < 12; i++) { window.scrollBy(0, 700); await new Promise((r) => setTimeout(r, 350)); }
    window.scrollTo(0, 0);
  }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUT, `article-${tag}-after.png`), fullPage: true }).catch(() => {});

  const slots = await page.evaluate((site) => {
    function host(u) { try { return new URL(u, location.href).hostname.toLowerCase(); } catch (_) { return ''; } }
    function sel(e) {
      let s = e.tagName.toLowerCase();
      if (e.id) s += '#' + e.id;
      else if (e.className && e.className.toString().trim()) s += '.' + e.className.toString().trim().split(/\s+/).slice(0, 3).join('.');
      return s;
    }
    const out = [];
    const seen = new Set();
    for (const e of document.querySelectorAll('a[href],iframe[src],ins')) {
      const r = e.getBoundingClientRect();
      const st = getComputedStyle(e);
      if (r.width < 80 || r.height < 30 || st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) < 0.1) continue;
      const h = host(e.src || e.href || '');
      if (!h || (site && (h === site || h.endsWith('.' + site)))) continue;
      const key = sel(e) + '|' + h;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ sel: sel(e), host: h, w: Math.round(r.width), h2: Math.round(r.height), txt: (e.innerText || e.alt || '').replace(/\s+/g, ' ').slice(0, 40) });
    }
    return out.slice(0, 40);
  }, site);
  console.log(`=== 記事ページ適用後の外部リンク/iframe (${slots.length}件) ===`);
  console.log(JSON.stringify(slots, null, 1));
  await browser.close();
})();
