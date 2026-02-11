import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  normalizeMayoralityId, 
  prepareInsert 
} from "../src/importCommon.js";

describe("import common", () => {
  
  describe("normalizeMayoralityId", () => {
    it("should return null if mayoralityId ends with '-00'", () => {
      expect(normalizeMayoralityId("123-00")).toBeNull();
    });

    it("should return mayoralityId if it does not end with '-01'", () => {
      expect(normalizeMayoralityId("123-01")).toBe("123-01");
    });
  });

  describe("prepareInsert", () => {
    let mockDbClient;

    beforeEach(() => {
      mockDbClient = {
        query: vi.fn().mockResolvedValue({}),
      };
    });

    it("should do nothing if rows is empty", async () => {
      await prepareInsert("SETTLEMENT", ["EKATTE"], [], mockDbClient);
      expect(mockDbClient.query).not.toHaveBeenCalled();
    });

    it("should generate correct SQL and parameters for multiple rows", async () => {
      const table = "REGION";
      const columns = ["REGION_ID", "NAME"];
      const rows = [
        { REGION_ID: "SOF", NAME: "София" },
        { REGION_ID: "VAR", NAME: "Варна" }
      ];

      await prepareInsert(table, columns, rows, mockDbClient);

      const lastCallSql = mockDbClient.query.mock.calls[0][0].replace(/\s+/g, " ").trim();
      const lastCallValues = mockDbClient.query.mock.calls[0][1];

      expect(lastCallSql).toContain("INSERT INTO REGION (REGION_ID,NAME)");
      expect(lastCallSql).toContain("VALUES ($1,$2),($3,$4)");
      expect(lastCallSql).toContain("ON CONFLICT DO NOTHING");

      expect(lastCallValues).toEqual(["SOF", "София", "VAR", "Варна"]);
    });

    it("should handle single row insert correctly", async () => {
      const rows = [{ EKATTE: "00001" }];
      await prepareInsert("SETTLEMENT", ["EKATTE"], rows, mockDbClient);

      expect(mockDbClient.query).toHaveBeenCalledWith(
        expect.stringContaining("VALUES ($1)"),
        ["00001"]
      );
    });

    it("should propagate errors if the database query fails", async () => {
      mockDbClient.query.mockRejectedValueOnce(new Error("DB Error"));

      const rows = [{ EKATTE: "00001" }];
      
      await expect(prepareInsert("SETTLEMENT", ["EKATTE"], rows, mockDbClient))
        .rejects.toThrow("DB Error");
    });
  });
});