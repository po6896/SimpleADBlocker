#!/usr/bin/env node
/*
 * Live effect check for the EasyList ||host^ auto-ingest (v5.8.0).
 * Opens each URL, collects every request host, and reports how many the
 * CURRENT rules let through but the EasyList network domains would block.
 * This captures recent ad hosts that the bundled list + Apr-recorded HARs
 * miss. No slex injected — purely measures rule coverage on live traffic.
 *
 * Usage: node scripts/verify-live-effect.js <url> [url ...]
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { AD_SERVER_PATTERNS } = require('../test/harness/patterns.js');

function bundledDomains() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'sleipnir-adblock.slex.js'), 'utf8');
  const m = src.match(/var AD_DOMAINS = \[([\s\S]*?)\];/);
  const list = [];
  const re = /'([^']+)'/g;
  let g;
  while ((g = re.exec(m[1])) !== null) list.push(g[1].toLowerCase());
  return list;
}
const bundled = bundledDomains();
const bundledHostSet = new Set(bundled.filter((d) => d.indexOf('/') === -1));
const bundledPaths = bundled.filter((d) => d.indexOf('/') !== -1);

const elText = fs.readFileSync(path.join(__dirname, 'easylist.txt'), 'utf8');
const elSet = new Set();
for (const ln of elText.split('\n')) {
  const m = ln.match(/^\|\|([a-z0-9][a-z0-9.\-_]*)\^$/);
  if (m && m[1].indexOf('*') === -1 && m[1].indexOf('/') === -1) elSet.add(m[1]);
}

function suffixHit(set, host) {
  let h = host;
  while (h) {
    if (set.has(h)) return true;
    const dot = h.indexOf('.');
    if (dot === -1) break;
    h = h.substring(dot + 1);
  }
  return false;
}
function knownNow(url, host) {
  for (const p of AD_SERVER_PATTERNS) if (p.test(url)) return true;
  if (suffixHit(bundledHostSet, host)) return true;
  const lower = url.toLowerCase();
  for (const d of bundledPaths) if (lower.indexOf(d) !== -1) return true;
  return false;
}

const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36 Sleipnir/4';

(async () => {
  const urls = process.argv.slice(2);
  if (!urls.length) { console.log('need a url'); return; }
  console.log(`# EasyList net domains: ${elSet.size}`);
  const browser = await chromium.launch();
  for (const url of urls) {
    const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 412, height: 915 } });
    const page = await ctx.newPage();
    const all = [];
    page.on('request', (r) => {
      try { all.push({ url: r.url(), h: new URL(r.url()).hostname.toLowerCase() }); } catch (_) {}
    });
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); } catch (e) { console.log(`  goto: ${e.message}`); }
    try {
      await page.evaluate(async () => {
        for (let i = 0; i < 10; i++) { window.scrollBy(0, 800); await new Promise((r) => setTimeout(r, 400)); }
      });
    } catch (_) {}
    await page.waitForTimeout(3000);
    let known = 0;
    const newly = new Map();
    for (const { url: u, h } of all) {
      if (knownNow(u, h)) { known++; continue; }
      if (suffixHit(elSet, h)) newly.set(h, (newly.get(h) || 0) + 1);
    }
    const hosts = [...newly.keys()].sort();
    let nr = 0;
    for (const h of hosts) nr += newly.get(h);
    console.log(`\n=== ${url}  (req ${all.length} / 既ブロック ${known} / EasyList新規 host ${hosts.length} req ${nr}) ===`);
    for (const h of hosts) console.log(`  ${h}  x${newly.get(h)}`);
    await ctx.close();
  }
  await browser.close();
})();
