import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchHandler,
  getRegionFullCount,
  getRegionFilteredCount,
  getMunicipalityFullCount,
  getMunicipalityFilteredCount,
  getMayoralityFullCount,
  getMayoralityFilteredCount,
  getSettlementFullCount,
  getSettlementFilteredCount,
  getSettlementFilteredQuery,
  getSettlementFullQuery,
} from "../../../src/routes/search.js";

describe("Count queries", () => {
  it("getRegionFullCount returns correct query object", () => {
    const q = getRegionFullCount();
    expect(q.name).toBe("count_region");
    expect(q.text).toContain("SELECT COUNT(*) AS count FROM region");
    expect(q.values).toEqual([]);
  });

  it("getRegionFilteredCount returns correct query object", () => {
    const q = getRegionFilteredCount("test");
    expect(q.name).toBe("count_region_filter");
    expect(q.text).toContain("WHERE");
    expect(q.values).toEqual(["test"]);
  });

  it("getMunicipalityFullCount returns correct query object", () => {
    const q = getMunicipalityFullCount();
    expect(q.name).toBe("count_municipality");
    expect(q.text).toContain("SELECT COUNT(*) AS count FROM municipality");
    expect(q.values).toEqual([]);
  });

  it("getMunicipalityFilteredCount returns correct query object", () => {
    const q = getMunicipalityFilteredCount("muni");
    expect(q.name).toBe("count_municipality_filter");
    expect(q.text).toContain("WHERE");
    expect(q.values).toEqual(["muni"]);
  });

  it("getMayoralityFullCount returns correct query object", () => {
    const q = getMayoralityFullCount();
    expect(q.name).toBe("count_mayorality");
    expect(q.text).toContain("SELECT COUNT(*) AS count FROM mayorality");
    expect(q.values).toEqual([]);
  });

  it("getMayoralityFilteredCount returns correct query object", () => {
    const q = getMayoralityFilteredCount("mayor");
    expect(q.name).toBe("count_mayorality_filter");
    expect(q.text).toContain("WHERE");
    expect(q.values).toEqual(["mayor"]);
  });

  it("getSettlementFullCount returns correct query object", () => {
    const q = getSettlementFullCount();
    expect(q.name).toBe("count_settlement");
    expect(q.text).toContain("SELECT COUNT(*) AS count FROM settlement");
    expect(q.values).toEqual([]);
  });

  it("getSettlementFilteredCount returns correct query object", () => {
    const q = getSettlementFilteredCount("set");
    expect(q.name).toBe("count_settlement_filter");
    expect(q.text).toContain("WHERE");
    expect(q.values).toEqual(["set"]);
  });
});

describe("searchHandler", () => {
  let res;
  let mockPool;

  beforeEach(() => {
    res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };

    mockPool = {
      query: vi.fn(),
    };
  });

  it("should return rows and counts when query is successful", async () => {
    mockPool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [
        {
          id: "1",
          settlement: "Test",
          mayorality: "M",
          municipality: "MU",
          region: "R",
        },
      ],
    });

    mockPool.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });
    mockPool.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });
    mockPool.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });
    mockPool.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });

    mockPool.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });
    mockPool.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });
    mockPool.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });
    mockPool.query.mockResolvedValueOnce({ rows: [{ count: 1 }] });

    await searchHandler(
      res,
      new URL("http://localhost:3000/api/search?q=test"),
      mockPool
    );

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.rows).toEqual([
      {
        id: "1",
        settlement: "Test",
        mayorality: "M",
        municipality: "MU",
        region: "R",
      },
    ]);
    expect(data.rowsCount).toBe(1);
    expect(data.settlementsCount).toBe(1);
    expect(data.filteredSettlementsCount).toBe(1);
    expect(data.regionsCount).toBe(1);
    expect(data.filteredRegionsCount).toBe(1);
    expect(data.municipalitiesCount).toBe(1);
    expect(data.filteredMunicipalitiesCount).toBe(1);
    expect(data.mayoralitiesCount).toBe(1);
    expect(data.filteredMayoralitiesCount).toBe(1);
  });

  it("should call getSettlementFullQuery when q is empty", async () => {
    mockPool.query.mockResolvedValue({
      rowCount: 2,
      rows: [
        {
          id: "1",
          settlement: "Test1",
          mayorality: "M1",
          municipality: "MU1",
          region: "R1",
        },
        {
          id: "2",
          settlement: "Test2",
          mayorality: "M2",
          municipality: "MU2",
          region: "R2",
        },
      ],
    });

    await searchHandler(
      res,
      new URL("http://localhost:3000/api/search?q="),
      mockPool
    );

    expect(mockPool.query).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "search_settlements_full",
        text: expect.not.stringContaining("WHERE"),
        values: [],
      })
    );

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.rowsCount).toBe(2);
    expect(data.rows.map((r) => r.settlement)).toEqual(["Test1", "Test2"]);
  });

  it("should return internal server error when query fails", async () => {
    mockPool.query.mockRejectedValue(new Error("DB error"));

    await searchHandler(
      res,
      new URL("http://localhost:3000/api/search?q=test"),
      mockPool
    );

    expect(res.writeHead).toHaveBeenCalledWith(500, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "Internal server error" })
    );
  });

  it("getSettlementFullQuery returns correct query object", () => {
    const q = getSettlementFullQuery();
    expect(q.name).toBe("search_settlements_full");
    expect(q.text).toContain("FROM settlement");
    expect(q.text).not.toContain("WHERE");
    expect(q.values).toEqual([]);
  });

  it("getSettlementFilteredQuery returns correct query object", () => {
    const qStr = "Test";
    const q = getSettlementFilteredQuery(qStr);
    expect(q.name).toBe("search_settlements_filter");
    expect(q.text).toContain("FROM settlement");
    expect(q.text).toContain("WHERE");
    expect(q.values).toEqual([qStr]);
  });
});
