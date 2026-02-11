import { describe, it, expect, vi, beforeEach } from "vitest";
import * as scraper from "../../../src/services/apiFetchService.js";

vi.stubGlobal("fetch", vi.fn());

vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(),
  mkdir: vi.fn().mockResolvedValue(),
}));

vi.mock("../../../src/db.js", () => ({
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn()
    })
  }
}));

vi.mock("../../../src/models/authorModel.js", () => ({
  authorModel: {
    ensureCountry: vi.fn().mockResolvedValue(1),
    ensureAuthor: vi.fn().mockResolvedValue(),
  }
}));

vi.mock("../../../src/models/textModel.js", () => ({
  textModel: {
    ensureText: vi.fn().mockResolvedValue(),
  }
}));

describe("ApiFetchService test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchTexts", () => {
    it("should parse texts correctly from XML", async () => {
      const fakeXml = `
        <results><texts><text>
          <id>123</id><title>Test Title</title>
          <author><id>10</id></author>
        </text></texts></results>`;
      
      fetch.mockResolvedValueOnce({ ok: true, text: async () => fakeXml });
      
      const results = await scraper.fetchTexts("query");
      
      expect(results).toHaveLength(1);

      expect(results[0]).toMatchObject({
        textId: "123",
        textTitle: "Test Title",
        authorId: "10"
      });
    });
  });

  describe("fetchAuthorByIdCached", () => {
    it("should correctly parse author data", async () => {
      const authorXml = `
        <results><persons><person>
          <id>50</id><name>Pseudonym</name><real-name>Real Name</real-name><country>BG</country>
        </person></persons></results>`;
      
      fetch.mockResolvedValueOnce({ ok: true, text: async () => authorXml });
      
      const cache = new Map();
      const mockSem = { acquire: vi.fn(), release: vi.fn() };
      const res = await scraper.fetchAuthorByIdCached({}, "50", cache, mockSem);
      
      expect(res).toMatchObject({
        authorId: "50",
        authorName: "Pseudonym",
        authorCountry: "BG"
      });
      expect(cache.has("50")).toBe(true);
    });
    
    it("should return null if the author XML is empty or missing person tag", async () => {
      const emptyXml = `<results><persons></persons></results>`;
      fetch.mockResolvedValueOnce({ ok: true, text: async () => emptyXml });

      const res = await scraper.fetchAuthorByIdCached({}, "999", new Map(), { acquire: vi.fn(), release: vi.fn() });
      
      expect(res).toBeNull();
    });

    it("should use cache and not call fetch if author is already cached", async () => {
      const cache = new Map([["50", { authorName: "Cached Author" }]]);
      
      const res = await scraper.fetchAuthorByIdCached({}, "50", cache, {});
      
      expect(res.authorName).toBe("Cached Author");
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe("processText", () => {
    it("should skip download if textId is already in seenIds", async () => {
      const seenIds = new Set(["100"]); 
      const t = { textId: "100", textTitle: "Title", authorId: "10" }; 
      
      vi.spyOn(scraper, "fetchAuthorByIdCached").mockResolvedValue({ authorCountry: "BG" });

      const result = await scraper.processText({}, 0, 10, t, seenIds, new Set(), new Map(), { acquire: vi.fn(), release: vi.fn() });
      
      expect(result).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("should request the correct zip URL based on textId", async () => {
      const t = { textId: "999", textTitle: "Test", authorId: "1"};
      const seenIds = new Set();
      const existingFiles = new Set();
      
      vi.spyOn(scraper, "fetchAuthorByIdCached").mockResolvedValue({ authorCountry: "BG" });
      
      fetch.mockResolvedValue({ 
        ok: true, 
        text: async () => "<xml></xml>", 
        arrayBuffer: async () => new ArrayBuffer(0) 
      });

      const mockSem = { acquire: vi.fn(), release: vi.fn() };

      await scraper.processText(
        {},
        0, 
        1, 
        t, 
        seenIds, 
        existingFiles, 
        new Map(), 
        mockSem
      );

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("chitanka.info/text/999.txt.zip"), 
        expect.anything()
      );
    });

    it("should return false if zip download fails (404 or network error)", async () => {
      vi.spyOn(scraper, "fetchAuthorByIdCached").mockResolvedValue({ authorCountry: "BG" });
      fetch.mockResolvedValueOnce({ ok: false, status: 404 }); // За ZIP-а

      const t = { textId: "1", textTitle: "Title", authorId: "10" };
      const res = await scraper.processText({}, 0, 1, t, new Set(), new Set(), new Map(), { acquire: vi.fn(), release: vi.fn() });

      expect(res).toBe(false);
    });

    it("should return false if ZIP is valid but contains no .txt files", async () => {
      vi.spyOn(scraper, "fetchAuthorByIdCached").mockResolvedValue({ authorCountry: "BG" });
      
      vi.spyOn(scraper, "downloadTextZip").mockResolvedValue(Buffer.from("fake-zip"));
      vi.spyOn(scraper, "extractTxtFromZip").mockResolvedValue(null);

      const t = { textId: "1", textTitle: "NoText", authorId: "10" };
      const res = await scraper.processText({}, 0, 1, t, new Set(), new Set(), new Map(), { acquire: vi.fn(), release: vi.fn() });

      expect(res).toBe(false);
    });
  });

  describe("browserFetch & Retry Logic", () => {
    it("should retry when receiving a 429 Rate Limit error", async () => {
      vi.useFakeTimers();
      
      fetch
        .mockResolvedValueOnce({ status: 429, ok: false })
        .mockResolvedValueOnce({ status: 200, ok: true, text: async () => "success" });

      const fetchPromise = scraper.browserFetch("https://test.com");

      await vi.runAllTimersAsync();
      
      const res = await fetchPromise;
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(res.status).toBe(200);
      
      vi.useRealTimers();
    });
  });

  describe("generateTriplets", () => {
    it("should generate the correct start of the sequence", () => {
      const gen = scraper.generateTriplets();
      expect(gen.next().value).toBe("ааа");
      expect(gen.next().value).toBe("ааб");
      expect(gen.next().value).toBe("аав");
    });
  });
});