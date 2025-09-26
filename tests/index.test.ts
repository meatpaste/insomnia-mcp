import { describe, expect, it, vi } from "vitest";

// Mock the dependencies to avoid server startup
vi.mock("../src/server.js", () => ({
  createServer: vi.fn(() => ({
    connect: vi.fn(),
    close: vi.fn(),
    setRequestHandler: vi.fn(),
    notification: vi.fn(),
  }))
}));

vi.mock("../src/tools.js", () => ({
  registerTools: vi.fn()
}));

vi.mock("../src/resources.js", () => ({
  registerResources: vi.fn()
}));

describe("index module", () => {
  it("exports functions without errors", async () => {
    // Just test that the module can be imported without throwing
    const indexModule = await import("../src/index.js");
    expect(typeof indexModule).toBe("object");
  });
});