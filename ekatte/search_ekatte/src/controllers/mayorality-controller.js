/**
 * @fileoverview Mayorality resource handlers.
 * Coordinates local administration records and their links to specific
 * center settlements.
 */
import { PassThrough } from "stream";
import ExcelJS from "exceljs";
import * as validation from "../utils/validation.js";
import { mayoralityModel } from "../models/mayorality-model.js";
import { settlementModel } from "../models/settlement-model.js";
import { sendResponse } from "../utils/response-helper.js";
import { calculateStats, formatNullValues } from "../utils/export-helper.js";
import { ApiResponse } from "../utils/api-response.js";

/**
 * Route handler to create a new Mayorality along with its initial administrative center settlement.
 * Uses a database transaction to ensure both the mayorality and its center are created atomically.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @param {Object} bodyData - The request body containing mayorality and center details.
 * @returns {Promise<void>}
 */
export async function createMayoralityHandler(res, client, bodyData) {
  const { mayorality, center } = bodyData;
  const errors = [];

  try {
    if (!center || !mayorality) errors.push("Липсващи данни");
    if (!validation.checkEkatteFormat(center?.ekatte))
      errors.push("Невалиден формат на ekatte");
    if (await validation.checkSettlementExists(client, center?.ekatte))
      errors.push("Вече съществува такова селище");
    if (
      await validation.checkMayoralityExists(client, mayorality?.mayorality_id)
    )
      errors.push("Вече има такова кметство");
    if (!validation.checkIsOnlyAlphabetical(center?.name))
      errors.push("Невалидно име");
    if (!validation.checkIsOnlyAlphabetical(center?.translit))
      errors.push("Невалиден превод");

    if (errors.length > 0) {
      return sendResponse(
        res,
        400,
        ApiResponse.error("Валидационна грешка", errors),
      );
    }

    await client.query("BEGIN");
    await mayoralityModel.create(client, mayorality);
    await settlementModel.create(client, center);
    await mayoralityModel.createCenter(client, center);
    await client.query("COMMIT");

    sendResponse(
      res,
      201,
      ApiResponse.success("Успешно създадено кметство и център"),
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    sendResponse(res, 500, ApiResponse.error("Грешка при създаване", [err]));
  }
}

/**
 * Route handler to delete a Mayorality and all its associated dependencies.
 * Performs a cascaded cleanup of administrative centers (municipality/region) and settlements within a transaction.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {URL} parsedUrl - The parsed request URL containing the 'id' search parameter.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @returns {Promise<void>}
 */
export async function deleteMayoralityHandler(res, parsedUrl, client) {
  const id = parsedUrl.searchParams.get("id")?.trim() ?? "";

  if (!validation.checkMayoralityCodeFormat(id)) {
    return sendResponse(
      res,
      400,
      ApiResponse.error("Валидационна грешка", ["Невалиден код на кметство"]),
    );
  }

  try {
    await client.query("BEGIN");
    await mayoralityModel.deleteCenter(client, id);
    await mayoralityModel.deleteMunicipalityCenters(client, id);
    await mayoralityModel.deleteRegionCenters(client, id);
    await mayoralityModel.deleteSettlements(client, id);

    const result = await mayoralityModel.deleteRecord(client, id);

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return sendResponse(
        res,
        404,
        ApiResponse.error("Обектът не съществува", [
          "Кметството не е намерено",
        ]),
      );
    }

    await client.query("COMMIT");
    sendResponse(
      res,
      200,
      ApiResponse.success(null, "Успешно изтрито кметство и свързани данни"),
    );
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    sendResponse(
      res,
      500,
      ApiResponse.error("Грешка при изтриване", [err.message]),
    );
  }
}

/**
 * Route handler to update Mayorality details and its designated administrative center.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {URL} parsedUrl - The parsed request URL used to extract the mayorality ID from the path.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @param {Object} bodyData - Updated mayorality data including optional center_id.
 * @returns {Promise<void>}
 */
export async function editMayoralityHandler(res, parsedUrl, client, bodyData) {
  const id = parsedUrl.pathname.split("/").pop();
  const errors = [];

  if (!validation.checkMayoralityCodeFormat(id))
    errors.push("Невалиден код на кметство");
  if (errors.length > 0)
    return sendResponse(
      res,
      400,
      ApiResponse.error("Валидационна грешка", errors),
    );

  try {
    await client.query("BEGIN");
    await mayoralityModel.update(client, id, bodyData);
    await mayoralityModel.deleteCenter(client, id);
    if (bodyData.center_id) {
      await mayoralityModel.setCenter(client, id, bodyData.center_id);
    }
    await client.query("COMMIT");

    sendResponse(res, 200, ApiResponse.success(null, "Успешна редакция"));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    sendResponse(
      res,
      500,
      ApiResponse.error("Грешка при редакцията", [err.message]),
    );
  }
}

