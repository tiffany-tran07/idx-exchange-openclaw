import { searchActiveListings } from "../tools/active_listing_search";
import { getSession, updateSession } from "../tools/session_memory";

export async function runListingAgent(userId: string) {
  const session = getSession(userId);

  // 1. Execute the search with the finalized criteria
  const results = await searchActiveListings({
    city: session.city,
    maxPrice: session.maxPrice,
    beds: session.beds,
  });

  // 2. Store results in memory for potential recommendations
  updateSession(userId, { lastResults: results });

  // Format the response
  const listingDetails = results
    .map((item) => `- ${item.L_Address}: $${(item as any).price.toLocaleString()}`)
    .join("\n");

  // 3. Return results
  return {
    response: `Found ${results.length} properties:\n${listingDetails}`,
    results: results,
  };
}
