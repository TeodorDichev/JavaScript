import http from "http";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = __dirname;

const server = http.createServer(async (req, res) => {
  let filePath = path.join(base, req.url === "/" ? "index.html" : req.url);
  try {
    const file = await readFile(filePath);
    res.writeHead(200, { "Content-Type": 'text/html' });
    res.end(file);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

server.listen(8000, () => console.log("Frontend on http://localhost:8000"));
