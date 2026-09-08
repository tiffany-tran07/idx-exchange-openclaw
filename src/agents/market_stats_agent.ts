import { getMarketSummary } from "../tools/city_market_summary.js";
import { parsePropertyQuery } from "../tools/property_parser.js";
import { getSession, updateSession } from "../tools/session_memory.js";

export async function runMarketStatsAgent(query: string, sessionId: string) {
  const newCriteria = await parsePropertyQuery(query);
  if (newCriteria.city) {
    updateSession(sessionId, { criteria: { city: newCriteria.city } });
  }

  const session = getSession(sessionId);
  const city = session.criteria.city;

  if (!city) {
    return {
      response: "I need to know which city you're interested in to provide market stats.",
    };
  }

  try {
    const summary = await getMarketSummary(city);
    if (!summary) {
      return { response: `I couldn't find trailing-12-month sold data for ${city}.` };
    }
    updateSession(sessionId, { marketSummary: summary });

    return {
      response:
        `${summary.city}, ${summary.period.toLowerCase()}: ` +
        `${summary.soldCount.toLocaleString()} sales; average price $${summary.averagePrice.toLocaleString()}; ` +
        `$${summary.pricePerSqft.toLocaleString()}/sqft; ${summary.daysOnMarket} average days on market; ` +
        `${summary.listToCloseRatio}% list-to-close ratio.`,
      summary,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message || err.name : String(err);
    console.error(`Market stats unavailable: ${detail}`);
    return {
      response: `I encountered an issue retrieving market stats for ${city}.`,
    };
  }
}
