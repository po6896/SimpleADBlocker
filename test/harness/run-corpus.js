#!/usr/bin/env node
/*
 * HAR-replay corpus runner for SimpleADBlocker.
 *
 * Modes:
 *   --record   capture HAR live, one file per corpus entry
 *   --live     hit origins directly (no HAR replay, no throttle) — weekly
 *              sanity run to catch HAR staleness / prebid nonce expiry
 *   default    replay HAR with stealth + CPU 6x throttle + Slow 3G
 *
 * The runner orchestrates; the specialized logic lives in sibling modules:
 *   patterns.js       ad-server URL matchers
 *   judge.js          PASS / FAIL / INCONCLUSIVE verdict
 *   baseline.js       per-site vanilla baseline I/O
 *   log-result.js     CLI output formatting
 *   sleipnir-shim.js  slex loader + SLEX_* polyfills
 *   emit-report.js    HTML dashboard renderer
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const { installBlocker } = require('./sleipnir-shim');
const { AD_SERVER_PATTERNS, isAdUrl } = require('./patterns');
const { judge } = require('./judge');
const { loadBaseline, saveBaseline, snapshotMetrics } = require('./baseline');
const { formatResult, summarize } = require('./log-result');

const ROOT = path.resolve(__dirname, '..', '..');
const SLEX = path.join(ROOT, 'sleipnir-adblock.slex.js');
const CORPUS_PATH = path.join(ROOT, 'test', 'corpus', 'targets.yaml');
const BASELINE_PATH = path.join(ROOT, 'test', 'corpus', 'baseline.json');
const HAR_DIR = path.join(ROOT, 'test', 'corpus', 'har');
const REPORT_DIR = path.join(ROOT, 'test', 'reports');

const UA_SLEIPNIR =
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Version/4.0 Chrome/116.0.5845.114 Mobile Safari/537.36 ' +
  'Sleipnir/4.9.0';
const VIEWPORT = { width: 412, height: 915 };

/* ---------- CLI ---------- */

function argAfter(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

const mode = process.argv.includes('--record') ? 'record'
  : process.argv.includes('--live') ? 'live'
  : 'replay';
const filterId = argAfter('--only');
/* Record is sequential by default — parallel live captures produce messy HARs.
   Replay can run 4-wide safely. */
const workers = parseInt(argAfter('--workers') || (mode === 'record' ? '1' : '4'), 10);

/* ---------- filesystem helpers ---------- */

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

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

/* ---------- browser context per pass ---------- */

async function newContext(browser, harPath, harMode, opts = {}) {
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    userAgent: UA_SLEIPNIR,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    /* Real Sleipnir ships jQuery via @require from a trusted origin without
       honoring page CSP. Mirror that to let polyfills load. */
    bypassCSP: true,
    recordHar: harMode === 'record' ? { path: harPath, content: 'embed' } : undefined,
  });

  if (harMode === 'replay' && fs.existsSync(harPath)) {
    await ctx.routeFromHAR(harPath, { notFound: 'fallback', update: false });
  }
  /* live mode: no routeFromHAR; every request hits the origin. */

  /* Network-layer ad abort, registered AFTER routeFromHAR so it wins
     Playwright's LIFO route priority. Uses 'blockedbyclient' so the
     failure errorText matches Chrome's own ad-block extensions. */
  const netBlock = { count: 0, samples: [] };
  if (opts.networkBlock) {
    await ctx.route('**/*', (route) => {
      const url = route.request().url();
      if (isAdUrl(url)) {
        netBlock.count++;
        if (netBlock.samples.length < 8) netBlock.samples.push(url);
        return route.abort('blockedbyclient');
      }
      return route.fallback();
    });
  }
  ctx.__netBlock = netBlock;

  /* Mobile emulation: CPU 6x + Slow 3G during replay only. record / live
     need full bandwidth to avoid anti-bot slow-response heuristics. */
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
      } catch (_) { /* best-effort */ }
    });
  }
  return ctx;
}

/* ---------- in-page helpers ---------- */

/**
 * Scroll top-to-bottom in viewport-sized steps. Does NOT return to the top:
 * some sites (livedoor_news) mount a nav sidebar only when scrollY = 0,
 * inflating CLS with a false-positive page-level shift.
 */
async function autoScroll(page, { step = 800, pause = 400, maxSteps = 12 } = {}) {
  await page.evaluate(async ({ step, pause, maxSteps }) => {
    function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
    let lastY = -1;
    for (let i = 0; i < maxSteps; i++) {
      window.scrollBy(0, step);
      await wait(pause);
      if (window.scrollY === lastY) break;
      lastY = window.scrollY;
    }
  }, { step, pause, maxSteps });
}

