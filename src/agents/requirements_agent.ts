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
  // 1. Extract new data from the input string
  const newCriteria = await parsePropertyQuery(query);

  // Filter out null/undefined values so we don't clobber existing memory
  const cleanCriteria = Object.fromEntries(
    Object.entries(newCriteria).filter(([_, v]) => v != null),
  );

  // 2. Merge this into the persistent memory
  updateSession(userId, cleanCriteria);

  // 3. Re-fetch the updated session to validate
  const session = getSession(userId);

  // 3. Check what's still missing
  const requiredFields = ["city", "maxPrice", "beds"];
  const missingFields = requiredFields.filter((field) => !(session as any)[field]);

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}
