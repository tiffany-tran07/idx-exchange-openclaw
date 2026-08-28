export async function onWhatsAppMessage(message: string, userId: string) {
  // Typing indicator while processing
  await sendTypingIndicator(userId);
  try {
    const result = await orchestrate(message, userId);
    return formatForWhatsApp(result);
  } catch (err) {
    console.error("Orchestration error:", err);
    return "Sorry, I hit an issue. Please try again.";
  }
}
function formatForWhatsApp(result: AgentResult): string {
  if (result.listings) {
    return result.listings
      .slice(0, 5)
      .map(
        (l) =>
          `🏠 *${l.L_Address}, ${l.L_City}*\n` +
          `💰 $${l.price.toLocaleString()} | 🛏 ${l.beds}bd/${l.baths}ba | 📐 ${l.sqft} sqft\n` +
          `📅 ${l.DaysOnMarket} days on market`,
      )
      .join("\n\n");
  }
  return result.response || "No results found.";
}
