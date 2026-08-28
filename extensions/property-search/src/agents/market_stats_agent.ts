import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import util from "node:util";
import { get_market_summary } from "../tools/city_market_summary.js";
import { parsePropertyQuery } from "../tools/property_parser.js";
import { getSession, updateSession } from "../tools/session_memory.js";

const execFilePromise = util.promisify(execFile);
const TOOL_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../tools");

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
    const { stdout: trends } = await execFilePromise("python3", ["trend_analysis.py", city], {
      cwd: TOOL_DIRECTORY,
    });

    return {
      response: `Here is the market summary for California:\n${JSON.stringify(summary)}\nHere is the current trends of ${city}\nTrends:\n${trends}`,
    };
  } catch (err) {
    console.error("Market Stats Agent error:", err);
    return {
      response: `I encountered an issue retrieving market stats for ${city}.`,
    };
  }
}
