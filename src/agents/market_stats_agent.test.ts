import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMarketSummary } from "../tools/city_market_summary.js";
import { getSession, updateSession } from "../tools/session_memory.js";
import { runMarketStatsAgent } from "./market_stats_agent.js";

vi.mock("../tools/city_market_summary.js", () => ({ getMarketSummary: vi.fn() }));
vi.mock("../tools/session_memory.js", () => ({
  getSession: vi.fn(),
  updateSession: vi.fn(),
}));

describe("runMarketStatsAgent", () => {
  let sessionCity = "San Francisco";

  beforeEach(() => {
    vi.clearAllMocks();
    sessionCity = "San Francisco";
    vi.mocked(getSession).mockImplementation(() => ({
      criteria: { city: sessionCity },
      listingPreviews: [],
      updatedAt: new Date(0).toISOString(),
    }));
    vi.mocked(updateSession).mockImplementation((_sessionId, patch) => {
      sessionCity = patch.criteria?.city ?? sessionCity;
      return {
        criteria: { city: sessionCity },
        listingPreviews: [],
        updatedAt: new Date(0).toISOString(),
      };
    });
    vi.mocked(getMarketSummary).mockResolvedValue({
      city: "Oakland",
      period: "Trailing 12 months",
      soldCount: 10,
      averagePrice: 900_000,
      pricePerSqft: 700,
      daysOnMarket: 20,
      listToCloseRatio: 100,
    });
  });

  it("uses an explicit market-query city over the existing session city", async () => {
    await expect(
      runMarketStatsAgent("Give me market stats for Oakland", "session-1"),
    ).resolves.toMatchObject({
      summary: { city: "Oakland" },
    });

    expect(updateSession).toHaveBeenCalledWith("session-1", { criteria: { city: "Oakland" } });
    expect(getMarketSummary).toHaveBeenCalledWith("Oakland");
  });
});
