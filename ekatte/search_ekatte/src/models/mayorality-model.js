/**
 * @fileoverview Model for managing mayorality data.
 * Interacts with the 'mayorality' table and the 'mayorality_home_view' for optimized reads.
 */

export const mayoralityModel = {
  /**
   * Creates a new mayorality record.
   * @async
   * @param {pg.Client} client
   * @param {Object} data
   * @param {string} data.mayorality_id
   * @param {string} data.name
   * @param {string} data.transliteration
   * @param {string} data.municipality_id
   * @returns {Promise<pg.QueryResult>}
   */
  async create(
    client,
    { mayorality_id, name, transliteration, municipality_id }
  ) {
    return await client.query(
      `INSERT INTO mayorality (mayorality_id, name, transliteration, municipality_id, last_changed_on)
             VALUES ($1, $2, $3, $4, current_timestamp)`,
      [mayorality_id, name, transliteration, municipality_id]
    );
  },

  /**
   * Designates a settlement as the administrative center of a mayorality.
   * @async
   * @param {pg.Client} client
   * @param {Object} data
   * @param {string} data.mayorality_id
   * @param {string} data.ekatte
   * @returns {Promise<pg.QueryResult>}
   */
  async createCenter(client, { mayorality_id, ekatte }) {
    return await client.query(
      `INSERT INTO mayorality_center (mayorality_id, settlement_ekatte)
             VALUES ($1, $2)`,
      [mayorality_id, ekatte]
    );
  },

  /**
   * Updates an existing mayoralities's core details.
   * @async
   * @param {pg.Client} client
   * @param {string} id
   * @param {Object} data
   * @param {string} data.name
   * @param {string} data.transliteration
   * @param {string} data.municipality_id
   * @returns {Promise<pg.QueryResult>}
   */
  async update(client, id, { name, transliteration, municipality_id }) {
    const query = `
            UPDATE mayorality 
            SET name = $1,
                transliteration = $2,
                municipality_id = $3,
                last_changed_on = current_timestamp
            WHERE mayorality_id = $4;`;
    return await client.query(query, [
      name,
      transliteration,
      municipality_id,
      id,
    ]);
  },

  /**
   * Inserts a record into the mayorality_center table.
   * @async
   * @param {pg.Client} client
   * @param {string} mayorality_id
   * @param {string} ekatte
   * @returns {Promise<pg.QueryResult>}
   */
  async setCenter(client, mayorality_id, ekatte) {
    return await client.query(
      "INSERT INTO mayorality_center (mayorality_id, settlement_ekatte) VALUES ($1, $2)",
      [mayorality_id, ekatte]
    );
  },

  /**
   * Removes the association of an administrative center for a specific mayorality.
   * @async
   * @param {pg.Client} client
   * @param {string} mayorality_id
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteCenter(client, mayorality_id) {
    return await client.query(
      "DELETE FROM mayorality_center WHERE mayorality_id = $1",
      [mayorality_id]
    );
  },

  /**
   * Deletes all municipality center associations within a specific settlement in the mayorality.
   * @async
   * @param {pg.Client} client
   * @param {string} mayorality_id
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteMunicipalityCenters(client, mayorality_id) {
    return await client.query(
      `
            DELETE FROM municipality_center 
            WHERE settlement_ekatte IN (
                SELECT ekatte FROM settlement WHERE mayorality_id = $1
            )`,
      [mayorality_id]
    );
  },

  /**
   * Deletes all region center associations within a specific settlement in the mayorality.
   * @async
   * @param {pg.Client} client
   * @param {string} mayorality_id
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteRegionCenters(client, mayorality_id) {
    return await client.query(
      `
            DELETE FROM region_center 
            WHERE settlement_ekatte IN (
                SELECT ekatte FROM settlement WHERE mayorality_id = $1
            )`,
      [mayorality_id]
    );
  },

  /**
   * Deletes all settlements within the mayorality.
   * @async
   * @param {pg.Client} client
   * @param {string} mayorality_id
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteSettlements(client, mayorality_id) {
    return await client.query(
      "DELETE FROM settlement WHERE mayorality_id = $1",
      [mayorality_id]
    );
  },

  /**
   * Deletes the mayorality.
   * @async
   * @param {pg.Client} client
   * @param {string} mayorality_id
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteRecord(client, mayorality_id) {
    return await client.query(
      "DELETE FROM mayorality WHERE mayorality_id = $1",
      [mayorality_id]
    );
  },

  /**
   * Fetches mayoralties from the home view with optional municipality filtering.
   * @async
   * @param {pg.Client} client - The PostgreSQL client instance.
   * @param {string} q - The search query for name or transliteration.
   * @param {string} [municipalityId] - Optional municipality ID to restrict the search scope.
   * @returns {Promise<pg.QueryResult>} The filtered list of mayoralties from the view.
   */
  async getFiltered(client, q, municipalityId = null) {
    const values = [q];
    let whereClause = `(mayorality_name ILIKE $1 || '%' OR mayorality_translit ILIKE $1 || '%')`;

    // If municipalityId is provided, append it to the query and values array
    if (municipalityId) {
      values.push(municipalityId);
      whereClause += ` AND municipality_id = $2`;
    }

    const query = {
      text: `
                SELECT *
                FROM mayorality_home_view
                WHERE ${whereClause}
                ORDER BY mayorality_name ASC`,
      values: values,
    };

    return await client.query(query);
  },

  /**
   * Retrieves detailed information about a single mayorality,
   * including center details and entity counts.
   * @async
   * @param {pg.Client} client
   * @param {string} id - The mayorality ID.
   * @returns {Promise<Object>}
   */
  async getInfo(client, id) {
    const query = `
            SELECT 
                m.*, 
                mu.name AS municipality_name,
                r.region_id AS region_id, 
                r.name AS region_name,
                mc.settlement_ekatte AS center_ekatte,
                (SELECT s.name FROM settlement s WHERE s.ekatte = mc.settlement_ekatte) AS center_name,
                COUNT(s_all.ekatte) AS settlements_count
            FROM mayorality m
            JOIN municipality mu ON m.municipality_id = mu.municipality_id
            JOIN region r ON mu.region_id = r.region_id
            LEFT JOIN mayorality_center mc ON mc.mayorality_id = m.mayorality_id
            LEFT JOIN settlement s_all ON s_all.mayorality_id = m.mayorality_id
            WHERE m.mayorality_id = $1
            GROUP BY m.mayorality_id, m.name, m.transliteration, m.municipality_id, mu.name, r.region_id, r.name, mc.settlement_ekatte`;
    const res = await client.query(query, [id]);
    return res.rows[0];
  },

  /**
   * Gets the total count of mayoralities from the home view.
   * @async
   * @param {pg.Client} client
   * @returns {Promise<number>}
   */
  async getCount(client) {
    const res = await client.query(
      "SELECT COUNT(*) AS count FROM mayorality_home_view"
    );
    return parseInt(res.rows[0].count);
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
        `(mayorality_name ILIKE $${idx} OR mayorality_translit ILIKE $${idx})`
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
      whereConditions.push(`mayorality_last_change >= $${values.length}::date`);
    }
    if (toDate) {
      values.push(toDate);
      whereConditions.push(
        `mayorality_last_change < $${values.length}::date + interval '1 day'`
      );
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const res = await client.query({
      text: `SELECT COUNT(*) AS count FROM mayorality_home_view ${whereClause}`,
      values: values,
    });

    return parseInt(res.rows[0].count, 10);
  },

  /**
   * Fetches a list of settlements within a mayorality that can serve as center candidates.
   * @async
   * @param {pg.Client} client
   * @param {string} q - Search query for settlement name.
   * @param {string} municipality_id
   * @returns {Promise<Array>}
   */
  async getCenterCandidates(client, q, mayoralityId) {
    const query = `
            SELECT ekatte AS id, name
            FROM settlement
            WHERE (name ILIKE $1 || '%' OR transliteration ILIKE $1 || '%')
              AND mayorality_id = $2
            ORDER BY name LIMIT 10`;
    const res = await client.query(query, [q, mayoralityId]);
    return res.rows;
  },

  /**
   * @async
   * @param {pg.Client} client
   * @param {Object} params
   * @param {string} params.q - Global search string.
   * @param {string} [params.sort] - Sort criteria (e.g., "municipality_name:asc").
   * @param {number} params.limit
   * @param {number} params.offset
   * @param {string} [params.fromDate]
   * @param {string} [params.toDate]
   * @param {Object} [params.filters] - Column-specific filters.
   * @returns {Promise<Array>}
   */
  async getMayoralityStats(
    client,
    { q, sort, limit, offset, fromDate, toDate, filters }
  ) {
    const values = [];
    const whereConditions = [];

    if (q) {
      values.push(`${q}%`);
      const idx = values.length;
      whereConditions.push(
        `(mayorality_name ILIKE $${idx} OR mayorality_translit ILIKE $${idx})`
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
      whereConditions.push(`mayorality_last_change >= $${values.length}::date`);
    }
    if (toDate) {
      values.push(toDate);
      whereConditions.push(
        `mayorality_last_change < $${values.length}::date + interval '1 day'`
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
                TO_CHAR(mayorality_last_change, 'DD-MM-YYYY') AS mayorality_last_change,
                COUNT(*) OVER() AS total_count 
            FROM mayorality_home_view
            ${whereClause}
            ORDER BY ${orderBy}
            ${pagination}
            `,
      values: values,
    });

    return res.rows;
  },

  /**
   * Fetches all mayoralities including the EKATTE of their administrative center and parent municipality.
   * @param {pg.Client} client - The PostgreSQL client instance.
   * @returns {Promise<Object[]>} A promise that resolves to an array of mayorality objects.
   */
  async getExportData(client) {
    const query = `
            SELECT 
                ma.MAYORALITY_ID, 
                ma.NAME, 
                ma.TRANSLITERATION,
                ma.MUNICIPALITY_ID,
                MC.SETTLEMENT_EKATTE AS CENTER_EKATTE
            FROM MAYORALITY ma
            LEFT JOIN MAYORALITY_CENTER mc ON ma.MAYORALITY_ID = mc.MAYORALITY_ID
            LEFT JOIN MUNICIPALITY mu ON ma.MUNICIPALITY_ID = mu.MUNICIPALITY_ID
            ORDER BY ma.NAME ASC
        `;
    const res = await client.query(query);
    return res.rows;
  },
};

function getAllowedColumn(col) {
  const allowed = {
    center_ekatte: "center_ekatte",
    center_name: "center_name",
    mayorality_id: "mayorality_id",
    mayorality_name: "mayorality_name",
    municipality_name: "municipality_name",
    region_name: "region_name",
    mayorality_last_change: "mayorality_home_view.mayorality_last_change",
  };
  return allowed[col] || null;
}

function buildOrderByClause(sort) {
  if (!sort) return "mayorality_name ASC";

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
      .join(", ") || "mayorality_name ASC"
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
