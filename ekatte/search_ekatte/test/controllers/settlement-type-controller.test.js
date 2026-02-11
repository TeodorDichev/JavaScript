import { describe, it, expect, vi, beforeEach } from "vitest";
import { settlementTypeHandler } from "../../src/controllers/settlement-type-controller.js";
import { settlementTypeModel } from "../../src/models/settlement-type-model.js";

vi.mock("../../src/models/settlement-type-model.js");

describe("settlementTypeHandler", () => {
  let mockRes, mockClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = { writeHead: vi.fn().mockReturnThis(), end: vi.fn() };
    mockClient = {};
  });

  it("should return 200 and formatted data on success", async () => {
    const mockRows = [
      { settlement_type_id: 1, settlement_type_description: "гр." },
      { settlement_type_id: 2, settlement_type_description: "с." }
    ];
    settlementTypeModel.getAll.mockResolvedValue({ rows: mockRows });

    await settlementTypeHandler(mockRes, mockClient);

    expect(settlementTypeModel.getAll).toHaveBeenCalledWith(mockClient);
    expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
    
    const response = JSON.parse(mockRes.end.mock.calls[0][0]);
    expect(response.data).toEqual([
      { id: 1, name: "гр." },
      { id: 2, name: "с." }
    ]);
  });

  it("should return 500 when model throws an error", async () => {
    const error = new Error("Fetch failed");
    settlementTypeModel.getAll.mockRejectedValue(error);

    await settlementTypeHandler(mockRes, mockClient);

    expect(mockRes.writeHead).toHaveBeenCalledWith(500, expect.any(Object));
    const response = JSON.parse(mockRes.end.mock.calls[0][0]);
    expect(response.message).toBe("Грешка при извличане на типовете населени места");
    expect(response.errors).toContain("Fetch failed");
  });

  it("should return empty array if no rows are found", async () => {
    settlementTypeModel.getAll.mockResolvedValue({ rows: [] });

    await settlementTypeHandler(mockRes, mockClient);

    const response = JSON.parse(mockRes.end.mock.calls[0][0]);
    expect(response.data).toEqual([]);
  });
});