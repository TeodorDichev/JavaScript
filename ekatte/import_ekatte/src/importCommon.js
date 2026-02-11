export function normalizeMayoralityId(mayoralityId) { 
  return mayoralityId.endsWith("-00") ? null : mayoralityId; 
}

export async function prepareInsert(table, columns, rows, dbClient) {
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

  await dbClient.query(sql, values);
}