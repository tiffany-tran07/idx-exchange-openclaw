import { exec } from "child_process";
import util from "util";
import { getSession } from "../tools/session_memory";

const execPromise = util.promisify(exec);

export async function runRagAgent(query: string, userId: string) {
  const session = getSession(userId);
  const city = session.city || "unknown"; // Fallback to unknown if no city in memory

  try {
    // Assuming rag.py expects arguments: city then query
    const { stdout } = await execPromise(`python3 src/tools/rag.py "${city}" "${query}"`);
    return {
      response: stdout.trim(),
    };
  } catch (err) {
    console.error("RAG Agent error:", err);
    return {
      response: "I'm sorry, I encountered an issue retrieving real estate knowledge.",
    };
  }
}
