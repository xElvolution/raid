// Single-port preview edge.
//   /v1/*, /health (HTTP + WebSocket) -> API
//   /app/*                             -> Next.js web app (basePath /app)
//   everything else                    -> static marketing site (landing/out)
import { createReadStream, statSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import httpProxy from 'http-proxy';

const PORT = Number(process.env.PORT ?? 8795);
const API = process.env.API_ORIGIN ?? 'http://127.0.0.1:8787';
const WEB = process.env.WEB_ORIGIN ?? 'http://127.0.0.1:3000';
const LANDING_DIR = path.resolve(process.env.LANDING_DIR ?? new URL('../landing/out', import.meta.url).pathname);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain', '.webp': 'image/webp', '.jpg': 'image/jpeg' };

export const target = (url = '/') => {
  if (url.startsWith('/v1/') || url === '/health') return API;
  if (url === '/app' || url.startsWith('/app/') || url.startsWith('/app?')) return WEB;
  return 'static';
};

/** Resolve a URL path to a file inside LANDING_DIR (no traversal), trying .html and index.html. */
export function staticFile(urlPath, dir = LANDING_DIR) {
  const clean = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  const base = path.resolve(dir, '.' + path.posix.normalize(clean));
  if (!base.startsWith(dir)) return null;
  for (const f of [base, `${base}.html`, path.join(base, 'index.html')]) {
    try { if (statSync(f).isFile()) return f; } catch { /* next */ }
  }
  return null;
}

const proxy = httpProxy.createProxyServer({ xfwd: true, ws: true });
proxy.on('error', (_err, _req, res) => {
  if (res && 'writeHead' in res && !res.headersSent) { res.writeHead(502, { 'content-type': 'application/json' }); res.end('{"error":"upstream_unavailable"}'); }
  else res?.destroy?.();
});

const server = http.createServer((req, res) => {
  const t = target(req.url);
  if (t !== 'static') return proxy.web(req, res, { target: t });
  const f = staticFile(req.url ?? '/') ?? staticFile('/404');
  if (!f) { res.writeHead(404); return res.end('not found'); }
  const immutable = (req.url ?? '').startsWith('/_next/static/');
  res.writeHead(f.endsWith('404.html') && !(req.url ?? '').startsWith('/404') ? 404 : 200, {
    'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream',
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=60',
  });
  createReadStream(f).pipe(res);
});
server.on('upgrade', (req, socket, head) => { const t = target(req.url); if (t === 'static') socket.destroy(); else proxy.ws(req, socket, head, { target: t }); });
if (!process.env.NODE_TEST_CONTEXT) server.listen(PORT, process.env.HOST ?? '0.0.0.0', () => console.log(`preview edge on :${PORT} (api ${API}, web ${WEB}, landing ${LANDING_DIR})`));
