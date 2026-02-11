import { describe, it, expect, vi, beforeEach } from "vitest";
import { globalSearchHandler } from "../../src/controllers/home-controller.js";
import { settlementModel } from "../../src/models/settlement-model.js";
import { regionModel } from "../../src/models/region-model.js";
import { municipalityModel } from "../../src/models/municipality-model.js";
import { mayoralityModel } from "../../src/models/mayorality-model.js";
import { sendResponse } from "../../src/utils/response-helper.js";

vi.mock("../../src/utils/response-helper.js");
vi.mock("../../src/models/settlement-model.js");
vi.mock("../../src/models/region-model.js");
vi.mock("../../src/models/municipality-model.js");
vi.mock("../../src/models/mayorality-model.js");

describe("globalSearchHandler", () => {
  let mockRes;
  let mockClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = {
      writeHead: vi.fn().mockReturnThis(),
      end: vi.fn(),
    };
    mockClient = {};

    regionModel.getCount.mockResolvedValue(10);
    municipalityModel.getCount.mockResolvedValue(20);
    mayoralityModel.getCount.mockResolvedValue(30);
    settlementModel.getCount.mockResolvedValue(40);
  });

  it("should calculate filtered counts when query is present", async () => {
    const parsedUrl = new URL(
      "http://localhost/api/global?q=sofia&page=2&limit=5",
    );

    settlementModel.getSettlementStats.mockResolvedValue([
      { total_count: "15", name: "Sofia" },
    ]);

    regionModel.getCount.mockResolvedValue(10);
    municipalityModel.getCount.mockResolvedValue(20);
    mayoralityModel.getCount.mockResolvedValue(30);
    settlementModel.getCount.mockResolvedValue(40);

    regionModel.getFilteredCount.mockResolvedValue(1);
    municipalityModel.getFilteredCount.mockResolvedValue(2);
    mayoralityModel.getFilteredCount.mockResolvedValue(3);
    settlementModel.getFilteredCount.mockResolvedValue(4);

    await globalSearchHandler(mockRes, parsedUrl, mockClient);

    const response = sendResponse.mock.calls[0][2];

    expect(response.data.filteredRegionsCount).toBe(1);
    expect(response.data.pagination.page).toBe(2);
    expect(response.data.pagination.totalPages).toBe(3);

    expect(settlementModel.getSettlementStats).toHaveBeenCalledWith(
      mockClient,
      { q: "sofia", sort: "", limit: 5, offset: 5 },
      "global",
    );
  });

  it("should calculate filtered counts when query is present", async () => {
    const parsedUrl = {
      searchParams: new URLSearchParams("q=sofia&page=2&limit=5"),
    };
    settlementModel.getSettlementStats.mockResolvedValue([
      { total_count: "15", name: "Sofia" },
    ]);

    regionModel.getFilteredCount.mockResolvedValue(1);
    municipalityModel.getFilteredCount.mockResolvedValue(2);
    mayoralityModel.getFilteredCount.mockResolvedValue(3);
    settlementModel.getFilteredCount.mockResolvedValue(4);

    await globalSearchHandler(mockRes, parsedUrl, mockClient);

    const response = sendResponse.mock.calls[0][2];
    expect(response.data.filteredRegionsCount).toBe(1);
    expect(response.data.pagination.page).toBe(2);
    expect(response.data.pagination.totalPages).toBe(3);
    expect(settlementModel.getSettlementStats).toHaveBeenCalledWith(
      mockClient,
      { q: "sofia", sort: "", limit: 5, offset: 5 },
      "global",
    );
  });

  it("should return 500 when a model call fails", async () => {
    const parsedUrl = { searchParams: new URLSearchParams("q=test") };
    settlementModel.getSettlementStats.mockRejectedValue(
      new Error("Database crash"),
    );

    await globalSearchHandler(mockRes, parsedUrl, mockClient);

    expect(sendResponse).toHaveBeenCalledWith(
      mockRes,
      500,
      expect.objectContaining({
        message: "Възникна грешка при обработката на за търсене заявката",
      }),
    );
  });

  it("should handle empty result rows correctly for pagination", async () => {
    const parsedUrl = { searchParams: new URLSearchParams("q=empty") };
    settlementModel.getSettlementStats.mockResolvedValue({ rows: [] });

    await globalSearchHandler(mockRes, parsedUrl, mockClient);

    const response = sendResponse.mock.calls[0][2];
    expect(response.data.pagination.total).toBe(0);
    expect(response.data.pagination.totalPages).toBe(0);
  });
});
