import { pool } from "../server.js";

export async function searchHandler(req, res, parsedUrl) {
  console.log(parsedUrl);
  const query = parsedUrl.searchParams;
  const q = (query.get("q") || "").toLowerCase(); 

  try {
    const result = await pool.query(
      `
      SELECT 
          s.ekatte AS id,
          s.name AS settlement,
          ma.name AS mayorality,
          mu.name AS municipality,
          r.name AS region
      FROM settlement s
      LEFT JOIN mayorality ma ON s.mayorality_id = ma.mayorality_id
      JOIN municipality mu ON s.municipality_id = mu.municipality_id
      JOIN region r ON mu.region_id = r.region_id
      WHERE 
          $1 = '' OR
          s.ekatte ILIKE '%' || $1 || '%' OR
          s.name ILIKE '%' || $1 || '%' OR
          s.transliteration ILIKE '%' || $1 || '%' OR
          ma.name ILIKE '%' || $1 || '%' OR
          ma.mayorality_id ILIKE '%' || $1 || '%' OR
          ma.transliteration ILIKE '%' || $1 || '%' OR
          mu.municipality_id ILIKE '%' || $1 || '%' OR
          mu.name ILIKE '%' || $1 || '%' OR
          mu.transliteration ILIKE '%' || $1 || '%' OR
          r.name ILIKE '%' || $1 || '%' OR
          r.transliteration ILIKE '%' || $1 || '%' OR
          r.region_id ILIKE '%' || $1 || '%'
      ORDER BY s.name ASC;
      `,
      [q]
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ count: result.rowCount, rows: result.rows }));
  } catch (err) {
    console.error("SQL error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}
