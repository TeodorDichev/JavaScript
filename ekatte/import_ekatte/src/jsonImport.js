import { client } from "./startUp.js";
import fs from "fs";
import path from "path";

async function insertBatch(rows, insertFn, batchName) {
  await client.query("BEGIN");
  try {
    for (const row of rows) {
      await insertFn(row);
    }
    await client.query("COMMIT");
    console.log(`${batchName} inserted successfully`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`${batchName} insertion failed, rolled back:`, err.message);
  }
}

async function insertRegion(row) {
  const sql = `
    INSERT INTO REGION (REGION_ID, NAME, TRANSLITERATION, NUTS1_ID, NUTS2_ID, NUTS3_ID)
    VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (REGION_ID) DO NOTHING
  `;
  await client.query(sql, [
    row.region_id,
    row.name,
    row.transliteration,
    row.nuts1_id,
    row.nuts2_id,
    row.nuts3_id,
  ]);
}

async function insertMunicipality(row) {
  const sql = `
    INSERT INTO MUNICIPALITY (MUNICIPALITY_ID, NAME, TRANSLITERATION, REGION_ID)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (MUNICIPALITY_ID) DO NOTHING
  `;
  await client.query(sql, [
    row.municipality_id,
    row.name,
    row.transliteration,
    row.region_id,
  ]);
}

async function insertMayorality(row) {
  const sql = `
    INSERT INTO MAYORALITY (MAYORALITY_ID, NAME, TRANSLITERATION, MUNICIPALITY_ID)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (MAYORALITY_ID) DO NOTHING
  `;
  await client.query(sql, [
    row.mayorality_id,
    row.name,
    row.transliteration,
    row.municipality_id,
  ]);
}

async function insertSettlementType(row) {
  const sql = `
    INSERT INTO SETTLEMENT_TYPE (SETTLEMENT_TYPE_ID, SETTLEMENT_TYPE_DESCRIPTION)
    VALUES ($1, $2)
    ON CONFLICT (SETTLEMENT_TYPE_ID) DO NOTHING
  `;
  await client.query(sql, [row.settlement_type_id, row.type_description]);
}

async function insertAltitude(row) {
  const sql = `
    INSERT INTO ALTITUDE (ALTITUDE_ID, ALTITUDE_DESCRIPTION)
    VALUES ($1, $2)
    ON CONFLICT (ALTITUDE_ID) DO NOTHING
  `;
  await client.query(sql, [row.altitude_id, row.altitude_description]);
}

async function insertSettlement(row) {
  const sql = `
    INSERT INTO SETTLEMENT(
      EKATTE, NAME, TRANSLITERATION, SETTLEMENT_CATEGORY, ALTITUDE_ID, SETTLEMENT_TYPE_ID, MAYORALITY_ID, MUNICIPALITY_ID
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT (EKATTE) DO NOTHING
  `;
  await client.query(sql, [
    row.ekatte,
    row.name,
    row.transliteration,
    row.settlement_category,
    row.altitude_id,
    row.settlement_type_id,
    row.mayorality_id,
    row.municipality_id,
  ]);
}

export async function jsonImport(outputDir) {
  await client.connect();

  try {
    const regions = JSON.parse(
      fs.readFileSync(path.join(outputDir, "ek_obl.json"))
    );
    const municipalities = JSON.parse(
      fs.readFileSync(path.join(outputDir, "ek_obst.json"))
    );
    const mayoralities = JSON.parse(
      fs.readFileSync(path.join(outputDir, "ek_kmet.json"))
    );
    const settlements = JSON.parse(
      fs.readFileSync(path.join(outputDir, "ek_atte.json"))
    );

    await insertBatch(
      regions
        .filter((r) => r["oblast"])
        .map((r) => ({
          region_id: r["oblast"],
          name: r["name"],
          transliteration: r["name_en"],
          nuts1_id: r["nuts1"],
          nuts2_id: r["nuts2"],
          nuts3_id: r["nuts3"],
        })),
      insertRegion,
      "Regions"
    );

    await insertBatch(
      municipalities
        .filter((m) => m["obshtina"])
        .map((m) => ({
          municipality_id: m["obshtina"],
          name: m["name"],
          transliteration: m["name_en"],
          region_id: m["obshtina"].slice(0, 3),
        })),
      insertMunicipality,
      "Municipalities"
    );

    await insertBatch(
      mayoralities
        .filter((m) => m["kmetstvo"])
        .map((m) => ({
          mayorality_id: m["kmetstvo"],
          name: m["name"],
          transliteration: m["name_en"],
          municipality_id: m["kmetstvo"].slice(0, 5),
        })),
      insertMayorality,
      "Mayoralities"
    );

    const uniqueTypes = Array.from(
      new Map(
        settlements
          .filter((s) => s.kind && s.t_v_m)
          .map((s) => [s.kind, s.t_v_m])
      ).entries()
    ).map(([id, desc]) => ({ settlement_type_id: id, type_description: desc }));

    await insertBatch(uniqueTypes, insertSettlementType, "Settlement Types");

    const uniqueAltitudes = Array.from(
      new Map(
        settlements
          .filter((s) => s.altitude && s.text)
          .map((s) => [s.altitude, s.text])
      ).entries()
    ).map(([id, desc]) => ({ altitude_id: id, altitude_description: desc }));

    await insertBatch(uniqueAltitudes, insertAltitude, "Altitudes");

    function normalizeMayoralityId(mayoralityId) {
      return mayoralityId.endsWith("-00") ? null : mayoralityId;
    }

    await insertBatch(
      settlements
        .filter((s) => s["ekatte"])
        .map((s) => ({
          ekatte: s["ekatte"],
          name: s["name"],
          settlement_category: s["category"],
          settlement_type_id: s["kind"],
          altitude_id: s["altitude"],
          mayorality_id: normalizeMayoralityId(s["kmetstvo"]),
          municipality_id: s["obshtina"],
          transliteration: s["name_en"]
        })),
      insertSettlement,
      "Settlements"
    );

    console.log("EKATTE import complete");
  } catch (err) {
    console.error("Import process failed:", err.message);
  } finally {
    await client.end();
  }
}
