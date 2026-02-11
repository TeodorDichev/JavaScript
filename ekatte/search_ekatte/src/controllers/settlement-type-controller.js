/**
 * @fileoverview Altitude resource handlers.
 */

import { settlementTypeModel } from "../models/settlement-type-model.js";
import { sendResponse } from "../utils/response-helper.js";

/**
 * Route handler for retrieving the list of settlement types.
 * * Fetches all possible settlement classifications (e.g., "City", "Village") 
 * from the database and maps them to a standardized format for frontend use.
 * * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @returns {Promise<void>} Sends a 200 OK response with the formatted types or a 500 error.
 */
export async function settlementTypeHandler(res, client) {
  try {
    const result = await settlementTypeModel.getAll(client);

    const formattedData = result.rows.map(row => ({
      id: row.settlement_type_id,
      name: row.settlement_type_description
    }));

    sendResponse(res, 200, { data: formattedData });
  } catch (err) {
    sendResponse(res, 500, { 
      message: "Грешка при извличане на типовете населени места", 
      errors: [err.message] 
    });
  }
}