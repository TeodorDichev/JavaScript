import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAuthor } from "../../../src/controllers/authorController.js";
import { pool } from "../../../src/db.js";
import { authorModel } from "../../../src/models/authorModel.js";

vi.mock("../../../src/db.js", () => ({
  pool: {
    connect: vi.fn()
  }
}));

vi.mock("../../../src/models/authorModel.js", () => ({
  authorModel: {
    getById: vi.fn()
  }
}));

describe("Author Controller - getAuthor", () => {
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

  it("should return 200 and the author data if found", async () => {
    const mockAuthor = { id: 1, name: "Ivan Vazov" };
    authorModel.getById.mockResolvedValue(mockAuthor);

    await getAuthor({}, mockRes, 1);

    expect(authorModel.getById).toHaveBeenCalledWith(mockClient, 1);
    expect(mockRes.writeHead).toHaveBeenCalledWith(200, { "Content-Type": "application/json" });
    expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify(mockAuthor));
    expect(mockClient.release).toHaveBeenCalled();
  });

  it("should return 404 if the author is not found", async () => {
    authorModel.getById.mockResolvedValue(null);

    await getAuthor({}, mockRes, 999);

    expect(mockRes.writeHead).toHaveBeenCalledWith(404, { "Content-Type": "application/json" });
    expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify({ error: "Author not found" }));
    expect(mockClient.release).toHaveBeenCalled();
  });

  it("should return 500 if the database query throws an error", async () => {
    const dbError = new Error("Connection lost");
    authorModel.getById.mockRejectedValue(dbError);

    await getAuthor({}, mockRes, 1);

    expect(mockRes.writeHead).toHaveBeenCalledWith(500, { "Content-Type": "application/json" });
    expect(mockRes.end).toHaveBeenCalledWith(JSON.stringify({ error: "Internal Server Error" }));
    expect(mockClient.release).toHaveBeenCalled();
  });

  it("should ensure the client is released even if an error occurs", async () => {
    authorModel.getById.mockRejectedValue(new Error("Fail"));

    await getAuthor({}, mockRes, 1);

    expect(mockClient.release).toHaveBeenCalled();
  });
});