import { state } from "./state.js";
import { runApiFetch } from "../services/apiFetchService.js";
import { runFileProcessor } from "../services/processService.js";

/**
 * Imports data from the API
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {string} url - params
 */
export async function handleImport(req, res, url) {
  if (state.isImporting) {
    res.writeHead(429, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "В момента тече друг процес." }));
  }

  const count = Number(url.searchParams.get("count")) || 100;

  (async () => {
    try {
      state.isImporting = true;

      await runApiFetch(count);
      await runFileProcessor();
      
    } catch (err) {
      console.error("[Import Error]:", err);
    } finally {
      state.isImporting = false;
    }
  })();

  res.writeHead(202, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ 
    success: true, 
    message: "Започна пълен импорт (изтегляне и анализ)." 
  }));
}