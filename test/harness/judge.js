/*
 * Verdict logic for a single corpus entry.
 *
 * 4-state model:
 *   PASS         all ad-block checks cleared, enough ads served to be sure
 *   FAIL         ad survived, must_survive missing, or body shrank too much
 *   INCONCLUSIVE ads_present site but HAR replay served < MIN ad requests
 *   ERROR        runtime failure (handled in runOne)
 *
 * CLS warnings are informational only — never downgrade a PASS to FAIL,
 * since a blocker that removes inline ads will always cause some shift.
 * We attribute CLS only to ad-like sources to avoid drowning in content
 * reflow noise.
 */
const MIN_AD_REQUESTS_FOR_CONCLUSIVE = 3;
const DYNAMIC_BASELINE_RATIO = 0.85;
const CLS_WARN = 0.1;

function isAdLikeSource(src) {
  const tag = (src.tag || '').toUpperCase();
  const id = src.id || '';
  const cls = src.cls || '';
  if (tag === 'IFRAME' || tag === 'INS') return true;
  if (/^(ad|ads|yads_|div-gpt-ad|google_ads_|ezoic-)/i.test(id)) return true;
  if (/(^|\s)(ad|ads|adsbygoogle|advertis)/i.test(cls)) return true;
  return false;
}

function computeAdCls(clsEntries) {
  let total = 0;
  for (const e of (clsEntries || [])) {
    const adSrc = (e.sources || []).some(isAdLikeSource);
    if (adSrc) total += e.v;
  }
  return total;
}

function judge(entry, vanilla, blocked, baseline) {
  const failures = [];

  for (const hit of blocked.blockedHits) {
    if (hit.visible > 0) {
      failures.push(`ad still visible: ${hit.selector} (${hit.visible})`);
    }
  }
  for (const hit of blocked.surviveHits) {
    if (hit.total === 0 || hit.visible === 0) {
      failures.push(`must_survive missing: ${hit.selector}`);
    }
  }

  /* Baseline wins over in-run vanilla when available — stable across replays. */
  const src = baseline || vanilla;
  const srcKind = baseline ? 'baseline' : 'vanilla';
  const ratios = {
    text: src.text ? blocked.text / src.text : 1,
    images: src.images ? blocked.images / src.images : 1,
    scroll: src.scroll ? blocked.scroll / src.scroll : 1,
  };
  const legacy = entry.body_min_ratio;
  const threshold = legacy || {
    text: DYNAMIC_BASELINE_RATIO,
    images: DYNAMIC_BASELINE_RATIO,
    scroll: DYNAMIC_BASELINE_RATIO,
  };
  for (const k of ['text', 'images', 'scroll']) {
    if (ratios[k] < threshold[k]) {
      failures.push(
        `body ${k} ${(ratios[k] * 100).toFixed(1)}% of ${srcKind} ` +
        `(threshold ${(threshold[k] * 100).toFixed(0)}%)`
      );
    }
  }

  const warnings = [];
  const adCls = computeAdCls(blocked.clsTop);
  if (adCls > CLS_WARN) {
    warnings.push(`ad-CLS ${adCls.toFixed(3)} (> ${CLS_WARN}); check empty ad shells`);
  }

  const vanillaAdReq = vanilla.adRequests || 0;
  const blockedAdReq = blocked.adRequests || 0;
  const adRequests = { vanilla: vanillaAdReq, blocked: blockedAdReq };

  if (entry.group === 'ads_present' && vanillaAdReq < MIN_AD_REQUESTS_FOR_CONCLUSIVE) {
    return {
      verdict: 'INCONCLUSIVE',
      reasons: [`vanilla ad-server requests = ${vanillaAdReq} (need >= ${MIN_AD_REQUESTS_FOR_CONCLUSIVE})`],
      failures, ratios, warnings, adRequests,
    };
  }
  if (failures.length > 0) {
    return { verdict: 'FAIL', reasons: failures, ratios, warnings, adRequests };
  }
  return { verdict: 'PASS', reasons: [], ratios, warnings, adRequests };
}

module.exports = {
  MIN_AD_REQUESTS_FOR_CONCLUSIVE,
  DYNAMIC_BASELINE_RATIO,
  CLS_WARN,
  judge,
  isAdLikeSource,
};
