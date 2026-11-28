// Zero-dependency local static HTTP server for development, observability, and Playwright E2E tests.
// Cross-platform replacement for `python3 -m http.server` using Node built-ins only.
// Serves ONLY an explicit allowlist of public browser/documentation assets; blocks dotfiles (.git, .env),
// package manifests, tests, scripts, and any traversal or symlink outside the repository root.
// Run: node tools/static-server.mjs [port]

import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
  '.gz': 'application/gzip',
});

const SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
});

// Strict public static asset allowlist — never expose .git/, .env, package.json, tests/, scripts/, tools/, etc.
const PUBLIC_EXACT_FILES = new Set([
  'index.html',
  'style.css',
  'game.js',
  'service-worker.js',
  'manifest.webmanifest',
  'robots.txt',
  'sitemap.xml',
]);

const PUBLIC_PREFIXES = ['src/', 'icons/', 'blueprint/', 'docs/assets/', 'docs/media/', 'dist/'];

function isPublicRelativePath(posixRel) {
  if (!posixRel || posixRel.startsWith('/') || posixRel.includes('..')) return false;
  const segments = posixRel.split('/');
  // Reject any hidden dotfile or dot-directory segment (.git, .env, .github, .cursor, etc.).
  if (segments.some((seg) => !seg || seg.startsWith('.'))) return false;
  if (PUBLIC_EXACT_FILES.has(posixRel)) return true;
  return PUBLIC_PREFIXES.some((prefix) => posixRel.startsWith(prefix));
}

function formatHostForUrl(h) {
  return h.includes(':') && !h.startsWith('[') ? `[${h}]` : h;
}

const rawPort = Number(process.argv[2] || process.env.PORT || 8000);
const port = Number.isInteger(rawPort) && rawPort > 0 && rawPort <= 65535 ? rawPort : 8000;
const host = process.env.HOST || '127.0.0.1';
const urlHost = formatHostForUrl(host);
const rootDir = await realpath(path.resolve(process.cwd()));

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    res.end('Method Not Allowed');
    return;
  }

  const rawUrl = req.url || '/';
  const rawPathOnly = rawUrl.split('?')[0].split('#')[0];
  if (rawPathOnly.startsWith('//')) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    res.end('Bad Request');
    return;
  }
  let decodedRawPath;
  try {
    decodedRawPath = decodeURIComponent(rawPathOnly);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    res.end('Bad Request');
    return;
  }

  if (decodedRawPath.includes('\0')) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    res.end('Bad Request');
    return;
  }

  // Reject raw backslashes, parent traversal (`..`), or hidden dot-segments BEFORE WHATWG URL normalization can collapse them to `/`.
  if (
    decodedRawPath.includes('\\') ||
    decodedRawPath.split('/').some((seg) => seg === '..' || (seg.length > 0 && seg.startsWith('.')))
  ) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    res.end('Forbidden');
    return;
  }

  let pathname;
  try {
    const url = new URL(rawUrl, `http://${urlHost}:${port}`);
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    res.end('Bad Request');
    return;
  }

  if (pathname === '/healthz') {
    const payload = Buffer.from(
      JSON.stringify({ status: 'ok', service: 'glidiebirdie-static', port }) + '\n',
      'utf8',
    );
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': payload.length,
      'Cache-Control': 'no-store',
      ...SECURITY_HEADERS,
    });
    res.end(req.method === 'HEAD' ? undefined : payload);
    return;
  }

  let relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  if (relativePath.endsWith('/')) relativePath += 'index.html';
  let targetPath = path.resolve(rootDir, relativePath);

  // Prevent directory traversal outside the repository root.
  const relFromRoot = path.relative(rootDir, targetPath);
  const posixRel = relFromRoot.split(path.sep).join('/');
  if (relFromRoot.startsWith('..') || path.isAbsolute(relFromRoot) || !isPublicRelativePath(posixRel)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    res.end('Forbidden');
    return;
  }

  try {
    const info = await stat(targetPath);
    if (info.isDirectory()) {
      targetPath = path.join(targetPath, 'index.html');
    }
    // Enforce realpath containment AND public allowlist after symlink resolution.
    const realTarget = await realpath(targetPath);
    const realRel = path.relative(rootDir, realTarget);
    const realPosixRel = realRel.split(path.sep).join('/');
    if (realRel.startsWith('..') || path.isAbsolute(realRel) || !isPublicRelativePath(realPosixRel)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
      res.end('Forbidden');
      return;
    }
    const body = await readFile(realTarget);
    const ext = path.extname(realTarget).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': body.length,
      'Cache-Control': 'no-cache',
      ...SECURITY_HEADERS,
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
    res.end('Not Found');
  }
});

server.listen(port, host, () => {
  if (host !== '127.0.0.1' && host !== '::1' && host !== 'localhost') {
    console.warn(`Warning: serving public GlidieBirdie assets on non-loopback host ${host}`);
  }
  console.log(`Static server listening at http://${urlHost}:${port}/`);
});
