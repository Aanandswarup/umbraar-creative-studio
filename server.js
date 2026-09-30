#!/usr/bin/env node
/**
 * UMBRA® — zero-dependency static server.
 *
 * Why this exists: the site itself has no build step and no npm dependencies.
 * This file is only here so you can serve it over http:// (modules, fonts and
 * range requests behave predictably) instead of opening index.html from disk.
 *
 *   node server.js [port]
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.argv[2] || process.env.PORT || 4321);
const HOST = '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function send(res, status, headers, body) {
  res.writeHead(status, headers);
  if (body === undefined) res.end();
  else res.end(body);
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    pathname = '/';
  }

  if (pathname.endsWith('/')) pathname += 'index.html';

  // Resolve inside ROOT only — no path traversal.
  const filePath = path.join(ROOT, path.normalize(pathname));
  if (!filePath.startsWith(ROOT)) return send(res, 403, { 'Content-Type': 'text/plain' }, 'Forbidden');

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA-ish fallback: unknown paths that are not files get index.html.
      if (!path.extname(filePath)) {
        return fs.readFile(path.join(ROOT, 'index.html'), (e2, buf) => {
          if (e2) return send(res, 404, { 'Content-Type': 'text/plain' }, 'Not found');
          send(res, 200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' }, buf);
        });
      }
      return send(res, 404, { 'Content-Type': 'text/plain' }, 'Not found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = TYPES[ext] || 'application/octet-stream';
    const headers = {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'Accept-Ranges': 'bytes',
    };

    const range = req.headers.range;
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
      if (m) {
        const start = m[1] ? parseInt(m[1], 10) : 0;
        const end = m[2] ? parseInt(m[2], 10) : stat.size - 1;
        if (start <= end && end < stat.size) {
          headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
          headers['Content-Length'] = end - start + 1;
          res.writeHead(206, headers);
          return fs.createReadStream(filePath, { start, end }).pipe(res);
        }
        return send(res, 416, { 'Content-Range': `bytes */${stat.size}` });
      }
    }

    headers['Content-Length'] = stat.size;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`UMBRA® dev server → http://${HOST}:${PORT}/\n`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    process.stderr.write(`Port ${PORT} is already in use. Try: node server.js ${PORT + 1}\n`);
    process.exit(1);
  }
  throw err;
});
