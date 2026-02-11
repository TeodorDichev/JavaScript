import { pool } from "../db.js";
import { authorModel } from "../models/authorModel.js";

/**
 * Fetches a specific author by ID.
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 * @param {string|number} id
 */
export async function getAuthor(req, res, id) {
  const client = await pool.connect();
  try {
    const author = await authorModel.getById(client, id);

    if (!author) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Author not found" }));
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(author));
  } catch (err) {
    console.error(`Error fetching author ${id}:`, err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  } finally {
    client.release();
  }
}