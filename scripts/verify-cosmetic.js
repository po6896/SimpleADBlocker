#!/usr/bin/env node
/*
 * Cosmetic-layer residual check. Applies the blocker to a live page and
 * reports ad-ish elements that are STILL visible afterwards — i.e. hosts
 * the network layer blocked but whose empty shell / native slot remains.
 * Captures before/after screenshots for eyeballing.
 *
 * Usage: node scripts/verify-cosmetic.js <url> [tag]
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
  const url = process.argv[2];
  const tag = process.argv[3] || 'site';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.evaluate(() => {}).catch(() => {});
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { console.log('goto:', e.message); }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, `cosmetic-${tag}-before.png`) }).catch(() => {});

  await installBlocker(page, SLEX, { easylistText: EL });
  await page.waitForTimeout(6500);
  await page.evaluate(async () => {
    for (let i = 0; i < 8; i++) { window.scrollBy(0, 700); await new Promise((r) => setTimeout(r, 400)); }
    window.scrollTo(0, 0);
  }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, `cosmetic-${tag}-after.png`) }).catch(() => {});

  const residual = await page.evaluate(() => {
    const out = [];
    const els = document.querySelectorAll('iframe,ins,[id*="ad" i],[class*="ad" i],[id*="banner" i],[class*="banner" i],[class*="sponsor" i],[id*="sponsor" i]');
    for (const e of els) {
      const r = e.getBoundingClientRect();
      const st = getComputedStyle(e);
      if (r.width > 60 && r.height > 40 && st.display !== 'none' && st.visibility !== 'hidden' && parseFloat(st.opacity) > 0.1) {
        out.push({
          tag: e.tagName,
          id: e.id || '',
          cls: (e.className && e.className.toString().slice(0, 50)) || '',
          w: Math.round(r.width), h: Math.round(r.height),
          src: (e.src || '').slice(0, 70),
        });
      }
    }
    return out.slice(0, 50);
  });
  console.log(`=== ${url} 適用後の残存広告系要素 (${residual.length}) ===`);
  console.log(JSON.stringify(residual, null, 1));
  await browser.close();
})();
