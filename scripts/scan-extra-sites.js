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
  { round: 3, id: 'gamewith', url: 'https://gamewith.jp/' },
  { round: 3, id: 'game8', url: 'https://game8.jp/' },
  { round: 3, id: 'alfalfalfa', url: 'http://alfalfalfa.com/' },
  { round: 3, id: 'jin115', url: 'http://jin115.com/' },
  { round: 3, id: 'gendai_media', url: 'https://gendai.media/' },
  { round: 3, id: 'nikkansports', url: 'https://www.nikkansports.com/' },
  /* round 4 — newspapers / business / curation */
  { round: 4, id: 'mainichi', url: 'https://mainichi.jp/' },
  { round: 4, id: 'asahi', url: 'https://www.asahi.com/' },
  { round: 4, id: 'sankei', url: 'https://www.sankei.com/' },
  { round: 4, id: 'sponichi', url: 'https://www.sponichi.co.jp/' },
  { round: 4, id: 'president', url: 'https://president.jp/' },
  { round: 4, id: 'toyokeizai', url: 'https://toyokeizai.net/' },
  { round: 4, id: 'bunshun', url: 'https://bunshun.jp/' },
  { round: 4, id: 'diamond', url: 'https://diamond.jp/' },
  { round: 4, id: 'nlab_itmedia', url: 'https://nlab.itmedia.co.jp/' },
  { round: 4, id: 'yaraon', url: 'http://yaraon-blog.com/' },
  /* round 5 — IT / gaming / lifestyle / job / matome */
  { round: 5, id: 'gigazine', url: 'https://gigazine.net/' },
  { round: 5, id: 'impress_pc', url: 'https://pc.watch.impress.co.jp/' },
  { round: 5, id: 'impress_akiba', url: 'https://akiba-pc.watch.impress.co.jp/' },
  { round: 5, id: 'famitsu', url: 'https://www.famitsu.com/' },
  { round: 5, id: 'dengeki', url: 'https://dengekionline.com/' },
  { round: 5, id: 'cookpad', url: 'https://cookpad.com/' },
  { round: 5, id: 'tenki', url: 'https://tenki.jp/' },
  { round: 5, id: 'tabelog', url: 'https://tabelog.com/' },
  { round: 5, id: 'mynavi', url: 'https://news.mynavi.jp/' },
  { round: 5, id: 'doda', url: 'https://doda.jp/' },
  { round: 5, id: 'zdnet_jp', url: 'https://japan.zdnet.com/' },
  { round: 5, id: 'hatima', url: 'http://hatima.jp/' },
  { round: 5, id: 'esuteru', url: 'http://blog.esuteru.com/' },
  { round: 5, id: 'nico_news', url: 'https://www.nicovideo.jp/news/' },
  /* round 6 — job / EC / niche */
  { round: 6, id: 'rikunabi_next', url: 'https://next.rikunabi.com/' },
  { round: 6, id: 'en_japan', url: 'https://en-japan.com/' },
  { round: 6, id: 'baitoru', url: 'https://www.baitoru.com/' },
  { round: 6, id: 'townwork', url: 'https://townwork.net/' },
  { round: 6, id: 'kakaku', url: 'https://kakaku.com/' },
  { round: 6, id: 'dmm', url: 'https://www.dmm.com/' },
  { round: 6, id: 'yahoo_auctions', url: 'https://auctions.yahoo.co.jp/' },
  { round: 6, id: 'mynavi_woman', url: 'https://woman.mynavi.jp/' },
  { round: 6, id: 'shonenjumpplus', url: 'https://shonenjumpplus.com/' },
  { round: 6, id: 'jalan', url: 'https://www.jalan.net/' },
  /* round 7 — user-directed + manga viewer + overseas gaming + EC + SNS */
  { round: 7, id: 'apexleaks_overwatch2', url: 'https://overwatch2-news.apexlegends-leaksnews.com/' },
  { round: 7, id: 'corocoro_tag', url: 'https://www.corocoro.jp/tag/170/tag' },
  { round: 7, id: 'corocoro_viewer', url: 'https://www.corocoro.jp/chapter/10193/viewer' },
  { round: 7, id: 'x_home', url: 'https://x.com/home' },
  { round: 7, id: 'facebook_jp', url: 'https://www.facebook.com/?locale=ja_JP' },
  { round: 7, id: 'reddit_home', url: 'https://www.reddit.com/' },
  { round: 7, id: 'amazon_jp', url: 'https://www.amazon.co.jp/' },
  { round: 7, id: 'comic_walker', url: 'https://comic-walker.com/' },
  { round: 7, id: 'manga_up', url: 'https://global.manga-up.com/' },
  { round: 7, id: 'comicdays', url: 'https://comic-days.com/' },
  { round: 7, id: 'dexerto', url: 'https://www.dexerto.com/' },
  { round: 7, id: 'dotesports', url: 'https://dotesports.com/' },
  { round: 7, id: 'pcgamer', url: 'https://www.pcgamer.com/' },
  { round: 7, id: 'eurogamer', url: 'https://www.eurogamer.net/' },
  { round: 7, id: 'polygon', url: 'https://www.polygon.com/' },
  { round: 7, id: 'ign', url: 'https://www.ign.com/' },
  { round: 7, id: 'gamespot', url: 'https://www.gamespot.com/' },
  { round: 7, id: 'rakuten_top', url: 'https://www.rakuten.co.jp/' },
  { round: 7, id: 'yahoo_shopping', url: 'https://shopping.yahoo.co.jp/' },
  { round: 7, id: 'mercari_jp', url: 'https://jp.mercari.com/' },
  { round: 7, id: 'yodobashi', url: 'https://www.yodobashi.com/' },
  { round: 7, id: 'bsky', url: 'https://bsky.app/' },
  { round: 7, id: 'threads', url: 'https://www.threads.net/' },
  { round: 7, id: '5ch', url: 'https://5ch.net/' },
  { round: 7, id: 'mastodon_social', url: 'https://mastodon.social/explore' },
  /* round 8 — webtoon/overseas-manga + overseas matome/image boards */
  { round: 8, id: 'webtoons', url: 'https://www.webtoons.com/en/' },
  { round: 8, id: 'lezhin', url: 'https://www.lezhin.com/en' },
  { round: 8, id: 'tappytoon', url: 'https://www.tappytoon.com/' },
  { round: 8, id: 'mangadex', url: 'https://mangadex.org/' },
  { round: 8, id: 'mangaplus', url: 'https://mangaplus.shueisha.co.jp/updates' },
  { round: 8, id: 'bookwalker', url: 'https://bookwalker.jp/' },
  { round: 8, id: 'toomics', url: 'https://toomics.com/' },
  { round: 8, id: '9gag', url: 'https://9gag.com/' },
  { round: 8, id: 'imgur', url: 'https://imgur.com/' },
  { round: 8, id: 'boredpanda', url: 'https://www.boredpanda.com/' },
  { round: 8, id: 'knowyourmeme', url: 'https://knowyourmeme.com/' },
  { round: 8, id: 'cracked', url: 'https://www.cracked.com/' },
  { round: 8, id: 'demilked', url: 'https://www.demilked.com/' },
  { round: 8, id: 'quora', url: 'https://www.quora.com/' },
  { round: 8, id: 'imgflip', url: 'https://imgflip.com/' },
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
  const hardDeadline = new Promise((resolve) => setTimeout(() => resolve('__hard_timeout__'), 60000));
  const work = (async () => {
    try {
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await autoScroll(page);
      await page.waitForTimeout(2000);
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
    }
  })();
  const res = await Promise.race([work, hardDeadline]);
  if (res === '__hard_timeout__') console.error(`  HARD TIMEOUT (60s) for ${target.id}`);

  await ctx.close().catch(() => {});
  return { id: target.id, hosts: counts };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const allCounts = new Map(); // host -> { count, sources:Set, sample }

  const roundIdx = process.argv.indexOf('--round');
  const onlyRound = roundIdx !== -1 ? parseInt(process.argv[roundIdx + 1], 10) : null;
  const skipIdx = process.argv.indexOf('--skip');
  const skipSet = new Set(skipIdx !== -1 ? process.argv[skipIdx + 1].split(',') : []);
  const targets = (onlyRound ? TARGETS.filter(t => t.round === onlyRound) : TARGETS)
    .filter(t => !skipSet.has(t.id));

  for (const t of targets) {
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
