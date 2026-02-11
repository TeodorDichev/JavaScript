import fs from "fs";
import path from "path";

export const safeName = (s = "") =>
  s
    .trim()
    .replace(/[/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");

export function log(file, msg) {
  fs.appendFileSync(file, msg + "\n");
}

export function scanExistingFiles(dir) {
  const existingFiles = new Set();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  for (const country of fs.readdirSync(dir)) {
    const cPath = path.join(dir, country);
    if (!fs.statSync(cPath).isDirectory()) continue;
    for (const f of fs.readdirSync(cPath)) existingFiles.add(f);
  }

  return existingFiles;
}