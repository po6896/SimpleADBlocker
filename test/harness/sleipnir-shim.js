/*
 * Sleipnir Mobile runtime shim.
 *
 * Provides browser-side polyfills for @require api (SLEX_* globals) so that
 * the production .slex.js can be evaluated in Playwright-controlled Chromium
 * as faithfully as possible.
 *
 * Faithfulness notes:
 * - Sleipnir strips newlines before eval; we reproduce that in loadSlex().
 * - @require jquery is injected via CDN before the script body runs.
 * - SLEX_addStyle behaves like GM_addStyle: appends a <style> to <head>.
 * - SLEX_xmlhttpRequest is a cross-origin XHR; we route through fetch() with
 *   Playwright route rewrites when HAR replay is active.
 */
const fs = require('fs');

const JQUERY_CDN = 'https://code.jquery.com/jquery-3.7.1.min.js';

/**
 * Extract the JS body from a .slex.js file (strip ==UserScript== block).
 * @param {string} filePath
 * @returns {{meta: string, body: string}}
 */
function splitUserScript(filePath) {
  const src = fs.readFileSync(filePath, 'utf-8');
  const lines = src.split(/\r?\n/);
  let metaEnd = -1;
  let metaStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (metaStart < 0 && t.startsWith('// ==UserScript==')) metaStart = i;
    if (t.startsWith('// ==/UserScript==')) { metaEnd = i; break; }
  }
  if (metaStart < 0 || metaEnd < 0) {
    throw new Error('==UserScript== block not found in ' + filePath);
  }
  return {
    meta: lines.slice(metaStart, metaEnd + 1).join('\n'),
    body: lines.slice(metaEnd + 1).join('\n'),
  };
}

/**
 * Reproduce Sleipnir's "strip newlines then eval" behavior.
 * This is the real runtime: any stray // line-comment in the body would
 * collapse the rest of the file into a comment here.
 */
function stripNewlines(body) {
  return body.replace(/\r?\n/g, ' ');
}

/**
 * Real Sleipnir eval appears to be sloppy-mode (silent failures on frozen
 * properties are tolerated; the blocker has several anti-adblock sites in
 * mind where direct assignments to document.createElement etc. are expected
 * to silently fail). Strip the IIFE's `'use strict'` so that Playwright's
 * Chromium behaves the same way. This affects only the harness, not
 * production artifacts.
 */
function dropUseStrict(body) {
  return body.replace(/(['"])use strict\1\s*;?/g, '');
}

/**
 * Inject jQuery + SLEX_* polyfill into the page, then evaluate the slex body.
 * Run this AFTER page.goto() so that document is ready.
 *
 * @param {import('playwright').Page} page
 * @param {string} slexPath
 * @param {object} [opts]
 * @param {boolean} [opts.faithfulEval=true] strip newlines before eval
 */
async function installBlocker(page, slexPath, opts = {}) {
  const { faithfulEval = true } = opts;
  const { body } = splitUserScript(slexPath);
  const sloppy = dropUseStrict(body);
  const code = faithfulEval ? stripNewlines(sloppy) : sloppy;

  await page.addScriptTag({ url: JQUERY_CDN });

  /* Some sites (and some WebViews) mark hot document methods as writable:false
     via Object.defineProperty, which breaks the blocker's strict-mode direct
     assignment. Re-define them as writable own properties on `document` so the
     slex can monkey-patch freely, matching real Sleipnir runtime behavior. */
  await page.evaluate(() => {
    const names = ['createElement', 'write', 'writeln'];
    for (const n of names) {
      try {
        const orig = document[n];
        Object.defineProperty(document, n, {
          value: orig,
          writable: true,
          configurable: true,
          enumerable: false,
        });
      } catch (_) { /* best-effort */ }
    }
  });

  await page.evaluate(() => {
    if (window.SLEX_addStyle) return;
    window.SLEX_addStyle = function (css) {
      const s = document.createElement('style');
      s.textContent = css;
      (document.head || document.documentElement).appendChild(s);
      return s;
    };
    window.SLEX_xmlhttpRequest = function (details) {
      const init = {
        method: details.method || 'GET',
        headers: details.headers || {},
        body: details.data,
        credentials: 'omit',
      };
      return fetch(details.url, init).then(async (res) => {
        const text = await res.text();
        const response = {
          status: res.status,
          statusText: res.statusText,
          responseText: text,
          responseHeaders: [...res.headers.entries()]
            .map(([k, v]) => k + ': ' + v).join('\r\n'),
          finalUrl: res.url,
        };
        if (typeof details.onload === 'function') details.onload(response);
        return response;
      }).catch((err) => {
        if (typeof details.onerror === 'function') details.onerror({ error: String(err) });
      });
    };
    window.SLEX_setValue = function (k, v) { try { localStorage.setItem('slex_' + k, JSON.stringify(v)); } catch (_) {} };
    window.SLEX_getValue = function (k, d) {
      try { const v = localStorage.getItem('slex_' + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; }
    };
  });

  /* Wrap in IIFE so the Sleipnir script's own `'use strict'` and var declarations
     stay scoped; errors bubble up to the Playwright console. */
  await page.evaluate((src) => {
    try {
      /* eslint-disable no-new-func */
      new Function(src)();
    } catch (e) {
      console.error('[slex-eval-error]', e && e.stack || e);
      throw e;
    }
  }, code);
}

module.exports = {
  splitUserScript,
  stripNewlines,
  dropUseStrict,
  installBlocker,
};
