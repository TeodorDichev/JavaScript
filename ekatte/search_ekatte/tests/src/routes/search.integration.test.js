import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";
import { Pool } from "pg";
import { searchHandler } from "../../../src/routes/search.js";
import dotenv from 'dotenv';

let pool;
let res;

beforeEach(async () => {
  dotenv.config({path: '.env'});
  
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
    max: 1,
  });

  await pool.query('CREATE TEMP TABLE region (LIKE region INCLUDING ALL)');
  await pool.query('CREATE TEMP TABLE municipality (LIKE municipality INCLUDING ALL)');
  await pool.query('CREATE TEMP TABLE mayorality (LIKE mayorality INCLUDING ALL)');
  await pool.query('CREATE TEMP TABLE settlement (LIKE settlement INCLUDING ALL)');

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
           ('00002', 'Filter', 'Filter', 1, 1, 1, '00000001', '00001')
  `);

  res = { writeHead: vi.fn(), end: vi.fn() };
});

afterEach(async () => {
  await pool.end();
});

describe("search integration", () => {
  it("should return rows without query", async () => {
    await searchHandler(res, new URL("http://localhost:3000/api/search"), pool);

    expect(res.writeHead).toHaveBeenCalledWith(200, { "Content-Type": "application/json" });
    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.count).toBe(2); // returns all
    expect(data.rows[0].settlement).toBe("Filter"); // alphabetically ordered
  });

  it("should filter by query", async () => {
    await searchHandler(res, new URL("http://localhost:3000/api/search?q=TestSettlement"), pool);

    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.rows[0].settlement).toBe("TestSettlement");
  });
});
