import { describe, it, expect } from "vitest";
import {
  transformExcelRegions,
  transformExcelMunicipalities,
  transformExcelMayoralities,
  transformExcelSettlements,
} from "../../src/excelImport.js";
import { normalizeMayoralityId } from "../../src/importCommon.js";

function createMockRow(values) {
  return {
    getCell: (colNumber) => ({ value: values[colNumber - 1] }),
    eachCell: (fn) => values.forEach((v, i) => fn({ value: v }, i + 1)),
  };
}

function createMockSheet(rows) {
  return {
    getRow: (rowNumber) => rows[rowNumber - 1],
    eachRow: ({ includeEmpty }, callback) =>
      rows.forEach((row, i) => callback(row, i + 1)),
  };
}

describe("import excel", () => {
  it("should map regions correctly and filter header rows", () => {
    const mockSheet = createMockSheet([
      {},
      {},
      {},
      createMockRow([
        "Код на областта",
        "Име на областта",
        "Транслитерация",
        "NUTS3",
      ]),
      createMockRow(["01", "Region1", "RegionOne", "N3"]),
    ]);

    const result = transformExcelRegions(mockSheet);

    expect(result).toEqual([
      {
        region_id: "01",
        name: "Region1",
        transliteration: "RegionOne",
        nuts3_id: "N3",
      },
    ]);
  });

  it("should map municipalities correctly and slice region_id", () => {
    const mockSheet = createMockSheet([
      {},
      {},
      {},
      createMockRow(["Код на общината", "Име на общината", "Транслитерация"]),
      createMockRow(["12345", "Muni1", "MuniOne"]),
    ]);

    const result = transformExcelMunicipalities(mockSheet);

    expect(result).toEqual([
      {
        municipality_id: "12345",
        name: "Muni1",
        transliteration: "MuniOne",
        region_id: "123",
      },
    ]);
  });

  it("should map mayoralities correctly and slice municipality_id", () => {
    const mockSheet = createMockSheet([
      {},
      {},
      {},
      createMockRow(["Идентификационен код", "Име", "Транслитерация"]),
      createMockRow(["123456", "Mayor1", "MayorOne"]),
    ]);

    const result = transformExcelMayoralities(mockSheet);

    expect(result).toEqual([
      {
        mayorality_id: "123456",
        name: "Mayor1",
        transliteration: "MayorOne",
        municipality_id: "12345",
      },
    ]);
  });

  it("should map settlements and collect types and altitudes", () => {
    const mockSheet = createMockSheet([
      {},
      {},
      {},
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
        "Надморска височина стойност",
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
        "High",
      ]),
    ]);

    const { settlementsData, altitudesData, typesData } =
      transformExcelSettlements(mockSheet);

    expect(settlementsData).toEqual([
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

    expect(altitudesData).toEqual([
      { altitude_id: "ALT1", altitude_description: "High" },
    ]);
    expect(typesData).toEqual([
      { settlement_type_id: "K1", settlement_type_description: "Type1" },
    ]);
  });
});
