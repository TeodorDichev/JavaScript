/**
 * @fileoverview Model for managing settlement data.
 * Interacts with the 'settlement' table and the 'settlement_home_view' for optimized reads.
 */

export const settlementModel = {
  /**
   * Creates a new settlement record.
   * @async
   * @param {pg.Client} client
   * @param {Object} settlement - Settlement data object.
   * @returns {Promise<pg.QueryResult>}
   */
  async create(client, settlement) {
    const {
      ekatte,
      name,
      transliteration,
      category,
      altitude_id,
      settlement_type_id,
      mayorality_id,
      municipality_id,
    } = settlement;

    return await client.query(
      `INSERT INTO settlement 
        (ekatte, name, transliteration, settlement_category,
         altitude_id, settlement_type_id, mayorality_id, municipality_id, last_changed_on) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, current_timestamp)`,
      [
        ekatte,
        name,
        transliteration,
        category,
        altitude_id,
        settlement_type_id,
        mayorality_id,
        municipality_id,
      ]
    );
  },

  /**
   * Updates an existing settlement record.
   * @async
   * @param {pg.Client} client
   * @param {string} ekatte
   * @param {Object} body - Settlement data object.
   * @returns {Promise<pg.QueryResult>}
   */
  async update(client, ekatte, body) {
    const {
      name,
      transliteration,
      category,
      altitude_id,
      type_id,
      municipality_id,
      mayorality_id,
    } = body;
    const mId =
      mayorality_id === "" || mayorality_id === undefined
        ? null
        : mayorality_id;

    return await client.query(
      `UPDATE settlement 
         SET name = $1, transliteration = $2, settlement_category = $3, 
             altitude_id = $4, settlement_type_id = $5, 
             municipality_id = $6, mayorality_id = $7,
             last_changed_on = current_timestamp
         WHERE ekatte = $8`,
      [
        name,
        transliteration,
        category,
        altitude_id,
        type_id,
        municipality_id,
        mId,
        ekatte,
      ]
    );
  },

  /**
   * Retrieves the total number of settlements in the database.
   * @async
   * @param {pg.Client} client
   * @returns {Promise<number>}
   */
  async getCount(client) {
    const res = await client.query(
      "SELECT COUNT(*) AS count FROM settlement_home_view"
    );
    return parseInt(res.rows[0].count, 10);
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
      whereConditions.push(buildGlobalSearchClause(idx, "global"));
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
      whereConditions.push(`settlement_last_change >= $${values.length}::date`);
    }
    if (toDate) {
      values.push(toDate);
      whereConditions.push(
        `settlement_last_change < $${values.length}::date + interval '1 day'`
      );
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const query = {
      text: `SELECT COUNT(*) AS count FROM settlement_home_view ${whereClause}`,
      values: values,
    };

    const res = await client.query(query);
    return parseInt(res.rows[0].count, 10);
  },

  /**
   * Fetches comprehensive details for a single settlement.
   * @async
   * @param {pg.Client} client
   * @param {string} ekatte
   * @returns {Promise<Object>} Detailed settlement record.
   */
  async getInfoByEkatte(client, ekatte) {
    const query = `
        SELECT
          s.*, 
          a.altitude_description AS belongs_altitude,
          st.settlement_type_description AS belongs_type_description,
          mu_b.municipality_id AS belongs_municipality_id, mu_b.name AS belongs_municipality_name,
          ma_b.mayorality_id AS belongs_mayorality_id, ma_b.name AS belongs_mayorality_name,
          r_b.region_id AS belongs_region_id, r_b.name AS belongs_region_name,
          r_c.region_id AS center_region_id, r_c.name AS center_region_name,
          mu_c.municipality_id AS center_municipality_id, mu_c.name AS center_municipality_name,
          ma_c.mayorality_id AS center_mayorality_id, ma_c.name AS center_mayorality_name
        FROM settlement s
        LEFT JOIN altitude a ON a.altitude_id = s.altitude_id
        LEFT JOIN settlement_type st ON st.settlement_type_id = s.settlement_type_id
        LEFT JOIN municipality mu_b ON mu_b.municipality_id = s.municipality_id
        LEFT JOIN mayorality ma_b ON ma_b.mayorality_id = s.mayorality_id
        LEFT JOIN region r_b ON r_b.region_id = mu_b.region_id
        LEFT JOIN region_center rc ON rc.settlement_ekatte = s.ekatte
        LEFT JOIN region r_c ON r_c.region_id = rc.region_id
        LEFT JOIN municipality_center mc ON mc.settlement_ekatte = s.ekatte
        LEFT JOIN municipality mu_c ON mu_c.municipality_id = mc.municipality_id
        LEFT JOIN mayorality_center mac ON mac.settlement_ekatte = s.ekatte
        LEFT JOIN mayorality ma_c ON ma_c.mayorality_id = mac.mayorality_id
        WHERE s.ekatte = $1`;
    const res = await client.query(query, [ekatte]);
    return res.rows[0];
  },

  /**
   * @async
   * @param {pg.Client} client
   * @param {Object} params
   * @param {string} params.q - Global search
   * @param {string} [params.sort] - Format "col:dir" (e.g. "ekatte:asc").
   * @param {number} params.limit
   * @param {number} params.offset
   * @param {string} [params.fromDate]
   * @param {string} [params.toDate]
   * @param {Object} [params.filters] - Column filters (e.g. { municipality_name: "Plov" }).
   * @param {string} [searchType='global'] - Scope: 'global' or 'settlement'.
   * @returns {Promise<Array>}
   */
  async getSettlementStats(
    client,
    { q, sort, limit, offset, fromDate, toDate, filters },
    searchType = "global"
  ) {
    const values = [];
    const whereConditions = [];

    if (q) {
      values.push(`${q}%`);
      const idx = values.length;
      whereConditions.push(buildGlobalSearchClause(idx, searchType));
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
      whereConditions.push(`settlement_last_change >= $${values.length}::date`);
    }
    if (toDate) {
      values.push(toDate);
      whereConditions.push(
        `settlement_last_change < $${values.length}::date + interval '1 day'`
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
            SELECT *, 
            TO_CHAR(settlement_last_change, 'DD-MM-YYYY') AS settlement_last_change,
            COUNT(*) OVER() AS total_count 
            FROM settlement_home_view
            ${whereClause}
            ORDER BY ${orderBy}
            ${pagination}`,
      values: values,
    });

    return res.rows;
  },

  /**
   * Deletes all administrative center references for a settlement.
   * @async
   * @param {pg.Client} client
   * @param {string} ekatte
   */
  async clearSettlementCenters(client, ekatte) {
    const queries = [
      "DELETE FROM mayorality_center WHERE settlement_ekatte = $1",
      "DELETE FROM municipality_center WHERE settlement_ekatte = $1",
      "DELETE FROM region_center WHERE settlement_ekatte = $1",
    ];
    for (const sql of queries) {
      await client.query(sql, [ekatte]);
    }
  },

  /**
   * Deletes a settlement.
   * @async
   * @param {pg.Client} client
   * @param {string} ekatte
   */
  async deleteRecord(client, ekatte) {
    return await client.query("DELETE FROM settlement WHERE ekatte = $1", [
      ekatte,
    ]);
  },

  /**
   * Fetches all settlements with their type descriptions, altitudes, and parent names for export.
   * @param {pg.Client} client - The PostgreSQL client instance.
   * @returns {Promise<Object[]>} A promise that resolves to an array of settlement objects.
   */
  async getExportData(client) {
    const query = `
        SELECT 
            s.EKATTE, 
            s.NAME, 
            s.TRANSLITERATION,
            s.SETTLEMENT_CATEGORY AS CATEGORY,
            st.SETTLEMENT_TYPE_DESCRIPTION AS TYPE,
            a.ALTITUDE_DESCRIPTION AS ALTITUDE,
            ma.MAYORALITY_ID AS MAYORALITY_ID,
            mu.MUNICIPALITY_ID AS MUNICIPALITY_ID
        FROM SETTLEMENT s
        JOIN SETTLEMENT_TYPE st ON s.SETTLEMENT_TYPE_ID = st.SETTLEMENT_TYPE_ID
        JOIN ALTITUDE a ON s.ALTITUDE_ID = a.ALTITUDE_ID
        LEFT JOIN MUNICIPALITY mu ON s.MUNICIPALITY_ID = mu.MUNICIPALITY_ID
        LEFT JOIN MAYORALITY ma ON s.MAYORALITY_ID = ma.MAYORALITY_ID
        ORDER BY s.NAME ASC
    `;

    const res = await client.query(query);
    return res.rows;
  },
};

function getAllowedColumn(col) {
  const allowed = {
    ekatte: "ekatte",
    settlement_name: "settlement_name",
    mayorality_name: "mayorality_name",
    municipality_name: "municipality_name",
    region_name: "region_name",
    settlement_last_change: "settlement_home_view.settlement_last_change",
  };
  return allowed[col] || null;
}

function buildGlobalSearchClause(idx, type) {
  if (type === "settlement") {
    return `(settlement_name ILIKE $${idx} OR settlement_translit ILIKE $${idx})`;
  }
  return `(settlement_name ILIKE $${idx} OR settlement_translit ILIKE $${idx}
            OR mayorality_name ILIKE $${idx} OR municipality_name ILIKE $${idx}
            OR region_name ILIKE $${idx})`;
}

function buildOrderByClause(sort) {
  if (!sort) return "settlement_name ASC";

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
      .join(", ") || "settlement_name ASC"
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