async function installClsObserver(page) {
  await page.addInitScript(() => {
    window.__slexCls = { value: 0, entries: [] };
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.hadRecentInput) continue;
          window.__slexCls.value += e.value;
          const sources = (e.sources || []).map((s) => {
            const n = s.node;
            if (!n || n.nodeType !== 1) return null;
            return {
              tag: n.tagName,
              id: (n.id || '').slice(0, 40),
              cls: (n.className && n.className.toString ? n.className.toString() : '').slice(0, 80),
              prev: s.previousRect && {
                w: Math.round(s.previousRect.width),
                h: Math.round(s.previousRect.height),
                t: Math.round(s.previousRect.top),
              },
              curr: s.currentRect && {
                w: Math.round(s.currentRect.width),
                h: Math.round(s.currentRect.height),
                t: Math.round(s.currentRect.top),
              },
            };
          }).filter(Boolean);
          window.__slexCls.entries.push({ v: e.value, t: Math.round(e.startTime), sources });
          window.__slexCls.entries.sort((a, b) => b.v - a.v);
          if (window.__slexCls.entries.length > 10) window.__slexCls.entries.length = 10;
        }
      });
      po.observe({ type: 'layout-shift', buffered: true });
    } catch (_) { /* older browser */ }
  });
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

    const blockedHits = (ent.must_be_blocked || []).map((sel) => {
      const nodes = Array.from(document.querySelectorAll(sel));
      return { selector: sel, total: nodes.length, visible: nodes.filter(visible).length };
    });
    const surviveHits = (ent.must_survive || []).map((sel) => {
      const nodes = Array.from(document.querySelectorAll(sel));
      return { selector: sel, total: nodes.length, visible: nodes.filter(visible).length };
    });

    const cls = (window.__slexCls && typeof window.__slexCls.value === 'number')
      ? window.__slexCls.value : null;
    const clsTop = (window.__slexCls && window.__slexCls.entries) || [];
    return { text, images, scroll, blockedHits, surviveHits, cls, clsTop };
  }, entry);
}

/* ---------- single-pass execution ---------- */

/**
 * Run one pass of one corpus entry (vanilla OR blocked).
 * passOpts.installSlex      inject slex after DOMContentLoaded
 * passOpts.networkBlock     abort ad-server requests at ctx.route level
 */
async function runPass(browser, entry, reportDir, passName, passOpts) {
  const harPath = path.join(HAR_DIR, `${entry.id}.har`);
  const ctx = await newContext(browser, harPath, mode, { networkBlock: passOpts.networkBlock });
  const page = await ctx.newPage();
  await installClsObserver(page);

  const consoleLog = [];
  page.on('console', (m) => consoleLog.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => consoleLog.push(`[pageerror] ${e.message}`));

  /* Request lifecycle counters: issued / aborted / finished / redirected / failed.
     `issued` fires before abort, so a completed ad is specifically
     `finished - redirected`. */
  const counters = { issued: 0, aborted: 0, finished: 0, redirected: 0, failed: 0 };
  const sampleUrls = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!isAdUrl(url)) return;
    counters.issued++;
    if (sampleUrls.length < 8) sampleUrls.push(url);
  });
  page.on('requestfinished', async (req) => {
    if (!isAdUrl(req.url())) return;
    counters.finished++;
    try {
      const res = await req.response();
      if (res && res.status() >= 300 && res.status() < 400) counters.redirected++;
    } catch (_) { /* response gone after navigation */ }
  });
  page.on('requestfailed', (req) => {
    if (!isAdUrl(req.url())) return;
    const txt = (req.failure() && req.failure().errorText) || '';
    if (/BLOCKED_BY_CLIENT|ABORTED/i.test(txt)) counters.aborted++;
    else counters.failed++;
  });

  let metrics;
  try {
    await page.goto(entry.url, { waitUntil: 'domcontentloaded', timeout: 90000 })
      .catch((e) => consoleLog.push(`[goto-timeout] ${e.message.split('\n')[0]}`));
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);

    if (passOpts.installSlex) {
      await installBlockerWithRetry(page, consoleLog);
    }

    const postWait = passOpts.installSlex
      ? (entry.wait_ms_after_blocker || 2500)
      : (entry.wait_ms_after_load || 4000);
    await page.waitForTimeout(postWait);

    await autoScroll(page).catch((e) => consoleLog.push(`[scroll] ${e.message}`));
    /* Wait for scroll-triggered ad requests to settle before measuring. */
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2000);

    metrics = await collectMetrics(page, entry);
    metrics.ads = { ...counters };
    metrics.adRequests = counters.issued; /* legacy alias */
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
      consoleLog.push(`[screenshot-skipped:${passName}.png] ${e.message}`);
    }

    /* #3 HTML snapshot: 失敗時の要素特定を高速化。SecurityError や
       layout 破綻の調査に screenshot より情報量が多い。 */
    try {
      const html = await page.content();
      fs.writeFileSync(
        path.join(reportDir, entry.id, `${passName}.html`),
        html
      );
    } catch (e) {
      consoleLog.push(`[html-snapshot-skipped:${passName}.html] ${e.message}`);
    }
  } finally {
    fs.appendFileSync(
      path.join(reportDir, entry.id, 'console.log'),
      `\n==== ${passName} ====\n` + consoleLog.join('\n') + '\n'
    );
    await ctx.close();
  }
  return { metrics };
}

