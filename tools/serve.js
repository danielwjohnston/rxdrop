/**
 * Zero-dependency static file server for local play: `npm start`.
 * ES modules need a real origin, so opening index.html from the file system
 * will not work - serve the folder instead.
 */
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

const ROOT = resolve(process.argv[3] ?? '.');
const PORT = Number(process.env.PORT ?? process.argv[2] ?? 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const requested = decodeURIComponent(url.pathname);
    const path = join(ROOT, normalize(requested).replace(/^(\.\.[/\\])+/, ''));
    if (!path.startsWith(ROOT + sep) && path !== ROOT) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const target = (await stat(path)).isDirectory() ? join(path, 'index.html') : path;
    const info = await stat(target);
    res.writeHead(200, {
      'content-type': TYPES[extname(target)] ?? 'application/octet-stream',
      'content-length': info.size,
      'cache-control': 'no-cache',
    });
    createReadStream(target).pipe(res);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
  }
}).listen(PORT, () => {
  console.log(`RxDrop is being served at http://localhost:${PORT}`);
});
