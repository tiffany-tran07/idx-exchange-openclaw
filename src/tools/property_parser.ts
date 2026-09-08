import type { PropertyCriteria } from "./session_memory.js";

export async function parsePropertyQuery(
  query: string,
): Promise<PropertyCriteria & { hasView?: boolean }> {
  const cityMatch = query.match(
    /in ([A-Za-z\s]+?)(?:\s+under|\s+with|\s+at|\s+that|\s+which|\s+for|\s+and|,|\?|\.|$)/i,
  );
  const priceMatch = query.match(/under \$?([\d,.]+)(k|m)?/i);
  const bedsMatch = query.match(/(\d+(?:\.5)?)[\s-]*(bed|beds|bedroom|bedrooms)/i);
  const bathsMatch = query.match(/(\d+(?:\.5)?)[\s-]*(bath|baths|bathroom)/i);
  const sqftMatch = query.match(/([\d,]+)\s*(sqft|sq ft|square feet)/i);
  const poolMatch = /pool/i.test(query);
  const viewMatch = /view/i.test(query);
  const typeMap: Record<string, string> = {
    condo: "Condominium",
    townhome: "Townhouse",
    townhouse: "Townhouse",
    "single family": "SingleFamilyResidence",
    land: "UnimprovedLand",
  };
  const typeKey = Object.keys(typeMap).find((k) => query.toLowerCase().includes(k));
  let maxPrice: number | undefined;
  if (priceMatch) {
    maxPrice = Number(priceMatch[1]!.replace(/,/g, ""));
    if (priceMatch[2]?.toLowerCase() === "k") {
      maxPrice *= 1000;
    }
    if (priceMatch[2]?.toLowerCase() === "m") {
      maxPrice *= 1_000_000;
    }
  }
  return {
    city: cityMatch?.[1]?.trim() || undefined,
    maxPrice,
    beds: bedsMatch ? Math.ceil(Number(bedsMatch[1])) : undefined,
    baths: bathsMatch ? Math.ceil(Number(bathsMatch[1])) : undefined,
    sqft: sqftMatch ? Number(sqftMatch[1]!.replaceAll(",", "")) : undefined,
    type: typeKey ? typeMap[typeKey] : undefined,
    pool: poolMatch || undefined,
    hasView: viewMatch || undefined,
  };
}

// if (process.argv[1] === new URL(import.meta.url).pathname) {
//   const result = process.argv[2];
//   try {
//     const property_features = await parsePropertyQuery(result);
//     console.log(JSON.stringify(property_features));
//   } catch (err) {
//     console.error("Failed to parse property");
//   } finally {
//     process.exit(0);
//   }
// }
