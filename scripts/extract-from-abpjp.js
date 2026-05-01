#!/usr/bin/env node
/*
 * Read ABP Japanese filter list and emit domains that are NOT yet
 * matched by AD_SERVER_PATTERNS or AD_DOMAINS. Filters down to JP
 * TLD or known JP-vendor keywords for higher signal/noise ratio.
 *
 * Usage: node scripts/extract-from-abpjp.js /path/to/abpjf.txt
 */
const fs = require('fs');
const path = require('path');
const { AD_SERVER_PATTERNS } = require('../test/harness/patterns.js');

const SLEX = path.join(__dirname, '..', 'sleipnir-adblock.slex.js');
function extractAdDomains() {
  const src = fs.readFileSync(SLEX, 'utf8');
  const m = src.match(/var AD_DOMAINS = \[([\s\S]*?)\];/);
  const literals = [];
  const re = /'([^']+)'/g;
  let g;
  while ((g = re.exec(m[1])) !== null) literals.push(g[1].toLowerCase());
  return literals;
}
const adDomains = extractAdDomains();

function isKnownAd(host) {
  const lower = host.toLowerCase();
  for (const pat of AD_SERVER_PATTERNS) if (pat.test('https://' + lower + '/')) return true;
  for (const d of adDomains) {
    if (d.indexOf('/') !== -1) continue;
    if (lower === d || lower.endsWith('.' + d)) return true;
  }
  return false;
}

const file = process.argv[2] || '/tmp/abpjp.txt';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const domains = new Set();
for (const ln of lines) {
  const m = ln.match(/^\|\|([a-z0-9][a-z0-9.\-_]+)\^$/);
  if (!m) continue;
  domains.add(m[1].toLowerCase());
}

const jpTld = /\.jp$|\.tokyo$|\.osaka$/;
const jpKeywords = /(yahoo|yimg|geniee|fluct|i-mobile|microad|amoad|adingo|nend|ad-stir|zucks|nakanohito|admatrix|impact-ad|ladsp|d2c|cxense|amanad|webpush|polymorph|admatrix|relaido|piano|shinobi|bance|liadm|caprofitx|nrich|insiad|primis|gsspat|hubvisor|yellowblue|gmossp|sparteo|measureadv|admanmedia|colossus|krushmedia|smartadhi|fireworktv|monetixads|ocmthood|bricks|mulan|ust|mediarithmics|chartbeat|exelator|macromill|smartnews|fwpub|fwpixel|admatic|seedtag|cootlogix|bfmio|ingage|nexx360|aralego|rakuten|adobedtm|presco|company-target|cnobi|seenthis|nowads|adsboosters|zimg|connectid|aiasahi|salesforce|azureedge|edayo|temu|line|kakao|linkedin|miyuki|smartadhi|smaato|cadmus|rtb|ssp|dsp|dmp|dpid|adkernel|onesignal)/;

const all = [...domains];
const unmatched = all.filter(d => !isKnownAd(d));
const jpRelevant = unmatched.filter(d => jpTld.test(d) || jpKeywords.test(d));

console.log(`# Total ABP-JP domains: ${all.length}`);
console.log(`# Unmatched (not in our AD_DOMAINS or patterns): ${unmatched.length}`);
console.log(`# JP-TLD or JP-vendor keyword: ${jpRelevant.length}`);
console.log(`#`);
console.log(`# === JP-TLD / JP-vendor (review for inclusion) ===`);
for (const d of jpRelevant.sort()) console.log(d);

console.log(`#`);
console.log(`# === Top 50 unmatched non-JP (informational) ===`);
const nonJp = unmatched.filter(d => !jpTld.test(d) && !jpKeywords.test(d));
for (const d of nonJp.slice(0, 50)) console.log(d);
