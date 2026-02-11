/**
 * @fileoverview Model for managing municipality data.
 * Interacts with the 'municipality' table and the 'municipality_home_view' for optimized reads.
 */

export const municipalityModel = {
  /**
   * Creates a new municipality record.
   * @async
   * @param {pg.Client} client
   * @param {Object} data
   * @param {string} data.municipality_id
   * @param {string} data.name
   * @param {string} data.transliteration
   * @param {string} data.region_id
   * @returns {Promise<pg.QueryResult>}
   */
  async create(client, { municipality_id, name, transliteration, region_id }) {
    return await client.query(
      `INSERT INTO municipality (municipality_id, name, transliteration, region_id, last_changed_on)
             VALUES ($1, $2, $3, $4, current_timestamp)`,
      [municipality_id, name, transliteration, region_id]
    );
  },

  /**
   * Designates a settlement as the administrative center of a municipality.
   * @async
   * @param {pg.Client} client
   * @param {Object} data
   * @param {string} data.municipality_id
   * @param {string} data.ekatte
   * @returns {Promise<pg.QueryResult>}
   */
  async createCenter(client, { municipality_id, ekatte }) {
    return await client.query(
      `INSERT INTO municipality_center (municipality_id, settlement_ekatte)
             VALUES ($1, $2)`,
      [municipality_id, ekatte]
    );
  },

  /**
   * Updates an existing municipality's core details.
   * @async
   * @param {pg.Client} client
   * @param {string} id
   * @param {Object} data
   * @param {string} data.name
   * @param {string} data.transliteration
   * @param {string} data.region_id
   * @returns {Promise<pg.QueryResult>}
   */
  async update(client, id, { name, transliteration, region_id }) {
    const query = `
            UPDATE municipality 
            SET name = $1,
                transliteration = $2,
                region_id = $3,
                last_changed_on = current_timestamp
            WHERE municipality_id = $4;`;
    return await client.query(query, [name, transliteration, region_id, id]);
  },

  /**
   * Inserts a record into the municipality_center table.
   * @async
   * @param {pg.Client} client
   * @param {string} municipality_id
   * @param {string} ekatte
   * @returns {Promise<pg.QueryResult>}
   */
  async setCenter(client, municipality_id, ekatte) {
    return await client.query(
      "INSERT INTO municipality_center (municipality_id, settlement_ekatte) VALUES ($1, $2)",
      [municipality_id, ekatte]
    );
  },

  /**
   * Removes the association of an administrative center for a specific municipality.
   * @async
   * @param {pg.Client} client
   * @param {string} municipality_id
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteMunicipalityCenter(client, municipality_id) {
    return await client.query(
      "DELETE FROM municipality_center WHERE municipality_id = $1",
      [municipality_id]
    );
  },

  /**
   * Deletes all mayorality center associations within a specific municipality.
   * @async
   * @param {pg.Client} client - The PostgreSQL client instance.
   * @param {string} municipality_id - The municipality ID.
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteMayoralityCenters(client, municipality_id) {
    return await client.query(
      `
            DELETE FROM mayorality_center 
            WHERE mayorality_id IN (
                SELECT mayorality_id FROM mayorality WHERE municipality_id = $1
            )`,
      [municipality_id]
    );
  },

  /**
   * Deletes all region center associations linked to settlements within a specific municipality.
   * @async
   * @param {pg.Client} client - The PostgreSQL client instance.
   * @param {string} municipality_id - The municipality ID.
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteRegionCenters(client, municipality_id) {
    return await client.query(
      `
            DELETE FROM region_center 
            WHERE settlement_ekatte IN (
                SELECT ekatte FROM settlement WHERE municipality_id = $1
            )`,
      [municipality_id]
    );
  },

  /**
   * Deletes all settlement records associated with a specific municipality.
   * @async
   * @param {pg.Client} client - The PostgreSQL client instance.
   * @param {string} municipality_id - The municipality ID.
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteSettlements(client, municipality_id) {
    return await client.query(
      "DELETE FROM settlement WHERE municipality_id = $1",
      [municipality_id]
    );
  },

  /**
   * Deletes all mayorality records associated with a specific municipality.
   * @async
   * @param {pg.Client} client - The PostgreSQL client instance.
   * @param {string} municipality_id - The municipality ID.
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteMayoralities(client, municipality_id) {
    return await client.query(
      "DELETE FROM mayorality WHERE municipality_id = $1",
      [municipality_id]
    );
  },

  /**
   * Deletes the primary municipality record from the database.
   * @async
   * @param {pg.Client} client - The PostgreSQL client instance.
   * @param {string} municipality_id - The municipality ID.
   * @returns {Promise<pg.QueryResult>}
   */
  async deleteRecord(client, municipality_id) {
    return await client.query(
      "DELETE FROM municipality WHERE municipality_id = $1",
      [municipality_id]
    );
  },

  /**
   * Fetches municipalities from the home view filtered by name or transliteration.
   * @async
   * @param {pg.Client} client - The PostgreSQL client instance.
   * @param {string} q - Search query.
   * @returns {Promise<pg.QueryResult>}
   */
  async getFiltered(client, q) {
    return await client.query({
      name: "get_filtered_municipalities",
      text: `
            SELECT *
            FROM municipality_home_view
            WHERE (municipality_name ILIKE $1 || '%' OR municipality_translit ILIKE $1 || '%')
            ORDER BY municipality_name ASC`,
      values: [q],
    });
  },

  /**
   * Retrieves detailed information about a single municipality,
   * including center details and entity counts.
   * @async
   * @param {pg.Client} client
   * @param {string} id - The municipality ID.
   * @returns {Promise<Object>}
   */
  async getInfo(client, id) {
    const query = `
            SELECT 
                m.*,
                r.name AS region_name,
                mc.settlement_ekatte AS center_ekatte,
                (SELECT s_center.name FROM settlement s_center WHERE s_center.ekatte = mc.settlement_ekatte) AS center_name,
                COUNT(DISTINCT s.ekatte) AS settlements_count,
                COUNT(DISTINCT ma.mayorality_id) AS mayoralities_count
            FROM municipality m
            JOIN region r ON m.region_id = r.region_id
            LEFT JOIN municipality_center mc ON mc.municipality_id = m.municipality_id
            LEFT JOIN settlement s ON s.municipality_id = m.municipality_id
            LEFT JOIN mayorality ma ON ma.municipality_id = m.municipality_id
            WHERE m.municipality_id = $1
            GROUP BY m.municipality_id, m.name, r.region_id, r.name, mc.settlement_ekatte`;
    const res = await client.query(query, [id]);
    return res.rows[0];
  },

  /**
   * Gets the total count of municipalities from the home view.
   * @async
   * @param {pg.Client} client
   * @returns {Promise<number>}
   */
  async getCount(client) {
    const res = await client.query(
      "SELECT COUNT(*) AS count FROM municipality_home_view"
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
  async getFilteredCount(client, q, fromDate, toDate, filters={}) {
    const values = [];
    const whereConditions = [];

    if (q) {
      values.push(`${q}%`);
      const idx = values.length;
      whereConditions.push(
        `(municipality_name ILIKE $${idx} OR municipality_translit ILIKE $${idx})`
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
      whereConditions.push(`municipality_last_change >= $${values.length}::date`);
    }
    if (toDate) {
      values.push(toDate);
      whereConditions.push(
        `municipality_last_change < $${values.length}::date + interval '1 day'`
      );
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const res = await client.query({
      text: `SELECT COUNT(*) AS count FROM municipality_home_view ${whereClause}`,
      values: values,
    });

    return parseInt(res.rows[0].count, 10);
  },

  /**
   * Fetches a list of settlements within a municipality that can serve as center candidates.
   * @async
   * @param {pg.Client} client
   * @param {string} q - Search query for settlement name.
   * @param {string} municipality_id
   * @returns {Promise<Array>}
   */
  async getCenterCandidates(client, q, municipality_id) {
    const query = `
            SELECT ekatte AS id, name
            FROM settlement
            WHERE (name ILIKE $1 || '%' OR transliteration ILIKE $1 || '%')
              AND municipality_id = $2
            ORDER BY name LIMIT 10`;
    const res = await client.query(query, [q, municipality_id]);
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
  async getMunicipalityStats(
    client,
    { q, sort, limit, offset, fromDate, toDate, filters }
  ) {
    const values = [];
    const whereConditions = [];

    if (q) {
      values.push(`${q}%`);
      const idx = values.length;
      whereConditions.push(
        `(municipality_name ILIKE $${idx} OR municipality_translit ILIKE $${idx})`
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
      whereConditions.push(
        `municipality_last_change >= $${values.length}::date`
      );
    }
    if (toDate) {
      values.push(toDate);
      whereConditions.push(
        `municipality_last_change < $${values.length}::date + interval '1 day'`
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
                TO_CHAR(municipality_last_change, 'DD-MM-YYYY') AS municipality_last_change,
                COUNT(*) OVER() AS total_count 
            FROM municipality_home_view
            ${whereClause}
            ORDER BY ${orderBy}
            ${pagination}
            `,
      values: values,
    });

    return res.rows;
  },

  /**
   * Fetches all municipalities with their administrative center EKATTE and parent region name.
   * @param {pg.Client} client - The PostgreSQL client instance.
   * @returns {Promise<Object[]>} A promise that resolves to an array of municipality objects.
   */
  async getExportData(client) {
    const query = `
            SELECT 
                mu.MUNICIPALITY_ID AS ID, 
                mu.NAME, 
                mu.TRANSLITERATION,
                mu.region_id,
                mc.SETTLEMENT_EKATTE AS CENTER_EKATTE
            FROM MUNICIPALITY mu
            LEFT JOIN MUNICIPALITY_CENTER mc ON mu.MUNICIPALITY_ID = mc.MUNICIPALITY_ID
            LEFT JOIN REGION r ON mu.REGION_ID = r.REGION_ID
            ORDER BY mu.NAME ASC
        `;
    const res = await client.query(query);
    return res.rows;
  },
};

function getAllowedColumn(col) {
  const allowed = {
    center_ekatte: "center_ekatte",
    center_name: "center_name",
    municipality_id: "municipality_id",
    municipality_name: "municipality_name",
    region_name: "region_name",
    municipality_last_change: "municipality_home_view.municipality_last_change",
  };
  return allowed[col] || null;
}

function buildOrderByClause(sort) {
  if (!sort) return "municipality_name ASC";

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
      .join(", ") || "municipality_name ASC"
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
