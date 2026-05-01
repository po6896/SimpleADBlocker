#!/usr/bin/env node
/*
 * Live-scan a list of URLs and surface third-party hosts that are NOT yet
 * matched by either AD_SERVER_PATTERNS or AD_DOMAINS. Unlike run-corpus.js
 * this does not save HAR — it just walks the response stream and emits a
 * candidate list for the next audit round.
 *
 * Usage: node scripts/scan-extra-sites.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const { AD_SERVER_PATTERNS } = require('../test/harness/patterns.js');

const SLEX = path.join(__dirname, '..', 'sleipnir-adblock.slex.js');

function extractAdDomains() {
  const src = fs.readFileSync(SLEX, 'utf8');
  const m = src.match(/var AD_DOMAINS = \[([\s\S]*?)\];/);
  const literals = [];
  const re = /'([^']+)'/g;
  let g;
  while ((g = re.exec(m[1])) !== null) literals.push(g[1].toLowerCase());
  return literals;
}
const adDomains = extractAdDomains();

function isKnownAd(url, host) {
  for (const pat of AD_SERVER_PATTERNS) if (pat.test(url)) return true;
  for (const d of adDomains) {
    if (d.indexOf('/') !== -1) {
      if (url.toLowerCase().indexOf(d) !== -1) return true;
    } else if (host === d || host.endsWith('.' + d)) return true;
  }
  return false;
}

const TARGETS = [
  /* round 3 (already audited) — kept for regression value */
  { id: 'gamewith', url: 'https://gamewith.jp/' },
  { id: 'game8', url: 'https://game8.jp/' },
  { id: 'alfalfalfa', url: 'http://alfalfalfa.com/' },
  { id: 'jin115', url: 'http://jin115.com/' },
  { id: 'gendai_media', url: 'https://gendai.media/' },
  { id: 'nikkansports', url: 'https://www.nikkansports.com/' },
  /* round 4 — newspapers / business / curation */
  { id: 'mainichi', url: 'https://mainichi.jp/' },
  { id: 'asahi', url: 'https://www.asahi.com/' },
  { id: 'sankei', url: 'https://www.sankei.com/' },
  { id: 'sponichi', url: 'https://www.sponichi.co.jp/' },
  { id: 'president', url: 'https://president.jp/' },
  { id: 'toyokeizai', url: 'https://toyokeizai.net/' },
  { id: 'bunshun', url: 'https://bunshun.jp/' },
  { id: 'diamond', url: 'https://diamond.jp/' },
  { id: 'nlab_itmedia', url: 'https://nlab.itmedia.co.jp/' },
  { id: 'yaraon', url: 'http://yaraon-blog.com/' },
  /* round 5 — IT / gaming / lifestyle / job / matome */
  { id: 'gigazine', url: 'https://gigazine.net/' },
  { id: 'impress_pc', url: 'https://pc.watch.impress.co.jp/' },
  { id: 'impress_akiba', url: 'https://akiba-pc.watch.impress.co.jp/' },
  { id: 'famitsu', url: 'https://www.famitsu.com/' },
  { id: 'dengeki', url: 'https://dengekionline.com/' },
  { id: 'cookpad', url: 'https://cookpad.com/' },
  { id: 'tenki', url: 'https://tenki.jp/' },
  { id: 'tabelog', url: 'https://tabelog.com/' },
  { id: 'mynavi', url: 'https://news.mynavi.jp/' },
  { id: 'doda', url: 'https://doda.jp/' },
  { id: 'zdnet_jp', url: 'https://japan.zdnet.com/' },
  { id: 'hatima', url: 'http://hatima.jp/' },
  { id: 'esuteru', url: 'http://blog.esuteru.com/' },
  { id: 'nico_news', url: 'https://www.nicovideo.jp/news/' },
  /* round 6 — job / EC / niche */
  { id: 'rikunabi_next', url: 'https://next.rikunabi.com/' },
  { id: 'en_japan', url: 'https://en-japan.com/' },
  { id: 'baitoru', url: 'https://www.baitoru.com/' },
  { id: 'townwork', url: 'https://townwork.net/' },
  { id: 'kakaku', url: 'https://kakaku.com/' },
  { id: 'dmm', url: 'https://www.dmm.com/' },
  { id: 'yahoo_auctions', url: 'https://auctions.yahoo.co.jp/' },
  { id: 'mynavi_woman', url: 'https://woman.mynavi.jp/' },
  { id: 'shonenjumpplus', url: 'https://shonenjumpplus.com/' },
  { id: 'jalan', url: 'https://www.jalan.net/' },
];

const UA_SLEIPNIR = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.6367.179 Mobile Safari/537.36 Sleipnir/4.7.0';
const VIEWPORT = { width: 412, height: 915 };

function ownDomain(host) {
  const labels = host.split('.');
  return labels.slice(-2).join('.');
}

async function autoScroll(page) {
  try {
    await page.evaluate(async () => {
      function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
      let lastY = -1;
      for (let i = 0; i < 12; i++) {
        window.scrollBy(0, 800);
        await wait(400);
        if (window.scrollY === lastY) break;
        lastY = window.scrollY;
      }
    });
  } catch (_) {}
}

async function scanOne(browser, target) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    userAgent: UA_SLEIPNIR,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    bypassCSP: true,
  });

  const counts = new Map();
  const own = ownDomain(new URL(target.url).hostname.toLowerCase());

  ctx.on('response', (resp) => {
    const url = resp.url();
    if (!/^https?:/.test(url)) return;
    let host;
    try { host = new URL(url).hostname.toLowerCase(); } catch { return; }
    /* skip own / subdomain of own */
    if (host === own || host.endsWith('.' + own)) return;
    if (isKnownAd(url, host)) return;
    let rec = counts.get(host);
    if (!rec) {
      rec = { count: 0, sample: url };
      counts.set(host, rec);
    }
    rec.count++;
  });

  const page = await ctx.newPage();
  console.error(`[scan] ${target.id} ${target.url}`);
  try {
    await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await autoScroll(page);
    await page.waitForTimeout(2000);
  } catch (e) {
    console.error(`  ERROR: ${e.message}`);
  }

  await ctx.close();
  return { id: target.id, hosts: counts };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const allCounts = new Map(); // host -> { count, sources:Set, sample }

  for (const t of TARGETS) {
    const { id, hosts } = await scanOne(browser, t);
    for (const [host, rec] of hosts) {
      let agg = allCounts.get(host);
      if (!agg) {
        agg = { count: 0, sources: new Set(), sample: rec.sample };
        allCounts.set(host, agg);
      }
      agg.count += rec.count;
      agg.sources.add(id);
    }
  }
  await browser.close();

  const threshold = parseInt(process.argv[process.argv.indexOf('--threshold') + 1], 10) || 2;
  const rows = [...allCounts.entries()]
    .filter(([, r]) => r.count >= threshold)
    .sort((a, b) => b[1].count - a[1].count);

  console.log(`# Unmatched third-party hosts in extra-site live scan (count>=${threshold})`);
  console.log(`# count\thost\tsources\tsample`);
  for (const [host, r] of rows) {
    const sources = [...r.sources].join(',');
    const sample = r.sample.length > 100 ? r.sample.slice(0, 100) + '...' : r.sample;
    console.log(`${r.count}\t${host}\t${sources}\t${sample}`);
  }
})();
