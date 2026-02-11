import { describe, it, expect, vi, beforeEach } from "vitest";
import * as regionController from "../../src/controllers/region-controller.js";
import * as validation from "../../src/utils/validation.js";
import { regionModel } from "../../src/models/region-model.js";
import { municipalityModel } from "../../src/models/municipality-model.js";
import { mayoralityModel } from "../../src/models/mayorality-model.js";
import { settlementModel } from "../../src/models/settlement-model.js";

vi.mock("../../src/utils/validation.js");
vi.mock("../../src/models/region-model.js");
vi.mock("../../src/models/municipality-model.js");
vi.mock("../../src/models/mayorality-model.js");
vi.mock("../../src/models/settlement-model.js");

describe("Region Controller Handlers", () => {
    let mockRes, mockClient;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRes = { writeHead: vi.fn().mockReturnThis(), end: vi.fn() };
        mockClient = { query: vi.fn().mockResolvedValue({}) };
    });

    describe("createRegionHandler", () => {
        it("should return 400 for missing data or validation errors", async () => {
            validation.checkRegionCodeFormat.mockReturnValue(false);
            await regionController.createRegionHandler(mockRes, mockClient, { region: {}, municipality: {}, mayorality: {}, center: {} });
            expect(mockRes.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
        });

        it("should execute full administrative hierarchy creation on success", async () => {
            validation.checkRegionCodeFormat.mockReturnValue(true);
            validation.checkRegionExists.mockResolvedValue(false);
            validation.checkNuts3Format.mockReturnValue(true);
            validation.checkNuts3Exists.mockResolvedValue(false);
            validation.checkSettlementExists.mockResolvedValue(false);
            validation.checkMunicipalityExists.mockResolvedValue(false);
            validation.checkMayoralityExists.mockResolvedValue(false);

            await regionController.createRegionHandler(mockRes, mockClient, { 
                region: { region_id: 'SOF' }, 
                municipality: { municipality_id: 'SOF46' }, 
                mayorality: { mayorality_id: 'SOF46-00' }, 
                center: { ekatte: '68134' } 
            });

            expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
            expect(regionModel.create).toHaveBeenCalled();
            expect(regionModel.createCenter).toHaveBeenCalled();
            expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
            expect(mockRes.writeHead).toHaveBeenCalledWith(201, expect.any(Object));
        });

        it("should rollback on transaction failure", async () => {
            validation.checkRegionCodeFormat.mockReturnValue(true);
            regionModel.create.mockRejectedValue(new Error("Hierarchy Break"));
            await regionController.createRegionHandler(mockRes, mockClient, { region: {}, municipality: {}, mayorality: {}, center: {} });
            expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
            expect(mockRes.writeHead).toHaveBeenCalledWith(500, expect.any(Object));
        });
    });

    describe("deleteRegionHandler", () => {
        it("should execute cascading deletion of all subdivisions", async () => {
            validation.checkRegionCodeFormat.mockReturnValue(true);
            regionModel.deleteRecord.mockResolvedValue({ rowCount: 1 });
            const url = { searchParams: new URLSearchParams("id=SOF") };

            await regionController.deleteRegionHandler(mockRes, url, mockClient);

            expect(regionModel.deleteSettlementsByRegion).toHaveBeenCalled();
            expect(regionModel.deleteMunicipalitiesByRegion).toHaveBeenCalled();
            expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
        });

        it("should return 404 if region does not exist", async () => {
            validation.checkRegionCodeFormat.mockReturnValue(true);
            regionModel.deleteRecord.mockResolvedValue({ rowCount: 0 });
            await regionController.deleteRegionHandler(mockRes, { searchParams: new URLSearchParams("id=UNK") }, mockClient);
            expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
            expect(mockRes.writeHead).toHaveBeenCalledWith(404, expect.any(Object));
        });
    });

    describe("editRegionHandler", () => {
        it("should validate NUTS3 and center existence", async () => {
            validation.checkRegionCodeFormat.mockReturnValue(true);
            validation.checkIsOnlyAlphabetical.mockReturnValue(true);
            validation.checkEkatteFormat.mockReturnValue(true);
            validation.checkSettlementExists.mockResolvedValue(false);

            await regionController.editRegionHandler(mockRes, { pathname: "/SOF" }, mockClient, { name: "Sofia", center_id: "00000" });
            expect(mockRes.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
        });

        it("should update region and its NUTS3 ID", async () => {
            validation.checkRegionCodeFormat.mockReturnValue(true);
            validation.checkIsOnlyAlphabetical.mockReturnValue(true);
            validation.checkEkatteFormat.mockReturnValue(true);
            validation.checkSettlementExists.mockResolvedValue(true);
            validation.checkNuts3Format.mockReturnValue(true);
            validation.checkNuts3Exists.mockResolvedValue(false);

            const body = { name: "Sofia", transliteration: "Sofia", changed_nuts3: true, nuts3: "BG411", center_id: "68134" };
            await regionController.editRegionHandler(mockRes, { pathname: "/SOF" }, mockClient, body);
            
            expect(regionModel.update).toHaveBeenCalled();
            expect(regionModel.setCenter).toHaveBeenCalled();
            expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
        });
    });

    describe("searchRegionHandler", () => {
        it("should return mapped region results", async () => {
            regionModel.getFiltered.mockResolvedValue({ rows: [{ region_id: "SOF", region_name: "Sofia" }] });
            await regionController.searchRegionHandler(mockRes, { searchParams: new URLSearchParams("q=sof") }, mockClient);
            const response = JSON.parse(mockRes.end.mock.calls[0][0]);
            expect(response.data[0].id).toBe("SOF");
        });
    });

    describe("homeRegionHandler", () => {
        it("should return stats with correct filtered count", async () => {
            regionModel.getRegionStats.mockResolvedValue({ rows: [{ total_count: "28" }] });
            regionModel.getCount.mockResolvedValue(28);
            await regionController.homeRegionHandler(mockRes, { searchParams: new URLSearchParams("q=test") }, mockClient);
            const response = JSON.parse(mockRes.end.mock.calls[0][0]);
            expect(response.data.totalCount).toBe(28);
        });
    });

    describe("infoRegionHandler", () => {
        it("should fetch specific region details", async () => {
            await regionController.infoRegionHandler(mockRes, { searchParams: new URLSearchParams("q=SOF") }, mockClient);
            expect(regionModel.getInfo).toHaveBeenCalledWith(mockClient, "SOF");
        });
    });

    describe("regionCenterCandidatesHandler", () => {
        it("should limit center candidates to top 10", async () => {
            regionModel.getCenterCandidates.mockResolvedValue({ 
                rows: Array(15).fill({ ekatte: "1", name: "N" }) 
            });
            await regionController.regionCenterCandidatesHandler(mockRes, { searchParams: new URLSearchParams("id=SOF&q=a") }, mockClient);
            const response = JSON.parse(mockRes.end.mock.calls[0][0]);
            expect(response.data.length).toBe(10);
        });
    });

    describe("exportHandlers", () => {
        let mockUrl;

        beforeEach(() => {
        mockUrl = new URL("http://localhost/export?q=test&sort=region_name:asc");
        });

        it("should export Excel with correct structure, performance stats and formatted nulls", async () => {
            regionModel.getRegionStats.mockResolvedValue([
                { region_id: '123', region_name: 'Test Region', center_name: null }
            ]);

            await regionController.exportExcelRegionHandler(mockRes, mockUrl, mockClient);

            const response = JSON.parse(mockRes.end.mock.calls[0][0]);
            
            expect(response.data.payload.blob).toBeDefined();
            expect(response.data.payload.performance).toBeDefined();
            expect(response.data.payload.performance.time).toMatch(/s$/);
            
            expect(regionModel.getRegionStats).toHaveBeenCalledWith(
                mockClient, 
                expect.objectContaining({ limit: null })
            );
            
            expect(response.data.filename).toContain("region_export_excel");
        });

        it("should export CSV with BOM, correct structure and replaced nulls", async () => {
            regionModel.getRegionStats.mockResolvedValue([
                { region_id: '123', region_name: 'Test Region', center_name: null }
            ]);

            await regionController.exportCsvRegionHandler(mockRes, mockUrl, mockClient);

            const response = JSON.parse(mockRes.end.mock.calls[0][0]);
            const payload = response.data.payload;
            
            const csvContent = Buffer.from(payload.blob, 'base64').toString('utf8');
            
            expect(csvContent.startsWith('\uFEFF')).toBe(true);
            expect(csvContent).toContain('"-"');
            expect(payload.performance).toBeDefined();
            expect(response.data.filename).toContain("region_export_csv");
        });
    });
});