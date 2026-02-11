/**
 * @fileoverview Municipality resource handlers.
 * Manages municipality lifecycle and enforces complex cascaded deletions
 * across mayoralties and settlements.
 */
import ExcelJS from "exceljs";
import * as validation from "../utils/validation.js";
import { municipalityModel } from "../models/municipality-model.js";
import { mayoralityModel } from "../models/mayorality-model.js";
import { settlementModel } from "../models/settlement-model.js";
import { sendResponse } from "../utils/response-helper.js";
import { calculateStats, formatNullValues } from "../utils/export-helper.js";

/**
 * Route handler to create a new Municipality along with its first Mayorality and administrative center.
 * This function handles a multi-step creation process wrapped in a database transaction:
 * 1. Creates the Municipality.
 * 2. Creates the associated Mayorality.
 * 3. Creates the Settlement (center).
 * 4. Designates the settlement as the center for both the Mayorality and the Municipality.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @param {Object} bodyData - Request payload containing municipality, mayorality, and center objects.
 * @returns {Promise<void>}
 */
export async function createMunicipalityHandler(res, client, bodyData) {
  const { municipality, mayorality, center } = bodyData;
  const errors = [];

  try {
    if (!center || !municipality || !mayorality) errors.push("Липсващи данни");
    if (!validation.checkEkatteFormat(center?.ekatte))
      errors.push("Невалиден формат на ekatte");
    if (await validation.checkSettlementExists(client, center?.ekatte))
      errors.push("Вече съществува такова селище");
    if (!validation.checkMunicipalityCodeFormat(municipality?.municipality_id))
      errors.push("Невалиден код на община");
    if (
      await validation.checkMunicipalityExists(
        client,
        municipality?.municipality_id
      )
    )
      errors.push("Вече има такава община");
    if (
      await validation.checkMayoralityExists(client, mayorality?.mayorality_id)
    )
      errors.push("Вече има такова кметство");

    if (errors.length > 0) {
      return sendResponse(res, 400, {
        message: "Грешка при валидация",
        errors,
      });
    }

    await client.query("BEGIN");
    await municipalityModel.create(client, municipality);
    await mayoralityModel.create(client, mayorality);
    await settlementModel.create(client, center);
    await mayoralityModel.createCenter(client, center);
    await municipalityModel.createCenter(client, center);
    await client.query("COMMIT");

    sendResponse(res, 201, {
      message: "Община, кметство и център успешно създадени",
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    sendResponse(res, 500, {
      message: "Системна грешка при запис",
      errors: [err.message],
    });
  }
}

/**
 * Route handler to delete a Municipality and perform a cascaded deletion of all its dependencies.
 * The transaction ensures that associated mayorality centers, municipality centers, region centers,
 * settlements, and mayoralities are removed before the primary municipality record is deleted.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {URL} parsedUrl - The parsed request URL containing the municipality 'id'.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @returns {Promise<void>}
 */
export async function deleteMunicipalityHandler(res, parsedUrl, client) {
  const id = parsedUrl.searchParams.get("id")?.trim() ?? "";

  if (!validation.checkMunicipalityCodeFormat(id)) {
    return sendResponse(res, 400, { message: "Невалиден формат на кода" });
  }

  try {
    await client.query("BEGIN");
    await municipalityModel.deleteMayoralityCenters(client, id);
    await municipalityModel.deleteMunicipalityCenter(client, id);
    await municipalityModel.deleteRegionCenters(client, id);
    await municipalityModel.deleteSettlements(client, id);
    await municipalityModel.deleteMayoralities(client, id);

    const result = await municipalityModel.deleteRecord(client, id);

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return sendResponse(res, 404, { message: "Общината не е намерена" });
    }

    await client.query("COMMIT");
    sendResponse(res, 200, {
      message: "Общината и всички нейни подразделения бяха изтрити успешно",
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    sendResponse(res, 500, {
      message: "Грешка при изтриване",
      errors: [err.message],
    });
  }
}

/**
 * Route handler to update Municipality details and its administrative center association.
 * Validates the existence of the new center settlement before committing changes via transaction.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {URL} parsedUrl - The parsed request URL containing the municipality ID in the path.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @param {Object} bodyData - Updated data including name, transliteration, and center_id.
 * @returns {Promise<void>}
 */
export async function editMunicipalityHandler(
  res,
  parsedUrl,
  client,
  bodyData
) {
  const id = parsedUrl.pathname.split("/").pop();

  const errors = [];

  if (!validation.checkMunicipalityCodeFormat(id))
    errors.push("Невалиден код на община");
  if (!validation.checkIsOnlyAlphabetical(bodyData.name))
    errors.push("Невалидно име");

  if (!validation.checkEkatteFormat(bodyData.center_id)) {
    errors.push("Невалиден формат на ekatte");
  } else if (
    !(await validation.checkSettlementExists(client, bodyData.center_id))
  ) {
    errors.push("Не съществува такова селище");
  }

  if (errors.length > 0) {
    return sendResponse(res, 400, { message: "Валидационна грешка", errors });
  }

  try {
    await client.query("BEGIN");
    await municipalityModel.update(client, id, bodyData);
    await municipalityModel.deleteMunicipalityCenter(client, id);
    if (bodyData.center_id) {
      await municipalityModel.setCenter(client, id, bodyData.center_id);
    }
    await client.query("COMMIT");

    sendResponse(res, 200, { message: "Успешна редакция на общината" });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    sendResponse(res, 500, {
      message: "Вътрешна сървърна грешка при редакция",
      errors: [err.message],
    });
  }
}

/**
 * Route handler for the Municipality dashboard/listing view.
 * Fetches paginated statistics, including total counts and filtered counts, utilizing
 * window functions for efficient total row calculation.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {URL} parsedUrl - The parsed request URL with q, sort, page, and limit parameters.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @returns {Promise<void>}
 */
export async function homeMunicipalityHandler(res, parsedUrl, client) {
  const q = parsedUrl.searchParams.get("q")?.trim() ?? "";
  const sort = parsedUrl.searchParams.get("sort")?.trim() ?? "";
  const page = parseInt(parsedUrl.searchParams.get("page")) || 1;
  const limit = parseInt(parsedUrl.searchParams.get("limit")) || 20;
  const fromDate = parsedUrl.searchParams.get("fromDate") || null;
  const toDate = parsedUrl.searchParams.get("toDate") || null;
  const offset = (page - 1) * limit;

  const filters = {
    center_ekatte: parsedUrl.searchParams.get("center_ekatte") || null,
    center_name: parsedUrl.searchParams.get("center_name") || null,
    municipality_id: parsedUrl.searchParams.get("municipality_id") || null,
    municipality_name: parsedUrl.searchParams.get("municipality_name") || null,
    region_name: parsedUrl.searchParams.get("region_name") || null,
  };

  try {
    const rows = await municipalityModel.getMunicipalityStats(client, {
      q,
      sort,
      limit,
      offset,
      fromDate,
      toDate,
      filters,
    });

    const totalCount = await municipalityModel.getCount(client);
    const hasActiveFilters =
      q || fromDate || toDate || Object.values(filters).some((v) => v !== null);

    let filteredCount;
    if (hasActiveFilters) {
      filteredCount = await municipalityModel.getFilteredCount(
        client,
        q,
        fromDate,
        toDate,
        filters
      );
    } else {
      filteredCount = totalCount;
    }

    const totalRowsAfterFilter =
      rows.length > 0 ? parseInt(rows[0].total_count) : 0;

    sendResponse(res, 200, {
      data: {
        rows: rows,
        totalCount: totalCount,
        filteredCount: filteredCount,
        pagination: {
          total: totalRowsAfterFilter,
          page: page,
          limit: limit,
          totalPages: Math.ceil(totalRowsAfterFilter / limit),
        },
      },
    });
  } catch (err) {
    console.error("Municipality Search Error:", err);
    sendResponse(res, 500, {
      message: "Грешка при зареждане на общини",
      errors: [err.message],
    });
  }
}

/**
 * Route handler for lightweight searching/autocomplete of Municipalities.
 * Returns a simplified, formatted list of the top 10 matches including parent region names.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {URL} parsedUrl - The parsed request URL containing the query (q).
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @returns {Promise<void>}
 */
export async function searchMunicipalityHandler(res, parsedUrl, client) {
  const q = parsedUrl.searchParams.get("q")?.trim() ?? "";
  const munId = parsedUrl.searchParams.get("municipalityId")?.trim() ?? "";
  try {
    const result = await municipalityModel.getFiltered(client, q);
    const formatted = result.rows.slice(0, 10).map((row) => ({
      id: row.municipality_id,
      name: `${row.municipality_name}, ${row.region_name}`,
      regionName: row.region_name,
    }));

    sendResponse(res, 200, { data: formatted });
  } catch (err) {
    sendResponse(res, 500, {
      message: "Грешка при търсене",
      errors: [err.message],
    });
  }
}

/**
 * Route handler to fetch comprehensive information about a specific Municipality.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {URL} parsedUrl - The parsed request URL containing the municipality ID in parameter 'q'.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @returns {Promise<void>}
 */
export async function infoMunicipalityHandler(res, parsedUrl, client) {
  const id = parsedUrl.searchParams.get("q")?.trim() ?? "";
  try {
    const data = await municipalityModel.getInfo(client, id);
    sendResponse(res, 200, { data: data });
  } catch (err) {
    sendResponse(res, 500, {
      message: "Грешка при детайли",
      errors: [err.message],
    });
  }
}

/**
 * Route handler to retrieve potential administrative center candidates for a specific Municipality.
 * Limits results to settlements that physically belong to the given municipality ID.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {URL} parsedUrl - The parsed request URL containing search query (q) and municipality ID (id).
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @returns {Promise<void>}
 */
export async function municipalityCenterCandidatesHandler(
  res,
  parsedUrl,
  client
) {
  const q = parsedUrl.searchParams.get("q")?.trim() ?? "";
  const id = parsedUrl.searchParams.get("id")?.trim() ?? "";
  try {
    const data = await municipalityModel.getCenterCandidates(client, q, id);
    sendResponse(res, 200, { data });
  } catch (err) {
    sendResponse(res, 500, {
      message: "Грешка при извличане на кандидати",
      errors: [err.message],
    });
  }
}

/**
 * Generates a single Excel file for municipalities.
 * @param {Object} res - Express response object.
 * @param {URL} parsedUrl - The parsed request URL with q, sort, page, and limit parameters.
 * @param {pg.Client} client - The PostgreSQL client instance.
 * @returns {Promise<void>}
 */
export async function exportExcelMunicipalityHandler(res, parsedUrl, client) {
  const start = performance.now();
  const startUsage = process.cpuUsage();

  const q = parsedUrl.searchParams.get("q")?.trim() ?? "";
  const sort = parsedUrl.searchParams.get("sort")?.trim() ?? "";
  const fromDate = parsedUrl.searchParams.get("fromDate") || null;
  const toDate = parsedUrl.searchParams.get("toDate") || null;

  const filters = {
    center_ekatte: parsedUrl.searchParams.get("center_ekatte") || null,
    center_name: parsedUrl.searchParams.get("center_name") || null,
    municipality_id: parsedUrl.searchParams.get("municipality_id") || null,
    municipality_name: parsedUrl.searchParams.get("municipality_name") || null,
    region_name: parsedUrl.searchParams.get("region_name") || null,
  };

  try {
    const workbook = new ExcelJS.Workbook();
    const data = await municipalityModel.getMunicipalityStats(client, {
      q,
      sort,
      limit: null,
      offset: 0,
      fromDate,
      toDate,
      filters
    });
    const sheet = workbook.addWorksheet("Municipalities");
    const columnMapping = [
      { key: "center_ekatte", header: "Ekatte" },
      { key: "center_name", header: "Име на център" },
      { key: "municipality_id", header: "Код на община" },
      { key: "municipality_name", header: "Име на община" },
      { key: "region_name", header: "Област" },
      { key: "municipality_last_change", header: "Промяна" },
    ];

    if (data.length > 0) {
      sheet.columns = columnMapping.map((col) => ({
        header: col.header,
        key: col.key,
        width: 20,
      }));

      sheet.addRows(formatNullValues(data));
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return sendResponse(res, 200, {
      data: {
        payload: {
          blob: buffer.toString("base64"),
          performance: calculateStats(start, startUsage),
        },
        filename: `municipality_export_excel_${Date.now()}.xlsx`,
      },
    });
  } catch (error) {
    console.error("Municipality Excel Export Error:", error);
    return sendResponse(res, 500, { message: "Error generating Excel file" });
  }
}

/**
 * Generates a single CSV file for municipalities.
 * @param {Object} res - Express response object.
 * @param {URL} parsedUrl - The parsed request URL with q, sort, page, and limit parameters.
 * @param {pg.Client} client - The PostgreSQL client instance.
 * @returns {Promise<void>}
 */
export async function exportCsvMunicipalityHandler(res, parsedUrl, client) {
  const start = performance.now();
  const startUsage = process.cpuUsage();

  const q = parsedUrl.searchParams.get("q")?.trim() ?? "";
  const sort = parsedUrl.searchParams.get("sort")?.trim() ?? "";
  const fromDate = parsedUrl.searchParams.get("fromDate") || null;
  const toDate = parsedUrl.searchParams.get("toDate") || null;

  const filters = {
    center_ekatte: parsedUrl.searchParams.get("center_ekatte") || null,
    center_name: parsedUrl.searchParams.get("center_name") || null,
    municipality_id: parsedUrl.searchParams.get("municipality_id") || null,
    municipality_name: parsedUrl.searchParams.get("municipality_name") || null,
    region_name: parsedUrl.searchParams.get("region_name") || null,
  };

  try {
    const rawData = await municipalityModel.getMunicipalityStats(client, {
      q,
      sort,
      limit: null,
      offset: 0,
      fromDate,
      toDate,
      filters
    });
    const data = formatNullValues(rawData);
    let csvContent = "";

    const columnMapping = [
      { key: "center_ekatte", header: "Ekatte" },
      { key: "center_name", header: "Име на център" },
      { key: "municipality_id", header: "Код на община" },
      { key: "municipality_name", header: "Име на община" },
      { key: "region_name", header: "Област" },
      { key: "municipality_last_change", header: "Промяна" },
    ];

    if (data.length > 0) {
      const headerRow = columnMapping.map((m) => m.header).join(",");
      const rows = data
        .map((item) =>
          columnMapping
            .map((m) => {
              const value = item[m.key] ?? "";
              const escaped = String(value).replace(/"/g, '""');
              return `"${escaped}"`;
            })
            .join(",")
        )
        .join("\n");

      const BOM = "\uFEFF";
      csvContent = BOM + headerRow + "\n" + rows;
    }

    return sendResponse(res, 200, {
      data: {
        payload: {
          blob: Buffer.from(csvContent).toString("base64"),
          performance: calculateStats(start, startUsage),
        },
        filename: `municipality_export_csv_${Date.now()}.csv`,
      },
    });
  } catch (error) {
    console.error("Municipality CSV Export Error:", error);
    return sendResponse(res, 500, { message: "Error generating CSV file" });
  }
}
