export function formatPropertyResponse(result: any): string {
  // Format the product response once so every channel receives the same content.
  const properties = result.results || result.listings || result.recommendations;
  if (properties && Array.isArray(properties) && properties.length > 0) {
    const visibleProperties = properties.slice(0, 5);
    const count =
      properties.length > visibleProperties.length
        ? `Showing ${visibleProperties.length} of ${properties.length}`
        : `${properties.length}`;
    const heading = result.recommendations
      ? `⭐ Recommended properties (${count}):`
      : `🏡 Matching properties (${count}):`;
    return (
      `${heading}\n\n` +
      visibleProperties
        .map((l: any, index: number) => {
          const price = l.price ?? l.L_AskingPrice ?? 0;
          const beds = l.beds ?? l.L_Bedrooms ?? 0;
          const baths = l.baths ?? l.L_Bathrooms ?? 0;
          const sqft = l.sqft ?? l.L_SqFt ?? 0;
          const address = l.address ?? l.L_Address ?? "Unknown address";
          const remarks = l.remarks ?? l.L_Remarks;
          const remarksWords = typeof remarks === "string" ? remarks.trim().split(/\s+/) : [];
          const remarksPreview = remarksWords.length
            ? `\n📝 ${remarksWords.slice(0, 20).join(" ")}${remarksWords.length > 20 ? "…" : ""}`
            : "";

          return (
            `${index + 1}. 🏠 ${address}\n` +
            `💰 $${price.toLocaleString()} | 🛏 ${beds}bd/${baths}ba | 📐 ${sqft} sqft\n` +
            `📅 ${l.DaysOnMarket || 0} days on market${remarksPreview}`
          );
        })
        .join("\n\n")
    );
  }

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
      `📝 Almost ready to search!\n\n` +
      `To find the perfect properties, please tell me your preferred:\n${missingList}`
    );
  }

  if (result.response) {
    return result.response;
  }

  return "No results found.";
}
