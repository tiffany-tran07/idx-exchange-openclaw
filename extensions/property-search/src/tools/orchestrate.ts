import { runListingAgent } from "../agents/listing_agent.js";
import { runMarketStatsAgent } from "../agents/market_stats_agent.js";
import { runRagAgent } from "../agents/rag_agent.js";
import { runRequirementsAgent } from "../agents/requirements_agent.js";
import { clearSession, getSession } from "./session_memory.js";

export type Intent = "search" | "market" | "recommend" | "knowledge" | "mixed" | "unknown";

type AgentResponse = {
  response: string;
  results?: unknown[];
  action?: string;
  missing?: string[];
};

const REQUIREMENT_LABELS: Record<string, string> = {
  city: "city",
  maxPrice: "maximum price",
  beds: "bedroom count",
  baths: "bathroom count",
  sqft: "minimum square footage",
  type: "property type",
};

function requestMissingInformation(missingFields: string[]): AgentResponse {
  const labels = missingFields.map((field) => REQUIREMENT_LABELS[field] ?? field);
  return {
    response: `Before I search, I still need your ${labels.join(", ")}. What would you prefer?`,
    action: "request_missing_info",
    missing: missingFields,
  };
}

async function runPropertySearch(query: string, userId: string): Promise<AgentResponse> {
  const requirements = await runRequirementsAgent(query, userId);
  if (!requirements.isComplete) {
    return requestMissingInformation(requirements.missingFields);
  }
  return await runListingAgent(userId);
}

function recommendFromSession(userId: string): AgentResponse {
  const results = getSession(userId).lastResults ?? [];
  if (results.length === 0) {
    return {
      response: "Search for properties first, then ask me to recommend or compare the results.",
    };
  }

  const ranked = results.toSorted((left, right) => {
    const leftPrice = Number((left as { price?: unknown }).price);
    const rightPrice = Number((right as { price?: unknown }).price);
    return (
      (Number.isFinite(leftPrice) ? leftPrice : Number.MAX_SAFE_INTEGER) -
      (Number.isFinite(rightPrice) ? rightPrice : Number.MAX_SAFE_INTEGER)
    );
  });
  const bestValue = ranked[0]!;
  const address = (bestValue as { L_Address?: string }).L_Address ?? "the first result";

  return {
    response: `Based on the available search results, ${address} has the lowest listed price. Review its condition, location, disclosures, and comparable sales before deciding.`,
    results: [bestValue],
  };
}

export async function classifyIntent(query: string): Promise<Intent> {
  const q = query
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .trim();

  const isRecommendation = [
    /\b(recommend(?:ation)?|suggest(?:ion)?)\b/,
    /\bwhich (?:one|property|home|house|listing)\b/,
    /\b(?:which should i|help me) (?:choose|buy|pick)\b/,
    /\b(?:compare (?:these|them)|pick one|best (?:one|option))\b/,
    /\bwhat do you think (?:of|about) (?:these|them|the options|the listings)\b/,
  ].some((pattern) => pattern.test(q));

  const hasMarketSignal = [
    /\b(?:markets?|trends?|stats?|statistics)\b/,
    /\b(?:median|average|inventory|supply)\b/,
    /\b(?:days on market|dom|price per (?:square foot|sqft))\b/,
    /\b(?:appreciation|depreciation|sales volume|sold prices?)\b/,
    /\b(?:buyer'?s market|seller'?s market)\b/,
    /\b(?:comps?|comparables?|recent sales?|list-to-close ratio)\b/,
    /\b(?:homes?|properties) sold\b|\bnumber of sales\b/,
    /\bhow long .+ (?:sell|selling)\b/,
  ].some((pattern) => pattern.test(q));

  const asksForDefinition = [
    /\bwhat (?:does|do) .+ mean\b/,
    /\b(?:define|definition of|meaning of)\b/,
    /\bexplain (?:what|the term|the meaning)\b/,
    /\b(?:explain|tell me about) (?:the term )?(?:dom|days on market|escrow|comps?|cap rate|list-to-close ratio)\b/,
    /\bhow (?:does|do) (?:escrow|financing|a mortgage|an hoa) work\b/,
    /\bwhat (?:is|are) (?:dom|days on market|escrow|comps?|cap rate|list-to-close ratio|a buyer'?s market|a seller'?s market)\b/,
    /(?=.*\b(?:columns?|fields?|schema|column mappings?)\b)(?=.*\b(?:california_sold|rets_property|mls|reso|trestle)\b)/,
  ].some((pattern) => pattern.test(q));

  const hasListingNoun =
    /\b(?:homes?|houses?|propert(?:y|ies)|listings?|condos?|condominiums?|apartments?|townhomes?|townhouses?|land|lots?)\b/.test(
      q,
    );
  const hasSearchRequest = /\b(?:find|search|show|list|looking for)\b/.test(q);
  const hasExplicitListingTarget = /\b(?:listings?|for sale|for rent|open houses?)\b/.test(q);
  const hasLocationPhrase = hasListingNoun && /\b(?:in|near|around) [a-z]/.test(q);
  const hasSearchCriteria = [
    /\b\d+(?:\.5)?[ -]?(?:beds?|bedrooms?|baths?|bathrooms?)\b/,
    /\b(?:under|below|between|price range)\b|\$\s?\d/,
    /\b\d[\d,]*\s*(?:sqft|sq ft|square feet)\b/,
    /\b(?:with|has|having) (?:a )?(?:pool|view|garage|yard)\b/,
    /\b(?:pool|waterfront|view|garage) (?:homes?|properties|listings?)\b/,
  ].some((pattern) => pattern.test(q));
  const isSearch =
    hasExplicitListingTarget ||
    hasSearchCriteria ||
    hasLocationPhrase ||
    (hasSearchRequest && hasListingNoun);

  if (isRecommendation) {
    return "recommend";
  }

  if (asksForDefinition) {
    return "knowledge";
  }

  if (isSearch && hasMarketSignal) {
    const explicitlyRequestsBoth =
      hasExplicitListingTarget ||
      hasSearchCriteria ||
      /\b(?:and|plus|along with|as well as)\b/.test(q);
    return explicitlyRequestsBoth ? "mixed" : "market";
  }

  if (hasMarketSignal) {
    return "market";
  }
  if (isSearch) {
    return "search";
  }

  return "unknown";
}

export async function orchestrate(query: string, userId: string) {
  if (
    /^(?:reset|clear)(?: my)?(?: property)? search(?: criteria)?[.!]?$/iu.test(query.trim()) ||
    /^start over[.!]?$/iu.test(query.trim())
  ) {
    clearSession(userId);
    return {
      response:
        "Your saved property-search criteria have been cleared. What would you like to find?",
    };
  }
  const intent = await classifyIntent(query);
  switch (intent) {
    case "search": {
      return await runPropertySearch(query, userId);
    }
    case "market":
      return await runMarketStatsAgent(query, userId);
    case "recommend":
      return recommendFromSession(userId);
    case "knowledge":
      return await runRagAgent(query, userId);
    case "mixed": {
      const requirements = await runRequirementsAgent(query, userId);
      if (!requirements.isComplete) {
        return requestMissingInformation(requirements.missingFields);
      }
      const [listings, stats] = await Promise.all([
        runListingAgent(userId),
        runMarketStatsAgent(query, userId),
      ]);
      return {
        response: `${listings.response}\n\n${stats.response}`,
        results: listings.results,
      };
    }
    case "unknown":
      return {
        response:
          "I can help search for properties, explain real-estate terms, or answer California market questions. What would you like to do?",
      };
  }
}
