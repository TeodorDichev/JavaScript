import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
    validateEkatteHandler, 
    validateMayoralityCodeHandler, 
    validateMunicipalityCodeHandler,
    validateRegionCodeHandler,
    validateNutsHandler,
    validateMunicipalityDependenciesHandler,
    validateMayoralityDependenciesHandler,
    validateSettlementDependenciesHandler
} from "../../src/controllers/validation-controller.js";
import * as validation from "../../src/utils/validation.js";

vi.mock("../../src/utils/validation.js");

describe("Validation Controller Handlers", () => {
    let mockRes, mockClient;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRes = { writeHead: vi.fn().mockReturnThis(), end: vi.fn() };
        mockClient = {};
    });

    describe("validateEkatteHandler", () => {
        it("should return valid true when format is ok and settlement does not exist", async () => {
            const url = { searchParams: new URLSearchParams("q=68134") };
            validation.checkEkatteFormat.mockReturnValue(true);
            validation.checkSettlementExists.mockResolvedValue(false);

            await validateEkatteHandler(mockRes, url, mockClient);

            const response = JSON.parse(mockRes.end.mock.calls[0][0]);
            expect(response.data.valid).toBe(true);
            expect(response.data.message).toBe("Ok");
        });

        it("should return valid false when settlement already exists", async () => {
            const url = { searchParams: new URLSearchParams("q=68134") };
            validation.checkEkatteFormat.mockReturnValue(true);
            validation.checkSettlementExists.mockResolvedValue(true);

            await validateEkatteHandler(mockRes, url, mockClient);

            const response = JSON.parse(mockRes.end.mock.calls[0][0]);
            expect(response.data.valid).toBe(false);
        });
    });

    describe("validateMayoralityCodeHandler", () => {
        it("should return valid true for correct and available mayorality code", async () => {
            const url = { searchParams: new URLSearchParams("q=SOF46-00") };
            validation.checkMayoralityCodeFormat.mockReturnValue(true);
            validation.checkMayoralityExists.mockResolvedValue(false);

            await validateMayoralityCodeHandler(mockRes, url, mockClient);

            const response = JSON.parse(mockRes.end.mock.calls[0][0]);
            expect(response.data.valid).toBe(true);
        });
    });

    describe("validateMunicipalityCodeHandler", () => {
        it("should return valid false for invalid municipality format", async () => {
            const url = { searchParams: new URLSearchParams("q=INVALID") };
            validation.checkMunicipalityCodeFormat.mockReturnValue(false);

            await validateMunicipalityCodeHandler(mockRes, url, mockClient);

            const response = JSON.parse(mockRes.end.mock.calls[0][0]);
            expect(response.data.valid).toBe(false);
        });
    });

    describe("validateRegionCodeHandler", () => {
        it("should return 500 on unexpected database error", async () => {
            const url = { searchParams: new URLSearchParams("q=SOF") };
            validation.checkRegionCodeFormat.mockReturnValue(true);
            validation.checkRegionExists.mockRejectedValue(new Error("DB Error"));

            await validateRegionCodeHandler(mockRes, url, mockClient);

            expect(mockRes.writeHead).toHaveBeenCalledWith(500, expect.any(Object));
        });
    });

    describe("validateNutsHandler", () => {
        it("should validate NUTS3 availability correctly", async () => {
            const url = { searchParams: new URLSearchParams("q=BG411") };
            validation.checkNuts3Format.mockReturnValue(true);
            validation.checkNuts3Exists.mockResolvedValue(false);

            await validateNutsHandler(mockRes, url, mockClient);

            const response = JSON.parse(mockRes.end.mock.calls[0][0]);
            expect(response.data.valid).toBe(true);
        });
    });

    describe("validateMunicipalityDependenciesHandler", () => {
        it("should return dependency check result from validation utility", async () => {
            const url = { searchParams: new URLSearchParams("id=SOF46") };
            const mockResult = { valid: false, message: "Has region centers" };
            validation.checkMunicipalityCodeFormat.mockReturnValue(true);
            validation.checkMunicipalityHasRegionCenters.mockResolvedValue(mockResult);

            await validateMunicipalityDependenciesHandler(mockRes, url, mockClient);

            const response = JSON.parse(mockRes.end.mock.calls[0][0]);
            expect(response.data).toEqual(mockResult);
        });
    });

    describe("validateMayoralityDependenciesHandler", () => {
        it("should handle valid codes and return dependency status", async () => {
            const url = { searchParams: new URLSearchParams("id=SOF46-01") };
            validation.checkMunicipalityCodeFormat.mockReturnValue(true);
            validation.checkMayoralityHasMunicipalityOrRegionCenters.mockResolvedValue({ valid: true });

            await validateMayoralityDependenciesHandler(mockRes, url, mockClient);

            const response = JSON.parse(mockRes.end.mock.calls[0][0]);
            expect(response.data.valid).toBe(true);
        });
    });

    describe("validateSettlementDependenciesHandler", () => {
        it("should return valid false if settlement is a center", async () => {
            const url = { searchParams: new URLSearchParams("id=68134") };
            validation.checkEkatteFormat.mockReturnValue(true);
            validation.checkSettlementIsCenter.mockResolvedValue({ valid: false, message: "Is a center" });

            await validateSettlementDependenciesHandler(mockRes, url, mockClient);

            const response = JSON.parse(mockRes.end.mock.calls[0][0]);
            expect(response.data.valid).toBe(false);
            expect(response.data.message).toBe("Is a center");
        });
    });
});