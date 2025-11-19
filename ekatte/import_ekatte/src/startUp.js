import fs from "fs";
import path from "path";
import dotenv from 'dotenv';
import readline from "readline";
import { csvImport } from "./csvImport";
import { jsonImport } from "./jsonImport";
import { xlsxImport } from "./xlsxImport";
import { Pool } from 'pg';

dotenv.config({path: '.../.env'});

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT)
});

const folder = "./data";
const files = fs.readdirSync(folder);

const fileTypes = { csv: [], xlsx: [], json: [] };
files.forEach((f) => {
  const ext = path.extname(f).toLowerCase();
  if (ext === ".csv") fileTypes.csv.push(f);
  else if (ext === ".xlsx") fileTypes.xlsx.push(f);
  else if (ext === ".json") fileTypes.json.push(f);
});

if (Object.values(fileTypes).every((arr) => arr.length === 0)) {
  console.log("No files found!");
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Enter file type to import (csv, xlsx, json): ", (type) => {
  type = type.trim().toLowerCase();
  if (!fileTypes[type] || fileTypes[type].length === 0) {
    console.log("No files of this type found.");
  } else {
    console.log(`Files to import (${type}):`);
    fileTypes[type].forEach((f) => console.log(f));

    switch (type) {
      case "csv":
        csvImport();
        break;
      case "xlsx":
        xlsxImport();
        break;
      case "json":
        jsonImport();
        break;
    }
  }
  rl.close();
});
