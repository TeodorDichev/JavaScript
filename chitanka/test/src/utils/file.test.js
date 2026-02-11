import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fileUtils from "../../../src/utils/file.js";
import fs from "fs";

vi.mock("fs");

describe("file.js utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("safeName", () => {
    it("should replace invalid characters and spaces", () => {
      expect(fileUtils.safeName('My:Title*With?/Chars')).toBe("My_Title_With_Chars");
    });

    it("should replace spaces with underscores and trims", () => {
      expect(fileUtils.safeName("   Hello World   ")).toBe("Hello_World");
    });

    it("should handle empty input", () => {
      expect(fileUtils.safeName()).toBe("");
    });
  });

  describe("log", () => {
    it("should append message to file with newline", () => {
      fileUtils.log("mylog.txt", "Test message");
      expect(fs.appendFileSync).toHaveBeenCalledWith("mylog.txt", "Test message\n");
    });
  });

  describe("scanExistingFiles", () => {
    it("should create dir if it does not exist", () => {

      vi.spyOn(fs, "existsSync").mockReturnValue(false);
      vi.spyOn(fs, "readdirSync").mockReturnValue([]);

      const result = fileUtils.scanExistingFiles("testDir");

      expect(fs.mkdirSync).toHaveBeenCalledWith("testDir", { recursive: true });
      expect(result).toEqual(new Set());
    });

    it("should scan nested directories and return files", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);

      vi.spyOn(fs, "readdirSync").mockImplementation((dir) => {
        if (dir === "testDir") return ["BG", "US"];
        if (dir.includes("BG")) return ["file1.txt"];
        if (dir.includes("US")) return ["file2.txt"];
        return [];
      });

      vi.spyOn(fs, "statSync").mockImplementation((p) => ({
        isDirectory: () => !p.endsWith(".txt"),
      }));

      const files = fileUtils.scanExistingFiles("testDir");
      
      expect(files.has("file1.txt")).toBe(true);
      expect(files.has("file2.txt")).toBe(true);
      expect(files.size).toBe(2);
    });

    it("should skip files in the base directory and only look into subdirs", () => {
      vi.spyOn(fs, "existsSync").mockReturnValue(true);

      vi.spyOn(fs, "readdirSync").mockImplementation((dir) => {
        if (dir === "testDir") return ["file1.txt", "BG"];
        if (dir.includes("BG")) return ["inside.txt"];
        return [];
      });

      vi.spyOn(fs, "statSync").mockImplementation((p) => ({
        isDirectory: () => p.endsWith("BG"),
      }));

      const files = fileUtils.scanExistingFiles("testDir");

      expect(files.has("inside.txt")).toBe(true);
      expect(files.has("file1.txt")).toBe(false);
    });
  });
});