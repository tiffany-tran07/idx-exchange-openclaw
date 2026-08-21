import { exec } from "child_process";
import util from "util";
import { parsePropertyQuery } from "../tools/property_parser";
import { getSession, updateSession } from "../tools/session_memory";

const execPromise = util.promisify(exec);

export async function runRagAgent(query: string, userId: string) {
  const newCriteria = await parsePropertyQuery(query);
  if (newCriteria.city) {
    updateSession(userId, { city: newCriteria.city });
  }

  const session = getSession(userId);
  const city = session.city || "unknown";

  try {
    // Assuming rag.py expects arguments: city then query
    const { stdout } = await execPromise(`python3 src/tools/rag.py "${city}" "${query}"`);
    return {
      response: stdout.trim() || "No information found for your query in this city.",
    };
  } catch (err) {
    console.error("RAG Agent error:", err);
    return {
      response: "I'm sorry, I encountered an issue retrieving real estate knowledge.",
    };
  }
}
