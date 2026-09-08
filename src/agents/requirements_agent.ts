import { parsePropertyQuery } from "../tools/property_parser.js";
import type { PropertyCriteria } from "../tools/session_memory.js";
import { updateSession } from "../tools/session_memory.js";

export interface RequirementsStatus {
  isComplete: boolean;
  missingFields: string[];
  criteria: PropertyCriteria;
}

export const REQUIRED_PROPERTY_FIELDS = [
  "city",
  "maxPrice",
  "beds",
  "baths",
  "sqft",
  "type",
] as const;

export async function runRequirementsAgent(
  query: string,
  sessionId: string,
): Promise<RequirementsStatus> {
  // 1. Extract new data from the input string
  const newCriteria = await parsePropertyQuery(query);

  // Filter out null/undefined values so we don't clobber existing memory
  const { hasView: _hasView, ...criteria } = newCriteria;
  const cleanCriteria = Object.fromEntries(
    Object.entries(criteria).filter(([, value]) => value !== undefined),
  ) as PropertyCriteria;

  // 2. Merge this into the persistent memory
  const session = updateSession(sessionId, { criteria: cleanCriteria });

  // 3. Check what's still missing
  const missingFields = REQUIRED_PROPERTY_FIELDS.filter((field) => !session.criteria[field]);

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    criteria: session.criteria,
  };
}
