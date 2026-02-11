import { client } from "./startUp.js";
import { prepareInsert, normalizeMayoralityId } from "./importCommon.js";
import fs from "fs";
import path from "path";

export function transformRegions(regions) {
  const regionsData = [];
  const regionCentersData = [];

  regions.forEach(r => {
    if (!r.oblast) return;

    regionsData.push({
      region_id: r.oblast,
      name: r.name,
      transliteration: r.name_en,
      nuts3_id: r.nuts3
    });

    regionCentersData.push({
      region_id: r.oblast,
      settlement_ekatte: r.ekatte
    });
  });

  return { regionsData, regionCentersData };
}

export function transformMunicipalities(municipalities) {
  const municipalitiesData = [];
  const municipalityCentersData = [];

  municipalities.forEach(m => {
    if (!m.obshtina) return;

    municipalitiesData.push({
      municipality_id: m.obshtina,
      name: m.name,
      transliteration: m.name_en,
      region_id: m.obshtina.slice(0, 3)
    });

    municipalityCentersData.push({
      municipality_id: m.obshtina,
      settlement_ekatte: m.ekatte
    });
  });

  return { municipalitiesData, municipalityCentersData };
}

export function transformMayoralities(mayoralities) {
  const mayoralitiesData = [];
  const mayoralityCentersData = [];

  mayoralities.forEach(m => {
    if (!m.kmetstvo) return;

    mayoralitiesData.push({
      mayorality_id: m.kmetstvo,
      name: m.name,
      transliteration: m.name_en,
      municipality_id: m.kmetstvo.slice(0, 5)
    });

    mayoralityCentersData.push({
      mayorality_id: m.kmetstvo,
      settlement_ekatte: m.ekatte
    });
  });

  return { mayoralitiesData, mayoralityCentersData };
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
      municipality_id: s.obshtina
    });
  });

  const altitudesData = Array.from(altitudesMap, ([id, desc]) => ({
    altitude_id: id,
    altitude_description: desc
  }));

  const typesData = Array.from(typesMap, ([id, desc]) => ({
    settlement_type_id: id,
    settlement_type_description: desc
  }));

  return { settlementsData, altitudesData, typesData };
}

export async function jsonImport(
  outputDir,
  dbClient = client,
  insert = prepareInsert
) {
  try {
    await dbClient.query("BEGIN");

    const regions = JSON.parse(fs.readFileSync(path.join(outputDir, "ek_obl.json")));
    const municipalities = JSON.parse(fs.readFileSync(path.join(outputDir, "ek_obst.json")));
    const mayoralities = JSON.parse(fs.readFileSync(path.join(outputDir, "ek_kmet.json")));
    const settlements = JSON.parse(fs.readFileSync(path.join(outputDir, "ek_atte.json")));

    const { regionsData, regionCentersData } = transformRegions(regions);
    const { municipalitiesData, municipalityCentersData } = transformMunicipalities(municipalities);
    const { mayoralitiesData, mayoralityCentersData } = transformMayoralities(mayoralities);
    const { settlementsData, altitudesData, typesData } = transformSettlements(settlements);

    await insert("REGION",
      ["region_id","name","transliteration","nuts3_id"],
      regionsData,
      dbClient
    );

    await insert("MUNICIPALITY",
      ["municipality_id","name","transliteration","region_id"],
      municipalitiesData,
      dbClient
    );

    await insert("MAYORALITY",
      ["mayorality_id","name","transliteration","municipality_id"],
      mayoralitiesData,
      dbClient
    );

    await insert("ALTITUDE",
      ["altitude_id","altitude_description"],
      altitudesData,
      dbClient
    );

    await insert("SETTLEMENT_TYPE",
      ["settlement_type_id","settlement_type_description"],
      typesData,
      dbClient
    );

    await insert("SETTLEMENT",
      ["ekatte","name","transliteration","settlement_category",
       "altitude_id","settlement_type_id",
       "mayorality_id","municipality_id"],
      settlementsData,
      dbClient
    );

    await insert("REGION_CENTER", ["region_id","settlement_ekatte"], regionCentersData, dbClient);
    await insert("MUNICIPALITY_CENTER", ["municipality_id","settlement_ekatte"], municipalityCentersData, dbClient);
    await insert("MAYORALITY_CENTER", ["mayorality_id","settlement_ekatte"], mayoralityCentersData, dbClient);

    await dbClient.query("COMMIT");
    console.log("EKATTE import complete");

  } catch (err) {
    await dbClient.query("ROLLBACK");
    console.error("Import failed, rolled back:", err);
  }
}
