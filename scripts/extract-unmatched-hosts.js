#!/usr/bin/env node
/*
 * Walk the HAR corpus and list third-party hosts that are NOT yet matched by
 * either AD_SERVER_PATTERNS (test/harness/patterns.js) or AD_DOMAINS
 * (sleipnir-adblock.slex.js). Hosts are aggregated across all corpus HARs.
 *
 * Output: TSV  count<TAB>host<TAB>sources<TAB>sample-path
 * Sorted by count desc. Pass --threshold N to drop hosts with fewer hits.
 */
const fs = require('fs');
const path = require('path');
const { AD_SERVER_PATTERNS } = require('../test/harness/patterns.js');

const HAR_DIR = path.join(__dirname, '..', 'test', 'corpus', 'har');
const SLEX = path.join(__dirname, '..', 'sleipnir-adblock.slex.js');
const TARGETS = path.join(__dirname, '..', 'test', 'corpus', 'targets.yaml');

function extractAdDomains() {
  const src = fs.readFileSync(SLEX, 'utf8');
  const m = src.match(/var AD_DOMAINS = \[([\s\S]*?)\];/);
  if (!m) throw new Error('AD_DOMAINS not found in slex');
  const literals = [];
  const re = /'([^']+)'/g;
  let g;
  while ((g = re.exec(m[1])) !== null) literals.push(g[1].toLowerCase());
  return literals;
}

function corpusHosts() {
  const yaml = fs.readFileSync(TARGETS, 'utf8');
  const set = new Set();
  for (const line of yaml.split('\n')) {
    const u = line.match(/url:\s*(https?:\/\/[^\s]+)/);
    if (!u) continue;
    try {
      const h = new URL(u[1]).hostname.toLowerCase();
      set.add(h);
      // Also register the registrable parent (best-effort: last 2 labels).
      const labels = h.split('.');
      if (labels.length >= 2) set.add(labels.slice(-2).join('.'));
    } catch (e) {}
  }
  return set;
}

const adDomains = extractAdDomains();
const corpusOwn = corpusHosts();

function isKnownAd(url, host) {
  for (const pat of AD_SERVER_PATTERNS) if (pat.test(url)) return true;
  // suffix match against AD_DOMAINS
  for (const d of adDomains) {
    if (host === d || host.endsWith('.' + d) || url.toLowerCase().includes(d)) {
      return true;
    }
  }
  return false;
}

function isCorpusOwn(host) {
  for (const own of corpusOwn) {
    if (host === own || host.endsWith('.' + own)) return true;
  }
  return false;
}

const counts = new Map(); // host -> { count, sources:Set, sample:string }

const harFiles = fs.readdirSync(HAR_DIR).filter(f => f.endsWith('.har'));
const corpusActive = [
  'yahoo_news_jp', 'livedoor_news', 'fc2blog_article', 'kamigame_dbd',
  'wikiwiki_nijisanji', 'kamikouryaku_nightreign', 'itmedia_news',
  'mdn_home', 'github_readme', 'wikipedia_ja',
];
const includeAll = process.argv.includes('--all');

for (const f of harFiles) {
  const id = f.replace(/\.har$/, '');
  if (!includeAll && !corpusActive.includes(id)) continue;
  const har = JSON.parse(fs.readFileSync(path.join(HAR_DIR, f), 'utf8'));
  const entries = har.log?.entries || [];
  for (const e of entries) {
    const url = e.request?.url;
    if (!url || !/^https?:/.test(url)) continue;
    let host;
    try { host = new URL(url).hostname.toLowerCase(); } catch { continue; }
    if (isCorpusOwn(host)) continue;
    if (isKnownAd(url, host)) continue;
    let rec = counts.get(host);
    if (!rec) {
      rec = { count: 0, sources: new Set(), sample: url };
      counts.set(host, rec);
    }
    rec.count++;
    rec.sources.add(id);
  }
}

const threshold = parseInt(process.argv[process.argv.indexOf('--threshold') + 1], 10) || 3;
const rows = [...counts.entries()]
  .filter(([, r]) => r.count >= threshold)
  .sort((a, b) => b[1].count - a[1].count);

console.log(`# Unmatched third-party hosts in corpus HAR (count>=${threshold})`);
console.log(`# Already-matched hosts (AD_SERVER_PATTERNS + AD_DOMAINS) excluded.`);
console.log(`# count\thost\tsources\tsample`);
for (const [host, r] of rows) {
  const sources = [...r.sources].join(',');
  const sample = r.sample.length > 100 ? r.sample.slice(0, 100) + '...' : r.sample;
  console.log(`${r.count}\t${host}\t${sources}\t${sample}`);
}
