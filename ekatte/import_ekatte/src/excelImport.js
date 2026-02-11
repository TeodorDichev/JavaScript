import ExcelJS from "exceljs";
import { client } from "./startUp.js";
import { prepareInsert, normalizeMayoralityId } from "./importCommon.js";
import path from "path";

export function transformExcelRegions(sheet) {
  const header = sheet.getRow(4);
  const cols = {};
  header.eachCell((cell, colNumber) => { cols[cell.value] = colNumber; });

  const regions = [];
  const regionCenters = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 4) return;

    const regionId = row.getCell(cols["Код на областта"]).value;
    if (!regionId) return;

    regions.push({
      region_id: regionId,
      name: row.getCell(cols["Име на областта"]).value,
      transliteration: row.getCell(cols["Транслитерация"]).value,
      nuts3_id: row.getCell(cols["NUTS3"]).value,
    });

    regionCenters.push({
      region_id: regionId,
      settlement_ekatte: row.getCell(cols["Код на областния център"]).value,
    });
  });

  return { regions, regionCenters };
}


export function transformExcelMunicipalities(sheet) {
  const header = sheet.getRow(4);
  const cols = {};
  header.eachCell((cell, colNumber) => { cols[cell.value] = colNumber; });

  const municipalities = [];
  const municipalityCenters = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 4) return;

    const muId = row.getCell(cols["Код на общината"]).value;
    if (!muId) return;

    municipalities.push({
      municipality_id: muId,
      name: row.getCell(cols["Име на общината"]).value,
      transliteration: row.getCell(cols["Транслитерация"]).value,
      region_id: muId.slice(0, 3),
    });

    municipalityCenters.push({
      municipality_id: muId,
      settlement_ekatte: row.getCell(cols["Код на общинския център"]).value,
    });
  });

  return { municipalities, municipalityCenters };
}


export function transformExcelMayoralities(sheet) {
  const header = sheet.getRow(4);
  const cols = {};
  header.eachCell((cell, colNumber) => { cols[cell.value] = colNumber; });

  const mayoralities = [];
  const mayoralityCenters = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 4) return;

    const maId = row.getCell(cols["Идентификационен код"]).value;
    if (!maId) return;

    mayoralities.push({
      mayorality_id: maId,
      name: row.getCell(cols["Име"]).value,
      transliteration: row.getCell(cols["Транслитерация"]).value,
      municipality_id: maId.slice(0, 5),
    });

    mayoralityCenters.push({
      mayorality_id: maId,
      settlement_ekatte:
        row.getCell(cols["ЕКАТТЕ-код на населеното място, център на кметството"]).value,
    });
  });

  return { mayoralities, mayoralityCenters };
}


export function transformExcelSettlements(sheet) {
  const header = sheet.getRow(4);
  const cols = {};
  header.eachCell((cell, colNumber) => { cols[cell.value] = colNumber; });

  const altitudesMap = new Map();
  const typesMap = new Map();
  const settlements = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 4) return;

    const ekatte = row.getCell(cols["ЕКАТТЕ"]).value;
    if (!ekatte) return;

    const typeId = row.getCell(cols["Код на типа"]).value;
    const typeDesc = row.getCell(cols["Вид"]).value;
    const altitudeId = row.getCell(cols["Надморска височина"]).value;
    const altitudeDesc = row.getCell(cols["Надморска височина стойност"]).value;
    const category = row.getCell(cols["Код на категорията"]).value;
    const kmetstvo = row.getCell(cols["Кметство"]).value;
    const obshtina = row.getCell(cols["Код на общината"]).value;

    if (typeId && typeDesc) typesMap.set(typeId, typeDesc.trim());
    if (altitudeId && altitudeDesc) altitudesMap.set(altitudeId, altitudeDesc);

    settlements.push({
      ekatte,
      name: row.getCell(cols["Име на населено място"]).value,
      transliteration: row.getCell(cols["Транслитерация"]).value,
      settlement_category: category,
      altitude_id: altitudeId,
      settlement_type_id: typeId,
      mayorality_id: normalizeMayoralityId(kmetstvo),
      municipality_id: obshtina,
    });
  });

  const altitudes = Array.from(altitudesMap, ([id, desc]) => ({ altitude_id: id, altitude_description: desc }));
  const types = Array.from(typesMap, ([id, desc]) => ({ settlement_type_id: id, settlement_type_description: desc }));

  return { settlements, altitudes, types };
}

export async function excelImport(
  outputDir,
  dbClient = client,
  insert = prepareInsert,
  Workbook = ExcelJS.Workbook,
) {
  const loadSheet = async (fileName) => {
    const wb = new Workbook();
    await wb.xlsx.readFile(path.join(outputDir, fileName));
    return wb.getWorksheet(1);
  };

  try {
    await dbClient.query("BEGIN");

    const regionsSheet = await loadSheet("ek_obl.xlsx");
    const municipalitiesSheet = await loadSheet("ek_obst.xlsx");
    const mayoralitiesSheet = await loadSheet("ek_kmet.xlsx");
    const settlementsSheet = await loadSheet("ek_atte.xlsx");

    const { regions, regionCenters } = transformExcelRegions(regionsSheet);
    const { municipalities, municipalityCenters } = transformExcelMunicipalities(municipalitiesSheet);
    const { mayoralities, mayoralityCenters } = transformExcelMayoralities(mayoralitiesSheet);
    const { settlements, altitudes, types } = transformExcelSettlements(settlementsSheet);

    await insert("REGION",
    ["region_id","name","transliteration","nuts3_id"],
    regions,
    dbClient
  );

  await insert("MUNICIPALITY",
    ["municipality_id","name","transliteration","region_id"],
    municipalities,
    dbClient
  );

  await insert("MAYORALITY",
    ["mayorality_id","name","transliteration","municipality_id"],
    mayoralities,
    dbClient
  );

  await insert("ALTITUDE",
    ["altitude_id","altitude_description"],
    altitudes,
    dbClient
  );

  await insert("SETTLEMENT_TYPE",
    ["settlement_type_id","settlement_type_description"],
    types,
    dbClient
  );

  await insert("SETTLEMENT",
    ["ekatte","name","transliteration","settlement_category",
    "altitude_id","settlement_type_id",
    "mayorality_id","municipality_id"],
    settlements,
    dbClient
  );

  /* centers LAST */
  await insert("REGION_CENTER",
    ["region_id","settlement_ekatte"],
    regionCenters,
    dbClient
  );

  await insert("MUNICIPALITY_CENTER",
    ["municipality_id","settlement_ekatte"],
    municipalityCenters,
    dbClient
  );

  await insert("MAYORALITY_CENTER",
    ["mayorality_id","settlement_ekatte"],
    mayoralityCenters,
    dbClient
  );

    await dbClient.query("COMMIT");
    console.log("Excel EKATTE import complete");

  } catch (err) {
    await dbClient.query("ROLLBACK");
    console.error("Import failed, rolled back:", err);
  }
}