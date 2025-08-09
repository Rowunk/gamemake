#!/usr/bin/env node
/**
 * tools/smoke_headless.js — readable, color-coded headless smoke runner
 *
 * - Serves the PROJECT ROOT so /public/** pages can import /src/** modules.
 * - Colorized, aligned per-case output with inline failure reason.
 * - Summary block at the end with totals and duration.
 * - DOM dumps are DISABLED by default; opt in with:
 *     SMOKE_DEBUG=1 node tools/smoke_headless.js
 *   or
 *     node tools/smoke_headless.js --debug
 *
 * Usage:
 *   node tools/smoke_headless.js
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ------------------------------ config ------------------------------
const ROOT = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const DOC_ROOT = ROOT;                 // serve repo root
const PUB_DIR  = path.join(ROOT, 'public');
const HOST = '127.0.0.1';
const VIRTUAL_TIME_MS = 6000;          // give modules plenty of time

const DEBUG_ENABLED = process.argv.includes('--debug') || process.env.SMOKE_DEBUG === '1';
const DEBUG_DIR = path.join(ROOT, '.smoke-debug');

// ------------------------------ ANSI styling ------------------------------
const ANSI = {
  reset: '\x1b[0m',
  bold:  '\x1b[1m',
  dim:   '\x1b[2m',
  red:   '\x1b[31m',
  green: '\x1b[32m',
  yellow:'\x1b[33m',
  blue:  '\x1b[34m',
  magenta:'\x1b[35m',
  cyan:  '\x1b[36m',
  gray:  '\x1b[90m',
};
const sym = {
  pass: '✅',
  fail: '❌',
  bullet: '→',
  sep: '─',
};

const c = {
  ok:    (s)=>ANSI.green + s + ANSI.reset,
  bad:   (s)=>ANSI.red + s + ANSI.reset,
  warn:  (s)=>ANSI.yellow + s + ANSI.reset,
  dim:   (s)=>ANSI.dim + s + ANSI.reset,
  blue:  (s)=>ANSI.blue + s + ANSI.reset,
  gray:  (s)=>ANSI.gray + s + ANSI.reset,
  bold:  (s)=>ANSI.bold + s + ANSI.reset,
};

// simple pad helpers (ASCII, fine for our labels)
const padEnd = (s, n)=> (s.length >= n ? s : s + ' '.repeat(n - s.length));

// ------------------------------ tiny static server ------------------------------
const MIME = {
  html: 'text/html; charset=utf-8',
  js:   'text/javascript; charset=utf-8',  // valid for ESM
  mjs:  'text/javascript; charset=utf-8',
  css:  'text/css; charset=utf-8',
  json: 'application/json; charset=utf-8',
  svg:  'image/svg+xml',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  ico:  'image/x-icon',
  wasm: 'application/wasm',
  map:  'application/json; charset=utf-8'
};

function serve(req, res) {
  const u = new URL(req.url, `http://${req.headers.host}`);
  let p = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
  if (p === '' || p.endsWith('/')) p += 'index.html';

  const fp = path.normalize(path.join(DOC_ROOT, p));
  try {
    if (!fp.startsWith(DOC_ROOT)) {
      console.log(`${c.gray('[HTTP]')} ${c.bad('403')} ${u.pathname}`);
      res.writeHead(403).end('Forbidden'); return;
    }
    if (!fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
      console.log(`${c.gray('[HTTP]')} ${c.warn('404')} ${u.pathname}`);
      res.writeHead(404).end('Not Found'); return;
    }
    const ext = path.extname(fp).slice(1).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    console.log(`${c.gray('[HTTP]')} ${c.ok('200')} ${u.pathname}`);
    res.writeHead(200, { 'Content-Type': type });
    fs.createReadStream(fp).pipe(res);
  } catch (e) {
    console.log(`${c.gray('[HTTP]')} ${c.bad('500')} ${u.pathname} ${c.dim(`:: ${e && e.message}`)}`);
    res.writeHead(500).end('Internal Server Error');
  }
}

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer(serve);
    srv.listen(0, HOST, () => resolve({ srv, port: srv.address().port }));
  });
}

// ------------------------------ Chrome launcher ------------------------------
const CANDIDATES = os.platform() === 'darwin'
  ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 'google-chrome', 'chromium', 'chromium-browser']
  : ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser', 'chrome'];

function whichChrome() {
  const PATHS = (process.env.PATH || '').split(path.delimiter);
  for (const cand of CANDIDATES) {
    if (cand.startsWith('/')) { if (fs.existsSync(cand)) return cand; continue; }
    for (const dir of PATHS) {
      const fp = path.join(dir, cand);
      if (fs.existsSync(fp)) return fp;
    }
  }
  return null;
}

async function runHeadless(chromeBin, urlStr) {
  return new Promise((resolve) => {
    const args = [
      '--headless=new',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      `--virtual-time-budget=${VIRTUAL_TIME_MS}`,
      '--mute-audio',
      '--enable-unsafe-webgpu', // don’t disable GPU; WebGL2 fallback still works
      '--hide-scrollbars',
      '--dump-dom',
      urlStr
    ];
    const ps = spawn(chromeBin, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let out = '';
    ps.stdout.on('data', d => (out += d.toString()));
    ps.stderr.on('data', d => {
      // Keep error-ish stderr lines visible (CSP/MIME/module resolution)
      const s = d.toString();
      if (s.includes('ERR') || s.toLowerCase().includes('error')) process.stderr.write(s);
    });

    ps.on('close', () => {
      const m = out.match(/id="test-status"[^>]*>([^<]+)</i);
      if (!m) return resolve({ ok: false, pass: 0, fail: 1, why: 'no #test-status found', url: urlStr, dom: out });
      const txt = m[1]; // "... PASS X / FAIL Y"
      const s = /PASS\s+(\d+)\s*\/\s*FAIL\s+(\d+)/i.exec(txt);
      const pass = s ? parseInt(s[1], 10) : 0;
      const fail = s ? parseInt(s[2], 10) : 1;
      resolve({ ok: fail === 0 && pass > 0, pass, fail, txt, url: urlStr, dom: out });
    });
  });
}

// ------------------------------ discovery ------------------------------
async function discoverFromManifest() {
  const manifestPath = path.join(PUB_DIR, 'manifest.js');
  if (!fs.existsSync(manifestPath)) return null;
  try {
    const mod = await import(pathToFileURL(manifestPath).href);
    if (!mod || !Array.isArray(mod.DEMOS)) return null;
    return mod.DEMOS.map(d => ({
      path: String(d.path || '').replace(/^\.\//, ''),
      backends: Array.isArray(d.backends)
        ? d.backends.map(b => String(b).toLowerCase())
        : ['webgpu', 'webgl2']
    }));
  } catch {
    return null;
  }
}

function crawlDemosDir() {
  const demosRoot = path.join(PUB_DIR, 'demos');
  const found = [];
  if (!fs.existsSync(demosRoot)) return found;
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const fp = path.join(dir, name);
      const rel = path.relative(PUB_DIR, fp).split(path.sep).join('/');
      if (fs.statSync(fp).isDirectory()) { walk(fp); continue; }
      if (fp.endsWith('.html')) found.push({ path: rel, backends: ['webgpu', 'webgl2'] });
    }
  })(demosRoot);
  return found;
}

async function discoverCases() {
  const byManifest = await discoverFromManifest();
  if (byManifest && byManifest.length) return byManifest;
  return crawlDemosDir();
}

// ------------------------------ URL build ------------------------------
function buildUrls(port, entries) {
  const mk = p => `http://${HOST}:${port}/public/${p}`;
  const urls = [];
  for (const e of entries) {
    const backends = (e.backends && e.backends.length) ? e.backends : ['webgpu', 'webgl2'];
    for (const be of backends) {
      const expect = be;
      const sep = e.path.includes('?') ? '&' : '?';
      const url = mk(`${e.path}${sep}backend=${be}&expect=${expect}&headless=1`);
      urls.push({ label: `${be} · ${e.path}`, url, be, path: e.path });
    }
  }
  return urls;
}

// ------------------------------ preflight sanity ------------------------------
function sanityCheckFiles() {
  const mustExist = [
    path.join(PUB_DIR, 'lib', 'testkit.js'),
    path.join(PUB_DIR, 'lib', 'harness.js'),
    path.join(ROOT, 'src', 'gfx', 'clearcolor.js'),
  ];
  for (const fp of mustExist) {
    if (!fs.existsSync(fp)) {
      console.error(c.bad(`ERROR: required file missing: ${fp}`));
      process.exit(1);
    }
  }
}

// ------------------------------ main ------------------------------
(async function main() {
  const t0 = Date.now();
  sanityCheckFiles();

  const chrome = whichChrome();
  if (!chrome) {
    console.error(c.bad('ERROR: Chrome/Chromium not found.'), c.dim(`Tried: ${CANDIDATES.join(', ')}`));
    process.exit(1);
  }

  if (DEBUG_ENABLED && !fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });

  const { srv, port } = await startServer();
  const entries = await discoverCases();

  if (!entries.length) {
    srv.close();
    console.error(c.bad('ERROR: No demos discovered (manifest missing and crawl empty).'));
    process.exit(1);
  }

  // Pre-build URLs and compute label column width for alignment
  const cases = buildUrls(port, entries);
  const labelWidth = Math.min(
    80,
    cases.reduce((m, e) => Math.max(m, e.label.length), 0)
  );

  let totalPass = 0, totalFail = 0;
  for (const { label, url } of cases) {
    const r = await runHeadless(chrome, url);
    const status = r.ok ? c.ok(`${sym.pass} PASS`) : c.bad(`${sym.fail} FAIL`);
    const stats  = r.ok
      ? c.dim(`(${r.pass} / ${r.fail})`)
      : c.dim(`(${r.pass} / ${r.fail})`);
    const reason = r.ok ? '' : `  ${c.dim('— ' + (r.why || 'assertion(s) failed'))}`;

    console.log(`${sym.bullet} ${padEnd(label, labelWidth)}  ${status}  ${stats}${reason}`);

    if (r.ok) {
      totalPass += r.pass;
    } else {
      totalFail += r.fail || 1;
      if (DEBUG_ENABLED) {
        const fname = path.join(DEBUG_DIR, label.replace(/[^\w.-]+/g, '_') + '.html');
        try { fs.writeFileSync(fname, r.dom || '', 'utf8'); 
          console.log(c.gray(`    saved: ${path.relative(ROOT, fname)}`));
        } catch {}
      }
    }
  }

  srv.close();

  // Summary
  const durMs = Date.now() - t0;
  const totalCases = cases.length;
  const bar = c.dim(sym.sep.repeat(45));
  console.log('\n' + bar);
  const sumLine =
    `${c.bold('SUMMARY:')} ` +
    `${c.ok(`${totalPass} passed`)} · ` +
    (totalFail ? c.bad(`${totalFail} failed`) : c.ok('0 failed')) +
    ` · ${totalCases} total · ${c.blue(`${durMs} ms`)}`;
  console.log(sumLine);

  if (DEBUG_ENABLED) {
    console.log(c.dim(`(DOM dumps saved under ${path.relative(ROOT, DEBUG_DIR)})`));
  } else {
    console.log(c.dim('(DOM dumps disabled — run with SMOKE_DEBUG=1 or --debug to save)'));
  }

  if (totalFail > 0) {
    process.exit(1);
  } else {
    console.log(c.ok('\nAll smoke tests passed.'));
  }
})();
