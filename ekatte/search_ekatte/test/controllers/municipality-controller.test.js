import { describe, it, expect, vi, beforeEach } from "vitest";
import * as municipalityController from "../../src/controllers/municipality-controller.js";
import * as validation from "../../src/utils/validation.js";
import { municipalityModel } from "../../src/models/municipality-model.js";
import { mayoralityModel } from "../../src/models/mayorality-model.js";
import { settlementModel } from "../../src/models/settlement-model.js";

vi.mock("../../src/utils/validation.js");
vi.mock("../../src/models/municipality-model.js");
vi.mock("../../src/models/mayorality-model.js");
vi.mock("../../src/models/settlement-model.js");

describe("Municipality Controller Handlers", () => {
    let mockRes, mockClient;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRes = { writeHead: vi.fn().mockReturnThis(), end: vi.fn() };
        mockClient = { query: vi.fn().mockResolvedValue({}) };
    });

    describe("createMunicipalityHandler", () => {
        it("should return 400 for missing or duplicate entities", async () => {
            validation.checkEkatteFormat.mockReturnValue(true);
            validation.checkSettlementExists.mockResolvedValue(true);
            await municipalityController.createMunicipalityHandler(mockRes, mockClient, { municipality: {}, mayorality: {}, center: {} });
            expect(mockRes.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
        });

        it("should execute full transaction on success", async () => {
            validation.checkEkatteFormat.mockReturnValue(true);
            validation.checkSettlementExists.mockResolvedValue(false);
            validation.checkMunicipalityCodeFormat.mockReturnValue(true);
            validation.checkMunicipalityExists.mockResolvedValue(false);
            validation.checkMayoralityExists.mockResolvedValue(false);

            await municipalityController.createMunicipalityHandler(mockRes, mockClient, { municipality: {}, mayorality: {}, center: {} });

            expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
            expect(municipalityModel.create).toHaveBeenCalled();
            expect(mayoralityModel.create).toHaveBeenCalled();
            expect(municipalityModel.createCenter).toHaveBeenCalled();
            expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
            expect(mockRes.writeHead).toHaveBeenCalledWith(201, expect.any(Object));
        });
    });

    describe("deleteMunicipalityHandler", () => {
        it("should call cascaded deletion methods in order", async () => {
            validation.checkMunicipalityCodeFormat.mockReturnValue(true);
            municipalityModel.deleteRecord.mockResolvedValue({ rowCount: 1 });
            const url = { searchParams: new URLSearchParams("id=SOF46") };

            await municipalityController.deleteMunicipalityHandler(mockRes, url, mockClient);

            expect(municipalityModel.deleteMayoralityCenters).toHaveBeenCalled();
            expect(municipalityModel.deleteSettlements).toHaveBeenCalled();
            expect(municipalityModel.deleteMayoralities).toHaveBeenCalled();
            expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
        });

        it("should return 500 and rollback if validation fails", async () => {
            validation.checkMunicipalityCodeFormat.mockReturnValue(true);
            municipalityModel.deleteRecord.mockResolvedValue({ rowCount: 0 });
            await municipalityController.deleteMunicipalityHandler(mockRes, { searchParams: new URLSearchParams("id=MISS") }, mockClient);
            expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
            expect(mockRes.writeHead).toHaveBeenCalledWith(500, expect.any(Object));
        });
    });

    describe("editMunicipalityHandler", () => {
        it("should validate name and center existence before update", async () => {
            validation.checkMunicipalityCodeFormat.mockReturnValue(true);
            validation.checkIsOnlyAlphabetical.mockReturnValue(true);
            validation.checkEkatteFormat.mockReturnValue(true);
            validation.checkSettlementExists.mockResolvedValue(false);

            await municipalityController.editMunicipalityHandler(mockRes, { pathname: "/SOF46" }, mockClient, { name: "Sofia", center_id: "00000" });
            expect(mockRes.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
        });

        it("should update municipality and reset center center", async () => {
            validation.checkMunicipalityCodeFormat.mockReturnValue(true);
            validation.checkIsOnlyAlphabetical.mockReturnValue(true);
            validation.checkEkatteFormat.mockReturnValue(true);
            validation.checkSettlementExists.mockResolvedValue(true);

            await municipalityController.editMunicipalityHandler(mockRes, { pathname: "/SOF46" }, mockClient, { name: "Sofia", center_id: "68134" });
            expect(municipalityModel.update).toHaveBeenCalled();
            expect(municipalityModel.setCenter).toHaveBeenCalledWith(mockClient, "SOF46", "68134");
        });
    });

    describe("homeMunicipalityHandler", () => {
        it("should return pagination metadata", async () => {
            municipalityModel.getMunicipalityStats.mockResolvedValue([{ total_count: "50" }]);
            municipalityModel.getCount.mockResolvedValue(50);
            await municipalityController.homeMunicipalityHandler(mockRes, { searchParams: new URLSearchParams("page=1&limit=10") }, mockClient);
            const response = JSON.parse(mockRes.end.mock.calls[0][0]);
            expect(response.data.pagination.totalPages).toBe(5);
        });
    });

    describe("searchMunicipalityHandler", () => {
        it("should return formatted top 10 results", async () => {
            municipalityModel.getFiltered.mockResolvedValue({ 
                rows: [{ municipality_id: "1", municipality_name: "M", region_name: "R" }] 
            });
            await municipalityController.searchMunicipalityHandler(mockRes, { searchParams: new URLSearchParams("q=test") }, mockClient);
            const response = JSON.parse(mockRes.end.mock.calls[0][0]);
            expect(response.data[0].name).toBe("M, R");
        });
    });

    describe("infoMunicipalityHandler", () => {
        it("should handle model errors with 500", async () => {
            municipalityModel.getInfo.mockRejectedValue(new Error("Fatal"));
            await municipalityController.infoMunicipalityHandler(mockRes, { searchParams: new URLSearchParams("q=1") }, mockClient);
            expect(mockRes.writeHead).toHaveBeenCalledWith(500, expect.any(Object));
        });
    });

    describe("municipalityCenterCandidatesHandler", () => {
        it("should fetch candidates by municipality id", async () => {
            await municipalityController.municipalityCenterCandidatesHandler(mockRes, { searchParams: new URLSearchParams("id=SOF&q=a") }, mockClient);
            expect(municipalityModel.getCenterCandidates).toHaveBeenCalledWith(mockClient, "a", "SOF");
        });
    });

    describe("exportHandlers", () => {
        let mockUrl;

        beforeEach(() => {
        mockUrl = new URL("http://localhost/export?q=test&sort=municipality_name:asc");
        });

        it("should export Excel with correct structure, performance stats and formatted nulls", async () => {
            municipalityModel.getMunicipalityStats.mockResolvedValue([
                { municipality_id: '123', municipality_name: 'Test Municipality', region_name: null }
            ]);

            await municipalityController.exportExcelMunicipalityHandler(mockRes, mockUrl, mockClient);

            const response = JSON.parse(mockRes.end.mock.calls[0][0]);
            
            expect(response.data.payload.blob).toBeDefined();
            expect(response.data.payload.performance).toBeDefined();
            expect(response.data.payload.performance.time).toMatch(/s$/);
            
            expect(municipalityModel.getMunicipalityStats).toHaveBeenCalledWith(
                mockClient, 
                expect.objectContaining({ limit: null })
            );
            
            expect(response.data.filename).toContain("municipality_export_excel");
        });

        it("should export CSV with BOM, correct structure and replaced nulls", async () => {
            municipalityModel.getMunicipalityStats.mockResolvedValue([
                { municipality_id: '123', municipality_name: 'Test Municipality', region_name: null }
            ]);

            await municipalityController.exportCsvMunicipalityHandler(mockRes, mockUrl, mockClient);

            const response = JSON.parse(mockRes.end.mock.calls[0][0]);
            const payload = response.data.payload;
            
            const csvContent = Buffer.from(payload.blob, 'base64').toString('utf8');
            
            expect(csvContent.startsWith('\uFEFF')).toBe(true);
            expect(csvContent).toContain('"-"');
            expect(payload.performance).toBeDefined();
            expect(response.data.filename).toContain("municipality_export_csv");
        });
    });
});