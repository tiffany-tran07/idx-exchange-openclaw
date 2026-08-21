import { runRequirementsAgent } from "./src/agents/requirements_agent";
import { clearSession } from "./src/tools/session_memory";

async function testAgent() {
  clearSession("test_user_1");
  const result = await runRequirementsAgent("Find me a 3 bedroom home in Austin", "test_user_1");
  console.log("Result:", JSON.stringify(result, null, 2));
}

testAgent();
