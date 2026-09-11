import { describe, expect, it } from "vitest";
import { formatPropertyResponse } from "./message_handler.js";

describe("formatPropertyResponse", () => {
  it("formats listing results consistently without channel-specific markup", () => {
    expect(
      formatPropertyResponse({
        results: [
          { address: "1 Main Street", price: 700000, beds: 3, baths: 2, sqft: 1600 },
          { address: "2 Oak Avenue", price: 650000, beds: 4, baths: 3, sqft: 1900 },
        ],
      }),
    ).toBe(
      "🏡 Matching properties (2):\n\n" +
        "1. 🏠 1 Main Street\n💰 $700,000 | 🛏 3bd/2ba | 📐 1600 sqft\n📅 0 days on market\n\n" +
        "2. 🏠 2 Oak Avenue\n💰 $650,000 | 🛏 4bd/3ba | 📐 1900 sqft\n📅 0 days on market",
    );
  });

  it("formats all ranked recommendations as a list", () => {
    expect(
      formatPropertyResponse({
        recommendations: [
          { address: "2 Oak Avenue", price: 650000, beds: 4, baths: 3, sqft: 1900 },
          { address: "1 Main Street", price: 700000, beds: 3, baths: 2, sqft: 1600 },
        ],
      }),
    ).toContain("⭐ Recommended properties (2):\n\n1. 🏠 2 Oak Avenue");
    expect(
      formatPropertyResponse({
        recommendations: [
          { address: "2 Oak Avenue", price: 650000, beds: 4, baths: 3, sqft: 1900 },
          { address: "1 Main Street", price: 700000, beds: 3, baths: 2, sqft: 1600 },
        ],
      }),
    ).toContain("2. 🏠 1 Main Street");
  });

  it("limits listing remarks to a 20-word blurb", () => {
    const remarks = Array.from({ length: 21 }, (_, index) => `word${index + 1}`).join(" ");
    const formatted = formatPropertyResponse({
      results: [
        { address: "1 Main Street", price: 700000, beds: 3, baths: 2, sqft: 1600, remarks },
      ],
    });

    expect(formatted).toContain(
      "📝 word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12 word13 word14 word15 word16 word17 word18 word19 word20…",
    );
    expect(formatted).not.toContain("word21");
  });

  it("removes zero-width copy/paste artifacts but preserves emoji joiners", () => {
    expect(
      formatPropertyResponse({
        results: [
          {
            address: "770\u2060 \u200BAdeline Avenue",
            price: 399999,
            beds: 3,
            baths: 2,
            sqft: 1600,
            remarks: "Bright 👨‍👩‍👧‍👦 home",
          },
        ],
      }),
    ).toContain(
      "1. 🏠 770 Adeline Avenue\n💰 $399,999 | 🛏 3bd/2ba | 📐 1600 sqft\n📅 0 days on market\n📝 Bright 👨‍👩‍👧‍👦 home",
    );
  });

  it("formats missing search fields consistently", () => {
    expect(
      formatPropertyResponse({
        action: "request_missing_info",
        missing: ["city", "sqft"],
      }),
    ).toContain("📍 City\n- 📐 Sq Ft");
  });
});
