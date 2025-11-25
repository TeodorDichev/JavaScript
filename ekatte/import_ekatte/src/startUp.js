import fs from "fs";
import path from "path";
import dotenv from 'dotenv';
import readline from "readline";
import { jsonImport } from "./jsonImport.js";
import { excelImport } from "./excelImport.js";
import { Client } from 'pg';

dotenv.config({path: '.env'});

export const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT)
});

const folder = "./import_ekatte/data";
const files = fs.readdirSync(folder);

const fileTypes = { csv: [], xlsx: [], json: [] };
files.forEach((f) => {
  const ext = path.extname(f).toLowerCase();
  if (ext === ".xlsx") fileTypes.xlsx.push(f);
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

console.log("Files found: ")
Object.entries(fileTypes).forEach(([key, value]) => {
  console.log(key, value);
});

await client.connect();

rl.question("Enter file type to import (xlsx, json): ", async (type) => {
  type = type.trim().toLowerCase();
  if (!fileTypes[type] || fileTypes[type].length === 0) {
    console.log("No files of this type found.");
  } else {
    console.log(`Files to import (${type}):`);
    
    switch (type) {
      case "xlsx":
        await excelImport(folder, client);
        break;
      case "json":
        await jsonImport(folder, client);
        break;
    }
  }
  rl.close();
});

await client.end();