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
 * Adstir, MicroAd, Yahoo Yads.
 */
const AD_SERVER_PATTERNS = [
  /* tier 1 */
  /doubleclick\.net\//,
  /googlesyndication\.com\//,
  /googletagservices\.com\//,
  /googletagmanager\.com\/gtag/,
  /pubads\.g\.doubleclick\.net/,
  /safeframe\.googlesyndication\.com/,
  /pagead2\.googlesyndication\.com/,
  /adservice\.google\.(com|co\.jp)/,
  /amazon-adsystem\.com\//,
  /criteo\.(com|net)\//,
  /ib\.adnxs\.com/,
  /rubiconproject\.com\//,
  /openx\.net\//,
  /pubmatic\.com\//,
  /adform\.net\//,
  /taboola\.com\//,
  /outbrain\.com\//,
  /yjtag\.yahoo\.co\.jp/,
  /s\.yimg\.jp\/.*\/ad/,
  /yads\.yahoo\.co\.jp/,
  /\/\/yie\.jp\//,
  /gssprt\.jp\//,
  /adingo\.jp\//,
  /fout\.jp\//,
  /i-mobile\.co\.jp\/(script|banner|ad)/,
  /zucks\.co\.jp\//,
  /amoad\.com\//,
  /nend\.net\//,
  /ad-stir\.com\//,
  /microad\.jp\//,
  /impact-ad\.jp\//,
  /adsafeprotected\.com\//,
  /moatads\.com\//,
  /scorecardresearch\.com\//,

  /* tier 2 */
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
];

function isAdUrl(url) {
  for (const pat of AD_SERVER_PATTERNS) if (pat.test(url)) return true;
  return false;
}

module.exports = { AD_SERVER_PATTERNS, isAdUrl };
