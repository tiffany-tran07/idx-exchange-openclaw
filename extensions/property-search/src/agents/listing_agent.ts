import { searchActiveListings } from "../tools/active_listing_search.js";
import { getSession, updateSession } from "../tools/session_memory.js";

export async function runListingAgent(userId: string) {
  const session = getSession(userId);

  // 1. Execute the search with the finalized criteria
  const results = await searchActiveListings({
    city: session.city,
    maxPrice: session.maxPrice,
    beds: session.beds,
    baths: session.baths,
    sqft: session.sqft,
    type: session.type,
    pool: session.pool,
    hasView: session.hasView,
  });

  // Full database rows are search output, not durable conversation state.
  updateSession(userId, {
    lastResults: results.slice(0, 5).map((listing) => ({
      L_Address: typeof listing.L_Address === "string" ? listing.L_Address : undefined,
      L_City: typeof listing.L_City === "string" ? listing.L_City : undefined,
      price: typeof listing.price === "number" ? listing.price : undefined,
      beds: typeof listing.beds === "number" ? listing.beds : undefined,
      baths: typeof listing.baths === "number" ? listing.baths : undefined,
      sqft: typeof listing.sqft === "number" ? listing.sqft : undefined,
      DaysOnMarket: typeof listing.DaysOnMarket === "number" ? listing.DaysOnMarket : undefined,
    })),
  });

  if (results.length === 0) {
    return {
      response:
        "I couldn't find active properties matching those criteria. Try widening the price, bedroom, or feature filters.",
      results,
    };
  }

  const listingDetails = results
    .slice(0, 5)
    .map((item) => {
      const listing = item as unknown as {
        L_Address?: string;
        L_City?: string;
        price?: number;
        beds?: number;
        baths?: number;
        sqft?: number;
        DaysOnMarket?: number;
      };
      const address = [listing.L_Address, listing.L_City].filter(Boolean).join(", ");
      const facts = [
        listing.beds == null ? undefined : `${listing.beds} bd`,
        listing.baths == null ? undefined : `${listing.baths} ba`,
        listing.sqft == null ? undefined : `${listing.sqft.toLocaleString("en-US")} sqft`,
      ].filter((fact): fact is string => Boolean(fact));
      return [
        `🏠 *${address || "Address unavailable"}*`,
        listing.price == null
          ? "💰 Price unavailable"
          : `💰 $${listing.price.toLocaleString("en-US")}`,
        facts.length ? `🛏️ ${facts.join(" · ")}` : undefined,
        listing.DaysOnMarket == null ? undefined : `📅 ${listing.DaysOnMarket} days on market`,
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n");
    })
    .join("\n\n");

  // 3. Return results
  return {
    response: `Found ${results.length} ${results.length === 1 ? "property" : "properties"}:\n\n${listingDetails}`,
    results,
  };
}
