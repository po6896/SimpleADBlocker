/*
 * Ad-server URL patterns for request classification.
 *
 * Tier 1: bid endpoints / SSP auction / tracking tags
 * Tier 2: creative CDN / image hosts where the actual ad body is served
 *
 * Both count as "ad requests" for counting purposes — from a user's
 * perspective an unblocked creative fetch is still an ad load.
 *
 * JP-heavy coverage: Geniee, Fluct/adingo, i-mobile, Zucks, AMoAd, Nend,
 * Adstir, MicroAd, Yahoo Yads, Intimate Merger, Cxense, Browsi, D2C,
 * SoCDM, Aman/TrueData, DC Tag, Nakanohito.
 */
const AD_SERVER_PATTERNS = [
  /* tier 1 — Google / Amazon / classic SSP */
  /doubleclick\.net\//,
  /googlesyndication\.com\//,
  /googletagservices\.com\//,
  /googletagmanager\.com\/gtag/,
  /pubads\.g\.doubleclick\.net/,
  /safeframe\.googlesyndication\.com/,
  /pagead2\.googlesyndication\.com/,
  /adservice\.google\.(com|co\.jp)/,
  /fundingchoicesmessages\.google\.com/,
  /adtrafficquality\.google/,
  /google-analytics\.com\//,
  /analytics\.google\.com\//,
  /amazon-adsystem\.com\//,
  /criteo\.(com|net)\//,
  /ib\.adnxs\.com/,
  /rubiconproject\.com\//,
  /openx\.net\//,
  /pubmatic\.com\//,
  /adform\.net\//,
  /taboola\.com\//,
  /outbrain\.com\//,

  /* tier 1 — Yahoo JP */
  /yjtag\.yahoo\.co\.jp/,
  /s\.yimg\.jp\/.*\/ad/,
  /yads\.yahoo\.co\.jp/,
  /clb\.yahoo\.co\.jp/,
  /dsb\.yahoo\.co\.jp/,
  /\/\/yie\.jp\//,

  /* tier 1 — JP SSP / DMP */
  /gssprt\.jp\//,
  /cpt\.geniee\.jp/,
  /adingo\.jp\//,
  /fout\.jp\//,
  /i-mobile\.co\.jp\/(script|banner|ad)/,
  /zucks\.(co\.jp|net)\//,
  /amoad\.com\//,
  /nend\.net\//,
  /ad-stir\.com\//,
  /microad\.jp\//,
  /impact-ad\.jp\//,
  /im-apps\.net\//,
  /cxense\.com\//,
  /nakanohito\.jp\//,
  /amanad\.adtdp\.com\//,
  /socdm\.com\//,
  /ladsp\.com\//,
  /dc-tag\.jp\//,
  /hera\.d2c\.ne\.jp\//,
  /webpush\.jp\//,

  /* tier 1 — global SSP / DSP / cookie sync */
  /id5-sync\.com\//,
  /browsiprod\.com\//,
  /match\.adsrvr\.org\//,
  /tapad\.com\//,
  /lijit\.com\//,
  /s-onetag\.com\//,
  /ad-delivery\.net\//,
  /ads-twitter\.com\//,
  /analytics\.twitter\.com\//,
  /connect\.facebook\.net\//,

  /* tier 1 — viewability / brand safety */
  /adsafeprotected\.com\//,
  /moatads\.com\//,
  /scorecardresearch\.com\//,

  /* tier 2 — creative CDN */
  /tpc\.googlesyndication\.com/,
  /static\.criteo\.(com|net)/,
  /images\.criteo\.(com|net)/,
  /cas\.criteo\.com/,
  /ads\.yahoo\.co\.jp/,
  /amg\.yahoo\.co\.jp/,
  /m\.webtrends\.com/,
  /img\.ak\.impact-ad\.jp/,
  /img\.i-mobile\.co\.jp/,
  /cdn\.adingo\.jp/,
  /cdn\.id5-sync\.com/,

  /* 2026-05-01 audit: corpus HAR で既存リストから漏れた広告ホスト */
  /yads\.c\.yimg\.jp/,                    /* Yahoo yads-async.js CDN */
  /casalemedia\.com\//,                   /* Index Exchange SSP */
  /bidswitch\.net\//,                     /* BidSwitch cookie-sync */
  /flux-cdn\.com\//,                      /* GeoEdge ad-quality */
  /rumcdn\.geoedge\.be\//,                /* GeoEdge ad-quality */
  /\/\/t\.co\/i\/adsct/,                  /* Twitter ad conversion pixel */
  /www\.facebook\.com\/privacy_sandbox\/pixel/, /* FB Privacy Sandbox conv */
  /cdn\.jsdelivr\.net\/gh\/prebid/,       /* Prebid.js currency-file */
  /transcend-cdn\.com/,                   /* CMP — count only, not blocked */
];

function isAdUrl(url) {
  for (const pat of AD_SERVER_PATTERNS) if (pat.test(url)) return true;
  return false;
}

module.exports = { AD_SERVER_PATTERNS, isAdUrl };
