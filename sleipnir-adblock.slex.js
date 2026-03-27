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
// @version     2.0.0
// @require     jquery
// @require     api
// ==/UserScript==

(function () {
  'use strict';

  var hostname = location.hostname;

  // ============================================================
  // Utility: domain matching
  // ============================================================

  function matchDomain(pattern) {
    if (hostname === pattern) return true;
    // support wildcard suffix: ".yahoo.co.jp" matches "news.yahoo.co.jp"
    if (pattern.charAt(0) === '.') {
      return hostname.indexOf(pattern) === hostname.length - pattern.length;
    }
    return hostname.indexOf('.' + pattern) === hostname.length - pattern.length - 1;
  }

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

    // --- Short but high-confidence generic selectors ---
    // #ad / .ad are IDs/classes: only match exact "ad" class, not "add" or "address"
    '#ad', '#ads', '#AD',
    '.ads', '.Ads', '.ADS',

    // --- Generic Ad IDs (specific enough to be safe) ---
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

    // --- Generic Ad Classes (sufficiently specific) ---
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
    '.revcontent-wrap',

    // --- Sponsored context (safe: always ad-related in practice) ---
    '.sponsored', '.sponsor_link',

    // --- Banner classes (ad-specific only, not bare .banner) ---
    '.ad-rectangle-banner', '.ad-banner-top', '.ad-banner-bottom',
    '.bnrBb', '.bnSuper',
    // context-qualified banner: only inside ad wrappers
    'div[class*="ad"] .banner',
    'aside .banner',

    // --- Sizes ---
    '.pub_300x250', '.pub_300x250m', '.pub_728x90',
    '.ads300x250', '.ad_300x250', '.ad_320x100',

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

    // --- Social widgets ---
    '.addthis_toolbox', '.addthis_native_toolbox',
    '.addthis_sharing_toolbox',
    '.addtoany_share_save_container',

    // --- href-based ad links ---
    'a[href^="https://paid.outbrain.com/network/redir?"]',
    'a[href^="https://ad.doubleclick.net/"]',
    'a[href^="https://adclick.g.doubleclick.net/"]',
    'a[href^="https://pubads.g.doubleclick.net/"]',
    'a[href^="https://syndication.exoclick.com/"]',
    'a[href^="https://www.googleadservices.com/pagead/aclk?"]',
    'a[href*="&maxads="]',
    'a[href*=".adsrv.eacdn.com/"]',
    'a[href*=".engine.adglare.net/"]',
    'a[href*="/jump/next.php?r="]',
    'a[href^="https://www.adskeeper.com"]',
    'a[href^="https://clickadilla.com/"]',
    'a[href^="https://juicyads.in/"]',
    'a[href^="https://www.highperformancecpmgate.com/"]',
    'a[href^="https://www.toprevenuegate.com/"]',
    'a[href^="https://www.effectiveratecpm.com/"]',
    'a[href^="https://www.profitablegatecpm.com/"]',
    'a[href^="https://traffdaq.com/"]',
    'a[onmousedown*="paid.outbrain.com"]',

    // --- Tracking pixels (safe patterns: 1x1 or 0x0 with tracking src) ---
    'img[src*="googlesyndication.com"][width="1"]',
    'img[src*="doubleclick.net"][width="1"]',
    'img[src*="facebook.com/tr"][width="1"]',
    'img[src*="analytics"][width="1"][height="1"]',
    'img[src*="tracker"][width="1"][height="1"]',
    'img[src*="beacon"][width="1"][height="1"]',
    'img[src*="pixel."][width="1"][height="1"]',

    // --- Additional ad network containers ---
    '.mgid_3x2', '.mgid-wrapper',
    'citrus-ad-wrapper', 'ps-connatix-module',
    'hl-adsense', 'a-ad', 'zeus-ad',
    'div[ow-ad-unit-wrapper]',
    'img[src^="https://s-img.adskeeper.com/"]',

    // --- Adsense label variants ---
    '.adsbygoogle2', '.adsbygoogle-box',
    '.adsbygoogle-noablate', '.adsbygoogle-wrapper',
    '.adSense', '.Adsense', '.AdSense',
    '.adsense_ad', '.adsense_block', '.adsense_container',
    '.adsense_wrapper', '.adsense-ads', '.adsenseAds',
    '.adsense_mpu', '.adsense_rectangle',

    // --- Additional sticky/overlay variants ---
    '.Sticky-AdContainer', '.StickyAdRail__Inner',
    '.sticky-adsense', '.sticky-ads-content',
    '.anchor-ad-wrapper',

    // --- Additional sponsored variants ---
    '.SponsoredContent', '.SponsoredLinks',
    '.sponsoredResults', '.sponsored-results',
    '.sponsored_result'
  ].join(',');

  // ============================================================
  // SECTION 2: Japanese Site-Specific CSS Rules (domain-gated)
  // ============================================================

  var SITE_RULES = {
    'yahoo.co.jp': [
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
      '#lrec', '.adWrap'
    ],
    'nicovideo.jp': [
      '.CommentPanelBannerAd',
      '.AnimatorContainer',
      'div[class$="AdContainer"]',
      'div[data-ads-header-banner]',
      '#head_ads', '#web_pc_prime',
      '.billboard-ad', '.kokoku',
      '#header-ad', '#middle-ad', '#footer-ad',
      '.ad-bannar-maincolumn-top'
    ],
    '5ch.net': [
      '.ADVERTISE_AREA',
      'div[id^="horizontalbanners"]',
      '.ad--bottom', '.ads_conten_main',
      '.adbanners', '.sproutad_frame-description'
    ],
    'ameblo.jp': [
      '.subAdBannerHeader', '.subAdBannerArea',
      'div[data-slot="injected"]',
      'div[amb-component="entryAd"]',
      '.bfl-snews__outer', '.skin-entryAd'
    ],
    'fc2.com': [
      '#fc2_bottom_bnr', '#fc2_ad_box'
    ],
    'hatena.ne.jp': [
      '#pc-billboard-ad', '.sleeping-ads', '.page-odai-ad'
    ],
    'hatenablog.com': [
      '#pc-billboard-ad', '.sleeping-ads'
    ],
    'pixiv.net': [
      '.ad-footer', '.ads_area_no_margin', '.multi-ads-area'
    ],
    'kakaku.com': [
      '.fixedRightAdContainer', '.s-jack_img', '.sqTwo', '.c-ad'
    ],
    'weblio.jp': [
      '.flex-rectangle-ads-frame', '.premium-service-button'
    ],
    'goo.ne.jp': [
      '.businessanswer', '#gooad-long', '.pr-unit',
      '.NR-pr', '.NR-ad'
    ],
    'tenki.jp': [
      '.tenki-ad-pd', '.tenki-ad-pc-ct', '#tenki-ad-3rd_PD'
    ],
    'abema.tv': [
      '#videoAdContainer',
      '.theoplayer-ad-nonlinear',
      '.com-tv-top-CommercialBannerCarousel'
    ],
    'youtube.com': [
      '.video-ads', '.ytp-ad-progress-list',
      '#player-ads', '#masthead-ad',
      'ytd-promoted-sparkles-web-renderer',
      'ytd-carousel-ad-renderer',
      'ytd-display-ad-renderer',
      'ytd-ad-slot-renderer',
      '.ytd-search-pyv-renderer',
      '.pyv-afc-ads-container', '.iv-promo'
    ],
    'wikiwiki.jp': [
      '#inbound-ad-container'
    ],
    'atwiki.jp': [
      '.atwiki-ads-margin'
    ],
    'kotobank.jp': [
      '.pc-iframe-ad', '.pc-word-ad', '.header-ad'
    ],
    'google.co.jp': [
      '#tads[aria-label="広告"]',
      '#bottomads',
      '.commercial-unit-desktop-rhs',
      '.commercial-unit-desktop-top'
    ],
    'bbspink.com': [
      '.sidemenu_banner', '.ticker',
      'div[class^="banner_area_"]',
      '#bbspink-bottom-ads', '#top_banner',
      '.js--ad--bottom', '#float-bnr',
      '.bbspink-top-ads',
      '.ad_subb', '.ad_subb_ft'
    ],
    'livedoor.com': [
      '.ad-wrapper', 'div.adsW'
    ],
    'news.livedoor.com': [
      '.mainSec .adsW', '.ad-wrapper'
    ],
    'excite.co.jp': [
      '.yadsOverlay', '.ex-crt-wrapper', '#pageFeatures'
    ],
    'tabelog.com': [
      'div[class^="ad-min-size-"]', '.rstdtl-cmad--middle'
    ],
    'nifty.com': [
      '#float-bnr'
    ],
    '4gamer.net': [
      '.ad_top', '.ad_container', '.banner_left_4g', '.satellite_banner'
    ],
    'dic.nicovideo.jp': [
      '.ad-bannar-maincolumn-top', 'div[id^="crt-"]'
    ],
    'dic.pixiv.net': [
      '.d_header'
    ],
    'jbbs.shitaraba.net': [
      'iframe[id^="ox_"]', '.ad-320_50', '#recommend_ad'
    ],
    'travel.rakuten.co.jp': [
      '#ad'
    ],
    'rakuten.co.jp': [
      '#ad'
    ],
    'search.yahoo.co.jp': [
      '#So1', '#So2', '.sw-AdSection', '#yfa_psp_wrap'
    ],
    'news.yahoo.co.jp': [
      '#lrec', '.adWrap', 'div[id^="spocon"]'
    ],
    'finance.yahoo.co.jp': [
      'div[id^="ad_"]', '#promo', '#top_promo',
      '#pr_main1', '#pr_main2', 'p.cafxBanner'
    ],
    'auctions.yahoo.co.jp': [
      '#So1', '#So2', '.acMdAdPr', 'div[class^="Promotion-sc"]'
    ],
    'weather.yahoo.co.jp': [
      '.ad-frame-fix', '#ad-lrec', '#ad-ysp', '#ad-ct'
    ],
    'live.nicovideo.jp': [
      'aside[class^="___billboard-ad"]',
      'aside[class^="___ad-billboard"]',
      'aside[class^="___ad-banner"]',
      'div[class^="___player-ad-panel___"]'
    ],
    'live2.nicovideo.jp': [
      'aside[class^="___banner-panel"]',
      'aside[class^="___billboard-ad___"]',
      'aside[class^="___billboard-banner___"]'
    ],
    'news.nicovideo.jp': [
      '#billboard_container', '.ad-container'
    ]
  };

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
  ].join(',');

  // ============================================================
  // SECTION 4: Inject CSS rules
  // ============================================================

  var hideDecl = ' { display: none !important; }';

  // Global rules
  SLEX_addStyle(CSS_RULES + hideDecl);
  SLEX_addStyle(AFFILIATE_CSS + hideDecl);

  // Site-specific rules (only inject for matching domain)
  var domain, rules;
  for (domain in SITE_RULES) {
    if (SITE_RULES.hasOwnProperty(domain) && matchDomain(domain)) {
      rules = SITE_RULES[domain];
      SLEX_addStyle(rules.join(',') + hideDecl);
    }
  }

  // Protect decoy elements from our own CSS rules
  SLEX_addStyle('div.adsbygoogle[style*="left:-9999px"] { display: block !important; height: 1px !important; }');
  SLEX_addStyle('div.ad-placement[style*="left:-9999px"] { display: block !important; height: 1px !important; }');
  SLEX_addStyle('div.adsbox[style*="left:-9999px"] { display: block !important; height: 1px !important; }');

  // Size-based inline style hiding
  SLEX_addStyle([
    'div[style*="width:300px"][style*="height:250px"]',
    'div[style*="width: 300px"][style*="height: 250px"]',
    'div[style*="width:300px"][style*="height:600px"]',
    'div[style*="width:728px"][style*="height:90px"]',
    'div[style*="width:320px"][style*="height:50px"]',
    'div[style*="width:320px"][style*="height:100px"]'
  ].join(',') + hideDecl);

  // ============================================================
  // SECTION 5: DOM Removal (targeted, no full-page scan)
  // ============================================================

  // Selectors for elements to remove from DOM (iframes that waste bandwidth)
  var REMOVE_SELECTORS = [
    'iframe[src*="googlesyndication.com"]',
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="amazon-adsystem.com"]',
    'iframe[src*="ad.yieldmanager.com"]',
    'iframe[src*="ad-stir.com"]',
    'iframe[src*="i-mobile.co.jp"]',
    'iframe[src*="microad.net"]',
    'iframe[src*="nend.net"]',
    'iframe[src*="geniee"]',
    'iframe[src*="media5.fc2.com"]',
    'iframe[src*="criteo.net"]',
    'iframe[src*="criteo.com"]',
    'iframe[src*="taboola.com"]',
    'iframe[src*="outbrain.com"]',
    'iframe[src*="adingo.jp"]',
    'iframe[src*="popin.cc"]',
    'iframe[src*="popads.net"]',
    'iframe[src*="mgid.com"]',
    'iframe[src*="zergnet.com"]',
    'iframe[src*="exoclick.com"]',
    'iframe[src*="juicyads"]',
    'iframe[src*="adskeeper.com"]',
    'div[id^="div-gpt-ad"]:empty',
    'div[id^="ezoic-pub-ad-"]:empty'
  ].join(', ');

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

  function removeAdIframes() {
    $(REMOVE_SELECTORS).remove();
  }

  function cleanPRLabels() {
    $('span, label, small').each(function () {
      var text = $.trim($(this).text());
      if (!text || text.length > 20) return; // PR labels are short
      for (var i = 0; i < PR_TEXT_PATTERNS.length; i++) {
        if (PR_TEXT_PATTERNS[i].test(text)) {
          // Hide the closest ad-like container, but limit traversal depth
          var $parent = $(this).closest('article, li, [class*="ad"], [class*="sponsor"], [class*="pr-"]');
          if ($parent.length && $parent[0].tagName !== 'BODY') {
            $parent.css('display', 'none');
          }
          break;
        }
      }
    });
  }

  // ============================================================
  // SECTION 6: Anti-adblock bypass
  // ============================================================

  var decoyCreated = false;

  function bypassAntiAdblock() {
    // Remove common anti-adblock overlays
    $(
      '#adBlockOverlay,' +
      '.adblock-popup,' +
      '.adblock-overlay,' +
      '.adblock-modal,' +
      '.adblock-notice,' +
      '.adblock-warning,' +
      '#disable-ads-container,' +
      '[class*="adblock-detect"],' +
      '[class*="adblocker-detect"],' +
      '[id*="adblock-detect"]'
    ).remove();

    // Restore scrolling if blocked by anti-adblock (use cssText for !important)
    var body = document.body;
    var html = document.documentElement;
    if (body && body.style.overflow === 'hidden') {
      body.style.cssText += '; overflow: auto !important; position: static !important;';
    }
    if (html && html.style.overflow === 'hidden') {
      html.style.cssText += '; overflow: auto !important;';
    }

    // Create decoy ad elements only once (fool multiple detection methods)
    if (!decoyCreated && body) {
      decoyCreated = true;
      // Decoy 1: class-based detection (adsbox)
      var decoy1 = document.createElement('div');
      decoy1.className = 'adsbox';
      decoy1.innerHTML = '&nbsp;';
      decoy1.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;';
      body.appendChild(decoy1);
      // Decoy 2: id-based detection (ad-banner)
      var decoy2 = document.createElement('div');
      decoy2.className = 'ad-placement ad-banner textads banner-ads';
      decoy2.innerHTML = '&nbsp;';
      decoy2.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;';
      body.appendChild(decoy2);
      // Decoy 3: google ads iframe name detection
      var decoy3 = document.createElement('div');
      decoy3.className = 'adsbygoogle';
      decoy3.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;display:block !important;';
      body.appendChild(decoy3);
    }
  }

  // ============================================================
  // SECTION 7: MutationObserver (catch dynamically loaded ads)
  // ============================================================

  var debounceTimer = null;

  function onDomChanged() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      removeAdIframes();
    }, 200);
  }

  if (typeof MutationObserver !== 'undefined') {
    var target = document.body || document.documentElement;
    if (target) {
      var observer = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          if (mutations[i].addedNodes.length > 0) {
            onDomChanged();
            return;
          }
        }
      });

      observer.observe(target, {
        childList: true,
        subtree: true
      });
    }
  }

  // ============================================================
  // SECTION 8: Execute
  // ============================================================

  // Run immediately
  removeAdIframes();
  bypassAntiAdblock();

  // Run again after short delay (catch late-loading ads)
  setTimeout(function () {
    removeAdIframes();
    cleanPRLabels();
    bypassAntiAdblock();
  }, 1500);

  // One final cleanup
  setTimeout(function () {
    removeAdIframes();
    cleanPRLabels();
  }, 5000);

  console.log('[Ultimate AdBlock] v2.0.0 loaded');

})();
