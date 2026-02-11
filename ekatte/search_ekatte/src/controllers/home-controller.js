/**
 * @fileoverview Global search and metadata handlers.
 * Provides unified cross-entity searching and lookups for static
 * classifications like altitudes and settlement types.
 */

import { regionModel } from "../models/region-model.js";
import { municipalityModel } from "../models/municipality-model.js";
import { mayoralityModel } from "../models/mayorality-model.js";
import { settlementModel } from "../models/settlement-model.js";
import { sendResponse } from "../utils/response-helper.js";
import { ApiResponse } from "../utils/api-response.js";

/**
 * Route handler for performing a global administrative search across all entity levels.
 * This handler aggregates data from multiple models to provide a comprehensive search result:
 * 1. Executes a paginated search for settlements based on a query string.
 * 2. Fetches total record counts for Regions, Municipalities, Mayoralties, and Settlements.
 * 3. Calculates filtered counts for each entity type to assist with frontend categorization.
 * 4. Extracts the window-calculated total row count for optimized pagination.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {URL} parsedUrl - The parsed request URL containing searchParams (q, sort, page, limit).
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @returns {Promise<void>} Sends a 200 OK response with combined search results and metadata, or a 500 error.
 */
export async function globalSearchHandler(res, parsedUrl, client) {
  const q = parsedUrl.searchParams.get("q")?.trim() ?? "";
  const sort = parsedUrl.searchParams.get("sort")?.trim() ?? "";
  const page = parseInt(parsedUrl.searchParams.get("page")) || 1;
  const limit = parseInt(parsedUrl.searchParams.get("limit")) || 20;
  const offset = (page - 1) * limit;

  try {
    const rows = await settlementModel.getSettlementStats(
      client,
      {
        q,
        sort,
        limit,
        offset,
      },
      "global",
    );

    const [regTotal, munTotal, mayTotal, setTotal] = await Promise.all([
      regionModel.getCount(client),
      municipalityModel.getCount(client),
      mayoralityModel.getCount(client),
      settlementModel.getCount(client),
    ]);

    let filtered;
    if (q) {
      const [regF, munF, mayF, setF] = await Promise.all([
        regionModel.getFilteredCount(client, q),
        municipalityModel.getFilteredCount(client, q),
        mayoralityModel.getFilteredCount(client, q),
        settlementModel.getFilteredCount(client, q),
      ]);
      filtered = { regF, munF, mayF, setF };
    } else {
      filtered = {
        regF: regTotal,
        munF: munTotal,
        mayF: mayTotal,
        setF: setTotal,
      };
    }

    const totalRowsAfterFilter =
      rows.length > 0 ? parseInt(rows[0].total_count) : 0;

    sendResponse(
      res,
      200,
      new ApiResponse({
        ok: true,
        message: "Глобалното търсене е успешно извършено",
        errors: [],
        data: {
          rows: rows,

          regionsCount: regTotal,
          municipalitiesCount: munTotal,
          mayoralitiesCount: mayTotal,
          settlementsCount: setTotal,

          filteredRegionsCount: filtered.regF,
          filteredMunicipalitiesCount: filtered.munF,
          filteredMayoralitiesCount: filtered.mayF,
          filteredSettlementsCount: filtered.setF,

          pagination: {
            total: totalRowsAfterFilter,
            page: page,
            limit: limit,
            totalPages: Math.ceil(totalRowsAfterFilter / limit),
          },
        },
      }),
    );
  } catch (err) {
    sendResponse(res, 500,
      ApiResponse.error(
        "Възникна грешка при обработката на за търсене заявката",
        [err.message],
      ),
    );
  }
}
