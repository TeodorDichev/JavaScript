import fs from 'fs/promises';
import path from 'path';
import mime from 'mime-types';

export async function handleStaticFile(req, res, url) {
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = path.join(process.cwd(), 'public', pathname);

  try {
    const data = await fs.readFile(filePath);
    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
}