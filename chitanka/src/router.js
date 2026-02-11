import * as IndexController from "./controllers/indexController.js";
import * as AuthorController from "./controllers/authorController.js";
import * as TextController from "./controllers/textController.js";
import * as ApiFetchController from "./controllers/apiFetchController.js";
import * as ProcessController from "./controllers/processController.js";

export async function router(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname === "/index" && req.method === "GET") {
      return await IndexController.getIndexStats(req, res);
    }

    if (pathname.startsWith("/authors") && req.method === "GET") {
      
      const id = url.searchParams.get("id");
      if (id) return await AuthorController.getAuthor(req, res, id);
    }

    if (pathname.startsWith("/texts") && req.method === "GET") {
      // for the future
    }

    if (pathname === "/api-fetch" && req.method === "POST") {
      return await ApiFetchController.handleImport(req, res, url);
    }

    if (pathname === "/process" && req.method === "POST") {
        return await ProcessController.handleProcess(req, res);
    }

  } catch (err) {
    console.error("Router error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
    return true;
  }
}