import { describe, it, expect, vi, beforeEach } from "vitest";
import * as mayoralityController from "../../src/controllers/mayorality-controller.js";
import * as validation from "../../src/utils/validation.js";
import { mayoralityModel } from "../../src/models/mayorality-model.js";
import { sendResponse } from "../../src/utils/response-helper.js";

vi.mock("../../src/utils/validation.js");
vi.mock("../../src/models/mayorality-model.js");
vi.mock("../../src/models/settlement-model.js");
vi.mock("../../src/utils/response-helper.js");

describe("Mayorality Controller Handlers", () => {
    let mockRes, mockClient;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRes = {}; 
        mockClient = { query: vi.fn().mockResolvedValue({}) };
    });

    describe("createMayoralityHandler", () => {
        it("should return 400 if data is missing or invalid", async () => {
            validation.checkEkatteFormat.mockReturnValue(false);
            await mayoralityController.createMayoralityHandler(mockRes, mockClient, { mayorality: {}, center: {} });
            
            expect(sendResponse).toHaveBeenCalledWith(mockRes, 400, expect.any(Object));
        });

        it("should commit transaction on successful creation", async () => {
            validation.checkEkatteFormat.mockReturnValue(true);
            validation.checkSettlementExists.mockResolvedValue(false);
            validation.checkMayoralityExists.mockResolvedValue(false);
            validation.checkIsOnlyAlphabetical.mockReturnValue(true);

            const body = { mayorality: { mayorality_id: "1" }, center: { ekatte: "123", name: "Test" } };
            await mayoralityController.createMayoralityHandler(mockRes, mockClient, body);

            expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
            expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
            expect(sendResponse).toHaveBeenCalledWith(mockRes, 201, expect.any(Object));
        });

        it("should rollback on system error", async () => {
            validation.checkEkatteFormat.mockReturnValue(true);
            mayoralityModel.create.mockRejectedValue(new Error("DB Fail"));
            
            await mayoralityController.createMayoralityHandler(mockRes, mockClient, { mayorality: {}, center: {} });
            
            expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
            expect(sendResponse).toHaveBeenCalledWith(mockRes, 500, expect.any(Object));
        });
    });

    describe("deleteMayoralityHandler", () => {
        it("should return 400 for invalid id format", async () => {
            validation.checkMayoralityCodeFormat.mockReturnValue(false);
            const url = { searchParams: new URLSearchParams("id=bad") };
            
            await mayoralityController.deleteMayoralityHandler(mockRes, url, mockClient);
            expect(sendResponse).toHaveBeenCalledWith(mockRes, 400, expect.any(Object));
        });

        it("should rollback and return 404 if rowCount is 0", async () => {
            validation.checkMayoralityCodeFormat.mockReturnValue(true);
            mayoralityModel.deleteRecord.mockResolvedValue({ rowCount: 0 });
            const url = { searchParams: new URLSearchParams("id=123") };
            
            await mayoralityController.deleteMayoralityHandler(mockRes, url, mockClient);
            expect(sendResponse).toHaveBeenCalledWith(mockRes, 404, expect.any(Object));
        });
    });

    describe("homeMayoralityHandler", () => {
        it("should return paginated stats", async () => {
            const url = { searchParams: new URLSearchParams("q=test&page=1") };
            mayoralityModel.getMayoralityStats.mockResolvedValue([{ total_count: "10" }]);
            mayoralityModel.getCount.mockResolvedValue(100);

            await mayoralityController.homeMayoralityHandler(mockRes, url, mockClient);

            const response = sendResponse.mock.calls[0][2];
            expect(response.data.pagination.total).toBe(10);
        });
    });

    describe("searchMayoralityHandler", () => {
        it("should format filtered results correctly", async () => {
            const url = { searchParams: new URLSearchParams("q=sof") };
            mayoralityModel.getFiltered.mockResolvedValue({ 
                rows: [{ mayorality_id: "1", mayorality_name: "M", municipality_name: "Mun", region_name: "R" }] 
            });

            await mayoralityController.searchMayoralityHandler(mockRes, url, mockClient);

            const response = sendResponse.mock.calls[0][2];
            expect(response.data[0].name).toContain("M, Mun, R");
        });
    });

    describe("exportHandlers", () => {
        let mockUrl;
        beforeEach(() => {
            mockUrl = new URL("http://localhost/export?q=test&sort=mayorality_name:asc");
        });

        it("should export Excel with correct structure and metadata", async () => {
            mayoralityModel.getMayoralityStats.mockResolvedValue([
                { mayorality_id: '123', mayorality_name: 'Test', center_name: null }
            ]);

            await mayoralityController.exportExcelMayoralityHandler(mockRes, mockUrl, mockClient);

            const response = sendResponse.mock.calls[0][2];
            expect(response.data.payload.blob).toBeDefined();
            expect(response.data.filename).toMatch(/\.xlsx$/);
        });

        it("should export CSV with BOM and replaced nulls", async () => {
            mayoralityModel.getMayoralityStats.mockResolvedValue([
                { mayorality_id: '123', mayorality_name: 'Test', center_name: null }
            ]);

            await mayoralityController.exportCsvMayoralityHandler(mockRes, mockUrl, mockClient);

            const response = sendResponse.mock.calls[0][2];
            const csvContent = Buffer.from(response.data.payload.blob, 'base64').toString('utf8');
            
            expect(csvContent.charCodeAt(0)).toBe(0xFEFF);
            expect(csvContent).toContain('"-"');
            expect(response.data.filename).toMatch(/\.csv$/);
        });
    });
});