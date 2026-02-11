/**
 * @fileoverview Validation resource handlers.
 */
import * as validation from "../utils/validation.js";
import { sendResponse } from "../utils/response-helper.js";

/**
 * Validates if an EKATTE (Settlement code) format is correct and if it already exists.
 * @async
 * @param {http.ServerResponse} res - Node.js response object.
 * @param {URL} parsedUrl - Parsed request URL containing search params.
 * @param {pg.Client} client - Database client.
 * @returns {Promise<void>}
 */
export async function validateEkatteHandler(res, parsedUrl, client) {
    try {
        const q = parsedUrl.searchParams.get("q")?.trim() ?? "";
        let data = { valid: false, message: "Invalid EKATTE format or already exists" };

        const formatOk = validation.checkEkatteFormat(q);
        const exists = await validation.checkSettlementExists(client, q);

        if (formatOk && !exists) {
            data = { valid: true, message: "Ok" };
        }

        return sendResponse(res, 200, { data });
    } catch (err) {
        console.error("Ekatte Validation Error:", err);
        return sendResponse(res, 500, { message: "Internal server error", errors: [err.message] });
    }
}

/**
 * Validates Mayorality code format and availability.
 * @async
 * @param {http.ServerResponse} res - Node.js response object.
 * @param {URL} parsedUrl - Parsed request URL containing search params.
 * @param {pg.Client} client - Database client.
 * @returns {Promise<void>}
 */
export async function validateMayoralityCodeHandler(res, parsedUrl, client) {
    try {
        const q = parsedUrl.searchParams.get("q")?.trim() ?? "";
        let data = { valid: false, message: "Invalid Mayorality code or already exists" };

        if (validation.checkMayoralityCodeFormat(q) && !(await validation.checkMayoralityExists(client, q))) {
            data = { valid: true, message: "Ok" };
        }

        return sendResponse(res, 200, { data });
    } catch (err) {
        console.error("Mayorality Validation Error:", err);
        return sendResponse(res, 500, { message: "Internal server error", errors: [err.message] });
    }
}

/**
 * Validates Municipality code format and availability.
 * @async
 * @param {http.ServerResponse} res - Node.js response object.
 * @param {URL} parsedUrl - Parsed request URL containing search params.
 * @param {pg.Client} client - Database client.
 * @returns {Promise<void>}
 */
export async function validateMunicipalityCodeHandler(res, parsedUrl, client) {
    try {
        const q = parsedUrl.searchParams.get("q")?.trim() ?? "";
        let data = { valid: false, message: "Invalid Municipality code or already exists" };

        if (validation.checkMunicipalityCodeFormat(q) && !(await validation.checkMunicipalityExists(client, q))) {
            data = { valid: true, message: "Ok" };
        }

        return sendResponse(res, 200, { data });
    } catch (err) {
        console.error("Municipality Validation Error:", err);
        return sendResponse(res, 500, { message: "Internal server error", errors: [err.message] });
    }
}

/**
 * Validates Region code format and availability.
 * @async
 * @param {http.ServerResponse} res - Node.js response object.
 * @param {URL} parsedUrl - Parsed request URL containing search params.
 * @param {pg.Client} client - Database client.
 * @returns {Promise<void>}
 */
export async function validateRegionCodeHandler(res, parsedUrl, client) {
    try {
        const q = parsedUrl.searchParams.get("q")?.trim() ?? "";
        let data = { valid: false, message: "Invalid Region code or already exists" };

        if (validation.checkRegionCodeFormat(q) && !(await validation.checkRegionExists(client, q))) {
            data = { valid: true, message: "Ok" };
        }

        return sendResponse(res, 200, { data });
    } catch (err) {
        console.error("Region Validation Error:", err);
        return sendResponse(res, 500, { message: "Internal server error", errors: [err.message] });
    }
}

/**
 * Validates NUTS3 code format and availability.
 * @async
 * @param {http.ServerResponse} res - Node.js response object.
 * @param {URL} parsedUrl - Parsed request URL containing search params.
 * @param {pg.Client} client - Database client.
 * @returns {Promise<void>}
 */
export async function validateNutsHandler(res, parsedUrl, client) {
    try {
        const q = parsedUrl.searchParams.get("q")?.trim() ?? "";
        let data = { valid: false, message: "Invalid NUTS3 code or already exists" };

        if (validation.checkNuts3Format(q) && !(await validation.checkNuts3Exists(client, q))) {
            data = { valid: true, message: "Ok" };
        }

        return sendResponse(res, 200, { data });
    } catch (err) {
        console.error("NUTS Validation Error:", err);
        return sendResponse(res, 500, { message: "Internal server error", errors: [err.message] });
    }
}

/**
 * Checks if a Municipality can be deleted or modified based on region center dependencies.
 * @async
 * @param {http.ServerResponse} res - Node.js response object.
 * @param {URL} parsedUrl - Parsed request URL containing search params.
 * @param {pg.Client} client - Database client.
 * @returns {Promise<void>}
 */
export async function validateMunicipalityDependenciesHandler(res, parsedUrl, client) {
    try {
        const id = parsedUrl.searchParams.get("id")?.trim() ?? "";
        let data = { valid: false, message: "Invalid Municipality code" };

        if (validation.checkMunicipalityCodeFormat(id)) {
            data = await validation.checkMunicipalityHasRegionCenters(client, id);
        }

        return sendResponse(res, 200, { data });
    } catch (err) {
        console.error("Municipality Dependency Error:", err);
        return sendResponse(res, 500, { message: "Internal server error", errors: [err.message] });
    }
}

/**
 * Checks dependencies for Mayorality (Center relationships).
 * @async
 * @param {http.ServerResponse} res - Node.js response object.
 * @param {URL} parsedUrl - Parsed request URL containing search params.
 * @param {pg.Client} client - Database client.
 * @returns {Promise<void>}
 */
export async function validateMayoralityDependenciesHandler(res, parsedUrl, client) {
    try {
        const id = parsedUrl.searchParams.get("id")?.trim() ?? "";
        let data = { valid: false, message: "Invalid code" };

        if (validation.checkMunicipalityCodeFormat(id)) {
            data = await validation.checkMayoralityHasMunicipalityOrRegionCenters(client, id);
        }

        return sendResponse(res, 200, { data });
    } catch (err) {
        console.error("Mayorality Dependency Error:", err);
        return sendResponse(res, 500, { message: "Internal server error", errors: [err.message] });
    }
}

/**
 * Checks if a settlement is currently acting as a center for other administrative units.
 * @async
 * @param {http.ServerResponse} res - Node.js response object.
 * @param {URL} parsedUrl - Parsed request URL containing search params.
 * @param {pg.Client} client - Database client.
 * @returns {Promise<void>}
 */
export async function validateSettlementDependenciesHandler(res, parsedUrl, client) {
    try {
        const id = parsedUrl.searchParams.get("id")?.trim() ?? "";
        let data = { valid: false, message: "Invalid code" };

        if (validation.checkEkatteFormat(id)) {
            data = await validation.checkSettlementIsCenter(client, id);
        }

        return sendResponse(res, 200, { data });
    } catch (err) {
        console.error("Settlement Dependency Error:", err);
        return sendResponse(res, 500, { message: "Internal server error", errors: [err.message] });
    }
}