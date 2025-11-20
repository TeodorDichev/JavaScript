import { client } from "./startUp.js";
import { batchInsert, chunkArray, normalizeMayoralityId } from "./importCommon.js";
import fs from "fs";
import path from "path";

export async function jsonImport(outputDir) {
  await client.connect();
  try {
    const regions = JSON.parse(fs.readFileSync(path.join(outputDir, "ek_obl.json")));
    const municipalities = JSON.parse(fs.readFileSync(path.join(outputDir, "ek_obst.json")));
    const mayoralities = JSON.parse(fs.readFileSync(path.join(outputDir, "ek_kmet.json")));
    const settlements = JSON.parse(fs.readFileSync(path.join(outputDir, "ek_atte.json")));

    const regionsData = regions.filter(r => r.oblast).map(r => ({
      region_id: r.oblast,
      name: r.name,
      transliteration: r.name_en,
      nuts1_id: r.nuts1,
      nuts2_id: r.nuts2,
      nuts3_id: r.nuts3,
    }));

    const municipalitiesData = municipalities.filter(m => m.obshtina).map(m => ({
      municipality_id: m.obshtina,
      name: m.name,
      transliteration: m.name_en,
      region_id: m.obshtina.slice(0, 3),
    }));

    const mayoralitiesData = mayoralities.filter(m => m.kmetstvo).map(m => ({
      mayorality_id: m.kmetstvo,
      name: m.name,
      transliteration: m.name_en,
      municipality_id: m.kmetstvo.slice(0, 5),
    }));

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

    const altitudesData = Array.from(altitudesMap, ([id, desc]) => ({ altitude_id: id, altitude_description: desc }));
    const typesData = Array.from(typesMap, ([id, desc]) => ({ settlement_type_id: id, settlement_type_description: desc }));

    await batchInsert("REGION", ["region_id","name","transliteration","nuts1_id","nuts2_id","nuts3_id"], regionsData);
    await batchInsert("MUNICIPALITY", ["municipality_id","name","transliteration","region_id"], municipalitiesData);
    await batchInsert("MAYORALITY", ["mayorality_id","name","transliteration","municipality_id"], mayoralitiesData);
    await batchInsert("ALTITUDE", ["altitude_id","altitude_description"], altitudesData);
    await batchInsert("SETTLEMENT_TYPE", ["settlement_type_id","settlement_type_description"], typesData);

    const settlementChunks = chunkArray(settlementsData, 500);
    for (let i = 0; i < settlementChunks.length; i++) {
      await batchInsert(
        "SETTLEMENT",
        ["ekatte","name","transliteration","settlement_category","altitude_id","settlement_type_id","mayorality_id","municipality_id"],
        settlementChunks[i]
      );
    }

    console.log("EKATTE import complete");
  } catch (err) {
    console.error("Import failed:", err);
  } finally {
    await client.end();
  }
}
