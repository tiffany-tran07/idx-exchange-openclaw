import { runListingAgent } from "../agents/listing_agent";
import { runMarketStatsAgent } from "../agents/market_stats_agent";
import { runRagAgent } from "../agents/rag_agent";
import { runRequirementsAgent } from "../agents/requirements_agent";

export async function classifyIntent(query: string): Promise<Intent> {
  type Intent = "search" | "market" | "recommend" | "knowledge" | "mixed";
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
  if (isRecommend) return "recommend";

  // A query requesting both listings and market context.
  if (isSearch && isMarket) return "mixed";

  if (isMarket) return "market";
  if (isSearch) return "search";
  if (isKnowledge) return "knowledge";

  // General real-estate questions are safest to send through RAG.
  return "knowledge";
}

export async function orchestrate(query: string, userId: string) {
  const intent = await classifyIntent(query);
  // intent: "search" | "market" | "recommend" | "knowledge" | "mixed"
  switch (intent) {
    case "search": {
      // New workflow: Validate requirements before searching
      const requirements = await runRequirementsAgent(query, userId);
      if (!requirements.isComplete) {
        return {
          response: `I'm setting up your search. I still need: ${requirements.missingFields.join(", ")}.`,
          action: "request_missing_info",
          missing: requirements.missingFields,
        };
      }
      return await runListingAgent(userId);
    }
    case "market":
      return await runMarketStatsAgent(query, userId);
    case "recommend":
      const session = getSession(userId);
      return await recommendationAgent(session.lastResults?.[0]);
    case "knowledge":
      return await runRagAgent(query, userId);
    // case "email":
    //   return await emailAgent(query);
    case "mixed": {
      const [listings, stats] = await Promise.all([
        propertySearchAgent(query, userId),
        marketStatsAgent(query, userId),
      ]);
      return formatCombinedResponse(listings, stats);
    }
    default:
      return {
        response:
          "I'm not sure how to help with that. Try asking about properties or market trends.",
      };
  }
}
