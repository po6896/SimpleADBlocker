#!/usr/bin/env node
/*
 * HAR-replay corpus runner for SimpleADBlocker.
 *
 * Two modes:
 *   --record                record HAR files live, one per corpus entry.
 *   (default)               replay HAR and judge ad suppression.
 *
 * Test methodology reflects Android-dev review feedback:
 * - stealth patches to reduce bot detection so DSPs serve real creatives
 * - CPU 6x throttle + Slow 3G to approximate a mid-range Android phone
 * - Pixel 7 viewport (412x915) + Sleipnir Android UA
 * - HAR replay for reproducibility; live fetch only during --record
 * - Binary selector judgment + body-shrink ratio false-positive check
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const { installBlocker } = require('./sleipnir-shim');

const ROOT = path.resolve(__dirname, '..', '..');
const SLEX = path.join(ROOT, 'sleipnir-adblock.slex.js');
const CORPUS_PATH = path.join(ROOT, 'test', 'corpus', 'targets.yaml');
const HAR_DIR = path.join(ROOT, 'test', 'corpus', 'har');
const REPORT_DIR = path.join(ROOT, 'test', 'reports');

const UA_SLEIPNIR =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Version/4.0 Chrome/116.0.5845.114 Mobile Safari/537.36 ' +
  'Sleipnir/4.9.0';

const VIEWPORT = { width: 412, height: 915 };

/**
 * Known ad-server request URL substrings, JP-heavy.
 * Two tiers:
 *  - bid endpoints: SSP/DSP auction URLs (tier 1)
 *  - creative CDN:  where the actual ad image/video is served from (tier 2)
 * Both count as "ad requests" — from a user's perspective an unblocked creative
 * CDN fetch is still an ad load.
 */
const AD_SERVER_PATTERNS = [
  /* tier 1: bid endpoints & tracking tags */
  /doubleclick\.net\//,
  /googlesyndication\.com\//,
  /googletagservices\.com\//,
  /googletagmanager\.com\/gtag/,
  /pubads\.g\.doubleclick\.net/,
  /safeframe\.googlesyndication\.com/,
  /pagead2\.googlesyndication\.com/,
  /adservice\.google\.(com|co\.jp)/,
  /amazon-adsystem\.com\//,
  /criteo\.(com|net)\//,
  /ib\.adnxs\.com/,
  /rubiconproject\.com\//,
  /openx\.net\//,
  /pubmatic\.com\//,
  /adform\.net\//,
  /taboola\.com\//,
  /outbrain\.com\//,
  /yjtag\.yahoo\.co\.jp/,
  /s\.yimg\.jp\/.*\/ad/,
  /yads\.yahoo\.co\.jp/,
  /\/\/yie\.jp\//,
  /gssprt\.jp\//,
  /adingo\.jp\//,
  /fout\.jp\//,
  /i-mobile\.co\.jp\/(script|banner|ad)/,
  /zucks\.co\.jp\//,
  /amoad\.com\//,
  /nend\.net\//,
  /ad-stir\.com\//,
  /microad\.jp\//,
  /impact-ad\.jp\//,
  /adsafeprotected\.com\//,
  /moatads\.com\//,
  /scorecardresearch\.com\//,

  /* tier 2: creative CDN & image hosts */
  /tpc\.googlesyndication\.com/,
  /static\.criteo\.(com|net)/,
  /images\.criteo\.(com|net)/,
  /cas\.criteo\.com/,
  /ads\.yahoo\.co\.jp/,
  /amg\.yahoo\.co\.jp/,
  /m\.webtrends\.com/,
  /img\.ak\.impact-ad\.jp/,
  /img\.i-mobile\.co\.jp/,
  /cdn\.adingo\.jp/,
];

const MIN_AD_REQUESTS_FOR_CONCLUSIVE = 3;

const mode = process.argv.includes('--record') ? 'record' : 'replay';
const filterId = argAfter('--only');

