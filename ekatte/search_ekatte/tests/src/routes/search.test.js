import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchHandler } from "../../../src/routes/search.js";

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

  it("should return rows and count when query is successful", async () => {
    mockPool.query.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: "1", settlement: "Test" }],
    });

    await searchHandler(res, new URL("http://localhost:3000/api/search?q=test"), mockPool);

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ count: 1, rows: [{ id: "1", settlement: "Test" }] })
    );
  });

  it("should return empty result when database returns no rows", async () => {
    mockPool.query.mockResolvedValue({ rowCount: 0, rows: [] });

    await searchHandler(res, new URL("http://localhost:3000/api/search?q=test"), mockPool);

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ count: 0, rows: [] })
    );
  });

  it("should return internal server error when query fails", async () => {
    mockPool.query.mockRejectedValue(new Error("DB error"));

    await searchHandler(res, new URL("http://localhost:3000/api/search?q=test"), mockPool);

    expect(res.writeHead).toHaveBeenCalledWith(500, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "Internal server error" })
    );
  });

  it("should call query without ILIKE when q is empty", async () => {
    mockPool.query.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: "123", settlement: "Test" }],
    });

    await searchHandler(res, new URL("http://localhost:3000/api/search?q="), mockPool);

    expect(mockPool.query).toHaveBeenCalledWith({
      name: "search-settlements-noquery",
      text: expect.not.stringContaining("WHERE"),
      values: [],
    });
    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
  });

  it("should call query with ILIKE when q is not empty", async () => {
    mockPool.query.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: "123", settlement: "Test" }],
    });

    await searchHandler(res, new URL("http://localhost:3000/api/search?q=test"), mockPool);

    expect(mockPool.query).toHaveBeenCalledWith({
      name: "search-settlements",
      text: expect.stringContaining("WHERE"),
      values: ["test"],
    });
    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
  });
});
