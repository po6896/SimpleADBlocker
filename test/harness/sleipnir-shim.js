/*
 * Sleipnir Mobile runtime shim.
 *
 * Makes Playwright's Chromium evaluate the production .slex.js as faithfully
 * as possible, because the whole point of the test harness is to reproduce
 * real runtime quirks rather than a hypothetical browser.
 *
 * Faithfulness notes:
 * - Sleipnir strips newlines before eval — reproduced in stripNewlines().
 * - Sleipnir's eval is sloppy-mode — reproduced via dropUseStrict() (AST).
 * - @require jquery injected post-DOMContentLoaded matches Sleipnir timing;
 *   we use addScriptTag after goto for that reason, not addInitScript.
 * - document.createElement / write / writeln are force-unfrozen to allow
 *   the slex's direct reassignment on anti-adblock sites.
 * - SLEX_addStyle behaves like GM_addStyle.
 * - SLEX_xmlhttpRequest is a cross-origin XHR routed through fetch().
 */
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');

const JQUERY_PATH = path.join(
  __dirname, '..', '..', 'node_modules', 'jquery', 'dist', 'jquery.min.js'
);

let _jqueryCache = null;
function jqueryText() {
  if (_jqueryCache == null) _jqueryCache = fs.readFileSync(JQUERY_PATH, 'utf-8');
  return _jqueryCache;
}

/* ---------- slex body extraction & rewriting ---------- */

/**
 * Extract the JS body from a .slex.js file, stripping the ==UserScript==
 * metadata block.
 */
function splitUserScript(filePath) {
  const src = fs.readFileSync(filePath, 'utf-8');
  const lines = src.split(/\r?\n/);
  let metaStart = -1, metaEnd = -1;
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
 * Reproduce Sleipnir's "strip newlines, then eval" behavior. Any `//` line
 * comment in the body would swallow the rest of the file after this — the
 * lint rule exists to catch that before we get here.
 */
function stripNewlines(body) {
  return body.replace(/\r?\n/g, ' ');
}

/**
 * Remove every 'use strict' Directive Prologue from the script so the eval
 * runs sloppy-mode, matching real Sleipnir. AST-based so template literals
 * and identifier-named `useStrict` stay intact even if the slex is ever
 * minified. Byte ranges are replaced with spaces so source offsets and
 * line numbers are preserved in stack traces.
 */
function dropUseStrict(body) {
  let ast;
  try {
    ast = acorn.parse(body, { ecmaVersion: 'latest', allowReturnOutsideFunction: true });
  } catch (_) {
    /* Fallback for parse failure: tight regex anchored at statement
       boundaries so we don't touch template-literal content. */
    return body.replace(/(^|;|\{|\})\s*(['"])use strict\2\s*;?/g, '$1');
  }

  const ranges = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    const stmts = Array.isArray(node.body) ? node.body
      : (node.body && Array.isArray(node.body.body)) ? node.body.body : null;
    if (stmts) {
      for (const stmt of stmts) {
        if (stmt.type !== 'ExpressionStatement') break;
        if (stmt.directive === 'use strict') ranges.push([stmt.start, stmt.end]);
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

  const out = body.split('');
  for (const [s, e] of ranges) {
    for (let i = s; i < e; i++) out[i] = ' ';
  }
  return out.join('');
}

/* ---------- in-page setup executed as page.evaluate callbacks ---------- */

/** Make hot document methods writable so the slex can monkey-patch them. */
function unfreezeDocumentHotMethods() {
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
}

/** Install SLEX_* globals that @require api would normally provide. */
function installSlexPolyfills() {
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
      if (typeof details.onerror === 'function') {
        details.onerror({ error: String(err) });
      }
    });
  };

  window.SLEX_setValue = function (k, v) {
    try { localStorage.setItem('slex_' + k, JSON.stringify(v)); } catch (_) {}
  };
  window.SLEX_getValue = function (k, d) {
    try {
      const v = localStorage.getItem('slex_' + k);
      return v == null ? d : JSON.parse(v);
    } catch (_) { return d; }
  };
}

/**
 * Evaluate the slex body in the page. Sleipnir wraps inline script content
 * in a plain function; we mirror that with `new Function(src)()` so top-level
 * `var` declarations are scoped to the blocker, not polluting window.
 */
function evalSlexBody(src) {
  try {
    new Function(src)();
  } catch (e) {
    console.error('[slex-eval-error]', (e && e.stack) || e);
    throw e;
  }
}

/* ---------- orchestration ---------- */

/**
 * Inject jQuery + SLEX_* polyfill into the page, then evaluate the slex body.
 * Run this AFTER page.goto() so document is ready.
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

  await page.addScriptTag({ content: jqueryText() });
  await page.evaluate(unfreezeDocumentHotMethods);
  await page.evaluate(installSlexPolyfills);
  await page.evaluate(evalSlexBody, code);
}

module.exports = {
  splitUserScript,
  stripNewlines,
  dropUseStrict,
  installBlocker,
};
