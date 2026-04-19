/*
 * Render a single-line verdict summary for CLI output.
 * Keeps run-corpus.js free of string-formatting noise.
 */
function formatResult(mode, entry, r) {
  const tag = `[${mode}] ${entry.id}`;
  if (r.error) return `${tag} ... ERROR: ${r.error.split('\n')[0]}`;
  if (!r.verdict) return `${tag} ... recorded`;

  const v = r.verdict;

  if (v.verdict === 'PASS') {
    const va = (r.vanilla && r.vanilla.ads) || {};
    const ba = (r.blocked && r.blocked.ads) || {};
    const vSurv = (r.vanilla && r.vanilla.adSurvivors) || 0;
    const bSurv = (r.blocked && r.blocked.adSurvivors) || 0;
    const warn = (v.warnings && v.warnings.length)
      ? ` [WARN: ${v.warnings.join('; ')}]` : '';
    return `${tag} ... PASS  ` +
      `vanilla{iss:${va.issued || 0} fin:${va.finished || 0} red:${va.redirected || 0} fail:${va.failed || 0}} ` +
      `blocked{iss:${ba.issued || 0} abt:${ba.aborted || 0} fin:${ba.finished || 0} red:${ba.redirected || 0} fail:${ba.failed || 0}} ` +
      `survivors v:${vSurv}->b:${bSurv}${warn}`;
  }

  if (v.verdict === 'INCONCLUSIVE') {
    return `${tag} ... INCONCLUSIVE  (${v.reasons.join('; ')})`;
  }
  if (v.verdict === 'FAIL') {
    const lines = [`${tag} ... FAIL  (${v.reasons.length})`];
    for (const why of v.reasons) lines.push('  - ' + why);
    return lines.join('\n');
  }
  return `${tag} ... ${v.verdict}`;
}

function summarize(results) {
  const by = { PASS: 0, FAIL: 0, INCONCLUSIVE: 0, ERROR: 0 };
  for (const r of results) {
    if (r.error) by.ERROR++;
    else if (r.verdict) by[r.verdict.verdict] = (by[r.verdict.verdict] || 0) + 1;
  }
  return by;
}

module.exports = { formatResult, summarize };
