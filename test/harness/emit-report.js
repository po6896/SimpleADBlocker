#!/usr/bin/env node
/*
 * Generate an HTML dashboard from a summary.json. Run automatically by
 * run-corpus.js after every replay/record. The report sits next to the
 * summary.json so a single directory can be archived per date.
 */
const fs = require('fs');
const path = require('path');

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function pct(n, d) {
  if (!d) return '-';
  return (100 * n / d).toFixed(1) + '%';
}

function verdictColor(v) {
  if (v === 'PASS') return '#2d7';
  if (v === 'FAIL') return '#d44';
  if (v === 'INCONCLUSIVE') return '#b80';
  if (v === 'ERROR') return '#a0a';
  return '#999';
}

function renderRow(r) {
  const v = r.verdict || {};
  const vads = (r.vanilla && r.vanilla.ads) || {};
  const bads = (r.blocked && r.blocked.ads) || {};
  const vSurv = (r.vanilla && r.vanilla.adSurvivors) || 0;
  const bSurv = (r.blocked && r.blocked.adSurvivors) || 0;
  const reductionPct = vSurv ? (100 * (1 - bSurv / vSurv)).toFixed(1) + '%' : '-';
  const cls = (r.blocked && typeof r.blocked.cls === 'number') ? r.blocked.cls.toFixed(3) : '-';
  const clsCss = (r.blocked && r.blocked.cls > 0.1) ? 'warn' : '';
  const warnText = (v.warnings || []).join('; ');
  const reasonText = (v.reasons || []).join('; ') || (r.error ? r.error.split('\n')[0] : '');
  const vanillaShot = `${r.id}/vanilla.png`;
  const blockedShot = `${r.id}/blocked.png`;
  return `
<tr>
  <td><strong>${esc(r.id)}</strong><br><small>${esc(r.group || '')}</small><br><a href="${esc(r.url)}">link</a></td>
  <td><span class="v" style="background:${verdictColor(v.verdict || 'ERROR')}">${esc(v.verdict || 'ERROR')}</span></td>
  <td>
    iss ${vads.issued||0} / fin ${vads.finished||0} / red ${vads.redirected||0} / fail ${vads.failed||0}
    <br>survivors <strong>${vSurv}</strong>
  </td>
  <td>
    iss ${bads.issued||0} / abt ${bads.aborted||0} / fin ${bads.finished||0} / red ${bads.redirected||0} / fail ${bads.failed||0}
    <br>survivors <strong>${bSurv}</strong> (reduction ${reductionPct})
  </td>
  <td class="${clsCss}">${cls}</td>
  <td>${esc(warnText) || '&nbsp;'}</td>
  <td>${esc(reasonText) || '&nbsp;'}</td>
  <td>
    <a href="${esc(vanillaShot)}"><img src="${esc(vanillaShot)}" width="120" loading="lazy"></a>
    <a href="${esc(blockedShot)}"><img src="${esc(blockedShot)}" width="120" loading="lazy"></a>
  </td>
</tr>`;
}

function renderHTML(summary) {
  const { mode, stamp, results } = summary;
  const by = { PASS: 0, FAIL: 0, INCONCLUSIVE: 0, ERROR: 0 };
  for (const r of results) {
    if (r.error) by.ERROR++;
    else if (r.verdict) by[r.verdict.verdict] = (by[r.verdict.verdict] || 0) + 1;
  }
  const rows = results.map(renderRow).join('\n');

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>SimpleADBlocker corpus report ${esc(stamp)}</title>
<style>
  body { font-family: 'Segoe UI', system-ui, sans-serif; margin: 20px; background: #141417; color: #e4e4e4; }
  h1 { margin: 0 0 4px; font-size: 20px; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; margin-right: 6px; font-size: 12px; color: #fff; }
  table { border-collapse: collapse; width: 100%; margin-top: 12px; font-size: 13px; }
  th, td { border: 1px solid #2a2a30; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #1d1d22; position: sticky; top: 0; }
  tr:nth-child(even) td { background: #181820; }
  td img { display: inline-block; margin: 2px 2px 2px 0; border: 1px solid #333; }
  .v { color: #fff; padding: 2px 10px; border-radius: 3px; font-weight: bold; font-size: 12px; }
  .warn { color: #ffb84d; font-weight: bold; }
  a { color: #5ab8ff; text-decoration: none; }
  a:hover { text-decoration: underline; }
  small { color: #888; }
</style>
</head>
<body>
<h1>SimpleADBlocker corpus report</h1>
<div>
  <span class="tag" style="background:#333">mode ${esc(mode)}</span>
  <span class="tag" style="background:#555">${esc(stamp)}</span>
  <span class="tag" style="background:${verdictColor('PASS')}">PASS ${by.PASS}</span>
  <span class="tag" style="background:${verdictColor('FAIL')}">FAIL ${by.FAIL}</span>
  <span class="tag" style="background:${verdictColor('INCONCLUSIVE')}">INCONCLUSIVE ${by.INCONCLUSIVE}</span>
  <span class="tag" style="background:${verdictColor('ERROR')}">ERROR ${by.ERROR}</span>
  <a href="summary.json">raw JSON</a>
</div>
<table>
<thead><tr>
  <th>Site</th><th>Verdict</th><th>Vanilla</th><th>Blocked</th>
  <th>CLS</th><th>Warnings</th><th>Reason / Error</th><th>Screens (v / b)</th>
</tr></thead>
<tbody>${rows}</tbody>
</table>
</body>
</html>
`;
}

function main() {
  const inPath = process.argv[2];
  if (!inPath) {
    console.error('usage: emit-report.js <summary.json>');
    process.exit(2);
  }
  const summary = JSON.parse(fs.readFileSync(inPath, 'utf-8'));
  const outPath = path.join(path.dirname(inPath), 'index.html');
  fs.writeFileSync(outPath, renderHTML(summary));
  console.log('Wrote ' + outPath);
}

if (require.main === module) main();

module.exports = { renderHTML };
