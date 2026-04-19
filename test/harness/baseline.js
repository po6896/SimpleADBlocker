/*
 * Per-site vanilla baseline.
 *
 * Captured at record time and reused across replays as the stable
 * reference for text / image / scroll thresholds. Falls back gracefully
 * to the in-run vanilla pass when the file doesn't exist yet.
 */
const fs = require('fs');

function loadBaseline(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try { return JSON.parse(fs.readFileSync(filePath, 'utf-8')); }
  catch (_) { return {}; }
}

function saveBaseline(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + '\n');
}

function snapshotMetrics(metrics) {
  return {
    text: metrics.text,
    images: metrics.images,
    scroll: metrics.scroll,
    recordedAt: new Date().toISOString(),
  };
}

module.exports = { loadBaseline, saveBaseline, snapshotMetrics };
