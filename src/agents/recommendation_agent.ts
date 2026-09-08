import type { ListingPreview, PropertyCriteria } from "../tools/session_memory.js";

export function recommendationAgent(
  candidates: readonly ListingPreview[],
  criteria: PropertyCriteria,
) {
  if (candidates.length === 0) {
    return {
      response:
        "I don't have saved listing candidates in this conversation yet. Run a search first.",
    };
  }

  const ranked = candidates.toSorted(
    (left, right) => left.price - right.price || right.sqft - left.sqft,
  );
  const recommendation = ranked[0]!;
  const city = criteria.city ? ` in ${criteria.city}` : "";
  return {
    response:
      `From the ${candidates.length} saved candidates${city}, the strongest value starting point is ` +
      `${recommendation.address} at $${recommendation.price.toLocaleString()} ` +
      `(${recommendation.beds} bd, ${recommendation.baths} ba, ${recommendation.sqft.toLocaleString()} sqft). ` +
      "This ranking favors lower price, then more space; confirm condition, fees, and disclosures before deciding.",
    recommendation,
  };
}
