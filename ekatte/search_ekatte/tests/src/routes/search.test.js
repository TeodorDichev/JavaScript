import { describe, it, expect, vi } from "vitest";
import { searchHandler } from "../../../src/routes/search.js";
import { pool } from "../../../src/server.js";

vi.mock("../../../src/server.js", () => ({ pool: { query: vi.fn() } }));

describe("search", () => {
  it("should return rows and count when query is successful", async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };

    pool.query.mockResolvedValue({
      rowCount: 1,
      rows: [{ id: "1", settlement: "Test" }],
    });

    await searchHandler(
      res,
      new URL("http://localhost:3000/api/search?q=test")
    );

    expect(res.writeHead).toHaveBeenCalledWith(200, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ count: 1, rows: [{ id: "1", settlement: "Test" }] })
    );
  });

  it("should return json with internal server error when query is unsuccessful", async () => {
    const res = {
      writeHead: vi.fn(),
      end: vi.fn(),
    };

    pool.query.mockRejectedValue(new Error("DB error"));

    await searchHandler(
      res,
      new URL("http://localhost:3000/api/search?q=test")
    );

    expect(res.writeHead).toHaveBeenCalledWith(500, {
      "Content-Type": "application/json",
    });
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "Internal server error" })
    );
  });
});
