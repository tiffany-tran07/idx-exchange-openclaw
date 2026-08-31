function formatForWhatsApp(result: any): string {
  // 1. SUCCESSFUL LISTING SEARCH (Handles successful active listing search)
  // Check for 'results' or 'listings' (protects against both naming conventions)
  const properties = result.results || result.listings;
  if (properties && Array.isArray(properties) && properties.length > 0) {
    return properties
      .slice(0, 5)
      .map((l: any) => {
        const price = l.price || l.L_AskingPrice || 0;
        const beds = l.beds || l.L_Bedrooms || 0;
        const baths = l.baths || l.L_Bathrooms || 0;
        const sqft = l.sqft || l.L_SqFt || 0;

        return (
          `🏠 *${l.L_Address}, ${l.L_City || ""}*\n` +
          `💰 $${price.toLocaleString()} | 🛏 ${beds}bd/${baths}ba | 📐 ${sqft} sqft\n` +
          `📅 ${l.DaysOnMarket || 0} days on market`
        );
      })
      .join("\n\n");
  }

  // 2. INCOMPLETE SEARCH / REQUESTING MISSING INFO
  // E.g., result.action === "request_missing_info"
  if (result.action === "request_missing_info" && result.missing) {
    const missingList = result.missing
      .map((field: string) => {
        const icons: Record<string, string> = {
          city: "📍 City",
          maxPrice: "💰 Max Price",
          beds: "🛏 Bedrooms",
          baths: "🛁 Bathrooms",
          sqft: "📐 Sq Ft",
          type: "🏡 Property Type",
        };
        return `- ${icons[field] || field}`;
      })
      .join("\n");

    return (
      `📝 *Almost ready to search!*\n\n` +
      `To find the perfect properties, please tell me your preferred:\n${missingList}`
    );
  }

  // 3. MARKET STATS OR RAG KNOWLEDGE BASE (General fallback)
  // Clean up any double newlines or convert markdown headers to bold caps for WhatsApp
  if (result.response) {
    return result.response
      .replace(/### (.*)/g, "*$1*") // Convert markdown H3s to WhatsApp bold
      .replace(/## (.*)/g, "*$1*") // Convert markdown H2s to WhatsApp bold
      .replace(/# (.*)/g, "*$1*"); // Convert markdown H1s to WhatsApp bold
  }

  return "No results found.";
}
