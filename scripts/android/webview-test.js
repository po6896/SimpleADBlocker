#!/usr/bin/env node
/*
 * Real-device test over raw CDP against Sleipnir's WebView (adb forward
 * tcp:9222). Android WebView only supports Page/Runtime domains, so we use
 * chrome-remote-interface, not Playwright. For each site: navigate, let the
 * slex run, then check scrollability / tap-jacking / residual ad iframes,
 * and save a screenshot. Run with the extension enabled in slex.db.
 *
 * Usage: node scripts/android/webview-test.js
 */
const CDP = require('chrome-remote-interface');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'test', 'reports');
const SITES = [
  ['OW', 'https://overwatch2-news.apexlegends-leaksnews.com/'],
  ['gamewith', 'https://gamewith.jp/'],
  ['gigazine', 'https://gigazine.net/'],
  ['kamigame', 'https://kamigame.jp/dbd/'],
  ['yahoo_news', 'https://news.yahoo.co.jp/'],
  ['syosetu', 'https://syosetu.com/'],
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SCROLL_JS = `(async()=>{const sh=document.body.scrollHeight;window.scrollTo(0,1500);await new Promise(r=>setTimeout(r,600));const after=window.scrollY;const cx=Math.floor(innerWidth/2),cy=Math.floor(innerHeight/2);const el=document.elementFromPoint(cx,cy);const desc=el?el.tagName+'.'+(el.className||'').toString().trim().slice(0,30):'null';window.scrollTo(0,0);return {scrollHeight:sh,scrolledTo:after,scrollable:after>100,centerEl:desc};})()`;

const ADS_JS = `(()=>{const out=[],seen=new Set();for(const e of document.querySelectorAll('iframe[src],ins,[id*="ad-" i],[class*="-ad" i]')){const r=e.getBoundingClientRect(),st=getComputedStyle(e);if(r.width<80||r.height<50||st.display==='none'||st.visibility==='hidden'||parseFloat(st.opacity)<0.1)continue;let h='';try{h=new URL(e.src||'',location.href).hostname;}catch(_){}const k=e.tagName+'|'+h+'|'+Math.round(r.width);if(seen.has(k))continue;seen.add(k);out.push({tag:e.tagName,host:h,cls:(e.className||'').toString().slice(0,30),w:Math.round(r.width),h2:Math.round(r.height)});}return out.slice(0,20);})()`;

(async () => {
  const client = await CDP({ port: 9222, local: true });
  const { Page, Runtime } = client;
  await Page.enable();
  await Runtime.enable();

  async function evalv(expr) {
    const r = await Runtime.evaluate({ expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) return { error: r.exceptionDetails.text };
    return r.result.value;
  }

  const results = [];
  for (const [name, url] of SITES) {
    try {
      await Page.navigate({ url });
      await Promise.race([Page.loadEventFired(), sleep(20000)]);
    } catch (e) {
      results.push({ name, err: String(e.message).slice(0, 80) });
      continue;
    }
    await sleep(8000);
    const scroll = await evalv(SCROLL_JS);
    const ads = await evalv(ADS_JS);
    try {
      const { data } = await Page.captureScreenshot({ format: 'png' });
      fs.writeFileSync(path.join(OUT, `wv-${name}.png`), Buffer.from(data, 'base64'));
    } catch (_) {}
    results.push({ name, url, scroll, residualAds: ads });
  }
  console.log(JSON.stringify(results, null, 1));
  await client.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
