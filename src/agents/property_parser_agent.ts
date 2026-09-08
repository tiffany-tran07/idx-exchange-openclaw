import { runRequirementsAgent } from "./requirements_agent.js";

export async function runPropertyParserAgent(
  sessionId: string,
  userQuery: string,
): Promise<{ missingFields: string[]; message?: string }> {
  const { missingFields: missing } = await runRequirementsAgent(userQuery, sessionId);

  if (missing.length > 0) {
    const message = `I still need the following details: ${missing.join(", ")}. Could you please provide them?`;
    return { missingFields: missing, message };
  }
  return { missingFields: [] };
}