async function installBlockerWithRetry(page, consoleLog) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await installBlocker(page, SLEX);
      return;
    } catch (e) {
      if (!/Execution context was destroyed/i.test(String(e.message))) throw e;
      consoleLog.push(`[install-retry:${attempt}] ${e.message}`);
      await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
    }
  }
  throw new Error('installBlocker: gave up after 3 retries');
}

/* ---------- per-entry orchestration ---------- */

async function runOne(browser, entry, reportDir, baselineStore) {
  fs.writeFileSync(path.join(reportDir, entry.id, 'console.log'), '');
  const result = { id: entry.id, url: entry.url, group: entry.group, mode };

  try {
    /* Fresh context per pass so pass-1 cookies can't inflate pass-2 SSP
       bidding — the earlier "blocked > vanilla" pattern was contamination. */
    const vanilla = await runPass(browser, entry, reportDir, 'vanilla',
      { installSlex: false, networkBlock: false });
    const blocked = await runPass(browser, entry, reportDir, 'blocked',
      { installSlex: true, networkBlock: true });

    if (mode === 'record' && baselineStore && vanilla.metrics) {
      baselineStore[entry.id] = snapshotMetrics(vanilla.metrics);
    }
    const baseline = baselineStore && baselineStore[entry.id];
    const verdict = judge(entry, vanilla.metrics, blocked.metrics, baseline);

    Object.assign(result, {
      vanilla: vanilla.metrics,
      blocked: blocked.metrics,
      baseline,
      verdict,
    });
  } catch (err) {
    result.error = String(err && err.stack || err);
  }
  return result;
}

/* ---------- main ---------- */

process.on('unhandledRejection', (reason) => {
  /* Playwright emits NavigationAbortedError out-of-band for cookie-sync URLs
     HAR replay can't reproduce. Don't let one SSP sub-frame kill the suite. */
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
  const baselineStore = loadBaseline(BASELINE_PATH);
  const results = new Array(corpus.length);

  /* Worker pool — next index claimed by whichever worker is free. */
  let nextIdx = 0;
  async function worker() {
    while (true) {
      const i = nextIdx++;
      if (i >= corpus.length) break;
      const entry = corpus[i];
      const r = await runOne(browser, entry, reportDir, baselineStore);
      results[i] = r;
      console.log(formatResult(mode, entry, r));
    }
  }
  const pool = [];
  for (let w = 0; w < Math.max(1, workers); w++) pool.push(worker());
  await Promise.all(pool);

  await browser.close();

  if (mode === 'record') saveBaseline(BASELINE_PATH, baselineStore);

  const summary = { mode, stamp, results };
  fs.writeFileSync(path.join(reportDir, 'summary.json'), JSON.stringify(summary, null, 2));

  try {
    const { renderHTML } = require('./emit-report');
    fs.writeFileSync(path.join(reportDir, 'index.html'), renderHTML(summary));
  } catch (e) { console.error('[report] ' + e.message); }

  const by = summarize(results);
  console.log(`\nReport: ${reportDir}`);
  console.log(`Total ${results.length}  PASS ${by.PASS}  FAIL ${by.FAIL}  INCONCLUSIVE ${by.INCONCLUSIVE}  ERROR ${by.ERROR}`);
  /* INCONCLUSIVE alone should not fail CI; only real FAIL / ERROR does. */
  process.exit((by.FAIL + by.ERROR) > 0 ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
