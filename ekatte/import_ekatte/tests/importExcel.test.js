import { describe, it, expect } from "vitest";
import {
  transformExcelRegions,
  transformExcelMunicipalities,
  transformExcelMayoralities,
  transformExcelSettlements,
} from "../src/excelImport.js";
import { normalizeMayoralityId } from "../src/importCommon.js";

/**
 * Помощна функция за създаване на имитация (Mock) на ред от Excel
 */
function createMockRow(values) {
  return {
    getCell: (colNumber) => ({ value: values[colNumber - 1] }),
    eachCell: (fn) => values.forEach((v, i) => fn({ value: v }, i + 1)),
  };
}

/**
 * Помощна функция за създаване на имитация (Mock) на Excel Worksheet
 */
function createMockSheet(rows) {
  return {
    getRow: (rowNumber) => rows[rowNumber - 1],
    eachRow: (opt, callback) => rows.forEach((row, i) => callback(row, i + 1)),
  };
}

describe("import excel", () => {
  
  it("should map regions correctly and filter header rows", () => {
    const mockSheet = createMockSheet([
      {}, {}, {}, // Редове 1, 2, 3 (празни)
      createMockRow(["Код на областта", "Име на областта", "Транслитерация", "NUTS3", "Код на областния център"]), // Ред 4 (Header)
      createMockRow(["01", "Region1", "RegionOne", "N3", "10001"]), // Ред 5 (Data)
    ]);

    // Твоят код връща { regions, regionCenters }
    const { regions, regionCenters } = transformExcelRegions(mockSheet);

    expect(regions).toEqual([
      {
        region_id: "01",
        name: "Region1",
        transliteration: "RegionOne",
        nuts3_id: "N3",
      },
    ]);

    expect(regionCenters).toEqual([
      {
        region_id: "01",
        settlement_ekatte: "10001",
      },
    ]);
  });

  it("should map municipalities correctly and slice region_id", () => {
    const mockSheet = createMockSheet([
      {}, {}, {},
      createMockRow(["Код на общината", "Име на общината", "Транслитерация", "Код на общинския център"]),
      createMockRow(["12345", "Muni1", "MuniOne", "20002"]),
    ]);

    const { municipalities, municipalityCenters } = transformExcelMunicipalities(mockSheet);

    expect(municipalities).toEqual([
      {
        municipality_id: "12345",
        name: "Muni1",
        transliteration: "MuniOne",
        region_id: "123", // Проверка на muId.slice(0, 3)
      },
    ]);

    expect(municipalityCenters).toEqual([
      {
        municipality_id: "12345",
        settlement_ekatte: "20002",
      },
    ]);
  });

  it("should map mayoralities correctly and slice municipality_id", () => {
    const mockSheet = createMockSheet([
      {}, {}, {},
      createMockRow([
        "Идентификационен код", 
        "Име", 
        "Транслитерация", 
        "ЕКАТТЕ-код на населеното място, център на кметството"
      ]),
      createMockRow(["12345678", "Mayor1", "MayorOne", "30003"]),
    ]);

    const { mayoralities, mayoralityCenters } = transformExcelMayoralities(mockSheet);

    expect(mayoralities).toEqual([
      {
        mayorality_id: "12345678",
        name: "Mayor1",
        transliteration: "MayorOne",
        municipality_id: "12345", // Проверка на maId.slice(0, 5)
      },
    ]);

    expect(mayoralityCenters).toEqual([
      {
        mayorality_id: "12345678",
        settlement_ekatte: "30003",
      },
    ]);
  });

  it("should map settlements and collect types and altitudes correctly", () => {
    const mockSheet = createMockSheet([
      {}, {}, {},
      createMockRow([
        "ЕКАТТЕ", 
        "Име на населено място", 
        "Транслитерация", 
        "Код на категорията", 
        "Кметство", 
        "Код на общината", 
        "Код на типа", 
        "Вид", 
        "Надморска височина", 
        "Надморска височина стойност"
      ]),
      createMockRow([
        "001", 
        "Settlement1", 
        "SetOne", 
        "A", 
        "123-01", 
        "12345", 
        "K1", 
        "Type1 ", 
        "ALT1", 
        "High"
      ]),
    ]);

    // Твоят код връща { settlements, altitudes, types }
    const { settlements, altitudes, types } = transformExcelSettlements(mockSheet);

    expect(settlements).toEqual([
      {
        ekatte: "001",
        name: "Settlement1",
        transliteration: "SetOne",
        settlement_category: "A",
        altitude_id: "ALT1",
        settlement_type_id: "K1",
        mayorality_id: normalizeMayoralityId("123-01"),
        municipality_id: "12345",
      },
    ]);

    expect(altitudes).toEqual([
      {
        altitude_id: "ALT1",
        altitude_description: "High",
      },
    ]);

    expect(types).toEqual([
      {
        settlement_type_id: "K1",
        settlement_type_description: "Type1", // Проверка за .trim()
      },
    ]);
  });
});