import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleImport } from "../../../src/controllers/apiFetchController.js";
import { state } from "../../../src/controllers/state.js";
import * as apiService from "../../../src/services/apiFetchService.js";
import * as processService from "../../../src/services/processService.js";

vi.mock("../../../src/services/apiFetchService.js");
vi.mock("../../../src/services/processService.js");

describe("API fetch Controller", () => {
    let mockRes;
    
    beforeEach(() => {
        vi.clearAllMocks();
        state.isImporting = false;

        mockRes = {
            writeHead: vi.fn(),
            end: vi.fn()
        };
    });

    it("should return 429 if an import is already in progress", async () => {
        state.isImporting = true;

        const mockUrl = { searchParams: new URLSearchParams("count=10") };
        await handleImport({}, mockRes, mockUrl);

        expect(mockRes.writeHead).toHaveBeenCalledWith(429, expect.any(Object));
        expect(mockRes.end).toHaveBeenCalledWith(expect.stringContaining("В момента тече друг процес"));
    });

    it("should return 202 and start the services if idle", async () => {
        const mockUrl = { searchParams: new URLSearchParams("count=50") };
        
        await handleImport({}, mockRes, mockUrl);

        expect(mockRes.writeHead).toHaveBeenCalledWith(202, expect.any(Object));
        expect(mockRes.end).toHaveBeenCalledWith(expect.stringContaining("Започна пълен импорт"));

        expect(apiService.runApiFetch).toHaveBeenCalledWith(50);
    });

    it("should reset state.isImporting to false even if service fails", async () => {
        apiService.runApiFetch.mockRejectedValue(new Error("Network Fail"));
        
        const mockUrl = { searchParams: new URLSearchParams("count=1") };
        
        await handleImport({}, mockRes, mockUrl);
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(state.isImporting).toBe(false);
    });
});