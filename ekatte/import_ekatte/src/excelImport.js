import ExcelJS from "exceljs";
import { client } from "./startUp.js";
import { batchInsert, chunkArray, normalizeMayoralityId } from "./importCommon.js";
import path from "path";

export function transformExcelRegions(sheet) {
  const header = sheet.getRow(4);
  const cols = {};
  header.eachCell((cell, colNumber) => { cols[cell.value] = colNumber; });

  const data = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 4) return;
    const regionId = row.getCell(cols["Код на областта"]).value;
    if (!regionId) return;
    data.push({
      region_id: regionId,
      name: row.getCell(cols["Име на областта"]).value,
      transliteration: row.getCell(cols["Транслитерация"]).value,
      nuts3_id: row.getCell(cols["NUTS3"]).value,
    });
  });
  return data;
}

export function transformExcelMunicipalities(sheet) {
  const header = sheet.getRow(4);
  const cols = {};
  header.eachCell((cell, colNumber) => { cols[cell.value] = colNumber; });

  const data = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 4) return;
    const muId = row.getCell(cols["Код на общината"]).value;
    if (!muId) return;
    data.push({
      municipality_id: muId,
      name: row.getCell(cols["Име на общината"]).value,
      transliteration: row.getCell(cols["Транслитерация"]).value,
      region_id: muId.slice(0, 3),
    });
  });
  return data;
}

export function transformExcelMayoralities(sheet) {
  const header = sheet.getRow(4);
  const cols = {};
  header.eachCell((cell, colNumber) => { cols[cell.value] = colNumber; });

  const data = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 4) return;
    const maId = row.getCell(cols["Идентификационен код"]).value;
    if (!maId) return;
    data.push({
      mayorality_id: maId,
      name: row.getCell(cols["Име"]).value,
      transliteration: row.getCell(cols["Транслитерация"]).value,
      municipality_id: maId.slice(0, 5),
    });
  });
  return data;
}

export function transformExcelSettlements(sheet) {
  const header = sheet.getRow(4);
  const cols = {};
  header.eachCell((cell, colNumber) => { cols[cell.value] = colNumber; });

  const altitudesMap = new Map();
  const typesMap = new Map();
  const settlementsData = [];

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

    settlementsData.push({
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

  const altitudesData = Array.from(altitudesMap, ([id, desc]) => ({ altitude_id: id, altitude_description: desc }));
  const typesData = Array.from(typesMap, ([id, desc]) => ({ settlement_type_id: id, settlement_type_description: desc }));

  return { settlementsData, altitudesData, typesData };
}

export async function excelImport(
  outputDir,
  dbClient = client,
  insert = batchInsert,
  Workbook = ExcelJS.Workbook,
) {
  await dbClient.connect();

  try {
    const loadSheet = async (fileName) => {
      const wb = new Workbook();
      await wb.xlsx.readFile(path.join(outputDir, fileName));
      return wb.getWorksheet(1);
    };

    const regionsSheet = await loadSheet("ek_obl.xlsx");
    const municipalitiesSheet = await loadSheet("ek_obst.xlsx");
    const mayoralitiesSheet = await loadSheet("ek_kmet.xlsx");
    const settlementsSheet = await loadSheet("ek_atte.xlsx");

    const regionsData = transformExcelRegions(regionsSheet);
    const municipalitiesData = transformExcelMunicipalities(municipalitiesSheet);
    const mayoralitiesData = transformExcelMayoralities(mayoralitiesSheet);
    const { settlementsData, altitudesData, typesData } = transformExcelSettlements(settlementsSheet);

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

    console.log("Excel EKATTE import complete");
  } catch (err) {
    console.error("Import failed:", err);
  } finally {
    await dbClient.end();
  }
}
