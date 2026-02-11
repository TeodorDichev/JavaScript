import { ApiResponse } from "./api-response.js";

/**
 * Sends a standardized JSON response to the client.
 * This utility handles both successful and error responses, logging errors 
 * to the console for debugging when the status code is 400 or higher.
 *
 * @param {http.ServerResponse} serverResponse - The Node.js HTTP response object.
 * @param {number} code - The HTTP status code (e.g., 200, 400, 500).
 * @param {ApiResponse} response
 * @returns {void}
 */
export function sendResponse(serverResponse, code, response) {
    const successful = code < 400;

    if (!successful) {
        console.error(`[API Error ${code}]: ${response?.message}`);
        if (response?.errors.length > 0) console.error("Details:", response?.errors);
    }   

    serverResponse.writeHead(code, { "Content-Type": "application/json" });
    serverResponse.end(JSON.stringify(response));
}