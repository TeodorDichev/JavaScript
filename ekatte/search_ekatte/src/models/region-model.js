/**
 * @fileoverview Model for managing region data.
 * Interacts with the 'region' table and the 'region_home_view' for optimized reads.
 */

export const regionModel = {
  /**
   * Creates a new region record.
   * @async
   * @param {pg.Client} client
   * @param {Object} region - Settlement data object.
   * @returns {Promise<pg.QueryResult>}
   */
  async create(client, { region_id, name, transliteration, nuts3_id }) {
    return await client.query(
      `INSERT INTO region (region_id, name, transliteration, nuts3_id, last_changed_on)
             VALUES ($1, $2, $3, $4, current_timestamp)`,
      [region_id, name, transliteration, nuts3_id]
    );
  },

  /**
   * Creates a new region center record.
   * @async
   * @param {pg.Client} client
   * @param {string} region_id
   * @returns {Promise<pg.QueryResult>}
   */
  async createCenter(client, { region_id, ekatte }) {
    return await client.query(
      `INSERT INTO region_center (region_id, settlement_ekatte)
             VALUES ($1, $2)`,
      [region_id, ekatte]
    );
  },

  /**
   * Updates an existing region record.
   * @async
   * @param {pg.Client} client
   * @param {string} ekatte
   * @param {Object} body
   * @returns {Promise<pg.QueryResult>}
   */
  async update(client, id, { name, transliteration, nuts3 }) {
    return await client.query(
      `UPDATE region 
             SET name = $1, 
                 transliteration = $2, 
                 nuts3_id = $3,
                 last_changed_on = current_timestamp 
             WHERE region_id = $4`,
      [name, transliteration, nuts3, id]
    );
  },

  /**
   * Sets a new center to a region
   * @async
   * @param {pg.Client} client
   * @param {string} ekatte
   * @param {string} ekatte
   * @returns {Promise<pg.QueryResult>}
   */
  async setCenter(client, region_id, ekatte) {
    return await client.query(
      "INSERT INTO region_center (region_id, settlement_ekatte) VALUES ($1, $2)",
      [region_id, ekatte]
    );
  },

  /**
   * Deletes region center record.
   * @async
   * @param {pg.Client} client
   * @param {string} region_id
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteRegionCenter(client, region_id) {
    return await client.query(
      "DELETE FROM region_center WHERE region_id = $1",
      [region_id]
    );
  },

  /**
   * Deletes municipality centers in the region.
   * @async
   * @param {pg.Client} client
   * @param {string} region_id
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteMunicipalityCentersByRegion(client, region_id) {
    return await client.query(
      `
            DELETE FROM municipality_center 
            WHERE municipality_id IN (
                SELECT municipality_id FROM municipality WHERE region_id = $1
            )`,
      [region_id]
    );
  },

  /**
   * Deletes mayorality centers in the region.
   * @async
   * @param {pg.Client} client
   * @param {string} region_id
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteMayoralityCentersByRegion(client, region_id) {
    return await client.query(
      `
            DELETE FROM mayorality_center 
            WHERE mayorality_id IN (
                SELECT may.mayorality_id FROM mayorality may
                JOIN municipality mun ON may.municipality_id = mun.municipality_id
                WHERE mun.region_id = $1
            )`,
      [region_id]
    );
  },

  /**
   * Deletes settlements in the region.
   * @async
   * @param {pg.Client} client
   * @param {string} region_id
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteSettlementsByRegion(client, region_id) {
    return await client.query(
      `
            DELETE FROM settlement 
            WHERE municipality_id IN (
                SELECT municipality_id FROM municipality WHERE region_id = $1
            )`,
      [region_id]
    );
  },

  /**
   * Deletes mayoralities in the region.
   * @async
   * @param {pg.Client} client
   * @param {string} region_id
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteMayoralitiesByRegion(client, region_id) {
    return await client.query(
      `
            DELETE FROM mayorality 
            WHERE municipality_id IN (
                SELECT municipality_id FROM municipality WHERE region_id = $1
            )`,
      [region_id]
    );
  },

  /**
   * Deletes municipalities in the region.
   * @async
   * @param {pg.Client} client
   * @param {string} region_id
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteMunicipalitiesByRegion(client, region_id) {
    return await client.query("DELETE FROM municipality WHERE region_id = $1", [
      region_id,
    ]);
  },

  /**
   * Deletes region.
   * @async
   * @param {pg.Client} client
   * @param {string} region_id
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteRecord(client, region_id) {
    return await client.query("DELETE FROM region WHERE region_id = $1", [
      region_id,
    ]);
  },

  /**
   * Retrieves the regions matching the name or transliteration.
   * @async
   * @param {pg.Client} client
   * @param {string} q - The search query string.
   * @returns {Promise<pg.QueryResult>}
   */
  async getFiltered(client, q) {
    return await client.query({
      name: "get_filtered_regions",
      text: `
            SELECT *
            FROM region_home_view
            WHERE (region_name ILIKE $1 || '%' OR region_translit ILIKE $1 || '%')
            ORDER BY region_name ASC`,
      values: [q],
    });
  },

  /**
   * Retrieves the total number of regions in the database.
   * @async
   * @param {pg.Client} client
   * @returns {Promise<number>}
   */
  async getCount(client) {
    const res = await client.query(
      "SELECT COUNT(*) AS count FROM region_home_view"
    );
    return res.rows[0].count;
  },

  /**
     * @async
     * @param {pg.Client} client
     * @param {string} q - Global search string.
     * @param {string|null} fromDate
     * @param {string|null} toDate
     * @param {Object} [filters={}] - Column-specific filters.
     * @returns {Promise<number>}
    */
  async getFilteredCount(client, q, fromDate, toDate, filters = {}) {
    const values = [];
    const whereConditions = [];

    if (q) {
      values.push(`${q}%`);
      const idx = values.length;
      whereConditions.push(
        `(region_name ILIKE $${idx} OR region_translit ILIKE $${idx})`
      );
    }

    if (filters) {
      Object.entries(filters).forEach(([col, val]) => {
        if (val) {
          values.push(`${val}%`);
          const idx = values.length;
          const columnName = getAllowedColumn(col);
          if (columnName) {
            whereConditions.push(`${columnName} ILIKE $${idx}`);
          }
        }
      });
    }

    if (fromDate) {
      values.push(fromDate);
      whereConditions.push(`region_last_change >= $${values.length}::date`);
    }
    if (toDate) {
      values.push(toDate);
      whereConditions.push(
        `region_last_change < $${values.length}::date + interval '1 day'`
      );
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const res = await client.query({
      text: `SELECT COUNT(*) AS count FROM region_home_view ${whereClause}`,
      values: values,
    });

    return parseInt(res.rows[0].count, 10);
  },

  /**
   * Fetches comprehensive details for a single region.
   * @async
   * @param {pg.Client} client
   * @param {string} ekatte
   * @returns {Promise<Object>} Detailed settlement record.
   */
  async getInfo(client, id) {
    const query = `
            SELECT r.*, 
            rc.settlement_ekatte,
            (SELECT s_center.name FROM settlement s_center WHERE s_center.ekatte = rc.settlement_ekatte) AS center_name,
            COUNT(DISTINCT s.ekatte) AS settlements_count,
            COUNT(DISTINCT ma.mayorality_id) AS mayoralities_count,
            COUNT(DISTINCT mu.municipality_id) AS municipalities_count
            FROM region r
            LEFT JOIN region_center rc ON rc.region_id = r.region_id
            LEFT JOIN municipality mu ON mu.region_id = r.region_id
            LEFT JOIN mayorality ma ON ma.municipality_id = mu.municipality_id
            LEFT JOIN settlement s ON s.municipality_id = mu.municipality_id
            WHERE r.region_id = $1
            GROUP BY r.name, r.region_id, rc.settlement_ekatte, r.nuts3_id`;

    const res = await client.query(query, [id]);
    return res.rows[0];
  },

  /**
   * Fetches available centers for the region.
   * @async
   * @param {pg.Client} client
   * @param {string} q - The search string for filtering results.
   * @param {string} region_id
   * @returns {Promise<Object>} Detailed settlement record.
   */
  async getCenterCandidates(client, q, region_id) {
    return await client.query({
      text: `
            SELECT s.ekatte AS id, s.name
            FROM settlement s
            JOIN municipality m ON s.municipality_id = m.municipality_id
            WHERE (s.name ILIKE $1 || '%' OR s.transliteration ILIKE $1 || '%')
            AND m.region_id = $2
            ORDER BY s.name`,
      values: [q, region_id],
    });
  },

  /**
   * @async
   * @param {pg.Client} client
   * @param {Object} params
   * @param {string} params.q - Global search
   * @param {string} [params.sort] - Format "col:dir" (e.g. "region_name:asc").
   * @param {number} params.limit
   * @param {number} params.offset
   * @param {string} [params.fromDate]
   * @param {string} [params.toDate]
   * @param {Object} [params.filters] - Column filters (e.g. { region_name: "Sof" }).
   * @returns {Promise<Array>}
   */
  async getRegionStats(
    client,
    { q, sort, limit, offset, fromDate, toDate, filters }
  ) {
    const values = [];
    const whereConditions = [];

    if (q) {
      values.push(`${q}%`);
      const idx = values.length;
      whereConditions.push(
        `(region_name ILIKE $${idx} OR region_translit ILIKE $${idx})`
      );
    }

    if (filters) {
      Object.entries(filters).forEach(([col, val]) => {
        if (val) {
          values.push(`${val}%`);
          const idx = values.length;
          const columnName = getAllowedColumn(col);
          if (columnName) {
            whereConditions.push(`${columnName} ILIKE $${idx}`);
          }
        }
      });
    }

    if (fromDate) {
      values.push(fromDate);
      whereConditions.push(`region_last_change >= $${values.length}::date`);
    }
    if (toDate) {
      values.push(toDate);
      whereConditions.push(
        `region_last_change < $${values.length}::date + interval '1 day'`
      );
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";
    const orderBy = buildOrderByClause(sort);
    const pagination = buildPaginationClause(limit, offset, values);

    const res = await client.query({
      text: `
                SELECT 
                    *, 
                    TO_CHAR(region_last_change, 'DD-MM-YYYY') AS region_last_change,
                    COUNT(*) OVER() AS total_count 
                FROM region_home_view
                ${whereClause}
                ORDER BY ${orderBy}
                ${pagination}
            `,
      values: values,
    });

    return res.rows;
  },

  /**
   * Fetches all regions with their NUTS3 identifiers and administrative center EKATTE.
   * @param {pg.Client} client - The PostgreSQL client instance.
   * @returns {Promise<Object[]>} A promise that resolves to an array of region objects.
   */
  async getExportData(client) {
    const query = `
            SELECT 
                r.REGION_ID AS ID, 
                r.NAME, 
                r.TRANSLITERATION, 
                r.NUTS3_ID,
                rc.SETTLEMENT_EKATTE AS CENTER_EKATTE
            FROM REGION r
            LEFT JOIN REGION_CENTER rc ON r.REGION_ID = rc.REGION_ID
            ORDER BY r.REGION_ID ASC
        `;
    const res = await client.query(query);
    return res.rows;
  },
};

function getAllowedColumn(col) {
  const allowed = {
    center_ekatte: "center_ekatte",
    center_name: "center_name",
    region_id: "region_id",
    region_name: "region_name",
    nuts3_id: "nuts3_id",
    region_last_change: "region_home_view.region_last_change",
  };
  return allowed[col] || null;
}

function buildOrderByClause(sort) {
  if (!sort) return "region_name ASC";

  return (
    sort
      .split(",")
      .map((part) => {
        const [col, dir] = part.split(":");
        const targetCol = getAllowedColumn(col);
        if (targetCol) {
          return `${targetCol} ${
            dir?.toLowerCase() === "desc" ? "DESC" : "ASC"
          }`;
        }
        return null;
      })
      .filter(Boolean)
      .join(", ") || "region_name ASC"
  );
}

function buildPaginationClause(limit, offset, values) {
  if (limit === null || limit === undefined) return "";

  values.push(limit);
  let clause = `LIMIT $${values.length}`;

  if (offset !== null && offset !== undefined) {
    values.push(offset);
    clause += ` OFFSET $${values.length}`;
  }
  return clause;
}
