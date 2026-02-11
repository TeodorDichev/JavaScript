/**
 * @fileoverview Altitude resource handlers.
 */
import { altitudeModel } from "../models/altitude-model.js";
import { ApiResponse } from "../utils/api-response.js";
import { sendResponse } from "../utils/response-helper.js";

/**
 * Route handler for retrieving all altitude classification levels.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @returns {Promise<void>} Sends a 200 OK response with the altitude data or a 500 Error.
 */
export async function altitudeHandler(res, client) {
  try {
    const response = new ApiResponse({
      ok: true,
      data: await altitudeModel.getAll(client),
      message: "Данните за надморска височина са извлечени успешно",
      errors: [],
    });

    sendResponse(res, 200, response);
  } catch (err) {
    sendResponse(
      res,
      500,
      ApiResponse.error(
        "Възникна грешка при извличане на данните за надморска височина",
        [err.message],
      ),
    );
  }
}
