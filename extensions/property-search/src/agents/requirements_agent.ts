import { parsePropertyQuery } from "../tools/property_parser.js";
import { getSession, updateSession } from "../tools/session_memory.js";

export interface RequirementsStatus {
  isComplete: boolean;
  missingFields: string[];
}

// These are the only fields needed to run a useful bounded search. Bathrooms,
// square footage, property type, and amenities remain optional refinements.
const REQUIRED_SEARCH_FIELDS = ["city", "maxPrice", "beds"] as const;

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

  const session = getSession(userId);
  const missingFields = REQUIRED_SEARCH_FIELDS.filter((field) => session[field] == null);

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}
