import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMemorySessionStore } from "../../test/session-store.js";
import {
  clearSession,
  configureSessionMemory,
  getSession,
  updateSession,
} from "../tools/session_memory.js";

const searchMock = vi.hoisted(() => vi.fn());
vi.mock("../tools/active_listing_search", () => ({ searchActiveListings: searchMock }));

import { runListingAgent } from "./listing_agent.js";

const USER_ID = "listing-test";
configureSessionMemory(createMemorySessionStore());

describe("listing agent", () => {
  beforeEach(() => {
    clearSession(USER_ID);
    searchMock.mockReset();
  });

  it("forwards optional filters and returns formatted property text", async () => {
    updateSession(USER_ID, {
      city: "San Francisco",
      beds: 2,
      baths: 2,
      sqft: 1_000,
      type: "SingleFamilyResidence",
      pool: "True",
      hasView: "True",
    });
    searchMock.mockResolvedValue([
      {
        L_Address: "123 Main St",
        L_City: "San Francisco",
        price: 950_000,
        beds: 2,
        baths: 2,
        sqft: 1_100,
        DaysOnMarket: 8,
      },
    ]);

    const result = await runListingAgent(USER_ID);

    expect(searchMock).toHaveBeenCalledWith({
      city: "San Francisco",
      maxPrice: undefined,
      beds: 2,
      baths: 2,
      sqft: 1_000,
      type: "SingleFamilyResidence",
      pool: "True",
      hasView: "True",
    });
    expect(result.response).toContain("🏠 *123 Main St, San Francisco*");
    expect(result.response).toContain("💰 $950,000");
    expect(result.response).toContain("🛏️ 2 bd · 2 ba · 1,100 sqft");
    expect(result.response).toContain("📅 8 days on market");
    expect(getSession(USER_ID).lastResults).toEqual([
      {
        L_Address: "123 Main St",
        L_City: "San Francisco",
        price: 950_000,
        beds: 2,
        baths: 2,
        sqft: 1_100,
        DaysOnMarket: 8,
      },
    ]);
  });
});
