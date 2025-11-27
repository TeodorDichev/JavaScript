export async function searchHandler(res, parsedUrl, dbpool) {
  const q = parsedUrl.searchParams.get("q")?.trim();

  try {
    const settlementsResult = await dbpool.query(
      q ? getSettlementFilteredQuery(q) : getSettlementFullQuery()
    );

    const fullCounts = await Promise.all([
      dbpool.query(getRegionFullCount()),
      dbpool.query(getMunicipalityFullCount()),
      dbpool.query(getMayoralityFullCount()),
      dbpool.query(getSettlementFullCount()),
    ]);

    const filteredCounts = q
      ? await Promise.all([
          dbpool.query(getRegionFilteredCount(q)),
          dbpool.query(getMunicipalityFilteredCount(q)),
          dbpool.query(getMayoralityFilteredCount(q)),
          dbpool.query(getSettlementFilteredCount(q)),
        ])
      : fullCounts;

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        rows: settlementsResult.rows,
        rowsCount: settlementsResult.rowCount,

        regionsCount: fullCounts[0].rows[0].count,
        municipalitiesCount: fullCounts[1].rows[0].count,
        mayoralitiesCount: fullCounts[2].rows[0].count,
        settlementsCount: fullCounts[3].rows[0].count,

        filteredRegionsCount: filteredCounts[0].rows[0].count,
        filteredMunicipalitiesCount: filteredCounts[1].rows[0].count,
        filteredMayoralitiesCount: filteredCounts[2].rows[0].count,
        filteredSettlementsCount: filteredCounts[3].rows[0].count,
      })
    );
  } catch (err) {
    console.error("SQL error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

export function getSettlementFullQuery() {
  return {
    name: "search_settlements_full",
    text: `
      SELECT s.ekatte AS id, s.name AS settlement, ma.name AS mayorality, 
             mu.name AS municipality, r.name AS region
      FROM settlement s
      LEFT JOIN mayorality ma ON s.mayorality_id = ma.mayorality_id
      JOIN municipality mu ON s.municipality_id = mu.municipality_id
      JOIN region r ON mu.region_id = r.region_id
      ORDER BY s.name ASC
    `,
    values: [],
  };
}

export function getSettlementFilteredQuery(q) {
  return {
    name: "search_settlements_filter",
    text: `
      SELECT s.ekatte AS id, s.name AS settlement, ma.name AS mayorality, 
             mu.name AS municipality, r.name AS region
      FROM settlement s
      LEFT JOIN mayorality ma ON s.mayorality_id = ma.mayorality_id
      JOIN municipality mu ON s.municipality_id = mu.municipality_id
      JOIN region r ON mu.region_id = r.region_id
      WHERE s.name ILIKE '%' || $1 || '%' 
         OR s.transliteration ILIKE '%' || $1 || '%'
         OR s.ekatte ILIKE '%' || $1 || '%'
         OR ma.name ILIKE '%' || $1 || '%'
         OR ma.transliteration ILIKE '%' || $1 || '%'
         OR ma.mayorality_id ILIKE '%' || $1 || '%'
         OR mu.name ILIKE '%' || $1 || '%'
         OR mu.transliteration ILIKE '%' || $1 || '%'
         OR mu.municipality_id ILIKE '%' || $1 || '%'
         OR r.name ILIKE '%' || $1 || '%'
         OR r.transliteration ILIKE '%' || $1 || '%'
      ORDER BY s.name ASC
    `,
    values: [q],
  };
}

export function getRegionFullCount() {
  return {
    name: "count_region",
    text: "SELECT COUNT(*) AS count FROM region",
    values: [],
  };
}

export function getRegionFilteredCount(q) {
  return {
    name: "count_region_filter",
    text: `SELECT COUNT(*) AS count FROM region 
           WHERE name ILIKE '%' || $1 || '%' 
              OR transliteration ILIKE '%' || $1 || '%' 
              OR region_id ILIKE '%' || $1 || '%'`,
    values: [q],
  };
}

export function getMunicipalityFullCount() {
  return {
    name: "count_municipality",
    text: "SELECT COUNT(*) AS count FROM municipality",
    values: [],
  };
}

export function getMunicipalityFilteredCount(q) {
  return {
    name: "count_municipality_filter",
    text: `SELECT COUNT(*) AS count FROM municipality 
           WHERE municipality_id ILIKE '%' || $1 || '%' OR
            name ILIKE '%' || $1 || '%' OR
            transliteration ILIKE '%' || $1 || '%'`,
    values: [q],
  };
}

export function getMayoralityFullCount() {
  return {
    name: "count_mayorality",
    text: "SELECT COUNT(*) AS count FROM mayorality",
    values: [],
  };
}

export function getMayoralityFilteredCount(q) {
  return {
    name: "count_mayorality_filter",
    text: `SELECT COUNT(*) AS count FROM mayorality 
          WHERE name ILIKE '%' || $1 || '%' OR
          mayorality_id ILIKE '%' || $1 || '%' OR
          transliteration ILIKE '%' || $1 || '%'`,
    values: [q],
  };
}

export function getSettlementFullCount() {
  return {
    name: "count_settlement",
    text: "SELECT COUNT(*) AS count FROM settlement",
    values: [],
  };
}

export function getSettlementFilteredCount(q) {
  return {
    name: "count_settlement_filter",
    text: `SELECT COUNT(*) AS count FROM settlement 
           WHERE ekatte ILIKE '%' || $1 || '%' OR
            name ILIKE '%' || $1 || '%' OR
            transliteration ILIKE '%' || $1 || '%' OR
            mayorality_id ILIKE '%' || $1 || '%' OR
            municipality_id ILIKE '%' || $1 || '%'`,
    values: [q],
  };
}
