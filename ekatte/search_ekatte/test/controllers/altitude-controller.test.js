import { describe, it, expect, vi, beforeEach } from "vitest";
import { altitudeHandler } from "../../src/controllers/altitude-controller.js";
import { altitudeModel } from "../../src/models/altitude-model.js";

vi.mock("../../src/models/altitude-model.js");

describe("Altitude Controller Handler", () => {
  let mockRes;
  let mockClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = {
      writeHead: vi.fn().mockReturnThis(),
      end: vi.fn()
    };
    mockClient = {};
  });

  it("altitudeHandler should return 200 and all altitude data on success", async () => {
    const mockData = [
      { altitude_id: 1, altitude_description: "от 0 до 100 м" },
      { altitude_id: 2, altitude_description: "от 100 до 300 м" }
    ];
    
    altitudeModel.getAll.mockResolvedValue(mockData);

    await altitudeHandler(mockRes, mockClient);

    expect(altitudeModel.getAll).toHaveBeenCalledWith(mockClient);
    expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
    
    const response = JSON.parse(mockRes.end.mock.calls[0][0]);
    expect(response.data).toEqual(mockData);
    expect(response.message).toBe("Данните за надморска височина са извлечени успешно");
  });

it("altitudeHandler should return 500 if the model throws an error", async () => {
    const errorMessage = "Database timeout";
    altitudeModel.getAll.mockRejectedValue(new Error(errorMessage));

    await altitudeHandler(mockRes, mockClient);

    expect(mockRes.writeHead).toHaveBeenCalledWith(500, { "Content-Type": "application/json" });
  
    const response = JSON.parse(mockRes.end.mock.calls[0][0]);
    expect(response.message).toBe("Възникна грешка при извличане на данните за надморска височина");
    expect(response.errors).toContain(errorMessage);
    expect(response.ok).toBe(false);
});

  it("altitudeHandler should return 200 even if no data is found in the database", async () => {
    altitudeModel.getAll.mockResolvedValue([]);

    await altitudeHandler(mockRes, mockClient);

    expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
    const response = JSON.parse(mockRes.end.mock.calls[0][0]);
    expect(response.data).toEqual([]);
  });
});