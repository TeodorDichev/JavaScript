import { state } from "./state.js";
import { runFileProcessor } from "../services/processService.js";


/**
 * Process downloaded files
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
export async function handleProcess(req, res) {
  if (state.isImporting) {
    res.writeHead(429, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "В момента тече друг процес." }));
  }

  (async () => {
    try {
      state.isImporting = true;
      await runFileProcessor(); 
      
    } catch (err) {
      console.error("[Reprocess Error]:", err);
    } finally {
      state.isImporting = false;
    }
  })();

  res.writeHead(202, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ success: true, message: "Започна обработка на наличните файлове." }));
}