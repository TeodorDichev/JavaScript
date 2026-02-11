import { describe, it, expect } from "vitest";
import {
  transformRegions,
  transformMunicipalities,
  transformMayoralities,
  transformSettlements,
} from "../src/jsonImport.js";
import { normalizeMayoralityId } from "../src/importCommon.js";

describe("import json", () => {

  it("should filter out regions without oblast and maps fields correctly", () => {
    const input = [
      {
        oblast: "01",
        name: "Region1",
        name_en: "RegionOne",
        nuts3: "N3",
        ekatte: "10001"
      },
      { name: "Region2" },
    ];

    const { regionsData, regionCentersData } = transformRegions(input);

    expect(regionsData).toEqual([
      {
        region_id: "01",
        name: "Region1",
        transliteration: "RegionOne",
        nuts3_id: "N3",
      },
    ]);

    expect(regionCentersData).toEqual([
      {
        region_id: "01",
        settlement_ekatte: "10001",
      },
    ]);
  });

  it("should filter out municipalities without obshtina and maps fields with region_id slice", () => {
    const input = [
      { 
        obshtina: "12345", 
        name: "Muni1", 
        name_en: "MuniOne",
        ekatte: "20002"
      },
      { name: "Muni2" },
    ];

    const { municipalitiesData, municipalityCentersData } = transformMunicipalities(input);

    expect(municipalitiesData).toEqual([
      {
        municipality_id: "12345",
        name: "Muni1",
        transliteration: "MuniOne",
        region_id: "123",
      },
    ]);

    expect(municipalityCentersData).toEqual([
      {
        municipality_id: "12345",
        settlement_ekatte: "20002",
      },
    ]);
  });

  it("should filter out mayoralities without kmetstvo and maps fields with municipality_id slice", () => {
    const input = [
      { 
        kmetstvo: "12345678", 
        name: "Mayor1", 
        name_en: "MayorOne",
        ekatte: "30003"
      },
      { name: "Mayor2" },
    ];

    const { mayoralitiesData, mayoralityCentersData } = transformMayoralities(input);

    expect(mayoralitiesData).toEqual([
      {
        mayorality_id: "12345678",
        name: "Mayor1",
        transliteration: "MayorOne",
        municipality_id: "12345",
      },
    ]);

    expect(mayoralityCentersData).toEqual([
      {
        mayorality_id: "12345678",
        settlement_ekatte: "30003",
      },
    ]);
  });

  it("should map settlements and collect altitudes and types correctly", () => {
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

    const { settlementsData, altitudesData, typesData } = transformSettlements(input);

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
      {
        altitude_id: "ALT1",
        altitude_description: "High",
      },
    ]);

    expect(typesData).toEqual([
      {
        settlement_type_id: "K1",
        settlement_type_description: "Type1",
      },
    ]);
  });
});