import { describe, it, expect, vi, beforeEach } from "vitest";
import { JSDOM } from "jsdom";

// fix currently not running
// i want to test debounce + calling fetch + initial fetch
// error on exception
// cannot import because i dont know how to use modules in the front end

describe("index page", () => {
  let dom;
  let input;

  beforeEach(() => {
    dom = new JSDOM(`
      <input id="search-data"/>
      <div id="result-count"></div>
      <table class="result-table"><tbody></tbody></table>
    `, { url: "http://localhost" });

    global.window = dom.window;
    global.document = dom.window.document;
    global.fetch = vi.fn();

    input = dom.window.document.getElementById("search-data");
  });

  it("loads data on DOMContentLoaded", async () => {
    const fakeData = { rows: [{ id: "1", settlement: "Test", municipality: "Muni", region: "Region" }] };
    fetch.mockResolvedValue({ ok: true, json: async () => fakeData });

    dom.window.document.dispatchEvent(new dom.window.Event("DOMContentLoaded"));

    await new Promise(r => setTimeout(r, 600));

    const tbody = dom.window.document.querySelector(".result-table tbody");
    expect(tbody.children.length).toBe(1);
    expect(dom.window.document.getElementById("result-count").textContent)
      .toContain("Намерени резултати: 1");
  });

  it("fetches on input after debounce", async () => {
    const fakeData = { rows: [{ id: "2", settlement: "Test2", municipality: "Muni2", region: "Region2" }] };
    fetch.mockResolvedValue({ ok: true, json: async () => fakeData });

    input.value = "test2";
    input.dispatchEvent(new dom.window.Event("input"));

    await new Promise(r => setTimeout(r, 600));

    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/api/search?q=test2");
    const tbody = dom.window.document.querySelector(".result-table tbody");
    expect(tbody.children.length).toBe(1);
    expect(dom.window.document.getElementById("result-count").textContent)
      .toContain("Намерени резултати: 1");
  });
});
