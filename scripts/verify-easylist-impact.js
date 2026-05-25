#!/usr/bin/env node
/*
 * Effect/false-positive check for the EasyList ||host^ auto-ingest (v5.8.0).
 * For each HAR, count requests the CURRENT rules let through but the EasyList
 * network domains would now block. Count = effect; host list = eyeball for
 * content/CDN false-positives. Reads the same scripts/easylist.txt the test
 * harness injects, so it stays in sync with what ships.
 *
 * Usage: node scripts/verify-easylist-impact.js [harName ...]  (no .har)
 */
const fs = require('fs');
const path = require('path');
const { AD_SERVER_PATTERNS } = require('../test/harness/patterns.js');

function bundledDomains() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'sleipnir-adblock.slex.js'), 'utf8');
  const m = src.match(/var AD_DOMAINS = \[([\s\S]*?)\];/);
  const list = [];
  const re = /'([^']+)'/g;
  let g;
  while ((g = re.exec(m[1])) !== null) list.push(g[1].toLowerCase());
  return list;
}
const bundled = bundledDomains();
const bundledHostSet = new Set(bundled.filter((d) => d.indexOf('/') === -1));
const bundledPaths = bundled.filter((d) => d.indexOf('/') !== -1);

const elText = fs.readFileSync(path.join(__dirname, 'easylist.txt'), 'utf8');
const elSet = new Set();
for (const ln of elText.split('\n')) {
  const m = ln.match(/^\|\|([a-z0-9][a-z0-9.\-_]*)\^$/);
  if (m && m[1].indexOf('*') === -1 && m[1].indexOf('/') === -1) elSet.add(m[1]);
}

function suffixHit(set, host) {
  let h = host;
  while (h) {
    if (set.has(h)) return true;
    const dot = h.indexOf('.');
    if (dot === -1) break;
    h = h.substring(dot + 1);
  }
  return false;
}
function knownNow(url, host) {
  for (const p of AD_SERVER_PATTERNS) if (p.test(url)) return true;
  if (suffixHit(bundledHostSet, host)) return true;
  const lower = url.toLowerCase();
  for (const d of bundledPaths) if (lower.indexOf(d) !== -1) return true;
  return false;
}

const harDir = path.join(__dirname, '..', 'test', 'corpus', 'har');
const args = process.argv.slice(2);
const files = args.length
  ? args.map((i) => i + '.har')
  : fs.readdirSync(harDir).filter((f) => f.endsWith('.har'));

console.log(`# EasyList net domains loaded: ${elSet.size}`);
for (const f of files) {
  let har;
  try { har = JSON.parse(fs.readFileSync(path.join(harDir, f), 'utf8')); } catch (e) { continue; }
  const entries = (har.log && har.log.entries) || [];
  const newly = new Map();
  let total = 0, knownBlocked = 0;
  for (const e of entries) {
    const url = e.request && e.request.url;
    if (!url) continue;
    total++;
    let host;
    try { host = new URL(url).hostname.toLowerCase(); } catch (_) { continue; }
    if (knownNow(url, host)) { knownBlocked++; continue; }
    if (suffixHit(elSet, host)) newly.set(host, (newly.get(host) || 0) + 1);
  }
  const hosts = [...newly.keys()].sort();
  let newReq = 0;
  for (const h of hosts) newReq += newly.get(h);
  console.log(`\n=== ${f}  (req ${total} / 既ブロック ${knownBlocked} / EasyList新規 host ${hosts.length} req ${newReq}) ===`);
  for (const h of hosts) console.log(`  ${h}  x${newly.get(h)}`);
}
