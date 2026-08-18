export async function orchestrate(query: string, userId: string) {
  const intent = await classifyIntent(query);
  // intent: "search" | "market" | "recommend" | "knowledge" | "mixed"
  switch (intent) {
    case "search":
      return await propertySearchAgent(query, userId);
    case "market":
      return await marketStatsAgent(query);
    case "recommend":
      const session = getSession(userId);
      return await recommendationAgent(session.lastResults?.[0]);
    case "knowledge":
      return await ragAgent(query);
    case "mixed": {
      const [listings, stats] = await Promise.all([
        propertySearchAgent(query, userId),
        marketStatsAgent(query),
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
