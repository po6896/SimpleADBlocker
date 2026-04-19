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

const { installBlocker, buildInitScript } = require('./sleipnir-shim');

const ROOT = path.resolve(__dirname, '..', '..');
const SLEX = path.join(ROOT, 'sleipnir-adblock.slex.js');
const CORPUS_PATH = path.join(ROOT, 'test', 'corpus', 'targets.yaml');
const BASELINE_PATH = path.join(ROOT, 'test', 'corpus', 'baseline.json');
const HAR_DIR = path.join(ROOT, 'test', 'corpus', 'har');
const REPORT_DIR = path.join(ROOT, 'test', 'reports');

/**
 * Per-site vanilla baseline (text/images/scroll) captured at record time
 * and reused across replays. Replaces the hard-coded 0.7/0.5/0.5 ratio
 * cut-offs with "post-blocker metric >= 85% of recorded vanilla baseline".
 * Wikipedia's text is naturally ~0.95× its own baseline while Yahoo News
 * can legitimately drop to 0.60× without anything being wrong — one
 * global threshold is the wrong model.
 */
function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8')); }
  catch (_) { return {}; }
}
function saveBaseline(obj) {
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(obj, null, 2) + '\n');
}
const DYNAMIC_BASELINE_RATIO = 0.85;

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

const mode = process.argv.includes('--record') ? 'record'
  : process.argv.includes('--live') ? 'live'
  : 'replay';
const filterId = argAfter('--only');
/* Record is sequential by default — live network capture is fragile under
   parallel load and the HAR files should be clean single-session snapshots.
   Replay can safely run 4-wide; Playwright contexts are cheap and isolated. */
const workers = parseInt(argAfter('--workers') || (mode === 'record' ? '1' : '4'), 10);

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
  /* live-mode goes out to the network fresh every time: no HAR replay, no
     throttle — used as an auxiliary weekly sanity run to catch HAR
     staleness and prebid nonce expiry. */

  if (harMode === 'replay' && fs.existsSync(harPath)) {
    await ctx.routeFromHAR(harPath, { notFound: 'fallback', update: false });
  }
  /* live mode: no routeFromHAR. Each context hits the actual origin. */

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
  /* Throttle only during replay. Record / live hit the live network once,
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
    /* Pick up whatever layout-shift observer installed earlier reported.
       A blocker that leaves empty iframe shells will push CLS > 0.1 even
       though the ad is visually gone. Treat that as a WARN, not a FAIL. */
    const cls = (window.__slexCls && typeof window.__slexCls.value === 'number')
      ? window.__slexCls.value : null;
    const clsTop = (window.__slexCls && window.__slexCls.entries) || [];
    return { text, images, scroll, blockedHits, surviveHits, cls, clsTop };
  }, entry);
}

/**
 * Install a layout-shift observer as early as possible so we catch shifts
 * caused by ad slots collapsing after the blocker removes them. The value
 * is read back during collectMetrics.
 */
async function installClsObserver(page) {
  await page.addInitScript(() => {
    window.__slexCls = { value: 0, entries: [] };
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.hadRecentInput) continue;
          window.__slexCls.value += e.value;
          /* Only keep top-10 worst entries by value, with a compact node
             description so summary.json stays reasonable. */
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

function judge(entry, vanilla, blocked, baseline) {
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

  /* Prefer the persisted baseline when available (captured at record time).
     It is stable across replays and represents the "healthy page" state for
     this site. The current vanilla reading can drift if HAR replay fires
     fewer requests than record. Fall back to in-run vanilla only when the
     baseline does not yet exist. */
  const src = baseline || vanilla;
  const srcKind = baseline ? 'baseline' : 'vanilla';
  const ratios = {
    text: src.text ? blocked.text / src.text : 1,
    images: src.images ? blocked.images / src.images : 1,
    scroll: src.scroll ? blocked.scroll / src.scroll : 1,
  };
  /* Legacy per-entry override still wins, otherwise the new dynamic cutoff. */
  const legacy = entry.body_min_ratio;
  const threshold = legacy
    ? legacy
    : { text: DYNAMIC_BASELINE_RATIO, images: DYNAMIC_BASELINE_RATIO, scroll: DYNAMIC_BASELINE_RATIO };
  for (const k of ['text', 'images', 'scroll']) {
    if (ratios[k] < threshold[k]) {
      failures.push(
        `body ${k} ${(ratios[k] * 100).toFixed(1)}% of ${srcKind} ` +
        `(threshold ${(threshold[k] * 100).toFixed(0)}%)`
      );
    }
  }

  /* CLS warning. Only count shifts whose source looks ad-related; page-level
     semantic containers (main/article/body/section) shifting is expected when
     a blocker removes inline ads and the surrounding content reflows, and it
     drowns out the real signal (empty iframe shells). */
  const warnings = [];
  const CLS_WARN = 0.1;
  function isAdLikeSource(src) {
    const tag = (src.tag || '').toUpperCase();
    const id = src.id || '';
    const cls = src.cls || '';
    if (tag === 'IFRAME' || tag === 'INS') return true;
    if (/^(ad|ads|yads_|div-gpt-ad|google_ads_|ezoic-)/i.test(id)) return true;
    if (/(^|\s)(ad|ads|adsbygoogle|advertis)/i.test(cls)) return true;
    return false;
  }
  let adCls = 0;
  for (const e of (blocked.clsTop || [])) {
    const adSrc = (e.sources || []).some(isAdLikeSource);
    if (adSrc) adCls += e.v;
  }
  if (adCls > CLS_WARN) {
    warnings.push(`ad-CLS ${adCls.toFixed(3)} (> ${CLS_WARN}); check empty ad shells`);
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
    return { verdict: 'INCONCLUSIVE', reasons, failures, ratios, warnings, adRequests: { vanilla: vanillaAdReq, blocked: blockedAdReq } };
  }
  if (failures.length > 0) {
    return { verdict: 'FAIL', reasons: failures, ratios, warnings, adRequests: { vanilla: vanillaAdReq, blocked: blockedAdReq } };
  }
  return { verdict: 'PASS', reasons: [], ratios, warnings, adRequests: { vanilla: vanillaAdReq, blocked: blockedAdReq } };
}

/**
 * Scroll the page top-to-bottom in viewport-sized steps so lazy-load ads
 * and bottom-anchored slots fire before we measure.
 */
async function autoScroll(page, { step = 800, pause = 400, maxSteps = 12 } = {}) {
  /* Do NOT scroll back to the top at the end — some sites (livedoor_news)
     have a nav sidebar that mounts only when scrollY = 0, and its late
     arrival inflates CLS with a page-level shift that is not the blocker's
     fault. Leaving the final position at the bottom keeps CLS attribution
     honest. */
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
  }, { step, pause, maxSteps });
}

