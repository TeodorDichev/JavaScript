import { describe, it, expect, vi, beforeEach } from "vitest";
import * as settlementController from "../../src/controllers/settlement-controller.js";
import * as validation from "../../src/utils/validation.js";
import { settlementModel } from "../../src/models/settlement-model.js";

vi.mock("../../src/utils/validation.js");
vi.mock("../../src/models/settlement-model.js");

describe("Settlement Controller Handlers", () => {
  let mockRes;
  let mockClient;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockRes = {
      writeHead: vi.fn().mockReturnThis(),
      end: vi.fn()
    };

    mockClient = {
      query: vi.fn().mockResolvedValue({})
    };
  });

  describe("createSettlementHandler", () => {
    it("createSettlementHandler should collect multiple errors", async () => {
        validation.checkEkatteFormat.mockReturnValue(false);
        validation.checkMunicipalityExists.mockResolvedValue(false);

        await settlementController.createSettlementHandler(mockRes, mockClient, { ekatte: "bad", name: "123" });

        expect(mockRes.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
        const response = JSON.parse(mockRes.end.mock.calls[0][0]);
        expect(response.errors).toContain("Невалиден формат на ekatte");
        expect(response.errors).toContain("Няма такава община");
    });

    it("should return 400 when validation fails", async () => {
      validation.checkEkatteFormat.mockReturnValue(false);
      validation.checkIsOnlyAlphabetical.mockReturnValue(true);

      const bodyData = { ekatte: "wrong", name: "София" };
      await settlementController.createSettlementHandler(mockRes, mockClient, bodyData);

      expect(mockRes.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
      const response = JSON.parse(mockRes.end.mock.calls[0][0]);
      expect(response.errors).toContain("Невалиден формат на ekatte");
    });

    it("should return 201 and call model on success", async () => {
      validation.checkEkatteFormat.mockReturnValue(true);
      validation.checkSettlementExists.mockResolvedValue(false);
      validation.checkIsOnlyAlphabetical.mockReturnValue(true);
      validation.isPositiveInteger.mockReturnValue(true);
      validation.checkMunicipalityCodeFormat.mockReturnValue(true);
      validation.checkMunicipalityExists.mockResolvedValue(true);

      const bodyData = { 
        ekatte: "68134", name: "София", transliteration: "Sofia", 
        category: 1, altitude_id: 1, settlement_type_id: 1, municipality_id: "SOF46" 
      };

      await settlementController.createSettlementHandler(mockRes, mockClient, bodyData);

      expect(settlementModel.create).toHaveBeenCalledWith(mockClient, bodyData);
      expect(mockRes.writeHead).toHaveBeenCalledWith(201, expect.any(Object));
    });
  });

  describe("deleteSettlementHandler", () => {
    it("deleteSettlementHandler should handle invalid ID format (Line 69)", async () => {
        validation.checkEkatteFormat.mockReturnValue(false);
        const parsedUrl = { searchParams: new URLSearchParams("id=abc") };

        await settlementController.deleteSettlementHandler(mockRes, parsedUrl, mockClient);

        expect(mockRes.writeHead).toHaveBeenCalledWith(400, expect.any(Object));
        expect(JSON.parse(mockRes.end.mock.calls[0][0]).message).toBe("Невалиден формат");
    });

    it("should rollback and return 404 if record doesn't exist", async () => {
      validation.checkEkatteFormat.mockReturnValue(true);
      const parsedUrl = { searchParams: new URLSearchParams("id=12345") };
      
      settlementModel.deleteRecord.mockResolvedValue({ rowCount: 0 });

      await settlementController.deleteSettlementHandler(mockRes, parsedUrl, mockClient);

      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
      expect(mockRes.writeHead).toHaveBeenCalledWith(404, expect.any(Object));
    });

    it("should commit if deletion is successful", async () => {
      validation.checkEkatteFormat.mockReturnValue(true);
      const parsedUrl = { searchParams: new URLSearchParams("id=12345") };
      settlementModel.deleteRecord.mockResolvedValue({ rowCount: 1 });

      await settlementController.deleteSettlementHandler(mockRes, parsedUrl, mockClient);

      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
      expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
    });

    it("deleteSettlementHandler should handle system error and rollback", async () => {
        validation.checkEkatteFormat.mockReturnValue(true);
        const parsedUrl = { searchParams: new URLSearchParams("id=12345") };
        settlementModel.deleteRecord.mockRejectedValue(new Error("Database connection lost"));

        await settlementController.deleteSettlementHandler(mockRes, parsedUrl, mockClient);

        expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
        expect(mockRes.writeHead).toHaveBeenCalledWith(500, expect.any(Object));
    });
  });

  describe("editSettlementHandler", () => {
    it("should clear centers if territorial affiliation changed", async () => {
      validation.checkEkatteFormat.mockReturnValue(true);
      validation.checkIsOnlyAlphabetical.mockReturnValue(true);
      validation.isPositiveInteger.mockReturnValue(true);
      validation.checkMunicipalityCodeFormat.mockReturnValue(true);
      validation.checkMunicipalityExists.mockResolvedValue(true);

      const parsedUrl = { pathname: "/settlements/12345" };
      const bodyData = { altitude_id: "1", type_id: "1", changed_territorial_affiliation: true, name: "Тест" };

      await settlementController.editSettlementHandler(mockRes, parsedUrl, mockClient, bodyData);
      expect(settlementModel.clearSettlementCenters).toHaveBeenCalledWith(mockClient, "12345");
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
    });

    it("editSettlementHandler should trigger multiple validation errors", async () => {
        validation.checkEkatteFormat.mockReturnValue(true);
        validation.checkIsOnlyAlphabetical.mockReturnValue(false);
        validation.isPositiveInteger.mockReturnValue(false);

        const bodyData = { name: "123", category: "not-a-number" };
        await settlementController.editSettlementHandler(mockRes, { pathname: "/12345" }, mockClient, bodyData);

        const response = JSON.parse(mockRes.end.mock.calls[0][0]);
        expect(response.errors).toContain("Невалидно име");
        expect(response.errors).toContain("Невалидна категория");
    });
  });

  describe("Home and Info Handlers", () => {
    it("homeSettlementsHandler should handle empty results and no query", async () => {
        const parsedUrl = { searchParams: new URLSearchParams("") };
        
        settlementModel.getSettlementStats.mockResolvedValue({ rows: [] });
        settlementModel.getCount.mockResolvedValue(100);

        await settlementController.homeSettlementsHandler(mockRes, parsedUrl, mockClient);

        const response = JSON.parse(mockRes.end.mock.calls[0][0]);
        expect(response.data.filteredCount).toBe(100);
        expect(response.data.pagination.total).toBe(0);
    });

    it("infoSettlementHandler should return settlement details", async () => {
        const parsedUrl = { searchParams: new URLSearchParams("q=12345") };
        const mockData = { ekatte: "12345", name: "Тест" };
        settlementModel.getInfoByEkatte.mockResolvedValue(mockData);

        await settlementController.infoSettlementHandler(mockRes, parsedUrl, mockClient);

        expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
        expect(JSON.parse(mockRes.end.mock.calls[0][0]).data).toEqual(mockData);
    });

    it("infoSettlementHandler should handle errors", async () => {
        settlementModel.getInfoByEkatte.mockRejectedValue(new Error("DB Error"));
        
        await settlementController.infoSettlementHandler(mockRes, { searchParams: new URLSearchParams("q=12") }, mockClient);

        expect(mockRes.writeHead).toHaveBeenCalledWith(500, expect.any(Object));
    });
  });

  describe("exportHandlers", () => {
    let mockUrl;

    beforeEach(() => {
      mockUrl = new URL("http://localhost/export?q=sofia&sort=settlement_name:desc");
    });

    it("should export Excel with correct structure, performance stats and formatted nulls", async () => {
        settlementModel.getSettlementStats.mockResolvedValue([
            { ekatte: '68134', settlement_name: 'София', mayorality_name: null }
        ]);

        await settlementController.exportExcelSettlementHandler(mockRes, mockUrl, mockClient);

        const response = JSON.parse(mockRes.end.mock.calls[0][0]);
        
        expect(response.data.payload.blob).toBeDefined();
        expect(response.data.payload.performance).toBeDefined();
        expect(response.data.payload.performance.time).toMatch(/s$/);
        
        expect(settlementModel.getSettlementStats).toHaveBeenCalledWith(
            mockClient, 
            expect.objectContaining({ limit: null })
        );
        
        expect(response.data.filename).toContain("settlement_export_excel");
    });

    it("should export CSV with BOM, correct structure and replaced nulls", async () => {
        settlementModel.getSettlementStats.mockResolvedValue([
            { ekatte: '68134', settlement_name: 'София', mayorality_name: null }
        ]);

        await settlementController.exportCsvSettlementHandler(mockRes, mockUrl, mockClient);

        const response = JSON.parse(mockRes.end.mock.calls[0][0]);
        const payload = response.data.payload;

        const csvContent = Buffer.from(payload.blob, 'base64').toString('utf8');
        
        expect(csvContent.startsWith('\uFEFF')).toBe(true);
        expect(csvContent).toContain('"-"');
        expect(payload.performance).toBeDefined();
        expect(response.data.filename).toContain("settlement_export_csv");
    });
  });
});