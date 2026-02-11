import http from "http";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { router } from "./router.js";
import mime from "mime-types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../public");

const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
    }

    try {
        const handled = await router(req, res);
        
        if (handled) return;

        const url = new URL(req.url, `http://${req.headers.host}`);
        const reqPath = url.pathname;
        
        const filePath = reqPath === "/" 
            ? path.join(publicDir, "index.html") 
            : path.join(publicDir, reqPath);

        const content = await readFile(filePath);
        const contentType = mime.lookup(filePath) || "application/octet-stream";

        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);

    } catch (err) {
        if (err.code === "ENOENT") {
            if (!res.headersSent) {
                res.writeHead(404, { "Content-Type": "text/plain" });
                res.end("404: Not Found");
            }
        } else {
            console.error("[Server Error]:", err);
            if (!res.headersSent) {
                res.writeHead(500, { "Content-Type": "text/plain" });
                res.end("500: Internal Server Error");
            }
        }
    }
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});