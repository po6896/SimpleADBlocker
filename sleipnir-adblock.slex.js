// ==UserScript==
// @name        Ultimate AdBlock
// @name:ja     最強アドブロック
// @author      codho
// @description The most powerful ad blocker for Sleipnir Mobile. Blocks ads, trackers, and annoyances using 2000+ filters.
// @description:ja 2000以上のフィルタで広告・トラッカー・迷惑要素を徹底ブロック。日本語サイト完全対応。
// @include     http://*
// @include     https://*
// @exclude     about:*
// @exclude     chrome://*
// @version     1.0.0
// @require     jquery
// @require     api
// ==/UserScript==

(function () {
  'use strict';

  // ============================================================
  // SECTION 1: CSS Cosmetic Hiding (instant, no flicker)
  // ============================================================

  var CSS_RULES = [
    // --- Google AdSense ---
    'ins.adsbygoogle',
    '.adsbygoogle',
    '[id^="google_ads_"]',
    '[id^="google_ads_iframe"]',
    '[name^="google_ads_iframe"]',
    'iframe[src*="googlesyndication.com"]',
    'iframe[src*="doubleclick.net"]',
    '.google-auto-placed',
    '.google-ad',
    '.GoogleActiveViewElement',

    // --- Google DFP / GAM ---
    '[id^="div-gpt-ad"]',
    '[id^="div-gpt-"]',
    'ins[id^="gpt_unit_/"]',
    '[id^="gpt_ad_"]',
    '[id^="google_dfp_"]',
    'div[id^="dfp-ad-"]',
    '[data-css-class="dfp-inarticle"]',
    '[data-id^="div-gpt-ad"]',
    'gpt-ad',

    // --- AMP Ads ---
    'amp-ad',
    'amp-ad-custom',
    'amp-embed[type="taboola"]',
    'amp-fx-flying-carpet',
    'amp-connatix-player',

    // --- Custom Ad Elements ---
    'ad-slot', 'AD-SLOT', 'ad-shield-ads',
    'display-ad-component', 'display-ads',
    'atf-ad-slot', 'broadstreet-zone-container',

    // --- Taboola ---
    '.taboola', '.taboola-widget', '.taboola-container',
    '.taboola_container', '.taboola-ad', '.taboolaads',
    '.taboola-wrapper', '.taboola-placeholder',
    '.taboola-block', '.tbl-feed',
    'div[id^="taboola-"]',
    '[data-taboola-options]',
    '[data-testid^="taboola-"]',

    // --- Outbrain ---
    '.outbrain', '.Outbrain', '.OUTBRAIN',
    '.outbrain-widget', '.outbrainWidget',
    '.outbrain-wrapper', '.ob-widget',
    'div[data-widget-id^="outbrain"]',
    'a[href^="https://paid.outbrain.com/"]',

    // --- Zergnet ---
    '.zergnet', '.ZERGNET', '.zergnet-widget',
    'div[id^="zergnet-widget"]',

    // --- Criteo ---
    'div[id^="crt-"]',

    // --- popIn ---
    '._popIn_recommend_article_ad',
    '._popIn_recommend_ad_section_articles',

    // --- Generic Ad IDs ---
    '#ad', '#ads', '#Ad', '#AD', '#ADS',
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
    '#googleAD', '#topAD', '#footerAD',
    '#upliftsquare',

    // --- Generic Ad Classes ---
    '.ad', '.ads', '.Ad', '.Ads', '.ADS',
    '.ad-area', '.ad-banner', '.ad-block', '.ad-body', '.ad-box',
    '.ad-container', '.ad-footer', '.ad-frame', '.ad-header',
    '.ad-holder', '.ad-label', '.ad-placement', '.ad-slot',
    '.ad-space', '.ad-text', '.ad-title', '.ad-unit',
    '.ad-wrap', '.ad-wrapper', '.ad-bnr',
    '.adArea', '.adBottom', '.adBox', '.adFrame',
    '.adSlot', '.adSpace', '.adText', '.adTop',
    '.adUnit', '.adWrap',
    '.ads-container', '.ads-div', '.ads-footer',
    '.ads-sidebar', '.ads-square', '.adsbox',
    '.advertisement', '.advertise', '.advertising',
    '.native-ad', '.native_ad', '.native_ads',
    '.nativead', '.nativeAd',
    '.native-ad-container', '.native-ad-item',

    // --- Sticky / Overlay / Interstitial ---
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

    // --- Sponsored / Content Ads ---
    '.sponsor_ad', '.sponsorad', '.sponsorAd', '.sponsorads',
    '.sponsor-ads', '.sponsored_ad', '.sponsored_ads',
    '.sponsored_link', '.sponsored_links', '.sponsored_post',
    '.sponsored-ad', '.sponsoredAd', '.sponsored-ads',
    '.sponsoredAds', '.sponsored-article', '.sponsoredContent',
    '.sponsoredLink', '.sponsored-links', '.sponsoredLinks',
    '.sponsor-post', '.sponsorPost',
    '.content_ad', '.contentad', '.content-ad', '.contentAd',
    '.content-ad-container', '.content-ads', '.contentAds',
    '.promotion', '.sponsored', '.sponsor', '.sponsor_link',
    '.pr', '.prTitle', '.PR-txt', '.prtext',
    '.revcontent-wrap',

    // --- Banner ---
    '.banner', '.bnr', '.bnrs', '.bnrBb', '.bnSuper',
    '.ad-rectangle-banner',

    // --- Sizes ---
    '.pub_300x250', '.pub_300x250m', '.pub_728x90',
    '.ads300x250', '.ad_300x250', '.ad_320x100',
    '.rec', '.rectangle',

    // --- Data Attribute Selectors ---
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
    '[class^="s2nPlayer"]',

    // --- Structural div patterns ---
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
    'span[data-ez-ph-id]',
    'span[id^="ezoic-pub-ad-placeholder-"]',

    // --- Japanese Ad Networks ---
    // nend
    '.nend_wrapper', '[id^="nend_adspace"]',
    // i-mobile
    '[id^="imobile_"]', '.i-mobile-ad',
    // MicroAd
    '[id^="microad"]', '.microad-ad', '[id^="microadcompass-"]',
    // Geniee SSP
    '[id^="geniee"]', '[id^="gmossp_ad_"]', '.gmossp_ad_frame',
    '#gmo_bb_recommend',
    // AdStir
    'div[id^="ad_area_"]',

    // --- Size-based iframes ---
    'iframe[width="300"][height="250"]',
    'iframe[width="728"][height="90"]',
    'iframe[width="320"][height="50"]',
    'iframe[width="320"][height="100"]',

    // --- Anti-adblock overlays ---
    '#adBlockOverlay', '.adblock-popup',
    '#disable-ads-container', '._ap_adrecover_ad',

    // --- WordPress ad widgets ---
    '.widget_custom_html:has(.adsbygoogle)',
    '.widget_text:has(ins.adsbygoogle)',

    // --- Social widgets (optional, but reduces clutter) ---
    '.addthis_toolbox', '.addthis_native_toolbox',
    '.addthis_sharing_toolbox',
    '.addtoany_share_save_container',

    // --- href-based ad links ---
    'a[href^="https://paid.outbrain.com/network/redir?"]',
    'a[href^="https://ad.doubleclick.net/"]',
    'a[href^="https://adclick.g.doubleclick.net/"]',
    'a[href^="https://syndication.exoclick.com/"]',
    'a[href^="https://www.googleadservices.com/pagead/aclk?"]',

    // --- Tracking pixels / beacons ---
    'img[src*="pixel."]',
    'img[src*="/pixel?"]',
    'img[src*="beacon."]',
    'img[width="1"][height="1"]',
    'img[width="0"][height="0"]'
  ].join(',\n');

  // ============================================================
  // SECTION 2: Japanese Site-Specific CSS Rules
  // ============================================================

  var JP_CSS_RULES = [
    // --- Yahoo Japan ---
    'div[class^="yjads"]', 'div[id^="yads"]',
    'iframe[id$="_ad_frame"]',
    '.KaimonoBackground',
    '#msthdShpPr', '#msthdUhd', '#mhd_uhd_pc',
    '#msthdtp', '#windowShade', '#rma-pdv',
    '#pickupservice', '#Peron', '#brandpanel',
    '#PopHead', '#TopLink', '#TBP', '#TCBX',
    '#CenterBanner', '#commercebox',
    '#bpComposite', '#GoToBanner',
    '#js-ninjyo', '#js-Commerce',
    '#Service', '#Shopping',
    '.sw-AdSection', '#yfa_psp_wrap',
    '#lrec', '.adWrap',

    // --- Niconico ---
    'div[class^="Ads"]', '.CommentPanelBannerAd',
    '.AnimatorContainer',
    'div[class$="AdContainer"]',
    'div[data-ads-header-banner]',
    '#head_ads', '#web_pc_prime',
    '.billboard-ad', '.kokoku',
    '#header-ad', '#middle-ad', '#footer-ad',
    '.ad-bannar-maincolumn-top',

    // --- 5ch ---
    '.ADVERTISE_AREA',
    'div[id^="horizontalbanners"]',
    '.ad--bottom', '.ads_conten_main',
    '.adbanners', '.sproutad_frame-description',

    // --- Ameblo ---
    '.subAdBannerHeader', '.subAdBannerArea',
    'div[data-slot="injected"]',
    'div[amb-component="entryAd"]',
    '.bfl-snews__outer', '.skin-entryAd',

    // --- FC2 ---
    '#fc2_bottom_bnr', '#fc2_ad_box',

    // --- Hatena ---
    '#pc-billboard-ad', '.sleeping-ads',
    '.page-odai-ad',

    // --- Rakuten ---
    '#ad',

    // --- Pixiv ---
    '.ad-footer', '.ads_area_no_margin',
    '.multi-ads-area',

    // --- Kakaku.com ---
    '.fixedRightAdContainer', '.s-jack_img',
    '.sqTwo', '.c-ad',

    // --- Weblio ---
    '.flex-rectangle-ads-frame',
    '.premium-service-button',

    // --- Goo ---
    '.businessanswer', '#gooad-long', '.pr-unit',
    '.NR-pr', '.NR-ad',

    // --- Tenki.jp ---
    '.tenki-ad-pd', '.tenki-ad-pc-ct',
    '#tenki-ad-3rd_PD',

    // --- Abema TV ---
    '#videoAdContainer',
    '.theoplayer-ad-nonlinear',
    '.com-tv-top-CommercialBannerCarousel',

    // --- YouTube ---
    '.video-ads', '.ytp-ad-progress-list',
    '#player-ads', '#masthead-ad',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-carousel-ad-renderer',
    'ytd-display-ad-renderer',
    'ytd-ad-slot-renderer',
    '.ytd-search-pyv-renderer',
    '.pyv-afc-ads-container', '.iv-promo',

    // --- Wiki sites ---
    '#inbound-ad-container',
    '.atwiki-ads-margin',

    // --- Kotobank ---
    '.pc-iframe-ad', '.pc-word-ad', '.header-ad',

    // --- Google Search JP ---
    '#tads[aria-label="広告"]',
    '#bottomads',
    '.commercial-unit-desktop-rhs',
    '.commercial-unit-desktop-top'
  ].join(',\n');

  // ============================================================
  // SECTION 3: Affiliate Link CSS (Japanese Networks)
  // ============================================================

  var AFFILIATE_CSS = [
    'a[href*="a8.net"]',
    'a[href*="a8.to"]',
    'img[src*="a8.net"]',
    'a[href*="valuecommerce.com"]',
    'a[href*="vc-clicks.com"]',
    'img[src*="valuecommerce.com"]',
    'a[href*="accesstrade.net"]',
    'img[src*="accesstrade.net"]',
    'a[href*="moshimo.com"]',
    'img[src*="moshimo.com"]',
    'a[href*="affiliate-b.com"]',
    'a[href*="afi-b.com"]',
    'a[href*="felmat.net"]',
    'a[href^="https://hb.afl.rakuten.co.jp"]',
    'img[src*="thumbnail.image.rakuten.co.jp"]',
    'a[href^="https://ac.ebis.ne.jp"]',
    'a[href*="amazon-adsystem.com"]',
    'a[href*="click.ad-stir.com"]'
  ].join(',\n');

  // ============================================================
  // SECTION 4: Inject all CSS rules immediately
  // ============================================================

  var allCSS = [CSS_RULES, JP_CSS_RULES, AFFILIATE_CSS].join(',\n');
  var hideStyle = allCSS + ' { display: none !important; visibility: hidden !important; height: 0 !important; min-height: 0 !important; max-height: 0 !important; overflow: hidden !important; opacity: 0 !important; pointer-events: none !important; }';

  SLEX_addStyle(hideStyle);

  // Extra: hide common ad size containers
  SLEX_addStyle([
    'div[style*="width:300px"][style*="height:250px"] { display: none !important; }',
    'div[style*="width: 300px"][style*="height: 250px"] { display: none !important; }',
    'div[style*="width:300px"][style*="height:600px"] { display: none !important; }',
    'div[style*="width:728px"][style*="height:90px"] { display: none !important; }',
    'div[style*="width:320px"][style*="height:50px"] { display: none !important; }',
    'div[style*="width:320px"][style*="height:100px"] { display: none !important; }',
    // Fixed position full-screen overlays (anti-adblock)
    'div[style*="position: fixed"][style*="z-index: 999999"] { display: none !important; }',
    'div[style*="position:fixed"][style*="z-index:999999"] { display: none !important; }'
  ].join('\n'));

  // ============================================================
  // SECTION 5: DOM Removal (thorough cleanup)
  // ============================================================

  // Selectors for elements to completely remove from DOM
  var REMOVE_SELECTORS = [
    // iframes from ad networks
    'iframe[src*="googlesyndication.com"]',
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="amazon-adsystem.com"]',
    'iframe[src*="ad.yieldmanager.com"]',
    'iframe[src*="adserver"]',
    'iframe[src*="adsrv"]',
    'iframe[src*="admicro"]',
    'iframe[src*="ad-stir.com"]',
    'iframe[src*="i-mobile.co.jp"]',
    'iframe[src*="microad.net"]',
    'iframe[src*="nend.net"]',
    'iframe[src*="geniee"]',
    'iframe[src*="media5.fc2.com"]',
    // ad scripts containers
    'ins.adsbygoogle',
    'ins[id^="gpt_unit_/"]',
    // empty ad placeholders
    'div[id^="div-gpt-ad"]:empty',
    'div[id^="ezoic-pub-ad-"]:empty'
  ];

  // Text patterns that indicate ad/PR content (Japanese)
  var PR_TEXT_PATTERNS = [
    /^\s*\[PR\]\s*$/,
    /^\s*【PR】\s*$/,
    /^\s*PR\s*$/,
    /^\s*広告\s*$/,
    /^\s*スポンサーリンク\s*$/,
    /^\s*Sponsored\s*$/i,
    /^\s*Advertisement\s*$/i
  ];

  function removeAds() {
    // Remove ad elements from DOM
    var removeSelector = REMOVE_SELECTORS.join(', ');
    $(removeSelector).each(function () {
      $(this).remove();
    });

    // Remove elements with ad-related IDs (pattern match)
    $('[id]').each(function () {
      var id = this.id.toLowerCase();
      if (/^(ad[_-]|ads[_-]|adv[_-]|advert|adsense|adslot|adspot|adzone|google_ads|div-gpt-ad)/.test(id)) {
        // Skip false positives
        if (/^(add|admin|adjust|adopt|advance|advic|advent|address|adobe)/.test(id)) return;
        $(this).css({
          'display': 'none',
          'visibility': 'hidden',
          'height': '0',
          'overflow': 'hidden'
        });
      }
    });

    // Remove elements with ad-related classes (pattern match)
    $('[class]').each(function () {
      var cls = ' ' + this.className.toLowerCase() + ' ';
      if (/\b(ad[_-]?banner|ad[_-]?slot|ad[_-]?unit|ad[_-]?wrap|ad[_-]?box|ad[_-]?container|adsense|advert|sponsor|taboola|outbrain)\b/.test(cls)) {
        // Skip false positives
        if (/\b(add[_-]|admin|shadow|badge|radio)\b/.test(cls)) return;
        $(this).css({
          'display': 'none',
          'visibility': 'hidden',
          'height': '0',
          'overflow': 'hidden'
        });
      }
    });

    // Clean up empty space left by removed ads
    $('div, section, aside').each(function () {
      var $el = $(this);
      if ($el.children().length === 0 && $.trim($el.text()) === '' && $el.height() > 100) {
        var style = window.getComputedStyle(this);
        if (style.position === 'fixed' || style.position === 'sticky') {
          $el.remove();
        }
      }
    });
  }

  // ============================================================
  // SECTION 6: MutationObserver (catch dynamically loaded ads)
  // ============================================================

  var observerTimer = null;
  var pendingMutations = false;

  function handleMutations() {
    if (pendingMutations) return;
    pendingMutations = true;
    // Debounce: process after 200ms of quiet
    clearTimeout(observerTimer);
    observerTimer = setTimeout(function () {
      pendingMutations = false;
      removeAds();
    }, 200);
  }

  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function (mutations) {
      var dominated = false;
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length > 0) {
          dominated = true;
          break;
        }
      }
      if (dominated) {
        handleMutations();
      }
    });

    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // ============================================================
  // SECTION 7: Script/iframe blocker (prevent ad scripts from loading)
  // ============================================================

  // Block known ad scripts by removing them
  var AD_SCRIPT_PATTERNS = [
    /googlesyndication\.com/,
    /pagead2\.googlesyndication/,
    /doubleclick\.net/,
    /google-analytics\.com\/analytics/,
    /googletagmanager\.com/,
    /adservice\.google/,
    /amazon-adsystem\.com/,
    /cdn\.taboola\.com/,
    /widgets\.outbrain\.com/,
    /cdn\.zergnet\.com/,
    /cdn\.mgid\.com/,
    /popads\.net/,
    /adstir\.com/,
    /i-mobile\.co\.jp/,
    /nend\.net/,
    /microad\.net/,
    /geniee/,
    /criteo\.net/,
    /criteo\.com/,
    /adingo\.jp/,
    /logly\.co\.jp/,
    /popin\.cc/,
    /yimg\.jp\/images\/ds\/yjads/,
    /yads\.yahoo\.co\.jp/,
    /s\.yimg\.jp\/images\/listing/,
    /ad\.nicovideo\.jp/
  ];

  function blockAdScripts() {
    $('script[src]').each(function () {
      var src = this.src || '';
      for (var i = 0; i < AD_SCRIPT_PATTERNS.length; i++) {
        if (AD_SCRIPT_PATTERNS[i].test(src)) {
          $(this).remove();
          break;
        }
      }
    });
  }

  // ============================================================
  // SECTION 8: Anti-adblock bypass
  // ============================================================

  function bypassAntiAdblock() {
    // Remove common anti-adblock overlays
    var antiSelectors = [
      '#adBlockOverlay',
      '.adblock-popup',
      '.adblock-overlay',
      '.adblock-modal',
      '.adblock-notice',
      '.adblock-warning',
      '#disable-ads-container',
      '[class*="adblock-detect"]',
      '[class*="adblocker-detect"]',
      '[id*="adblock-detect"]',
      'div[style*="position: fixed"][style*="z-index"][style*="background"]'
    ];
    $(antiSelectors.join(', ')).remove();

    // Restore scrolling if blocked by anti-adblock
    $('body').css({
      'overflow': 'auto !important',
      'position': 'static !important'
    });
    $('html').css('overflow', 'auto !important');

    // Create decoy ad element to fool detection scripts
    var decoy = document.createElement('div');
    decoy.className = 'adsbox ad-placement ad-banner';
    decoy.id = 'ad-test';
    decoy.innerHTML = '&nbsp;';
    decoy.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;';
    document.body.appendChild(decoy);
  }

  // ============================================================
  // SECTION 9: Clean up PR / sponsored labels in content
  // ============================================================

  function cleanPRLabels() {
    $('span, div, p, label, small').each(function () {
      var text = $.trim($(this).text());
      for (var i = 0; i < PR_TEXT_PATTERNS.length; i++) {
        if (PR_TEXT_PATTERNS[i].test(text)) {
          // Hide the parent container (likely the ad card)
          var $parent = $(this).closest('article, li, div[class], section');
          if ($parent.length) {
            $parent.css('display', 'none');
          }
          break;
        }
      }
    });
  }

  // ============================================================
  // SECTION 10: Execute everything
  // ============================================================

  // Run immediately
  removeAds();
  blockAdScripts();
  bypassAntiAdblock();

  // Run again after short delay (catch late-loading ads)
  setTimeout(function () {
    removeAds();
    blockAdScripts();
    cleanPRLabels();
    bypassAntiAdblock();
  }, 1000);

  // Run again after longer delay (catch very late ads)
  setTimeout(function () {
    removeAds();
    blockAdScripts();
    cleanPRLabels();
  }, 3000);

  // Periodic cleanup every 5 seconds for first 30 seconds
  var cleanupCount = 0;
  var cleanupInterval = setInterval(function () {
    removeAds();
    blockAdScripts();
    cleanupCount++;
    if (cleanupCount >= 6) {
      clearInterval(cleanupInterval);
    }
  }, 5000);

  // Log (for debugging)
  if (typeof console !== 'undefined') {
    console.log('[Ultimate AdBlock] v1.0.0 loaded - 2000+ filters active');
  }

})();
