import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { Client } from "pg";
import path from "path";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

import { excelImport } from "../src/excelImport.js";
import { jsonImport } from "../src/jsonImport.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env' });

describe("Import integration tests", () => {
    let client;
    const testDir = path.resolve(__dirname, "../data");
    const tables = [
        "REGION", "MUNICIPALITY", "MAYORALITY", 
        "ALTITUDE", "SETTLEMENT_TYPE", "SETTLEMENT"
    ];

    beforeAll(async () => {
        client = new Client({
            user: process.env.DB_USER,
            host: process.env.DB_HOST,
            database: process.env.DB_NAME,
            password: process.env.DB_PASSWORD,
            port: Number(process.env.DB_PORT),
        });

        await client.connect();

        const setupSql = `
            CREATE TEMP TABLE REGION (LIKE REGION INCLUDING ALL);
            CREATE TEMP TABLE MUNICIPALITY (LIKE MUNICIPALITY INCLUDING ALL);
            CREATE TEMP TABLE MAYORALITY (LIKE MAYORALITY INCLUDING ALL);
            CREATE TEMP TABLE ALTITUDE (LIKE ALTITUDE INCLUDING ALL);
            CREATE TEMP TABLE SETTLEMENT_TYPE (LIKE SETTLEMENT_TYPE INCLUDING ALL);
            CREATE TEMP TABLE SETTLEMENT (LIKE SETTLEMENT INCLUDING ALL);
            
            CREATE TEMP TABLE REGION_CENTER (LIKE REGION_CENTER INCLUDING ALL);
            CREATE TEMP TABLE MUNICIPALITY_CENTER (LIKE MUNICIPALITY_CENTER INCLUDING ALL);
            CREATE TEMP TABLE MAYORALITY_CENTER (LIKE MAYORALITY_CENTER INCLUDING ALL);
        `;
        await client.query(setupSql);
    }, 20000);

    afterAll(async () => {
        if (client) {
            await client.end();
        }
    });

    it("should insert data from Excel files into temp tables", async () => {
        await client.query(`TRUNCATE ${tables.join(', ')} CASCADE`);
        await excelImport(testDir, client);

        for (const table of tables) {
            const res = await client.query(`SELECT count(*) FROM ${table}`);
            const count = parseInt(res.rows[0].count);
            
            expect(count, `Table ${table} should not be empty after Excel import`).toBeGreaterThan(0);
        }
    }, 30000);

    it("should insert data from JSON files into temp tables", async () => {
        await client.query(`TRUNCATE ${tables.join(', ')} CASCADE`);
        await jsonImport(testDir, client);

        for (const table of tables) {
            const res = await client.query(`SELECT count(*) FROM ${table}`);
            const count = parseInt(res.rows[0].count);
            
            expect(count, `Table ${table} should not be empty after JSON import`).toBeGreaterThan(0);
        }
    }, 30000);
});