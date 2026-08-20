// servidor estático mínimo com fallback spa: vite preview não serve
// index.html em rotas profundas (f5 em /eventos/x -> 404 no render)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const dist = new URL('./dist', import.meta.url).pathname;
const port = Number(process.env.PORT) || 5173;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    let path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    let file = join(dist, path);

    if (!file.startsWith(dist)) {
      res.writeHead(403).end();
      return;
    }

    // arquivo existe? senão, fallback pra index.html (spa)
    let serveIndex = false;
    try {
      const s = await stat(file);
      if (s.isDirectory()) file = join(file, 'index.html');
    } catch {
      serveIndex = true;
    }
    if (serveIndex) file = join(dist, 'index.html');

    const data = await readFile(file);
    res.writeHead(200, {
      'content-type': mime[extname(file)] ?? 'application/octet-stream',
      // hash no nome dos assets: pode cachear agressivamente
      'cache-control': file.endsWith('index.html')
        ? 'no-cache'
        : 'public, max-age=31536000, immutable',
    });
    res.end(data);
  } catch {
    res.writeHead(500).end('internal error');
  }
}).listen(port, '0.0.0.0', () => {
  console.log(`static spa server on :${port}`);
});
