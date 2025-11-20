import ExcelJS from "exceljs";
import { client } from "./startUp.js";
import { batchInsert, chunkArray, normalizeMayoralityId } from "./importCommon.js";
import path from "path";

export async function excelImport(outputDir) {
  await client.connect();

  try {
    const settlementWorkbook = new ExcelJS.Workbook();
    await settlementWorkbook.xlsx.readFile(path.join(outputDir, "ek_obl.xlsx"));

    const regionsSheet = settlementWorkbook.getWorksheet(1);
    const regionHeader = regionsSheet.getRow(4);
    const regionCols = {};
    regionHeader.eachCell((cell, colNumber) => { regionCols[cell.value] = colNumber; });

    const regionsData = [];
    regionsSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= 4) return;

      const regionId = row.getCell(regionCols["Код на областта"]).value;
      if (!regionId) return;

      regionsData.push({
        region_id: regionId,
        name: row.getCell(regionCols["Име на областта"]).value,
        transliteration: row.getCell(regionCols["Транслитерация"]).value,
        nuts1_id: row.getCell(regionCols["NUTS1"]).value,
        nuts2_id: row.getCell(regionCols["NUTS2"]).value,
        nuts3_id: row.getCell(regionCols["NUTS3"]).value,
      });
    });

    const municipalitiesWorkbook = new ExcelJS.Workbook();
    await municipalitiesWorkbook.xlsx.readFile(path.join(outputDir, "ek_obst.xlsx"));

    const municipalitiesSheet = municipalitiesWorkbook.getWorksheet(1);
    const muHeader = municipalitiesSheet.getRow(4);
    const muCols = {};
    muHeader.eachCell((cell, colNumber) => { muCols[cell.value] = colNumber; });

    const municipalitiesData = [];
    municipalitiesSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= 4) return;

      const muId = row.getCell(muCols["Код на общината"]).value;
      if (!muId) return;

      municipalitiesData.push({
        municipality_id: muId,
        name: row.getCell(muCols["Име на общината"]).value,
        transliteration: row.getCell(muCols["Транслитерация"]).value,
        region_id: muId.slice(0, 3),
      });
    });

    const mayoralitiesWorkbook = new ExcelJS.Workbook();
    await mayoralitiesWorkbook.xlsx.readFile(path.join(outputDir, "ek_kmet.xlsx"));

    const mayoralitiesSheet = mayoralitiesWorkbook.getWorksheet(1);
    const maHeader = mayoralitiesSheet.getRow(4);
    const maCols = {};
    maHeader.eachCell((cell, colNumber) => { maCols[cell.value] = colNumber; });

    const mayoralitiesData = [];
    mayoralitiesSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= 4) return;
      
      const maId = row.getCell(maCols["Идентификационен код"]).value;
      if (!maId) return;

      mayoralitiesData.push({
        mayorality_id: maId,
        name: row.getCell(maCols["Име"]).value,
        transliteration: row.getCell(maCols["Транслитерация"]).value,
        municipality_id: maId.slice(0, 5),
      });
    });

    const settlementsWorkbook = new ExcelJS.Workbook();
    await settlementsWorkbook.xlsx.readFile(path.join(outputDir, "ek_atte.xlsx"));

    const settlementsSheet = settlementsWorkbook.getWorksheet(1);
    const headerRow = settlementsSheet.getRow(4);
    const columns = {};
    headerRow.eachCell((cell, colNumber) => { columns[cell.value] = colNumber; });

    const altitudesMap = new Map();
    const typesMap = new Map();
    const settlementsData = [];

    settlementsSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber <= 4) return;

      const ekatte = row.getCell(columns["ЕКАТТЕ"]).value;
      if (!ekatte) return;

      const typeId = row.getCell(columns["Код на типа"]).value;
      const typeDesc = row.getCell(columns["Вид"]).value;
      const altitudeId = row.getCell(columns["Надморска височина"]).value;
      const altitudeDesc = row.getCell(columns["Надморска височина стойност"]).value;
      const category = row.getCell(columns["Код на категорията"]).value;
      const kmetstvo = row.getCell(columns["Кметство"]).value;
      const obshtina = row.getCell(columns["Код на общината"]).value;

      if (typeId && typeDesc) typesMap.set(typeId, typeDesc.trim());
      if (altitudeId && altitudeDesc) altitudesMap.set(altitudeId, altitudeDesc);

      settlementsData.push({
        ekatte,
        name: row.getCell(columns["Име на населено място"]).value,
        transliteration: row.getCell(columns["Транслитерация"]).value,
        settlement_category: category,
        altitude_id: altitudeId,
        settlement_type_id: typeId,
        mayorality_id: normalizeMayoralityId(kmetstvo),
        municipality_id: obshtina,
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

    console.log("Excel EKATTE import complete");
  } catch (err) {
    console.error("Import failed:", err);
  } finally {
    await client.end();
  }
}