function argAfter(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function loadCorpus() {
  const doc = yaml.load(fs.readFileSync(CORPUS_PATH, 'utf-8'));
  const defaults = doc.defaults || {};
  const entries = [];
  for (const group of ['ads_present', 'ads_free']) {
    for (const e of (doc[group] || [])) {
      entries.push({ group, ...defaults, ...e });
    }
  }
  return filterId ? entries.filter((e) => e.id === filterId) : entries;
}

async function newContext(browser, harPath, harMode, opts = {}) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    userAgent: UA_SLEIPNIR,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    /* Real Sleipnir Mobile ships jQuery via @require jquery from a trusted
       origin; pages' CSP doesn't apply. Mirror that by bypassing CSP here. */
    bypassCSP: true,
    recordHar: harMode === 'record' ? { path: harPath, content: 'embed' } : undefined,
  });

  if (harMode === 'replay' && fs.existsSync(harPath)) {
    await ctx.routeFromHAR(harPath, { notFound: 'fallback', update: false });
  }

  /* Network-layer ad abort. Must be registered AFTER routeFromHAR because
     Playwright route handlers are LIFO — the most recently added handler
     runs first. Without this ordering, HAR would serve cached ad responses
     before our abort ever runs. */
  const netBlock = { count: 0, samples: [] };
  if (opts.networkBlock) {
    await ctx.route('**/*', (route) => {
      const url = route.request().url();
      for (const pat of AD_SERVER_PATTERNS) {
        if (pat.test(url)) {
          netBlock.count++;
          if (netBlock.samples.length < 8) netBlock.samples.push(url);
          /* Use blockedbyclient so requestfailed's errorText is
             'net::ERR_BLOCKED_BY_CLIENT', mirroring real ad-block behavior
             and letting us distinguish deliberate aborts from network errors. */
          return route.abort('blockedbyclient');
        }
      }
      return route.fallback();
    });
  }
  ctx.__netBlock = netBlock;
  /* Throttle only during replay. Record mode hits the live network once,
     so we use full bandwidth to avoid flaky timeouts and anti-bot
     slow-response heuristics. Replay is where we want the mobile feel. */
  if (harMode === 'replay') {
    ctx.on('page', async (page) => {
      try {
        const client = await ctx.newCDPSession(page);
        await client.send('Emulation.setCPUThrottlingRate', { rate: 6 });
        await client.send('Network.enable');
        await client.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 400,
          downloadThroughput: (400 * 1024) / 8,
          uploadThroughput: (400 * 1024) / 8,
        });
      } catch (_) { /* throttle best-effort */ }
    });
  }
  return ctx;
}

async function collectMetrics(page, entry) {
  return await page.evaluate((ent) => {
    function visible(el) {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
      return true;
    }
    const body = document.body;
    const text = body ? (body.innerText || '').length : 0;
    const images = document.querySelectorAll('img').length;
    const scroll = body ? body.scrollHeight : 0;

    const blockedHits = [];
    for (const sel of (ent.must_be_blocked || [])) {
      const nodes = Array.from(document.querySelectorAll(sel));
      const vis = nodes.filter(visible);
      blockedHits.push({ selector: sel, total: nodes.length, visible: vis.length });
    }
    const surviveHits = [];
    for (const sel of (ent.must_survive || [])) {
      const nodes = Array.from(document.querySelectorAll(sel));
      const vis = nodes.filter(visible);
      surviveHits.push({ selector: sel, total: nodes.length, visible: vis.length });
    }
    return { text, images, scroll, blockedHits, surviveHits };
  }, entry);
}

