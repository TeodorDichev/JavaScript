import { describe, it, expect } from "vitest";
import {
  transformRegions,
  transformMunicipalities,
  transformMayoralities,
  transformSettlements,
} from "../../src/jsonImport.js";
import { normalizeMayoralityId } from "../../src/importCommon.js";

describe("import json", () => {
  it("should filter out regions without oblast and maps fields correctly", () => {
    const input = [
      {
        oblast: "01",
        name: "Region1",
        name_en: "RegionOne",
        nuts3: "N3",
      },
      { name: "Region2" },
    ];

    const output = transformRegions(input);
    expect(output).toEqual([
      {
        region_id: "01",
        name: "Region1",
        transliteration: "RegionOne",
        nuts3_id: "N3",
      },
    ]);
  });

  it("should filter out municipalities without obshtina and maps fields with region_id slice", () => {
    const input = [
      { obshtina: "12345", name: "Muni1", name_en: "MuniOne" },
      { name: "Muni2" },
    ];

    const output = transformMunicipalities(input);
    expect(output).toEqual([
      {
        municipality_id: "12345",
        name: "Muni1",
        transliteration: "MuniOne",
        region_id: "123",
      },
    ]);
  });

  it("should filter out mayoralities without kmetstvo and maps fields with municipality_id slice", () => {
    const input = [
      { kmetstvo: "123456", name: "Mayor1", name_en: "MayorOne" },
      { name: "Mayor2" },
    ];

    const output = transformMayoralities(input);
    expect(output).toEqual([
      {
        mayorality_id: "123456",
        name: "Mayor1",
        transliteration: "MayorOne",
        municipality_id: "12345",
      },
    ]);
  });

  it("should map settlements and collects altitudes and types correctly", () => {
    const input = [
      {
        ekatte: "001",
        name: "Settlement1",
        name_en: "SetOne",
        category: "A",
        altitude: "ALT1",
        text: "High",
        kind: "K1",
        t_v_m: "Type1 ",
        kmetstvo: "123-01",
        obshtina: "12345",
      },
      { ekatte: null },
    ];

    const { settlementsData, altitudesData, typesData } =
      transformSettlements(input);

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
