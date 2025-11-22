import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  chunkArray,
  normalizeMayoralityId,
  batchInsert,
} from "../../src/importCommon.js";
import { client } from "../../src/startUp.js";

vi.mock("../../src/startUp.js", () => ({
  client: {
    query: vi.fn(),
  },
}));

describe("import common", () => {
  describe("chunkArray", () => {
    it("should split an array into chunks of given size", () => {
      expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it("should return the whole array if size >= array length", () => {
      expect(chunkArray([1, 2, 3], 5)).toEqual([[1, 2, 3]]);
    });

    it("should return empty array if input is empty", () => {
      expect(chunkArray([], 2)).toEqual([]);
    });
  });

  describe("normalizeMayoralityId", () => {
    it("should return null if mayoralityId ends with '-00'", () => {
      expect(normalizeMayoralityId("123-00")).toBeNull();
    });

    it("should return mayoralityId if it does not end with '-00'", () => {
      expect(normalizeMayoralityId("123-01")).toBe("123-01");
    });
  });

  describe("batchInsert", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should do nothing if rows is empty", async () => {
      await batchInsert("table", ["col1"], []);
      expect(client.query).not.toHaveBeenCalled();
    });

    it("should insert rows and commits transaction", async () => {
      client.query.mockResolvedValueOnce({});
      client.query.mockResolvedValueOnce({});
      client.query.mockResolvedValueOnce({});

      const rows = [{ col1: 1 }, { col1: 2 }];
      await batchInsert("table", ["col1"], rows);

      expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");

      // chatGPT did line 61 -> replacing whitespaces
      const sqlCall = client.query.mock.calls[1][0].replace(/\s+/g, " ").trim();
      expect(sqlCall).toContain(
        "INSERT INTO table (col1) VALUES ($1),($2) ON CONFLICT DO NOTHING"
      );

      expect(client.query).toHaveBeenNthCalledWith(3, "COMMIT");
    });

    it("should roll back if insert fails", async () => {
      client.query.mockResolvedValueOnce({});
      client.query.mockRejectedValueOnce(new Error("fail"));
      client.query.mockResolvedValueOnce({});

      const rows = [{ col1: 1 }];
      await batchInsert("table", ["col1"], rows);

      expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
      expect(client.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("INSERT INTO table"),
        [1]
      );
      expect(client.query).toHaveBeenNthCalledWith(3, "ROLLBACK");
    });
  });
});
