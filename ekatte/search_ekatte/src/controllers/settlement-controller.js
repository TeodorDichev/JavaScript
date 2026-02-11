/**
 * @fileoverview Settlement resource handlers.
 * Manages EKATTE-based records, including territorial affiliation updates
 * and administrative center cleanup.
 */
import ExcelJS from "exceljs";
import * as validation from "../utils/validation.js";
import { settlementModel } from "../models/settlement-model.js";
import { sendResponse } from "../utils/response-helper.js";
import { calculateStats, formatNullValues } from "../utils/export-helper.js";

/**
 * Route handler to create a new Settlement record.
 * Performs extensive validation of EKATTE format, existence checks for parent entities
 * (Municipality, Mayorality), and data type integrity before insertion.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @param {Object} bodyData - The settlement data including ekatte, name, municipality_id, and type.
 * @returns {Promise<void>}
 */
export async function createSettlementHandler(res, client, bodyData) {
  const errors = [];

  try {
    if (!validation.checkEkatteFormat(bodyData.ekatte))
      errors.push("Невалиден формат на ekatte");
    if (await validation.checkSettlementExists(client, bodyData.ekatte))
      errors.push("Вече съществува такова селище");
    if (!validation.checkIsOnlyAlphabetical(bodyData.name))
      errors.push("Невалидно име");
    if (!validation.checkIsOnlyAlphabetical(bodyData.transliteration))
      errors.push("Невалиден превод");
    if (!validation.isPositiveInteger(bodyData.category))
      errors.push("Невалидна категория");
    if (!bodyData.altitude_id) errors.push("Липсва надморска височина");
    if (!bodyData.settlement_type_id)
      errors.push("Липсва тип на населеното място");
    if (!validation.checkMunicipalityCodeFormat(bodyData.municipality_id))
      errors.push("Невалиден код на община");
    if (
      !(await validation.checkMunicipalityExists(
        client,
        bodyData.municipality_id
      ))
    ) {
      errors.push("Няма такава община");
    }
    if (
      bodyData.mayorality_id &&
      !(await validation.checkMayoralityExists(client, bodyData.mayorality_id))
    ) {
      errors.push("Няма такова кметство");
    }

    if (errors.length > 0) {
      return sendResponse(res, 400, {
        message: "Грешка при валидация",
        errors,
      });
    }

    await settlementModel.create(client, bodyData);
    sendResponse(res, 201, { message: "Успешно добавено населено място" });
  } catch (err) {
    sendResponse(res, 500, {
      message: "Вътрешна грешка при запис на селище",
      errors: [err.message],
    });
  }
}

/**
 * Route handler to delete a Settlement and its administrative center designations.
 * Uses a transaction to ensure that if the settlement is registered as a center for a
 * mayorality, municipality, or region, those associations are cleaned up before the record is removed.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {URL} parsedUrl - The parsed request URL containing the settlement EKATTE in the 'id' parameter.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @returns {Promise<void>}
 */
