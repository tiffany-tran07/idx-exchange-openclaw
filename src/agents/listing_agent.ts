import { searchActiveListings } from "../tools/active_listing_search.js";
import type { ListingPreview } from "../tools/session_memory.js";
import { getSession, updateSession } from "../tools/session_memory.js";

function numeric(value: string | number): number {
  return Number(value);
}

export async function runListingAgent(sessionId: string) {
  const session = getSession(sessionId);

  // 1. Execute the search with the finalized criteria
  const results = await searchActiveListings({
    ...session.criteria,
  });

  const previews: ListingPreview[] = results.map((listing) => ({
    id: String(listing.id),
    address: listing.address,
    price: numeric(listing.price),
    beds: numeric(listing.beds),
    baths: numeric(listing.baths),
    sqft: numeric(listing.sqft),
  }));
  updateSession(sessionId, { listingPreviews: previews });

  // Format the response
  const listingDetails = previews
    .map(
      (listing) =>
        `- ${listing.address}: $${listing.price.toLocaleString()} · ${listing.beds} bd · ${listing.baths} ba · ${listing.sqft.toLocaleString()} sqft`,
    )
    .join("\n");

  // 3. Return results
  return {
    response:
      previews.length > 0
        ? `Found ${previews.length} matching properties:\n${listingDetails}`
        : "I didn't find any active listings matching those criteria.",
    results: previews,
  };
}