/**
 * Route handler for autocomplete/dropdown search for Mayoralties.
 * Supports optional filtering by a specific parent municipality.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {URL} parsedUrl - The parsed request URL containing query (q) and optional municipalityId parameters.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @returns {Promise<void>}
 */
export async function searchMayoralityHandler(res, parsedUrl, client) {
  const q = parsedUrl.searchParams.get("q")?.trim() ?? "";
  const muId = parsedUrl.searchParams.get("municipalityId")?.trim() ?? "";

  try {
    const result = await mayoralityModel.getFiltered(client, q, muId);

    const formatted = result.rows.slice(0, 10).map((row) => ({
      id: row.mayorality_id,
      name: `${row.mayorality_name}, ${row.municipality_name}, ${row.region_name}`,
      municipalityId: row.municipality_id,
      municipalityName: `${row.municipality_name}, ${row.region_name}`,
      regionName: row.region_name,
    }));

    sendResponse(res, 200, ApiResponse.success(formatted));
  } catch (err) {
    sendResponse(
      res,
      500,
      ApiResponse.error("Грешка при търсене", [err.message]),
    );
  }
}

/**
 * Route handler to retrieve comprehensive details for a specific Mayorality.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {URL} parsedUrl - The parsed request URL containing the mayorality ID in the 'q' parameter.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @returns {Promise<void>}
 */
export async function infoMayoralityHandler(res, parsedUrl, client) {
  const id = parsedUrl.searchParams.get("q")?.trim() ?? "";

  try {
    const data = await mayoralityModel.getInfo(client, id);
    sendResponse(res, 200, ApiResponse.success(data));
  } catch (err) {
    sendResponse(
      res,
      500,
      ApiResponse.error("Грешка при извличането на детайли", [err.message]),
    );
  }
}

/**
 * Route handler to fetch a list of settlements within a specific Mayorality that can serve as its administrative center.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {URL} parsedUrl - The parsed request URL containing search string (q) and mayorality ID (id).
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @returns {Promise<void>}
 */
export async function mayoralityCenterCandidatesHandler(
  res,
  parsedUrl,
  client,
) {
  const q = parsedUrl.searchParams.get("q")?.trim() ?? "";
  const id = parsedUrl.searchParams.get("id")?.trim() ?? "";
  try {
    const data = await mayoralityModel.getCenterCandidates(client, q, id);
    sendResponse(res, 200, ApiResponse.success(data));
  } catch (err) {
    sendResponse(
      res,
      500,
      ApiResponse.error("Грешка при кандидати", [err.message]),
    );
  }
}

/**
 * Route handler for the Mayorality home page.
 * Fetches paginated, sorted, and filtered statistics using window functions for total row counts.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {URL} parsedUrl - The parsed request URL containing pagination (page, limit), sort, and search (q) parameters.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @returns {Promise<void>}
 */
export async function homeMayoralityHandler(res, parsedUrl, client) {
  const { q, sort, fromDate, toDate, filters } = getMayoralityParams(parsedUrl);
  const page = parseInt(parsedUrl.searchParams.get("page")) || 1;
  const limit = parseInt(parsedUrl.searchParams.get("limit")) || 20;
  const offset = (page - 1) * limit;

  try {
    const rows = await mayoralityModel.getMayoralityStats(client, {
      q,
      sort,
      limit,
      offset,
      fromDate,
      toDate,
      filters,
    });

    const totalCount = await mayoralityModel.getCount(client);
    const totalRowsAfterFilter =
      rows.length > 0 ? parseInt(rows[0].total_count) : 0;

    const apiRes = new ApiResponse({
      ok: true,
      data: {
        rows,
        totalCount,
        pagination: {
          total: totalRowsAfterFilter,
          page,
          limit,
          totalPages: Math.ceil(totalRowsAfterFilter / limit),
        },
      },
    });

    sendResponse(res, 200, apiRes);
  } catch (err) {
    sendResponse(
      res,
      500,
      ApiResponse.error("Грешка при зареждане", [err.message]),
    );
  }
}

/**
 * Generates a single Excel file for mayoralities.
 * @param {Object} res - Express response object.
 * @param {URL} parsedUrl - The parsed request URL with q, sort, page, and limit parameters.
 * @param {pg.Client} client - The PostgreSQL client instance.
 * @returns {Promise<void>}
 */

