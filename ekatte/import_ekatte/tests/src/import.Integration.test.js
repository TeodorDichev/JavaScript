import { describe, it, beforeEach, afterEach, expect } from "vitest";
import { Client } from "pg";
import path from "path";
import { excelImport } from "../../src/excelImport.js";
import { jsonImport } from "../../src/jsonImport.js";
import dotenv from 'dotenv';

let client;

beforeEach(async () => {
  dotenv.config({ path: '.env' });

  client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
  });

  await client.connect();

  await client.query('CREATE TEMP TABLE REGION (LIKE REGION INCLUDING ALL)');
  await client.query('CREATE TEMP TABLE MUNICIPALITY (LIKE MUNICIPALITY INCLUDING ALL)');
  await client.query('CREATE TEMP TABLE MAYORALITY (LIKE MAYORALITY INCLUDING ALL)');
  await client.query('CREATE TEMP TABLE ALTITUDE (LIKE ALTITUDE INCLUDING ALL)');
  await client.query('CREATE TEMP TABLE SETTLEMENT_TYPE (LIKE SETTLEMENT_TYPE INCLUDING ALL)');
  await client.query('CREATE TEMP TABLE SETTLEMENT (LIKE SETTLEMENT INCLUDING ALL)');
});

afterEach(async () => {
  await client.end();
});

describe("Import integration tests", () => {

  it("should insert data from Excel files into temp tables", async () => {
    const testDir = path.join(__dirname, "../data");
    console.log(testDir);
    await excelImport(testDir, client);

    const tables = ["REGION", "MUNICIPALITY", "MAYORALITY", "ALTITUDE", "SETTLEMENT_TYPE", "SETTLEMENT"];

    for (const table of tables) {
      const res = await client.query(`SELECT * FROM ${table}`);
      expect(res.rowCount).toBeGreaterThan(0);
    }
  });

  it("should insert data from JSON files into temp tables", async () => {
    const testDir = path.join(__dirname, "../data");

    await jsonImport(testDir, client);

    const tables = ["REGION", "MUNICIPALITY", "MAYORALITY", "ALTITUDE", "SETTLEMENT_TYPE", "SETTLEMENT"];

    for (const table of tables) {
      const res = await client.query(`SELECT * FROM ${table}`);
      
      expect(res.rowCount).toBeGreaterThan(0);
    }
  });
});