function judge(entry, vanilla, blocked) {
  const reasons = [];
  const failures = [];
  for (const hit of blocked.blockedHits) {
    if (hit.visible > 0) {
      failures.push(`ad still visible: ${hit.selector} (${hit.visible})`);
    }
  }
  for (const hit of blocked.surviveHits) {
    if (hit.total === 0 || hit.visible === 0) {
      failures.push(`must_survive missing: ${hit.selector}`);
    }
  }
  const ratio = entry.body_min_ratio || { text: 0.7, images: 0.5, scroll: 0.5 };
  const ratios = {
    text: vanilla.text ? blocked.text / vanilla.text : 1,
    images: vanilla.images ? blocked.images / vanilla.images : 1,
    scroll: vanilla.scroll ? blocked.scroll / vanilla.scroll : 1,
  };
  for (const k of ['text', 'images', 'scroll']) {
    if (ratios[k] < ratio[k]) {
      failures.push(`body ${k} shrank to ${(ratios[k] * 100).toFixed(1)}% (threshold ${(ratio[k] * 100).toFixed(0)}%)`);
    }
  }

  /* 3-state verdict: PASS / FAIL / INCONCLUSIVE.
     An ads_present site with vanilla ad_requests < threshold means the DSP
     never served ads in the first place (bot detection, empty page, cache).
     We cannot conclude the blocker worked — flag as INCONCLUSIVE instead of
     silently passing. ads_free sites skip this check (they should have 0). */
  const vanillaAdReq = vanilla.adRequests || 0;
  const blockedAdReq = blocked.adRequests || 0;
  if (entry.group === 'ads_present' && vanillaAdReq < MIN_AD_REQUESTS_FOR_CONCLUSIVE) {
    reasons.push(`vanilla ad-server requests = ${vanillaAdReq} (need >= ${MIN_AD_REQUESTS_FOR_CONCLUSIVE})`);
    return { verdict: 'INCONCLUSIVE', reasons, failures, ratios, adRequests: { vanilla: vanillaAdReq, blocked: blockedAdReq } };
  }
  if (failures.length > 0) {
    return { verdict: 'FAIL', reasons: failures, ratios, adRequests: { vanilla: vanillaAdReq, blocked: blockedAdReq } };
  }
  return { verdict: 'PASS', reasons: [], ratios, adRequests: { vanilla: vanillaAdReq, blocked: blockedAdReq } };
}

/**
 * Scroll the page top-to-bottom in viewport-sized steps so lazy-load ads
 * and bottom-anchored slots fire before we measure.
 */
async function autoScroll(page, { step = 800, pause = 400, maxSteps = 12 } = {}) {
  await page.evaluate(async ({ step, pause, maxSteps }) => {
    function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
    let i = 0;
    let lastY = -1;
    while (i < maxSteps) {
      window.scrollBy(0, step);
      await wait(pause);
      const y = window.scrollY;
      if (y === lastY) break; /* reached bottom */
      lastY = y;
      i++;
    }
    window.scrollTo(0, 0);
    await wait(pause);
  }, { step, pause, maxSteps });
}

