import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import './build.mjs';

const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };
const port = Number(process.env.PORT || 4321);
createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url || '/', `http://127.0.0.1:${port}`).pathname);
  const target = join(dist, path, path.endsWith('/') ? 'index.html' : '');
  if (!target.startsWith(dist) || !existsSync(target)) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'content-type': types[extname(target)] || 'application/octet-stream' });
  res.end(readFileSync(target));
}).listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}/`));
