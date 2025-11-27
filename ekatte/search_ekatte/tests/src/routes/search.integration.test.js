import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { Pool } from "pg";
import { searchHandler } from "../../../src/routes/search.js";
import dotenv from "dotenv";

let pool;
let res;

beforeEach(async () => {
  dotenv.config({ path: ".env" });

  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
    max: 1,
  });

  await pool.query("CREATE TEMP TABLE region (LIKE region INCLUDING ALL)");
  await pool.query(
    "CREATE TEMP TABLE municipality (LIKE municipality INCLUDING ALL)"
  );
  await pool.query(
    "CREATE TEMP TABLE mayorality (LIKE mayorality INCLUDING ALL)"
  );
  await pool.query(
    "CREATE TEMP TABLE settlement (LIKE settlement INCLUDING ALL)"
  );

  await pool.query(`
    INSERT INTO region (region_id, name, transliteration, nuts3_id)
    VALUES ('001', 'TestRegion', 'TestRegion', 'BG001')
  `);
  await pool.query(`
    INSERT INTO municipality (municipality_id, name, transliteration, region_id)
    VALUES ('00001', 'TestMunicipality', 'TestMunicipality', '001')
  `);
  await pool.query(`
    INSERT INTO mayorality (mayorality_id, name, transliteration, municipality_id)
    VALUES ('00000001', 'TestMayorality', 'TestMayorality', '00001')
  `);
  await pool.query(`
    INSERT INTO settlement (ekatte, name, transliteration, settlement_category, altitude_id, settlement_type_id, mayorality_id, municipality_id)
    VALUES ('00001', 'TestSettlement', 'TestSettlement', 1, 1, 1, '00000001', '00001'),
           ('00002', 'FilterSettlement', 'FilterSettlement', 1, 1, 1, '00000001', '00001')
  `);

  res = { writeHead: vi.fn(), end: vi.fn() };
});

afterEach(async () => {
  await pool.end();
});

describe("searchHandler integration with counts", () => {
  it("should return all rows and counts without query", async () => {
    await searchHandler(res, new URL("http://localhost:3000/api/search"), pool);
    const data = JSON.parse(res.end.mock.calls[0][0]);

    expect(data.rowsCount).toBe(2);

    expect(Number(data.settlementsCount)).toBe(2);
    expect(Number(data.municipalitiesCount)).toBe(1);
    expect(Number(data.mayoralitiesCount)).toBe(1);
    expect(Number(data.regionsCount)).toBe(1);

    expect(Number(data.filteredSettlementsCount)).toBe(2);
    expect(Number(data.filteredMunicipalitiesCount)).toBe(1);
    expect(Number(data.filteredMayoralitiesCount)).toBe(1);
    expect(Number(data.filteredRegionsCount)).toBe(1);
  });

  it("should return all rows sorted alphabetically", async () => {
    await searchHandler(res, new URL("http://localhost:3000/api/search"), pool);
    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.rows.map((r) => r.settlement)).toEqual([
      "FilterSettlement",
      "TestSettlement",
    ]);
  });

  it("should filter by region code and include all related rows", async () => {
    await searchHandler(
      res,
      new URL("http://localhost:3000/api/search?q=001"),
      pool
    );
    const data = JSON.parse(res.end.mock.calls[0][0]);

    // settlements belong to that region
    expect(data.rowsCount).toBe(2);

    // only rows in the table itself that have 001 in their own columns
    // this include the region and all "descendents" because ids are
    // constructed from each other
    expect(Number(data.filteredSettlementsCount)).toBe(2);
    expect(Number(data.filteredMunicipalitiesCount)).toBe(1);
    expect(Number(data.filteredMayoralitiesCount)).toBe(1);
    expect(Number(data.filteredRegionsCount)).toBe(1);
  });

  it("should filter by settlement name and respect filtered counts", async () => {
    await searchHandler(
      res,
      new URL("http://localhost:3000/api/search?q=FilterSettlement"),
      pool
    );
    const data = JSON.parse(res.end.mock.calls[0][0]);

    // Only one row matches
    expect(data.rowsCount).toBe(1);
    expect(data.rows[0].settlement).toBe("FilterSettlement");

    // Only settlement table columns match
    expect(Number(data.filteredSettlementsCount)).toBe(1);
    expect(Number(data.filteredMunicipalitiesCount)).toBe(0);
    expect(Number(data.filteredMayoralitiesCount)).toBe(0);
    expect(Number(data.filteredRegionsCount)).toBe(0);
  });

  it("should filter by municipality name", async () => {
    await searchHandler(
      res,
      new URL("http://localhost:3000/api/search?q=TestMunicipality"),
      pool
    );
    const data = JSON.parse(res.end.mock.calls[0][0]);

    // both settlements belong to this municipality
    expect(data.rowsCount).toBe(2);
    // municipality matches
    expect(Number(data.filteredMunicipalitiesCount)).toBe(1);
    expect(Number(data.filteredRegionsCount)).toBe(0);
    expect(Number(data.filteredMayoralitiesCount)).toBe(0);
    expect(Number(data.filteredSettlementsCount)).toBe(0);
  });

  it("should filter by mayorality name", async () => {
    await searchHandler(
      res,
      new URL("http://localhost:3000/api/search?q=TestMayorality"),
      pool
    );
    const data = JSON.parse(res.end.mock.calls[0][0]);

    // settlements belong to this mayorality
    expect(data.rowsCount).toBe(2);
    // mayorality matches
    expect(Number(data.filteredMayoralitiesCount)).toBe(1);
    expect(Number(data.filteredRegionsCount)).toBe(0);
    expect(Number(data.filteredMunicipalitiesCount)).toBe(0);
    expect(Number(data.filteredSettlementsCount)).toBe(0);
  });
});
