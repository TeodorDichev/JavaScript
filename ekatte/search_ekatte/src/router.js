/**
 * @fileoverview Central API router.
 * Handles URL parsing and maps incoming HTTP requests to the correct 
 * administrative controllers.
 */

import { URL } from "url";
import { pool } from "./server.js";
import { sendResponse } from "./utils/response-helper.js";
import { ApiResponse } from "./utils/api-response.js";

import * as settlement from "./controllers/settlement-controller.js";
import * as mayorality from "./controllers/mayorality-controller.js";
import * as municipality from "./controllers/municipality-controller.js";
import * as region from "./controllers/region-controller.js";
import * as home from "./controllers/home-controller.js";
import { altitudeHandler } from "./controllers/altitude-controller.js";
import { settlementTypeHandler } from "./controllers/settlement-type-controller.js";
import * as validation from "./controllers/validation-controller.js";

/**
 * Main application router that dispatches incoming requests to specific controllers.
 * Establishes a database connection from the pool and ensures the database client 
 * is released back to the pool in all scenarios.
 * 
 * @async
 * @param {http.IncomingMessage} req - The Node.js HTTP request object.
 * @param {http.ServerResponse} res - The Node.js HTTP response object.
 * @param {pg.Pool} [dbpool=pool] - The PostgreSQL connection pool (defaults to the global pool).
 * @returns {Promise<void>} - Resolves when the request has been fully handled and response sent.
 */
