import { pool } from "../db.js";
import { authorModel } from "../models/authorModel.js";
import { textModel } from "../models/textModel.js";

/**
 * Orchestrates calls to author and text models
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
export async function getIndexStats(req, res) {
  const client = await pool.connect();
  
  try {
    const [
      totalTexts,
      totalWords,
      totalAuthors,
      processedAuthors,
      rawTexts,
      rawAuthors
    ] = await Promise.all([
      textModel.getCount(client),
      textModel.getUniqueWordsSum(client),
      authorModel.getTotalCount(client),
      authorModel.getProcessedCount(client),
      textModel.getTexts(client),
      authorModel.getTopByUniqueWords(client)
    ]);

    const data = {
      totalTexts: Number(totalTexts),
      totalUniqueWords: Number(totalWords || 0),
      totalAuthors: Number(totalAuthors),
      processedAuthorsCount: Number(processedAuthors),
      texts: rawTexts,
      authors: rawAuthors
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  } catch (err) {
    console.error("Error fetching index info:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  } finally {
    client.release();
  }
}