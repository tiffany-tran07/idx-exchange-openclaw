import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFilePromise = promisify(execFile);

export async function runRagAgent(query: string, _userId: string) {
  try {
    const { stdout } = await execFilePromise("python3", ["src/tools/RAG.py", query], {
      maxBuffer: 1024 * 1024,
    });
    return {
      response: stdout.trim() || "No grounded information found for your query.",
    };
  } catch (err) {
    console.error("RAG Agent error:", err);
    return {
      response: "I'm sorry, I encountered an issue retrieving real estate knowledge.",
    };
  }
}
