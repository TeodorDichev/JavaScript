import { client } from "./startUp.js";

export function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export function normalizeMayoralityId(mayoralityId) { 
  return mayoralityId.endsWith("-00") ? null : mayoralityId; 
}

export async function batchInsert(table, columns, rows, dbpool = client) {
  if (!rows.length) return;

  const placeholders = [];
  const values = [];

  rows.forEach((row) => {
    const rowPlaceholders = [];
    columns.forEach((col) => {
      values.push(row[col]);
      rowPlaceholders.push(`$${values.length}`);
    });
    placeholders.push(`(${rowPlaceholders.join(",")})`);
  });

  const sql = `
    INSERT INTO ${table} (${columns.join(",")})
    VALUES ${placeholders.join(",")}
    ON CONFLICT DO NOTHING
  `;

  try {
    await dbpool.query("BEGIN");
    await dbpool.query(sql, values);
    await dbpool.query("COMMIT");
    console.log(`${table} inserted successfully (${rows.length} rows)`);
  } catch (err) {
    await dbpool.query("ROLLBACK");
    console.error(`Failed to insert into ${table}, rolled back:`, err.message);
  }
}
