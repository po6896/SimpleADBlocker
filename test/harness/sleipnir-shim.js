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
const path = require('path');

const JQUERY_PATH = path.join(__dirname, '..', '..', 'node_modules', 'jquery', 'dist', 'jquery.min.js');
let _jqueryCache = null;
function jqueryText() {
  if (_jqueryCache) return _jqueryCache;
  _jqueryCache = fs.readFileSync(JQUERY_PATH, 'utf-8');
  return _jqueryCache;
}

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
 * to silently fail). Strip only the IIFE's Directive Prologue — an AST walk
 * catches exactly the "use strict" directives while leaving template-literal
 * strings and comments alone, which the earlier regex version would stomp
 * on if the slex ever got minified.
 */
function dropUseStrict(body) {
  const acorn = require('acorn');
  let ast;
  try {
    ast = acorn.parse(body, { ecmaVersion: 'latest', allowReturnOutsideFunction: true });
  } catch (_) {
    /* Parse failed (rare, probably a code quirk) — fall back to a tight
       regex that only matches at statement boundaries. */
    return body.replace(/(^|;|\{|\})\s*(['"])use strict\2\s*;?/g, '$1');
  }
  /* Collect directive ranges from every function scope's Directive Prologue. */
  const ranges = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    const body = Array.isArray(node.body) ? node.body
      : (node.body && Array.isArray(node.body.body)) ? node.body.body : null;
    if (body) {
      for (const stmt of body) {
        if (stmt.type !== 'ExpressionStatement') break;
        const e = stmt.expression;
        if (e.type !== 'Literal' || typeof e.value !== 'string') break;
        if (stmt.directive !== 'use strict') continue;
        ranges.push([stmt.start, stmt.end]);
      }
    }
    for (const k in node) {
      if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
      const v = node[k];
      if (v && typeof v === 'object') {
        if (Array.isArray(v)) v.forEach(visit); else visit(v);
      }
    }
  }
  visit(ast);
  if (ranges.length === 0) return body;
  /* Replace directive byte ranges with spaces to preserve offsets / line numbers. */
  const out = body.split('');
  for (const [s, e] of ranges) {
    for (let i = s; i < e; i++) out[i] = ' ';
  }
  return out.join('');
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

  /* jQuery loads via addScriptTag after goto. We evaluated moving to
     context.addInitScript for document_start timing, but jQuery 3.x/4.x
     expect documentElement to exist and crash inside an addInitScript
     that fires before the document is fully set up. Real Sleipnir's
     @require jquery also loads after DOMContentLoaded, so addScriptTag
     actually matches production timing more closely than document_start
     injection would. */
  const jq = jqueryText();
  await page.addScriptTag({ content: jq });

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

/**
 * Build the document-start init script: jQuery + SLEX polyfills + the
 * document.createElement/write/writeln unfreeze. Returns a string that
 * context.addInitScript({ content }) can accept.
 */
function buildInitScript() {
  const unfreezeAndPolyfill = `
    (function(){
      try {
        var names = ['createElement', 'write', 'writeln'];
        for (var i=0; i<names.length; i++) {
          var n = names[i];
          try {
            var orig = document[n];
            Object.defineProperty(document, n, {
              value: orig, writable: true, configurable: true, enumerable: false
            });
          } catch(_) {}
        }
      } catch(_) {}

      if (!window.SLEX_addStyle) {
        window.SLEX_addStyle = function(css){
          var s = document.createElement('style');
          s.textContent = css;
          (document.head || document.documentElement).appendChild(s);
          return s;
        };
      }
      if (!window.SLEX_xmlhttpRequest) {
        window.SLEX_xmlhttpRequest = function(details){
          var init = {
            method: details.method || 'GET',
            headers: details.headers || {},
            body: details.data,
            credentials: 'omit'
          };
          return fetch(details.url, init).then(function(res){
            return res.text().then(function(text){
              var response = {
                status: res.status,
                statusText: res.statusText,
                responseText: text,
                responseHeaders: Array.from(res.headers.entries()).map(function(e){return e[0]+': '+e[1];}).join('\\r\\n'),
                finalUrl: res.url
              };
              if (typeof details.onload === 'function') details.onload(response);
              return response;
            });
          })['catch'](function(err){
            if (typeof details.onerror === 'function') details.onerror({ error: String(err) });
          });
        };
      }
      if (!window.SLEX_setValue) {
        window.SLEX_setValue = function(k,v){ try { localStorage.setItem('slex_'+k, JSON.stringify(v)); } catch(_) {} };
        window.SLEX_getValue = function(k,d){
          try { var v = localStorage.getItem('slex_'+k); return v==null?d:JSON.parse(v); } catch(_) { return d; }
        };
      }
    })();
  `;
  return jqueryText() + '\n' + unfreezeAndPolyfill;
}

module.exports = {
  splitUserScript,
  stripNewlines,
  dropUseStrict,
  installBlocker,
  buildInitScript,
};
