import { describe, expect, it, vi } from "vitest";
import { getMarketSummary } from "./city_market_summary.js";
import { query } from "./mySQL_connector.js";

vi.mock("./mySQL_connector.js", () => ({ query: vi.fn() }));

describe("getMarketSummary", () => {
  it("queries and normalizes only the requested city", async () => {
    vi.mocked(query).mockResolvedValue([
      {
        city: "Irvine",
        sold_count: 42,
        average_price: "1250000",
        price_per_sqft: "710",
        days_on_market: "18.5",
        list_to_close_ratio: "99.2",
      },
    ]);

    await expect(getMarketSummary("Irvine")).resolves.toEqual({
      city: "Irvine",
      period: "Trailing 12 months",
      soldCount: 42,
      averagePrice: 1_250_000,
      pricePerSqft: 710,
      daysOnMarket: 18.5,
      listToCloseRatio: 99.2,
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("LOWER(City) = LOWER(?)"), [
      "Irvine",
    ]);
  });
});
