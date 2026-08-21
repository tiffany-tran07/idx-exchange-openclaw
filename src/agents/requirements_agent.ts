import { parsePropertyQuery } from "../tools/property_parser";
import { getSession, updateSession } from "../tools/session_memory";

export interface RequirementsStatus {
  isComplete: boolean;
  missingFields: string[];
}

export async function runRequirementsAgent(
  query: string,
  userId: string,
): Promise<RequirementsStatus> {
  const session = getSession(userId);

  // 1. Extract new data from the input string
  const newCriteria = await parsePropertyQuery(query);

  // 2. Merge this into the persistent memory
  updateSession(userId, newCriteria);

  // 3. Check what's still missing
  const requiredFields = ["city", "maxPrice", "beds"];
  const missingFields = requiredFields.filter((field) => !(session as any)[field]);

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}
