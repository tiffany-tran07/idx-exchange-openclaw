import { parsePropertyQuery } from "./src/tools/property_parser";

async function testParser() {
  const q3 = "Find me a 3 bedroom home in Austin";
  const res3 = await parsePropertyQuery(q3);
  console.log("Query:", q3);
  console.log("Parsed:", JSON.stringify(res3, null, 2));
}

testParser();
