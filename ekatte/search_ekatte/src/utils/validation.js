/**
 * @fileoverview Validation utility functions for administrative data formats 
 * and database integrity checks.
 */

import { validationModel } from "../models/validation-model.js";

/**
 * Checks if a string contains only digits.
 * @param {string} str 
 * @returns {boolean}
 */
export function checkIsOnlyNumerical(str) {
    if (typeof str !== "string") return false;
    const v = str.trim();
    return v !== "" && /^[0-9]+$/.test(v);
}

/**
 * Validates if a value is a positive integer.
 * @param {any} num 
 * @returns {boolean}
 */
export function isPositiveInteger(num) {
    if (typeof num !== "number") return false;
    return Number.isInteger(num) && num > 0;
}

/**
 * Checks if a string contains only alphabetical characters (Cyrillic and Latin).
 * @param {string} str 
 * @returns {boolean}
 */
export function checkIsOnlyAlphabetical(str) {
    if (typeof str !== "string") return false;
    const v = str.trim();
    return v !== "" && /^[A-Za-zА-Яа-яЁё\s]+$/.test(v);
}

/**
 * Checks if a string is alphanumeric.
 * @param {string} str 
 * @returns {boolean}
 */
export function checkIsAlphaNumerical(str) {
    if (typeof str !== "string") return false;
    const v = str.trim();
    return v !== "" && /^[A-Za-zА-Яа-яЁё0-9]+$/.test(v);
}

// --- Database Existence Checks (Using Model) ---

/**
 * Checks if a settlement exists in the database by EKATTE.
 * @async
 * @param {pg.Client} client 
 * @param {string} ekatte 
 * @returns {Promise<boolean>}
 */
export async function checkSettlementExists(client, ekatte) {
    const result = await validationModel.existsSettlement(client, ekatte);
    return result.rowCount > 0;
}

/**
 * Checks if a mayorality exists in the database.
 * @async
 * @param {pg.Client} client 
 * @param {string} mayoralityId 
 * @returns {Promise<boolean>}
 */
export async function checkMayoralityExists(client, mayoralityId) {
    const result = await validationModel.existsMayorality(client, mayoralityId);
    return result.rowCount > 0;
}

/**
 * Checks if a municipality exists in the database.
 * @async
 * @param {pg.Client} client 
 * @param {string} municipalityId 
 * @returns {Promise<boolean>}
 */
export async function checkMunicipalityExists(client, municipalityId) {
    const result = await validationModel.existsMunicipality(client, municipalityId);
    return result.rowCount > 0;
}

/**
 * Checks if a region exists in the database.
 * @async
 * @param {pg.Client} client 
 * @param {string} regionId 
 * @returns {Promise<boolean>}
 */
export async function checkRegionExists(client, regionId) {
    const result = await validationModel.existsRegion(client, regionId);
    return result.rowCount > 0;
}

/**
 * Checks if a region exists by NUTS3 code.
 * @async
 * @param {pg.Client} client 
 * @param {string} nuts3 
 * @returns {Promise<boolean>}
 */
export async function checkNuts3Exists(client, nuts3) {
    const result = await validationModel.existsRegionByNuts(client, nuts3);
    return result.rowCount > 0;
}

/**
 * Validates the specific format of a Region Code (3 alphabetical chars).
 * @param {string} regionId 
 * @returns {boolean}
 */
export function checkRegionCodeFormat(regionId) {
    if (typeof regionId !== "string") return false;
    const v = regionId.trim();
    return v.length === 3 && checkIsOnlyAlphabetical(v);
}

/**
 * Validates Municipality Code format (5 alphanumeric chars).
 * @param {string} municipalityId
 * @returns {boolean}
 */
export function checkMunicipalityCodeFormat(municipalityId) {
    if (typeof municipalityId !== "string") return false;
    const v = municipalityId.trim();
    return v.length === 5 && checkIsAlphaNumerical(v);
}

/**
 * Validates Mayorality Code format (8 chars: 5 alphanumeric + others).
 * @param {string} mayoralityId
 * @returns {boolean}
 */
export function checkMayoralityCodeFormat(mayoralityId) {
    if (typeof mayoralityId !== "string") return false;
    const v = mayoralityId.trim();
    return v.length === 8 && 
           checkIsAlphaNumerical(v.slice(0, 5)) && 
           checkIsOnlyNumerical(v.slice(-2));
}

/**
 * Validates EKATTE format (5 digits).
 * @param {string} ekatte
 * @returns {boolean}
 */
export function checkEkatteFormat(ekatte) {
    if (typeof ekatte !== "string") return false;
    const v = ekatte.trim();
    return v.length === 5 && checkIsOnlyNumerical(v);
}

/**
 * Validates NUTS3 format (2 alpha + 3 numerical).
 * @param {string} nuts3
 * @returns {boolean}
 */
export function checkNuts3Format(nuts3) {
    if (typeof nuts3 !== "string") return false;
    const v = nuts3.trim();
    return v.length === 5 &&
           checkIsOnlyAlphabetical(v.slice(0, 2)) &&
           checkIsOnlyNumerical(v.slice(2));
}

/**
 * Warns if a municipality contains settlements that are regional centers.
 * @async
 * @param {pg.Client} client
 * @param {string} municipalityId
 * @returns {Promise<{valid: boolean, message: string}>}
 */
export async function checkMunicipalityHasRegionCenters(client, municipalityId) {
    const result = await validationModel.getRegionCentersInMunicipality(client, municipalityId.trim());
    if (result.rowCount > 0) {
        return { valid: true, message: "Warning: This municipality contains a settlement that is a regional center!" };
    }
    return { valid: false, message: "OK" };
}

/**
 * Checks if any settlements within a specific municipality serve as regional centers.
 * @async
 * @param {pg.Client} client
 * @param {string} mayoralityId
 * @returns {Promise<{valid: boolean, message: string}>}
 */
export async function checkMayoralityHasMunicipalityOrRegionCenters(client, mayoralityId) {
    const result = await validationModel.getAffectedCentersByMayorality(client, mayoralityId);
    if (result.rowCount > 0) {
        const list = result.rows.map(row => `- ${row.affected_info}`).join('\n');
        return { 
            valid: true, 
            message: `Warning: This mayorality contains settlements with critical roles:\n${list}` 
        };
    }
    return { valid: false, message: "OK" };
}

/**
 * Checks if a settlement is registered as a center for any administrative unit.
 * @async
 * @param {pg.Client} client
 * @param {string} ekatte
 * @returns {Promise<{valid: boolean, message: string}>}
 */
export async function checkSettlementIsCenter(client, ekatte) {
    const result = await validationModel.getAffectedUnitsBySettlement(client, ekatte);
    if (result.rowCount > 0) {
        const list = result.rows.map(row => `- ${row.affected_name}`).join('\n');
        return { 
            valid: true, 
            message: `Warning: This settlement is a center for:\n${list}\nDeleting it will leave these units without a center!` 
        };
    }
    return { valid: false, message: "OK" };
}