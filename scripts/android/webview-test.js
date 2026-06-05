#!/usr/bin/env node
/*
 * Real-device test over raw CDP (chrome-remote-interface, local:true) against
 * Sleipnir's WebView (adb forward tcp:9222). For each site:
 *   1. navigate, let the slex run
 *   2. scroll to the very bottom (tracks lazy-load height growth) and report
 *      whether the bottom was reached + body text + residual ads there
 *   3. follow an internal link (page navigation) and re-check body text /
 *      html position so a post-navigation blank/lock is caught
 * Saves a screenshot per site. Run with the extension installed (enabled=1).
 *
 * Usage: node scripts/android/webview-test.js
 */
const CDP = require('chrome-remote-interface');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', '..', 'test', 'reports');
const SITES = [
  ['majikichi', 'http://blog.livedoor.jp/news23vip/'],
  ['hameln', 'https://syosetu.org/'],
  ['bbspink', 'https://bbspink.com/'],
  ['pornhub', 'https://jp.pornhub.com/'],
  ['nijie', 'https://nijie.info/'],
  ['himado', 'http://himado.in/'],
  ['dropbooks', 'https://www.dropbooks.tv/'],
  ['jumpmatome', 'http://jumpsoku.com/'],
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Scroll to the very bottom, following lazy-load height growth.
const DEEP_SCROLL = `(async()=>{let last=0,stable=0,maxY=0;for(let i=0;i<30;i++){window.scrollTo(0,document.body.scrollHeight);await new Promise(r=>setTimeout(r,400));maxY=Math.max(maxY,window.pageYOffset);const sh=document.body.scrollHeight;if(sh===last){if(++stable>=3)break;}else{stable=0;last=sh;}}const reached=(window.pageYOffset+window.innerHeight)>=document.body.scrollHeight-200;const out={scrollHeight:document.body.scrollHeight,maxScrollY:Math.round(maxY),reachedBottom:reached,bodyTextLen:(document.body.innerText||'').length};window.scrollTo(0,0);return out;})()`;

const ADS = `(()=>{const out=[],seen=new Set();for(const e of document.querySelectorAll('iframe[src],ins,[id*="ad-" i],[class*="-ad" i],[class*="_ad" i],[class*="ad_" i]')){const r=e.getBoundingClientRect(),st=getComputedStyle(e);if(r.width<80||r.height<50||st.display==='none'||st.visibility==='hidden'||parseFloat(st.opacity)<0.1)continue;let h='';try{h=new URL(e.src||'',location.href).hostname;}catch(_){}const k=e.tagName+'|'+(e.className||'')+'|'+Math.round(r.width);if(seen.has(k))continue;seen.add(k);out.push({tag:e.tagName,host:h,cls:(e.className||'').toString().slice(0,30),w:Math.round(r.width),h2:Math.round(r.height)});}return out.slice(0,15);})()`;

const FIND_LINK = `(()=>{var here=location.pathname+location.search;var a=[].slice.call(document.querySelectorAll('a[href]')).find(function(x){try{var u=new URL(x.href);return u.hostname===location.hostname&&(u.pathname+u.search)!==here&&u.pathname.length>3&&!/\\.(jpg|png|gif|zip|pdf)$/i.test(u.pathname);}catch(e){return false;}});return a?a.href:null;})()`;

(async () => {
  const client = await CDP({ port: 9222, local: true });
  const { Page, Runtime } = client;
  await Page.enable();
  await Runtime.enable();

  async function ev(expr) {
    const r = await Runtime.evaluate({ expression: expr, awaitPromise: true, returnByValue: true });
    return r.exceptionDetails ? { error: r.exceptionDetails.text } : r.result.value;
  }

  const results = [];
  for (const [name, url] of SITES) {
    try {
      await Page.navigate({ url });
      await Promise.race([Page.loadEventFired(), sleep(20000)]);
    } catch (e) {
      results.push({ name, err: String(e.message).slice(0, 60) });
      continue;
    }
    await sleep(7000);
    const scroll = await ev(DEEP_SCROLL);
    const ads = await ev(ADS);
    let afterNav = {};
    const link = await ev(FIND_LINK);
    if (link) {
      try {
        await Page.navigate({ url: link });
        await Promise.race([Page.loadEventFired(), sleep(15000)]);
        await sleep(5000);
        const raw = await ev(`JSON.stringify({url:location.pathname.slice(0,30),bodyTextLen:(document.body.innerText||'').length,htmlPos:getComputedStyle(document.documentElement).position})`);
        afterNav = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (e) {
        afterNav = { navErr: String(e.message).slice(0, 40) };
      }
    } else {
      afterNav = { noLink: true };
    }
    try {
      const { data } = await Page.captureScreenshot({ format: 'png' });
      fs.writeFileSync(path.join(OUT, `wv2-${name}.png`), Buffer.from(data, 'base64'));
    } catch (_) {}
    results.push({ name, url, scroll, residualAds: ads, afterNav });
  }
  console.log(JSON.stringify(results, null, 1));
  await client.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
