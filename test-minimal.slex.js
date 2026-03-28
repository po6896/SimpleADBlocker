// ==UserScript==
// @name        SAB Test
// @name:ja     SABテスト
// @author      codho
// @description Minimal test - CSS only
// @description:ja 動作テスト用
// @include     http://*
// @include     https://*
// @version     0.0.1
// @require     jquery
// @require     api
// ==/UserScript==

(function () {
  'use strict';

  // TEST 1: CSS injection works?
  try {
    SLEX_addStyle('ins.adsbygoogle, .adsbygoogle, [id^="div-gpt-ad"], [id^="google_ads_"], iframe[src*="googlesyndication.com"], iframe[src*="doubleclick.net"] { display: none !important; }');
    document.title = '[OK:CSS] ' + document.title;
  } catch (e) {
    document.title = '[FAIL:CSS] ' + document.title;
  }

  // TEST 2: jQuery works?
  try {
    var count = $('ins.adsbygoogle').length;
    document.title = document.title.replace(']', ':jQ=' + count + ']');
  } catch (e) {
    document.title = document.title.replace(']', ':jQ=FAIL]');
  }

  // TEST 3: Proxy available?
  try {
    var p = new Proxy({}, { get: function () { return 1; } });
    document.title = document.title + ' [Proxy:OK]';
  } catch (e) {
    document.title = document.title + ' [Proxy:NO]';
  }

  // TEST 4: MutationObserver?
  document.title = document.title + (typeof MutationObserver !== 'undefined' ? ' [MO:OK]' : ' [MO:NO]');

  // TEST 5: SLEX_httpGet?
  document.title = document.title + (typeof SLEX_httpGet === 'function' ? ' [HTTP:OK]' : ' [HTTP:NO]');

  // TEST 6: Page info
  document.title = document.title + ' [' + location.hostname + ']';

})();
