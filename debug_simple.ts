import { parsePropertyQuery } from "./src/tools/property_parser";

async function testParser() {
  const q4 = "3 beds in Austin";
  const res4 = await parsePropertyQuery(q4);
  console.log("Query:", q4);
  console.log("Parsed:", JSON.stringify(res4, null, 2));
}

testParser();
