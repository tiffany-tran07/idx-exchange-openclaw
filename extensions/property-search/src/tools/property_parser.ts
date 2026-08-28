import { query as queryDatabase } from "./mySQL_connector.js";

let cachedCities: string[] | null = null;

async function getKnownCities(): Promise<string[]> {
  if (cachedCities) {
    return cachedCities;
  }
  try {
    const rows = await queryDatabase<{ L_City: string }>(
      "SELECT DISTINCT L_City FROM rets_property WHERE L_City IS NOT NULL",
    );
    cachedCities = rows.map((row) => row.L_City).filter(Boolean);
    return cachedCities;
  } catch {
    return [];
  }
}

export async function parsePropertyQuery(query: string) {
  const lowerQuery = query.toLowerCase();

  // 1. City extraction (check known database cities or fallback to "in <City>")
  let foundCity: string | null = null;
  const knownCities = await getKnownCities();
  // Sort by length descending to match multi-word cities first (e.g. "Agoura Hills" before "Hills")
  const sortedCities = knownCities.toSorted((a, b) => b.length - a.length);

  for (const city of sortedCities) {
    // Match word boundary for city
    const regex = new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(query)) {
      foundCity = city;
      break;
    }
  }

  if (!foundCity) {
    const cityMatch = query.match(
      /(?:in|at|near|around)\s+([A-Za-z\s]+?)(?:\s+under|\s+max|\s+maximum|\s+with|\s+at|\s+that|\s+which|\s+for|\s+and|,|\?|\.|$)/i,
    );
    if (cityMatch?.[1]) {
      foundCity = cityMatch[1].trim();
    }
  }

  // 2. Price extraction (supports under, max, maximum, budget, $, etc.)
  let maxPrice: number | null = null;
  const priceRegexes = [
    /(?:under|max|maximum|budget|below|up to|less than)\s*\$?([\d,.]+)\s*(k|m|million)?/i,
    /\$?([\d,.]+)\s*(k|m|million)?\s*(?:max|maximum)/i,
    /(?:price)\s*(?:[:=])\s*\$?([\d,.]+)\s*(k|m|million)?/i,
  ];

  for (const rx of priceRegexes) {
    const match = query.match(rx);
    if (match?.[1]) {
      let val = Number(match[1].replace(/,/g, ""));
      const unit = match[2]?.toLowerCase();
      if (unit === "k") {
        val *= 1000;
      }
      if (unit === "m" || unit === "million") {
        val *= 1_000_000;
      }
      if (Number.isFinite(val)) {
        maxPrice = val;
        break;
      }
    }
  }

  // Fallback standalone price with $ or k if no prefix matched
  if (maxPrice === null) {
    const standalonePrice = query.match(/\$?([\d,]+)\s*(k)\b/i);
    if (standalonePrice?.[1]) {
      let val = Number(standalonePrice[1].replace(/,/g, ""));
      val *= 1000;
      if (Number.isFinite(val)) {
        maxPrice = val;
      }
    }
  }

  // 3. Beds, baths, sqft
  const bedsMatch = query.match(/(\d+(?:\.5)?)[\s-]*(?:bed|beds|bedroom|bedrooms|bd)\b/i);
  const bathsMatch = query.match(/(\d+(?:\.5)?)[\s-]*(?:bath|baths|bathroom|bathrooms|ba)\b/i);
  const sqftMatch = query.match(/(\d+)[\s,]*(?:sqft|sq ft|square feet|sq\. ft\.)\b/i);

  const poolMatch = /pool/i.test(query);
  const viewMatch = /view/i.test(query);

  const typeMap: Record<string, string> = {
    condo: "Condominium",
    townhome: "Townhouse",
    townhouse: "Townhouse",
    "single family": "SingleFamilyResidence",
    house: "SingleFamilyResidence",
    houses: "SingleFamilyResidence",
    land: "UnimprovedLand",
    apartment: "Apartment",
    apartments: "Apartment",
  };

  let typeKey = null;
  for (const key of Object.keys(typeMap)) {
    const regex = new RegExp(`\\b${key}\\b`, "i");
    if (regex.test(lowerQuery)) {
      typeKey = key;
      break;
    }
  }

  return {
    city: foundCity,
    maxPrice,
    beds: bedsMatch ? Math.ceil(Number(bedsMatch[1])) : null,
    baths: bathsMatch ? Math.ceil(Number(bathsMatch[1])) : null,
    sqft: sqftMatch ? Number(sqftMatch[1]) : null,
    type: typeKey ? typeMap[typeKey] : null,
    pool: poolMatch ? "True" : null,
    hasView: viewMatch ? "True" : null,
  };
}
