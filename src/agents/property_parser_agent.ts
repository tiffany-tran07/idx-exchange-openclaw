import { execFile } from "child_process";
import { promisify } from "util";
import { getSession, updateSession } from "../tools/session_memory";

const execFileAsync = promisify(execFile);

const REQUIRED_FIELDS = ["city", "maxPrice", "beds", "baths", "sqft", "type"];

export async function runPropertyParserAgent(
  sessionId: string,
  userQuery: string,
): Promise<{ missingFields: string[]; message?: string }> {
  console.error(`Running property_parser.ts with query: "${userQuery}"`);
  // Use execFile to avoid shell interpolation of $ characters
  const parserResult = await execFileAsync("npx", [
    "tsx",
    "src/tools/property_parser.ts",
    userQuery,
  ]);

  let parsedCriteria = {};
  if (parserResult.stdout) {
    try {
      parsedCriteria = JSON.parse(parserResult.stdout);
    } catch (e) {
      console.error("Error parsing property_parser.ts output:", e);
    }
  }

  // Merge new values into session memory (respecting undefined values rule)
  await updateSession(sessionId, parsedCriteria);

  // Retrieve accumulated session
  const currentSession = await getSession(sessionId);

  // Check for missing required fields
  const missing = REQUIRED_FIELDS.filter((field) => {
    const value = (currentSession as any)[field];
    return value === undefined || value === null;
  });

  if (missing.length > 0) {
    const message = `I still need the following details: ${missing.join(", ")}. Could you please provide them?`;
    console.log(JSON.stringify({ missingFields: missing, message: message })); // Use console.log for output
    return { missingFields: missing, message: message };
  } else {
    console.log(JSON.stringify({ missingFields: [] })); // Use console.log for output
    return { missingFields: [] };
  }
}
