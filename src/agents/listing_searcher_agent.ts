import { getSession } from "../tools/session_memory.js";
import { runListingAgent } from "./listing_agent.js";
import { REQUIRED_PROPERTY_FIELDS } from "./requirements_agent.js";

export async function runListingSearcherAgent(sessionId: string): Promise<string> {
  const currentSession = getSession(sessionId);

  // Double-check if all required fields are truly present before searching
  const missingFields = REQUIRED_PROPERTY_FIELDS.filter((field) => !currentSession.criteria[field]);

  if (missingFields.length > 0) {
    // This state should ideally be prevented by the orchestrator,
    // but adding a safeguard here for robustness.
    console.error(
      `Attempted to run listing search with missing fields: ${missingFields.join(", ")}`,
    );
    return `Cannot perform search: Missing required fields: ${missingFields.join(", ")}.`;
  }

  return (await runListingAgent(sessionId)).response;
}
