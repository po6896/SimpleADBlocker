// ==UserScript==
// @name        Simple AD Blocker
// @name:ja     シンプル広告ブロック
// @author      codho
// @description A lightweight ad blocker for Sleipnir Mobile.
// @description:ja 軽量な広告ブロッカーです。
// @include     http://*
// @include     https://*
// @exclude     about:*
// @exclude     chrome://*
// @version     4.1.0
// @require     jquery
// @require     api
// ==/UserScript==

(function () {
  'use strict';

  var _Object = Object;
  var _defineProperty = Object.defineProperty;
  var _getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
  var _setTimeout = setTimeout;
  var _clearTimeout = clearTimeout;
  var _Date_now = Date.now;
  var _Array_from = Array.from;
  var _Proxy = Proxy;
  var _Reflect = Reflect;
  var _WeakMap = WeakMap;
  var _WeakSet = WeakSet;
  var _Promise = Promise;
  var _Response = typeof Response !== 'undefined' ? Response : null;
  var _MutationObserver = typeof MutationObserver !== 'undefined' ? MutationObserver : null;
  var _nativeToString = Function.prototype.toString;
  var _origGetComputedStyle = window.getComputedStyle;

  var hostname = location.hostname;

  function matchDomain(pattern) {
    if (hostname === pattern) return true;
    if (pattern.charAt(0) === '.') {
      return hostname.indexOf(pattern) === hostname.length - pattern.length;
    }
    return hostname.indexOf('.' + pattern) === hostname.length - pattern.length - 1;
  }

  var proxiedFns = new _WeakMap();

  Function.prototype.toString = new _Proxy(Function.prototype.toString, {
    apply: function (target, thisArg) {
      var original = proxiedFns.get(thisArg);
      return _nativeToString.call(original || thisArg);
    }
  });
  proxiedFns.set(Function.prototype.toString, _nativeToString);

  function proxyFn(context, prop, handler) {
    var owner = context;
    var parts = prop.split('.');
    for (var i = 0; i < parts.length - 1; i++) {
      owner = owner[parts[i]];
      if (!(owner instanceof _Object)) return;
    }
    var name = parts[parts.length - 1];
    var fn = owner[name];
    if (typeof fn !== 'function') return;

    var proxy = new _Proxy(fn, {
      apply: function (target, thisArg, args) {
        return handler(target, thisArg, args);
      }
    });
    proxiedFns.set(proxy, fn);
    owner[name] = proxy;
  }

  var AD_DOMAINS = [
    'googlesyndication.com', 'doubleclick.net', 'googleadservices.com',
    'adservice.google.', 'pagead2.googlesyndication.com',
    'google-analytics.com/analytics', 'googletagmanager.com/gtag',
    'amazon-adsystem.com', 'aax.amazon-adsystem.com',
    'cdn.taboola.com', 'trc.taboola.com', 'api.taboola.com',
    'widgets.outbrain.com', 'outbrain.com/outbrain',
    'cdn.zergnet.com', 'cdn.mgid.com', 'jsc.mgid.com',
    'static.criteo.net', 'bidder.criteo.com', 'dis.criteo.com',
    'ad-stir.com', 'ad.i-mobile.co.jp', 'ssp.i-mobile.co.jp',
    'imp-adedge.i-mobile.co.jp',
    'nend.net', 'js1.nend.net', 'output.nend.net',
    'microad.net', 'send.microad.jp',
    'cpt.geniee.jp', 'gsp.geniee.jp',
    'adingo.jp', 'logly.co.jp', 'popin.cc',
    'popads.net', 'popunder.net',
    'exoclick.com', 'syndication.exoclick.com',
    'juicyads.com', 'juicyads.in',
    'adskeeper.com', 'adskeeper.co.uk',
    'adnxs.com', 'adcolony.com', 'admob.com',
    'moatads.com', 'serving-sys.com',
    'yads.yahoo.co.jp', 'yjtag.yahoo.co.jp',
    's.yimg.jp/images/listing',
    'ad.nicovideo.jp',
    'a8.net', 'a8cv.a8.net',
    'afi-b.com', 'affiliate-b.com',
    'accesstrade.net', 'h.accesstrade.net',
    'felmat.net',
    'track.hubspot.com',
    'connect.facebook.net/signals', 'pixel.facebook.com',
    'analytics.tiktok.com',
    'static.ads-twitter.com', 'ads-api.twitter.com',
    'highperformancecpmgate.com', 'toprevenuegate.com',
    'effectiveratecpm.com', 'profitablegatecpm.com',
    'traffdaq.com', 'clickadilla.com',
    'adglare.net', 'eacdn.com',
    'player.gliacloud.com',
    'i2ad.jp',
    'js.ssp.bance.jp', 'ssp.bance.jp',
    'rise.enhance.co.jp'
  ];

  function isAdUrl(url) {
    if (!url) return false;
    var lower = url.toLowerCase();
    for (var i = 0; i < AD_DOMAINS.length; i++) {
      if (lower.indexOf(AD_DOMAINS[i]) !== -1) return true;
    }
    return false;
  }

  proxyFn(XMLHttpRequest.prototype, 'open', function (target, thisArg, args) {
    if (isAdUrl(args[1])) {
      thisArg._sab_blocked = true;
      return;
    }
    return _Reflect.apply(target, thisArg, args);
  });

  proxyFn(XMLHttpRequest.prototype, 'send', function (target, thisArg, args) {
    if (thisArg._sab_blocked) {
      _setTimeout(function () {
        try {
          _defineProperty(thisArg, 'readyState', { value: 4, configurable: true });
          _defineProperty(thisArg, 'status', { value: 200, configurable: true });
          _defineProperty(thisArg, 'responseText', { value: '', configurable: true });
          _defineProperty(thisArg, 'response', { value: '', configurable: true });
        } catch (e) {}
        if (typeof thisArg.onreadystatechange === 'function') thisArg.onreadystatechange();
        if (typeof thisArg.onload === 'function') thisArg.onload();
        try { thisArg.dispatchEvent(new Event('load')); } catch (e) {}
        try { thisArg.dispatchEvent(new Event('loadend')); } catch (e) {}
      }, 0);
      return;
    }
    return _Reflect.apply(target, thisArg, args);
  });

  if (window.fetch && _Response) {
    proxyFn(window, 'fetch', function (target, thisArg, args) {
      var url = (typeof args[0] === 'string') ? args[0] : (args[0] && args[0].url) || '';
      if (isAdUrl(url)) {
        return _Promise.resolve(new _Response('', { status: 200, statusText: 'OK' }));
      }
      return _Reflect.apply(target, thisArg, args);
    });
  }

  var origCreateElement = document.createElement;
  var boundCreateElement = origCreateElement.bind(document);
  document.createElement = new _Proxy(origCreateElement, {
    apply: function (target, thisArg, args) {
      var el = boundCreateElement(args[0]);
      var tagLower = args[0].toLowerCase();
      if (tagLower === 'script' || tagLower === 'iframe') {
        var proto = tagLower === 'script' ? HTMLScriptElement.prototype : HTMLIFrameElement.prototype;
        var desc = _getOwnPropertyDescriptor(proto, 'src');
        if (desc && desc.set) {
          var origSet = desc.set;
          var origGet = desc.get;
          _defineProperty(el, 'src', {
            get: function () { return origGet ? origGet.call(this) : this.getAttribute('src'); },
            set: function (val) {
              if (isAdUrl(val)) return;
              if (origSet) origSet.call(this, val); else this.setAttribute('src', val);
            },
            configurable: true
          });
        }
      }
      return el;
    }
  });
  proxiedFns.set(document.createElement, origCreateElement);

  proxyFn(window, 'open', function (target, thisArg, args) {
    var url = args[0];
    if (isAdUrl(url)) {
      return new _Proxy(window, {
        get: function (t, prop) {
          if (prop === 'closed') return false;
          if (prop === 'close') return function () {};
          if (prop === 'focus') return function () {};
          if (prop === 'document') return document.implementation.createHTMLDocument('');
          var r = t[prop];
          return typeof r === 'function' ? function () {} : r;
        }
      });
    }
    return _Reflect.apply(target, thisArg, args);
  });

  var _adScriptRe = /googlesyndication|doubleclick|adsbygoogle|taboola|outbrain|nend\.net|i-mobile|microad|geniee|bance|gliacloud|i2ad\.jp/;
  proxyFn(document, 'write', function (target, thisArg, args) {
    if (args[0] && _adScriptRe.test(args[0])) return;
    return _Reflect.apply(target, thisArg, args);
  });
  proxyFn(document, 'writeln', function (target, thisArg, args) {
    if (args[0] && _adScriptRe.test(args[0])) return;
    return _Reflect.apply(target, thisArg, args);
  });

  proxyFn(window, 'eval', function (target, thisArg, args) {
    var code = String(args[0]);
    if (_adScriptRe.test(code)) return;
    return _Reflect.apply(target, thisArg, args);
  });

  function abortOnRead(chain) {
    var token = String(Math.random()).slice(2);
    var abort = function () { throw new ReferenceError(token); };
    var parts = chain.split('.');
    var owner = window;
    for (var i = 0; i < parts.length - 1; i++) {
      var p = parts[i];
      var v = owner[p];
      if (v instanceof _Object) { owner = v; continue; }
      var _v;
      var remaining = parts.slice(i + 1).join('.');
      _defineProperty(owner, p, {
        get: function () { return _v; },
        set: function (a) { _v = a; if (a instanceof _Object) abortOnRead_inner(a, remaining, abort); },
        configurable: true
      });
      return;
    }
    var last = parts[parts.length - 1];
    _defineProperty(owner, last, { get: abort, set: function () {}, configurable: true });
  }

  function abortOnRead_inner(owner, chain, abort) {
    var parts = chain.split('.');
    for (var i = 0; i < parts.length - 1; i++) {
      owner = owner[parts[i]];
      if (!(owner instanceof _Object)) return;
    }
    _defineProperty(owner, parts[parts.length - 1], { get: abort, set: function () {}, configurable: true });
  }

  function setConstant(chain, value) {
    var parts = chain.split('.');
    var owner = window;
    for (var i = 0; i < parts.length - 1; i++) {
      var p = parts[i];
      if (!(p in owner)) owner[p] = {};
      owner = owner[p];
    }
    _defineProperty(owner, parts[parts.length - 1], {
      get: function () { return value; },
      set: function () {},
      configurable: true
    });
  }

  try { abortOnRead('adBlockDetected'); } catch (e) {}
  try { abortOnRead('google_ad_status'); } catch (e) {}
  try { abortOnRead('__ads'); } catch (e) {}
  try { abortOnRead('blockAdBlock'); } catch (e) {}
  try { abortOnRead('sniffAdBlock'); } catch (e) {}
  try { abortOnRead('fuckAdBlock'); } catch (e) {}
  try { abortOnRead('isAdBlockActive'); } catch (e) {}
  try { setConstant('adBlockEnabled', false); } catch (e) {}
  try { setConstant('ads_blocked', false); } catch (e) {}
  try { setConstant('adblock', false); } catch (e) {}
  try { setConstant('isAdsBlocked', false); } catch (e) {}

  proxyFn(JSON, 'parse', function (target, thisArg, args) {
    var obj = _Reflect.apply(target, thisArg, args);
    if (obj && typeof obj === 'object') {
      var adKeys = ['ads', 'ad', 'adPlacements', 'playerAds', 'adSlots',
                    'sponsoredItems', 'promotedContent', 'adConfig'];
      for (var i = 0; i < adKeys.length; i++) {
        if (adKeys[i] in obj) {
          try { delete obj[adKeys[i]]; } catch (e) {}
        }
      }
    }
    return obj;
  });

  var baitClasses = /\b(adsbox|ad-placement|ad-banner|textads|banner-ads|adsbygoogle|pub_300x250)\b/;

  proxyFn(window, 'getComputedStyle', function (target, thisArg, args) {
    var style = _Reflect.apply(target, thisArg, args);
    var el = args[0];
    if (el && el.className && typeof el.className === 'string' && baitClasses.test(el.className)) {
      return new _Proxy(style, {
        get: function (t, prop) {
          if (prop === 'display') return 'block';
          if (prop === 'visibility') return 'visible';
          if (prop === 'height') return '1px';
          if (prop === 'getPropertyValue') {
            return function (p) {
              if (p === 'display') return 'block';
              if (p === 'visibility') return 'visible';
              return t.getPropertyValue(p);
            };
          }
          var val = t[prop];
          return typeof val === 'function' ? val.bind(t) : val;
        }
      });
    }
    return style;
  });

  proxyFn(Element.prototype, 'getBoundingClientRect', function (target, thisArg, args) {
    var rect = _Reflect.apply(target, thisArg, args);
    if (thisArg.className && typeof thisArg.className === 'string' && baitClasses.test(thisArg.className)) {
      return typeof DOMRect !== 'undefined'
        ? new DOMRect(rect.x, rect.y, 1, 1)
        : { x: rect.x, y: rect.y, width: 1, height: 1, top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left };
    }
    return rect;
  });

  function bustOverlay() {
    var vw = Math.min(document.documentElement.clientWidth, window.innerWidth);
    var vh = Math.min(document.documentElement.clientHeight, window.innerHeight);
    var tol = Math.min(vw, vh) * 0.05;
    var el = document.elementFromPoint(vw / 2, vh / 2);
    var removed = false;
    while (el && el !== document.body && el !== document.documentElement) {
      var style = _origGetComputedStyle.call(window, el);
      var z = parseInt(style.zIndex, 10);
      if ((z >= 1000 || style.position === 'fixed') && style.display !== 'none') {
        var r = el.getBoundingClientRect();
        if (r.left <= tol && r.top <= tol && (vw - r.right) <= tol && (vh - r.bottom) <= tol) {
          el.parentNode.removeChild(el);
          document.body.style.setProperty('overflow', 'auto', 'important');
          document.documentElement.style.setProperty('overflow', 'auto', 'important');
          removed = true;
          el = document.elementFromPoint(vw / 2, vh / 2);
          continue;
        }
      }
      el = el.parentElement;
    }
    return removed;
  }

  function removeTrackingCookies() {
    var trackingPatterns = /^(_ga|_gid|_gat|__utm|_fbp|_fbc|fr|datr|sb|IDE|DSID|MUID|_uetsid|ANONCHK|NID|1P_JAR|__gads)/;
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var pos = cookies[i].indexOf('=');
      if (pos === -1) continue;
      var name = cookies[i].substring(0, pos).trim();
      if (trackingPatterns.test(name)) {
        var expire = '=; Max-Age=-1; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = name + expire + '; path=/';
        document.cookie = name + expire + '; path=/; domain=.' + hostname;
      }
    }
  }

  var CSS_RULES = [
    'ins.adsbygoogle', '.adsbygoogle',
    '[id^="google_ads_"]', '[id^="google_ads_iframe"]',
    '[name^="google_ads_iframe"]',
    'iframe[src*="googlesyndication.com"]', 'iframe[src*="doubleclick.net"]',
    '.google-auto-placed', '.google-ad', '.GoogleActiveViewElement',
    '[id^="div-gpt-ad"]', '[id^="div-gpt-"]',
    'ins[id^="gpt_unit_/"]', '[id^="gpt_ad_"]', '[id^="google_dfp_"]',
    'div[id^="dfp-ad-"]', '[data-id^="div-gpt-ad"]', 'gpt-ad',

    'amp-ad', 'amp-ad-custom', 'amp-embed[type="taboola"]',
    'amp-fx-flying-carpet', 'amp-connatix-player',

    'ad-slot', 'AD-SLOT', 'ad-shield-ads',
    'display-ad-component', 'display-ads',
    'atf-ad-slot', 'broadstreet-zone-container',

    '.taboola', '.taboola-widget', '.taboola-container',
    '.taboola_container', '.taboola-ad', '.taboolaads',
    '.taboola-wrapper', '.taboola-placeholder', '.taboola-block', '.tbl-feed',
    'div[id^="taboola-"]', '[data-taboola-options]', '[data-testid^="taboola-"]',

    '.outbrain', '.Outbrain', '.OUTBRAIN',
    '.outbrain-widget', '.outbrainWidget', '.outbrain-wrapper', '.ob-widget',
    'div[data-widget-id^="outbrain"]',

    '.zergnet', '.ZERGNET', '.zergnet-widget', 'div[id^="zergnet-widget"]',
    'div[id^="crt-"]',
    '._popIn_recommend_article_ad', '._popIn_recommend_ad_section_articles',
    '.mgid_3x2', '.mgid-wrapper',

    '#ad', '#ads', '#AD',
    '#ad-area', '#ad-banner', '#ad-box', '#ad-container',
    '#ad-frame', '#ad-header', '#ad-footer', '#ad-slot',
    '#adArea', '#adBottom', '#adBox', '#adContainer',
    '#adFrame', '#adHeader', '#adHolder', '#adLayer',
    '#adLeaderboard', '#adMPU', '#adOverlay', '#adRight',
    '#adSidebar', '#adSkyscraper', '#adSlot', '#adSpace',
    '#adSpot', '#adTop', '#adUnit', '#adWrapper',
    '#adBanner', '#adBlock', '#adContent', '#adDiv',
    '#ad_banner', '#ad_block', '#ad_box', '#ad_container',
    '#ad_content', '#ad_footer', '#ad_frame', '#ad_header',
    '#ad_holder', '#ad_label', '#ad_layer', '#ad_leader',
    '#ad_leaderboard', '#ad_main', '#ad_mpu', '#ad_overlay',
    '#ad_panel', '#ad_placeholder', '#ad_popup', '#ad_rect',
    '#ad_rectangle', '#ad_sidebar', '#ad_sky', '#ad_skyscraper',
    '#ad_slot', '#ad_space', '#ad_sponsor', '#ad_spot',
    '#ad_square', '#ad_sticky', '#ad_strip', '#ad_top',
    '#ad_tower', '#ad_unit', '#ad_wallpaper', '#ad_wide',
    '#ad_widget', '#ad_wrapper', '#ad_zone',
    '#ads-banner', '#ads-container', '#ads-footer',
    '#ads-header', '#ads-right', '#ads-sidebar', '#ads-top',
    '#adsense', '#adsense_top', '#adspace', '#adspot',
    '#advertisement', '#advertising',
    '#adexchange', '#adoverlay', '#adbanners',
    '#float-bnr', '#fix-bottom-AD',
    '#listingPr', '#listingPr2', '#boxPR300',
    '#PR-area', '#pr_area', '#prBox',
    '#googleAD', '#topAD', '#footerAD', '#upliftsquare',

    '.ads', '.Ads', '.ADS',
    '.ad-area', '.ad-banner', '.ad-block', '.ad-body', '.ad-box',
    '.ad-container', '.ad-footer', '.ad-frame', '.ad-header',
    '.ad-holder', '.ad-label', '.ad-placement', '.ad-slot',
    '.ad-space', '.ad-text', '.ad-title', '.ad-unit',
    '.ad-wrap', '.ad-wrapper', '.ad-bnr',
    '.adArea', '.adBottom', '.adBox', '.adFrame',
    '.adSlot', '.adSpace', '.adText', '.adTop', '.adUnit', '.adWrap',
    '.ads-container', '.ads-div', '.ads-footer',
    '.ads-sidebar', '.ads-square', '.adsbox',
    '.advertisement', '.advertise', '.advertising',
    '.native-ad', '.native_ad', '.native_ads', '.nativead', '.nativeAd',
    '.native-ad-container', '.native-ad-item',

    '.adhesion:not(body)', '.adhesion-block', '.adhesive_holder',
    '.adhesiveAdWrapper', '.anchor-ad', '.anchorAd',
    '.bottom_sticky_ad', '.fixed_ad', '.fixed_adslot',
    '.fixed_advert_banner', '.fixed-ad-bottom', '.fixed-ads',
    '.floatad', '.floatads', '.fly-ad',
    '.interstitial-ad', '.modal-ad',
    '.overlay_ad', '.overlay-ad', '.overlay-ad-container',
    '.slide_ad', '.slidead', '.slideAd',
    '.sticky_ad_sidebar', '.sticky_ad_wrapper', '.sticky_ads',
    '.stickyad', '.sticky-ad', '.stickyAd',
    '.sticky-ad-bottom', '.sticky-ad-container',
    '.sticky-ad-footer', '.sticky-ad-header',
    '.stickyads', '.sticky-ads', '.sticky-ads-container',
    '.stickyAdsGroup', '.stickyadv', '.sticky-advert-widget',
    '.sticky-ad-wrapper', '.stickyAdWrapper',
    '.floating-ad', '.fixed-banner',
    '.Sticky-AdContainer', '.StickyAdRail__Inner',

    '.sponsor_ad', '.sponsorad', '.sponsorAd', '.sponsorads',
    '.sponsor-ads', '.sponsored_ad', '.sponsored_ads',
    '.sponsored_link', '.sponsored_links', '.sponsored_post',
    '.sponsored-ad', '.sponsoredAd', '.sponsored-ads',
    '.sponsoredAds', '.sponsored-article', '.sponsoredContent',
    '.sponsoredLink', '.sponsored-links', '.sponsoredLinks',
    '.SponsoredContent', '.SponsoredLinks',
    '.sponsoredResults', '.sponsored-results', '.sponsored_result',
    '.content_ad', '.contentad', '.content-ad', '.contentAd',
    '.content-ad-container', '.content-ads', '.contentAds',
    '.revcontent-wrap', '.sponsored', '.sponsor_link',

    '.ad-rectangle-banner', '.ad-banner-top', '.ad-banner-bottom',
    '.bnrBb', '.bnSuper',
    'div[class*="ad"] .banner', 'aside .banner',

    '.pub_300x250', '.pub_300x250m', '.pub_728x90',
    '.ads300x250', '.ad_300x250', '.ad_320x100',

    '[data-ad-cls]', '[data-ad-manager-id]', '[data-ad-module]',
    '[data-ad-name]', '[data-ad-width]', '[data-asg-ins]',
    '[data-block-type="ad"]', '[data-dynamic-ads]',
    '[data-ez-name]', '[data-freestar-ad][id]',
    '[data-identity="adhesive-ad"]', '[data-rc-widget]',
    '[data-revive-zoneid]', '[data-template-type="nativead"]',
    '[data-type="ad-vertical"]', '[data-wpas-zoneid]',
    '[data-adname]', '[data-ad-placeholder]',
    '[data-ad-region]', '[data-ad-targeting]',
    '[data-adunit]', '[data-adunit-path]',
    '[data-ad-wrapper]', '[data-adzone]',
    '[data-contentexchange-widget]', '[data-dfp-id]',
    '[data-component="ad"]', '[data-nend]', '[data-imad]',
    '[class^="adDisplay-module"]', '[class^="amp-ad-"]',

    'div[aria-label="Ads"]', 'div[aria-label="広告"]',
    'div[class$="-adlabel"]',
    'div[id*="MarketGid"]', 'div[id*="ScriptRoot"]',
    'div[id^="ad_position_"]', 'div[id^="ad-div-"]',
    'div[id^="adngin-"]', 'div[id^="adrotate_widgets-"]',
    'div[id^="adspot-"]', 'div[id^="ezoic-pub-ad-"]',
    'div[id^="lazyad-"]', 'div[id^="optidigital-adslot"]',
    'div[id^="rc-widget-"]', 'div[id^="sticky_ad_"]',
    'div[id^="vuukle-ad-"]',
    'aside[id^="adrotate_widgets-"]',
    'span[data-ez-ph-id]', 'span[id^="ezoic-pub-ad-placeholder-"]',

    '.nend_wrapper', '[id^="nend_adspace"]',
    '[id^="imobile_"]', '.i-mobile-ad', 'div[id^="im-"]',
    '[id^="microad"]', '.microad-ad', '[id^="microadcompass-"]',
    '[id^="geniee"]', '[id^="gmossp_ad_"]', '.gmossp_ad_frame',
    '#gmo_bb_recommend', 'div[id^="ad_area_"]',
    'citrus-ad-wrapper', 'ps-connatix-module',
    'hl-adsense', 'a-ad', 'zeus-ad', 'div[ow-ad-unit-wrapper]',

    'iframe[width="300"][height="250"]', 'iframe[width="728"][height="90"]',
    'iframe[width="320"][height="50"]', 'iframe[width="320"][height="100"]',

    '#adBlockOverlay', '.adblock-popup', '#disable-ads-container', '._ap_adrecover_ad',

    '.adsbygoogle2', '.adsbygoogle-box', '.adsbygoogle-noablate', '.adsbygoogle-wrapper',
    '.adSense', '.Adsense', '.AdSense',
    '.adsense_ad', '.adsense_block', '.adsense_container',
    '.adsense_wrapper', '.adsense-ads', '.adsenseAds',
    '.adsense_mpu', '.adsense_rectangle',

    '.ai_widget', '.ai-sticky-widget',
    'div[data-ai]', 'span[data-ai-block]',
    'div[class*="code-block"]',

    'div[id^="bnc_ad_"]',

    '.gliaplayer-container',

    '.spot', '.spot--left', '.spot--right', '.spot--top', '.spot--bottom',

    '.sidebar-fix-ad',

    'a[href^="https://paid.outbrain.com/network/redir?"]',
    'a[href^="https://ad.doubleclick.net/"]',
    'a[href^="https://adclick.g.doubleclick.net/"]',
    'a[href^="https://pubads.g.doubleclick.net/"]',
    'a[href^="https://syndication.exoclick.com/"]',
    'a[href^="https://www.googleadservices.com/pagead/aclk?"]',
    'a[href*="&maxads="]', 'a[href*=".adsrv.eacdn.com/"]',
    'a[href*=".engine.adglare.net/"]',
    'a[href^="https://www.adskeeper.com"]', 'a[href^="https://clickadilla.com/"]',
    'a[href^="https://www.highperformancecpmgate.com/"]',
    'a[href^="https://www.toprevenuegate.com/"]',
    'a[href^="https://traffdaq.com/"]',
    'a[onmousedown*="paid.outbrain.com"]',
    'img[src^="https://s-img.adskeeper.com/"]',

    'img[src*="googlesyndication.com"][width="1"]',
    'img[src*="doubleclick.net"][width="1"]',
    'img[src*="facebook.com/tr"][width="1"]',
    'img[src*="analytics"][width="1"][height="1"]',
    'img[src*="tracker"][width="1"][height="1"]',
    'img[src*="beacon"][width="1"][height="1"]',
    'img[src*="pixel."][width="1"][height="1"]'
  ].join(',');

  var SITE_RULES = {
    'hero-news.com': [
      '.sidebar-fix-ad',
      '.gliaplayer-container',
      'div[id^="im-"]',
      '#im-547311993fa044a9a3bc4fbfde00a156',
      'ins.adsbygoogle[data-ad-slot="4212212449"]',
      'ins.adsbygoogle[data-ad-slot="9550237407"]',
      'div[data-slot="imobile_heronews_desktop"]',
      'div[data-slot="imobile_heronews_mobile"]',
      '.ulp-form'
    ],
    'apexlegends-leaksnews.com': [
      'div[class*="code-block"]',
      '.ai_widget', '.ai-sticky-widget',
      '.ai-fallback-adsense', '.ai-fallback',
      'div[data-ai]', 'span[data-ai-block]',
      'div[id^="bnc_ad_"]',
      '#bnc_ad_17441',
      '.spot', '.spot--left', '.spot--right', '.spot--top', '.spot--bottom',
      '#fix_sidebar .ai_widget', '#ai_widget-2',
      'div[id^="imobile_adspot_"]'
    ],
    'yahoo.co.jp': [
      'div[class^="yjads"]', 'div[id^="yads"]', 'iframe[id$="_ad_frame"]',
      '.KaimonoBackground',
      '#msthdShpPr', '#msthdUhd', '#mhd_uhd_pc', '#msthdtp',
      '#windowShade', '#rma-pdv', '#pickupservice',
      '#Peron', '#brandpanel', '#PopHead', '#TopLink',
      '#TBP', '#TCBX', '#CenterBanner', '#commercebox',
      '#bpComposite', '#GoToBanner',
      '#js-ninjyo', '#js-Commerce', '#Service', '#Shopping',
      '.sw-AdSection', '#yfa_psp_wrap', '#lrec', '.adWrap'
    ],
    'search.yahoo.co.jp': ['#So1', '#So2', '.sw-AdSection', '#yfa_psp_wrap'],
    'news.yahoo.co.jp': ['#lrec', '.adWrap', 'div[id^="spocon"]'],
    'finance.yahoo.co.jp': ['div[id^="ad_"]', '#promo', '#top_promo', '#pr_main1', '#pr_main2', 'p.cafxBanner'],
    'auctions.yahoo.co.jp': ['#So1', '#So2', '.acMdAdPr', 'div[class^="Promotion-sc"]'],
    'weather.yahoo.co.jp': ['.ad-frame-fix', '#ad-lrec', '#ad-ysp', '#ad-ct'],
    'nicovideo.jp': [
      '.CommentPanelBannerAd', '.AnimatorContainer',
      'div[class$="AdContainer"]', 'div[data-ads-header-banner]',
      '#head_ads', '#web_pc_prime', '.billboard-ad', '.kokoku',
      '#header-ad', '#middle-ad', '#footer-ad', '.ad-bannar-maincolumn-top'
    ],
    'live.nicovideo.jp': [
      'aside[class^="___billboard-ad"]', 'aside[class^="___ad-billboard"]',
      'aside[class^="___ad-banner"]', 'div[class^="___player-ad-panel___"]'
    ],
    'live2.nicovideo.jp': ['aside[class^="___banner-panel"]', 'aside[class^="___billboard-ad___"]', 'aside[class^="___billboard-banner___"]'],
    'news.nicovideo.jp': ['#billboard_container', '.ad-container'],
    'dic.nicovideo.jp': ['.ad-bannar-maincolumn-top', 'div[id^="crt-"]'],
    '5ch.net': ['.ADVERTISE_AREA', 'div[id^="horizontalbanners"]', '.ad--bottom', '.ads_conten_main', '.adbanners', '.sproutad_frame-description'],
    'bbspink.com': ['.sidemenu_banner', '.ticker', 'div[class^="banner_area_"]', '#bbspink-bottom-ads', '#top_banner', '.js--ad--bottom', '#float-bnr', '.bbspink-top-ads', '.ad_subb', '.ad_subb_ft'],
    'ameblo.jp': ['.subAdBannerHeader', '.subAdBannerArea', 'div[data-slot="injected"]', 'div[amb-component="entryAd"]', '.bfl-snews__outer', '.skin-entryAd'],
    'fc2.com': ['#fc2_bottom_bnr', '#fc2_ad_box'],
    'hatena.ne.jp': ['#pc-billboard-ad', '.sleeping-ads', '.page-odai-ad'],
    'hatenablog.com': ['#pc-billboard-ad', '.sleeping-ads'],
    'pixiv.net': ['.ad-footer', '.ads_area_no_margin', '.multi-ads-area'],
    'dic.pixiv.net': ['.d_header'],
    'kakaku.com': ['.fixedRightAdContainer', '.s-jack_img', '.sqTwo', '.c-ad'],
    'weblio.jp': ['.flex-rectangle-ads-frame', '.premium-service-button'],
    'goo.ne.jp': ['.businessanswer', '#gooad-long', '.pr-unit', '.NR-pr', '.NR-ad'],
    'tenki.jp': ['.tenki-ad-pd', '.tenki-ad-pc-ct', '#tenki-ad-3rd_PD'],
    'abema.tv': ['#videoAdContainer', '.theoplayer-ad-nonlinear', '.com-tv-top-CommercialBannerCarousel'],
    'youtube.com': ['.video-ads', '.ytp-ad-progress-list', '#player-ads', '#masthead-ad', 'ytd-promoted-sparkles-web-renderer', 'ytd-carousel-ad-renderer', 'ytd-display-ad-renderer', 'ytd-ad-slot-renderer', '.ytd-search-pyv-renderer', '.pyv-afc-ads-container', '.iv-promo'],
    'wikiwiki.jp': ['#inbound-ad-container'],
    'atwiki.jp': ['.atwiki-ads-margin'],
    'kotobank.jp': ['.pc-iframe-ad', '.pc-word-ad', '.header-ad'],
    'google.co.jp': ['#tads[aria-label="広告"]', '#bottomads', '.commercial-unit-desktop-rhs', '.commercial-unit-desktop-top'],
    'livedoor.com': ['.ad-wrapper', 'div.adsW'],
    'news.livedoor.com': ['.mainSec .adsW', '.ad-wrapper'],
    'excite.co.jp': ['.yadsOverlay', '.ex-crt-wrapper', '#pageFeatures'],
    'tabelog.com': ['div[class^="ad-min-size-"]', '.rstdtl-cmad--middle'],
    'nifty.com': ['#float-bnr'],
    '4gamer.net': ['.ad_top', '.ad_container', '.banner_left_4g', '.satellite_banner'],
    'jbbs.shitaraba.net': ['iframe[id^="ox_"]', '.ad-320_50', '#recommend_ad'],
    'rakuten.co.jp': ['#ad'],
    'travel.rakuten.co.jp': ['#ad']
  };

  var AFFILIATE_CSS = [
    'a[href*="a8.net"]', 'a[href*="a8.to"]', 'img[src*="a8.net"]',
    'a[href*="valuecommerce.com"]', 'a[href*="vc-clicks.com"]', 'img[src*="valuecommerce.com"]',
    'a[href*="accesstrade.net"]', 'img[src*="accesstrade.net"]',
    'a[href*="moshimo.com"]', 'img[src*="moshimo.com"]',
    'a[href*="affiliate-b.com"]', 'a[href*="afi-b.com"]',
    'a[href*="felmat.net"]',
    'a[href^="https://hb.afl.rakuten.co.jp"]', 'img[src*="thumbnail.image.rakuten.co.jp"]',
    'a[href^="https://ac.ebis.ne.jp"]',
    'a[href*="amazon-adsystem.com"]', 'a[href*="click.ad-stir.com"]'
  ].join(',');

  var hideDecl = ' { display: none !important; }';

  SLEX_addStyle(CSS_RULES + hideDecl);
  SLEX_addStyle(AFFILIATE_CSS + hideDecl);

  var domain;
  for (domain in SITE_RULES) {
    if (SITE_RULES.hasOwnProperty(domain) && matchDomain(domain)) {
      SLEX_addStyle(SITE_RULES[domain].join(',') + hideDecl);
    }
  }

  SLEX_addStyle([
    'div[style*="width:300px"][style*="height:250px"]',
    'div[style*="width: 300px"][style*="height: 250px"]',
    'div[style*="width:300px"][style*="height:600px"]',
    'div[style*="width:728px"][style*="height:90px"]',
    'div[style*="width:320px"][style*="height:50px"]',
    'div[style*="width:320px"][style*="height:100px"]'
  ].join(',') + hideDecl);

  SLEX_addStyle(
    'div.adsbox[style*="left:-9999px"],' +
    'div.ad-placement[style*="left:-9999px"],' +
    'div.adsbygoogle[style*="left:-9999px"]' +
    ' { display: block !important; height: 1px !important; }'
  );

  var REMOVE_SELECTORS = [
    'iframe[src*="googlesyndication.com"]', 'iframe[src*="doubleclick.net"]',
    'iframe[src*="amazon-adsystem.com"]', 'iframe[src*="ad.yieldmanager.com"]',
    'iframe[src*="ad-stir.com"]', 'iframe[src*="i-mobile.co.jp"]',
    'iframe[src*="microad.net"]', 'iframe[src*="nend.net"]',
    'iframe[src*="geniee"]', 'iframe[src*="media5.fc2.com"]',
    'iframe[src*="criteo.net"]', 'iframe[src*="criteo.com"]',
    'iframe[src*="taboola.com"]', 'iframe[src*="outbrain.com"]',
    'iframe[src*="adingo.jp"]', 'iframe[src*="popin.cc"]',
    'iframe[src*="popads.net"]', 'iframe[src*="mgid.com"]',
    'iframe[src*="zergnet.com"]', 'iframe[src*="exoclick.com"]',
    'iframe[src*="juicyads"]', 'iframe[src*="adskeeper.com"]',
    'iframe[src*="gliacloud.com"]', 'iframe[src*="bance.jp"]',
    'iframe[src*="i2ad.jp"]',
    'div[id^="div-gpt-ad"]:empty', 'div[id^="ezoic-pub-ad-"]:empty'
  ].join(', ');

  var PR_TEXT_RE = /^\s*(\[PR\]|【PR】|PR|広告|スポンサーリンク|Sponsored|Advertisement)\s*$/i;

  function removeAdIframes() { $(REMOVE_SELECTORS).remove(); }

  function cleanPRLabels() {
    $('span, label, small').each(function () {
      var text = $.trim($(this).text());
      if (!text || text.length > 20) return;
      if (PR_TEXT_RE.test(text)) {
        var $p = $(this).closest('article, li, [class*="ad"], [class*="sponsor"], [class*="pr-"]');
        if ($p.length && $p[0].tagName !== 'BODY') $p.css('display', 'none');
      }
    });
  }

  var decoyCreated = false;
  function createDecoys() {
    if (decoyCreated || !document.body) return;
    decoyCreated = true;
    var classes = ['adsbox', 'ad-placement ad-banner textads banner-ads', 'adsbygoogle'];
    for (var i = 0; i < classes.length; i++) {
      var d = boundCreateElement('div');
      d.className = classes[i];
      d.innerHTML = '&nbsp;';
      d.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;';
      document.body.appendChild(d);
    }
  }

  var debounceTimer = null;

  function onDomChanged() {
    _clearTimeout(debounceTimer);
    debounceTimer = _setTimeout(function () {
      removeAdIframes();
    }, 200);
  }

  if (_MutationObserver) {
    var target = document.body || document.documentElement;
    if (target) {
      new _MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var nodes = mutations[i].addedNodes;
          for (var j = 0; j < nodes.length; j++) {
            var node = nodes[j];
            if (node.nodeType !== 1) continue;
            var tag = node.tagName;
            if (tag === 'IFRAME') {
              var src = node.src || node.getAttribute('src') || '';
              if (isAdUrl(src)) { node.src = 'about:blank'; node.style.display = 'none'; }
            } else if (tag === 'SCRIPT') {
              var ssrc = node.src || node.getAttribute('src') || '';
              if (isAdUrl(ssrc)) {
                node.type = 'text/blocked'; node.removeAttribute('src');
                try { node.parentNode.removeChild(node); } catch (e) {}
              }
            } else if (tag === 'INS' && node.className && String(node.className).indexOf('adsbygoogle') !== -1) {
              node.style.display = 'none';
            }
          }
          if (nodes.length > 0) { onDomChanged(); return; }
        }
      }).observe(target, { childList: true, subtree: true });
    }
  }

  var CACHE_KEY = '_sab_f';
  var CACHE_TS_KEY = '_sab_t';
  var CACHE_TTL = 6 * 60 * 60 * 1000;

  function loadExternalFilters() {
    var now = _Date_now();
    try {
      var cached = sessionStorage.getItem(CACHE_KEY);
      var ts = parseInt(sessionStorage.getItem(CACHE_TS_KEY), 10);
      if (cached && ts && (now - ts) < CACHE_TTL) {
        SLEX_addStyle(cached + hideDecl);
        return;
      }
    } catch (e) {}

    try {
      var resp = SLEX_httpGet('https://easylist.to/easylist/easylist.txt');
      if (resp) {
        var sels = [];
        var lines = resp.split('\n');
        for (var i = 0; i < lines.length; i++) {
          var l = lines[i];
          if (l.indexOf('#@#') !== -1) continue;
          var sepIdx = l.indexOf('##');
          if (sepIdx === -1) continue;
          var domainPart = l.substring(0, sepIdx);
          if (domainPart && domainPart.indexOf(hostname) === -1) continue;
          var s = l.substring(sepIdx + 2).trim();
          if (s && s.indexOf(':') === -1 && s.indexOf('{') === -1 && s.length < 200) {
            sels.push(s);
          }
        }
        if (sels.length > 0) {
          var css = sels.slice(0, 3000).join(',');
          try {
            sessionStorage.setItem(CACHE_KEY, css);
            sessionStorage.setItem(CACHE_TS_KEY, String(now));
          } catch (e) {}
          SLEX_addStyle(css + hideDecl);
        }
      }
    } catch (e) {}
  }

  removeAdIframes();
  createDecoys();
  removeTrackingCookies();

  _setTimeout(function () {
    removeAdIframes();
    cleanPRLabels();
    bustOverlay();
    createDecoys();
  }, 1500);

  _setTimeout(function () {
    removeAdIframes();
    cleanPRLabels();
    removeTrackingCookies();
  }, 5000);

  _setTimeout(loadExternalFilters, 2000);

  console.log('[Simple AD Blocker] loaded');

})();
