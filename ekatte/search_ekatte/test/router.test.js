import { describe, it, expect, vi, beforeEach } from "vitest";
import { router } from "../src/router.js";
import { sendResponse } from "../src/utils/response-helper.js";

// Важно: Импортираме всичко като обекти, за да може vi.mock да ги прихване
import * as settlement from "../src/controllers/settlement-controller.js";
import * as mayorality from "../src/controllers/mayorality-controller.js";
import * as municipality from "../src/controllers/municipality-controller.js";
import * as region from "../src/controllers/region-controller.js";
import * as validation from "../src/controllers/validation-controller.js";
import * as home from "../src/controllers/home-controller.js";

// Мокваме пътищата
vi.mock("../src/controllers/settlement-controller.js");
vi.mock("../src/controllers/mayorality-controller.js");
vi.mock("../src/controllers/municipality-controller.js");
vi.mock("../src/controllers/region-controller.js");
vi.mock("../src/controllers/validation-controller.js");
vi.mock("../src/controllers/home-controller.js");
vi.mock("../src/utils/response-helper.js");

describe("Router Unit Tests", () => {
  let mockRes, mockClient, mockPool, mockReq;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = { writeHead: vi.fn(), end: vi.fn() };
    mockClient = { release: vi.fn() };
    mockPool = { connect: vi.fn().mockResolvedValue(mockClient) };
    mockReq = { headers: { host: "localhost" }, method: "GET" };
  });

  describe("Route Errors", () => {
    it("should return ApiResponse with 404 when prefix is not /api", async () => {
      mockReq.url = "/v1/settlement/home";
      await router(mockReq, mockRes, mockPool);

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes,
        404,
        expect.objectContaining({
          ok: false,
          message: "Невалиден API път"
        })
      );
    });

    it("should return 404 when resource is missing in mapping", async () => {
      mockReq.url = "/api/ghost-resource/home";
      await router(mockReq, mockRes, mockPool);

      expect(sendResponse).toHaveBeenCalledWith(
        mockRes,
        404,
        expect.objectContaining({ message: "Resource or Action not found" })
      );
    });
  });

  describe("Main Resource Mappings", () => {
    it("maps /api/settlement/home -> settlement.homeSettlementsHandler", async () => {
      mockReq.url = "/api/settlement/home";
      await router(mockReq, mockRes, mockPool);
      expect(settlement.homeSettlementsHandler).toHaveBeenCalled();
    });

    it("maps /api/mayorality/search -> mayorality.searchMayoralityHandler", async () => {
      mockReq.url = "/api/mayorality/search?q=test";
      await router(mockReq, mockRes, mockPool);
      expect(mayorality.searchMayoralityHandler).toHaveBeenCalled();
    });

    it("maps /api/municipality/info -> municipality.infoMunicipalityHandler", async () => {
      mockReq.url = "/api/municipality/info?q=123";
      await router(mockReq, mockRes, mockPool);
      expect(municipality.infoMunicipalityHandler).toHaveBeenCalled();
    });

    it("maps /api/region/create (POST) -> region.createRegionHandler", async () => {
      mockReq.method = "POST";
      mockReq.url = "/api/region/create";

      mockReq[Symbol.asyncIterator] = async function* () {
        yield "{}";
      };
      await router(mockReq, mockRes, mockPool);
      expect(region.createRegionHandler).toHaveBeenCalled();
    });
  });

  describe("Validation Mappings", () => {
    const validationTests = [
      { action: "ekatte", handler: "validateEkatteHandler" },
      { action: "region-code", handler: "validateRegionCodeHandler" },
      {
        action: "municipality-code",
        handler: "validateMunicipalityCodeHandler",
      },
      { action: "nuts", handler: "validateNutsHandler" },
      {
        action: "settlement-dependencies",
        handler: "validateSettlementDependenciesHandler",
      },
    ];

    validationTests.forEach(({ action, handler }) => {
      it(`maps /api/validation/${action} -> validation.${handler}`, async () => {
        mockReq.url = `/api/validation/${action}`;
        await router(mockReq, mockRes, mockPool);
        expect(validation[handler]).toHaveBeenCalled();
      });
    });

    it("returns 404 for unknown validation action", async () => {
      mockReq.url = "/api/validation/unknown-check";
      await router(mockReq, mockRes, mockPool);
      expect(sendResponse).toHaveBeenCalledWith(
        mockRes,
        404,
        expect.objectContaining({ message: "Resource or Action not found" }),
      );
    });
  });
});
