import { describe, expect, it } from "vitest";
import { recommendationAgent } from "./recommendation_agent.js";

describe("recommendationAgent", () => {
  it("returns all candidates in ranked order", () => {
    const result = recommendationAgent(
      [
        { id: "2", address: "2 Oak Avenue", price: 650000, beds: 4, baths: 3, sqft: 1900 },
        { id: "1", address: "1 Main Street", price: 700000, beds: 3, baths: 2, sqft: 1600 },
      ],
      { city: "Irvine" },
    );

    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations?.map((listing) => listing.address)).toEqual([
      "2 Oak Avenue",
      "1 Main Street",
    ]);
  });
});