async function runPass(browser, entry, reportDir, passName, passOpts) {
  const harPath = path.join(HAR_DIR, `${entry.id}.har`);
  const ctx = await newContext(browser, harPath, mode, {
    networkBlock: passOpts.networkBlock,
  });
  const page = await ctx.newPage();
  await installClsObserver(page);
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

async function runOne(browser, entry, reportDir, baselineStore) {
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

    /* Persist vanilla snapshot as the baseline during record; it becomes the
       stable reference for every replay until the next record cycle. */
    if (mode === 'record' && baselineStore && vanilla.metrics) {
      baselineStore[entry.id] = {
        text: vanilla.metrics.text,
        images: vanilla.metrics.images,
        scroll: vanilla.metrics.scroll,
        recordedAt: new Date().toISOString(),
      };
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
  const baselineStore = loadBaseline();
  const results = new Array(corpus.length);

  function formatResult(entry, r) {
    const tag = `[${mode}] ${entry.id}`;
    if (r.error) return `${tag} ... ERROR: ${r.error.split('\n')[0]}`;
    if (!r.verdict) return `${tag} ... recorded`;
    if (r.verdict.verdict === 'PASS') {
      const v = (r.vanilla && r.vanilla.ads) || {};
      const b = (r.blocked && r.blocked.ads) || {};
      const vSurv = (r.vanilla && r.vanilla.adSurvivors) || 0;
      const bSurv = (r.blocked && r.blocked.adSurvivors) || 0;
      const warn = (r.verdict.warnings && r.verdict.warnings.length)
        ? ` [WARN: ${r.verdict.warnings.join('; ')}]` : '';
      return `${tag} ... PASS  vanilla{iss:${v.issued||0} fin:${v.finished||0} red:${v.redirected||0} fail:${v.failed||0}} ` +
        `blocked{iss:${b.issued||0} abt:${b.aborted||0} fin:${b.finished||0} red:${b.redirected||0} fail:${b.failed||0}} ` +
        `survivors v:${vSurv}->b:${bSurv}${warn}`;
    }
    if (r.verdict.verdict === 'INCONCLUSIVE')
      return `${tag} ... INCONCLUSIVE  (${r.verdict.reasons.join('; ')})`;
    if (r.verdict.verdict === 'FAIL') {
      const lines = [`${tag} ... FAIL  (${r.verdict.reasons.length})`];
      for (const why of r.verdict.reasons) lines.push('  - ' + why);
      return lines.join('\n');
    }
    return `${tag} ... ${r.verdict.verdict}`;
  }

  let nextIdx = 0;
  async function worker() {
    while (true) {
      const i = nextIdx++;
      if (i >= corpus.length) break;
      const entry = corpus[i];
      const r = await runOne(browser, entry, reportDir, baselineStore);
      results[i] = r;
      console.log(formatResult(entry, r));
    }
  }
  const pool = [];
  for (let w = 0; w < Math.max(1, workers); w++) pool.push(worker());
  await Promise.all(pool);

  await browser.close();

  if (mode === 'record') {
    saveBaseline(baselineStore);
  }

  const summary = { mode, stamp, results };
  const summaryPath = path.join(reportDir, 'summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

  /* Render an HTML dashboard beside the summary.json. Best-effort — a broken
     report should never fail the test run. */
  try {
    const { renderHTML } = require('./emit-report');
    fs.writeFileSync(path.join(reportDir, 'index.html'), renderHTML(summary));
  } catch (e) { console.error('[report] ' + e.message); }

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
