#!/usr/bin/env node
/*
 * Verify the gamewith '.gdb-feature_tile-item.is-pr' SITE_RULE: the PR
 * (tie-up ad) tiles should be hidden after the blocker runs, while normal
 * article tiles (no .is-pr) must remain — false-positive guard.
 *
 * Usage: node scripts/verify-gamewith.js
 */
const { chromium } = require('playwright');
const { installBlocker } = require('../test/harness/sleipnir-shim');
const fs = require('fs');
const path = require('path');

const SLEX = path.join(__dirname, '..', 'sleipnir-adblock.slex.js');
const EL = fs.readFileSync(path.join(__dirname, 'easylist.txt'), 'utf8');
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36 Sleipnir/4';

const COUNT = `(()=>{const vis=s=>[...document.querySelectorAll(s)].filter(e=>getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden').length;return JSON.stringify({prTotal:document.querySelectorAll('.gdb-feature_tile-item.is-pr').length,prVisible:vis('.gdb-feature_tile-item.is-pr'),normalTotal:document.querySelectorAll('.gdb-feature_tile-item:not(.is-pr)').length,normalVisible:vis('.gdb-feature_tile-item:not(.is-pr)')});})()`;

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 412, height: 915 } });
  const page = await ctx.newPage();
  await page.goto('https://gamewith.jp/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(async () => { for (let i = 0; i < 6; i++) { window.scrollBy(0, 700); await new Promise((r) => setTimeout(r, 300)); } window.scrollTo(0, 0); }).catch(() => {});
  await page.waitForTimeout(1500);
  const before = await page.evaluate(COUNT);
  await installBlocker(page, SLEX, { easylistText: EL });
  await page.waitForTimeout(4000);
  const after = await page.evaluate(COUNT);
  console.log('before:', before);
  console.log('after :', after);
  await browser.close();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
