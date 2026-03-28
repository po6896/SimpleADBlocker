// ==UserScript==
// @name        SAB Test
// @name:ja     SABテスト
// @author      codho
// @description Diagnostic test
// @description:ja 動作テスト用
// @include     http://*
// @include     https://*
// @version     0.0.2
// @require     jquery
// @require     api
// ==/UserScript==

(function () {
  'use strict';

  var r = [];

  // TEST 1: CSS
  try {
    SLEX_addStyle('.adsbygoogle { display: none !important; }');
    r.push('CSS:OK');
  } catch (e) {
    r.push('CSS:NG');
  }

  // TEST 2: jQuery
  try {
    var c = $('body').length;
    r.push('jQ:OK(' + c + ')');
  } catch (e) {
    r.push('jQ:NG');
  }

  // TEST 3: Proxy
  try {
    var p = new Proxy({}, { get: function () { return 1; } });
    r.push('Proxy:OK');
  } catch (e) {
    r.push('Proxy:NG');
  }

  // TEST 4: MutationObserver
  r.push('MO:' + (typeof MutationObserver !== 'undefined' ? 'OK' : 'NG'));

  // TEST 5: SLEX_httpGet
  r.push('HTTP:' + (typeof SLEX_httpGet === 'function' ? 'OK' : 'NG'));

  // TEST 6: host
  r.push(location.hostname);

  // Show results as big overlay at bottom
  var msg = r.join(' | ');

  try {
    SLEX_addStyle(
      '#_sab_diag{position:fixed!important;bottom:0!important;left:0!important;right:0!important;' +
      'background:#000!important;color:#0f0!important;font-size:16px!important;padding:12px!important;' +
      'z-index:2147483647!important;text-align:center!important;font-family:monospace!important;' +
      'border-top:2px solid #0f0!important;}'
    );
  } catch (e) {}

  var div = document.createElement('div');
  div.id = '_sab_diag';
  div.textContent = msg;

  if (document.body) {
    document.body.appendChild(div);
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      document.body.appendChild(div);
    });
  }

})();
