import { beforeEach, describe, expect, it, vi } from "vitest";
import { classifyIntent, orchestrate } from "../../tools/orchestrate.js";
import { createPropertySearchTool } from "./property-search-tool.js";

vi.mock("../../tools/orchestrate.js", () => ({
  classifyIntent: vi.fn(),
  orchestrate: vi.fn(),
}));

describe("property_search tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("runs the housing orchestrator with the Gateway session id", async () => {
    vi.mocked(orchestrate).mockResolvedValue({
      response: "Found 1 matching property.",
    } as never);
    vi.mocked(classifyIntent).mockResolvedValue("search");

    const tool = createPropertySearchTool("gateway-session-1");
    expect(tool.catalogMode).toBeUndefined();
    const result = await tool.execute("call-1", {
      query: "A townhome in San Jose under $1.5M",
    });

    expect(orchestrate).toHaveBeenCalledWith(
      "A townhome in San Jose under $1.5M",
      "gateway-session-1",
      "search",
    );
    expect(result.content).toEqual([{ type: "text", text: "Found 1 matching property." }]);
    expect(result.details).toMatchObject({ status: "ok", intent: "property_search" });
  });

  it("requires a current Gateway session", async () => {
    const tool = createPropertySearchTool();

    await expect(tool.execute("call-1", { query: "Find a home in San Jose" })).rejects.toThrow(
      "current OpenClaw session",
    );
  });

  it("does not route knowledge questions through the housing workflow", async () => {
    vi.mocked(classifyIntent).mockResolvedValue("knowledge");

    const tool = createPropertySearchTool("gateway-session-1");

    await expect(tool.execute("call-1", { query: "What is escrow?" })).rejects.toThrow(
      "not general knowledge questions",
    );
    expect(orchestrate).not.toHaveBeenCalled();
  });
});
