import { exec } from "child_process";
import util from "util";
import { get_market_summary } from "../tools/city_market_summary";
import { parsePropertyQuery } from "../tools/property_parser";
import { getSession, updateSession } from "../tools/session_memory";

const execPromise = util.promisify(exec);

export async function runMarketStatsAgent(query: string, userId: string) {
  const newCriteria = await parsePropertyQuery(query);
  if (newCriteria.city) {
    updateSession(userId, { city: newCriteria.city });
  }

  const session = getSession(userId);
  const city = session.city;

  if (!city) {
    return {
      response: "I need to know which city you're interested in to provide market stats.",
    };
  }

  try {
    // Run analysis tools
    const summary = await get_market_summary();
    const { stdout: trends } = await execPromise(`python3 src/tools/trend_analysis.py "${city}"`);

    return {
      response: `Here is the market summary for ${city}:\n${JSON.stringify(summary)}\n\nTrends:\n${trends}`,
    };
  } catch (err) {
    console.error("Market Stats Agent error:", err);
    return {
      response: `I encountered an issue retrieving market stats for ${city}.`,
    };
  }
}
