// @vitest-environment jsdom
import { describe, it, beforeEach, expect, vi } from "vitest";
import { fetchData, renderTable, setupSearchInput } from "../../../public/scripts/index.js";

global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        rows: [],
        rowsCount: 0,
        settlementsCount: 0,
        filteredSettlementsCount: 0,
        mayoralitiesCount: 0,
        filteredMayoralitiesCount: 0,
        municipalitiesCount: 0,
        filteredMunicipalitiesCount: 0,
        regionsCount: 0,
        filteredRegionsCount: 0,
      }),
  })
);

describe("index.js", () => {
  let container, input;

  beforeEach(() => {
    document.body.innerHTML = `
      <input id="search-data" />
      <table class="result-table"><tbody></tbody></table>
      <div id="result-count"></div>
      <h2 id="res-header"></h2>
    `;
    container = document.querySelector(".result-table tbody");
    input = document.getElementById("search-data");

    fetch.mockClear();
  });

  it("should correctly populate table and counts", () => {
    renderTable({
      rows: [{ id: 1, settlement: "Sofia", mayorality: "M", municipality: "MU", region: "R" }],
      rowsCount: 1,
      settlementsCount: 2,
      filteredSettlementsCount: 1,
      mayoralitiesCount: 2,
      filteredMayoralitiesCount: 1,
      municipalitiesCount: 2,
      filteredMunicipalitiesCount: 1,
      regionsCount: 1,
      filteredRegionsCount: 1,
    });

    expect(container.innerHTML).toContain("Sofia");
    expect(document.getElementById("res-header").textContent).toBe("Резултати (1)");
    expect(document.getElementById("result-count").textContent).toContain(
      "Намерени селища: 1/2"
    );
    expect(document.getElementById("result-count").textContent).toContain(
      "Намерени кметства: 1/2"
    );
    expect(document.getElementById("result-count").textContent).toContain(
      "Намерени общини: 1/2"
    );
    expect(document.getElementById("result-count").textContent).toContain(
      "Намерени области: 1/1"
    );
  });

  it("should call fetch and return JSON with new structure", async () => {
    const mockResponse = {
      rows: [{ id: 1, settlement: "Sofia", mayorality: "M", municipality: "MU", region: "R" }],
      rowsCount: 1,
      settlementsCount: 1,
      filteredSettlementsCount: 1,
      mayoralitiesCount: 1,
      filteredMayoralitiesCount: 1,
      municipalitiesCount: 1,
      filteredMunicipalitiesCount: 1,
      regionsCount: 1,
      filteredRegionsCount: 1,
    };
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) }));

    const data = await fetchData("Sofia");
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/search?q=Sofia");
    expect(data).toEqual(mockResponse);
  });

  it("should debounce fetch and render table with updated JSON", async () => {
    vi.useFakeTimers();
    setupSearchInput(input);

    input.value = "Sofia";
    input.dispatchEvent(new Event("input"));

    expect(fetch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(fetch).not.toHaveBeenCalled();

    vi.advanceTimersByTime(200);
    await vi.runAllTimersAsync();

    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/search?q=Sofia");

    vi.useRealTimers();
  });
});
