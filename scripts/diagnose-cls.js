#!/usr/bin/env node
/*
 * One-off diagnostic: replay a single site with the blocker, then enumerate
 * every element that still occupies layout but is visually empty. These
 * are the CLS culprits — the blocker removed the ad content but left a
 * sized container behind.
 */
const path = require('path');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

const { installBlocker } = require('../test/harness/sleipnir-shim');

const ROOT = path.resolve(__dirname, '..');
const SLEX = path.join(ROOT, 'sleipnir-adblock.slex.js');
const HAR_DIR = path.join(ROOT, 'test', 'corpus', 'har');

const siteId = process.argv[2] || 'yahoo_news_jp';
const url = process.argv[3] || 'https://news.yahoo.co.jp/';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) Sleipnir/4.9.0',
    bypassCSP: true,
  });
  const harPath = path.join(HAR_DIR, `${siteId}.har`);
  try { await ctx.routeFromHAR(harPath, { notFound: 'fallback', update: false }); } catch (_) {}

  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));

  /* Install a detailed layout-shift observer before anything else runs,
     so we can attribute CLS to specific DOM nodes. */
  await page.addInitScript(() => {
    window.__clsEntries = [];
    try {
      const po = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          if (e.hadRecentInput) continue;
          const sources = (e.sources || []).map((s) => {
            const n = s.node;
            if (!n || n.nodeType !== 1) return { node: null };
            return {
              tag: n.tagName,
              id: n.id || null,
              class: (n.className && n.className.toString ? n.className.toString().slice(0, 80) : null),
              prevRect: s.previousRect && { w: Math.round(s.previousRect.width), h: Math.round(s.previousRect.height), t: Math.round(s.previousRect.top) },
              currRect: s.currentRect && { w: Math.round(s.currentRect.width), h: Math.round(s.currentRect.height), t: Math.round(s.currentRect.top) },
            };
          });
          window.__clsEntries.push({ value: e.value, startTime: e.startTime, sources });
        }
      });
      po.observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForLoadState('load', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await installBlocker(page, SLEX);
  /* Wait long enough for slex's 8s sweep to fire. */
  await page.waitForTimeout(9000);

  /* Probe: is killAdSizedEmpties actually seeing these divs as contentless? */
  const probe = await page.evaluate(() => {
    const divs = document.querySelectorAll('.QxYzZ');
    const out = [];
    for (const d of divs) {
      const r = d.getBoundingClientRect();
      const text = (d.innerText || '').replace(/\s/g, '');
      const hasMedia = !!d.querySelector('img, video, svg, canvas, a[href], iframe');
      out.push({
        w: Math.round(r.width),
        h: Math.round(r.height),
        childrenCount: d.children.length,
        firstChildTag: d.children[0] ? d.children[0].tagName : null,
        firstChildHTML: d.children[0] ? d.children[0].outerHTML.slice(0, 120) : null,
        text_bytes: text.length,
        hasMedia,
      });
    }
    return out;
  });
  console.log('=== QxYzZ probe ===', JSON.stringify(probe, null, 2));

  /* Walk the tree and flag anything that occupies layout but has no
     visible content. */
  const suspects = await page.evaluate(() => {
    function bytesOfText(el) {
      return (el.innerText || '').replace(/\s/g, '').length;
    }
    function hasVisibleChild(el) {
      for (const c of el.children) {
        const r = c.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return true;
      }
      return false;
    }
    const out = [];
    const all = document.querySelectorAll('iframe, div, section, aside, ins');
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width < 50 || r.height < 40) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;

      const tag = el.tagName;
      const textBytes = bytesOfText(el);
      const hasImg = el.querySelector('img, svg, video, canvas');
      const isEmpty = textBytes === 0 && !hasImg && !hasVisibleChild(el);
      if (!isEmpty) continue;

      out.push({
        tag,
        id: el.id || null,
        class: (el.className && el.className.toString ? el.className.toString().slice(0, 60) : null),
        width: Math.round(r.width),
        height: Math.round(r.height),
        top: Math.round(r.top),
        src: tag === 'IFRAME' ? el.src : null,
        name: tag === 'IFRAME' ? el.name : null,
        parentTag: el.parentElement ? el.parentElement.tagName : null,
        parentId: el.parentElement ? el.parentElement.id : null,
        parentClass: (el.parentElement && el.parentElement.className && el.parentElement.className.toString)
          ? el.parentElement.className.toString().slice(0, 60) : null,
      });
    }
    out.sort((a, b) => (b.width * b.height) - (a.width * a.height));
    return out.slice(0, 30);
  });

  /* Dump the top CLS contributors. */
  const clsEntries = await page.evaluate(() => window.__clsEntries || []);
  clsEntries.sort((a, b) => b.value - a.value);
  const totalCls = clsEntries.reduce((s, e) => s + e.value, 0);
  console.log('=== CLS total:', totalCls.toFixed(4), 'entries:', clsEntries.length, '===');
  for (const e of clsEntries.slice(0, 10)) {
    console.log(`  +${e.value.toFixed(4)} @ ${Math.round(e.startTime)}ms`);
    for (const s of e.sources.slice(0, 3)) {
      console.log(`    ${s.tag} id=${s.id} class=${s.class} prev=${JSON.stringify(s.prevRect)} curr=${JSON.stringify(s.currRect)}`);
    }
  }

  console.log('=== suspects ===');
  console.log(JSON.stringify({ siteId, url, suspects }, null, 2));
  await browser.close();
})();