export async function exportExcelMayoralityHandler(res, parsedUrl, client) {
  const start = performance.now();
  const startUsage = process.cpuUsage();
  const params = getMayoralityParams(parsedUrl);

  try {
    const stream = new PassThrough();
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: stream,
      useStyles: true,
      useSharedStrings: true,
    });

    const sheet = workbook.addWorksheet("Mayoralities");
    sheet.columns = [
      { key: "center_ekatte", header: "Ekatte", width: 15 },
      { key: "center_name", header: "Име на център", width: 25 },
      { key: "mayorality_id", header: "Код на кметство", width: 15 },
      { key: "mayorality_name", header: "Име на кметство", width: 25 },
      { key: "municipality_name", header: "Община", width: 20 },
      { key: "region_name", header: "Област", width: 20 },
      { key: "mayorality_last_change", header: "Промяна", width: 20 },
    ];

    let offset = 0;
    const BATCH_SIZE = 1000;
    let hasMore = true;

    while (hasMore) {
      const chunk = await mayoralityModel.getMayoralityStats(client, {
        ...params,
        limit: BATCH_SIZE,
        offset: offset,
      });

      if (chunk.length === 0) {
        hasMore = false;
      } else {
        chunk.forEach((row) => sheet.addRow(row).commit());
        offset += BATCH_SIZE;
        if (chunk.length < BATCH_SIZE) hasMore = false;
      }
    }

    sheet.commit();
    await workbook.commit();
    stream.end();

    const fullBuffer = Buffer.concat(chunks);

    return sendResponse(
      res,
      200,
      ApiResponse.success({
        payload: {
          blob: fullBuffer.toString("base64"),
          performance: calculateStats(start, startUsage),
        },
        filename: `mayorality_export_${Date.now()}.xlsx`,
      }),
    );
  } catch (error) {
    return sendResponse(
      res,
      500,
      ApiResponse.error("Грешка при генериране на Excel файл", [error.message]),
    );
  }
}

/**
 * Generates a single CSV file for mayoralities.
 * @param {Object} res - Express response object.
 * @param {URL} parsedUrl - The parsed request URL with q, sort, page, and limit parameters.
 * @param {pg.Client} client - The PostgreSQL client instance.
 * @returns {Promise<void>}
 */
export async function exportCsvMayoralityHandler(res, parsedUrl, client) {
  const start = performance.now();
  const startUsage = process.cpuUsage();
  const params = getMayoralityParams(parsedUrl);

  try {
    const rawData = await mayoralityModel.getMayoralityStats(client, {
      ...params,
      limit: null,
      offset: 0,
    });

    const data = formatNullValues(rawData);
    let csvContent = "";

    const columnMapping = [
      { key: "center_ekatte", header: "Ekatte" },
      { key: "center_name", header: "Име на център" },
      { key: "mayorality_id", header: "Код на кметство" },
      { key: "mayorality_name", header: "Име на кметство" },
      { key: "municipality_name", header: "Община" },
      { key: "region_name", header: "Област" },
      { key: "mayorality_last_change", header: "Промяна" },
    ];

    if (data.length > 0) {
      const headerRow = columnMapping.map((m) => m.header).join(",");
      const rows = data
        .map((item) =>
          columnMapping
            .map((m) => {
              const value = item[m.key] ?? "";
              const escaped = String(value).replaceAll('"', '""');
              return `"${escaped}"`;
            })
            .join(","),
        )
        .join("\n");

      const BOM = "\uFEFF";
      csvContent = BOM + headerRow + "\n" + rows;
    }

    return sendResponse(
      res,
      200,
      ApiResponse.success({
        payload: {
          blob: Buffer.from(csvContent, "utf8").toString("base64"),
          performance: calculateStats(start, startUsage),
        },
        filename: `mayorality_export_${Date.now()}.csv`,
      }),
    );
  } catch (error) {
    console.error("CSV Export Error:", error);
    return sendResponse(res, 500, { message: "Error generating CSV file" });
  }
}

function getMayoralityParams(parsedUrl) {
  const q = parsedUrl.searchParams.get("q")?.trim() ?? "";
  const sort = parsedUrl.searchParams.get("sort")?.trim() ?? "";
  const fromDate = parsedUrl.searchParams.get("fromDate") || null;
  const toDate = parsedUrl.searchParams.get("toDate") || null;

  const filters = {
    center_ekatte: parsedUrl.searchParams.get("center_ekatte") || null,
    center_name: parsedUrl.searchParams.get("center_name") || null,
    mayorality_id: parsedUrl.searchParams.get("mayorality_id") || null,
    mayorality_name: parsedUrl.searchParams.get("mayorality_name") || null,
    municipality_name: parsedUrl.searchParams.get("municipality_name") || null,
    region_name: parsedUrl.searchParams.get("region_name") || null,
  };

  return { q, sort, fromDate, toDate, filters };
}
