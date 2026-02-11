import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fileProcessor from "../../../src/services/processService.js";
import fs from "fs";
import { pool } from "../../../src/db.js";
import { textModel } from "../../../src/models/textModel.js";
import { authorModel } from "../../../src/models/authorModel.js";

vi.mock("fs");
vi.mock("../../../src/db.js", () => ({
  pool: {
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    }),
  },
}));

vi.mock("../../../src/models/textModel.js", () => ({
  textModel: {
    getTextsByAuthorId: vi.fn(),
    updateTextStats: vi.fn(),
  },
}));

vi.mock("../../../src/models/authorModel.js", () => ({
  authorModel: {
    getAuthorsForProcessing: vi.fn(),
    updateAuthorStats: vi.fn(),
  },
}));

describe("File Processor Service", () => {
  const mockClient = { query: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
  });

  it("analyzeText returns total and unique counts", () => {
    const text = "Тест тест нов тест.";
    const result = fileProcessor.analyzeText(text);

    expect(result.total).toBe(4);
    expect(result.uniqueSet.size).toBe(2);
  });

  it("avgWordsPerSentence calculates average", () => {
    const text = "Едно две. Три четири пет.";
    const avg = fileProcessor.avgWordsPerSentence(text);
    expect(avg).toBe(2.5);
  });

  describe("processAuthor Integration", () => {
    it("updates stats for an author with correct structure", async () => {
      const mockAuthor = {
        author_id: 1,
        author_name: "Иван Вазов",
        country_name: "BG",
      };

      textModel.getTextsByAuthorId.mockResolvedValue([
        { text_id: 101, title: "Т", unique_words_count: null },
      ]);

      fs.readFileSync.mockReturnValue(
        "Език свещен на моите деди. Език на мъки!"
      );

      await fileProcessor.processAuthor(mockClient, mockAuthor);

      expect(authorModel.updateAuthorStats).toHaveBeenCalledWith(
        mockClient,
        1,
        expect.objectContaining({
          uniqueWords: expect.any(Number),
          maxSentence: expect.any(Number),
        })
      );
    });

    it("handles missing text files without crashing", async () => {
      textModel.getTextsByAuthorId.mockResolvedValue([
        { text_id: 5, title: "Липсващ" },
      ]);
      vi.spyOn(fs, "existsSync").mockReturnValue(false);

      await expect(
        fileProcessor.processAuthor(mockClient, { author_id: 99 })
      ).resolves.not.toThrow();
      expect(authorModel.updateAuthorStats).not.toHaveBeenCalled();
    });
  });

  describe("processUnknownTexts", () => {
    it("should parse textId and update stats for files in Unknown directory", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue(["456_Untitled_Story.txt"]);
      vi.spyOn(fs, "readFileSync").mockReturnValue("Една дума. Две думи.");

      await fileProcessor.processUnknownTexts(mockClient);

      expect(textModel.updateTextStats).toHaveBeenCalledWith(
        mockClient,
        456,
        expect.any(Number)
      );
    });

    it("should skip files that do not match the ID_Title.txt pattern", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);
      vi.spyOn(fs, "readdirSync").mockReturnValue([
        "invalid_file.txt",
        "readme.md",
      ]);

      await fileProcessor.processUnknownTexts(mockClient);

      expect(textModel.updateTextStats).not.toHaveBeenCalled();
    });

    it("should return early if Unknown directory does not exist", async () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(false);

      await fileProcessor.processUnknownTexts(mockClient);

      expect(fs.readdirSync).not.toHaveBeenCalled();
    });
  });

  describe("runFileProcessor", () => {
    it("should ensure client is released even if a critical error occurs", async () => {
      const mockClientInternal = { release: vi.fn() };
      pool.connect.mockResolvedValue(mockClientInternal);
      authorModel.getAuthorsForProcessing.mockRejectedValue(
        new Error("DB Crash")
      );

      await expect(fileProcessor.runFileProcessor()).rejects.toThrow(
        "DB Crash"
      );
      expect(mockClientInternal.release).toHaveBeenCalled();
    });
  });
});
