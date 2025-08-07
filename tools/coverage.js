#!/usr/bin/env node
/**
 * tools/coverage.js
 * Aggregates V8 coverage JSON (from NODE_V8_COVERAGE) and enforces a threshold.
 * Zero dependencies; approximates "line coverage" by intersecting executed ranges
 * with lines that contain code tokens (ignoring whitespace and comments).
 *
 * Usage: node tools/coverage.js .v8-coverage 95
 */

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const [,, covDir = '.v8-coverage', thresholdArg = '95'] = process.argv;
const THRESHOLD = Number(thresholdArg);

// ---- utilities --------------------------------------------------------------

function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

function* jsonFiles(dir) {
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith('.json')) yield path.join(dir, f);
  }
}

function toFilePath(maybeUrl) {
  // V8 coverage uses file:// URLs for local scripts
  try {
    if (maybeUrl.startsWith('file://')) return url.fileURLToPath(maybeUrl);
  } catch {}
  return maybeUrl;
}

// Build an index: starting char offset of each line
function lineStartsOf(source) {
  const starts = [0];
  for (let i = 0; i < source.length; ++i) {
    if (source.charCodeAt(i) === 10 /* \n */) starts.push(i + 1);
  }
  return starts;
}

function offsetToLine(lineStarts, offset) {
  // binary search greatest index <= offset
  let lo = 0, hi = lineStarts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lineStarts[mid] <= offset) lo = mid + 1; else hi = mid - 1;
  }
  return Math.max(0, lo - 1);
}

// Determine which lines are "code lines" (non-empty, not wholly commented out)
// We do a single pass, tracking /* */ and // while respecting string literals.
function codeLineMask(source) {
  const mask = [];
  let inBlock = false, inLine = false, inStr = false, strCh = '';
  let sawCodeOnLine = false, escaped = false;

  for (let i = 0; i < source.length; ++i) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === '\n') {
      mask.push(sawCodeOnLine);
      inLine = false;
      sawCodeOnLine = false;
      escaped = false;
      continue;
    }

    if (inLine) continue;

    if (inStr) {
      if (ch === '\\' && !escaped) { escaped = true; continue; }
      if (ch === strCh && !escaped) { inStr = false; strCh = ''; }
      escaped = false;
      continue;
    }

    if (inBlock) {
      if (ch === '*' && next === '/') { inBlock = false; i++; }
      continue;
    }

    // not in string/comment
    if (ch === '/' && next === '/') { inLine = true; i++; continue; }
    if (ch === '/' && next === '*') { inBlock = true; i++; continue; }
    if (ch === '"' || ch === '\'' || ch === '`') { inStr = true; strCh = ch; continue; }

    if (!/\s/.test(ch)) sawCodeOnLine = true;
  }
  // last line (if file doesn’t end with \n)
  if (source.length && source.at(-1) !== '\n') mask.push(sawCodeOnLine);
  return mask;
}

// ---- aggregation ------------------------------------------------------------

function mergeRanges(functions) {
  // Flatten all executed ranges (count > 0)
  const ranges = [];
  for (const f of functions) {
    for (const r of f.ranges) if (r.count > 0) ranges.push([r.startOffset, r.endOffset]);
  }
  if (ranges.length === 0) return [];

  // Sort and coalesce
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [ranges[0]];
  for (let i = 1; i < ranges.length; ++i) {
    const last = merged[merged.length - 1];
    const cur = ranges[i];
    if (cur[0] <= last[1]) { last[1] = Math.max(last[1], cur[1]); }
    else merged.push(cur);
  }
  return merged;
}

function coveredLinesFromRanges(lineStarts, mergedRanges) {
  const covered = new Set();
  for (const [start, end] of mergedRanges) {
    const a = offsetToLine(lineStarts, Math.max(0, start));
    const b = offsetToLine(lineStarts, Math.max(0, end - 1)); // end is exclusive
    for (let L = a; L <= b; ++L) covered.add(L);
  }
  return covered;
}

function aggregate(covDir) {
  /** @type {Map<string, {covered:Set<number>, codeMask:boolean[], lineStarts:number[]}>} */
  const files = new Map();

  for (const jf of jsonFiles(covDir)) {
    const data = readJson(jf);
    for (const res of data.result || []) {
      const file = toFilePath(res.url);
      // only consider project sources (adjust as needed)
      if (!file || !file.includes(`${path.sep}src${path.sep}`)) continue;

      let entry = files.get(file);
      if (!entry) {
        const src = fs.readFileSync(file, 'utf8');
        entry = {
          covered: new Set(),
          codeMask: codeLineMask(src),
          lineStarts: lineStartsOf(src)
        };
        files.set(file, entry);
      }

      const merged = mergeRanges(res.functions || []);
      const covered = coveredLinesFromRanges(entry.lineStarts, merged);
      for (const L of covered) entry.covered.add(L);
    }
  }

  // Compute per-file and global metrics
  let totalCode = 0, totalCovered = 0;
  const perFile = [];
  for (const [file, { codeMask, covered }] of files) {
    const codeLines = codeMask.reduce((acc, isCode, idx) => isCode ? acc.concat(idx) : acc, []);
    const coveredCount = codeLines.filter(L => covered.has(L)).length;
    const pct = codeLines.length ? (coveredCount / codeLines.length) * 100 : 100;
    perFile.push({ file, code: codeLines.length, covered: coveredCount, pct });
    totalCode += codeLines.length;
    totalCovered += coveredCount;
  }

  perFile.sort((a, b) => a.file.localeCompare(b.file));
  const totalPct = totalCode ? (totalCovered / totalCode) * 100 : 100;
  return { perFile, totalPct };
}

// ---- run --------------------------------------------------------------------

if (!fs.existsSync(covDir)) {
  console.error(`Coverage directory not found: ${covDir}`);
  process.exit(2);
}

const { perFile, totalPct } = aggregate(covDir);
for (const { file, code, covered, pct } of perFile) {
  console.log(`${file}\n  code lines: ${code}, covered: ${covered}, pct: ${pct.toFixed(2)}%`);
}
console.log(`\nTOTAL LINE COVERAGE: ${totalPct.toFixed(2)}% (threshold ${THRESHOLD}%)`);

if (totalPct + 1e-9 < THRESHOLD) {
  console.error(`\nCoverage ${totalPct.toFixed(2)}% < ${THRESHOLD}%`);
  process.exit(1);
}
