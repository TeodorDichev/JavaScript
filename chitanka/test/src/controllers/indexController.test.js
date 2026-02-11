import { describe, it, expect, vi, beforeEach } from "vitest";
import { getIndexStats } from "../../../src/controllers/indexController.js";
import { pool } from "../../../src/db.js";
import { authorModel } from "../../../src/models/authorModel.js";
import { textModel } from "../../../src/models/textModel.js";

vi.mock("../../../src/db.js", () => ({
  pool: {
    connect: vi.fn()
  }
}));

vi.mock("../../../src/models/authorModel.js", () => ({
  authorModel: {
    getTotalCount: vi.fn(),
    getProcessedCount: vi.fn(),
    getTopByUniqueWords: vi.fn()
  }
}));

vi.mock("../../../src/models/textModel.js", () => ({
  textModel: {
    getCount: vi.fn(),
    getUniqueWordsSum: vi.fn(),
    getTexts: vi.fn()
  }
}));

describe("Index Controller Tests", () => {
  let mockRes;
  let mockClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockClient = {
      release: vi.fn()
    };

    mockRes = {
      writeHead: vi.fn().mockReturnThis(),
      end: vi.fn()
    };

    pool.connect.mockResolvedValue(mockClient);
  });

  it("should return 200 and formatted stats data when all queries succeed", async () => {
    textModel.getCount.mockResolvedValue("100");
    textModel.getUniqueWordsSum.mockResolvedValue("5000");
    authorModel.getTotalCount.mockResolvedValue("20");
    authorModel.getProcessedCount.mockResolvedValue("15");
    textModel.getTexts.mockResolvedValue([{ id: 1, title: "Book" }]);
    authorModel.getTopByUniqueWords.mockResolvedValue([{ id: 1, name: "Author" }]);

    await getIndexStats({}, mockRes);

    expect(mockRes.writeHead).toHaveBeenCalledWith(200, { "Content-Type": "application/json" });
    
    const responseBody = JSON.parse(mockRes.end.mock.calls[0][0]);
    expect(responseBody).toEqual({
      totalTexts: 100,
      totalUniqueWords: 5000,
      totalAuthors: 20,
      processedAuthorsCount: 15,
      texts: [{ id: 1, title: "Book" }],
      authors: [{ id: 1, name: "Author" }]
    });
    
    expect(mockClient.release).toHaveBeenCalled();
  });

  it("should handle null word sum and return 0 for totalUniqueWords", async () => {
    textModel.getCount.mockResolvedValue(0);
    textModel.getUniqueWordsSum.mockResolvedValue(null);
    authorModel.getTotalCount.mockResolvedValue(0);
    authorModel.getProcessedCount.mockResolvedValue(0);
    textModel.getTexts.mockResolvedValue([]);
    authorModel.getTopByUniqueWords.mockResolvedValue([]);

    await getIndexStats({}, mockRes);

    const responseBody = JSON.parse(mockRes.end.mock.calls[0][0]);
    expect(responseBody.totalUniqueWords).toBe(0);
  });

  it("should return 500 if any Promise.all request fails", async () => {
    textModel.getCount.mockRejectedValue(new Error("Database error"));

    await getIndexStats({}, mockRes);

    expect(mockRes.writeHead).toHaveBeenCalledWith(500, { "Content-Type": "application/json" });
    expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify({ error: "Internal Server Error" }));
    expect(mockClient.release).toHaveBeenCalled();
  });

  it("should ensure the client is released even on failure", async () => {
    authorModel.getTotalCount.mockRejectedValue(new Error("Failure"));

    await getIndexStats({}, mockRes);

    expect(mockClient.release).toHaveBeenCalled();
  });
});