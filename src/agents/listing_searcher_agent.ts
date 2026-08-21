import { exec } from "child_process";
import { promisify } from "util";
import { getSession, updateSession } from "../tools/session_memory";

const execAsync = promisify(exec);

const REQUIRED_FIELDS = ["city", "maxPrice", "beds", "baths", "sqft", "type"];

export async function runListingSearcherAgent(sessionId: string): Promise<string> {
  const currentSession = await getSession(sessionId);

  // Double-check if all required fields are truly present before searching
  const missingFields = REQUIRED_FIELDS.filter((field) => {
    const value = (currentSession as any)[field];
    return value === undefined || value === null;
  });

  if (missingFields.length > 0) {
    // This state should ideally be prevented by the orchestrator,
    // but adding a safeguard here for robustness.
    console.error(
      `Attempted to run listing search with missing fields: ${missingFields.join(", ")}`,
    );
    return `Cannot perform search: Missing required fields: ${missingFields.join(", ")}.`;
  }

  // Build JSON from accumulated session for active_listing_search.ts
  const searchJson = JSON.stringify({
    city: currentSession.city,
    maxPrice: currentSession.maxPrice,
    beds: currentSession.beds,
    baths: currentSession.baths,
    sqft: currentSession.sqft,
    type: currentSession.type,
    pool: currentSession.pool, // Include optional pool criteria
  });

  // Run active_listing_search.ts
  console.error(`Running active_listing_search.ts with JSON: ${searchJson}`);
  const searchResult = await execAsync(
    `npx tsx src/tools/active_listing_search.ts '${searchJson}'`,
  );

  let listings = [];
  if (searchResult.stdout) {
    try {
      listings = JSON.parse(searchResult.stdout);
    } catch (e) {
      console.error("Error parsing active_listing_search.ts output:", e);
    }
  }

  // Save results to session.lastResults
  await updateSession(sessionId, { lastResults: listings });

  // Return listings to the Orchestrator/user
  if (listings.length > 0) {
    const formattedListings = listings
      .map(
        (listing: any) =>
          `Address: ${listing.address}, City: ${listing.city}, Price: $${listing.price}, Beds: ${listing.beds}, Baths: ${listing.baths}, SqFt: ${listing.sqft}, Type: ${listing.type}${listing.features ? `, Features: ${listing.features.join(", ")}` : ""}`,
      )
      .join("\n");
    console.log(`Here are the listings matching your criteria:\n${formattedListings}`); // Use console.log for output
    return `Here are the listings matching your criteria:\n${formattedListings}`;
  } else {
    console.log(`No listings found matching your criteria.`); // Use console.log for output
    return `No listings found matching your criteria.`;
  }
}
