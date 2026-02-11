import http from "http";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { lookup } from "mime-types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname);

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;

  if (pathname === "/") pathname = "/index.html";
  let filePath = path.join(PROJECT_ROOT, "static", pathname);

  try {
    let fileContent;
    let finalPath = filePath;

    try {
      fileContent = await readFile(filePath);
    } catch {
      finalPath = path.join(PROJECT_ROOT, pathname);
      fileContent = await readFile(finalPath);
    }

    const contentType = lookup(finalPath) || "application/octet-stream";
    if (contentType === "text/html") {
      let htmlString = fileContent.toString("utf-8");

      if (htmlString.includes("[[[SIDE_MENU]]]")) {
        try {
          const menuPath = path.join(
            PROJECT_ROOT,
            "static",
            "components",
            "side-menu.html",
          );
          const menuHtml = await readFile(menuPath, "utf-8");

          htmlString = htmlString.replace("[[[SIDE_MENU]]]", menuHtml);
          fileContent = Buffer.from(htmlString, "utf-8");
        } catch (menuErr) {
          console.error(
            "Грешка при зареждане на side-menu.html:",
            menuErr.message,
          );
        }
      }
    }

    res.writeHead(200, {
      "Content-Type": contentType,
    });
    res.end(fileContent);
  } catch (err) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("File not found: " + pathname);
  }
});

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Frontend running on: http://localhost:${PORT}`);
});