async function runPass(browser, entry, reportDir, passName, passOpts) {
  const harPath = path.join(HAR_DIR, `${entry.id}.har`);
  const ctx = await newContext(browser, harPath, mode, {
    networkBlock: passOpts.networkBlock,
  });
  const page = await ctx.newPage();
  const consoleLog = [];
  page.on('console', (m) => consoleLog.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => consoleLog.push(`[pageerror] ${e.message}`));

  /* Request lifecycle breakdown for ad-server URLs. The previous single
     `adRequests` counter fired in `page.on('request')` — which counts a URL
     even if it is immediately aborted, so "b:8 aborted:8" looked great but
     hid whether any ad completed. We now separate five outcomes:
       issued     : matched the pattern and was requested
       aborted    : our ctx.route abort fired (blocker-layer net block)
       finished   : response received with any status (survivor candidate)
       redirected : finished response had 3xx status (not a real survivor)
       failed     : requestfailed, excluding our own aborts
     Effective survivors = finished - redirected. Anything else is a stat. */
  const isAd = (url) => AD_SERVER_PATTERNS.some((p) => p.test(url));
  const counters = { issued: 0, aborted: 0, finished: 0, redirected: 0, failed: 0 };
  const sampleUrls = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!isAd(url)) return;
    counters.issued++;
    if (sampleUrls.length < 8) sampleUrls.push(url);
  });
  page.on('requestfinished', async (req) => {
    if (!isAd(req.url())) return;
    counters.finished++;
    try {
      const res = await req.response();
      if (res && res.status() >= 300 && res.status() < 400) counters.redirected++;
    } catch (_) { /* response may be gone on navigation */ }
  });
  page.on('requestfailed', (req) => {
    if (!isAd(req.url())) return;
    const failure = req.failure();
    const txt = (failure && failure.errorText) || '';
    /* BLOCKED_BY_CLIENT = our own network route abort.
       ABORTED = navigation-canceled in-flight request (cookie-sync etc.).
       Anything else = real network failure worth flagging. */
    if (/BLOCKED_BY_CLIENT/i.test(txt)) counters.aborted++;
    else if (/ABORTED/i.test(txt)) counters.aborted++;
    else counters.failed++;
  });

  let metrics, shotErr;
  try {
    await page.goto(entry.url, { waitUntil: 'domcontentloaded', timeout: 90000 })
      .catch((e) => consoleLog.push(`[goto-timeout] ${e.message.split('\n')[0]}`));
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);

    if (passOpts.installSlex) {
      let installed = false;
      for (let attempt = 0; attempt < 3 && !installed; attempt++) {
        try {
          await installBlocker(page, SLEX);
          installed = true;
        } catch (e) {
          if (/Execution context was destroyed/i.test(String(e.message))) {
            consoleLog.push(`[install-retry:${attempt}] ${e.message}`);
            await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
            await page.waitForTimeout(1500);
          } else {
            throw e;
          }
        }
      }
      if (!installed) throw new Error('installBlocker: gave up after 3 retries');
    }

    const postWait = passOpts.installSlex
      ? (entry.wait_ms_after_blocker || 2500)
      : (entry.wait_ms_after_load || 4000);
    await page.waitForTimeout(postWait);

    /* Drive the page through viewport-height scrolls so lazy-load and
       anchor-bottom ad slots fire before we measure. Real Sleipnir users
       scroll; a static-load harness massively under-counts ads on sites
       that lazy-mount below the fold (most JP matome/wiki). */
    await autoScroll(page).catch((e) => consoleLog.push(`[scroll] ${e.message}`));

    /* Without this, scroll-triggered ad requests are still in flight when we
       collect metrics, so finished counts hit 0 while issued > 0 and the
       report looks inconsistent. networkidle + 2s grace flushes pending
       requestfinished events. Cap at 8s — some sites never idle. */
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2000);

    metrics = await collectMetrics(page, entry);
    metrics.ads = { ...counters };
    metrics.adRequests = counters.issued; /* legacy field for judge() */
    metrics.adSurvivors = counters.finished - counters.redirected;
    metrics.adSampleUrls = sampleUrls;
    metrics.networkBlocked = ctx.__netBlock ? ctx.__netBlock.count : 0;
    metrics.networkBlockedSamples = ctx.__netBlock ? ctx.__netBlock.samples : [];

    try {
      await page.screenshot({
        path: path.join(reportDir, entry.id, `${passName}.png`),
        fullPage: false,
        timeout: 10000,
        animations: 'disabled',
      });
    } catch (e) {
      shotErr = e.message;
      consoleLog.push(`[screenshot-skipped:${passName}.png] ${e.message}`);
    }
  } finally {
    fs.appendFileSync(
      path.join(reportDir, entry.id, 'console.log'),
      `\n==== ${passName} ====\n` + consoleLog.join('\n') + '\n'
    );
    await ctx.close();
  }
  return { metrics, shotErr };
}

