/**
 * @fileoverview Model for managing altitude data.
 */

export const altitudeModel = {

  /**
   * Returns all altitudes.
   * @param {pg.Client} client - Database client.
   * @returns {Promise<pg.QueryResult>}
   */
  async getAll(client) {
    const query = {
      name: "get_altitudes",
      text: `
        SELECT 
          altitude_id AS id, 
          altitude_description AS name
        FROM altitude
        ORDER BY altitude_id
      `,
    };
    const result = await client.query(query);
    return result.rows;
  }
};