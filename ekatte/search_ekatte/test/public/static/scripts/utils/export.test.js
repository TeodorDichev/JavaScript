import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleExport } from "../../../../../public/static/scripts/utils/export.js";

describe("handleExport utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    document.body.innerHTML = `
        <div id="export-stats" style="display: none;">
            <span id="stat-time"></span>
            <span id="stat-mem"></span>
            <span id="stat-cpu"></span>
        </div>
    `;

    global.URL.createObjectURL = vi.fn(() => "mock-url");
    global.URL.revokeObjectURL = vi.fn();
    global.atob = vi.fn((str) => Buffer.from(str, 'base64').toString('binary'));
    
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  it("should throw error when api response data is missing", async () => {
    const mockRes = { ok: false };
    await expect(handleExport(mockRes)).rejects.toThrow("Липсват на данните от сървъра");
  });

  it("should update stats panel when performance data is present", async () => {
    const mockRes = {
      data: {
        payload: {
          blob: "SGVsbG8=", // "Hello"
          performance: { time: "100ms", memory: "5MB", cpu: "10ms" }
        },
        filename: "test.csv"
      }
    };

    await handleExport(mockRes);

    const statsPanel = document.getElementById("export-stats");
    expect(statsPanel.style.display).toBe("block");
    expect(document.getElementById("stat-time").textContent).toBe("100ms");
    expect(document.getElementById("stat-mem").textContent).toBe("5MB");
    expect(document.getElementById("stat-cpu").textContent).toBe("10ms");
  });

  it("should create a download link and trigger click", async () => {
    const mockRes = {
      data: {
        payload: { blob: "SGVsbG8=", performance: null },
        filename: "data.xlsx"
      }
    };

    const spyAppend = vi.spyOn(document.body, "appendChild");

    await handleExport(mockRes);

    expect(spyAppend).toHaveBeenCalled();
    const anchor = spyAppend.mock.calls[0][0];
    expect(anchor.download).toBe("data.xlsx");
    expect(anchor.href).toContain("mock-url");
  });

  it("should fail when atob encounters invalid base64", async () => {
    global.atob = vi.fn(() => { throw new Error("Invalid character"); });

    const mockRes = {
      data: {
        payload: { blob: "!!!", performance: null },
        filename: "test.csv"
      }
    };

    await expect(handleExport(mockRes)).rejects.toThrow();
  });
});