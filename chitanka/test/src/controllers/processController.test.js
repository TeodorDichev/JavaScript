import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleProcess } from "../../../src/controllers/processController.js";
import { state } from "../../../src/controllers/state.js";
import * as processService from "../../../src/services/processService.js";

vi.mock("../../../src/services/processService.js");

describe("Process Controller", () => {
    let mockRes;

    beforeEach(() => {
        vi.clearAllMocks();
        state.isImporting = false;

        mockRes = {
            writeHead: vi.fn().mockReturnThis(),
            end: vi.fn()
        };
    });

    it("should return 429 if state.isImporting is already true", async () => {
        state.isImporting = true;

        await handleProcess({}, mockRes);

        expect(mockRes.writeHead).toHaveBeenCalledWith(429, expect.any(Object));
        expect(mockRes.end).toHaveBeenCalledWith(expect.stringContaining("В момента тече друг процес"));
    });

    it("should return 202 and start the file processor", async () => {
        await handleProcess({}, mockRes);

        expect(mockRes.writeHead).toHaveBeenCalledWith(202, expect.any(Object));
        expect(mockRes.end).toHaveBeenCalledWith(expect.stringContaining("Започна обработка"));

        await vi.waitFor(() => {
            expect(processService.runFileProcessor).toHaveBeenCalled();
        });
    });

    it("should reset state.isImporting to false even if runFileProcessor fails", async () => {
        processService.runFileProcessor.mockRejectedValue(new Error("Processing Fail"));

        await handleProcess({}, mockRes);

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(state.isImporting).toBe(false);
    });
});