export async function deleteSettlementHandler(res, parsedUrl, client) {
  const id = parsedUrl.searchParams.get("id")?.trim() ?? "";

  if (!validation.checkEkatteFormat(id)) {
    return sendResponse(res, 400, {
      message: "Невалиден формат",
      errors: ["Кодът EKATTE трябва да бъде в правилен формат"],
    });
  }

  try {
    await client.query("BEGIN");
    await settlementModel.clearSettlementCenters(client, id);
    const result = await settlementModel.deleteRecord(client, id);

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return sendResponse(res, 404, {
        message: "Неуспешно изтриване",
        errors: ["Населеното място не беше намерено"],
      });
    }

    await client.query("COMMIT");
    sendResponse(res, 200, {
      message: "Населеното място беше изтрито успешно",
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    sendResponse(res, 500, {
      message: "Системна грешка при изтриване",
      errors: [err.message],
    });
  }
}

/**
 * Route handler to update an existing Settlement's details.
 * If the territorial affiliation (Municipality/Mayorality) has changed, it automatically
 * clears any existing administrative center designations to maintain data consistency.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {URL} parsedUrl - The parsed request URL used to extract the EKATTE from the path.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @param {Object} bodyData - Updated settlement data.
 * @returns {Promise<void>}
 */
export async function editSettlementHandler(res, parsedUrl, client, bodyData) {
  const ekatte = parsedUrl.pathname.split("/").pop();
  const errors = [];

  if (!validation.checkEkatteFormat(ekatte))
    errors.push("Невалиден формат на ekatte");
  if (!validation.checkIsOnlyAlphabetical(bodyData.name))
    errors.push("Невалидно име");
  if (!validation.checkIsOnlyAlphabetical(bodyData.transliteration))
    errors.push("Невалиден превод");
  if (!validation.isPositiveInteger(Number(bodyData.category)))
    errors.push("Невалидна категория");
  if (!bodyData.altitude_id) errors.push("Липсва надморска височина");
  if (!bodyData.type_id) errors.push("Липсва тип на населеното място");
  if (!validation.checkMunicipalityCodeFormat(bodyData.municipality_id)) {
    errors.push("Невалиден код на община");
  } else if (
    !(await validation.checkMunicipalityExists(
      client,
      bodyData.municipality_id
    ))
  ) {
    errors.push("Няма такава община");
  }
  if (
    bodyData.mayorality_id &&
    !(await validation.checkMayoralityExists(client, bodyData.mayorality_id))
  ) {
    errors.push("Няма такова кметство");
  }

  if (errors.length > 0) {
    return sendResponse(res, 400, { message: "Грешка при валидация", errors });
  }

  try {
    await client.query("BEGIN");
    if (bodyData.changed_territorial_affiliation) {
      await settlementModel.clearSettlementCenters(client, ekatte);
    }

    await settlementModel.update(client, ekatte, bodyData);
    await client.query("COMMIT");

    sendResponse(res, 200, { message: "Успешна редакция на населеното място" });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    sendResponse(res, 500, {
      message: "Вътрешна сървърна грешка при редакция",
      errors: [err.message],
    });
  }
}

/**
 * Route handler for the Settlements dashboard/listing page.
 * Fetches paginated and sorted settlement data using a dedicated view. Leverages
 * window functions (total_count) for efficient pagination metadata retrieval.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {URL} parsedUrl - The parsed request URL with q, sort, page, and limit parameters.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @returns {Promise<void>}
 */
export async function homeSettlementsHandler(res, parsedUrl, client) {
  const q = parsedUrl.searchParams.get("q")?.trim() ?? "";
  const sort = parsedUrl.searchParams.get("sort")?.trim() ?? "";
  const page = parseInt(parsedUrl.searchParams.get("page")) || 1;
  const limit = parseInt(parsedUrl.searchParams.get("limit")) || 20;
  const fromDate = parsedUrl.searchParams.get("fromDate") || null;
  const toDate = parsedUrl.searchParams.get("toDate") || null;
  const offset = (page - 1) * limit;

  const filters = {
    ekatte: parsedUrl.searchParams.get("ekatte") || null,
    settlement_name: parsedUrl.searchParams.get("settlement_name") || null,
    mayorality_name: parsedUrl.searchParams.get("mayorality_name") || null,
    municipality_name: parsedUrl.searchParams.get("municipality_name") || null,
    region_name: parsedUrl.searchParams.get("region_name") || null,
  };

  try {
    const rows = await settlementModel.getSettlementStats(
      client,
      { q, sort, limit, offset, fromDate, toDate, filters },
      "settlement"
    );

    const totalCount = await settlementModel.getCount(client);
    const hasActiveFilters =
      q || fromDate || toDate || Object.values(filters).some((v) => v !== null);

    let filteredCount;
    if (hasActiveFilters) {
      filteredCount = await settlementModel.getFilteredCount(
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
    console.error("Settlement Search Error:", err);
    sendResponse(res, 500, {
      message: "Грешка при зареждане на населени места",
      errors: [err.message],
    });
  }
}

/**
 * Route handler to retrieve comprehensive details for a specific Settlement by its EKATTE code.
 * Fetches extended information including administrative center status and parent entity names.
 * @async
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {URL} parsedUrl - The parsed request URL containing the EKATTE in the 'q' parameter.
 * @param {pg.Client} client - The PostgreSQL database client instance.
 * @returns {Promise<void>}
 */
export async function infoSettlementHandler(res, parsedUrl, client) {
  const ekatte = parsedUrl.searchParams.get("q")?.trim() ?? "";

  try {
    const result = await settlementModel.getInfoByEkatte(client, ekatte);
    sendResponse(res, 200, { data: result });
  } catch (err) {
    sendResponse(res, 500, {
      message: "Грешка при детайли за селище",
      errors: [err.message],
    });
  }
}

/**
 * Generates a single Excel file for settlements.
 * @param {Object} res - Express response object.
 * @param {URL} parsedUrl - The parsed request URL with q, sort, page, and limit parameters.
 * @param {pg.Client} client - The PostgreSQL client instance.
 * @returns {Promise<void>}
 */
export async function exportExcelSettlementHandler(res, parsedUrl, client) {
  const start = performance.now();
  const startUsage = process.cpuUsage();

  const q = parsedUrl.searchParams.get("q")?.trim() ?? "";
  const sort = parsedUrl.searchParams.get("sort")?.trim() ?? "";
  const fromDate = parsedUrl.searchParams.get("fromDate") || null;
  const toDate = parsedUrl.searchParams.get("toDate") || null;

  const filters = {
    ekatte: parsedUrl.searchParams.get("ekatte") || null,
    settlement_name: parsedUrl.searchParams.get("settlement_name") || null,
    mayorality_name: parsedUrl.searchParams.get("mayorality_name") || null,
    municipality_name: parsedUrl.searchParams.get("municipality_name") || null,
    region_name: parsedUrl.searchParams.get("region_name") || null,
  };

  try {
    const workbook = new ExcelJS.Workbook();
    const data = await settlementModel.getSettlementStats(client, {
      q,
      sort,
      limit: null,
      offset: 0,
      fromDate,
      toDate,
      filters,
    });
    const sheet = workbook.addWorksheet("Settlements");
    const columnMapping = [
      { key: "ekatte", header: "Ekatte" },
      { key: "settlement_name", header: "Селище" },
      { key: "mayorality_name", header: "Кметство" },
      { key: "municipality_name", header: "Община" },
      { key: "region_name", header: "Област" },
      { key: "settlement_last_change", header: "Промяна" },
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
        filename: `settlement_export_excel_${Date.now()}.xlsx`,
      },
    });
  } catch (error) {
    console.error("Settlement Excel Export Error:", error);
    return sendResponse(res, 500, { message: "Error generating Excel file" });
  }
}

/**
 * Generates a single CSV file for settlements.
 * @param {Object} res - Express response object.
 * @param {URL} parsedUrl - The parsed request URL with q, sort, page, and limit parameters.
 * @param {pg.Client} client - The PostgreSQL client instance.
 * @returns {Promise<void>}
 */
export async function exportCsvSettlementHandler(res, parsedUrl, client) {
  const start = performance.now();
  const startUsage = process.cpuUsage();

  const q = parsedUrl.searchParams.get("q")?.trim() ?? "";
  const sort = parsedUrl.searchParams.get("sort")?.trim() ?? "";
  const fromDate = parsedUrl.searchParams.get("fromDate") || null;
  const toDate = parsedUrl.searchParams.get("toDate") || null;

  const filters = {
    ekatte: parsedUrl.searchParams.get("ekatte") || null,
    settlement_name: parsedUrl.searchParams.get("settlement_name") || null,
    mayorality_name: parsedUrl.searchParams.get("mayorality_name") || null,
    municipality_name: parsedUrl.searchParams.get("municipality_name") || null,
    region_name: parsedUrl.searchParams.get("region_name") || null,
  };

  try {
    const rawData = await settlementModel.getSettlementStats(client, {
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
      { key: "ekatte", header: "Ekatte" },
      { key: "settlement_name", header: "Селище" },
      { key: "mayorality_name", header: "Кметство" },
      { key: "municipality_name", header: "Община" },
      { key: "region_name", header: "Област" },
      { key: "settlement_last_change", header: "Промяна" },
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
        filename: `settlement_export_csv_${Date.now()}.csv`,
      },
    });
  } catch (error) {
    console.error("Settlement CSV Export Error:", error);
    return sendResponse(res, 500, { message: "Error generating CSV file" });
  }
}
