import { describe, expect, it } from "vitest";
import { parsePropertyQuery } from "./property_parser.js";

describe("parsePropertyQuery", () => {
  it("parses a complete townhome search without an LLM", async () => {
    await expect(
      parsePropertyQuery(
        "A townhome in San Jose with 2 bedrooms, 1 bathroom, under $1.5M, and 1000 sqft",
      ),
    ).resolves.toMatchObject({
      city: "San Jose",
      maxPrice: 1_500_000,
      beds: 2,
      baths: 1,
      sqft: 1000,
      type: "Townhouse",
    });
  });
});
