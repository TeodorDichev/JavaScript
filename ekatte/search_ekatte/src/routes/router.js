import { searchHandler } from "./search.js";
import { pool } from '../server.js'
import { URL } from "url";

export async function router(req, res, dbpool = pool) {
  const base = `http://${req.headers.host}`;
  const parsedUrl = new URL(req.url, base);
  const pathname = parsedUrl.pathname;

  if (pathname === "/api/search" && req.method === "GET") {
    await searchHandler(res, parsedUrl, dbpool);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
}
