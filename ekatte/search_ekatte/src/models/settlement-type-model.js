/**
 * @fileoverview Model for managing settlement type data.
 */
export const settlementTypeModel = {

  /**
   * Returns all settlement types.
   * @param {pg.Client} client - Database client.
   * @returns {Promise<pg.QueryResult>}
   */
  async getAll(client) {
    return await client.query({
      name: "get_settlement_types",
      text: `
        SELECT settlement_type_id, settlement_type_description 
        FROM settlement_type 
        ORDER BY settlement_type_id
      `,
    });
  }
};