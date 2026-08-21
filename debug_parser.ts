import { parsePropertyQuery } from "./src/tools/property_parser";

async function testParser() {
  const q1 = "Find me a home in Austin";
  const res1 = await parsePropertyQuery(q1);
  console.log("Query:", q1);
  console.log("Parsed:", JSON.stringify(res1, null, 2));

  const q2 = "3 bedroom house";
  const res2 = await parsePropertyQuery(q2);
  console.log("\nQuery:", q2);
  console.log("Parsed:", JSON.stringify(res2, null, 2));
}

testParser();
