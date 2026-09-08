import { clearSession, getSession } from "./session_memory.js";

type Intent = "search" | "market" | "recommend" | "knowledge" | "mixed";

export async function classifyIntent(query: string): Promise<Intent> {
  const q = query.toLowerCase().trim();

  const searchPatterns = [
    /\b(find|search|show|list|looking for)\b/,
    /\b(home|house|property|properties|listing|listings|condo|apartment|townhome)\b/,
    /\b(bed|beds|bedroom|bedrooms|bath|bathroom|sqft|square feet)\b/,
    /\b(under|below|between|price range|for sale|for rent)\b/,
  ];

  const marketPatterns = [
    /\b(market|trend|trends|stats|statistics)\b/,
    /\b(median|average|inventory|supply)\b/,
    /\b(days on market|dom|price per square foot|price per sqft)\b/,
    /\b(appreciation|depreciation|sales volume|sold prices?)\b/,
    /\b(buyer'?s market|seller'?s market)\b/,
  ];

  const recommendPatterns = [
    /\b(recommend|recommendation|suggest|suggestion)\b/,
    /\b(which (one|property|home|house))\b/,
    /\b(best (one|option|property|home|house))\b/,
    /\b(what do you think|which should i choose|which should i buy)\b/,
    /\b(compare these|pick one|help me choose)\b/,
  ];

  const knowledgePatterns = [
    /\b(what is|what are|how does|how do|why|explain|tell me about)\b/,
    /\b(mortgage|escrow|closing costs?|hoa|property tax|inspection)\b/,
    /\b(real estate|buying process|selling process|financing)\b/,
  ];

  const matches = (patterns: RegExp[]) => patterns.some((pattern) => pattern.test(q));

  const isSearch = matches(searchPatterns);
  const isMarket = matches(marketPatterns);
  const isRecommend = matches(recommendPatterns);
  const isKnowledge = matches(knowledgePatterns);

  // Recommendation should win because it relies on session results.
  if (isRecommend) {
    return "recommend";
  }

  // A query requesting both listings and market context.
  if (isSearch && isMarket) {
    return "mixed";
  }

  if (isMarket) {
    return "market";
  }
  if (isSearch) {
    return "search";
  }
  if (isKnowledge) {
    return "knowledge";
  }

  // General real-estate questions are safest to send through RAG.
  return "knowledge";
}

export async function orchestrate(query: string, sessionId: string) {
  if (/\breset my property search\b/i.test(query)) {
    clearSession(sessionId);
    return { response: "Your property search has been reset for this conversation." };
  }

  const intent = await classifyIntent(query);
  switch (intent) {
    case "search": {
      const { runRequirementsAgent } = await import("../agents/requirements_agent.js");
      const requirements = await runRequirementsAgent(query, sessionId);
      if (!requirements.isComplete) {
        return {
          response: `I'm setting up your search. I still need: ${requirements.missingFields.join(", ")}.`,
          action: "request_missing_info",
          missing: requirements.missingFields,
        };
      }
      const { runListingAgent } = await import("../agents/listing_agent.js");
      return await runListingAgent(sessionId);
    }
    case "market": {
      const { runMarketStatsAgent } = await import("../agents/market_stats_agent.js");
      return await runMarketStatsAgent(query, sessionId);
    }
    case "recommend": {
      const { recommendationAgent } = await import("../agents/recommendation_agent.js");
      const session = getSession(sessionId);
      return recommendationAgent(session.listingPreviews, session.criteria);
    }
    case "knowledge": {
      const { runRagAgent } = await import("../agents/rag_agent.js");
      return await runRagAgent(query, sessionId);
    }
    case "mixed": {
      const [{ runListingAgent }, { runMarketStatsAgent }, { runRequirementsAgent }] =
        await Promise.all([
          import("../agents/listing_agent.js"),
          import("../agents/market_stats_agent.js"),
          import("../agents/requirements_agent.js"),
        ]);
      const requirements = await runRequirementsAgent(query, sessionId);
      const stats = await runMarketStatsAgent(query, sessionId);
      if (!requirements.isComplete) {
        return {
          response: `${stats.response}\n\nFor a listing search, I still need: ${requirements.missingFields.join(", ")}.`,
          missing: requirements.missingFields,
        };
      }
      const listings = await runListingAgent(sessionId);
      return { response: `${listings.response}\n\n${stats.response}` };
    }
    default:
      return {
        response:
          "I'm not sure how to help with that. Try asking about properties or market trends.",
      };
  }
}
