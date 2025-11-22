// DO NOT DELETE https://vitest.dev/guide/environment
// @vitest-environment jsdom

import { describe, it, beforeEach, expect, vi } from "vitest";
import {
  fetchData,
  renderTable,
  setupSearchInput,
} from "../../../public/scripts/index.js";

global.fetch = vi.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ rows: [] }) })
);

describe("index.js", () => {
  let container, input;

  beforeEach(() => {
    document.body.innerHTML = `
      <input id="search-data" />
      <table class="result-table"><tbody></tbody></table>
      <div id="result-count"></div>
    `;
    container = document.querySelector(".result-table tbody");
    input = document.getElementById("search-data");

    fetch.mockClear();
  });

  it("should correctly populates table", () => {
    renderTable([{ id: 1, settlement: "Sofia" }]);
    expect(container.innerHTML).toContain("Sofia");
    expect(document.getElementById("result-count").textContent).toBe(
      "Намерени резултати: 1"
    );
  });

  it("should call fetch and returns JSON", async () => {
    const mockResponse = { rows: [{ id: 1, settlement: "Sofia" }] };
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) })
    );

    const data = await fetchData("Sofia");
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:3000/api/search?q=Sofia"
    );
    expect(data).toEqual(mockResponse);
  });

  it("should debounce fetch and render table", async () => {
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
