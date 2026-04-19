#!/usr/bin/env node
/*
 * Detect `//` line comments outside the ==UserScript== metadata block.
 * Sleipnir Mobile strips newlines before eval, so any `//` in the JS body
 * silently kills everything after it. Metadata block is exempt.
 */
const fs = require('fs');
const path = require('path');

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.error('usage: lint-no-line-comment.js <file.slex.js> [...]');
  process.exit(2);
}

let totalViolations = 0;

for (const target of targets) {
  const abs = path.resolve(target);
  const src = fs.readFileSync(abs, 'utf-8');
  const lines = src.split(/\r?\n/);

  let inMeta = false;
  let metaEnded = false;
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!inMeta && !metaEnded && trimmed.startsWith('// ==UserScript==')) {
      inMeta = true;
      continue;
    }
    if (inMeta && trimmed.startsWith('// ==/UserScript==')) {
      inMeta = false;
      metaEnded = true;
      continue;
    }
    if (inMeta) continue;

    /* scan for // outside of strings / regex / block-comments */
    if (hasLineComment(line)) {
      violations.push({ line: i + 1, text: line.trimEnd() });
    }
  }

  if (violations.length) {
    console.error(`\n[FAIL] ${target}: ${violations.length} line-comment violation(s)`);
    for (const v of violations.slice(0, 20)) {
      console.error(`  L${v.line}: ${v.text}`);
    }
    if (violations.length > 20) {
      console.error(`  ... and ${violations.length - 20} more`);
    }
    totalViolations += violations.length;
  } else {
    console.log(`[PASS] ${target}`);
  }
}

if (totalViolations > 0) {
  console.error(`\nTotal violations: ${totalViolations}`);
  console.error('Sleipnir strips newlines before eval; // kills the rest of the file.');
  console.error('Use /* ... */ block comments instead.');
  process.exit(1);
}

function hasLineComment(line) {
  let i = 0;
  const n = line.length;
  let inStr = null; /* "'` */
  let inBlock = false;
  let inRegex = false;
  let prevNonSpace = '';

  while (i < n) {
    const c = line[i];
    const c2 = line[i + 1];

    if (inBlock) {
      if (c === '*' && c2 === '/') { inBlock = false; i += 2; continue; }
      i++;
      continue;
    }
    if (inStr) {
      if (c === '\\') { i += 2; continue; }
      if (c === inStr) { inStr = null; }
      i++;
      continue;
    }
    if (inRegex) {
      if (c === '\\') { i += 2; continue; }
      if (c === '/') { inRegex = false; }
      i++;
      continue;
    }

    if (c === '/' && c2 === '*') { inBlock = true; i += 2; continue; }
    if (c === '/' && c2 === '/') { return true; }
    if (c === '"' || c === "'" || c === '`') { inStr = c; i++; continue; }
    if (c === '/' && /[=(,;:!&|?{}\[\]\n]/.test(prevNonSpace || '(')) {
      inRegex = true; i++; continue;
    }
    if (!/\s/.test(c)) prevNonSpace = c;
    i++;
  }
  return false;
}
