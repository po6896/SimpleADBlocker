#!/usr/bin/env node
/*
 * Cross-check EasyList against current rules. EasyList is huge (~55k pure
 * domain rules), so we filter aggressively: only emit unmatched hosts that
 * either (a) embed a known ad-tech keyword in the domain name, or (b)
 * appear in our scan output as count >= 2.
 *
 * Usage: node scripts/extract-from-easylist.js /path/to/easylist.txt
 */
const fs = require('fs');
const path = require('path');
const { AD_SERVER_PATTERNS } = require('../test/harness/patterns.js');

function adDomains() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'sleipnir-adblock.slex.js'), 'utf8');
  const m = src.match(/var AD_DOMAINS = \[([\s\S]*?)\];/);
  const list = [];
  const re = /'([^']+)'/g;
  let g;
  while ((g = re.exec(m[1])) !== null) list.push(g[1].toLowerCase());
  return list;
}
const known = adDomains();

function isKnown(host) {
  for (const pat of AD_SERVER_PATTERNS) if (pat.test('https://' + host + '/')) return true;
  for (const d of known) {
    if (d.indexOf('/') !== -1) continue;
    if (host === d || host.endsWith('.' + d)) return true;
  }
  return false;
}

const KW = /(adserv|adservice|adsrv|adsystem|adtag|adnxs|adroll|adform|adkernel|advert|adviser|admedia|adagency|adnet|adcdn|adscale|adstream|adpush|adsync|adtech|adtrack|adexchang|adsale|adsupply|adyield|tracksrv|tracking|trkpix|trkcdn|adblade|adcanvas|adcolony|admob|adition|adriver|adstem|tribal|sociomant|sovrn|sailthru|popunder|popad|popcash|propellerads|revcontent|spotxchange|stickyads|teads|trafficjunky|video-cell|videoadex|videoplaza|vidible|vidyard|aniview|cas\.|sas\.|smc\.|exch|bidder|bid\.|rtb|ssp\.|dsp\.|dmp\.|cmp\.|sync\.|cookie-?sync|cookie-?match|user-?match|user-?sync|tracker|pixel|telemetry|analytics|metric|beacon|targeting|prebid|videoreach|programmatic)/i;

const file = process.argv[2] || '/tmp/easylist.txt';
const text = fs.readFileSync(file, 'utf8');
const domains = new Set();
for (const ln of text.split('\n')) {
  const m = ln.match(/^\|\|([a-z0-9][a-z0-9.\-_]+)\^$/);
  if (m) domains.add(m[1].toLowerCase());
}

const all = [...domains];
const unmatched = all.filter(d => !isKnown(d));
const kwHits = unmatched.filter(d => KW.test(d));

console.log(`# Total EasyList ||domain^ rules: ${all.length}`);
console.log(`# Unmatched by current rules: ${unmatched.length}`);
console.log(`# With ad-tech keyword in domain: ${kwHits.length}`);
console.log(`#`);
console.log(`# === keyword-matching unmatched (review) ===`);
for (const d of kwHits.sort()) console.log(d);
