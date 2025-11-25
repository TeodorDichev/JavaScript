export async function searchHandler(res, parsedUrl, dbpool) {
  const q = parsedUrl.searchParams.get("q")?.trim();

  try {
    let sql = `
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
    `;

    const params = [];
    let name = "search-settlements-noquery";

    if (q) {
      sql += `
        WHERE 
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
      `;
      params.push(q);
      name = "search-settlements"; 
    }

    sql += ` ORDER BY s.name ASC;`;

    const result = await dbpool.query({
      name, 
      text: sql,
      values: params,
    });

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ count: result.rowCount, rows: result.rows }));
  } catch (err) {
    console.error("SQL error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}