export async function router(req, res, dbpool = pool) {
    const client = await dbpool.connect();

    try {
        const base = `http://${req.headers.host}`;
        const parsedUrl = new URL(req.url, base);
        const method = req.method;

        let bodyData = {};
        if (method === "POST" || method === "PUT") {
            try {
                bodyData = await getRequestBody(req);
            } catch (err) {
                return sendResponse(ApiResponse.error("Невалиден JSON в тялото на заявката", [err.message]) );
            }
        }

        const [, api, resource, action] = parsedUrl.pathname.split("/");
        if (api !== "api") return sendResponse(res, 404, ApiResponse.error("Невалиден API път", []) );

        if (resource === "home" && method === "GET") return await home.globalSearchHandler(res, parsedUrl, client);

        if (resource === "settlement") {
            if (action === "home" && method === "GET") return await settlement.homeSettlementsHandler(res, parsedUrl, client);
            if (action === "info" && method === "GET") return await settlement.infoSettlementHandler(res, parsedUrl, client);
            if (action === "create" && method === "POST") return await settlement.createSettlementHandler(res, client, bodyData);
            if (action === "update" && method === "PUT") return await settlement.editSettlementHandler(res, parsedUrl, client, bodyData);
            if (action === "delete" && method === "DELETE") return await settlement.deleteSettlementHandler(res, parsedUrl, client);
            if (action === "csv-export" && method === "GET") return await settlement.exportCsvSettlementHandler(res, parsedUrl, client);
            if (action === "excel-export" && method === "GET") return await settlement.exportExcelSettlementHandler(res, parsedUrl, client);
        }

        if (resource === "mayorality") {
            if (action === "center-candidates" && method === "GET") return await mayorality.mayoralityCenterCandidatesHandler(res, parsedUrl, client);
            if (action === "home" && method === "GET") return await mayorality.homeMayoralityHandler(res, parsedUrl, client);
            if (action === "search" && method === "GET") return await mayorality.searchMayoralityHandler(res, parsedUrl, client);
            if (action === "info" && method === "GET") return await mayorality.infoMayoralityHandler(res, parsedUrl, client);
            if (action === "create" && method === "POST") return await mayorality.createMayoralityHandler(res, client, bodyData);
            if (action === "update" && method === "PUT") return await mayorality.editMayoralityHandler(res, parsedUrl, client, bodyData);
            if (action === "delete" && method === "DELETE") return await mayorality.deleteMayoralityHandler(res, parsedUrl, client);
            if (action === "csv-export" && method === "GET") return await mayorality.exportCsvMayoralityHandler(res, parsedUrl, client);
            if (action === "excel-export" && method === "GET") return await mayorality.exportExcelMayoralityHandler(res, parsedUrl, client);
        }

        if (resource === "municipality") {
            if (action === "center-candidates" && method === "GET") return await municipality.municipalityCenterCandidatesHandler(res, parsedUrl, client);
            if (action === "home" && method === "GET") return await municipality.homeMunicipalityHandler(res, parsedUrl, client);
            if (action === "search" && method === "GET") return await municipality.searchMunicipalityHandler(res, parsedUrl, client);
            if (action === "info" && method === "GET") return await municipality.infoMunicipalityHandler(res, parsedUrl, client);
            if (action === "create" && method === "POST") return await municipality.createMunicipalityHandler(res, client, bodyData);
            if (action === "update" && method === "PUT") return await municipality.editMunicipalityHandler(res, parsedUrl, client, bodyData);
            if (action === "delete" && method === "DELETE") return await municipality.deleteMunicipalityHandler(res, parsedUrl, client);
            if (action === "csv-export" && method === "GET") return await municipality.exportCsvMunicipalityHandler(res, parsedUrl, client);
            if (action === "excel-export" && method === "GET") return await municipality.exportExcelMunicipalityHandler(res, parsedUrl, client);
        }

        if (resource === "region") {
            if (action === "center-candidates" && method === "GET") return await region.regionCenterCandidatesHandler(res, parsedUrl, client);
            if (action === "home" && method === "GET") return await region.homeRegionHandler(res, parsedUrl, client);
            if (action === "info" && method === "GET") return await region.infoRegionHandler(res, parsedUrl, client);
            if (action === "search" && method === "GET") return await region.searchRegionHandler(res, parsedUrl, client);
            if (action === "create" && method === "POST") return await region.createRegionHandler(res, client, bodyData);
            if (action === "update" && method === "PUT") return await region.editRegionHandler(res, parsedUrl, client, bodyData);
            if (action === "delete" && method === "DELETE") return await region.deleteRegionHandler(res, parsedUrl, client);
            if (action === "csv-export" && method === "GET") return await region.exportCsvRegionHandler(res, parsedUrl, client);
            if (action === "excel-export" && method === "GET") return await region.exportExcelRegionHandler(res, parsedUrl, client);
        }

        if (resource === "altitude" && action === "search" && method === "GET") return await altitudeHandler(res, client);
        if (resource === "settlement_type" && action === "search" && method === "GET") return await settlementTypeHandler(res, client);

        if (resource === "validation" && method === "GET") {
            if (action === "ekatte" && method === "GET") return await validation.validateEkatteHandler(res, parsedUrl, client);
            if (action === "region-code" && method === "GET") return await validation.validateRegionCodeHandler(res, parsedUrl, client);
            if (action === "municipality-code" && method === "GET") return await validation.validateMunicipalityCodeHandler(res, parsedUrl, client);
            if (action === "mayorality-code" && method === "GET") return await validation.validateMayoralityCodeHandler(res, parsedUrl, client);
            if (action === "nuts" && method === "GET") return await validation.validateNutsHandler(res, parsedUrl, client);
            if (action === "municipality-dependencies" && method === "GET") return await validation.validateMunicipalityDependenciesHandler(res, parsedUrl, client);
            if (action === "mayorality-dependencies" && method === "GET") return await validation.validateMayoralityDependenciesHandler(res, parsedUrl, client);
            if (action === "settlement-dependencies" && method === "GET") return await validation.validateSettlementDependenciesHandler(res, parsedUrl, client);
        }

        return sendResponse(res, 404, { message: "Resource or Action not found"});

    } catch (err) {
        return sendResponse(res, 500, { message: "Critical Router Error", errors: [err.message] });
    } finally {
        client.release();
    }
}

/**
 * Parses the incoming request stream and returns the JSON body.
 * @async
 * @param {http.IncomingMessage} req - The Node.js request object.
 * @returns {Promise<Object>} A promise that resolves to the parsed JSON object.
 * @throws {SyntaxError} If the request body is not valid JSON.
 */
async function getRequestBody(req) {
    let body = "";
    for await (const chunk of req) body += chunk;
    if (!body) return {};
    return JSON.parse(body);
}