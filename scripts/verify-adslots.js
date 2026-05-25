#!/usr/bin/env node
/*
 * Identify ad slots on a page after the blocker runs: list visible links /
 * iframes / ins whose target host is OFF the site's own domain, with a
 * selector path + text snippet, so native/PR slots that carry no "ad" class
 * can be pinned down for a SITE_RULES entry.
 *
 * Usage: node scripts/verify-adslots.js <url> <siteDomain>
 */
const { chromium } = require('playwright');
const { installBlocker } = require('../test/harness/sleipnir-shim');
const fs = require('fs');
const path = require('path');

const SLEX = path.join(__dirname, '..', 'sleipnir-adblock.slex.js');
const EL = fs.readFileSync(path.join(__dirname, 'easylist.txt'), 'utf8');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36 Sleipnir/4';

(async () => {
  const url = process.argv[2];
  const site = process.argv[3] || '';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { console.log('goto:', e.message); }
  await page.waitForTimeout(2000);
  await installBlocker(page, SLEX, { easylistText: EL });
  await page.waitForTimeout(6500);
  await page.evaluate(async () => {
    for (let i = 0; i < 8; i++) { window.scrollBy(0, 700); await new Promise((r) => setTimeout(r, 350)); }
    window.scrollTo(0, 0);
  }).catch(() => {});
  await page.waitForTimeout(2000);

  const slots = await page.evaluate((site) => {
    function sel(e) {
      let s = e.tagName.toLowerCase();
      if (e.id) s += '#' + e.id;
      else if (e.className && e.className.toString().trim()) s += '.' + e.className.toString().trim().split(/\s+/).slice(0, 3).join('.');
      const p = e.parentElement;
      if (p) {
        let ps = p.tagName.toLowerCase();
        if (p.id) ps += '#' + p.id;
        else if (p.className && p.className.toString().trim()) ps += '.' + p.className.toString().trim().split(/\s+/).slice(0, 2).join('.');
        s = ps + ' > ' + s;
      }
      return s;
    }
    function host(u) { try { return new URL(u, location.href).hostname.toLowerCase(); } catch (_) { return ''; } }
    const out = [];
    const seen = new Set();
    const els = document.querySelectorAll('a[href],iframe[src],ins');
    for (const e of els) {
      const r = e.getBoundingClientRect();
      const st = getComputedStyle(e);
      if (r.width < 80 || r.height < 30 || st.display === 'none' || st.visibility === 'hidden' || parseFloat(st.opacity) < 0.1) continue;
      const target = e.src || e.href || '';
      const h = host(target);
      if (!h || (site && (h === site || h.endsWith('.' + site)))) continue;
      const key = sel(e) + '|' + h;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ sel: sel(e), host: h, w: Math.round(r.width), h2: Math.round(r.height), txt: (e.innerText || e.alt || '').replace(/\s+/g, ' ').slice(0, 40) });
    }
    return out.slice(0, 40);
  }, site);
  console.log(`=== ${url} 適用後の外部リンク/iframe (site=${site}, ${slots.length}件) ===`);
  console.log(JSON.stringify(slots, null, 1));
  await browser.close();
})();
