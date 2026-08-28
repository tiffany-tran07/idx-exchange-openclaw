import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemorySessionStore } from "../../test/session-store.js";
import { configureSessionMemory, getSession, updateSession } from "./session_memory.js";

const agentMocks = vi.hoisted(() => ({
  listing: vi.fn(),
  market: vi.fn(),
  rag: vi.fn(),
  requirements: vi.fn(),
}));

vi.mock("../agents/listing_agent", () => ({ runListingAgent: agentMocks.listing }));
vi.mock("../agents/market_stats_agent", () => ({ runMarketStatsAgent: agentMocks.market }));
vi.mock("../agents/rag_agent", () => ({ runRagAgent: agentMocks.rag }));
vi.mock("../agents/requirements_agent", () => ({
  runRequirementsAgent: agentMocks.requirements,
}));

import { orchestrate } from "./orchestrate.js";

configureSessionMemory(createMemorySessionStore());

describe("property search orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    agentMocks.requirements.mockResolvedValue({ isComplete: true, missingFields: [] });
  });

  it("combines listing and market text for mixed requests", async () => {
    const results = [{ L_Address: "123 Main St" }];
    agentMocks.listing.mockResolvedValue({ response: "LISTING SUMMARY", results });
    agentMocks.market.mockResolvedValue({ response: "MARKET SUMMARY" });

    await expect(
      orchestrate(
        "Show me 2 bedroom listings in San Francisco and the market trends",
        "mixed-test",
      ),
    ).resolves.toEqual({
      response: "LISTING SUMMARY\n\nMARKET SUMMARY",
      results,
    });
  });

  it("returns a text follow-up before running an incomplete search", async () => {
    agentMocks.requirements.mockResolvedValue({
      isComplete: false,
      missingFields: ["maxPrice"],
    });

    await expect(
      orchestrate("2 bedroom houses in San Francisco", "incomplete-test"),
    ).resolves.toEqual({
      response: "Before I search, I still need your maximum price. What would you prefer?",
      action: "request_missing_info",
      missing: ["maxPrice"],
    });
    expect(agentMocks.listing).not.toHaveBeenCalled();
  });

  it("clears saved criteria when the user explicitly resets the search", async () => {
    updateSession("reset-test", { city: "San Francisco", beds: 2 });

    await expect(orchestrate("reset my property search", "reset-test")).resolves.toEqual({
      response:
        "Your saved property-search criteria have been cleared. What would you like to find?",
    });
    expect(getSession("reset-test")).toEqual({});
  });

  it("does not spend a RAG call on an unrelated message", async () => {
    await expect(orchestrate("hello there", "unknown-test")).resolves.toEqual({
      response:
        "I can help search for properties, explain real-estate terms, or answer California market questions. What would you like to do?",
    });
    expect(agentMocks.rag).not.toHaveBeenCalled();
  });

  it("routes an explicit terminology question to RAG", async () => {
    agentMocks.rag.mockResolvedValue({ response: "DOM means Days on Market." });

    await expect(orchestrate("What does DOM mean?", "knowledge-test")).resolves.toEqual({
      response: "DOM means Days on Market.",
    });
    expect(agentMocks.rag).toHaveBeenCalledOnce();
  });
});