async function runOne(browser, entry, reportDir) {
  fs.writeFileSync(path.join(reportDir, entry.id, 'console.log'), '');
  const result = { id: entry.id, url: entry.url, group: entry.group, mode };

  try {
    /* Fresh context per pass so pass-1 cookies/localStorage cannot inflate
       pass-2 SSP bidding — the earlier "blocked > vanilla ad_requests"
       pattern was context contamination, not the blocker being broken. */
    const vanilla = await runPass(browser, entry, reportDir, 'vanilla',
      { installSlex: false, networkBlock: false });
    const blocked = await runPass(browser, entry, reportDir, 'blocked',
      { installSlex: true, networkBlock: true });

    const verdict = judge(entry, vanilla.metrics, blocked.metrics);
    Object.assign(result, {
      vanilla: vanilla.metrics,
      blocked: blocked.metrics,
      verdict,
    });
  } catch (err) {
    result.error = String(err && err.stack || err);
  }
  return result;
}

process.on('unhandledRejection', (reason) => {
  /* Playwright emits NavigationAbortedError out-of-band for cookie-sync URLs
     that HAR replay cannot reproduce. They don't invalidate the test run;
     log and continue so one ad-tech sub-frame can't kill the whole suite. */
  const msg = String(reason && reason.message || reason);
  if (/NavigationAbortedError|ERR_ABORTED/i.test(msg)) {
    process.stderr.write(`[suppressed] ${msg.split('\n')[0]}\n`);
    return;
  }
  console.error('Unhandled rejection:', reason);
  process.exitCode = 2;
});

(async () => {
  ensureDir(HAR_DIR);
  const stamp = new Date().toISOString().slice(0, 10);
  const reportDir = path.join(REPORT_DIR, stamp);
  ensureDir(reportDir);

  const corpus = loadCorpus();
  if (corpus.length === 0) {
    console.error('corpus is empty (or --only filtered to nothing)');
    process.exit(2);
  }
  for (const e of corpus) ensureDir(path.join(reportDir, e.id));

  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const entry of corpus) {
    process.stdout.write(`[${mode}] ${entry.id} ... `);
    const r = await runOne(browser, entry, reportDir);
    results.push(r);
    if (r.error) {
      console.log(`ERROR: ${r.error.split('\n')[0]}`);
    } else if (r.verdict && r.verdict.verdict === 'PASS') {
      const v = (r.vanilla && r.vanilla.ads) || {};
      const b = (r.blocked && r.blocked.ads) || {};
      const vSurv = (r.vanilla && r.vanilla.adSurvivors) || 0;
      const bSurv = (r.blocked && r.blocked.adSurvivors) || 0;
      console.log(
        `PASS  vanilla{iss:${v.issued||0} fin:${v.finished||0} red:${v.redirected||0} fail:${v.failed||0}} ` +
        `blocked{iss:${b.issued||0} abt:${b.aborted||0} fin:${b.finished||0} red:${b.redirected||0} fail:${b.failed||0}} ` +
        `survivors v:${vSurv}->b:${bSurv}`
      );
    } else if (r.verdict && r.verdict.verdict === 'INCONCLUSIVE') {
      console.log(`INCONCLUSIVE  (${r.verdict.reasons.join('; ')})`);
    } else if (r.verdict && r.verdict.verdict === 'FAIL') {
      console.log(`FAIL  (${r.verdict.reasons.length})`);
      for (const why of r.verdict.reasons) console.log('  - ' + why);
    } else {
      console.log('recorded');
    }
  }
  await browser.close();

  const summary = { mode, stamp, results };
  fs.writeFileSync(path.join(reportDir, 'summary.json'), JSON.stringify(summary, null, 2));

  const by = { PASS: 0, FAIL: 0, INCONCLUSIVE: 0, ERROR: 0 };
  for (const r of results) {
    if (r.error) by.ERROR++;
    else if (r.verdict) by[r.verdict.verdict] = (by[r.verdict.verdict] || 0) + 1;
  }
  console.log(`\nReport: ${reportDir}`);
  console.log(`Total ${results.length}  PASS ${by.PASS}  FAIL ${by.FAIL}  INCONCLUSIVE ${by.INCONCLUSIVE}  ERROR ${by.ERROR}`);
  /* INCONCLUSIVE alone should not fail CI; only real FAIL / ERROR does. */
  process.exit((by.FAIL + by.ERROR) > 0 ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
