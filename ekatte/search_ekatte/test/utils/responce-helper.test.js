import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendResponse } from "../../src/utils/response-helper.js";
import { ApiResponse } from "../../src/utils/api-response.js";

describe("Response Helper Unit Tests", () => {
    let mockRes;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRes = {
            writeHead: vi.fn().mockReturnThis(),
            end: vi.fn()
        };
        vi.spyOn(console, "error").mockImplementation(() => {});
    });

    it("should send a successful response for status 200", () => {
        const payload = ApiResponse.success({ id: 1 }, "Success");
        sendResponse(mockRes, 200, payload);

        expect(mockRes.writeHead).toHaveBeenCalledWith(200, { "Content-Type": "application/json" });
        
        const body = JSON.parse(mockRes.end.mock.calls[0][0]);
        expect(body.ok).toBe(true);
        expect(body.message).toBe("Success");
        expect(body.data).toEqual({ id: 1 });
    });

    it("should log error and send response for status 400+", () => {
        const payload = ApiResponse.error("Bad Request", ["Invalid ID"]);
        sendResponse(mockRes, 400, payload);

        expect(console.error).toHaveBeenCalled();
        const body = JSON.parse(mockRes.end.mock.calls[0][0]);
        expect(body.ok).toBe(false);
        expect(body.errors).toEqual(["Invalid ID"]);
    });

    it("should handle the response exactly as provided without modifications", () => {
        const payload = { ok: false, data: null, message: "Custom", errors: ["test"] };
        sendResponse(mockRes, 500, payload);

        const body = JSON.parse(mockRes.end.mock.calls[0][0]);
        expect(body).toEqual(payload);
    });

    it("should log details only if errors exist", () => {
        const payload = ApiResponse.error("Simple Error", []);
        sendResponse(mockRes, 404, payload);

        expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Simple Error"));
        expect(console.error).not.toHaveBeenCalledWith("Details:", expect.any(Array));
    });

    it("should handle undefined response gracefully", () => {
        sendResponse(mockRes, 200, undefined);

        expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify(undefined));
    });
});