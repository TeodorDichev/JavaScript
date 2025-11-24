import { client } from "./startUp.js";
import { batchInsert, chunkArray, normalizeMayoralityId } from "./importCommon.js";
import fs from "fs";
import path from "path";

export function transformRegions(regions) {
  return regions
    .filter(r => r.oblast)
    .map(r => ({
      region_id: r.oblast,
      name: r.name,
      transliteration: r.name_en,
      nuts3_id: r.nuts3,
    }));
}

export function transformMunicipalities(municipalities) {
  return municipalities
    .filter(m => m.obshtina)
    .map(m => ({
      municipality_id: m.obshtina,
      name: m.name,
      transliteration: m.name_en,
      region_id: m.obshtina.slice(0, 3),
    }));
}

export function transformMayoralities(mayoralities) {
  return mayoralities
    .filter(m => m.kmetstvo)
    .map(m => ({
      mayorality_id: m.kmetstvo,
      name: m.name,
      transliteration: m.name_en,
      municipality_id: m.kmetstvo.slice(0, 5),
    }));
}

export function transformSettlements(settlements) {
  const altitudesMap = new Map();
  const typesMap = new Map();
  const settlementsData = [];

  settlements.forEach(s => {
    if (!s.ekatte) return;

    if (s.altitude && s.text) altitudesMap.set(s.altitude, s.text);
    if (s.kind && s.t_v_m) typesMap.set(s.kind, s.t_v_m.trim());

    settlementsData.push({
      ekatte: s.ekatte,
      name: s.name,
      transliteration: s.name_en,
      settlement_category: s.category,
      altitude_id: s.altitude,
      settlement_type_id: s.kind,
      mayorality_id: normalizeMayoralityId(s.kmetstvo),
      municipality_id: s.obshtina,
    });
  });

  const altitudesData = Array.from(altitudesMap, ([id, desc]) => ({
    altitude_id: id,
    altitude_description: desc,
  }));

  const typesData = Array.from(typesMap, ([id, desc]) => ({
    settlement_type_id: id,
    settlement_type_description: desc,
  }));

  return { settlementsData, altitudesData, typesData };
}

export async function jsonImport(
  outputDir,
  dbClient = client,
  insert = batchInsert,
) {
  await dbClient.connect();
  try {
    const regions = JSON.parse(fs.readFileSync(path.join(outputDir, "ek_obl.json")));
    const municipalities = JSON.parse(fs.readFileSync(path.join(outputDir, "ek_obst.json")));
    const mayoralities = JSON.parse(fs.readFileSync(path.join(outputDir, "ek_kmet.json")));
    const settlements = JSON.parse(fs.readFileSync( path.join(outputDir, "ek_atte.json")));

    const regionsData = transformRegions(regions);
    const municipalitiesData = transformMunicipalities(municipalities);
    const mayoralitiesData = transformMayoralities(mayoralities);
    const { settlementsData, altitudesData, typesData } = transformSettlements(settlements);

    await insert("REGION", ["region_id","name","transliteration","nuts3_id"], regionsData);
    await insert("MUNICIPALITY", ["municipality_id","name","transliteration","region_id"], municipalitiesData);
    await insert("MAYORALITY", ["mayorality_id","name","transliteration","municipality_id"], mayoralitiesData);
    await insert("ALTITUDE", ["altitude_id","altitude_description"], altitudesData);
    await insert("SETTLEMENT_TYPE", ["settlement_type_id","settlement_type_description"], typesData);

    const settlementChunks = chunkArray(settlementsData, 500);
    for (const chunk of settlementChunks) {
      await insert(
        "SETTLEMENT",
        ["ekatte","name","transliteration","settlement_category","altitude_id","settlement_type_id","mayorality_id","municipality_id"],
        chunk
      );
    }

    console.log("EKATTE import complete");
  } catch (err) {
    console.error("Import failed:", err);
  } finally {
    await dbClient.end();
  }
}
