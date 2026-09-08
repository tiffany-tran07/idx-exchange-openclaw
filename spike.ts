import { orchestrate } from "./src/tools/orchestrate.js";

async function runSpike() {
  console.log("--- Starting Spike Test ---");

  // Test case 1: Incomplete requirements
  console.log("Query: 'Find me a home in Austin'");
  const conversationId = "spike-property-conversation";
  await orchestrate("reset my property search", conversationId);
  const result1 = await orchestrate("Find me a home in Austin", conversationId);
  console.log("Result:", JSON.stringify(result1, null, 2));

  // Test case 2: Complete requirements (adding beds/price)
  console.log("\nQuery: 'under $500k with 3 beds'");
  await orchestrate("under $500k with 3 beds, 2 baths, 1,500 sqft, single family", conversationId);

  const result2 = await orchestrate("Find me a home in Austin", conversationId);
  console.log("Result (after filling requirements):", JSON.stringify(result2, null, 2));
}

runSpike().catch(console.error);
